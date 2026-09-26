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
  type ManifestSymbolEntry,
  createTsMorphSourceAnalysisProvider,
  enrichSymbolCoordinatesWithTsMorph,
} from "./symbols-ts.js";

const TS_JS_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

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
  directiveText?: string;
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
  /** Coordinate-only sync may locate explicit declarations in decorated Python.
   * Completeness-sensitive callers, including staged checks, keep this disabled. */
  allowPythonDecoratorCoordinates?: boolean;
}

const SOURCE_LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".c": "c",
  ".cc": "cpp",
  ".cjs": "javascript",
  ".cpp": "cpp",
  ".cs": "csharp",
  ".cts": "typescript",
  ".go": "go",
  ".h": "c",
  ".hpp": "cpp",
  ".java": "java",
  ".js": "javascript",
  ".jsx": "javascript",
  ".kt": "kotlin",
  ".mjs": "javascript",
  ".mts": "typescript",
  ".php": "php",
  ".py": "python",
  ".rb": "ruby",
  ".rs": "rust",
  ".swift": "swift",
  ".ts": "typescript",
  ".tsx": "typescript",
};

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
      ...(symbol.directiveText ? { directiveText: symbol.directiveText } : {}),
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
    analysis.diagnostics.every((diagnostic) => {
      if (
        diagnostic.code !== "TREESITTER_DECORATOR_EXPANSION_UNAVAILABLE" ||
        diagnostic.range === undefined
      )
        return false;
      const range = diagnostic.range;
      return analysis.uncoveredRanges.some(
        (uncovered) =>
          uncovered.reason === "decorator-may-alter-or-create-declarations" &&
          uncovered.startLine === range.startLine &&
          uncovered.startColumn === range.startColumn &&
          uncovered.endLine === range.endLine &&
          uncovered.endColumn === range.endColumn,
      );
    }) &&
    analysis.uncoveredRanges.every(
      (uncovered) =>
        uncovered.reason === "decorator-may-alter-or-create-declarations" &&
        analysis.diagnostics.some(
          ({ range }) =>
            range !== undefined &&
            uncovered.startLine === range.startLine &&
            uncovered.startColumn === range.startColumn &&
            uncovered.endLine === range.endLine &&
            uncovered.endColumn === range.endColumn,
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
    const entry = output[index];
    if (!entry) continue;

    const resolved = resolveSourcePath(entry.sourceFile, workspaceRoot);
    if (!resolved || !fs.statSync(resolved.absolutePath).isFile()) continue;

    const ext = path.extname(resolved.absolutePath).toLowerCase();
    if (TS_JS_EXTENSIONS.has(ext)) {
      tsIndices.push(index);
      tsEntries.push(entry);
      continue;
    }

    const logicalPath = path
      .relative(workspaceRoot, resolved.absolutePath)
      .replaceAll("\\", "/");
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
    if (
      analysis.status === "failed" ||
      (analysis.status === "partial" && !coordinateOnlyPartial)
    )
      throw new Error(
        `Cannot refresh incomplete source analysis for ${logicalPath}: ${analysis.diagnostics.map((d) => d.message).join("; ")}`,
      );
    if (coordinateOnlyPartial && firstAnalysis) {
      console.warn(
        `[kibi] Coordinate-only refresh for ${logicalPath}; source analysis remains partial: ${analysis.diagnostics.map((diagnostic) => diagnostic.message).join("; ")}`,
      );
    }
    if (analysis.status === "unsupported") {
      // Preserve the legacy coarse heuristic until the file-level migration;
      // it is never exposed as parser-backed symbol evidence.
      output[index] = enrichWithRegexHeuristic(entry, resolved.absolutePath);
      continue;
    }
    const exact = analysis.symbols.filter(
      (symbol) => (symbol.qualifiedName ?? symbol.name) === entry.title,
    );
    const candidates = exact.length
      ? exact
      : analysis.symbols.filter((symbol) => symbol.name === entry.title);
    if (candidates.length !== 1) continue;
    const symbol = candidates[0];
    if (!symbol) continue;
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
    for (let i = 0; i < tsIndices.length; i++) {
      const target = tsIndices[i];
      const enriched = enrichedTs[i];
      if (target === undefined || !enriched) continue;
      output[target] = enriched;
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
      const line = lines[i] ?? "";
      const match = pattern.exec(line);
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
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[kibi] Failed regex coordinate heuristic for ${entry.id}: ${message}`,
    );
    return entry;
  }
}

function resolveSourcePath(
  sourceFile: string | undefined,
  workspaceRoot: string,
): { absolutePath: string } | null {
  if (!sourceFile) return null;
  const absolutePath = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  if (!fs.existsSync(absolutePath)) return null;
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
  return (
    SOURCE_LANGUAGE_EXTENSIONS[path.extname(filePath).toLowerCase()] ??
    "unknown"
  );
}

function inferModuleTitle(filePath: string): string {
  const extension = path.extname(filePath);
  const basename = path.basename(filePath, extension);
  return basename.length > 0 ? basename : path.basename(filePath);
}
