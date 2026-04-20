/*
 * Autopilot discovery helpers
 *
 * Provides lightweight workspace activation classification and source discovery
 * used by the `kb_autopilot_generate` workflow.
 */
import fs from "node:fs";
import path from "node:path";
import type { PrologProcess } from "kibi-cli/prolog";
import { runJsonModuleQuery } from "./core-module.js";

export type ActivationState =
  | "root_uninitialized"
  | "root_partial"
  | "vendored_only"
  | "root_active_thin"
  | "root_active_seeded";

export interface SourceDiscoveryResult {
  // relative posix-style paths from workspace root
  candidates: string[];
  summary: {
    activationState: ActivationState;
    reason?: string;
    vendored?: string[];
  };
}

// Minimal copy of the opencode defaults used by other packages. Keep in sync
// with packages/opencode/src/file-filter.ts DEFAULT_SYNC_PATHS.
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

function findVendoredTrees(cwd: string): string[] {
  const results: string[] = [];
  const vendoredMarkers = [
    ["kibi", "opencode.json"],
    ["kibi", "package.json"],
    ["kibi", "packages", "mcp"],
    ["kibi", "documentation"],
  ];

  for (const marker of vendoredMarkers) {
    const markerPath = path.join(cwd, ...marker);
    if (fs.existsSync(markerPath)) {
      results.push(marker.join("/"));
    }
  }

  const nodeModules = path.join(cwd, "node_modules");
  if (fs.existsSync(nodeModules)) {
    try {
      for (const entry of fs.readdirSync(nodeModules)) {
        if (entry === "kibi" || entry.startsWith("kibi-")) {
          results.push(`node_modules/${entry}`);
        }
      }
    } catch {
      // ignore
    }
  }

  return Array.from(new Set(results));
}

function rootKbConfigExists(cwd: string): boolean {
  return fs.existsSync(path.join(cwd, ".kb", "config.json"));
}

function readRootConfig(cwd: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(path.join(cwd, ".kb", "config.json"), "utf8");
    return JSON.parse(raw) || null;
  } catch {
    return null;
  }
}

function stripToRoot(p: string): string {
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
  if (p.includes("*")) return p;
  if (p.endsWith(".yaml") || p.endsWith(".yml") || path.extname(p)) return p;
  return `${p.replace(/\/+$/, "")}/**/*.md`;
}

function rootTargetsAllResolve(cwd: string): boolean {
  const config = readRootConfig(cwd) || {};
  const paths = (config.paths as Record<string, string> | undefined) ?? {};

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

  for (const key of keys) {
    const raw = paths[key] ?? DEFAULT_SYNC_PATHS[key];
    if (!raw) return false;
    const normalized = raw.replace(/\/+$|\s+$/g, "");
    const isFile = normalized.endsWith(".yaml") || normalized.endsWith(".yml");
    if (isFile) {
      if (!fs.existsSync(path.resolve(cwd, normalized))) return false;
    } else {
      const root = stripToRoot(normalized);
      if (!fs.existsSync(path.resolve(cwd, root))) return false;
    }
  }

  return true;
}

/** Classify activation readiness for autopilot. */
// implements REQ-mcp-init-kibi-autopilot-v1
export async function classifyActivationState(
  workspaceRoot: string,
  prolog: PrologProcess,
): Promise<ActivationState> {
  const hasRootConfig = rootKbConfigExists(workspaceRoot);
  const vendored = findVendoredTrees(workspaceRoot);

  if (!hasRootConfig && vendored.length > 0) {
    return "vendored_only";
  }

  if (!hasRootConfig) {
    return "root_uninitialized";
  }

  // Root config exists → check targets
  const allResolve = rootTargetsAllResolve(workspaceRoot);
  if (!allResolve) return "root_partial";

  // Config exists and targets resolve — consult KB counts via Prolog
  try {
    const payload = await runJsonModuleQuery<{
      rows: Array<{ id: string; type: string; count: number }>;
    }>(
      prolog,
      "discovery.pl",
      "discovery:coverage_report_json(type, [], true, false, 100, 0, JsonString)",
      "Autopilot activation counts",
    );

    const rows = payload?.rows ?? [];
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.type ?? r.id] = Number(r.count || 0);

    const reqCount = counts.req ?? 0;
    const nonSymbolTypes = [
      "req",
      "scenario",
      "test",
      "adr",
      "flag",
      "event",
      "fact",
    ];
    const nonSymbolTotal = nonSymbolTypes.reduce(
      (s, t) => s + (counts[t] ?? 0),
      0,
    );
    const scenarioTestAdrFact = (counts.scenario ?? 0) +
      (counts.test ?? 0) +
      (counts.adr ?? 0) +
      (counts.fact ?? 0);

    if (reqCount >= 1 && nonSymbolTotal >= 5 && scenarioTestAdrFact >= 1) {
      return "root_active_seeded";
    }
    return "root_active_thin";
  } catch {
    // If Prolog is unavailable or the query fails, conservatively treat as thin
    return "root_active_thin";
  }
}

// Recursively collect markdown files under `dir`, excluding known ignore dirs.
function collectMarkdownFiles(
  dir: string,
  workspaceRoot: string,
  vendoredRoots: string[],
): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) return results;

  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const full = path.join(dir, entry);

    // Skip ignores
    if (entry === ".git" || entry === "node_modules" || entry === ".kb") continue;

    // Skip vendored roots
    const rel = path.relative(workspaceRoot, full).split(path.sep).join("/");
    if (vendoredRoots.some((v) => rel === v || rel.startsWith(`${v}/`))) continue;

    const st = fs.statSync(full);
    if (st.isDirectory()) {
      results.push(...collectMarkdownFiles(full, workspaceRoot, vendoredRoots));
      continue;
    }
    if (st.isFile() && entry.endsWith(".md")) {
      results.push(path.relative(workspaceRoot, full).split(path.sep).join("/"));
    }
  }

  return results;
}

/** Discover eligible source inputs for autopilot. */
// implements REQ-mcp-init-kibi-autopilot-v1
export function discoverSources(
  workspaceRoot: string,
  activationState: ActivationState,
): SourceDiscoveryResult {
  const vendored = findVendoredTrees(workspaceRoot);
  if (activationState === "vendored_only") {
    return { candidates: [], summary: { activationState, vendored } };
  }

  const config = readRootConfig(workspaceRoot) || {};
  const paths = (config.paths as Record<string, string> | undefined) ??
    DEFAULT_SYNC_PATHS;

  const candidates = new Set<string>();

  // First: configured KB paths (include documentation/* if configured)
  for (const key of Object.keys(DEFAULT_SYNC_PATHS)) {
    const raw = (paths as Record<string, string>)[key];
    if (!raw) continue;
    const normalized = raw.replace(/\s+$/, "");
    if (normalized.endsWith(".yaml") || normalized.endsWith(".yml")) {
      const abs = path.resolve(workspaceRoot, normalized);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        candidates.add(path.relative(workspaceRoot, abs).split(path.sep).join("/"));
      }
      continue;
    }

    const pat = normalizePattern(normalized) ?? normalized;
    const root = stripToRoot(pat);
    const absRoot = path.resolve(workspaceRoot, root);
    if (fs.existsSync(absRoot) && fs.statSync(absRoot).isDirectory()) {
      for (const f of collectMarkdownFiles(absRoot, workspaceRoot, vendored)) {
        candidates.add(f);
      }
    }
  }

  // Generic markdown candidates (top-level), but exclude documentation/** which
  // is treated above via configured paths.
  for (const file of ["README.md", "ARCHITECTURE.md"]) {
    const abs = path.resolve(workspaceRoot, file);
    if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
      const rel = path.relative(workspaceRoot, abs).split(path.sep).join("/");
      if (!rel.startsWith("documentation/")) candidates.add(rel);
    }
  }

  const docsRoot = path.resolve(workspaceRoot, "docs");
  if (fs.existsSync(docsRoot) && fs.statSync(docsRoot).isDirectory()) {
    for (const f of collectMarkdownFiles(docsRoot, workspaceRoot, vendored)) {
      candidates.add(f);
    }
  }

  return {
    candidates: Array.from(candidates).sort(),
    summary: { activationState, reason: "discovered sources", vendored },
  };
}
