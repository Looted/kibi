import { escapeAtom } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import type {
  OperationContext,
  PrologPort,
} from "../../public/operations/runtime-types.js";
import { parsePrologList } from "../mutation/serialization.js";
import { compileGroundingPlan } from "../planning/compile-intent.js";
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
  unnamedParticipantArguments,
} from "./predicate-binding-hints.js";
import { BUILT_IN_PREDICATE_SCHEMAS } from "./predicate-catalog.js";
import { inferSubject } from "./predicate-inference.js";
import { loadExistingPredicateSchemas } from "./predicate-loader.js";
import { rankSchema } from "./predicate-ranker.js";
import type {
  CandidateDecisionConflict,
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
      plan: null,
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
      plan: null,
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
 * requires_property) fails the proposition-complete rule. A grounding fact is
 * recognised by the claim's key (the same proposition text) or, for a
 * predicate fact, by the recommended candidate's canonical_key (the same
 * predicate tuple stated in other words).
 */
// implements REQ-model-predicates-grounding-aware-v2, REQ-model-predicates-grounding-guards
async function existingClaimGrounding(
  prolog: PrologPort | null,
  requirementId: string | undefined,
  claimKey: string,
  canonicalKey: string | null,
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
          `once((kb_entity('${escapeAtom(target)}', fact, _GroundProps), memberchk(claim_key=_GroundClaimRaw, _GroundProps), normalize_term_atom(_GroundClaimRaw, ClaimKey), (memberchk(fact_kind=_GroundKindRaw, _GroundProps) -> normalize_term_atom(_GroundKindRaw, FactKind) ; FactKind = ''), (memberchk(canonical_key=_GroundCanonicalRaw, _GroundProps) -> normalize_term_atom(_GroundCanonicalRaw, CanonicalKey) ; CanonicalKey = '')))`,
        );
        if (!fact.success) continue;
        const storedClaimKey = unquoted(fact.bindings.ClaimKey);
        const storedCanonicalKey = unquoted(fact.bindings.CanonicalKey);
        const matchedBy =
          storedClaimKey === claimKey
            ? "claim_key"
            : canonicalKey !== null &&
                storedCanonicalKey !== "" &&
                storedCanonicalKey === canonicalKey
              ? "canonical_key"
              : null;
        if (matchedBy === null) continue;
        found.push({
          relationship: { type, from: requirementId, to: target },
          factId: target,
          factKind: unquoted(fact.bindings.FactKind) || null,
          claimKey: storedClaimKey,
          canonicalKey: storedCanonicalKey || null,
          matchedBy,
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
// implements REQ-model-predicates-requirement-subject-v2
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
  const requirementSubjects = await constrainedSubjectKeys(
    prolog,
    args.requirementId,
    warnings,
  );
  // One constrained subject is the requirement's subject; with several the
  // agent picks one (subjectHint), so they are offered as binding examples.
  const requirementSubject =
    !hasSubjectHint(args.subjectHint) && requirementSubjects.length === 1
      ? requirementSubjects[0]
      : undefined;
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
    const applicability = evaluateSemanticApplicability(ranked, text, {
      explicitSchema: Boolean(args.schemaId),
    });
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
        constrainedSubjects: requirementSubjects,
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
    recommendedCandidate?.canonical_key ?? null,
    warnings,
  );
  const alreadyGrounded = existingGrounding.length > 0;
  // implements REQ-model-predicates-grounding-guards
  // The requirement already grounds the very predicate tuple the candidate
  // names (in other words, or the same text again): nothing to write or
  // swap, whatever the candidate's binding status.
  const sameTupleGrounding = existingGrounding.filter(
    (row) =>
      recommendedCandidate !== undefined &&
      row.canonicalKey !== null &&
      row.canonicalKey === recommendedCandidate.canonical_key,
  );
  const keepExistingGrounding = sameTupleGrounding.length > 0;
  const completeCandidate =
    recommendedCandidate && recommendedCandidate.binding_status === "complete"
      ? recommendedCandidate
      : undefined;
  // The stored requirement and its proposition ledger, read once for the
  // ledger guard, the replacement plan and the hash-bound plan.
  const storedRequirement =
    prolog !== null && context !== undefined && args.requirementId
      ? await storedRequirementContract(prolog, args.requirementId, warnings)
      : null;
  const ledger = ledgerState(storedRequirement, claimKey);
  // A requirement grounds only the propositions its prose states, so a
  // claim its ledger does not carry cannot be linked to it: the predicate
  // fact would be written and stay unlinked. The requirement's prose has to
  // be extended first.
  const ledgerMissing =
    ledger === "missing" && completeCandidate !== undefined && !alreadyGrounded;
  // implements REQ-model-predicates-participant-not-subject
  // A schema whose participant argument (actor, role, owner) the claim never
  // names does not fit the claim: no binding the agent could supply would be
  // read from the claim. When every unbound argument of the recommended
  // candidate is such a participant, the claim is an ontology gap, not a
  // binding request. An argument unbound for another reason (a value the
  // claim does name but in other words, a closed vocabulary) still asks for
  // bindings.
  const unnamedParticipants =
    recommendedCandidate && !completeCandidate
      ? unnamedParticipantArguments(
          recommendedCandidate,
          text,
          requirementSubjects,
        )
      : [];
  const schemaDoesNotFit =
    unnamedParticipants.length > 0 &&
    unnamedParticipants.length ===
      (recommendedCandidate?.unbound_arguments.length ?? 0);
  // The action names the predicate state; existingGrounding (non-empty) is
  // the separate "already grounded" signal. A complete candidate for a claim
  // that is already grounded becomes a replacement, never a second link.
  const recommendedAction = !recommendedCandidate
    ? unavailableSchema
      ? "resolve_schema_reference"
      : "record_ontology_gap"
    : keepExistingGrounding
      ? "keep_existing_grounding"
      : completeCandidate
        ? alreadyGrounded
          ? "replace_grounding"
          : ledgerMissing
            ? "extend_requirement"
            : "apply_requires_predicate"
        : schemaDoesNotFit
          ? "record_ontology_gap"
          : "provide_argument_bindings";
  const predicatePlan = completeCandidate
    ? buildPredicateApplyPlan(completeCandidate, args)
    : [];
  // An already grounded claim gets no predicate write plan: a second
  // grounding link would fail the proposition-complete rule, so the
  // replacement plan below swaps the grounding instead. The ontology-gap
  // observation is not a grounding relationship, so it is planned either way.
  const applyPlan = completeCandidate
    ? alreadyGrounded || ledgerMissing
      ? []
      : predicatePlan
    : (!recommendedCandidate && !unavailableSchema) || schemaDoesNotFit
      ? buildGapApplyPlan(text, args)
      : [];
  const plannedFactId =
    typeof predicatePlan[0]?.id === "string" ? predicatePlan[0].id : null;
  // The manifest the relationship plan calls "merged" starts from what the
  // stored requirement already declares, so an agent that passes no
  // existingLogicClaims is not handed a manifest that drops its other
  // clauses.
  const existingLogicClaims = Array.from(
    new Set([
      ...(storedRequirement !== null &&
      Array.isArray(storedRequirement.logic_claims)
        ? storedRequirement.logic_claims.filter(
            (claim): claim is string => typeof claim === "string",
          )
        : []),
      ...(args.existingLogicClaims ?? []),
    ]),
  );
  const relationshipPlan =
    completeCandidate && !alreadyGrounded && !ledgerMissing
      ? buildRelationshipPlan(
          plannedFactId ?? "",
          args.requirementId,
          text,
          existingLogicClaims,
        )
      : null;
  const replacementPlan =
    alreadyGrounded &&
    !keepExistingGrounding &&
    plannedFactId !== null &&
    args.requirementId
      ? buildGroundingReplacementPlan(
          args.requirementId,
          plannedFactId,
          predicatePlan,
          existingGrounding,
          storedRequirement !== null
            ? restatedRequirementFields(storedRequirement)
            : await storedRequirementProperties(
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
  const sameTupleSummary = sameTupleGrounding
    .map(
      (row) =>
        `${row.relationship.type} -> ${row.factId}${row.matchedBy === "canonical_key" ? ` (matched by canonical_key; its claim_key ${row.claimKey} differs from this text's ${claimKey})` : ""}`,
    )
    .join(", ");
  if (keepExistingGrounding) {
    warnings.push(
      `${args.requirementId} already grounds the predicate ${recommendedCandidate?.canonical_key} through ${sameTupleSummary}. Keep that grounding: no fact or link is needed. If this text is a further proposition of the requirement, extend its prose and run kb_model mode analyze before grounding it separately.`,
    );
  } else if (alreadyGrounded) {
    warnings.push(
      `${args.requirementId} already grounds this claim (${claimKey}) through ${groundingSummary}. A modeled claim takes exactly one logical grounding relationship, so adding requires_predicate beside it fails the proposition-complete rule. ${replacementPlan ? "Keep the existing grounding, or follow replacementPlan to swap it for the predicate." : "Keep the existing grounding; no predicate replacement is available yet."}`,
    );
  }
  if (ledger === "missing" && !alreadyGrounded && recommendedCandidate) {
    warnings.push(
      `The proposition ledger of ${args.requirementId} has no claim ${claimKey} for this text, so the requirement cannot ground it: a requirement grounds only the propositions its prose states. ${ledgerMissing ? "No fact was planned, because it would be written without a link. " : ""}Extend the requirement's prose with this clause (kb_model mode requirement, or kb_upsert with the extended semantic_text and the ledger kb_model mode analyze returns), then call mode predicates again.`,
    );
  }
  // The hints stay on a schema that does not fit, so the agent can see which
  // participant the claim would have to name.
  const bindingHints =
    (recommendedAction === "provide_argument_bindings" || schemaDoesNotFit) &&
    recommendedCandidate
      ? buildBindingHints(recommendedCandidate, text, requirementSubjects)
      : [];
  if (recommendedCandidate?.subject_pairing === "unpaired") {
    warnings.push(
      unpairedSubjectWarning(recommendedCandidate, args, requirementSubjects),
    );
  }
  const recommendedPredicateSchema =
    !recommendedCandidate && !unavailableSchema
      ? buildPredicateSchemaDraft(text, subject)
      : null;
  const groundedPrefix =
    alreadyGrounded && !keepExistingGrounding
      ? `${args.requirementId} already grounds this claim through ${groundingSummary}. `
      : "";
  const textSummary =
    groundedPrefix +
    (keepExistingGrounding
      ? `${args.requirementId} already grounds ${recommendedCandidate?.canonical_key} through ${sameTupleSummary}. Nothing to apply; keep that grounding.`
      : replacementPlan
        ? `To use ${completeCandidate?.predicate_name} instead, follow replacementPlan and link requires_predicate to ${plannedFactId}; otherwise keep the existing grounding.`
        : ledgerMissing && completeCandidate
          ? `Matched ${completeCandidate.predicate_name} as ${completeCandidate.canonical_key}, but ${args.requirementId} does not state this claim (its ledger has no ${claimKey}). Extend the requirement's prose with this clause first; no fact or link was planned.`
          : completeCandidate
            ? `Suggested ${candidates.length} predicate candidate(s). Top applicable match: ${completeCandidate.predicate_name}. Apply the predicate fact ${plannedFactId}, then link requires_predicate to that fact id (not a candidate id).`
            : schemaDoesNotFit && recommendedCandidate
              ? `Matched ${recommendedCandidate.predicate_name}, but the claim names no ${unnamedParticipants.join(" or ")} (${describeBindingHints(bindingHints)}), so this schema does not fit the claim. Record the ontology-gap observation in applyPlan instead of inventing a participant; a predicate_schema whose arguments the claim names would fit.`
              : recommendedCandidate
                ? `Matched ${recommendedCandidate.predicate_name}, but exact reviewed values are still required for: ${recommendedCandidate.unbound_arguments.join(", ")}. Bind them from the claim text: ${describeBindingHints(bindingHints)}. A value that repeats an argument name or a stop word stays unbound. No apply plan was generated.`
                : unavailableSchema
                  ? `Requested predicate schema ${args.schemaId} is unavailable or semantically inapplicable. No apply plan was generated.`
                  : alreadyGrounded
                    ? "No predicate candidate passed the semantic applicability gate; keep the existing grounding and record the ontology-gap observation in applyPlan so the missing schema stays visible."
                    : "No predicate candidate passed the semantic applicability gate; record an ontology gap and review the generated schema draft instead of silently writing prose.");
  const logicClaims = Array.from(new Set([...existingLogicClaims, claimKey]));
  const plan =
    relationshipPlan !== null && plannedFactId !== null && args.requirementId
      ? await groundingPlan(prolog, context, {
          requirementId: args.requirementId,
          claimKey,
          text,
          factStep: predicatePlan[0] ?? {},
          relationship: relationshipPlan.relationship as Record<
            string,
            unknown
          >,
          logicClaims,
          stored: storedRequirement,
          warnings,
        })
      : null;
  // Without a plan nothing ran the contradiction analysis, so the decision
  // conflicts a complete candidate would introduce are looked up directly.
  // A claim analyzed without a requirement asks the same question ("what
  // would this decision conflict with?"), so it gets the same lookup.
  const decisionConflicts =
    plan === null && completeCandidate !== undefined && !keepExistingGrounding
      ? await candidateDecisionConflicts(prolog, completeCandidate, warnings)
      : [];
  for (const conflict of decisionConflicts) {
    warnings.push(
      `The proposed ${conflict.canonicalKey} (${conflict.proposedEffect}) contradicts ${conflict.factId} (${conflict.effect}) under ${conflict.requirementId}${conflict.requirementId === args.requirementId ? ", the requirement this claim would ground" : ""}: both decide ${completeCandidate?.predicate_name} on the same key arguments. kb_upsert refuses a grounding link that introduces this conflict; supersede or close the conflicting requirement, or correct the decision, before applying.`,
    );
  }

  const conflictSummary =
    decisionConflicts.length > 0
      ? ` It would contradict ${decisionConflicts
          .map(
            (conflict) =>
              `${conflict.factId} (${conflict.effect}) under ${conflict.requirementId}`,
          )
          .join(", ")}: see decisionConflicts before applying anything.`
      : "";
  return {
    content: [{ type: "text", text: textSummary + conflictSummary }],
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
      plan,
      relationshipTarget,
      existingGrounding,
      decisionConflicts,
      replacementPlan,
      bindingHints,
      warnings,
    },
    applyPlan,
  };
}

/**
 * Whether the stored requirement's proposition ledger carries the claim:
 * "unknown" when the requirement or its ledger is not readable.
 */
// implements REQ-model-predicates-grounding-guards
function ledgerState(
  stored: Record<string, unknown> | null,
  claimKey: string,
): "present" | "missing" | "unknown" {
  if (stored === null || !Array.isArray(stored.semantic_inventory))
    return "unknown";
  return stored.semantic_inventory.some(
    (row) =>
      row !== null &&
      typeof row === "object" &&
      (row as Record<string, unknown>).claim_key === claimKey,
  )
    ? "present"
    : "missing";
}

/**
 * Stored decision-predicate facts of current requirements that agree with
 * the candidate on every key argument and decide the opposite: the pairs
 * the domain-contradictions rule would report once the candidate is linked.
 */
// implements REQ-model-predicates-grounding-guards
async function candidateDecisionConflicts(
  prolog: PrologPort | null,
  candidate: PredicateSuggestion,
  warnings: string[],
): Promise<CandidateDecisionConflict[]> {
  if (prolog === null) return [];
  if (
    candidate.predicate_args.length === 0 ||
    candidate.predicate_args.some((value) => !value)
  )
    return [];
  const candidateArgs = `[${candidate.predicate_args
    .map((value) => `'${escapeAtom(value)}'`)
    .join(",")}]`;
  try {
    const result = await prolog.query(
      `findall(Row, (kb:decision_signatures(_Signatures), memberchk(decision_signature(${candidate.schema.predicate_namespace ? `'${escapeAtom(candidate.schema.predicate_namespace)}'` : "_Namespace"}, '${escapeAtom(candidate.predicate_name)}', ${candidate.predicate_args.length}, _KeyPositions, _DecisionPosition), _Signatures), nth1(_DecisionPosition, ${candidateArgs}, _ProposedDecision), kb:effective_decision(_ProposedDecision, ${candidate.polarity}, _ProposedEffect), kb:decision_req_fact(_Signatures, _Req, _Fact, ${candidate.schema.predicate_namespace ? `'${escapeAtom(candidate.schema.predicate_namespace)}'` : "_Namespace"}, '${escapeAtom(candidate.predicate_name)}', _Args, _Polarity, _KeyPositions, _DecisionPosition), kb:bind_key_arguments(_KeyPositions, ${candidateArgs}, _Args), nth1(_DecisionPosition, _Args, _Decision), kb:effective_decision(_Decision, _Polarity, _Effect), _Effect \\== _ProposedEffect, atomic_list_concat([_Req, _Fact, _Effect, _ProposedEffect], '|', Row)), Rows)`,
    );
    if (!result.success) return [];
    const conflicts: CandidateDecisionConflict[] = [];
    for (const row of parsePrologList(result.bindings.Rows ?? "[]")) {
      const [requirementId, factId, effect, proposedEffect] = row.split("|");
      if (!requirementId || !factId || !effect || !proposedEffect) continue;
      conflicts.push({
        requirementId,
        factId,
        effect,
        proposedEffect,
        canonicalKey: candidate.canonical_key,
      });
    }
    return conflicts.sort((left, right) =>
      `${left.requirementId}|${left.factId}`.localeCompare(
        `${right.requirementId}|${right.factId}`,
      ),
    );
  } catch (error) {
    warnings.push(
      `Decision conflicts for ${candidate.canonical_key} could not be read (${error instanceof Error ? error.message : String(error)}); preview the grounding with kb_upsert dryRun and plannedFacts before applying.`,
    );
    return [];
  }
}

/** The stored requirement fields a relationship-only update must restate. */
function restatedRequirementFields(
  stored: Record<string, unknown>,
): Record<string, unknown> {
  const restated: Record<string, unknown> = {};
  for (const field of RESTATED_REQUIREMENT_FIELDS)
    if (stored[field] !== undefined && stored[field] !== null)
      restated[field] = stored[field];
  return restated;
}

/**
 * Why the recommended predicate is not offered for grounding: it is not about
 * a subject the requirement constrains, so kb_check would keep reporting
 * strict-req-fact-pairing after the link.
 */
// implements REQ-model-predicates-requirement-subject-v2
function unpairedSubjectWarning(
  candidate: PredicateSuggestion,
  args: SuggestPredicatesArgs,
  constrainedSubjects: readonly string[],
): string {
  const subjects = constrainedSubjects.join(", ");
  const schemaNamesSubject =
    candidate.schema.argument_names.includes("subject");
  const cause = schemaNamesSubject
    ? `its subject argument is ${candidate.subject_key ?? "unbound"}, not a subject ${args.requirementId} constrains (${subjects})`
    : `the ${candidate.predicate_name} schema does not name the requirement's subject (its arguments are ${candidate.schema.argument_names.join(", ")}) and its subject_key ${candidate.subject_key === null ? "cannot be chosen" : `${candidate.subject_key} is not`} one of the subjects ${args.requirementId} constrains (${subjects})`;
  return `${candidate.predicate_name} is not offered for grounding because ${cause}, so kb_check would report strict-req-fact-pairing after the link. Pass subjectHint with one of ${subjects} and retry.`;
}

/** Stored requirement fields a relationship-only update must restate. */
const RESTATED_REQUIREMENT_FIELDS = [
  "title",
  "status",
  "priority",
  "owner",
  "tags",
] as const;

// implements REQ-model-what-if-planned-facts
/**
 * The hash-bound plan behind applyPlan + relationshipPlan: the predicate fact,
 * then the requirement restated with the merged logic_claims manifest and the
 * requires_predicate link. kb_apply_plan applies both in one transaction, and
 * the plan's contradictionAnalysis says what the batch would introduce.
 */
async function groundingPlan(
  prolog: PrologPort | null,
  context: OperationContext | undefined,
  input: Readonly<{
    requirementId: string;
    claimKey: string;
    text: string;
    factStep: Record<string, unknown>;
    relationship: Record<string, unknown>;
    logicClaims: readonly string[];
    stored: Record<string, unknown> | null;
    warnings: string[];
  }>,
): Promise<Record<string, unknown> | null> {
  if (prolog === null || context === undefined) return null;
  const stored = input.stored === null ? null : { ...input.stored };
  if (stored === null) {
    input.warnings.push(
      `No hash-bound plan: requirement ${input.requirementId} is not stored, so its upsert step cannot restate the stored title and status. Apply applyPlan and relationshipPlan with kb_upsert.`,
    );
    return null;
  }
  // A stored ledger is restated with this claim marked modeled, so the
  // proposition-complete check sees one modeled entry per grounding link.
  // A claim the ledger does not carry cannot be grounded by this plan.
  const inventory = Array.isArray(stored.semantic_inventory)
    ? (stored.semantic_inventory as unknown[])
    : null;
  if (inventory !== null) {
    const entry = inventory.find(
      (row): row is Record<string, unknown> =>
        row !== null &&
        typeof row === "object" &&
        (row as Record<string, unknown>).claim_key === input.claimKey,
    );
    if (entry === undefined) {
      input.warnings.push(
        `No hash-bound plan: the ledger of ${input.requirementId} has no proposition ${input.claimKey} for this text. Run kb_model mode analyze with the requirement's complete prose and pass one of its clauses as text; applyPlan can still be written with kb_upsert.`,
      );
      return null;
    }
    stored.semantic_inventory = inventory.map((row) =>
      row === entry
        ? {
            ...entry,
            status: "modeled",
            reason: `Grounded by the ${String(input.factStep.id)} predicate fact this plan writes.`,
          }
        : row,
    );
  }
  try {
    const plan = await compileGroundingPlan(context, prolog, {
      requirementId: input.requirementId,
      claimKey: input.claimKey,
      text: input.text,
      steps: [
        input.factStep,
        {
          type: "req",
          id: input.requirementId,
          // The manifest must name every assertive ledger claim, so the
          // stored manifest is kept and this claim merged into it.
          properties: {
            ...stored,
            logic_claims: Array.from(
              new Set([
                ...(Array.isArray(stored.logic_claims)
                  ? stored.logic_claims.filter(
                      (claim): claim is string => typeof claim === "string",
                    )
                  : []),
                ...input.logicClaims,
              ]),
            ),
          },
          relationships: [input.relationship],
        },
      ],
    });
    if (plan.status === "blocked") {
      const reasons = plan.contradictionAnalysis.witnesses
        .map((witness) => witness.reason)
        .filter(Boolean);
      input.warnings.push(
        `Applying this grounding would contradict the current KB, so plan.status is blocked: ${reasons.join("; ")}. Supersede or close the conflicting requirement before grounding this claim.`,
      );
    } else if (plan.status !== "ready") {
      input.warnings.push(
        `The hash-bound plan needs resolution before kb_apply_plan can run it: ${plan.diagnostics.join("; ")}`,
      );
    }
    return plan as unknown as Record<string, unknown>;
  } catch (error) {
    input.warnings.push(
      `No hash-bound plan could be compiled (${error instanceof Error ? error.message : String(error)}); apply applyPlan and relationshipPlan with kb_upsert.`,
    );
    return null;
  }
}

const STORED_LEDGER_FIELDS = [
  "text_ref",
  "semantic_text",
  "semantic_clauses",
  "semantic_inventory",
  "semantic_inventory_version",
  "semantic_source_field",
  "semantic_source_hash",
  "logic_claims",
] as const;

// implements REQ-model-what-if-planned-facts
/**
 * The stored requirement as a plan step restates it: title, status and
 * metadata plus its proposition ledger, so the upsert kb_apply_plan runs is
 * validated as given and keeps the ledger instead of replacing it.
 */
async function storedRequirementContract(
  prolog: PrologPort,
  requirementId: string,
  warnings: string[],
): Promise<Record<string, unknown> | null> {
  const restated = await storedRequirementProperties(
    prolog,
    requirementId,
    warnings,
  );
  if (restated === null) return null;
  const [stored] = await loadEntities(prolog, {
    id: requirementId,
    type: "req",
  });
  for (const field of STORED_LEDGER_FIELDS)
    if (stored?.[field] !== undefined && stored[field] !== null)
      restated[field] = stored[field];
  return restated;
}

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
 * retraction and the link the claim is ungrounded and its subject fact is
 * unpaired (kb_check reports logic-coverage and strict-req-fact-pairing for
 * the requirement), so the steps run back to back; `expected` states those
 * transient diagnostics and `rollback` restores the old link when kb_check
 * after the last step is not clean.
 */
// implements REQ-model-predicates-grounding-aware-v2, REQ-model-predicates-plan-roundtrip, REQ-model-predicates-replacement-diagnostics
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
  const transientRules = ["logic-coverage", "strict-req-fact-pairing"];
  return {
    relationshipTarget: factId,
    expected: {
      // kb_check findings for the requirement after each step, by rule name
      // (violations carry `rule`, quality diagnostics `rule.<name>`).
      kbCheckAfterStep: [[], transientRules, []],
      kbCheckAfterLastStep: [],
      rollbackWhen: "kb_check after the last step is not clean",
    },
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
      reason: `Only if kb_check after the last step is not clean (it still reports ${transientRules.join(" or ")} for ${requirementId}, or the step failed): restore the retracted grounding link so the claim is grounded again.`,
    },
    instructions: `Only replace the grounding when the predicate states the claim at least as precisely as ${existing.map((row) => row.factId).join(", ")}. Apply the steps unchanged, in order and back to back: linking requires_predicate before the retraction is rejected because the claim would have two groundings, and between the retraction and the link the claim is ungrounded and its subject unpaired, so kb_check reports both ${transientRules.join(" and ")} for ${requirementId} until the last step lands (see expected.kbCheckAfterStep). Run kb_check after the last step; if it is not clean, apply rollback.`,
  };
}

export async function executeSuggestPredicates(
  args: SuggestPredicatesArgs,
  context: OperationContext,
): Promise<SuggestPredicatesResult> {
  return handleKbSuggestPredicates(context.prolog ?? null, args, context);
}
