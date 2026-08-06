import { analyzeSemanticAdvisorInput } from "./analyze-prose.js";
import type { SemanticModelingSuggestion } from "./types.js";

export interface ProseCoverageExpectation {
  readonly kind: SemanticModelingSuggestion["kind"];
  readonly predicate_name?: string;
  readonly property_key?: string;
  readonly operator?: string;
}

export interface ProseCoverageCase {
  readonly id: string;
  readonly source?: string;
  readonly text: string;
  readonly expected: ProseCoverageExpectation;
}

export interface ProseCoverageFailure {
  readonly id: string;
  readonly text: string;
  readonly reason: string;
}

export interface ProseCoverageResult {
  readonly coverage: number;
  readonly summary: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
  };
  readonly failures: readonly ProseCoverageFailure[];
}

function failure(
  testCase: ProseCoverageCase,
  reason: string,
): ProseCoverageFailure {
  return { id: testCase.id, text: testCase.text, reason };
}

function evaluateCase(
  testCase: ProseCoverageCase,
): readonly ProseCoverageFailure[] {
  const result = analyzeSemanticAdvisorInput({
    payload: {
      type: "req",
      id: `REQ-CORPUS-${testCase.id}`,
      properties: {
        title: testCase.id,
        status: "open",
        source: "mcp://kibi/prose-coverage-corpus",
        text_ref: testCase.text,
      },
    },
  });
  const suggestion = result.receipt.suggestions[0];
  if (!suggestion)
    return [failure(testCase, "No semantic advisor suggestion was produced")];
  if (suggestion.kind !== testCase.expected.kind)
    return [
      failure(
        testCase,
        `Expected ${testCase.expected.kind} but received ${suggestion.kind}`,
      ),
    ];
  if (
    suggestion.kind === "predicate" &&
    testCase.expected.predicate_name &&
    suggestion.predicate.predicate_name !== testCase.expected.predicate_name
  ) {
    return [
      failure(
        testCase,
        `Expected predicate ${testCase.expected.predicate_name} but received ${suggestion.predicate.predicate_name}`,
      ),
    ];
  }
  if (suggestion.kind === "strict_property") {
    if (
      testCase.expected.property_key &&
      suggestion.claim.property_key !== testCase.expected.property_key
    )
      return [
        failure(
          testCase,
          `Expected property ${testCase.expected.property_key} but received ${suggestion.claim.property_key}`,
        ),
      ];
    if (
      testCase.expected.operator &&
      suggestion.claim.operator !== testCase.expected.operator
    )
      return [
        failure(
          testCase,
          `Expected operator ${testCase.expected.operator} but received ${suggestion.claim.operator}`,
        ),
      ];
  }
  return [];
}

export function evaluateProseCoverageCorpus(
  cases: readonly ProseCoverageCase[],
): ProseCoverageResult {
  const failures = cases.flatMap(evaluateCase);
  const passed = cases.length - failures.length;
  return {
    coverage: cases.length === 0 ? 1 : passed / cases.length,
    summary: { total: cases.length, passed, failed: failures.length },
    failures,
  };
}
