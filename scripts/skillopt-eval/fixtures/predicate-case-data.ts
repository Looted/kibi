import type { TaskSplit } from "../catalog";
import type {
  PredicateCase,
  PredicateSemanticClass,
  PrivateExpectation,
  PublicClaim,
} from "./predicate-cases";

// implements REQ-skillopt-predicate-first-requirements

/**
 * Seven semantically distinct case declarations. Public claims use a factory so
 * the shared publicSchema shape is not repeated verbatim; only the distinct
 * claimText and projectLocalSchemas vary per case.
 */

const PUBLIC_SCHEMA_VERSION = "predicate-corpus-1.0.0";

const BUILTIN_PREDICATES = [
  "requires_property",
  "requires_predicate",
  "constrains",
  "specified_by",
  "verified_by",
] as const;

const FACT_KINDS = [
  "subject",
  "property_value",
  "predicate",
  "predicate_schema",
  "observation",
  "meta",
] as const;

function makeClaim(
  claimText: string,
  projectLocalSchemas: readonly string[] = [],
): PublicClaim {
  return {
    claimText,
    publicSchema: {
      kind: "predicate-modeling-task",
      schemaVersion: PUBLIC_SCHEMA_VERSION,
      availableBuiltinPredicates: [...BUILTIN_PREDICATES],
      availableFactKinds: [...FACT_KINDS],
      projectLocalSchemas: [...projectLocalSchemas],
    },
  };
}

// --- Public claims. Wording is distinct per case and never leaks the answer. ---

const BUILTIN_RELATIONAL_CLAIM = makeClaim(
  "Every release requirement in the publishable package set must be linked to at least one executable test before a release proposal is created.",
);
const STRICT_SCALAR_CLAIM = makeClaim(
  "A merge proposal for the traceability package is blocked when the cumulative test wall-clock time across the verified_by chain exceeds 300 seconds.",
);
const PROJECT_LOCAL_SCHEMA_CLAIM = makeClaim(
  "An adoption candidate is recordable only when its lineage binds the ordered trajectory hashes to the authorized corpus, baseline, and evaluator roots.",
  ["adoption_lineage"],
);
const DENY_POLARITY_CLAIM = makeClaim(
  "A held-out evaluation matrix must never be retried with a candidate whose bytes differ from the frozen SkillOpt candidate hash bound to the terminal matrix id.",
  ["held_out_matrix"],
);
const AMBIGUOUS_CLAIM = makeClaim(
  "Release readiness improves when the knowledge base looks complete enough and the team is comfortable with the current state of the graph.",
);
const ONTOLOGY_GAP_CLAIM = makeClaim(
  "Every signed verdict over the held-out matrix must be reproducible from the sealed snapshot, the authorized roots, and the operator-owned ledger without trusting caller-supplied path claims.",
);
const KEYWORD_FALSE_POSITIVE_CLAIM = makeClaim(
  "The fact body mentions the word 'predicate' several times while describing a free-form narrative about how reviewers feel about the release notes.",
);

// --- Private expectations. Held by the evaluator/verifier lane only. ---

const BUILTIN_RELATIONAL_EXPECTATION: PrivateExpectation = {
  semanticClass: "builtin_relational",
  expectedLane: "predicate",
  expectedPredicateName: "verified_by",
  expectedPredicateArgs: ["requirement", "executable_test"],
  expectedPolarity: "assert",
  expectedEdges: [
    { relationship: "requires_predicate", target: "verified_by" },
  ],
  privateRationale:
    "Relational normative claim maps cleanly onto a builtin predicate with a requires_predicate edge.",
};

const STRICT_SCALAR_EXPECTATION: PrivateExpectation = {
  semanticClass: "strict_scalar_counterexample",
  expectedLane: "strict_property",
  expectedPredicateName: null,
  expectedPredicateArgs: null,
  expectedPolarity: null,
  expectedEdges: [
    { relationship: "constrains", target: "merge_proposal.wall_clock_seconds" },
    {
      relationship: "requires_property",
      target: "merge_proposal.max_wall_clock_seconds=300",
    },
  ],
  privateRationale:
    "Scalar threshold claim is a counterexample to predicate modeling and must use strict subject/property_value facts instead.",
};

const PROJECT_LOCAL_SCHEMA_EXPECTATION: PrivateExpectation = {
  semanticClass: "project_local_schema",
  expectedLane: "predicate",
  expectedPredicateName: "adoption_lineage",
  expectedPredicateArgs: [
    "trajectory_hashes",
    "corpus_root",
    "baseline_root",
    "evaluator_root",
  ],
  expectedPolarity: "assert",
  expectedEdges: [
    { relationship: "requires_predicate", target: "adoption_lineage" },
  ],
  privateRationale:
    "Project-local relational claim fits a declared project-local predicate schema and links via requires_predicate.",
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
  privateRationale:
    "Normative prohibition maps onto a project-local predicate with deny polarity rather than an observation.",
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
  privateRationale:
    "Vague, non-machine-checkable claim must remain a review observation rather than an invented predicate.",
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
  privateRationale:
    "A suitable predicate does not yet exist in the supported schema, so the correct outcome is an ontology-gap observation, not an invented predicate.",
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
  privateRationale:
    "The keyword 'predicate' appears in prose, but the claim is narrative and non-relational; correct outcome is an observation, not a predicate.",
};

function caseFor(
  split: TaskSplit,
  semanticClass: PredicateSemanticClass,
  caseId: string,
  claim: PublicClaim,
  expectation: PrivateExpectation,
): PredicateCase {
  if (expectation.semanticClass !== semanticClass) {
    throw new Error("semantic class mismatch in predicate case registry");
  }
  return {
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
