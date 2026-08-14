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
import { load as parseYAML } from "js-yaml";

/**
 * Represents a relationship record stored in shard files.
 */
export interface RelationshipRecord {
  id: string;
  type: string;
  from: string;
  to: string;
  created_at: string;
  created_by: string;
  source: string;
  confidence?: number;
}

/**
 * Gets the path to the relationships directory for a given KB root.
 */
export function getRelationshipsDir(kbRoot: string): string {
  return path.join(kbRoot, "relationships");
}

/**
 * Computes the shard name (first 2 chars of SHA256) for a given entity ID.
 */
export function shardForFromId(fromId: string): string {
  const hash = crypto.createHash("sha256").update(fromId).digest("hex");
  return hash.slice(0, 2);
}

/**
 * Computes the shard path for a given entity ID.
 * Uses first 2 chars of SHA256(entityId) as shard name.
 */
export function computeShardPath(kbRoot: string, entityId: string): string {
  const shardName = shardForFromId(entityId);
  return path.join(getRelationshipsDir(kbRoot), `${shardName}.yaml`);
}

/**
 * Reads a relationship shard file.
 * Returns empty array if file doesn't exist.
 * Throws on parse errors.
 */
export function readShard(shardPath: string): RelationshipRecord[] {
  // implements REQ-005
  if (!fs.existsSync(shardPath)) {
    return [];
  }

  const content = fs.readFileSync(shardPath, "utf8");
  if (!content.trim()) {
    return [];
  }

  const parsed = parseYAML(content) as {
    relationships?: unknown[];
  } | null;

  if (!parsed || !Array.isArray(parsed.relationships)) {
    throw new Error(
      `Invalid shard file: missing 'relationships' array at ${shardPath}`,
    );
  }

  return parsed.relationships.map((record, index) => {
    if (typeof record !== "object" || record === null) {
      throw new Error(
        `Invalid record at ${shardPath}[${index}]: expected object`,
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

    // Handle created_at - YAML may auto-convert ISO dates to Date objects
    let createdAt: string;
    if (rec.created_at instanceof Date) {
      createdAt = rec.created_at.toISOString().replace(/\.000Z$/, "Z");
    } else if (typeof rec.created_at === "string" && rec.created_at) {
      createdAt = rec.created_at;
    } else {
      throw new Error(
        `Missing or invalid 'created_at' at ${shardPath}[${index}]`,
      );
    }

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
 * Writes a relationship shard file.
 * Creates parent directories if needed.
 */
export function writeShard(
  shardPath: string,
  records: RelationshipRecord[],
): void {
  const dir = path.dirname(shardPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Sort and dedupe records
  const sorted = sortRecords(records);
  const seen = new Set<string>();
  const unique: RelationshipRecord[] = [];

  for (const record of sorted) {
    const key = `${record.type}|${record.from}|${record.to}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }

  const yamlContent = serializeToYAML(unique);
  fs.writeFileSync(shardPath, yamlContent, "utf8");
}

export type RelationshipSelector = Readonly<{
  type: string;
  from: string;
  to: string;
}>;

export type RemovedRelationshipRecords = Readonly<{
  selector: RelationshipSelector;
  shardPaths: readonly string[];
  sources: readonly string[];
  removed: boolean;
}>;

/**
 * Remove exact legacy-shard relationships using an atomic temp-file rename.
 * The caller is responsible for retracting the compiled RDF edge afterwards.
 */
export function removeRelationshipsFromShards(
  kbRoot: string,
  selectors: readonly RelationshipSelector[],
): RemovedRelationshipRecords[] {
  const wanted = new Set(
    selectors.map(
      (selector) => `${selector.type}\0${selector.from}\0${selector.to}`,
    ),
  );
  const removed = new Map<string, { paths: string[]; sources: string[] }>();
  for (const shardPath of listShards(kbRoot)) {
    const records = readShard(shardPath);
    const matching = records.filter((record) =>
      wanted.has(`${record.type}\0${record.from}\0${record.to}`),
    );
    if (matching.length === 0) continue;
    const remaining = records.filter(
      (record) => !wanted.has(`${record.type}\0${record.from}\0${record.to}`),
    );
    const tempPath = `${shardPath}.kibi-delete-${process.pid}-${Date.now()}`;
    writeShard(tempPath, remaining);
    fs.renameSync(tempPath, shardPath);
    for (const record of matching) {
      const key = `${record.type}\0${record.from}\0${record.to}`;
      const entry = removed.get(key) ?? { paths: [], sources: [] };
      entry.paths.push(shardPath);
      entry.sources.push(record.source);
      removed.set(key, entry);
    }
  }
  return selectors.map((selector) => {
    const entry = removed.get(
      `${selector.type}\0${selector.from}\0${selector.to}`,
    );
    return {
      selector,
      shardPaths: entry?.paths ?? [],
      sources: entry?.sources ?? [],
      removed: entry !== undefined,
    };
  });
}

/**
 * Serializes records to YAML format.
 */
function serializeToYAML(records: RelationshipRecord[]): string {
  const lines: string[] = ["relationships:"];

  for (const record of records) {
    lines.push(`  - id: ${record.id}`);
    lines.push(`    type: ${record.type}`);
    lines.push(`    from: ${record.from}`);
    lines.push(`    to: ${record.to}`);
    lines.push(`    created_at: "${record.created_at}"`);
    lines.push(`    created_by: ${record.created_by}`);
    lines.push(`    source: ${record.source}`);
    if (record.confidence !== undefined) {
      lines.push(`    confidence: ${record.confidence}`);
    }
  }

  return `${lines.join("\n")}\n`;
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
 * Appends a relationship to the appropriate shard.
 * Returns the shard path and record ID.
 */
export function appendRelationship(
  kbRoot: string,
  relationship: Omit<RelationshipRecord, "id">,
): { shardPath: string; recordId: string } {
  const shardPath = computeShardPath(kbRoot, relationship.from);
  const existing = readShard(shardPath);

  // Generate deterministic ID
  const recordId = relationshipIdFor(
    relationship.type,
    relationship.from,
    relationship.to,
  );

  // Check if relationship already exists
  const exists = existing.some(
    (r) =>
      r.type === relationship.type &&
      r.from === relationship.from &&
      r.to === relationship.to,
  );

  if (!exists) {
    const newRecord: RelationshipRecord = {
      ...relationship,
      id: recordId,
    };
    writeShard(shardPath, [...existing, newRecord]);
  }

  return { shardPath, recordId };
}

/**
 * Lists all shard files in the relationships directory.
 */
export function listShards(kbRoot: string): string[] {
  const relationshipsDir = getRelationshipsDir(kbRoot);
  if (!fs.existsSync(relationshipsDir)) {
    return [];
  }

  return fs
    .readdirSync(relationshipsDir)
    .filter((f) => f.endsWith(".yaml"))
    .map((f) => path.join(relationshipsDir, f));
}

/**
 * Reads all relationships from all shards.
 */
export function readAllShards(kbRoot: string): RelationshipRecord[] {
  const shards = listShards(kbRoot);
  const allRecords: RelationshipRecord[] = [];

  for (const shardPath of shards) {
    const records = readShard(shardPath);
    allRecords.push(...records);
  }

  return allRecords;
}

/**
 * Removes dangling relationships that reference non-existent entities.
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

/**
 * Generates a deterministic relationship ID.
 */
export function relationshipIdFor(
  type: string,
  from: string,
  to: string,
): string {
  const hash = crypto
    .createHash("sha256")
    .update(`${type}|${from}|${to}`)
    .digest("hex");
  return `rel-${hash.slice(0, 12)}`;
}

/**
 * Merges existing and incoming relationship records.
 * Deduplicates by (type, from, to) tuple.
 * On conflict, keeps the record with newer created_at timestamp.
 */
export function mergeRecords(
  // implements REQ-005
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
