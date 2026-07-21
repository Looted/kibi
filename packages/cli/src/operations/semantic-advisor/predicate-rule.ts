import {
  type MatchGroups,
  type Payload,
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  predicateSuggestion,
  singularize,
} from "./shared.js";
import type { SemanticModelingSuggestion } from "./types.js";

export {
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
};

export interface PredicateRule {
  readonly pattern: RegExp;
  readonly name: string;
  readonly args: (groups: MatchGroups) => readonly string[];
  readonly rationale: string;
  readonly polarity?: "assert" | "deny";
  readonly accepts?: (statement: string) => boolean;
}

// implements REQ-mcp-semantic-advisor-preflight
export function detectPredicateRules(
  payload: Payload,
  statement: string,
  rules: readonly PredicateRule[],
): SemanticModelingSuggestion | null {
  for (const rule of rules) {
    if (rule.accepts && !rule.accepts(statement)) continue;
    const match = statement.match(rule.pattern);
    if (!match?.groups) continue;
    return predicateSuggestion(
      payload,
      match[0],
      rule.name,
      rule.args(match.groups),
      rule.rationale,
      rule.polarity,
    );
  }
  return null;
}

// implements REQ-mcp-semantic-advisor-preflight
export function commaList(
  value: string,
  separator: RegExp = /,|\band\b/i,
): string {
  return value
    .split(separator)
    .map((part) => normalizeKey(part.trim()))
    .filter(Boolean)
    .join(",");
}
