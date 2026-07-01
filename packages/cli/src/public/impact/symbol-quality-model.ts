import type { ExtractionResult } from "../../extractors/markdown.js";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";
import { getSymbolRole, type SymbolKind, type SymbolRole } from "../symbol-granularity.js";
import type { SymbolQualityDiagnosticsOptions } from "./types.js";

export type SymbolMetadata = {
  readonly result: ExtractionResult;
  readonly id: string;
  readonly title: string;
  readonly sourceFile: string;
  readonly source: string;
  readonly kind: SymbolKind | "component" | "service" | "module" | "config";
  readonly role: SymbolRole;
  readonly requirementTargetIds: readonly string[];
  readonly coordinateKey: string | null;
};

export const AGGREGATE_KINDS: ReadonlySet<string> = new Set([
  "class",
  "component",
  "service",
  "module",
]);

function isActiveSymbol(result: ExtractionResult): boolean {
  return result.entity.type === "symbol" && result.entity.status === "active";
}

function getRequirementTargets(result: ExtractionResult): readonly string[] {
  return [
    ...new Set(
      result.relationships
        .filter(
          (relationship) =>
            relationship.type === "implements" && relationship.to.startsWith("REQ-"),
        )
        .map((relationship) => relationship.to),
    ),
  ].sort();
}

function inferKind(result: ExtractionResult): SymbolMetadata["kind"] {
  const explicitKind = result.entity.symbol_kind;
  if (
    explicitKind === "component" ||
    explicitKind === "service" ||
    explicitKind === "module" ||
    explicitKind === "config"
  ) {
    return explicitKind;
  }
  if (
    explicitKind === "function" ||
    explicitKind === "class" ||
    explicitKind === "method" ||
    explicitKind === "property" ||
    explicitKind === "accessor" ||
    explicitKind === "interface" ||
    explicitKind === "type" ||
    explicitKind === "variable" ||
    explicitKind === "enum" ||
    explicitKind === "unknown"
  ) {
    return explicitKind;
  }

  if (result.entity.title.endsWith("Component")) return "component";
  if (result.entity.title.endsWith("Service")) return "service";
  if (result.entity.title.endsWith("Module")) return "module";
  if (result.entity.title.endsWith("Config")) return "config";
  if (result.entity.title.includes(".")) return "method";
  return "unknown";
}

function inferRole(result: ExtractionResult, kind: SymbolMetadata["kind"]): SymbolRole {
  const explicitRole = result.entity.symbol_role;
  if (
    explicitRole === "behavioral" ||
    explicitRole === "structural" ||
    explicitRole === "type-shape" ||
    explicitRole === "config" ||
    explicitRole === "module" ||
    explicitRole === "unknown"
  ) {
    return explicitRole;
  }
  if (kind === "component" || kind === "service") return "behavioral";
  if (kind === "module") return "module";
  if (kind === "config") return "config";
  return getSymbolRole({ name: result.entity.title, kind });
}

function getCoordinateKey(result: ExtractionResult): string | null {
  const { sourceLine, sourceColumn, sourceEndLine, sourceEndColumn } = result.entity;
  if (
    sourceLine === undefined ||
    sourceColumn === undefined ||
    sourceEndLine === undefined ||
    sourceEndColumn === undefined
  ) {
    return null;
  }

  return `${sourceLine}:${sourceColumn}:${sourceEndLine}:${sourceEndColumn}`;
}

export function collectSymbols(
  options: SymbolQualityDiagnosticsOptions,
): readonly SymbolMetadata[] {
  return options.manifestResults
    .filter((result) =>
      options.activeEntityIds === undefined
        ? isActiveSymbol(result)
        : isActiveSymbol(result) && options.activeEntityIds.has(result.entity.id),
    )
    .flatMap((result) => {
      if (result.sourceFile === undefined) return [];
      const kind = inferKind(result);
      return [
        {
          result,
          id: result.entity.id,
          title: result.entity.title,
          sourceFile: result.sourceFile,
          source: result.entity.source,
          kind,
          role: inferRole(result, kind),
          requirementTargetIds: getRequirementTargets(result),
          coordinateKey: getCoordinateKey(result),
        },
      ];
    });
}

export function isModuleOrConfig(symbol: SymbolMetadata): boolean {
  return symbol.role === "module" || symbol.role === "config";
}

export function narrowerManifestSymbols(
  symbol: SymbolMetadata,
  symbols: readonly SymbolMetadata[],
): readonly SymbolMetadata[] {
  return symbols.filter(
    (candidate) =>
      candidate.id !== symbol.id &&
      candidate.sourceFile === symbol.sourceFile &&
      candidate.title.startsWith(`${symbol.title}.`),
  );
}

export function narrowerExtractedSymbols(
  symbol: SymbolMetadata,
  symbolsByFile: ReadonlyMap<string, readonly ExtractedSymbol[]>,
): readonly ExtractedSymbol[] {
  return (symbolsByFile.get(symbol.sourceFile) ?? []).filter(
    (candidate) =>
      candidate.name !== symbol.title &&
      candidate.name.startsWith(`${symbol.title}.`) &&
      candidate.role === "behavioral",
  );
}
