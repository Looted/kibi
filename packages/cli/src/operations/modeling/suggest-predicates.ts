import { escapeAtom } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import { parsePrologList } from "../mutation/serialization.js";
import { analyzeSemanticAdvisorInput } from "../semantic-advisor/analyze-prose.js";
import { semanticClaimKey } from "../semantic-advisor/clauses.js";
import { composeOntologyCatalogForOperation } from "../semantic-advisor/plugin-orchestration.js";
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
import {
  buildBindingHints,
  describeBindingHints,
} from "./predicate-binding-hints.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "./predicate-catalog.js";
import { inferSubject } from "./predicate-inference.js";
import { loadExistingPredicateSchemas } from "./predicate-loader.js";
import { rankSchema } from "./predicate-ranker.js";
import type {
  ExistingClaimGrounding,
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

function ontologyPackSchemasToCandidates(
  schemas: readonly {
    readonly schemaId: string;
    readonly predicateName: string;
    readonly argumentNames: readonly string[];
    readonly argumentTypes: readonly string[];
    readonly title?: string;
    readonly description?: string;
    readonly aliases?: readonly string[];
  }[],
): PredicateSchemaCandidate[] {
  return schemas.map((schema) => ({
    id: schema.schemaId,
    predicate_name: schema.predicateName,
    title: schema.title ?? schema.predicateName,
    description: schema.description ?? schema.predicateName,
    argument_names: [...schema.argumentNames],
    argument_types: [...schema.argumentTypes],
    keywords: [schema.predicateName, ...(schema.aliases ?? [])],
    ...(schema.aliases ? { aliases: [...schema.aliases] } : {}),
    examples: [],
    tags: ["ontology-pack"],
  }));
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

const GROUNDING_RELATIONSHIP_TYPES = [
  "requires_property",
  "requires_predicate",
  "requires_rule",
] as const;

function unquoted(value: unknown): string {
  return typeof value === "string" ? value.replace(/^['"]|['"]$/g, "") : "";
}

/**
 * The logical grounding relationships an existing requirement already has for
 * this claim. A modeled claim takes exactly one grounding relationship, so a
 * second link (for example requires_predicate beside a bootstrap
 * requires_property) fails the proposition-complete rule.
 */
// implements REQ-model-predicates-grounding-aware-v2
async function existingClaimGrounding(
  prolog: PrologPort | null,
  requirementId: string | undefined,
  claimKey: string,
  warnings: string[],
): Promise<ExistingClaimGrounding[]> {
  if (prolog === null || !requirementId) return [];
  const found: ExistingClaimGrounding[] = [];
  try {
    for (const type of GROUNDING_RELATIONSHIP_TYPES) {
      const targets = await prolog.query(
        `findall(To, kb_relationship(${type}, '${escapeAtom(requirementId)}', To), Targets)`,
      );
      if (!targets.success) continue;
      for (const target of parsePrologList(targets.bindings.Targets ?? "[]")) {
        const fact = await prolog.query(
          `once((kb_entity('${escapeAtom(target)}', fact, _GroundProps), memberchk(claim_key=_GroundClaimRaw, _GroundProps), normalize_term_atom(_GroundClaimRaw, ClaimKey), (memberchk(fact_kind=_GroundKindRaw, _GroundProps) -> normalize_term_atom(_GroundKindRaw, FactKind) ; FactKind = '')))`,
        );
        if (!fact.success) continue;
        if (unquoted(fact.bindings.ClaimKey) !== claimKey) continue;
        found.push({
          relationship: { type, from: requirementId, to: target },
          factId: target,
          factKind: unquoted(fact.bindings.FactKind) || null,
          claimKey,
        });
      }
    }
  } catch (error) {
    warnings.push(
      `Existing grounding of ${requirementId} could not be read (${error instanceof Error ? error.message : String(error)}); check its requires_property, requires_predicate and requires_rule links before linking a predicate.`,
    );
  }
  return found;
}

function hasSubjectHint(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * The subject_key of every subject fact the requirement constrains, sorted.
 * A predicate about that requirement binds the same key as its subject, so
 * contradiction checks by subject see the predicate and the subject fact as
 * one subject.
 */
// implements REQ-model-predicates-requirement-subject
async function constrainedSubjectKeys(
  prolog: PrologPort | null,
  requirementId: string | undefined,
  warnings: string[],
): Promise<string[]> {
  if (prolog === null || !requirementId?.trim()) return [];
  try {
    const result = await prolog.query(
      `findall(Key, (kb_relationship(constrains, '${escapeAtom(requirementId.trim())}', _SubjectFact), kb:fact_subject_key(_SubjectFact, Key)), Keys)`,
    );
    if (!result.success) return [];
    return Array.from(
      new Set(
        parsePrologList(result.bindings.Keys ?? "[]")
          .map(unquoted)
          .filter((key) => key.length > 0),
      ),
    ).sort();
  } catch (error) {
    warnings.push(
      `The subject facts ${requirementId} constrains could not be read (${error instanceof Error ? error.message : String(error)}); pass subjectHint with the requirement's subject_key.`,
    );
    return [];
  }
}

// implements REQ-mcp-suggest-predicates
export async function handleKbSuggestPredicates(
  prolog: PrologPort | null,
  args: SuggestPredicatesArgs,
  context?: OperationContext,
): Promise<SuggestPredicatesResult> {
  const text = normalizeText(args.text);
  const warnings: string[] = [];
  const requirementSubjects = hasSubjectHint(args.subjectHint)
    ? []
    : await constrainedSubjectKeys(prolog, args.requirementId, warnings);
  // One constrained subject is the requirement's subject; with several the
  // agent picks one, so they are offered as binding examples instead.
  const requirementSubject =
    requirementSubjects.length === 1 ? requirementSubjects[0] : undefined;
  const subject = inferSubject(text, args.subjectHint, {
    requirementId: args.requirementId,
    subjectKey: requirementSubject,
  });
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
  const existingSchemas = await loadExistingPredicateSchemas(
    prolog,
    args.includeExistingSchemas ?? true,
    warnings,
  );
  const composedCatalog = await composeOntologyCatalogForOperation(
    context,
    "kb_suggest_predicates",
  );
  const packSchemas = composedCatalog
    ? ontologyPackSchemasToCandidates(composedCatalog.schemas)
    : [];
  // When ontology resolution is in replace mode and the replace pack
  // successfully supplied its catalog, do not silently re-append the builtin
  // *provider* catalog. Persisted/project KB schemas remain available.
  const includeBuiltinProviderCatalog = !(composedCatalog?.replaced === true);
  if (composedCatalog?.diagnostics?.length) {
    warnings.push(...composedCatalog.diagnostics);
  }
  const schemas = uniqueSchemas([
    ...existingSchemas,
    ...(includeBuiltinProviderCatalog ? BUILT_IN_PREDICATE_SCHEMAS : []),
    ...packSchemas,
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
        ...(requirementSubject ? { requirementSubject } : {}),
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
  const claimKey = semanticClaimKey(text);
  const existingGrounding = await existingClaimGrounding(
    prolog,
    args.requirementId,
    claimKey,
    warnings,
  );
  const alreadyGrounded = existingGrounding.length > 0;
  const completeCandidate =
    recommendedCandidate && recommendedCandidate.binding_status === "complete"
      ? recommendedCandidate
      : undefined;
  // The action names the predicate state; existingGrounding (non-empty) is
  // the separate "already grounded" signal. A complete candidate for a claim
  // that is already grounded becomes a replacement, never a second link.
  const recommendedAction = !recommendedCandidate
    ? unavailableSchema
      ? "resolve_schema_reference"
      : "record_ontology_gap"
    : completeCandidate
      ? alreadyGrounded
        ? "replace_grounding"
        : "apply_requires_predicate"
      : "provide_argument_bindings";
  const predicatePlan = completeCandidate
    ? buildPredicateApplyPlan(completeCandidate, args)
    : [];
  // An already grounded claim gets no predicate write plan: a second
  // grounding link would fail the proposition-complete rule, so the
  // replacement plan below swaps the grounding instead. The ontology-gap
  // observation is not a grounding relationship, so it is planned either way.
  const applyPlan = completeCandidate
    ? alreadyGrounded
      ? []
      : predicatePlan
    : !recommendedCandidate && !unavailableSchema
      ? buildGapApplyPlan(text, args)
      : [];
  const plannedFactId =
    typeof predicatePlan[0]?.id === "string" ? predicatePlan[0].id : null;
  const relationshipPlan =
    completeCandidate && !alreadyGrounded
      ? buildRelationshipPlan(
          plannedFactId ?? "",
          args.requirementId,
          text,
          args.existingLogicClaims,
        )
      : null;
  const replacementPlan =
    alreadyGrounded && plannedFactId !== null && args.requirementId
      ? buildGroundingReplacementPlan(
          args.requirementId,
          plannedFactId,
          predicatePlan,
          existingGrounding,
          await storedRequirementProperties(
            prolog,
            args.requirementId,
            warnings,
          ),
        )
      : null;
  const relationshipTarget =
    relationshipPlan !== null || replacementPlan !== null
      ? plannedFactId
      : null;
  const groundingSummary = existingGrounding
    .map((row) => `${row.relationship.type} -> ${row.factId}`)
    .join(", ");
  if (alreadyGrounded) {
    warnings.push(
      `${args.requirementId} already grounds this claim (${claimKey}) through ${groundingSummary}. A modeled claim takes exactly one logical grounding relationship, so adding requires_predicate beside it fails the proposition-complete rule. ${replacementPlan ? "Keep the existing grounding, or follow replacementPlan to swap it for the predicate." : "Keep the existing grounding; no predicate replacement is available yet."}`,
    );
  }
  const bindingHints =
    recommendedAction === "provide_argument_bindings" && recommendedCandidate
      ? buildBindingHints(recommendedCandidate, text, requirementSubjects)
      : [];
  const recommendedPredicateSchema =
    !recommendedCandidate && !unavailableSchema
      ? buildPredicateSchemaDraft(text, subject)
      : null;
  const groundedPrefix = alreadyGrounded
    ? `${args.requirementId} already grounds this claim through ${groundingSummary}. `
    : "";
  const textSummary =
    groundedPrefix +
    (replacementPlan
      ? `To use ${completeCandidate?.predicate_name} instead, follow replacementPlan and link requires_predicate to ${plannedFactId}; otherwise keep the existing grounding.`
      : completeCandidate
        ? `Suggested ${candidates.length} predicate candidate(s). Top applicable match: ${completeCandidate.predicate_name}. Apply the predicate fact ${plannedFactId}, then link requires_predicate to that fact id (not a candidate id).`
        : recommendedCandidate
          ? `Matched ${recommendedCandidate.predicate_name}, but exact reviewed values are still required for: ${recommendedCandidate.unbound_arguments.join(", ")}. Bind them from the claim text: ${describeBindingHints(bindingHints)}. A value that repeats an argument name or a stop word stays unbound. No apply plan was generated.`
          : unavailableSchema
            ? `Requested predicate schema ${args.schemaId} is unavailable or semantically inapplicable. No apply plan was generated.`
            : alreadyGrounded
              ? "No predicate candidate passed the semantic applicability gate; keep the existing grounding and record the ontology-gap observation in applyPlan so the missing schema stays visible."
              : "No predicate candidate passed the semantic applicability gate; record an ontology gap and review the generated schema draft instead of silently writing prose.");
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
      relationshipTarget,
      existingGrounding,
      replacementPlan,
      bindingHints,
      warnings,
    },
    applyPlan,
  };
}

/** Stored requirement fields a relationship-only update must restate. */
const RESTATED_REQUIREMENT_FIELDS = [
  "title",
  "status",
  "priority",
  "owner",
  "tags",
] as const;

/**
 * The requirement fields the replacement's requirement upsert restates, so
 * the step is a complete kb_upsert payload (title and status are required)
 * that keeps the stored metadata. The stored proposition ledger and text_ref
 * are merged by kb_upsert itself.
 */
// implements REQ-model-predicates-plan-roundtrip
async function storedRequirementProperties(
  prolog: PrologPort | null,
  requirementId: string,
  warnings: string[],
): Promise<Record<string, unknown> | null> {
  if (prolog === null) return null;
  try {
    const [stored] = await loadEntities(prolog, {
      id: requirementId,
      type: "req",
    });
    if (stored === undefined) return null;
    const restated: Record<string, unknown> = {};
    for (const field of RESTATED_REQUIREMENT_FIELDS)
      if (stored[field] !== undefined && stored[field] !== null)
        restated[field] = stored[field];
    return typeof restated.title === "string" &&
      typeof restated.status === "string"
      ? restated
      : null;
  } catch (error) {
    warnings.push(
      `Requirement ${requirementId} could not be read (${error instanceof Error ? error.message : String(error)}); add its stored title and status to the last replacementPlan step before applying it.`,
    );
    return null;
  }
}

/**
 * Ordered steps that swap an existing grounding for the planned predicate
 * fact while keeping one grounding relationship per modeled claim: write the
 * fact, retract the old grounding link, then link requires_predicate. The
 * order is forced: kb_upsert merges a requirement's relationships, so linking
 * first would give the claim two groundings and be rejected. Between the
 * retraction and the link the claim is ungrounded (kb_check reports
 * logic-coverage), so the steps run back to back and `rollback` restores the
 * old link if the last step fails.
 */
// implements REQ-model-predicates-grounding-aware-v2, REQ-model-predicates-plan-roundtrip
function buildGroundingReplacementPlan(
  requirementId: string,
  factId: string,
  predicatePlan: ReadonlyArray<Record<string, unknown>>,
  existing: readonly ExistingClaimGrounding[],
  stored: Record<string, unknown> | null,
): Record<string, unknown> {
  const requirementUpsert = (
    relationships: ReadonlyArray<Record<string, unknown>>,
  ): Record<string, unknown> => ({
    type: "req",
    id: requirementId,
    ...(stored === null ? {} : { properties: stored }),
    relationships,
  });
  const restate =
    stored === null
      ? `add the requirement's stored title and status as properties (they could not be read), keep this relationship only`
      : "the properties restate the stored title, status and metadata; kb_upsert keeps the stored proposition ledger";
  return {
    relationshipTarget: factId,
    steps: [
      {
        operation: "kb_upsert",
        input: predicatePlan[0],
        reason: "Write the predicate fact that will ground the claim.",
      },
      {
        operation: "kb_delete",
        input: {
          relationships: existing.map((row) => row.relationship),
        },
        reason:
          "Retract the existing grounding link so the claim keeps exactly one logical grounding relationship.",
      },
      {
        operation: "kb_upsert",
        input: requirementUpsert([
          { type: "requires_predicate", from: requirementId, to: factId },
        ]),
        reason: `Link requires_predicate to ${factId}; ${restate}.`,
      },
    ],
    rollback: {
      operation: "kb_upsert",
      input: requirementUpsert(existing.map((row) => row.relationship)),
      reason:
        "Only if the last step fails: restore the retracted grounding link so the claim is grounded again.",
    },
    instructions: `Only replace the grounding when the predicate states the claim at least as precisely as ${existing.map((row) => row.factId).join(", ")}. Apply the steps unchanged, in order and back to back: linking requires_predicate before the retraction is rejected because the claim would have two groundings, and between the retraction and the link the claim is ungrounded, so kb_check reports logic-coverage for ${requirementId} until the last step lands. If the last step fails, apply rollback. Run kb_check after the last step.`,
  };
}

export async function executeSuggestPredicates(
  args: SuggestPredicatesArgs,
  context: OperationContext,
): Promise<SuggestPredicatesResult> {
  return handleKbSuggestPredicates(context.prolog ?? null, args, context);
}
