// implements REQ-cursor-kibi-plugin-v1
import path from "node:path";

import {
  type IndexedSymbol,
  buildKnowledgeIndex,
  loadKnowledgeIndex,
  scanSymbolsManifest,
} from "kibi-agent-core/knowledge-index";
import { implementedRequirementIds } from "kibi-agent-core/snippets";

const MAX_LINKED_REQUIREMENTS = 3;
const CURSOR_INDEX_OPTIONS = {
  legacyLinksAsImplements: false,
  cacheFileName: "cursor-knowledge-index.json",
} as const;

type ManifestRow = {
  sourceFile: string;
  relationships: { type: string; target: string }[];
};

function toManifestPath(workspaceRoot: string, filePath: string): string {
  const absolute = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(workspaceRoot, filePath);
  return path.relative(workspaceRoot, absolute).split(path.sep).join("/");
}

// implements REQ-cursor-kibi-plugin-v1
export type SourceLinkedSymbols = {
  /** Manifest (workspace-relative, forward-slash) path of the file. */
  relativePath: string;
  /** Symbols in the file with typed relationships; empty when unlinked. */
  symbols: IndexedSymbol[];
};

/**
 * Typed symbol relationships for one file through the shared line-scanned
 * index. Cursor stores the cache beside its hook state, so subsequent hook
 * processes pay only two stats and a small JSON parse while the manifests are
 * unchanged.
 */
// implements REQ-cursor-kibi-plugin-v1
export function getSourceLinkedSymbols(
  workspaceRoot: string,
  filePath: string,
  cacheDir?: string,
): SourceLinkedSymbols {
  const relativePath = toManifestPath(workspaceRoot, filePath);
  const symbols =
    loadKnowledgeIndex(workspaceRoot, cacheDir, CURSOR_INDEX_OPTIONS).files[
      relativePath
    ] ?? [];
  return { relativePath, symbols };
}

/** Requirements the file's symbols implement (typed `implements` only). */
export function getSourceLinkedRequirementIds(
  workspaceRoot: string,
  editedPath: string,
  cacheDir?: string,
): string[] {
  const { symbols } = getSourceLinkedSymbols(
    workspaceRoot,
    editedPath,
    cacheDir,
  );
  return implementedRequirementIds(symbols).slice(0, MAX_LINKED_REQUIREMENTS);
}

/** Parse the canonical writer subset while retaining typed relationships. */
// implements REQ-cursor-kibi-plugin-v1
export function parseSymbolsManifest(content: string): ManifestRow[] {
  const index = buildKnowledgeIndex(
    scanSymbolsManifest(content),
    {},
    CURSOR_INDEX_OPTIONS,
  );
  return Object.entries(index.files).flatMap(([sourceFile, symbols]) =>
    symbols.map((symbol) => ({
      sourceFile,
      relationships: [
        ...symbol.implements.map((target) => ({
          type: "implements",
          target,
        })),
        ...symbol.coveredBy.map((target) => ({
          type: "covered_by",
          target,
        })),
        ...symbol.executableFor.map((target) => ({
          type: "executable_for",
          target,
        })),
      ],
    })),
  );
}
