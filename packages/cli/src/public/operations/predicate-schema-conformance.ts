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

import { BUILT_IN_PREDICATE_SCHEMAS } from "../../operations/modeling/predicate-catalog.js";
import {
  type ArgumentRewrite,
  type UndeclaredArgument,
  applyArgumentRewrites,
  predicateArgumentConformance,
  predicateCanonicalKey,
  predicateVocabularyErrors,
  predicateVocabularyFromEntity,
} from "../../operations/modeling/predicate-vocabulary.js";
import type { Violation } from "../../utils/rule-registry.js";
import entitySchema from "../schemas/entity.js";
import { loadEntitiesPaged } from "./discovery-entities.js";
import type { PrologPort } from "./runtime-types.js";

const RULE = "predicate-schema-conformance";

/** Every property the public entity schema accepts. */
const AUTHORED_FIELDS: ReadonlySet<string> = new Set(
  Object.keys(entitySchema.properties as Record<string, unknown>),
);
const DEFAULT_NAMESPACE = "default";

/** Fields that belong to the compiled entity, not to an authored upsert. */
const NON_AUTHORED_FIELDS = new Set([
  "id",
  "type",
  "source",
  "sourceFile",
  "created_at",
  "updated_at",
  "links",
  "relationships",
]);

type Entity = Readonly<Record<string, unknown>>;

type SchemaRef = Readonly<{
  schemaId: string;
  namespace: string;
  origin: "project_local" | "built_in";
  argumentNames: readonly string[];
  entity?: Entity;
}>;

/**
 * Exact kb_upsert input that repairs one predicate fact mechanically: move it
 * to the only namespace whose schema matches, and/or replace alias spellings
 * with their declared constants. Present only when nothing is left for review.
 */
// implements REQ-kibi-predicate-vocabulary-migration
export type PredicateFactRepair = Readonly<{
  type: "fact";
  id: string;
  properties: Readonly<Record<string, unknown>>;
}>;

// implements REQ-kibi-predicate-vocabulary-migration
export type PredicateConformanceEvidence = Readonly<{
  factId: string;
  predicateName: string;
  namespace: string;
  arity: number;
  issue: "missing_schema" | "undeclared_constant" | "alias_in_use";
  schemaId: string | null;
  alignment: Readonly<{
    namespace: string;
    schemaId: string;
    origin: "project_local" | "built_in";
  }> | null;
  candidateNamespaces: readonly string[];
  rewrites: readonly ArgumentRewrite[];
  undeclared: readonly UndeclaredArgument[];
  repair: PredicateFactRepair | null;
}>;

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
}

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function sourceField(entity: Entity): { source?: string } {
  const source = text(entity.source);
  return source !== undefined ? { source } : {};
}

function namespaceOf(entity: Entity): string {
  return text(entity.predicate_namespace) ?? DEFAULT_NAMESPACE;
}

function signature(namespace: string, name: string, arity: number): string {
  return `${namespace}:${name}/${arity}`;
}

function schemaRefs(facts: readonly Entity[]): Map<string, SchemaRef[]> {
  const byName = new Map<string, SchemaRef[]>();
  const add = (name: string, ref: SchemaRef) => {
    byName.set(name, [...(byName.get(name) ?? []), ref]);
  };
  for (const entity of facts) {
    if (entity.fact_kind !== "predicate_schema") continue;
    const name = text(entity.predicate_name);
    if (name === undefined) continue;
    add(name, {
      schemaId: String(entity.id),
      namespace: namespaceOf(entity),
      origin: "project_local",
      argumentNames: strings(entity.argument_names),
      entity,
    });
  }
  // Built-in catalog schemas carry no namespace: facts that use them live in
  // the default namespace. A project-local schema with the same signature wins.
  for (const schema of BUILT_IN_PREDICATE_SCHEMAS) {
    add(schema.predicate_name, {
      schemaId: schema.id,
      namespace: DEFAULT_NAMESPACE,
      origin: "built_in",
      argumentNames: schema.argument_names,
    });
  }
  return byName;
}

function authoredProperties(entity: Entity): Record<string, unknown> {
  // Keep only fields an upsert accepts. Query rows also carry relationship
  // projections (relates_to, validates, ...) as strings or lists, which must
  // never be replayed as entity properties.
  return Object.fromEntries(
    Object.entries(entity).filter(
      ([key, value]) =>
        AUTHORED_FIELDS.has(key) &&
        !NON_AUTHORED_FIELDS.has(key) &&
        value !== null &&
        value !== undefined,
    ),
  );
}

function repairFor(
  fact: Entity,
  name: string,
  args: readonly string[],
  targetNamespace: string | null,
  rewrites: readonly ArgumentRewrite[],
): PredicateFactRepair {
  const nextArgs = applyArgumentRewrites(args, rewrites);
  const properties = authoredProperties(fact);
  const previousKey = predicateCanonicalKey(name, args);
  const nextKey = predicateCanonicalKey(name, nextArgs);
  if (targetNamespace !== null)
    properties.predicate_namespace = targetNamespace;
  if (rewrites.length > 0) {
    properties.predicate_args = nextArgs;
    properties.canonical_key = nextKey;
    if (properties.title === `Predicate: ${previousKey}`) {
      properties.title = `Predicate: ${nextKey}`;
    }
  }
  return { type: "fact", id: String(fact.id), properties };
}

/**
 * Predicate facts must match a schema (project-local, or the built-in catalog
 * in the default namespace) with the same namespace, name, and arity, and
 * must use declared constants where the schema closes an argument.
 */
// implements REQ-kibi-predicate-schema-conformance
export function evaluatePredicateSchemaConformance(
  facts: readonly Entity[],
): Violation[] {
  const schemasByName = schemaRefs(facts);
  const violations: Violation[] = [];

  for (const schema of facts) {
    if (schema.fact_kind !== "predicate_schema") continue;
    const errors = predicateVocabularyErrors(schema);
    if (errors.length === 0) continue;
    violations.push({
      rule: RULE,
      entityId: String(schema.id),
      description: `Predicate schema ${String(schema.id)} declares an invalid argument vocabulary: ${errors.join("; ")}`,
      suggestion:
        "Key argument_constants and argument_aliases by argument_names, and map every alias to a declared constant.",
      ...sourceField(schema),
      evidence: { schemaId: String(schema.id), errors },
    });
  }

  for (const fact of facts) {
    if (fact.fact_kind !== "predicate") continue;
    const name = text(fact.predicate_name);
    const args = strings(fact.predicate_args);
    if (name === undefined || args.length === 0) continue;
    const namespace = namespaceOf(fact);
    const arity = args.length;
    const sameShape = (schemasByName.get(name) ?? []).filter(
      (ref) => ref.argumentNames.length === arity,
    );
    const exact =
      sameShape.find(
        (ref) => ref.namespace === namespace && ref.origin === "project_local",
      ) ??
      sameShape.find(
        (ref) => ref.namespace === namespace && ref.origin === "built_in",
      );
    const candidates = [
      ...new Map(
        sameShape
          .filter((ref) => ref.namespace !== namespace)
          .map((ref) => [ref.namespace, ref]),
      ).values(),
    ];
    const alignment =
      exact === undefined && candidates.length === 1
        ? candidates[0]
        : undefined;
    const schema = exact ?? alignment;
    const conformance =
      schema?.entity !== undefined
        ? predicateArgumentConformance(
            schema.argumentNames,
            args,
            predicateVocabularyFromEntity(schema.entity),
          )
        : { rewrites: [], undeclared: [] };

    if (
      exact !== undefined &&
      conformance.rewrites.length === 0 &&
      conformance.undeclared.length === 0
    ) {
      continue;
    }

    const issue: PredicateConformanceEvidence["issue"] =
      exact === undefined
        ? "missing_schema"
        : conformance.undeclared.length > 0
          ? "undeclared_constant"
          : "alias_in_use";
    const mechanical =
      schema !== undefined && conformance.undeclared.length === 0;
    const evidence: PredicateConformanceEvidence = {
      factId: String(fact.id),
      predicateName: name,
      namespace,
      arity,
      issue,
      schemaId: exact?.schemaId ?? null,
      alignment:
        alignment !== undefined
          ? {
              namespace: alignment.namespace,
              schemaId: alignment.schemaId,
              origin: alignment.origin,
            }
          : null,
      candidateNamespaces: candidates.map((ref) => ref.namespace).sort(),
      rewrites: conformance.rewrites,
      undeclared: conformance.undeclared,
      repair: mechanical
        ? repairFor(
            fact,
            name,
            args,
            alignment?.namespace ?? null,
            conformance.rewrites,
          )
        : null,
    };
    violations.push({
      rule: RULE,
      entityId: String(fact.id),
      description: conformanceDescription(evidence),
      suggestion: conformanceSuggestion(evidence),
      ...sourceField(fact),
      evidence,
    });
  }
  return violations;
}

function conformanceDescription(
  evidence: PredicateConformanceEvidence,
): string {
  const where = signature(
    evidence.namespace,
    evidence.predicateName,
    evidence.arity,
  );
  const parts: string[] = [];
  if (evidence.issue === "missing_schema") {
    parts.push(
      evidence.alignment !== null
        ? `Predicate fact ${evidence.factId} uses ${where}, but its schema ${evidence.alignment.schemaId} is in namespace ${evidence.alignment.namespace}`
        : evidence.candidateNamespaces.length > 1
          ? `Predicate fact ${evidence.factId} uses ${where}; schemas with this signature exist in several namespaces (${evidence.candidateNamespaces.join(", ")})`
          : `Predicate fact ${evidence.factId} uses ${where}, which has no predicate_schema`,
    );
  } else {
    parts.push(`Predicate fact ${evidence.factId} (${where})`);
  }
  for (const rewrite of evidence.rewrites) {
    parts.push(
      `argument ${rewrite.argumentName} uses alias ${rewrite.from} for ${rewrite.to}`,
    );
  }
  for (const value of evidence.undeclared) {
    parts.push(
      `argument ${value.argumentName} value ${value.value} is not a declared constant (${value.allowed.join(", ")})`,
    );
  }
  return parts.join("; ");
}

function conformanceSuggestion(evidence: PredicateConformanceEvidence): string {
  if (evidence.repair !== null) {
    return "Mechanical repair available: review and apply it with kibi migrate --apply-safe (or replay the kb_upsert in the migration action).";
  }
  if (evidence.undeclared.length > 0) {
    return "Use a declared constant, add the value to argument_constants, or map it with argument_aliases so kibi migrate can rewrite it.";
  }
  if (evidence.candidateNamespaces.length > 1) {
    return "Set predicate_namespace to the schema this claim belongs to.";
  }
  return "Declare a predicate_schema for this signature (kb_model mode predicates helps pick an existing one) or move the claim to a schema that already exists.";
}

/** Load every fact once and evaluate predicate conformance. */
// implements REQ-kibi-predicate-schema-conformance
export async function collectPredicateSchemaConformanceViolations(
  prolog: Pick<PrologPort, "query">,
): Promise<Violation[]> {
  const facts = await loadEntitiesPaged(prolog, "fact");
  return evaluatePredicateSchemaConformance(facts);
}
