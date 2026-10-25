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
  command: readonly string[];
  producer: string;
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
    command: ["npx", "playwright", "test"],
    producer: "playwright",
  },
  {
    language: "typescript",
    runner: "vitest",
    files: ["vitest.config.ts", "vitest.config.mjs", "vitest.config.js"],
    command: [
      "npx",
      "vitest",
      "run",
      "--reporter=junit",
      "--outputFile=.kb/proof/runs/vitest-junit.xml",
    ],
    producer: "junit",
  },
  {
    language: "typescript",
    runner: "jest",
    files: ["jest.config.ts", "jest.config.mjs", "jest.config.js"],
    command: [
      "npx",
      "jest",
      "--ci",
      "--reporters=default",
      "--reporters=jest-junit",
    ],
    producer: "junit",
  },
  {
    language: "python",
    runner: "pytest",
    files: ["pytest.ini", "pyproject.toml", "setup.cfg", "tox.ini"],
    command: ["pytest", "--junitxml=.kb/proof/runs/pytest-junit.xml"],
    producer: "junit",
  },
  {
    language: "go",
    runner: "go test",
    files: ["go.mod"],
    command: ["go", "test", "./...", "-json"],
    producer: "tap",
  },
  {
    language: "rust",
    runner: "cargo test",
    files: ["Cargo.toml"],
    command: ["cargo", "test"],
    producer: "tap",
  },
  {
    language: "java",
    runner: "maven",
    files: ["pom.xml"],
    command: ["mvn", "test"],
    producer: "junit",
  },
  {
    language: "java",
    runner: "gradle",
    files: ["build.gradle", "build.gradle.kts"],
    command: ["gradle", "test"],
    producer: "junit",
  },
  {
    language: "csharp",
    runner: "dotnet test",
    files: ["*.csproj", "*.sln"],
    command: ["dotnet", "test", "--logger", "junit"],
    producer: "junit",
  },
  {
    language: "ruby",
    runner: "rake test",
    files: ["Rakefile", "Gemfile"],
    command: ["bundle", "exec", "rake", "test"],
    producer: "junit",
  },
];

const PACKAGE_RUNNERS: readonly {
  runner: string;
  script: string;
  command: readonly string[];
  producer: string;
}[] = [
  {
    runner: "npm test",
    script: "test",
    command: ["npm", "test"],
    producer: "command",
  },
  {
    runner: "cargo test",
    script: "",
    command: ["cargo", "test"],
    producer: "command",
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

/** package.json script bodies of the root and its declared workspaces. */
function workspaceScripts(
  root: string,
  pkg: Record<string, unknown> | null,
): string[] {
  const bodies: string[] = [];
  const collect = (manifest: Record<string, unknown> | null) => {
    const scripts = manifest?.scripts;
    if (scripts === null || typeof scripts !== "object") return;
    for (const body of Object.values(scripts as Record<string, unknown>))
      if (typeof body === "string") bodies.push(body);
  };
  collect(pkg);
  const declared = Array.isArray(pkg?.workspaces)
    ? pkg.workspaces
    : Array.isArray((pkg?.workspaces as { packages?: unknown })?.packages)
      ? (pkg?.workspaces as { packages: unknown[] }).packages
      : [];
  for (const pattern of declared) {
    if (typeof pattern !== "string" || pattern.startsWith("!")) continue;
    // Only `dir` and `dir/*` workspace globs are expanded.
    const directories = pattern.endsWith("/*")
      ? (() => {
          const parent = path.join(root, pattern.slice(0, -2));
          try {
            return readdirSync(parent).map((entry) => path.join(parent, entry));
          } catch {
            return [];
          }
        })()
      : pattern.includes("*")
        ? []
        : [path.join(root, pattern)];
    for (const directory of directories) collect(packageJson(directory));
  }
  return bodies;
}

function packageJson(root: string): Record<string, unknown> | null {
  const filePath = path.join(root, "package.json");
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

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
  if (pattern.includes("*")) {
    const directory = path.dirname(path.join(root, pattern));
    if (!existsSync(directory)) return false;
    const base = path.basename(pattern);
    const regex = new RegExp(
      `^${base
        .split("*")
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join(".*")}$`,
    );
    return directoryEntriesMatch(directory, regex);
  }
  return existsSync(path.join(root, pattern));
}

function directoryExists(root: string, relative: string): boolean {
  try {
    return existsSync(path.join(root, relative));
  } catch {
    return false;
  }
}

// implements REQ-kibi-verification-evidence-contract
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
    if (!runners.includes(detector.runner)) runners.push(detector.runner);
  }
  if (existsSync(path.join(root, "package.json"))) {
    languages.add("javascript/typescript");
    const pkg = packageJson(root);
    const scripts =
      pkg?.scripts !== null &&
      typeof pkg?.scripts === "object" &&
      pkg?.scripts !== undefined
        ? (pkg.scripts as Record<string, unknown>)
        : {};
    if (
      scripts.dependencies !== undefined ||
      pkg?.devDependencies !== undefined
    )
      buildSystems.add("npm");
    if (
      existsSync(path.join(root, "bun.lockb")) ||
      existsSync(path.join(root, "bun.lock"))
    )
      buildSystems.add("bun");
    for (const entry of PACKAGE_RUNNERS) {
      if (entry.script !== "" && typeof scripts[entry.script] === "string") {
        if (!runners.includes(entry.runner)) runners.push(entry.runner);
      }
    }
    const bodies = workspaceScripts(root, pkg);
    for (const entry of SCRIPT_RUNNERS) {
      if (
        bodies.some((body) => entry.pattern.test(body)) &&
        !runners.includes(entry.runner)
      )
        runners.push(entry.runner);
    }
    if (existsSync(path.join(root, "bunfig.toml"))) buildSystems.add("bun");
  }
  if (existsSync(path.join(root, "Cargo.toml"))) buildSystems.add("cargo");
  if (existsSync(path.join(root, "go.mod"))) buildSystems.add("go");
  if (existsSync(path.join(root, "pom.xml"))) buildSystems.add("maven");
  if (existsSync(path.join(root, "Makefile"))) buildSystems.add("make");

  const ciWorkflows: string[] = [];
  const workflowsDir = path.join(root, ".github", "workflows");
  if (directoryExists(root, path.join(".github", "workflows"))) {
    try {
      for (const file of readdirSync(workflowsDir)) {
        if (file.endsWith(".yml") || file.endsWith(".yaml"))
          ciWorkflows.push(file);
      }
    } catch {
      // unreadable workflow directory is not fatal for inspection
    }
  }

  const integrations = loadProofIntegrations(root);
  const currentIntegration = integrations.available
    ? integrations.integrations.integrations.map((entry) => entry.id).join(", ")
    : null;
  // implements REQ-kibi-verification-evidence-contract
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
    // implements REQ-kibi-verification-evidence-contract
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
