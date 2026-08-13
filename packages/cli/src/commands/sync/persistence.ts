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

import * as path from "node:path";
import type {
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
} from "../../extractors/markdown.js";
import type { PrologProcess } from "../../prolog.js";
import { toPrologAtom, toPrologString } from "../../prolog/codec.js";
import { loadEntities } from "../../public/operations/discovery-entities.js";
import { appendOnlyVerificationReceiptHistoryErrors } from "../../public/verification-receipt.js";

// Field categorization for typed fact serialization
// NOTE: base entity fields (status, owner, priority, severity) are NOT listed here —
// they are emitted in the base props block above. Only fact-specific atom fields go here.
const ATOM_FIELDS = new Set([
  "fact_kind",
  "operator",
  "value_type",
  "polarity",
]);
// Typed fact fields only (exclude base entity fields like id, title, etc.)
const STRING_FIELDS = new Set([
  "subject_key",
  "property_key",
  "value_string",
  "unit",
  "scope",
  "valid_from",
  "valid_to",
  "canonical_key",
  "claim_key",
  "claim_text",
  "predicate_name",
  "predicate_namespace",
  "rule_hash",
  "rule_schema_id",
  "rule_name",
  "semantic_key",
]);
const NUMBER_FIELDS = new Set([
  "value_int",
  "value_number",
  "predicate_arity",
  "claim_span_start",
  "claim_span_end",
]);
const BOOLEAN_FIELDS = new Set(["value_bool", "closed_world"]);
const STRING_ARRAY_FIELDS = new Set([
  "argument_names",
  "argument_types",
  "argument_descriptions",
  "aliases",
  "examples",
  "predicate_args",
]);

function getEntityField(entity: ExtractedEntity, field: string): unknown {
  // ExtractedEntity declares all fact fields as optional properties, so indexing
  // via keyof is safe. The cast is confined to this single helper.
  return (entity as unknown as Record<string, unknown>)[field];
}

// Serialize typed fact fields from entity
function serializeTypedFactFields(entity: ExtractedEntity): string[] {
  const fields: string[] = [];

  // String fields (safely escaped double-quoted Prolog strings)
  for (const field of STRING_FIELDS) {
    const value = getEntityField(entity, field);
    if (value !== undefined && value !== null) {
      fields.push(`${field}=${toPrologString(String(value))}`);
    }
  }

  const ruleIr = getEntityField(entity, "rule_ir");
  if (ruleIr !== undefined && ruleIr !== null) {
    fields.push(`rule_ir=${toPrologString(JSON.stringify(ruleIr))}`);
  }

  // Atom fields (possibly unquoted if simple)
  for (const field of ATOM_FIELDS) {
    const value = getEntityField(entity, field);
    if (value !== undefined && value !== null) {
      fields.push(`${field}=${toPrologAtom(String(value))}`);
    }
  }

  // Number fields (unquoted); value_int must be a true integer
  for (const field of NUMBER_FIELDS) {
    const value = getEntityField(entity, field);
    if (value !== undefined && value !== null && typeof value === "number") {
      if (field === "value_int" && !Number.isInteger(value)) {
        continue; // silently drop non-integer value_int
      }
      fields.push(`${field}=${value}`);
    }
  }

  // Boolean fields (true/false atoms)
  for (const field of BOOLEAN_FIELDS) {
    const value = getEntityField(entity, field);
    if (value !== undefined && value !== null && typeof value === "boolean") {
      fields.push(`${field}=${value}`);
    }
  }

  for (const field of STRING_ARRAY_FIELDS) {
    const value = getEntityField(entity, field);
    if (Array.isArray(value)) {
      fields.push(
        `${field}=[${value.map((item) => toPrologString(String(item))).join(",")}]`,
      );
    }
  }

  return fields;
}

export interface PersistenceResult {
  entityCount: number;
  relationshipCount: number;
  kbModified: boolean;
}

function parsePrologList(value: unknown): string[] {
  if (typeof value !== "string") return [];
  const text = value.trim();
  if (text.length < 2 || !text.startsWith("[") || !text.endsWith("]")) {
    return [];
  }
  const body = text.slice(1, -1).trim();
  if (body.length === 0) return [];
  const values: string[] = [];
  // IDs are atoms in the Kibi schema. Keep the parser deliberately narrow so
  // a malformed response cannot turn into a destructive path or goal.
  for (const part of body.split(",")) {
    const valuePart = part.trim();
    if (!valuePart) continue;
    if (valuePart.startsWith("'") && valuePart.endsWith("'")) {
      values.push(valuePart.slice(1, -1).replaceAll("''", "'"));
    } else if (/^[A-Za-z0-9_.:/@+-]+$/.test(valuePart)) {
      values.push(valuePart);
    }
  }
  return values;
}

async function entityIdsForSource(
  prolog: PrologProcess,
  sourceFile: string,
): Promise<string[]> {
  const candidates = new Set([
    sourceFile,
    path.relative(process.cwd(), sourceFile),
    path.basename(sourceFile),
  ]);
  const ids = new Set<string>();
  for (const candidate of candidates) {
    const result = await prolog.query(
      `kb_entities_by_source(${toPrologString(candidate)}, Ids)`,
    );
    if (result.success) {
      for (const id of parsePrologList(result.bindings?.Ids)) ids.add(id);
    }
  }
  return [...ids];
}

/** Remove entities owned by changed/deleted source files before re-upserting. */
export async function retractEntitiesForSources(
  prolog: PrologProcess,
  sourceFiles: readonly string[],
): Promise<number> {
  const ids = new Set<string>();
  for (const sourceFile of sourceFiles) {
    for (const id of await entityIdsForSource(prolog, sourceFile)) ids.add(id);
  }
  if (ids.size === 0) return 0;

  const goals = [...ids].map((id) => `kb_retract_entity(${toPrologAtom(id)})`);
  const batchRunner = (
    prolog as unknown as {
      queryBatch?: (goals: readonly string[]) => Promise<{
        readonly success: boolean;
        readonly error?: string;
      }>;
    }
  ).queryBatch?.bind(prolog);
  if (batchRunner) {
    const result = await batchRunner(goals);
    if (!result.success) {
      throw new Error(
        result.error ?? "Failed to retract changed source entities",
      );
    }
  } else {
    for (const goal of goals) {
      const result = await prolog.query(goal);
      if (!result.success) {
        throw new Error(
          result.error ?? "Failed to retract changed source entity",
        );
      }
    }
  }
  return ids.size;
}

/** Remove an exact entity delta without scanning every indexed source. */
export async function retractEntitiesById(
  prolog: PrologProcess,
  entityIds: readonly string[],
): Promise<number> {
  const ids = [...new Set(entityIds)];
  if (ids.length === 0) return 0;
  const goals = ids.map((id) => `kb_retract_entity(${toPrologAtom(id)})`);
  const batchRunner = (
    prolog as unknown as {
      queryBatch?: (goals: readonly string[]) => Promise<{
        readonly success: boolean;
        readonly error?: string;
      }>;
    }
  ).queryBatch?.bind(prolog);
  const result = batchRunner
    ? await batchRunner(goals)
    : await prolog.query(`rdf_transaction((${goals.join(", ")}))`);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to retract entity delta");
  }
  return ids.length;
}

/** Clear outgoing inline relationships for entities whose payload changed. */
export async function retractEntityRelationshipsById(
  prolog: PrologProcess,
  entityIds: readonly string[],
): Promise<void> {
  const ids = [...new Set(entityIds)];
  if (ids.length === 0) return;
  const goals = ids.map(
    (id) => `kb_retract_entity_relationships(${toPrologAtom(id)})`,
  );
  const batchRunner = (
    prolog as unknown as {
      queryBatch?: (goals: readonly string[]) => Promise<{
        readonly success: boolean;
        readonly error?: string;
      }>;
    }
  ).queryBatch?.bind(prolog);
  const result = batchRunner
    ? await batchRunner(goals)
    : await prolog.query(`rdf_transaction((${goals.join(", ")}))`);
  if (!result.success) {
    throw new Error(result.error ?? "Failed to retract relationship delta");
  }
}

export async function retractRelationships(
  prolog: PrologProcess,
  relationships: readonly ExtractedRelationship[],
): Promise<number> {
  if (relationships.length === 0) return 0;
  const goals = relationships.map(
    (relationship) =>
      `kb_retract_relationship(${toPrologAtom(relationship.type)}, ${toPrologAtom(relationship.from)}, ${toPrologAtom(relationship.to)})`,
  );
  const batchRunner = (
    prolog as unknown as {
      queryBatch?: (goals: readonly string[]) => Promise<{
        readonly success: boolean;
        readonly error?: string;
      }>;
    }
  ).queryBatch?.bind(prolog);
  const result = batchRunner
    ? await batchRunner(goals)
    : await prolog.query(`rdf_transaction((${goals.join(", ")}))`);
  if (!result.success) {
    throw new Error(
      result.error ?? "Failed to retract relationship shard delta",
    );
  }
  return relationships.length;
}

function isQueryFailedError(error: string): boolean {
  const lowered = error.toLowerCase();
  // Only match session-corruption errors that might benefit from a Prolog process restart.
  // Data errors (entity missing, invalid relationship) are deterministic and should NOT
  // trigger a restart — the error would persist and the restart would lose kb_attach state.
  return (
    lowered.includes("query failed") ||
    lowered.includes("query returned false") ||
    lowered.includes("predicate or file not found")
  );
}

async function tryResetPrologProcess(prolog: PrologProcess): Promise<boolean> {
  const maybe = prolog as unknown as {
    terminate?: () => Promise<void>;
    start?: () => Promise<void>;
  };
  if (
    typeof maybe.terminate !== "function" ||
    typeof maybe.start !== "function"
  ) {
    return false;
  }

  try {
    await maybe.terminate();
    await maybe.start();
    return true;
  } catch {
    return false;
  }
}

export async function persistEntities(
  // implements REQ-009
  prolog: PrologProcess,
  results: ExtractionResult[],
  entityIds: Set<string>,
  options: { loadExistingEntityIds?: boolean } = {},
): Promise<{ entityCount: number; kbModified: boolean }> {
  let entityCount = 0;
  let kbModified = false;
  const existingEntityIds = new Set<string>();
  const pendingEntityGoals: Array<{
    readonly entity: ExtractedEntity;
    readonly sourceFile: string;
    readonly goal: string;
  }> = [];

  if (options.loadExistingEntityIds !== false) {
    // Generation rebuilds need the complete endpoint inventory for local
    // relationship validation. Journal deltas rely on Prolog's authoritative
    // endpoint checks and must not materialize 10,000 IDs for one upsert.
    const existingIdsResult = await prolog.query(
      "findall(Id, kb_entity(Id, _, _), ExistingIds)",
    );
    if (existingIdsResult.success && existingIdsResult.bindings?.ExistingIds) {
      const raw = existingIdsResult.bindings.ExistingIds as string;
      const cleaned = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
      if (cleaned) {
        for (const atom of cleaned.split(",")) {
          const id = atom.trim().replace(/^'|'$/g, "");
          if (id) {
            entityIds.add(id);
            existingEntityIds.add(id);
          }
        }
      }
    }
  }
  for (const { entity, sourceFile } of results) {
    entityIds.add(entity.id);
  }

  for (const { entity, sourceFile } of results) {
    try {
      if (entity.type === "test" && existingEntityIds.has(entity.id)) {
        const existing = await loadEntities(prolog, {
          id: entity.id,
          type: "test",
        });
        const previous = Array.isArray(existing[0]?.verification_receipts)
          ? existing[0].verification_receipts.filter(
              (receipt): receipt is Readonly<Record<string, unknown>> =>
                receipt !== null &&
                typeof receipt === "object" &&
                !Array.isArray(receipt),
            )
          : [];
        const next = Array.isArray(entity.verification_receipts)
          ? entity.verification_receipts
          : undefined;
        const receiptErrors = appendOnlyVerificationReceiptHistoryErrors(
          previous,
          next,
        );
        if (receiptErrors.length > 0) {
          throw new Error(receiptErrors.join("; "));
        }
      }
      const props = [
        `id=${toPrologAtom(entity.id)}`,
        `title=${toPrologString(entity.title)}`,
        `status=${toPrologAtom(entity.status)}`,
        `created_at=${toPrologString(entity.created_at)}`,
        `updated_at=${toPrologString(entity.updated_at)}`,
        `source=${toPrologString(entity.source)}`,
      ];

      if (entity.tags && entity.tags.length > 0) {
        const tagsList = entity.tags.map(toPrologAtom).join(",");
        props.push(`tags=[${tagsList}]`);
      }
      if (entity.owner) props.push(`owner=${toPrologAtom(entity.owner)}`);
      if (entity.priority)
        props.push(`priority=${toPrologAtom(entity.priority)}`);
      if (entity.severity)
        props.push(`severity=${toPrologAtom(entity.severity)}`);
      if (entity.text_ref)
        props.push(`text_ref=${toPrologString(entity.text_ref)}`);
      if (entity.type === "req" && entity.semantic_text) {
        props.push(`semantic_text=${toPrologString(entity.semantic_text)}`);
      }
      if (entity.type === "req" && entity.logic_claims) {
        props.push(
          `logic_claims=[${entity.logic_claims.map(toPrologAtom).join(",")}]`,
        );
      }
      if (entity.type === "req" && entity.semantic_clauses) {
        props.push(
          `semantic_clauses=[${entity.semantic_clauses.map(toPrologString).join(",")}]`,
        );
      }
      if (entity.type === "req" && entity.semantic_inventory_version) {
        props.push(
          `semantic_inventory_version=${toPrologString(entity.semantic_inventory_version)}`,
        );
      }
      if (entity.type === "req" && entity.semantic_source_field) {
        props.push(
          `semantic_source_field=${toPrologString(entity.semantic_source_field)}`,
        );
      }
      if (entity.type === "req" && entity.semantic_source_hash) {
        props.push(
          `semantic_source_hash=${toPrologString(entity.semantic_source_hash)}`,
        );
      }
      if (entity.type === "req" && entity.semantic_inventory) {
        props.push(
          `semantic_inventory=${toPrologString(JSON.stringify(entity.semantic_inventory))}`,
        );
      }
      if (sourceFile) props.push(`sourceFile=${toPrologString(sourceFile)}`);

      if (entity.type === "symbol") {
        if (entity.symbol_role)
          props.push(`symbol_role=${toPrologAtom(entity.symbol_role)}`);
        if (entity.granularity_reason)
          props.push(
            `granularity_reason=${toPrologAtom(entity.granularity_reason)}`,
          );
        for (const key of [
          "sourceLine",
          "sourceColumn",
          "sourceEndLine",
          "sourceEndColumn",
        ] as const) {
          const value = entity[key];
          if (typeof value === "number") props.push(`${key}=${value}`);
        }
      }

      // Add typed fact fields for fact entities
      if (entity.type === "fact") {
        const factFields = serializeTypedFactFields(entity);
        props.push(...factFields);
      }

      if (entity.type === "test") {
        if (entity.verification_scope !== undefined) {
          props.push(
            `verification_scope=${toPrologAtom(entity.verification_scope)}`,
          );
        }
        if (entity.verification_perspective !== undefined) {
          props.push(
            `verification_perspective=${toPrologAtom(entity.verification_perspective)}`,
          );
        }
        if (entity.verification_contract !== undefined) {
          props.push(
            `verification_contract=${toPrologString(JSON.stringify(entity.verification_contract))}`,
          );
        }
        if (entity.verification_receipts !== undefined) {
          props.push(
            `verification_receipts=${toPrologString(JSON.stringify(entity.verification_receipts))}`,
          );
        }
      }

      const propsList = `[${props.join(", ")}]`;
      const goal = `kb_assert_entity(${entity.type}, ${propsList})`;
      pendingEntityGoals.push({
        entity,
        sourceFile: sourceFile ?? entity.source,
        goal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to upsert entity ${entity.id}: ${message}${semanticEntityContext(entity, sourceFile ?? entity.source)}`,
      );
    }
  }

  // Persist a changed source as a bounded set of RDF edits.  This retains the
  // per-entity fallback diagnostics while avoiding one Prolog round-trip and
  // journal flush for every symbol/document in the common case.
  const batchRunner = (
    prolog as unknown as {
      queryBatch?: (goals: readonly string[]) => Promise<{
        readonly success: boolean;
        readonly error?: string;
      }>;
    }
  ).queryBatch?.bind(prolog);
  const batchSize = 250;
  for (
    let offset = 0;
    offset < pendingEntityGoals.length;
    offset += batchSize
  ) {
    const chunk = pendingEntityGoals.slice(offset, offset + batchSize);
    const result = batchRunner
      ? await batchRunner(chunk.map(({ goal }) => goal))
      : { success: false, error: "batch unsupported" };
    if (result.success) {
      entityCount += chunk.length;
      kbModified = true;
      continue;
    }
    // A malformed entity should retain the precise existing error.  The batch
    // transaction has rolled back, so retrying sequentially is safe.
    for (const item of chunk) {
      try {
        const single = await prolog.query(item.goal);
        if (!single.success) {
          const detail =
            single.error ||
            (batchRunner ? result.error : undefined) ||
            `kb_assert_entity failed for ${item.entity.id}`;
          throw new Error(
            `Failed to upsert entity ${item.entity.id}: ${detail}${semanticEntityContext(item.entity, item.sourceFile)}`,
          );
        }
        entityCount++;
        kbModified = true;
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.startsWith("Failed to upsert entity ")
        ) {
          throw error;
        }
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Failed to upsert entity ${item.entity.id}: ${message}${semanticEntityContext(item.entity, item.sourceFile)}`,
        );
      }
    }
  }

  return { entityCount, kbModified };
}

function semanticEntityContext(
  entity: ExtractedEntity,
  sourceFile: string,
): string {
  const displaySource = path.isAbsolute(sourceFile)
    ? path.relative(process.cwd(), sourceFile)
    : sourceFile;
  const details = [`source=${displaySource}`];
  if (entity.type === "fact") {
    const factKind = getEntityField(entity, "fact_kind");
    if (factKind !== undefined && factKind !== null) {
      details.push(`fact_kind=${String(factKind)}`);
    }
    if (
      factKind === "property_value" &&
      getEntityField(entity, "value_string") === undefined &&
      getEntityField(entity, "value_int") === undefined &&
      getEntityField(entity, "value_number") === undefined &&
      getEntityField(entity, "value_bool") === undefined
    ) {
      details.push("missing value field");
    }
  }
  return ` (${details.join("; ")})`;
}

// implements REQ-core-persistence
export async function persistRelationships(
  prolog: PrologProcess,
  results: ExtractionResult[],
  shardRelationships: ExtractedRelationship[],
): Promise<{ relationshipCount: number; kbModified: boolean }> {
  let relCount = 0;
  let kbModified = false;

  // Build ID lookup for relationship resolution
  const idLookup = new Map<string, string>();
  for (const { entity } of results) {
    const filename = path.basename(entity.source, ".md");
    idLookup.set(filename, entity.id);
    idLookup.set(entity.id, entity.id);
  }

  // Collect all relationships from results and shards
  const failedRelationships: Array<{
    rel: ExtractedRelationship;
    fromId: string;
    toId: string;
    error: string;
  }> = [];
  const pendingRelationships: Array<{
    readonly rel: ExtractedRelationship;
    readonly fromId: string;
    readonly toId: string;
    readonly goal: string;
  }> = [];

  for (const { relationships } of results) {
    for (const rel of relationships) {
      try {
        const fromId = idLookup.get(rel.from) || rel.from;
        const toId = idLookup.get(rel.to) || rel.to;

        const goal = `kb_assert_relationship(${toPrologAtom(rel.type)}, ${toPrologAtom(fromId)}, ${toPrologAtom(toId)}, [])`;
        pendingRelationships.push({ rel, fromId, toId, goal });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const fromId = idLookup.get(rel.from) || rel.from;
        const toId = idLookup.get(rel.to) || rel.to;
        failedRelationships.push({ rel, fromId, toId, error: message });
      }
    }
  }

  // Assert relationships from shards
  for (const rel of shardRelationships) {
    try {
      const goal = `kb_assert_relationship(${toPrologAtom(rel.type)}, ${toPrologAtom(rel.from)}, ${toPrologAtom(rel.to)}, [])`;
      pendingRelationships.push({
        rel,
        fromId: rel.from,
        toId: rel.to,
        goal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failedRelationships.push({
        rel,
        fromId: rel.from,
        toId: rel.to,
        error: message,
      });
    }
  }

  const relationshipBatchRunner = (
    prolog as unknown as {
      queryBatch?: (goals: readonly string[]) => Promise<{
        readonly success: boolean;
        readonly error?: string;
      }>;
    }
  ).queryBatch?.bind(prolog);
  const relationshipBatchSize = 250;
  for (
    let offset = 0;
    offset < pendingRelationships.length;
    offset += relationshipBatchSize
  ) {
    const chunk = pendingRelationships.slice(
      offset,
      offset + relationshipBatchSize,
    );
    const batch = relationshipBatchRunner
      ? await relationshipBatchRunner(chunk.map(({ goal }) => goal))
      : { success: false, error: "batch unsupported" };
    if (batch.success) {
      relCount += chunk.length;
      kbModified = true;
      continue;
    }
    for (const item of chunk) {
      try {
        const single = await prolog.query(item.goal);
        if (single.success) {
          relCount++;
          kbModified = true;
        } else {
          failedRelationships.push({
            rel: item.rel,
            fromId: item.fromId,
            toId: item.toId,
            error:
              single.error ||
              (relationshipBatchRunner ? batch.error : undefined) ||
              "Unknown error",
          });
        }
      } catch (error) {
        failedRelationships.push({
          rel: item.rel,
          fromId: item.fromId,
          toId: item.toId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  // Retry failed relationships
  const retryCount = 3;
  let resetAttempted = false;
  for (
    let pass = 0;
    pass < retryCount && failedRelationships.length > 0;
    pass++
  ) {
    const remainingFailed: typeof failedRelationships = [];

    for (const { rel, fromId, toId } of failedRelationships) {
      try {
        const goal = `kb_assert_relationship(${toPrologAtom(rel.type)}, ${toPrologAtom(fromId)}, ${toPrologAtom(toId)}, [])`;
        const result = await prolog.query(goal);
        if (result.success) {
          relCount++;
          kbModified = true;
        } else {
          remainingFailed.push({
            rel,
            fromId,
            toId,
            error: result.error || "Unknown error",
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        remainingFailed.push({ rel, fromId, toId, error: message });
      }
    }

    failedRelationships.length = 0;
    failedRelationships.push(...remainingFailed);

    const allLookLikeSessionFailures =
      remainingFailed.length > 0 &&
      remainingFailed.every(({ error }) => isQueryFailedError(error));

    // If every pending relationship fails with generic query errors, attempt one
    // best-effort Prolog restart before the next retry pass to recover from a
    // potentially poisoned interactive session.
    if (
      allLookLikeSessionFailures &&
      !resetAttempted &&
      pass + 1 < retryCount
    ) {
      resetAttempted = true;
      await tryResetPrologProcess(prolog);
    }
  }

  // Log remaining failures
  if (failedRelationships.length > 0) {
    console.warn(
      `\nWarning: ${failedRelationships.length} relationship(s) failed to sync:`,
    );
    const seen = new Set<string>();
    for (const { rel, fromId, toId, error } of failedRelationships) {
      const key = `${rel.type}:${fromId}->${toId}`;
      if (!seen.has(key)) {
        seen.add(key);
        console.warn(`  - ${rel.type}: ${fromId} -> ${toId}`);
        console.warn(`    Error: ${error}`);
      }
    }
    const missingEntities = failedRelationships.filter(({ error }) =>
      error.toLowerCase().includes("entity does not exist"),
    );
    const invalidRels = failedRelationships.filter(({ error }) =>
      error.includes("Invalid relationship"),
    );
    if (missingEntities.length > 0) {
      // Collect unique missing entity IDs from error messages
      const missingIds = new Set<string>();
      for (const { error } of missingEntities) {
        const match = error.match(/does not exist: (.+)$/);
        const missingId = match?.[1];
        if (missingId !== undefined) {
          missingIds.add(missingId.trim());
        }
      }
      const idList = [...missingIds].sort().join(", ");
      console.warn(
        `\nTip: ${missingEntities.length} relationship(s) reference ${missingIds.size} missing entity/ies: ${idList}.`,
      );
      console.warn(
        "  Create the missing docs (e.g., docs/requirements/REQ-*.md) or remove stale relationships.",
      );
    } else if (invalidRels.length > 0) {
      console.warn(
        "\nTip: Check that relationship types and directions match the allowed schema (e.g., implements symbol→req, verified_by req→test).",
      );
    } else {
      console.warn(
        "\nTip: Ensure target entities exist before creating relationships.",
      );
    }
  }

  return { relationshipCount: relCount, kbModified };
}
