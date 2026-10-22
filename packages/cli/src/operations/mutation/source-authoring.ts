import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { dump as dumpYaml, load as loadYaml } from "js-yaml";
import {
  isCollection,
  isMap,
  isNode,
  isScalar,
  parseDocument,
  stringify,
} from "yaml";
import { OperationError } from "../../cli-errors.js";
import { reviseRequirementBody } from "../../entity-body-context.js";
import { requirementSemanticText } from "../../extractors/markdown.js";
import type { OperationContext } from "../../public/operations/runtime-types.js";
import { canonicalFilesystemPath } from "../../utils/canonical-path.js";
import {
  CANONICAL_ENTITY_PATHS,
  isDerivedKbPath,
} from "../../utils/kb-paths.js";
import { blockifySymbolManifest } from "../../utils/symbol-manifest-layout.js";
import type { RelationshipInput, UpsertInput } from "./types.js";

export type SourceWriteReceipt = Readonly<{
  path: string;
  mode: "write" | "delete";
  beforeHash: string | null;
  afterHash: string | null;
  created: boolean;
}>;

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function pendingReceiptPath(
  workspaceRoot: string,
  relativePath: string,
): string {
  return path.join(
    workspaceRoot,
    ".kb",
    "recovery",
    "pending-sources",
    `${digest(relativePath)}.json`,
  );
}

export function writePendingSourceReceipt(
  workspaceRoot: string,
  relativePath: string,
  afterHash: string,
): void {
  const receiptPath = pendingReceiptPath(workspaceRoot, relativePath);
  fs.mkdirSync(path.dirname(receiptPath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(
    receiptPath,
    `${JSON.stringify(
      {
        version: 1,
        path: relativePath,
        afterHash,
        createdAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
}

type FileTimes = Readonly<{ atime: Date; mtime: Date }>;

/** The access and modification times of a file, or `null` when unreadable. */
// implements REQ-core-atomic-upsert-persistence
export function readFileTimes(absolutePath: string): FileTimes | null {
  try {
    const stat = fs.statSync(absolutePath);
    return { atime: stat.atime, mtime: stat.mtime };
  } catch {
    return null;
  }
}

/**
 * Put a restored file's times back so freshness checks, which compare file
 * times with the compiled snapshot, do not report a rolled-back write as a
 * newer source. Best effort: a port without a host file is left alone.
 */
// implements REQ-core-atomic-upsert-persistence
export function restoreFileTimes(
  absolutePath: string,
  times: FileTimes | null,
): void {
  if (times === null) return;
  try {
    fs.utimesSync(absolutePath, times.atime, times.mtime);
  } catch {
    // The bytes are restored; a failed time reset only costs a sync.
  }
}

/**
 * Snapshot a pending-source receipt's bytes, or `null` when none exists, so a
 * rolled-back write can restore the receipt exactly as it found it.
 */
// implements REQ-core-atomic-upsert-persistence
function readPendingSourceReceiptBytes(receiptPath: string): string | null {
  try {
    return fs.readFileSync(receiptPath, "utf8");
  } catch {
    return null;
  }
}

/**
 * Retire the pending receipt of a source that a committed plan deleted. A
 * receipt binds untracked input to exact bytes, so one left behind for a
 * removed file makes every later sync fail on a missing pending source.
 */
// implements REQ-core-atomic-upsert-persistence, REQ-kibi-operation-interface-parity
export function retirePendingSourceReceipt(
  workspaceRoot: string,
  relativePath: string,
): void {
  try {
    fs.unlinkSync(pendingReceiptPath(workspaceRoot, relativePath));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

/**
 * Rebind the pending receipt of an untracked source that a migration rewrote
 * in place. A receipt pins the file to exact bytes; a rewrite that leaves the
 * old hash behind makes every later sync refuse the file as "hash drift", so
 * a migration republishes the receipt it finds, and leaves a file without
 * one alone (tracked sources carry no receipt). Returns whether one existed.
 */
// implements REQ-cli-schema-migration, REQ-core-atomic-upsert-persistence
export function republishPendingSourceReceipt(
  workspaceRoot: string,
  relativePath: string,
  afterHash: string,
): boolean {
  const receiptPath = pendingReceiptPath(workspaceRoot, relativePath);
  const raw = readPendingSourceReceiptBytes(receiptPath);
  if (raw === null) return false;
  let receipt: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw) as unknown;
    receipt =
      parsed !== null && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
  } catch {
    receipt = {};
  }
  fs.writeFileSync(
    receiptPath,
    `${JSON.stringify(
      {
        version: 1,
        ...receipt,
        path: relativePath,
        afterHash,
        rebasedAt: new Date().toISOString(),
      },
      null,
      2,
    )}\n`,
    { mode: 0o600 },
  );
  return true;
}

/**
 * Authored YAML round-trips keep long scalars on one line, matching sync and
 * coordinate refresh output, so editing one entry never refolds the others.
 */
const AUTHORED_YAML_OPTIONS = { lineWidth: 0 } as const;

function authoredPath(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const normalized = value.replaceAll("\\", "/");
  if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//.test(normalized)) return undefined;
  if (!/\.(?:md|mdx|ya?ml)$/i.test(normalized)) return undefined;
  return normalized;
}

export function resolveContainedSourcePath(
  workspaceRoot: string,
  relative: string,
): string {
  if (
    path.isAbsolute(relative) ||
    relative.split(/[\\/]/).some((part) => part === ".." || part === "")
  ) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `document.path must be a workspace-relative path without traversal: ${relative}`,
    );
  }
  const absolute = path.resolve(workspaceRoot, relative);
  const root = path.resolve(workspaceRoot);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `document.path escapes the workspace: ${relative}`,
    );
  }
  const workspaceRelative = path
    .relative(root, absolute)
    .replaceAll(path.sep, "/");
  if (isDerivedKbPath(workspaceRelative)) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `document.path cannot target Kibi's derived state under ${workspaceRelative}: ${relative}`,
    );
  }
  // A symlinked existing file or parent could otherwise escape the workspace.
  const realRoot = canonicalFilesystemPath(root);
  const real = canonicalFilesystemPath(absolute);
  if (real !== realRoot && !real.startsWith(`${realRoot}${path.sep}`)) {
    throw new OperationError(
      "SOURCE_PATH_INVALID",
      `document.path resolves outside the workspace: ${relative}`,
    );
  }
  return absolute;
}

export function normalizeAuthoredSourcePath(
  workspaceRoot: string,
  source: string,
): string {
  const normalized = source.replaceAll("\\", "/");
  const root = path.resolve(workspaceRoot);
  let relative = normalized;
  if (path.isAbsolute(normalized)) {
    const absolute = path.resolve(normalized);
    relative =
      absolute === root || absolute.startsWith(`${root}${path.sep}`)
        ? path.relative(root, absolute)
        : path.relative(
            canonicalFilesystemPath(root),
            canonicalFilesystemPath(absolute),
          );
  }
  return path
    .relative(
      path.resolve(workspaceRoot),
      resolveContainedSourcePath(workspaceRoot, relative),
    )
    .replaceAll(path.sep, "/");
}

/** The raw front matter block of a Markdown document, split at its fences. */
function frontmatterBlock(
  content: string,
): { opening: string; raw: string; body: string } | undefined {
  if (!content.startsWith("---")) return undefined;
  const firstEnd = content.indexOf("\n", 3);
  if (firstEnd < 0) return undefined;
  const marker = content.indexOf("\n---", firstEnd);
  if (marker < 0) return undefined;
  return {
    opening: content.slice(0, firstEnd + 1),
    raw: content.slice(firstEnd + 1, marker),
    body: content.slice(marker + "\n---".length),
  };
}

function bodyAndFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const block = frontmatterBlock(content);
  if (block === undefined) return { frontmatter: {}, body: content };
  const parsed = loadYaml(block.raw);
  return {
    frontmatter:
      parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {},
    body: block.body,
  };
}

/**
 * Canonical authored target for an entity type: `.kb/<lane>/<ID>.md` for
 * markdown entities and `.kb/symbols.yaml` for symbols. Kibi owns these
 * locations; repositories cannot relocate them.
 */
export function configuredSourceTarget(
  workspaceRoot: string,
  type: string,
): string | undefined {
  const laneByType: Record<string, string | undefined> = {
    req: CANONICAL_ENTITY_PATHS.requirements,
    scenario: CANONICAL_ENTITY_PATHS.scenarios,
    test: CANONICAL_ENTITY_PATHS.tests,
    adr: CANONICAL_ENTITY_PATHS.adr,
    flag: CANONICAL_ENTITY_PATHS.flags,
    event: CANONICAL_ENTITY_PATHS.events,
    fact: CANONICAL_ENTITY_PATHS.facts,
    symbol: CANONICAL_ENTITY_PATHS.symbols,
  };
  return laneByType[type];
}

export function hasConfiguredSourceTarget(
  workspaceRoot: string,
  type: string,
): boolean {
  return configuredSourceTarget(workspaceRoot, type) !== undefined;
}

function sourcePath(
  context: OperationContext,
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existing: Readonly<Record<string, unknown>> | undefined,
): string {
  const requested = input.document?.path;
  const canonical = configuredSourceTarget(context.workspaceRoot, input.type);
  let relative: string | undefined =
    requested ?? authoredPath(existing?.source);
  // Canonical markdown lanes name a directory; append the entity's file so
  // upserts without document.path land in the canonical location.
  if (
    relative === undefined &&
    canonical !== undefined &&
    !/\.(?:md|mdx|ya?ml)$/i.test(canonical)
  ) {
    relative = `${canonical}/${String(entity.id)}.md`;
  } else if (relative === undefined && canonical !== undefined) {
    relative = canonical;
  }
  if (!relative) {
    throw new OperationError(
      "DOCUMENT_PATH_REQUIRED",
      `No writable source target is available for ${input.type}; provide document.path explicitly`,
    );
  }
  // Extracted entities may carry an absolute source path even though the
  // authored document contract is workspace-relative. Rebase paths that are
  // inside the workspace before applying containment and symlink checks.
  if (path.isAbsolute(relative)) {
    const root = path.resolve(context.workspaceRoot);
    const absolute = path.resolve(relative);
    if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
      throw new OperationError(
        "SOURCE_PATH_INVALID",
        `document.path resolves outside the workspace: ${relative}`,
      );
    }
    relative = path.relative(root, absolute).replaceAll(path.sep, "/");
  }
  return resolveContainedSourcePath(context.workspaceRoot, relative);
}

/**
 * The absolute authored document an upsert of an entity the store does not
 * hold would write: the same resolution writeSourceForUpsert uses, so a check
 * on that file judges the file the writer merges into. Undefined when the
 * writer has no target (it reports DOCUMENT_PATH_REQUIRED itself).
 */
// implements REQ-kibi-uncompiled-source-visibility
export function newEntitySourceTarget(
  context: OperationContext,
  input: UpsertInput,
): string | undefined {
  try {
    return sourcePath(context, input, { id: input.id }, undefined);
  } catch {
    return undefined;
  }
}

/** The front matter of an authored document; throws on YAML it cannot parse. */
// implements REQ-kibi-uncompiled-source-visibility
export function authoredFrontmatter(content: string): Record<string, unknown> {
  return bodyAndFrontmatter(content).frontmatter;
}

/**
 * Front matter keys an upsert never writes: runtime provenance/timestamps
 * belong to the compiled entity, not to the authored source artifact, and
 * relationships live in `links`/shards. Keeping them out also makes the
 * source diff deterministic across CLI and MCP transports.
 */
const UNAUTHORED_FRONTMATTER_KEYS = new Set([
  "id",
  "type",
  "source",
  "links",
  "relationships",
  "created_at",
  "updated_at",
]);

/** The front matter values an upsert of `entity` sets, in write order. */
function entityFrontmatterUpdates(
  entity: Readonly<Record<string, unknown>>,
  existing: Readonly<Record<string, unknown>>,
  body: string,
): Record<string, unknown> {
  const updates: Record<string, unknown> = Object.fromEntries(
    Object.entries(entity).filter(
      ([key, value]) =>
        value !== undefined && !UNAUTHORED_FRONTMATTER_KEYS.has(key),
    ),
  );
  updates.id = entity.id;
  if (updates.title === undefined && existing.title === undefined) {
    updates.title = entity.id;
  }
  updates.type = entity.type;
  // The checked meaning is always stated, never derived from a body that now
  // also carries context sections.
  const semanticText = updates.semantic_text ?? existing.semantic_text;
  if (
    entity.type === "req" &&
    (typeof semanticText !== "string" || semanticText.trim() === "")
  ) {
    const derived = requirementSemanticText(body);
    if (derived !== "") updates.semantic_text = derived;
  }
  return updates;
}

/**
 * Apply `updates` to an existing front matter block without re-serializing
 * it: only keys whose value actually changes are rewritten (or appended), so
 * every untouched key keeps its authored bytes (quoting, timestamps, flow
 * lists, indentation, comments). Returns undefined when the block is not a
 * plain block mapping that can be patched in place.
 */
// implements REQ-core-persistence
function patchFrontmatter(
  raw: string,
  loaded: Readonly<Record<string, unknown>>,
  updates: Readonly<Record<string, unknown>>,
): string | undefined {
  const doc = parseDocument(raw);
  if (doc.errors.length > 0) return undefined;
  const contents = doc.contents;
  if (contents === null && raw.trim() !== "") return undefined;
  if (contents !== null && (!isMap(contents) || contents.flow)) {
    return undefined;
  }
  const pairs = contents === null ? [] : contents.items;
  const current = (doc.toJS() ?? {}) as Record<string, unknown>;
  const edits: Array<{ start: number; end: number; text: string }> = [];
  const appended: string[] = [];
  for (const [key, value] of Object.entries(updates)) {
    const pair = pairs.find(
      (candidate) =>
        isScalar(candidate.key) && String(candidate.key.value) === key,
    );
    if (
      pair !== undefined &&
      (isDeepStrictEqual(current[key], value) ||
        isDeepStrictEqual(loaded[key], value))
    ) {
      continue;
    }
    const valueNode = pair?.value;
    const flow = isCollection(valueNode) && valueNode.flow === true;
    const text = dumpYaml(
      { [key]: value },
      {
        noRefs: true,
        lineWidth: -1,
        sortKeys: false,
        ...(flow ? { flowLevel: 1 } : {}),
      },
    ).replace(/\n$/, "");
    if (pair === undefined) {
      appended.push(text);
      continue;
    }
    const keyRange = isScalar(pair.key) ? pair.key.range : undefined;
    if (!keyRange) return undefined;
    const start = keyRange[0];
    let end =
      isNode(valueNode) && valueNode.range ? valueNode.range[1] : keyRange[2];
    // `key:` with no value: replace through the end of the key's line.
    if (end <= keyRange[1]) {
      const lineEnd = raw.indexOf("\n", keyRange[1]);
      end = lineEnd < 0 ? raw.length : lineEnd;
    }
    while (end > start && /[\r\n]/.test(raw[end - 1] ?? "")) end -= 1;
    edits.push({ start, end, text });
  }
  let patched = raw;
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    patched = `${patched.slice(0, edit.start)}${edit.text}${patched.slice(edit.end)}`;
  }
  if (appended.length > 0) {
    const separator = patched === "" || patched.endsWith("\n") ? "" : "\n";
    patched = `${patched}${separator}${appended.join("\n")}`;
  }
  return patched;
}

// implements REQ-kb-upsert-statement-follows-semantic-text
function sameStatement(left: string, right: string): boolean {
  const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
  return normalized(left) === normalized(right);
}

/**
 * The body an upsert without `document.body` keeps. A requirement whose
 * `semantic_text` changes gets the new statement in place of the old one
 * (context sections are kept), so search and readers of the document never
 * quote a statement the requirement no longer makes.
 */
// implements REQ-kb-upsert-statement-follows-semantic-text
function bodyForStatement(
  type: string,
  entity: Readonly<Record<string, unknown>>,
  existing: { frontmatter: Record<string, unknown>; body: string },
): string {
  if (type !== "req" || typeof entity.semantic_text !== "string") {
    return existing.body;
  }
  const previous =
    typeof existing.frontmatter.semantic_text === "string"
      ? existing.frontmatter.semantic_text
      : requirementSemanticText(existing.body);
  if (sameStatement(previous, entity.semantic_text)) return existing.body;
  const leading = /^\n*/.exec(existing.body)?.[0] || "\n\n";
  return `${leading}${reviseRequirementBody({
    existingBody: existing.body,
    statement: entity.semantic_text,
  })}`;
}

function renderEntityDocument(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existingContent: string | undefined,
): string {
  const existing = existingContent
    ? bodyAndFrontmatter(existingContent)
    : { frontmatter: {}, body: "" };
  const body =
    input.document?.body !== undefined
      ? input.document.body
      : existingContent !== undefined
        ? bodyForStatement(input.type, entity, existing)
        : input.type === "req"
          ? `${String(entity.semantic_text ?? "").trim()}\n`
          : "\n";
  const updates = entityFrontmatterUpdates(entity, existing.frontmatter, body);
  const bodySuffix = `${body.startsWith("\n") ? "" : "\n"}${body}`;
  // An existing document keeps its authored front matter bytes; only the
  // keys this upsert changes are rewritten.
  const block =
    existingContent !== undefined
      ? frontmatterBlock(existingContent)
      : undefined;
  if (block !== undefined) {
    const patched = patchFrontmatter(block.raw, existing.frontmatter, updates);
    if (patched !== undefined) {
      return `${block.opening}${patched}\n---${bodySuffix}`;
    }
  }
  const frontmatter = { ...existing.frontmatter, ...updates };
  return `---\n${dumpYaml(frontmatter, { noRefs: true, lineWidth: -1, sortKeys: false })}---${bodySuffix}`;
}

/** Generated coordinate fields belong exclusively to `.kb/symbol-coordinates.yaml`. */
// implements REQ-generated-coordinate-persistence
export const GENERATED_SYMBOL_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
  "coordinatesGeneratedAt",
] as const;

function symbolManifestRecord(
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly Readonly<{ type: string; target: string }>[] = [],
): Record<string, unknown> {
  const record = Object.fromEntries(
    Object.entries(entity).filter(
      ([key]) =>
        ![
          "type",
          "source",
          "relationships",
          "created_at",
          "updated_at",
          // Generated coordinates are compiler output. They must never enter
          // the authored manifest, including legacy inline occurrences.
          ...GENERATED_SYMBOL_FIELDS,
        ].includes(key),
    ),
  );
  if (relationships.length > 0) {
    record.relationships = relationships.map(({ type, target }) => ({
      type,
      target,
    }));
  }
  return record;
}

export function manifestRelationships(
  item: unknown,
): Array<{ type: string; target: string }> {
  if (
    item === null ||
    typeof item !== "object" ||
    !("get" in item) ||
    typeof (item as { get?: unknown }).get !== "function"
  ) {
    return [];
  }
  const sequence = (
    item as { get(key: string, keepCst?: boolean): unknown }
  ).get("relationships", true);
  if (
    sequence === null ||
    typeof sequence !== "object" ||
    !("toJSON" in sequence) ||
    typeof (sequence as { toJSON?: unknown }).toJSON !== "function"
  ) {
    return [];
  }
  const value = (sequence as { toJSON(): unknown }).toJSON();
  if (!Array.isArray(value)) return [];
  return value.flatMap((relationship) => {
    if (relationship === null || typeof relationship !== "object") {
      return [];
    }
    const candidate = relationship as Record<string, unknown>;
    const type = candidate.type;
    const target = candidate.target ?? candidate.to;
    return typeof type === "string" && typeof target === "string"
      ? [{ type, target }]
      : [];
  });
}

// implements REQ-source-analysis-v2
function manifestRecord(item: unknown): Record<string, unknown> | undefined {
  if (
    item === null ||
    typeof item !== "object" ||
    !("toJSON" in item) ||
    typeof (item as { toJSON?: unknown }).toJSON !== "function"
  ) {
    return undefined;
  }
  const value = (item as { toJSON(): unknown }).toJSON();
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

// implements REQ-source-analysis-v2
function failDuplicateConflict(entityId: string, field: string): never {
  throw new OperationError(
    "SOURCE_DUPLICATE_CONFLICT",
    `Duplicate symbol ${entityId} has conflicting authored field "${field}"; no source was written`,
    false,
  );
}

// implements REQ-source-analysis-v2
function mergeCompatibleManifestField(
  target: Record<string, unknown>,
  field: string,
  value: unknown,
  entityId: string,
  conflictField = field,
): void {
  if (Object.hasOwn(target, field)) {
    if (!isDeepStrictEqual(target[field], value)) {
      failDuplicateConflict(entityId, conflictField);
    }
    return;
  }
  Object.defineProperty(target, field, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

// implements REQ-source-analysis-v2
function mergeDuplicateManifestFields(
  records: readonly Record<string, unknown>[],
  entityId: string,
): Record<string, unknown> {
  const merged = Object.create(null) as Record<string, unknown>;
  for (const record of records) {
    // Links and typed relationships are collections, so merge them separately
    // instead of treating a difference as conflicting scalar metadata.
    const authored = Object.fromEntries(
      Object.entries(symbolManifestRecord(record)).filter(
        ([key]) => key !== "links",
      ),
    );
    for (const [key, value] of Object.entries(authored)) {
      mergeCompatibleManifestField(merged, key, value, entityId);
    }
  }
  return merged;
}

// implements REQ-source-analysis-v2
function manifestRelationshipRecords(
  record: Readonly<Record<string, unknown>>,
  entityId: string,
): unknown[] {
  if (record.relationships === undefined) return [];
  if (!Array.isArray(record.relationships)) {
    failDuplicateConflict(entityId, "relationships");
  }
  return record.relationships;
}

// implements REQ-source-analysis-v2
function mergeManifestRelationshipRecords(
  records: readonly Record<string, unknown>[],
  incoming: readonly RelationshipInput[],
  entityId: string,
): unknown[] {
  const merged = new Map<string, Record<string, unknown>>();
  const untyped: unknown[] = [];
  for (const record of records) {
    for (const row of manifestRelationshipRecords(record, entityId)) {
      if (row === null || typeof row !== "object" || Array.isArray(row)) {
        if (!untyped.some((value) => isDeepStrictEqual(value, row))) {
          untyped.push(row);
        }
        continue;
      }
      const candidate = row as Record<string, unknown>;
      const type = candidate.type;
      const target = candidate.target ?? candidate.to;
      if (typeof type !== "string" || typeof target !== "string") {
        if (!untyped.some((value) => isDeepStrictEqual(value, row))) {
          untyped.push(row);
        }
        continue;
      }
      const key = `${type}\u0000${target}`;
      const normalized = {
        ...Object.fromEntries(
          Object.entries(candidate).filter(([key]) => key !== "to"),
        ),
        type,
        target,
      };
      const previous = merged.get(key);
      if (previous) {
        for (const [field, value] of Object.entries(normalized)) {
          mergeCompatibleManifestField(
            previous,
            field,
            value,
            entityId,
            `relationship ${type} -> ${target}.${field}`,
          );
        }
      } else {
        merged.set(key, normalized);
      }
    }
  }
  for (const relationship of incoming) {
    if (
      relationship.from !== entityId ||
      typeof relationship.type !== "string" ||
      typeof relationship.to !== "string"
    ) {
      continue;
    }
    const key = `${relationship.type}\u0000${relationship.to}`;
    const normalized = {
      ...Object.fromEntries(
        Object.entries(relationship).filter(
          ([key]) => key !== "from" && key !== "to",
        ),
      ),
      type: relationship.type,
      target: relationship.to,
    };
    const previous = merged.get(key);
    if (previous) {
      for (const [field, value] of Object.entries(normalized)) {
        mergeCompatibleManifestField(
          previous,
          field,
          value,
          entityId,
          `relationship ${relationship.type} -> ${relationship.to}.${field}`,
        );
      }
    } else {
      merged.set(key, normalized);
    }
  }
  return [
    ...[...merged.values()].sort((left, right) =>
      `${String(left.type)}\u0000${String(left.target)}`.localeCompare(
        `${String(right.type)}\u0000${String(right.target)}`,
      ),
    ),
    ...untyped,
  ];
}

// implements REQ-source-analysis-v2
function mergeManifestLinks(
  records: readonly Record<string, unknown>[],
  entity: Readonly<Record<string, unknown>>,
): unknown[] | undefined {
  const values = [
    ...records.map((record) => record.links),
    entity.links,
  ].filter((value) => value !== undefined);
  if (values.length === 0) return undefined;
  const links: unknown[] = [];
  for (const value of values) {
    const entries = Array.isArray(value) ? value : [value];
    for (const entry of entries) {
      if (!links.some((existing) => isDeepStrictEqual(existing, entry))) {
        links.push(entry);
      }
    }
  }
  return links;
}

/** Indexes of every manifest entry whose `id` equals `id`, in file order. */
function symbolManifestIndexes(
  items: readonly unknown[],
  id: string,
): number[] {
  return items.flatMap((item, index) =>
    item &&
    typeof item === "object" &&
    "get" in item &&
    String((item as { get(key: string): unknown }).get("id")) === id
      ? [index]
      : [],
  );
}

function renderSymbolManifest(
  entity: Readonly<Record<string, unknown>>,
  relationships: readonly RelationshipInput[],
  existingContent: string | undefined,
): string {
  if (existingContent === undefined) {
    const created = symbolManifestRecord(entity);
    const rows = mergeManifestRelationshipRecords(
      [],
      relationships,
      String(entity.id),
    );
    if (rows.length > 0) created.relationships = rows;
    const doc = parseDocument(stringify({ symbols: [created] }));
    return doc.toString(AUTHORED_YAML_OPTIONS);
  }
  const doc = parseDocument(existingContent);
  const symbols = doc.get("symbols", true);
  if (!symbols || typeof symbols !== "object" || !("items" in symbols)) {
    throw new OperationError(
      "SOURCE_FORMAT_INVALID",
      "Symbol manifest must contain a symbols array",
    );
  }
  // implements REQ-core-persistence
  // Render the list (and the entries that were written inside it) as block
  // YAML so diffs stay reviewable.
  blockifySymbolManifest(doc);
  const items = (symbols as { items: unknown[] }).items;
  const id = String(entity.id);
  const indices = items.flatMap((item, index) => {
    if (!item || typeof item !== "object" || !("get" in item)) return [];
    return String((item as { get(key: string): unknown }).get("id")) === id
      ? [index]
      : [];
  });
  const existingRecords = indices
    .map((index) => manifestRecord(items[index]))
    .filter(
      (record): record is Record<string, unknown> => record !== undefined,
    );
  if (existingRecords.length !== indices.length) {
    failDuplicateConflict(id, "record");
  }
  const previous = mergeDuplicateManifestFields(existingRecords, id);
  const next = { ...previous, ...symbolManifestRecord(entity) };
  const mergedRelationships = mergeManifestRelationshipRecords(
    existingRecords,
    relationships,
    id,
  );
  if (mergedRelationships.length > 0) {
    next.relationships = mergedRelationships;
  }
  const mergedLinks = mergeManifestLinks(existingRecords, entity);
  if (mergedLinks !== undefined) next.links = mergedLinks;
  if (indices.length > 0) {
    // Patch one canonical row and remove all redundant copies only after
    // compatible authored fields and all links have been merged successfully.
    doc.setIn(["symbols", indices[0]], next);
    for (const duplicateIndex of indices.slice(1).reverse()) {
      items.splice(duplicateIndex, 1);
    }
  } else {
    doc.addIn(["symbols"], next);
  }
  return doc.toString(AUTHORED_YAML_OPTIONS);
}

export function renderSourceDeletion(
  sourcePathValue: string,
  entityId: string,
  entityType: string,
  existingContent: string,
): { mode: "write" | "delete"; body?: string } {
  const extension = path.extname(sourcePathValue).toLowerCase();
  if (extension === ".md" || extension === ".mdx") {
    const parsed = bodyAndFrontmatter(existingContent);
    if (String(parsed.frontmatter.id ?? "") !== entityId) {
      throw new OperationError(
        "SOURCE_ENTITY_MISMATCH",
        `Authored document ${sourcePathValue} does not contain ${entityId}`,
      );
    }
    return { mode: "delete" };
  }
  if (extension === ".yaml" || extension === ".yml") {
    if (entityType !== "symbol") {
      throw new OperationError(
        "SOURCE_FORMAT_UNSUPPORTED",
        `YAML deletion is supported only for symbol manifests, not ${entityType}`,
      );
    }
    const doc = parseDocument(existingContent);
    const symbols = doc.get("symbols", true);
    if (!symbols || typeof symbols !== "object" || !("items" in symbols)) {
      throw new OperationError(
        "SOURCE_FORMAT_INVALID",
        "Symbol manifest must contain a symbols array",
      );
    }
    const items = (symbols as { items: unknown[] }).items;
    const matches = symbolManifestIndexes(items, entityId);
    if (matches.length === 0) {
      throw new OperationError(
        "SOURCE_ENTITY_MISMATCH",
        `Symbol manifest ${sourcePathValue} does not contain ${entityId}`,
      );
    }
    // Delete every copy, last first so earlier indexes stay valid.
    for (const match of [...matches].reverse()) {
      doc.deleteIn(["symbols", match]);
    }
    return { mode: "write", body: doc.toString(AUTHORED_YAML_OPTIONS) };
  }
  throw new OperationError(
    "SOURCE_FORMAT_UNSUPPORTED",
    `Unsupported authored source format: ${extension || "unknown"}`,
  );
}

/**
 * Remove one legacy relationship declaration from an authored Markdown
 * document.  Relationship shards are the canonical relationship lane, but
 * older entity documents may still carry `links` or typed `relationships`
 * frontmatter.  When such a declaration is explicitly deleted, patch only
 * that record through the YAML CST so comments, ordering, and the Markdown
 * body remain byte-stable.
 */
export function renderMarkdownRelationshipDeletion(
  sourcePathValue: string,
  existingContent: string,
  selector: Readonly<{ type: string; from: string; to: string }>,
): { body: string; removed: boolean } {
  const extension = path.extname(sourcePathValue).toLowerCase();
  if (extension !== ".md" && extension !== ".mdx") {
    throw new OperationError(
      "SOURCE_FORMAT_UNSUPPORTED",
      `Relationship declarations can only be patched in Markdown documents: ${sourcePathValue}`,
    );
  }
  if (!existingContent.startsWith("---"))
    return { body: existingContent, removed: false };
  const firstEnd = existingContent.indexOf("\n", 3);
  if (firstEnd < 0) return { body: existingContent, removed: false };
  const marker = existingContent.indexOf("\n---", firstEnd);
  if (marker < 0) return { body: existingContent, removed: false };
  const frontmatter = parseDocument(
    existingContent.slice(firstEnd + 1, marker),
  );
  let removed = false;
  for (const key of ["links", "relationships"] as const) {
    const sequence = frontmatter.get(key, true);
    if (!sequence || typeof sequence !== "object" || !("items" in sequence))
      continue;
    const items = (sequence as { items: unknown[] }).items;
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const item = items[index];
      if (!item || typeof item !== "object") continue;
      if (key === "links" && !("get" in item)) {
        const scalar = item as { toJSON?: () => unknown; value?: unknown };
        const value = scalar.toJSON?.() ?? scalar.value;
        if (
          typeof value === "string" &&
          value.replace(/^kb:entity\//, "") === selector.to
        ) {
          frontmatter.deleteIn([key, index]);
          removed = true;
        }
        continue;
      }
      if (!("get" in item)) continue;
      const node = item as { get(name: string): unknown };
      const target = node.get("target") ?? node.get("to");
      const relationType = node.get("type");
      const matches =
        typeof target === "string" &&
        target.replace(/^kb:entity\//, "") === selector.to &&
        (key === "links" ||
          relationType === selector.type ||
          relationType === undefined);
      if (matches) {
        frontmatter.deleteIn([key, index]);
        removed = true;
      }
    }
  }
  if (!removed) return { body: existingContent, removed: false };
  const body = existingContent.slice(marker + "\n---".length);
  return {
    body: `---\n${frontmatter.toString(AUTHORED_YAML_OPTIONS)}---${body.startsWith("\n") ? "" : "\n"}${body}`,
    removed: true,
  };
}

/**
 * Remove one exact typed relationship from an authored symbol manifest. The
 * YAML CST is edited in place so comments, ordering, and unrelated symbols or
 * relationships remain authored content rather than being re-serialized.
 */
export function renderYamlRelationshipDeletion(
  sourcePathValue: string,
  existingContent: string,
  selector: Readonly<{ type: string; from: string; to: string }>,
): { body: string; removed: boolean } {
  const extension = path.extname(sourcePathValue).toLowerCase();
  if (extension !== ".yaml" && extension !== ".yml") {
    throw new OperationError(
      "SOURCE_FORMAT_UNSUPPORTED",
      `Relationship declarations can only be patched in YAML symbol manifests: ${sourcePathValue}`,
    );
  }
  const doc = parseDocument(existingContent);
  if (doc.errors.length > 0) {
    throw new OperationError(
      "SOURCE_FORMAT_INVALID",
      `Symbol manifest contains invalid YAML: ${doc.errors[0]?.message ?? "parse failed"}`,
    );
  }
  const symbols = doc.get("symbols", true);
  if (!symbols || typeof symbols !== "object" || !("items" in symbols)) {
    throw new OperationError(
      "SOURCE_FORMAT_INVALID",
      "Symbol manifest must contain a symbols array",
    );
  }
  const items = (symbols as { items: unknown[] }).items;
  const symbol = items.find((item) => {
    if (!item || typeof item !== "object" || !("get" in item)) return false;
    return (
      String((item as { get(key: string): unknown }).get("id")) ===
      selector.from
    );
  });
  if (!symbol || typeof symbol !== "object" || !("get" in symbol)) {
    return { body: existingContent, removed: false };
  }
  const relationships = (
    symbol as { get(key: string, keepCst?: boolean): unknown }
  ).get("relationships", true);
  if (
    !relationships ||
    typeof relationships !== "object" ||
    !("items" in relationships)
  ) {
    return { body: existingContent, removed: false };
  }
  const relationshipItems = (relationships as { items: unknown[] }).items;
  let removed = false;
  for (let index = relationshipItems.length - 1; index >= 0; index -= 1) {
    const item = relationshipItems[index];
    if (!item || typeof item !== "object" || !("get" in item)) continue;
    const node = item as { get(key: string): unknown };
    const type = node.get("type");
    const target = node.get("target") ?? node.get("to");
    const normalizedTarget =
      typeof target === "string"
        ? target.replace(/^kb:entity\//, "")
        : undefined;
    if (type === selector.type && normalizedTarget === selector.to) {
      (relationships as unknown as { delete(index: number): unknown }).delete(
        index,
      );
      removed = true;
    }
  }
  return removed
    ? { body: doc.toString(AUTHORED_YAML_OPTIONS), removed: true }
    : { body: existingContent, removed: false };
}

/**
 * The bytes an upsert of `entity` publishes at `relativePath`, merged into the
 * document's current content. Compile plans render their documents with it
 * so a plan writes exactly what `kb_upsert` would.
 */
// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-kb-upsert-statement-follows-semantic-text
export function renderSourceDocument(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existingContent: string | undefined,
  relativePath: string,
): string {
  const extension = path.extname(relativePath).toLowerCase();
  if (extension === ".yaml" || extension === ".yml") {
    if (input.type !== "symbol") {
      throw new OperationError(
        "SOURCE_FORMAT_UNSUPPORTED",
        `YAML source authoring is supported only for symbol manifests, not ${input.type}`,
      );
    }
    return renderSymbolManifest(
      entity,
      input.relationships ?? [],
      existingContent,
    );
  }
  if (extension !== ".md" && extension !== ".mdx") {
    throw new OperationError(
      "SOURCE_FORMAT_UNSUPPORTED",
      `Unsupported authored source format: ${extension || "unknown"}`,
    );
  }
  return renderEntityDocument(input, entity, existingContent);
}

/**
 * Whether Git definitely does not track `relative`. Sync reads only tracked
 * sources plus pending-source receipts, so an untracked file (for example the
 * `.kb/symbols.yaml` that `kibi init` creates) needs a receipt on every
 * write, or a new branch store compiles relationships without the entities
 * they connect. Any other Git outcome (not a repository, git missing) is
 * "unknown" and keeps the previous behaviour.
 */
// implements REQ-core-persistence
export function isUntrackedByGit(
  workspaceRoot: string,
  relative: string,
): boolean {
  try {
    execFileSync(
      "git",
      ["-C", workspaceRoot, "ls-files", "--error-unmatch", "--", relative],
      // Bounded: a write must never wait on Git. A timeout reads as
      // "tracked", the pre-receipt behaviour.
      { stdio: "ignore", timeout: 10_000 },
    );
    return false;
  } catch (error) {
    return (error as { status?: unknown }).status === 1;
  }
}

// implements REQ-kibi-operation-interface-parity
/**
 * The authored document an upsert publishes, resolved and rendered without
 * writing: the target path (with its containment checks), the current bytes
 * and the bytes the write would publish. writeSourceForUpsert publishes
 * exactly this, and a kb_upsert dry run renders it so a path or format the
 * write would refuse is refused by the dry run too.
 */
export async function renderSourceWrite(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existing: Readonly<Record<string, unknown>> | undefined,
  context: OperationContext & {
    readonly fs: NonNullable<OperationContext["fs"]>;
  },
  sourceDocumentOverride?: string,
): Promise<{
  absolute: string;
  relative: string;
  before: string | undefined;
  after: string;
}> {
  const absolute = sourcePath(context, input, entity, existing);
  const relative = path
    .relative(context.workspaceRoot, absolute)
    .replaceAll("\\", "/");
  let before: string | undefined;
  try {
    before = await context.fs.readFile(absolute);
  } catch {
    before = undefined;
  }
  // Proof-receipt ingest supplies pre-patched bytes so unrelated frontmatter
  // keeps its authored formatting (and the workspace snapshot stays stable).
  // Only valid when the document already exists; a new document still needs
  // the canonical render.
  const after =
    before !== undefined && sourceDocumentOverride !== undefined
      ? sourceDocumentOverride
      : renderSourceDocument(input, entity, before, relative);
  return { absolute, relative, before, after };
}

export async function writeSourceForUpsert(
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existing?: Readonly<Record<string, unknown>>,
  context?: OperationContext,
  sourceDocumentOverride?: string,
): Promise<{
  receipt: SourceWriteReceipt;
  rollback: () => Promise<void>;
} | null> {
  if (!context?.fs) return null;
  const { absolute, relative, before, after } = await renderSourceWrite(
    input,
    entity,
    existing,
    { ...context, fs: context.fs },
    sourceDocumentOverride,
  );
  // Freshness compares file times with the compiled snapshot, so restoring
  // the bytes alone would still make an untouched entity read as stale after
  // a rolled-back write. Snapshot the times before the publication below.
  const priorTimes = before === undefined ? null : readFileTimes(absolute);
  await context.fs.mkdir(path.dirname(absolute));
  const temporary = `${absolute}.kibi-source-${process.pid}-${randomUUID()}`;
  try {
    await context.fs.writeFile(temporary, after);
    if (context.fs.rename) {
      await context.fs.rename(temporary, absolute);
    } else {
      await context.fs.writeFile(absolute, after);
      await context.fs.unlink?.(temporary).catch(() => undefined);
    }
  } catch (error) {
    // A failed rename must not leak the unique temp file into the authored
    // tree; the published target (if any) is untouched at this point.
    await context.fs.unlink?.(temporary).catch(() => undefined);
    throw error;
  }
  const receipt: SourceWriteReceipt = {
    path: relative,
    mode: "write",
    beforeHash: before === undefined ? null : digest(before),
    afterHash: digest(after),
    created: before === undefined,
  };
  const pendingReceipt = pendingReceiptPath(context.workspaceRoot, relative);
  // Snapshot the pending-source receipt before this write republishes it. A
  // commit-time refusal restores the authored bytes, so the receipt must go
  // back to the hash it bound before the write (or disappear again) or the
  // next sync reports hash drift against a file that never changed.
  const priorReceiptBytes = readPendingSourceReceiptBytes(pendingReceipt);
  const rollback = async (): Promise<void> => {
    const fsPort = context.fs;
    if (fsPort === undefined) return;
    // Compare before restore: a concurrent writer may have replaced the file
    // after our publication. Never clobber newer bytes; keep the recovery
    // receipt so the next sync reconciles deterministically instead.
    let current: string | undefined;
    try {
      current = await fsPort.readFile(absolute);
    } catch {
      current = undefined;
    }
    if (current !== undefined && digest(current) !== digest(after)) {
      writePendingSourceReceipt(
        context.workspaceRoot,
        relative,
        receipt.afterHash as string,
      );
      console.warn(
        `Skipped source rollback for ${relative}: file changed after the Kibi write; kept concurrent content and recorded recovery metadata.`,
      );
      return;
    }
    if (before === undefined) {
      if (fsPort.unlink) await fsPort.unlink(absolute);
      else await fsPort.writeFile(absolute, "");
      // implements REQ-core-atomic-upsert-persistence
      // A receipt that predates this write (its file was removed outside
      // Kibi) keeps binding the missing source so sync still reports it.
      try {
        if (priorReceiptBytes === null) fs.unlinkSync(pendingReceipt);
        else
          fs.writeFileSync(pendingReceipt, priorReceiptBytes, { mode: 0o600 });
      } catch {
        // The pending receipt is advisory recovery metadata.
      }
    } else {
      const rollbackTemp = `${absolute}.kibi-rollback-${process.pid}-${randomUUID()}`;
      try {
        await fsPort.writeFile(rollbackTemp, before);
        if (fsPort.rename) await fsPort.rename(rollbackTemp, absolute);
        else {
          await fsPort.writeFile(absolute, before);
          await fsPort.unlink?.(rollbackTemp).catch(() => undefined);
        }
      } catch (error) {
        await fsPort.unlink?.(rollbackTemp).catch(() => undefined);
        throw error;
      }
      // implements REQ-core-atomic-upsert-persistence
      // The authored bytes are back to `before`; rebind the pending receipt
      // and the file times to the same state they had before this write.
      try {
        if (priorReceiptBytes === null) fs.unlinkSync(pendingReceipt);
        else
          fs.writeFileSync(pendingReceipt, priorReceiptBytes, { mode: 0o600 });
      } catch {
        // The pending receipt is advisory recovery metadata.
      }
      restoreFileTimes(absolute, priorTimes);
    }
  };
  try {
    if (
      receipt.afterHash !== null &&
      (before === undefined ||
        fs.existsSync(pendingReceipt) ||
        isUntrackedByGit(context.workspaceRoot, relative))
    ) {
      writePendingSourceReceipt(
        context.workspaceRoot,
        relative,
        receipt.afterHash,
      );
    }
  } catch (receiptError) {
    // The source bytes are already published but the caller has not received
    // the rollback handle yet. Unwind the publication here so no failed call
    // ever leaves a half-registered source write behind.
    try {
      await rollback();
    } catch (rollbackError) {
      throw new AggregateError(
        [receiptError, rollbackError],
        `Source published for ${relative}, but pending receipt publication and rollback both failed; recover from the pending-source receipt or restore the authored file manually`,
      );
    }
    throw receiptError;
  }
  return { receipt, rollback };
}

/** Resolve and normalize the canonical authored path for an entity. */
export function canonicalSourcePath(
  context: OperationContext,
  input: UpsertInput,
  entity: Readonly<Record<string, unknown>>,
  existing?: Readonly<Record<string, unknown>>,
): string {
  return path
    .relative(
      context.workspaceRoot,
      sourcePath(context, input, entity, existing),
    )
    .replaceAll(path.sep, "/");
}
