import { describe, expect, test } from "bun:test";
import {
  compilerFingerprintReason,
  failedSourceKeepsSemanticBaseline,
  sourceExtractionFailure,
} from "../../src/commands/sync/cache.js";

const base = { hash: "h", message: "m" };

describe("failedSourceKeepsSemanticBaseline", () => {
  test("a source with a semantic contract never keeps the baseline", () => {
    expect(
      failedSourceKeepsSemanticBaseline(
        { ...base, semanticContract: true, baseline: true } as never,
        "x",
      ),
    ).toBe(false);
  });

  test("legacy failures keep the baseline only when flagged", () => {
    expect(
      failedSourceKeepsSemanticBaseline(
        { ...base, baseline: true } as never,
        "x",
      ),
    ).toBe(true);
    expect(failedSourceKeepsSemanticBaseline(base as never, "x")).toBe(false);
  });

  test("previously compiled sources keep it while their prose hash is unchanged", () => {
    const failure = { ...base, semanticHash: "same" } as never;
    expect(failedSourceKeepsSemanticBaseline(failure, "same")).toBe(true);
    expect(failedSourceKeepsSemanticBaseline(failure, "other")).toBe(false);
  });
});

describe("sync cache readers on a corrupt cache", () => {
  const corrupt = {
    existsSync: () => true,
    readFileSync: () => "{not json",
  } as never;

  test("sourceExtractionFailure treats unreadable JSON as no failures", () => {
    expect(
      sourceExtractionFailure("/ws", "/store", "a.md", corrupt),
    ).toBeUndefined();
  });

  test("compilerFingerprintReason treats unreadable JSON as no reason", () => {
    expect(compilerFingerprintReason("/store", corrupt)).toBeNull();
  });
});
