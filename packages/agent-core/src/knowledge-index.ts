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
  return value.replace(/\s#[\s\S]*/, "").trimEnd();
}

/**
 * Minimal YAML flow-collection reader: `[a, "b", {k: v}]` and `{k: v}` with
 * nesting, quoted or plain scalars and `#` comments. It is only ever handed
 * text whose character at `start` is `[` or `{`, and it reports where the
 * collection ended so a caller can tell a balanced value from one that
 * continues on later lines.
 */
type FlowParse = { value: unknown; end: number } | undefined;

/** Whitespace and `#` comments between flow tokens. */
const FLOW_BLANK = /(?:[ \t\n\r]|#[^\n]*)*/y;
/** A double-quoted scalar; a backslash escapes the next character. */
const DOUBLE_QUOTED = /"(?:[^"\\]|\\[\s\S])*"/y;
/** A single-quoted scalar; `''` is an escaped quote. */
const SINGLE_QUOTED = /'(?:[^']|'')*'/y;

function parseFlow(text: string, start = 0): FlowParse {
  let pos = start;

  const skip = () => {
    FLOW_BLANK.lastIndex = pos;
    FLOW_BLANK.test(text);
    pos = FLOW_BLANK.lastIndex;
  };

  const scalar = (stops: string): string => {
    const quote = text.charAt(pos);
    if (quote === '"' || quote === "'") {
      const pattern = quote === '"' ? DOUBLE_QUOTED : SINGLE_QUOTED;
      pattern.lastIndex = pos;
      // An unterminated quote has no match, and indexing null throws, which
      // fails the whole parse.
      const raw = (pattern.exec(text) as RegExpExecArray)[0];
      pos = pattern.lastIndex;
      return unquote(raw);
    }
    let cursor = pos;
    for (;;) {
      const char = text.charAt(cursor);
      // `includes("")` holds, so the end of the text stops the scan too.
      if (
        (stops.includes(char) && char !== ":") ||
        char === "\n" ||
        char === "\r"
      )
        break;
      // A plain mapping key ends at the first `: ` (or `:` before a stop).
      // A key whose colon ends the text never parses, whichever way it ends.
      if (
        stops.includes(":") &&
        char === ":" &&
        /[\s,\]}]/.test(text.charAt(cursor + 1))
      )
        break;
      // `skip` consumed any comment before the scalar, so `#` is never first.
      if (char === "#" && /\s/.test(text.charAt(cursor - 1))) break;
      cursor += 1;
    }
    const raw = text.slice(pos, cursor).trim();
    pos = cursor;
    return raw;
  };

  // Every caller skips blanks first. At the end of the text an item or key
  // reads as an empty scalar and the separator check after it fails.
  const value = (): unknown => {
    const open = text.charAt(pos);
    if (open === "[") {
      pos += 1;
      const items: unknown[] = [];
      for (;;) {
        skip();
        if (text.charAt(pos) === "]") {
          pos += 1;
          return items;
        }
        items.push(value());
        skip();
        if (text.charAt(pos) === ",") pos += 1;
        else if (text.charAt(pos) !== "]") throw new SyntaxError();
      }
    }
    if (open === "{") {
      pos += 1;
      const record: RawRecord = {};
      for (;;) {
        skip();
        if (text.charAt(pos) === "}") {
          pos += 1;
          return record;
        }
        const key = scalar(":,}");
        skip();
        let entry: unknown;
        if (text.charAt(pos) === ":") {
          pos += 1;
          skip();
          entry =
            text.charAt(pos) === "," || text.charAt(pos) === "}"
              ? undefined
              : value();
        }
        if (key.length > 0) record[key] = entry;
        skip();
        if (text.charAt(pos) === ",") pos += 1;
        else if (text.charAt(pos) !== "}") throw new SyntaxError();
      }
    }
    return scalar(",]}");
  };

  try {
    const parsed = value();
    return { value: parsed, end: pos };
  } catch {
    // Malformed or unterminated: not a flow value.
  }
  return undefined;
}

/** True when `raw` opens a flow collection the rest of the line does not close. */
function opensFlow(raw: string): boolean {
  // Callers pass regex captures that never start with whitespace.
  return raw.startsWith("[") || raw.startsWith("{");
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
  // `raw` follows `:\s+`, so it is never whitespace alone.
  if (!raw) return undefined;
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
      // The flow reader yields strings, arrays and objects, never null.
      typeof item === "object" && !Array.isArray(item),
  );
}

/**
 * Records of a manifest whose `<sectionKey>:` value (or whole root) is a flow
 * sequence, possibly spanning several lines; undefined when the section is
 * block-style or absent.
 */
function scanFlowSection(
  text: string,
  sectionKey: string,
): RawRecord[] | undefined {
  // Section keys are fixed identifiers with no regex metacharacters. The
  // pattern is anchored to the raw line, so an indented key never matches.
  const header = new RegExp(`^${sectionKey}:[ \\t]*(\\[)?`);
  let offset = 0;
  let first = true;
  let afterHeader = false;
  // Keep the separators so offsets stay exact for CRLF files.
  for (const piece of text.split(/(\r?\n)/)) {
    const content = piece.trim();
    if (content.length > 0 && !content.startsWith("#")) {
      const bracket = offset + piece.indexOf("[");
      // A root sequence opens on the first meaningful line; `symbols:` with
      // its value on a later line is flow only when that line opens it.
      if ((first || afterHeader) && content.startsWith("["))
        return flowRecords(text, bracket);
      if (afterHeader) return undefined;
      first = false;
      const match = header.exec(piece);
      if (match) {
        if (match[1] !== undefined) return flowRecords(text, bracket);
        afterHeader = true;
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
  // The open record, the indent of its dash and the indent of its own keys.
  let item:
    | { record: RawRecord; indent: number; keyIndent: number }
    | undefined;
  let listKey: string | undefined;
  let listItem: RawRecord | undefined;
  // Records are the `<sectionKey>:` sequence or a bare root sequence;
  // sequences under any other top-level key are ignored.
  let otherSection = false;

  // A flow value (`relationships: [` …) that the writer wrapped over several
  // lines is collected until its brackets balance, then parsed as one value.
  let pendingFlow:
    | {
        target: RawRecord;
        key: string;
        first: string;
        text: string;
        recordIndent: number;
      }
    | undefined;

  /**
   * Set `target[key]` from the scalar or flow text `raw`, or start collecting
   * a wrapped flow value. True when there is no value, so a list may follow.
   */
  const assign = (
    target: RawRecord,
    key: string,
    raw: string | undefined,
    recordIndent: number,
  ): boolean => {
    if (raw !== undefined && unbalancedFlow(raw)) {
      pendingFlow = { target, key, first: raw, text: raw, recordIndent };
      return false;
    }
    const value = parseScalarOrFlow(raw);
    if (value === undefined) return true;
    target[key] = value;
    return false;
  };

  for (const rawLine of text.split(/\r?\n/)) {
    const content = rawLine.trim();
    if (content.length === 0 || content.startsWith("#")) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const dash = /^(\s*)-(\s+)(.*)$/.exec(rawLine);
    if (pendingFlow !== undefined) {
      if (indent > pendingFlow.recordIndent) {
        pendingFlow.text += `\n${content}`;
        const parsed = parseFlow(pendingFlow.text);
        if (parsed === undefined) continue;
        pendingFlow.target[pendingFlow.key] = parsed.value;
        pendingFlow = undefined;
        continue;
      }
      // The next record or section started before the brackets balanced:
      // keep the opening line as a plain scalar and read on.
      pendingFlow.target[pendingFlow.key] = unquote(pendingFlow.first);
      pendingFlow = undefined;
    }

    if (indent === 0 && !dash) {
      const pair = keyValue.exec(content);
      otherSection = pair === null || unquote(pair[1] as string) !== sectionKey;
      item = undefined;
      continue;
    }
    if (otherSection) continue;

    if (dash && (item === undefined || indent === item.indent)) {
      const rest = dash[3] as string;
      item = { record: {}, indent, keyIndent: rawLine.length - rest.length };
      records.push(item.record);
      listKey = undefined;
      listItem = undefined;
      const pair = keyValue.exec(rest);
      if (pair !== null) {
        const key = unquote(pair[1] as string);
        if (assign(item.record, key, pair[2], indent)) listKey = key;
      }
      continue;
    }

    if (item === undefined || indent <= item.indent) continue;

    if (dash) {
      if (listKey === undefined) continue;
      const list = Array.isArray(item.record[listKey])
        ? (item.record[listKey] as unknown[])
        : [];
      item.record[listKey] = list;
      const rest = dash[3] as string;
      const flowItem = completeFlowValue(rest);
      listItem = undefined;
      if (flowItem !== undefined) {
        // `- { type: implements, target: REQ-1 }`
        list.push(flowItem.value);
        continue;
      }
      const pair = keyValue.exec(rest);
      if (pair?.[2] !== undefined) {
        listItem = { [unquote(pair[1] as string)]: parseScalarOrFlow(pair[2]) };
        list.push(listItem);
      } else {
        list.push(unquote(rest));
      }
      continue;
    }

    const pair = keyValue.exec(content);
    if (pair === null) continue;
    const key = unquote(pair[1] as string);
    if (indent === item.keyIndent) {
      listItem = undefined;
      listKey = assign(item.record, key, pair[2], item.indent)
        ? key
        : undefined;
    } else if (listItem !== undefined) {
      assign(listItem, key, pair[2], item.indent);
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
  // The open symbol id's indent and the entry its fields fill.
  let current: { indent: number; entry: Coordinates[string] } | undefined;

  for (const rawLine of text.split(/\r?\n/)) {
    // Blank and comment lines hold no `key:` pair.
    const pair = keyValue.exec(rawLine.trim());
    if (pair === null) continue;
    const indent = rawLine.length - rawLine.trimStart().length;
    const key = unquote(pair[1] as string);

    if (indent === 0) {
      inCoordinates = key === "coordinates";
      current = undefined;
      continue;
    }
    if (!inCoordinates) continue;

    // Lines shallower than the open id are neither ids nor its fields.
    if (current !== undefined && indent < current.indent) continue;
    if (current === undefined || indent === current.indent) {
      coordinates[key] ??= {};
      current = { indent, entry: coordinates[key] };
      continue;
    }
    if (pair[2] === undefined) continue;

    const value = unquote(pair[2]);
    if (key === "sourceFile") {
      const sourceFile = normalizeSourceFile(value);
      if (sourceFile.length > 0) current.entry.sourceFile = sourceFile;
      continue;
    }
    const numeric = Number.parseInt(value, 10);
    if (!Number.isFinite(numeric)) continue;
    if (key === "sourceLine") current.entry.line = numeric;
    if (key === "sourceEndLine") current.entry.endLine = numeric;
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

    // Any other type, string or not, relates nothing.
    const relate = (type: unknown, target: string) => {
      if (type === "implements") pushUnique(symbol.implements, target);
      else if (type === "covered_by") pushUnique(symbol.coveredBy, target);
      else if (type === "executable_for")
        pushUnique(symbol.executableFor, target);
    };
    // Reading a field of a primitive yields undefined; only null and
    // undefined need replacing before fields are read.
    const relateTyped = (relation: unknown) => {
      const typed = (relation ?? {}) as RawRecord;
      if (typeof typed.target === "string") relate(typed.type, typed.target);
    };

    if (options.legacyLinksAsImplements !== false) {
      let links: unknown[] = [];
      if (typeof record.links === "string") links = [record.links];
      else if (Array.isArray(record.links)) links = record.links;
      for (const link of links) {
        if (typeof link === "string") relate("implements", link);
        else relateTyped(link);
      }
    }
    if (Array.isArray(record.relationships))
      for (const relation of record.relationships) relateTyped(relation);

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
    // Missing or unreadable.
  }
  return undefined;
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

function readCachedIndex(
  cachePath: string,
  signature: string,
): KnowledgeIndex | undefined {
  try {
    // A missing cache throws here as a corrupt one throws in the parse.
    const parsed = JSON.parse(String(fs.readFileSync(cachePath))) as {
      signature?: string;
      index?: KnowledgeIndex;
    };
    if (parsed.signature === signature && parsed.index) return parsed.index;
  } catch {
    // Missing or corrupt cache: rebuild.
  }
  return undefined;
}

function scanKnowledgeIndex(
  symbolsPath: string,
  coordinatesPath: string,
  options: KnowledgeIndexOptions,
): KnowledgeIndex {
  const symbolsText = readText(symbolsPath);
  const coordinatesText = readText(coordinatesPath);
  // rationale: without a manifest the state is `missing` whatever the record
  // count, and a placeholder record that is not an object is skipped.
  // Stryker disable ArrayDeclaration
  const records =
    symbolsText === undefined ? [] : scanSymbolsManifest(symbolsText);
  // Stryker restore ArrayDeclaration
  return buildKnowledgeIndex(
    records,
    coordinatesText === undefined ? {} : scanSymbolCoordinates(coordinatesText),
    options,
    manifestStateOf(symbolsText, records.length),
  );
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
  if (!cacheDir)
    return scanKnowledgeIndex(symbolsPath, coordinatesPath, options);

  const legacyMode =
    options.legacyLinksAsImplements === false ? "typed" : "legacy";
  const signature = `${INDEX_FORMAT}|${legacyMode}|${fileSignature(symbolsPath)}|${fileSignature(coordinatesPath)}`;
  const cachePath = path.join(cacheDir, options.cacheFileName ?? CACHE_FILE);
  const cached = readCachedIndex(cachePath, signature);
  if (cached !== undefined) return cached;

  const index = scanKnowledgeIndex(symbolsPath, coordinatesPath, options);
  writeCacheAtomically(cachePath, JSON.stringify({ signature, index }));
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
  /** Requirement prose: `semantic_text`, else the body's first paragraph. */
  statement?: string;
  /** The claim a fact models, from its typed front matter fields. */
  claim?: FactClaim;
};

/** A fact's typed fields, as authored; absent fields are left out. */
export type FactClaim = {
  factKind?: string;
  subjectKey?: string;
  propertyKey?: string;
  operator?: string;
  /** `value_set` members, or the one scalar value. */
  values?: string[];
  unit?: string;
  claimText?: string;
};

/** Front matter scalars a summary keeps, by field name. */
const SUMMARY_SCALARS: Readonly<
  Record<string, Exclude<keyof FactClaim, "values"> | "statement">
> = {
  semantic_text: "statement",
  fact_kind: "factKind",
  subject_key: "subjectKey",
  property_key: "propertyKey",
  operator: "operator",
  unit: "unit",
  claim_text: "claimText",
};

const SCALAR_VALUE_FIELDS = new Set([
  "value_string",
  "value_int",
  "value_number",
  "value_bool",
]);

/**
 * A front matter scalar starting at `lines[index]` with `raw` after its key:
 * a plain or quoted value with its indented continuation lines, or a block
 * scalar (`>-`, `|`). Returns the value and the last line it used.
 */
function readScalar(
  lines: readonly string[],
  index: number,
  raw: string,
): { value: string; last: number } {
  const block = /^[>|][+-]?$/.test(raw.trim());
  const parts: string[] = block ? [] : [raw.trim()];
  let last = index;
  for (const next of lines.slice(index + 1)) {
    if (next.trim() === "---" || !/^\s+\S/.test(next)) break;
    if (!block && /^\s+-\s/.test(next)) break;
    parts.push(next.trim());
    last += 1;
  }
  // Every part is trimmed and non-empty, so the join needs no trim.
  const joined = parts.join(" ");
  return { value: block ? joined : unquote(joined), last };
}

/** The first prose paragraph of a Markdown body, headings skipped; "" if none. */
function firstParagraph(lines: readonly string[]): string {
  const paragraph: string[] = [];
  for (const line of lines) {
    const text = line.trim();
    if (text === "") {
      if (paragraph.length > 0) break;
      continue;
    }
    if (/^#{1,6}\s/.test(text)) {
      if (paragraph.length > 0) break;
      continue;
    }
    paragraph.push(text);
  }
  return paragraph.join(" ");
}

const MAX_SUMMARY_LINKS = 24;
const RELATIONSHIPS_DIR = ".kb/relationships";

type ShardLinks = { signature: string; byFrom: Map<unknown, EntityLink[]> };

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
  // A missing shard has the signature `missing` and reads as no records.
  const signature = fileSignature(shardPath);
  let cached = shardCache.get(shardPath);
  if (cached?.signature !== signature) {
    // Keyed by whatever `from` holds: only a string can equal an entity id.
    const byFrom = new Map<unknown, EntityLink[]>();
    const text = readText(shardPath);
    if (text !== undefined) {
      for (const { type, from, to } of scanRecordSequence(
        text,
        "relationships",
      )) {
        if (typeof type !== "string" || typeof to !== "string") continue;
        const list = byFrom.get(from) ?? [];
        list.push({ type, target: to });
        byFrom.set(from, list);
      }
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
  if ((lines[0] as string).trim() !== "---") return { id: entityId };
  const summary: EntitySummary = { id: entityId };
  const authored: EntityLink[] = [];
  const claim: FactClaim = {};
  const values: string[] = [];
  let inLinks = false;
  let inValueSet = false;
  let inOrigin = false;
  let originKind: string | undefined;
  let closed = false;
  let bodyStart = lines.length;
  let pending: PendingLink | undefined;
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index] as string;
    if (line.trim() === "---") {
      closed = true;
      bodyStart = index + 1;
      break;
    }
    // Patterns ending in a greedy `.*` take the rest of the line.
    const scalar = /^([a-z_]+):\s*(.*)/.exec(line);
    const scalarField = scalar
      ? SUMMARY_SCALARS[scalar[1] as string]
      : undefined;
    if (scalar && scalarField && scalar[2]) {
      const { value, last } = readScalar(lines, index, scalar[2]);
      if (value !== "") {
        if (scalarField === "statement") summary.statement = value;
        else claim[scalarField] = value;
      }
      index = last;
      flushLink(authored, pending);
      pending = undefined;
      inLinks = false;
      inValueSet = false;
      continue;
    }
    if (scalar && SCALAR_VALUE_FIELDS.has(scalar[1] as string) && scalar[2]) {
      values.push(unquote(scalar[2]));
    }
    const flowSet = /^value_set:\s*\[(.*)\]\s*$/.exec(line);
    if (flowSet !== null && (flowSet[1] as string).trim()) {
      values.push(
        ...(flowSet[1] as string).split(",").map((member) => unquote(member)),
      );
    }
    if (/^\S/.test(line)) inValueSet = /^value_set:\s*$/.test(line);
    else if (inValueSet) {
      const member = /^\s*-\s*(.+)/.exec(line);
      if (member) values.push(unquote(member[1] as string));
    }
    const flowOrigin = /^origin:\s*\{.*\bkind:\s*["']?([a-z]+)/.exec(line);
    if (flowOrigin) originKind = flowOrigin[1];
    const nestedKind = inOrigin ? /^\s+kind:\s*["']?([a-z]+)/.exec(line) : null;
    if (nestedKind) originKind = nestedKind[1];
    if (/^\S/.test(line)) inOrigin = /^origin:\s*$/.test(line);
    const match = /^(title|status|firmness):\s*(.*)/.exec(line);
    if (match?.[1] === "title" && match[2]) summary.title = unquote(match[2]);
    if (match?.[1] === "status" && match[2]) summary.status = unquote(match[2]);
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
    const entry = /^\s*-\s*(.*)/.exec(line);
    if (entry) {
      flushLink(authored, pending);
      pending = {};
    }
    if (!pending) continue;
    const body = (entry ? (entry[1] as string) : line).trim();
    const field = /^(type|target):\s*(.+)/.exec(body);
    if (field?.[1] === "type") pending.type = unquote(field[2] as string);
    else if (field?.[1] === "target")
      pending.target = unquote(field[2] as string);
    else if (entry && SAFE_ENTITY_ID.test(unquote(body)))
      pending.bare = unquote(body);
  }
  flushLink(authored, pending);
  // A decision without authored firmness is a person's (firm) unless an
  // agent wrote it; with the front matter cut off, the origin is unknown.
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
  if (values.length > 0) claim.values = values;
  if (Object.keys(claim).length > 0) summary.claim = claim;
  if (summary.statement === undefined && lane[1] === "requirements" && closed) {
    const paragraph = firstParagraph(lines.slice(bodyStart));
    if (paragraph) summary.statement = paragraph;
  }
  return summary;
}
