// implements REQ-kibi-proof-receipts
import { afterEach, describe, expect, test } from "bun:test";
import { mapRunOutcome } from "../../src/proof/evaluate.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("proof evaluate leftover run outcomes", () => {
  test("maps passed and the remaining run outcomes", () => {
    expect(mapRunOutcome("passed")).toBe("passed");
    expect(mapRunOutcome("errored")).toBe("errored");
    expect(mapRunOutcome("cancelled")).toBe("cancelled");
    expect(mapRunOutcome("timed_out")).toBe("timed_out");
    expect(mapRunOutcome("interrupted")).toBe("interrupted");
    expect(mapRunOutcome("failed")).toBe("failed");
    expect(mapRunOutcome("no_results")).toBe("failed");
  });
});
