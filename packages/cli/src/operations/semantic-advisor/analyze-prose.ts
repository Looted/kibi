import { buildAdvisorResult } from "./analysis-receipt.js";
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
): readonly SemanticModelingSuggestion[] {
  if (!isRequirement(payload) || modeled) return [];
  const statement = statementOf(payload);
  if (!statement) return [];
  const whole = statement.trim().replace(/[.]+$/g, "");
  const split = statement
    .split(
      /\s+and\s+(?=[a-z][a-z\s_-]*(?:expire|must|shall|should|default|transition|states?\s+are))/i,
    )
    .map((part) => part.trim().replace(/[.]+$/g, ""))
    .filter(Boolean);
  const statements = Array.from(
    new Set(
      /\bmutually\s+exclusive\b/i.test(statement) ? [whole, ...split] : split,
    ),
  );
  const suggestions: SemanticModelingSuggestion[] = [];
  const seen = new Set<string>();
  for (const candidate of statements) {
    const suggestion =
      predicateSuggestion(payload, candidate) ??
      ontologyGapSuggestion(payload, candidate) ??
      ambiguitySuggestion(payload, candidate) ??
      detectStrictSuggestion(payload, candidate);
    if (!suggestion) continue;
    const key = `${suggestion.kind}:${suggestion.evidence}:${suggestion.suggested_next_tool}`;
    if (!seen.has(key)) {
      seen.add(key);
      suggestions.push(suggestion);
    }
  }
  return suggestions;
}

export function analyzeSemanticAdvisorInput(
  input: SemanticAdvisorInput,
): SemanticAdvisorAnalysisResult {
  const payload = input.payload;
  const requirement = isRequirement(payload);
  const signals = requirement ? detectSignals(proseOf(payload)) : [];
  const modeled = requirement && isModeled(payload);
  const suggestions = modelingSuggestions(payload, modeled);
  return buildAdvisorResult(payload, signals, modeled, suggestions);
}
