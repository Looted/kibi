import { USAGE_HINTS_BY_PREDICATE } from "./predicate-catalog.js";
import { scoreExactPredicates1 } from "./predicate-score-1.js";
import { scoreExactPredicates2 } from "./predicate-score-2.js";
import { scoreExactPredicates3 } from "./predicate-score-3.js";
import type {
  PredicateSchemaCandidate,
  PredicateScoreComponents,
} from "./predicate-types.js";
import { matchesKeyword } from "./predicate-utils.js";

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "by",
  "can",
  "for",
  "from",
  "has",
  "have",
  "if",
  "in",
  "is",
  "it",
  "may",
  "must",
  "of",
  "on",
  "or",
  "should",
  "shall",
  "the",
  "their",
  "then",
  "this",
  "to",
  "when",
  "where",
  "with",
]);

// These words occur in many unrelated requirements. They remain available as
// evidence when a schema explicitly names them, but otherwise contribute less
// than domain aliases and usage guidance.
const BROAD_TERMS = new Set([
  "change",
  "changes",
  "component",
  "data",
  "published",
  "project",
  "state",
  "system",
  "value",
]);
const NORMATIVE_CUES = new Set([
  "allowed",
  "can",
  "cannot",
  "denied",
  "forbidden",
  "may",
  "only",
  "prohibited",
  "required",
]);

const EXACT_SCORERS = [
  scoreExactPredicates1,
  scoreExactPredicates2,
  scoreExactPredicates3,
];

function tokens(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function stem(value: string): string {
  if (value.length > 5 && value.endsWith("ies"))
    return `${value.slice(0, -3)}y`;
  if (value.length > 4 && value.endsWith("ing")) return value.slice(0, -3);
  if (value.length > 4 && value.endsWith("ed")) return value.slice(0, -2);
  if (value.length > 4 && value.endsWith("s")) return value.slice(0, -1);
  return value;
}

function meaningfulTokens(value: string): string[] {
  return tokens(value).filter((token) => !STOPWORDS.has(token));
}

function overlap(left: readonly string[], right: readonly string[]): number {
  const target = new Set(
    right.map(stem).filter((token) => !STOPWORDS.has(token)),
  );
  const matches = new Set(
    left
      .map(stem)
      .filter((token) => !STOPWORDS.has(token) && target.has(token)),
  );
  return target.size === 0 ? 0 : matches.size / target.size;
}

function roundScore(value: number): number {
  return Math.round(Math.max(0, Math.min(0.98, value)) * 100) / 100;
}

function exactScore(
  schema: PredicateSchemaCandidate,
  text: string,
): number | null {
  for (const scorer of EXACT_SCORERS) {
    const score = scorer(schema, text);
    if (score !== null) return score;
  }
  return null;
}

function meaningfulKeywordHits(
  schema: PredicateSchemaCandidate,
  text: string,
): number {
  const lower = text.toLowerCase();
  return schema.keywords.filter((keyword) => {
    const keywordTokens = tokens(keyword).filter(
      (token) => !STOPWORDS.has(token) || NORMATIVE_CUES.has(token),
    );
    return (
      keywordTokens.length > 0 &&
      matchesKeyword(text, lower, keyword) &&
      keywordTokens.some(
        (token) => !BROAD_TERMS.has(token) || NORMATIVE_CUES.has(token),
      )
    );
  }).length;
}

function specificityBonus(schema: PredicateSchemaCandidate): number {
  const signature = [
    schema.predicate_name,
    ...(schema.aliases ?? []),
    ...(schema.paraphrase_templates ?? []),
  ].join(" ");
  const domainTokens = meaningfulTokens(signature).filter(
    (token) => !BROAD_TERMS.has(token),
  );
  // A project-local bridge with a broad signature remains discoverable but
  // loses a small deterministic tie-break to a narrower reusable schema.
  const bridgePenalty =
    schema.predicate_name === "plugin_launcher_contract" ? 0.04 : 0;
  return roundScore(Math.min(0.1, domainTokens.length * 0.006) - bridgePenalty);
}

export interface RankedPredicateSchema {
  schema: PredicateSchemaCandidate;
  score: number;
  components: PredicateScoreComponents;
}

export function usageHintsForSchema(schema: PredicateSchemaCandidate) {
  return schema.usage_hints ?? USAGE_HINTS_BY_PREDICATE[schema.predicate_name];
}

// Retrieval/ranking is intentionally independent of semantic eligibility.
// Callers must run evaluateSemanticApplicability before treating this score as
// a recommendation.
export function rankSchema(
  schema: PredicateSchemaCandidate,
  text: string,
): RankedPredicateSchema {
  const exact = exactScore(schema, text);
  const keywordHits = meaningfulKeywordHits(schema, text);
  const textTokens = meaningfulTokens(text);
  const descriptors = [
    schema.predicate_name,
    schema.title,
    schema.description,
    ...(schema.aliases ?? []),
    ...(schema.paraphrase_templates ?? []),
    ...schema.examples,
  ];
  const descriptorOverlap = Math.max(
    ...descriptors.map((descriptor) => overlap(textTokens, tokens(descriptor))),
    0,
  );
  const usageHints = usageHintsForSchema(schema);
  const usageMatch = Math.max(
    ...(usageHints?.use_when ?? []).map((descriptor) =>
      overlap(textTokens, tokens(descriptor)),
    ),
    0,
  );
  const negativeEvidence = Math.max(
    ...(usageHints?.do_not_use_when ?? []).map((descriptor) =>
      overlap(textTokens, tokens(descriptor)),
    ),
    0,
  );
  const broadTokenPenalty = Math.min(
    0.18,
    meaningfulTokens(text).filter(
      (token) => BROAD_TERMS.has(token) && !schema.keywords.includes(token),
    ).length * 0.025,
  );
  const morphologyHits = schema.keywords.filter((keyword) =>
    textTokens.map(stem).includes(stem(keyword.toLowerCase())),
  ).length;
  const specificity = specificityBonus(schema);

  let total: number;
  if (exact !== null) {
    // Exact structural matches retain the established deterministic score.
    total = exact;
  } else if (
    keywordHits === 0 &&
    morphologyHits === 0 &&
    descriptorOverlap < 0.25 &&
    usageMatch < 0.25
  ) {
    total = 0;
  } else {
    const normalized = keywordHits / Math.max(3, schema.keywords.length / 2);
    total =
      0.18 +
      normalized * 0.34 +
      keywordHits * 0.045 +
      morphologyHits * 0.035 +
      descriptorOverlap * 0.27 +
      usageMatch * 0.16 -
      negativeEvidence * 0.24 -
      broadTokenPenalty +
      specificity;
  }
  if (schema.predicate_name === "plugin_launcher_contract") total -= 0.06;
  const components: PredicateScoreComponents = {
    exact_pattern: roundScore(exact ?? 0),
    keyword_hits: keywordHits,
    descriptor_overlap: roundScore(descriptorOverlap),
    usage_match: roundScore(usageMatch),
    negative_evidence: roundScore(negativeEvidence),
    broad_token_penalty: roundScore(broadTokenPenalty),
    specificity_bonus: specificity,
    total: roundScore(total),
  };
  return { schema, score: components.total, components };
}

// Backward-compatible numeric API used by migration planning and downstream
// integrations. New callers should use rankSchema for diagnostics.
export function scoreSchema(
  schema: PredicateSchemaCandidate,
  text: string,
): number {
  return rankSchema(schema, text).score;
}
