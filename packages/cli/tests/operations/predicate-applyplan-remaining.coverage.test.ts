// implements REQ-mcp-suggest-predicates
import { afterEach, describe, expect, test } from "bun:test";
import {
  buildPredicateSchemaDraft,
  buildRelationshipPlan,
} from "../../src/operations/modeling/predicate-applyplan.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const restores: Array<() => void> = [];

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("predicate applyplan remaining relationship and draft branches", () => {
  test("buildRelationshipPlan attaches claim metadata when both endpoints exist", () => {
    restores.push(isolateKibiEnv());
    const withClaim = buildRelationshipPlan(
      "FACT-PRED-1",
      "REQ-1",
      "The checkout flow must reject invalid carts.",
      ["CLAIM-EXISTING000000"],
    );
    expect(withClaim).toMatchObject({
      applyAfter: "FACT-PRED-1",
      requiresExistingReq: "REQ-1",
      relationship: {
        type: "requires_predicate",
        from: "REQ-1",
        to: "FACT-PRED-1",
      },
      claimText: "The checkout flow must reject invalid carts.",
    });
    expect(withClaim?.logicClaims).toEqual(
      expect.arrayContaining(["CLAIM-EXISTING000000"]),
    );

    const withoutClaim = buildRelationshipPlan("FACT-PRED-1", "REQ-1");
    expect(withoutClaim).toMatchObject({
      applyAfter: "FACT-PRED-1",
      requiresExistingReq: "REQ-1",
    });
    expect(withoutClaim).not.toHaveProperty("claimKey");
  });

  test("schema draft binds a concrete subject instead of a placeholder", () => {
    restores.push(isolateKibiEnv());
    const draft = buildPredicateSchemaDraft(
      "The checkout flow must reject invalid carts when the total is empty.",
      "checkout.flow",
    );
    expect(draft.candidate_bindings.subject).toBe("checkout.flow");
    expect(draft.unresolved_bindings).not.toContain("subject");
  });
});
