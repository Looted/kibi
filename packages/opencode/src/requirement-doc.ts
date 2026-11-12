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
 * Whether `text` leaves a quote open: an odd number of unescaped quotes.
 */
function hasOpenQuote(text: string): boolean {
  let count = 0;
  let escaped = false;
  for (const char of text) {
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
 * Top-level scalar string values of the markdown frontmatter (empty when
 * there is none). YAML booleans and integers are left out: callers only read
 * string fields. Handles CRLF line endings and BOM markers.
 */
function frontmatterStrings(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = normalizeContent(content).match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return result;

  // The capture group always participates when the pattern matches.
  for (const line of (match[1] as string).split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();

    // Strip an unquoted inline comment. The lazy prefix never ends in
    // whitespace, so it needs no second trim.
    const commentValue = value.match(/(.*?)\s+#\s/)?.[1];
    if (commentValue !== undefined && !hasOpenQuote(commentValue)) {
      value = commentValue;
    }

    if (
      !value ||
      value === "true" ||
      value === "false" ||
      /^-?\d+$/.test(value)
    ) {
      continue;
    }
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    result[key] = quoted ? value.slice(1, -1) : value;
  }

  return result;
}

/** Frontmatter strings of a requirement file; empty when it cannot be read. */
function readFrontmatter(
  filePath: string,
  worktree: string | undefined,
): Record<string, string> {
  const resolvedPath =
    worktree && !path.isAbsolute(filePath)
      ? path.join(worktree, filePath)
      : filePath;
  let content: string;
  try {
    content = fs.readFileSync(resolvedPath, "utf-8");
  } catch {
    // Conservative fallback: an unreadable file has no priority
    return {};
  }
  return frontmatterStrings(content);
}

/**
 * Read a requirement file and determine if it has priority: must.
 * Returns false when the file cannot be read or has no such priority.
 * Handles CRLF line endings, BOM markers, and cross-platform paths.
 */
export function isMustPriorityRequirement(
  filePath: string,
  worktree?: string,
): boolean {
  return readFrontmatter(filePath, worktree).priority === "must";
}

/**
 * Inspect requirement file frontmatter.
 * Returns the priority value or null if not found/unparseable.
 * Handles CRLF line endings, BOM markers, and cross-platform paths.
 */
export function getRequirementPriority(
  filePath: string,
  worktree?: string,
): string | null {
  return readFrontmatter(filePath, worktree).priority ?? null;
}
