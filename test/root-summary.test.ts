import { describe, expect, it } from "bun:test";
import {
  BATCH_CONCURRENCY,
  BATCH_TIMEOUT_MINUTES,
  CLI_ENGINE_BATCH_TIMEOUT_MS,
  type SuiteSummary,
  getBatchFailureMessage,
  isCuratedSuiteEntryPoint,
  isolatedUnitBatchEnv,
  parseSuiteSummaries,
} from "./root.test.ts";

// executable_for TEST-root-suite-batch-diagnostics
describe("getBatchFailureMessage", () => {
  it("bounds package-process parallelism", () => {
    expect(BATCH_CONCURRENCY).toBe(2);
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

describe("isCuratedSuiteEntryPoint", () => {
  const modulePath = "/workspace/test/root.test.ts";

  it("runs only as a direct script, not under bun test", () => {
    expect(
      isCuratedSuiteEntryPoint(["bun", modulePath], modulePath),
    ).toBe(true);
    expect(
      isCuratedSuiteEntryPoint(
        ["bun", "test", "--timeout", "120000", modulePath],
        modulePath,
      ),
    ).toBe(false);
    expect(
      isCuratedSuiteEntryPoint(
        ["bun", "test", modulePath, "./packages/cli/tests/engine.test.ts"],
        modulePath,
      ),
    ).toBe(false);
    expect(isCuratedSuiteEntryPoint(["bun"], modulePath)).toBe(false);
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
      "Ran 1 tests across 1 file.",
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
