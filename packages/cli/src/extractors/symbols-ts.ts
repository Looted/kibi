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

 Notes:
 - Apply the header to the source files (TS/JS/other) in `packages/*/src` before building.
 - For small CLI wrapper scripts (e.g. `packages/*/bin/*`) you can add the header as a block comment directly above the shebang line or below it; if you need the shebang to remain the very first line, place the header after the shebang.
 - Built `dist/` files are generated; prefer to modify source files and rebuild rather than editing `dist/` directly.

*/

import * as fs from "node:fs";
import * as path from "node:path";
import {
  type ClassDeclaration,
  type Node,
  Project,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";

export interface SymbolCoordinates {
  sourceLine: number;
  sourceColumn: number;
  sourceEndLine: number;
  sourceEndColumn: number;
  coordinatesGeneratedAt: string;
}

export interface ManifestSymbolEntry {
  id: string;
  title: string;
  sourceFile?: string;
  sourceLine?: number;
  sourceColumn?: number;
  sourceEndLine?: number;
  sourceEndColumn?: number;
  coordinatesGeneratedAt?: string;
  links?: string[];
  [key: string]: unknown;
}

const SUPPORTED_SOURCE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mts",
  ".cts",
  ".mjs",
  ".cjs",
]);

export async function enrichSymbolCoordinatesWithTsMorph(
  entries: ManifestSymbolEntry[],
  workspaceRoot: string,
): Promise<ManifestSymbolEntry[]> {
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
  });
  const sourceFileCache = new Map<string, SourceFile>();

  const enriched: ManifestSymbolEntry[] = [];

  for (const entry of entries) {
    try {
      const resolved = resolveSourcePath(entry.sourceFile, workspaceRoot);
      if (!resolved) {
        enriched.push(entry);
        continue;
      }

      const sourceFile = getOrAddSourceFile(project, sourceFileCache, resolved);
      if (!sourceFile) {
        enriched.push(entry);
        continue;
      }

      const match = findNamedDeclaration(sourceFile, entry.title);
      if (!match) {
        enriched.push(entry);
        continue;
      }

      const nameStart = match.getNameNode().getStart();
      const end = match.node.getEnd();

      const startLc = sourceFile.getLineAndColumnAtPos(nameStart);
      const endLc = sourceFile.getLineAndColumnAtPos(end);

      const coordinates: SymbolCoordinates = {
        sourceLine: startLc.line,
        sourceColumn: Math.max(0, startLc.column - 1),
        sourceEndLine: endLc.line,
        sourceEndColumn: Math.max(0, endLc.column - 1),
        coordinatesGeneratedAt: new Date().toISOString(),
      };

      enriched.push({
        ...entry,
        ...coordinates,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[kibi] Failed to enrich symbol coordinates for ${entry.id}: ${message}`,
      );
      enriched.push(entry);
    }
  }

  return enriched;
}

function resolveSourcePath(
  sourceFile: string | undefined,
  workspaceRoot: string,
): string | null {
  if (!sourceFile) return null;

  const absolute = path.isAbsolute(sourceFile)
    ? sourceFile
    : path.resolve(workspaceRoot, sourceFile);
  const ext = path.extname(absolute).toLowerCase();

  if (!SUPPORTED_SOURCE_EXTENSIONS.has(ext)) return null;
  if (!fs.existsSync(absolute)) return null;

  return absolute;
}

function getOrAddSourceFile(
  project: Project,
  cache: Map<string, SourceFile>,
  absolutePath: string,
): SourceFile | null {
  const cached = cache.get(absolutePath);
  if (cached) return cached;

  try {
    const sourceFile = project.addSourceFileAtPath(absolutePath);
    cache.set(absolutePath, sourceFile);
    return sourceFile;
  } catch {
    return null;
  }
}

type NamedDeclarationCandidate = Node | ClassDeclaration | VariableDeclaration;

function findNamedDeclaration(
  sourceFile: SourceFile,
  title: string,
): { node: NamedDeclarationCandidate; getNameNode: () => Node } | null {
  const candidates: Array<{
    node: NamedDeclarationCandidate;
    getNameNode: () => Node;
  }> = [];

  for (const decl of sourceFile.getFunctions()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getClasses()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getInterfaces()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getTypeAliases()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const decl of sourceFile.getEnums()) {
    if (!decl.isExported()) continue;
    if (decl.getName() !== title) continue;
    const nameNode = decl.getNameNode();
    if (!nameNode) continue;
    candidates.push({ node: decl, getNameNode: () => nameNode });
  }

  for (const statement of sourceFile.getVariableStatements()) {
    if (!statement.isExported()) continue;

    for (const declaration of statement.getDeclarations()) {
      if (declaration.getName() !== title) continue;
      const nameNode = declaration.getNameNode();
      candidates.push({ node: declaration, getNameNode: () => nameNode });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort(
    (a, b) => a.getNameNode().getStart() - b.getNameNode().getStart(),
  );
  return candidates[0] ?? null;
}
