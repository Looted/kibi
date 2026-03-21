// implements REQ-opencode-kibi-plugin-v1

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Normalize line endings to LF and strip BOM if present.
 */
function normalizeContent(content: string): string {
  const normalized =
    content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
  return normalized.replace(/\r\n/g, "\n");
}

/**
 * Check if a path is absolute (cross-platform).
 */
function isAbsolutePath(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * Parse frontmatter from markdown content.
 * Returns null if no valid frontmatter found.
 * Handles CRLF line endings and BOM markers.
 */
function parseFrontmatter(content: string): Record<string, unknown> | null {
  const normalized = normalizeContent(content);
  const match = normalized.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatterText = match[1];
  const result: Record<string, unknown> = {};

  // Simple YAML-like parsing for top-level scalar values only
  // Handles inline comments by ignoring everything after # (unless quoted)
  for (const rawLine of frontmatterText.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Strip inline comments (simple heuristic: unquoted #)
    const commentMatch = value.match(/^(.*?)\s+#\s/);
    if (commentMatch && !isInsideQuotes(value, commentMatch[1].length)) {
      value = commentMatch[1].trim();
    }

    if (key && value) {
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        result[key] = value.slice(1, -1);
      } else if (value === "true") {
        result[key] = true;
      } else if (value === "false") {
        result[key] = false;
      } else if (/^-?\d+$/.test(value)) {
        result[key] = Number(value);
      } else {
        result[key] = value;
      }
    }
  }

  return result;
}

/**
 * Check if a position is inside quotes in a string.
 * Simple check: odd number of unescaped quotes before position.
 */
function isInsideQuotes(str: string, pos: number): boolean {
  let count = 0;
  let escaped = false;
  for (let i = 0; i < pos; i++) {
    const char = str[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (char === "\\") {
      escaped = true;
      continue;
    }
    if (char === '"' || char === "'") {
      count++;
    }
  }
  return count % 2 === 1;
}

/**
 * Read a requirement file and determine if it has priority: must.
 * Returns false on any error (file not found, parse failure, etc.)
 * Handles CRLF line endings, BOM markers, and cross-platform paths.
 */
export function isMustPriorityRequirement(
  // implements REQ-opencode-kibi-plugin-v1
  filePath: string,
  worktree?: string,
): boolean {
  try {
    const resolvedPath =
      worktree && !isAbsolutePath(filePath)
        ? path.join(worktree, filePath)
        : filePath;

    const content = fs.readFileSync(resolvedPath, "utf-8");
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) return false;

    return frontmatter.priority === "must";
  } catch {
    // Conservative fallback: treat as non-must on any error
    return false;
  }
}

/**
 * Inspect requirement file frontmatter.
 * Returns the priority value or null if not found/unparseable.
 * Handles CRLF line endings, BOM markers, and cross-platform paths.
 */
export function getRequirementPriority(
  // implements REQ-opencode-kibi-plugin-v1
  filePath: string,
  worktree?: string,
): string | null {
  try {
    const resolvedPath =
      worktree && !isAbsolutePath(filePath)
        ? path.join(worktree, filePath)
        : filePath;

    const content = fs.readFileSync(resolvedPath, "utf-8");
    const frontmatter = parseFrontmatter(content);

    if (!frontmatter) return null;

    const priority = frontmatter.priority;
    return typeof priority === "string" ? priority : null;
  } catch {
    return null;
  }
}
