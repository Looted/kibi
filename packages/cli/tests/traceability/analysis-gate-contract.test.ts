import { describe, expect, test } from "bun:test";
import {
  type GateAnalysis,
  analysisObligation,
} from "../../src/traceability/analysis-gate.js";

// implements REQ-source-analysis-v2

type R = { startLine: number; endLine: number; reason: string };

const gap = (startLine: number, endLine: number, reason = "macro"): R => ({
  startLine,
  endLine,
  reason,
});

function analysis(
  status: GateAnalysis<R>["status"],
  diagnosticCodes: string[] = [],
  uncoveredRanges: R[] = [],
): GateAnalysis<R> {
  return { status, diagnosticCodes, uncoveredRanges };
}

const HUNK = [{ start: 10, end: 20 }];
const WHOLE_FILE = {
  kind: "blocked",
  reason:
    "a parser, syntax, timeout or integrity diagnostic affects the whole file",
};

describe("analysisObligation", () => {
  test("nothing is needed for ok, missing or before-side analysis", () => {
    expect(analysisObligation("after", analysis("ok"), HUNK)).toStrictEqual({
      kind: "none",
    });
    expect(analysisObligation("after", null, HUNK)).toStrictEqual({
      kind: "none",
    });
    expect(analysisObligation("after", undefined, HUNK)).toStrictEqual({
      kind: "none",
    });
    expect(
      analysisObligation("before", analysis("failed"), HUNK),
    ).toStrictEqual({ kind: "none" });
  });

  test("failed analysis blocks", () => {
    expect(
      analysisObligation("after", analysis("failed", [], [gap(1, 2)]), HUNK),
    ).toStrictEqual({ kind: "blocked", reason: "source analysis failed" });
  });

  test("a missing language pack blocks only unsupported analysis", () => {
    expect(
      analysisObligation(
        "after",
        analysis("unsupported", ["X", "TREESITTER_LANGUAGE_PACK_MISSING"]),
        HUNK,
      ),
    ).toStrictEqual({
      kind: "blocked",
      reason:
        "the kibi-lang grammar pack for this file is not installed at the version kibi-plugin-treesitter pins; kibi doctor gives the install line",
    });
    expect(
      analysisObligation(
        "after",
        analysis("unsupported", ["X_TREESITTER_LANGUAGE_PACK_MISSING"]),
        HUNK,
      ),
    ).toStrictEqual({ kind: "unsupported_review" });
    expect(
      analysisObligation(
        "after",
        analysis("partial", ["TREESITTER_LANGUAGE_PACK_X"], [gap(10, 12)]),
        HUNK,
      ),
    ).toStrictEqual({ kind: "partial_review", ranges: [gap(10, 12)] });
  });

  test("partial analysis without uncovered ranges blocks", () => {
    expect(
      analysisObligation("after", analysis("partial", ["M"]), HUNK),
    ).toStrictEqual({
      kind: "blocked",
      reason: "partial analysis did not report which ranges it left uncovered",
    });
  });

  test("non-local markers in codes or range reasons block the whole file", () => {
    for (const marker of [
      "SYNTAX",
      "Parse",
      "timeout",
      "timed out",
      "timedout",
      "TIMED_OUT",
      "timed-out",
      "timed \t out",
      "integrity",
      "checksum",
      "failed",
      "failure",
      "error",
      "input limit",
      "INPUT_LIMIT",
      "inputlimit",
      "input-_ limit",
    ]) {
      expect(
        analysisObligation(
          "after",
          analysis("partial", [`A_${marker}_B`], [gap(90, 95)]),
          HUNK,
        ),
      ).toStrictEqual(WHOLE_FILE);
      expect(
        analysisObligation(
          "after",
          analysis("partial", ["M"], [gap(90, 95, `x ${marker} y`)]),
          HUNK,
        ),
      ).toStrictEqual(WHOLE_FILE);
    }
  });

  test("markers are not formed across separate codes", () => {
    expect(
      analysisObligation(
        "after",
        analysis("partial", ["TIME", "OUT"], [gap(90, 95, "x")]),
        HUNK,
      ),
    ).toStrictEqual({ kind: "none" });
  });

  test("words near a marker stay local", () => {
    for (const code of ["timedXout", "inputXlimit", "timed", "input"]) {
      expect(
        analysisObligation(
          "after",
          analysis("partial", [code], [gap(90, 95, "macro")]),
          HUNK,
        ),
      ).toStrictEqual({ kind: "none" });
    }
  });

  test("local gaps need review only where they touch a changed hunk", () => {
    const ranges = [
      gap(1, 9),
      gap(1, 10),
      gap(20, 30),
      gap(21, 30),
      gap(15, 16),
    ];
    expect(
      analysisObligation("after", analysis("partial", ["M"], ranges), HUNK),
    ).toStrictEqual({
      kind: "partial_review",
      ranges: [gap(1, 10), gap(20, 30), gap(15, 16)],
    });
  });

  test("a gap touching any one of several hunks needs review", () => {
    expect(
      analysisObligation("after", analysis("partial", ["M"], [gap(50, 52)]), [
        { start: 1, end: 2 },
        { start: 51, end: 51 },
      ]),
    ).toStrictEqual({ kind: "partial_review", ranges: [gap(50, 52)] });
    expect(
      analysisObligation(
        "after",
        analysis("partial", ["M"], [gap(50, 52)]),
        [],
      ),
    ).toStrictEqual({ kind: "none" });
  });
});
