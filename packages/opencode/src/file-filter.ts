// implements REQ-opencode-kibi-plugin-v1
import { existsSync, readFileSync } from "node:fs";
import * as pathMod from "node:path";
// Lightweight fallback matcher if picomatch isn't installed in the test environment.
let picomatch: { isMatch: (s: string, p: string) => boolean };
try {
  picomatch = require("picomatch");
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
import {
  existsSync as fsExistsSync,
  readFileSync as fsReadFileSync,
} from "node:fs";
import * as path from "node:path";

// Local copy of DEFAULT_SYNC_PATHS to avoid cross-package TS rootDir issues
const DEFAULT_SYNC_PATHS = {
  requirements: "requirements/**/*.md",
  scenarios: "scenarios/**/*.md",
  tests: "tests/**/*.md",
  adr: "adr/**/*.md",
  flags: "flags/**/*.md",
  events: "events/**/*.md",
  facts: "facts/**/*.md",
  symbols: "symbols.yaml",
};

function loadSyncConfigLocal(cwd = process.cwd()) {
  const configPath = path.join(cwd, ".kb/config.json");
  let userConfig: { paths?: Record<string, string>; defaultBranch?: string } =
    {};
  if (fsExistsSync(configPath)) {
    try {
      userConfig = JSON.parse(fsReadFileSync(configPath, "utf8")) || {};
    } catch {
      userConfig = {};
    }
  }
  return {
    paths: {
      ...DEFAULT_SYNC_PATHS,
      ...(userConfig.paths ?? {}),
    },
    defaultBranch: userConfig.defaultBranch,
  };
}

function loadKbSyncPaths(cwd = process.cwd()) {
  const cfg = loadSyncConfigLocal(cwd);
  return cfg.paths ?? DEFAULT_SYNC_PATHS;
}

function normalizePattern(p: string | undefined): string | null {
  if (!p) return null;
  // preserve explicit globs containing '*' or '/**'
  if (p.includes("*")) return p;
  // symbols manifest is typically a file (yaml) - keep as-is
  if (p.endsWith(".yaml") || p.endsWith(".yml") || pathMod.extname(p)) return p;
  // otherwise treat directory as markdown collection
  return `${p.replace(/\/+$/, "")}/**/*.md`;
}

const DEFAULT_IGNORES = [
  ".kb/**",
  ".git/**",
  "node_modules/**",
  "dist/**",
  "coverage/**",
  ".opencode/**",
  "**/*~",
  "**/~*",
  "**/.#*",
  "**/*.swp",
  "**/*.swo",
  "**/.DS_Store",
];

// implements REQ-opencode-kibi-plugin-v1
export function shouldHandleFile(
  filePath: string,
  cwd = process.cwd(),
): boolean {
  const rel = pathMod.isAbsolute(filePath)
    ? pathMod.relative(cwd, filePath).split(pathMod.sep).join("/")
    : filePath.split(pathMod.sep).join("/");

  const paths = loadKbSyncPaths(cwd);

  // Build include patterns from kibi paths
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

  // default ignores then allow extension by .kb/config.json -> sync.ignore (not implemented here)
  const ignorePatterns = DEFAULT_IGNORES;

  // Compile matchers
  const isIgnored = ignorePatterns.some((ig) => picomatch.isMatch(rel, ig));
  if (isIgnored) return false;

  // If any include pattern matches, accept
  const included = includePatterns.some((pat) => picomatch.isMatch(rel, pat));
  if (included) return true;

  // If symbols path is configured as exact file and matches exactly, accept
  if (paths.symbols) {
    const sym = paths.symbols;
    if (sym === rel || picomatch.isMatch(rel, sym)) return true;
  }

  return false;
}

export default shouldHandleFile;
