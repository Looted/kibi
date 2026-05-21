import { execSync } from "node:child_process";
import {
  type ManifestSymbolRecord,
  extractManifestSymbolRecordsString,
} from "../extractors/manifest.js";
import { analyzeSourceText } from "../extractors/symbols-coordinator.js";
import type { StagedFile } from "./git-staged.js";

interface NormalizedManifestSymbol {
  title: string;
  sourceFile: string;
  sourceLine: number | null;
  sourceColumn: number | null;
  sourceEndLine: number | null;
  sourceEndColumn: number | null;
}

export interface StagedSymbolsManifestAssessment {
  state: "fresh" | "stale" | "not_required";
  sourcePaths: string[];
}

function readHeadManifestContent(symbolsManifestPath: string): string | null {
  try {
    return execSync(`git show HEAD:${symbolsManifestPath}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}

function parseManifestRecords(
  content: string | null | undefined,
  symbolsManifestPath: string,
): ManifestSymbolRecord[] | null {
  if (content === null || content === undefined) {
    return [];
  }

  try {
    return extractManifestSymbolRecordsString(content, symbolsManifestPath);
  } catch {
    return null;
  }
}

function normalizeNumber(value: unknown): number | null {
  return typeof value === "number" ? value : null;
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

function signaturesEqual(
  left: NormalizedManifestSymbol[],
  right: NormalizedManifestSymbol[],
): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function uniqueSorted(paths: Iterable<string>): string[] {
  return Array.from(new Set(paths)).sort();
}

export function assessStagedSymbolsManifest(options: {
  symbolsManifestPath: string;
  sourceFiles: StagedFile[];
  stagedFiles: StagedFile[];
}): StagedSymbolsManifestAssessment {
  const { sourceFiles, stagedFiles, symbolsManifestPath } = options;
  const headManifestRecords = parseManifestRecords(
    readHeadManifestContent(symbolsManifestPath),
    symbolsManifestPath,
  );
  const stagedManifestFile = stagedFiles.find(
    (file) => file.path === symbolsManifestPath,
  );
  const stagedManifestRecords = parseManifestRecords(
    stagedManifestFile?.content,
    symbolsManifestPath,
  );

  const requiredRefreshPaths: string[] = [];
  const freshPaths = new Set<string>();

  for (const sourceFile of sourceFiles) {
    const expectedSymbols = normalizeExpectedSymbolsForStagedFile(sourceFile);
    const baselineSymbols = normalizeManifestSymbolsForSourceFile(
      headManifestRecords ?? [],
      sourceFile.path,
    );

    if (signaturesEqual(expectedSymbols, baselineSymbols)) {
      continue;
    }

    requiredRefreshPaths.push(sourceFile.path);

    if (!stagedManifestFile || stagedManifestRecords === null) {
      continue;
    }

    const stagedSymbols = normalizeManifestSymbolsForSourceFile(
      stagedManifestRecords,
      sourceFile.path,
    );

    if (signaturesEqual(expectedSymbols, stagedSymbols)) {
      freshPaths.add(sourceFile.path);
    }
  }

  const sourcePaths = uniqueSorted(requiredRefreshPaths);
  if (sourcePaths.length === 0) {
    return { state: "not_required", sourcePaths: [] };
  }

  if (sourcePaths.every((sourcePath) => freshPaths.has(sourcePath))) {
    return { state: "fresh", sourcePaths };
  }

  return { state: "stale", sourcePaths };
}
