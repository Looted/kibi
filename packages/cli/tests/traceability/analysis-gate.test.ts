// executable_for TEST-source-analysis-v2-contract
import { describe, expect, test } from "bun:test";
import type { HostSourceAnalysisResultV2 } from "../../src/plugins/source-analysis-service.js";
import {
  assertSourceAnalysisGate,
  partialAnalysisReviews,
} from "../../src/plugins/source-change-analysis.js";
import { analysisObligation } from "../../src/traceability/analysis-gate.js";
import type { StagedPath } from "../../src/traceability/git-staged.js";

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
  // executable_for TEST-kibi-tree-sitter-language-packs
  test("a missing or other-version grammar pack blocks instead of asking for a review", () => {
    for (const code of [
      "TREESITTER_LANGUAGE_PACK_MISSING",
      "TREESITTER_LANGUAGE_PACK_VERSION",
    ])
      expect(
        analysisObligation(
          "after",
          {
            status: "unsupported",
            diagnosticCodes: [code],
            uncoveredRanges: [],
          },
          [],
        ),
      ).toEqual({
        kind: "blocked",
        reason:
          "the kibi-lang grammar pack for this file is not installed at the version kibi-plugin-treesitter pins; kibi doctor gives the install line",
      });
    expect(
      analysisObligation(
        "before",
        {
          status: "unsupported",
          diagnosticCodes: ["TREESITTER_LANGUAGE_PACK_MISSING"],
          uncoveredRanges: [],
        },
        [],
      ).kind,
    ).toBe("none");
  });
  test("a partial after side that reports no uncovered ranges blocks", () => {
    expect(
      analysisObligation("after", partial(["known_partial"], []), [
        { start: 1, end: 1 },
      ]).kind,
    ).toBe("blocked");
  });
});

describe("staged gate over partial analysis", () => {
  // src/match.c: `#include` on lines 1-2, has_match on 4-9, and a macro call
  // gap on line 6 inside it.
  const after = (codes: string[]) =>
    ({
      sourceFile: "src/match.c",
      language: "c",
      module: { title: "match", language: "c", analysisMode: "parser" },
      contractVersion: "kibi.symbol-extractor.v2",
      status: "partial",
      symbols: [
        {
          name: "has_match",
          kind: "function",
          startLine: 4,
          endLine: 9,
          startColumn: 0,
          endColumn: 1,
        },
      ],
      diagnostics: codes.map((code) => ({
        code,
        message: `${code} message`,
        range: { startLine: 1, startColumn: 0, endLine: 2, endColumn: 0 },
      })),
      uncoveredRanges: [
        range(1, 2, "preprocessor-include-not-expanded"),
        range(6, 6, "macro-may-declare-symbols"),
      ],
      providerId: "fixture.c",
      stamp: null,
      inputFingerprint: "a".repeat(64),
      providerFingerprint: "b".repeat(64),
      shadowComparisons: [],
    }) as unknown as HostSourceAnalysisResultV2;
  const staged = (hunkRanges: { start: number; end: number }[]) =>
    [
      {
        path: "src/match.c",
        status: "M",
        hunkRanges,
        analysisDepth: "file",
        disposition: "advisory",
        content: "",
      },
    ] as StagedPath[];
  const analyses = (codes: string[]) =>
    new Map([
      [
        "src/match.c",
        { path: "src/match.c", before: null, after: after(codes) },
      ],
    ]);

  test("an added include asks for a file-level review instead of failing", () => {
    const inventory = staged([{ start: 2, end: 2 }]);
    const codes = ["TREESITTER_PREPROCESSOR_INCLUDE_UNAVAILABLE"];
    expect(() =>
      assertSourceAnalysisGate(inventory, analyses(codes)),
    ).not.toThrow();
    expect(partialAnalysisReviews(inventory, analyses(codes))).toEqual([
      {
        path: "src/match.c",
        lines: [{ startLine: 2, endLine: 2 }],
        ranges: [
          {
            startLine: 1,
            endLine: 2,
            reason: "preprocessor-include-not-expanded",
          },
        ],
        detail: "TREESITTER_PREPROCESSOR_INCLUDE_UNAVAILABLE message",
      },
    ]);
  });

  test("a gap inside a placed declaration is validated through that symbol", () => {
    expect(
      partialAnalysisReviews(
        staged([{ start: 6, end: 6 }]),
        analyses(["TREESITTER_MACRO_EXPANSION_UNAVAILABLE"]),
      ),
    ).toEqual([]);
  });

  test("a capped result places no declaration, so every touched gap is reviewed", () => {
    expect(
      partialAnalysisReviews(
        staged([{ start: 6, end: 6 }]),
        analyses(["TREESITTER_SYMBOL_LIMIT"]),
      ).map((review) => review.lines),
    ).toEqual([[{ startLine: 6, endLine: 6 }]]);
  });

  test("overlapping and adjacent hunks in one gap give one line range", () => {
    for (const hunks of [
      [
        { start: 1, end: 2 },
        { start: 2, end: 2 },
      ],
      [
        { start: 2, end: 2 },
        { start: 1, end: 1 },
      ],
    ])
      expect(
        partialAnalysisReviews(
          staged(hunks),
          analyses(["TREESITTER_PREPROCESSOR_INCLUDE_UNAVAILABLE"]),
        ).map((review) => review.lines),
      ).toEqual([[{ startLine: 1, endLine: 2 }]]);
  });

  test("a syntax error still fails the staged validation", () => {
    expect(() =>
      assertSourceAnalysisGate(
        staged([{ start: 2, end: 2 }]),
        analyses(["TREESITTER_SYNTAX_ERROR"]),
      ),
    ).toThrow("Source analysis partial for src/match.c");
  });
});
