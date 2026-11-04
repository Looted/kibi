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
import { type YAMLSeq, isMap, isSeq, parseDocument } from "yaml";

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

  const content = fs.readFileSync(shardPath).toString();
  const parsed = parsedShards.get(content);
  // rationale: parsing is a pure function of the text and callers get copies
  // either way, so skipping the memo changes only the time a read takes.
  // Stryker disable next-line ConditionalExpression
  if (parsed !== undefined) return parsed.map((record) => ({ ...record }));
  const records = parseShardText(content, shardPath);
  if (parsedShards.size >= PARSED_SHARD_LIMIT) parsedShards.clear();
  parsedShards.set(
    content,
    records.map((record) => ({ ...record })),
  );
  return records;
}

/**
 * Parsed shards by their text. One check reads every shard for several rules
 * (relationship parity, entity context); a shard's records are a pure
 * function of its text, so an unchanged shard is parsed once per process.
 * Callers get their own record copies.
 */
const PARSED_SHARD_LIMIT = 1024;
const parsedShards = new Map<string, RelationshipRecord[]>();

/** How many parsed shards the reuse memo holds; for tests of its bound. */
// implements REQ-005
export function parsedShardMemoSize(): number {
  return parsedShards.size;
}

/**
 * Parses relationship shard text read from `shardPath`.
 * Returns an empty array for blank text. Throws on parse errors.
 */
// implements REQ-kibi-operation-interface-parity
export function parseShardText(
  content: string,
  shardPath: string,
): RelationshipRecord[] {
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
    const field = (name: keyof RelationshipRecord): string => {
      const value = rec[name];
      if (typeof value !== "string" || value === "") {
        throw new Error(
          `Missing or invalid '${name}' at ${shardPath}[${index}]`,
        );
      }
      return value;
    };

    const id = field("id");
    const type = field("type");
    const from = field("from");
    const to = field("to");
    // YAML may auto-convert ISO dates to Date objects.
    const createdAt =
      rec.created_at instanceof Date
        ? rec.created_at.toISOString().replace(".000Z", "Z")
        : field("created_at");
    const result: RelationshipRecord = {
      id,
      type,
      from,
      to,
      created_at: createdAt,
      created_by: field("created_by"),
      source: field("source"),
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
  fs.mkdirSync(path.dirname(shardPath), { recursive: true });
  atomicWriteText(shardPath, renderShardRecords(records));
}

/** Canonical shard text for `records`: sorted and deduplicated. */
function renderShardRecords(records: RelationshipRecord[]): string {
  const sorted = sortRecords(records);
  const seen = new Set<string>();
  const unique: RelationshipRecord[] = [];

  for (const record of sorted) {
    const key = relationshipKey(record);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(record);
  }

  return serializeToYAML(unique);
}

/**
 * Publish one canonical shard replacement atomically. Relationship shards are
 * authored source, so a torn write must never leave a half-valid YAML file
 * for the next sync or Git operation.
 */
function atomicWriteText(targetPath: string, body: string): void {
  const temporary = `${targetPath}.kibi-write-${process.pid}-${crypto.randomUUID()}`;
  try {
    fs.writeFileSync(temporary, body, { mode: 0o600 });
    fs.renameSync(temporary, targetPath);
  } catch (error) {
    try {
      fs.unlinkSync(temporary);
    } catch {
      // No temporary was written, or it cannot be removed: preserve the
      // original publication failure.
    }
    throw error;
  }
}

export type RelationshipSelector = Readonly<{
  type: string;
  from: string;
  to: string;
}>;

/** The identity of a relationship: its type and both endpoints. */
function relationshipKey(relationship: RelationshipSelector): string {
  return `${relationship.type}\0${relationship.from}\0${relationship.to}`;
}

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
/**
 * A shard's YAML without the selected relationships. The sequence is patched in
 * place so comments, ordering, and unrelated records survive; callers that must
 * approve the bytes before writing (deletion plans) render without writing.
 */
// implements REQ-kibi-operation-interface-parity
export function renderShardWithout(
  text: string,
  selectors: readonly RelationshipSelector[],
  shardPath: string,
): string {
  const wanted = new Set(selectors.map(relationshipKey));
  const document = parseDocument(text);
  const sequence = relationshipSequence(document, shardPath);
  sequence.items = sequence.items.filter(
    (item) =>
      !(
        isMap(item) &&
        wanted.has(
          relationshipKey({
            type: String(item.get("type")),
            from: String(item.get("from")),
            to: String(item.get("to")),
          }),
        )
      ),
  );
  return document.toString();
}

/** The `relationships` sequence of a parsed shard document. */
function relationshipSequence(
  document: ReturnType<typeof parseDocument>,
  shardPath: string,
): YAMLSeq<unknown> {
  const sequence = document.get("relationships");
  if (!isSeq(sequence)) {
    throw new Error(
      `Invalid shard file: missing 'relationships' array at ${shardPath}`,
    );
  }
  return sequence;
}

export type PlannedShardRemovals = Readonly<{
  removals: RemovedRelationshipRecords[];
  /** Shard path -> its body without the selected records. */
  bodies: ReadonlyMap<string, string>;
}>;

/**
 * Render every shard that holds a selected relationship without writing it,
 * so a dry run can report the exact bytes a delete would publish.
 */
// implements REQ-kibi-operation-interface-parity
export function planRelationshipShardRemovals(
  kbRoot: string,
  selectors: readonly RelationshipSelector[],
): PlannedShardRemovals {
  const wanted = new Set(selectors.map(relationshipKey));
  const removed = new Map<string, { paths: string[]; sources: string[] }>();
  const bodies = new Map<string, string>();
  for (const shardPath of listShards(kbRoot)) {
    const text = fs.readFileSync(shardPath).toString();
    const matching = parseShardText(text, shardPath).filter((record) =>
      wanted.has(relationshipKey(record)),
    );
    if (matching.length === 0) continue;
    bodies.set(shardPath, renderShardWithout(text, selectors, shardPath));
    for (const record of matching) {
      const key = relationshipKey(record);
      const entry = removed.get(key) ?? { paths: [], sources: [] };
      entry.paths.push(shardPath);
      entry.sources.push(record.source);
      removed.set(key, entry);
    }
  }
  return {
    bodies,
    removals: selectors.map((selector) => {
      const entry = removed.get(relationshipKey(selector));
      return {
        selector,
        shardPaths: entry?.paths ?? [],
        sources: entry?.sources ?? [],
        removed: entry !== undefined,
      };
    }),
  };
}

export function removeRelationshipsFromShards(
  kbRoot: string,
  selectors: readonly RelationshipSelector[],
): RemovedRelationshipRecords[] {
  const planned = planRelationshipShardRemovals(kbRoot, selectors);
  for (const [shardPath, body] of planned.bodies) {
    atomicWriteText(shardPath, body);
  }
  return planned.removals;
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
  const existing = fs.existsSync(shardPath)
    ? fs.readFileSync(shardPath).toString()
    : null;
  const next = renderShardWithRelationship(shardPath, existing, relationship);
  if (next !== null) {
    fs.mkdirSync(path.dirname(shardPath), { recursive: true });
    atomicWriteText(shardPath, next);
  }

  return {
    shardPath,
    recordId: relationshipIdFor(
      relationship.type,
      relationship.from,
      relationship.to,
    ),
  };
}

/**
 * The shard text appendRelationship would publish for `relationship`, without
 * writing it: `existing` is the current shard text, or null when the shard
 * file does not exist. Returns null when the shard already records the
 * relationship. Callers that must journal exact after-bytes before any write
 * (atomic plan application) render a shard through this function.
 */
// implements REQ-kibi-operation-interface-parity, REQ-core-atomic-upsert-persistence
export function renderShardWithRelationship(
  shardPath: string,
  existing: string | null,
  relationship: Omit<RelationshipRecord, "id">,
): string | null {
  const newRecord: RelationshipRecord = {
    ...relationship,
    id: relationshipIdFor(
      relationship.type,
      relationship.from,
      relationship.to,
    ),
  };
  if (existing === null) return renderShardRecords([newRecord]);
  const key = relationshipKey(relationship);
  if (
    parseShardText(existing, shardPath).some(
      (record) => relationshipKey(record) === key,
    )
  ) {
    return null;
  }
  const document = parseDocument(existing);
  relationshipSequence(document, shardPath).items.push(newRecord);
  return document.toString();
}

/**
 * Lists all shard files in the relationships directory.
 */
export function listShards(kbRoot: string): string[] {
  const relationshipsDir = getRelationshipsDir(kbRoot);
  if (!fs.existsSync(relationshipsDir)) {
    return [];
  }

  // readdir order is filesystem-specific; sort so every reader and planner
  // sees the shards in the same order everywhere.
  return fs
    .readdirSync(relationshipsDir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => path.join(relationshipsDir, f));
}

/**
 * Reads all relationships from all shards.
 */
export function readAllShards(kbRoot: string): RelationshipRecord[] {
  return listShards(kbRoot).flatMap((shardPath) => readShard(shardPath));
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

  // Add existing records
  for (const record of existing) {
    recordMap.set(relationshipKey(record), record);
  }

  // Merge incoming records
  for (const record of incoming) {
    const key = relationshipKey(record);
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
