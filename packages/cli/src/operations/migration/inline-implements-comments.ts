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

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { load as parseYAML } from "js-yaml";
import { hasDeclarationExtractor } from "../../plugins/source-classification.js";
import type { MigrationActionInput } from "../../public/operations/schema6-check-actions.js";
import { KB_PATHS } from "../../utils/kb-paths.js";

/**
 * Inline `// implements REQ-...` comments left from Kibi versions that read
 * them. No check reads them any more: the symbol manifest is the only record
 * of which requirements a symbol implements. `kibi migrate` lists the
 * comments still in tracked source files as one review action, so a person
 * moves each link that still holds into the manifest and deletes the comment.
 * Kibi never edits source code, so it never removes a comment itself.
 */

/** Review action code for the inline implements comments left in source. */
export const INLINE_IMPLEMENTS_REVIEW_CODE = "review_inline_implements_comment";
export const INLINE_IMPLEMENTS_REVIEW_ACTION_ID =
  "review-inline-implements-comments";

/** Comments listed in the action's evidence; the total counts all of them. */
export const INLINE_IMPLEMENTS_EVIDENCE_LIMIT = 200;

/** Files larger than this are not read: no hand-written source is. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Shell scripts have no declaration extractor but did carry comments. */
const EXTRA_SOURCE_EXTENSIONS = new Set([".sh", ".bash"]);

/** An entity id: an uppercase prefix, a hyphen and a slug (REQ-cli-check). */
const ENTITY_ID = "[A-Z][A-Z0-9_]*-[A-Za-z0-9_-]+";

/**
 * A comment whose text is exactly `implements` and a list of entity ids,
 * either on its own line or trailing code, in any line-comment or block
 * comment syntax Kibi's languages use. Plain prose such as "this class
 * implements Runnable" names no entity id and does not match.
 */
const INLINE_IMPLEMENTS = new RegExp(
  `(?:^|\\s|;)(?:\\/\\/+|#+|%+|\\/\\*+|\\*|--)\\s*(?:implements|Implements|IMPLEMENTS)(?:\\s*:\\s*|\\s+)(${ENTITY_ID}(?:\\s*,\\s*${ENTITY_ID})*)\\s*(?:\\*\\/)?\\s*$`,
);

export type InlineImplementsComment = Readonly<{
  /** Workspace-relative path with forward slashes. */
  file: string;
  /** 1-based line number. */
  line: number;
  /** Entity ids the comment names, in order, without duplicates. */
  requirements: readonly string[];
  /**
   * The named ids some manifest symbol of the same source file already links
   * with `implements`; for those, deleting the comment loses nothing.
   */
  manifestLinked: readonly string[];
}>;

/** The ids an inline implements comment on this line names, or none. */
export function parseInlineImplementsComment(line: string): string[] {
  const match = INLINE_IMPLEMENTS.exec(line);
  if (match === null) return [];
  return [...new Set((match[1] as string).split(/\s*,\s*/))];
}

/** True for a tracked path whose comments could have been read as links. */
function isCommentSourcePath(file: string): boolean {
  if (file.startsWith(".kb/")) return false;
  return (
    hasDeclarationExtractor(file) ||
    EXTRA_SOURCE_EXTENSIONS.has(path.extname(file).toLowerCase())
  );
}

/** Tracked files of the workspace's Git repository, or none outside Git. */
function trackedFiles(workspaceRoot: string): string[] {
  try {
    return execFileSync("git", ["ls-files", "-z", "--cached"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\0")
      .filter((file) => file !== "");
  } catch {
    return [];
  }
}

/** Requirement ids each manifest source file links with `implements`. */
function manifestImplementsBySourceFile(
  workspaceRoot: string,
): Map<string, Set<string>> {
  const linked = new Map<string, Set<string>>();
  let parsed: unknown;
  try {
    parsed = parseYAML(
      readFileSync(path.join(workspaceRoot, KB_PATHS.symbolsManifest), "utf8"),
    );
  } catch {
    return linked;
  }
  const symbols = (parsed as { symbols?: unknown } | null)?.symbols;
  if (!Array.isArray(symbols)) return linked;
  for (const symbol of symbols) {
    if (symbol === null || typeof symbol !== "object") continue;
    const record = symbol as Record<string, unknown>;
    if (typeof record.sourceFile !== "string") continue;
    const targets = linked.get(record.sourceFile) ?? new Set<string>();
    for (const field of ["relationships", "links"] as const) {
      const entries = record[field];
      if (!Array.isArray(entries)) continue;
      for (const entry of entries) {
        if (typeof entry === "string") {
          // A plain `links:` entry is a legacy implements link.
          if (field === "links") targets.add(entry);
        } else if (
          entry !== null &&
          typeof entry === "object" &&
          (entry as { type?: unknown }).type === "implements" &&
          typeof (entry as { target?: unknown }).target === "string"
        ) {
          targets.add((entry as { target: string }).target);
        }
      }
    }
    linked.set(record.sourceFile, targets);
  }
  return linked;
}

/**
 * Every inline implements comment in the workspace's tracked source files,
 * sorted by file and line. A workspace outside Git has no tracked files and
 * so reports none.
 */
export function findInlineImplementsComments(
  workspaceRoot: string,
  files: readonly string[] = trackedFiles(workspaceRoot),
): InlineImplementsComment[] {
  const linked = manifestImplementsBySourceFile(workspaceRoot);
  const comments: InlineImplementsComment[] = [];
  for (const file of [...files].sort()) {
    if (!isCommentSourcePath(file)) continue;
    const absolute = path.join(workspaceRoot, file);
    let content: string;
    try {
      if (statSync(absolute).size > MAX_FILE_BYTES) continue;
      content = readFileSync(absolute, "utf8");
    } catch {
      // A tracked file deleted from the working tree has nothing to review.
      continue;
    }
    const fileLinks = linked.get(file);
    const lines = content.split(/\r\n|\n|\r/);
    for (const [index, text] of lines.entries()) {
      const requirements = parseInlineImplementsComment(text);
      if (requirements.length === 0) continue;
      comments.push({
        file,
        line: index + 1,
        requirements,
        manifestLinked: requirements.filter((id) => fileLinks?.has(id)),
      });
    }
  }
  return comments;
}

/**
 * One review action for the comments, or null when there are none. The
 * evidence lists the first comments; the instruction gives the total.
 */
export function inlineImplementsReviewAction(
  comments: readonly InlineImplementsComment[],
): MigrationActionInput | null {
  if (comments.length === 0) return null;
  const files = [...new Set(comments.map((comment) => comment.file))].sort();
  const requirements = [
    ...new Set(comments.flatMap((comment) => comment.requirements)),
  ].sort();
  const alreadyLinked = comments.filter(
    (comment) => comment.manifestLinked.length === comment.requirements.length,
  ).length;
  const listed = comments.slice(0, INLINE_IMPLEMENTS_EVIDENCE_LIMIT);
  return {
    id: INLINE_IMPLEMENTS_REVIEW_ACTION_ID,
    code: INLINE_IMPLEMENTS_REVIEW_CODE,
    category: "symbol",
    safety: "review",
    invocation: {
      kind: "review",
      instruction: `${comments.length} inline implements comment(s) in ${files.length} source file(s) name requirements, and Kibi no longer reads them: only .kb/symbols.yaml links a symbol to a requirement, so kibi check --staged now blocks a changed symbol whose only link was a comment. ${alreadyLinked} of them name only requirements a manifest symbol of the same file already implements. For each comment, when the code under it still implements a requirement that manifestLinked does not list, kb_upsert that symbol (title, sourceFile, implements -> the requirement); then delete the comment. Kibi does not edit source code, so the comments stay until you remove them.${comments.length > listed.length ? ` Evidence lists the first ${listed.length}; rerun kibi migrate for the rest.` : ""}`,
    },
    affectedEntityIds: requirements,
    affectedFiles: files,
    dispositionRequired: true,
    evidence: { comments: listed, total: comments.length },
  };
}
