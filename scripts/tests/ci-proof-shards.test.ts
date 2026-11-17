import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type ShardOutput,
  changedPaths,
  collect,
  join,
  listedShard,
  listedTests,
  main,
  passedTests,
  verifyShards,
} from "../ci-proof-shards.ts";

const dirs: string[] = [];
const restores: Array<() => void> = [];
afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "kibi-proof-shards-"));
  dirs.push(dir);
  return dir;
}

function summary(passed: string[], failed = 0): string {
  return `prove: ingested integration 'self-proof'\n${JSON.stringify({
    passed: passed.length,
    failed,
    runs: [
      {
        integration: "self-proof",
        results: passed.map((testId) => ({ testId, outcome: "passed" })),
      },
    ],
  })}\n`;
}

function shard(
  index: number,
  count: number,
  tests: string[],
  extra: Partial<ShardOutput> = {},
): ShardOutput {
  return {
    name: `kibi-proof-shard-${index}`,
    list: { tests, shard: `${index}/${count}` },
    proveLog: summary(tests),
    changed: tests.map((id) => `.kb/tests/${id}.md`),
    ...extra,
  };
}

function problems(expected: string[], shards: ShardOutput[]): string[] {
  try {
    verifyShards(expected, shards);
  } catch (error) {
    return (error as Error).message.split("\n").slice(1);
  }
  return [];
}

describe("prove output readers", () => {
  test("listedTests and listedShard read a --list output", () => {
    expect(listedTests({ tests: ["A"] })).toEqual(["A"]);
    expect(listedTests({ tests: [1] })).toBeNull();
    expect(listedTests([])).toBeNull();
    expect(listedShard({ shard: "2/3" })).toEqual({ index: 2, count: 3 });
    for (const bad of [{ shard: "4/3" }, { shard: "0/3" }, { shard: 2 }, null])
      expect(listedShard(bad)).toBeNull();
  });

  test("passedTests reads the last JSON line and needs zero failures", () => {
    expect([...(passedTests(summary(["A", "B"])) ?? [])]).toEqual(["A", "B"]);
    const mixed = JSON.stringify({
      failed: 0,
      runs: [
        {
          results: [
            { testId: "A", outcome: "passed" },
            { testId: "B", outcome: "failed" },
            { outcome: "passed" },
            "junk",
          ],
        },
      ],
    });
    expect([...(passedTests(`{"progress":1}\n${mixed}`) ?? [])]).toEqual(["A"]);
    expect(passedTests(summary(["A"], 1))).toBeNull();
    expect(passedTests("no summary")).toBeNull();
    expect(passedTests("{not json")).toBeNull();
    expect(passedTests('{"failed":0}')).toBeNull();
    expect(passedTests('{"failed":0,"runs":[{"results":3}]}')).toBeNull();
    expect(passedTests('{"failed":0,"runs":["x"]}')).toBeNull();
  });
});

describe("verifyShards", () => {
  const all = ["T-1", "T-2", "T-3", "T-4", "T-5"];

  test("accepts disjoint shards that cover the full selection", () => {
    expect(
      verifyShards(all, [
        shard(2, 2, ["T-2", "T-4"], { changed: [".kb/tests/T-2.md"] }),
        shard(1, 2, ["T-1", "T-3", "T-5"]),
      ]),
    ).toEqual([
      { shard: "kibi-proof-shard-2", file: ".kb/tests/T-2.md" },
      { shard: "kibi-proof-shard-1", file: ".kb/tests/T-1.md" },
      { shard: "kibi-proof-shard-1", file: ".kb/tests/T-3.md" },
      { shard: "kibi-proof-shard-1", file: ".kb/tests/T-5.md" },
    ]);
  });

  test("refuses a missing, duplicated or miscounted shard", () => {
    expect(problems(all, [shard(1, 2, ["T-1", "T-3", "T-5"])])).toEqual([
      "shard 2/2 did not report",
      "T-2: selected by kibi prove --all but by no shard",
      "T-4: selected by kibi prove --all but by no shard",
    ]);
    expect(
      problems(
        ["T-1", "T-2"],
        [shard(1, 2, ["T-1"]), { ...shard(1, 2, ["T-2"]), name: "again" }],
      ),
    ).toEqual([
      "again (1/2): shard 1 also reported by kibi-proof-shard-1",
      "shard 2/2 did not report",
    ]);
    expect(
      problems(["T-1", "T-2"], [shard(1, 2, ["T-1"]), shard(2, 3, ["T-2"])]),
    ).toEqual(["shards disagree on the shard count: 2, 3"]);
    expect(problems([], [])).toEqual(["no shard reported"]);
  });

  test("refuses overlapping or extra tests and unproven ones", () => {
    expect(
      problems(
        ["T-1", "T-2"],
        [
          shard(1, 2, ["T-1", "T-2"]),
          shard(2, 2, ["T-2", "T-9"], { changed: [] }),
        ],
      ),
    ).toEqual([
      "T-2: selected by kibi-proof-shard-1 and kibi-proof-shard-2",
      "T-9: selected by a shard but not by kibi prove --all",
    ]);
    expect(
      problems(
        ["T-1", "T-2"],
        [shard(1, 1, ["T-1", "T-2"], { proveLog: summary(["T-1"]) })],
      ),
    ).toEqual(["T-2: no passed result in kibi-proof-shard-1 (1/1)"]);
    expect(
      problems(
        ["T-1"],
        [shard(1, 1, ["T-1"], { proveLog: summary(["T-1"], 2) })],
      ),
    ).toEqual([
      "kibi-proof-shard-1 (1/1): prove.log has no summary with zero failures",
    ]);
  });

  test("refuses changes outside the shard's own receipt files", () => {
    expect(
      problems(
        ["T-1", "T-2"],
        [
          shard(1, 2, ["T-1"], {
            changed: [".kb/tests/T-1.md", ".kb/tests/T-2.md", "src/x.ts"],
          }),
          shard(2, 2, ["T-2"], {
            changed: [".kb/tests/T-2.md", ".kb/tests/T-2.md"],
          }),
        ],
      ),
    ).toEqual([
      "kibi-proof-shard-1 (1/2): changed .kb/tests/T-2.md, which is not the receipt file of one of its tests",
      "kibi-proof-shard-1 (1/2): changed src/x.ts, which is not the receipt file of one of its tests",
      ".kb/tests/T-2.md: changed by kibi-proof-shard-2 and kibi-proof-shard-2",
    ]);
    expect(problems(["T-1"], [shard(1, 1, ["T-1"], { changed: "x" })])).toEqual(
      ["kibi-proof-shard-1 (1/1): changed.json is not a list of paths"],
    );
    expect(
      problems(
        ["T-1"],
        [{ ...shard(1, 1, ["T-1"]), list: { tests: ["T-1"] } }],
      ),
    ).toEqual([
      "kibi-proof-shard-1: list.json is not a kibi prove --shard --list output",
      "no shard reported",
      "T-1: selected by kibi prove --all but by no shard",
    ]);
  });
});

function git(cwd: string, ...args: string[]): void {
  execFileSync("git", args, { cwd, stdio: "ignore" });
}

function repository(): string {
  const root = tempDir();
  git(root, "init", "-q");
  mkdirSync(path.join(root, ".kb", "tests"), { recursive: true });
  for (const id of ["T-1", "T-2", "T-3"])
    writeFileSync(path.join(root, ".kb", "tests", `${id}.md`), `${id}\n`);
  writeFileSync(path.join(root, "gone.txt"), "x\n");
  writeFileSync(path.join(root, "old.txt"), "x\n");
  writeFileSync(path.join(root, ".gitignore"), "ignored/\n");
  git(root, "add", "-A");
  git(
    root,
    "-c",
    "user.email=a@b.c",
    "-c",
    "user.name=a",
    "commit",
    "-qm",
    "init",
  );
  return root;
}

describe("collect and join", () => {
  test("changedPaths lists modified, added, deleted and renamed paths, not ignored ones", async () => {
    const root = repository();
    writeFileSync(path.join(root, ".kb", "tests", "T-1.md"), "receipt\n");
    mkdirSync(path.join(root, "ignored"));
    writeFileSync(path.join(root, "ignored", "x"), "x\n");
    writeFileSync(path.join(root, "new.txt"), "x\n");
    rmSync(path.join(root, "gone.txt"));
    git(root, "mv", "old.txt", "renamed.txt");
    expect(await changedPaths(root)).toEqual([
      ".kb/tests/T-1.md",
      "gone.txt",
      "new.txt",
      "renamed.txt",
    ]);
  });

  test("a shard's receipts reach the join checkout", async () => {
    const shardRoot = repository();
    writeFileSync(
      path.join(shardRoot, ".kb", "tests", "T-2.md"),
      "receipt 2\n",
    );
    rmSync(path.join(shardRoot, "gone.txt"));
    const shards = tempDir();
    const out = path.join(shards, "kibi-proof-shard-1");
    expect(await collect(shardRoot, out)).toBe(2);
    expect(
      JSON.parse(readFileSync(path.join(out, "changed.json"), "utf8")),
    ).toEqual([".kb/tests/T-2.md", "gone.txt"]);
    expect(existsSync(path.join(out, "files", "gone.txt"))).toBe(false);

    // The deleted file is refused by name.
    writeFileSync(
      path.join(out, "list.json"),
      JSON.stringify({ tests: ["T-2"], shard: "1/1" }),
    );
    writeFileSync(path.join(out, "prove.log"), summary(["T-2"]));
    const allList = path.join(tempDir(), "all.json");
    writeFileSync(allList, JSON.stringify({ tests: ["T-2"] }));
    const joinRoot = repository();
    await expect(join(joinRoot, shards, allList)).rejects.toThrow(
      "changed gone.txt, which is not the receipt file of one of its tests",
    );

    writeFileSync(
      path.join(out, "changed.json"),
      JSON.stringify([".kb/tests/T-2.md"]),
    );
    writeFileSync(path.join(shards, "stray-file"), "not a shard\n");
    expect(await join(joinRoot, shards, allList)).toEqual([
      { shard: "kibi-proof-shard-1", file: ".kb/tests/T-2.md" },
    ]);
    expect(
      readFileSync(path.join(joinRoot, ".kb", "tests", "T-2.md"), "utf8"),
    ).toBe("receipt 2\n");
  });

  test("join refuses an unreadable full list and reads a missing log as empty", async () => {
    const shards = tempDir();
    mkdirSync(path.join(shards, "kibi-proof-shard-1"));
    const allList = path.join(tempDir(), "all.json");
    await expect(join(tempDir(), shards, allList)).rejects.toThrow(
      `${allList} is not a kibi prove --list output`,
    );
    writeFileSync(allList, JSON.stringify({ tests: [] }));
    await expect(join(tempDir(), shards, allList)).rejects.toThrow(
      "kibi-proof-shard-1: list.json is not a kibi prove --shard --list output",
    );
  });
});

describe("main", () => {
  function capture() {
    const out: string[] = [];
    const err: string[] = [];
    const stdout = spyOn(process.stdout, "write").mockImplementation(
      (chunk: unknown) => {
        out.push(String(chunk));
        return true;
      },
    );
    const stderr = spyOn(process.stderr, "write").mockImplementation(
      (chunk: unknown) => {
        err.push(String(chunk));
        return true;
      },
    );
    restores.push(() => {
      stdout.mockRestore();
      stderr.mockRestore();
    });
    return { out, err };
  }

  function inDir(dir: string) {
    const previous = process.cwd();
    process.chdir(dir);
    restores.push(() => process.chdir(previous));
  }

  test("collect, join, a failed join and usage", async () => {
    const root = repository();
    inDir(root);
    const io = capture();
    const shards = tempDir();
    const out = path.join(shards, "s1");
    expect(await main(["collect", out])).toBe(0);
    writeFileSync(
      path.join(out, "list.json"),
      JSON.stringify({ tests: ["T-1"], shard: "1/1" }),
    );
    writeFileSync(path.join(out, "prove.log"), summary(["T-1"]));
    const allList = path.join(tempDir(), "all.json");
    writeFileSync(allList, JSON.stringify({ tests: ["T-1"] }));
    expect(await main(["join", shards, allList])).toBe(0);
    writeFileSync(allList, JSON.stringify({ tests: ["T-1", "T-2"] }));
    expect(await main(["join", shards, allList])).toBe(1);
    expect(await main(["join", shards])).toBe(2);
    expect(io.out).toEqual([
      "collected 0 changed file(s)\n",
      "joined 0 receipt file(s) from the proof shards\n",
    ]);
    expect(io.err[0]).toContain(
      "T-2: selected by kibi prove --all but by no shard",
    );
    expect(io.err[1]).toContain("usage:");
  });
});
