import { describe, expect, test } from "bun:test";

import {
  buildStructuredContent,
  formatImpactText,
  formatQualityDiagnosticsText,
  formatViolationText,
} from "../../src/tools/check-format.js";

const impact = (impactDiagnostics: unknown[]) =>
  ({
    impactDiagnostics,
    sourceFiles: ["s.ts"],
    extractedSymbols: ["sym"],
    linkedEntities: ["REQ-1"],
    nextActions: ["act"],
  }) as never;

describe("check-format, exact text", () => {
  test("impact text lists each diagnostic with its files", () => {
    expect(formatImpactText(impact([]))).toBe("No impact diagnostics found");
    expect(
      formatImpactText(
        impact([
          {
            id: "I1",
            severity: "warning",
            files: ["a.ts", "b.ts"],
            message: "Changed.",
            suggestion: "Review.",
          },
          {
            id: "I2",
            severity: "error",
            files: [],
            message: "Gone.",
            suggestion: "Fix.",
          },
        ]),
      ),
    ).toBe(
      "2 impact diagnostics found\n- I1 | warning | a.ts, b.ts | Changed. Suggestion: Review.\n- I2 | error | unknown-source | Gone. Suggestion: Fix.",
    );
  });

  test("quality diagnostics text carries every optional field only when present", () => {
    expect(formatQualityDiagnosticsText([])).toBe(
      "No quality diagnostics found",
    );
    const full = {
      id: "Q1",
      severity: "warning",
      category: "cat",
      message: "Msg.",
      blocking: true,
      files: ["a.ts", "b.ts"],
      docs: ["d.md", "e.md"],
      entityId: "REQ-1",
      source: "src.md",
      suggestion: "Do it.",
    };
    const bare = {
      id: "Q2",
      severity: "info",
      category: "c2",
      message: "M2.",
      blocking: false,
      files: [],
      suggestion: "Nothing.",
    };
    expect(formatQualityDiagnosticsText([full] as never)).toBe(
      "1 quality diagnostic found\n- Q1 | warning | cat | Msg.\n  Blocking: yes\n  Files: a.ts, b.ts\n  Docs: d.md, e.md\n  Entity: REQ-1\n  Source: src.md\n  Suggestion: Do it.",
    );
    expect(formatQualityDiagnosticsText([full, bare] as never)).toBe(
      "2 quality diagnostics found\n- Q1 | warning | cat | Msg.\n  Blocking: yes\n  Files: a.ts, b.ts\n  Docs: d.md, e.md\n  Entity: REQ-1\n  Source: src.md\n  Suggestion: Do it.\n- Q2 | info | c2 | M2.\n  Blocking: no\n  Suggestion: Nothing.",
    );
  });

  test("violation text uses a placeholder source and adds a suggestion when given", () => {
    expect(formatViolationText([])).toBe("No violations found");
    expect(
      formatViolationText([
        {
          rule: "r1",
          entityId: "REQ-1",
          source: "a.md",
          description: "Bad.",
          suggestion: "Fix.",
        },
        {
          rule: "r2",
          entityId: "REQ-2",
          description: "Worse.",
          suggestion: "",
        },
      ] as never),
    ).toBe(
      "2 violations found\n- r1 | REQ-1 | a.md | Bad. | Suggestion: Fix.\n- r2 | REQ-2 | unknown-source | Worse.",
    );
  });
});

describe("buildStructuredContent, exact", () => {
  test("keeps only the diagnostic fields that are set", () => {
    const violations = [{ rule: "r", entityId: "E", description: "d" }];
    expect(
      buildStructuredContent({
        violations: violations as never,
        diagnostics: [
          {
            category: "c",
            severity: "error",
            message: "m",
            file: "f.ts",
            suggestion: "s",
            extra: "dropped",
          },
          { category: "c2", severity: "warning", message: "m2" },
        ] as never,
        impactResult: undefined,
      }),
    ).toStrictEqual({
      violations,
      count: 1,
      diagnostics: [
        {
          category: "c",
          severity: "error",
          message: "m",
          file: "f.ts",
          suggestion: "s",
        },
        { category: "c2", severity: "warning", message: "m2" },
      ],
    });
  });

  test("adds quality and impact sections when present", () => {
    const quality = [{ id: "Q" }];
    expect(
      buildStructuredContent({
        violations: [],
        diagnostics: [],
        qualityDiagnostics: quality as never,
        impactResult: impact([{ id: "I" }]),
      }),
    ).toStrictEqual({
      violations: [],
      count: 0,
      diagnostics: [],
      qualityDiagnostics: quality,
      impactDiagnostics: [{ id: "I" }],
      sourceFiles: ["s.ts"],
      extractedSymbols: ["sym"],
      linkedEntities: ["REQ-1"],
      nextActions: ["act"],
    } as never);
    expect(
      buildStructuredContent({
        violations: [],
        diagnostics: [],
        qualityDiagnostics: [],
        impactResult: undefined,
      }),
    ).toStrictEqual({ violations: [], count: 0, diagnostics: [] });
  });
});
