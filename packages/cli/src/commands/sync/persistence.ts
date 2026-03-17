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
  ExtractedRelationship,
  ExtractionResult,
} from "../../extractors/markdown.js";
import type { PrologProcess } from "../../prolog.js";
import { toPrologAtom } from "../../prolog/codec.js";

export interface PersistenceResult {
  entityCount: number;
  relationshipCount: number;
  kbModified: boolean;
}

export async function persistEntities(
  prolog: PrologProcess,
  results: ExtractionResult[],
  entityIds: Set<string>,
): Promise<{ entityCount: number; kbModified: boolean }> {
  let entityCount = 0;
  let kbModified = false;

  // Query existing entity IDs to include unchanged entities
  const existingIdsResult = await prolog.query(
    "findall(Id, kb_entity(Id, _, _), ExistingIds)",
  );
  if (existingIdsResult.success && existingIdsResult.bindings?.ExistingIds) {
    const raw = existingIdsResult.bindings.ExistingIds as string;
    const cleaned = raw.trim().replace(/^\[/, "").replace(/\]$/, "");
    if (cleaned) {
      for (const atom of cleaned.split(",")) {
        const id = atom.trim().replace(/^'|'$/g, "");
        if (id) entityIds.add(id);
      }
    }
  }
  for (const { entity } of results) {
    entityIds.add(entity.id);
  }

  for (const { entity } of results) {
    try {
      const props = [
        `id='${entity.id}'`,
        `title="${entity.title.replace(/"/g, '\\"')}"`,
        `status=${toPrologAtom(entity.status)}`,
        `created_at="${entity.created_at}"`,
        `updated_at="${entity.updated_at}"`,
        `source="${entity.source.replace(/"/g, '\\"')}"`,
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
      if (entity.text_ref) props.push(`text_ref="${entity.text_ref}"`);

      const propsList = `[${props.join(", ")}]`;
      const goal = `kb_assert_entity(${entity.type}, ${propsList})`;
      const result = await prolog.query(goal);
      if (result.success) {
        entityCount++;
        kbModified = true;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: Failed to upsert entity ${entity.id}: ${message}`);
    }
  }

  return { entityCount, kbModified };
}

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

  for (const { relationships } of results) {
    for (const rel of relationships) {
      try {
        const fromId = idLookup.get(rel.from) || rel.from;
        const toId = idLookup.get(rel.to) || rel.to;

        const goal = `kb_assert_relationship(${toPrologAtom(rel.type)}, ${toPrologAtom(fromId)}, ${toPrologAtom(toId)}, [])`;
        const result = await prolog.query(goal);
        if (result.success) {
          relCount++;
          kbModified = true;
        } else {
          failedRelationships.push({
            rel,
            fromId,
            toId,
            error: result.error || "Unknown error",
          });
        }
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
      const result = await prolog.query(goal);
      if (result.success) {
        relCount++;
        kbModified = true;
      } else {
        failedRelationships.push({
          rel,
          fromId: rel.from,
          toId: rel.to,
          error: result.error || "Unknown error",
        });
      }
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

  // Retry failed relationships
  const retryCount = 3;
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
    console.warn(
      "\nTip: Ensure target entities exist before creating relationships.",
    );
  }

  return { relationshipCount: relCount, kbModified };
}
