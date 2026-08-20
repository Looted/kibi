/*
 * Shared manifest resolution utilities for Kibi VS Code extension
 *
 * Centralizes the logic for resolving symbols.yaml paths from the canonical
 * .kb/ layout. All traceability providers (CodeLens, CodeAction, Hover,
 * symbol index) should use this shared function to ensure consistent behavior.
 */
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
  return path.join(workspaceRoot, CANONICAL_SYMBOLS_MANIFEST);
}

export function resolveSymbolsManifestPaths(workspaceRoot: string): {
  symbolsPath: string;
  coordinatesPath: string;
} {
  return {
    symbolsPath: resolveSymbolsManifestPath(workspaceRoot),
    coordinatesPath: path.join(workspaceRoot, CANONICAL_SYMBOL_COORDINATES),
  };
}
