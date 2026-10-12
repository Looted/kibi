// implements REQ-mcp-suggest-predicates, REQ-model-predicates-permission-grants
import { describe, expect, test } from "bun:test";
import { inferPermissionRuleArgs } from "../../src/operations/modeling/predicate-inference-1.js";
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

describe("capability grants express permission intent", () => {
  // The three sentences a product owner wrote for the search-lane fixture;
  // each binding set is one of the facts they expect.
  test.each([
    [
      "An admin must be able to read, update and delete any analysis request.",
      { actor: "admin", action: "update", resource: "analysis_request" },
    ],
    [
      "A viewer must be able to read analysis requests and must not update or delete them.",
      { actor: "viewer", action: "read", resource: "analysis_request" },
    ],
    [
      "An auditor must be able to export reports.",
      { actor: "auditor", action: "export", resource: "report" },
    ],
    [
      "Auditors are able to export reports.",
      { actor: "auditor", action: "export", resource: "report" },
    ],
    [
      "Admins have permission to delete analysis requests.",
      { actor: "admin", action: "delete", resource: "analysis_request" },
    ],
    [
      "Viewers are entitled to view their own reports.",
      { actor: "viewer", action: "view", resource: "report" },
    ],
  ])(
    "%s grounds an allow permission_rule with reviewed bindings",
    async (text, bindings) => {
      const result = await handleKbSuggestPredicates(emptyKb, {
        text,
        requirementId: "REQ-analysis-request-access",
        schemaId: "FACT-SCHEMA-PERMISSION-RULE",
        includeExistingSchemas: false,
        maxCandidates: 1,
        argumentBindings: { ...bindings, decision: "allow" },
      });
      const data = result.structuredContent;
      const [candidate] = data.candidates;
      expect(candidate?.rejection_reasons).toEqual([]);
      expect(candidate).toMatchObject({
        predicate_name: "permission_rule",
        predicate_args: [
          bindings.actor,
          bindings.action,
          bindings.resource,
          "allow",
        ],
        polarity: "assert",
        binding_status: "complete",
        eligibility: "eligible",
      });
      expect(data.recommendedAction).toBe("apply_requires_predicate");
    },
  );

  test.each([
    [
      "An auditor must be able to export reports.",
      ["auditor", "export", "report", "assert"],
    ],
    [
      "Viewers are allowed to read any analysis request.",
      ["viewer", "read", "analysis_request", "assert"],
    ],
    [
      "Admins have permission to delete analysis requests.",
      ["admin", "delete", "analysis_request", "assert"],
    ],
    [
      "A viewer is not allowed to delete analysis requests.",
      ["viewer", "delete", "analysis_request", "deny"],
    ],
    [
      "Guests must not be able to export their own reports.",
      ["guest", "export", "report", "deny"],
    ],
  ])("%s infers singular actor and resource bindings", (text, expected) => {
    expect(inferPermissionRuleArgs(text)).toEqual(expected);
  });

  test("a grant with no reviewed bindings offers the inferred ones instead of placeholders", async () => {
    const result = await handleKbSuggestPredicates(emptyKb, {
      text: "An auditor must be able to export reports.",
      schemaId: "FACT-SCHEMA-PERMISSION-RULE",
      includeExistingSchemas: false,
      maxCandidates: 1,
    });
    const [candidate] = result.structuredContent.candidates;
    expect(candidate).toMatchObject({
      predicate_name: "permission_rule",
      predicate_args: ["auditor", "export", "report", "allow"],
      eligibility: "eligible",
    });
  });

  test("the semantic advisor treats permission and entitlement grants as normative", () => {
    expect(
      hasNormativeAssertion(
        "Admins have permission to delete analysis requests.",
      ),
    ).toBe(true);
    expect(
      hasNormativeAssertion("Viewers are entitled to view their own reports."),
    ).toBe(true);
    // Bare ability stays descriptive so stored inventories keep their roles;
    // "must be able to" is normative through "must" already.
    expect(hasNormativeAssertion("Editors are able to update drafts.")).toBe(
      false,
    );
  });
});
