import type { FileLifecycle } from "./file-operation-state.js";
import type { PathKind } from "./path-kind.js";
import type { RiskClass } from "./risk-classifier.js";

/**
 * Classification for whether a file change requires KB freshness evidence.
 *
 * - "requires-kb-evidence": The change is meaningful for KB freshness — the KB
 *   snapshot should be considered stale and needs a re-sync.
 * - "advisory": The change is low-risk (lockfiles, docs-only) — advisory only.
 * - "ignored": The change is in a build artifact or third-party path — no KB
 *   impact.
 */
export function isSafeDocsUnknownPath(
  riskClass: RiskClass | undefined,
  pathKind: PathKind,
): boolean {
  return riskClass === "safe_docs_only" && pathKind === "unknown";
}

export type MeaningfulChangeClass =
  | "requires-kb-evidence"
  | "advisory"
  | "ignored";

// Directories whose contents are always ignored for KB freshness.
const IGNORED_DIRECTORIES = [
  ".git",
  ".sisyphus",
  "node_modules",
  "vendor",
  "third_party",
  "dist",
  "coverage",
];

/** Derived `.kb/` runtime trees — must stay in sync with kb-paths.ts DERIVED_KB_PREFIXES. */
const DERIVED_KB_PREFIXES = [
  ".kb/branches",
  ".kb/recovery",
  ".kb/verification",
  ".kb/briefs",
  ".kb/migrations",
] as const;

function isDerivedKbPath(normalizedPath: string): boolean {
  for (const prefix of DERIVED_KB_PREFIXES) {
    if (
      normalizedPath === prefix ||
      normalizedPath.startsWith(`${prefix}/`) ||
      normalizedPath.includes(`/${prefix}/`) ||
      normalizedPath.endsWith(`/${prefix}`)
    ) {
      return true;
    }
  }
  return (
    normalizedPath === ".kb/config.json" ||
    normalizedPath.endsWith("/.kb/config.json")
  );
}

// Filenames that are advisory-only (lockfiles).
const ADVISORY_FILENAMES = new Set([
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

function isIgnoredPath(normalizedPath: string): boolean {
  // Check extension-based ignored patterns.
  if (
    normalizedPath.endsWith(".tsbuildinfo") ||
    normalizedPath.endsWith(".map")
  ) {
    return true;
  }

  // Check directory-based ignored patterns.
  for (const dir of IGNORED_DIRECTORIES) {
    if (
      normalizedPath.startsWith(`${dir}/`) ||
      normalizedPath.includes(`/${dir}/`)
    ) {
      return true;
    }
  }

  // Derived `.kb/` runtime (stores, recovery, leftover config) is ignored.
  // Canonical entity lanes, symbols, relationships, and the manifest are
  // authored knowledge and still require evidence.
  if (isDerivedKbPath(normalizedPath)) {
    return true;
  }

  return false;
}

function getFilename(normalizedPath: string): string {
  // lastIndexOf is -1 without a slash, which slices from 0.
  return normalizedPath.slice(normalizedPath.lastIndexOf("/") + 1);
}

/**
 * Classify whether a file change requires KB freshness evidence.
 *
 * Rules (first match wins):
 * 1. Ignored paths (build artifacts, vendor dirs) → `ignored`
 * 2. Advisory paths (lockfiles) → `advisory`
 * 3. `safe_docs_only` risk + `unknown` pathKind → `advisory`
 * 4. Default → `requires-kb-evidence`: every meaningful pathKind (code,
 *    requirements, KB docs, etc.), every risk-upgrading class, and the
 *    safety default for anything else
 */
export function classifyMeaningfulChange(params: {
  normalizedPath: string;
  pathKind: PathKind;
  lifecycle: FileLifecycle;
  riskClass?: RiskClass;
}): MeaningfulChangeClass {
  const { normalizedPath, pathKind, lifecycle: _lifecycle, riskClass } = params;

  // 1. IGNORED paths (for freshness contract)
  if (isIgnoredPath(normalizedPath)) {
    return "ignored";
  }

  // 2. ADVISORY paths (low-risk lockfiles)
  const filename = getFilename(normalizedPath);
  if (ADVISORY_FILENAMES.has(filename)) {
    return "advisory";
  }

  // 3. ADVISORY docs-only changes to unknown paths
  if (isSafeDocsUnknownPath(riskClass, pathKind)) return "advisory";

  // 4. DEFAULT — requires KB evidence
  return "requires-kb-evidence";
}
