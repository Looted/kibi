import { describe, expect, test } from "bun:test";

import type { OperationContext } from "../../src/public/operations/runtime-types.js";
import {
  modelRequirementSpec,
  suggestPredicatesSpec,
} from "../../src/public/operations/specs/modeling.js";

function testContext(): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(0),
  };
}

describe("shared modeling operation executors", () => {
  test("modelRequirementSpec returns a deterministic write plan", async () => {
    // Given: prose that can be modeled without transport-specific defaults.
    const input = {
      text: "Customer data must be retained for 7 years.",
      confidence: 0.9,
    };

    // When: the public operation executes through the shared spec.
    const result = await modelRequirementSpec.execute(input, testContext());

    // Then: the result contains the real strict-lane plan rather than a placeholder.
    expect(result.structuredContent).toMatchObject({
      isStrict: true,
      extractionMode: "heuristic",
    });
    expect(result.structuredContent?.applyPlan).toHaveLength(3);
  });

  test("suggestPredicatesSpec returns ranked predicate candidates", async () => {
    // Given: prose that matches the built-in persistence ontology.
    const input = {
      text: "The editor must save changes automatically when the user navigates away.",
      maxCandidates: 1,
      includeExistingSchemas: false,
    };

    // When: the public operation executes through the shared spec.
    const result = await suggestPredicatesSpec.execute(input, testContext());

    // Then: a concrete predicate fact plan is returned.
    expect(result.structuredContent).toMatchObject({
      recommendedAction: "apply_requires_predicate",
    });
    expect(result.structuredContent?.candidates).toHaveLength(1);
    expect(result.structuredContent?.applyPlan).toHaveLength(1);
  });
});
