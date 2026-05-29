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
}

interface EnrichSymbolCoordinatesDeps {
  enrichTsCoordinates: typeof enrichSymbolCoordinatesWithTsMorph;
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

export async function enrichSymbolCoordinates(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
  deps?: Partial<EnrichSymbolCoordinatesDeps>,
): Promise<ManifestSymbolEntry[]> {
  // implements REQ-vscode-traceability
  const enrichTsCoordinates =
    deps?.enrichTsCoordinates ?? enrichSymbolCoordinatesWithTsMorph;
  const output = entries.map((entry) => ({ ...entry }));

  const tsIndices: number[] = [];
  const tsEntries: ManifestSymbolEntry[] = [];

  for (let index = 0; index < output.length; index++) {
    const entry = output[index];
    if (!entry) continue;

    const resolved = resolveSourcePath(entry.sourceFile, workspaceRoot);
    if (!resolved) continue;

    const ext = path.extname(resolved.absolutePath).toLowerCase();
    if (TS_JS_EXTENSIONS.has(ext)) {
      tsIndices.push(index);
      tsEntries.push(entry);
      continue;
    }

    output[index] = enrichWithRegexHeuristic(entry, resolved.absolutePath);
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
