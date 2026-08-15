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
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { dump as dumpYAML, load as parseYAML } from "js-yaml";
import {
  type ManifestSymbolEntry as CliManifestSymbolEntry,
  enrichSymbolCoordinates,
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

interface SymbolCoordinatesArtifact {
  coordinates: Record<string, SymbolCoordinatesRecord>;
}

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

export async function handleKbSymbolsRefresh(
  args: SymbolsRefreshArgs,
): Promise<SymbolsRefreshResult> {
  // implements REQ-vscode-traceability
  const dryRun = args.dryRun === true;
  const workspaceRoot = args.workspaceRoot ?? resolveWorkspaceRoot();
  const { coordinatesPath, manifestPath } =
    await resolveManifestPaths(workspaceRoot);

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
    buildCoordinatesMap(finalized),
  );
  const currentCoordinates = await readOptionalTextFile(coordinatesPath);

  if (!dryRun && currentCoordinates !== nextCoordinates) {
    await writeFile(coordinatesPath, nextCoordinates, "utf8");
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
  const nextCoordinates = {
    ...artifact.coordinates,
  };
  const coordinatesRecord = toCoordinateRecord(finalized);

  if (coordinatesRecord) {
    nextCoordinates[symbolId] = coordinatesRecord;
  }

  if (coordinatesRecord || Object.keys(nextCoordinates).length > 0) {
    const nextContent = writeCoordinateArtifact(nextCoordinates);
    const currentContent = await readOptionalTextFile(coordinatesPath);

    if (currentContent !== nextContent) {
      await writeFile(coordinatesPath, nextContent, "utf8");
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
  // implements REQ-002, REQ-013
  const configPath = path.join(workspaceRoot, ".kb", "config.json");
  try {
    const config = JSON.parse(await readFile(configPath, "utf8")) as {
      symbolsManifest?: string;
      paths?: { symbols?: string };
    };
    // Prefer paths.symbols (new standard) over symbolsManifest (legacy)
    if (config.paths?.symbols) {
      return path.isAbsolute(config.paths.symbols)
        ? config.paths.symbols
        : path.resolve(workspaceRoot, config.paths.symbols);
    }
    // Backward compatibility: check legacy symbolsManifest field
    if (config.symbolsManifest) {
      return path.isAbsolute(config.symbolsManifest)
        ? config.symbolsManifest
        : path.resolve(workspaceRoot, config.symbolsManifest);
    }
  } catch {
    // config file missing or malformed; fall through to defaults
  }

  const candidates = [
    path.join(workspaceRoot, "symbols.yaml"),
    path.join(workspaceRoot, "symbols.yml"),
  ];
  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return candidates[0] ?? path.join(workspaceRoot, "symbols.yaml");
}

function hasGeneratedCoordinates(entry: ManifestSymbolEntry): boolean {
  return (
    typeof entry.sourceLine === "number" &&
    typeof entry.sourceColumn === "number" &&
    typeof entry.sourceEndLine === "number" &&
    typeof entry.sourceEndColumn === "number"
  );
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
    return after;
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

  if (!sourceFile || !title) {
    return after;
  }

  const absolutePath = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);

  try {
    const content = await readFile(absolutePath, "utf8");
    const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`\\b${escapedTitle}\\b`);
    const lines = content.split(/\r?\n/);

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
  } catch {
    return after;
  }

  return after;
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
    typeof sourceLine !== "number" ||
    typeof sourceColumn !== "number" ||
    typeof sourceEndLine !== "number" ||
    typeof sourceEndColumn !== "number"
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

function sortCoordinates(
  coordinates: Record<string, SymbolCoordinatesRecord>,
): Record<string, SymbolCoordinatesRecord> {
  const sortedCoordinates: Record<string, SymbolCoordinatesRecord> = {};

  for (const symbolId of Object.keys(coordinates).sort((left, right) =>
    left.localeCompare(right),
  )) {
    const record = normalizeCoordinateRecord(coordinates[symbolId]);
    if (!record) {
      continue;
    }

    sortedCoordinates[symbolId] = record;
  }

  return sortedCoordinates;
}

function readCoordinateArtifact(content: string): SymbolCoordinatesArtifact {
  const parsed = parseYAML(content) as unknown;
  if (!isRecord(parsed) || !isRecord(parsed.coordinates)) {
    return { coordinates: {} };
  }

  const coordinates: Record<string, SymbolCoordinatesRecord> = {};

  for (const [symbolId, record] of Object.entries(parsed.coordinates)) {
    const normalizedRecord = normalizeCoordinateRecord(record);
    if (!normalizedRecord) {
      continue;
    }

    coordinates[symbolId] = normalizedRecord;
  }

  return { coordinates };
}

function writeCoordinateArtifact(
  coordinates: Record<string, SymbolCoordinatesRecord>,
): string {
  return `${SYMBOL_COORDINATES_COMMENT_BLOCK}${dumpYAML(
    { coordinates: sortCoordinates(coordinates) },
    {
      lineWidth: -1,
      noRefs: true,
      sortKeys: true,
    },
  )}`;
}

function toCoordinateRecord(
  entry: ManifestSymbolEntry,
): SymbolCoordinatesRecord | null {
  return normalizeCoordinateRecord(entry);
}

function buildCoordinatesMap(
  entries: ManifestSymbolEntry[],
): Record<string, SymbolCoordinatesRecord> {
  const coordinates: Record<string, SymbolCoordinatesRecord> = {};

  for (const entry of entries) {
    const id = typeof entry.id === "string" ? entry.id : undefined;
    const record = toCoordinateRecord(entry);
    if (!id || !record) {
      continue;
    }

    coordinates[id] = record;
  }

  return coordinates;
}

async function readCoordinateArtifactFromPath(
  coordinatesPath: string,
): Promise<SymbolCoordinatesArtifact> {
  const content = await readOptionalTextFile(coordinatesPath);
  if (content === null) {
    return { coordinates: {} };
  }

  return readCoordinateArtifact(content);
}

async function readOptionalTextFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}
