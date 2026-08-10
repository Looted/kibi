import { scoreExactPredicates1 } from "./predicate-score-1.js";
import { scoreExactPredicates2 } from "./predicate-score-2.js";
import { scoreExactPredicates3 } from "./predicate-score-3.js";
import type { PredicateSchemaCandidate } from "./predicate-types.js";
import { matchesKeyword } from "./predicate-utils.js";

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

function overlap(left: readonly string[], right: readonly string[]): number {
  const target = new Set(right.map(stem));
  const matches = new Set(left.map(stem).filter((token) => target.has(token)));
  return target.size === 0 ? 0 : matches.size / target.size;
}

const EXACT_SCORERS = [
  scoreExactPredicates1,
  scoreExactPredicates2,
  scoreExactPredicates3,
];

// implements REQ-mcp-suggest-predicates
export function scoreSchema(
  schema: PredicateSchemaCandidate,
  text: string,
): number {
  for (const scorer of EXACT_SCORERS) {
    const score = scorer(schema, text);
    if (score !== null) return score;
  }
  const lower = text.toLowerCase();
  const keywordHits = schema.keywords.filter((keyword) =>
    matchesKeyword(text, lower, keyword),
  ).length;
  const textTokens = tokens(text);
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
  const useWhenOverlap = Math.max(
    ...(schema.usage_hints?.use_when ?? []).map((descriptor) =>
      overlap(textTokens, tokens(descriptor)),
    ),
    0,
  );
  const doNotUseWhenOverlap = Math.max(
    ...(schema.usage_hints?.do_not_use_when ?? []).map((descriptor) =>
      overlap(textTokens, tokens(descriptor)),
    ),
    0,
  );
  const morphologyHits = schema.keywords.filter((keyword) =>
    textTokens.map(stem).includes(stem(keyword.toLowerCase())),
  ).length;
  if (keywordHits === 0 && morphologyHits === 0 && descriptorOverlap < 0.25)
    return 0;

  const normalized = keywordHits / Math.max(3, schema.keywords.length / 2);
  const score = Math.min(
    0.98,
    Math.max(
      0,
      0.2 +
        normalized * 0.4 +
        keywordHits * 0.05 +
        morphologyHits * 0.04 +
        descriptorOverlap * 0.3 +
        useWhenOverlap * 0.08 -
        doNotUseWhenOverlap * 0.18,
    ),
  );
  return Math.round(score * 100) / 100;
}
