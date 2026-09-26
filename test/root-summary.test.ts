import { describe, expect, it } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  BATCH_CONCURRENCY,
  BATCH_TIMEOUT_MINUTES,
  CLI_ENGINE_BATCH_TIMEOUT_MS,
  CLI_UNIT_BATCHES,
  type SuiteSummary,
  getBatchFailureMessage,
  isCuratedSuiteEntryPoint,
  isolatedUnitBatchEnv,
  parseSuiteSummaries,
  runBatch,
} from "./root.test.ts";

// executable_for TEST-root-suite-batch-diagnostics
describe("getBatchFailureMessage", () => {
  it("bounds package-process parallelism", () => {
    expect(BATCH_CONCURRENCY).toBe(2);
    expect(BATCH_TIMEOUT_MINUTES).toBe(25);
  });

  it("gives journaled-engine and SkillOpt batches 120s isolates", () => {
    expect(CLI_ENGINE_BATCH_TIMEOUT_MS).toBe(120_000);
  });

  it("strips host KIBI_BRANCH from unit-batch child env", () => {
    const original = process.env.KIBI_BRANCH;
    process.env.KIBI_BRANCH = "feat/host-branch";
    try {
      const env = isolatedUnitBatchEnv("/tmp/kibi-unit-runtime");
      expect(env.KIBI_BRANCH).toBeUndefined();
      expect("KIBI_BRANCH" in env).toBe(false);
      expect(env.KIBI_RUNTIME_DIR).toBe("/tmp/kibi-unit-runtime");
    } finally {
      if (original === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_BRANCH");
      } else {
        process.env.KIBI_BRANCH = original;
      }
    }
  });

  it("pins curated unit children to test-mode Prolog semantics", () => {
    const original = process.env.NODE_ENV;
    try {
      for (const value of [undefined, "production"]) {
        if (value === undefined)
          Reflect.deleteProperty(process.env, "NODE_ENV");
        else process.env.NODE_ENV = value;
        expect(isolatedUnitBatchEnv("/tmp/kibi-unit-runtime").NODE_ENV).toBe(
          "test",
        );
      }
    } finally {
      if (original === undefined)
        Reflect.deleteProperty(process.env, "NODE_ENV");
      else process.env.NODE_ENV = original;
    }
  });

  it("reports a killed batch timeout before a missing summary", () => {
    expect(
      getBatchFailureMessage("cli", {
        timedOut: true,
        status: null,
        summaryCount: 0,
      }),
    ).toBe(
      `cli timed out after ${BATCH_TIMEOUT_MINUTES} minutes (status null; 0 summaries).`,
    );
  });
});

// executable_for TEST-root-suite-batch-diagnostics
describe("CLI process partition", () => {
  it("executes every CLI file exactly once across private process batches", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "kibi-unit-partition-"));
    const previousCwd = process.cwd();
    const recordsPath = join(workspace, "executed.jsonl");
    const files = [
      "packages/cli/tests/operations/check.test.ts",
      "packages/cli/tests/commands/discovery-shared-remaining.coverage.test.ts",
      // Similarly named files and tests outside tests/ must remain in the main batch.
      "packages/cli/tests/commands/check.test.ts",
      "packages/cli/src/runtime/cli-runtime.test.ts",
    ];
    try {
      for (const file of files) {
        const filePath = join(workspace, file);
        mkdirSync(dirname(filePath), { recursive: true });
        writeFileSync(
          filePath,
          `
import { expect, test } from "bun:test";
import { appendFileSync, existsSync } from "node:fs";
test(${JSON.stringify(file)}, () => {
  expect(process.env.NODE_ENV).toBe("test");
  expect(process.env.KIBI_BRANCH).toBeUndefined();
  const runtime = process.env.KIBI_RUNTIME_DIR;
  expect(runtime).toContain("kibi-unit-engine-runtime-");
  expect(existsSync(runtime)).toBe(true);
  appendFileSync(${JSON.stringify(recordsPath)}, JSON.stringify({file: ${JSON.stringify(file)}, runtime}) + "\\n");
});
`,
        );
      }
      process.chdir(workspace);
      const unpartitioned = await runBatch({
        label: "unpartitioned CLI fixture",
        args: [
          "test",
          "--timeout",
          String(CLI_ENGINE_BATCH_TIMEOUT_MS),
          "--isolate",
          "--max-concurrency=1",
          "./packages/cli",
        ],
      });
      const before = readFileSync(recordsPath, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as { file: string; runtime: string });
      rmSync(recordsPath);

      const summaries: SuiteSummary[] = [];
      for (const batch of CLI_UNIT_BATCHES) {
        expect(batch.args).toContain("--isolate");
        expect(batch.args).toContain("--max-concurrency=1");
        expect(batch.args[batch.args.indexOf("--timeout") + 1]).toBe("120000");
        summaries.push(await runBatch(batch));
      }
      const after = readFileSync(recordsPath, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line) as { file: string; runtime: string });
      expect(after.map((record) => record.file).sort()).toEqual(
        before.map((record) => record.file).sort(),
      );
      expect(new Set(after.map((record) => record.file)).size).toBe(
        files.length,
      );
      expect(after).toHaveLength(files.length);
      expect(
        summaries.reduce((total, summary) => total + summary.pass, 0),
      ).toBe(unpartitioned.pass);
      expect(
        summaries.reduce((total, summary) => total + summary.files, 0),
      ).toBe(unpartitioned.files);
      expect(
        summaries.every((summary) => summary.fail === 0 && summary.pass > 0),
      ).toBe(true);
      expect(new Set(after.map((record) => record.runtime)).size).toBe(
        CLI_UNIT_BATCHES.length,
      );
      expect(
        after.every((record) =>
          basename(record.runtime).startsWith("kibi-unit-engine-runtime-"),
        ),
      ).toBe(true);
    } finally {
      process.chdir(previousCwd);
      rmSync(workspace, { recursive: true, force: true });
    }
  });

  it("rejects a successful process that produced no test summary", async () => {
    await expect(
      runBatch({ label: "empty partition", args: ["-e", "void 0"] }),
    ).rejects.toThrow("Expected one Bun summary for empty partition, got 0.");
  });
});

describe("isCuratedSuiteEntryPoint", () => {
  const modulePath = "/workspace/test/root.test.ts";

  it("runs only as a direct script, not under bun test", () => {
    expect(
      isCuratedSuiteEntryPoint(["bun", modulePath], modulePath, true),
    ).toBe(true);
    expect(
      isCuratedSuiteEntryPoint(["bun", modulePath], modulePath, false),
    ).toBe(false);
    expect(
      isCuratedSuiteEntryPoint(
        ["bun", "test", "--timeout", "120000", modulePath],
        modulePath,
        true,
      ),
    ).toBe(false);
    expect(isCuratedSuiteEntryPoint(["bun"], modulePath, true)).toBe(false);
  });
});

describe("parseSuiteSummaries", () => {
  it("parses summary without skip line (legacy format)", () => {
    const output = [
      "  some stuff",
      "  42 pass",
      "  3 fail",
      "  128 expect() calls",
      "Ran 42 tests across 12 files.",
      "  trailing",
    ].join("\n");

    const result = parseSuiteSummaries(output);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ pass: 42, fail: 3, files: 12 });
  });

  it("parses summary with skip line (new Bun format)", () => {
    const output = [
      "",
      "  1561 pass",
      "  1 skip",
      "  1 fail",
      "  4268 expect() calls",
      "Ran 1563 tests across 123 files.",
    ].join("\n");

    const result = parseSuiteSummaries(output);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ pass: 1561, fail: 1, files: 123 });
  });

  it("parses summary with zero skip", () => {
    const output = [
      "",
      "  5 pass",
      "  0 skip",
      "  0 fail",
      "  25 expect() calls",
      "Ran 5 tests across 2 files.",
    ].join("\n");

    const result = parseSuiteSummaries(output);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ pass: 5, fail: 0, files: 2 });
  });

  it("rejects unrelated text with no match", () => {
    const result = parseSuiteSummaries("no numbers here\njust some text");
    expect(result).toHaveLength(0);
  });

  it("rejects output missing the fail line", () => {
    const output = ["  10 pass", "Ran 10 tests across 1 file."].join("\n");
    const result = parseSuiteSummaries(output);
    expect(result).toHaveLength(0);
  });

  it("rejects output missing the pass line", () => {
    const output = ["  5 fail", "Ran 5 tests across 1 file."].join("\n");
    const result = parseSuiteSummaries(output);
    expect(result).toHaveLength(0);
  });

  it("matches singular 'file' and plural 'files'", () => {
    const withSingular = [
      "",
      "  1 pass",
      "  0 fail",
      "Ran 1 test across 1 file.",
    ].join("\n");
    const withPlural = [
      "",
      "  2 pass",
      "  0 fail",
      "Ran 2 tests across 2 files.",
    ].join("\n");

    // Ensure old test runner output with known bun summary around it still works
    const resultSingular = parseSuiteSummaries(withSingular);
    expect(resultSingular).toHaveLength(1);
    expect(resultSingular[0]).toEqual({ pass: 1, fail: 0, files: 1 });

    const resultPlural = parseSuiteSummaries(withPlural);
    expect(resultPlural).toHaveLength(1);
    expect(resultPlural[0]).toEqual({ pass: 2, fail: 0, files: 2 });
  });

  it("extracts multiple summaries from concatenated output", () => {
    const output = [
      "",
      "  10 pass",
      "  0 skip",
      "  1 fail",
      "  50 expect() calls",
      "Ran 11 tests across 2 files.",
      "  --- separator --- ",
      "  20 pass",
      "  2 skip",
      "  0 fail",
      "  100 expect() calls",
      "Ran 22 tests across 3 files.",
    ].join("\n");

    const result = parseSuiteSummaries(output);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ pass: 10, fail: 1, files: 2 });
    expect(result[1]).toEqual({ pass: 20, fail: 0, files: 3 });
  });

  it("handles mixed format (some with skip, some without) in same output", () => {
    const output = [
      "",
      "  5 pass",
      "  1 fail",
      "  20 expect() calls",
      "Ran 6 tests across 1 file.",
      "  --- ",
      "  100 pass",
      "  2 skip",
      "  0 fail",
      "  300 expect() calls",
      "Ran 102 tests across 10 files.",
    ].join("\n");

    const result = parseSuiteSummaries(output);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ pass: 5, fail: 1, files: 1 });
    expect(result[1]).toEqual({ pass: 100, fail: 0, files: 10 });
  });
});
