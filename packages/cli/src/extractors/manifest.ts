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
  type SymbolCoordinatesArtifact,
  mergeCoordinatesWithManifest,
  readCoordinateArtifact,
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

export class ManifestError extends Error {
  constructor(
    message: string,
    public filePath: string,
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
  return extractFromManifestSymbolRecords(
    getManifestSymbols(manifest, filePath),
    filePath,
  );
}

function extractFromManifestSymbolRecords(
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
    };
    const sourceFile = symbol.sourceFile ?? symbol.source;

    return {
      entity,
      relationships: extractRelationships(id, symbol),
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
  return extractFromManifestSymbolRecords(
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
): SymbolCoordinatesArtifact | null {
  if (!existsSync(coordinatesPath)) {
    return null;
  }

  try {
    return readCoordinateArtifact(readFileSync(coordinatesPath, "utf8"));
  } catch (error) {
    if (error instanceof Error) {
      throw new ManifestError(
        `Failed to parse coordinate artifact: ${error.message}`,
        coordinatesPath,
      );
    }

    throw error;
  }
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

  return mergeCoordinatesWithManifest(manifestRecords, coordinateArtifact);
}

function generateId(filePath: string, title: string): string {
  const hash = createHash("sha256");
  hash.update(`${filePath}:${title}`);
  return hash.digest("hex").substring(0, 16);
}
