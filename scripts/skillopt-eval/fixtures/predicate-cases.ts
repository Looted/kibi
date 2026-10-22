import type { TaskSplit } from "../catalog";

// implements REQ-skillopt-predicate-first-requirements

/**
 * Semantically distinct predicate-modeling cases. Each case carries a distinct
 * human claim (public) and a distinct expected modeling outcome (private).
 * Cases are intentionally non-paraphrased and never differ only by split
 * suffix.
 *
 * Core `fact-predicate-modeling` family, allocation exact 2/1/4:
 *   train       — builtin_relational, strict_scalar_counterexample
 *   development — project_local_schema
 *   held-out    — deny_polarity, ambiguous, ontology_gap, keyword_false_positive
 *
 * Supplemental `rule-lane-modeling` family (typed rules and clause
 * splitting), allocation exact 0/2/1. Supplemental training slots are never
 * run (the legacy trainer keeps the core families), so both public cases are
 * development cases:
 *   development — necessary_condition, compound_obligations
 *   held-out    — exception_unless
 *
 * Only the core cases form the predicate corpus and its 36-cell held-out
 * matrix; the rule-lane cases join the catalog like any supplemental family.
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
  | "keyword_false_positive"
  | "necessary_condition"
  | "compound_obligations"
  | "exception_unless";

/** Task families whose slots are filled from the predicate case registry. */
export const PREDICATE_FAMILIES = [
  "fact-predicate-modeling",
  "rule-lane-modeling",
] as const;

export type PredicateFamily = (typeof PREDICATE_FAMILIES)[number];

export function isPredicateFamily(family: string): family is PredicateFamily {
  return (PREDICATE_FAMILIES as readonly string[]).includes(family);
}

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
  | "rule"
  | "observation"
  | "ontology_gap_observation";

export type GroundFactKind =
  | "subject"
  | "property_value"
  | "predicate"
  | "rule_schema"
  | "rule"
  | "observation";

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
  expectedGroundFactKinds: readonly GroundFactKind[];
  /** Zero means the correct result remains explicitly unresolved. */
  expectedLogicClaimCount: number;
  /** Canonical semantic key of the typed rule Kibi models from the claim. */
  expectedRuleSemanticKey?: string | null;
  /**
   * The typed rule must carry exceptions; every listed atom name must appear
   * in some rule's exceptions.
   */
  expectedRuleExceptions?: Readonly<{ atomNames: readonly string[] }> | null;
  /** Fact kinds that must not be created for this claim. */
  forbiddenGroundFactKinds?: readonly GroundFactKind[];
  /** Short rationale kept private for the evaluator/verifier lane only. */
  privateRationale: string;
  readonly coverageFamilies?: readonly LogicCoverageFamily[];
}>;

export type PredicateCase = Readonly<{
  family: PredicateFamily;
  semanticClass: PredicateSemanticClass;
  caseId: string;
  split: TaskSplit;
  publicClaim: PublicClaim;
  privateExpectation: PrivateExpectation;
}>;

export {
  PREDICATE_CASES,
  RULE_LANE_PREDICATE_CASES,
} from "./predicate-case-data";
import {
  PREDICATE_CASES,
  RULE_LANE_PREDICATE_CASES,
} from "./predicate-case-data";

function allPredicateCases(): readonly PredicateCase[] {
  return [...PREDICATE_CASES, ...RULE_LANE_PREDICATE_CASES];
}

const CASES_BY_ID = new Map(
  allPredicateCases().map((entry) => [entry.caseId, entry] as const),
);

// The ID lists and class map below describe the core corpus only: they bind
// the predicate corpus roots and the 36-cell held-out predicate matrix.
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
  family: PredicateFamily = "fact-predicate-modeling",
): PredicateCase {
  const matches = allPredicateCases().filter(
    (entry) => entry.family === family && entry.split === split,
  );
  const entry = matches[index];
  if (entry === undefined) {
    throw new Error(
      `no predicate case for family=${family} split=${split} index=${index}; allocation is ${family === "fact-predicate-modeling" ? "2/1/4" : "0/2/1"}`,
    );
  }
  return entry;
}

/** Per-family case counts by split: 7 core and 3 rule-lane cases. */
export const PREDICATE_FAMILY_ALLOCATION: Readonly<
  Record<PredicateFamily, Readonly<Record<TaskSplit, number>>>
> = {
  "fact-predicate-modeling": { train: 2, development: 1, "held-out": 4 },
  "rule-lane-modeling": { train: 0, development: 2, "held-out": 1 },
};

export function assertDistinctSemanticClasses(): void {
  const cases = allPredicateCases();
  const classes = cases.map((entry) => entry.semanticClass);
  if (new Set(classes).size !== classes.length) {
    throw new Error("predicate cases must be semantically distinct");
  }
  for (const family of PREDICATE_FAMILIES) {
    const familyCases = cases.filter((entry) => entry.family === family);
    const allocation = PREDICATE_FAMILY_ALLOCATION[family];
    const expected =
      allocation.train + allocation.development + allocation["held-out"];
    if (familyCases.length !== expected) {
      throw new Error(
        `expected exactly ${expected} ${family} predicate cases, got ${familyCases.length}`,
      );
    }
    for (const split of ["train", "development", "held-out"] as const) {
      const count = familyCases.filter((entry) => entry.split === split).length;
      if (count !== allocation[split]) {
        throw new Error(
          `expected ${allocation[split]} ${family} ${split} predicate cases, got ${count}`,
        );
      }
    }
  }
}
