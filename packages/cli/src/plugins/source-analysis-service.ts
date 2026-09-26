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
import * as path from "node:path";
import {
  type PluginProviderStamp,
  SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS,
  SYMBOL_EXTRACTOR_V2_CAPABILITY_ID,
  type SourceAnalysisResult,
  type SourceAnalysisResultV2,
  type SymbolExtractorV1,
  type SymbolExtractorV2,
  toSourceAnalysisProvider,
  validateSourceAnalysisResultForPath,
  validateSourceAnalysisResultV2,
} from "kibi-plugin-sdk";

import type {
  CapabilityModeResolution,
  CapabilityRegistry,
} from "./registry.js";

const SOURCE_LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".c": "c",
  ".cc": "cpp",
  ".cjs": "javascript",
  ".cpp": "cpp",
  ".cs": "csharp",
  ".cts": "typescript",
  ".go": "go",
  ".h": "c-or-cpp",
  ".hpp": "cpp",
  ".java": "java",
  ".js": "javascript",
  ".jsx": "javascript",
  ".kt": "kotlin",
  ".mjs": "javascript",
  ".mts": "typescript",
  ".php": "php",
  ".py": "python",
  ".pyi": "python",
  ".sh": "shell",
  ".bash": "bash",
  ".tf": "hcl",
  ".hcl": "hcl",
  ".sql": "sql",
  ".html": "html",
  ".css": "css",
  ".json": "json",
  ".yaml": "yaml",
  ".yml": "yaml",
  ".rb": "ruby",
  ".rs": "rust",
  ".swift": "swift",
  ".ts": "typescript",
  ".tsx": "typescript",
};

// implements REQ-capability-plugin-activation-disclosure-v1
export type HostSourceAnalysisShadowComparison = Readonly<{
  pluginId: string;
  stamp: PluginProviderStamp;
  symbolCount: number;
  language: string;
  ok: boolean;
  error?: string;
}>;

// implements REQ-capability-plugin-activation-disclosure-v1
export type HostSourceAnalysisResult = SourceAnalysisResult &
  Readonly<{
    providerId: string | null;
    stamp: PluginProviderStamp | null;
    fallbackUsed: boolean;
    diagnostics: readonly string[];
    /** Shadow extractor comparisons; never affect canonical symbols. */
    shadowComparisons: readonly HostSourceAnalysisShadowComparison[];
  }>;

// implements REQ-capability-plugin-activation-disclosure-v1
export type SourceAnalysisServiceOptions = Readonly<{
  registry: CapabilityRegistry;
  /** Explicit v2 resolution; maintenance callers supply only approved providers. */
  resolveExtractorsV2?: () => Promise<
    CapabilityModeResolution<SymbolExtractorV2>
  >;
  /** Wall-clock deadline for async providers; CPU-bound plugins need their own terminable worker. */
  analysisTimeoutMs?: number;
  /** Host-verified package/asset fingerprint, never accepted from result data. */
  providerFingerprints?: Readonly<Record<string, string>>;
  /** Injectable resolution for tests. */
  resolveExtractors?: () => Promise<
    CapabilityModeResolution<SymbolExtractorV1>
  >;
}>;

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

// implements REQ-capability-plugin-activation-disclosure-v1
export function createConservativeFallbackAnalysis(
  filePath: string,
  fallbackReason: string,
): HostSourceAnalysisResult {
  const language = detectSourceLanguage(filePath);
  return {
    sourceFile: filePath,
    language,
    providerId: null,
    stamp: null,
    fallbackUsed: true,
    diagnostics: [`conservative fallback: ${fallbackReason}`],
    shadowComparisons: [],
    module: {
      title: inferModuleTitle(filePath),
      language,
      analysisMode: "fallback",
      fallbackReason,
    },
    symbols: [],
  };
}

function dedupeSymbols(
  symbols: SourceAnalysisResult["symbols"],
): SourceAnalysisResult["symbols"] {
  const seen = new Set<string>();
  const output: SourceAnalysisResult["symbols"][number][] = [];
  for (const symbol of symbols) {
    const key = [
      symbol.name,
      symbol.kind,
      symbol.startLine,
      symbol.startColumn,
      symbol.endLine,
      symbol.endColumn,
    ].join("\0");
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(symbol);
  }
  return output;
}

/**
 * Host-validated symbol analysis over registry providers with conservative
 * text fallback. Mode semantics:
 * - replace: first choice for claimed files; builtin fallback on failure
 * - augment: builtin first for supported files; additional extractors for
 *   unsupported files in activation order
 * - shadow: always run when configured/applicable; never canonical
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export class SourceAnalysisService {
  private readonly registry: CapabilityRegistry;
  private readonly options: SourceAnalysisServiceOptions;
  private readonly resolveExtractors: () => Promise<
    CapabilityModeResolution<SymbolExtractorV1>
  >;

  constructor(options: SourceAnalysisServiceOptions) {
    this.registry = options.registry;
    this.options = options;
    this.resolveExtractors =
      options.resolveExtractors ??
      (() => this.registry.resolveSymbolExtractors());
  }

  /** Analyze supplied snapshot bytes with explicit completeness and host provenance. */
  // implements REQ-capability-plugin-activation-disclosure-v1
  async analyzeTextV2(
    filePath: string,
    content: string,
  ): Promise<HostSourceAnalysisResultV2> {
    const input = { path: filePath, content };
    const inputFingerprint = createHash("sha256")
      .update(filePath)
      .update("\0")
      .update(content)
      .digest("hex");
    const fallback = (
      status: "unsupported" | "failed",
      code: string,
      message: string,
    ): HostSourceAnalysisResultV2 => ({
      contractVersion: SYMBOL_EXTRACTOR_V2_CAPABILITY_ID,
      status,
      sourceFile: filePath,
      language: detectSourceLanguage(filePath),
      module: {
        title: inferModuleTitle(filePath),
        language: detectSourceLanguage(filePath),
        analysisMode: "fallback",
        fallbackReason: code,
      },
      symbols: [],
      diagnostics: [{ code, message }],
      uncoveredRanges: [],
      providerId: null,
      stamp: null,
      inputFingerprint,
      providerFingerprint: null,
      shadowComparisons: [],
    });
    if (
      content.length > SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS ||
      Buffer.byteLength(content, "utf8") > 8 * 1024 * 1024
    )
      return fallback(
        "failed",
        "input_limit",
        `Source input exceeds the ${SOURCE_ANALYSIS_V2_MAX_INPUT_CODE_UNITS} UTF-16 code unit or 8 MiB UTF-8 analysis limit`,
      );
    let resolution: CapabilityModeResolution<SymbolExtractorV2>;
    try {
      resolution = await (this.options.resolveExtractorsV2?.() ??
        this.registry.resolveSymbolExtractorsV2());
    } catch (error) {
      return fallback("failed", "provider_resolution_failed", String(error));
    }
    const run = async (
      entry: CapabilityModeResolution<SymbolExtractorV2>["builtin"],
    ): Promise<HostSourceAnalysisResultV2 | null> => {
      try {
        if (!entry.capability.supports({ path: filePath })) return null;
        let timer: ReturnType<typeof setTimeout> | undefined;
        let raw: unknown;
        try {
          const requestedTimeout = this.options.analysisTimeoutMs ?? 10000;
          const timeout =
            Number.isFinite(requestedTimeout) && requestedTimeout > 0
              ? Math.min(requestedTimeout, 60000)
              : 10000;
          raw = await Promise.race([
            entry.capability.analyze(input),
            new Promise<never>((_, reject) => {
              timer = setTimeout(
                () => reject(new Error("Source analysis deadline exceeded")),
                timeout,
              );
            }),
          ]);
        } finally {
          if (timer !== undefined) clearTimeout(timer);
        }
        const validated = validateSourceAnalysisResultV2(raw, input);
        return {
          ...validated,
          providerId: entry.capability.id,
          stamp: entry.stamp,
          inputFingerprint,
          providerFingerprint:
            this.options.providerFingerprints?.[entry.pluginId] ??
            createHash("sha256")
              .update(
                `${entry.pluginId}\0${entry.pluginVersion}\0${entry.stamp.capability}`,
              )
              .digest("hex"),
          shadowComparisons: [],
        };
      } catch (error) {
        return {
          ...fallback(
            "failed",
            "provider_failed",
            `Extractor '${entry.capability.id}' failed: ${String(error)}`,
          ),
          providerId: entry.capability.id,
          stamp: entry.stamp,
        };
      }
    };
    const entries = resolution.replace
      ? [resolution.replace, resolution.builtin, ...resolution.augment]
      : [resolution.builtin, ...resolution.augment];
    let canonical: HostSourceAnalysisResultV2 | null = null;
    for (const entry of entries) {
      const result = await run(entry);
      if (result === null) continue;
      // A claimed file's incomplete/failed result is authoritative uncertainty.
      // Never turn a required provider failure into empty symbols or success.
      canonical = result;
      break;
    }
    canonical ??= fallback(
      "unsupported",
      "unsupported_language",
      "No configured source analyzer claims this file; file-level review remains required.",
    );
    const shadowComparisons: HostSourceAnalysisShadowComparison[] = [];
    for (const entry of resolution.shadow) {
      const result = await run(entry);
      if (!result) continue;
      shadowComparisons.push({
        pluginId: entry.pluginId,
        stamp: entry.stamp,
        symbolCount: result.symbols.length,
        language: result.language,
        ok: result.status === "ok",
        ...(result.status !== "ok"
          ? { error: result.diagnostics.map((d) => d.message).join("; ") }
          : {}),
      });
    }
    return { ...canonical, shadowComparisons };
  }

  async analyzeText(
    filePath: string,
    content: string,
  ): Promise<HostSourceAnalysisResult> {
    const resolution = await this.resolveExtractors();
    const diagnostics: string[] = [];

    const tryAnalyze = (
      extractor: SymbolExtractorV1,
      stamp: PluginProviderStamp,
    ): HostSourceAnalysisResult | null => {
      const provider = toSourceAnalysisProvider(extractor);
      if (!provider.supportsFile(filePath)) return null;
      try {
        const raw = provider.analyzeText(filePath, content);
        const validated = validateSourceAnalysisResultForPath(raw, filePath);
        return {
          ...validated,
          symbols: dedupeSymbols(validated.symbols),
          providerId: extractor.id,
          stamp,
          fallbackUsed: false,
          diagnostics,
          shadowComparisons: [],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        diagnostics.push(`extractor '${extractor.id}' failed: ${message}`);
        return null;
      }
    };

    const runShadow = (
      canonical: HostSourceAnalysisResult,
    ): HostSourceAnalysisResult => {
      if (resolution.shadow.length === 0) {
        return { ...canonical, diagnostics: [...diagnostics] };
      }
      const shadowComparisons: HostSourceAnalysisShadowComparison[] = [];
      for (const entry of resolution.shadow) {
        const provider = toSourceAnalysisProvider(entry.capability);
        if (!provider.supportsFile(filePath)) continue;
        try {
          const validated = validateSourceAnalysisResultForPath(
            provider.analyzeText(filePath, content),
            filePath,
          );
          shadowComparisons.push({
            pluginId: entry.pluginId,
            stamp: entry.stamp,
            symbolCount: validated.symbols.length,
            language: validated.language,
            ok: true,
          });
          diagnostics.push(
            `shadow extractor '${entry.pluginId}' produced ${validated.symbols.length} non-canonical symbol(s)`,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          shadowComparisons.push({
            pluginId: entry.pluginId,
            stamp: entry.stamp,
            symbolCount: 0,
            language: detectSourceLanguage(filePath),
            ok: false,
            error: message,
          });
          diagnostics.push(
            `shadow extractor '${entry.pluginId}' failed: ${message}`,
          );
        }
      }
      return {
        ...canonical,
        diagnostics: [...diagnostics],
        shadowComparisons,
      };
    };

    let canonical: HostSourceAnalysisResult | null = null;

    if (resolution.replace) {
      const replaced = tryAnalyze(
        resolution.replace.capability,
        resolution.replace.stamp,
      );
      if (replaced) {
        canonical = replaced;
      } else {
        diagnostics.push(
          `replace extractor '${resolution.replace.pluginId}' did not claim or failed; trying builtin`,
        );
        const builtin = tryAnalyze(resolution.builtin.capability, {
          ...resolution.builtin.stamp,
          fallbackUsed: true,
        });
        if (builtin) {
          canonical = { ...builtin, fallbackUsed: true };
        } else {
          canonical = createConservativeFallbackAnalysis(
            filePath,
            "provider_error",
          );
        }
      }
    } else {
      const builtin = tryAnalyze(
        resolution.builtin.capability,
        resolution.builtin.stamp,
      );
      if (builtin) {
        canonical = builtin;
      } else {
        for (const entry of resolution.augment) {
          const analyzed = tryAnalyze(entry.capability, entry.stamp);
          if (analyzed) {
            canonical = analyzed;
            break;
          }
        }
        if (!canonical) {
          canonical = createConservativeFallbackAnalysis(
            filePath,
            diagnostics.length > 0 ? "provider_error" : "unsupported_language",
          );
        }
      }
    }

    return runShadow(canonical);
  }
}

/**
 * Analyze using a pre-resolved extractor mode set (useful for tests).
 */
// implements REQ-capability-plugin-activation-disclosure-v1
export async function analyzeWithResolution(
  resolution: CapabilityModeResolution<SymbolExtractorV1>,
  filePath: string,
  content: string,
): Promise<HostSourceAnalysisResult> {
  const service = new SourceAnalysisService({
    registry: {
      resolveSymbolExtractors: async () => resolution,
    } as CapabilityRegistry,
    resolveExtractors: async () => resolution,
  });
  return service.analyzeText(filePath, content);
}

// implements REQ-capability-plugin-activation-disclosure-v1
export function createSourceAnalysisService(
  options: SourceAnalysisServiceOptions,
): SourceAnalysisService {
  return new SourceAnalysisService(options);
}

/** V2 results preserve failure/completeness; provenance is always assigned by the host. */
// implements REQ-capability-plugin-activation-disclosure-v1
export type HostSourceAnalysisResultV2 = SourceAnalysisResultV2 &
  Readonly<{
    providerId: string | null;
    stamp: PluginProviderStamp | null;
    inputFingerprint: string;
    providerFingerprint: string | null;
    shadowComparisons: readonly HostSourceAnalysisShadowComparison[];
  }>;
