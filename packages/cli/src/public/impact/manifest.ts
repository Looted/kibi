import { existsSync } from "node:fs";
import * as path from "node:path";
import { extractFromManifest } from "../../extractors/manifest.js";
import type { ExtractionResult } from "../../extractors/markdown.js";
import type { ManifestLookup } from "../../traceability/symbol-extract.js";
import { loadConfig } from "../../utils/config.js";
import { isTraceabilityRelationshipType } from "../symbol-granularity.js";
import { normalizeSourceFile } from "./source-changes.js";
import type { TraceabilityRelationship } from "./types.js";

function toTraceabilityRelationships(
  relationships: ExtractionResult["relationships"],
): TraceabilityRelationship[] {
  return relationships
    .filter((relationship) => isTraceabilityRelationshipType(relationship.type))
    .map((relationship) => ({ type: relationship.type, to: relationship.to }));
}

export function readImpactManifestResults(
  workspaceRoot: string,
): readonly ExtractionResult[] {
  const config = loadConfig(workspaceRoot);
  const symbolsPath = config.paths.symbols;
  if (!symbolsPath) return [];

  const absolutePath = path.isAbsolute(symbolsPath)
    ? symbolsPath
    : path.resolve(workspaceRoot, symbolsPath);
  if (!existsSync(absolutePath)) return [];

  return extractFromManifest(absolutePath).map((result) => ({
    entity: {
      ...result.entity,
      source: normalizeSourceFile(workspaceRoot, result.entity.source),
    },
    relationships: result.relationships,
    ...(result.sourceFile !== undefined
      ? { sourceFile: normalizeSourceFile(workspaceRoot, result.sourceFile) }
      : {}),
  }));
}

export function createImpactManifestLookup(
  manifestResults: readonly ExtractionResult[],
): ManifestLookup {
  const manifestLookup: ManifestLookup = new Map();

  for (const result of manifestResults) {
    const sourceFile = result.sourceFile ?? result.entity.source;
    manifestLookup.set(`${sourceFile}:${result.entity.title}`, {
      id: result.entity.id,
      relationships: toTraceabilityRelationships(result.relationships),
    });
  }

  return manifestLookup;
}
