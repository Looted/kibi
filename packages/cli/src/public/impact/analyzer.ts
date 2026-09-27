import * as path from "node:path";
import {
  createMaintenanceSourceAnalysisService,
  readSnapshotSourceConfig,
} from "../../plugins/maintenance-source-analysis.js";
import { analyzeSourceChanges } from "../../plugins/source-change-analysis.js";
import { captureStagedSnapshot } from "../../traceability/git-change-snapshot.js";
import { readSnapshotKnowledge } from "../../traceability/snapshot-knowledge.js";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";
import { extractSymbolsFromStagedFileAsync } from "../../traceability/symbol-extract.js";
import {
  createSemanticReviewDiagnostics,
  createSymbolGranularityDiagnostics,
} from "./diagnostics.js";
import {
  createImpactManifestLookup,
  readImpactManifestResults,
} from "./manifest.js";
import { normalizeSourceFile } from "./source-changes.js";
import { collectSourceChanges, uniqueSorted } from "./source-changes.js";
import {
  buildNextActions,
  collectLinkedEntities,
  formatExtractedSymbols,
} from "./summaries.js";
import { createSymbolQualityDiagnostics } from "./symbol-quality.js";
import type {
  ChangedFileImpactOptions,
  ChangedFileImpactResult,
} from "./types.js";

export async function analyzeChangedFileImpact(
  options: ChangedFileImpactOptions,
): Promise<ChangedFileImpactResult> {
  const workspaceRoot = path.resolve(options.workspaceRoot);
  const snapshot = options.staged
    ? captureStagedSnapshot(workspaceRoot)
    : undefined;
  const filter = new Set(
    (options.sourceFiles ?? []).map((file) =>
      normalizeSourceFile(workspaceRoot, file),
    ),
  );
  const snapshotAnalysisInventory = snapshot
    ? snapshot.inventory.filter(
        (file) => filter.size === 0 || filter.has(file.path),
      )
    : undefined;
  const snapshotSourceInventory = snapshot
    ? snapshot.inventory.filter(
        (file) =>
          file.analysisDepth !== "metadata" &&
          !file.skipReason &&
          file.content !== undefined &&
          (filter.size === 0 || filter.has(file.path)),
      )
    : undefined;
  const sourceChanges = snapshot
    ? (snapshotSourceInventory ?? []).map((file) => ({
        file: file.path,
        status: file.status,
        hunkRanges: file.hunkRanges,
        content: file.content ?? "",
      }))
    : collectSourceChanges({ ...options, workspaceRoot });
  const service = createMaintenanceSourceAnalysisService(
    workspaceRoot,
    snapshot ? readSnapshotSourceConfig(snapshot) : undefined,
  );
  const analyses = snapshot
    ? await analyzeSourceChanges(snapshotAnalysisInventory ?? [], service)
    : undefined;
  for (const change of analyses?.values() ?? [])
    for (const side of [change.before, change.after]) {
      if (side?.status === "partial" || side?.status === "failed")
        throw new Error(
          `Incomplete source analysis for ${change.path}: ${side.diagnostics.map((item) => item.message).join("; ")}`,
        );
    }
  const sourceFiles = uniqueSorted(
    snapshot
      ? snapshot.inventory
          .filter(
            (file) =>
              file.analysisDepth !== "metadata" &&
              (filter.size === 0 || filter.has(file.path)),
          )
          .map((file) => file.path)
      : sourceChanges.map((change) => change.file),
  );
  const manifestResults = snapshot
    ? readSnapshotKnowledge(
        snapshot.readGit,
        snapshot.headTree,
        snapshot.readBlobs,
      ).filter((result) => result.entity.type === "symbol")
    : readImpactManifestResults(workspaceRoot);
  const manifestLookup = createImpactManifestLookup(manifestResults);
  const symbolsByFile = new Map<string, ExtractedSymbol[]>();
  const sourceContentByFile = new Map<string, string>();
  const sourceSymbolsByFile = new Map<string, ExtractedSymbol[]>();

  for (const change of sourceChanges) {
    sourceContentByFile.set(change.file, change.content);
    const analysis =
      analyses?.get(change.file)?.after ??
      (await service.analyzeTextV2(change.file, change.content));
    const extracted = await extractSymbolsFromStagedFileAsync(
      {
        path: change.file,
        status: change.status,
        hunkRanges: [...change.hunkRanges],
        content: change.content,
      },
      manifestLookup,
      { analyzeText: async () => analysis },
    );
    const allSymbols = await extractSymbolsFromStagedFileAsync(
      {
        path: change.file,
        status: change.status,
        content: change.content,
        hunkRanges: [
          { start: 1, end: Math.max(1, change.content.split("\n").length) },
        ],
      },
      manifestLookup,
      { analyzeText: async () => analysis },
    );
    sourceSymbolsByFile.set(change.file, allSymbols);
    symbolsByFile.set(
      change.file,
      extracted.filter((symbol) => symbol.hunkRanges.length > 0),
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
            sourceSymbolsByFile,
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

  snapshot?.assertUnchanged();
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
