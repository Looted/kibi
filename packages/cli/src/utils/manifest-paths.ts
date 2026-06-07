import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";

export const DEFAULT_SYMBOLS_PATH = "documentation/symbols.yaml";
export const DEFAULT_COORDINATES_PATH = "documentation/symbol-coordinates.yaml";

interface ManifestResolverConfig {
  symbolsManifest?: unknown;
  paths?: {
    symbols?: unknown;
  } | null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function resolveConfigPath(workspaceRoot: string, configPath?: string): string {
  const configuredPath =
    configPath ?? path.join(workspaceRoot, ".kb", "config.json");
  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(workspaceRoot, configuredPath);
}

function readManifestResolverConfig(
  workspaceRoot: string,
  configPath?: string,
): ManifestResolverConfig | null {
  const resolvedConfigPath = resolveConfigPath(workspaceRoot, configPath);
  if (!existsSync(resolvedConfigPath)) {
    return null;
  }

  try {
    return JSON.parse(
      readFileSync(resolvedConfigPath, "utf8"),
    ) as ManifestResolverConfig;
  } catch {
    return null;
  }
}

function resolveConfiguredSymbolsPath(
  workspaceRoot: string,
  configPath?: string,
): string | null {
  const config = readManifestResolverConfig(workspaceRoot, configPath);
  if (!config) {
    return null;
  }

  const configuredPathCandidate =
    config.paths?.symbols ?? config.symbolsManifest;

  if (!isNonEmptyString(configuredPathCandidate)) {
    return null;
  }

  return path.isAbsolute(configuredPathCandidate)
    ? configuredPathCandidate
    : path.resolve(workspaceRoot, configuredPathCandidate);
}

function resolveDefaultSymbolsPath(workspaceRoot: string): string {
  const candidates = [
    path.join(workspaceRoot, DEFAULT_SYMBOLS_PATH),
    path.join(workspaceRoot, "symbols.yaml"),
    path.join(workspaceRoot, "symbols.yml"),
  ];

  return (
    candidates.find((candidate) => existsSync(candidate)) ??
    candidates[0] ??
    path.join(workspaceRoot, DEFAULT_SYMBOLS_PATH)
  );
}

function deriveCoordinatesPath(symbolsPath: string): string {
  return path.join(
    path.dirname(symbolsPath),
    path.basename(DEFAULT_COORDINATES_PATH),
  );
}

// implements REQ-cli-sync
export function resolveSymbolsManifestPaths(
  workspaceRoot: string,
  configPath?: string,
): { symbolsPath: string; coordinatesPath: string } {
  const symbolsPath =
    resolveConfiguredSymbolsPath(workspaceRoot, configPath) ??
    resolveDefaultSymbolsPath(workspaceRoot);

  return {
    symbolsPath,
    coordinatesPath: deriveCoordinatesPath(symbolsPath),
  };
}

// implements REQ-cli-sync
export function resolveSymbolsManifestPath(
  workspaceRoot: string,
  configPath?: string,
): string {
  return resolveSymbolsManifestPaths(workspaceRoot, configPath).symbolsPath;
}
