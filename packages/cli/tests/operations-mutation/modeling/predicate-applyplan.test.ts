import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildGapApplyPlan,
  buildPredicateApplyPlan,
  buildPredicateSchemaDraft,
  buildRelationshipPlan,
} from "../../../src/operations/modeling/predicate-applyplan.js";
import type { PredicateSuggestion } from "../../../src/operations/modeling/predicate-types.js";
import { hashId } from "../../../src/operations/modeling/predicate-utils.js";
import {
  normalizeSemanticClause,
  semanticClaimKey,
} from "../../../src/operations/semantic-advisor/clauses.js";

const fixtures = path.join(import.meta.dir, "fixtures");

describe("buildPredicateSchemaDraft", () => {
  const cases = JSON.parse(
    readFileSync(
      path.join(fixtures, "predicate-applyplan-drafts.golden.json"),
      "utf8",
    ),
  ) as { text: string; subject: string; draft: unknown }[];
  for (const { text, subject, draft } of cases) {
    test(`drafts ${JSON.stringify(text)} for ${JSON.stringify(subject)}`, () => {
      expect(buildPredicateSchemaDraft(text, subject)).toStrictEqual(
        draft as never,
      );
    });
  }

  test("spells out the review-only fields", () => {
    expect(
      buildPredicateSchemaDraft(" Users should see dashboards ", "x"),
    ).toStrictEqual({
      predicate_name: "users_dashboards_policy",
      title: "users_dashboards_policy review draft",
      description:
        "Review-only schema draft derived from the unresolved proposition: Users should see dashboards",
      argument_names: ["subject", "claim"],
      argument_types: ["entity", "claim"],
      candidate_bindings: { subject: "x", claim: "see_dashboards" },
      unresolved_bindings: [],
      rationale:
        "No available predicate schema passed semantic applicability. Review the proposed signature and promote it to a reusable predicate_schema before grounding the claim.",
      reuse_scope:
        "Domain-general schema for propositions with the same subject, condition, and required outcome pattern.",
    });
  });
});

function suggestion(
  overrides: Partial<PredicateSuggestion> = {},
): PredicateSuggestion {
  return {
    id: "SUGGEST-1",
    predicate_name: "retention_period",
    predicate_args: ["audit_log", "90"],
    canonical_key: "retention_period(audit_log,90)",
    polarity: "assert",
    binding_status: "complete",
    unbound_arguments: [],
    binding_provenance: "explicit",
    binding_provenance_by_argument: {},
    subject_key: null,
    subject_pairing: "not_required",
    eligibility: "eligible",
    rejection_reasons: [],
    applicability_score: 1,
    score_components: {} as never,
    score: 1,
    rationale: "",
    schema: { tags: ["retention", "audit"] } as never,
    ...overrides,
  } as PredicateSuggestion;
}

describe("buildPredicateApplyPlan", () => {
  const text = "1. Audit logs are kept for 90 days.";

  test("plans one predicate fact for a complete eligible suggestion", () => {
    const args = { text, requirementId: "REQ-1", source: "docs/r.md" };
    expect(buildPredicateApplyPlan(suggestion(), args as never)).toStrictEqual([
      {
        type: "fact",
        id: hashId("FACT-PRED", [
          "REQ-1",
          "docs/r.md",
          "retention_period(audit_log,90)",
        ]),
        properties: {
          title: "Predicate: retention_period(audit_log,90)",
          status: "active",
          source: "docs/r.md",
          text_ref: "docs/r.md",
          tags: [
            "lane:ontology",
            "predicate-suggestion",
            "predicate:retention",
            "predicate:audit",
          ],
          fact_kind: "predicate",
          predicate_name: "retention_period",
          predicate_args: ["audit_log", "90"],
          canonical_key: "retention_period(audit_log,90)",
          polarity: "assert",
          claim_key: semanticClaimKey(text),
          claim_text: normalizeSemanticClause(text),
        },
        relationships: [],
      },
    ]);
  });

  test("carries the subject key and namespace and defaults the source", () => {
    const [plan] = buildPredicateApplyPlan(
      suggestion({
        subject_key: "audit_log",
        polarity: "deny",
        schema: {
          tags: [],
          predicate_namespace: "acme",
        } as never,
      }),
      { text } as never,
    );
    expect(plan?.id).toBe(
      hashId("FACT-PRED", ["", "", "retention_period(audit_log,90)"]),
    );
    expect(plan?.properties).toStrictEqual({
      title: "Predicate: retention_period(audit_log,90)",
      status: "active",
      source: "mcp://kibi/suggest-predicates",
      text_ref: undefined,
      tags: ["lane:ontology", "predicate-suggestion"],
      fact_kind: "predicate",
      subject_key: "audit_log",
      predicate_name: "retention_period",
      predicate_namespace: "acme",
      predicate_args: ["audit_log", "90"],
      canonical_key: "retention_period(audit_log,90)",
      polarity: "deny",
      claim_key: semanticClaimKey(text),
      claim_text: "Audit logs are kept for 90 days",
    });
  });

  test("plans nothing for an incomplete or rejected suggestion", () => {
    expect(
      buildPredicateApplyPlan(suggestion({ binding_status: "incomplete" }), {
        text,
      } as never),
    ).toStrictEqual([]);
    expect(
      buildPredicateApplyPlan(suggestion({ eligibility: "rejected" }), {
        text,
      } as never),
    ).toStrictEqual([]);
  });
});

describe("buildRelationshipPlan", () => {
  const instructions = (factId: string) =>
    `Apply the predicate fact ${factId} first, update the requirement with the returned merged logicClaims manifest, then attach this relationship without overwriting other requirement metadata. The relationship target is the planned fact id ${factId}, never a candidates[].id (SUGGEST-...).`;

  test("needs both a fact and a requirement", () => {
    expect(buildRelationshipPlan(undefined, "REQ-1")).toBeNull();
    expect(buildRelationshipPlan("FACT-1", undefined)).toBeNull();
    expect(buildRelationshipPlan("", "REQ-1")).toBeNull();
    expect(buildRelationshipPlan("FACT-1", "")).toBeNull();
  });

  test("links the requirement to the fact without a claim", () => {
    expect(buildRelationshipPlan("FACT-1", "REQ-1")).toStrictEqual({
      applyAfter: "FACT-1",
      requiresExistingReq: "REQ-1",
      relationship: { type: "requires_predicate", from: "REQ-1", to: "FACT-1" },
      instructions: instructions("FACT-1"),
    });
    expect(buildRelationshipPlan("FACT-1", "REQ-1", "")).toStrictEqual({
      applyAfter: "FACT-1",
      requiresExistingReq: "REQ-1",
      relationship: { type: "requires_predicate", from: "REQ-1", to: "FACT-1" },
      instructions: instructions("FACT-1"),
    });
  });

  test("merges the claim into the existing logic claims once", () => {
    const key = semanticClaimKey("  Logs are kept.  ");
    expect(
      buildRelationshipPlan("FACT-2", "REQ-2", "  Logs are kept.  ", [
        "CLAIM-OTHER",
        key,
      ]),
    ).toStrictEqual({
      applyAfter: "FACT-2",
      requiresExistingReq: "REQ-2",
      relationship: { type: "requires_predicate", from: "REQ-2", to: "FACT-2" },
      claimKey: key,
      claimText: "Logs are kept.",
      logicClaims: ["CLAIM-OTHER", key],
      instructions: instructions("FACT-2"),
    });
    expect(
      buildRelationshipPlan("FACT-2", "REQ-2", "  Logs are kept.  "),
    ).toMatchObject({ logicClaims: [key] });
  });
});

describe("buildGapApplyPlan", () => {
  const preamble =
    "No available predicate schema fits this claim, so kb_model mode predicates recorded it as an open ontology gap. The observation does not ground the claim; it stays visible for review until a reviewed predicate_schema covers this kind of statement.";

  test("quotes the claim with its origin", () => {
    const text = "  Logs rotate daily.\nOld logs are purged.  ";
    expect(
      buildGapApplyPlan(text, {
        text,
        requirementId: "REQ-9",
        source: "docs/r.md",
      } as never),
    ).toStrictEqual([
      {
        type: "fact",
        id: hashId("FACT-ONTOLOGY-GAP", ["REQ-9", "docs/r.md", text]),
        properties: {
          title: "Ontology gap: predicate schema needed",
          status: "active",
          source: "docs/r.md",
          text_ref: "docs/r.md",
          tags: ["review:ontology-gap", "needs_schema_extension"],
          fact_kind: "observation",
          value_string: text,
          claim_text: text,
        },
        document: {
          body: `${preamble}\n\nClaim from requirement REQ-9, source docs/r.md:\n\n> Logs rotate daily.\n> Old logs are purged.`,
        },
        relationships: [],
      },
    ]);
  });

  test("names a lone origin or none", () => {
    const [onlyReq] = buildGapApplyPlan("x", {
      text: "x",
      requirementId: "REQ-1",
    } as never);
    expect(onlyReq?.document).toStrictEqual({
      body: `${preamble}\n\nClaim from requirement REQ-1:\n\n> x`,
    });
    const [onlySource] = buildGapApplyPlan("x", {
      text: "x",
      source: "s.md",
    } as never);
    expect((onlySource?.document as { body: string }).body).toBe(
      `${preamble}\n\nClaim from source s.md:\n\n> x`,
    );
    const [none] = buildGapApplyPlan("x", { text: "x" } as never);
    expect(none?.id).toBe(hashId("FACT-ONTOLOGY-GAP", ["", "", "x"]));
    expect(none?.properties).toStrictEqual({
      title: "Ontology gap: predicate schema needed",
      status: "active",
      source: "mcp://kibi/suggest-predicates",
      tags: ["review:ontology-gap", "needs_schema_extension"],
      fact_kind: "observation",
      value_string: "x",
      claim_text: "x",
    });
    expect((none?.document as { body: string }).body).toBe(
      `${preamble}\n\nClaim:\n\n> x`,
    );
  });
});
