import { describe, expect, test } from "bun:test";
import type { Violation } from "../../../src/public/check-types.js";
import type { ChangedFileImpactResult } from "../../../src/public/impact-diagnostics.js";
import type { QualityDiagnostic } from "../../../src/public/impact/types.js";
import {
  buildStructuredContent,
  buildSummary,
  formatEvaluatedText,
  formatImpactText,
  formatQualityDiagnosticsText,
  formatViolationText,
  qualityDiagnosticsBesideImpact,
} from "../../../src/public/operations/check-format-shared.js";

function impact(
  impactDiagnostics: readonly Record<string, unknown>[],
): ChangedFileImpactResult {
  return {
    impactDiagnostics,
    sourceFiles: ["s.ts"],
    extractedSymbols: [{ name: "x" }],
    linkedEntities: ["REQ-l"],
    nextActions: ["act"],
  } as unknown as ChangedFileImpactResult;
}

const quality = (extra: Partial<QualityDiagnostic> = {}): QualityDiagnostic =>
  ({
    id: "Q-1",
    severity: "warning",
    blocking: false,
    category: "symbol",
    message: "msg",
    suggestion: "fix",
    ...extra,
  }) as QualityDiagnostic;

describe("formatImpactText", () => {
  test("lists each diagnostic with its files", () => {
    expect(formatImpactText(impact([]))).toBe("No impact diagnostics found");
    expect(
      formatImpactText(
        impact([
          {
            id: "I1",
            severity: "error",
            files: ["a.ts", "b.ts"],
            message: "m1",
            suggestion: "s1",
          },
          {
            id: "I2",
            severity: "warning",
            files: [],
            message: "m2",
            suggestion: "s2",
          },
        ]),
      ),
    ).toBe(
      "2 impact diagnostics found\n- I1 | error | a.ts, b.ts | m1 Suggestion: s1\n- I2 | warning | unknown-source | m2 Suggestion: s2",
    );
  });
});

describe("a suggestion shared by several impact diagnostics", () => {
  const review = (message: string, extra: Record<string, unknown> = {}) => ({
    id: "symbol_semantic_review_needed",
    severity: "warning",
    files: ["w.py"],
    message,
    suggestion: "review",
    ...extra,
  });

  test("is written once, above the messages it applies to", () => {
    expect(
      formatImpactText(
        impact([
          review("a"),
          { ...review("only"), id: "I9" },
          review("b"),
          review("c"),
        ]),
      ),
    ).toBe(
      [
        "4 impact diagnostics found",
        "- symbol_semantic_review_needed | warning | w.py | 3 diagnostics. Suggestion for each: review",
        "  - a",
        "  - b",
        "  - c",
        "- I9 | warning | w.py | only Suggestion: review",
      ].join("\n"),
    );
  });

  test("is not shared across severities, files or suggestions", () => {
    expect(
      formatImpactText(
        impact([
          review("a"),
          review("b", { severity: "error" }),
          review("c", { files: ["x.py"] }),
          review("d", { suggestion: "other" }),
        ]),
      ),
    ).toBe(
      [
        "4 impact diagnostics found",
        "- symbol_semantic_review_needed | warning | w.py | a Suggestion: review",
        "- symbol_semantic_review_needed | error | w.py | b Suggestion: review",
        "- symbol_semantic_review_needed | warning | x.py | c Suggestion: review",
        "- symbol_semantic_review_needed | warning | w.py | d Suggestion: other",
      ].join("\n"),
    );
  });
});

describe("a diagnostic the impact analysis reported", () => {
  const reported = {
    id: "symbol_semantic_review_needed",
    severity: "warning",
    blocking: false,
    category: "symbol",
    files: ["w.py"],
    message: "m",
    suggestion: "s",
  };
  const other = quality();
  const result = impact([reported]);
  const both = [other, reported as unknown as QualityDiagnostic];

  test("is listed under impactDiagnostics only", () => {
    expect(qualityDiagnosticsBesideImpact(both, undefined)).toBe(both);
    expect(qualityDiagnosticsBesideImpact(both, result)).toStrictEqual([other]);
    const content = buildStructuredContent({
      violations: [],
      evaluated: { rules: [] },
      diagnostics: [],
      qualityDiagnostics: both,
      impactResult: result,
    });
    expect(content.qualityDiagnostics).toStrictEqual([other]);
    expect(content.impactDiagnostics).toStrictEqual([reported] as never);
    expect(
      buildStructuredContent({
        violations: [],
        evaluated: { rules: [] },
        diagnostics: [],
        qualityDiagnostics: [reported as unknown as QualityDiagnostic],
        impactResult: result,
      }),
    ).not.toHaveProperty("qualityDiagnostics");
  });

  test("is written once in the summary", () => {
    expect(
      buildSummary({
        violations: [],
        impactResult: result,
        qualityDiagnostics: [reported as unknown as QualityDiagnostic],
      }),
    ).toBe(
      "No violations found\n1 impact diagnostics found\n- symbol_semantic_review_needed | warning | w.py | m Suggestion: s",
    );
  });
});

describe("formatQualityDiagnosticsText", () => {
  test("lists each diagnostic with its metadata", () => {
    expect(formatQualityDiagnosticsText([])).toBe(
      "No quality diagnostics found",
    );
    expect(formatQualityDiagnosticsText([quality()])).toBe(
      "1 quality diagnostic found\n- Q-1 | warning | symbol | msg\n  Blocking: no\n  Suggestion: fix",
    );
    expect(
      formatQualityDiagnosticsText([
        quality({
          blocking: true,
          files: ["a.ts", "b.ts"],
          docs: ["d.md"],
          entityId: "REQ-1",
          source: "r.md",
        }),
        quality({ id: "Q-2", files: [], docs: [] }),
      ]),
    ).toBe(
      "2 quality diagnostics found\n- Q-1 | warning | symbol | msg\n  Blocking: yes\n  Files: a.ts, b.ts\n  Docs: d.md\n  Entity: REQ-1\n  Source: r.md\n  Suggestion: fix\n- Q-2 | warning | symbol | msg\n  Blocking: no\n  Suggestion: fix",
    );
  });
});

describe("formatViolationText", () => {
  const violation: Violation = {
    rule: "r",
    entityId: "E",
    description: "d",
  };

  test("lists each violation", () => {
    expect(
      formatViolationText([
        violation,
        { ...violation, source: "s.md", suggestion: "do" },
        { ...violation, suggestion: "" },
      ]),
    ).toBe(
      "3 violations found\n- r | E | unknown-source | d\n- r | E | s.md | d | Suggestion: do\n- r | E | unknown-source | d",
    );
  });

  test("names unverified requirements when nothing is violated", () => {
    expect(formatViolationText([])).toBe("No violations found");
    expect(formatViolationText([], [])).toBe("No violations found");
    expect(formatViolationText([], ["REQ-1"])).toBe(
      "No structural violations found. The changed code implements REQ-1; Kibi did not compare the code with its statement (quoted under requirement_statement_unverified below), so confirm the change still does what each says, and ask the person before keeping a change that contradicts one",
    );
    expect(formatViolationText([], ["REQ-1", "REQ-2"])).toBe(
      "No structural violations found. The changed code implements REQ-1, REQ-2; Kibi did not compare the code with their statements (quoted under requirement_statement_unverified below), so confirm the change still does what each says, and ask the person before keeping a change that contradicts one",
    );
  });
});

describe("formatEvaluatedText", () => {
  test("counts rules and compared fact pairs", () => {
    expect(formatEvaluatedText({ rules: [] })).toBe("Evaluated no rules.");
    expect(formatEvaluatedText({ rules: ["a"] })).toBe("Evaluated 1 rule.");
    expect(formatEvaluatedText({ rules: ["a", "b"] })).toBe(
      "Evaluated 2 rules.",
    );
    expect(
      formatEvaluatedText({
        rules: ["a"],
        domainContradictions: { factPairsExamined: 0 },
      }),
    ).toBe(
      "Evaluated 1 rule; domain-contradictions compared 0 fact pairs (no two current requirements constrain the same subject or predicate case).",
    );
    expect(
      formatEvaluatedText({
        rules: [],
        domainContradictions: { factPairsExamined: 1 },
      }),
    ).toBe("Evaluated no rules; domain-contradictions compared 1 fact pair.");
    expect(
      formatEvaluatedText({
        rules: [],
        domainContradictions: { factPairsExamined: 2 },
      }),
    ).toBe("Evaluated no rules; domain-contradictions compared 2 fact pairs.");
  });
});

describe("buildStructuredContent", () => {
  test("keeps only the parts that are present", () => {
    const rules = ["a"];
    const violations: Violation[] = [
      { rule: "r", entityId: "E", description: "d" },
    ];
    const built = buildStructuredContent({
      violations,
      evaluated: { rules },
      diagnostics: [
        { category: "c", severity: "error", message: "m" },
        {
          category: "c",
          severity: "warning",
          message: "m",
          file: "f",
          suggestion: "s",
        },
      ],
      impactResult: undefined,
    });
    expect(built).toStrictEqual({
      violations: [{ rule: "r", entityId: "E", description: "d" }],
      count: 1,
      evaluated: { rules: ["a"] },
      diagnostics: [
        { category: "c", severity: "error", message: "m" },
        {
          category: "c",
          severity: "warning",
          message: "m",
          file: "f",
          suggestion: "s",
        },
      ],
    });
    expect(built.violations).not.toBe(violations);
    expect(built.evaluated.rules).not.toBe(rules);
    expect(
      buildStructuredContent({
        violations: [],
        evaluated: { rules: [] },
        diagnostics: [],
        qualityDiagnostics: [],
        impactResult: undefined,
      }),
    ).toStrictEqual({
      violations: [],
      count: 0,
      evaluated: { rules: [] },
      diagnostics: [],
    });
  });

  test("adds quality, impact, contradiction and migration parts", () => {
    const plan = { steps: [] } as never;
    expect(
      buildStructuredContent({
        violations: [],
        evaluated: {
          rules: [],
          domainContradictions: { factPairsExamined: 3 },
        },
        diagnostics: [],
        qualityDiagnostics: [quality()],
        impactResult: impact([{ id: "I" }]),
        migrationPlan: plan,
      }),
    ).toStrictEqual({
      violations: [],
      count: 0,
      evaluated: { rules: [], domainContradictions: { factPairsExamined: 3 } },
      diagnostics: [],
      qualityDiagnostics: [quality()],
      impactDiagnostics: [{ id: "I" }],
      sourceFiles: ["s.ts"],
      extractedSymbols: [{ name: "x" }],
      linkedEntities: ["REQ-l"],
      nextActions: ["act"],
      migrationPlan: plan,
    } as never);
  });
});

describe("buildSummary", () => {
  test("joins the sections that apply", () => {
    expect(
      buildSummary({
        violations: [],
        impactResult: undefined,
        qualityDiagnostics: [],
      }),
    ).toBe("No violations found");
    expect(
      buildSummary({
        violations: [],
        evaluated: { rules: ["a"] },
        impactResult: impact([
          {
            id: "requirement_statement_unverified",
            severity: "info",
            files: [],
            message: "m",
            suggestion: "s",
            entityId: "REQ-1",
          },
          {
            id: "requirement_statement_unverified",
            severity: "info",
            files: [],
            message: "m",
            suggestion: "s",
          },
          {
            id: "other",
            severity: "info",
            files: [],
            message: "m",
            suggestion: "s",
            entityId: "REQ-2",
          },
        ]),
        qualityDiagnostics: [quality()],
      }),
    ).toBe(
      [
        "No structural violations found. The changed code implements REQ-1; Kibi did not compare the code with its statement (quoted under requirement_statement_unverified below), so confirm the change still does what each says, and ask the person before keeping a change that contradicts one",
        "Evaluated 1 rule.",
        "3 impact diagnostics found",
        "- requirement_statement_unverified | info | unknown-source | 2 diagnostics. Suggestion for each: s",
        "  - m",
        "  - m",
        "- other | info | unknown-source | m Suggestion: s",
        "1 quality diagnostic found",
        "- Q-1 | warning | symbol | msg",
        "  Blocking: no",
        "  Suggestion: fix",
      ].join("\n"),
    );
  });
});
