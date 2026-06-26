import type { ExtractionResult } from "../../extractors/markdown.js";
import type { ExtractedSymbol } from "../../traceability/symbol-extract.js";
import { isTraceabilityRelationshipType } from "../symbol-granularity.js";
import { uniqueSorted } from "./source-changes.js";
import type {
  ImpactExtractedSymbol,
  ImpactLinkedEntity,
  SymbolsByFile,
} from "./types.js";

function linkedEntityIdsFor(symbol: ExtractedSymbol): string[] {
  return uniqueSorted(
    (symbol.relationships ?? [])
      .filter((relationship) =>
        isTraceabilityRelationshipType(relationship.type),
      )
      .map((relationship) => relationship.to),
  );
}

export function formatExtractedSymbols(
  symbolsByFile: SymbolsByFile,
): ImpactExtractedSymbol[] {
  return [...symbolsByFile.values()]
    .flatMap((symbols) => [...symbols])
    .map((symbol) => ({
      id: symbol.id,
      name: symbol.name,
      kind: symbol.kind,
      role: symbol.role,
      location: symbol.location,
      hunkRanges: symbol.hunkRanges,
      linkedEntityIds: linkedEntityIdsFor(symbol),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

export function collectLinkedEntities(
  symbolsByFile: SymbolsByFile,
  manifestResults: readonly ExtractionResult[],
  activeSourceFiles: ReadonlySet<string>,
): ImpactLinkedEntity[] {
  const linkedEntities = new Map<string, ImpactLinkedEntity>();
  const add = (entity: ImpactLinkedEntity): void => {
    linkedEntities.set(
      `${entity.sourceSymbolId}:${entity.relationshipType}:${entity.id}`,
      entity,
    );
  };

  for (const symbols of symbolsByFile.values()) {
    for (const symbol of symbols) {
      for (const relationship of symbol.relationships ?? []) {
        if (!isTraceabilityRelationshipType(relationship.type)) continue;
        add({
          id: relationship.to,
          relationshipType: relationship.type,
          sourceSymbolId: symbol.id,
          sourceSymbolName: symbol.name,
        });
      }
    }
  }

  for (const result of manifestResults) {
    if (
      result.sourceFile === undefined ||
      !activeSourceFiles.has(result.sourceFile)
    ) {
      continue;
    }
    for (const relationship of result.relationships) {
      if (!isTraceabilityRelationshipType(relationship.type)) continue;
      add({
        id: relationship.to,
        relationshipType: relationship.type,
        sourceSymbolId: result.entity.id,
        sourceSymbolName: result.entity.title,
      });
    }
  }

  return [...linkedEntities.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

export function buildNextActions(sourceFiles: readonly string[]): string[] {
  if (sourceFiles.length === 0) return [];

  return [
    `kb_search({ query: "${sourceFiles.join(" ")}" }) to discover requirements/tests that may describe the changed behavior.`,
    ...sourceFiles.map(
      (sourceFile) =>
        `kb_query({ sourceFile: "${sourceFile}" }) to inspect exact source-linked Kibi entities before deciding whether requirements/tests need updates.`,
    ),
  ];
}
