import { describe, expect, test } from "bun:test";
import type { Violation } from "../../src/public/check-types.js";
import type { ChangedFileImpactResult } from "../../src/public/impact-diagnostics.js";
import type { QualityDiagnostic } from "../../src/public/impact/types.js";
import {
  buildStructuredContent,
  buildSummary,
  formatImpactText,
  formatQualityDiagnosticsText,
  formatViolationText,
} from "../../src/public/operations/check-format-shared.js";

const emptyImpact = {
  impactDiagnostics: [],
  sourceFiles: [],
  extractedSymbols: [],
  linkedEntities: [],
  nextActions: [],
} as unknown as ChangedFileImpactResult;

const impact: ChangedFileImpactResult = {
  impactDiagnostics: [
    {
      id: "IMP-1",
      severity: "warning",
      files: ["a.ts"],
      message: "changed",
      suggestion: "review",
    },
    {
      id: "IMP-2",
      severity: "error",
      files: [],
      message: "unknown file",
      suggestion: "add source",
    },
  ],
  sourceFiles: ["a.ts"],
  extractedSymbols: [],
  linkedEntities: [],
  nextActions: ["run check"],
} as unknown as ChangedFileImpactResult;

const quality: QualityDiagnostic[] = [
  {
    id: "QD-1",
    severity: "warning",
    category: "coverage",
    message: "thin",
    blocking: false,
    suggestion: "add tests",
    files: ["a.ts"],
    docs: ["docs/x.md"],
    entityId: "REQ-1",
    source: "unit",
  },
  {
    id: "QD-2",
    severity: "error",
    category: "proof",
    message: "missing",
    blocking: true,
    suggestion: "prove",
  },
];

const violations: Violation[] = [
  {
    rule: "required-fields",
    entityId: "REQ-1",
    source: "a.md",
    description: "title missing",
    suggestion: "add title",
  },
  {
    rule: "no-dangling-refs",
    entityId: "REQ-2",
    description: "missing target",
  },
];

describe("check-format-shared formatters", () => {
  test("covers empty and populated impact, quality, violation, and summary paths", () => {
    expect(formatImpactText(emptyImpact)).toBe("No impact diagnostics found");
    expect(formatImpactText(impact)).toContain("2 impact diagnostics found");
    expect(formatImpactText(impact)).toContain("unknown-source");

    expect(formatQualityDiagnosticsText([])).toBe(
      "No quality diagnostics found",
    );
    const qualityText = formatQualityDiagnosticsText(quality);
    expect(qualityText).toContain("2 quality diagnostics found");
    expect(qualityText).toContain("Entity: REQ-1");
    expect(qualityText).toContain("Source: unit");
    expect(qualityText).toContain("Blocking: no");
    expect(qualityText).toContain("Blocking: yes");

    expect(formatViolationText([])).toBe("No violations found");
    const violationText = formatViolationText(violations);
    expect(violationText).toContain("2 violations found");
    expect(violationText).toContain("Suggestion: add title");
    expect(violationText).toContain("unknown-source");

    const structured = buildStructuredContent({
      violations,
      evaluated: {
        ruleCount: 2,
        rules: ["required-fields", "domain-contradictions"],
        domainContradictions: { factPairsExamined: 3 },
      },
      diagnostics: [
        {
          category: "schema",
          severity: "error",
          message: "bad",
          file: "a.md",
          suggestion: "fix",
        },
        { category: "schema", severity: "warning", message: "thin" },
      ],
      qualityDiagnostics: quality,
      impactResult: impact,
      migrationPlan: { version: "kibi.migration-plan.v1" } as never,
    });
    expect(structured.count).toBe(2);
    expect(structured.qualityDiagnostics?.length).toBe(2);
    expect(structured.migrationPlan).toBeDefined();
    expect(structured.diagnostics[0]?.file).toBe("a.md");

    expect(structured.evaluated).toEqual({
      ruleCount: 2,
      rules: ["required-fields", "domain-contradictions"],
      domainContradictions: { factPairsExamined: 3 },
    });
    const thin = buildStructuredContent({
      violations: [],
      evaluated: { ruleCount: 0, rules: [] },
      diagnostics: [],
      impactResult: undefined,
    });
    expect(thin.count).toBe(0);
    expect(thin.evaluated).toEqual({ ruleCount: 0, rules: [] });
    expect(thin.qualityDiagnostics).toBeUndefined();
    expect(thin.impactDiagnostics).toBeUndefined();

    expect(
      buildSummary({
        violations: [],
        impactResult: undefined,
        qualityDiagnostics: [],
      }),
    ).toBe("No violations found");
    // A clean check says what it evaluated, so "no violations" is never
    // mistaken for "nothing evaluated".
    expect(
      buildSummary({
        violations: [],
        evaluated: {
          ruleCount: 1,
          rules: ["domain-contradictions"],
          domainContradictions: { factPairsExamined: 0 },
        },
        impactResult: undefined,
        qualityDiagnostics: [],
      }),
    ).toBe(
      "No violations found\nEvaluated 1 rule; domain-contradictions compared 0 fact pairs (no two current requirements constrain the same subject or predicate case).",
    );
    const summary = buildSummary({
      violations,
      evaluated: {
        ruleCount: 2,
        rules: ["required-fields", "domain-contradictions"],
        domainContradictions: { factPairsExamined: 3 },
      },
      impactResult: impact,
      qualityDiagnostics: quality,
    });
    expect(summary).toContain("violations found");
    expect(summary).toContain(
      "Evaluated 2 rules; domain-contradictions compared 3 fact pairs.",
    );
    expect(summary).toContain("impact diagnostics found");
    expect(summary).toContain("quality diagnostic");
  });
});

describe("buildStructuredContent impact compaction", () => {
  const symbol = {
    id: "SYM-run",
    name: "run",
    kind: "function",
    role: "behavioral",
    location: { file: "a.ts", startLine: 1, endLine: 2 },
    hunkRanges: [{ start: 1, end: 2 }],
    linkedEntityIds: ["REQ-a"],
  };
  const build = (diagnostics: unknown[]) =>
    buildStructuredContent({
      violations: [],
      evaluated: { ruleCount: 0 },
      diagnostics: [],
      impactResult: {
        impactDiagnostics: diagnostics,
        sourceFiles: ["a.ts"],
        extractedSymbols: [symbol],
        linkedEntities: [
          {
            id: "REQ-a",
            relationshipType: "implements",
            sourceSymbolId: "SYM-run",
            sourceSymbolName: "run",
          },
        ],
        nextActions: [],
      } as unknown as ChangedFileImpactResult,
    });

  test("lists symbols without the links linkedEntities carries", () => {
    const { linkedEntityIds: _linked, ...rest } = symbol;
    expect(build([]).extractedSymbols).toEqual([rest]);
  });

  test("gives shared advice once, and none when no diagnostic shares any", () => {
    const shared = {
      id: "symbol_semantic_review_needed",
      severity: "warning",
      files: ["a.ts"],
      message: "Changed behavioral symbol run needs semantic review",
      suggestion:
        "Use kb_search and kb_query for a.ts, then verify that REQ-a actually describe and test the changed behavior or UI copy. Update Kibi links or requirements/tests while the edit context is fresh.",
    };
    const withAdvice = build([shared, shared]);
    expect(withAdvice.impactAdvice).toEqual([
      "Use kb_search and kb_query for the file in files, then verify that the entities the message names actually describe and test the changed behavior or UI copy. Update Kibi links or requirements/tests while the edit context is fresh.",
    ]);
    expect(withAdvice.impactDiagnostics?.map((d) => d.advice)).toEqual([0, 0]);
    const own = build([{ ...shared, suggestion: "review" }]);
    expect("impactAdvice" in own).toBe(false);
    expect(own.impactDiagnostics?.[0]?.suggestion).toBe("review");
  });
});
