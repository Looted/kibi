/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import * as path from "node:path";
import { load as parseYAML } from "js-yaml";
import { DEFAULT_COORDINATES_PATH } from "../utils/manifest-paths.js";
import {
  type ParsedCoordinateArtifact,
  mergeCoordinatesWithManifest,
  parseCoordinateArtifact,
} from "./symbol-coordinates.js";

export interface ExtractedEntity {
  id: string;
  type: string;
  title: string;
  status: string;
  created_at: string;
  updated_at: string;
  source: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  text_ref?: string;
  granularity_reason?: string;
}

export interface ExtractedRelationship {
  type: string;
  from: string;
  to: string;
}

export interface ExtractionResult {
  entity: ExtractedEntity;
  relationships: ExtractedRelationship[];
  sourceFile?: string;
}

type RelationshipType =
  | "depends_on"
  | "executable_for"
  | "specified_by"
  | "verified_by"
  | "validates"
  | "implements"
  | "covered_by"
  | "constrained_by"
  | "constrains"
  | "requires_property"
  | "requires_predicate"
  | "guards"
  | "publishes"
  | "consumes"
  | "supersedes"
  | "relates_to";

const VALID_RELATIONSHIP_TYPES = new Set<RelationshipType>([
  "depends_on",
  "executable_for",
  "specified_by",
  "verified_by",
  "validates",
  "implements",
  "covered_by",
  "constrained_by",
  "constrains",
  "requires_property",
  "requires_predicate",
  "guards",
  "publishes",
  "consumes",
  "supersedes",
  "relates_to",
]);

const VALID_RELATIONSHIP_DIRECTIONS: ReadonlyArray<{
  type: RelationshipType;
  from:
    | "req"
    | "scenario"
    | "test"
    | "adr"
    | "flag"
    | "event"
    | "symbol"
    | "fact";
  to:
    | "req"
    | "scenario"
    | "test"
    | "adr"
    | "flag"
    | "event"
    | "symbol"
    | "fact";
}> = [
  { type: "depends_on", from: "req", to: "req" },
  { type: "executable_for", from: "symbol", to: "test" },
  { type: "specified_by", from: "req", to: "scenario" },
  { type: "verified_by", from: "req", to: "test" },
  { type: "verified_by", from: "scenario", to: "test" },
  { type: "validates", from: "test", to: "req" },
  { type: "validates", from: "test", to: "scenario" },
  { type: "implements", from: "symbol", to: "req" },
  { type: "covered_by", from: "symbol", to: "test" },
  { type: "constrained_by", from: "symbol", to: "adr" },
  { type: "constrains", from: "req", to: "fact" },
  { type: "requires_property", from: "req", to: "fact" },
  { type: "requires_predicate", from: "req", to: "fact" },
  { type: "guards", from: "flag", to: "symbol" },
  { type: "guards", from: "flag", to: "event" },
  { type: "guards", from: "flag", to: "req" },
  { type: "publishes", from: "symbol", to: "event" },
  { type: "consumes", from: "symbol", to: "event" },
  { type: "supersedes", from: "adr", to: "adr" },
  { type: "supersedes", from: "req", to: "req" },
];

const RELATIONSHIP_TYPE_DISPLAY_LIST = Array.from(VALID_RELATIONSHIP_TYPES)
  .sort()
  .join(", ");

function inferEntityTypeFromId(
  id: string,
):
  | "req"
  | "scenario"
  | "test"
  | "adr"
  | "flag"
  | "event"
  | "symbol"
  | "fact"
  | null {
  const upper = id.toUpperCase();
  if (upper.startsWith("REQ-")) return "req";
  if (upper.startsWith("SCEN-")) return "scenario";
  if (upper.startsWith("TEST-")) return "test";
  if (upper.startsWith("ADR-")) return "adr";
  if (upper.startsWith("FLAG-")) return "flag";
  if (upper.startsWith("EVENT-")) return "event";
  if (upper.startsWith("SYM-")) return "symbol";
  if (upper.startsWith("FACT-")) return "fact";
  return null;
}

function validateRelationshipType(
  type: string,
  filePath: string,
): asserts type is RelationshipType {
  if (!VALID_RELATIONSHIP_TYPES.has(type as RelationshipType)) {
    throw new ManifestError(
      `Invalid relationship type \"${type}\". Allowed types: ${RELATIONSHIP_TYPE_DISPLAY_LIST}`,
      filePath,
    );
  }
}

function validateRelationshipDirection(
  type: RelationshipType,
  from: string,
  to: string,
  filePath: string,
): void {
  if (type === "relates_to") {
    return;
  }

  const fromType = inferEntityTypeFromId(from);
  const toType = inferEntityTypeFromId(to);

  // If we cannot infer one side from ID prefix, defer to downstream existence/type checks.
  if (!fromType || !toType) {
    return;
  }

  const valid = VALID_RELATIONSHIP_DIRECTIONS.some(
    (rule) =>
      rule.type === type && rule.from === fromType && rule.to === toType,
  );
  if (!valid) {
    const allowed = VALID_RELATIONSHIP_DIRECTIONS.filter(
      (rule) => rule.type === type,
    )
      .map((rule) => `${rule.from} -> ${rule.to}`)
      .join(", ");
    throw new ManifestError(
      `Invalid relationship direction for \"${type}\": ${fromType} -> ${toType}. Allowed: ${allowed}`,
      filePath,
    );
  }
}

export class ManifestError extends Error {
  constructor(
    message: string,
    public filePath: string,
    public readonly classification?: "coordinate-artifact",
  ) {
    super(message);
    this.name = "ManifestError";
  }
}

export interface ManifestSymbolRecord {
  id?: string;
  title?: string;
  source?: string;
  sourceFile?: string;
  status?: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  text_ref?: string;
  granularity_reason?: string;
  created_at?: string;
  updated_at?: string;
  links?: Array<string | { type: string; target: string }>;
  relationships?: Array<{ type: string; target: string }>;
  sourceLine?: number;
  sourceColumn?: number;
  sourceEndLine?: number;
  sourceEndColumn?: number;
  coordinatesGeneratedAt?: string;
  [key: string]: unknown;
}

interface ManifestFile {
  symbols?: ManifestSymbolRecord[];
}

function getManifestSymbols(
  manifest: ManifestFile,
  filePath: string,
): ManifestSymbolRecord[] {
  if (!manifest.symbols || !Array.isArray(manifest.symbols)) {
    throw new ManifestError("No symbols array found in manifest", filePath);
  }

  return manifest.symbols;
}

function extractRelationships(
  id: string,
  symbol: ManifestSymbolRecord,
  filePath: string,
): ExtractedRelationship[] {
  const relationships: ExtractedRelationship[] = [];

  if (Array.isArray(symbol.links)) {
    for (const link of symbol.links) {
      if (typeof link === "string") {
        relationships.push({
          type: "implements",
          from: id,
          to: link,
        });
      } else if (link !== null && typeof link === "object") {
        const typedLink = link as { type?: unknown; target?: unknown };
        if (
          typeof typedLink.type === "string" &&
          typeof typedLink.target === "string"
        ) {
          validateRelationshipType(typedLink.type, filePath);
          validateRelationshipDirection(
            typedLink.type,
            id,
            typedLink.target,
            filePath,
          );
          relationships.push({
            type: typedLink.type,
            from: id,
            to: typedLink.target,
          });
        }
      }
    }
  }

  if (Array.isArray(symbol.relationships)) {
    for (const rel of symbol.relationships) {
      if (
        rel &&
        typeof rel.type === "string" &&
        typeof rel.target === "string"
      ) {
        validateRelationshipType(rel.type, filePath);
        validateRelationshipDirection(rel.type, id, rel.target, filePath);
        relationships.push({
          type: rel.type,
          from: id,
          to: rel.target,
        });
      }
    }
  }

  return relationships;
}

function extractFromParsedManifest(
  manifest: ManifestFile,
  filePath: string,
): ExtractionResult[] {
  return extractManifestSymbolRecords(
    getManifestSymbols(manifest, filePath),
    filePath,
  );
}

/**
 * Convert overlay-merged manifest symbol records into extraction results.
 * Exported so mutation flows can re-extract one canonical entity from the
 * authored manifest plus generated coordinate artifact before committing.
 */
// implements REQ-generated-coordinate-persistence
export function extractManifestSymbolRecords(
  manifestSymbols: ManifestSymbolRecord[],
  filePath: string,
): ExtractionResult[] {
  return manifestSymbols.map((symbol) => {
    if (!symbol.title) {
      throw new ManifestError("Missing required field: title", filePath);
    }

    const id = symbol.id || generateId(filePath, symbol.title);
    const entity: ExtractedEntity = {
      id,
      type: "symbol",
      title: symbol.title,
      status: symbol.status || "active",
      created_at: symbol.created_at || new Date().toISOString(),
      updated_at: symbol.updated_at || new Date().toISOString(),
      source: filePath,
      ...(symbol.tags !== undefined ? { tags: symbol.tags } : {}),
      ...(symbol.owner !== undefined ? { owner: symbol.owner } : {}),
      ...(symbol.priority !== undefined ? { priority: symbol.priority } : {}),
      ...(symbol.severity !== undefined ? { severity: symbol.severity } : {}),
      ...(symbol.text_ref !== undefined ? { text_ref: symbol.text_ref } : {}),
      ...(symbol.granularity_reason !== undefined
        ? { granularity_reason: symbol.granularity_reason }
        : {}),
      ...(typeof symbol.symbol_kind === "string"
        ? { symbol_kind: symbol.symbol_kind }
        : {}),
      ...(typeof symbol.symbol_role === "string"
        ? { symbol_role: symbol.symbol_role }
        : {}),
      ...(typeof symbol.sourceLine === "number"
        ? { sourceLine: symbol.sourceLine }
        : {}),
      ...(typeof symbol.sourceColumn === "number"
        ? { sourceColumn: symbol.sourceColumn }
        : {}),
      ...(typeof symbol.sourceEndLine === "number"
        ? { sourceEndLine: symbol.sourceEndLine }
        : {}),
      ...(typeof symbol.sourceEndColumn === "number"
        ? { sourceEndColumn: symbol.sourceEndColumn }
        : {}),
    };
    const sourceFile = symbol.sourceFile ?? symbol.source;

    return {
      entity,
      relationships: extractRelationships(id, symbol, filePath),
      ...(sourceFile !== undefined ? { sourceFile } : {}),
    };
  });
}

function cloneManifestSymbols(
  manifest: ManifestFile,
  filePath: string,
): ManifestSymbolRecord[] {
  return getManifestSymbols(manifest, filePath).map((symbol) => ({
    ...symbol,
  }));
}

// implements REQ-007
export function extractFromManifestString(
  content: string,
  filePath: string,
): ExtractionResult[] {
  try {
    const manifest = parseYAML(content) as ManifestFile;

    return extractFromParsedManifest(manifest, filePath);
  } catch (error) {
    if (error instanceof ManifestError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ManifestError(
        `Failed to parse manifest: ${error.message}`,
        filePath,
      );
    }

    throw error;
  }
}

export function extractManifestSymbolRecordsString(
  content: string,
  filePath: string,
): ManifestSymbolRecord[] {
  try {
    const manifest = parseYAML(content) as ManifestFile;

    return cloneManifestSymbols(manifest, filePath);
  } catch (error) {
    if (error instanceof ManifestError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new ManifestError(
        `Failed to parse manifest: ${error.message}`,
        filePath,
      );
    }

    throw error;
  }
}

export function extractFromManifest(filePath: string): ExtractionResult[] {
  return extractManifestSymbolRecords(
    readManifestWithCoordinateOverlay(filePath),
    filePath,
  );
}

function resolveCoordinatesPath(
  manifestPath: string,
  coordinatesPath?: string,
): string {
  if (coordinatesPath) {
    return coordinatesPath;
  }

  return path.join(
    path.dirname(manifestPath),
    path.basename(DEFAULT_COORDINATES_PATH),
  );
}

function readCoordinateArtifactFromFile(
  coordinatesPath: string,
): ParsedCoordinateArtifact | null {
  if (!existsSync(coordinatesPath)) {
    return null;
  }

  try {
    const parsed = parseCoordinateArtifact(
      readFileSync(coordinatesPath, "utf8"),
    );
    if (parsed.status === "invalid") {
      throw new ManifestError(
        parsed.reason,
        coordinatesPath,
        "coordinate-artifact",
      );
    }
    return parsed;
  } catch (error) {
    if (error instanceof Error && !(error instanceof ManifestError)) {
      throw new ManifestError(
        `Failed to parse coordinate artifact: ${error.message}`,
        coordinatesPath,
        "coordinate-artifact",
      );
    }
    throw error;
  }
}

/** Resolve workspace-relative source files used to validate bound coordinates. */
function sourceTextResolver(
  manifestPath: string,
): (sourceFile: string) => string | null {
  const bases = [process.cwd()];
  const grandparent = path.resolve(path.dirname(path.dirname(manifestPath)));
  if (!bases.includes(grandparent)) bases.push(grandparent);
  return (sourceFile: string) => {
    let resolved: string | null = null;
    for (const base of bases) {
      const absolute = path.isAbsolute(sourceFile)
        ? sourceFile
        : path.resolve(base, sourceFile);
      if (!existsSync(absolute)) continue;
      try {
        const content = readFileSync(absolute, "utf8");
        if (typeof content === "string") {
          resolved = content;
          break;
        }
      } catch {
        // Try the next resolution base.
      }
    }
    return resolved;
  };
}

// implements REQ-core-extractors
export function readManifestWithCoordinateOverlay(
  manifestPath: string,
  coordinatesPath?: string,
): ManifestSymbolRecord[] {
  const manifestContent = readFileSync(manifestPath, "utf8");
  const manifestRecords = extractManifestSymbolRecordsString(
    manifestContent,
    manifestPath,
  );
  const coordinateArtifact = readCoordinateArtifactFromFile(
    resolveCoordinatesPath(manifestPath, coordinatesPath),
  );

  return mergeCoordinatesWithManifest(manifestRecords, coordinateArtifact, {
    resolveSourceText: sourceTextResolver(manifestPath),
  });
}

function generateId(filePath: string, title: string): string {
  const hash = createHash("sha256");
  hash.update(`${filePath}:${title}`);
  return hash.digest("hex").substring(0, 16);
}
