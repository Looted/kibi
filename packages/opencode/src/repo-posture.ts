// implements REQ-opencode-smart-enforcement-v1, REQ-opencode-kibi-plugin-v1
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Classification of the repository's Kibi posture — how Kibi is (or isn't)
 * set up relative to the active workspace root.
 */
export type RepoPosture =
  | "root_active"
  | "root_partial"
  | "root_uninitialized"
  | "vendored_only"
  | "hybrid_root_plus_vendored";

export interface PostureResult {
  state: RepoPosture;
  needsBootstrap: boolean;
  reason: string;
  maintenanceDegraded: boolean;
}

// Canonical Kibi knowledge targets — must stay in sync with kb-paths.ts.
const CANONICAL_KB_TARGETS: Record<string, string> = {
  requirements: ".kb/requirements",
  scenarios: ".kb/scenarios",
  tests: ".kb/tests",
  adr: ".kb/adr",
  flags: ".kb/flags",
  events: ".kb/events",
  facts: ".kb/facts",
  symbols: ".kb/symbols.yaml",
};

// ── helpers ────────────────────────────────────────────────────────────

function findVendoredTrees(cwd: string): string[] {
  const results: string[] = [];

  const vendoredMarkers = [
    ["kibi", "opencode.json"],
    ["kibi", "package.json"],
    ["kibi", "packages", "mcp"],
    ["kibi", ".kb"],
  ];

  for (const marker of vendoredMarkers) {
    const markerPath = join(cwd, ...marker);
    if (existsSync(markerPath)) {
      results.push(marker.join("/"));
    }
  }

  const nodeModules = join(cwd, "node_modules");
  if (existsSync(nodeModules)) {
    for (const entry of readdirSync(nodeModules)) {
      if (entry === "kibi" || entry.startsWith("kibi-")) {
        results.push(`node_modules/${entry}`);
      }
    }
  }

  return [...new Set(results)];
}

/** Check if `.kb/manifest.json` exists at root. */
function rootKbManifestExists(cwd: string): boolean {
  return existsSync(join(cwd, ".kb", "manifest.json"));
}

/** Check if all canonical KB targets resolve (directories / files exist). */
function rootTargetsAllResolve(cwd: string): boolean {
  for (const raw of Object.values(CANONICAL_KB_TARGETS)) {
    if (!raw) return false;
    const isFile = raw.endsWith(".yaml") || raw.endsWith(".yml");
    if (isFile) {
      if (!existsSync(resolve(cwd, raw))) return false;
    } else if (!existsSync(resolve(cwd, raw))) {
      return false;
    }
  }
  return true;
}

/** Detect root-level Kibi intent (plugin config present but no .kb). */
function hasRootKibiIntent(cwd: string): boolean {
  if (existsSync(join(cwd, ".opencode", "kibi.json"))) {
    return true;
  }

  try {
    const oc = JSON.parse(readFileSync(join(cwd, "opencode.json"), "utf8"));
    if (
      oc &&
      Array.isArray(oc.plugin) &&
      oc.plugin.some((p: string) => typeof p === "string" && p.includes("kibi"))
    ) {
      return true;
    }
  } catch (error) {
    if (!(error instanceof Error)) throw error;
  }

  for (const guidanceFile of [
    "AGENTS.md",
    join(".github", "copilot-instructions.md"),
  ]) {
    try {
      const content = readFileSync(join(cwd, guidanceFile), "utf8");
      if (content.includes("kb_query") || content.includes("kb_search")) {
        return true;
      }
    } catch (error) {
      if (!(error instanceof Error)) throw error;
    }
  }

  return false;
}

// ── main classifier ────────────────────────────────────────────────────

export function detectPosture(cwd: string): PostureResult {
  const hasRootManifest = rootKbManifestExists(cwd);
  const vendoredTrees = findVendoredTrees(cwd);

  // 1. hybrid_root_plus_vendored — root manifest AND vendored subtrees
  if (hasRootManifest && vendoredTrees.length > 0) {
    return {
      state: "hybrid_root_plus_vendored",
      needsBootstrap: false,
      reason: `Root .kb/manifest.json exists alongside vendored tree(s): ${vendoredTrees.join(", ")}`,
      maintenanceDegraded: false,
    };
  }

  // 2-3. root manifest exists (check target resolution)
  if (hasRootManifest) {
    const allResolve = rootTargetsAllResolve(cwd);
    if (allResolve) {
      return {
        state: "root_active",
        needsBootstrap: false,
        reason:
          "Root .kb/manifest.json exists and all canonical KB targets resolve",
        maintenanceDegraded: false,
      };
    }
    // 3. root_partial — manifest exists but targets are missing
    return {
      state: "root_partial",
      needsBootstrap: true,
      reason:
        "Root .kb/manifest.json exists but some canonical KB targets are missing",
      maintenanceDegraded: false,
    };
  }

  // 4. vendored_only — no root manifest, but vendored markers found
  if (vendoredTrees.length > 0) {
    return {
      state: "vendored_only",
      needsBootstrap: false,
      reason: `No root .kb/manifest.json, but vendored Kibi tree(s) detected: ${vendoredTrees.join(", ")}`,
      maintenanceDegraded: false,
    };
  }

  // 5. root_uninitialized — no root .kb, no vendored trees, but root declares intent
  if (hasRootKibiIntent(cwd)) {
    return {
      state: "root_uninitialized",
      needsBootstrap: true,
      reason:
        "No root .kb and no vendored trees, but Kibi plugin intent detected at root",
      maintenanceDegraded: false,
    };
  }

  // Fallback: treat as uninitialized (no kibi presence at all)
  return {
    state: "root_uninitialized",
    needsBootstrap: true,
    reason: "No Kibi presence detected in workspace",
    maintenanceDegraded: false,
  };
}
