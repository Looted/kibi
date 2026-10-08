// implements REQ-model-predicates-grounding-aware-v2
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
      if (goal.includes(`findall(['${REQ}','req',Props]`))
        return {
          success: true,
          bindings: {
            Results: `[['${REQ}',req,[title="Editor autosave",status=open,priority=must,tags=[editor,autosave],semantic_text="${TEXT}"]]]`,
          },
        };
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
  test("grounded claim with a complete candidate answers replace_grounding with no write plan and a consistent replacement plan", async () => {
    const result = await handleKbSuggestPredicates(groundedKb(TEXT), ARGS);
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("replace_grounding");
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
    // The requirement step is a complete kb_upsert payload: it restates the
    // stored title, status and metadata (the ledger is merged by kb_upsert).
    expect(replacement.steps[2]?.input.properties).toEqual({
      title: "Editor autosave",
      status: "open",
      priority: "must",
      tags: ["editor", "autosave"],
    });
    const rollback = (
      data.replacementPlan as { rollback: { input: Record<string, unknown> } }
    ).rollback;
    expect(rollback.input).toEqual({
      type: "req",
      id: REQ,
      properties: replacement.steps[2]?.input.properties,
      relationships: [
        {
          type: "requires_property",
          from: REQ,
          to: "FACT-editor-autosave-on-leave",
        },
      ],
    });
    const instructions = String(
      (data.replacementPlan as { instructions: string }).instructions,
    );
    expect(instructions).toContain("in order and back to back");
    expect(instructions).toContain("logic-coverage");
    expect(data.warnings.join(" ")).toContain("proposition-complete");
    expect(data.warnings.join(" ")).toContain("follow replacementPlan");
    expect(data.recommendedPredicateSchema).toBeNull();
  });

  test("grounded claim with no fitting schema still records the ontology gap", async () => {
    const text =
      "The editor must render the toolbar in the preferred colour scheme.";
    const result = await handleKbSuggestPredicates(groundedKb(text), {
      ...ARGS,
      text,
    });
    const data = result.structuredContent;
    expect(data.existingGrounding).toHaveLength(1);
    expect(data.recommendedAction).toBe("record_ontology_gap");
    expect(data.candidates).toEqual([]);
    expect(data.applyPlan).toHaveLength(1);
    expect(data.applyPlan[0]?.properties).toMatchObject({
      fact_kind: "observation",
      tags: ["review:ontology-gap", "needs_schema_extension"],
      claim_text: text,
    });
    // The observation is not a grounding link for the requirement.
    expect(JSON.stringify(data.applyPlan)).not.toContain("requires_");
    expect(data.recommendedPredicateSchema).not.toBeNull();
    expect(data.replacementPlan).toBeNull();
    expect(data.relationshipPlan).toBeNull();
    expect(data.relationshipTarget).toBeNull();
    const warnings = data.warnings.join(" ");
    expect(warnings).toContain("already grounds this claim");
    expect(warnings).not.toContain("follow replacementPlan");
  });

  test("grounded claim whose candidate lacks values asks for argument bindings", async () => {
    const text = "Request timeout must not exceed 30 seconds.";
    const result = await handleKbSuggestPredicates(groundedKb(text), {
      ...ARGS,
      text,
    });
    const data = result.structuredContent;
    expect(data.existingGrounding).toHaveLength(1);
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.candidates[0]?.binding_status).toBe("incomplete");
    expect(data.candidates[0]?.unbound_arguments.length).toBeGreaterThan(0);
    expect(data.bindingHints?.map((hint) => hint.argument)).toEqual(
      data.candidates[0]?.unbound_arguments,
    );
    expect(data.applyPlan).toEqual([]);
    expect(data.replacementPlan).toBeNull();
    expect(data.relationshipTarget).toBeNull();
    expect(result.content[0]?.text).toContain(
      data.candidates[0]?.unbound_arguments.join(", "),
    );
    expect(data.warnings.join(" ")).not.toContain("follow replacementPlan");
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
