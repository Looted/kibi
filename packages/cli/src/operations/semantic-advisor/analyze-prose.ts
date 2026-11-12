import {
  createBuiltinOntologyPack,
  detectSignals as detectBuiltinSignals,
} from "kibi-plugin-builtin";
import { InputError } from "../../cli-errors.js";
import {
  logicSemanticKey,
  renderLogicProlog,
  utf8Span,
  validateLogicIr,
} from "../../logic/ir.js";
import { logicRuleFactId } from "../modeling/logic-modeling.js";
import { buildAdvisorResult } from "./analysis-receipt.js";
import {
  type SemanticClause,
  extractSemanticClauses,
  semanticClaimKey,
} from "./clauses.js";
import {
  type ConditionalRuleMatch,
  detectConditionalRule,
} from "./conditional-rules.js";
import { observationPlan } from "./observation-plan.js";
import { propositionRole } from "./proposition-role.js";
import {
  type Payload,
  type SemanticSourceField,
  predicateSuggestion as buildPredicateSuggestion,
  isRecord,
  payloadHash,
  propertiesOf,
  relationship,
  semanticClausesOf,
  semanticSourceHash,
  semanticSourceOf,
  sourceOf,
  statementOf,
  stringValue,
} from "./shared.js";
import { detectSourceShape, detectStrictSuggestion } from "./strict-rules.js";
import type {
  SemanticAdvisorAnalysisResult,
  SemanticAdvisorInput,
  SemanticAdvisorLane,
  SemanticInterpretationResult,
  SemanticModelingSuggestion,
  SemanticProposition,
  SemanticPropositionDimension,
  SemanticPropositionRole,
  SemanticPropositionStatus,
  SemanticShadowCue,
  SemanticShadowCueKind,
  SemanticSignal,
  SemanticSignalKind,
} from "./types.js";

export const SEMANTIC_ADVISOR_VERSION = "semantic-advisor-v2";
export { semanticClaimKey } from "./clauses.js";

export function stringLogicClaims(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}

function proseOf(payload: Payload): string {
  const properties = propertiesOf(payload);
  // text_ref is the prose only while semantic_text is unset (the ingestion
  // boundary's fallback); beside semantic_text it is a reference such as
  // "docs/intake.md#batch-4", whose numbers and words are not claims.
  const semanticText = stringValue(properties.semantic_text);
  return [
    properties.title,
    properties.semantic_text,
    semanticText ? undefined : properties.text_ref,
    properties.description,
  ]
    .map(stringValue)
    .filter(Boolean)
    .join("\n");
}

function isRequirement(payload: Payload): boolean {
  return stringValue(payload.type) === "req";
}

function recordsOf(value: unknown): Record<string, unknown>[] {
  // rationale: a placeholder entry is not a record either, so callers see the same empty list.
  // Stryker disable next-line ArrayDeclaration
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

const GROUNDING_TYPES = [
  "requires_property",
  "requires_predicate",
  "requires_rule",
];

/**
 * Every assertive claim is modeled and has exactly one logical grounding.
 * With no assertive claim there is no grounding to count, so the type check
 * below fails and nothing is reported as modeled.
 */
function isModeled(
  payload: Payload,
  expectedClaimKeys: readonly string[],
): boolean {
  const relationships = recordsOf(payload.relationships);
  const types = relationships.map((relationship) =>
    stringValue(relationship.type),
  );
  const modeledClaimKeys = recordsOf(propertiesOf(payload).semantic_inventory)
    .filter(({ status }) => status === "modeled")
    .map(({ claim_key }) => stringValue(claim_key));
  return (
    types.filter((type) => GROUNDING_TYPES.includes(type)).length ===
      expectedClaimKeys.length &&
    modeledClaimKeys.length === expectedClaimKeys.length &&
    expectedClaimKeys.every((claimKey) =>
      modeledClaimKeys.includes(claimKey),
    ) &&
    ((types.includes("constrains") && types.includes("requires_property")) ||
      types.includes("requires_predicate") ||
      types.includes("requires_rule"))
  );
}

/** Builtin semantic classifier is the single source of signal/lane detection. */
function detectSignals(prose: string): readonly SemanticSignal[] {
  return detectBuiltinSignals(prose).map((signal) => ({
    kind: signal.kind,
    evidence: signal.evidence,
    candidate_lane: signal.candidateLane,
    confidence: signal.confidence,
  }));
}

// The suggestion detectors read normalized clause text (normalizeSemanticClause
// collapses whitespace to single spaces), so their patterns match one space.
function ambiguitySuggestion(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  const match = statement.match(
    /\b(?<value>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten) (?<resource>active sessions?|sessions?)\b/i,
  );
  if (!match || /at most|at least|exactly|no more than|up to/i.test(statement))
    return null;
  // Both groups are required parts of the pattern.
  const { value, resource } = match.groups as Record<string, string>;
  return {
    kind: "ambiguity_observation",
    // rationale: withClauseProvenance sets the clause's own claim key on every suggestion.
    // Stryker disable next-line StringLiteral
    claim_key: "",
    claim_text: statement,
    confidence: 0.78,
    evidence: `${value} ${resource}`,
    rationale:
      "Cardinality without an explicit operator is ambiguous and should be clarified before strict modeling.",
    ambiguity: ["exactly", "at_most", "at_least", "illustrative_example"],
    suggested_next_tool: "kb_model_requirement",
    applyPlan: observationPlan(payload, "Ambiguous cardinality requirement", [
      "semantic-advisor-suggestion",
      "review:ambiguity",
    ]),
  };
}

function ontologyGapSuggestion(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  const match = statement.match(
    /\brate limited to (?<count>\d+) (?<action>[a-z][a-z _-]*?) per (?<window>[a-z]+)\b/i,
  );
  if (!match?.groups) return null;
  return {
    kind: "ontology_gap",
    // rationale: withClauseProvenance sets the clause's own claim key on every suggestion.
    // Stryker disable next-line StringLiteral
    claim_key: "",
    claim_text: statement,
    confidence: 0.82,
    evidence: match[0],
    rationale:
      "Rate limiting is logical and machine-checkable, but the current built-in predicate set needs a dedicated schema before grounding it safely.",
    suggested_next_tool: "kb_suggest_predicates",
    recommendedPredicateSchema: {
      predicate_name: "rate_limit",
      argument_names: ["subject", "action", "window", "count"],
      argument_types: ["entity", "action", "duration", "number"],
    },
    applyPlan: observationPlan(payload, "Ontology gap: rate_limit", [
      "semantic-advisor-suggestion",
      "review:ontology-gap",
      "needs_schema_extension",
    ]),
  };
}

function predicateSuggestion(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  // Deterministic builtin pack — never loads external plugins on sync paths.
  const matches = createBuiltinOntologyPack().match({
    // rationale: the builtin pack matches on the statement; withClauseProvenance sets the claim key afterwards.
    // Stryker disable next-line StringLiteral
    claimKey: "",
    statement,
  });
  const hit = matches[0];
  if (!hit) return null;
  return buildPredicateSuggestion(
    payload,
    hit.evidence,
    hit.predicateName,
    hit.arguments,
    hit.rationale ?? "",
    hit.polarity,
  );
}

const HOST_RULE_RATIONALE =
  "The host supplied a typed kibi.logic.v1 interpretation. Kibi validated its safety, canonicalized it, and will persist it as data-backed rule evidence.";

/** A host-supplied confidence, kept within [0, 1]. */
function clampConfidence(value: number | undefined, fallback: number): number {
  return Math.max(0, Math.min(1, value ?? fallback));
}

type RuleSuggestion = Extract<SemanticModelingSuggestion, { kind: "rule" }>;

function ruleSuggestion(
  payload: Payload,
  candidate: NonNullable<SemanticAdvisorInput["interpretations"]>[number],
  rationale = HOST_RULE_RATIONALE,
): RuleSuggestion | null {
  const validation = validateLogicIr(candidate.ir);
  if (
    !validation.valid ||
    !validation.normalized ||
    !validation.semanticKey ||
    !validation.renderedProlog
  )
    return null;
  const reqId = stringValue(payload.id);
  const semanticKey = validation.semanticKey;
  const schemaId = candidate.ir.ruleSchemaId ?? "FACT-RULE-SCHEMA-LOGIC-V1";
  const factId = logicRuleFactId(semanticKey);
  const schemaPlan = candidate.ir.ruleSchemaId
    ? []
    : [
        {
          type: "fact",
          id: schemaId,
          properties: {
            title: "kibi.logic.v1 rule schema",
            status: "active",
            source: sourceOf(payload),
            fact_kind: "rule_schema",
            rule_name: "kibi.logic.v1",
            argument_names: ["rule_ir"],
            argument_types: ["logic_ir"],
            aliases: ["conditional rule", "constraint", "policy rule"],
            examples: [validation.renderedProlog],
          },
          relationships: [],
        },
      ];
  return {
    kind: "rule",
    claim_key: candidate.claim_key,
    claim_text: candidate.claim_text,
    confidence: clampConfidence(candidate.confidence, 0.75),
    evidence: candidate.claim_text,
    rationale,
    suggested_next_tool: "kb_model_requirement",
    rule: validation.normalized,
    semantic_key: semanticKey,
    rendered_prolog: validation.renderedProlog,
    rejected_alternatives: ["raw_prolog", "observation_review"],
    applyPlan: [
      ...schemaPlan,
      {
        type: "fact",
        id: factId,
        properties: {
          title: `Rule: ${candidate.claim_text}`,
          status: "active",
          source: sourceOf(payload),
          fact_kind: "rule",
          rule_ir: validation.normalized,
          rule_hash: validation.ruleHash,
          semantic_key: semanticKey,
          rule_schema_id: schemaId,
          rule_name: validation.normalized.ruleSchemaId ?? "kibi.logic.v1",
          canonical_key: semanticKey,
          tags: ["lane:logic", "semantic-advisor-suggestion"],
        },
        relationships: [],
      },
    ],
    relationshipPlan: reqId
      ? {
          applyAfter: factId,
          requiresExistingReq: reqId,
          relationship: relationship(reqId, factId, "requires_rule"),
        }
      : null,
  };
}

// "X may happen only when C" and "X must not happen unless C" are conditional
// requirements: they restrict an action, not a property of every situation.
// Route them to the rule lane as a typed forbid-unless rule, so scenario
// feasibility and contradiction checks see the action and its condition.
function conditionalRuleSuggestion(
  payload: Payload,
  clause: SemanticClause,
  match: ConditionalRuleMatch | null,
): SemanticModelingSuggestion | null {
  if (match?.kind !== "rule") return null;
  return ruleSuggestion(
    payload,
    {
      claim_key: clause.claim_key,
      claim_text: clause.text,
      ir: match.ir,
      confidence: 0.8,
    },
    `Conditional requirement (${match.shape === "only_when" ? "only when" : "must not ... unless"}): ${match.action} is forbidden unless ${match.subjectKey}.${match.propertyKey} meets the stated condition${match.scope ? ` in scope ${match.scope}` : ""}. Kibi modeled it as a typed forbid-unless rule; assume ${match.subjectKey}.${match.propertyKey} property values in scenarios to check them against it.`,
  );
}

// A conditional clause that is neither a translatable rule nor a catalog
// predicate stays an ontology gap (unresolved), never a strict property or an
// observation that looks modeled: the strict lane would drop the condition.
function unresolvedConditionalSuggestion(
  payload: Payload,
  clause: SemanticClause,
  match: ConditionalRuleMatch | null,
): SemanticModelingSuggestion | null {
  if (match === null) return null;
  return {
    kind: "ontology_gap",
    claim_key: clause.claim_key,
    claim_text: clause.text,
    confidence: 0.6,
    evidence: match.evidence,
    rationale:
      match.kind === "unparsed"
        ? `${match.reason} Supply a typed kibi.logic.v1 interpretation (forbid the action unless the condition holds) instead of an observation.`
        : "The conditional clause did not produce a valid kibi.logic.v1 rule; supply a typed interpretation instead of an observation.",
    suggested_next_tool: "kb_suggest_predicates",
    recommendedPredicateSchema: null,
    applyPlan: observationPlan(payload, "Ontology gap: conditional clause", [
      "semantic-advisor-suggestion",
      "review:ontology-gap",
      "needs_rule_interpretation",
    ]),
  };
}

function modelingSuggestions(
  payload: Payload,
  modeled: boolean,
  clauses: readonly SemanticClause[],
  expectedClaimKeys: readonly string[],
  interpretations: NonNullable<SemanticAdvisorInput["interpretations"]>,
): readonly SemanticModelingSuggestion[] {
  if (!isRequirement(payload) || modeled) return [];
  const suggestions: SemanticModelingSuggestion[] = [];
  // Each clause has its own claim key, so the clause suggestions never repeat.
  for (const clause of clauses) {
    const candidate = clause.text;
    const conditional = detectConditionalRule(candidate);
    const rawSuggestion =
      conditionalRuleSuggestion(payload, clause, conditional) ??
      detectSourceShape(payload, candidate) ??
      predicateSuggestion(payload, candidate) ??
      unresolvedConditionalSuggestion(payload, clause, conditional) ??
      ontologyGapSuggestion(payload, candidate) ??
      ambiguitySuggestion(payload, candidate) ??
      detectStrictSuggestion(payload, candidate);
    const suggestion = rawSuggestion
      ? withClauseProvenance(
          rawSuggestion,
          clause,
          clauses,
          expectedClaimKeys,
          statementOf(payload),
          semanticSourceOf(payload).field,
        )
      : clause.normative
        ? unmatchedClauseSuggestion(payload, clause, clauses, expectedClaimKeys)
        : null;
    if (suggestion) suggestions.push(suggestion);
  }
  // The same interpretation submitted twice yields one rule suggestion.
  const seen = new Set<string>();
  for (const interpretation of interpretations) {
    const clause = clauses.find(
      (entry) => entry.claim_key === interpretation.claim_key,
    );
    if (!clause) continue;
    const suggestion = ruleSuggestion(payload, interpretation);
    if (!suggestion) continue;
    const withProvenance = withClauseProvenance(
      suggestion,
      clause,
      clauses,
      expectedClaimKeys,
      statementOf(payload),
      semanticSourceOf(payload).field,
    );
    const key = `${interpretation.claim_key}:${suggestion.semantic_key}`;
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push(withProvenance);
    }
  }
  return suggestions;
}

function withClauseProvenance(
  suggestion: SemanticModelingSuggestion,
  clause: SemanticClause,
  clauses: readonly SemanticClause[],
  expectedClaimKeys: readonly string[],
  statement: string,
  sourceField: SemanticSourceField,
): SemanticModelingSuggestion {
  const clauseLocation = propositionSpan(statement, clause, 0);
  const clauseText = clauseLocation.sourceText;
  const clauseSpan = clauseLocation.span;
  // Only a typed grounding (a strict, predicate or rule suggestion) carries
  // this inventory, in its req step or relationship plan, and it grounds
  // the clause: the clause is modeled there.
  let inventoryCursor = 0;
  const semanticInventory = clauses.map((entry) => {
    const located = propositionSpan(statement, entry, inventoryCursor);
    inventoryCursor = located.next;
    const role = propositionRole(entry.text, entry.normative);
    const context = ["rationale", "example", "subjective"].includes(role);
    const entryStatus =
      entry.index === clause.index
        ? "modeled"
        : context
          ? "nonlogical"
          : "missing";
    return {
      claim_key: entry.claim_key,
      claim_text: located.sourceText,
      role,
      status: entryStatus,
      span: located.span,
      reason:
        entry.index === clause.index
          ? "Draft apply plan contains a typed grounding for this proposition."
          : context
            ? "Prose is retained for human context and is not a verifiable domain proposition."
            : "No typed grounding is included for this proposition in the current draft plan.",
    };
  });
  const inventoryContract = {
    version: "kibi.semantic-inventory.v1",
    source_field: sourceField,
    source_hash: semanticSourceHash(statement),
  };
  // Every plan step is a req or fact step with properties.
  const applyPlan = suggestion.applyPlan.map((step) => {
    const properties = step.properties as Record<string, unknown>;
    if (step.type === "req") {
      const existing = stringLogicClaims(properties.logic_claims);
      return {
        ...step,
        properties: {
          ...properties,
          logic_claims: Array.from(
            new Set([...existing, ...expectedClaimKeys]),
          ),
          semantic_clauses: clauses.map(({ text }) => text),
          semantic_inventory_version: inventoryContract.version,
          semantic_source_field: inventoryContract.source_field,
          semantic_source_hash: inventoryContract.source_hash,
          semantic_inventory: semanticInventory,
        },
      };
    }
    return {
      ...step,
      properties: {
        ...properties,
        claim_key: clause.claim_key,
        claim_text: clauseText,
        claim_span_start: clauseSpan.start,
        claim_span_end: clauseSpan.end,
      },
    };
  });
  return {
    ...suggestion,
    claim_key: clause.claim_key,
    claim_text: clauseText,
    applyPlan,
    // Only predicate and rule suggestions carry a relationship plan.
    ...("relationshipPlan" in suggestion && suggestion.relationshipPlan !== null
      ? {
          relationshipPlan: {
            ...suggestion.relationshipPlan,
            claimKey: clause.claim_key,
            claimText: clauseText,
            logicClaims: expectedClaimKeys,
            semanticClauses: clauses.map(({ text }) => text),
            semanticInventory,
            inventoryContract,
            instructions:
              suggestion.kind === "predicate"
                ? "Create the predicate fact, merge the returned logicClaims into the requirement logic_claims manifest, then add requires_predicate without overwriting other requirement metadata."
                : "Create the rule_schema and rule facts, merge the returned logicClaims into the requirement logic_claims manifest, then add requires_rule without overwriting other requirement metadata.",
          },
        }
      : {}),
  };
}

function unmatchedClauseSuggestion(
  payload: Payload,
  clause: SemanticClause,
  clauses: readonly SemanticClause[],
  expectedClaimKeys: readonly string[],
): SemanticModelingSuggestion {
  return withClauseProvenance(
    {
      kind: "ontology_gap",
      claim_key: clause.claim_key,
      claim_text: clause.text,
      confidence: 0.6,
      evidence: clause.text,
      rationale:
        "This normative clause has no deterministic strict-property or declared predicate grounding. Define its domain terms and predicate signature explicitly before grounding it; keep it unresolved instead of treating prose as logic-complete.",
      suggested_next_tool: "kb_suggest_predicates",
      recommendedPredicateSchema: null,
      applyPlan: observationPlan(payload, "Ontology gap: ungrounded clause", [
        "semantic-advisor-suggestion",
        "review:ontology-gap",
        "needs_schema_extension",
      ]),
    },
    clause,
    clauses,
    expectedClaimKeys,
    statementOf(payload),
    semanticSourceOf(payload).field,
  );
}

export { propositionRole };

function shadowAnalysis(
  text: string,
  interpretations: readonly SemanticInterpretationResult[],
): readonly SemanticShadowCue[] {
  const valid = interpretations.filter(
    (interpretation) => interpretation.valid,
  );
  const models = valid.flatMap(({ normalized_ir: ir }) => (ir ? [ir] : []));
  /** Some node of some model, at any depth, satisfies `test`. */
  const containsNode = (
    test: (node: Record<string, unknown>) => boolean,
  ): boolean => {
    const visit = (value: unknown): boolean =>
      Array.isArray(value)
        ? value.some(visit)
        : isRecord(value) && (test(value) || Object.values(value).some(visit));
    return visit(models);
  };
  const containsExpressionKind = (kind: string): boolean =>
    containsNode((node) => node.kind === kind);
  const hasModality = (modalities: readonly string[]): boolean =>
    models.some((model) => modalities.includes(model.modality));
  const hasNegativeAtom = containsNode(
    (node) => node.kind === "not" || node.polarity === "negative",
  );
  const cues: Array<{
    kind: SemanticShadowCueKind;
    pattern: RegExp;
    evidence: string;
    represented: boolean;
  }> = [
    {
      kind: "modal",
      pattern: /\b(?:must|shall|should|may|can)\b/i,
      evidence: "deontic modal",
      represented: models.length > 0,
    },
    {
      kind: "polarity",
      pattern: /\b(?:assert|deny|forbid|allowed|permitted|prohibited)\b/i,
      evidence: "polarity cue",
      represented: hasModality(["deny", "forbid", "permit"]) || hasNegativeAtom,
    },
    {
      kind: "passive_voice",
      pattern: /\b(?:is|are|be|was|were)\s+[a-z]+ed\b/i,
      evidence: "passive construction",
      represented: false,
    },
    {
      kind: "nominalization",
      pattern: /\b[a-z]+(?:tion|ment|ity|ance|ence)\b/i,
      evidence: "nominalized domain term",
      represented: false,
    },
    {
      kind: "conditional",
      pattern: /\b(?:if|when|whenever|provided that)\b/i,
      evidence: "conditional",
      represented: models.some(
        ({ kind, body }) => kind === "rule" && body !== undefined,
      ),
    },
    {
      kind: "causal",
      pattern: /\b(?:because|so that|therefore|as a result)\b/i,
      evidence: "causal relation",
      represented: false,
    },
    {
      kind: "prerequisite",
      // "requires X before Y" is covered by the word before.
      pattern: /\b(?:before|only after)\b/i,
      evidence: "prerequisite/order relation",
      represented: containsExpressionKind("temporal"),
    },
    {
      kind: "exception",
      pattern: /\b(?:unless|except|exempt|apart from)\b/i,
      evidence: "exception",
      represented:
        models.some(({ exceptions }) => (exceptions?.length ?? 0) > 0) ||
        containsExpressionKind("not"),
    },
    {
      kind: "temporal",
      pattern:
        /\b(?:before|after|during|until|within|expires?|retained for)\b/i,
      evidence: "temporal qualifier",
      represented:
        containsExpressionKind("temporal") ||
        models.some(
          ({ validFrom, validTo }) =>
            validFrom !== undefined || validTo !== undefined,
        ) ||
        containsExpressionKind("duration"),
    },
    {
      kind: "quantifier",
      pattern:
        /\b(?:each|every|all|any|some|only|at least|at most|exactly|no more than)\b/i,
      evidence: "quantifier/cardinality",
      represented:
        models.some(({ variables }) => (variables?.length ?? 0) > 0) ||
        containsExpressionKind("count") ||
        containsExpressionKind("compare") ||
        containsExpressionKind("all") ||
        containsExpressionKind("any"),
    },
    {
      kind: "numeric",
      pattern:
        // A decimal such as 2.5 already matches at its integer part.
        /\b\d+\b|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
      evidence: "numeric or cardinality value",
      represented:
        containsExpressionKind("number") ||
        containsExpressionKind("count") ||
        containsExpressionKind("compare"),
    },
    {
      kind: "negation_scope",
      pattern: /\b(?:not|never|no|without|cannot|can't|must not)\b/i,
      evidence: "negation scope",
      represented: hasModality(["deny", "forbid"]) || hasNegativeAtom,
    },
    {
      kind: "directionality",
      pattern: /\b(?:only if|if and only if|unless|when)\b/i,
      evidence: "condition direction",
      represented: models.some(
        ({ kind, body }) => kind === "rule" && body !== undefined,
      ),
    },
  ];
  return cues
    .filter((cue) => cue.pattern.test(text))
    .map(({ kind, evidence, represented }) => ({
      kind,
      evidence,
      represented,
    }));
}

function propositionSpan(
  text: string,
  clause: SemanticClause,
  cursor: number,
): {
  span: { start: number; end: number };
  next: number;
  sourceText: string;
} {
  const located = locateSourceText(text, clause.text, cursor);
  // A clause the prose does not contain has no source span: it keeps its own
  // text over an empty span (which strict ingestion rejects) instead of an
  // unrelated slice of the prose.
  if (located === null) {
    return {
      span: utf8Span(text, cursor, cursor),
      next: cursor,
      sourceText: clause.text,
    };
  }
  return {
    span: utf8Span(text, located.start, located.end),
    next: Math.max(cursor, located.end),
    sourceText: text.slice(located.start, located.end),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Locate canonical claim text while accepting source-only whitespace layout.
 * The caller receives the authored slice so strict ingestion can compare the
 * span with the claim text without rewriting the source document. The search
 * starts at `cursor` and then retries from the start of the prose; null means
 * the prose does not contain the claim text at all.
 */
function locateSourceText(
  source: string,
  claimText: string,
  cursor: number,
): { start: number; end: number } | null {
  const pattern = new RegExp(
    escapeRegExp(claimText.trim()).replace(/\s+/g, "\\s+"),
  );
  for (const from of [cursor, 0]) {
    const match = pattern.exec(source.slice(from));
    if (match !== null) {
      const start = from + match.index;
      return { start, end: start + match[0].length };
    }
  }
  return null;
}

/**
 * Caller-supplied clauses split the requirement prose; they never restate
 * it. A clause that does not occur in the prose (apart from whitespace
 * layout, a list marker or closing punctuation) would get a span over
 * unrelated text, so the request is refused naming each such clause.
 */
function assertVerbatimClauses(
  statement: string,
  clauses: readonly SemanticClause[],
): void {
  const missing = clauses
    .filter((clause) => locateSourceText(statement, clause.text, 0) === null)
    .map((clause) => JSON.stringify(clause.text));
  if (missing.length === 0) return;
  throw new InputError(
    "VALIDATION_FAILED",
    `Semantic advisor clauses must be verbatim fragments of the requirement prose (the intent or semantic_text); ${missing.length === 1 ? "this clause does" : "these clauses do"} not occur in it: ${missing.join(", ")}. Copy each clause from the prose unchanged (whitespace may differ), or omit clauses to let Kibi split the prose.`,
  );
}

function interpretationResults(
  interpretations: NonNullable<SemanticAdvisorInput["interpretations"]>,
  clauses: readonly SemanticClause[],
  statement: string,
): {
  results: readonly SemanticInterpretationResult[];
  warnings: readonly string[];
} {
  const known = new Set(clauses.map((clause) => clause.claim_key));
  const semanticKeys = new Map<string, string>();
  const warnings: string[] = [];
  const results = interpretations.slice(0, 3).map((candidate) => {
    const confidence = clampConfidence(candidate.confidence, 0.5);
    const validation = validateLogicIr(candidate.ir);
    const errors = [...validation.errors];
    const clause = clauses.find(
      (entry) => entry.claim_key === candidate.claim_key,
    );
    if (!known.has(candidate.claim_key))
      errors.push(
        `claim_key ${candidate.claim_key} is not present in the advisor proposition inventory`,
      );
    if (clause && semanticClaimKey(candidate.claim_text) !== clause.claim_key)
      errors.push(
        `claim_text for ${candidate.claim_key} must match the proposition text (apart from normalized punctuation)`,
      );
    if (
      candidate.span &&
      (candidate.span.start < 0 || candidate.span.end < candidate.span.start)
    )
      errors.push("interpretation span is invalid");
    if (clause && candidate.span) {
      const candidateLocation = locateSourceText(
        statement,
        candidate.claim_text,
        0,
      );
      const expectedSpan =
        candidateLocation === null
          ? null
          : utf8Span(statement, candidateLocation.start, candidateLocation.end);
      if (
        expectedSpan === null ||
        candidate.span.start !== expectedSpan.start ||
        candidate.span.end !== expectedSpan.end
      )
        errors.push(
          `interpretation span for ${candidate.claim_key} does not match the exact UTF-8 proposition span`,
        );
    }
    const semanticKey = validation.semanticKey;
    if (semanticKey !== undefined) {
      const prior = semanticKeys.get(candidate.claim_key);
      if (prior !== undefined && prior !== semanticKey)
        warnings.push(
          `Claim ${candidate.claim_key} has materially different interpretations; it remains unresolved until one is selected.`,
        );
      semanticKeys.set(candidate.claim_key, semanticKey);
    }
    return {
      claim_key: candidate.claim_key,
      ...(semanticKey ? { semantic_key: semanticKey } : {}),
      ...(validation.normalized
        ? { normalized_ir: validation.normalized }
        : {}),
      valid: errors.length === 0 && validation.valid,
      confidence,
      errors,
      warnings: validation.warnings,
      ...(validation.renderedProlog
        ? { rendered_prolog: validation.renderedProlog }
        : {}),
    };
  });
  if (interpretations.length > 3)
    warnings.push(
      "Only the first three interpretations are considered; submit materially distinct alternatives explicitly and resolve them before writing.",
    );
  return { results, warnings };
}

/**
 * The first quantifier over a collection or cardinality bound in a clause,
 * and the typed groundings that represent it. The proof ladder's
 * dimension_unrepresented gap uses the same words (requirement_proof.pl,
 * claim_quantifier/2): only, any and some mostly scope a condition, so they
 * are left out.
 */
export function claimDimension(
  text: string,
): SemanticPropositionDimension | undefined {
  const match =
    /\b(no more than|at least|at most|each|every|all|exactly)\b/i.exec(text);
  if (!match?.[1]) return undefined;
  const quantifier = match[1].toLowerCase().replaceAll(" ", "_");
  const bound = ["exactly", "at_least", "at_most", "no_more_than"].includes(
    quantifier,
  );
  return {
    quantifier,
    rewrites: bound ? ["bound"] : ["rule", "count", "set"],
  };
}

function propositionInventory(
  statement: string,
  clauses: readonly SemanticClause[],
  suggestions: readonly SemanticModelingSuggestion[],
  interpretations: readonly SemanticInterpretationResult[],
  inputPayloadHash: string,
): readonly SemanticProposition[] {
  const interpretationKeys = new Map<string, Set<string>>();
  for (const interpretation of interpretations) {
    if (!interpretation.valid || !interpretation.semantic_key) continue;
    const keys =
      interpretationKeys.get(interpretation.claim_key) ?? new Set<string>();
    keys.add(interpretation.semantic_key);
    interpretationKeys.set(interpretation.claim_key, keys);
  }
  let cursor = 0;
  return clauses.map((clause) => {
    const located = propositionSpan(statement, clause, cursor);
    cursor = located.next;
    const role = propositionRole(clause.text, clause.normative);
    const suggestion = suggestions.find(
      (candidate) => candidate.claim_key === clause.claim_key,
    );
    let status: SemanticPropositionStatus;
    let reason: string | undefined;
    const keys = interpretationKeys.get(clause.claim_key);
    const semanticKey = keys?.size === 1 ? [...keys][0] : undefined;
    if (keys && keys.size > 1) {
      status = "ambiguous";
      reason =
        "Materially different valid interpretations were submitted; confidence cannot choose between them.";
    } else if (semanticKey) {
      status = "modeled";
    } else if (
      role === "rationale" ||
      role === "example" ||
      role === "subjective"
    ) {
      status = "nonlogical";
      reason =
        "Prose is retained for human context but does not assert a verifiable domain proposition.";
    } else if (suggestion?.kind === "ambiguity_observation") {
      status = "ambiguous";
      reason = suggestion.rationale;
    } else if (suggestion?.kind === "ontology_gap") {
      status = "ontology_gap";
      reason = suggestion.rationale;
    } else {
      status = "missing";
      reason =
        "No accepted typed interpretation grounds this assertive proposition.";
    }
    const dimension =
      role === "normative" ? claimDimension(located.sourceText) : undefined;
    return {
      claim_key: clause.claim_key,
      claim_text: located.sourceText,
      role,
      status,
      span: located.span,
      payload_hash: inputPayloadHash,
      ...(semanticKey ? { semantic_key: semanticKey } : {}),
      ...(reason ? { reason } : {}),
      ...(dimension ? { dimension } : {}),
    };
  });
}

export function analyzeSemanticAdvisorInput(
  input: SemanticAdvisorInput,
): SemanticAdvisorAnalysisResult {
  const payload = input.payload;
  const requirement = isRequirement(payload);
  const statement = statementOf(payload) || proseOf(payload);
  const signals = requirement ? detectSignals(proseOf(payload)) : [];
  const clauses = statement
    ? extractSemanticClauses(
        statement,
        input.clauses ?? semanticClausesOf(payload),
      )
    : [];
  // rationale: detected clauses are cut from the prose itself, so only caller-supplied clauses can fail the verbatim check.
  // Stryker disable next-line ConditionalExpression
  if (input.clauses !== undefined) assertVerbatimClauses(statement, clauses);
  const declaredClaims = stringLogicClaims(propertiesOf(payload).logic_claims);
  const expectedClaims = clauses
    .filter(
      (clause) =>
        !["rationale", "example", "subjective"].includes(
          propositionRole(clause.text, clause.normative),
        ),
    )
    .map((clause) => clause.claim_key);
  const modeled =
    requirement &&
    isModeled(payload, expectedClaims) &&
    expectedClaims.every((claimKey) => declaredClaims.includes(claimKey));
  const interpretations = input.interpretations ?? [];
  const suggestions = modelingSuggestions(
    payload,
    modeled,
    clauses,
    expectedClaims,
    interpretations,
  );
  const interpreted = interpretationResults(
    interpretations,
    clauses,
    statement,
  );
  const propositions = propositionInventory(
    statement,
    clauses,
    suggestions,
    interpreted.results,
    payloadHash(payload),
  );
  const shadow = shadowAnalysis(statement, interpreted.results);
  const result = buildAdvisorResult(
    payload,
    signals,
    modeled,
    suggestions,
    clauses,
    propositions,
    interpreted.results,
    shadow,
  );
  return {
    receipt: result.receipt,
    warnings: [...result.warnings, ...interpreted.warnings],
  };
}
