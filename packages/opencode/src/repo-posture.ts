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

// Default sync paths — must stay in sync with file-filter.ts DEFAULT_SYNC_PATHS
const DEFAULT_SYNC_PATHS: Record<string, string> = {
  requirements: "documentation/requirements/**/*.md",
  scenarios: "documentation/scenarios/**/*.md",
  tests: "documentation/tests/**/*.md",
  adr: "documentation/adr/**/*.md",
  flags: "documentation/flags/**/*.md",
  events: "documentation/events/**/*.md",
  facts: "documentation/facts/**/*.md",
  symbols: "documentation/symbols.yaml",
};

// ── helpers ────────────────────────────────────────────────────────────

function findVendoredTrees(cwd: string): string[] {
  const results: string[] = [];

  const vendoredMarkers = [
    ["kibi", "opencode.json"],
    ["kibi", "package.json"],
    ["kibi", "packages", "mcp"],
    ["kibi", "documentation"],
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

/** Check if .kb/config.json exists at root. */
function rootKbConfigExists(cwd: string): boolean {
  return existsSync(join(cwd, ".kb", "config.json"));
}

/** Read and parse .kb/config.json. Returns null on failure. */
function readRootConfig(cwd: string): Record<string, unknown> | null {
  try {
    return (
      JSON.parse(readFileSync(join(cwd, ".kb", "config.json"), "utf8")) || null
    );
  } catch {
    return null;
  }
}

/** Check if all configured KB targets resolve (directories / files exist). */
function rootTargetsAllResolve(cwd: string): boolean {
  const configPath = join(cwd, ".kb", "config.json");
  let config: Record<string, unknown> = {};
  try {
    config = JSON.parse(readFileSync(configPath, "utf8")) || {};
  } catch {
    return false;
  }

  const paths = config.paths as Record<string, string> | undefined;
  const defaultKeys = [
    "requirements",
    "scenarios",
    "tests",
    "adr",
    "flags",
    "events",
    "facts",
    "symbols",
  ] as const;

  for (const key of defaultKeys) {
    const raw = paths?.[key] ?? DEFAULT_SYNC_PATHS[key];
    if (!raw) return false;
    // Normalize: strip trailing slashes and glob patterns to get the root dir/file path
    const normalized = raw.replace(/\/+$/, "");
    const isFile = normalized.endsWith(".yaml") || normalized.endsWith(".yml");
    if (isFile) {
      if (!existsSync(resolve(cwd, normalized))) return false;
    } else {
      // Strip first glob segment
      const segments = normalized.split("/");
      const rootSegments: string[] = [];
      for (const seg of segments) {
        if (seg.includes("*") || seg.includes("?") || seg.includes("[")) break;
        rootSegments.push(seg);
      }
      const dirPath = rootSegments.join("/") || ".";
      if (!existsSync(resolve(cwd, dirPath))) return false;
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
  } catch {}

  for (const guidanceFile of [
    "AGENTS.md",
    join(".github", "copilot-instructions.md"),
  ]) {
    try {
      const content = readFileSync(join(cwd, guidanceFile), "utf8");
      if (content.includes("kb_query") || content.includes("kb_search")) {
        return true;
      }
    } catch {}
  }

  return false;
}

// ── main classifier ────────────────────────────────────────────────────

export function detectPosture(cwd: string): PostureResult {
  const hasRootConfig = rootKbConfigExists(cwd);
  const vendoredTrees = findVendoredTrees(cwd);

  // 1. hybrid_root_plus_vendored — root config AND vendored subtrees
  if (hasRootConfig && vendoredTrees.length > 0) {
    return {
      state: "hybrid_root_plus_vendored",
      needsBootstrap: false,
      reason: `Root .kb/config.json exists alongside vendored tree(s): ${vendoredTrees.join(", ")}`,
      maintenanceDegraded: false,
    };
  }

  // 2-3. root config exists (check maintenance mode and target resolution)
  if (hasRootConfig) {
    const config = readRootConfig(cwd);
    const maint = config?.maintenance as Record<string, unknown> | undefined;
    const maintenanceDisabled = maint !== undefined && maint.enabled === false;

    // maintenance_degraded overlay: maintenance explicitly disabled → root_active
    if (maintenanceDisabled) {
      return {
        state: "root_active",
        needsBootstrap: false,
        reason:
          "Root .kb/config.json exists; maintenance mode explicitly disabled",
        maintenanceDegraded: true,
      };
    }

    const allResolve = rootTargetsAllResolve(cwd);
    if (allResolve) {
      return {
        state: "root_active",
        needsBootstrap: false,
        reason:
          "Root .kb/config.json exists and all configured KB targets resolve",
        maintenanceDegraded: false,
      };
    }
    // 3. root_partial — root config exists but targets are missing
    return {
      state: "root_partial",
      needsBootstrap: true,
      reason:
        "Root .kb/config.json exists but some configured KB targets are missing",
      maintenanceDegraded: false,
    };
  }

  // 4. vendored_only — no root config, but vendored markers found
  if (vendoredTrees.length > 0) {
    return {
      state: "vendored_only",
      needsBootstrap: false,
      reason: `No root .kb/config.json, but vendored Kibi tree(s) detected: ${vendoredTrees.join(", ")}`,
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
