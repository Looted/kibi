/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { type RelationshipRecord, readShard } from "../relationships/shards";

export interface ExtractedRelationship {
  type: string;
  from: string;
  to: string;
  metadata?: {
    created_at?: string;
    created_by?: string;
    source?: string;
    confidence?: number;
  };
}

export interface ShardExtractionResult {
  shardPath: string;
  relationships: ExtractedRelationship[];
}

/**
 * Valid relationship types per the Kibi schema.
 */
const VALID_RELATIONSHIP_TYPES = new Set([
  "depends_on",
  "specified_by",
  "verified_by",
  "validates",
  "implements",
  "covered_by",
  "constrained_by",
  "constrains",
  "requires_property",
  "guards",
  "publishes",
  "consumes",
  "supersedes",
  "relates_to",
]);

/**
 * Extracts all relationships from relationship shard files in the given directory.
 *
 * @param relationshipsDir - Path to .kb/relationships directory
 * @returns Array of extraction results, one per shard file
 */
export function extractFromRelationshipShards(
  relationshipsDir: string,
): ShardExtractionResult[] {
  if (!fs.existsSync(relationshipsDir)) {
    return [];
  }

  const results: ShardExtractionResult[] = [];
  const files = fs.readdirSync(relationshipsDir);

  for (const file of files) {
    if (!file.endsWith(".yaml") && !file.endsWith(".yml")) {
      continue;
    }

    const shardPath = path.join(relationshipsDir, file);
    const stats = fs.statSync(shardPath);

    if (!stats.isFile()) {
      continue;
    }

    try {
      const records = readShard(shardPath);
      const relationships = records
        .map(convertRecordToRelationship)
        .filter((r): r is ExtractedRelationship => r !== null);

      results.push({
        shardPath,
        relationships,
      });
    } catch (error) {
      // Re-throw with shard path context
      throw new Error(
        `Failed to extract relationships from ${shardPath}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  return results;
}

/**
 * Converts a RelationshipRecord to an ExtractedRelationship.
 * Returns null if the record is invalid.
 */
function convertRecordToRelationship(
  record: RelationshipRecord,
): ExtractedRelationship | null {
  // Validate type
  if (!VALID_RELATIONSHIP_TYPES.has(record.type)) {
    throw new Error(
      `Invalid relationship type "${record.type}" in record ${record.id}`,
    );
  }

  // Validate from/to are not empty
  if (!record.from || !record.to) {
    throw new Error(`Missing from or to in relationship record ${record.id}`);
  }

  const relationship: ExtractedRelationship = {
    type: record.type,
    from: record.from,
    to: record.to,
  };

  // Include metadata if present
  if (
    record.created_at ||
    record.created_by ||
    record.source ||
    record.confidence !== undefined
  ) {
    relationship.metadata = {
      created_at: record.created_at,
      created_by: record.created_by,
      source: record.source,
      confidence: record.confidence,
    };
  }

  return relationship;
}

/**
 * Gets the path to the relationships directory for a given KB root.
 */
export function getRelationshipsDir(kbRoot: string): string {
  return path.join(kbRoot, "relationships");
}

/**
 * Flattens multiple shard extraction results into a single array of relationships.
 */
export function flattenRelationships(
  results: ShardExtractionResult[],
): ExtractedRelationship[] {
  return results.flatMap((r) => r.relationships);
}

/**
 * Validates that all relationships reference valid entity IDs.
 * Returns validation errors for dangling references.
 */
export function validateRelationships(
  relationships: ExtractedRelationship[],
  validEntityIds: Set<string>,
): Array<{
  relationship: ExtractedRelationship;
  error: "missing_from" | "missing_to";
}> {
  const errors: Array<{
    relationship: ExtractedRelationship;
    error: "missing_from" | "missing_to";
  }> = [];

  for (const rel of relationships) {
    if (!validEntityIds.has(rel.from)) {
      errors.push({ relationship: rel, error: "missing_from" });
    }
    if (!validEntityIds.has(rel.to)) {
      errors.push({ relationship: rel, error: "missing_to" });
    }
  }

  return errors;
}
