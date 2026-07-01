import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import type { ExtractionResult } from "../../extractors/markdown.js";
import type { KibiImpactDiagnostic } from "../../traceability/staged-diagnostics.js";
import {
  type ExtractedSymbol,
  extractSymbolsFromStagedFile,
} from "../../traceability/symbol-extract.js";
import {
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
} from "../symbol-granularity.js";
import type {
  QualityDiagnostic,
  SemanticReviewDiagnosticsOptions,
  SymbolGranularityDiagnosticsOptions,
} from "./types.js";

function isNarrowerSymbol(
  manifestSymbolName: string,
  candidate: ExtractedSymbol,
  sourceSymbols: readonly ExtractedSymbol[],
): boolean {
  if (candidate.name === manifestSymbolName) return false;
  if (candidate.name.startsWith(`${manifestSymbolName}.`)) return true;
  return !sourceSymbols.some((symbol) => symbol.name === manifestSymbolName);
}

function hasTraceabilityRelationship(result: ExtractionResult): boolean {
  return result.relationships.some((relationship) =>
    isTraceabilityRelationshipType(relationship.type),
  );
}

function hasValidGranularityReason(result: ExtractionResult): boolean {
  return isAllowedGranularityReason(result.entity.granularity_reason);
}

function readSourceSymbols(
  sourceFile: string,
  sourceContentByFile: ReadonlyMap<string, string> | undefined,
  workspaceRoot: string,
): readonly ExtractedSymbol[] {
  const stagedContent = sourceContentByFile?.get(sourceFile);
  if (stagedContent !== undefined) {
    return extractSymbolsFromStagedFile({
      path: sourceFile,
      status: "M",
      hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
      content: stagedContent,
    });
  }

  const absolutePath = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  if (!existsSync(absolutePath)) return [];

  return extractSymbolsFromStagedFile({
    path: sourceFile,
    status: "M",
    hunkRanges: [{ start: 1, end: Number.MAX_SAFE_INTEGER }],
    content: readFileSync(absolutePath, "utf8"),
  });
}

function getGranularSymbolsForSourceFile(
  sourceFile: string,
  options: SymbolGranularityDiagnosticsOptions,
): readonly ExtractedSymbol[] {
  return (
    options.symbolsByFile.get(sourceFile) ??
    readSourceSymbols(
      sourceFile,
      options.sourceContentByFile,
      options.workspaceRoot ?? process.cwd(),
    )
  );
}

function formatRelationshipTargets(symbol: ExtractedSymbol): string {
  const targets = [
    ...new Set(
      (symbol.relationships ?? [])
        .filter((relationship) =>
          isTraceabilityRelationshipType(relationship.type),
        )
        .map((relationship) => relationship.to),
    ),
  ].sort();

  return targets.length > 0 ? targets.join(", ") : "linked requirements/tests";
}

function isChangedBehavioralReviewCandidate(symbol: ExtractedSymbol): boolean {
  if (symbol.role !== "behavioral") return false;
  if (symbol.kind === "class") return false;
  return symbol.hunkRanges.length > 0;
}

export function createSymbolGranularityDiagnostics(
  options: SymbolGranularityDiagnosticsOptions,
): KibiImpactDiagnostic[] {
  const diagnostics: KibiImpactDiagnostic[] = [];

  for (const result of options.manifestResults) {
    if (
      options.activeEntityIds !== undefined &&
      !options.activeEntityIds.has(result.entity.id)
    ) {
      continue;
    }
    if (!result.sourceFile) continue;
    if (!hasTraceabilityRelationship(result)) continue;
    if (hasValidGranularityReason(result)) continue;

    const granularSymbols = getGranularSymbolsForSourceFile(
      result.sourceFile,
      options,
    );
    const narrowerSymbols = granularSymbols.filter((symbol) =>
      isNarrowerSymbol(result.entity.title, symbol, granularSymbols),
    );
    if (narrowerSymbols.length === 0) continue;

    const behavioralNames = getBehavioralSymbolNames(narrowerSymbols);
    if (behavioralNames.length === 0) continue;

    const nonBehavioralNames = getNonBehavioralSymbolNames(narrowerSymbols);
    const ignoredSymbolsSuggestion =
      nonBehavioralNames.length > 0
        ? ` Non-behavioral symbols ignored for this decision: ${nonBehavioralNames.join(
            ", ",
          )}.`
        : "";

    diagnostics.push({
      id: "symbol_granularity_violation",
      severity: "error",
      blocking: true,
      category: "symbol",
      files: [result.entity.source, result.sourceFile],
      docs: ["docs/symbol-traceability-taxonomy.md"],
      message: `Symbol ${result.entity.id} links ${result.sourceFile} coarsely while granular symbols are available (behavioral only): ${behavioralNames.join(", ")}`,
      suggestion: `Move ownership/coverage/test relationships to the narrow behavioral symbol, add a manifest behavioral anchor, or add granularity_reason with config-artifact, module-level-behavior, extractor-miss, or legacy-link when the coarse symbol is intentional.${ignoredSymbolsSuggestion}`,
    });
  }

  return diagnostics;
}

export function createSemanticReviewDiagnostics(
  options: SemanticReviewDiagnosticsOptions,
): KibiImpactDiagnostic[] {
  const diagnostics: KibiImpactDiagnostic[] = [];

  for (const symbols of options.symbolsByFile.values()) {
    for (const symbol of symbols) {
      if (!isChangedBehavioralReviewCandidate(symbol)) continue;

      const linkedTargets = formatRelationshipTargets(symbol);
      diagnostics.push({
        id: "symbol_semantic_review_needed",
        severity: "warning",
        blocking: false,
        category: "symbol",
        files: [symbol.location.file],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message: `Changed behavioral symbol ${symbol.name} needs semantic review against linked Kibi coverage: ${linkedTargets}`,
        suggestion: `Use kb_search and kb_query for ${symbol.location.file}, then verify that ${linkedTargets} actually describe and test the changed behavior or UI copy. Update Kibi links or requirements/tests while the edit context is fresh.`,
      });
    }
  }

  return diagnostics;
}

export function hasBlockingImpactDiagnostics(
  diagnostics: readonly KibiImpactDiagnostic[],
): boolean {
  return hasBlockingQualityDiagnostics(diagnostics);
}

export function hasBlockingQualityDiagnostics(
  diagnostics: readonly QualityDiagnostic[],
): boolean {
  return diagnostics.some(
    (diagnostic) => diagnostic.blocking || diagnostic.severity === "error",
  );
}
