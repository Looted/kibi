import * as path from "node:path";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";
import { extractSymbolsFromStagedFile } from "../../traceability/symbol-extract.js";
import {
  createSemanticReviewDiagnostics,
  createSymbolGranularityDiagnostics,
} from "./diagnostics.js";
import { createSymbolQualityDiagnostics } from "./symbol-quality.js";
import {
  createImpactManifestLookup,
  readImpactManifestResults,
} from "./manifest.js";
import { collectSourceChanges, uniqueSorted } from "./source-changes.js";
import {
  buildNextActions,
  collectLinkedEntities,
  formatExtractedSymbols,
} from "./summaries.js";
import type {
  ChangedFileImpactOptions,
  ChangedFileImpactResult,
} from "./types.js";

export function analyzeChangedFileImpact(
  options: ChangedFileImpactOptions,
): ChangedFileImpactResult {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const sourceChanges = collectSourceChanges({ ...options, workspaceRoot });
  const sourceFiles = uniqueSorted(sourceChanges.map((change) => change.file));
  const manifestResults = readImpactManifestResults(workspaceRoot);
  const manifestLookup = createImpactManifestLookup(manifestResults);
  const symbolsByFile = new Map<string, ExtractedSymbol[]>();
  const sourceContentByFile = new Map<string, string>();

  for (const change of sourceChanges) {
    sourceContentByFile.set(change.file, change.content);
    symbolsByFile.set(
      change.file,
      extractSymbolsFromStagedFile(
        {
          path: change.file,
          status: change.status,
          hunkRanges: [...change.hunkRanges],
          content: change.content,
        },
        manifestLookup,
      ).filter((symbol) => symbol.hunkRanges.length > 0),
    );
  }

  const activeSourceFiles = new Set(sourceFiles);
  const activeManifestResults = manifestResults.filter(
    (result) =>
      result.sourceFile !== undefined &&
      activeSourceFiles.has(result.sourceFile),
  );
  const impactDiagnostics =
    options.includeImpactDiagnostics === false
      ? []
      : [
          ...createSymbolGranularityDiagnostics({
            manifestResults: activeManifestResults,
            symbolsByFile,
            sourceContentByFile,
            workspaceRoot,
          }),
          ...createSymbolQualityDiagnostics({
            manifestResults: activeManifestResults,
            symbolsByFile,
          }),
          ...createSemanticReviewDiagnostics({ symbolsByFile }),
        ];
  const maxDiagnostics = options.maxDiagnostics;
  const cappedDiagnostics =
    maxDiagnostics !== undefined && maxDiagnostics >= 0
      ? impactDiagnostics.slice(0, maxDiagnostics)
      : impactDiagnostics;

  return {
    impactDiagnostics: cappedDiagnostics,
    sourceFiles,
    extractedSymbols: formatExtractedSymbols(symbolsByFile),
    linkedEntities: collectLinkedEntities(
      symbolsByFile,
      manifestResults,
      activeSourceFiles,
    ),
    nextActions: buildNextActions(sourceFiles),
  };
}
