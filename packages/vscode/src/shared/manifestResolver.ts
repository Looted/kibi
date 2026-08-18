/*
 * Shared manifest resolution utilities for Kibi VS Code extension
 *
 * Centralizes the logic for resolving symbols.yaml paths from the canonical
 * .kb/ layout. All traceability providers (CodeLens, CodeAction, Hover,
 * symbol index) should use this shared function to ensure consistent behavior.
 */
import * as fs from "node:fs";
import * as path from "node:path";

const CANONICAL_SYMBOLS_MANIFEST = ".kb/symbols.yaml";
const CANONICAL_SYMBOL_COORDINATES = ".kb/symbol-coordinates.yaml";

// implements REQ-vscode-traceability
/**
 * Resolves the manifest path for symbols.yaml using the canonical .kb/ layout.
 *
 * @param workspaceRoot - The root of the workspace
 * @returns The resolved absolute path to the symbols manifest file
 */
export function resolveSymbolsManifestPath(workspaceRoot: string): string {
  const canonical = path.join(workspaceRoot, CANONICAL_SYMBOLS_MANIFEST);
  if (fs.existsSync(canonical)) {
    return canonical;
  }

  // Legacy fallbacks for repositories that have not yet migrated.
  const legacyCandidates = [
    path.join(workspaceRoot, "documentation", "symbols.yaml"),
    path.join(workspaceRoot, "symbols.yaml"),
    path.join(workspaceRoot, "symbols.yml"),
  ];
  const foundPath = legacyCandidates.find((p) => fs.existsSync(p));
  return foundPath ?? canonical;
}

export function resolveSymbolsManifestPaths(workspaceRoot: string): {
  symbolsPath: string;
  coordinatesPath: string;
} {
  const symbolsPath = resolveSymbolsManifestPath(workspaceRoot);
  const canonicalCoordinates = path.join(
    workspaceRoot,
    CANONICAL_SYMBOL_COORDINATES,
  );
  if (fs.existsSync(canonicalCoordinates)) {
    return { symbolsPath, coordinatesPath: canonicalCoordinates };
  }
  return {
    symbolsPath,
    coordinatesPath: path.join(
      path.dirname(symbolsPath),
      "symbol-coordinates.yaml",
    ),
  };
}
