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
import { access, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import {
  type ManifestSymbolEntry as CliManifestSymbolEntry,
  enrichSymbolCoordinates,
  withSymbolCompilerLock,
} from "kibi-runtime";
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
# GENERATED coordinate artifact — do not edit manually.
# Run \`kibi sync --refresh-symbol-coordinates\` to refresh.
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
  if (currentCoordinates !== null) {
    readCoordinateArtifact(currentCoordinates);
  }

  const rawContent = await readFile(manifestPath, "utf8");
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
  );
  const finalized = await Promise.all(
    enriched.map((entry, index) =>
      fillMissingCoordinates(
        original[index] ?? ({} as ManifestSymbolEntry),
        entry,
        workspaceRoot,
      ),
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

    const source =
      typeof after.sourceFile === "string"
        ? after.sourceFile
        : typeof before.sourceFile === "string"
          ? before.sourceFile
          : undefined;

    const eligible = await isEligible(source, workspaceRoot);
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
  const rawContent = await readFile(manifestPath, "utf8");
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
    id:
      typeof (original as ManifestSymbolEntry).id === "string"
        ? ((original as ManifestSymbolEntry).id as string)
        : "",
    title:
      typeof (original as ManifestSymbolEntry).title === "string"
        ? ((original as ManifestSymbolEntry).title as string)
        : "",
  };
  const [enriched] = await enrichSymbolCoordinates(
    [singleEntry],
    workspaceRoot,
  );
  const finalized = await fillMissingCoordinates(
    original as ManifestSymbolEntry,
    enriched ?? singleEntry,
    workspaceRoot,
  );

  symbols[index] = finalized;
  parsed.symbols = symbols;

  const refreshed = GENERATED_COORD_FIELDS.some(
    (field) => (original as ManifestSymbolEntry)[field] !== finalized[field],
  );

  const artifact = await readCoordinateArtifactFromPath(coordinatesPath);
  const currentContent = await readOptionalTextFile(coordinatesPath);
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
  } else if (nextCoordinates[symbolId] !== undefined) {
    delete nextCoordinates[symbolId];
  }

  const removedExistingRecord =
    coordinatesRecord === null && artifact.coordinates[symbolId] !== undefined;
  if (
    coordinatesRecord ||
    Object.keys(nextCoordinates).length > 0 ||
    removedExistingRecord
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

async function isEligible(
  sourceFile: string | undefined,
  workspaceRoot: string,
): Promise<boolean> {
  if (!sourceFile) return false;

  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  if (!(await fileExists(absolute))) return false;

  return SOURCE_EXTENSIONS.has(path.extname(absolute).toLowerCase());
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function fillMissingCoordinates(
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

  const sourceFile =
    typeof after.sourceFile === "string"
      ? after.sourceFile
      : typeof before.sourceFile === "string"
        ? before.sourceFile
        : undefined;
  const title =
    typeof after.title === "string"
      ? after.title
      : typeof before.title === "string"
        ? before.title
        : undefined;

  if (!sourceFile) {
    return after;
  }

  const absolutePath = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);

  try {
    const content = await readFile(absolutePath, "utf8");
    const lines = content.split(/\r?\n/);

    if (isCoarseAnchor(after)) {
      return {
        ...after,
        ...coarseCoordinateSpan(sourceFile, title ?? "", content),
      };
    }

    if (title) {
      const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`\\b${escapedTitle}\\b`);
      for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        if (!line) continue;
        const match = pattern.exec(line);
        if (!match || match.index < 0) continue;

        return {
          ...after,
          sourceLine: index + 1,
          sourceColumn: match.index,
          sourceEndLine: index + 1,
          sourceEndColumn: match.index + title.length,
        };
      }
    }
  } catch {
    return after;
  }

  return after;
}

function coarseCoordinateSpan(
  sourceFile: string,
  title: string,
  content: string,
): SymbolCoordinatesRecord {
  if (title.length > 0) {
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedTitle}\\b`);
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];
      if (!line) continue;
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

function isCoarseAnchor(entry: ManifestSymbolEntry): boolean {
  return (
    typeof entry.granularity_reason === "string" &&
    COARSE_GRANULARITY_REASONS.has(entry.granularity_reason)
  );
}

function withoutGeneratedCoordinates(
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

function coordinateIdentityKey(entry: ManifestSymbolEntry): string {
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

async function readSourceText(
  sourceFile: string,
  workspaceRoot: string,
): Promise<string | null> {
  const absolutePath = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  try {
    return await readFile(absolutePath, "utf8");
  } catch {
    return null;
  }
}

async function coordinateMatchesCurrentDeclaration(
  entry: ManifestSymbolEntry,
  coordinate: SymbolCoordinatesRecord,
  workspaceRoot: string,
): Promise<boolean> {
  const sourceFile =
    typeof entry.sourceFile === "string" ? entry.sourceFile : undefined;
  const title = typeof entry.title === "string" ? entry.title : "";
  if (!sourceFile || sourceFile !== coordinate.sourceFile || !title) {
    return false;
  }
  const content = await readSourceText(coordinate.sourceFile, workspaceRoot);
  if (content === null) return false;
  const declarationName = title.slice(title.lastIndexOf(".") + 1);
  const line = content.split(/\r?\n/)[coordinate.sourceLine - 1];
  return (
    declarationName.length > 0 &&
    line !== undefined &&
    coordinate.sourceColumn <= line.length - declarationName.length &&
    line.slice(
      coordinate.sourceColumn,
      coordinate.sourceColumn + declarationName.length,
    ) === declarationName
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCoordinateRecord(
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

  if (
    typeof sourceFile !== "string" ||
    sourceFile.length === 0 ||
    typeof sourceLine !== "number" ||
    !Number.isInteger(sourceLine) ||
    sourceLine < 1 ||
    typeof sourceColumn !== "number" ||
    !Number.isInteger(sourceColumn) ||
    sourceColumn < 0 ||
    typeof sourceEndLine !== "number" ||
    !Number.isInteger(sourceEndLine) ||
    sourceEndLine < sourceLine ||
    typeof sourceEndColumn !== "number" ||
    !Number.isInteger(sourceEndColumn) ||
    sourceEndColumn < 0
  ) {
    return null;
  }

  return {
    sourceFile,
    sourceLine,
    sourceColumn,
    sourceEndLine,
    sourceEndColumn,
  };
}

function isSha256Hash(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
}

function normalizeBoundCoordinateRecord(
  value: unknown,
): BoundSymbolCoordinatesRecord | null {
  if (!isRecord(value)) return null;
  const record = normalizeCoordinateRecord(value);
  const { identityHash, sourceHash } = value;
  if (
    record === null ||
    !isSha256Hash(identityHash) ||
    !isSha256Hash(sourceHash)
  ) {
    return null;
  }
  return { ...record, identityHash, sourceHash };
}

function sortCoordinates(
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

function readCoordinateArtifact(content: string): SymbolCoordinatesArtifact {
  let parsed: unknown;
  try {
    parsed = parseYAML(content) as unknown;
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

function writeCoordinateArtifact(
  coordinates: Record<string, BoundSymbolCoordinatesRecord>,
): string {
  return `${SYMBOL_COORDINATES_COMMENT_BLOCK}${dumpYAML(
    {
      version: SYMBOL_COORDINATES_FORMAT_VERSION,
      coordinates: sortCoordinates(coordinates),
    },
    {
      lineWidth: -1,
      noRefs: true,
    },
  )}`;
}

function writeLegacyCoordinateArtifact(
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
    { lineWidth: -1, noRefs: true },
  )}`;
}

function toCoordinateRecord(
  entry: ManifestSymbolEntry,
): SymbolCoordinatesRecord | null {
  return normalizeCoordinateRecord(entry);
}

async function legacyRecordMatchesCurrentExtraction(
  record: ManifestSymbolEntry,
  coordinate: CoordinateArtifactRecord,
  workspaceRoot: string,
): Promise<boolean> {
  if (!normalizeCoordinateRecord(coordinate)) return false;
  const sourceFile =
    typeof record.sourceFile === "string" ? record.sourceFile : undefined;
  const title = typeof record.title === "string" ? record.title : "";
  if (!sourceFile) return false;
  const content = await readSourceText(coordinate.sourceFile, workspaceRoot);
  if (content === null || coordinate.sourceFile !== sourceFile) return false;
  if (isCoarseAnchor(record)) {
    return coordinatesEqual(
      coordinate,
      coarseCoordinateSpan(sourceFile, title, content),
    );
  }
  if (!title) return false;
  const declarationName = title.slice(title.lastIndexOf(".") + 1);
  const line = content.split(/\r?\n/)[coordinate.sourceLine - 1];
  return (
    declarationName.length > 0 &&
    line !== undefined &&
    coordinate.sourceColumn <= line.length - declarationName.length &&
    line.slice(
      coordinate.sourceColumn,
      coordinate.sourceColumn + declarationName.length,
    ) === declarationName
  );
}

function coordinatesEqual(
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

async function buildCoordinatesMap(
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

async function readCoordinateArtifactFromPath(
  coordinatesPath: string,
): Promise<SymbolCoordinatesArtifact> {
  const content = await readOptionalTextFile(coordinatesPath);
  if (content === null) {
    return { status: "legacy", coordinates: {} };
  }

  return readCoordinateArtifact(content);
}

async function readOptionalTextFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch (error) {
    if (
      error !== null &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return null;
    }
    throw error;
  }
}

async function publishCoordinateArtifact(
  targetPath: string,
  content: string,
): Promise<void> {
  const temporary = `${targetPath}.kibi-tmp-${process.pid}`;
  try {
    await writeFile(temporary, content, "utf8");
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
