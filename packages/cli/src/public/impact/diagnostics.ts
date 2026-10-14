import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import type { ExtractionResult } from "../../extractors/markdown.js";
import type { KibiImpactDiagnostic } from "../../traceability/staged-diagnostics.js";
import {
  type ExtractedSymbol,
  extractSymbolsFromStagedFile,
} from "../../traceability/symbol-extract.js";
import {
  ALLOWED_GRANULARITY_REASONS_PROSE,
  getBehavioralSymbolNames,
  getNonBehavioralSymbolNames,
  isAllowedGranularityReason,
  isTraceabilityRelationshipType,
  narrowerSymbols,
} from "../symbol-granularity.js";
import type {
  QualityDiagnostic,
  SemanticReviewDiagnosticsOptions,
  SymbolGranularityDiagnosticsOptions,
} from "./types.js";

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
): {
  readonly candidateSymbols: readonly ExtractedSymbol[];
  readonly sourceSymbols: readonly ExtractedSymbol[];
} {
  const sourceSymbols = options.sourceSymbolsByFile
    ? (options.sourceSymbolsByFile.get(sourceFile) ?? [])
    : readSourceSymbols(
        sourceFile,
        options.sourceContentByFile,
        options.workspaceRoot ?? process.cwd(),
      );
  const changedSymbols = options.symbolsByFile.get(sourceFile);

  return {
    candidateSymbols: changedSymbols ?? sourceSymbols,
    sourceSymbols:
      sourceSymbols.length > 0 ? sourceSymbols : (changedSymbols ?? []),
  };
}

function hasTraceabilityLinks(symbol: ExtractedSymbol): boolean {
  return (symbol.relationships ?? []).some((relationship) =>
    isTraceabilityRelationshipType(relationship.type),
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

// implements REQ-cli-staged-impact-enforcement, REQ-cli-check
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

    const { candidateSymbols, sourceSymbols } = getGranularSymbolsForSourceFile(
      result.sourceFile,
      options,
    );
    const narrower = narrowerSymbols(
      result.entity.title,
      candidateSymbols,
      sourceSymbols,
    );
    if (narrower.length === 0) continue;

    const behavioralNames = getBehavioralSymbolNames(narrower);
    if (behavioralNames.length === 0) continue;

    const nonBehavioralNames = getNonBehavioralSymbolNames(narrower);
    const ignoredSymbolsSuggestion =
      nonBehavioralNames.length > 0
        ? ` Non-behavioral symbols ignored for this decision: ${nonBehavioralNames.join(
            ", ",
          )}.`
        : "";

    // A title the extractor does not produce (a private class member, a
    // renamed or removed declaration) can never become granular by refresh:
    // say so instead of only calling the link coarse.
    const titleExtracted = sourceSymbols.some(
      (symbol) => symbol.name === result.entity.title,
    );
    diagnostics.push({
      id: "symbol_granularity_violation",
      severity: "error",
      blocking: true,
      category: "symbol",
      entityId: result.entity.id,
      ...(result.entity.source ? { source: result.entity.source } : {}),
      files: [result.entity.source, result.sourceFile],
      docs: ["docs/symbol-traceability-taxonomy.md"],
      message: titleExtracted
        ? `Symbol ${result.entity.id} links ${result.sourceFile} coarsely while granular symbols are available (behavioral only): ${behavioralNames.join(", ")}`
        : `Symbol ${result.entity.id} names '${result.entity.title}', which the source extractor does not produce for ${result.sourceFile} (private class members and removed or renamed declarations are not tracked), so it links ${result.sourceFile} coarsely while granular symbols are available (behavioral only): ${behavioralNames.join(", ")}`,
      suggestion: titleExtracted
        ? `Move ownership/coverage/test relationships to the narrow behavioral symbol, add a manifest behavioral anchor, or add granularity_reason with ${ALLOWED_GRANULARITY_REASONS_PROSE} when the coarse symbol is intentional.${ignoredSymbolsSuggestion}`
        : `Re-point this symbol's relationships to the public declaration that owns the behavior (one of: ${behavioralNames.join(", ")}) or remove the symbol; add granularity_reason with ${ALLOWED_GRANULARITY_REASONS_PROSE} only when coarse ownership is intentional.${ignoredSymbolsSuggestion}`,
      evidence: {
        sourceFile: result.sourceFile,
        title: result.entity.title,
        titleExtracted,
        granularSymbols: behavioralNames,
      },
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
      const file = symbol.location.file;
      // In a file no requirement owns at all, the changed behavior has no
      // recorded intent, so the review is "record it", not "compare it with
      // its links". Elsewhere a coarser symbol of the file may still own it.
      const unlinked =
        !hasTraceabilityLinks(symbol) &&
        !(options.linkedSourceFiles?.has(file) ?? false);
      diagnostics.push({
        id: "symbol_semantic_review_needed",
        severity: "warning",
        blocking: false,
        category: "symbol",
        files: [file],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message: unlinked
          ? `Changed behavioral symbol ${symbol.name} is in a file no requirement owns, so no recorded intent covers the behavior it has after this change`
          : `Changed behavioral symbol ${symbol.name} needs semantic review against linked Kibi coverage: ${linkedTargets}`,
        suggestion: unlinked
          ? `If the change adds or alters behavior, record it as part of this change; that is part of finishing it, not a separate request, so it needs no permission: kb_search({query:"<the behavior>", sourceLocations:[{path:"${file}"}]}) for a requirement that already describes it and link ${symbol.name} to it; if none does, kb_upsert a requirement with a scenario and link the symbol with implements. If behavior is unchanged (a refactor, renaming), say so in the final report instead.`
          : `Use kb_search and kb_query for ${file}, then verify that ${linkedTargets} actually describe and test the changed behavior or UI copy. Update Kibi links or requirements/tests while the edit context is fresh.`,
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
