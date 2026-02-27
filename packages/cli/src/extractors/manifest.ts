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

/*
 How to apply this header to source files (examples)

 1) Prepend header to a single file (POSIX shells):

    cat LICENSE_HEADER.txt "$FILE" > "$FILE".with-header && mv "$FILE".with-header "$FILE"

 2) Apply to multiple files (example: the project's main entry files):

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp packages/cli/src/*.ts packages/mcp/src/*.ts; do
      if [ -f "$f" ]; then
        cp "$f" "$f".bak
        (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
      fi
    done

 3) Avoid duplicating the header: run a quick guard to only add if missing

    for f in packages/cli/bin/kibi packages/mcp/bin/kibi-mcp; do
      if [ -f "$f" ]; then
        if ! head -n 5 "$f" | grep -q "Copyright (C) 2026 Piotr Franczyk"; then
          cp "$f" "$f".bak
          (cat LICENSE_HEADER.txt; echo; cat "$f" ) > "$f".new && mv "$f".new "$f"
        fi
      fi
    done
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
  links?: unknown[];
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

interface RelationshipObject {
  type?: string;
  target?: string;
}

interface ManifestSymbol {
  id?: string;
  title?: string;
  source?: string;
  status?: string;
  tags?: string[];
  owner?: string;
  priority?: string;
  severity?: string;
  links?: unknown[];
  relationships?: RelationshipObject[];
  text_ref?: string;
  created_at?: string;
  updated_at?: string;
}

interface ManifestFile {
  symbols?: ManifestSymbol[];
}

export function extractFromManifest(filePath: string): ExtractionResult[] {
  try {
    const content = readFileSync(filePath, "utf8");
    const manifest = parseYAML(content) as ManifestFile;

    if (!manifest.symbols || !Array.isArray(manifest.symbols)) {
      throw new ManifestError("No symbols array found in manifest", filePath);
    }

    return manifest.symbols.map((symbol) => {
      if (!symbol.title) {
        throw new ManifestError("Missing required field: title", filePath);
      }

      const id = symbol.id || generateId(filePath, symbol.title);
      const relationships = extractRelationships(
        symbol.relationships || symbol.links || [],
        id,
      );

      return {
        entity: {
          id,
          type: "symbol",
          title: symbol.title,
          status: symbol.status || "draft",
          created_at: symbol.created_at || new Date().toISOString(),
          updated_at: symbol.updated_at || new Date().toISOString(),
          source: filePath,
          tags: symbol.tags,
          owner: symbol.owner,
          priority: symbol.priority,
          severity: symbol.severity,
          links: symbol.links,
          text_ref: symbol.text_ref,
        },
        relationships,
      };
    });
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

function generateId(filePath: string, title: string): string {
  const hash = createHash("sha256");
  hash.update(`${filePath}:${title}`);
  return hash.digest("hex").substring(0, 16);
}

interface LinkObject {
  type?: string;
  target?: string;
  id?: string;
  to?: string;
}

function extractRelationships(
  links: unknown[],
  fromId: string,
): ExtractedRelationship[] {
  if (!Array.isArray(links)) return [];

  return links.map((link) => {
    if (typeof link === "string") {
      return {
        type: "relates_to",
        from: fromId,
        to: link,
      };
    }

    const linkObj = link as LinkObject;
    return {
      type: linkObj.type || "relates_to",
      from: fromId,
      to: linkObj.target || linkObj.id || linkObj.to || "",
    };
  });
}
