// implements REQ-model-predicates-plan-roundtrip
import { describe, expect, test } from "bun:test";
import { buildGapApplyPlan } from "../../src/operations/modeling/predicate-applyplan.js";
import { validateUpsertInput } from "../../src/operations/mutation/validation.js";
import { observationPlan } from "../../src/operations/semantic-advisor/observation-plan.js";

const CLAIM = "Exports must be signed with the tenant key before upload.";

function words(body: string): number {
  return body.split(/\s+/).filter(Boolean).length;
}

describe("review observation plans are kb_upsert payloads as returned", () => {
  test("the ontology-gap plan is a tagged note with a body, not a semantic claim", () => {
    const [step] = buildGapApplyPlan(CLAIM, {
      text: CLAIM,
      requirementId: "REQ-export-signing",
      source: "docs/exports.md#L4",
    });
    const properties = step?.properties as Record<string, unknown>;
    expect(properties).toMatchObject({
      fact_kind: "observation",
      tags: ["review:ontology-gap", "needs_schema_extension"],
      claim_text: CLAIM,
      value_string: CLAIM,
      text_ref: "docs/exports.md#L4",
    });
    // Observations quote the claim without claiming it.
    expect(properties.claim_key).toBeUndefined();
    // A tag is not an entity: nothing links to review:ontology-gap.
    expect(step?.relationships).toEqual([]);
    const body = (step?.document as { body: string }).body;
    expect(body).toContain("No available predicate schema fits this claim");
    expect(body).toContain("requirement REQ-export-signing");
    expect(body).toContain(`> ${CLAIM}`);
    expect(words(body)).toBeGreaterThanOrEqual(12);
    expect(() => validateUpsertInput(step as never, new Date())).not.toThrow();
  });

  test("a gap without a source or requirement still explains itself", () => {
    const [step] = buildGapApplyPlan(CLAIM, { text: CLAIM });
    const properties = step?.properties as Record<string, unknown>;
    expect(properties.text_ref).toBeUndefined();
    expect((step?.document as { body: string }).body).toContain(
      `Claim:\n\n> ${CLAIM}`,
    );
  });

  test("advisor review observations carry their review tag only in tags", () => {
    for (const tag of [
      "review:ambiguity",
      "review:keyword-false-positive",
      "review:ontology-gap",
      "review:nonlogical",
    ]) {
      const [step] = observationPlan(
        {
          type: "req",
          id: "REQ-OBS",
          properties: {
            text_ref: "Exports are probably fine\nmost of the time.",
          },
        },
        "Review note",
        [tag],
      );
      expect(step?.relationships).toEqual([]);
      expect((step?.properties as Record<string, unknown>).tags).toEqual([tag]);
      const body = (step?.document as { body: string }).body;
      expect(body).toContain(
        "> Exports are probably fine\n> most of the time.",
      );
      expect(words(body)).toBeGreaterThanOrEqual(12);
      expect(() =>
        validateUpsertInput(step as never, new Date()),
      ).not.toThrow();
    }
  });
});
