import fs from "node:fs";
import path from "node:path";
import { readEntitySummary } from "./knowledge-index.js";

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
// Stems: a plural entry would be redundant (words() drops the plural s).
const LAYOUT_WORDS = stems([
  "src",
  "app",
  "apps",
  "lib",
  "libs",
  "source",
  "page",
  "component",
  "view",
  "screen",
  "package",
  "main",
  "index",
  "shared",
  "common",
  "core",
  "util",
  "helper",
  "public",
  "static",
  "asset",
  "web",
  "client",
  "server",
  "frontend",
  "backend",
  "module",
  "feature",
  "internal",
  "service",
  "test",
  "spec",
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
const FILLER_WORDS = stems([
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
  return (
    text
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((word) => word.length >= 3 && !/\d/.test(word))
      .map((word) =>
        word.length > 4 && word.endsWith("s") && !word.endsWith("ss")
          ? word.slice(0, -1)
          : word,
      ) ?? []
  );
}

/**
 * A stop list in the same stemmed form words() produces, so "always" filters
 * the "alway" stem and plural entries cannot silently miss.
 */
function stems(list: readonly string[]): ReadonlySet<string> {
  return new Set(list.flatMap(words));
}

/**
 * The topic words of a workspace path: its directory and file-name words,
 * without layout, language and role words (`src/app/pages/coach-dashboard/
 * coach-dashboard.html` -> `coach`, `dashboard`).
 */
export function pathTopicWords(relativePath: string): string[] {
  // Separators, dots and dashes all split words, so the whole path reads
  // left to right: directories, file stem, then its role and extension.
  const found = words(relativePath).filter(
    (word) => !LAYOUT_WORDS.has(word) && !FILLER_WORDS.has(word),
  );
  return [...new Set(found)];
}

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
  // split always yields at least one line.
  if ((lines[0] as string).trim() !== "---") return undefined;
  const fields: Record<string, string> = {};
  for (const line of lines.slice(1)) {
    if (line.trim() === "---") break;
    // unquote trims the value, so the space after the colon is optional.
    const match = /^(id|title|status):(.+)/.exec(line);
    if (match) fields[match[1] as string] = unquote(match[2] as string);
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

const NOTHING_REPLACED: ReadonlySet<string> = new Set();

/**
 * A closed requirement may be done and still hold, or retired with nothing
 * to replace it, so it is offered only after every current one.
 */
function isClosed(head: RequirementHead): boolean {
  return String(head.status).trim().toLowerCase() === "closed";
}

/**
 * Requirements among `closed` that a current requirement replaces: the
 * targets of `supersedes` links, from front matter or relationship shards,
 * of requirements that are neither closed nor retired.
 */
export function replacedRequirements(
  workspaceRoot: string,
  requirements: readonly RequirementHead[],
  closed: ReadonlySet<string>,
): Set<string> {
  const replaced = new Set<string>();
  for (const head of requirements) {
    if (isClosed(head) || RETIRED_STATUS.test(String(head.status))) continue;
    // rationale: a placeholder entry in place of no links is not an object,
    // so it never reads as a supersedes link.
    // Stryker disable next-line ArrayDeclaration
    for (const link of readEntitySummary(workspaceRoot, head.id).links ?? [])
      if (link.type === "supersedes" && closed.has(link.target))
        replaced.add(link.target);
  }
  return replaced;
}
/**
 * Topic words of the person's request (`Users must not delete the last
 * owner` -> `user`, `delete`, `last`, `owner`), for ranking requirements an
 * unlinked file's path alone does not reach.
 */
export function requestTopicWords(text: string, limit = 40): string[] {
  const found = words(text).filter(
    (word) => !FILLER_WORDS.has(word) && !REQUEST_FILLER_WORDS.has(word),
  );
  return [...new Set(found)].slice(0, limit);
}

/** Request words that carry no topic of their own. */
const REQUEST_FILLER_WORDS = stems([
  "please",
  "could",
  "would",
  "you",
  "your",
  "our",
  "have",
  "has",
  "make",
  "sure",
  "change",
  "update",
  "add",
  "fix",
  "now",
  "need",
  "want",
  "like",
  "also",
  "just",
  "then",
  "than",
  "there",
  "here",
  "what",
  "which",
  "why",
  "how",
  "will",
  "use",
  "using",
  "new",
  "file",
  "code",
  "never",
  "always",
  "only",
  "any",
  "but",
  "they",
  "them",
  "was",
  "were",
  "been",
  "being",
  "does",
  "don",
  "doesn",
  "let",
  "get",
  "set",
  "one",
  "out",
  "about",
  "over",
  "same",
  "still",
  "too",
  "very",
]);

/**
 * Current requirements ranked by how many of the path's topic words their
 * title shares, then by how many of the request's topic words it shares, then
 * by how often the title uses them, then by id. A requirement sharing a path
 * word is returned; one sharing only request words needs two of them, since a
 * request names many words and one in common is chance.
 */
export function rankRequirementCandidates(
  relativePath: string,
  requirements: readonly RequirementHead[],
  limit: number = MAX_REQUIREMENT_CANDIDATES,
  requestWords?: readonly string[],
  replaced: ReadonlySet<string> = NOTHING_REPLACED,
): RequirementHead[] {
  const topic = new Set(pathTopicWords(relativePath));
  const request = new Set(requestWords?.filter((word) => !topic.has(word)));
  const scored: {
    head: RequirementHead;
    closed: number;
    shared: number;
    asked: number;
    uses: number;
  }[] = [];
  for (const head of requirements) {
    if (RETIRED_STATUS.test(String(head.status))) continue;
    if (replaced.has(head.id)) continue;
    const titleWords = words(head.title);
    const pathHits = titleWords.filter((word) => topic.has(word));
    const requestHits = titleWords.filter((word) => request.has(word));
    const shared = new Set(pathHits).size;
    const asked = new Set(requestHits).size;
    if (shared > 0 || asked >= 2) {
      scored.push({
        head,
        closed: isClosed(head) ? 1 : 0,
        shared,
        asked,
        uses: pathHits.length + requestHits.length,
      });
    }
  }
  scored.sort(
    (a, b) =>
      a.closed - b.closed ||
      b.shared - a.shared ||
      b.asked - a.asked ||
      b.uses - a.uses ||
      a.head.id.localeCompare(b.head.id),
  );
  return scored.slice(0, limit).map((entry) => entry.head);
}

/**
 * Candidate requirements for a file no symbol links, read from the canonical
 * requirement documents (`.kb/requirements/*.md`), ranked by the path's words
 * and, when given, the request's. Empty when the KB has none or is too large
 * to scan from a hook.
 */
export function requirementCandidatesForPath(
  workspaceRoot: string,
  relativePath: string,
  limit: number = MAX_REQUIREMENT_CANDIDATES,
  requestWords?: readonly string[],
): RequirementHead[] {
  // rationale: a shortcut only; ranking finds nothing without topic words
  // and with fewer than two request words, but skips the directory scan.
  // Stryker disable ConditionalExpression
  if (
    pathTopicWords(relativePath).length === 0 &&
    (requestWords?.length ?? 0) < 2
  )
    return [];
  // Stryker restore ConditionalExpression
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
  // Successors are looked up only for closed requirements the words reach,
  // since that reads every current requirement's links.
  const closed = new Set(
    rankRequirementCandidates(relativePath, heads, heads.length, requestWords)
      .filter(isClosed)
      .map((head) => head.id),
  );
  // rationale: a shortcut only; with no closed candidate nothing can be
  // replaced, but the links of every current requirement go unread.
  // Stryker disable ConditionalExpression,EqualityOperator
  const replaced =
    closed.size > 0
      ? replacedRequirements(workspaceRoot, heads, closed)
      : NOTHING_REPLACED;
  // Stryker restore ConditionalExpression,EqualityOperator
  return rankRequirementCandidates(
    relativePath,
    heads,
    limit,
    requestWords,
    replaced,
  );
}
