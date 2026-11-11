import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { MigrationPlan } from "../public/operations/migration-plan.js";
import {
  type ProposedIntegration,
  buildProofIntegrationPlan,
} from "./integration-plan.js";
import {
  PROOF_INTEGRATIONS_PATH,
  loadProofIntegrations,
} from "./integrations.js";

export type ProofInspection = Readonly<{
  languages: readonly string[];
  buildSystems: readonly string[];
  detectedRunners: readonly string[];
  ciWorkflows: readonly string[];
  /** Comma-joined ids of the configured integrations (kept for compatibility). */
  currentIntegration: string | null;
  /** Each configured integration with the producer and command it runs. */
  currentIntegrations: readonly Readonly<{
    id: string;
    producer: string;
    command: readonly string[];
  }>[];
  recommendation: string;
  missing: readonly string[];
  /** The integration Kibi proposes for the detected runner, if any. */
  proposedIntegration: ProposedIntegration["integration"] | null;
  /** What a proof-bearing test's proof_contract names for that integration. */
  contractDefaults: ProposedIntegration["contractDefaults"] | null;
  /**
   * Hash-bound kibi.migration-plan.v2 that writes the integrations file;
   * review it, then apply it with kb_apply_plan / `kibi apply-plan`.
   */
  integrationPlan: MigrationPlan | null;
  /** Why there is no plan, or what applying it does. */
  integrationPlanReason: string;
}>;

export type ProofInspectionOptions = Readonly<{
  /** Plan adding this integration id, or replacing it when it exists. */
  update?: string;
  /** Command (argv) the proposed integration runs instead of the detected one. */
  command?: readonly string[];
}>;

type Detector = Readonly<{
  language: string;
  runner: string;
  files: readonly string[];
}>;

/**
 * Declarative detection manifests. Deterministic CLI logic consumes these;
 * agents consume the inspection output and never reinvent runner discovery.
 */
const DETECTORS: readonly Detector[] = [
  {
    language: "typescript",
    runner: "playwright",
    files: [
      "playwright.config.ts",
      "playwright.config.mjs",
      "playwright.config.js",
    ],
  },
  {
    language: "typescript",
    runner: "vitest",
    files: ["vitest.config.ts", "vitest.config.mjs", "vitest.config.js"],
  },
  {
    language: "typescript",
    runner: "jest",
    files: ["jest.config.ts", "jest.config.mjs", "jest.config.js"],
  },
  {
    language: "python",
    runner: "pytest",
    files: ["pytest.ini", "pyproject.toml", "setup.cfg", "tox.ini"],
  },
  {
    language: "go",
    runner: "go test",
    files: ["go.mod"],
  },
  {
    language: "rust",
    runner: "cargo test",
    files: ["Cargo.toml"],
  },
  {
    language: "java",
    runner: "maven",
    files: ["pom.xml"],
  },
  {
    language: "java",
    runner: "gradle",
    files: ["build.gradle", "build.gradle.kts"],
  },
  {
    language: "csharp",
    runner: "dotnet test",
    files: ["*.csproj", "*.sln"],
  },
  {
    language: "ruby",
    runner: "rake test",
    files: ["Rakefile", "Gemfile"],
  },
];

/**
 * Runners recognised inside package.json scripts. Projects that run the
 * built-in Node or Bun test runners have no config file to detect.
 */
const SCRIPT_RUNNERS: readonly { runner: string; pattern: RegExp }[] = [
  { runner: "node --test", pattern: /\bnode\b[^&|;]*\s--test\b/ },
  { runner: "bun test", pattern: /\bbun\s+test\b/ },
  { runner: "vitest", pattern: /\bvitest\b/ },
  { runner: "jest", pattern: /\bjest\b/ },
  { runner: "playwright", pattern: /\bplaywright\s+test\b/ },
];

/**
 * The SCRIPT_RUNNERS that match a package.json script body of the root or of
 * one of its declared workspaces.
 */
function workspaceScriptRunners(
  root: string,
  pkg: Record<string, unknown> | null,
): Set<string> {
  const matched = new Set<string>();
  const collect = (manifest: Record<string, unknown> | null) => {
    const scripts = manifest?.scripts;
    if (scripts === null || typeof scripts !== "object") return;
    for (const body of Object.values(scripts as Record<string, unknown>)) {
      if (typeof body !== "string") continue;
      for (const entry of SCRIPT_RUNNERS)
        if (entry.pattern.test(body)) matched.add(entry.runner);
    }
  };
  collect(pkg);
  const workspaces = pkg?.workspaces;
  const declared: unknown = Array.isArray(workspaces)
    ? workspaces
    : (workspaces as { packages?: unknown } | undefined)?.packages;
  if (!Array.isArray(declared)) return matched;
  for (const pattern of declared) {
    if (typeof pattern !== "string" || pattern.startsWith("!")) continue;
    // Only `dir` and `dir/*` workspace globs are expanded.
    if (pattern.endsWith("/*")) {
      const parent = path.join(root, pattern.slice(0, -2));
      let entries: string[];
      try {
        entries = readdirSync(parent);
      } catch {
        continue;
      }
      for (const entry of entries)
        collect(packageJson(path.join(parent, entry)));
    } else if (!pattern.includes("*")) {
      collect(packageJson(path.join(root, pattern)));
    }
  }
  return matched;
}

// rationale: an emptied catch returns undefined, which every caller reads
// through `?.` exactly like null.
// Stryker disable BlockStatement
function packageJson(root: string): Record<string, unknown> | null {
  try {
    return JSON.parse(
      readFileSync(path.join(root, "package.json")).toString(),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}
// Stryker restore BlockStatement

export function directoryEntriesMatch(
  directory: string,
  regex: RegExp,
): boolean {
  try {
    return readdirSync(directory).some((entry) => regex.test(entry));
  } catch {
    return false;
  }
}

function globExists(root: string, pattern: string): boolean {
  if (!pattern.startsWith("*")) return existsSync(path.join(root, pattern));
  // DETECTORS globs are `*<extension>` names in the repository root.
  const extension = pattern.slice(1).replaceAll(".", "\\.");
  return directoryEntriesMatch(root, new RegExp(`${extension}$`));
}

export function inspectProofEnvironment(
  root: string,
  options: ProofInspectionOptions = {},
): ProofInspection {
  const languages = new Set<string>();
  const buildSystems = new Set<string>();
  const runners: string[] = [];
  const missing: string[] = [];

  for (const detector of DETECTORS) {
    if (!detector.files.some((pattern) => globExists(root, pattern))) continue;
    languages.add(detector.language);
    // Runner names are unique among DETECTORS.
    runners.push(detector.runner);
  }
  if (existsSync(path.join(root, "package.json"))) {
    languages.add("javascript/typescript");
    const pkg = packageJson(root);
    // A non-object scripts value has no string `test` property either.
    const scripts = (pkg?.scripts ?? {}) as Record<string, unknown>;
    if (pkg?.dependencies !== undefined || pkg?.devDependencies !== undefined)
      buildSystems.add("npm");
    if (
      existsSync(path.join(root, "bun.lockb")) ||
      existsSync(path.join(root, "bun.lock"))
    )
      buildSystems.add("bun");
    // No detector is named "npm test", so it cannot be listed yet.
    if (typeof scripts.test === "string") runners.push("npm test");
    const matched = workspaceScriptRunners(root, pkg);
    for (const entry of SCRIPT_RUNNERS) {
      if (matched.has(entry.runner) && !runners.includes(entry.runner))
        runners.push(entry.runner);
    }
    if (existsSync(path.join(root, "bunfig.toml"))) buildSystems.add("bun");
  }
  if (existsSync(path.join(root, "Cargo.toml"))) buildSystems.add("cargo");
  if (existsSync(path.join(root, "go.mod"))) buildSystems.add("go");
  if (existsSync(path.join(root, "pom.xml"))) buildSystems.add("maven");
  if (existsSync(path.join(root, "Makefile"))) buildSystems.add("make");

  const ciWorkflows: string[] = [];
  try {
    for (const file of readdirSync(path.join(root, ".github", "workflows"))) {
      if (file.endsWith(".yml") || file.endsWith(".yaml"))
        ciWorkflows.push(file);
    }
  } catch {
    // a missing or unreadable workflow directory is not fatal for inspection
  }

  const integrations = loadProofIntegrations(root);
  const currentIntegration = integrations.available
    ? integrations.integrations.integrations.map((entry) => entry.id).join(", ")
    : null;
  // The id alone does not say what `kibi prove` will run; expose the command.
  const currentIntegrations = integrations.available
    ? integrations.integrations.integrations.map((entry) => ({
        id: entry.id,
        producer: entry.producer,
        command: [...entry.command],
      }))
    : [];

  const planned = buildProofIntegrationPlan(root, options);
  const applyHint =
    "review integrationPlan, then apply it with kb_apply_plan (or `kibi apply-plan --input -`) passing plan, approvedPlanHash = plan.planHash and approvedActionIds";
  const updateId = options.update?.trim() || undefined;
  let recommendation: string;
  if (planned.plan !== null && updateId !== undefined) {
    // The plan adds an id the file does not have yet; only an existing one is
    // replaced.
    const verb = currentIntegrations.some((entry) => entry.id === updateId)
      ? "replace"
      : "add";
    recommendation = `To ${verb} integration '${updateId}', ${applyHint}.`;
  } else if (!integrations.available) {
    if (planned.plan === null) {
      recommendation =
        "No test harness detected. Proof integration is deferred until the first proof-bearing test introduces one; command proof can prove any command.";
      missing.push(
        `${PROOF_INTEGRATIONS_PATH} (written by applying the plan from kibi proof inspect --json)`,
      );
    } else {
      recommendation = `Kibi proposes a command integration for the detected runner. To configure it, ${applyHint}. Proof-bearing tests then name it in proof_contract.integration and kibi prove runs it.`;
      missing.push(
        `${PROOF_INTEGRATIONS_PATH} (written by applying integrationPlan)`,
      );
    }
  } else {
    recommendation =
      "Proof integration configured; run `kibi prove --all` to record fresh evidence.";
  }

  return {
    languages: [...languages].sort(),
    buildSystems: [...buildSystems].sort(),
    detectedRunners: runners,
    ciWorkflows,
    currentIntegration,
    currentIntegrations,
    recommendation,
    missing,
    proposedIntegration: planned.proposal?.integration ?? null,
    contractDefaults: planned.proposal?.contractDefaults ?? null,
    integrationPlan: planned.plan,
    integrationPlanReason: planned.reason,
  };
}
