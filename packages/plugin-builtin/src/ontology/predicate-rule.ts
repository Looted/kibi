/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import type { OntologyMatchCandidate } from "kibi-plugin-sdk";
import {
  commaList,
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
} from "./normalize.js";

export {
  commaList,
  normalizeKey,
  normalizePredicateToken,
  normalizeSubjectKey,
  singularize,
};

// implements REQ-capability-plugin-builtin-parity-v1
export type MatchGroups = Readonly<Record<string, string | undefined>>;

// implements REQ-capability-plugin-builtin-parity-v1
export interface PredicateRule {
  readonly pattern: RegExp;
  readonly name: string;
  readonly args: (groups: MatchGroups) => readonly string[];
  readonly rationale: string;
  /** Declared argument count; must match args() length. Do not probe via args({}). */
  readonly arity: number;
  readonly argumentNames?: readonly string[];
  readonly argumentTypes?: readonly string[];
  /** Optional rich catalog schema id (e.g. FACT-SCHEMA-GUARD). */
  readonly catalogSchemaId?: string;
  readonly polarity?: "assert" | "deny";
  readonly accepts?: (statement: string) => boolean;
}

// implements REQ-capability-plugin-builtin-parity-v1
export const BUILTIN_PREDICATE_CONFIDENCE = 0.84;

// implements REQ-capability-plugin-builtin-parity-v1
export function schemaIdFor(predicateName: string, arity: number): string {
  return `builtin.${predicateName}.${arity}`;
}

/**
 * First-match semantics (identical to CLI detectPredicateRules): return at most
 * one candidate from the given rule set.
 */
// implements REQ-capability-plugin-builtin-parity-v1
export function detectPredicateRules(
  statement: string,
  rules: readonly PredicateRule[],
): OntologyMatchCandidate[] {
  for (const rule of rules) {
    if (rule.accepts && !rule.accepts(statement)) continue;
    const match = statement.match(rule.pattern);
    if (!match?.groups) continue;
    const args = rule.args(match.groups);
    if (args.length !== rule.arity) {
      throw new Error(
        `Predicate rule '${rule.name}' arity mismatch: declared ${rule.arity}, args() returned ${args.length}`,
      );
    }
    return [
      {
        schemaId: rule.catalogSchemaId ?? schemaIdFor(rule.name, rule.arity),
        predicateName: rule.name,
        arguments: args,
        polarity: rule.polarity ?? "assert",
        confidence: BUILTIN_PREDICATE_CONFIDENCE,
        evidence: match[0],
        rationale: rule.rationale,
      },
    ];
  }
  return [];
}
