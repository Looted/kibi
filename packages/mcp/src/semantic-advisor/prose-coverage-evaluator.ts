import { analyzeSemanticAdvisorInput } from "./analyze-prose.js";
import type { SemanticModelingSuggestion } from "./types.js";

export interface ProseCoverageExpectation {
  kind: SemanticModelingSuggestion["kind"];
  predicate_name?: string;
  property_key?: string;
  operator?: string;
}

export interface ProseCoverageCase {
  id: string;
  text: string;
  expected: ProseCoverageExpectation;
}

export interface ProseCoverageFailure {
  id: string;
  text: string;
  reason: string;
}

export interface ProseCoverageResult {
  coverage: number;
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
  failures: ProseCoverageFailure[];
}

export function evaluateProseCoverageCorpus(
  cases: ProseCoverageCase[],
): ProseCoverageResult {
  const failures = cases.flatMap((testCase) => evaluateCase(testCase));
  const passed = cases.length - failures.length;
  return {
    coverage: cases.length === 0 ? 1 : passed / cases.length,
    summary: {
      total: cases.length,
      passed,
      failed: failures.length,
    },
    failures,
  };
}

function evaluateCase(testCase: ProseCoverageCase): ProseCoverageFailure[] {
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
  if (!suggestion) {
    return [failure(testCase, "No semantic advisor suggestion was produced")];
  }
  if (suggestion.kind !== testCase.expected.kind) {
    return [
      failure(
        testCase,
        `Expected ${testCase.expected.kind} but received ${suggestion.kind}`,
      ),
    ];
  }
  if (
    testCase.expected.kind === "predicate" &&
    testCase.expected.predicate_name &&
    suggestion.kind === "predicate" &&
    suggestion.predicate.predicate_name !== testCase.expected.predicate_name
  ) {
    return [
      failure(
        testCase,
        `Expected predicate ${testCase.expected.predicate_name} but received ${suggestion.predicate.predicate_name}`,
      ),
    ];
  }
  if (testCase.expected.kind === "strict_property") {
    if (suggestion.kind !== "strict_property") {
      return [failure(testCase, "Expected strict property suggestion")];
    }
    if (
      testCase.expected.property_key &&
      suggestion.claim.property_key !== testCase.expected.property_key
    ) {
      return [
        failure(
          testCase,
          `Expected property ${testCase.expected.property_key} but received ${suggestion.claim.property_key}`,
        ),
      ];
    }
    if (
      testCase.expected.operator &&
      suggestion.claim.operator !== testCase.expected.operator
    ) {
      return [
        failure(
          testCase,
          `Expected operator ${testCase.expected.operator} but received ${suggestion.claim.operator}`,
        ),
      ];
    }
  }
  return [];
}

function failure(
  testCase: ProseCoverageCase,
  reason: string,
): ProseCoverageFailure {
  return { id: testCase.id, text: testCase.text, reason };
}
