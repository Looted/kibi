import { buildAdvisorResult } from "./analysis-receipt.js";
import { type SemanticClause, extractSemanticClauses } from "./clauses.js";
import { observationPlan } from "./observation-plan.js";
import { detectPredicateRules } from "./predicate-rule.js";
import { CORE_PREDICATE_RULES } from "./predicate-rules-core.js";
import { POLICY_PREDICATE_RULES } from "./predicate-rules-policy.js";
import { PRODUCT_TAIL_PREDICATE_RULES } from "./predicate-rules-product-tail.js";
import { PRODUCT_PREDICATE_RULES } from "./predicate-rules-product.js";
import {
  type Payload,
  isRecord,
  propertiesOf,
  statementOf,
  stringValue,
} from "./shared.js";
import { detectStrictSuggestion } from "./strict-rules.js";
import type {
  SemanticAdvisorAnalysisResult,
  SemanticAdvisorInput,
  SemanticAdvisorLane,
  SemanticModelingSuggestion,
  SemanticSignal,
  SemanticSignalKind,
} from "./types.js";

export const SEMANTIC_ADVISOR_VERSION = "semantic-advisor-v1";
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
  return [properties.title, properties.text_ref, properties.description]
    .map(stringValue)
    .filter(Boolean)
    .join("\n");
}

function isRequirement(payload: Payload): boolean {
  return stringValue(payload.type) === "req";
}

function isModeled(payload: Payload): boolean {
  const relationships = Array.isArray(payload.relationships)
    ? payload.relationships
    : [];
  const types = new Set(
    relationships
      .filter(isRecord)
      .map((relationship) => stringValue(relationship.type))
      .filter(Boolean),
  );
  return (
    (types.has("constrains") && types.has("requires_property")) ||
    types.has("requires_predicate")
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

function modelingSuggestions(
  payload: Payload,
  modeled: boolean,
  clauses: readonly SemanticClause[],
): readonly SemanticModelingSuggestion[] {
  if (!isRequirement(payload) || modeled) return [];
  const suggestions: SemanticModelingSuggestion[] = [];
  const seen = new Set<string>();
  const expectedClaimKeys = clauses
    .filter((clause) => clause.normative)
    .map((clause) => clause.claim_key);
  const rawDeclaredClaimKeys = propertiesOf(payload).logic_claims;
  const declaredClaimKeys = Array.isArray(rawDeclaredClaimKeys)
    ? rawDeclaredClaimKeys.filter(
        (value: unknown): value is string => typeof value === "string",
      )
    : [];
  const mergedClaimKeys = Array.from(
    new Set([...declaredClaimKeys, ...expectedClaimKeys]),
  );
  for (const clause of clauses) {
    const candidate = clause.text;
    const rawSuggestion =
      predicateSuggestion(payload, candidate) ??
      ontologyGapSuggestion(payload, candidate) ??
      ambiguitySuggestion(payload, candidate) ??
      detectStrictSuggestion(payload, candidate);
    const suggestion = rawSuggestion
      ? withClauseProvenance(rawSuggestion, clause, mergedClaimKeys)
      : clause.normative
        ? unmatchedClauseSuggestion(payload, clause, mergedClaimKeys)
        : null;
    if (!suggestion) continue;
    const key = `${suggestion.claim_key}:${suggestion.kind}:${suggestion.evidence}:${suggestion.suggested_next_tool}`;
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push(suggestion);
    }
  }
  return suggestions;
}

function withClauseProvenance(
  suggestion: SemanticModelingSuggestion,
  clause: SemanticClause,
  expectedClaimKeys: readonly string[],
): SemanticModelingSuggestion {
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
            instructions:
              "Create the predicate fact, merge the returned logicClaims into the requirement logic_claims manifest, then add requires_predicate without overwriting other requirement metadata.",
          },
        }
      : {}),
  };
}

function unmatchedClauseSuggestion(
  payload: Payload,
  clause: SemanticClause,
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
    expectedClaimKeys,
  );
}

export function analyzeSemanticAdvisorInput(
  input: SemanticAdvisorInput,
): SemanticAdvisorAnalysisResult {
  const payload = input.payload;
  const requirement = isRequirement(payload);
  const signals = requirement ? detectSignals(proseOf(payload)) : [];
  const clauses = requirement
    ? extractSemanticClauses(statementOf(payload), input.clauses)
    : [];
  const rawDeclaredClaims = propertiesOf(payload).logic_claims;
  const declaredClaims = Array.isArray(rawDeclaredClaims)
    ? rawDeclaredClaims.filter(
        (value: unknown): value is string => typeof value === "string",
      )
    : [];
  const expectedClaims = clauses
    .filter((clause) => clause.normative)
    .map((clause) => clause.claim_key);
  const modeled =
    requirement &&
    isModeled(payload) &&
    expectedClaims.length > 0 &&
    expectedClaims.every((claimKey) => declaredClaims.includes(claimKey));
  const suggestions = modelingSuggestions(payload, modeled, clauses);
  return buildAdvisorResult(payload, signals, modeled, suggestions, clauses);
}
