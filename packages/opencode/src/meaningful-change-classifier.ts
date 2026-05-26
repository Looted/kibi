import type { PathKind } from "./path-kind.js";
import type { FileLifecycle } from "./file-operation-state.js";
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

// Filenames that are advisory-only (lockfiles).
const ADVISORY_FILENAMES = new Set([
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
]);

// PathKind values that always require KB evidence.
const MEANINGFUL_PATH_KINDS: ReadonlySet<PathKind> = new Set([
  "code",
  "requirement",
  "scenario",
  "test",
  "adr",
  "fact",
  "flag",
  "event",
  "symbol",
  "kb",
]);

// Risk classes that upgrade the classification to requires-kb-evidence.
const UPGRADE_RISK_CLASSES: ReadonlySet<RiskClass> = new Set([
  "behavior_candidate",
  "traceability_candidate",
  "req_policy_candidate",
]);

function isIgnoredPath(
  normalizedPath: string,
  pathKind: PathKind,
): boolean {
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

  // Special handling for .kb/ — only ignored when pathKind is NOT "kb".
  // Actual KB entity files (pathKind=kb) should still require evidence.
  if (pathKind !== "kb") {
    if (
      normalizedPath.startsWith(".kb/") ||
      normalizedPath.includes("/.kb/")
    ) {
      return true;
    }
  }

  return false;
}

function getFilename(normalizedPath: string): string {
  const lastSlash = normalizedPath.lastIndexOf("/");
  return lastSlash === -1
    ? normalizedPath
    : normalizedPath.slice(lastSlash + 1);
}

/**
 * Classify whether a file change requires KB freshness evidence.
 *
 * Rules (first match wins):
 * 1. Ignored paths (build artifacts, vendor dirs) → `ignored`
 * 2. Advisory paths (lockfiles) → `advisory`
 * 3. Meaningful pathKinds (code, requirements, KB docs, etc.) → `requires-kb-evidence`
 * 4. Risk-based upgrade (behavior/traceability/req_policy candidates) → `requires-kb-evidence`
 * 5. `safe_docs_only` risk + `unknown` pathKind → `advisory`
 * 6. Default → `requires-kb-evidence` (safety default)
 */
export function classifyMeaningfulChange(params: {
  normalizedPath: string;
  pathKind: PathKind;
  lifecycle: FileLifecycle;
  riskClass?: RiskClass;
}): MeaningfulChangeClass {
  const { normalizedPath, pathKind, lifecycle: _lifecycle, riskClass } = params;

  // 1. IGNORED paths (for freshness contract)
  if (isIgnoredPath(normalizedPath, pathKind)) {
    return "ignored";
  }

  // 2. ADVISORY paths (low-risk lockfiles)
  const filename = getFilename(normalizedPath);
  if (ADVISORY_FILENAMES.has(filename)) {
    return "advisory";
  }

  // 3. REQUIRES-KB-EVIDENCE by pathKind
  if (MEANINGFUL_PATH_KINDS.has(pathKind)) {
    return "requires-kb-evidence";
  }

  // 4. RISK-BASED UPGRADE
  if (riskClass) {
    if (UPGRADE_RISK_CLASSES.has(riskClass)) {
      return "requires-kb-evidence";
    }

    if (riskClass === "safe_docs_only" && pathKind === "unknown") {
      return "advisory";
    }
  }

  // 5. DEFAULT — safety default for unknown paths
  return "requires-kb-evidence";
}
