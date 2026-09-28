// implements REQ-claude-code-kibi-plugin-v1
import {
  buildKnowledgeIndex as buildSharedKnowledgeIndex,
  loadKnowledgeIndex as loadSharedKnowledgeIndex,
  readEntitySummary as readSharedEntitySummary,
  scanSymbolCoordinates as scanSharedSymbolCoordinates,
  scanSymbolsManifest as scanSharedSymbolsManifest,
} from "kibi-agent-core/knowledge-index";
import type {
  Coordinates as SharedCoordinates,
  EntitySummary as SharedEntitySummary,
  IndexedSymbol as SharedIndexedSymbol,
  KnowledgeIndex as SharedKnowledgeIndex,
} from "kibi-agent-core/knowledge-index";

export type IndexedSymbol = SharedIndexedSymbol;
export type KnowledgeIndex = SharedKnowledgeIndex;
export type Coordinates = SharedCoordinates;
export type EntitySummary = SharedEntitySummary;

export function scanSymbolsManifest(text: string): Record<string, unknown>[] {
  return scanSharedSymbolsManifest(text);
}

export function scanSymbolCoordinates(text: string): Coordinates {
  return scanSharedSymbolCoordinates(text);
}

export function buildKnowledgeIndex(
  records: readonly Record<string, unknown>[],
  coordinates: Coordinates = {},
): KnowledgeIndex {
  return buildSharedKnowledgeIndex(records, coordinates);
}

export function loadKnowledgeIndex(
  workspaceRoot: string,
  cacheDir?: string,
): KnowledgeIndex {
  return loadSharedKnowledgeIndex(workspaceRoot, cacheDir);
}

export function readEntitySummary(
  workspaceRoot: string,
  entityId: string,
): EntitySummary {
  return readSharedEntitySummary(workspaceRoot, entityId);
}
