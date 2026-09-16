import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import { semanticClaimKey } from "../semantic-advisor/clauses.js";
import {
  STRONG_APPLICABILITY_SCORE,
  WEAK_CANDIDATE_MARGIN,
  evaluateSemanticApplicability,
} from "./predicate-applicability.js";
import {
  buildGapApplyPlan,
  buildPredicateApplyPlan,
  buildPredicateSchemaDraft,
  buildRelationshipPlan,
  buildSuggestion,
} from "./predicate-applyplan.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "./predicate-catalog.js";
import { inferSubject } from "./predicate-inference.js";
import { loadExistingPredicateSchemas } from "./predicate-loader.js";
import { rankSchema } from "./predicate-ranker.js";
import type {
  PredicateSchemaCandidate,
  PredicateSuggestion,
  SuggestPredicatesArgs,
  SuggestPredicatesResult,
} from "./predicate-types.js";
import { clampInteger, clampScore, normalizeText } from "./predicate-utils.js";

export type {
  BindingProvenance,
  PredicateScoreComponents,
  PredicateSuggestion,
  RecommendedPredicateSchema,
  SuggestPredicatesArgs,
  SuggestPredicatesResult,
} from "./predicate-types.js";

const DEFAULT_MAX_CANDIDATES = 5;
const DEFAULT_MIN_SCORE = 0.35;
const NON_ASSERTIVE_PROPOSITION_ROLES = new Set([
  "rationale",
  "example",
  "subjective",
]);

function analyzeInputPropositions(text: string) {
  return analyzeSemanticAdvisorInput({
    payload: {
      type: "req",
      id: "REQ-KIBI-PREDICATE-SUGGESTION-INPUT",
      properties: { semantic_text: text },
    },
  }).receipt.propositions;
}

function compoundInputAbstention(
  args: SuggestPredicatesArgs,
  text: string,
  subject: string,
  propositionCount: number,
): SuggestPredicatesResult {
  const claimKey = semanticClaimKey(text);
  const warning = `kb_suggest_predicates requires one atomic assertive proposition; semantic advisor detected ${propositionCount}. Split the input into atomic propositions and retry each one. No candidate, ontology-gap draft, or write plan was generated.`;
  const applyPlan: Array<Record<string, unknown>> = [];
  return {
    content: [
      {
        type: "text",
        text: "Predicate suggestion abstained because the input contains multiple assertive propositions. Split the prose into atomic propositions and retry each one.",
      },
    ],
    structuredContent: {
      text,
      claimKey,
      logicClaims: Array.from(new Set(args.existingLogicClaims ?? [])),
      source: args.source ?? null,
      requirementId: args.requirementId ?? null,
      subject,
      candidates: [],
      recommendedAction: "record_ontology_gap",
      recommendedPredicateSchema: null,
      applyPlan,
      relationshipPlan: null,
      warnings: [warning],
    },
    applyPlan,
  };
}

function nonlogicalInputRouting(
  args: SuggestPredicatesArgs,
  text: string,
  subject: string,
): SuggestPredicatesResult {
  const claimKey = semanticClaimKey(text);
  const warning =
    "The semantic advisor classifies this prose as nonlogical (rationale, example, or subjective context); it does not assert a verifiable domain proposition. Advisor routing wins: no predicate candidates, schema draft, or write plan were generated, and the claim was not added to logic_claims.";
  const applyPlan: Array<Record<string, unknown>> = [];
  return {
    content: [
      {
        type: "text",
        text: "Predicate suggestion abstained because the semantic advisor classifies this prose as nonlogical (rationale, example, or subjective context). Keep it outside logic_claims; no candidate, ontology-gap observation, or schema draft was generated.",
      },
    ],
    structuredContent: {
      text,
      claimKey,
      logicClaims: Array.from(new Set(args.existingLogicClaims ?? [])),
      source: args.source ?? null,
      requirementId: args.requirementId ?? null,
      subject,
      candidates: [],
      recommendedAction: "review_nonlogical",
      recommendedPredicateSchema: null,
      applyPlan,
      relationshipPlan: null,
      warnings: [warning],
    },
    applyPlan,
  };
}

function uniqueSchemas(
  schemas: readonly PredicateSchemaCandidate[],
): PredicateSchemaCandidate[] {
  const seen = new Set<string>();
  return schemas.filter((schema) => {
    const key = `${schema.predicate_name}:${schema.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function compareEligibleByApplicabilityThenName(
  left: Pick<PredicateSuggestion, "applicability_score" | "predicate_name">,
  right: Pick<PredicateSuggestion, "applicability_score" | "predicate_name">,
): number {
  if (right.applicability_score !== left.applicability_score)
    return right.applicability_score - left.applicability_score;
  return left.predicate_name.localeCompare(right.predicate_name);
}

export function compareEligibleByApplicabilityScoreThenName(
  left: Pick<
    PredicateSuggestion,
    "applicability_score" | "score" | "predicate_name"
  >,
  right: Pick<
    PredicateSuggestion,
    "applicability_score" | "score" | "predicate_name"
  >,
): number {
  if (right.applicability_score !== left.applicability_score)
    return right.applicability_score - left.applicability_score;
  if (right.score !== left.score) return right.score - left.score;
  return left.predicate_name.localeCompare(right.predicate_name);
}

function withMarginRejection(
  candidates: readonly PredicateSuggestion[],
): PredicateSuggestion[] {
  const eligible = candidates
    .filter((candidate) => candidate.eligibility === "eligible")
    .sort(compareEligibleByApplicabilityThenName);
  const top = eligible[0];
  const second = eligible[1];
  if (
    !top ||
    !second ||
    top.applicability_score >= STRONG_APPLICABILITY_SCORE ||
    top.applicability_score - second.applicability_score >=
      WEAK_CANDIDATE_MARGIN
  )
    return [...candidates];
  const weakNames = `${top.predicate_name} and ${second.predicate_name}`;
  return candidates.map((candidate) => {
    if (
      candidate.predicate_name !== top.predicate_name &&
      candidate.predicate_name !== second.predicate_name
    )
      return candidate;
    return {
      ...candidate,
      eligibility: "rejected",
      rejection_reasons: [
        ...candidate.rejection_reasons,
        `weak-candidate margin abstention: ${weakNames} are within ${WEAK_CANDIDATE_MARGIN.toFixed(2)} applicability points`,
      ],
    };
  });
}

// implements REQ-mcp-suggest-predicates
export async function handleKbSuggestPredicates(
  prolog: PrologPort | null,
  args: SuggestPredicatesArgs,
): Promise<SuggestPredicatesResult> {
  const text = normalizeText(args.text);
  const subject = inferSubject(text, args.subjectHint);
  const propositions = analyzeInputPropositions(text);
  const assertivePropositionCount = propositions.filter(
    (proposition) => !NON_ASSERTIVE_PROPOSITION_ROLES.has(proposition.role),
  ).length;
  if (propositions.length > 0 && assertivePropositionCount === 0) {
    return nonlogicalInputRouting(args, text, subject);
  }
  if (assertivePropositionCount > 1) {
    return compoundInputAbstention(
      args,
      text,
      subject,
      assertivePropositionCount,
    );
  }
  const maxCandidates = clampInteger(
    args.maxCandidates,
    DEFAULT_MAX_CANDIDATES,
    1,
    20,
  );
  const minScore = clampScore(args.minScore ?? DEFAULT_MIN_SCORE);
  const warnings: string[] = [];
  const existingSchemas = await loadExistingPredicateSchemas(
    prolog,
    args.includeExistingSchemas ?? true,
    warnings,
  );
  const schemas = uniqueSchemas([
    ...existingSchemas,
    ...BUILT_IN_PREDICATE_SCHEMAS,
  ]);
  const selectedSchemas = args.schemaId
    ? schemas.filter((schema) => schema.id === args.schemaId)
    : schemas;
  if (args.schemaId && selectedSchemas.length === 0) {
    warnings.push(
      `Requested predicate schema ${args.schemaId} is not available. Refresh the KB or correct schemaId before retrying; no ontology-gap or predicate write plan was generated.`,
    );
  }

  // Stage 1: retrieval/ranking only. No argument values influence this list.
  const retrieved = selectedSchemas
    .map((schema) => rankSchema(schema, text))
    .filter((ranked) => args.schemaId || ranked.score >= minScore)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (
        right.components.specificity_bonus !== left.components.specificity_bonus
      )
        return (
          right.components.specificity_bonus - left.components.specificity_bonus
        );
      return left.schema.predicate_name.localeCompare(
        right.schema.predicate_name,
      );
    })
    // Keep a wider bounded pool for semantic review so a lexical false
    // positive cannot crowd out a lower-ranked but fitting domain schema.
    .slice(0, Math.min(50, Math.max(maxCandidates, maxCandidates * 3)));

  // Stage 2: semantic eligibility. A complete binding list cannot bypass this
  // gate, and every rejected candidate remains inspectable when retrieved.
  const initialCandidates = retrieved.map((ranked) => {
    const applicability = evaluateSemanticApplicability(ranked, text);
    return buildSuggestion(
      ranked.schema,
      text,
      subject,
      ranked.score,
      args.argumentBindings,
      args.polarityHint,
      {
        eligibility: applicability.eligible ? "eligible" : "rejected",
        rejectionReasons: applicability.reasons,
        applicabilityScore: applicability.applicabilityScore,
        scoreComponents: ranked.components,
        explicitSubject: Boolean(args.subjectHint?.trim()),
      },
    );
  });
  const evaluatedCandidates = withMarginRejection(initialCandidates)
    .sort((left, right) => {
      const leftEligible = left.eligibility === "eligible" ? 1 : 0;
      const rightEligible = right.eligibility === "eligible" ? 1 : 0;
      if (rightEligible !== leftEligible) return rightEligible - leftEligible;
      if (right.applicability_score !== left.applicability_score)
        return right.applicability_score - left.applicability_score;
      if (right.score !== left.score) return right.score - left.score;
      return left.predicate_name.localeCompare(right.predicate_name);
    })
    .slice(0, maxCandidates);
  // Preserve the established empty-candidate response when general discovery
  // finds no applicable schema. Rejected diagnostics remain available beside
  // an eligible match and for an explicitly requested schema.
  const candidates =
    args.schemaId ||
    evaluatedCandidates.some(
      (candidate) => candidate.eligibility === "eligible",
    )
      ? evaluatedCandidates
      : [];
  const recommendedCandidate = candidates
    .filter((candidate) => candidate.eligibility === "eligible")
    .sort(compareEligibleByApplicabilityScoreThenName)[0];

  if (candidates.length === 0 && !args.schemaId) {
    warnings.push(
      "No predicate candidate met minScore. If this is recurring domain language, create a fact_kind=predicate_schema fact; otherwise keep the generated review:ontology-gap observation. Do not invent unsupported predicate names without a predicate_schema.",
    );
  }

  // Stage 3/4: bind only after eligibility, then decide conservatively.
  const unavailableSchema = Boolean(
    args.schemaId && selectedSchemas.length === 0,
  );
  const recommendedAction = !recommendedCandidate
    ? unavailableSchema
      ? "resolve_schema_reference"
      : "record_ontology_gap"
    : recommendedCandidate.binding_status === "complete"
      ? "apply_requires_predicate"
      : "provide_argument_bindings";
  const applyPlan =
    recommendedCandidate && recommendedCandidate.binding_status === "complete"
      ? buildPredicateApplyPlan(recommendedCandidate, args)
      : !recommendedCandidate && !unavailableSchema
        ? buildGapApplyPlan(text, args)
        : [];
  const relationshipPlan =
    recommendedCandidate && recommendedCandidate.binding_status === "complete"
      ? buildRelationshipPlan(
          String(applyPlan[0]?.id ?? ""),
          args.requirementId,
          text,
          args.existingLogicClaims,
        )
      : null;
  const recommendedPredicateSchema =
    !recommendedCandidate && !unavailableSchema
      ? buildPredicateSchemaDraft(text, subject)
      : null;
  const textSummary =
    recommendedCandidate && recommendedCandidate.binding_status === "complete"
      ? `Suggested ${candidates.length} predicate candidate(s). Top applicable match: ${recommendedCandidate.predicate_name}. Apply structured predicate facts before falling back to prose.`
      : recommendedCandidate
        ? `Matched ${recommendedCandidate.predicate_name}, but exact reviewed values are still required for: ${recommendedCandidate.unbound_arguments.join(", ")}. No apply plan was generated.`
        : unavailableSchema
          ? `Requested predicate schema ${args.schemaId} is unavailable or semantically inapplicable. No apply plan was generated.`
          : "No predicate candidate passed the semantic applicability gate; record an ontology gap and review the generated schema draft instead of silently writing prose.";
  const claimKey = semanticClaimKey(text);
  const logicClaims = Array.from(
    new Set([...(args.existingLogicClaims ?? []), claimKey]),
  );

  return {
    content: [{ type: "text", text: textSummary }],
    structuredContent: {
      text,
      claimKey,
      logicClaims,
      source: args.source ?? null,
      requirementId: args.requirementId ?? null,
      subject,
      candidates,
      recommendedAction,
      recommendedPredicateSchema,
      applyPlan,
      relationshipPlan,
      warnings,
    },
    applyPlan,
  };
}

export async function executeSuggestPredicates(
  args: SuggestPredicatesArgs,
  context: OperationContext,
): Promise<SuggestPredicatesResult> {
  return handleKbSuggestPredicates(context.prolog ?? null, args);
}
