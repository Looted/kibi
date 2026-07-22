import type { PredicateSchemaCandidate } from "./predicate-types.js";
import { matchesKeyword } from "./predicate-utils.js";
import { scoreExactPredicates1 } from "./predicate-score-1.js";
import { scoreExactPredicates2 } from "./predicate-score-2.js";
import { scoreExactPredicates3 } from "./predicate-score-3.js";

const EXACT_SCORERS = [scoreExactPredicates1, scoreExactPredicates2, scoreExactPredicates3];

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
  if (keywordHits === 0) return 0;

  const normalized = keywordHits / Math.max(3, schema.keywords.length / 2);
  const score = Math.min(0.98, 0.24 + normalized * 0.5 + keywordHits * 0.06);
  return Math.round(score * 100) / 100;
}
