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
import {
  type Dirent,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { load as loadYaml } from "js-yaml";
import {
  ENTITY_LANES,
  type EntityLane,
  KB_PATHS,
} from "../../utils/kb-paths.js";
import { republishPendingSourceReceipt } from "../mutation/source-authoring.js";

/** One authored Markdown entity file under a canonical `.kb/<lane>/`. */
export type LaneMarkdownFile = Readonly<{
  lane: EntityLane;
  absolutePath: string;
  /** Workspace-relative, `/`-separated. */
  relativePath: string;
}>;

/**
 * Collect the `/`-separated workspace-relative paths of Markdown entity files
 * under `relative`. A missing or unreadable directory holds none.
 */
function walkMarkdown(
  workspaceRoot: string,
  relative: string,
  files: string[],
): void {
  let entries: Dirent[];
  try {
    entries = readdirSync(path.join(workspaceRoot, relative), {
      withFileTypes: true,
    });
  } catch {
    return;
  }
  for (const entry of entries) {
    const child = `${relative}/${entry.name}`;
    if (entry.isDirectory()) {
      walkMarkdown(workspaceRoot, child, files);
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      entry.name !== "README.md"
    ) {
      files.push(child);
    }
  }
}

/** Every authored Markdown entity file in the canonical lanes, sorted. */
export function listLaneMarkdownFiles(
  workspaceRoot: string,
  lanes: readonly EntityLane[] = ENTITY_LANES,
): LaneMarkdownFile[] {
  const result: LaneMarkdownFile[] = [];
  for (const lane of lanes) {
    const files: string[] = [];
    walkMarkdown(workspaceRoot, KB_PATHS.lanes[lane], files);
    for (const relativePath of files.sort()) {
      result.push({
        lane,
        absolutePath: path.join(workspaceRoot, relativePath),
        relativePath,
      });
    }
  }
  return result;
}

/** A lane Markdown file with its text. */
export type LaneMarkdownSource = LaneMarkdownFile &
  Readonly<{ content: string }>;

/**
 * Every authored Markdown entity file in the canonical lanes with its text,
 * sorted. A file that can no longer be read is skipped.
 */
export function listLaneMarkdownSources(
  workspaceRoot: string,
  lanes: readonly EntityLane[] = ENTITY_LANES,
): LaneMarkdownSource[] {
  return listLaneMarkdownFiles(workspaceRoot, lanes).flatMap((file) => {
    const content = readText(file.absolutePath);
    // rationale: the listed files are regular files, so a read only fails when
    // a file vanishes between listing and reading; no test can time that.
    // Stryker disable next-line ConditionalExpression,ArrayDeclaration
    return content === null ? [] : [{ ...file, content }];
  });
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
 * Split a document around its YAML frontmatter: the opening and the closing
 * delimiter are each a whole line holding only `---` (trailing whitespace
 * allowed). A `---` inside a line, such as a Markdown table separator row
 * in a quoted scalar, never ends the frontmatter. Returns null when there is
 * no such opening and closing pair.
 */
export function sliceFrontmatter(content: string): FrontmatterSlice | null {
  const leading = content.length - content.trimStart().length;
  const open = /^---[ \t]*\r?\n/.exec(content.slice(leading));
  if (open === null) return null;
  const openEnd = leading + open[0].length - 1;
  const match = /^---[ \t]*\r?$/m.exec(content.slice(openEnd + 1));
  if (match === null) return null;
  const close = openEnd + 1 + match.index;
  const text = content.slice(openEnd + 1, close);
  return {
    prefix: content.slice(0, openEnd + 1),
    text,
    suffix: content.slice(close),
    eol: text.includes("\r\n") || content[openEnd - 1] === "\r" ? "\r\n" : "\n",
  };
}

function topLevelFieldPattern(key: string): RegExp {
  return new RegExp(`^${key}[ \\t]*:[^\\r\\n]*`, "m");
}

/**
 * The value of one top-level frontmatter key, read from its own line without
 * parsing the whole document (test files carry large receipt histories).
 * Falls back to a full parse when the value spans several lines: indented
 * lines, or a block sequence written at the key's own indentation. Returns
 * `undefined` when the key is absent or the frontmatter does not parse.
 */
export function readTopLevelField(frontmatter: string, key: string): unknown {
  const match = topLevelFieldPattern(key).exec(frontmatter);
  if (match === null) return undefined;
  const after = frontmatter.slice(match.index + match[0].length);
  const continues = /^\r?\n(?:[ \t]+\S|-[ \t\r\n])/.test(after);
  try {
    // A line whose colon is not a separator reads as a string, which has no
    // such field; null or empty front matter throws and reads as undefined.
    return (
      loadYaml(continues ? frontmatter : match[0]) as Record<string, unknown>
    )[key];
  } catch {
    // The front matter does not parse.
  }
  return undefined;
}

/**
 * A YAML double-quoted scalar for `value` with no run of three dashes, so a
 * reader that splits the document on any `---` still finds the frontmatter
 * intact. Every second dash of a run is written as the `\x2D` escape, which
 * YAML reads back as the same dash.
 */
function doubleQuotedScalar(value: string): string {
  return JSON.stringify(value).replace(/-{3,}/g, (run) =>
    [...run].map((dash, index) => (index % 2 === 1 ? "\\x2D" : dash)).join(""),
  );
}

/**
 * The line for `key: value`, in the quote style of the authored value `raw`
 * (absent for a new key). It never holds a line break or a run of three
 * dashes, so it cannot move the closing `---` of the frontmatter.
 */
function scalarLine(key: string, value: string, raw?: string): string {
  const quoted = `${key}: ${doubleQuotedScalar(value)}`;
  if (value.includes("---") || raw?.startsWith('"')) return quoted;
  if (raw?.startsWith("'")) return `${key}: '${value.replaceAll("'", "''")}'`;
  try {
    // `key: ` followed by text reads as a mapping or does not parse.
    const plain = loadYaml(`${key}: ${value}`) as Record<string, unknown>;
    if (plain[key] === value) return `${key}: ${value}`;
  } catch {
    // Fall through to a quoted scalar.
  }
  return quoted;
}

/**
 * Set one top-level scalar frontmatter key, leaving every other byte of the
 * document unchanged: the key's line is replaced in place, or appended as the
 * last frontmatter key when absent. Returns null when the edit would not read
 * back as exactly that change (for example when the value spans several
 * lines, or the frontmatter is not a mapping).
 */
export function withTopLevelField(
  content: string,
  key: string,
  value: string,
): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  const match = topLevelFieldPattern(key).exec(slice.text);
  const text =
    match === null
      ? `${slice.text}${scalarLine(key, value)}${slice.eol}`
      : `${slice.text.slice(0, match.index)}${scalarLine(
          key,
          value,
          match[0].slice(match[0].indexOf(":") + 1).trim(),
        )}${slice.text.slice(match.index + match[0].length)}`;
  try {
    // Empty front matter reads as undefined and throws here.
    const { [key]: _previous, ...rest } = loadYaml(slice.text) as Record<
      string,
      unknown
    >;
    if (!isDeepStrictEqual(loadYaml(text), { ...rest, [key]: value }))
      return null;
  } catch {
    return null;
  }
  return `${slice.prefix}${text}${slice.suffix}`;
}

/**
 * Remove one top-level scalar frontmatter key, leaving every other byte of
 * the document unchanged: only the key's line and its line break go. Returns
 * the content unchanged when the key is absent. Returns null when the edit
 * would not read back as exactly that change (the key gone, every other key
 * parsing identically), or the frontmatter is not a mapping.
 */
export function withoutTopLevelField(
  content: string,
  key: string,
): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  const match = topLevelFieldPattern(key).exec(slice.text);
  // The match stops before its line break, which goes with it.
  const text =
    match === null
      ? slice.text
      : `${slice.text.slice(0, match.index)}${slice.text
          .slice(match.index + match[0].length)
          .replace(/\r?\n/, "")}`;
  try {
    // Empty front matter reads as null; front matter that is not a mapping
    // never equals the rest of one.
    const { [key]: _removed, ...rest } = (loadYaml(slice.text) ?? {}) as Record<
      string,
      unknown
    >;
    if (!isDeepStrictEqual(loadYaml(text) ?? {}, rest)) return null;
  } catch {
    return null;
  }
  return `${slice.prefix}${text}${slice.suffix}`;
}

const KB_ROOT_DIRNAME = ".kb";

/**
 * Replace a file's bytes atomically. A migration rewrite of an untracked
 * `.kb/` source also rebinds its pending-source receipt, so the next sync
 * reads the rewritten file instead of refusing it as hash drift.
 */
export function writeFileAtomically(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.kibi-migrate-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, content);
  renameSync(tempPath, filePath);
  const source = kbSourceLocation(filePath);
  if (source === null) return;
  republishPendingSourceReceipt(
    source.workspaceRoot,
    source.relativePath,
    createHash("sha256").update(content).digest("hex"),
  );
}

/**
 * The workspace root and workspace-relative path of a file under `.kb/`, or
 * `null` for a file outside any knowledge root.
 */
function kbSourceLocation(
  filePath: string,
): { workspaceRoot: string; relativePath: string } | null {
  const absolute = path.resolve(filePath);
  const segments = absolute.split(path.sep);
  const index = segments.lastIndexOf(KB_ROOT_DIRNAME);
  if (index === -1) return null;
  // The parent of the `.kb` directory, which is `/` for `/.kb`.
  const workspaceRoot = path.dirname(
    segments.slice(0, index + 1).join(path.sep),
  );
  return {
    workspaceRoot,
    relativePath: segments.slice(index).join("/"),
  };
}

export function readText(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}
