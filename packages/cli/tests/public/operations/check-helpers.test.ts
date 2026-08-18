import { describe, expect, test } from "bun:test";
import { partitionCheckFindings } from "../../../src/public/operations/check-helpers.js";
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
    ]);

    expect(partitioned.violations.map((item) => item.rule)).toEqual([
      "required-fields",
      "domain-contradictions",
    ]);
    expect(partitioned.qualityDiagnostics).toEqual([]);
  });

  test("moves advisory findings into non-blocking quality diagnostics", () => {
    const partitioned = partitionCheckFindings([
      finding("strict-fact-shape", "FACT-001"),
      finding("strict-req-fact-pairing", "REQ-001"),
      finding("predicate-verifiability", "REQ-002"),
    ]);

    expect(partitioned.violations).toEqual([]);
    expect(partitioned.qualityDiagnostics).toEqual([
      expect.objectContaining({
        id: "rule.strict-fact-shape",
        entityId: "FACT-001",
        blocking: false,
        severity: "warning",
        category: "integrity",
      }),
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
