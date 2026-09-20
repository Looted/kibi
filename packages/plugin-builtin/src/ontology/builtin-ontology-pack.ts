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

import type {
  OntologyMatchCandidate,
  OntologyMatchContext,
  OntologyPackV1,
  PredicateSchemaDefinition,
} from "kibi-plugin-sdk";
import { detectPredicateRules, schemaIdFor, type PredicateRule } from "./predicate-rule.js";
import { CORE_PREDICATE_RULES } from "./predicate-rules-core.js";
import { LAUNCHER_PREDICATE_RULES } from "./predicate-rules-launcher.js";
import { POLICY_PREDICATE_RULES } from "./predicate-rules-policy.js";
import { PRODUCT_PREDICATE_RULES } from "./predicate-rules-product.js";
import { PRODUCT_TAIL_PREDICATE_RULES } from "./predicate-rules-product-tail.js";

/** Same evaluation order as CLI analyze-prose predicate detection. */
// implements REQ-capability-plugin-builtin-parity-v1
export const BUILTIN_PREDICATE_RULE_SETS: readonly (readonly PredicateRule[])[] =
  [
    LAUNCHER_PREDICATE_RULES,
    CORE_PREDICATE_RULES,
    POLICY_PREDICATE_RULES,
    PRODUCT_PREDICATE_RULES,
    PRODUCT_TAIL_PREDICATE_RULES,
  ];

function deriveSchemas(
  ruleSets: readonly (readonly PredicateRule[])[],
): readonly PredicateSchemaDefinition[] {
  const byId = new Map<string, PredicateSchemaDefinition>();
  for (const rules of ruleSets) {
    for (const rule of rules) {
      const schemaId =
        rule.catalogSchemaId ?? schemaIdFor(rule.name, rule.arity);
      if (byId.has(schemaId)) continue;
      const argumentNames =
        rule.argumentNames ??
        Array.from({ length: rule.arity }, (_, i) => `arg${i}`);
      const argumentTypes =
        rule.argumentTypes ??
        Array.from({ length: rule.arity }, () => "string");
      byId.set(schemaId, {
        schemaId,
        predicateName: rule.name,
        argumentNames,
        argumentTypes,
        title: rule.name,
        description: rule.rationale,
      });
    }
  }
  return [...byId.values()];
}

const BUILTIN_SCHEMAS = deriveSchemas(BUILTIN_PREDICATE_RULE_SETS);

// implements REQ-capability-plugin-builtin-parity-v1
export class BuiltinOntologyPack implements OntologyPackV1 {
  readonly id = "kibi-plugin-builtin.ontology";

  schemas(): readonly PredicateSchemaDefinition[] {
    return BUILTIN_SCHEMAS;
  }

  match(input: OntologyMatchContext): readonly OntologyMatchCandidate[] {
    const statement = input.statement.trim();
    if (!statement) return [];
    for (const rules of BUILTIN_PREDICATE_RULE_SETS) {
      const hits = detectPredicateRules(statement, rules);
      if (hits.length > 0) return hits;
    }
    return [];
  }
}

// implements REQ-capability-plugin-builtin-parity-v1
export function createBuiltinOntologyPack(): OntologyPackV1 {
  return new BuiltinOntologyPack();
}
