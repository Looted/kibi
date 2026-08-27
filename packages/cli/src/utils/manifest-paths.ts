import * as path from "node:path";
import { CANONICAL_ENTITY_PATHS, KB_PATHS } from "./kb-paths.js";

export const DEFAULT_SYMBOLS_PATH = KB_PATHS.symbolsManifest;
export const DEFAULT_COORDINATES_PATH = KB_PATHS.symbolCoordinates;

// implements REQ-cli-sync
export function resolveSymbolsManifestPaths(workspaceRoot: string): {
  symbolsPath: string;
  coordinatesPath: string;
} {
  const symbolsPath = path.join(workspaceRoot, CANONICAL_ENTITY_PATHS.symbols);
  return {
    symbolsPath,
    coordinatesPath: path.join(workspaceRoot, DEFAULT_COORDINATES_PATH),
  };
}

// implements REQ-cli-sync
export function resolveSymbolsManifestPath(workspaceRoot: string): string {
  return resolveSymbolsManifestPaths(workspaceRoot).symbolsPath;
}
