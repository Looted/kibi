// implements REQ-opencode-kibi-plugin-v1
import { createRequire } from "node:module";
import * as path from "node:path";

const _require = createRequire(import.meta.url);

// Lightweight fallback matcher if picomatch isn't installed.
let picomatch: { isMatch: (s: string, p: string) => boolean };
try {
  picomatch = _require("picomatch");
} catch {
  picomatch = {
    isMatch: (str: string, pattern: string) => {
      // very small subset: handle simple **/*.md and exact matches
      if (pattern === "**/*.md") return str.endsWith(".md");
      if (pattern.endsWith("/**/*.md")) {
        const base = pattern.replace(/\/\*\*\/.+$/, "");
        return str.startsWith(base) && str.endsWith(".md");
      }
      return str === pattern;
    },
  };
}

// Canonical Kibi knowledge paths — must stay in sync with
// packages/cli/src/utils/kb-paths.ts CANONICAL_ENTITY_PATHS.
const CANONICAL_KB_PATHS = {
  requirements: ".kb/requirements/**/*.md",
  scenarios: ".kb/scenarios/**/*.md",
  tests: ".kb/tests/**/*.md",
  adr: ".kb/adr/**/*.md",
  flags: ".kb/flags/**/*.md",
  events: ".kb/events/**/*.md",
  facts: ".kb/facts/**/*.md",
  symbols: ".kb/symbols.yaml",
} as const;

export function loadKbSyncPaths(_cwd = process.cwd()) {
  return CANONICAL_KB_PATHS;
}

// implements REQ-opencode-kibi-plugin-v1
export interface KbExistenceTarget {
  key: string;
  relativePath: string;
  kind: "dir" | "file";
}

// implements REQ-opencode-kibi-plugin-v1
export function getKbExistenceTargets(
  cwd = process.cwd(),
): KbExistenceTarget[] {
  const paths = loadKbSyncPaths(cwd);
  const keys = [
    "requirements",
    "scenarios",
    "tests",
    "adr",
    "flags",
    "events",
    "facts",
    "symbols",
  ] as const;
  const targets: KbExistenceTarget[] = [];
  for (const key of keys) {
    const raw = paths[key];
    if (!raw) continue;
    const isFile = raw.endsWith(".yaml") || raw.endsWith(".yml");
    if (isFile) {
      targets.push({ key, relativePath: raw, kind: "file" });
    } else {
      // Contract: trim trailing slashes → normalizePattern → strip first glob segment
      const trimmed = raw.replace(/\/+$/, "");
      const normalized = normalizePattern(trimmed);
      const relativePath = normalized ? stripToRoot(normalized) : ".";
      targets.push({ key, relativePath, kind: "dir" });
    }
  }
  return targets;
}

// implements REQ-opencode-kibi-plugin-v1
/** Strip the first path segment containing a glob character and everything
 *  after it, returning the directory root to check with existsSync.
 */
export function stripToRoot(p: string): string {
  const segments = p.split("/");
  const rootSegments: string[] = [];
  for (const seg of segments) {
    if (seg.includes("*") || seg.includes("?") || seg.includes("[")) break;
    rootSegments.push(seg);
  }
  const result = rootSegments.join("/");
  return result || ".";
}

function normalizePattern(p: string | undefined): string | null {
  if (!p) return null;
  // preserve explicit globs containing '*' or '/**'
  if (p.includes("*")) return p;
  // symbols manifest is typically a file (yaml) - keep as-is
  if (p.endsWith(".yaml") || p.endsWith(".yml") || path.extname(p)) return p;
  // otherwise treat directory as markdown collection
  return `${p.replace(/\/+$/, "")}/**/*.md`;
}

// implements REQ-opencode-kibi-plugin-v1
export function shouldHandleFile(
  filePath: string,
  cwd = process.cwd(),
): boolean {
  const rel = path.isAbsolute(filePath)
    ? path.relative(cwd, filePath).split(path.sep).join("/")
    : filePath.split(path.sep).join("/");

  const paths = loadKbSyncPaths(cwd);
  const includeCandidates = [
    paths.requirements,
    paths.scenarios,
    paths.tests,
    paths.adr,
    paths.flags,
    paths.events,
    paths.facts,
    paths.symbols,
  ] as Array<string | undefined>;
  const includePatterns: string[] = includeCandidates
    .map(normalizePattern)
    .filter((p): p is string => Boolean(p));
  const included = includePatterns.some((pat) => picomatch.isMatch(rel, pat));
  if (
    included ||
    (paths.symbols !== undefined &&
      (paths.symbols === rel || picomatch.isMatch(rel, paths.symbols)))
  ) {
    return true;
  }

  return false;
}

export default shouldHandleFile;
