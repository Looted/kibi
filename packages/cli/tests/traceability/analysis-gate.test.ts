// executable_for TEST-source-analysis-v2-contract
import { describe, expect, test } from "bun:test";
import { analysisObligation } from "../../src/traceability/analysis-gate.js";

const range = (startLine: number, endLine: number, reason: string) => ({
  startLine,
  startColumn: 0,
  endLine,
  endColumn: 1,
  reason,
});

const partial = (
  diagnosticCodes: string[],
  ranges: ReturnType<typeof range>[],
) => ({ status: "partial" as const, diagnosticCodes, uncoveredRanges: ranges });

describe("analysis gate", () => {
  test("the before side never blocks or needs review, whatever its status", () => {
    for (const status of ["failed", "unsupported"] as const)
      expect(
        analysisObligation(
          "before",
          { status, diagnosticCodes: ["X"], uncoveredRanges: [] },
          [{ start: 1, end: 100 }],
        ),
      ).toEqual({ kind: "none" });
    expect(
      analysisObligation(
        "before",
        partial(["TREESITTER_SYNTAX_ERROR"], [range(1, 3, "syntax error")]),
        [{ start: 1, end: 3 }],
      ),
    ).toEqual({ kind: "none" });
  });

  test("a local after-side gap outside the changed lines does not block", () => {
    const macro = partial(
      ["TREESITTER_MACRO_EXPANSION_UNAVAILABLE"],
      [range(40, 45, "macro-expansion-unavailable")],
    );
    expect(analysisObligation("after", macro, [{ start: 1, end: 10 }])).toEqual(
      { kind: "none" },
    );
  });

  test("a local after-side gap overlapping the changed lines needs a review of exactly those ranges", () => {
    const inside = range(5, 8, "decorator-expansion-unavailable");
    const outside = range(40, 45, "decorator-expansion-unavailable");
    expect(
      analysisObligation(
        "after",
        partial(
          ["TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE"],
          [inside, outside],
        ),
        [{ start: 8, end: 12 }],
      ),
    ).toEqual({ kind: "partial_review", ranges: [inside] });
  });

  test("non-local after-side diagnostics block even away from the changed lines", () => {
    // A removed brace is reported at end of file, not at the edit.
    const obligation = analysisObligation(
      "after",
      partial(
        ["TS1005"],
        [
          range(
            90,
            90,
            "The TypeScript parser reported TS1005 at this source span.",
          ),
        ],
      ),
      [{ start: 3, end: 3 }],
    );
    expect(obligation.kind).toBe("blocked");
    expect(
      analysisObligation(
        "after",
        partial(["TREESITTER_SYNTAX_ERROR"], [range(90, 90, "syntax")]),
        [{ start: 3, end: 3 }],
      ).kind,
    ).toBe("blocked");
  });

  test("failed after-side analysis blocks and unsupported needs a whole-file review", () => {
    expect(
      analysisObligation(
        "after",
        { status: "failed", diagnosticCodes: [], uncoveredRanges: [] },
        [],
      ).kind,
    ).toBe("blocked");
    expect(
      analysisObligation(
        "after",
        { status: "unsupported", diagnosticCodes: [], uncoveredRanges: [] },
        [],
      ),
    ).toEqual({ kind: "unsupported_review" });
  });
  test("a partial after side that reports no uncovered ranges blocks", () => {
    expect(
      analysisObligation("after", partial(["known_partial"], []), [
        { start: 1, end: 1 },
      ]).kind,
    ).toBe("blocked");
  });
});
