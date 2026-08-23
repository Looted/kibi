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
}

export interface SymbolCoordinatesArtifact {
  coordinates: Record<string, SymbolCoordinatesRecord>;
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
}

function normalizeRawEntry(value: unknown): RawCoordinateEntry | null {
  if (!isRecord(value)) return null;
  const { identityHash, ...rest } = value;
  if (!isValidCoordinateSpan(rest)) return null;
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
  let sawBoundRecord = false;
  for (const [id, value] of Object.entries(rawCoordinates)) {
    const entry = normalizeRawEntry(value);
    if (entry === null) {
      return {
        status: "invalid",
        reason: `record '${id}' has an invalid coordinate span`,
      };
    }
    if (entry.identityHash !== undefined) sawBoundRecord = true;
    entries[id] = entry;
  }
  if (
    (declaredVersion !== undefined &&
      declaredVersion !== SYMBOL_COORDINATES_FORMAT_VERSION) ||
    sawBoundRecord
  ) {
    if (declaredVersion !== SYMBOL_COORDINATES_FORMAT_VERSION) {
      return {
        status: "invalid",
        reason: `unsupported artifact version: ${String(declaredVersion)}`,
      };
    }
    const bound: Record<string, BoundSymbolCoordinatesRecord> = {};
    for (const [id, entry] of Object.entries(entries)) {
      const identityHash = entry.identityHash;
      if (identityHash === undefined) {
        return {
          status: "invalid",
          reason: `record '${id}' is missing its identity binding in a versioned artifact`,
        };
      }
      bound[id] = { ...entry.span, identityHash };
    }
    return {
      status: "parsed",
      formatVersion: SYMBOL_COORDINATES_FORMAT_VERSION,
      coordinates: bound,
    };
  }
  const legacy: Record<string, SymbolCoordinatesRecord> = {};
  for (const [id, entry] of Object.entries(entries)) {
    legacy[id] = entry.span;
  }
  return { status: "legacy", coordinates: legacy };
}

/**
 * Serialize the generated artifact as a version 2 document. Entries carrying an
 * identity hash are bound records; entries without one serialize as unbound
 * records and are re-validated against current extraction before use.
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
    coordinates[id] = {
      ...(entry.identityHash === undefined
        ? {}
        : { identityHash: entry.identityHash }),
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

/**
 * Lenient reader kept for diff/traceability surfaces: returns only valid
 * records in the historical `{coordinates}` shape. Malformed artifacts throw
 * instead of silently degrading to an empty view.
 */
// implements REQ-generated-coordinate-persistence
export function readCoordinateArtifact(
  content: string,
): SymbolCoordinatesArtifact {
  const parsed = parseCoordinateArtifact(content);
  if (parsed.status === "invalid") {
    throw new CoordinateArtifactError(parsed.reason);
  }
  const coordinates: Record<string, SymbolCoordinatesRecord> = {};
  for (const [id, record] of Object.entries(parsed.coordinates)) {
    coordinates[id] = {
      sourceFile: record.sourceFile,
      sourceLine: record.sourceLine,
      sourceColumn: record.sourceColumn,
      sourceEndLine: record.sourceEndLine,
      sourceEndColumn: record.sourceEndColumn,
    };
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

/**
 * A legacy (unbound) record may only prove coordinates when it still matches
 * current extraction: same declared source file, valid span, and the symbol
 * title occurring exactly at the recorded span in the live source text.
 */
function legacyRecordMatchesCurrentExtraction(
  record: ManifestSymbolRecord,
  entry: SymbolCoordinatesRecord,
  resolveSourceText: (sourceFile: string) => string | null,
): boolean {
  const sourceFile = manifestSourceFile(record);
  if (sourceFile === undefined || entry.sourceFile !== sourceFile) return false;
  const title = typeof record.title === "string" ? record.title : "";
  if (title.length === 0) return false;
  const content = resolveSourceText(entry.sourceFile);
  if (content === null) return false;
  const lines = content.split(/\r?\n/);
  const lineText = lines[entry.sourceLine - 1];
  if (lineText === undefined) return false;
  if (entry.sourceColumn > lineText.length - title.length) return false;
  return (
    lineText.slice(entry.sourceColumn, entry.sourceColumn + title.length) ===
    title
  );
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
 * compiled state. Bound v2 records apply only when their identity hash matches
 * the manifest's current extraction identity; mismatches are treated as
 * missing coordinates. Unbound legacy records apply only after validating them
 * against current source content.
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
  // Inline authored coordinates are only eligible while no generated artifact
  // exists at all. Once the artifact exists, it is authoritative: symbols it
  // omits stay omitted so proof fails closed.
  const allowInlineFallback = coordinateArtifact === null;

  return symbolRecords.map((symbolRecord) => {
    const stripped = stripGeneratedFields(symbolRecord);
    const symbolId =
      typeof symbolRecord.id === "string" ? symbolRecord.id : undefined;
    if (symbolId === undefined) return stripped;
    const entry = rawCoordinates[symbolId];

    // Legacy authored manifests may still carry inline coordinates. They are
    // treated exactly like unbound legacy artifact records: kept only after
    // validating them against current source content, and only while no
    // generated artifact exists.
    const candidate =
      entry ?? (allowInlineFallback ? inlineSpanOf(symbolRecord) : undefined);
    if (candidate === undefined) return stripped;

    const identityHash = (candidate as { identityHash?: unknown }).identityHash;
    if (typeof identityHash === "string" && identityHash.length > 0) {
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
      if (identityHash !== expected) return stripped;
      if (!isValidCoordinateSpan(candidate)) return stripped;
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
      typeof record.sourceEndColumn === "number"
        ? record.sourceEndColumn
        : -1,
  };
  return isValidCoordinateSpan(span) ? span : undefined;
}
