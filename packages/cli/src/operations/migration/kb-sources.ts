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

import {
  type Dirent,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  ENTITY_LANES,
  type EntityLane,
  KB_PATHS,
} from "../../utils/kb-paths.js";

/** One authored Markdown entity file under a canonical `.kb/<lane>/`. */
export type LaneMarkdownFile = Readonly<{
  lane: EntityLane;
  absolutePath: string;
  /** Workspace-relative, `/`-separated. */
  relativePath: string;
}>;

function walkMarkdown(directory: string, files: string[]): void {
  let entries: Dirent[];
  try {
    entries = readdirSync(directory, { withFileTypes: true, encoding: "utf8" });
  } catch {
    return;
  }
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walkMarkdown(absolute, files);
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      entry.name !== "README.md"
    ) {
      files.push(absolute);
    }
  }
}

/** Every authored Markdown entity file in the canonical lanes, sorted. */
// implements REQ-cli-schema-migration
export function listLaneMarkdownFiles(
  workspaceRoot: string,
  lanes: readonly EntityLane[] = ENTITY_LANES,
): LaneMarkdownFile[] {
  const result: LaneMarkdownFile[] = [];
  for (const lane of lanes) {
    const files: string[] = [];
    const laneRoot = path.join(workspaceRoot, KB_PATHS.lanes[lane]);
    if (!existsSync(laneRoot)) continue;
    walkMarkdown(laneRoot, files);
    for (const absolutePath of files.sort()) {
      result.push({
        lane,
        absolutePath,
        relativePath: path
          .relative(workspaceRoot, absolutePath)
          .replaceAll(path.sep, "/"),
      });
    }
  }
  return result;
}

/** A Markdown document split around its YAML frontmatter. */
export type FrontmatterSlice = Readonly<{
  /** Everything up to and including the opening `---` line. */
  prefix: string;
  /** The frontmatter YAML, ending with a line break. */
  text: string;
  /** The closing `---` line and the body. */
  suffix: string;
  eol: "\n" | "\r\n";
}>;

/**
 * Split a document the way the Markdown extractor reads it: the frontmatter
 * ends at the next `---` after the opening delimiter. Returns null when that
 * `---` is not at the start of a line, because an edit there could not be
 * read back.
 */
// implements REQ-cli-schema-migration
export function sliceFrontmatter(content: string): FrontmatterSlice | null {
  const leading = content.length - content.trimStart().length;
  if (!content.startsWith("---", leading)) return null;
  const openEnd = content.indexOf("\n", leading + 3);
  if (openEnd < 0) return null;
  const close = content.indexOf("---", leading + 3);
  if (close <= openEnd || content[close - 1] !== "\n") return null;
  const text = content.slice(openEnd + 1, close);
  return {
    prefix: content.slice(0, openEnd + 1),
    text,
    suffix: content.slice(close),
    eol: text.includes("\r\n") || content[openEnd - 1] === "\r" ? "\r\n" : "\n",
  };
}

/** Replace a file's bytes atomically. */
export function writeFileAtomically(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.kibi-migrate-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, content, "utf8");
  renameSync(tempPath, filePath);
}

export function readText(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}
