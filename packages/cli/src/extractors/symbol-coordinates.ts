import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import { resolveWorkspaceSourceAbsolute } from "../utils/repo-relative-path.js";
import type { ManifestSymbolRecord } from "./manifest.js";

/**
 * Format version of the generated coordinate artifact. Version 2 binds every
 * record to the extraction identity that produced it so stale coordinates can
 * never silently overlay a changed symbol.
 */
export const SYMBOL_COORDINATES_FORMAT_VERSION = 2;

export interface SymbolCoordinatesRecord {
  sourceFile: string;
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
}

/** A generated record bound to the extraction identity that produced it. */
export interface BoundSymbolCoordinatesRecord extends SymbolCoordinatesRecord {
  readonly identityHash: string;
  readonly sourceHash: string;
}

export type CoordinateArtifactRecord =
  | SymbolCoordinatesRecord
  | BoundSymbolCoordinatesRecord;

export interface SymbolCoordinatesArtifact {
  coordinates: Record<string, CoordinateArtifactRecord>;
}

export interface CoordinateExtractionIdentity {
  readonly id: string;
  readonly title?: string | undefined;
  readonly sourceFile?: string | undefined;
  readonly granularity_reason?: string | undefined;
}

export interface SymbolCoordinateWriteEntry extends SymbolCoordinatesRecord {
  readonly identityHash?: string;
  readonly sourceHash?: string;
}

export type ParsedCoordinateArtifact =
  | {
      readonly status: "parsed";
      readonly formatVersion: typeof SYMBOL_COORDINATES_FORMAT_VERSION;
      readonly coordinates: Readonly<
        Record<string, BoundSymbolCoordinatesRecord>
      >;
    }
  | {
      readonly status: "legacy";
      readonly coordinates: Readonly<Record<string, SymbolCoordinatesRecord>>;
    }
  | { readonly status: "invalid"; readonly reason: string };

export class CoordinateArtifactError extends Error {
  override readonly name = "CoordinateArtifactError";
}

const SYMBOL_COORDINATES_COMMENT_BLOCK = `# symbol-coordinates.yaml
# GENERATED local cache — do not edit or commit (it is gitignored).
# Every \`kibi sync\` keeps it current; \`kibi sync --refresh-symbol-coordinates\` rebuilds it.
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalIdentityValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Deterministic canonical identity string for a symbol extraction state. */
export function coordinateIdentityKey(
  identity: CoordinateExtractionIdentity,
): string {
  return [
    identity.id,
    canonicalIdentityValue(identity.title),
    canonicalIdentityValue(identity.sourceFile),
    canonicalIdentityValue(identity.granularity_reason),
  ].join("\u0000");
}

/** Stable hash binding a generated coordinate record to its extraction identity. */
export function coordinateIdentityHash(
  identity: CoordinateExtractionIdentity,
): string {
  return createHash("sha256")
    .update(coordinateIdentityKey(identity))
    .digest("hex");
}

/** Stable hash of the exact source text used to generate a coordinate span. */
export function coordinateSourceHash(sourceText: string): string {
  return createHash("sha256").update(sourceText).digest("hex");
}

/** Select a stable coarse anchor, preferring a title match over the whole file. */
export function coarseCoordinateSpan(
  sourceFile: string,
  title: string,
  content: string,
): SymbolCoordinatesRecord {
  const lines = content.split(/\r?\n/);
  if (title.length > 0) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`);
    for (let index = 0; index < lines.length; index++) {
      const match = pattern.exec(lines[index] as string);
      if (!match) continue;
      return {
        sourceFile,
        sourceLine: index + 1,
        sourceColumn: match.index,
        sourceEndLine: index + 1,
        sourceEndColumn: match.index + title.length,
      };
    }
  }
  // split always yields at least one (possibly empty) line.
  return {
    sourceFile,
    sourceLine: 1,
    sourceColumn: 0,
    sourceEndLine: lines.length,
    sourceEndColumn: (lines[lines.length - 1] as string).length,
  };
}

function isSha256Hash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

/**
 * Validate a coordinate span against the same rules requirement proof enforces:
 * nonempty source file, sourceLine >= 1, columns >= 0, endLine >= sourceLine.
 */
export function isValidCoordinateSpan(
  value: unknown,
): value is SymbolCoordinatesRecord {
  if (!isRecord(value)) return false;
  const {
    sourceFile,
    sourceLine,
    sourceColumn,
    sourceEndLine,
    sourceEndColumn,
  } = value;
  // Number.isInteger is false for every non-number.
  return (
    typeof sourceFile === "string" &&
    sourceFile.length > 0 &&
    Number.isInteger(sourceLine) &&
    (sourceLine as number) >= 1 &&
    Number.isInteger(sourceColumn) &&
    (sourceColumn as number) >= 0 &&
    Number.isInteger(sourceEndLine) &&
    (sourceEndLine as number) >= (sourceLine as number) &&
    Number.isInteger(sourceEndColumn) &&
    (sourceEndColumn as number) >= 0
  );
}

interface RawCoordinateEntry {
  readonly span: SymbolCoordinatesRecord;
  /** A valid hash, or undefined when the record carries none. */
  readonly identityHash: string | undefined;
  readonly sourceHash: string | undefined;
}

function normalizeRawEntry(value: unknown): RawCoordinateEntry | null {
  if (!isRecord(value)) return null;
  const { identityHash, sourceHash, ...rest } = value;
  if (!isValidCoordinateSpan(rest)) return null;
  if (
    ("identityHash" in value && !isSha256Hash(identityHash)) ||
    ("sourceHash" in value && !isSha256Hash(sourceHash))
  ) {
    return null;
  }
  return {
    span: {
      sourceFile: rest.sourceFile,
      sourceLine: rest.sourceLine,
      sourceColumn: rest.sourceColumn,
      sourceEndLine: rest.sourceEndLine,
      sourceEndColumn: rest.sourceEndColumn,
    },
    // Present hashes were validated above; absent ones are undefined.
    identityHash: identityHash as string | undefined,
    sourceHash: sourceHash as string | undefined,
  };
}

/**
 * Strictly parse a generated coordinate artifact. Records failing span
 * validation make the whole artifact invalid; consumers must fail closed
 * instead of silently dropping evidence.
 */
export function parseCoordinateArtifact(
  content: string,
): ParsedCoordinateArtifact {
  let parsed: unknown;
  try {
    parsed = parseYAML(content);
  } catch (error) {
    return {
      status: "invalid",
      reason: error instanceof Error ? error.message : String(error),
    };
  }
  if (parsed === null || parsed === undefined) {
    return { status: "legacy", coordinates: {} };
  }
  if (!isRecord(parsed)) {
    return { status: "invalid", reason: "artifact root is not a mapping" };
  }
  const rawCoordinates = parsed.coordinates ?? {};
  if (!isRecord(rawCoordinates)) {
    return { status: "invalid", reason: "coordinates is not a mapping" };
  }
  const declaredVersion = parsed.version;
  const entries: Record<string, RawCoordinateEntry> = {};
  for (const [id, value] of Object.entries(rawCoordinates)) {
    const entry = normalizeRawEntry(value);
    if (entry === null) {
      return {
        status: "invalid",
        reason: `record '${id}' has an invalid coordinate span`,
      };
    }
    entries[id] = entry;
  }
  if (declaredVersion === undefined) {
    const legacy: Record<string, SymbolCoordinatesRecord> = {};
    for (const [id, entry] of Object.entries(entries)) {
      legacy[id] = entry.span;
    }
    return { status: "legacy", coordinates: legacy };
  }
  if (declaredVersion !== SYMBOL_COORDINATES_FORMAT_VERSION) {
    return {
      status: "invalid",
      reason: `unsupported or missing artifact version: ${String(declaredVersion)}`,
    };
  }
  const bound: Record<string, BoundSymbolCoordinatesRecord> = {};
  for (const [id, entry] of Object.entries(entries)) {
    const identityHash = entry.identityHash;
    const sourceHash = entry.sourceHash;
    if (identityHash === undefined || sourceHash === undefined) {
      return {
        status: "invalid",
        reason: `record '${id}' is missing its identity or source binding in a versioned artifact`,
      };
    }
    bound[id] = { ...entry.span, identityHash, sourceHash };
  }
  return {
    status: "parsed",
    formatVersion: SYMBOL_COORDINATES_FORMAT_VERSION,
    coordinates: bound,
  };
}

/**
 * Serialize the generated artifact as a version 2 document. Every record is
 * bound to both its manifest identity and exact source content.
 * Key order is deterministic without relying on YAML sortKeys so the
 * human-readable header stays first.
 */
export function writeCoordinateArtifact(
  entries: Record<string, SymbolCoordinateWriteEntry>,
): string {
  const coordinates: Record<string, Record<string, unknown>> = {};
  for (const id of Object.keys(entries).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const entry = entries[id];
    if (!isValidCoordinateSpan(entry)) {
      throw new CoordinateArtifactError(
        `refusing to publish an invalid or missing coordinate span for ${id}`,
      );
    }
    if (!isSha256Hash(entry.identityHash) || !isSha256Hash(entry.sourceHash)) {
      throw new CoordinateArtifactError(
        `refusing to publish an invalid or missing identityHash/sourceHash binding for ${id}`,
      );
    }
    coordinates[id] = {
      identityHash: entry.identityHash,
      sourceHash: entry.sourceHash,
      sourceColumn: entry.sourceColumn,
      sourceEndColumn: entry.sourceEndColumn,
      sourceEndLine: entry.sourceEndLine,
      sourceFile: entry.sourceFile,
      sourceLine: entry.sourceLine,
    };
  }
  const artifact = {
    version: SYMBOL_COORDINATES_FORMAT_VERSION,
    coordinates,
  };
  // Every record is a fresh object, so the dump has no references to avoid.
  return `${SYMBOL_COORDINATES_COMMENT_BLOCK}${dumpYAML(artifact, {
    lineWidth: -1,
  })}`;
}

/** Serialize a legacy artifact without introducing v2 bindings or metadata. */
export function writeLegacyCoordinateArtifact(
  entries: Record<string, SymbolCoordinatesRecord>,
): string {
  const coordinates: Record<string, SymbolCoordinatesRecord> = {};
  for (const id of Object.keys(entries).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const entry = entries[id];
    if (!isValidCoordinateSpan(entry)) {
      throw new CoordinateArtifactError(
        `refusing to publish an invalid or missing legacy coordinate span for ${id}`,
      );
    }
    coordinates[id] = {
      sourceColumn: entry.sourceColumn,
      sourceEndColumn: entry.sourceEndColumn,
      sourceEndLine: entry.sourceEndLine,
      sourceFile: entry.sourceFile,
      sourceLine: entry.sourceLine,
    };
  }
  return `${SYMBOL_COORDINATES_COMMENT_BLOCK}${dumpYAML(
    { coordinates },
    { lineWidth: -1 },
  )}`;
}

/**
 * Reader kept for diff/traceability surfaces. Legacy records remain available
 * as spans while v2 records retain their bindings.
 */
export function readCoordinateArtifact(
  content: string,
): SymbolCoordinatesArtifact {
  const parsed = parseCoordinateArtifact(content);
  if (parsed.status === "invalid") {
    throw new CoordinateArtifactError(parsed.reason);
  }
  const coordinates: Record<string, CoordinateArtifactRecord> = {};
  for (const [id, record] of Object.entries(parsed.coordinates)) {
    coordinates[id] = record;
  }
  return { coordinates };
}

const GENERATED_MANIFEST_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
  "coordinatesGeneratedAt",
] as const;

function stripGeneratedFields(
  record: ManifestSymbolRecord,
): ManifestSymbolRecord {
  const next = { ...record };
  for (const field of GENERATED_MANIFEST_FIELDS) {
    delete next[field];
  }
  return next;
}

/**
 * The record's source path: a non-empty `sourceFile`, else `source`. An empty
 * or non-string `source` never equals a valid span's source file and hashes
 * like a missing one, so it needs no check of its own.
 */
function manifestSourceFile(record: ManifestSymbolRecord): string | undefined {
  if (typeof record.sourceFile === "string" && record.sourceFile.length > 0) {
    return record.sourceFile;
  }
  return record.source;
}

function defaultResolveSourceText(sourceFile: string): string | null {
  const absolute = resolveWorkspaceSourceAbsolute(process.cwd(), sourceFile);
  try {
    // A path outside the workspace resolves to null, which readFileSync rejects.
    return readFileSync(absolute as string, "utf8");
  } catch {
    return null;
  }
}

function overlaySpan(
  stripped: ManifestSymbolRecord,
  span: SymbolCoordinatesRecord,
): ManifestSymbolRecord {
  return {
    ...stripped,
    sourceFile: span.sourceFile,
    sourceLine: span.sourceLine,
    sourceColumn: span.sourceColumn,
    sourceEndLine: span.sourceEndLine,
    sourceEndColumn: span.sourceEndColumn,
  };
}

/**
 * Overlay generated coordinates onto authored manifest records.
 *
 * Generated fields are always stripped first so stale spans can never reach
 * compiled state. Bound v2 records apply only when both their identity hash
 * and exact source-content hash match the current manifest and source. Legacy
 * records and inline coordinates are accepted only after live declaration
 * validation.
 */
export function mergeCoordinatesWithManifest(
  symbolRecords: ManifestSymbolRecord[],
  coordinateArtifact:
    | ParsedCoordinateArtifact
    | SymbolCoordinatesArtifact
    | null,
  options: {
    readonly resolveSourceText?: (sourceFile: string) => string | null;
  } = {},
): ManifestSymbolRecord[] {
  if (coordinateArtifact !== null && "status" in coordinateArtifact) {
    if (coordinateArtifact.status === "invalid") {
      throw new CoordinateArtifactError(coordinateArtifact.reason);
    }
  }
  const readSourceText = options.resolveSourceText ?? defaultResolveSourceText;
  // Many symbols share a source file: read and hash each file once per merge.
  const sourceTexts = new Map<string, string | null>();
  const resolveSourceText = (sourceFile: string): string | null => {
    if (!sourceTexts.has(sourceFile)) {
      sourceTexts.set(sourceFile, readSourceText(sourceFile));
    }
    return sourceTexts.get(sourceFile) as string | null;
  };
  const sourceHashes = new Map<string, string | null>();
  const sourceHashOf = (sourceFile: string): string | null => {
    // rationale: hashing is a pure function of the text, which is read once
    // above, so recomputing the hash changes only the time a merge takes.
    // Stryker disable next-line ConditionalExpression
    if (!sourceHashes.has(sourceFile)) {
      const text = resolveSourceText(sourceFile);
      sourceHashes.set(
        sourceFile,
        text === null ? null : coordinateSourceHash(text),
      );
    }
    return sourceHashes.get(sourceFile) as string | null;
  };
  const rawCoordinates = coordinateArtifact?.coordinates ?? {};
  return symbolRecords.map((symbolRecord) => {
    const stripped = stripGeneratedFields(symbolRecord);
    const symbolId =
      typeof symbolRecord.id === "string" ? symbolRecord.id : undefined;
    if (symbolId === undefined) return stripped;
    const entry = rawCoordinates[symbolId];

    const candidate =
      entry ??
      (coordinateArtifact === null ? inlineSpanOf(symbolRecord) : undefined);
    if (candidate === undefined) return stripped;

    const identityHash = (candidate as { identityHash?: unknown }).identityHash;
    const sourceHash = (candidate as { sourceHash?: unknown }).sourceHash;
    if (identityHash !== undefined || sourceHash !== undefined) {
      const recordSourceFile = manifestSourceFile(symbolRecord);
      // The identity key reads every non-string field as "".
      const expected = coordinateIdentityHash({
        id: symbolId,
        title: symbolRecord.title,
        sourceFile: recordSourceFile,
        granularity_reason: symbolRecord.granularity_reason,
      });
      // `expected` is a valid hash, so equality also validates identityHash,
      // and a valid span's non-empty sourceFile never equals a missing one.
      if (
        identityHash !== expected ||
        !isSha256Hash(sourceHash) ||
        !isValidCoordinateSpan(candidate) ||
        candidate.sourceFile !== recordSourceFile
      ) {
        return stripped;
      }
      const currentSourceHash = sourceHashOf(candidate.sourceFile);
      // `sourceHash` is a valid hash here, so an unreadable file never matches.
      if (currentSourceHash !== sourceHash) {
        return stripped;
      }
      return overlaySpan(stripped, candidate);
    }

    if (!isValidCoordinateSpan(candidate)) return stripped;
    if (
      !legacyRecordMatchesCurrentExtraction(
        symbolRecord,
        candidate,
        resolveSourceText,
      )
    ) {
      return stripped;
    }
    return overlaySpan(stripped, candidate);
  });
}

function legacyRecordMatchesCurrentExtraction(
  record: ManifestSymbolRecord,
  entry: SymbolCoordinatesRecord,
  resolveSourceText: (sourceFile: string) => string | null,
): boolean {
  // A valid span's non-empty sourceFile never equals a missing one.
  if (entry.sourceFile !== manifestSourceFile(record)) return false;
  const title = record.title;
  if (typeof title !== "string") return false;
  const declarationName = title.slice(title.lastIndexOf(".") + 1);
  if (declarationName.length === 0) return false;
  const content = resolveSourceText(entry.sourceFile);
  if (content === null) return false;
  const lines = content.split(/\r?\n/);
  const lineText = lines[entry.sourceLine - 1];
  if (lineText === undefined) return false;
  // A span that runs past the line slices short and cannot match.
  return (
    lineText.slice(
      entry.sourceColumn,
      entry.sourceColumn + declarationName.length,
    ) === declarationName
  );
}

function inlineSpanOf(
  record: ManifestSymbolRecord,
): SymbolCoordinatesRecord | undefined {
  const span = {
    sourceFile: manifestSourceFile(record),
    sourceLine: record.sourceLine,
    sourceColumn: record.sourceColumn,
    sourceEndLine: record.sourceEndLine,
    sourceEndColumn: record.sourceEndColumn,
  };
  return isValidCoordinateSpan(span) ? span : undefined;
}
