import { describe, expect, test } from "bun:test";
import type { ChangedFileImpactResult } from "../../../src/public/impact-diagnostics.js";
import {
  partitionCheckFindings,
  scopeQualityDiagnosticsToImpact,
} from "../../../src/public/operations/check-helpers.js";
import type { Violation } from "../../../src/utils/rule-registry.js";

function finding(
  rule: string,
  entityId: string,
  extras: Partial<Violation> = {},
): Violation {
  return {
    rule,
    entityId,
    description: `${rule} finding`,
    suggestion: "repair",
    source: `.kb/${entityId}.md`,
    ...extras,
  };
}

describe("partitionCheckFindings", () => {
  test("keeps canonical findings as blocking violations", () => {
    const partitioned = partitionCheckFindings([
      finding("required-fields", "REQ-001"),
      finding("domain-contradictions", "REQ-002"),
      finding("strict-fact-shape", "FACT-001"),
    ]);

    expect(partitioned.violations.map((item) => item.rule)).toEqual([
      "required-fields",
      "domain-contradictions",
      "strict-fact-shape",
    ]);
    expect(partitioned.qualityDiagnostics).toEqual([]);
  });

  test("moves advisory findings into non-blocking quality diagnostics", () => {
    const partitioned = partitionCheckFindings([
      finding("strict-req-fact-pairing", "REQ-001"),
      finding("predicate-verifiability", "REQ-002"),
    ]);

    expect(partitioned.violations).toEqual([]);
    expect(partitioned.qualityDiagnostics).toEqual([
      expect.objectContaining({
        id: "rule.strict-req-fact-pairing",
        entityId: "REQ-001",
        blocking: false,
      }),
      expect.objectContaining({
        id: "rule.predicate-verifiability",
        entityId: "REQ-002",
        blocking: false,
      }),
    ]);
  });

  test("treats selected migration findings as non-blocking diagnostics", () => {
    const partitioned = partitionCheckFindings([
      finding("strict-readiness", "REQ-READY-001"),
      finding("semantic-completeness", "REQ-SEM-001"),
    ]);

    expect(partitioned.violations).toEqual([]);
    expect(
      partitioned.qualityDiagnostics.map((diagnostic) => diagnostic.id),
    ).toEqual(["rule.strict-readiness", "rule.semantic-completeness"]);
    expect(
      partitioned.qualityDiagnostics.every(
        (diagnostic) => diagnostic.blocking === false,
      ),
    ).toBe(true);
  });

  test("fails closed: unknown rules stay canonical violations", () => {
    const partitioned = partitionCheckFindings([
      finding("not-a-real-rule", "REQ-UNKNOWN"),
    ]);

    expect(partitioned.violations).toEqual([
      expect.objectContaining({
        rule: "not-a-real-rule",
        entityId: "REQ-UNKNOWN",
      }),
    ]);
    expect(partitioned.qualityDiagnostics).toEqual([]);
  });
});

describe("scopeQualityDiagnosticsToImpact", () => {
  const impact: ChangedFileImpactResult = {
    impactDiagnostics: [],
    sourceFiles: ["src/auth.ts"],
    extractedSymbols: [],
    linkedEntities: [
      {
        id: "REQ-AUTH",
        relationshipType: "implements",
        sourceSymbolId: "SYM-AUTH-LOGIN",
        sourceSymbolName: "login",
      },
    ],
    nextActions: [],
  };

  test("lists findings about the checked files and counts the KB-wide rest", () => {
    const { qualityDiagnostics } = partitionCheckFindings([
      finding("strict-req-fact-pairing", "REQ-AUTH"),
      finding("predicate-verifiability", "SYM-AUTH-LOGIN"),
      finding("agent-requirement-unapproved", "REQ-OTHER-1"),
      finding("agent-requirement-unapproved", "REQ-OTHER-2"),
      finding("scenario-feasibility-unknown", "SCEN-OTHER"),
    ]);
    const onFile = {
      id: "symbol_semantic_review_needed",
      severity: "warning" as const,
      blocking: false,
      category: "symbol",
      files: ["./src/auth.ts"],
      message: "review",
      suggestion: "",
    };

    const scoped = scopeQualityDiagnosticsToImpact(
      [...qualityDiagnostics, onFile],
      impact,
    );

    expect(scoped.map((item) => item.entityId ?? item.id)).toEqual([
      "REQ-AUTH",
      "SYM-AUTH-LOGIN",
      "symbol_semantic_review_needed",
      "scoped_check_omitted_quality",
    ]);
    const summary = scoped.at(-1);
    expect(summary).toMatchObject({ severity: "info", blocking: false });
    expect(summary?.message).toContain(
      "3 advisory findings elsewhere in the KB are not listed (agent-requirement-unapproved ×2, scenario-feasibility-unknown ×1)",
    );
    expect(summary?.suggestion).toContain("without sourceFiles");
  });

  test("adds no summary when every finding concerns the checked files", () => {
    const { qualityDiagnostics } = partitionCheckFindings([
      finding("strict-req-fact-pairing", "REQ-AUTH"),
    ]);

    expect(
      scopeQualityDiagnosticsToImpact(qualityDiagnostics, impact).map(
        (item) => item.id,
      ),
    ).toEqual(["rule.strict-req-fact-pairing"]);
  });
});
