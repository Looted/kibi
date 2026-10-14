// implements REQ-kb-unowned-file-candidates
import fs from "node:fs";
import path from "node:path";

/**
 * Requirements that may govern a file no symbol links yet, found by the words
 * its path shares with their titles. A file without links is not a file
 * without rules: `coach-dashboard.html` may implement "The coach inbox must
 * list the analysis requests assigned to the coach." The match is lexical and
 * cheap enough for a hook; it names candidates to confirm, never owners.
 */

const REQUIREMENTS_DIR = path.join(".kb", "requirements");
/** Bytes of each requirement read for its front matter. */
const HEAD_BYTES = 4096;
/** A KB larger than this is not scanned from a hook. */
const MAX_SCANNED = 2000;
export const MAX_REQUIREMENT_CANDIDATES = 3;

/** Path words that name a layout, a language or a role, not a behavior. */
const LAYOUT_WORDS = new Set([
  "src",
  "app",
  "apps",
  "lib",
  "libs",
  "source",
  "page",
  "pages",
  "component",
  "components",
  "view",
  "views",
  "screen",
  "screens",
  "package",
  "packages",
  "main",
  "index",
  "shared",
  "common",
  "core",
  "util",
  "utils",
  "helper",
  "helpers",
  "public",
  "static",
  "asset",
  "assets",
  "web",
  "client",
  "server",
  "frontend",
  "backend",
  "module",
  "modules",
  "feature",
  "features",
  "internal",
  "service",
  "services",
  "test",
  "tests",
  "spec",
  "specs",
  "dist",
  "build",
  "html",
  "htm",
  "tsx",
  "jsx",
  "mjs",
  "cjs",
  "vue",
  "svelte",
  "css",
  "scss",
  "less",
  "json",
  "yaml",
  "yml",
  "java",
  "swift",
  "php",
]);

/** Words of a title that carry no topic. */
const FILLER_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "must",
  "should",
  "shall",
  "may",
  "can",
  "are",
  "is",
  "its",
  "their",
  "that",
  "this",
  "from",
  "into",
  "when",
  "each",
  "every",
  "all",
  "not",
  "req",
  "auto",
]);

/** Lowercase word stems of an identifier, path segment or title. */
function words(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !/\d/.test(word))
    .map((word) =>
      word.length > 4 && word.endsWith("s") && !word.endsWith("ss")
        ? word.slice(0, -1)
        : word,
    );
}

// implements REQ-kb-unowned-file-candidates
/**
 * The topic words of a workspace path: its directory and file-name words,
 * without layout, language and role words (`src/app/pages/coach-dashboard/
 * coach-dashboard.html` -> `coach`, `dashboard`).
 */
export function pathTopicWords(relativePath: string): string[] {
  const segments = relativePath.split(/[\\/]/).filter(Boolean);
  const last = segments.pop() ?? "";
  const stem = last.includes(".") ? last.slice(0, last.indexOf(".")) : last;
  const roles = last.includes(".") ? last.slice(last.indexOf(".") + 1) : "";
  const found = [...segments, stem, roles]
    .flatMap(words)
    .filter((word) => !LAYOUT_WORDS.has(word) && !FILLER_WORDS.has(word));
  return [...new Set(found)];
}

// implements REQ-kb-unowned-file-candidates
export type RequirementHead = {
  id: string;
  title: string;
  status?: string;
};

function unquote(value: string): string {
  const trimmed = value.trim();
  return /^(["']).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

function readHead(file: string): RequirementHead | undefined {
  let head: string;
  try {
    const descriptor = fs.openSync(file, "r");
    try {
      const buffer = Buffer.alloc(HEAD_BYTES);
      const bytes = fs.readSync(descriptor, buffer, 0, buffer.length, 0);
      head = buffer.subarray(0, bytes).toString("utf8");
    } finally {
      fs.closeSync(descriptor);
    }
  } catch {
    return undefined;
  }
  const lines = head.split(/\r?\n/);
  if (lines[0]?.trim() !== "---") return undefined;
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") break;
    const match = /^(id|title|status):\s*(.+)$/.exec(line);
    if (match?.[1] && match[2]) fields[match[1]] = unquote(match[2]);
  }
  if (!fields.id || !fields.title) return undefined;
  return {
    id: fields.id,
    title: fields.title,
    ...(fields.status ? { status: fields.status } : {}),
  };
}

const RETIRED_STATUS =
  /supersed|deprecat|reject|obsolete|retired|archived|removed/i;

// implements REQ-kb-unowned-file-candidates
/**
 * Current requirements ranked by how many of the path's topic words their
 * title shares, then by how often the title uses them, then by id. Only
 * requirements sharing at least one word are returned.
 */
export function rankRequirementCandidates(
  relativePath: string,
  requirements: readonly RequirementHead[],
  limit: number = MAX_REQUIREMENT_CANDIDATES,
): RequirementHead[] {
  const topic = new Set(pathTopicWords(relativePath));
  if (topic.size === 0) return [];
  const scored: { head: RequirementHead; shared: number; uses: number }[] = [];
  for (const head of requirements) {
    if (head.status !== undefined && RETIRED_STATUS.test(head.status)) continue;
    const titleWords = words(head.title).filter((word) => topic.has(word));
    const shared = new Set(titleWords).size;
    if (shared > 0) scored.push({ head, shared, uses: titleWords.length });
  }
  scored.sort(
    (a, b) =>
      b.shared - a.shared ||
      b.uses - a.uses ||
      a.head.id.localeCompare(b.head.id),
  );
  return scored.slice(0, limit).map((entry) => entry.head);
}

// implements REQ-kb-unowned-file-candidates
/**
 * Candidate requirements for a file no symbol links, read from the canonical
 * requirement documents (`.kb/requirements/*.md`). Empty when the KB has none
 * or is too large to scan from a hook.
 */
export function requirementCandidatesForPath(
  workspaceRoot: string,
  relativePath: string,
  limit: number = MAX_REQUIREMENT_CANDIDATES,
): RequirementHead[] {
  if (pathTopicWords(relativePath).length === 0) return [];
  const directory = path.join(workspaceRoot, REQUIREMENTS_DIR);
  let names: string[];
  try {
    names = fs.readdirSync(directory).filter((name) => name.endsWith(".md"));
  } catch {
    return [];
  }
  if (names.length > MAX_SCANNED) return [];
  const heads = names
    .map((name) => readHead(path.join(directory, name)))
    .filter((head): head is RequirementHead => head !== undefined);
  return rankRequirementCandidates(relativePath, heads, limit);
}
