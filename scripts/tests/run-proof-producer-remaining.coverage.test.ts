import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  acceptUnitResultsLedger,
  createTestFileReuse,
  loadProofSteps,
  main,
  reusableBunTestFiles,
  runProofProducerIfEntrypoint,
  terminateStepProcess,
  validateProofSteps,
  validateRequestedTestIds,
} from "../run-proof-producer.mjs";

const created: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-proof-producer-"));
  created.push(dir);
  return dir;
}

afterEach(() => {
  process.exitCode = 0;
  for (const dir of created.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("proof step validation", () => {
  test("rejects an empty list, a non-object entry and an empty test id", () => {
    for (const value of [[], {}, null]) {
      expect(() => validateProofSteps(value)).toThrow(
        "run-proof-producer: proof steps must be a non-empty array",
      );
    }
    for (const entry of [null, "x", []]) {
      expect(() => validateProofSteps([entry])).toThrow(
        "run-proof-producer: entry 0 must be an object",
      );
    }
    for (const testId of [undefined, 3, "  "]) {
      expect(() =>
        validateProofSteps([{ test_id: testId, steps: [["bun"]] }]),
      ).toThrow("run-proof-producer: entry 0 has an empty test_id");
    }
  });

  test("rejects a requested id that is not a non-empty string", () => {
    expect(() => validateRequestedTestIds(["TEST-a", " "])).toThrow(
      "run-proof-producer: requested test ID 1 must be a non-empty string",
    );
    expect(() => validateRequestedTestIds([7])).toThrow(
      "run-proof-producer: requested test ID 0 must be a non-empty string",
    );
  });

  test("loads proof/steps.json from the workspace", () => {
    const root = tempDir();
    expect(() => loadProofSteps(root)).toThrow(
      `run-proof-producer: unable to read ${path.join(root, "proof", "steps.json")}: `,
    );
    mkdirSync(path.join(root, "proof"));
    writeFileSync(
      path.join(root, "proof", "steps.json"),
      JSON.stringify([{ test_id: " TEST-a ", steps: [["true"]] }]),
    );
    expect(loadProofSteps(root)).toStrictEqual([
      { test_id: "TEST-a", steps: [["true"]] },
    ]);
  });
});

describe("terminating a proof step", () => {
  test("falls back to the child handle when there is no process group", () => {
    const signals: string[] = [];
    expect(
      terminateStepProcess({
        pid: undefined,
        kill: (s: string) => signals.push(s),
      }),
    ).toBe(true);
    expect(signals).toStrictEqual(["SIGTERM"]);
    expect(
      terminateStepProcess(
        {
          pid: 0,
          kill: () => {
            throw new Error("gone");
          },
        },
        "SIGKILL",
      ),
    ).toBe(false);
    expect(terminateStepProcess(undefined)).toBe(false);
  });

  test("a vanished process group falls back to the child handle", () => {
    const signals: string[] = [];
    expect(
      terminateStepProcess({
        pid: 2 ** 22 - 3,
        kill: (s: string) => signals.push(s),
      }),
    ).toBe(true);
    expect(signals).toStrictEqual(["SIGTERM"]);
  });
});

describe("unit results reuse identity", () => {
  function gitRepo(): { root: string; commit: string } {
    const root = tempDir();
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    git("init", "-q");
    git("config", "user.name", "Proof Test");
    git("config", "user.email", "proof@example.test");
    git("config", "commit.gpgsign", "false");
    writeFileSync(path.join(root, "tracked.txt"), "a\n");
    git("add", ".");
    git("commit", "-qm", "init");
    return { root, commit: git("rev-parse", "HEAD") };
  }

  function ledger(root: string, value: unknown): string {
    const file = path.join(root, "ledger.json");
    writeFileSync(
      file,
      typeof value === "string" ? value : JSON.stringify(value),
    );
    return file;
  }

  test("accepts a ledger for the clean checked-out commit", async () => {
    const { root, commit } = gitRepo();
    const lines: string[] = [];
    const reuse = createTestFileReuse({
      workspaceRoot: root,
      write: (line: string) => lines.push(line),
      env: {
        KIBI_PROOF_UNIT_RESULTS: ledger(root, {
          version: "kibi.unit-test-results.v1",
          commit,
          files: { "a.test.ts": { tests: 1, failures: 0, skipped: 0 } },
        }),
      },
    });
    expect(await reuse.source(["a.test.ts"])).toBe("unit-coverage");
    expect(lines).toStrictEqual([
      `[proof] unit results accepted for ${commit}: 1 clean test file(s)`,
    ]);
  });

  test("a dirty tree, a non-repository or an unreadable ledger is not reused", async () => {
    const { root, commit } = gitRepo();
    writeFileSync(path.join(root, "tracked.txt"), "changed\n");
    const lines: string[] = [];
    const valid = {
      version: "kibi.unit-test-results.v1",
      commit,
      files: { "a.test.ts": { tests: 1, failures: 0, skipped: 0 } },
    };
    const dirty = createTestFileReuse({
      workspaceRoot: root,
      write: (line: string) => lines.push(line),
      env: { KIBI_PROOF_UNIT_RESULTS: ledger(root, valid) },
    });
    expect(await dirty.source(["a.test.ts"])).toBeNull();

    const plain = tempDir();
    const outside = createTestFileReuse({
      workspaceRoot: plain,
      write: (line: string) => lines.push(line),
      env: { KIBI_PROOF_UNIT_RESULTS: ledger(plain, valid) },
    });
    expect(await outside.source(["a.test.ts"])).toBeNull();

    const broken = createTestFileReuse({
      workspaceRoot: plain,
      write: (line: string) => lines.push(line),
      env: { KIBI_PROOF_UNIT_RESULTS: ledger(plain, "{not json") },
    });
    expect(await broken.source(["a.test.ts"])).toBeNull();
    expect(lines).toStrictEqual([
      "[proof] unit results not reused: tracked files differ from the commit",
      `[proof] unit results not reused: unit results are for ${commit}, not an unknown commit`,
      "[proof] unit results not reused: unit results are malformed",
    ]);
  });
});

describe("reuse rules", () => {
  test("a proof test file always runs", () => {
    const root = tempDir();
    writeFileSync(path.join(root, "x.proof.test.ts"), "");
    writeFileSync(path.join(root, "y.test.ts"), "");
    expect(
      reusableBunTestFiles(["bun", "test", "./y.test.ts"], root),
    ).toStrictEqual(["y.test.ts"]);
    expect(
      reusableBunTestFiles(["bun", "test", "./x.proof.test.ts"], root),
    ).toBeNull();
  });

  test("a ledger without files is not reused", () => {
    expect(
      acceptUnitResultsLedger(
        { version: "kibi.unit-test-results.v1", commit: "c", files: null },
        { commit: "c", dirty: false },
      ),
    ).toStrictEqual({ files: null, reason: "unit results list no files" });
  });

  test("a ledger that never appears is polled until the deadline", async () => {
    const root = tempDir();
    const lines: string[] = [];
    const reuse = createTestFileReuse({
      workspaceRoot: root,
      write: (line: string) => lines.push(line),
      identity: () => ({ commit: "c", dirty: false }),
      env: {
        KIBI_PROOF_UNIT_RESULTS: "missing.json",
        KIBI_PROOF_UNIT_RESULTS_WAIT_MS: "50",
      },
    });
    expect(await reuse.source(["a.test.ts"])).toBeNull();
    expect(lines).toStrictEqual([
      `[proof] unit results not reused: ${path.join(root, "missing.json")} did not appear`,
    ]);
  });
});

describe("proof producer entry point", () => {
  test("reads the requested ids and steps from the environment and workspace", async () => {
    const root = tempDir();
    mkdirSync(path.join(root, "proof"));
    writeFileSync(
      path.join(root, "proof", "steps.json"),
      JSON.stringify([{ test_id: "TEST-env", steps: [["true"]] }]),
    );
    const lines: string[] = [];
    expect(
      await main({
        env: { KIBI_PROOF_TEST_IDS: '["TEST-env"]' },
        workspaceRoot: root,
        write: (line: string) => lines.push(line),
      }),
    ).toBe(0);
    expect(lines.at(-1)).toBe("[proof] all steps passed for 1 test(s)");
  });

  test("main returns the producer exit code", async () => {
    const lines: string[] = [];
    expect(
      await main({
        testIds: ["TEST-a"],
        entries: [{ test_id: "TEST-a", steps: [["true"]] }],
        write: (line: string) => lines.push(line),
        env: {},
        workspaceRoot: tempDir(),
      }),
    ).toBe(0);
    expect(lines.at(-1)).toBe("[proof] all steps passed for 1 test(s)");
  });

  test("reports a failing start on stderr", async () => {
    const stderr: string[] = [];
    const write = spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr.push(String(chunk));
      return true;
    });
    const script = path.join(import.meta.dir, "..", "run-proof-producer.mjs");
    const url = `file://${script}`;
    try {
      await runProofProducerIfEntrypoint(script, url, async () => {
        throw new Error("no steps");
      });
      expect(process.exitCode).toBe(1);
      await runProofProducerIfEntrypoint(script, url, async () => {
        throw "plain";
      });
      expect(stderr).toStrictEqual(["no steps\n", "plain\n"]);
      await runProofProducerIfEntrypoint(script, url, async () => 0);
      expect(process.exitCode).toBe(0);
    } finally {
      write.mockRestore();
    }
  });
});
