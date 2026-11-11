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

import * as fs from "node:fs";
import * as path from "node:path";
import { createMaintenanceSourceAnalysisService } from "../plugins/maintenance-source-analysis.js";
import type { CapabilityRegistry } from "../plugins/registry.js";
import type { SourceAnalysisService } from "../plugins/source-analysis-service.js";
import {
  type HostSourceAnalysisResult,
  createSourceAnalysisService,
} from "../plugins/source-analysis-service.js";
import {
  extensionLanguage,
  isTsJsSourcePath,
} from "../plugins/source-classification.js";
import { analysisObligation } from "../traceability/analysis-gate.js";
import { resolveWorkspaceSourceAbsolute } from "../utils/repo-relative-path.js";
import { matchDeclarationTitle } from "./symbol-title-match.js";
import {
  type ManifestSymbolEntry,
  createTsMorphSourceAnalysisProvider,
  enrichSymbolCoordinatesWithTsMorph,
} from "./symbols-ts.js";

export type { ManifestSymbolEntry };

export type SourceAnalysisMode = "parser" | "fallback";

export type SourceSymbolKind =
  | "function"
  | "class"
  | "method"
  | "property"
  | "accessor"
  | "interface"
  | "type"
  | "enum"
  | "variable"
  | "unknown";

export interface SourceSymbolAnalysis {
  name: string;
  kind: SourceSymbolKind;
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}

export interface SourceModuleAnalysis {
  title: string;
  language: string;
  analysisMode: SourceAnalysisMode;
  fallbackReason?: string;
}

export interface SourceAnalysisResult {
  sourceFile: string;
  language: string;
  providerId: string | null;
  module: SourceModuleAnalysis;
  symbols: SourceSymbolAnalysis[];
}

export interface SourceAnalysisProvider {
  id: string;
  supportsFile(filePath: string): boolean;
  analyzeText(filePath: string, content: string): SourceAnalysisResult;
}

export interface AnalyzeSourceTextOptions {
  providers?: SourceAnalysisProvider[];
  /** When set, prefer the host SourceAnalysisService over sync providers. */
  registry?: CapabilityRegistry;
}

interface EnrichSymbolCoordinatesDeps {
  sourceAnalysisService: SourceAnalysisService;
  enrichTsCoordinates: typeof enrichSymbolCoordinatesWithTsMorph;
  /** Coordinate-only sync may locate explicit declarations in decorated
   * Python. The coordinates stay a local cache, so no review authorizes them. */
  allowPythonDecoratorCoordinates?: boolean;
}

const DEFAULT_SOURCE_ANALYSIS_PROVIDERS: SourceAnalysisProvider[] = [
  createTsMorphSourceAnalysisProvider(),
];

export function analyzeSourceText(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
  deps?: Partial<EnrichSymbolCoordinatesDeps>,
): Promise<ManifestSymbolEntry[]>;
export function analyzeSourceText(
  filePath: string,
  content: string,
  options?: AnalyzeSourceTextOptions,
): SourceAnalysisResult;
// implements REQ-001
export function analyzeSourceText(
  filePathOrEntries: string | ManifestSymbolEntry[],
  contentOrWorkspaceRoot: string,
  optionsOrDeps?:
    | AnalyzeSourceTextOptions
    | Partial<EnrichSymbolCoordinatesDeps>,
): SourceAnalysisResult | Promise<ManifestSymbolEntry[]> {
  if (Array.isArray(filePathOrEntries)) {
    return enrichSymbolCoordinates(
      filePathOrEntries,
      contentOrWorkspaceRoot,
      optionsOrDeps as Partial<EnrichSymbolCoordinatesDeps> | undefined,
    );
  }

  // Sync path: ignore registry (async callers use analyzeSourceTextWithRegistry).
  const providers =
    (optionsOrDeps as AnalyzeSourceTextOptions | undefined)?.providers ??
    DEFAULT_SOURCE_ANALYSIS_PROVIDERS;

  for (const provider of providers) {
    if (!provider.supportsFile(filePathOrEntries)) continue;

    try {
      return provider.analyzeText(filePathOrEntries, contentOrWorkspaceRoot);
    } catch {
      return createFallbackAnalysis(filePathOrEntries, "provider_error");
    }
  }

  return createFallbackAnalysis(filePathOrEntries, "unsupported_language");
}

function toCoordinatorResult(
  result: HostSourceAnalysisResult,
): SourceAnalysisResult {
  return {
    sourceFile: result.sourceFile,
    language: result.language,
    providerId: result.providerId,
    module: {
      title: result.module.title,
      language: result.module.language,
      analysisMode: result.module.analysisMode,
      ...(result.module.fallbackReason
        ? { fallbackReason: result.module.fallbackReason }
        : {}),
    },
    symbols: result.symbols.map((symbol) => ({
      name: symbol.name,
      kind: symbol.kind,
      startLine: symbol.startLine,
      startColumn: symbol.startColumn,
      endLine: symbol.endLine,
      endColumn: symbol.endColumn,
    })),
  };
}

/**
 * Prefer the capability registry / SourceAnalysisService when available.
 * Falls back to the sync builtin ts-morph provider path on registry failure.
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export async function analyzeSourceTextWithRegistry(
  filePath: string,
  content: string,
  registry: CapabilityRegistry,
): Promise<SourceAnalysisResult> {
  try {
    const service = createSourceAnalysisService({ registry });
    return toCoordinatorResult(await service.analyzeText(filePath, content));
  } catch {
    return analyzeSourceText(filePath, content);
  }
}

/**
 * The uncovered ranges of a partial analysis whose gaps are local (a macro,
 * an include, a dynamic definition), or null when the gap affects the whole
 * file (syntax, parse, timeout, integrity, a diagnostic limit) or the provider
 * named no ranges. A symbol declared outside every local range was parsed in
 * full, so its span stays trustworthy.
 */
// implements REQ-source-analysis-v2
function localPartialRanges(
  analysis: Awaited<ReturnType<SourceAnalysisService["analyzeTextV2"]>>,
): readonly { startLine: number; endLine: number }[] | null {
  const codes = analysis.diagnostics.map((diagnostic) => diagnostic.code);
  if (codes.some((code) => /LIMIT/i.test(code))) return null;
  // rationale: only the blocked verdict is read. For a partial analysis it
  // depends on the ranges and codes alone; the side (anything but "before")
  // and the hunk list only choose between the non-blocking verdicts.
  // Stryker disable StringLiteral,ArrayDeclaration
  const obligation = analysisObligation(
    "after",
    {
      status: "partial",
      diagnosticCodes: codes,
      uncoveredRanges: analysis.uncoveredRanges,
    },
    [],
  );
  // Stryker restore StringLiteral,ArrayDeclaration
  return obligation.kind === "blocked" ? null : analysis.uncoveredRanges;
}

/** Diagnostics as `CODE (line N): message`, one per distinct message. */
function describeAnalysisDiagnostics(
  diagnostics: readonly {
    code: string;
    message: string;
    range?: { startLine: number };
  }[],
): string {
  return [
    ...new Set(
      diagnostics.map(
        (diagnostic) =>
          `${diagnostic.code}${diagnostic.range ? ` (line ${diagnostic.range.startLine})` : ""}: ${diagnostic.message}`,
      ),
    ),
  ].join("; ");
}

type SourceSpan = Readonly<{
  startLine: number;
  startColumn: number;
  endLine: number;
  endColumn: number;
}>;

function sameSpan(left: SourceSpan, right: SourceSpan): boolean {
  return (
    left.startLine === right.startLine &&
    left.startColumn === right.startColumn &&
    left.endLine === right.endLine &&
    left.endColumn === right.endColumn
  );
}

const DECORATOR_REASON = "decorator-may-alter-or-create-declarations";

/**
 * A partial tree-sitter Python analysis whose only gaps are decorators: each
 * diagnostic is a decorator-expansion notice whose range is one of the
 * uncovered ranges, and each uncovered range is a decorator range some
 * diagnostic names.
 */
function isCoordinateOnlyDecoratorPartial(
  analysis: Awaited<ReturnType<SourceAnalysisService["analyzeTextV2"]>>,
): boolean {
  if (
    analysis.status !== "partial" ||
    analysis.language !== "python" ||
    analysis.module.analysisMode !== "parser" ||
    analysis.providerId !== "kibi-plugin-treesitter.tree-sitter.v2" ||
    analysis.stamp?.pluginId !== "kibi-plugin-treesitter" ||
    analysis.diagnostics.length === 0 ||
    analysis.uncoveredRanges.length !== analysis.diagnostics.length
  )
    return false;
  return (
    analysis.diagnostics.every(
      ({ code, range }) =>
        code === "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE" &&
        range !== undefined &&
        analysis.uncoveredRanges.some((uncovered) =>
          sameSpan(uncovered, range),
        ),
    ) &&
    // The check above guarantees every diagnostic a range, and an uncovered
    // range matched with another reason fails here.
    analysis.uncoveredRanges.every(
      (uncovered) =>
        uncovered.reason === DECORATOR_REASON &&
        analysis.diagnostics.some(({ range }) =>
          sameSpan(uncovered, range as SourceSpan),
        ),
    )
  );
}

export async function enrichSymbolCoordinates(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
  deps?: Partial<EnrichSymbolCoordinatesDeps>,
): Promise<ManifestSymbolEntry[]> {
  // implements REQ-vscode-traceability
  const enrichTsCoordinates =
    deps?.enrichTsCoordinates ?? enrichSymbolCoordinatesWithTsMorph;
  const output = entries.map((entry) => withoutGeneratedCoordinates(entry));
  const service =
    deps?.sourceAnalysisService ??
    createMaintenanceSourceAnalysisService(workspaceRoot);
  const analyses = new Map<
    string,
    Awaited<ReturnType<SourceAnalysisService["analyzeTextV2"]>>
  >();

  const tsIndices: number[] = [];
  const tsEntries: ManifestSymbolEntry[] = [];

  for (let index = 0; index < output.length; index++) {
    const entry = output[index] as ManifestSymbolEntry;

    const resolved = resolveSourcePath(entry.sourceFile, workspaceRoot);
    if (!resolved || !fs.statSync(resolved.absolutePath).isFile()) {
      if (entry.sourceFile)
        output[index] = {
          ...entry,
          coordinateRefreshFailure: unreadableSourceReason(
            entry.sourceFile,
            workspaceRoot,
          ),
        };
      continue;
    }

    if (isTsJsSourcePath(resolved.absolutePath)) {
      tsIndices.push(index);
      tsEntries.push(entry);
      continue;
    }

    // rationale: only a Windows path.relative yields backslashes; on POSIX a
    // source path is normalized before it resolves, so none can reach here.
    // Stryker disable MethodExpression,StringLiteral
    const logicalPath = path
      .relative(workspaceRoot, resolved.absolutePath)
      .replaceAll("\\", "/");
    // Stryker restore MethodExpression,StringLiteral
    let analysis = analyses.get(logicalPath);
    const firstAnalysis = analysis === undefined;
    if (!analysis) {
      analysis = await service.analyzeTextV2(
        logicalPath,
        fs.readFileSync(resolved.absolutePath, "utf8"),
      );
      analyses.set(logicalPath, analysis);
    }
    const coordinateOnlyPartial =
      deps?.allowPythonDecoratorCoordinates === true &&
      isCoordinateOnlyDecoratorPartial(analysis);
    const localGaps =
      analysis.status === "partial" && !coordinateOnlyPartial
        ? localPartialRanges(analysis)
        : null;
    if (
      analysis.status === "failed" ||
      (analysis.status === "partial" && !coordinateOnlyPartial && !localGaps)
    ) {
      // A file the analyzer cannot read as a whole (a syntax error, which a
      // grammar may also report for valid code, a timeout, a changed grammar)
      // gives its own symbols no coordinates; every other file still refreshes.
      const reason = `Cannot refresh incomplete source analysis for ${logicalPath}: ${describeAnalysisDiagnostics(analysis.diagnostics)}`;
      if (firstAnalysis) console.warn(`[kibi] ${reason}`);
      output[index] = { ...entry, coordinateRefreshFailure: reason };
      continue;
    }
    if (localGaps && firstAnalysis) {
      console.warn(
        `[kibi] ${logicalPath}: source analysis is partial; symbols declared on ${localGaps.map((range) => (range.startLine === range.endLine ? `line ${range.startLine}` : `lines ${range.startLine}-${range.endLine}`)).join(", ")} keep no coordinates (${describeAnalysisDiagnostics(analysis.diagnostics)})`,
      );
    }
    if (coordinateOnlyPartial && firstAnalysis) {
      console.warn(
        `[kibi] Coordinate-only refresh for ${logicalPath}; source analysis remains partial: ${analysis.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`,
      );
    }
    if (analysis.status === "unsupported") {
      const pack = analysis.diagnostics.find((diagnostic) =>
        diagnostic.code.startsWith("TREESITTER_LANGUAGE_PACK_"),
      );
      const fileLevel = analysis.diagnostics.find(
        (diagnostic) => diagnostic.code === "source_file_level_only",
      );
      if (fileLevel && !pack && firstAnalysis)
        console.warn(
          `[kibi] ${logicalPath}: symbol coordinates are approximate (placed by text match). ${fileLevel.message}`,
        );
      if (pack && firstAnalysis)
        console.warn(
          `[kibi] ${logicalPath}: symbol coordinates are approximate until its grammar pack is installed. ${pack.message}`,
        );
      // Preserve the legacy coarse heuristic until the file-level migration;
      // it is never exposed as parser-backed symbol evidence.
      const placed = enrichWithRegexHeuristic(entry, resolved.absolutePath);
      output[index] =
        placed.sourceLine === undefined
          ? {
              ...placed,
              coordinateRefreshFailure: `no text match for '${entry.title}' in ${logicalPath}, which has no parser-backed declarations (${(pack ?? fileLevel)?.message ?? "no symbol extractor reads this file type"})`,
            }
          : placed;
      continue;
    }
    const declared = localGaps
      ? analysis.symbols.filter(
          (symbol) =>
            !localGaps.some(
              (range) =>
                range.startLine <= symbol.startLine &&
                symbol.startLine <= range.endLine,
            ),
        )
      : analysis.symbols;
    const match = matchDeclarationTitle(
      entry.title,
      declared,
      logicalPath,
      analysis.symbols,
    );
    if ("failure" in match) {
      output[index] = { ...entry, coordinateRefreshFailure: match.failure };
      continue;
    }
    const symbol = match.symbol;
    output[index] = {
      ...entry,
      sourceLine: symbol.startLine,
      sourceColumn: symbol.startColumn,
      sourceEndLine: symbol.endLine,
      sourceEndColumn: symbol.endColumn,
    };
  }

  if (tsEntries.length > 0) {
    const enrichedTs = await enrichTsCoordinates(tsEntries, workspaceRoot);
    for (const [i, target] of tsIndices.entries()) {
      const enriched = enrichedTs[i];
      if (enriched) output[target] = enriched;
    }
  }

  return output;
}

function withoutGeneratedCoordinates(
  entry: ManifestSymbolEntry,
): ManifestSymbolEntry {
  const generatedFields = new Set([
    "sourceLine",
    "sourceColumn",
    "sourceEndLine",
    "sourceEndColumn",
    "coordinatesGeneratedAt",
    "coordinateRefreshFailure",
  ]);
  return Object.fromEntries(
    Object.entries(entry).filter(([field]) => !generatedFields.has(field)),
  ) as ManifestSymbolEntry;
}

function enrichWithRegexHeuristic(
  entry: ManifestSymbolEntry,
  absolutePath: string,
): ManifestSymbolEntry {
  try {
    const content = fs.readFileSync(absolutePath, "utf8");
    const escaped = escapeRegex(entry.title);
    const pattern = new RegExp(`\\b${escaped}\\b`);
    const lines = content.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const match = pattern.exec(lines[i] as string);
      if (!match) continue;

      const sourceLine = i + 1;
      const sourceColumn = match.index;
      const sourceEndLine = sourceLine;
      const sourceEndColumn = sourceColumn + entry.title.length;

      return {
        ...entry,
        sourceLine,
        sourceColumn,
        sourceEndLine,
        sourceEndColumn,
        coordinatesGeneratedAt: new Date().toISOString(),
      };
    }

    return entry;
  } catch (error) {
    // readFileSync and String.prototype.replace only throw Error instances.
    console.warn(
      `[kibi] Failed regex coordinate heuristic for ${entry.id}: ${(error as Error).message}`,
    );
    return entry;
  }
}

function unreadableSourceReason(
  sourceFile: string,
  workspaceRoot: string,
): string {
  const absolute = resolveWorkspaceSourceAbsolute(workspaceRoot, sourceFile);
  if (absolute === null)
    return `${sourceFile} is not a file path inside the workspace`;
  if (!fs.existsSync(absolute)) return `${sourceFile} does not exist`;
  return `${sourceFile} is not a regular file`;
}

function resolveSourcePath(
  sourceFile: string | undefined,
  workspaceRoot: string,
): { absolutePath: string } | null {
  if (!sourceFile) return null;
  // existsSync is false for the null of a path outside the workspace.
  const absolutePath = resolveWorkspaceSourceAbsolute(
    workspaceRoot,
    sourceFile,
  ) as string;
  if (!fs.existsSync(absolutePath as string)) return null;
  return { absolutePath };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createFallbackAnalysis(
  filePath: string,
  fallbackReason: string,
): SourceAnalysisResult {
  const language = detectSourceLanguage(filePath);

  return {
    sourceFile: filePath,
    language,
    providerId: null,
    module: {
      title: inferModuleTitle(filePath),
      language,
      analysisMode: "fallback",
      fallbackReason,
    },
    symbols: [],
  };
}

function detectSourceLanguage(filePath: string): string {
  return extensionLanguage(filePath);
}

/** The file name without its extension (a dotfile has no extension). */
function inferModuleTitle(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}
