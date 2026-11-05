import * as path from "node:path";
import {
  createMaintenanceSourceAnalysisService,
  readSnapshotSourceConfig,
} from "../../plugins/maintenance-source-analysis.js";
import {
  type SourceChangeAnalysis,
  analyzeSourceChanges,
  assertSourceAnalysisGate,
} from "../../plugins/source-change-analysis.js";
import { captureStagedSnapshot } from "../../traceability/git-change-snapshot.js";
import { readSnapshotKnowledge } from "../../traceability/snapshot-knowledge.js";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";
import { extractSymbolsFromStagedFileAsync } from "../../traceability/symbol-extract.js";
import { isTraceabilityRelationshipType } from "../symbol-granularity.js";
import {
  createSemanticReviewDiagnostics,
  createSymbolGranularityDiagnostics,
} from "./diagnostics.js";
import {
  createImpactManifestLookup,
  readImpactManifestResults,
} from "./manifest.js";
import {
  createRequirementStatementDiagnostics,
  readWorkspaceRequirement,
  workspaceFileChanged,
} from "./requirement-statements.js";
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
import { createUnownedFileDiagnostics } from "./unowned-files.js";

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
  const service = createMaintenanceSourceAnalysisService(
    workspaceRoot,
    snapshot ? readSnapshotSourceConfig(snapshot) : undefined,
  );
  const snapshotInventory = snapshot?.inventory.filter(
    (file) => filter.size === 0 || filter.has(file.path),
  );
  const analyses = snapshotInventory
    ? await analyzeSourceChanges(snapshotInventory, service)
    : undefined;
  if (snapshotInventory)
    assertSourceAnalysisGate(
      snapshotInventory,
      analyses as Map<string, SourceChangeAnalysis>,
    );
  // Metadata (knowledge documents, manifests) is not source.
  const snapshotSources = snapshotInventory?.filter(
    (file) => file.analysisDepth !== "metadata",
  );
  const sourceChanges = snapshotSources
    ? snapshotSources.flatMap((file) =>
        // A skipped or deleted file has no text to read symbols from.
        file.content === undefined
          ? []
          : [
              {
                file: file.path,
                status: file.status,
                hunkRanges: file.hunkRanges,
                content: file.content,
              },
            ],
      )
    : collectSourceChanges({ ...options, workspaceRoot });
  const sourceFiles = uniqueSorted(
    (
      snapshotSources ?? sourceChanges.map((change) => ({ path: change.file }))
    ).map((file) => file.path),
  );
  const snapshotKnowledge = snapshot
    ? readSnapshotKnowledge(
        snapshot.readGit,
        snapshot.headTree,
        snapshot.readBlobs,
      )
    : undefined;
  // The snapshot's requirements and other documents come along: none has a
  // source file, so none is ever active, linked or matched to a symbol.
  const manifestResults =
    snapshotKnowledge ?? readImpactManifestResults(workspaceRoot);
  const manifestLookup = createImpactManifestLookup(manifestResults);
  const symbolsByFile = new Map<string, ExtractedSymbol[]>();
  const sourceSymbolsByFile = new Map<string, ExtractedSymbol[]>();

  for (const change of sourceChanges) {
    // Every staged source change was analyzed for the gate.
    // rationale: analyzing the same captured text again gives the same result
    // Stryker disable next-line ConditionalExpression
    const analysis = analyses
      ? (analyses.get(change.file) as SourceChangeAnalysis).after
      : await service.analyzeTextV2(change.file, change.content);
    // rationale: without analyzeText the built-in TypeScript reader is used,
    // which reads every language this service reads without a plugin alike
    // Stryker disable next-line ObjectLiteral
    const analyzer = { analyzeText: async () => analysis };
    const extracted = await extractSymbolsFromStagedFileAsync(
      {
        path: change.file,
        status: change.status,
        hunkRanges: [...change.hunkRanges],
        content: change.content,
      },
      manifestLookup,
      analyzer,
    );
    // With no hunks every declaration of the file is kept.
    const allSymbols = await extractSymbolsFromStagedFileAsync(
      {
        path: change.file,
        status: change.status,
        content: change.content,
        hunkRanges: [],
      },
      manifestLookup,
      analyzer,
    );
    sourceSymbolsByFile.set(change.file, allSymbols);
    symbolsByFile.set(
      change.file,
      extracted.filter((symbol) => symbol.hunkRanges.length > 0),
    );
  }

  const activeSourceFiles = new Set(sourceFiles);
  // has(undefined) is false, so a result without a source file is inactive.
  const activeManifestResults = manifestResults.filter((result) =>
    activeSourceFiles.has(result.sourceFile as string),
  );
  const linkedSourceFiles = new Set(
    manifestResults
      .filter((result) =>
        result.relationships.some((relationship) =>
          isTraceabilityRelationshipType(relationship.type),
        ),
      )
      // A missing source file adds undefined, which names no file.
      .map((result) => result.sourceFile as string),
  );
  const impactDiagnostics =
    options.includeImpactDiagnostics === false
      ? []
      : [
          // Named files first: a file without links is the answer a scoped
          // check most easily misreads as "no rule applies".
          ...createUnownedFileDiagnostics({
            workspaceRoot,
            requestedFiles: [...filter],
            linkedSourceFiles,
          }),
          // What the changed code is meant to do, quoted, before the
          // structural findings: "no violations" never compared it.
          ...createRequirementStatementDiagnostics({
            workspaceRoot,
            symbolsByFile,
            readRequirement: (id) =>
              snapshotKnowledge
                ? snapshotKnowledge.find((result) => result.entity.id === id)
                    ?.entity
                : readWorkspaceRequirement(workspaceRoot, id),
            requirementChanged: (requirement) =>
              snapshot
                ? snapshot.inventory.some(
                    (file) => file.path === requirement.source,
                  )
                : workspaceFileChanged(workspaceRoot, requirement.source),
          }),
          ...createSymbolGranularityDiagnostics({
            manifestResults: activeManifestResults,
            symbolsByFile,
            sourceSymbolsByFile,
          }),
          ...createSymbolQualityDiagnostics({
            manifestResults: activeManifestResults,
            symbolsByFile,
          }),
          ...createSemanticReviewDiagnostics({
            symbolsByFile,
            // Every symbol here is in an active file.
            linkedSourceFiles,
          }),
        ];
  const maxDiagnostics = options.maxDiagnostics as number;
  // undefined >= 0 is false, so no cap leaves every diagnostic.
  const cappedDiagnostics =
    maxDiagnostics >= 0
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
