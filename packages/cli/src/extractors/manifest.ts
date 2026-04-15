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
import { readFileSync } from "node:fs";
import { load as parseYAML } from "js-yaml";

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
}

export interface ExtractedRelationship {
  type: string;
  from: string;
  to: string;
}

export interface ExtractionResult {
  entity: ExtractedEntity;
  relationships: ExtractedRelationship[];
  /** The per-symbol source code file, distinct from the manifest file path. */
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

interface ManifestSymbol {
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
  created_at?: string;
  updated_at?: string;
  links?: Array<string | { type: string; target: string }>;
  relationships?: Array<{ type: string; target: string }>;
}

interface ManifestFile {
  symbols?: ManifestSymbol[];
}

function extractRelationships(
  id: string,
  symbol: ManifestSymbol,
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
  if (!manifest.symbols || !Array.isArray(manifest.symbols)) {
    throw new ManifestError("No symbols array found in manifest", filePath);
  }

  return manifest.symbols.map((symbol) => {
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
    };
    const sourceFile = symbol.sourceFile ?? symbol.source;

    return {
      entity,
      relationships: extractRelationships(id, symbol),
      ...(sourceFile !== undefined ? { sourceFile } : {}),
    };
  });
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

export function extractFromManifest(filePath: string): ExtractionResult[] {
  const content = readFileSync(filePath, "utf8");
  return extractFromManifestString(content, filePath);
}

function generateId(filePath: string, title: string): string {
  const hash = createHash("sha256");
  hash.update(`${filePath}:${title}`);
  return hash.digest("hex").substring(0, 16);
}
