// implements REQ-model-predicates-participant-not-subject
import { describe, expect, test } from "bun:test";
import { unnamedParticipantArguments } from "../../src/operations/modeling/predicate-binding-hints.js";
import {
  classifyBinding,
  isParticipantArgumentType,
  subjectKeyParticipantReason,
} from "../../src/operations/modeling/predicate-bindings.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "../../src/operations/modeling/predicate-catalog.js";
import type { PredicateSuggestion } from "../../src/operations/modeling/predicate-types.js";
import { handleKbSuggestPredicates } from "../../src/operations/modeling/suggest-predicates.js";
import type {
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

const REQ = "REQ-pages-archive-protection";
const SUBJECT = "pages.archive";

/** A KB where REQ constrains one subject fact and grounds nothing yet. */
function constrainingKb(subjectKeys: readonly string[]): PrologPort {
  return {
    query: async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes(`kb_relationship(constrains, '${REQ}'`))
        return {
          success: true,
          bindings: {
            Keys: `[${subjectKeys.map((key) => `'${key}'`).join(",")}]`,
          },
        };
      if (goal.includes("kb_relationship("))
        return { success: true, bindings: { Targets: "[]" } };
      return { success: false, bindings: {} };
    },
  } as unknown as PrologPort;
}

const PERMISSION_ARGS = {
  requirementId: REQ,
  schemaId: "FACT-SCHEMA-PERMISSION-RULE",
  includeExistingSchemas: false,
  maxCandidates: 1,
};
/** A claim about the subject itself: it names no actor. */
const NO_ACTOR_CLAIM =
  "Archived pages must not be deleted while a revision is published.";
/** A claim whose only candidate actor is a clause, not a participant. */
const CLAUSE_ACTOR_CLAIM =
  "Archiving a page while publishing a revision must not delete previously approved comments.";

describe("a participant argument is never the requirement's subject key", () => {
  test("actor, actor_scope, role and owner are participant types; entity and resource are not", () => {
    for (const type of ["actor", "actor_scope", "role", "owner"])
      expect(isParticipantArgumentType(type)).toBe(true);
    for (const type of ["entity", "resource", "component", "action", undefined])
      expect(isParticipantArgumentType(type)).toBe(false);
  });

  test("an explicit actor equal to a constrained subject key is a placeholder with a reason", () => {
    const context = {
      argumentName: "actor",
      argumentType: "actor",
      constrainedSubjects: [SUBJECT],
    };
    expect(subjectKeyParticipantReason(SUBJECT, context)).toContain(
      "which the predicate fact already carries as its subject_key",
    );
    expect(subjectKeyParticipantReason("guest", context)).toBeNull();
    expect(
      subjectKeyParticipantReason(SUBJECT, {
        ...context,
        argumentType: "entity",
      }),
    ).toBeNull();
    expect(
      subjectKeyParticipantReason(SUBJECT, {
        ...context,
        constants: [SUBJECT],
      }),
    ).toBeNull();
    expect(
      classifyBinding(
        SUBJECT,
        "Archived pages must never be deleted.",
        true,
        false,
        context,
      ),
    ).toBe("placeholder");
    expect(
      classifyBinding(
        "guest",
        "Guests must not delete archived pages.",
        true,
        false,
        context,
      ),
    ).toBe("explicit");
  });

  test("binding actor to the subject key does not complete the predicate; the claim names no actor, so the schema does not fit", async () => {
    const result = await handleKbSuggestPredicates(constrainingKb([SUBJECT]), {
      ...PERMISSION_ARGS,
      text: NO_ACTOR_CLAIM,
      argumentBindings: {
        actor: SUBJECT,
        action: "delete",
        resource: "archived_pages",
        decision: "deny",
      },
    });
    const data = result.structuredContent;
    // Kibi decides the gap itself instead of asking for a binding the claim
    // cannot supply: the gap observation is planned, the candidate stays
    // inspectable and incomplete, and the hint still says why.
    expect(data.recommendedAction).toBe("record_ontology_gap");
    expect(data.applyPlan).toHaveLength(1);
    expect(data.applyPlan[0]).toMatchObject({
      type: "fact",
      properties: { fact_kind: "observation" },
    });
    expect(
      (data.applyPlan[0]?.properties as { tags: string[] }).tags,
    ).toContain("review:ontology-gap");
    expect(data.relationshipPlan).toBeNull();
    expect(data.replacementPlan ?? null).toBeNull();
    expect(result.content[0]?.text).toContain("names no actor");
    expect(result.content[0]?.text).toContain("does not fit the claim");
    const [candidate] = data.candidates;
    expect(candidate).toMatchObject({
      predicate_name: "permission_rule",
      binding_status: "incomplete",
      unbound_arguments: ["actor"],
      subject_key: SUBJECT,
      subject_pairing: "paired",
    });
    expect(candidate?.binding_provenance_by_argument.actor).toBe("placeholder");
    const [hint] = data.bindingHints ?? [];
    expect(hint?.argument).toBe("actor");
    expect(hint?.currentValue).toBe(SUBJECT);
    // The subject key is never offered as an actor example.
    expect(hint?.examples).not.toContain(SUBJECT);
    expect(hint?.reason).toContain(
      `"${SUBJECT}" is the requirement's subject key ${SUBJECT}`,
    );
    expect(hint?.reason).toContain("The claim names no actor");
    expect(hint?.reason).toContain("record_ontology_gap");
  });

  test("a claim whose only actor candidate is a clause names no participant: the gap is recorded and the hint kept", async () => {
    const result = await handleKbSuggestPredicates(constrainingKb([SUBJECT]), {
      ...PERMISSION_ARGS,
      text: CLAUSE_ACTOR_CLAIM,
    });
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("record_ontology_gap");
    expect(data.applyPlan).toHaveLength(1);
    expect(data.candidates[0]?.binding_status).toBe("incomplete");
    expect(data.candidates[0]?.unbound_arguments).toEqual(["actor"]);
    const hint = data.bindingHints?.find((row) => row.argument === "actor");
    expect(hint).toBeDefined();
    expect(hint?.reason).toContain("7-word clause of the claim");
    expect(hint?.reason).toContain("The claim names no actor");
    expect(hint?.examples).not.toContain(SUBJECT);
    expect(hint?.reason).toContain("this schema does not fit the claim");
    expect(hint?.reason).toContain("record_ontology_gap");
    expect(hint?.reason).not.toContain("or the requirement's subject key");
  });

  test("the draft-discard claim from a test project is an ontology gap, with and without an explicit actor binding", async () => {
    const text =
      "Discarding a draft while finishing a review must not delete previously committed feedback.";
    for (const argumentBindings of [undefined, { actor: "review.draft" }]) {
      const result = await handleKbSuggestPredicates(
        constrainingKb(["review.draft"]),
        {
          ...PERMISSION_ARGS,
          text,
          ...(argumentBindings ? { argumentBindings } : {}),
        },
      );
      const data = result.structuredContent;
      expect(data.recommendedAction).toBe("record_ontology_gap");
      expect(data.applyPlan).toHaveLength(1);
      expect(data.candidates[0]).toMatchObject({
        predicate_name: "permission_rule",
        binding_status: "incomplete",
      });
      expect(data.candidates[0]?.unbound_arguments).toContain("actor");
      const hint = data.bindingHints?.find((row) => row.argument === "actor");
      expect(hint?.reason).toContain("record_ontology_gap");
    }
  });

  test("a claim that names an actor in other words keeps asking for the binding", async () => {
    // "guest" is a permission_rule example actor and the claim names guests,
    // so the actor can be bound from the claim: the schema fits.
    const result = await handleKbSuggestPredicates(constrainingKb([SUBJECT]), {
      ...PERMISSION_ARGS,
      text: "Guests who archive a page must not delete archived pages.",
      argumentBindings: { actor: SUBJECT },
    });
    const data = result.structuredContent;
    expect(data.candidates[0]?.unbound_arguments).toContain("actor");
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.applyPlan).toEqual([]);
    const hint = data.bindingHints?.find((row) => row.argument === "actor");
    expect(hint?.examples).toContain("guest");
  });

  test("a clause that opens with a noun may still name the actor, so the binding is asked for", async () => {
    // "Administrators" is no permission_rule example value, but the clause
    // opens with a noun, not an activity: the agent binds a short noun.
    const result = await handleKbSuggestPredicates(constrainingKb([SUBJECT]), {
      ...PERMISSION_ARGS,
      text: "Administrators who have been granted write access must not delete archived pages.",
    });
    const data = result.structuredContent;
    expect(data.candidates[0]?.unbound_arguments).toEqual(["actor"]);
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.applyPlan).toEqual([]);
    const hint = data.bindingHints?.find((row) => row.argument === "actor");
    expect(hint?.reason).toContain("clause of the claim");
  });

  test("schema example values with regex metacharacters never break the participant check", () => {
    const schema = BUILT_IN_PREDICATE_SCHEMAS.find(
      (candidate) => candidate.predicate_name === "permission_rule",
    );
    if (!schema) throw new Error("permission_rule schema missing");
    const candidate = {
      predicate_name: "permission_rule",
      predicate_args: ["", "delete", "archived_pages", "deny"],
      unbound_arguments: ["actor"],
      binding_provenance_by_argument: { actor: "placeholder" },
      schema: {
        ...schema,
        argument_constants: { actor: ["svc(ci)", "c++"] },
        examples: ["permission_rule(*, read, public_docs, allow)"],
      },
    } as unknown as PredicateSuggestion;
    expect(
      unnamedParticipantArguments(candidate, NO_ACTOR_CLAIM, [SUBJECT]),
    ).toEqual(["actor"]);
    expect(
      unnamedParticipantArguments(
        candidate,
        "The svc(ci) account must not delete archived pages.",
        [SUBJECT],
      ),
    ).toEqual([]);
  });

  test("an argument unbound for a closed vocabulary keeps asking for the binding", async () => {
    const result = await handleKbSuggestPredicates(constrainingKb([SUBJECT]), {
      ...PERMISSION_ARGS,
      text: "Guests must not delete archived pages.",
      argumentBindings: { decision: "refuse" },
    });
    const data = result.structuredContent;
    expect(data.candidates[0]?.unbound_arguments).toEqual(["decision"]);
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.applyPlan).toEqual([]);
    expect(
      data.bindingHints?.find((row) => row.argument === "decision")
        ?.allowedValues,
    ).toEqual(["allow", "deny"]);
  });

  test("a claim that names its actor still completes with the subject recorded as subject_key", async () => {
    const result = await handleKbSuggestPredicates(constrainingKb([SUBJECT]), {
      ...PERMISSION_ARGS,
      text: "Guests must not delete archived pages.",
    });
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("apply_requires_predicate");
    expect(data.candidates[0]).toMatchObject({
      predicate_args: ["guest", "delete", "archived_pages", "deny"],
      binding_status: "complete",
      subject_key: SUBJECT,
      subject_pairing: "paired",
    });
  });

  test("an entity argument of a schema without a subject still offers the subject keys", async () => {
    const result = await handleKbSuggestPredicates(constrainingKb([SUBJECT]), {
      requirementId: REQ,
      includeExistingSchemas: false,
      maxCandidates: 1,
      schemaId: "FACT-SCHEMA-COMMIT-ACTION",
      text: "Changes must be saved when the user navigates away.",
      argumentBindings: { subject: "be" },
    });
    const data = result.structuredContent;
    const hint = data.bindingHints?.find((row) => row.argument === "subject");
    expect(hint?.examples[0]).toBe(SUBJECT);
  });
});
