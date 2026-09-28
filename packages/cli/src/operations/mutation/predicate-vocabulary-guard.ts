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

import {
  parseEntityFromList,
  parseListOfLists,
  toPrologAtom,
} from "../../prolog/codec.js";
import type { PrologPort } from "../../public/operations/runtime-types.js";
import {
  predicateArgumentConformance,
  predicateVocabularyFromEntity,
} from "../modeling/predicate-vocabulary.js";

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

/**
 * Reject a predicate fact whose arguments fall outside the constants its
 * project-local schema declares. An alias is rejected too, with the declared
 * constant to use instead, so new facts never need migrating.
 */
// implements REQ-kibi-predicate-argument-constants
export async function assertPredicateArgumentVocabulary(
  prolog: Pick<PrologPort, "query">,
  entity: Readonly<Record<string, unknown>>,
): Promise<void> {
  if (entity.type !== "fact" || entity.fact_kind !== "predicate") return;
  const name = text(entity.predicate_name);
  const args = Array.isArray(entity.predicate_args)
    ? entity.predicate_args.filter(
        (value): value is string => typeof value === "string",
      )
    : [];
  if (name === undefined || args.length === 0) return;
  const namespace = text(entity.predicate_namespace) ?? "default";
  const result = await prolog.query(
    `findall([Id,'fact',Props], (kb:predicate_schema(Id, Namespace, Name, Arity, _Names, _Types), Name == ${toPrologAtom(name)}, Namespace == ${toPrologAtom(namespace)}, Arity =:= ${args.length}, kb_entity(Id, 'fact', Props)), Results)`,
  );
  if (!result.success) {
    throw new Error(
      `Predicate schema lookup failed: ${result.error ?? "unknown error"}`,
    );
  }
  const schemas = result.bindings.Results
    ? parseListOfLists(result.bindings.Results).map(parseEntityFromList)
    : [];
  const problems: string[] = [];
  for (const schema of schemas) {
    const argumentNames = Array.isArray(schema.argument_names)
      ? schema.argument_names.map(String)
      : [];
    const conformance = predicateArgumentConformance(
      argumentNames,
      args,
      predicateVocabularyFromEntity(schema),
    );
    for (const rewrite of conformance.rewrites) {
      problems.push(
        `argument ${rewrite.argumentName} uses alias ${rewrite.from}; use the declared constant ${rewrite.to} (${String(schema.id)})`,
      );
    }
    for (const value of conformance.undeclared) {
      problems.push(
        `argument ${value.argumentName} value ${value.value} is not declared by ${String(schema.id)}; allowed: ${value.allowed.join(", ")}`,
      );
    }
  }
  if (problems.length > 0) {
    throw new Error(
      `Entity validation failed: ${problems.join("; ")}. Use a declared constant, or extend the schema's argument_constants when the value is genuinely new.`,
    );
  }
}
