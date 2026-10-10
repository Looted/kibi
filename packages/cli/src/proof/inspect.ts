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
  currentIntegration: string | null;
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
  /** Plan a replacement of this existing integration id. */
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

  const planned = buildProofIntegrationPlan(root, options);
  const applyHint =
    "review integrationPlan, then apply it with kb_apply_plan (or `kibi apply-plan --input -`) passing plan, approvedPlanHash = plan.planHash and approvedActionIds";
  let recommendation: string;
  if (planned.plan !== null && options.update !== undefined) {
    recommendation = `To replace integration '${options.update}', ${applyHint}.`;
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
    recommendation,
    missing,
    proposedIntegration: planned.proposal?.integration ?? null,
    contractDefaults: planned.proposal?.contractDefaults ?? null,
    integrationPlan: planned.plan,
    integrationPlanReason: planned.reason,
  };
}
