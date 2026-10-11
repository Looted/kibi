// implements REQ-mcp-suggest-predicates
import { describe, expect, test } from "bun:test";
import { handleKbSuggestPredicates } from "../../src/operations/modeling/suggest-predicates.js";
import { hasNormativeAssertion } from "../../src/operations/semantic-advisor/clauses.js";
import type {
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

/** A KB with no relationships: the requirement grounds nothing yet. */
const emptyKb = {
  query: async (goal: string): Promise<PrologQueryResult> =>
    goal.includes("kb_relationship(")
      ? { success: true, bindings: { Targets: "[]", Keys: "[]" } }
      : { success: false, bindings: {} },
} as unknown as PrologPort;

async function permissionCandidate(text: string, decision: "allow" | "deny") {
  const result = await handleKbSuggestPredicates(emptyKb, {
    text,
    requirementId: "REQ-coach-read-unassigned-requests",
    schemaId: "FACT-SCHEMA-PERMISSION-RULE",
    includeExistingSchemas: false,
    maxCandidates: 1,
    argumentBindings: {
      actor: "coach",
      action: "read",
      resource: "unassigned_analysis_request",
      decision,
    },
  });
  return result.structuredContent;
}

describe("bare permission modals express permission intent", () => {
  test.each([
    "Coaches can read analysis requests that are not assigned to them.",
    "Coaches may read analysis requests that are not assigned to them.",
    "Coaches are permitted to read analysis requests that are not assigned to them.",
    "Coaches are allowed to read analysis requests that are not assigned to them.",
  ])("%s grounds an allow permission_rule", async (text) => {
    const data = await permissionCandidate(text, "allow");
    const [candidate] = data.candidates;
    expect(candidate?.rejection_reasons).not.toContain(
      "prose does not express normative or validity intent",
    );
    expect(candidate).toMatchObject({
      predicate_name: "permission_rule",
      predicate_args: ["coach", "read", "unassigned_analysis_request", "allow"],
      polarity: "assert",
      binding_status: "complete",
      eligibility: "eligible",
    });
    expect(data.recommendedAction).toBe("apply_requires_predicate");
  });

  test("the semantic advisor treats explicit grants as normative but keeps bare capability prose descriptive", () => {
    expect(
      hasNormativeAssertion(
        "Coaches are permitted to read analysis requests that are not assigned to them.",
      ),
    ).toBe(true);
    expect(
      hasNormativeAssertion(
        "Coaches are allowed to read analysis requests that are not assigned to them.",
      ),
    ).toBe(true);
    // Stored inventories classify "can be …" capability prose as
    // descriptive; reclassifying it would invalidate them.
    expect(
      hasNormativeAssertion(
        "It can be restricted to specific rules or focused on staged changes.",
      ),
    ).toBe(false);
  });

  test.each([
    "Coaches cannot read analysis requests that are not assigned to them.",
    "Coaches must not read analysis requests that are not assigned to them.",
  ])("%s still grounds a deny permission_rule", async (text) => {
    const data = await permissionCandidate(text, "deny");
    const [candidate] = data.candidates;
    expect(candidate).toMatchObject({
      predicate_name: "permission_rule",
      predicate_args: ["coach", "read", "unassigned_analysis_request", "deny"],
      polarity: "deny",
      eligibility: "eligible",
    });
    expect(data.recommendedAction).toBe("apply_requires_predicate");
  });
});
