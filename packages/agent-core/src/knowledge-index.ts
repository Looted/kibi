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
 * sequences, quoted scalars, no line folding), flow collections wherever a
 * value starts with `[` or `{` (hand-authored `links: [REQ-001]`, typed
 * `relationships: [{type: implements, target: REQ-1}]`), and a whole manifest
 * written as one flow sequence: kibi-cli before 2.18.0 appended to the
 * `symbols: []` that `kibi init` writes and kept every symbol on that line.
 * The manifest is a hint for progressive disclosure, not the source of truth:
 * snippets always point at kb_query for the authoritative view.
 */

const SYMBOLS_MANIFEST = ".kb/symbols.yaml";
const SYMBOL_COORDINATES = ".kb/symbol-coordinates.yaml";
const INDEX_FORMAT = "kibi-agent-core.knowledge-index.v2";
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

/**
 * What the scanner made of `.kb/symbols.yaml`: `missing` (no file), `empty`
 * (no symbol records, such as the `symbols: []` that `kibi init` writes),
 * `indexed` (records were read) or `unreadable` (the file has content the
 * line scanner could not turn into a single record, so an empty index must
 * not be read as "nothing is linked").
 */
export type ManifestState = "missing" | "empty" | "indexed" | "unreadable";

export type KnowledgeIndex = {
  /** Workspace-relative source file -> symbols with at least one relationship. */
  files: Record<string, IndexedSymbol[]>;
  symbolCount: number;
  manifest: ManifestState;
  /**
   * Workspace-relative source files that `.kb/symbol-coordinates.yaml` binds
   * a symbol to, whether or not the manifest record for it could be indexed.
   */
  coordinateFiles: string[];
  /**
   * Workspace-relative source files that have a manifest record but no
   * symbol with a relationship, so an edit hook can tell "not linked yet"
   * from "the record could not be read".
   */
  unlinkedFiles: string[];
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

/**
 * Minimal YAML flow-collection reader: `[a, "b", {k: v}]` and `{k: v}` with
 * nesting, quoted or plain scalars and `#` comments. It is only ever handed
 * text whose first non-blank character is `[` or `{`, and it reports where
 * the collection ended so a caller can tell a balanced value from one that
 * continues on later lines.
 */
type FlowParse = { value: unknown; end: number } | undefined;

// implements REQ-kibi-hooks-flow-manifest
function parseFlow(text: string, start = 0): FlowParse {
  let pos = start;

  const skip = () => {
    while (pos < text.length) {
      const char = text[pos];
      if (char === "#") {
        while (pos < text.length && text[pos] !== "\n") pos += 1;
      } else if (
        char === " " ||
        char === "\t" ||
        char === "\n" ||
        char === "\r"
      ) {
        pos += 1;
      } else {
        break;
      }
    }
  };

  const scalar = (stops: string): string | undefined => {
    const quote = text[pos];
    if (quote === '"' || quote === "'") {
      let cursor = pos + 1;
      while (cursor < text.length) {
        if (quote === '"' && text[cursor] === "\\") cursor += 2;
        else if (text[cursor] === quote) {
          if (quote === "'" && text[cursor + 1] === "'") cursor += 2;
          else break;
        } else cursor += 1;
      }
      if (cursor >= text.length) return undefined;
      const raw = text.slice(pos, cursor + 1);
      pos = cursor + 1;
      return unquote(raw);
    }
    let cursor = pos;
    while (cursor < text.length) {
      const char = text[cursor] ?? "";
      if (
        (stops.includes(char) && char !== ":") ||
        char === "\n" ||
        char === "\r"
      )
        break;
      // A plain mapping key ends at the first `: ` (or `:` before a stop).
      if (
        stops.includes(":") &&
        char === ":" &&
        (cursor + 1 >= text.length || /[\s,\]}]/.test(text[cursor + 1] ?? ""))
      )
        break;
      if (char === "#" && /\s/.test(text[cursor - 1] ?? "")) break;
      cursor += 1;
    }
    const raw = text.slice(pos, cursor).trim();
    pos = cursor;
    return raw;
  };

  const value = (): unknown => {
    skip();
    const open = text[pos];
    if (open === "[") {
      pos += 1;
      const items: unknown[] = [];
      for (;;) {
        skip();
        if (text[pos] === "]") {
          pos += 1;
          return items;
        }
        if (pos >= text.length)
          throw new SyntaxError("unterminated flow sequence");
        const item = value();
        if (item !== undefined) items.push(item);
        skip();
        if (text[pos] === ",") pos += 1;
        else if (text[pos] !== "]") throw new SyntaxError("expected , or ]");
      }
    }
    if (open === "{") {
      pos += 1;
      const record: RawRecord = {};
      for (;;) {
        skip();
        if (text[pos] === "}") {
          pos += 1;
          return record;
        }
        if (pos >= text.length)
          throw new SyntaxError("unterminated flow mapping");
        const key = scalar(":,}");
        if (key === undefined) throw new SyntaxError("unterminated key");
        skip();
        let entry: unknown;
        if (text[pos] === ":") {
          pos += 1;
          skip();
          entry = text[pos] === "," || text[pos] === "}" ? undefined : value();
        }
        if (key.length > 0) record[key] = entry;
        skip();
        if (text[pos] === ",") pos += 1;
        else if (text[pos] !== "}") throw new SyntaxError("expected , or }");
      }
    }
    const raw = scalar(",]}");
    if (raw === undefined) throw new SyntaxError("unterminated scalar");
    return raw;
  };

  try {
    const parsed = value();
    return { value: parsed, end: pos };
  } catch {
    return undefined;
  }
}

/** True when `raw` opens a flow collection the rest of the line does not close. */
function opensFlow(raw: string): boolean {
  const value = raw.trim();
  return value.startsWith("[") || value.startsWith("{");
}

const keyValue = /^([A-Za-z0-9_"'-][^:]*?):(?:\s+(.*))?$/;

/** The flow value `raw` holds, or undefined when it is not a complete one. */
function completeFlowValue(raw: string): FlowParse {
  if (!opensFlow(raw)) return undefined;
  const parsed = parseFlow(raw);
  if (parsed === undefined) return undefined;
  const rest = raw.slice(parsed.end).trim();
  // `[WIP] fix rounding` is a plain scalar that merely starts with `[`.
  return rest.length === 0 || rest.startsWith("#") ? parsed : undefined;
}

function parseScalarOrFlow(raw: string | undefined): unknown {
  if (raw === undefined || raw.trim().length === 0) return undefined;
  return completeFlowValue(raw)?.value ?? unquote(raw);
}

/**
 * Scan the symbols manifest into raw records. Accepts both the canonical
 * `symbols:` mapping and a bare top-level sequence.
 */
export function scanSymbolsManifest(text: string): RawRecord[] {
  return scanRecordSequence(text, "symbols");
}

function unbalancedFlow(raw: string): boolean {
  return opensFlow(raw) && parseFlow(raw) === undefined;
}

/** Records of a manifest whose `<sectionKey>:` value (or whole root) is a flow sequence. */
function flowRecords(text: string, start: number): RawRecord[] | undefined {
  const parsed = parseFlow(text, start);
  if (!Array.isArray(parsed?.value)) return undefined;
  return parsed.value.filter(
    (item): item is RawRecord =>
      item !== null && typeof item === "object" && !Array.isArray(item),
  );
}

/**
 * Records of a manifest whose `<sectionKey>:` value (or whole root) is a flow
 * sequence, possibly spanning several lines; undefined when the section is
 * block-style or absent.
 */
// implements REQ-kibi-hooks-flow-manifest
function scanFlowSection(
  text: string,
  sectionKey: string,
): RawRecord[] | undefined {
  const escapedKey = sectionKey.replaceAll(/[.*+?^$(){}|[\]\\]/g, "\\$&");
  const header = new RegExp(`^${escapedKey}:[ \\t]*(\\[)?`);
  let offset = 0;
  let first = true;
  let afterHeader = false;
  // Keep the separators so offsets stay exact for CRLF files.
  for (const piece of text.split(/(\r?\n)/)) {
    const content = piece.trim();
    const indent = piece.length - piece.trimStart().length;
    if (content.length > 0 && !content.startsWith("#")) {
      if (afterHeader) {
        // `symbols:` with its value on a later line: flow only when that
        // line opens the sequence.
        return content.startsWith("[")
          ? flowRecords(text, offset + piece.indexOf("["))
          : undefined;
      }
      if (first && content.startsWith("[")) {
        return flowRecords(text, offset + piece.indexOf("["));
      }
      first = false;
      if (indent === 0) {
        const match = header.exec(piece);
        if (match) {
          if (match[1] !== undefined)
            return flowRecords(text, offset + piece.indexOf("["));
          afterHeader = true;
        }
      }
    }
    offset += piece.length;
  }
  return undefined;
}

/**
 * Scan the block sequence under top-level `sectionKey` (or a bare root
 * sequence) into raw records.
 */
function scanRecordSequence(text: string, sectionKey: string): RawRecord[] {
  const flowSection = scanFlowSection(text, sectionKey);
  if (flowSection !== undefined) return flowSection;
  const records: RawRecord[] = [];
  let itemIndent: number | undefined;
  let keyIndent = 0;
  let current: RawRecord | undefined;
  let listKey: string | undefined;
  let listItem: RawRecord | undefined;
  // Top-level section: records are the `<sectionKey>:` sequence or a bare
  // root sequence; sequences under any other top-level key are ignored.
  let section: "root" | "records" | "other" = "root";

  // A flow value (`relationships: [` …) that the writer wrapped over several
  // lines is collected until its brackets balance, then parsed as one value.
  let pendingFlow:
    | { key: string; first: string; text: string; onListItem: boolean }
    | undefined;

  for (const rawLine of text.split(/\r?\n/)) {
    const content = rawLine.trim();
    if (content.length === 0 || content.startsWith("#")) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const dash = /^(\s*)-(\s+)(.*)$/.exec(rawLine);
    if (pendingFlow !== undefined && current !== undefined) {
      const target =
        pendingFlow.onListItem && listItem !== undefined ? listItem : current;
      if (indent > (itemIndent ?? 0) && !(dash && indent === itemIndent)) {
        pendingFlow.text += `\n${content}`;
        const parsed = parseFlow(pendingFlow.text);
        if (parsed === undefined) continue;
        target[pendingFlow.key] = parsed.value;
        pendingFlow = undefined;
        continue;
      }
      // The next record or section started before the brackets balanced:
      // keep the opening line as a plain scalar and read on.
      target[pendingFlow.key] = unquote(pendingFlow.first);
      pendingFlow = undefined;
    }

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
        const key = unquote(pair[1]);
        if (pair[2] !== undefined && unbalancedFlow(pair[2])) {
          pendingFlow = {
            key,
            first: pair[2],
            text: pair[2],
            onListItem: false,
          };
          continue;
        }
        const value = parseScalarOrFlow(pair[2]);
        if (value !== undefined) current[key] = value;
        else listKey = key;
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
      const item = dash[3] ?? "";
      const flowItem = completeFlowValue(item);
      const pair = flowItem === undefined ? keyValue.exec(item) : null;
      if (flowItem !== undefined) {
        // `- { type: implements, target: REQ-1 }`
        listItem = undefined;
        list.push(flowItem.value);
      } else if (pair?.[1] !== undefined && pair[2] !== undefined) {
        listItem = { [unquote(pair[1])]: parseScalarOrFlow(pair[2]) };
        list.push(listItem);
      } else {
        listItem = undefined;
        list.push(unquote(item));
      }
      continue;
    }

    const pair = keyValue.exec(content);
    if (pair?.[1] === undefined) continue;
    const key = unquote(pair[1]);
    if (indent === keyIndent) {
      listItem = undefined;
      if (pair[2] !== undefined && unbalancedFlow(pair[2])) {
        pendingFlow = {
          key,
          first: pair[2],
          text: pair[2],
          onListItem: false,
        };
        listKey = undefined;
        continue;
      }
      const value = parseScalarOrFlow(pair[2]);
      if (value === undefined) {
        listKey = key;
      } else {
        current[key] = value;
        listKey = undefined;
      }
    } else if (listItem !== undefined && pair[2] !== undefined) {
      if (unbalancedFlow(pair[2])) {
        pendingFlow = { key, first: pair[2], text: pair[2], onListItem: true };
        continue;
      }
      listItem[key] = parseScalarOrFlow(pair[2]);
    }
  }

  return records;
}

export type Coordinates = Record<
  string,
  { line?: number; endLine?: number; sourceFile?: string }
>;

/** Scan `coordinates:` -> `<symbol id>:` -> `sourceLine` / `sourceEndLine` / `sourceFile`. */
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
    if (key === "sourceFile") {
      const sourceFile = normalizeSourceFile(unquote(pair[2] ?? ""));
      if (sourceFile.length > 0) entry.sourceFile = sourceFile;
      coordinates[currentId] = entry;
      continue;
    }
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

function normalizeSourceFile(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}

/**
 * Manifest state for a scan result: `unreadable` when the file holds content
 * beyond comments and an empty `symbols` value yet yielded no record.
 */
// implements REQ-kibi-hooks-flow-manifest
export function manifestStateOf(
  text: string | undefined,
  recordCount: number,
): ManifestState {
  if (text === undefined) return "missing";
  if (recordCount > 0) return "indexed";
  const meaningful = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith("#"))
    .filter((line) => !/^symbols:\s*(\[\s*\])?$/.test(line))
    .filter((line) => line !== "[]")
    // Document markers and a version stamp do not make a manifest unreadable.
    .filter((line) => !/^(?:---|\.\.\.|%\S.*|version:\s*\S+)$/.test(line));
  return meaningful.length === 0 ? "empty" : "unreadable";
}

/** Collapse raw manifest records and coordinates into the file-keyed index. */
export function buildKnowledgeIndex(
  records: readonly RawRecord[],
  coordinates: Coordinates = {},
  options: KnowledgeIndexOptions = {},
  manifest: ManifestState = records.length > 0 ? "indexed" : "empty",
): KnowledgeIndex {
  const files: Record<string, IndexedSymbol[]> = {};
  let symbolCount = 0;
  const recordedFiles = new Set<string>();
  const coordinateFiles: string[] = [];
  for (const entry of Object.values(coordinates)) {
    if (entry.sourceFile !== undefined)
      pushUnique(coordinateFiles, entry.sourceFile);
  }
  coordinateFiles.sort();

  for (const record of records) {
    const id = typeof record.id === "string" ? record.id : undefined;
    const sourceFile =
      typeof record.sourceFile === "string"
        ? normalizeSourceFile(record.sourceFile)
        : undefined;
    if (!id || !sourceFile) continue;
    symbolCount += 1;
    recordedFiles.add(sourceFile);

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

  const unlinkedFiles = [...recordedFiles]
    .filter((file) => files[file] === undefined)
    .sort();
  return { files, symbolCount, manifest, coordinateFiles, unlinkedFiles };
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
  const records =
    symbolsText === undefined ? [] : scanSymbolsManifest(symbolsText);
  const index = buildKnowledgeIndex(
    records,
    scanSymbolCoordinates(readText(coordinatesPath) ?? ""),
    options,
    manifestStateOf(symbolsText, records.length),
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
   * Requirement or ADR firmness: as authored, else what the origin implies
   * (`default` when an agent wrote it, `firm` otherwise). Absent when the
   * front matter could not be read whole.
   */
  firmness?: string;
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
  let inOrigin = false;
  let originKind: string | undefined;
  let closed = false;
  let pending: PendingLink | undefined;
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") {
      closed = true;
      break;
    }
    // implements REQ-kb-decision-firmness-from-origin
    const flowOrigin = /^origin:\s*\{.*\bkind:\s*["']?([a-z]+)/.exec(line);
    if (flowOrigin) originKind = flowOrigin[1];
    const nestedKind = inOrigin ? /^\s+kind:\s*["']?([a-z]+)/.exec(line) : null;
    if (nestedKind) originKind = nestedKind[1];
    if (/^\S/.test(line)) inOrigin = /^origin:\s*$/.test(line);
    const match = /^(title|status|firmness):\s*(.*)$/.exec(line);
    if (match?.[1] === "title" && match[2]) summary.title = unquote(match[2]);
    if (match?.[1] === "status" && match[2]) summary.status = unquote(match[2]);
    // implements REQ-kb-decision-firmness
    if (match?.[1] === "firmness" && match[2])
      summary.firmness = unquote(match[2]);
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
  // A decision without authored firmness is a person's (firm) unless an
  // agent wrote it; with the front matter cut off, the origin is unknown.
  // implements REQ-kb-decision-firmness-from-origin
  if (
    summary.firmness === undefined &&
    closed &&
    (lane[1] === "requirements" || lane[1] === "adr")
  )
    summary.firmness = originKind === "agent" ? "default" : "firm";

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
