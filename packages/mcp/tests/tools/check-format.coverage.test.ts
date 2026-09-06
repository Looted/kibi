import { describe, expect, test } from "bun:test";

import {
  buildStructuredContent,
  formatImpactText,
  formatQualityDiagnosticsText,
  formatViolationText,
} from "../../src/tools/check-format.js";

describe("check-format remaining branches", () => {
  test("formats empty and populated impact, quality, and violation text", () => {
    expect(
      formatImpactText({
        impactDiagnostics: [],
        sourceFiles: [],
        extractedSymbols: [],
        linkedEntities: [],
        nextActions: [],
      }),
    ).toBe("No impact diagnostics found");
    expect(
      formatImpactText({
        impactDiagnostics: [
          {
            id: "IMP-1",
            severity: "warning",
            files: [],
            message: "changed",
            suggestion: "review",
          } as never,
          {
            id: "IMP-2",
            severity: "info",
            files: ["a.ts"],
            message: "linked",
            suggestion: "keep",
          } as never,
        ],
        sourceFiles: ["a.ts"],
        extractedSymbols: [],
        linkedEntities: [],
        nextActions: [],
      }),
    ).toContain("unknown-source");

    expect(formatQualityDiagnosticsText([])).toBe("No quality diagnostics found");
    expect(
      formatQualityDiagnosticsText([
        {
          id: "Q-1",
          severity: "warning",
          category: "coverage",
          message: "gap",
          blocking: false,
          suggestion: "add a test",
          files: ["a.ts"],
          docs: ["docs/x.md"],
          entityId: "REQ-1",
          source: ".kb/requirements/REQ-1.md",
        },
      ]),
    ).toContain("1 quality diagnostic");

    expect(formatViolationText([])).toContain("No violations");
    expect(
      formatViolationText([
        {
          rule: "symbol-coverage",
          entityId: "REQ-1",
          description: "missing",
          suggestion: "link a symbol",
        },
        {
          rule: "required-fields",
          entityId: "REQ-2",
          source: ".kb/requirements/REQ-2.md",
          description: "empty title",
        },
      ]),
    ).toContain("2 violations");
  });

  test("buildStructuredContent includes optional quality and impact blocks", () => {
    expect(
      buildStructuredContent({
        violations: [],
        diagnostics: [
          { category: "check", severity: "info" as never, message: "ok" },
          {
            category: "check",
            severity: "warning",
            message: "file",
            file: "a.ts",
            suggestion: "fix",
          },
        ],
        impactResult: undefined,
      }),
    ).toMatchObject({ count: 0 });

    const withImpact = buildStructuredContent({
      violations: [
        {
          rule: "symbol-coverage",
          entityId: "REQ-1",
          description: "missing",
        },
      ],
      diagnostics: [],
      qualityDiagnostics: [
        {
          id: "Q-1",
          severity: "warning",
          category: "coverage",
          message: "gap",
          blocking: true,
          suggestion: "add a test",
        },
      ],
      impactResult: {
        impactDiagnostics: [
          {
            id: "IMP-1",
            severity: "info",
            files: ["a.ts"],
            message: "changed",
            suggestion: "review",
          } as never,
        ],
        sourceFiles: ["a.ts"],
        extractedSymbols: ["SYM-1"] as never,
        linkedEntities: ["REQ-1"] as never,
        nextActions: [{ operation: "kb_check", required: false }] as never,
      },
    });
    expect(withImpact.qualityDiagnostics).toHaveLength(1);
    expect(withImpact.impactDiagnostics).toHaveLength(1);
    expect(withImpact.nextActions).toHaveLength(1);
  });
});
