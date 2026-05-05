/*
 * Autopilot discovery helpers
 *
 * Provides lightweight workspace activation classification and source discovery
 * used by the `kb_autopilot_generate` workflow.
 */
import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
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

// implements REQ-001
export const AUTOPILOT_PROVIDER_ORDER = [ // implements REQ-001
  "typed_kibi_docs",
  "generic_repo_docs",
  "repo_metadata",
  "repo_layout",
  "test_topology",
] as const;

export type EvidenceProviderName = (typeof AUTOPILOT_PROVIDER_ORDER)[number];

export type AutopilotEvidenceKind =
  | "typed_markdown"
  | "symbol_manifest"
  | "generic_markdown"
  | "repo_metadata"
  | "repo_layout"
  | "test_topology";

export interface AutopilotEvidence {
  provider: EvidenceProviderName;
  kind: AutopilotEvidenceKind;
  label: string;
  relativePath?: string;
  absolutePath?: string;
  data: Record<string, unknown>;
}

export interface EvidenceProviderResult {
  provider: EvidenceProviderName;
  evidence: AutopilotEvidence[];
  detectedLanguages?: string[];
  detectedTestFrameworks?: string[];
  truncated?: boolean;
  scanWarnings?: string[];
}

export interface DiscoverySummary {
  activationState: ActivationState;
  activationMode: ActivationMode;
  applyBlocked: boolean;
  reason: string;
  handoffMessage?: string;
  vendored?: string[];
  providersRun: EvidenceProviderName[];
  providerCounts: Record<string, number>;
  detectedLanguages: string[];
  detectedTestFrameworks: string[];
  excludedRoots: string[];
  truncated: boolean;
  scanWarnings: string[];
}

export interface ProviderEvidenceDiscoveryResult {
  evidence: AutopilotEvidence[];
  providerResults: EvidenceProviderResult[];
  summary: DiscoverySummary;
}

interface DiscoveryPaths {
  requirements: string;
  scenarios: string;
  tests: string;
  adr: string;
  flags: string;
  events: string;
  facts: string;
  symbols: string;
}

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
  summary: DiscoverySummary;
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

const SOURCE_LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".mts": "typescript",
  ".cts": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".mjs": "javascript",
  ".cjs": "javascript",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".php": "php",
  ".c": "c",
  ".cc": "cpp",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
};

const PROJECT_SIGNAL_FILES = [
  "README.md",
  "README.mdx",
  "package.json",
  "tsconfig.json",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
] as const;

const PROJECT_SIGNAL_DIRS = [
  "src",
  "app",
  "apps",
  "packages",
  "tests",
  "test",
  "docs",
  "documentation",
  "scripts",
] as const;

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

function hasWorkspaceProjectSignals(cwd: string, vendoredRoots: string[]): boolean {
  const vendoredTopLevel = new Set(
    vendoredRoots
      .map((item) => item.split("/")[0])
      .filter((item): item is string => Boolean(item)),
  );

  for (const fileName of PROJECT_SIGNAL_FILES) {
    if (fs.existsSync(path.join(cwd, fileName))) {
      return true;
    }
  }

  for (const dirName of PROJECT_SIGNAL_DIRS) {
    if (vendoredTopLevel.has(dirName)) continue;
    const candidate = path.join(cwd, dirName);
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return true;
    }
  }

  return false;
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
): Pick<
  DiscoverySummary,
  "activationState" | "activationMode" | "applyBlocked" | "reason" | "handoffMessage" | "vendored"
> {
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

function createEmptyProviderCounts(): Record<string, number> {
  return Object.fromEntries(
    AUTOPILOT_PROVIDER_ORDER.map((provider) => [provider, 0]),
  );
}

function sortUnique(values: Iterable<string>): string[] {
  return Array.from(new Set(values)).filter(Boolean).sort();
}

function toRelativePosixPath(workspaceRoot: string, targetPath: string): string {
  return path.relative(workspaceRoot, targetPath).split(path.sep).join("/");
}

function normalizeDiscoveryPaths(
  cwd: string,
): DiscoveryPaths {
  const config = readRootConfig(cwd) || {};
  const configured = (config.paths as Record<string, string> | undefined) ?? {};
  const readPath = (key: keyof DiscoveryPaths): string => {
    const configuredValue = configured[key];
    if (typeof configuredValue === "string" && configuredValue.length > 0) {
      return configuredValue;
    }

    const fallbackValue = DEFAULT_SYNC_PATHS[key];
    return typeof fallbackValue === "string" ? fallbackValue : "";
  };

  return {
    requirements: readPath("requirements"),
    scenarios: readPath("scenarios"),
    tests: readPath("tests"),
    adr: readPath("adr"),
    flags: readPath("flags"),
    events: readPath("events"),
    facts: readPath("facts"),
    symbols: readPath("symbols"),
  };
}

function buildIgnoredGlobs(vendoredRoots: string[]): string[] {
  const ignored = new Set<string>();

  for (const dirName of IGNORED_DIRECTORY_NAMES) {
    ignored.add(`**/${dirName}`);
    ignored.add(`**/${dirName}/**`);
  }

  for (const vendoredRoot of vendoredRoots) {
    const normalized = vendoredRoot.replace(/\\/g, "/").replace(/^\.\//, "");
    if (!normalized) continue;
    ignored.add(normalized);
    ignored.add(`${normalized}/**`);
    ignored.add(`**/${normalized}`);
    ignored.add(`**/${normalized}/**`);
  }

  return Array.from(ignored);
}

function detectLanguagesFromPaths(paths: string[]): string[] {
  const detected = new Set<string>();

  for (const filePath of paths) {
    const language = SOURCE_LANGUAGE_EXTENSIONS[path.extname(filePath).toLowerCase()];
    if (language) {
      detected.add(language);
    }
  }

  return Array.from(detected);
}

function createFileEvidence(
  provider: EvidenceProviderName,
  kind: AutopilotEvidenceKind,
  workspaceRoot: string,
  absolutePath: string,
  data: Record<string, unknown> = {},
): AutopilotEvidence {
  const relativePath = toRelativePosixPath(workspaceRoot, absolutePath);
  return {
    provider,
    kind,
    label: relativePath,
    relativePath,
    absolutePath,
    data,
  };
}

function runTypedKibiDocsProvider(workspaceRoot: string): EvidenceProviderResult {
  const discoveryPaths = normalizeDiscoveryPaths(workspaceRoot);
  const markdownPatterns = [
    normalizePattern(discoveryPaths.requirements),
    normalizePattern(discoveryPaths.scenarios),
    normalizePattern(discoveryPaths.tests),
    normalizePattern(discoveryPaths.adr),
    normalizePattern(discoveryPaths.flags),
    normalizePattern(discoveryPaths.events),
    normalizePattern(discoveryPaths.facts),
  ].filter((pattern): pattern is string => Boolean(pattern));

  const markdownFiles = fg.sync(markdownPatterns, {
    cwd: workspaceRoot,
    absolute: true,
    onlyFiles: true,
    unique: true,
    suppressErrors: true,
  });
  const manifestFiles = discoveryPaths.symbols
    ? fg.sync(discoveryPaths.symbols, {
        cwd: workspaceRoot,
        absolute: true,
        onlyFiles: true,
        unique: true,
        suppressErrors: true,
      })
    : [];

  const evidence = [
    ...sortUnique(markdownFiles).map((absolutePath) =>
      createFileEvidence(
        "typed_kibi_docs",
        "typed_markdown",
        workspaceRoot,
        absolutePath,
      ),
    ),
    ...sortUnique(manifestFiles).map((absolutePath) =>
      createFileEvidence(
        "typed_kibi_docs",
        "symbol_manifest",
        workspaceRoot,
        absolutePath,
      ),
    ),
  ];

  return {
    provider: "typed_kibi_docs",
    evidence,
  };
}

function runGenericRepoDocsProvider(
  workspaceRoot: string,
  vendoredRoots: string[],
  typedFilePaths: Set<string>,
): EvidenceProviderResult {
  const markdownFiles = fg.sync("**/*.md", {
    cwd: workspaceRoot,
    absolute: true,
    onlyFiles: true,
    unique: true,
    suppressErrors: true,
    ignore: buildIgnoredGlobs(vendoredRoots),
  });

  const evidence = sortUnique(markdownFiles)
    .map((absolutePath) =>
      createFileEvidence(
        "generic_repo_docs",
        "generic_markdown",
        workspaceRoot,
        absolutePath,
      ),
    )
    .filter((item) => !typedFilePaths.has(item.relativePath ?? ""));

  return {
    provider: "generic_repo_docs",
    evidence,
  };
}

function detectLanguagesFromPackageJson(packageJson: Record<string, unknown>): string[] {
  const detected = new Set<string>();
  const scripts = packageJson.scripts;
  const bin = packageJson.bin;

  if (typeof scripts === "object" && scripts) {
    for (const value of Object.values(scripts)) {
      if (typeof value === "string" && /\.(cts|mts|ts|tsx)\b|\b(tsx|ts-node)\b/i.test(value)) {
        detected.add("typescript");
      }
      if (typeof value === "string" && /\.(cjs|mjs|js|jsx)\b/i.test(value)) {
        detected.add("javascript");
      }
    }
  }

  if (typeof bin === "string" && /\.(cts|mts|ts|tsx)\b/i.test(bin)) {
    detected.add("typescript");
  }

  if (typeof bin === "object" && bin) {
    for (const value of Object.values(bin)) {
      if (typeof value === "string" && /\.(cts|mts|ts|tsx)\b/i.test(value)) {
        detected.add("typescript");
      }
    }
  }

  return Array.from(detected);
}

function runRepoMetadataProvider(workspaceRoot: string): EvidenceProviderResult {
  const patterns = [
    "package.json",
    "opencode.json",
    "tsconfig.json",
    "tsconfig.*.json",
    "bun.lock",
    "bun.lockb",
    "bunfig.toml",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "Cargo.toml",
    "go.mod",
    "pyproject.toml",
    "requirements*.txt",
  ];
  const metadataFiles = fg.sync(patterns, {
    cwd: workspaceRoot,
    absolute: true,
    onlyFiles: true,
    unique: true,
    suppressErrors: true,
  });

  const detectedLanguages = new Set<string>();
  const scanWarnings: string[] = [];
  const evidence: AutopilotEvidence[] = [];

  for (const absolutePath of sortUnique(metadataFiles)) {
    const relativePath = toRelativePosixPath(workspaceRoot, absolutePath);
    const basename = path.basename(relativePath);
    const data: Record<string, unknown> = {
      title: `Repository metadata: ${basename}`,
      factKind: "meta",
      confidence: basename.startsWith("tsconfig") ? 0.9 : 0.86,
      evidence: [`repo_metadata:${relativePath}`],
    };

    if (basename.startsWith("tsconfig")) {
      detectedLanguages.add("typescript");
    }
    if (basename === "Cargo.toml") {
      detectedLanguages.add("rust");
    }
    if (basename === "go.mod") {
      detectedLanguages.add("go");
    }
    if (basename === "pyproject.toml") {
      detectedLanguages.add("python");
    }

    if (basename === "package.json") {
      try {
        const parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8")) as Record<
          string,
          unknown
        >;
        for (const language of detectLanguagesFromPackageJson(parsed)) {
          detectedLanguages.add(language);
        }
        if (typeof parsed.packageManager === "string") {
          data.packageManager = parsed.packageManager;
        }
      } catch (error) {
        scanWarnings.push(`repo_metadata:failed_to_parse:${relativePath}`);
      }
    }

    evidence.push(
      createFileEvidence(
        "repo_metadata",
        "repo_metadata",
        workspaceRoot,
        absolutePath,
        data,
      ),
    );
  }

  return {
    provider: "repo_metadata",
    evidence,
    detectedLanguages: Array.from(detectedLanguages),
    scanWarnings,
  };
}

function runRepoLayoutProvider(
  workspaceRoot: string,
  vendoredRoots: string[],
): EvidenceProviderResult {
  const layoutRoots = ["src", "app", "apps", "packages", "tests", "test", "docs", "scripts"];
  const evidence: AutopilotEvidence[] = [];

  for (const relativePath of layoutRoots) {
    const absolutePath = path.join(workspaceRoot, relativePath);
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
      continue;
    }

    evidence.push({
      provider: "repo_layout",
      kind: "repo_layout",
      label: relativePath,
      relativePath,
      absolutePath,
      data: {
        title: `Repository layout: ${relativePath} directory`,
        factKind: "observation",
        confidence: 0.84,
        evidence: [`repo_layout:${relativePath}`],
      },
    });
  }

  const codeFiles = fg.sync(
    [
      "src/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,py,rb,go,rs,java,kt,swift,php,c,cc,cpp,h,hpp}",
      "app/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,py,rb,go,rs,java,kt,swift,php,c,cc,cpp,h,hpp}",
      "apps/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,py,rb,go,rs,java,kt,swift,php,c,cc,cpp,h,hpp}",
      "packages/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,py,rb,go,rs,java,kt,swift,php,c,cc,cpp,h,hpp}",
      "tests/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,py,rb,go,rs,java,kt,swift,php,c,cc,cpp,h,hpp}",
      "test/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs,py,rb,go,rs,java,kt,swift,php,c,cc,cpp,h,hpp}",
    ],
    {
      cwd: workspaceRoot,
      absolute: true,
      onlyFiles: true,
      unique: true,
      suppressErrors: true,
      ignore: buildIgnoredGlobs(vendoredRoots),
    },
  );

  return {
    provider: "repo_layout",
    evidence,
    detectedLanguages: detectLanguagesFromPaths(codeFiles),
  };
}

function detectTestFrameworksFromContent(content: string): string[] {
  const frameworks = new Set<string>();

  if (/\bbun:test\b/.test(content)) frameworks.add("bun:test");
  if (/\bvitest\b/.test(content)) frameworks.add("vitest");
  if (/\bnode:test\b/.test(content)) frameworks.add("node:test");
  if (/\bmocha\b/.test(content)) frameworks.add("mocha");
  if (/\bjest\b|@jest\/globals/.test(content)) frameworks.add("jest");

  return Array.from(frameworks);
}

function runTestTopologyProvider(
  workspaceRoot: string,
  vendoredRoots: string[],
): EvidenceProviderResult {
  const testFiles = fg.sync(
    [
      "**/*.test.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
      "**/*.spec.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
      "**/__tests__/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
    ],
    {
      cwd: workspaceRoot,
      absolute: true,
      onlyFiles: true,
      unique: true,
      suppressErrors: true,
      ignore: buildIgnoredGlobs(vendoredRoots),
    },
  );

  const detectedFrameworks = new Set<string>();
  const detectedLanguages = new Set<string>();
  const scanWarnings: string[] = [];
  const evidence: AutopilotEvidence[] = [];

  for (const absolutePath of sortUnique(testFiles)) {
    const relativePath = toRelativePosixPath(workspaceRoot, absolutePath);
    const frameworks = (() => {
      try {
        return detectTestFrameworksFromContent(fs.readFileSync(absolutePath, "utf8"));
      } catch (error) {
        scanWarnings.push(`test_topology:failed_to_read:${relativePath}`);
        return [];
      }
    })();

    for (const framework of frameworks) {
      detectedFrameworks.add(framework);
    }
    for (const language of detectLanguagesFromPaths([absolutePath])) {
      detectedLanguages.add(language);
    }

    evidence.push(
      createFileEvidence(
        "test_topology",
        "test_topology",
        workspaceRoot,
        absolutePath,
        {
          title:
            frameworks.length > 0
              ? `Test topology: ${frameworks.join(", ")} in ${relativePath}`
              : `Test topology: ${relativePath}`,
          factKind: "observation",
          confidence: frameworks.length > 0 ? 0.92 : 0.85,
          evidence: [
            `test_topology:${relativePath}`,
            ...frameworks.map((framework) => `framework:${framework}`),
          ],
          frameworks,
        },
      ),
    );
  }

  return {
    provider: "test_topology",
    evidence,
    detectedLanguages: Array.from(detectedLanguages),
    detectedTestFrameworks: Array.from(detectedFrameworks),
    scanWarnings,
  };
}

function buildDiscoverySummary(
  activation: ActivationPolicy,
  vendored: string[],
  providerResults: EvidenceProviderResult[],
): DiscoverySummary {
  const providerCounts = createEmptyProviderCounts();
  const detectedLanguages = new Set<string>();
  const detectedTestFrameworks = new Set<string>();
  const scanWarnings: string[] = [];
  let truncated = false;

  for (const result of providerResults) {
    providerCounts[result.provider] = result.evidence.length;
    for (const language of result.detectedLanguages ?? []) {
      detectedLanguages.add(language);
    }
    for (const framework of result.detectedTestFrameworks ?? []) {
      detectedTestFrameworks.add(framework);
    }
    scanWarnings.push(...(result.scanWarnings ?? []));
    truncated ||= Boolean(result.truncated);
  }

  return {
    ...buildSourceSummary(activation, vendored),
    providersRun: providerResults.map((result) => result.provider),
    providerCounts,
    detectedLanguages: Array.from(detectedLanguages).sort(),
    detectedTestFrameworks: Array.from(detectedTestFrameworks).sort(),
    excludedRoots: Array.from(IGNORED_DIRECTORY_NAMES).sort(),
    truncated,
    scanWarnings: sortUnique(scanWarnings),
  };
}

// implements REQ-001
export function discoverProviderEvidence(
  workspaceRoot: string,
  activation: ActivationPolicy,
): ProviderEvidenceDiscoveryResult {
  const vendored = findVendoredTrees(workspaceRoot);

  if (!activation.allowCandidateGeneration) {
    return {
      evidence: [],
      providerResults: [],
      summary: {
        ...buildSourceSummary(activation, vendored),
        providersRun: [],
        providerCounts: createEmptyProviderCounts(),
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: Array.from(IGNORED_DIRECTORY_NAMES).sort(),
        truncated: false,
        scanWarnings: [],
      },
    };
  }

  const typedKibiDocs = runTypedKibiDocsProvider(workspaceRoot);
  const typedPaths = new Set(
    typedKibiDocs.evidence
      .map((item) => item.relativePath)
      .filter((item): item is string => Boolean(item)),
  );
  const providerResults: EvidenceProviderResult[] = [
    typedKibiDocs,
    runGenericRepoDocsProvider(workspaceRoot, vendored, typedPaths),
    runRepoMetadataProvider(workspaceRoot),
    runRepoLayoutProvider(workspaceRoot, vendored),
    runTestTopologyProvider(workspaceRoot, vendored),
  ];
  const evidence = providerResults.flatMap((result) => result.evidence);

  evidence.sort((left, right) => {
    const providerCompare = AUTOPILOT_PROVIDER_ORDER.indexOf(left.provider) -
      AUTOPILOT_PROVIDER_ORDER.indexOf(right.provider);
    if (providerCompare !== 0) return providerCompare;

    const leftKey = left.relativePath ?? left.label;
    const rightKey = right.relativePath ?? right.label;
    return leftKey.localeCompare(rightKey);
  });

  return {
    evidence,
    providerResults,
    summary: buildDiscoverySummary(activation, vendored, providerResults),
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

  if (
    !hasRootConfig &&
    vendored.length > 0 &&
    !hasWorkspaceProjectSignals(workspaceRoot, vendored)
  ) {
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
  const discovery = discoverProviderEvidence(workspaceRoot, activation);
  const candidates = new Set<string>();

  for (const item of discovery.evidence) {
    if (
      item.kind === "typed_markdown" ||
      item.kind === "symbol_manifest" ||
      item.kind === "generic_markdown"
    ) {
      const relativePath = item.relativePath;
      if (relativePath) {
        candidates.add(relativePath);
      }
    }
  }

  return {
    candidates: Array.from(candidates).sort(),
    summary: discovery.summary,
  };
}
