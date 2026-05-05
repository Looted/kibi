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

export type ActivationMode =
  | "cold_start_bootstrap"
  | "repair_bootstrap"
  | "attached_thin_handoff"
  | "attached_seeded_handoff"
  | "vendored_blocked";

export interface ActivationPolicy {
  activationState: ActivationState;
  activationMode: ActivationMode;
  applyBlocked: boolean;
  allowCandidateGeneration: boolean;
  reason: string;
  handoffMessage?: string;
}

export interface SourceDiscoveryResult {
  // relative posix-style paths from workspace root
  candidates: string[];
  summary: {
    activationState: ActivationState;
    activationMode: ActivationMode;
    applyBlocked: boolean;
    reason: string;
    handoffMessage?: string;
    vendored?: string[];
  };
}

const IGNORED_DIRECTORY_NAMES = new Set([
  ".git",
  ".kb",
  ".venv",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "third-party",
  "third_party",
  "vendor",
  "vendors",
  "venv",
]);

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
  const results = new Set<string>();
  const vendoredMarkers = [
    ["kibi", "opencode.json"],
    ["kibi", "package.json"],
    ["kibi", "packages", "mcp"],
    ["kibi", "documentation"],
  ];

  for (const marker of vendoredMarkers) {
    const markerPath = path.join(cwd, ...marker);
    if (fs.existsSync(markerPath)) {
      results.add(marker[0] ?? "kibi");
    }
  }

  const nodeModules = path.join(cwd, "node_modules");
  if (fs.existsSync(nodeModules)) {
    try {
      for (const entry of fs.readdirSync(nodeModules)) {
        if (entry === "kibi" || entry.startsWith("kibi-")) {
          results.add(`node_modules/${entry}`);
        }
      }
    } catch {
      // ignore
    }
  }

  return Array.from(results).sort();
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

function buildSourceSummary(
  activation: ActivationPolicy,
  vendored: string[],
): SourceDiscoveryResult["summary"] {
  return {
    activationState: activation.activationState,
    activationMode: activation.activationMode,
    applyBlocked: activation.applyBlocked,
    reason: activation.reason,
    ...(activation.handoffMessage
      ? { handoffMessage: activation.handoffMessage }
      : {}),
    ...(vendored.length > 0 ? { vendored } : {}),
  };
}

function toActivationPolicy(activationState: ActivationState): ActivationPolicy {
  switch (activationState) {
    case "root_partial":
      return {
        activationState,
        activationMode: "repair_bootstrap",
        applyBlocked: true,
        allowCandidateGeneration: true,
        reason:
          "Workspace root is only partially configured; run a repair bootstrap scan and keep apply blocked until the root is repaired.",
      };
    case "root_active_thin":
      return {
        activationState,
        activationMode: "attached_thin_handoff",
        applyBlocked: true,
        allowCandidateGeneration: false,
        reason:
          "Workspace already has an attached but thin KB; bootstrap synthesis is replaced by an explicit thin handoff.",
        handoffMessage:
          "Attached thin KB detected. Review the sparse KB coverage and continue with a handoff instead of a bootstrap apply plan.",
      };
    case "root_active_seeded":
      return {
        activationState,
        activationMode: "attached_seeded_handoff",
        applyBlocked: true,
        allowCandidateGeneration: false,
        reason:
          "Workspace already has an attached seeded KB; bootstrap synthesis is replaced by an explicit seeded handoff.",
        handoffMessage:
          "Attached seeded KB detected. Use the existing KB context instead of generating bootstrap candidates.",
      };
    case "vendored_only":
      return {
        activationState,
        activationMode: "vendored_blocked",
        applyBlocked: true,
        allowCandidateGeneration: false,
        reason:
          "Workspace appears to contain vendored Kibi sources only; bootstrap generation is blocked in this posture.",
        handoffMessage:
          "Vendored Kibi posture detected. Move to the real project root before attempting bootstrap.",
      };
    case "root_uninitialized":
      return {
        activationState,
        activationMode: "cold_start_bootstrap",
        applyBlocked: false,
        allowCandidateGeneration: true,
        reason:
          "Workspace has no attached root KB yet; run a cold-start bootstrap scan across repository evidence.",
      };
  }
}

// implements REQ-mcp-init-kibi-autopilot-v1
export async function resolveActivationPolicy(
  workspaceRoot: string,
  prolog: PrologProcess,
): Promise<ActivationPolicy> {
  return toActivationPolicy(await classifyActivationState(workspaceRoot, prolog));
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

  const entries = fs.readdirSync(dir).sort();
  for (const entry of entries) {
    const full = path.join(dir, entry);

    // Skip ignores
    if (IGNORED_DIRECTORY_NAMES.has(entry.toLowerCase())) continue;

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
  activation: ActivationPolicy,
): SourceDiscoveryResult {
  const vendored = findVendoredTrees(workspaceRoot);
  if (!activation.allowCandidateGeneration) {
    return {
      candidates: [],
      summary: buildSourceSummary(activation, vendored),
    };
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

  for (const f of collectMarkdownFiles(workspaceRoot, workspaceRoot, vendored)) {
    candidates.add(f);
  }

  return {
    candidates: Array.from(candidates).sort(),
    summary: buildSourceSummary(activation, vendored),
  };
}
