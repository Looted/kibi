// implements REQ-opencode-kibi-plugin-v1

import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Parse frontmatter from markdown content.
 * Returns null if no valid frontmatter found.
 */
function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const frontmatterText = match[1];
  const result: Record<string, unknown> = {};

  // Simple YAML-like parsing for top-level scalar values only
  for (const line of frontmatterText.split(/\r?\n/)) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();

    if (key && value) {
      // Handle quoted strings
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
 * Read a requirement file and determine if it has priority: must.
 * Returns false on any error (file not found, parse failure, etc.)
 */
export function isMustPriorityRequirement(
  // implements REQ-opencode-kibi-plugin-v1
  filePath: string,
  worktree?: string,
): boolean {
  try {
    const resolvedPath =
      worktree && !path.isAbsolute(filePath)
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
 */
export function getRequirementPriority(
  // implements REQ-opencode-kibi-plugin-v1
  filePath: string,
  worktree?: string,
): string | null {
  try {
    const resolvedPath =
      worktree && !path.isAbsolute(filePath)
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
