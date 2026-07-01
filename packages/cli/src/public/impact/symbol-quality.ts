import type { ExtractionResult } from "../../extractors/markdown.js";
import type { KibiImpactDiagnostic } from "../../traceability/staged-diagnostics.js";
import { isAllowedGranularityReason } from "../symbol-granularity.js";
import {
  AGGREGATE_KINDS,
  type SymbolMetadata,
  collectSymbols,
  isModuleOrConfig,
  narrowerExtractedSymbols,
  narrowerManifestSymbols,
} from "./symbol-quality-model.js";
import type { SymbolQualityDiagnosticsOptions } from "./types.js";

function thresholdFor(symbol: SymbolMetadata): number {
  return AGGREGATE_KINDS.has(symbol.kind) ? 4 : 2;
}

function isMultiRequirementCandidate(symbol: SymbolMetadata): boolean {
  if (isModuleOrConfig(symbol)) {
    return !isAllowedGranularityReason(symbol.result.entity.granularity_reason);
  }
  return symbol.role === "behavioral";
}

function createMultiRequirementDiagnostics(
  symbols: readonly SymbolMetadata[],
): readonly KibiImpactDiagnostic[] {
  return symbols.flatMap((symbol) => {
    if (!isMultiRequirementCandidate(symbol)) return [];
    const threshold = thresholdFor(symbol);
    if (symbol.requirementTargetIds.length <= threshold) return [];

    return [
      {
        id: "multi_requirement_symbol_review",
        severity: "review",
        blocking: false,
        category: "symbol",
        entityId: symbol.id,
        source: symbol.source,
        files: [symbol.source, symbol.sourceFile],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message: `Symbol ${symbol.id} implements ${symbol.requirementTargetIds.length} requirements, above the ${threshold} target review threshold.`,
        suggestion:
          "Review whether this symbol owns multiple unrelated behaviors; move relationships to narrower behavioral symbols or add a valid granularity_reason when broad ownership is intentional.",
        evidence: {
          targetIds: symbol.requirementTargetIds,
          targetCount: symbol.requirementTargetIds.length,
          threshold,
          symbolKind: symbol.kind,
          symbolRole: symbol.role,
          sourceFile: symbol.sourceFile,
        },
      },
    ];
  });
}

function hasDistinctCoordinates(symbols: readonly SymbolMetadata[]): boolean {
  const coordinateKeys = symbols.map((symbol) => symbol.coordinateKey);
  if (coordinateKeys.some((key) => key === null)) return false;
  return new Set(coordinateKeys).size === coordinateKeys.length;
}

function createDuplicateCoordinateDiagnostics(
  symbols: readonly SymbolMetadata[],
): readonly KibiImpactDiagnostic[] {
  const groups = Map.groupBy(
    symbols,
    (symbol) => `${symbol.sourceFile}\u0000${symbol.title}`,
  );

  return [...groups.values()].flatMap((group) => {
    if (group.length < 2) return [];
    if (hasDistinctCoordinates(group)) return [];
    const first = group[0];
    if (first === undefined) return [];
    const candidateIds = group.map((symbol) => symbol.id).sort();

    return [
      {
        id: "duplicate_symbol_coordinate_review",
        severity: "review",
        blocking: false,
        category: "coordinate",
        entityId: first.id,
        source: first.source,
        files: [first.source, first.sourceFile],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message: `Symbols ${candidateIds.join(", ")} share title ${first.title} and source ${first.sourceFile} without distinct coordinate evidence.`,
        suggestion:
          "Refresh symbol coordinates or rename member-level manifest entries so duplicate modeled symbols are distinguishable after parsing.",
        evidence: {
          candidateIds,
          title: first.title,
          sourceFile: first.sourceFile,
        },
      },
    ];
  });
}

function requirementTagsById(
  results: readonly ExtractionResult[],
): ReadonlyMap<string, readonly string[]> {
  const tagsById = new Map<string, readonly string[]>();
  for (const result of results) {
    if (result.entity.type !== "req") continue;
    tagsById.set(result.entity.id, [...(result.entity.tags ?? [])].sort());
  }
  return tagsById;
}

function tagsForTargets(
  targetIds: readonly string[],
  tagsByRequirementId: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
  return [
    ...new Set(
      targetIds.flatMap((targetId) => tagsByRequirementId.get(targetId) ?? []),
    ),
  ].sort();
}

function hasSharedRequirementTag(
  targetIds: readonly string[],
  tagsByRequirementId: ReadonlyMap<string, readonly string[]>,
): boolean {
  const tagSets = targetIds
    .map((targetId) => new Set(tagsByRequirementId.get(targetId) ?? []))
    .filter((tagSet) => tagSet.size > 0);
  const first = tagSets[0];
  if (first === undefined || tagSets.length !== targetIds.length) return false;
  return [...first].some((tag) => tagSets.every((tagSet) => tagSet.has(tag)));
}

function isMixedPurposeCandidate(symbol: SymbolMetadata): boolean {
  return AGGREGATE_KINDS.has(symbol.kind) || isModuleOrConfig(symbol);
}

function createMixedPurposeDiagnostics(
  symbols: readonly SymbolMetadata[],
  options: SymbolQualityDiagnosticsOptions,
): readonly KibiImpactDiagnostic[] {
  const tagsByRequirementId = requirementTagsById(options.manifestResults);
  return symbols.flatMap((symbol) => {
    if (!isMixedPurposeCandidate(symbol)) return [];
    const manifestChildren = narrowerManifestSymbols(symbol, symbols);
    const extractedChildren = narrowerExtractedSymbols(
      symbol,
      options.symbolsByFile,
    );
    if (manifestChildren.length === 0 && extractedChildren.length === 0)
      return [];
    const requirementTags = tagsForTargets(
      symbol.requirementTargetIds,
      tagsByRequirementId,
    );
    if (requirementTags.length < 3) return [];
    if (
      hasSharedRequirementTag(symbol.requirementTargetIds, tagsByRequirementId)
    ) {
      return [];
    }
    const narrowerSymbolIds = [
      ...new Set([
        ...manifestChildren.map((child) => child.id),
        ...extractedChildren.map((child) => child.id),
      ]),
    ].sort();

    return [
      {
        id: "component_mixed_purpose_review",
        severity: "review",
        blocking: false,
        category: "mixed-purpose",
        entityId: symbol.id,
        source: symbol.source,
        files: [symbol.source, symbol.sourceFile],
        docs: ["docs/symbol-traceability-taxonomy.md"],
        message: `Symbol ${symbol.id} spans unrelated requirement tag clusters while narrower same-file symbols exist.`,
        suggestion:
          "Move unrelated requirement ownership to narrower class members/components/services or split the coarse symbol into cohesive behavioral anchors.",
        evidence: {
          targetIds: symbol.requirementTargetIds,
          requirementTags,
          narrowerSymbolIds,
          sourceFile: symbol.sourceFile,
          symbolKind: symbol.kind,
          symbolRole: symbol.role,
        },
      },
    ];
  });
}

export function createSymbolQualityDiagnostics(
  options: SymbolQualityDiagnosticsOptions,
): KibiImpactDiagnostic[] {
  const symbols = collectSymbols(options);
  return [
    ...createMultiRequirementDiagnostics(symbols),
    ...createDuplicateCoordinateDiagnostics(symbols),
    ...createMixedPurposeDiagnostics(symbols, options),
  ];
}
