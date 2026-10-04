// implements REQ-claude-code-kibi-plugin-v1
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/**
 * File-keyed view of the Kibi symbol manifest, built for hook latency.
 *
 * Hooks run before every read and edit, so they cannot afford a KB query
 * (a CLI round trip costs seconds) or a full YAML parse of a large manifest.
 * This module line-scans `.kb/symbols.yaml` and `.kb/symbol-coordinates.yaml`
 * once, keeps only symbols that carry relationships, and caches the result as
 * JSON keyed by both files' size and mtime. Every later hook pays one stat per
 * file plus a JSON parse.
 *
 * The scanner understands the subset the Kibi writer emits (block mappings and
 * sequences, quoted scalars, no line folding) plus hand-authored flow lists
 * such as `links: [REQ-001]`. The manifest is a hint for progressive
 * disclosure, not the source of truth: snippets always point at kb_query for
 * the authoritative view.
 */

const SYMBOLS_MANIFEST = ".kb/symbols.yaml";
const SYMBOL_COORDINATES = ".kb/symbol-coordinates.yaml";
const INDEX_FORMAT = "kibi-agent-core.knowledge-index.v1";
const CACHE_FILE = "knowledge-index.json";

export type KnowledgeIndexOptions = {
  /** Legacy string links mean requirement ownership only in adapters that opt in. */
  legacyLinksAsImplements?: boolean;
  /** Lets multiple adapter indexes coexist in one host-owned cache directory. */
  cacheFileName?: string;
};

export type IndexedSymbol = {
  id: string;
  title: string;
  line?: number;
  endLine?: number;
  implements: string[];
  coveredBy: string[];
  executableFor: string[];
};

export type KnowledgeIndex = {
  /** Workspace-relative source file -> symbols with at least one relationship. */
  files: Record<string, IndexedSymbol[]>;
  symbolCount: number;
};

type RawRecord = Record<string, unknown>;

function unquote(raw: string): string {
  const value = raw.trim();
  if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) {
    try {
      return JSON.parse(value) as string;
    } catch {
      return value.slice(1, -1);
    }
  }
  if (value.startsWith("'") && value.endsWith("'") && value.length >= 2) {
    return value.slice(1, -1).replaceAll("''", "'");
  }
  // Plain scalars may carry a trailing comment.
  const comment = value.search(/\s#/);
  return comment >= 0 ? value.slice(0, comment).trimEnd() : value;
}

function parseFlowList(raw: string): string[] | undefined {
  const value = raw.trim();
  if (!value.startsWith("[") || !value.endsWith("]")) return undefined;
  const inner = value.slice(1, -1).trim();
  if (inner.length === 0) return [];
  return inner
    .split(",")
    .map(unquote)
    .filter((item) => item.length > 0);
}

const keyValue = /^([A-Za-z0-9_"'-][^:]*?):(?:\s+(.*))?$/;

function parseScalarOrFlow(raw: string | undefined): unknown {
  if (raw === undefined || raw.trim().length === 0) return undefined;
  return parseFlowList(raw) ?? unquote(raw);
}

/**
 * Scan the symbols manifest into raw records. Accepts both the canonical
 * `symbols:` mapping and a bare top-level sequence.
 */
export function scanSymbolsManifest(text: string): RawRecord[] {
  return scanRecordSequence(text, "symbols");
}

/**
 * Scan the block sequence under top-level `sectionKey` (or a bare root
 * sequence) into raw records.
 */
function scanRecordSequence(text: string, sectionKey: string): RawRecord[] {
  const records: RawRecord[] = [];
  let itemIndent: number | undefined;
  let keyIndent = 0;
  let current: RawRecord | undefined;
  let listKey: string | undefined;
  let listItem: RawRecord | undefined;
  // Top-level section: records are the `<sectionKey>:` sequence or a bare
  // root sequence; sequences under any other top-level key are ignored.
  let section: "root" | "records" | "other" = "root";

  for (const rawLine of text.split(/\r?\n/)) {
    const content = rawLine.trim();
    if (content.length === 0 || content.startsWith("#")) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const dash = /^(\s*)-(\s+)(.*)$/.exec(rawLine);

    if (indent === 0 && !dash) {
      const pair = keyValue.exec(content);
      section =
        pair?.[1] !== undefined && unquote(pair[1]) === sectionKey
          ? "records"
          : "other";
      current = undefined;
      itemIndent = undefined;
      continue;
    }
    if (section === "other") continue;

    if (dash && (itemIndent === undefined || indent === itemIndent)) {
      itemIndent = indent;
      keyIndent = (dash[1]?.length ?? 0) + 1 + (dash[2]?.length ?? 1);
      current = {};
      records.push(current);
      listKey = undefined;
      listItem = undefined;
      const pair = keyValue.exec(dash[3] ?? "");
      if (pair?.[1] !== undefined) {
        const value = parseScalarOrFlow(pair[2]);
        if (value !== undefined) current[unquote(pair[1])] = value;
        else listKey = unquote(pair[1]);
      }
      continue;
    }

    if (current === undefined || itemIndent === undefined) continue;
    if (indent <= itemIndent) continue;

    if (dash) {
      if (listKey === undefined) continue;
      const list = Array.isArray(current[listKey])
        ? (current[listKey] as unknown[])
        : [];
      current[listKey] = list;
      const pair = keyValue.exec(dash[3] ?? "");
      if (pair?.[1] !== undefined && pair[2] !== undefined) {
        listItem = { [unquote(pair[1])]: unquote(pair[2]) };
        list.push(listItem);
      } else {
        listItem = undefined;
        list.push(unquote(dash[3] ?? ""));
      }
      continue;
    }

    const pair = keyValue.exec(content);
    if (pair?.[1] === undefined) continue;
    const key = unquote(pair[1]);
    if (indent === keyIndent) {
      listItem = undefined;
      const value = parseScalarOrFlow(pair[2]);
      if (value === undefined) {
        listKey = key;
      } else {
        current[key] = value;
        listKey = undefined;
      }
    } else if (listItem !== undefined && pair[2] !== undefined) {
      listItem[key] = unquote(pair[2]);
    }
  }

  return records;
}

export type Coordinates = Record<string, { line?: number; endLine?: number }>;

/** Scan `coordinates:` -> `<symbol id>:` -> `sourceLine` / `sourceEndLine`. */
export function scanSymbolCoordinates(text: string): Coordinates {
  const coordinates: Coordinates = {};
  let inCoordinates = false;
  let idIndent: number | undefined;
  let currentId: string | undefined;

  for (const rawLine of text.split(/\r?\n/)) {
    const content = rawLine.trim();
    if (content.length === 0 || content.startsWith("#")) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const pair = keyValue.exec(content);
    if (pair?.[1] === undefined) continue;
    const key = unquote(pair[1]);

    if (indent === 0) {
      inCoordinates = key === "coordinates";
      idIndent = undefined;
      currentId = undefined;
      continue;
    }
    if (!inCoordinates) continue;

    if (idIndent === undefined || indent === idIndent) {
      idIndent = indent;
      currentId = key;
      coordinates[currentId] ??= {};
      continue;
    }
    if (currentId === undefined || indent < idIndent) continue;

    const entry = coordinates[currentId] ?? {};
    const numeric = Number.parseInt(unquote(pair[2] ?? ""), 10);
    if (!Number.isFinite(numeric)) continue;
    if (key === "sourceLine") entry.line = numeric;
    if (key === "sourceEndLine") entry.endLine = numeric;
    coordinates[currentId] = entry;
  }

  return coordinates;
}

function toPositiveInt(value: unknown): number | undefined {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function pushUnique(list: string[], value: string): void {
  if (!list.includes(value)) list.push(value);
}

/** Collapse raw manifest records and coordinates into the file-keyed index. */
export function buildKnowledgeIndex(
  records: readonly RawRecord[],
  coordinates: Coordinates = {},
  options: KnowledgeIndexOptions = {},
): KnowledgeIndex {
  const files: Record<string, IndexedSymbol[]> = {};
  let symbolCount = 0;

  for (const record of records) {
    const id = typeof record.id === "string" ? record.id : undefined;
    const sourceFile =
      typeof record.sourceFile === "string"
        ? record.sourceFile.replaceAll("\\", "/").replace(/^\.\//, "")
        : undefined;
    if (!id || !sourceFile) continue;
    symbolCount += 1;

    const symbol: IndexedSymbol = {
      id,
      title: typeof record.title === "string" ? record.title : id,
      implements: [],
      coveredBy: [],
      executableFor: [],
    };

    const relationships: { type: string; target: string }[] = [];
    if (options.legacyLinksAsImplements !== false) {
      let links: unknown[] = [];
      if (typeof record.links === "string") links = [record.links];
      else if (Array.isArray(record.links)) links = record.links;
      for (const link of links) {
        if (typeof link === "string") {
          relationships.push({ type: "implements", target: link });
        } else if (link !== null && typeof link === "object") {
          const typed = link as RawRecord;
          if (
            typeof typed.type === "string" &&
            typeof typed.target === "string"
          ) {
            relationships.push({ type: typed.type, target: typed.target });
          }
        }
      }
    }
    for (const relation of Array.isArray(record.relationships)
      ? record.relationships
      : []) {
      if (relation === null || typeof relation !== "object") continue;
      const typed = relation as RawRecord;
      if (typeof typed.type === "string" && typeof typed.target === "string")
        relationships.push({ type: typed.type, target: typed.target });
    }

    for (const { type, target } of relationships) {
      if (type === "implements") pushUnique(symbol.implements, target);
      else if (type === "covered_by") pushUnique(symbol.coveredBy, target);
      else if (type === "executable_for")
        pushUnique(symbol.executableFor, target);
    }
    if (
      symbol.implements.length +
        symbol.coveredBy.length +
        symbol.executableFor.length ===
      0
    ) {
      continue;
    }

    const line =
      toPositiveInt(record.sourceLine) ?? coordinates[id]?.line ?? undefined;
    const endLine =
      toPositiveInt(record.sourceEndLine) ??
      coordinates[id]?.endLine ??
      undefined;
    if (line !== undefined) symbol.line = line;
    if (endLine !== undefined) symbol.endLine = endLine;

    const bucket = files[sourceFile] ?? [];
    bucket.push(symbol);
    files[sourceFile] = bucket;
  }

  return { files, symbolCount };
}

function fileSignature(filePath: string): string {
  try {
    const stats = fs.statSync(filePath);
    return `${stats.size}:${stats.mtimeMs}`;
  } catch {
    return "missing";
  }
}

function readText(filePath: string): string | undefined {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return undefined;
  }
}

function writeCacheAtomically(cachePath: string, payload: string): void {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const temporary = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, payload);
    fs.renameSync(temporary, cachePath);
  } catch {
    // The cache is an optimization; a failed write only costs the next hook a rescan.
  }
}

/**
 * Load the index for a workspace, reusing the cache in `cacheDir` while both
 * manifests keep their size and mtime.
 */
export function loadKnowledgeIndex(
  workspaceRoot: string,
  cacheDir?: string,
  options: KnowledgeIndexOptions = {},
): KnowledgeIndex {
  const symbolsPath = path.join(workspaceRoot, SYMBOLS_MANIFEST);
  const coordinatesPath = path.join(workspaceRoot, SYMBOL_COORDINATES);
  const legacyMode =
    options.legacyLinksAsImplements === false ? "typed" : "legacy";
  const signature = `${INDEX_FORMAT}|${legacyMode}|${fileSignature(symbolsPath)}|${fileSignature(coordinatesPath)}`;
  const cachePath = cacheDir
    ? path.join(cacheDir, options.cacheFileName ?? CACHE_FILE)
    : undefined;

  if (cachePath) {
    const cached = readText(cachePath);
    if (cached !== undefined) {
      try {
        const parsed = JSON.parse(cached) as {
          signature?: string;
          index?: KnowledgeIndex;
        };
        if (parsed.signature === signature && parsed.index) return parsed.index;
      } catch {
        // Corrupt cache: rebuild below.
      }
    }
  }

  const symbolsText = readText(symbolsPath);
  const index =
    symbolsText === undefined
      ? { files: {}, symbolCount: 0 }
      : buildKnowledgeIndex(
          scanSymbolsManifest(symbolsText),
          scanSymbolCoordinates(readText(coordinatesPath) ?? ""),
          options,
        );

  if (cachePath) {
    writeCacheAtomically(cachePath, JSON.stringify({ signature, index }));
  }
  return index;
}

const ENTITY_LANES: readonly [prefix: string, lane: string][] = [
  ["REQ-", "requirements"],
  ["SCEN-", "scenarios"],
  ["TEST-", "tests"],
  ["ADR-", "adr"],
  ["FACT-", "facts"],
  ["FLAG-", "flags"],
  ["EVT-", "events"],
];

const SAFE_ENTITY_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

// implements REQ-agent-core-edit-snippets
export type EntityLink = { type: string; target: string };

export type EntitySummary = {
  id: string;
  title?: string;
  status?: string;
  /**
   * Frontmatter `links` (plain string entries read as `relates_to`) merged
   * with canonical relationship-shard records whose `from` is this entity.
   */
  links?: EntityLink[];
};

const MAX_SUMMARY_LINKS = 24;
const RELATIONSHIPS_DIR = ".kb/relationships";

type ShardLinks = { signature: string; byFrom: Map<string, EntityLink[]> };

/**
 * Parsed relationship shards keyed by absolute path and revalidated by size
 * and mtime, so one process parses each shard once however many summaries it
 * reads.
 */
const shardCache = new Map<string, ShardLinks>();

/** Shard holding a `from` id's records: first two hex chars of SHA-256(id). */
function shardPathFor(workspaceRoot: string, entityId: string): string {
  const shard = createHash("sha256").update(entityId).digest("hex");
  return path.join(
    workspaceRoot,
    RELATIONSHIPS_DIR,
    `${shard.slice(0, 2)}.yaml`,
  );
}

function shardLinksFrom(workspaceRoot: string, entityId: string): EntityLink[] {
  const shardPath = shardPathFor(workspaceRoot, entityId);
  const signature = fileSignature(shardPath);
  if (signature === "missing") {
    shardCache.delete(shardPath);
    return [];
  }
  let cached = shardCache.get(shardPath);
  if (cached?.signature !== signature) {
    const byFrom = new Map<string, EntityLink[]>();
    const records = scanRecordSequence(
      readText(shardPath) ?? "",
      "relationships",
    );
    for (const { type, from, to } of records) {
      if (
        typeof type !== "string" ||
        typeof from !== "string" ||
        typeof to !== "string"
      ) {
        continue;
      }
      const list = byFrom.get(from) ?? [];
      list.push({ type, target: to });
      byFrom.set(from, list);
    }
    cached = { signature, byFrom };
    shardCache.set(shardPath, cached);
  }
  return cached.byFrom.get(entityId) ?? [];
}

/** One frontmatter `links:` entry, collected fully before it is typed. */
type PendingLink = { type?: string; target?: string; bare?: string };

function flushLink(links: EntityLink[], pending: PendingLink | undefined) {
  if (pending?.target !== undefined) {
    links.push({ type: pending.type ?? "relates_to", target: pending.target });
  } else if (pending?.bare !== undefined) {
    links.push({ type: "relates_to", target: pending.bare });
  }
}

/**
 * Read an entity's title, status and outgoing links. Title and status come
 * from the frontmatter head of its canonical authored document
 * (`.kb/<lane>/<ID>.md`); links come from that frontmatter plus the canonical
 * relationship shard (`.kb/relationships/<shard>.yaml`) holding its records.
 */
export function readEntitySummary(
  workspaceRoot: string,
  entityId: string,
): EntitySummary {
  const lane = ENTITY_LANES.find(([prefix]) => entityId.startsWith(prefix));
  if (!lane || !SAFE_ENTITY_ID.test(entityId)) return { id: entityId };

  let head: string;
  try {
    const descriptor = fs.openSync(
      path.join(workspaceRoot, ".kb", lane[1], `${entityId}.md`),
      "r",
    );
    try {
      const buffer = Buffer.alloc(8192);
      const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs.closeSync(descriptor);
    }
  } catch {
    return { id: entityId };
  }

  const lines = head.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return { id: entityId };
  const summary: EntitySummary = { id: entityId };
  const authored: EntityLink[] = [];
  let inLinks = false;
  let pending: PendingLink | undefined;
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") break;
    const match = /^(title|status):\s*(.*)$/.exec(line);
    if (match?.[1] === "title" && match[2]) summary.title = unquote(match[2]);
    if (match?.[1] === "status" && match[2]) summary.status = unquote(match[2]);
    if (/^\S/.test(line)) {
      flushLink(authored, pending);
      pending = undefined;
      inLinks = /^links:\s*$/.test(line);
      continue;
    }
    if (!inLinks) continue;
    // Typed entries carry `type: X` and `target: Y` in either order, so an
    // entry is pushed only when the next entry or section starts; a bare
    // `- ID` entry is a generic relates_to link.
    const entry = /^\s*-\s*(.*)$/.exec(line);
    if (entry) {
      flushLink(authored, pending);
      pending = {};
    }
    if (!pending) continue;
    const body = (entry ? (entry[1] ?? "") : line).trim();
    const field = /^(type|target):\s*(.+)$/.exec(body);
    if (field?.[1] === "type") pending.type = unquote(field[2] ?? "");
    else if (field?.[1] === "target") pending.target = unquote(field[2] ?? "");
    else if (entry && SAFE_ENTITY_ID.test(unquote(body)))
      pending.bare = unquote(body);
  }
  flushLink(authored, pending);

  const links: EntityLink[] = [];
  const seen = new Set<string>();
  for (const link of [
    ...authored,
    ...shardLinksFrom(workspaceRoot, entityId),
  ]) {
    const key = `${link.type}\u0000${link.target}`;
    if (link.target.length === 0 || seen.has(key)) continue;
    seen.add(key);
    links.push(link);
    if (links.length >= MAX_SUMMARY_LINKS) break;
  }
  if (links.length > 0) summary.links = links;
  return summary;
}
