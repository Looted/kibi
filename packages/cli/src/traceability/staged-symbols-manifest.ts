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
import {
  type DeclarationSource,
  baseAnalysisUsable,
  declarationsInChange,
} from "./staged-declaration-change.js";

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
  symbolRole: string | null;
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
  /** With a base: the source paths with no judged gap, whatever the state. */
  coveredSourcePaths?: string[];
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
  // A relative path resolves against the cwd and comes back unchanged.
  return path
    .relative(process.cwd(), absoluteOrRelativePath)
    .replace(/\\/g, "/");
}

function resolveRelativeManifestPaths(symbolsManifestPath?: string): {
  symbolsPath: string;
} {
  return {
    symbolsPath: toRepoRelativePath(
      symbolsManifestPath ||
        resolveSymbolsManifestPaths(process.cwd()).symbolsPath,
    ),
  };
}

function readHeadFileContent(filePath: string): string {
  // Use argv-based git invocation so a source path cannot alter the command.
  // The manifest can exceed a shell helper's small default maxBuffer; without
  // the raised limit the read fails with ENOBUFS and is silently treated as
  // missing, which permanently reports the coordinates manifest as stale.
  return execFileSync("git", ["show", `HEAD:${filePath}`], {
    // rationale: the mode only keeps git's stderr off the terminal; the
    // returned content and the thrown error are the same either way.
    // Stryker disable next-line StringLiteral
    stdio: "pipe",
    maxBuffer: 64 * 1024 * 1024,
  }).toString();
}

/**
 * The records of a manifest. A missing, unreadable or malformed manifest has
 * none: every consumer treats it exactly like an empty one.
 */
function readManifestRecords(
  read: () => string | null | undefined,
  filePath: string,
): ManifestSymbolRecord[] {
  try {
    return extractManifestSymbolRecordsString(read() as string, filePath);
  } catch {
    // rationale: a non-record entry has no source path, so it matches no
    // file and is indistinguishable from an empty list.
    // Stryker disable next-line ArrayDeclaration
    return [];
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

/** A well-formed `{ type, target }` pair, or nothing. */
function typedLink(value: unknown): Array<{ type: string; target: string }> {
  const link = value as { type?: unknown; target?: unknown } | null;
  return link &&
    typeof link.type === "string" &&
    typeof link.target === "string"
    ? [{ type: link.type, target: link.target }]
    : [];
}

function byJson(left: unknown, right: unknown): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function normalizeLinks(
  links: ManifestSymbolRecord["links"],
): Array<string | { type: string; target: string }> {
  if (!Array.isArray(links)) {
    return [];
  }
  return links
    .flatMap(
      (link): Array<string | { type: string; target: string }> =>
        typeof link === "string" ? [link] : typedLink(link),
    )
    .sort(byJson);
}

function normalizeRelationships(
  relationships: ManifestSymbolRecord["relationships"],
): Array<{ type: string; target: string }> {
  if (!Array.isArray(relationships)) {
    return [];
  }
  return relationships.flatMap(typedLink).sort(byJson);
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
      return (
        manifestRecordSourcePath(record) === sourceFile &&
        typeof record.title === "string"
      );
    })
    .map((record) => ({
      title: record.title as string,
      sourceFile,
      sourceLine: normalizeNumber(record.sourceLine),
      sourceColumn: normalizeNumber(record.sourceColumn),
      sourceEndLine: normalizeNumber(record.sourceEndLine),
      sourceEndColumn: normalizeNumber(record.sourceEndColumn),
    }));

  // Several logical records may own the same declaration; they collapse.
  return [
    ...new Map(
      symbols.map((symbol) => [JSON.stringify(symbol), symbol]),
    ).values(),
  ];
}

function normalizeAuthoredManifestSymbolsForSourceFile(
  records: ManifestSymbolRecord[],
  sourceFile: string,
): NormalizedAuthoredManifestSymbol[] {
  return records
    .filter((record) => {
      return (
        manifestRecordSourcePath(record) === sourceFile &&
        typeof record.title === "string"
      );
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
      symbolRole:
        typeof record.symbol_role === "string" ? record.symbol_role : null,
    }));
}

/**
 * The staged record with the edits `kibi migrate` makes mechanically undone
 * against its base record: a `granularity_reason: legacy-link` the base did
 * not have, and a `review:context-missing` tag the base did not carry. The
 * other migration-owned fields (`origin`, a removed dead `source`, a pinned
 * `semantic_text`) are not part of the authored symbol signature.
 */
function withoutMigrationOwnedEdits(
  head: NormalizedAuthoredManifestSymbol,
  staged: NormalizedAuthoredManifestSymbol,
): NormalizedAuthoredManifestSymbol {
  return {
    ...staged,
    // A base with another reason differs from both spellings anyway.
    granularityReason:
      staged.granularityReason === "legacy-link"
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
  ignoreMigrationOwnedEdits: boolean,
): { changed: string[]; migrationOnly: string[] } {
  // Only records with an id are compared, so the id is the key.
  const headById = new Map(headSymbols.map((symbol) => [symbol.id, symbol]));

  const changed: string[] = [];
  const migrationOnly: string[] = [];
  for (const symbol of stagedSymbols) {
    if (symbol.id === null) continue;
    const head = headById.get(symbol.id);
    if (JSON.stringify(head) === JSON.stringify(symbol)) continue;
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

interface ExpectedManifestSymbol extends NormalizedManifestSymbol {
  /** The analyzed declaration the title names. */
  declaration: SourceAnalysisResult["symbols"][number];
}

/**
 * The titles a manifest uses for the declarations of one analysis: the bare
 * name when an authored record uses it and it is unique in the file, else
 * the qualified name.
 */
function expectedSymbolsForAnalysis(
  sourcePath: string,
  analysis: SourceAnalysisResult,
  authoredTitles: ReadonlySet<string>,
): ExpectedManifestSymbol[] {
  return analysis.symbols.map((symbol) => ({
    title: (() => {
      const qualified = (symbol as SourceSymbolAnalysisV2).qualifiedName;
      if (
        !qualified ||
        (authoredTitles.has(symbol.name) &&
          analysis.symbols.filter((candidate) => candidate.name === symbol.name)
            .length === 1)
      )
        return symbol.name;
      return qualified;
    })(),
    sourceFile: sourcePath,
    sourceLine: symbol.startLine,
    sourceColumn: symbol.startColumn,
    sourceEndLine: symbol.endLine,
    sourceEndColumn: symbol.endColumn,
    declaration: symbol,
  }));
}

function uniqueSorted(paths: Iterable<string>): string[] {
  return Array.from(new Set(paths)).sort();
}

function byTitle(left: { title: string }, right: { title: string }): number {
  return left.title.localeCompare(right.title);
}

/** Non-coarse record titles per title, for one source path. */
function recordsByTitleForPath(
  records: readonly ManifestSymbolRecord[],
  sourcePath: string,
): Map<string, ManifestSymbolRecord[]> {
  const byTitle = new Map<string, ManifestSymbolRecord[]>();
  // A record without a string title matches no extracted declaration.
  for (const record of records) {
    if (manifestRecordSourcePath(record) !== sourcePath) continue;
    const title = record.title as string;
    const list = byTitle.get(title) ?? [];
    list.push(record);
    byTitle.set(title, list);
  }
  return byTitle;
}

/** Titles whose every authored record is explicitly coarse. */
function coarseTitlesOf(
  recordsByTitle: ReadonlyMap<string, ManifestSymbolRecord[]>,
): Set<string> {
  return new Set(
    [...recordsByTitle.entries()]
      .filter(([, records]) => records.every(isDocumentedCoarseRecord))
      .map(([title]) => title),
  );
}

/**
 * The declarations of one analyzed source file that no manifest record
 * names, by the same title and coarse-record rules as the staged gate. A
 * file whose every record is coarse has none.
 */
export function unrecordedDeclarations(
  sourcePath: string,
  analysis: SourceAnalysisResult,
  records: readonly ManifestSymbolRecord[],
): Array<{ title: string; line: number }> {
  const recordsByTitle = recordsByTitleForPath(records, sourcePath);
  const fileRecords = [...recordsByTitle.values()].flat();
  if (fileRecords.length > 0 && fileRecords.every(isDocumentedCoarseRecord))
    return [];
  const coarseTitles = coarseTitlesOf(recordsByTitle);
  return expectedSymbolsForAnalysis(
    sourcePath,
    analysis,
    new Set(recordsByTitle.keys()),
  )
    .filter(
      (symbol) =>
        !coarseTitles.has(symbol.title) && !recordsByTitle.has(symbol.title),
    )
    .map((symbol) => ({ title: symbol.title, line: symbol.sourceLine ?? 0 }))
    .sort(byTitle);
}

/** The base version of a staged source file, when the commit has one. */
export type StagedSymbolsBaseSource = (
  file: StagedFile,
) => DeclarationSource | null;

interface BaseComparison {
  /** Declarations of the staged file the commit adds or changes. */
  changed: ReadonlySet<SourceAnalysisResult["symbols"][number]>;
  /** Titles the base version of the file declared. */
  baseDeclarationTitles: ReadonlySet<string>;
  /** Titles the base manifest recorded for the base path of the file. */
  baseRecordTitles: ReadonlySet<string>;
}

function diffSymbolEvidence(
  sourcePath: string,
  expectedSymbols: ExpectedManifestSymbol[],
  stagedSymbols: NormalizedManifestSymbol[],
  base: BaseComparison | null,
): KibiImpactSymbolsManifestFileDetail | null {
  const stagedTitles = new Set(stagedSymbols.map((symbol) => symbol.title));
  const expectedTitles = new Set(expectedSymbols.map((symbol) => symbol.title));
  const missingSymbols = expectedSymbols.filter(
    (symbol) => !stagedTitles.has(symbol.title),
  );
  const extraTitles = stagedSymbols
    .filter((symbol) => !expectedTitles.has(symbol.title))
    .map((symbol) => symbol.title);
  // Pure coordinate drift (titles unchanged) has no symbol-level remedy to
  // name; leave the detail out so the diagnostic stays verdict + refresh.
  if (missingSymbols.length === 0 && extraTitles.length === 0) {
    return null;
  }
  // Without a base every gap is judged, as for a file the commit adds.
  const judgedMissing = (symbol: ExpectedManifestSymbol): boolean =>
    base === null ||
    base.changed.has(symbol.declaration) ||
    base.baseRecordTitles.has(symbol.title);
  const judgedExtra = (title: string): boolean =>
    base === null ||
    base.baseDeclarationTitles.has(title) ||
    !base.baseRecordTitles.has(title);
  const toEntry = (symbol: ExpectedManifestSymbol) => ({
    title: symbol.title,
    line: symbol.sourceLine ?? 0,
  });
  const missing = missingSymbols
    .filter(judgedMissing)
    .map(toEntry)
    .sort(byTitle);
  const extra = extraTitles.filter(judgedExtra).sort();
  const inheritedMissing = missingSymbols
    .filter((symbol) => !judgedMissing(symbol))
    .map(toEntry)
    .sort(byTitle);
  const inheritedExtra = extraTitles
    .filter((title) => !judgedExtra(title))
    .sort();
  // Keep the complete lists: the gate output names every symbol.
  return {
    path: sourcePath,
    expectedCount: expectedSymbols.length,
    coveredCount: expectedSymbols.length - missingSymbols.length,
    missing,
    extra,
    ...(base === null
      ? {}
      : {
          changedCount: expectedSymbols.filter((symbol) =>
            base.changed.has(symbol.declaration),
          ).length,
          inherited: { missing: inheritedMissing, extra: inheritedExtra },
        }),
  };
}

function detailBlocks(detail: KibiImpactSymbolsManifestFileDetail): boolean {
  return detail.missing.length > 0 || detail.extra.length > 0;
}

/**
 * Whether the staged symbol manifest covers the declarations of the staged
 * behavior files.
 *
 * Coordinates are derived from source and never committed, so the check
 * compares symbol titles only. With `baseSource`, a commit is judged only on
 * what it changes: every declaration it adds or changes needs a record, a
 * record it removes or a declaration it removes or renames leaves a gap, and
 * a record it adds or changes must name a declaration. Gaps it did not cause
 * are listed under `inherited` and never make the file stale. Without
 * `baseSource` every declaration of a staged file is judged.
 */
export function assessStagedSymbolsManifest(options: {
  symbolsManifestPath: string;
  sourceFiles: StagedFile[];
  stagedFiles: StagedFile[];
  readBaseFile?: (filePath: string) => string | null;
  analyzeSource?: (filePath: string, content: string) => SourceAnalysisResult;
  baseSource?: StagedSymbolsBaseSource;
}): StagedSymbolsManifestAssessment {
  const { sourceFiles, stagedFiles, symbolsManifestPath } = options;
  const paths = resolveRelativeManifestPaths(symbolsManifestPath);
  const readBaseFile = options.readBaseFile ?? readHeadFileContent;
  const stagedManifestFile = stagedFiles.find(
    (file) => file.path === paths.symbolsPath,
  );
  const stagedManifestRecords = readManifestRecords(
    stagedManifestFile
      ? () => stagedManifestFile.content
      : () => readBaseFile(paths.symbolsPath),
    paths.symbolsPath,
  );
  // An unstaged manifest is the base manifest.
  const baseManifestRecords =
    options.baseSource && stagedManifestFile
      ? readManifestRecords(
          () => readBaseFile(paths.symbolsPath),
          paths.symbolsPath,
        )
      : stagedManifestRecords;

  const coveredPaths: string[] = [];
  const uncoveredPaths: string[] = [];
  const symbolDetails: KibiImpactSymbolsManifestFileDetail[] = [];

  for (const sourceFile of sourceFiles) {
    const recordsByTitle = recordsByTitleForPath(
      stagedManifestRecords,
      sourceFile.path,
    );
    const manifestRecordsForFile = [...recordsByTitle.values()].flat();
    const coarseCovered =
      manifestRecordsForFile.length > 0 &&
      manifestRecordsForFile.every(isDocumentedCoarseRecord);
    if (coarseCovered) {
      continue;
    }

    // A coarse anchor stands in for its extracted declaration only when
    // every authored record with that title is explicitly coarse.
    const coarseTitles = coarseTitlesOf(recordsByTitle);
    const afterAnalysis = (options.analyzeSource ?? analyzeSourceText)(
      sourceFile.path,
      sourceFile.content ?? "",
    );
    const expectedSymbols = expectedSymbolsForAnalysis(
      sourceFile.path,
      afterAnalysis,
      new Set(recordsByTitle.keys()),
    ).filter((symbol) => !coarseTitles.has(symbol.title));
    const stagedSymbols = normalizeManifestSymbolsForSourceFile(
      stagedManifestRecords,
      sourceFile.path,
    );
    if (expectedSymbols.length === 0 && stagedSymbols.length === 0) {
      continue;
    }

    let base: BaseComparison | null = null;
    if (options.baseSource) {
      const before = options.baseSource(sourceFile);
      const basePath = sourceFile.oldPath ?? sourceFile.path;
      const baseRecords = recordsByTitleForPath(baseManifestRecords, basePath);
      const baseCoarseTitles = coarseTitlesOf(baseRecords);
      const baseRecordTitles = new Set(
        [...baseRecords.keys()].filter((title) => !baseCoarseTitles.has(title)),
      );
      const baseDeclarationTitles = new Set<string>();
      if (before && baseAnalysisUsable(before.analysis)) {
        for (const symbol of expectedSymbolsForAnalysis(
          basePath,
          before.analysis,
          new Set(baseRecords.keys()),
        ))
          baseDeclarationTitles.add(symbol.title);
      }
      base = {
        changed: declarationsInChange(before, {
          analysis: afterAnalysis,
          content: sourceFile.content ?? "",
        }),
        baseDeclarationTitles,
        baseRecordTitles,
      };
    }

    const detail = diffSymbolEvidence(
      sourceFile.path,
      expectedSymbols,
      stagedSymbols,
      base,
    );
    if (detail === null) {
      coveredPaths.push(sourceFile.path);
      continue;
    }
    symbolDetails.push(detail);
    if (detailBlocks(detail)) {
      uncoveredPaths.push(sourceFile.path);
    } else {
      coveredPaths.push(sourceFile.path);
    }
  }

  const fileDetails = symbolDetails.sort((left, right) =>
    left.path.localeCompare(right.path),
  );
  if (coveredPaths.length === 0 && uncoveredPaths.length === 0) {
    return { state: "not_required", sourcePaths: [], path: paths.symbolsPath };
  }
  const coveredSourcePaths = options.baseSource
    ? { coveredSourcePaths: uniqueSorted(coveredPaths) }
    : {};
  if (uncoveredPaths.length === 0) {
    return {
      state: "fresh",
      sourcePaths: uniqueSorted(coveredPaths),
      path: paths.symbolsPath,
      ...(fileDetails.length > 0 ? { fileDetails } : {}),
      ...coveredSourcePaths,
    };
  }
  return {
    state: "stale",
    sourcePaths: uniqueSorted(uncoveredPaths),
    path: paths.symbolsPath,
    fileDetails,
    ...coveredSourcePaths,
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

  const headManifestRecords = readManifestRecords(
    () => (options.readBaseFile ?? readHeadFileContent)(paths.symbolsPath),
    paths.symbolsPath,
  );
  const stagedManifestRecords = readManifestRecords(
    () => stagedManifestFile.content,
    paths.symbolsPath,
  );

  const sourcePaths = uniqueSorted(
    [...headManifestRecords, ...stagedManifestRecords]
      .map(manifestRecordSourcePath)
      .filter((sourcePath): sourcePath is string => sourcePath !== null),
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
