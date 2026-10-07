// implements REQ-model-predicates-grounding-aware
import { describe, expect, test } from "bun:test";
import { handleKbSuggestPredicates } from "../../src/operations/modeling/suggest-predicates.js";
import { semanticClaimKey } from "../../src/operations/semantic-advisor/clauses.js";
import type {
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

const TEXT =
  "The editor must save changes automatically when the user navigates away.";
const REQ = "REQ-editor-autosave";

/** A KB where REQ grounds its claim through one requires_property fact. */
function groundedKb(groundingClaimText: string | null): PrologPort {
  const claimKey =
    groundingClaimText === null ? null : semanticClaimKey(groundingClaimText);
  return {
    query: async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes(`kb_relationship(requires_property, '${REQ}'`))
        return {
          success: true,
          bindings: { Targets: "['FACT-editor-autosave-on-leave']" },
        };
      if (goal.includes("kb_relationship("))
        return { success: true, bindings: { Targets: "[]" } };
      if (
        goal.includes("kb_entity('FACT-editor-autosave-on-leave'") &&
        claimKey !== null
      )
        return {
          success: true,
          bindings: { ClaimKey: `'${claimKey}'`, FactKind: "property_value" },
        };
      return { success: false, bindings: {} };
    },
  } as unknown as PrologPort;
}

const ARGS = {
  text: TEXT,
  requirementId: REQ,
  maxCandidates: 1,
  includeExistingSchemas: false,
};

describe("kb_model predicates on an already grounded requirement", () => {
  test("returns already_grounded with no write plan and a consistent replacement plan", async () => {
    const result = await handleKbSuggestPredicates(groundedKb(TEXT), ARGS);
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("already_grounded");
    expect(data.applyPlan).toEqual([]);
    expect(data.relationshipPlan).toBeNull();
    expect(data.existingGrounding).toEqual([
      {
        relationship: {
          type: "requires_property",
          from: REQ,
          to: "FACT-editor-autosave-on-leave",
        },
        factId: "FACT-editor-autosave-on-leave",
        factKind: "property_value",
        claimKey: semanticClaimKey(TEXT),
      },
    ]);
    const replacement = data.replacementPlan as {
      relationshipTarget: string;
      steps: Array<{ operation: string; input: Record<string, unknown> }>;
    };
    expect(replacement.steps.map((step) => step.operation)).toEqual([
      "kb_upsert",
      "kb_delete",
      "kb_upsert",
    ]);
    const factId = String(replacement.steps[0]?.input.id);
    expect(factId).toMatch(/^FACT-PRED-/);
    expect(data.relationshipTarget).toBe(factId);
    expect(replacement.relationshipTarget).toBe(factId);
    // The swap keeps exactly one grounding link for the claim.
    expect(replacement.steps[1]?.input).toEqual({
      relationships: [
        {
          type: "requires_property",
          from: REQ,
          to: "FACT-editor-autosave-on-leave",
        },
      ],
    });
    expect(replacement.steps[2]?.input.relationships).toEqual([
      { type: "requires_predicate", from: REQ, to: factId },
    ]);
    expect(data.warnings.join(" ")).toContain("proposition-complete");
  });

  test("an ungrounded claim still gets a predicate plan whose relationship targets the planned fact, not a candidate", async () => {
    const result = await handleKbSuggestPredicates(
      groundedKb("A different claim must hold."),
      ARGS,
    );
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("apply_requires_predicate");
    expect(data.existingGrounding).toEqual([]);
    const factId = String(data.applyPlan[0]?.id);
    expect(factId).toMatch(/^FACT-PRED-/);
    expect(data.relationshipTarget).toBe(factId);
    const plan = data.relationshipPlan as {
      relationship: { to: string };
      instructions: string;
    };
    expect(plan.relationship.to).toBe(factId);
    expect(data.candidates.every((candidate) => candidate.id !== factId)).toBe(
      true,
    );
    expect(plan.instructions).toContain(factId);
    expect(data.replacementPlan).toBeNull();
  });
});
