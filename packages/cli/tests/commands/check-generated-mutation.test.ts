import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import * as fs from "node:fs";
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { checkGeneratedManifests } from "../../src/commands/check-generated.js";
import { refreshManifestCoordinates } from "../../src/commands/sync/manifest.js";
import * as gitSnapshot from "../../src/traceability/git-change-snapshot.js";
import {
  createGitWorkspace,
  git,
  removeTempDir,
  withCwd,
} from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];
let logs: string[] = [];
let errors: string[] = [];

function track<T extends { mockRestore(): void }>(spy: T): T {
  restores.push(() => spy.mockRestore());
  return spy;
}

afterEach(() => {
  for (const restore of restores.splice(0).reverse()) restore();
  for (const root of roots.splice(0)) removeTempDir(root);
});

function write(root: string, files: Record<string, string>): void {
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
  }
}

function repo(files: Record<string, string> = {}): string {
  const root = createGitWorkspace("main");
  roots.push(root);
  write(root, files);
  git(root, "add -A");
  return root;
}

/** Rewrite the manifest in its canonical layout, as sync does. */
async function canonicalize(root: string): Promise<void> {
  await refreshManifestCoordinates(
    path.join(root, ".kb", "symbols.yaml"),
    root,
    { quiet: true, enrichSymbolCoordinates: async (entries) => entries },
  );
  git(root, "add -A");
}

async function run(root: string, options?: { changedOnly?: boolean }) {
  logs = [];
  errors = [];
  track(
    spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    }),
  );
  track(
    spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args.join(" "));
    }),
  );
  try {
    return await withCwd(root, () =>
      options === undefined
        ? checkGeneratedManifests()
        : checkGeneratedManifests(options),
    );
  } finally {
    restores.pop()?.();
    restores.pop()?.();
  }
}

const failed = (message: string) => [
  `kibi: generated manifest check failed: ${message}`,
];

const RETRY =
  "Git index changed during generated-manifest analysis (or HEAD changed); retry the commit";

/** Replace Git's answer to one subcommand; others run for real. */
function fakeGit(
  subcommand: string,
  answer: (real: childProcess.SpawnSyncReturns<Buffer>) => unknown,
) {
  const realSpawn = childProcess.spawnSync;
  const calls: unknown[][] = [];
  track(
    spyOn(childProcess, "spawnSync").mockImplementation(((
      command: string,
      args: string[],
      options: never,
    ) => {
      calls.push([command, args, options]);
      const result = realSpawn(command, args, options);
      return args[0] === subcommand ? answer(result as never) : result;
    }) as never),
  );
  return calls;
}

function unstableIndex() {
  const capture = gitSnapshot.captureStagedSnapshot;
  track(
    spyOn(gitSnapshot, "captureStagedSnapshot").mockImplementation(
      (workspaceRoot: string) => ({
        ...capture(workspaceRoot),
        assertUnchanged: () => {
          throw new Error("index moved");
        },
      }),
    ),
  );
}

const sym = (source: string) =>
  `symbols:\n  - id: SYM-A\n    sourceFile: ${JSON.stringify(source)}\n`;

describe("checkGeneratedManifests results", () => {
  test("accepts a canonical manifest and cleans up its snapshot", async () => {
    const root = repo({ ".kb/symbols.yaml": sym("src/a.ts") });
    await canonicalize(root);
    const made: string[] = [];
    const real = fs.mkdtempSync;
    track(
      spyOn(fs, "mkdtempSync").mockImplementation(((prefix: string) => {
        const dir = real(prefix);
        made.push(prefix, dir);
        return dir;
      }) as never),
    );
    expect(await run(root)).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "kibi: staged generated manifests are current.",
    ]);
    expect(errors).toStrictEqual([]);
    expect(made[0]).toBe(path.join(tmpdir(), "kibi-generated-check-"));
    expect(fs.existsSync(made[1] as string)).toBe(false);
    expect(
      readFileSync(path.join(root, ".kb", "symbols.yaml")).toString(),
    ).toContain("SYM-A");
  });

  test("removes the snapshot when the manifest drifts", async () => {
    const root = repo({ ".kb/symbols.yaml": sym("src/a.ts") });
    const made: string[] = [];
    const real = fs.mkdtempSync;
    track(
      spyOn(fs, "mkdtempSync").mockImplementation(((prefix: string) => {
        const dir = real(prefix);
        made.push(dir);
        return dir;
      }) as never),
    );
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual([
      "kibi: generated manifest drift in staged snapshot: .kb/symbols.yaml",
      "Run kibi sync --refresh-symbol-coordinates to rewrite the manifest in its canonical layout, review the diff, then stage only the intended hunks with git add -p (or git add <path> when the whole file is intended).",
    ]);
    expect(logs).toStrictEqual([]);
    expect(made).toHaveLength(1);
    expect(fs.existsSync(made[0] as string)).toBe(false);
  });

  test("checks staged bytes, not the working tree", async () => {
    const root = repo({ ".kb/symbols.yaml": sym("src/a.ts") });
    await canonicalize(root);
    writeFileSync(path.join(root, ".kb", "symbols.yaml"), "junk: [\n");
    expect(await run(root)).toStrictEqual({ exitCode: 0 });
  });

  test("asks Git for the tree and the manifest blob", async () => {
    const root = repo({ ".kb/symbols.yaml": "symbols: []\n" });
    const calls = fakeGit("none", () => undefined);
    await run(root);
    const own = calls.filter(([, args]) =>
      ["ls-tree", "cat-file"].includes((args as string[])[0] as string),
    );
    const tree = git(root, "write-tree").trim();
    const oid = git(root, "rev-parse :.kb/symbols.yaml").trim();
    expect(own).toStrictEqual([
      [
        "git",
        ["ls-tree", "-r", "-z", "--full-tree", tree],
        { input: undefined, maxBuffer: 256 * 1024 * 1024 },
      ],
      [
        "git",
        ["cat-file", "--batch"],
        { input: Buffer.from(`${oid}\n`), maxBuffer: 256 * 1024 * 1024 },
      ],
    ]);
  });

  test("accepts staged paths that hold a newline", async () => {
    const root = repo({
      ".kb/symbols.yaml": "symbols: []\n",
      "odd\nname.txt": "x\n",
    });
    expect(await run(root)).toStrictEqual({ exitCode: 0 });
    expect(logs).toStrictEqual([
      "kibi: staged symbols manifest is empty; nothing to check.",
    ]);
  });
});

describe("checkGeneratedManifests changed-only mode", () => {
  async function committed(): Promise<string> {
    const root = repo({ ".kb/symbols.yaml": sym("src/a.ts") });
    git(root, "commit --no-verify -qm manifest");
    write(root, { "other.txt": "x\n" });
    git(root, "add other.txt");
    return root;
  }

  test("checks every staged manifest by default", async () => {
    const root = await committed();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(await run(root, {})).toStrictEqual({ exitCode: 1 });
    expect(await run(root, { changedOnly: false })).toStrictEqual({
      exitCode: 1,
    });
    expect(errors[0]).toBe(
      "kibi: generated manifest drift in staged snapshot: .kb/symbols.yaml",
    );
  });

  test("skips an untouched manifest", async () => {
    const root = await committed();
    expect(await run(root, { changedOnly: true })).toStrictEqual({
      exitCode: 0,
    });
    expect(logs).toStrictEqual(["kibi: staged symbols manifest unchanged."]);
  });

  test("checks when the coordinate artifact is unstaged", async () => {
    const root = repo({
      ".kb/symbols.yaml": sym("src/a.ts"),
      ".kb/symbol-coordinates.yaml": "coordinates: {}\n",
    });
    git(root, "commit --no-verify -qm both");
    git(root, "rm -q --cached .kb/symbol-coordinates.yaml");
    expect(await run(root, { changedOnly: true })).toStrictEqual({
      exitCode: 1,
    });
    expect(errors[0]).toBe(
      "kibi: generated manifest drift in staged snapshot: .kb/symbols.yaml",
    );
  });

  test("asks for a retry when the index moves while skipping", async () => {
    const root = await committed();
    unstableIndex();
    expect(await run(root, { changedOnly: true })).toStrictEqual({
      exitCode: 1,
    });
    expect(errors).toStrictEqual(failed(RETRY));
    expect(logs).toStrictEqual([]);
  });
});

describe("checkGeneratedManifests index stability", () => {
  test("asks for a retry before reporting a staged coordinate artifact", async () => {
    const root = repo({
      ".kb/symbols.yaml": "symbols: []\n",
      ".kb/symbol-coordinates.yaml": "coordinates: {}\n",
    });
    unstableIndex();
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(failed(RETRY));
  });

  test("asks for a retry before reporting drift or success", async () => {
    const drifted = repo({ ".kb/symbols.yaml": sym("src/a.ts") });
    const current = repo({ ".kb/symbols.yaml": sym("src/a.ts") });
    await canonicalize(current);
    unstableIndex();
    expect(await run(drifted)).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(failed(RETRY));
    expect(await run(current)).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(failed(RETRY));
    expect(logs).toStrictEqual([]);
  });

  test("reports a thrown value that is not an error", async () => {
    const root = repo();
    track(
      spyOn(gitSnapshot, "captureStagedSnapshot").mockImplementation(() => {
        throw "no repository";
      }),
    );
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(failed("no repository"));
  });
});

describe("checkGeneratedManifests symbol sources", () => {
  test("accepts sources that stay inside the repository", async () => {
    for (const source of ["src\\win.ts", "a/b:c.ts", "1:/x.ts", "./src/a.ts"]) {
      const root = repo({
        ".kb/symbols.yaml": `symbols:\n  - null\n  - id: SYM-N\n    sourceFile: 7\n${sym(source).slice("symbols:\n".length)}`,
      });
      expect(await run(root)).toStrictEqual({ exitCode: 1 });
      expect(errors[0]).toBe(
        "kibi: generated manifest drift in staged snapshot: .kb/symbols.yaml",
      );
    }
  });

  test("rejects sources outside the repository", async () => {
    for (const source of [".", "/etc/x", "C:/x.ts", "c:x", "a/../../x"]) {
      const root = repo({ ".kb/symbols.yaml": sym(source) });
      expect(await run(root)).toStrictEqual({ exitCode: 1 });
      expect(errors).toStrictEqual(
        failed(`Symbol source must be a repository-relative path: ${source}`),
      );
    }
  });

  test("rejects manifests without a symbols array", async () => {
    for (const content of ["", "null\n", "5\n", "- a\n", "symbols: {}\n"]) {
      const root = repo({ ".kb/symbols.yaml": content });
      expect(await run(root)).toStrictEqual({ exitCode: 1 });
      expect(errors).toStrictEqual(
        failed("Staged .kb/symbols.yaml has no symbols array"),
      );
    }
  });

  test("rejects sources at or under a non-regular entry", async () => {
    const root = repo({ ".kb/symbols.yaml": "symbols: []\n" });
    symlinkSync("../elsewhere", path.join(root, "lnk"));
    git(root, "add -A");
    for (const [source, reported] of [
      ["lnk", "lnk"],
      ["lnk/a.ts", "lnk/a.ts"],
      ["lnk\\b.ts", "lnk/b.ts"],
    ]) {
      write(root, { ".kb/symbols.yaml": sym(source as string) });
      git(root, "add -A");
      expect(await run(root)).toStrictEqual({ exitCode: 1 });
      expect(errors).toStrictEqual(
        failed(`Staged symbol source is not a regular file: ${reported}`),
      );
    }
    for (const source of ["lnkx/a.ts", "src/lnk"]) {
      write(root, { ".kb/symbols.yaml": sym(source) });
      git(root, "add -A");
      expect(await run(root)).toStrictEqual({ exitCode: 1 });
      expect(errors[0]).toBe(
        "kibi: generated manifest drift in staged snapshot: .kb/symbols.yaml",
      );
    }
  });

  test("an executable manifest is still a regular file", async () => {
    const root = repo({ ".kb/symbols.yaml": "symbols: []\n" });
    git(root, "update-index --chmod=+x .kb/symbols.yaml");
    expect(await run(root)).toStrictEqual({ exitCode: 0 });
    const linked = repo();
    mkdirSync(path.join(linked, ".kb"));
    symlinkSync("../target.yaml", path.join(linked, ".kb", "symbols.yaml"));
    git(linked, "add -A");
    expect(await run(linked)).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(
      failed("Staged .kb/symbols.yaml is missing or is not a regular file"),
    );
  });
});

describe("checkGeneratedManifests Git responses", () => {
  const empty = { ".kb/symbols.yaml": "symbols: []\n" };

  test("reports Git failures with the trimmed stderr or spawn error", async () => {
    const root = repo(empty);
    fakeGit("ls-tree", (real) => ({
      ...real,
      status: 2,
      stderr: Buffer.from("  bad tree \n"),
    }));
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    const tree = git(root, "write-tree").trim();
    expect(errors).toStrictEqual(
      failed(`git ls-tree -r -z --full-tree ${tree} failed: bad tree`),
    );
    restores.pop()?.();
    fakeGit("cat-file", (real) => ({
      ...real,
      error: new Error("spawn git ENOENT"),
    }));
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(
      failed("git cat-file --batch failed: spawn git ENOENT"),
    );
  });

  test("rejects malformed tree records", async () => {
    const root = repo(empty);
    const oid = git(root, "rev-parse :.kb/symbols.yaml").trim();
    for (const record of [
      `x100644 blob ${oid}\t.kb/symbols.yaml`,
      `100644 blob ${oid} .kb/symbols.yaml`,
      "garbage",
    ]) {
      fakeGit("ls-tree", (real) => ({
        ...real,
        stdout: Buffer.from(`${record}\0`),
      }));
      expect(await run(root)).toStrictEqual({ exitCode: 1 });
      expect(errors).toStrictEqual(failed("Could not parse staged Git tree"));
      restores.pop()?.();
    }
    fakeGit("ls-tree", (real) => ({
      ...real,
      stdout: Buffer.from(`100644 tree ${oid}\t.kb/symbols.yaml\0`),
    }));
    expect(await run(root)).toStrictEqual({ exitCode: 1 });
    expect(errors).toStrictEqual(
      failed("Unexpected Git object for .kb/symbols.yaml"),
    );
  });

  test("rejects malformed blob responses", async () => {
    const root = repo(empty);
    const oid = git(root, "rev-parse :.kb/symbols.yaml").trim();
    const body = "symbols: []\n";
    const cases: Array<[string, string]> = [
      ["no newline", "Incomplete Git blob response"],
      [`\n${oid} blob 12\n${body}\n`, `Invalid Git blob response for ${oid}`],
      [`x${oid} blob 12\n${body}\n`, `Invalid Git blob response for ${oid}`],
      [`${oid} blob 12x\n${body}\n`, `Invalid Git blob response for ${oid}`],
      [`${oid} tree 12\n${body}\n`, `Invalid Git blob response for ${oid}`],
      [
        `${"0".repeat(40)} blob 12\n${body}\n`,
        `Invalid Git blob response for ${oid}`,
      ],
      [`${oid} blob 12\n${body}`, `Incomplete Git blob ${oid}`],
      [`${oid} blob 13\n${body}\n`, `Incomplete Git blob ${oid}`],
      [`${oid} blob 10\n${body}\n`, `Incomplete Git blob ${oid}`],
      [
        `${oid} blob 99999999999999999999\n${body}\n`,
        `Incomplete Git blob ${oid}`,
      ],
    ];
    for (const [response, message] of cases) {
      fakeGit("cat-file", (real) => ({
        ...real,
        stdout: Buffer.from(response),
      }));
      expect(await run(root)).toStrictEqual({ exitCode: 1 });
      expect(errors).toStrictEqual(failed(message));
      restores.pop()?.();
    }
    fakeGit("cat-file", (real) => ({
      ...real,
      stdout: Buffer.from(`${oid} blob 12\n${body}\nextra`),
    }));
    expect(await run(root)).toStrictEqual({ exitCode: 0 });
  });
});
