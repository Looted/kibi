/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import {
  type ManifestSymbolEntry as CliManifestSymbolEntry,
  enrichSymbolCoordinates,
  withSymbolCompilerLock,
} from "kibi-runtime";
import { resolveWorkspaceSourceAbsolute } from "../workspace-path.js";
import { resolveWorkspaceRoot } from "../workspace.js";

export interface SymbolsRefreshArgs {
  dryRun?: boolean;
  workspaceRoot?: string;
}

export interface SymbolsRefreshResult {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: {
    refreshed: number;
    failed: number;
    unchanged: number;
    dryRun: boolean;
  };
}

interface ManifestSymbolEntry {
  id?: string;
  title?: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  sourceEndLine?: number;
  sourceEndColumn?: number;
  coordinatesGeneratedAt?: string;
  [key: string]: unknown;
}

interface SymbolCoordinatesRecord {
  sourceFile: string;
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
}

interface BoundSymbolCoordinatesRecord extends SymbolCoordinatesRecord {
  identityHash: string;
  sourceHash: string;
}

type CoordinateArtifactRecord =
  | SymbolCoordinatesRecord
  | BoundSymbolCoordinatesRecord;

interface SymbolCoordinatesArtifact {
  status: "parsed" | "legacy";
  coordinates: Record<string, CoordinateArtifactRecord>;
}

const SYMBOL_COORDINATES_FORMAT_VERSION = 2;

const SYMBOL_COORDINATES_COMMENT_BLOCK = `# symbol-coordinates.yaml
# GENERATED local cache — do not edit or commit (it is gitignored).
# Every \`kibi sync\` keeps it current; \`kibi sync --refresh-symbol-coordinates\` rebuilds it.
`;

const DEFAULT_COORDINATE_ARTIFACT_NAME = "symbol-coordinates.yaml";

const GENERATED_COORD_FIELDS = [
  "sourceLine",
  "sourceColumn",
  "sourceEndLine",
  "sourceEndColumn",
] as const;

const SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

const COARSE_GRANULARITY_REASONS = new Set([
  "test-suite",
  "extractor-miss",
  "module-level-behavior",
  "config-artifact",
]);

export async function handleKbSymbolsRefresh(
  args: SymbolsRefreshArgs,
): Promise<SymbolsRefreshResult> {
  const workspaceRoot = args.workspaceRoot ?? resolveWorkspaceRoot();
  return withSymbolCompilerLock(workspaceRoot, () =>
    handleKbSymbolsRefreshUnlocked(args, workspaceRoot),
  );
}

async function handleKbSymbolsRefreshUnlocked(
  args: SymbolsRefreshArgs,
  workspaceRoot: string,
): Promise<SymbolsRefreshResult> {
  // implements REQ-vscode-traceability
  const dryRun = args.dryRun === true;
  const { coordinatesPath, manifestPath } =
    await resolveManifestPaths(workspaceRoot);
  const currentCoordinates = await readOptionalTextFile(coordinatesPath);
  // Refuse to replace an artifact this version cannot read.
  readCoordinateArtifact(currentCoordinates);

  const rawContent = (await readFile(manifestPath)).toString();
  const parsed = parseYAML(rawContent);

  if (!isRecord(parsed) || !Array.isArray(parsed.symbols)) {
    throw new Error(`Invalid symbols manifest at ${manifestPath}`);
  }

  const original = parsed.symbols.map((entry) =>
    isRecord(entry)
      ? ({ ...entry } as ManifestSymbolEntry)
      : ({} as ManifestSymbolEntry),
  );
  const entriesForEnrichment: CliManifestSymbolEntry[] = original.map(
    (entry) => ({
      ...entry,
      id: typeof entry.id === "string" ? entry.id : "",
      title: typeof entry.title === "string" ? entry.title : "",
    }),
  );
  const enriched = await enrichSymbolCoordinates(
    entriesForEnrichment,
    workspaceRoot,
    { allowPythonDecoratorCoordinates: true },
  );
  const finalized = await Promise.all(
    enriched.map((entry, index) =>
      fillMissingCoordinates(original[index] ?? {}, entry, workspaceRoot),
    ),
  );
  parsed.symbols = finalized;

  let refreshed = 0;
  let failed = 0;
  let unchanged = 0;

  for (let i = 0; i < original.length; i++) {
    const before = original[i] ?? ({} as ManifestSymbolEntry);
    const after = finalized[i] ?? before;

    const changed = GENERATED_COORD_FIELDS.some(
      (field) => before[field] !== after[field],
    );

    if (changed) {
      refreshed++;
      continue;
    }

    const eligible = isEligible(
      textField(after, before, "sourceFile"),
      workspaceRoot,
    );
    if (eligible && !hasGeneratedCoordinates(after)) {
      failed++;
    } else {
      unchanged++;
    }
  }

  const nextCoordinates = writeCoordinateArtifact(
    await buildCoordinatesMap(finalized, workspaceRoot),
  );
  if (!dryRun && currentCoordinates !== nextCoordinates) {
    await publishCoordinateArtifact(coordinatesPath, nextCoordinates);
  }

  return {
    content: [
      {
        type: "text",
        text: `kb_symbols_refresh ${dryRun ? "(dry run) " : ""}completed for ${path.relative(workspaceRoot, coordinatesPath)}: refreshed=${refreshed}, unchanged=${unchanged}, failed=${failed}`,
      },
    ],
    structuredContent: {
      refreshed,
      failed,
      unchanged,
      dryRun,
    },
  };
}

export async function refreshCoordinatesForSymbolId(
  symbolId: string,
  workspaceRoot: string = resolveWorkspaceRoot(),
): Promise<{ refreshed: boolean; found: boolean }> {
  return withSymbolCompilerLock(workspaceRoot, () =>
    refreshCoordinatesForSymbolIdUnlocked(symbolId, workspaceRoot),
  );
}

async function refreshCoordinatesForSymbolIdUnlocked(
  symbolId: string,
  workspaceRoot: string,
): Promise<{ refreshed: boolean; found: boolean }> {
  // implements REQ-vscode-traceability
  const { coordinatesPath, manifestPath } =
    await resolveManifestPaths(workspaceRoot);
  const rawContent = (await readFile(manifestPath)).toString();
  const parsed = parseYAML(rawContent);

  if (!isRecord(parsed) || !Array.isArray(parsed.symbols)) {
    return { refreshed: false, found: false };
  }

  const symbols = parsed.symbols.map((entry) =>
    isRecord(entry)
      ? ({ ...entry } as ManifestSymbolEntry)
      : ({} as ManifestSymbolEntry),
  );

  const index = symbols.findIndex((entry) => entry.id === symbolId);
  if (index < 0) {
    return { refreshed: false, found: false };
  }

  const original = symbols[index] ?? {};
  const singleEntry: CliManifestSymbolEntry = {
    ...(original as ManifestSymbolEntry),
    // The entry was found by this id, so it is the entry's id.
    id: symbolId,
    title:
      typeof (original as ManifestSymbolEntry).title === "string"
        ? ((original as ManifestSymbolEntry).title as string)
        : "",
  };
  const [enriched] = await enrichSymbolCoordinates(
    [singleEntry],
    workspaceRoot,
    { allowPythonDecoratorCoordinates: true },
  );
  const finalized = await fillMissingCoordinates(
    original as ManifestSymbolEntry,
    enriched as ManifestSymbolEntry,
    workspaceRoot,
  );

  symbols[index] = finalized;
  parsed.symbols = symbols;

  const refreshed = GENERATED_COORD_FIELDS.some(
    (field) => (original as ManifestSymbolEntry)[field] !== finalized[field],
  );

  const currentContent = await readOptionalTextFile(coordinatesPath);
  const artifact = readCoordinateArtifact(currentContent);
  const nextCoordinates: Record<string, CoordinateArtifactRecord> = {
    ...artifact.coordinates,
  };
  if (artifact.status === "legacy") {
    for (const [existingId, existingRecord] of Object.entries(
      nextCoordinates,
    )) {
      const existingManifestEntry = symbols.find(
        (entry) => entry.id === existingId,
      );
      if (
        !existingManifestEntry ||
        !(await legacyRecordMatchesCurrentExtraction(
          existingManifestEntry,
          existingRecord,
          workspaceRoot,
        ))
      ) {
        delete nextCoordinates[existingId];
      }
    }
  }
  const coordinatesRecord = toCoordinateRecord(finalized);

  if (coordinatesRecord) {
    const sourceText = await readSourceText(
      coordinatesRecord.sourceFile,
      workspaceRoot,
    );
    if (sourceText !== null) {
      nextCoordinates[symbolId] =
        artifact.status === "legacy" && currentContent !== null
          ? coordinatesRecord
          : {
              ...coordinatesRecord,
              identityHash: coordinateIdentityHash(finalized),
              sourceHash: coordinateSourceHash(sourceText),
            };
    }
  } else {
    delete nextCoordinates[symbolId];
  }

  // Write when there is something to keep or something to remove; never
  // create an empty artifact.
  if (
    Object.keys(nextCoordinates).length > 0 ||
    Object.keys(artifact.coordinates).length > 0
  ) {
    const nextContent =
      artifact.status === "legacy" && currentContent !== null
        ? writeLegacyCoordinateArtifact(
            nextCoordinates as Record<string, SymbolCoordinatesRecord>,
          )
        : writeCoordinateArtifact(
            nextCoordinates as Record<string, BoundSymbolCoordinatesRecord>,
          );

    if (currentContent !== nextContent) {
      await publishCoordinateArtifact(coordinatesPath, nextContent);
    }
  }

  return { refreshed, found: true };
}

async function resolveManifestPaths(
  workspaceRoot: string,
): Promise<{ manifestPath: string; coordinatesPath: string }> {
  const manifestPath = await resolveManifestPath(workspaceRoot);

  return {
    manifestPath,
    coordinatesPath: path.join(
      path.dirname(manifestPath),
      DEFAULT_COORDINATE_ARTIFACT_NAME,
    ),
  };
}

export async function resolveManifestPath(
  workspaceRoot: string,
): Promise<string> {
  // implements REQ-cli-canonical-runtime, REQ-vscode-traceability
  return path.join(workspaceRoot, ".kb", "symbols.yaml");
}

function hasGeneratedCoordinates(entry: ManifestSymbolEntry): boolean {
  return normalizeCoordinateRecord(entry) !== null;
}

export function isEligible(
  sourceFile: string | undefined,
  workspaceRoot: string,
): boolean {
  if (!sourceFile) return false;

  // A path outside the workspace resolves to null, which never exists.
  const absolute = resolveWorkspaceSourceAbsolute(
    workspaceRoot,
    sourceFile,
  ) as string;
  if (!existsSync(absolute)) return false;

  return SOURCE_EXTENSIONS.has(path.extname(absolute).toLowerCase());
}

/** The entry's text field, else the authored entry's, else none. */
export function textField(
  after: ManifestSymbolEntry,
  before: ManifestSymbolEntry,
  key: "sourceFile" | "title",
): string | undefined {
  return [after[key], before[key]].find((value) => typeof value === "string") as
    | string
    | undefined;
}

export async function fillMissingCoordinates(
  before: ManifestSymbolEntry,
  after: ManifestSymbolEntry,
  workspaceRoot: string,
): Promise<ManifestSymbolEntry> {
  if (hasGeneratedCoordinates(after)) {
    const coordinate = toCoordinateRecord(after);
    if (
      coordinate &&
      (isCoarseAnchor(after) ||
        (await coordinateMatchesCurrentDeclaration(
          after,
          coordinate,
          workspaceRoot,
        )))
    ) {
      return after;
    }
    return withoutGeneratedCoordinates(after);
  }

  const sourceFile = textField(after, before, "sourceFile");
  const title = textField(after, before, "title");
  const content = await readSourceText(sourceFile as string, workspaceRoot);
  if (content === null) return after;

  if (isCoarseAnchor(after)) {
    return {
      ...after,
      ...coarseCoordinateSpan(sourceFile as string, title, content),
    };
  }
  return {
    ...after,
    ...titleSpan(sourceFile as string, title, content),
  };
}

/** The first whole-word occurrence of a text title, as a coordinate span. */
export function titleSpan(
  sourceFile: string,
  title: unknown,
  content: string,
): SymbolCoordinatesRecord | null {
  if (typeof title !== "string" || title === "") return null;
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\b${escapedTitle}\\b`);
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const match = pattern.exec(line);
    if (!match) continue;
    return {
      sourceFile,
      sourceLine: index + 1,
      sourceColumn: match.index,
      sourceEndLine: index + 1,
      sourceEndColumn: match.index + title.length,
    };
  }
  return null;
}

export function coarseCoordinateSpan(
  sourceFile: string,
  title: unknown,
  content: string,
): SymbolCoordinatesRecord {
  const found = titleSpan(sourceFile, title, content);
  if (found) return found;
  const lines = content.split(/\r?\n/);
  return {
    sourceFile,
    sourceLine: 1,
    sourceColumn: 0,
    sourceEndLine: lines.length,
    sourceEndColumn: (lines.at(-1) as string).length,
  };
}

export function isCoarseAnchor(entry: ManifestSymbolEntry): boolean {
  return COARSE_GRANULARITY_REASONS.has(entry.granularity_reason as string);
}

export function withoutGeneratedCoordinates(
  entry: ManifestSymbolEntry,
): ManifestSymbolEntry {
  const next = { ...entry };
  for (const field of [
    "sourceLine",
    "sourceColumn",
    "sourceEndLine",
    "sourceEndColumn",
    "coordinatesGeneratedAt",
  ]) {
    delete next[field];
  }
  return next;
}

export function coordinateIdentityKey(entry: ManifestSymbolEntry): string {
  return [
    typeof entry.id === "string" ? entry.id : "",
    typeof entry.title === "string" ? entry.title : "",
    typeof entry.sourceFile === "string" ? entry.sourceFile : "",
    typeof entry.granularity_reason === "string"
      ? entry.granularity_reason
      : "",
  ].join("\u0000");
}

function coordinateIdentityHash(entry: ManifestSymbolEntry): string {
  return createHash("sha256")
    .update(coordinateIdentityKey(entry))
    .digest("hex");
}

function coordinateSourceHash(sourceText: string): string {
  return createHash("sha256").update(sourceText).digest("hex");
}

/** The workspace file's text, or null when it is outside, missing or unreadable. */
export async function readSourceText(
  sourceFile: string,
  workspaceRoot: string,
): Promise<string | null> {
  try {
    // A path outside the workspace resolves to null, which readFile refuses.
    const absolutePath = resolveWorkspaceSourceAbsolute(
      workspaceRoot,
      sourceFile,
    ) as string;
    return (await readFile(absolutePath)).toString();
  } catch {
    return null;
  }
}

/** Whether the declaration a dotted title names starts at the coordinate. */
export function declaredAt(
  content: string,
  coordinate: SymbolCoordinatesRecord,
  title: unknown,
): boolean {
  if (typeof title !== "string") return false;
  const declarationName = title.slice(title.lastIndexOf(".") + 1);
  const line = content.split(/\r?\n/)[coordinate.sourceLine - 1] ?? "";
  return (
    declarationName.length > 0 &&
    line.slice(
      coordinate.sourceColumn,
      coordinate.sourceColumn + declarationName.length,
    ) === declarationName
  );
}

export async function coordinateMatchesCurrentDeclaration(
  entry: ManifestSymbolEntry,
  coordinate: SymbolCoordinatesRecord,
  workspaceRoot: string,
): Promise<boolean> {
  if (entry.sourceFile !== coordinate.sourceFile) return false;
  const content = await readSourceText(coordinate.sourceFile, workspaceRoot);
  return content !== null && declaredAt(content, coordinate, entry.title);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizeCoordinateRecord(
  value: unknown,
): SymbolCoordinatesRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const {
    sourceColumn,
    sourceEndColumn,
    sourceEndLine,
    sourceFile,
    sourceLine,
  } = value;

  // Number.isInteger is false for every non-number.
  if (
    typeof sourceFile !== "string" ||
    sourceFile.length === 0 ||
    !Number.isInteger(sourceLine) ||
    (sourceLine as number) < 1 ||
    !Number.isInteger(sourceColumn) ||
    (sourceColumn as number) < 0 ||
    !Number.isInteger(sourceEndLine) ||
    (sourceEndLine as number) < (sourceLine as number) ||
    !Number.isInteger(sourceEndColumn) ||
    (sourceEndColumn as number) < 0
  ) {
    return null;
  }

  return {
    sourceFile,
    sourceLine: sourceLine as number,
    sourceColumn: sourceColumn as number,
    sourceEndLine: sourceEndLine as number,
    sourceEndColumn: sourceEndColumn as number,
  };
}

export function isSha256Hash(value: unknown): value is string {
  // A non-text value reads as text that is never 64 hex digits.
  return /^[a-f0-9]{64}$/.test(value as string);
}

export function normalizeBoundCoordinateRecord(
  value: unknown,
): BoundSymbolCoordinatesRecord | null {
  const record = normalizeCoordinateRecord(value);
  if (record === null) return null;
  const { identityHash, sourceHash } = value as Record<string, unknown>;
  if (!isSha256Hash(identityHash) || !isSha256Hash(sourceHash)) {
    return null;
  }
  return { ...record, identityHash, sourceHash };
}

export function sortCoordinates(
  coordinates: Record<string, BoundSymbolCoordinatesRecord>,
): Record<string, BoundSymbolCoordinatesRecord> {
  const sortedCoordinates: Record<string, BoundSymbolCoordinatesRecord> = {};

  for (const symbolId of Object.keys(coordinates).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const record = normalizeBoundCoordinateRecord(coordinates[symbolId]);
    if (!record) {
      throw new Error(
        `Invalid bound coordinate record for ${symbolId}; refusing to publish`,
      );
    }

    sortedCoordinates[symbolId] = record;
  }

  return sortedCoordinates;
}

/** Read an artifact's text; no artifact (null) reads as an empty legacy one. */
export function readCoordinateArtifact(
  content: string | null,
): SymbolCoordinatesArtifact {
  let parsed: unknown;
  try {
    parsed = parseYAML(String(content)) as unknown;
  } catch (error) {
    throw new Error(
      `Failed to parse coordinate artifact: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (parsed === null || parsed === undefined) {
    return { status: "legacy", coordinates: {} };
  }
  if (!isRecord(parsed)) {
    throw new Error("Coordinate artifact root must be a mapping");
  }
  if (!isRecord(parsed.coordinates)) {
    throw new Error("Coordinate artifact coordinates must be a mapping");
  }

  const declaredVersion = parsed.version;
  if (declaredVersion === undefined) {
    const coordinates: Record<string, SymbolCoordinatesRecord> = {};
    for (const [symbolId, record] of Object.entries(parsed.coordinates)) {
      const normalizedRecord = normalizeCoordinateRecord(record);
      if (!normalizedRecord) {
        throw new Error(
          `Coordinate artifact record '${symbolId}' has an invalid coordinate span`,
        );
      }
      coordinates[symbolId] = normalizedRecord;
    }
    return { status: "legacy", coordinates };
  }
  if (declaredVersion !== SYMBOL_COORDINATES_FORMAT_VERSION) {
    throw new Error(
      `Unsupported coordinate artifact version: ${String(declaredVersion)}`,
    );
  }

  const boundCoordinates: Record<string, BoundSymbolCoordinatesRecord> = {};
  for (const [symbolId, record] of Object.entries(parsed.coordinates)) {
    const normalizedRecord = normalizeBoundCoordinateRecord(record);
    if (!normalizedRecord) {
      throw new Error(
        `Coordinate artifact record '${symbolId}' is missing a valid identity/source binding or span`,
      );
    }

    boundCoordinates[symbolId] = normalizedRecord;
  }

  return { status: "parsed", coordinates: boundCoordinates };
}

export function writeCoordinateArtifact(
  coordinates: Record<string, BoundSymbolCoordinatesRecord>,
): string {
  return `${SYMBOL_COORDINATES_COMMENT_BLOCK}${dumpYAML(
    {
      version: SYMBOL_COORDINATES_FORMAT_VERSION,
      coordinates: sortCoordinates(coordinates),
    },
    { lineWidth: -1 },
  )}`;
}

export function writeLegacyCoordinateArtifact(
  coordinates: Record<string, SymbolCoordinatesRecord>,
): string {
  const sortedCoordinates: Record<string, SymbolCoordinatesRecord> = {};
  for (const symbolId of Object.keys(coordinates).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const record = normalizeCoordinateRecord(coordinates[symbolId]);
    if (!record) {
      throw new Error(
        `Invalid legacy coordinate record for ${symbolId}; refusing to publish`,
      );
    }
    sortedCoordinates[symbolId] = record;
  }
  return `${SYMBOL_COORDINATES_COMMENT_BLOCK}${dumpYAML(
    { coordinates: sortedCoordinates },
    { lineWidth: -1 },
  )}`;
}

function toCoordinateRecord(
  entry: ManifestSymbolEntry,
): SymbolCoordinatesRecord | null {
  return normalizeCoordinateRecord(entry);
}

/** `coordinate` comes from a read artifact, so its span is already valid. */
export async function legacyRecordMatchesCurrentExtraction(
  record: ManifestSymbolEntry,
  coordinate: CoordinateArtifactRecord,
  workspaceRoot: string,
): Promise<boolean> {
  if (record.sourceFile !== coordinate.sourceFile) return false;
  const content = await readSourceText(coordinate.sourceFile, workspaceRoot);
  if (content === null) return false;
  if (isCoarseAnchor(record)) {
    return coordinatesEqual(
      coordinate,
      coarseCoordinateSpan(coordinate.sourceFile, record.title, content),
    );
  }
  return declaredAt(content, coordinate, record.title);
}

export function coordinatesEqual(
  left: SymbolCoordinatesRecord,
  right: SymbolCoordinatesRecord,
): boolean {
  return (
    left.sourceFile === right.sourceFile &&
    left.sourceLine === right.sourceLine &&
    left.sourceColumn === right.sourceColumn &&
    left.sourceEndLine === right.sourceEndLine &&
    left.sourceEndColumn === right.sourceEndColumn
  );
}

export async function buildCoordinatesMap(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<Record<string, BoundSymbolCoordinatesRecord>> {
  const coordinates: Record<string, BoundSymbolCoordinatesRecord> = {};

  for (const entry of entries) {
    const id = typeof entry.id === "string" ? entry.id : undefined;
    const record = toCoordinateRecord(entry);
    if (!id || !record) {
      continue;
    }

    const sourceText = await readSourceText(record.sourceFile, workspaceRoot);
    if (sourceText === null) continue;

    coordinates[id] = {
      ...record,
      identityHash: coordinateIdentityHash(entry),
      sourceHash: coordinateSourceHash(sourceText),
    };
  }

  return coordinates;
}

export async function readOptionalTextFile(
  filePath: string,
): Promise<string | null> {
  try {
    return (await readFile(filePath)).toString();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function publishCoordinateArtifact(
  targetPath: string,
  content: string,
): Promise<void> {
  const temporary = `${targetPath}.kibi-tmp-${process.pid}`;
  try {
    await writeFile(temporary, content);
    await rename(temporary, targetPath);
  } catch (error) {
    try {
      await unlink(temporary);
    } catch {
      // Preserve the publication failure; cleanup is best effort.
    }
    throw error;
  }
}
