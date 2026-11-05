import { describe, expect, test } from "bun:test";
import { buildAdvisorResult } from "../../../src/operations/semantic-advisor/analysis-receipt.js";
import type { SemanticClause } from "../../../src/operations/semantic-advisor/clauses.js";
import {
  SEMANTIC_INVENTORY_VERSION,
  payloadHash,
  semanticSourceHash,
} from "../../../src/operations/semantic-advisor/shared.js";
import type {
  SemanticModelingSuggestion,
  SemanticProposition,
  SemanticSignal,
} from "../../../src/operations/semantic-advisor/types.js";

const payload = {
  type: "req",
  id: "REQ-a",
  properties: { text_ref: "Users must export." },
};

const signal = (
  kind: SemanticSignal["kind"],
  evidence: string = kind,
): SemanticSignal => ({
  kind,
  evidence,
  candidate_lane: "none",
  confidence: 0.5,
});
const suggestion = (kind: string, claim_key = "CLAIM-X") =>
  ({ kind, claim_key }) as unknown as SemanticModelingSuggestion;
const proposition = (claim_key: string, role: string, status: string) =>
  ({ claim_key, role, status }) as unknown as SemanticProposition;

const build = (
  options: {
    payload?: Record<string, unknown>;
    signals?: SemanticSignal[];
    modeled?: boolean;
    suggestions?: SemanticModelingSuggestion[];
    clauses?: SemanticClause[];
    propositions?: SemanticProposition[];
  } = {},
) =>
  buildAdvisorResult(
    options.payload ?? payload,
    options.signals ?? [],
    options.modeled ?? false,
    options.suggestions ?? [],
    options.clauses ?? [],
    options.propositions ?? [],
    [],
    [],
  );

const SUMMARY = {
  modeled:
    "Requirement declares every detected atomic claim and has logical fact links; run kb_check logic-coverage to verify each manifest entry is grounded.",
  none: "No strong machine-checkable requirement signals were detected.",
  strict:
    "Requirement prose appears to contain scalar, threshold, or cardinality logic that should be modeled with strict facts.",
  predicate:
    "Requirement prose appears to contain relational or behavioral logic that should be modeled with ontology predicates.",
  rule: "Requirement prose has a typed interpretation candidate; validate and persist it as a safe kibi.logic.v1 rule.",
  review:
    "Requirement prose appears normative but needs review before it can participate in logic checks.",
};

const warning = (summary: string, tools: string) =>
  `Semantic advisor: ${summary} Next action: call ${tools} before treating this requirement as Prolog-checkable.`;

describe("buildAdvisorResult", () => {
  test("a modeled requirement needs nothing", () => {
    const result = build({
      modeled: true,
      signals: [signal("numeric_cardinality")],
      suggestions: [suggestion("strict_property")],
      propositions: [proposition("CLAIM-A", "normative", "modeled")],
    });
    expect(result.warnings).toStrictEqual([]);
    expect(result.receipt.logic_readiness).toBe("modeled");
    expect(result.receipt.candidate_lane).toBe("none");
    expect(result.receipt.suggested_next_tools).toStrictEqual([]);
    expect(result.receipt.ambiguity_witnesses).toStrictEqual([]);
    expect(result.receipt.logic_coverage.status).toBe("complete");
    expect(result.receipt.summary).toBe(SUMMARY.modeled);
  });

  test("builds the whole receipt", () => {
    const clauses: SemanticClause[] = [
      {
        claim_key: "CLAIM-A",
        text: "A",
        index: 0,
        normative: true,
        source: "detected",
      },
      {
        claim_key: "CLAIM-B",
        text: "B",
        index: 1,
        normative: false,
        source: "detected",
      },
    ];
    const suggestions = [
      suggestion("strict_property", "CLAIM-A"),
      suggestion("predicate", "CLAIM-A"),
    ];
    const signals = [
      signal("numeric_cardinality", "3 users"),
      signal("conditional"),
    ];
    const propositions = [proposition("CLAIM-A", "normative", "missing")];
    const withClaims = {
      ...payload,
      properties: { ...payload.properties, logic_claims: ["CLAIM-A", 3] },
    };
    expect(
      build({
        payload: withClaims,
        clauses,
        suggestions,
        signals,
        propositions,
      }),
    ).toStrictEqual({
      receipt: {
        version: "semantic-advisor-v2",
        payload_hash: payloadHash(withClaims),
        inventory_contract: {
          version: SEMANTIC_INVENTORY_VERSION,
          source_field: "text_ref",
          source_hash: semanticSourceHash("Users must export."),
        },
        logic_readiness: "needs_modeling",
        candidate_lane: "strict_property",
        signals,
        ambiguity_witnesses: [
          {
            signal_kind: "numeric_cardinality",
            evidence: "3 users",
            interpretations: [
              "exactly",
              "at_most",
              "at_least",
              "named_membership",
              "illustrative_example",
            ],
            message:
              "Numeric cardinality prose can mean an exact count, an upper/lower bound, named membership, or an example; model it explicitly before relying on contradiction checks.",
          },
        ],
        propositions,
        interpretations: [],
        shadow_analysis: [],
        suggestions,
        clauses: [
          { ...clauses[0], suggestion_indexes: [0, 1] },
          { ...clauses[1], suggestion_indexes: [] },
        ],
        logic_coverage: {
          status: "partial",
          expected_claim_keys: ["CLAIM-A"],
          declared_claim_keys: ["CLAIM-A"],
          missing_claim_keys: [],
          unresolved_claim_keys: ["CLAIM-A"],
        },
        suggested_next_tools: ["kb_model_requirement"],
        summary: SUMMARY.strict,
      },
      warnings: [warning(SUMMARY.strict, "kb_model (mode requirement)")],
    });
  });

  test("suggestion lanes win over signal lanes, strict before rule before predicate", () => {
    const lane = (suggestions: SemanticModelingSuggestion[]) =>
      build({ suggestions, signals: [signal("normative_modal")] }).receipt;
    expect(
      lane([suggestion("predicate"), suggestion("rule")]).candidate_lane,
    ).toBe("rule");
    expect(
      lane([suggestion("rule"), suggestion("strict_property")]).candidate_lane,
    ).toBe("strict_property");
    expect(
      lane([suggestion("observation_review"), suggestion("predicate")])
        .candidate_lane,
    ).toBe("predicate");
    expect(
      build({ suggestions: [suggestion("ambiguity_observation")] }).receipt
        .candidate_lane,
    ).toBe("none");
    const rule = build({ suggestions: [suggestion("rule")] });
    expect(rule.receipt.suggested_next_tools).toStrictEqual([
      "kb_model_requirement",
    ]);
    expect(rule.receipt.summary).toBe(SUMMARY.rule);
    expect(rule.warnings).toStrictEqual([
      warning(SUMMARY.rule, "kb_model (mode requirement)"),
    ]);
    const predicate = build({ suggestions: [suggestion("predicate")] });
    expect(predicate.receipt.suggested_next_tools).toStrictEqual([
      "kb_suggest_predicates",
    ]);
    expect(predicate.receipt.summary).toBe(SUMMARY.predicate);
    expect(predicate.warnings).toStrictEqual([
      warning(SUMMARY.predicate, "kb_model (mode predicates)"),
    ]);
  });

  test("without suggestions the signals choose the lane", () => {
    expect(
      build({ signals: [signal("conditional")] }).receipt.candidate_lane,
    ).toBe("predicate");
    expect(
      build({ signals: [signal("numeric_threshold")] }).receipt.candidate_lane,
    ).toBe("strict_property");
    const review = build({ signals: [signal("normative_modal")] });
    expect(review.receipt.candidate_lane).toBe("observation_review");
    expect(review.receipt.suggested_next_tools).toStrictEqual([
      "kb_model_requirement",
      "kb_suggest_predicates",
    ]);
    expect(review.receipt.summary).toBe(SUMMARY.review);
    expect(review.warnings).toStrictEqual([
      warning(
        SUMMARY.review,
        "kb_model (mode requirement) or kb_model (mode predicates)",
      ),
    ]);
    expect(
      build({ signals: [signal("numeric_threshold")] }).receipt
        .ambiguity_witnesses,
    ).toStrictEqual([]);
  });

  test("unresolved normative propositions need review without signals", () => {
    for (const status of ["missing", "ambiguous", "ontology_gap"]) {
      expect(
        build({ propositions: [proposition("C", "normative", status)] }).receipt
          .candidate_lane,
      ).toBe("observation_review");
    }
    for (const [role, status] of [
      ["normative", "modeled"],
      ["descriptive", "missing"],
    ]) {
      const result = build({
        propositions: [proposition("C", role as string, status as string)],
      });
      expect(result.receipt.candidate_lane).toBe("none");
      expect(result.receipt.logic_readiness).toBe("not_applicable");
      expect(result.receipt.suggested_next_tools).toStrictEqual([]);
      expect(result.receipt.summary).toBe(SUMMARY.none);
      expect(result.warnings).toStrictEqual([]);
    }
    expect(
      build({
        signals: [signal("conditional")],
        propositions: [proposition("C", "normative", "missing")],
      }).receipt.candidate_lane,
    ).toBe("predicate");
    expect(
      build({
        propositions: [
          proposition("C", "normative", "modeled"),
          proposition("D", "normative", "missing"),
        ],
      }).receipt.candidate_lane,
    ).toBe("observation_review");
  });

  test("logic coverage compares expected and declared claim keys", () => {
    const propositions = [
      proposition("CLAIM-N", "normative", "ambiguous"),
      proposition("CLAIM-D", "definition", "ontology_gap"),
      proposition("CLAIM-R", "rationale", "missing"),
      proposition("CLAIM-E", "example", "nonlogical"),
      proposition("CLAIM-S", "subjective", "nonlogical"),
      proposition("CLAIM-M", "condition", "modeled"),
    ];
    expect(build({ propositions }).receipt.logic_coverage).toStrictEqual({
      status: "unverified",
      expected_claim_keys: ["CLAIM-N", "CLAIM-D", "CLAIM-M"],
      declared_claim_keys: [],
      missing_claim_keys: ["CLAIM-N", "CLAIM-D", "CLAIM-M"],
      unresolved_claim_keys: ["CLAIM-N", "CLAIM-D", "CLAIM-R"],
    });
    const declared = {
      ...payload,
      properties: { ...payload.properties, logic_claims: ["CLAIM-D"] },
    };
    expect(
      build({ payload: declared, propositions }).receipt.logic_coverage,
    ).toMatchObject({
      status: "partial",
      declared_claim_keys: ["CLAIM-D"],
      missing_claim_keys: ["CLAIM-N", "CLAIM-M"],
    });
    const notList = {
      ...payload,
      properties: { ...payload.properties, logic_claims: "CLAIM-D" },
    };
    expect(
      build({ payload: notList, propositions }).receipt.logic_coverage
        .declared_claim_keys,
    ).toStrictEqual([]);
    expect(
      build({ propositions: [proposition("R", "rationale", "nonlogical")] })
        .receipt.logic_coverage.status,
    ).toBe("not_applicable");
    expect(build({ modeled: true }).receipt.logic_coverage.status).toBe(
      "not_applicable",
    );
  });
});
