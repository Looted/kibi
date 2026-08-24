import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import type { ManifestSymbolRecord } from "./manifest.js";

/**
 * Format version of the generated coordinate artifact. Version 2 binds every
 * record to the extraction identity that produced it so stale coordinates can
 * never silently overlay a changed symbol.
 */
// implements REQ-generated-coordinate-persistence
export const SYMBOL_COORDINATES_FORMAT_VERSION = 2;

export interface SymbolCoordinatesRecord {
  sourceFile: string;
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
}

/** A generated record bound to the extraction identity that produced it. */
// implements REQ-generated-coordinate-persistence
export interface BoundSymbolCoordinatesRecord extends SymbolCoordinatesRecord {
  readonly identityHash: string;
  readonly sourceHash: string;
}

// implements REQ-generated-coordinate-persistence
export type CoordinateArtifactRecord =
  | SymbolCoordinatesRecord
  | BoundSymbolCoordinatesRecord;

export interface SymbolCoordinatesArtifact {
  coordinates: Record<string, CoordinateArtifactRecord>;
}

// implements REQ-generated-coordinate-persistence
export interface CoordinateExtractionIdentity {
  readonly id: string;
  readonly title?: string;
  readonly sourceFile?: string;
  readonly granularity_reason?: string;
}

// implements REQ-generated-coordinate-persistence
export interface SymbolCoordinateWriteEntry extends SymbolCoordinatesRecord {
  readonly identityHash?: string;
  readonly sourceHash?: string;
}

// implements REQ-generated-coordinate-persistence
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

// implements REQ-generated-coordinate-persistence
export class CoordinateArtifactError extends Error {
  override readonly name = "CoordinateArtifactError";
}

const SYMBOL_COORDINATES_COMMENT_BLOCK = `# symbol-coordinates.yaml
# GENERATED coordinate artifact — do not edit manually.
# Run \`kibi sync --refresh-symbol-coordinates\` to refresh.
`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalIdentityValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Deterministic canonical identity string for a symbol extraction state. */
// implements REQ-generated-coordinate-persistence
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
// implements REQ-generated-coordinate-persistence
export function coordinateIdentityHash(
  identity: CoordinateExtractionIdentity,
): string {
  return createHash("sha256")
    .update(coordinateIdentityKey(identity))
    .digest("hex");
}

/** Stable hash of the exact source text used to generate a coordinate span. */
// implements REQ-generated-coordinate-persistence
export function coordinateSourceHash(sourceText: string): string {
  return createHash("sha256").update(sourceText).digest("hex");
}

/** Select a stable coarse anchor, preferring a title match over the whole file. */
// implements REQ-generated-coordinate-persistence
export function coarseCoordinateSpan(
  sourceFile: string,
  title: string,
  content: string,
): SymbolCoordinatesRecord {
  if (title.length > 0) {
    const escaped = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escaped}\\b`);
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (line === undefined) continue;
      const match = pattern.exec(line);
      if (!match || match.index < 0) continue;
      return {
        sourceFile,
        sourceLine: index + 1,
        sourceColumn: match.index,
        sourceEndLine: index + 1,
        sourceEndColumn: match.index + title.length,
      };
    }
  }

  const lines = content.split(/\r?\n/);
  const lastLine = lines[lines.length - 1] ?? "";
  return {
    sourceFile,
    sourceLine: 1,
    sourceColumn: 0,
    sourceEndLine: Math.max(1, lines.length),
    sourceEndColumn: lastLine.length,
  };
}

function isSha256Hash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

/**
 * Validate a coordinate span against the same rules requirement proof enforces:
 * nonempty source file, sourceLine >= 1, columns >= 0, endLine >= sourceLine.
 */
// implements REQ-generated-coordinate-persistence
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
  return (
    typeof sourceFile === "string" &&
    sourceFile.length > 0 &&
    typeof sourceLine === "number" &&
    Number.isInteger(sourceLine) &&
    sourceLine >= 1 &&
    typeof sourceColumn === "number" &&
    Number.isInteger(sourceColumn) &&
    sourceColumn >= 0 &&
    typeof sourceEndLine === "number" &&
    Number.isInteger(sourceEndLine) &&
    sourceEndLine >= sourceLine &&
    typeof sourceEndColumn === "number" &&
    Number.isInteger(sourceEndColumn) &&
    sourceEndColumn >= 0
  );
}

interface RawCoordinateEntry {
  readonly span: SymbolCoordinatesRecord;
  readonly identityHash?: string;
  readonly sourceHash?: string;
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
    ...(typeof identityHash === "string" && identityHash.length > 0
      ? { identityHash }
      : {}),
    ...(typeof sourceHash === "string" && sourceHash.length > 0
      ? { sourceHash }
      : {}),
  };
}

/**
 * Strictly parse a generated coordinate artifact. Records failing span
 * validation make the whole artifact invalid; consumers must fail closed
 * instead of silently dropping evidence.
 */
// implements REQ-generated-coordinate-persistence
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
  if (declaredVersion === SYMBOL_COORDINATES_FORMAT_VERSION) {
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
  return { status: "invalid", reason: "unreachable artifact parser state" };
}

/**
 * Serialize the generated artifact as a version 2 document. Every record is
 * bound to both its manifest identity and exact source content.
 * Key order is deterministic without relying on YAML sortKeys so the
 * human-readable header stays first.
 */
// implements REQ-generated-coordinate-persistence
export function writeCoordinateArtifact(
  entries: Record<string, SymbolCoordinateWriteEntry>,
): string {
  const coordinates: Record<string, Record<string, unknown>> = {};
  for (const id of Object.keys(entries).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const entry = entries[id];
    if (entry === undefined || !isValidCoordinateSpan(entry)) {
      throw new CoordinateArtifactError(
        `refusing to publish an invalid or missing coordinate span${id === undefined ? "" : ` for ${id}`}`,
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
  return `${SYMBOL_COORDINATES_COMMENT_BLOCK}${dumpYAML(artifact, {
    lineWidth: -1,
    noRefs: true,
  })}`;
}

/** Serialize a legacy artifact without introducing v2 bindings or metadata. */
// implements REQ-generated-coordinate-persistence
export function writeLegacyCoordinateArtifact(
  entries: Record<string, SymbolCoordinatesRecord>,
): string {
  const coordinates: Record<string, SymbolCoordinatesRecord> = {};
  for (const id of Object.keys(entries).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const entry = entries[id];
    if (entry === undefined || !isValidCoordinateSpan(entry)) {
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
    { lineWidth: -1, noRefs: true },
  )}`;
}

/**
 * Reader kept for diff/traceability surfaces. Legacy records remain available
 * as spans while v2 records retain their bindings.
 */
// implements REQ-generated-coordinate-persistence
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

function manifestSourceFile(record: ManifestSymbolRecord): string | undefined {
  if (typeof record.sourceFile === "string" && record.sourceFile.length > 0) {
    return record.sourceFile;
  }
  if (typeof record.source === "string" && record.source.length > 0) {
    return record.source;
  }
  return undefined;
}

function defaultResolveSourceText(sourceFile: string): string | null {
  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(process.cwd(), sourceFile);
  if (!existsSync(absolute)) return null;
  try {
    const content = readFileSync(absolute, "utf8");
    return typeof content === "string" ? content : null;
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
  const resolveSourceText =
    options.resolveSourceText ?? defaultResolveSourceText;
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
      const expected = coordinateIdentityHash({
        id: symbolId,
        ...(symbolRecord.title === undefined
          ? {}
          : { title: symbolRecord.title }),
        ...(recordSourceFile === undefined
          ? {}
          : { sourceFile: recordSourceFile }),
        ...(typeof symbolRecord.granularity_reason === "string"
          ? { granularity_reason: symbolRecord.granularity_reason }
          : {}),
      });
      if (
        !isSha256Hash(identityHash) ||
        !isSha256Hash(sourceHash) ||
        identityHash !== expected ||
        !isValidCoordinateSpan(candidate) ||
        recordSourceFile === undefined ||
        candidate.sourceFile !== recordSourceFile
      ) {
        return stripped;
      }
      const sourceText = resolveSourceText(candidate.sourceFile);
      if (
        sourceText === null ||
        coordinateSourceHash(sourceText) !== sourceHash
      ) {
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
  const sourceFile = manifestSourceFile(record);
  if (sourceFile === undefined || entry.sourceFile !== sourceFile) return false;
  const title = typeof record.title === "string" ? record.title : "";
  const declarationName = title.slice(title.lastIndexOf(".") + 1);
  if (declarationName.length === 0) return false;
  const content = resolveSourceText(entry.sourceFile);
  if (content === null) return false;
  const lines = content.split(/\r?\n/);
  const lineText = lines[entry.sourceLine - 1];
  if (lineText === undefined) return false;
  if (entry.sourceColumn > lineText.length - declarationName.length) {
    return false;
  }
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
  const sourceFile = manifestSourceFile(record) ?? "";
  const span: SymbolCoordinatesRecord = {
    sourceFile,
    sourceLine: typeof record.sourceLine === "number" ? record.sourceLine : -1,
    sourceColumn:
      typeof record.sourceColumn === "number" ? record.sourceColumn : -1,
    sourceEndLine:
      typeof record.sourceEndLine === "number" ? record.sourceEndLine : -1,
    sourceEndColumn:
      typeof record.sourceEndColumn === "number" ? record.sourceEndColumn : -1,
  };
  return isValidCoordinateSpan(span) ? span : undefined;
}
