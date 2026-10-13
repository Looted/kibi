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
  existsSync,
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
// implements REQ-cli-schema-migration
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
// implements REQ-cli-schema-migration
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
// implements REQ-cli-schema-migration
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function topLevelFieldPattern(key: string): RegExp {
  return new RegExp(`^${key}[ \\t]*:[^\\r\\n]*`, "m");
}

/**
 * The value of one top-level frontmatter key, read from its own line without
 * parsing the whole document (test files carry large receipt histories).
 * Falls back to a full parse when the value spans several lines. Returns
 * `undefined` when the key is absent or the frontmatter does not parse.
 */
// implements REQ-cli-schema-migration
export function readTopLevelField(frontmatter: string, key: string): unknown {
  const match = topLevelFieldPattern(key).exec(frontmatter);
  if (match === null) return undefined;
  const after = frontmatter.slice(match.index + match[0].length);
  const continues = /^\r?\n[ \t]+\S/.test(after);
  try {
    if (!continues) {
      const parsed = loadYaml(match[0]);
      if (isRecord(parsed)) return parsed[key];
    }
    const parsed = loadYaml(frontmatter);
    return isRecord(parsed) ? parsed[key] : undefined;
  } catch {
    return undefined;
  }
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

function scalarLine(key: string, value: string, previous: string): string {
  const quoted = `${key}: ${doubleQuotedScalar(value)}`;
  if (value.includes("---")) return quoted;
  const raw = previous.slice(previous.indexOf(":") + 1).trim();
  if (raw.startsWith('"')) return quoted;
  if (raw.startsWith("'")) return `${key}: '${value.replaceAll("'", "''")}'`;
  try {
    const plain = loadYaml(`${key}: ${value}`);
    if (isRecord(plain) && plain[key] === value) return `${key}: ${value}`;
  } catch {
    // Fall through to a quoted scalar.
  }
  return quoted;
}

/**
 * Whether `document` reads back, through the same frontmatter split, as
 * exactly `expected` with the closing delimiter and body of `original`
 * unchanged, and without a new `---` in its frontmatter that a reader
 * splitting on any `---` would cut on.
 */
function readsBackAs(
  document: string,
  expected: Record<string, unknown>,
  original: FrontmatterSlice,
): boolean {
  const slice = sliceFrontmatter(document);
  if (slice === null || slice.suffix !== original.suffix) return false;
  if (slice.text.includes("---") && !original.text.includes("---")) {
    return false;
  }
  try {
    return isDeepStrictEqual(loadYaml(slice.text), expected);
  } catch {
    return false;
  }
}

/**
 * Set one top-level scalar frontmatter key, leaving every other byte of the
 * document unchanged: the key's line is replaced in place, or appended as the
 * last frontmatter key when absent. Returns null when the key spans several
 * lines or the edit would not read back as exactly that change: the written
 * document is split and parsed again and must yield the same frontmatter and
 * the same body.
 */
// implements REQ-cli-schema-migration
export function withTopLevelField(
  content: string,
  key: string,
  value: string,
): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  const match = topLevelFieldPattern(key).exec(slice.text);
  let text: string;
  if (match === null) {
    text = `${slice.text}${scalarLine(key, value, "")}${slice.eol}`;
  } else {
    const after = slice.text.slice(match.index + match[0].length);
    if (/^\r?\n[ \t]+\S/.test(after)) return null;
    text = `${slice.text.slice(0, match.index)}${scalarLine(key, value, match[0])}${after}`;
  }
  try {
    const before = loadYaml(slice.text);
    const next = loadYaml(text);
    if (!isRecord(before) || !isRecord(next) || next[key] !== value) {
      return null;
    }
    const { [key]: _beforeValue, ...beforeRest } = before;
    const { [key]: _nextValue, ...nextRest } = next;
    if (!isDeepStrictEqual(beforeRest, nextRest)) return null;
    const document = `${slice.prefix}${text}${slice.suffix}`;
    return readsBackAs(document, next, slice) ? document : null;
  } catch {
    return null;
  }
}

function frontmatterRecord(text: string): Record<string, unknown> | null {
  const parsed = loadYaml(text);
  if (parsed === undefined || parsed === null) return {};
  return isRecord(parsed) ? parsed : null;
}

/**
 * Remove one top-level scalar frontmatter key, leaving every other byte of
 * the document unchanged: only the key's line and its line break go. Returns
 * the content unchanged when the key is absent. Returns null when the key
 * spans several lines or the edit would not read back as exactly that
 * change (the key gone, every other key parsing identically).
 */
// implements REQ-kibi-schema6-migration
export function withoutTopLevelField(
  content: string,
  key: string,
): string | null {
  const slice = sliceFrontmatter(content);
  if (slice === null) return null;
  const match = topLevelFieldPattern(key).exec(slice.text);
  let text = slice.text;
  if (match !== null) {
    const after = slice.text.slice(match.index + match[0].length);
    if (/^\r?\n[ \t]+\S/.test(after)) return null;
    text = `${slice.text.slice(0, match.index)}${after.replace(/^\r?\n/, "")}`;
  }
  try {
    const before = frontmatterRecord(slice.text);
    const next = frontmatterRecord(text);
    if (before === null || next === null || Object.hasOwn(next, key)) {
      return null;
    }
    const { [key]: _beforeValue, ...beforeRest } = before;
    if (!isDeepStrictEqual(beforeRest, next)) return null;
  } catch {
    return null;
  }
  return match === null ? content : `${slice.prefix}${text}${slice.suffix}`;
}

const KB_ROOT_DIRNAME = ".kb";

/**
 * Replace a file's bytes atomically. A migration rewrite of an untracked
 * `.kb/` source also rebinds its pending-source receipt, so the next sync
 * reads the rewritten file instead of refusing it as hash drift.
 */
// implements REQ-cli-schema-migration
export function writeFileAtomically(filePath: string, content: string): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.kibi-migrate-${process.pid}-${Date.now()}`;
  writeFileSync(tempPath, content, "utf8");
  renameSync(tempPath, filePath);
  const source = kbSourceLocation(filePath);
  if (source === null) return;
  republishPendingSourceReceipt(
    source.workspaceRoot,
    source.relativePath,
    createHash("sha256").update(content, "utf8").digest("hex"),
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
  if (index <= 0) return null;
  const workspaceRoot = segments.slice(0, index).join(path.sep) || path.sep;
  return {
    workspaceRoot,
    relativePath: segments.slice(index).join("/"),
  };
}

// implements REQ-cli-schema-migration
export function readText(filePath: string): string | null {
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}
