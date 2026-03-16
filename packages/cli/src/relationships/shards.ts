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

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";

/**
 * Represents a relationship record stored in shard files.
 */
export interface RelationshipRecord {
  /** Stable unique identifier: rel- + first 12 chars of sha256(type|from|to) */
  id: string;
  /** Relationship type (e.g., implements, depends_on, relates_to) */
  type: string;
  /** Source entity ID */
  from: string;
  /** Target entity ID */
  to: string;
  /** ISO 8601 timestamp when relationship was created */
  created_at: string;
  /** Actor/system that created the relationship */
  created_by: string;
  /** Provenance/source of the relationship */
  source: string;
  /** Confidence level 0.0-1.0 */
  confidence?: number;
}

/**
 * Generates a stable relationship ID from type, from, and to.
 * Format: rel- + first 12 hex chars of sha256(type + "|" + from + "|" + to)
 */
export function relationshipIdFor(
  type: string,
  from: string,
  to: string,
): string {
  const hash = crypto.createHash("sha256");
  hash.update(`${type}|${from}|${to}`);
  const digest = hash.digest("hex").toLowerCase();
  return `rel-${digest.slice(0, 12)}`;
}

/**
 * Determines the shard filename for a given entity ID.
 * Returns first 2 lowercase hex chars of sha256(entityId).
 */
export function shardForFromId(fromId: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(fromId);
  const digest = hash.digest("hex").toLowerCase();
  return digest.slice(0, 2);
}

/**
 * Reads a relationship shard file.
 * Returns empty array if file doesn't exist.
 * Throws on parse errors.
 */
export function readShard(shardPath: string): RelationshipRecord[] {
  if (!fs.existsSync(shardPath)) {
    return [];
  }

  const content = fs.readFileSync(shardPath, "utf8");
  if (!content.trim()) {
    return [];
  }

  const parsed = yaml.load(content, { schema: yaml.JSON_SCHEMA }) as { relationships?: unknown[] } | null;
  if (!parsed || typeof parsed !== "object") {
    throw new Error(
      `Invalid shard file format at ${shardPath}: expected object`,
    );
  }

  if (!parsed.relationships) {
    return [];
  }

  if (!Array.isArray(parsed.relationships)) {
    throw new Error(
      `Invalid shard file format at ${shardPath}: relationships must be an array`,
    );
  }

  return parsed.relationships.map((record, index) => {
    if (!record || typeof record !== "object") {
      throw new Error(
        `Invalid relationship record at ${shardPath}[${index}]: expected object`,
      );
    }

    const rec = record as Record<string, unknown>;

    // Validate required fields
    if (typeof rec.id !== "string" || !rec.id) {
      throw new Error(`Missing or invalid 'id' at ${shardPath}[${index}]`);
    }
    if (typeof rec.type !== "string" || !rec.type) {
      throw new Error(`Missing or invalid 'type' at ${shardPath}[${index}]`);
    }
    if (typeof rec.from !== "string" || !rec.from) {
      throw new Error(`Missing or invalid 'from' at ${shardPath}[${index}]`);
    }
    if (typeof rec.to !== "string" || !rec.to) {
      throw new Error(`Missing or invalid 'to' at ${shardPath}[${index}]`);
    }
    if (typeof rec.created_at !== "string" || !rec.created_at) {
      throw new Error(
        `Missing or invalid 'created_at' at ${shardPath}[${index}]`,
      );
    }
    const createdAt: string = rec.created_at;
    if (typeof rec.created_by !== "string" || !rec.created_by) {
      throw new Error(
        `Missing or invalid 'created_by' at ${shardPath}[${index}]`,
      );
    }
    if (typeof rec.source !== "string" || !rec.source) {
      throw new Error(`Missing or invalid 'source' at ${shardPath}[${index}]`);
    }

    const result: RelationshipRecord = {
      id: rec.id,
      type: rec.type,
      from: rec.from,
      to: rec.to,
      created_at: createdAt,
      created_by: rec.created_by,
      source: rec.source,
    };

    if (rec.confidence !== undefined) {
      if (typeof rec.confidence !== "number") {
        throw new Error(
          `Invalid 'confidence' at ${shardPath}[${index}]: expected number`,
        );
      }
      result.confidence = rec.confidence;
    }

    return result;
  });
}

/**
 * Sorts records deterministically by from, then type, then to.
 */
function sortRecords(records: RelationshipRecord[]): RelationshipRecord[] {
  return [...records].sort((a, b) => {
    const fromCompare = a.from.localeCompare(b.from);
    if (fromCompare !== 0) return fromCompare;

    const typeCompare = a.type.localeCompare(b.type);
    if (typeCompare !== 0) return typeCompare;

    return a.to.localeCompare(b.to);
  });
}

/**
 * Writes relationship records to a shard file.
 * Creates parent directories if needed.
 * Records are sorted deterministically before writing.
 */
export function writeShard(
  shardPath: string,
  records: RelationshipRecord[],
): void {
  // Sort records deterministically
  const sorted = sortRecords(records);

  // Ensure parent directory exists
  const dir = path.dirname(shardPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Serialize to YAML with specific formatting
  const data = { relationships: sorted };
  const yamlContent = yaml.dump(data, {
    indent: 2,
    lineWidth: -1, // Don't wrap lines
    noRefs: true,
    sortKeys: false, // Keep our ordering
  });

  fs.writeFileSync(shardPath, yamlContent, "utf8");
}

/**
 * Merges existing and incoming relationship records.
 * Deduplicates by (type, from, to) tuple.
 * On conflict, keeps the record with newer created_at timestamp.
 */
export function mergeRecords(
  existing: RelationshipRecord[],
  incoming: RelationshipRecord[],
): RelationshipRecord[] {
  const recordMap = new Map<string, RelationshipRecord>();

  // Helper to create key from record
  const makeKey = (r: RelationshipRecord): string =>
    `${r.type}|${r.from}|${r.to}`;

  // Add existing records
  for (const record of existing) {
    recordMap.set(makeKey(record), record);
  }

  // Merge incoming records
  for (const record of incoming) {
    const key = makeKey(record);
    const existingRecord = recordMap.get(key);

    if (!existingRecord) {
      // New record
      recordMap.set(key, record);
    } else {
      // Conflict - keep newer based on created_at
      const existingTime = new Date(existingRecord.created_at).getTime();
      const incomingTime = new Date(record.created_at).getTime();

      if (incomingTime >= existingTime) {
        recordMap.set(key, record);
      }
    }
  }

  return Array.from(recordMap.values());
}

/**
 * Removes relationship records where from or to entity IDs are not in the valid set.
 */
export function pruneDangling(
  records: RelationshipRecord[],
  validEntityIds: Set<string>,
): RelationshipRecord[] {
  return records.filter(
    (record) =>
      validEntityIds.has(record.from) && validEntityIds.has(record.to),
  );
}
