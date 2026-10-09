// implements REQ-model-predicates-participant-not-subject
import { describe, expect, test } from "bun:test";
import {
  classifyBinding,
  isParticipantArgumentType,
  subjectKeyParticipantReason,
} from "../../src/operations/modeling/predicate-bindings.js";
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

  test("binding actor to the subject key does not complete the predicate, and the hint says what to do", async () => {
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
    expect(data.recommendedAction).toBe("provide_argument_bindings");
    expect(data.applyPlan).toEqual([]);
    expect(data.relationshipPlan).toBeNull();
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

  test("a claim that names no participant gets the no-actor guidance, not the subject key", async () => {
    const result = await handleKbSuggestPredicates(constrainingKb([SUBJECT]), {
      ...PERMISSION_ARGS,
      text: CLAUSE_ACTOR_CLAIM,
    });
    const data = result.structuredContent;
    expect(data.recommendedAction).toBe("provide_argument_bindings");
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
