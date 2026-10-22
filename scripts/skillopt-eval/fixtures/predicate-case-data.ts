import type { TaskSplit } from "../catalog";
import type {
  LogicCoverageFamily,
  PredicateCase,
  PredicateFamily,
  PredicateSemanticClass,
  PrivateExpectation,
  PublicClaim,
  PublicPredicateSchema,
} from "./predicate-cases";

export function assertMatchingSemanticClass(
  expected: PredicateSemanticClass,
  actual: PredicateSemanticClass,
): void {
  if (actual !== expected) {
    throw new Error("semantic class mismatch in predicate case registry");
  }
}

// implements REQ-skillopt-predicate-first-requirements

/**
 * Semantically distinct case declarations: seven core cases and three
 * rule-lane cases. Public claims use a factory so the shared publicSchema
 * shape is not repeated verbatim; only the distinct claimText and
 * projectLocalSchemas vary per case.
 */

const PUBLIC_SCHEMA_VERSION = "predicate-corpus-1.4.0";

const FACT_KINDS = [
  "subject",
  "property_value",
  "predicate",
  "predicate_schema",
  "observation",
  "meta",
  "rule_schema",
  "rule",
] as const;

function makeClaim(
  claimText: string,
  projectLocalSchemas: readonly PublicPredicateSchema[] = [],
  coverageFamilies: readonly LogicCoverageFamily[] = [],
): PublicClaim {
  return {
    claimText,
    publicSchema: {
      kind: "predicate-modeling-task",
      schemaVersion: PUBLIC_SCHEMA_VERSION,
      availableFactKinds: [...FACT_KINDS],
      projectLocalSchemas: projectLocalSchemas.map((schema) => ({
        ...schema,
        argumentNames: [...schema.argumentNames],
        argumentTypes: [...schema.argumentTypes],
      })),
      coverageFamilies: [...coverageFamilies],
    },
  };
}

// --- Public claims. Wording is distinct per case and never leaks the answer. ---

const BUILTIN_RELATIONAL_CLAIM = makeClaim(
  "Checkout requires payment authorization before order submission, and customer data must be retained for 7 years.",
  [],
  ["compound_prose", "implicit_condition", "deontic_modality", "temporal_rule"],
);
const STRICT_SCALAR_CLAIM = makeClaim(
  "Customer data must be retained for 7 years.",
  [],
  ["quantifier_cardinality", "temporal_rule", "paraphrase_equivalence"],
);
const PROJECT_LOCAL_SCHEMA_CLAIM = makeClaim(
  "A deployment candidate is releasable only when its lineage binds the artifact digest, test evidence, and source revision.",
  [
    {
      id: "FACT-SCHEMA-DELIVERY-LINEAGE",
      predicateName: "delivery_lineage",
      argumentNames: ["artifact_digest", "test_evidence", "source_revision"],
      argumentTypes: ["hash", "evidence_set", "revision"],
    },
  ],
  ["passive_phrasing", "implicit_condition", "descriptive_fact"],
);
const DENY_POLARITY_CLAIM = makeClaim(
  "A held-out evaluation matrix must never be retried with a candidate whose bytes differ from the frozen SkillOpt candidate hash bound to the terminal matrix id.",
  [
    {
      id: "FACT-SCHEMA-HELD-OUT-MATRIX",
      predicateName: "held_out_matrix",
      argumentNames: ["terminal_matrix_id", "frozen_skillopt_candidate_hash"],
      argumentTypes: ["identifier", "hash"],
    },
  ],
  ["semantic_contrast", "negation_scope", "deontic_modality"],
);
const AMBIGUOUS_CLAIM = makeClaim(
  "Release readiness improves when the knowledge base looks complete enough and the team is comfortable with the current state of the graph.",
  [],
  ["ambiguity", "paraphrase_equivalence"],
);
const ONTOLOGY_GAP_CLAIM = makeClaim(
  "Every signed verdict over the held-out matrix must be reproducible from the sealed snapshot, the authorized roots, and the operator-owned ledger without trusting caller-supplied path claims.",
  [],
  ["ontology_gap", "exception_handling", "temporal_rule"],
);
const KEYWORD_FALSE_POSITIVE_CLAIM = makeClaim(
  "The fact body mentions the word 'predicate' several times while describing a free-form narrative about how reviewers feel about the release notes.",
  [],
  ["descriptive_fact", "passive_phrasing"],
);

// Rule-lane claims use neutral domains (refunds, rate limits, retention).
const NECESSARY_CONDITION_CLAIM = makeClaim(
  "A refund may be issued only when the order's settled amount is greater than zero.",
  [],
  ["implicit_condition", "deontic_modality", "negation_scope"],
);
const COMPOUND_OBLIGATIONS_CLAIM = makeClaim(
  "An API client must send at most 100 requests per minute. An export requires an access review before download. Audit logs must be retained for 365 days. Export files must be deleted after 30 days. A refund requires manager approval before payout. Session tokens must expire after 60 minutes.",
  [],
  [
    "compound_prose",
    "deontic_modality",
    "quantifier_cardinality",
    "temporal_rule",
  ],
);
const EXCEPTION_UNLESS_CLAIM = makeClaim(
  "An expired export file must be deleted unless a legal hold is recorded for it.",
  [
    {
      id: "FACT-SCHEMA-LEGAL-HOLD",
      predicateName: "legal_hold",
      argumentNames: ["export_file"],
      argumentTypes: ["export_file"],
    },
  ],
  ["exception_handling", "deontic_modality", "implicit_condition"],
);

// --- Private expectations. Held by the evaluator/verifier lane only. ---

const BUILTIN_RELATIONAL_EXPECTATION: PrivateExpectation = {
  semanticClass: "builtin_relational",
  expectedLane: "predicate",
  expectedPredicateName: "dependency_rule",
  expectedPredicateArgs: [
    "checkout",
    "payment_authorization",
    "order_submission",
  ],
  expectedPolarity: "assert",
  expectedEdges: [
    { relationship: "requires_predicate", target: "dependency_rule" },
    { relationship: "constrains", target: "customer_data" },
    { relationship: "requires_property", target: "retention_years=7" },
  ],
  expectedGroundFactKinds: ["predicate", "subject", "property_value"],
  expectedLogicClaimCount: 2,
  privateRationale:
    "Both atomic clauses must be grounded: dependency_rule for the prerequisite and strict subject/property facts for retention, with two distinct claim keys in the requirement manifest.",
  coverageFamilies: BUILTIN_RELATIONAL_CLAIM.publicSchema.coverageFamilies,
};

const STRICT_SCALAR_EXPECTATION: PrivateExpectation = {
  semanticClass: "strict_scalar_counterexample",
  expectedLane: "strict_property",
  expectedPredicateName: null,
  expectedPredicateArgs: null,
  expectedPolarity: null,
  expectedEdges: [
    { relationship: "constrains", target: "customer_data" },
    {
      relationship: "requires_property",
      target: "retention_years=7",
    },
  ],
  expectedGroundFactKinds: ["subject", "property_value"],
  expectedLogicClaimCount: 1,
  privateRationale:
    "Scalar threshold claim is a counterexample to predicate modeling and must use strict subject/property_value facts instead.",
  coverageFamilies: STRICT_SCALAR_CLAIM.publicSchema.coverageFamilies,
};

const PROJECT_LOCAL_SCHEMA_EXPECTATION: PrivateExpectation = {
  semanticClass: "project_local_schema",
  expectedLane: "predicate",
  expectedPredicateName: "delivery_lineage",
  expectedPredicateArgs: [
    "artifact_digest",
    "test_evidence",
    "source_revision",
  ],
  expectedPolarity: "assert",
  expectedEdges: [
    { relationship: "requires_predicate", target: "delivery_lineage" },
  ],
  expectedGroundFactKinds: ["predicate"],
  expectedLogicClaimCount: 1,
  privateRationale:
    "Project-local relational claim fits the declared delivery_lineage schema and links via requires_predicate.",
  coverageFamilies: PROJECT_LOCAL_SCHEMA_CLAIM.publicSchema.coverageFamilies,
};

const DENY_POLARITY_EXPECTATION: PrivateExpectation = {
  semanticClass: "deny_polarity",
  expectedLane: "predicate",
  expectedPredicateName: "held_out_matrix",
  expectedPredicateArgs: [
    "terminal_matrix_id",
    "frozen_skillopt_candidate_hash",
  ],
  expectedPolarity: "deny",
  expectedEdges: [
    { relationship: "requires_predicate", target: "held_out_matrix" },
  ],
  expectedGroundFactKinds: ["predicate"],
  expectedLogicClaimCount: 1,
  privateRationale:
    "Normative prohibition maps onto a project-local predicate with deny polarity rather than an observation.",
  coverageFamilies: DENY_POLARITY_CLAIM.publicSchema.coverageFamilies,
};

const AMBIGUOUS_EXPECTATION: PrivateExpectation = {
  semanticClass: "ambiguous",
  expectedLane: "observation",
  expectedPredicateName: null,
  expectedPredicateArgs: null,
  expectedPolarity: null,
  expectedEdges: [
    { relationship: "relates_to", target: "review:ambiguous-claim" },
  ],
  expectedGroundFactKinds: ["observation"],
  expectedLogicClaimCount: 0,
  privateRationale:
    "Vague, non-machine-checkable claim must remain a review observation rather than an invented predicate.",
  coverageFamilies: AMBIGUOUS_CLAIM.publicSchema.coverageFamilies,
};

const ONTOLOGY_GAP_EXPECTATION: PrivateExpectation = {
  semanticClass: "ontology_gap",
  expectedLane: "ontology_gap_observation",
  expectedPredicateName: null,
  expectedPredicateArgs: null,
  expectedPolarity: null,
  expectedEdges: [
    { relationship: "relates_to", target: "review:ontology-gap" },
  ],
  expectedGroundFactKinds: ["observation"],
  expectedLogicClaimCount: 0,
  privateRationale:
    "A suitable predicate does not yet exist in the supported schema, so the correct outcome is an ontology-gap observation, not an invented predicate.",
  coverageFamilies: ONTOLOGY_GAP_CLAIM.publicSchema.coverageFamilies,
};

const KEYWORD_FALSE_POSITIVE_EXPECTATION: PrivateExpectation = {
  semanticClass: "keyword_false_positive",
  expectedLane: "observation",
  expectedPredicateName: null,
  expectedPredicateArgs: null,
  expectedPolarity: null,
  expectedEdges: [
    { relationship: "relates_to", target: "review:keyword-false-positive" },
  ],
  expectedGroundFactKinds: ["observation"],
  expectedLogicClaimCount: 0,
  privateRationale:
    "The keyword 'predicate' appears in prose, but the claim is narrative and non-relational; correct outcome is an observation, not a predicate.",
  coverageFamilies: KEYWORD_FALSE_POSITIVE_CLAIM.publicSchema.coverageFamilies,
};

const NECESSARY_CONDITION_EXPECTATION: PrivateExpectation = {
  semanticClass: "necessary_condition",
  expectedLane: "rule",
  expectedPredicateName: null,
  expectedPredicateArgs: null,
  expectedPolarity: null,
  expectedEdges: [
    { relationship: "requires_rule", target: "SEM-9C7A62D88EA913EE3EA1B96E" },
  ],
  expectedGroundFactKinds: ["rule_schema", "rule"],
  expectedLogicClaimCount: 1,
  expectedRuleSemanticKey: "SEM-9C7A62D88EA913EE3EA1B96E",
  forbiddenGroundFactKinds: ["property_value"],
  privateRationale:
    "A necessary condition is a typed forbid-unless rule over the settled amount, not a strict property of the order; the canonical IR fixes its semantic key.",
  coverageFamilies: NECESSARY_CONDITION_CLAIM.publicSchema.coverageFamilies,
};

const COMPOUND_OBLIGATIONS_EXPECTATION: PrivateExpectation = {
  semanticClass: "compound_obligations",
  expectedLane: "strict_property",
  expectedPredicateName: null,
  expectedPredicateArgs: null,
  expectedPolarity: null,
  expectedEdges: [
    { relationship: "requires_predicate", target: "dependency_rule" },
    { relationship: "requires_property", target: "retention_days=365" },
  ],
  expectedGroundFactKinds: ["subject", "property_value", "predicate"],
  expectedLogicClaimCount: 6,
  privateRationale:
    "Six independent obligations need six claim keys, each on its own strict property or predicate fact; one bundled fact fails grounding.",
  coverageFamilies: COMPOUND_OBLIGATIONS_CLAIM.publicSchema.coverageFamilies,
};

const EXCEPTION_UNLESS_EXPECTATION: PrivateExpectation = {
  semanticClass: "exception_unless",
  expectedLane: "rule",
  expectedPredicateName: null,
  expectedPredicateArgs: null,
  expectedPolarity: null,
  expectedEdges: [],
  expectedGroundFactKinds: ["rule_schema", "rule"],
  expectedLogicClaimCount: 1,
  expectedRuleExceptions: { atomNames: ["legal_hold"] },
  forbiddenGroundFactKinds: ["property_value"],
  privateRationale:
    "The unless clause is an exception of a typed rule over the approved legal_hold schema; the conditioned deletion is never a strict property value.",
  coverageFamilies: EXCEPTION_UNLESS_CLAIM.publicSchema.coverageFamilies,
};

function caseFor(
  split: TaskSplit,
  semanticClass: PredicateSemanticClass,
  caseId: string,
  claim: PublicClaim,
  expectation: PrivateExpectation,
  family: PredicateFamily = "fact-predicate-modeling",
): PredicateCase {
  assertMatchingSemanticClass(semanticClass, expectation.semanticClass);
  return {
    family,
    semanticClass,
    caseId,
    split,
    publicClaim: claim,
    privateExpectation: expectation,
  };
}

/**
 * Ordered registry. Index order fills the 2/1/4 split allocation:
 * indices 0-1 train, index 2 development, indices 3-6 held-out.
 */
export const PREDICATE_CASES: readonly PredicateCase[] = [
  caseFor(
    "train",
    "builtin_relational",
    "kibi-usage-fact-predicate-modeling-train-1",
    BUILTIN_RELATIONAL_CLAIM,
    BUILTIN_RELATIONAL_EXPECTATION,
  ),
  caseFor(
    "train",
    "strict_scalar_counterexample",
    "kibi-usage-fact-predicate-modeling-train-2",
    STRICT_SCALAR_CLAIM,
    STRICT_SCALAR_EXPECTATION,
  ),
  caseFor(
    "development",
    "project_local_schema",
    "kibi-usage-fact-predicate-modeling-development-1",
    PROJECT_LOCAL_SCHEMA_CLAIM,
    PROJECT_LOCAL_SCHEMA_EXPECTATION,
  ),
  caseFor(
    "held-out",
    "deny_polarity",
    "kibi-usage-fact-predicate-modeling-held-out-1",
    DENY_POLARITY_CLAIM,
    DENY_POLARITY_EXPECTATION,
  ),
  caseFor(
    "held-out",
    "ambiguous",
    "kibi-usage-fact-predicate-modeling-held-out-2",
    AMBIGUOUS_CLAIM,
    AMBIGUOUS_EXPECTATION,
  ),
  caseFor(
    "held-out",
    "ontology_gap",
    "kibi-usage-fact-predicate-modeling-held-out-3",
    ONTOLOGY_GAP_CLAIM,
    ONTOLOGY_GAP_EXPECTATION,
  ),
  caseFor(
    "held-out",
    "keyword_false_positive",
    "kibi-usage-fact-predicate-modeling-held-out-4",
    KEYWORD_FALSE_POSITIVE_CLAIM,
    KEYWORD_FALSE_POSITIVE_EXPECTATION,
  ),
];

/**
 * Rule-lane registry for the supplemental `rule-lane-modeling` family. Index
 * order fills the 0/2/1 split allocation.
 */
export const RULE_LANE_PREDICATE_CASES: readonly PredicateCase[] = [
  caseFor(
    "development",
    "necessary_condition",
    "kibi-usage-rule-lane-modeling-development-1",
    NECESSARY_CONDITION_CLAIM,
    NECESSARY_CONDITION_EXPECTATION,
    "rule-lane-modeling",
  ),
  caseFor(
    "development",
    "compound_obligations",
    "kibi-usage-rule-lane-modeling-development-2",
    COMPOUND_OBLIGATIONS_CLAIM,
    COMPOUND_OBLIGATIONS_EXPECTATION,
    "rule-lane-modeling",
  ),
  caseFor(
    "held-out",
    "exception_unless",
    "kibi-usage-rule-lane-modeling-held-out-1",
    EXCEPTION_UNLESS_CLAIM,
    EXCEPTION_UNLESS_EXPECTATION,
    "rule-lane-modeling",
  ),
];
