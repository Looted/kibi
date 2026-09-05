// implements REQ-mcp-tool-check
import { describe, expect, test } from "bun:test";
import {
  buildStructuredContent,
  buildSummary,
  formatImpactText,
  formatQualityDiagnosticsText,
  formatViolationText,
} from "../../src/public/operations/check-format-shared.js";
import type { ChangedFileImpactResult } from "../../src/public/impact-diagnostics.js";
import type { QualityDiagnostic } from "../../src/public/impact/types.js";
import type { Violation } from "../../src/public/check-types.js";

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

    expect(formatQualityDiagnosticsText([])).toBe("No quality diagnostics found");
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

    const thin = buildStructuredContent({
      violations: [],
      diagnostics: [],
      impactResult: undefined,
    });
    expect(thin.count).toBe(0);
    expect(thin.qualityDiagnostics).toBeUndefined();
    expect(thin.impactDiagnostics).toBeUndefined();

    expect(
      buildSummary({
        violations: [],
        impactResult: undefined,
        qualityDiagnostics: [],
      }),
    ).toBe("No violations found");
    const summary = buildSummary({
      violations,
      impactResult: impact,
      qualityDiagnostics: quality,
    });
    expect(summary).toContain("violations found");
    expect(summary).toContain("impact diagnostics found");
    expect(summary).toContain("quality diagnostic");
  });
});
