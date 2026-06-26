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

import * as path from "node:path";
import fg from "fast-glob";
import { getRelationshipsDir } from "../../extractors/relationships.js";
import type { KbConfigPaths } from "../../utils/config.js";

const MARKDOWN_DISCOVERY_IGNORE = ["**/README.md"] as const;

export function normalizeMarkdownPath(
  pattern: string | undefined,
): string | null {
  if (!pattern) return null;
  if (pattern.includes("*")) return pattern;
  return `${pattern}/**/*.md`;
}

export async function discoverSourceFiles(
  cwd: string,
  paths: KbConfigPaths,
): Promise<{
  markdownFiles: string[];
  manifestFiles: string[];
  relationshipsDir: string;
}> {
  const markdownPatterns = [
    normalizeMarkdownPath(paths.requirements),
    normalizeMarkdownPath(paths.scenarios),
    normalizeMarkdownPath(paths.tests),
    normalizeMarkdownPath(paths.adr),
    normalizeMarkdownPath(paths.flags),
    normalizeMarkdownPath(paths.events),
    normalizeMarkdownPath(paths.facts),
  ].filter((p): p is string => Boolean(p));

  const markdownFiles = await fg(markdownPatterns, {
    cwd,
    absolute: true,
    ignore: [...MARKDOWN_DISCOVERY_IGNORE],
  });
  const entityMarkdownFiles = markdownFiles.filter(
    (file) => !file.endsWith("/README.md"),
  );

  const manifestFiles = paths.symbols
    ? await fg(paths.symbols, {
        cwd,
        absolute: true,
      })
    : [];

  const relationshipsDir = getRelationshipsDir(path.join(cwd, ".kb"));

  return { markdownFiles: entityMarkdownFiles, manifestFiles, relationshipsDir };
}
