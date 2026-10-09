// implements REQ-model-predicates-grounding-aware-v2, REQ-model-predicates-requirement-subject-v2
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

/**
 * A KB where REQ constrains subject facts with the given subject keys and
 * grounds its claim through one requires_property fact.
 */
function groundedKb(
  groundingClaimText: string | null,
  subjectKeys: readonly string[] = ["editor.autosave"],
): PrologPort {
  const claimKey =
    groundingClaimText === null ? null : semanticClaimKey(groundingClaimText);
  return {
    query: async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes(`kb_relationship(constrains, '${REQ}'`))
        return {
          success: true,
          bindings: {
            Keys: `[${subjectKeys.map((key) => `'${key}'`).join(",")}]`,
          },
        };
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
      data.replacementPlan as {
        rollback: { input: Record<string, unknown>; reason: string };
      }
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
    // Between the retraction and the link the claim is ungrounded and its
    // subject fact unpaired: both transient diagnostics are named, and the
    // rollback condition is a kb_check that is not clean after the last step.
    expect(instructions).toContain(
      "kb_check reports both logic-coverage and strict-req-fact-pairing for REQ-editor-autosave until the last step lands",
    );
    expect(instructions).toContain(
      "Run kb_check after the last step; if it is not clean, apply rollback.",
    );
    expect((data.replacementPlan as { expected: unknown }).expected).toEqual({
      kbCheckAfterStep: [[], ["logic-coverage", "strict-req-fact-pairing"], []],
      kbCheckAfterLastStep: [],
      rollbackWhen: "kb_check after the last step is not clean",
    });
    expect(rollback.reason).toContain(
      "Only if kb_check after the last step is not clean",
    );
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

  test("the predicate's subject is the subject_key of the fact the requirement constrains", async () => {
    const result = await handleKbSuggestPredicates(
      groundedKb("A different claim must hold.", ["x.y"]),
      ARGS,
    );
    const data = result.structuredContent;
    expect(data.subject).toBe("x.y");
    const [candidate] = data.candidates;
    expect(candidate?.predicate_args[0]).toBe("x.y");
    expect(candidate?.binding_provenance_by_argument.subject).toBe(
      "requirement",
    );
    expect(candidate?.unbound_arguments).not.toContain("subject");
    expect(
      data.bindingHints?.some((hint) => hint.argument === "subject") ?? false,
    ).toBe(false);
    expect(data.applyPlan[0]?.properties).toMatchObject({
      predicate_args: ["x.y", "navigation", "changes"],
    });
  });

  test("subjectHint wins over the constrained subject, but a predicate about another subject is not offered for grounding", async () => {
    const result = await handleKbSuggestPredicates(
      groundedKb("A different claim must hold.", ["x.y"]),
      { ...ARGS, subjectHint: "editor.session" },
    );
    const data = result.structuredContent;
    expect(data.subject).toBe("editor.session");
    expect(data.candidates[0]?.predicate_args[0]).toBe("editor.session");
    expect(data.candidates[0]?.binding_provenance_by_argument.subject).toBe(
      "explicit",
    );
    expect(data.candidates[0]?.subject_pairing).toBe("unpaired");
    expect(data.candidates[0]?.binding_status).toBe("incomplete");
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.applyPlan).toEqual([]);
    const hint = data.bindingHints?.find((row) => row.argument === "subject");
    expect(hint?.reason).toContain("not a subject the requirement constrains");
    expect(hint?.examples[0]).toBe("x.y");
  });

  test("a requirement with no subject fact leaves the subject for the agent instead of a demo subject", async () => {
    const text =
      "The annotation editor must save changes automatically when the user navigates away.";
    const result = await handleKbSuggestPredicates(
      groundedKb("A different claim must hold.", []),
      { ...ARGS, text },
    );
    const data = result.structuredContent;
    expect(data.subject).toBe("requirement.subject");
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.candidates[0]?.unbound_arguments).toEqual(["subject"]);
    expect(data.candidates[0]?.predicate_args[0]).toBe("requirement.subject");
  });

  test("several constrained subjects are offered first as subject examples", async () => {
    const result = await handleKbSuggestPredicates(
      groundedKb("A different claim must hold.", ["x.z", "x.y"]),
      ARGS,
    );
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    const hint = data.bindingHints?.find((row) => row.argument === "subject");
    expect(hint?.examples.slice(0, 2)).toEqual(["x.y", "x.z"]);
  });
});

describe("kb_model predicates pair the predicate with the requirement's subject by name, not position", () => {
  const PERMISSION = "Guests must not delete archived pages.";
  const PERMISSION_ARGS = { ...ARGS, text: PERMISSION };

  test("a schema without a subject argument records the requirement's subject as the fact's subject_key", async () => {
    const result = await handleKbSuggestPredicates(
      groundedKb(PERMISSION, ["pages.archive"]),
      PERMISSION_ARGS,
    );
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("replace_grounding");
    const [candidate] = data.candidates;
    expect(candidate).toMatchObject({
      predicate_name: "permission_rule",
      predicate_args: ["guest", "delete", "archived_pages", "deny"],
      binding_status: "complete",
      subject_key: "pages.archive",
      subject_pairing: "paired",
    });
    const replacement = data.replacementPlan as {
      steps: Array<{ input: { properties: Record<string, unknown> } }>;
    };
    expect(replacement.steps[0]?.input.properties).toMatchObject({
      fact_kind: "predicate",
      subject_key: "pages.archive",
      predicate_args: ["guest", "delete", "archived_pages", "deny"],
    });
  });

  test("a schema without a subject argument and no single subject is not offered for grounding", async () => {
    const result = await handleKbSuggestPredicates(
      groundedKb(PERMISSION, ["pages.archive", "pages.trash"]),
      PERMISSION_ARGS,
    );
    const data = result.structuredContent;
    const [candidate] = data.candidates;
    expect(candidate?.predicate_name).toBe("permission_rule");
    expect(candidate?.subject_key).toBeNull();
    expect(candidate?.subject_pairing).toBe("unpaired");
    expect(candidate?.binding_status).toBe("incomplete");
    expect(candidate?.unbound_arguments).toEqual(["subject_key"]);
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.applyPlan).toEqual([]);
    expect(data.replacementPlan).toBeNull();
    expect(data.relationshipTarget).toBeNull();
    expect(data.bindingHints).toEqual([
      expect.objectContaining({
        argument: "subject_key",
        position: -1,
        examples: ["pages.archive", "pages.trash"],
      }),
    ]);
    expect(data.bindingHints?.[0]?.reason).toContain(
      "does not name the requirement's subject",
    );
    expect(data.warnings.join(" ")).toContain(
      "permission_rule schema does not name the requirement's subject",
    );
  });

  test("subjectHint naming one of the constrained subjects pairs the predicate", async () => {
    const result = await handleKbSuggestPredicates(
      groundedKb(PERMISSION, ["pages.archive", "pages.trash"]),
      { ...PERMISSION_ARGS, subjectHint: "pages.trash" },
    );
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("replace_grounding");
    expect(data.candidates[0]).toMatchObject({
      subject_key: "pages.trash",
      subject_pairing: "paired",
      predicate_args: ["guest", "delete", "archived_pages", "deny"],
    });
  });

  test("a free-text claim with no requirement keeps its plan without a subject_key", async () => {
    const result = await handleKbSuggestPredicates(null, {
      text: PERMISSION,
      includeExistingSchemas: false,
      maxCandidates: 1,
    });
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("apply_requires_predicate");
    expect(data.candidates[0]?.subject_pairing).toBe("not_required");
    expect(data.applyPlan[0]?.properties).not.toHaveProperty("subject_key");
  });
});
