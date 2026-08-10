import type { TaskSplit } from "../catalog";

// implements REQ-skillopt-predicate-first-requirements

/**
 * Seven semantically distinct predicate-modeling cases that replace the former
 * generic `fact-predicate-modeling` family. Each case carries a distinct human
 * claim (public) and a distinct expected modeling outcome (private). Cases are
 * intentionally non-paraphrased and never differ only by split suffix.
 *
 * Allocation (exact 2/1/4):
 *   train       — builtin_relational, strict_scalar_counterexample
 *   development — project_local_schema
 *   held-out    — deny_polarity, ambiguous, ontology_gap, keyword_false_positive
 *
 * Case declarations live in `predicate-case-data.ts`; this module owns types,
 * the lookup API, and allocation invariants.
 */
export type PredicateSemanticClass =
  | "builtin_relational"
  | "strict_scalar_counterexample"
  | "project_local_schema"
  | "deny_polarity"
  | "ambiguous"
  | "ontology_gap"
  | "keyword_false_positive";

/** Logic phenomena exercised by the public corpus, independent of wording. */
export type LogicCoverageFamily =
  | "paraphrase_equivalence"
  | "semantic_contrast"
  | "compound_prose"
  | "passive_phrasing"
  | "implicit_condition"
  | "negation_scope"
  | "deontic_modality"
  | "quantifier_cardinality"
  | "exception_handling"
  | "temporal_rule"
  | "descriptive_fact"
  | "ambiguity"
  | "ontology_gap";

export type ExpectedLane =
  | "predicate"
  | "strict_property"
  | "observation"
  | "ontology_gap_observation";

export type ExpectedEdge = Readonly<{
  relationship: string;
  /** Target entity id or predicate canonical key. Never the human claim prose. */
  target: string;
}>;

export type PublicPredicateSchema = Readonly<{
  id: string;
  predicateName: string;
  argumentNames: readonly string[];
  argumentTypes: readonly string[];
}>;

export type PublicClaim = Readonly<{
  /** The normative claim prose an agent receives. Never contains the answer. */
  claimText: string;
  /** Public schema/state visible to the candidate surface. */
  publicSchema: Readonly<{
    kind: "predicate-modeling-task";
    schemaVersion: string;
    availableFactKinds: readonly string[];
    projectLocalSchemas: readonly PublicPredicateSchema[];
    /** Feature families used for semantic (not exact-wording) scoring. */
    coverageFamilies: readonly LogicCoverageFamily[];
  }>;
}>;

export type PrivateExpectation = Readonly<{
  semanticClass: PredicateSemanticClass;
  expectedLane: ExpectedLane;
  /** Null when the case expects a non-predicate outcome. */
  expectedPredicateName: string | null;
  expectedPredicateArgs: readonly string[] | null;
  expectedPolarity: "assert" | "deny" | null;
  expectedEdges: readonly ExpectedEdge[];
  expectedGroundFactKinds: readonly (
    | "subject"
    | "property_value"
    | "predicate"
    | "observation"
  )[];
  /** Zero means the correct result remains explicitly unresolved. */
  expectedLogicClaimCount: number;
  /** Short rationale kept private for the evaluator/verifier lane only. */
  privateRationale: string;
  readonly coverageFamilies?: readonly LogicCoverageFamily[];
}>;

export type PredicateCase = Readonly<{
  semanticClass: PredicateSemanticClass;
  caseId: string;
  split: TaskSplit;
  publicClaim: PublicClaim;
  privateExpectation: PrivateExpectation;
}>;

export { PREDICATE_CASES } from "./predicate-case-data";
import { PREDICATE_CASES } from "./predicate-case-data";

const CASES_BY_ID = new Map(
  PREDICATE_CASES.map((entry) => [entry.caseId, entry] as const),
);

export const PREDICATE_TRAIN_CASE_IDS: readonly string[] =
  PREDICATE_CASES.filter((entry) => entry.split === "train").map(
    (entry) => entry.caseId,
  );

export const PREDICATE_DEVELOPMENT_CASE_ID: string =
  PREDICATE_CASES.find((entry) => entry.split === "development")?.caseId ?? "";

export const PREDICATE_HELD_OUT_CASE_IDS: readonly string[] =
  PREDICATE_CASES.filter((entry) => entry.split === "held-out").map(
    (entry) => entry.caseId,
  );

export const PREDICATE_SEMANTIC_CLASSES: ReadonlyMap<
  string,
  PredicateSemanticClass
> = new Map(
  PREDICATE_CASES.map((entry) => [entry.caseId, entry.semanticClass] as const),
);

export function predicateCaseById(caseId: string): PredicateCase {
  const entry = CASES_BY_ID.get(caseId);
  if (entry === undefined) {
    throw new Error(`unknown predicate case id: ${caseId}`);
  }
  return entry;
}

export function predicateCaseBySplitIndex(
  split: TaskSplit,
  index: number,
): PredicateCase {
  const matches = PREDICATE_CASES.filter((entry) => entry.split === split);
  const entry = matches[index];
  if (entry === undefined) {
    throw new Error(
      `no predicate case for split=${split} index=${index}; allocation is 2/1/4`,
    );
  }
  return entry;
}

export function assertDistinctSemanticClasses(): void {
  const classes = PREDICATE_CASES.map((entry) => entry.semanticClass);
  if (new Set(classes).size !== classes.length) {
    throw new Error("predicate cases must be semantically distinct");
  }
  if (classes.length !== 7) {
    throw new Error(
      `expected exactly 7 predicate cases, got ${classes.length}`,
    );
  }
}
