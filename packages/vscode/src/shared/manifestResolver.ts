/*
 * Shared manifest resolution utilities for Kibi VS Code extension
 *
 * Centralizes the logic for resolving symbols.yaml paths from config or defaults.
 * All traceability providers (CodeLens, CodeAction, Hover, symbol index) should
 * use this shared function to ensure consistent behavior.
 */
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Resolves the manifest path for symbols.yaml using config.json or defaults.
 *
 * Priority order:
 * 1. paths.symbols from .kb/config.json (current standard)
 * 2. symbolsManifest from .kb/config.json (legacy field)
 * 3. Default conventions: symbols.yaml or symbols.yml at workspace root
 *
 * @param workspaceRoot - The root of the workspace
 * @returns The resolved absolute path to the symbols manifest file
 */
export function resolveSymbolsManifestPath(workspaceRoot: string): string {
  // Prefer path in .kb/config.json
  const configPath = path.join(workspaceRoot, ".kb", "config.json");
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
        symbolsManifest?: string;
        paths?: { symbols?: string };
      };

      // Check top-level symbolsManifest (legacy) or paths.symbols (current convention)
      const manifestRelPath = config.symbolsManifest ?? config.paths?.symbols;

      if (manifestRelPath) {
        // If path is absolute, use it directly
        if (path.isAbsolute(manifestRelPath)) {
          return manifestRelPath;
        }
        // Otherwise, resolve against workspace root
        return path.resolve(workspaceRoot, manifestRelPath);
      }
    } catch {
      // ignore parse errors, fall through to defaults
    }
  }

  // Default conventions: try symbols.yaml then symbols.yml at workspace root
  const candidates = [
    path.join(workspaceRoot, "symbols.yaml"),
    path.join(workspaceRoot, "symbols.yml"),
  ];
  const foundPath = candidates.find((p) => fs.existsSync(p));
  return foundPath ?? candidates[0];
}
