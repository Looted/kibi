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
import { observationPlan } from "./observation-plan.js";
import { detectPredicateRules } from "./predicate-rule.js";
import { CORE_PREDICATE_RULES } from "./predicate-rules-core.js";
import { POLICY_PREDICATE_RULES } from "./predicate-rules-policy.js";
import { PRODUCT_TAIL_PREDICATE_RULES } from "./predicate-rules-product-tail.js";
import { PRODUCT_PREDICATE_RULES } from "./predicate-rules-product.js";
import {
  type Payload,
  type SemanticSourceField,
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
import { detectStrictSuggestion } from "./strict-rules.js";
import type {
  SemanticAdvisorAnalysisResult,
  SemanticAdvisorInput,
  SemanticAdvisorLane,
  SemanticInterpretationResult,
  SemanticModelingSuggestion,
  SemanticProposition,
  SemanticPropositionRole,
  SemanticPropositionStatus,
  SemanticShadowCue,
  SemanticShadowCueKind,
  SemanticSignal,
  SemanticSignalKind,
} from "./types.js";

export const SEMANTIC_ADVISOR_VERSION = "semantic-advisor-v2";
export { semanticClaimKey } from "./clauses.js";

type SignalPattern = {
  readonly kind: SemanticSignalKind;
  readonly candidateLane: SemanticAdvisorLane;
  readonly confidence: number;
  readonly pattern: RegExp;
};

const SIGNAL_PATTERNS = [
  {
    kind: "numeric_cardinality",
    candidateLane: "strict_property",
    confidence: 0.92,
    pattern:
      /\b(?:(?:at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to|cap(?:ped)?\s+at)\s+)?(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  },
  {
    kind: "numeric_threshold",
    candidateLane: "strict_property",
    confidence: 0.86,
    pattern:
      /\b(?:maximum|minimum|under|within|below|above|expires?|retained\s+for)\s+(?:\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
  },
  {
    kind: "conditional",
    candidateLane: "predicate",
    confidence: 0.82,
    pattern: /\b(?:if|when|unless|except|only\s+if|provided\s+that)\b/i,
  },
  {
    kind: "permission",
    candidateLane: "predicate",
    confidence: 0.8,
    pattern:
      /\b(?:only|may|can|allowed|denied|forbidden|must\s+not|cannot|can't)\b/i,
  },
  {
    kind: "state_or_default",
    candidateLane: "predicate",
    confidence: 0.74,
    pattern:
      /\b(?:state|mode|defaults?\s+to|ready|disabled|enabled|terminal)\b/i,
  },
  {
    kind: "normative_modal",
    candidateLane: "observation_review",
    confidence: 0.65,
    pattern: /\b(?:must|shall|should|may|must\s+not|cannot|can't)\b/i,
  },
] as const satisfies readonly SignalPattern[];

function proseOf(payload: Payload): string {
  const properties = propertiesOf(payload);
  return [
    properties.title,
    properties.semantic_text,
    properties.text_ref,
    properties.description,
  ]
    .map(stringValue)
    .filter(Boolean)
    .join("\n");
}

function isRequirement(payload: Payload): boolean {
  return stringValue(payload.type) === "req";
}

// implements REQ-kibi-logical-requirement-coverage
// implements REQ-skillopt-logical-evidence-fidelity
function logicalGroundingSlots(payload: Payload): number {
  const relationships = Array.isArray(payload.relationships)
    ? payload.relationships
    : [];
  return relationships.filter(
    (relationship) =>
      isRecord(relationship) &&
      ["requires_property", "requires_predicate", "requires_rule"].includes(
        stringValue(relationship.type),
      ),
  ).length;
}

function isModeled(
  payload: Payload,
  expectedClaimKeys: readonly string[],
): boolean {
  if (expectedClaimKeys.length === 0) return false;
  const relationships = Array.isArray(payload.relationships)
    ? payload.relationships
    : [];
  const types = new Set(
    relationships
      .filter(isRecord)
      .map((relationship) => stringValue(relationship.type))
      .filter(Boolean),
  );
  const rawInventory = propertiesOf(payload).semantic_inventory;
  const inventory = Array.isArray(rawInventory)
    ? rawInventory.filter(isRecord)
    : [];
  const modeledClaimKeys = inventory
    .filter(({ status }) => status === "modeled")
    .map(({ claim_key }) => stringValue(claim_key));
  return (
    logicalGroundingSlots(payload) === expectedClaimKeys.length &&
    modeledClaimKeys.length === expectedClaimKeys.length &&
    expectedClaimKeys.every((claimKey) =>
      modeledClaimKeys.includes(claimKey),
    ) &&
    ((types.has("constrains") && types.has("requires_property")) ||
      types.has("requires_predicate") ||
      types.has("requires_rule"))
  );
}

function detectSignals(prose: string): readonly SemanticSignal[] {
  const seen = new Set<SemanticSignalKind>();
  return SIGNAL_PATTERNS.flatMap((candidate) => {
    const evidence = prose.match(candidate.pattern)?.[0];
    if (!evidence || seen.has(candidate.kind)) return [];
    seen.add(candidate.kind);
    return [
      {
        kind: candidate.kind,
        evidence,
        candidate_lane: candidate.candidateLane,
        confidence: candidate.confidence,
      },
    ];
  });
}

function ambiguitySuggestion(
  payload: Payload,
  statement: string,
): SemanticModelingSuggestion | null {
  const match = statement.match(
    /\b(?<value>\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?<resource>active\s+sessions?|sessions?)\b/i,
  );
  if (
    !match?.groups?.value ||
    !match.groups.resource ||
    /at\s+most|at\s+least|exactly|no\s+more\s+than|up\s+to/i.test(statement)
  )
    return null;
  return {
    kind: "ambiguity_observation",
    claim_key: "",
    claim_text: statement,
    confidence: 0.78,
    evidence: `${match.groups.value} ${match.groups.resource}`,
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
    /\brate\s+limited\s+to\s+(?<count>\d+)\s+(?<action>[a-z][a-z\s_-]*?)\s+per\s+(?<window>[a-z]+)\b/i,
  );
  if (!match?.groups) return null;
  return {
    kind: "ontology_gap",
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
  return (
    detectPredicateRules(payload, statement, CORE_PREDICATE_RULES) ??
    detectPredicateRules(payload, statement, POLICY_PREDICATE_RULES) ??
    detectPredicateRules(payload, statement, PRODUCT_PREDICATE_RULES) ??
    detectPredicateRules(payload, statement, PRODUCT_TAIL_PREDICATE_RULES)
  );
}

function ruleSuggestion(
  payload: Payload,
  candidate: NonNullable<SemanticAdvisorInput["interpretations"]>[number],
): SemanticModelingSuggestion | null {
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
    confidence: candidate.confidence ?? 0.75,
    evidence: candidate.claim_text,
    rationale:
      "The host supplied a typed kibi.logic.v1 interpretation. Kibi validated its safety, canonicalized it, and will persist it as data-backed rule evidence.",
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
          title: `${candidate.ir.kind} rule ${semanticKey}`,
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

function modelingSuggestions(
  payload: Payload,
  modeled: boolean,
  clauses: readonly SemanticClause[],
  interpretations: SemanticAdvisorInput["interpretations"],
): readonly SemanticModelingSuggestion[] {
  if (!isRequirement(payload) || modeled) return [];
  const suggestions: SemanticModelingSuggestion[] = [];
  const seen = new Set<string>();
  const expectedClaimKeys = clauses
    .filter(
      (clause) =>
        !["rationale", "example", "subjective"].includes(
          propositionRole(clause.text, clause.normative),
        ),
    )
    .map((clause) => clause.claim_key);
  for (const clause of clauses) {
    const candidate = clause.text;
    const rawSuggestion =
      predicateSuggestion(payload, candidate) ??
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
    if (!suggestion) continue;
    const key = `${suggestion.claim_key}:${suggestion.kind}:${suggestion.evidence}:${suggestion.suggested_next_tool}`;
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push(suggestion);
    }
  }
  for (const interpretation of interpretations ?? []) {
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
    const key =
      withProvenance.kind === "rule"
        ? `${withProvenance.claim_key}:rule:${withProvenance.semantic_key}`
        : `${withProvenance.claim_key}:${withProvenance.kind}`;
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
  const clauseOffset = statement.indexOf(clause.text);
  const clauseSpan = utf8Span(
    statement || clause.text,
    clauseOffset >= 0 ? clauseOffset : 0,
    clauseOffset >= 0 ? clauseOffset + clause.text.length : clause.text.length,
  );
  const status =
    suggestion.kind === "ambiguity_observation"
      ? "ambiguous"
      : suggestion.kind === "ontology_gap"
        ? "ontology_gap"
        : "modeled";
  let inventoryCursor = 0;
  const semanticInventory = clauses.map((entry) => {
    const located = propositionSpan(statement, entry, inventoryCursor);
    inventoryCursor = located.next;
    const role = propositionRole(entry.text, entry.normative);
    const context = ["rationale", "example", "subjective"].includes(role);
    const entryStatus =
      entry.index === clause.index
        ? status
        : context
          ? "nonlogical"
          : "missing";
    return {
      claim_key: entry.claim_key,
      claim_text: entry.text,
      role,
      status: entryStatus,
      span: located.span,
      reason:
        entry.index === clause.index
          ? status === "modeled"
            ? "Draft apply plan contains a typed grounding for this proposition."
            : suggestion.rationale
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
  const applyPlan = suggestion.applyPlan.map((step) => {
    if (!isRecord(step)) return step;
    const properties = isRecord(step.properties) ? step.properties : null;
    if (properties === null) return step;
    if (step.type === "req") {
      const existing = Array.isArray(properties.logic_claims)
        ? properties.logic_claims.filter(
            (value): value is string => typeof value === "string",
          )
        : [];
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
    if (step.type !== "fact") return step;
    return {
      ...step,
      properties: {
        ...properties,
        claim_key: clause.claim_key,
        claim_text: clause.text,
        claim_span_start: clauseSpan.start,
        claim_span_end: clauseSpan.end,
      },
    };
  });
  return {
    ...suggestion,
    claim_key: clause.claim_key,
    claim_text: clause.text,
    applyPlan,
    ...(suggestion.kind === "predicate" && suggestion.relationshipPlan !== null
      ? {
          relationshipPlan: {
            ...suggestion.relationshipPlan,
            claimKey: clause.claim_key,
            claimText: clause.text,
            logicClaims: expectedClaimKeys,
            semanticClauses: clauses.map(({ text }) => text),
            semanticInventory,
            inventoryContract,
            instructions:
              "Create the predicate fact, merge the returned logicClaims into the requirement logic_claims manifest, then add requires_predicate without overwriting other requirement metadata.",
          },
        }
      : {}),
    ...(suggestion.kind === "rule" && suggestion.relationshipPlan !== null
      ? {
          relationshipPlan: {
            ...suggestion.relationshipPlan,
            claimKey: clause.claim_key,
            claimText: clause.text,
            logicClaims: expectedClaimKeys,
            semanticClauses: clauses.map(({ text }) => text),
            semanticInventory,
            inventoryContract,
            instructions:
              "Create the rule_schema and rule facts, merge the returned logicClaims into the requirement logic_claims manifest, then add requires_rule without overwriting other requirement metadata.",
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

function propositionRole(
  statement: string,
  normative: boolean,
): SemanticPropositionRole {
  if (/\b(?:for example|e\.g\.|such as|illustrative)\b/i.test(statement))
    return "example";
  if (
    /\b(?:because|so that|in order to| rationale|therefore)\b/i.test(statement)
  )
    return "rationale";
  if (
    /\b(?:feel|comfortable|looks complete|seems complete|subjective|prefer)\b/i.test(
      statement,
    )
  )
    return "subjective";
  if (/\b(?:means|defined as|refers to|is called)\b/i.test(statement))
    return "definition";
  if (/^\s*(?:if|when|whenever|provided that|only if)\b/i.test(statement))
    return "condition";
  if (/\b(?:unless|except|exempt|apart from)\b/i.test(statement))
    return "exception";
  if (normative) return "normative";
  return "descriptive";
}

function shadowAnalysis(
  text: string,
  interpretations: readonly SemanticInterpretationResult[],
): readonly SemanticShadowCue[] {
  const valid = interpretations.filter(
    (interpretation) => interpretation.valid,
  );
  const models = valid.flatMap(({ normalized_ir: ir }) => (ir ? [ir] : []));
  const containsExpressionKind = (kind: string): boolean => {
    const visit = (value: unknown): boolean => {
      if (!isRecord(value)) return false;
      if (value.kind === kind) return true;
      return Object.values(value).some((child) =>
        Array.isArray(child) ? child.some(visit) : visit(child),
      );
    };
    return models.some((model) => visit(model));
  };
  const hasModality = (modalities: readonly string[]): boolean =>
    models.some((model) => modalities.includes(model.modality));
  const hasNegativeAtom = (() => {
    const visit = (value: unknown): boolean => {
      if (!isRecord(value)) return false;
      if (value.kind === "not" || value.polarity === "negative") return true;
      return Object.values(value).some((child) =>
        Array.isArray(child) ? child.some(visit) : visit(child),
      );
    };
    return models.some((model) => visit(model));
  })();
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
      pattern: /\b(?:before|only after|requires?\s+.+?\s+before)\b/i,
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
        /\b\d+(?:\.\d+)?\b|\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i,
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
): { span: { start: number; end: number }; next: number } {
  const exact = text.indexOf(clause.text, cursor);
  const start = exact >= 0 ? exact : cursor;
  const end =
    exact >= 0
      ? exact + clause.text.length
      : Math.min(text.length, start + clause.text.length);
  return { span: utf8Span(text, start, end), next: Math.max(cursor, end) };
}

function interpretationResults(
  interpretations: SemanticAdvisorInput["interpretations"],
  clauses: readonly SemanticClause[],
  statement: string,
): {
  results: readonly SemanticInterpretationResult[];
  warnings: readonly string[];
} {
  if (interpretations === undefined) return { results: [], warnings: [] };
  const known = new Set(clauses.map((clause) => clause.claim_key));
  const semanticKeys = new Map<string, string>();
  const warnings: string[] = [];
  const results = interpretations.slice(0, 3).map((candidate) => {
    const confidence = Math.max(0, Math.min(1, candidate.confidence ?? 0.5));
    const validation = validateLogicIr(candidate.ir);
    const errors = [...validation.errors];
    const clause = clauses.find(
      (entry) => entry.claim_key === candidate.claim_key,
    );
    if (!known.has(candidate.claim_key))
      errors.push(
        `claim_key ${candidate.claim_key} is not present in the advisor proposition inventory`,
      );
    if (
      clause &&
      candidate.claim_text !== clause.text &&
      semanticClaimKey(candidate.claim_text) !== clause.claim_key
    )
      errors.push(
        `claim_text for ${candidate.claim_key} must match the proposition text (apart from normalized punctuation)`,
      );
    if (
      candidate.span &&
      (candidate.span.start < 0 || candidate.span.end < candidate.span.start)
    )
      errors.push("interpretation span is invalid");
    if (clause && candidate.span) {
      const candidateStart = statement.indexOf(candidate.claim_text);
      const clauseStart = statement.indexOf(clause.text);
      const sourceStart = candidateStart >= 0 ? candidateStart : clauseStart;
      const sourceEnd =
        sourceStart >= 0
          ? sourceStart +
            (candidateStart >= 0
              ? candidate.claim_text.length
              : clause.text.length)
          : 0;
      const expectedSpan = utf8Span(
        statement,
        Math.max(0, sourceStart),
        Math.max(0, sourceEnd),
      );
      if (
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
    return {
      claim_key: clause.claim_key,
      claim_text: clause.text,
      role,
      status,
      span: located.span,
      payload_hash: inputPayloadHash,
      ...(semanticKey ? { semantic_key: semanticKey } : {}),
      ...(reason ? { reason } : {}),
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
  const rawDeclaredClaims = propertiesOf(payload).logic_claims;
  const declaredClaims = Array.isArray(rawDeclaredClaims)
    ? rawDeclaredClaims.filter(
        (value: unknown): value is string => typeof value === "string",
      )
    : [];
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
    expectedClaims.length > 0 &&
    expectedClaims.every((claimKey) => declaredClaims.includes(claimKey));
  const suggestions = modelingSuggestions(
    payload,
    modeled,
    clauses,
    input.interpretations,
  );
  const interpreted = interpretationResults(
    input.interpretations,
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
