import { execFileSync } from "node:child_process";
import * as path from "node:path";
import type {
  SourceAnalysisResult,
  SourceSymbolAnalysisV2,
} from "kibi-plugin-sdk";
import { CONTEXT_MISSING_TAG } from "../entity-body-context.js";
import {
  type ManifestSymbolRecord,
  extractManifestSymbolRecordsString,
} from "../extractors/manifest.js";
import { analyzeSourceText } from "../extractors/symbols-coordinator.js";
import { isCoarseGranularityReason } from "../public/symbol-granularity.js";
import { resolveSymbolsManifestPaths } from "../utils/manifest-paths.js";
import type { KibiImpactSymbolsManifestFileDetail } from "./evidence-model.js";
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
  granularityReason: string | null;
}

interface RelativeManifestPaths {
  symbolsPath: string;
}

/**
 * True when a manifest record documents coarse file/module-level coverage using
 * a canonical granularity reason that legitimately stands for no single
 * declaration. Such records do not participate in declaration coverage.
 * `legacy-link` records remain declaration-bound, and unknown or malformed
 * reasons cannot bypass the comparison.
 */
function isDocumentedCoarseRecord(record: ManifestSymbolRecord): boolean {
  return isCoarseGranularityReason(record.granularity_reason);
}

export interface StagedSymbolsManifestAssessment {
  state: "fresh" | "stale" | "not_required";
  sourcePaths: string[];
  path: string;
  /**
   * Per-file extraction-vs-evidence diffs for the source paths whose symbol
   * output changed. Lets diagnostics name the uncovered symbols instead of
   * reporting a bare "stale" verdict.
   */
  fileDetails?: KibiImpactSymbolsManifestFileDetail[];
}

export interface StagedAuthoredSymbolsManifestEvidence {
  path: string;
  entries: Array<{ sourcePath: string; entityIds: string[] }>;
  changedEntityIds: string[];
  /**
   * Records whose only differences from the base are fields `kibi migrate`
   * writes mechanically; set only for a commit that carries a migration.
   */
  migrationOnlyEntityIds?: string[];
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
    return { symbolsPath: toRepoRelativePath(symbolsManifestPath) };
  }

  const { symbolsPath } = resolveSymbolsManifestPaths(process.cwd());
  return { symbolsPath: toRepoRelativePath(symbolsPath) };
}

function readHeadFileContent(
  filePath: string,
  cache?: Map<string, string | null>,
): string | null {
  const normalizedPath = filePath.replace(/\\/g, "/");
  const cacheKey = `${process.cwd()}\u0000${normalizedPath}`;
  if (cache?.has(cacheKey)) {
    return cache.get(cacheKey) ?? null;
  }

  try {
    // Use argv-based git invocation so a source path cannot alter the command.
    // The manifest can exceed a shell helper's small default maxBuffer; without
    // the raised limit the read fails with ENOBUFS and is silently treated as
    // missing, which permanently reports the coordinates manifest as stale.
    const content = execFileSync("git", ["show", `HEAD:${normalizedPath}`], {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
    cache?.set(cacheKey, content);
    return content;
  } catch {
    cache?.set(cacheKey, null);
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

export function manifestRecordSourcePath(record: {
  sourceFile?: unknown;
  source?: unknown;
}): string | null {
  return typeof record.sourceFile === "string"
    ? record.sourceFile
    : typeof record.source === "string"
      ? record.source
      : null;
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
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}

function normalizeManifestSymbolsForSourceFile(
  records: ManifestSymbolRecord[],
  sourceFile: string,
): NormalizedManifestSymbol[] {
  const symbols = records
    .filter((record) => {
      if (isDocumentedCoarseRecord(record)) {
        return false;
      }
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

  // Several logical records may own the same declaration; they collapse.
  return symbols.filter(
    (symbol, index) =>
      index === 0 ||
      JSON.stringify(symbol) !== JSON.stringify(symbols[index - 1]),
  );
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
        ? record.tags
            .filter((tag): tag is string => typeof tag === "string")
            .sort()
        : [],
      owner: typeof record.owner === "string" ? record.owner : null,
      priority: typeof record.priority === "string" ? record.priority : null,
      severity: typeof record.severity === "string" ? record.severity : null,
      textRef: typeof record.text_ref === "string" ? record.text_ref : null,
      granularityReason:
        typeof record.granularity_reason === "string"
          ? record.granularity_reason
          : null,
    }))
    .sort((left, right) =>
      JSON.stringify(left).localeCompare(JSON.stringify(right)),
    );
}

function getAuthoredSymbolComparisonKey(
  symbol: NormalizedAuthoredManifestSymbol,
): string {
  return symbol.id ?? `${symbol.sourceFile}:${symbol.title}`;
}

/**
 * The staged record with the edits `kibi migrate` makes mechanically undone
 * against its base record: a `granularity_reason: legacy-link` the base did
 * not have, and a `review:context-missing` tag the base did not carry. The
 * other migration-owned fields (`origin`, a removed dead `source`, a pinned
 * `semantic_text`) are not part of the authored symbol signature.
 */
// implements REQ-cli-migration-first-commit
function withoutMigrationOwnedEdits(
  head: NormalizedAuthoredManifestSymbol,
  staged: NormalizedAuthoredManifestSymbol,
): NormalizedAuthoredManifestSymbol {
  return {
    ...staged,
    granularityReason:
      staged.granularityReason === "legacy-link" &&
      head.granularityReason === null
        ? null
        : staged.granularityReason,
    tags: staged.tags.filter(
      (tag) => tag !== CONTEXT_MISSING_TAG || head.tags.includes(tag),
    ),
  };
}

function getChangedAuthoredEntityIds(
  headSymbols: NormalizedAuthoredManifestSymbol[],
  stagedSymbols: NormalizedAuthoredManifestSymbol[],
  ignoreMigrationOwnedEdits = false,
): { changed: string[]; migrationOnly: string[] } {
  const headByKey = new Map(
    headSymbols.map((symbol) => [
      getAuthoredSymbolComparisonKey(symbol),
      symbol,
    ]),
  );

  const changed: string[] = [];
  const migrationOnly: string[] = [];
  for (const symbol of stagedSymbols) {
    if (symbol.id === null) continue;
    const head = headByKey.get(getAuthoredSymbolComparisonKey(symbol));
    if (head !== undefined && JSON.stringify(head) === JSON.stringify(symbol))
      continue;
    if (
      ignoreMigrationOwnedEdits &&
      head !== undefined &&
      JSON.stringify(head) ===
        JSON.stringify(withoutMigrationOwnedEdits(head, symbol))
    ) {
      migrationOnly.push(symbol.id);
      continue;
    }
    changed.push(symbol.id);
  }

  return {
    changed: uniqueSorted(changed),
    migrationOnly: uniqueSorted(migrationOnly),
  };
}

function normalizeExpectedSymbolsForStagedFile(
  stagedFile: StagedFile,
  analyze?: (filePath: string, content: string) => SourceAnalysisResult,
  authoredTitles: ReadonlySet<string> = new Set(),
): NormalizedManifestSymbol[] {
  const analysis = (analyze ?? analyzeSourceText)(
    stagedFile.path,
    stagedFile.content ?? "",
  );

  return analysis.symbols
    .map((symbol) => ({
      title: (() => {
        const qualified = (symbol as SourceSymbolAnalysisV2).qualifiedName;
        if (
          !qualified ||
          (authoredTitles.has(symbol.name) &&
            analysis.symbols.filter(
              (candidate) => candidate.name === symbol.name,
            ).length === 1)
        )
          return symbol.name;
        return qualified;
      })(),
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

// implements REQ-cli-staged-impact-enforcement
function diffSymbolEvidence(
  sourcePath: string,
  expectedSymbols: NormalizedManifestSymbol[],
  stagedSymbols: NormalizedManifestSymbol[],
): KibiImpactSymbolsManifestFileDetail | null {
  const stagedTitles = new Set(stagedSymbols.map((symbol) => symbol.title));
  const expectedTitles = new Set(expectedSymbols.map((symbol) => symbol.title));
  const missing = expectedSymbols
    .filter((symbol) => !stagedTitles.has(symbol.title))
    .map((symbol) => ({ title: symbol.title, line: symbol.sourceLine ?? 0 }))
    .sort((left, right) => left.title.localeCompare(right.title));
  const extra = stagedSymbols
    .filter((symbol) => !expectedTitles.has(symbol.title))
    .map((symbol) => symbol.title)
    .sort();
  // Pure coordinate drift (titles unchanged) has no symbol-level remedy to
  // name; leave the detail out so the diagnostic stays verdict + refresh.
  if (missing.length === 0 && extra.length === 0) {
    return null;
  }
  // Keep the complete lists: the gate output names every symbol.
  return {
    path: sourcePath,
    expectedCount: expectedSymbols.length,
    coveredCount: expectedSymbols.length - missing.length,
    missing,
    extra,
  };
}

/**
 * Whether the staged symbol manifest covers the declarations of the staged
 * behavior files.
 *
 * Coordinates are derived from source and never committed, so the check
 * compares symbol titles only: every declaration extracted from a staged
 * file must have a manifest record and every granular record must still name
 * a declaration. A covered file is `fresh` evidence for its behavior edit; a
 * gap is `stale` and lists the uncovered and orphaned symbols.
 */
// implements REQ-cli-staged-impact-enforcement
// implements REQ-symbol-coordinates-derived-locally
export function assessStagedSymbolsManifest(options: {
  symbolsManifestPath: string;
  sourceFiles: StagedFile[];
  stagedFiles: StagedFile[];
  readBaseFile?: (filePath: string) => string | null;
  analyzeSource?: (filePath: string, content: string) => SourceAnalysisResult;
}): StagedSymbolsManifestAssessment {
  const { sourceFiles, stagedFiles, symbolsManifestPath } = options;
  const paths = resolveRelativeManifestPaths(symbolsManifestPath);
  const stagedManifestFile = stagedFiles.find(
    (file) => file.path === paths.symbolsPath,
  );
  const stagedManifestRecords = stagedManifestFile
    ? parseManifestRecords(stagedManifestFile.content, paths.symbolsPath)
    : parseManifestRecords(
        options.readBaseFile
          ? options.readBaseFile(paths.symbolsPath)
          : readHeadFileContent(paths.symbolsPath),
        paths.symbolsPath,
      );

  const coveredPaths: string[] = [];
  const uncoveredPaths: string[] = [];
  const symbolDetails: KibiImpactSymbolsManifestFileDetail[] = [];

  for (const sourceFile of sourceFiles) {
    const manifestRecordsForFile = (stagedManifestRecords ?? []).filter(
      (record) => manifestRecordSourcePath(record) === sourceFile.path,
    );
    const coarseCovered =
      manifestRecordsForFile.length > 0 &&
      manifestRecordsForFile.every(isDocumentedCoarseRecord);
    if (coarseCovered) {
      continue;
    }

    const recordsByTitle = new Map<string, ManifestSymbolRecord[]>();
    for (const record of manifestRecordsForFile) {
      if (typeof record.title !== "string") continue;
      const records = recordsByTitle.get(record.title) ?? [];
      records.push(record);
      recordsByTitle.set(record.title, records);
    }
    // A coarse anchor stands in for its extracted declaration only when
    // every authored record with that title is explicitly coarse.
    const coarseTitles = new Set(
      [...recordsByTitle.entries()]
        .filter(([, records]) => records.every(isDocumentedCoarseRecord))
        .map(([title]) => title),
    );
    const expectedSymbols = normalizeExpectedSymbolsForStagedFile(
      sourceFile,
      options.analyzeSource,
      new Set(recordsByTitle.keys()),
    ).filter((symbol) => !coarseTitles.has(symbol.title));
    const stagedSymbols = normalizeManifestSymbolsForSourceFile(
      stagedManifestRecords ?? [],
      sourceFile.path,
    );
    if (expectedSymbols.length === 0 && stagedSymbols.length === 0) {
      continue;
    }

    const detail = diffSymbolEvidence(
      sourceFile.path,
      expectedSymbols,
      stagedSymbols,
    );
    if (detail === null) {
      coveredPaths.push(sourceFile.path);
    } else {
      uncoveredPaths.push(sourceFile.path);
      symbolDetails.push(detail);
    }
  }

  if (coveredPaths.length === 0 && uncoveredPaths.length === 0) {
    return { state: "not_required", sourcePaths: [], path: paths.symbolsPath };
  }
  if (uncoveredPaths.length === 0) {
    return {
      state: "fresh",
      sourcePaths: uniqueSorted(coveredPaths),
      path: paths.symbolsPath,
    };
  }
  return {
    state: "stale",
    sourcePaths: uniqueSorted(uncoveredPaths),
    path: paths.symbolsPath,
    fileDetails: symbolDetails.sort((left, right) =>
      left.path.localeCompare(right.path),
    ),
  };
}

export function collectStagedAuthoredSymbolsManifestEvidence(options: {
  sourceFiles: StagedFile[];
  stagedFiles: StagedFile[];
  readBaseFile?: (filePath: string) => string | null;
  /**
   * The commit carries a `kibi migrate` run: records it changed only in
   * migration-owned fields are reported in `migrationOnlyEntityIds` instead
   * of `changedEntityIds`.
   */
  ignoreMigrationOwnedEdits?: boolean;
}): StagedAuthoredSymbolsManifestEvidence {
  const { sourceFiles, stagedFiles } = options;
  const paths = resolveRelativeManifestPaths();
  const stagedManifestFile = stagedFiles.find(
    (file) => file.path === paths.symbolsPath,
  );

  if (!stagedManifestFile) {
    return { path: paths.symbolsPath, entries: [], changedEntityIds: [] };
  }

  const headManifestRecords =
    parseManifestRecords(
      options.readBaseFile
        ? options.readBaseFile(paths.symbolsPath)
        : readHeadFileContent(paths.symbolsPath),
      paths.symbolsPath,
    ) ?? [];
  const stagedManifestRecords = parseManifestRecords(
    stagedManifestFile.content,
    paths.symbolsPath,
  );

  if (stagedManifestRecords === null) {
    return { path: paths.symbolsPath, entries: [], changedEntityIds: [] };
  }

  const sourcePaths = uniqueSorted(
    [...headManifestRecords, ...stagedManifestRecords].flatMap((record) => {
      const sourceFile =
        typeof record.sourceFile === "string"
          ? record.sourceFile
          : typeof record.source === "string"
            ? record.source
            : null;
      return sourceFile === null ? [] : [sourceFile];
    }),
  );
  const migrationOnlyEntityIds = new Set<string>();
  const changedEntityIdsBySourcePath = new Map(
    sourcePaths.map((sourcePath) => {
      const headSymbols = normalizeAuthoredManifestSymbolsForSourceFile(
        headManifestRecords,
        sourcePath,
      );
      const stagedSymbols = normalizeAuthoredManifestSymbolsForSourceFile(
        stagedManifestRecords,
        sourcePath,
      );
      const { changed, migrationOnly } = getChangedAuthoredEntityIds(
        headSymbols,
        stagedSymbols,
        options.ignoreMigrationOwnedEdits === true,
      );
      for (const id of migrationOnly) migrationOnlyEntityIds.add(id);
      return [sourcePath, changed] as const;
    }),
  );
  const entries: Array<{ sourcePath: string; entityIds: string[] }> = [];

  for (const sourceFile of sourceFiles) {
    const entityIds = changedEntityIdsBySourcePath.get(sourceFile.path) ?? [];
    if (entityIds.length === 0) continue;
    entries.push({ sourcePath: sourceFile.path, entityIds });
  }

  return {
    path: paths.symbolsPath,
    entries,
    changedEntityIds: uniqueSorted(
      Array.from(changedEntityIdsBySourcePath.values()).flat(),
    ),
    ...(migrationOnlyEntityIds.size > 0
      ? { migrationOnlyEntityIds: uniqueSorted(migrationOnlyEntityIds) }
      : {}),
  };
}
