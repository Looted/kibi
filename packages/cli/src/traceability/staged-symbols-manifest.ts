import { execSync } from "node:child_process";
import * as path from "node:path";
import {
  extractManifestSymbolRecordsString,
  type ManifestSymbolRecord,
} from "../extractors/manifest.js";
import {
  mergeCoordinatesWithManifest,
  readCoordinateArtifact,
  type SymbolCoordinatesArtifact,
} from "../extractors/symbol-coordinates.js";
import { analyzeSourceText } from "../extractors/symbols-coordinator.js";
import { resolveSymbolsManifestPaths } from "../utils/manifest-paths.js";
import type { StagedFile } from "./git-staged.js";

interface NormalizedManifestSymbol {
  title: string;
  sourceFile: string;
  sourceLine: number | null;
  sourceColumn: number | null;
  sourceEndLine: number | null;
  sourceEndColumn: number | null;
}

interface NormalizedAuthoredManifestSymbol {
  id: string | null;
  title: string;
  sourceFile: string;
  status: string | null;
  links: Array<string | { type: string; target: string }>;
  relationships: Array<{ type: string; target: string }>;
  tags: string[];
  owner: string | null;
  priority: string | null;
  severity: string | null;
  textRef: string | null;
}

interface RelativeManifestPaths {
  symbolsPath: string;
  coordinatesPath: string;
}

export interface StagedSymbolsManifestAssessment {
  state: "fresh" | "stale" | "missing" | "not_required";
  sourcePaths: string[];
  path: string;
}

export interface StagedAuthoredSymbolsManifestEvidence {
  path: string;
  entries: Array<{ sourcePath: string; entityIds: string[] }>;
}

function toRepoRelativePath(absoluteOrRelativePath: string): string {
  if (!path.isAbsolute(absoluteOrRelativePath)) {
    return absoluteOrRelativePath.replace(/\\/g, "/");
  }

  const relativePath = path.relative(process.cwd(), absoluteOrRelativePath);
  return relativePath.replace(/\\/g, "/");
}

function resolveRelativeManifestPaths(
  symbolsManifestPath?: string,
): RelativeManifestPaths {
  if (symbolsManifestPath) {
    const normalizedSymbolsPath = toRepoRelativePath(symbolsManifestPath);
    return {
      symbolsPath: normalizedSymbolsPath,
      coordinatesPath: path
        .join(path.dirname(normalizedSymbolsPath), "symbol-coordinates.yaml")
        .replace(/\\/g, "/"),
    };
  }

  const { coordinatesPath, symbolsPath } = resolveSymbolsManifestPaths(process.cwd());

  return {
    symbolsPath: toRepoRelativePath(symbolsPath),
    coordinatesPath: toRepoRelativePath(coordinatesPath),
  };
}


function readHeadFileContent(filePath: string): string | null {
  try {
    return execSync(`git show HEAD:${filePath}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function parseManifestRecords(
  content: string | null | undefined,
  filePath: string,
): ManifestSymbolRecord[] | null {
  if (content === null || content === undefined) {
    return [];
  }

  try {
    return extractManifestSymbolRecordsString(content, filePath);
  } catch {
    return null;
  }
}

function parseCoordinateArtifact(
  content: string | null | undefined,
): SymbolCoordinatesArtifact | null {
  if (content === null || content === undefined) {
    return { coordinates: {} };
  }

  try {
    return readCoordinateArtifact(content);
  } catch {
    return null;
  }
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
}

function normalizeLinks(
  links: ManifestSymbolRecord["links"],
): Array<string | { type: string; target: string }> {
  if (!Array.isArray(links)) {
    return [];
  }

  const normalized: Array<string | { type: string; target: string }> = [];

  for (const link of links) {
    if (typeof link === "string") {
      normalized.push(link);
      continue;
    }

    if (
      link &&
      typeof link === "object" &&
      typeof link.type === "string" &&
      typeof link.target === "string"
    ) {
      normalized.push({ type: link.type, target: link.target });
    }
  }

  return normalized.sort((left, right) =>
    JSON.stringify(left).localeCompare(JSON.stringify(right)),
  );
}

function normalizeRelationships(
  relationships: ManifestSymbolRecord["relationships"],
): Array<{ type: string; target: string }> {
  if (!Array.isArray(relationships)) {
    return [];
  }

  return relationships
    .flatMap((relationship) => {
      if (
        relationship &&
        typeof relationship.type === "string" &&
        typeof relationship.target === "string"
      ) {
        return [{ type: relationship.type, target: relationship.target }];
      }

      return [];
    })
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function normalizeManifestSymbolsForSourceFile(
  records: ManifestSymbolRecord[],
  sourceFile: string,
): NormalizedManifestSymbol[] {
  return records
    .filter((record) => {
      const recordSource =
        typeof record.sourceFile === "string"
          ? record.sourceFile
          : typeof record.source === "string"
            ? record.source
            : null;
      return recordSource === sourceFile && typeof record.title === "string";
    })
    .map((record) => ({
      title: record.title as string,
      sourceFile,
      sourceLine: normalizeNumber(record.sourceLine),
      sourceColumn: normalizeNumber(record.sourceColumn),
      sourceEndLine: normalizeNumber(record.sourceEndLine),
      sourceEndColumn: normalizeNumber(record.sourceEndColumn),
    }))
    .sort(compareNormalizedSymbols);
}

function normalizeAuthoredManifestSymbolsForSourceFile(
  records: ManifestSymbolRecord[],
  sourceFile: string,
): NormalizedAuthoredManifestSymbol[] {
  return records
    .filter((record) => {
      const recordSource =
        typeof record.sourceFile === "string"
          ? record.sourceFile
          : typeof record.source === "string"
            ? record.source
            : null;
      return recordSource === sourceFile && typeof record.title === "string";
    })
    .map((record) => ({
      id: typeof record.id === "string" ? record.id : null,
      title: record.title as string,
      sourceFile,
      status: typeof record.status === "string" ? record.status : null,
      links: normalizeLinks(record.links),
      relationships: normalizeRelationships(record.relationships),
      tags: Array.isArray(record.tags)
        ? record.tags.filter((tag): tag is string => typeof tag === "string").sort()
        : [],
      owner: typeof record.owner === "string" ? record.owner : null,
      priority: typeof record.priority === "string" ? record.priority : null,
      severity: typeof record.severity === "string" ? record.severity : null,
      textRef: typeof record.text_ref === "string" ? record.text_ref : null,
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function normalizeExpectedSymbolsForStagedFile(
  stagedFile: StagedFile,
): NormalizedManifestSymbol[] {
  const analysis = analyzeSourceText(stagedFile.path, stagedFile.content ?? "");

  return analysis.symbols
    .map((symbol) => ({
      title: symbol.name,
      sourceFile: stagedFile.path,
      sourceLine: symbol.startLine,
      sourceColumn: symbol.startColumn,
      sourceEndLine: symbol.endLine,
      sourceEndColumn: symbol.endColumn,
    }))
    .sort(compareNormalizedSymbols);
}

function compareNormalizedSymbols(
  left: NormalizedManifestSymbol,
  right: NormalizedManifestSymbol,
): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function signaturesEqual(left: unknown[], right: unknown[]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function uniqueSorted(paths: Iterable<string>): string[] {
  return Array.from(new Set(paths)).sort();
}

function mergeManifestRecordsWithCoordinates(
  manifestRecords: ManifestSymbolRecord[] | null,
  coordinateArtifact: SymbolCoordinatesArtifact | null,
): ManifestSymbolRecord[] {
  return mergeCoordinatesWithManifest(manifestRecords ?? [], coordinateArtifact);
}

function getEffectiveManifestRecords(options: {
  stagedFiles: StagedFile[];
  paths: RelativeManifestPaths;
  headManifestRecords: ManifestSymbolRecord[] | null;
  headCoordinateArtifact: SymbolCoordinatesArtifact | null;
}): {
  stagedManifestFile: StagedFile | undefined;
  stagedCoordinatesFile: StagedFile | undefined;
  stagedManifestRecords: ManifestSymbolRecord[] | null;
  stagedCoordinateArtifact: SymbolCoordinatesArtifact | null;
} {
  const { headCoordinateArtifact, headManifestRecords, paths, stagedFiles } = options;
  const stagedManifestFile = stagedFiles.find(
    (file) => file.path === paths.symbolsPath,
  );
  const stagedCoordinatesFile = stagedFiles.find(
    (file) => file.path === paths.coordinatesPath,
  );

  const stagedManifestRecords = stagedManifestFile
    ? parseManifestRecords(stagedManifestFile.content, paths.symbolsPath)
    : headManifestRecords;
  const stagedCoordinateArtifact = stagedCoordinatesFile
    ? parseCoordinateArtifact(stagedCoordinatesFile.content)
    : headCoordinateArtifact;

  return {
    stagedManifestFile,
    stagedCoordinatesFile,
    stagedManifestRecords,
    stagedCoordinateArtifact,
  };
}

export function assessStagedSymbolsManifest(options: {
  symbolsManifestPath: string;
  sourceFiles: StagedFile[];
  stagedFiles: StagedFile[];
}): StagedSymbolsManifestAssessment {
  const { sourceFiles, stagedFiles, symbolsManifestPath } = options;
  const paths = resolveRelativeManifestPaths(symbolsManifestPath);
  const headManifestRecords = parseManifestRecords(
    readHeadFileContent(paths.symbolsPath),
    paths.symbolsPath,
  );
  const headCoordinateArtifact = parseCoordinateArtifact(
    readHeadFileContent(paths.coordinatesPath),
  );
  const {
    stagedCoordinatesFile,
    stagedCoordinateArtifact,
    stagedManifestRecords,
  } = getEffectiveManifestRecords({
    stagedFiles,
    paths,
    headManifestRecords,
    headCoordinateArtifact,
  });

  const baselineMergedRecords = mergeManifestRecordsWithCoordinates(
    headManifestRecords,
    headCoordinateArtifact,
  );
  const stagedMergedRecords = mergeManifestRecordsWithCoordinates(
    stagedManifestRecords,
    stagedCoordinateArtifact,
  );

  const requiredRefreshPaths: string[] = [];
  const freshPaths = new Set<string>();

  for (const sourceFile of sourceFiles) {
    const expectedSymbols = normalizeExpectedSymbolsForStagedFile(sourceFile);
    const baselineSymbols = normalizeManifestSymbolsForSourceFile(
      baselineMergedRecords,
      sourceFile.path,
    );

    if (signaturesEqual(expectedSymbols, baselineSymbols)) {
      continue;
    }

    requiredRefreshPaths.push(sourceFile.path);

    if (!stagedCoordinatesFile || stagedCoordinateArtifact === null) {
      continue;
    }

    const stagedSymbols = normalizeManifestSymbolsForSourceFile(
      stagedMergedRecords,
      sourceFile.path,
    );

    if (signaturesEqual(expectedSymbols, stagedSymbols)) {
      freshPaths.add(sourceFile.path);
    }
  }

  const sourcePaths = uniqueSorted(requiredRefreshPaths);
  if (sourcePaths.length === 0) {
    return { state: "not_required", sourcePaths: [], path: paths.coordinatesPath };
  }

  if (sourcePaths.every((sourcePath) => freshPaths.has(sourcePath))) {
    return { state: "fresh", sourcePaths, path: paths.coordinatesPath };
  }

  if (!stagedCoordinatesFile) {
    return { state: "missing", sourcePaths, path: paths.coordinatesPath };
  }

  return { state: "stale", sourcePaths, path: paths.coordinatesPath };
}

function getEntityIdsForSourceFile(
  records: ManifestSymbolRecord[],
  sourceFile: string,
): string[] {
  return records
    .filter((record) => {
      const recordSource =
        typeof record.sourceFile === "string"
          ? record.sourceFile
          : typeof record.source === "string"
            ? record.source
            : null;
      return recordSource === sourceFile && typeof record.id === "string";
    })
    .map((record) => record.id as string)
    .sort();
}

export function collectStagedAuthoredSymbolsManifestEvidence(options: {
  sourceFiles: StagedFile[];
  stagedFiles: StagedFile[];
}): StagedAuthoredSymbolsManifestEvidence {
  const { sourceFiles, stagedFiles } = options;
  const paths = resolveRelativeManifestPaths();
  const stagedManifestFile = stagedFiles.find(
    (file) => file.path === paths.symbolsPath,
  );

  if (!stagedManifestFile) {
    return { path: paths.symbolsPath, entries: [] };
  }

  const headManifestRecords =
    parseManifestRecords(readHeadFileContent(paths.symbolsPath), paths.symbolsPath) ?? [];
  const stagedManifestRecords = parseManifestRecords(
    stagedManifestFile.content,
    paths.symbolsPath,
  );

  if (stagedManifestRecords === null) {
    return { path: paths.symbolsPath, entries: [] };
  }

  const entries: Array<{ sourcePath: string; entityIds: string[] }> = [];

  for (const sourceFile of sourceFiles) {
    const headSymbols = normalizeAuthoredManifestSymbolsForSourceFile(
      headManifestRecords,
      sourceFile.path,
    );
    const stagedSymbols = normalizeAuthoredManifestSymbolsForSourceFile(
      stagedManifestRecords,
      sourceFile.path,
    );

    if (signaturesEqual(headSymbols, stagedSymbols)) {
      continue;
    }

    entries.push({
      sourcePath: sourceFile.path,
      entityIds: getEntityIdsForSourceFile(stagedManifestRecords, sourceFile.path),
    });
  }

  return { path: paths.symbolsPath, entries };
}
