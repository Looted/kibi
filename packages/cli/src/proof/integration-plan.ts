import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import {
  type MigrationAction,
  type MigrationPlan,
  buildMigrationPlan,
  migrationAction,
} from "../public/operations/migration-plan.js";
import {
  PROOF_CONTRACT_VERSION,
  PROOF_INTEGRATION_VERSION,
} from "../public/proof-protocol.js";
import {
  PROOF_INTEGRATIONS_PATH,
  type ProofIntegration,
  integrationsPath,
  proofIntegrationErrors,
} from "./integrations.js";

/** Migration action code of a reviewed proof integration write. */
export const PROOF_INTEGRATION_CONFIGURE = "proof_integration_configure";

/**
 * Files the proposal is derived from. Their hashes are bound into the plan,
 * so a plan reviewed against one package.json is refused after it changed.
 */
const PROPOSAL_SOURCES = [
  "package.json",
  "bun.lock",
  "bun.lockb",
  "pnpm-lock.yaml",
  "yarn.lock",
  "playwright.config.ts",
  "playwright.config.mjs",
  "playwright.config.js",
  "vitest.config.ts",
  "vitest.config.mjs",
  "vitest.config.js",
  "jest.config.ts",
  "jest.config.mjs",
  "jest.config.js",
  "pytest.ini",
  "pyproject.toml",
  "setup.cfg",
  "tox.ini",
  "go.mod",
  "Cargo.toml",
  "pom.xml",
  "build.gradle",
  "build.gradle.kts",
  "Gemfile",
  "Rakefile",
] as const;

/** npm writes this placeholder into a fresh package.json; it runs no tests. */
const NPM_PLACEHOLDER_TEST = /no test specified/i;

export type ProposedIntegration = Readonly<{
  integration: ProofIntegration;
  /** The runner the proposal was derived from (for the review summary). */
  runner: string;
  /** What a proof-bearing test's proof_contract names for this integration. */
  contractDefaults: Readonly<{
    version: typeof PROOF_CONTRACT_VERSION;
    integration: string;
    required_proofs: ReadonlyArray<{ symbol_id: string; target: string }>;
    success_policy: "all_required_first_attempt";
  }>;
}>;

export type ProofIntegrationPlanResult = Readonly<{
  /** The hash-bound plan to review and apply with kb_apply_plan, if any. */
  plan: MigrationPlan | null;
  proposal: ProposedIntegration | null;
  /** Why no plan was produced, or what applying it does. */
  reason: string;
}>;

function readPackageJson(root: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(
      readFileSync(path.join(root, "package.json"), "utf8"),
    );
    return parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function packageTestCommand(root: string): readonly string[] | null {
  const pkg = readPackageJson(root);
  const scripts =
    pkg !== null &&
    pkg.scripts !== null &&
    typeof pkg.scripts === "object" &&
    !Array.isArray(pkg.scripts)
      ? (pkg.scripts as Record<string, unknown>)
      : {};
  const test = scripts.test;
  if (typeof test !== "string" || test.trim() === "") return null;
  if (NPM_PLACEHOLDER_TEST.test(test)) return null;
  const has = (file: string) => existsSync(path.join(root, file));
  if (has("bun.lock") || has("bun.lockb")) return ["bun", "run", "test"];
  if (has("pnpm-lock.yaml")) return ["pnpm", "test"];
  if (has("yarn.lock")) return ["yarn", "test"];
  return ["npm", "test"];
}

/** Ordered: the first runner whose marker file exists wins. */
const RUNNER_COMMANDS: ReadonlyArray<
  Readonly<{
    runner: string;
    id: string;
    files: readonly string[];
    command: readonly string[];
  }>
> = [
  {
    runner: "playwright",
    id: "e2e",
    files: [
      "playwright.config.ts",
      "playwright.config.mjs",
      "playwright.config.js",
    ],
    command: ["npx", "playwright", "test"],
  },
  {
    runner: "vitest",
    id: "unit",
    files: ["vitest.config.ts", "vitest.config.mjs", "vitest.config.js"],
    command: ["npx", "vitest", "run"],
  },
  {
    runner: "jest",
    id: "unit",
    files: ["jest.config.ts", "jest.config.mjs", "jest.config.js"],
    command: ["npx", "jest", "--ci"],
  },
  {
    runner: "pytest",
    id: "unit",
    files: ["pytest.ini", "pyproject.toml", "setup.cfg", "tox.ini"],
    command: ["pytest"],
  },
  {
    runner: "go test",
    id: "unit",
    files: ["go.mod"],
    command: ["go", "test", "./..."],
  },
  {
    runner: "cargo test",
    id: "unit",
    files: ["Cargo.toml"],
    command: ["cargo", "test"],
  },
  {
    runner: "maven",
    id: "unit",
    files: ["pom.xml"],
    command: ["mvn", "test"],
  },
  {
    runner: "gradle",
    id: "unit",
    files: ["build.gradle", "build.gradle.kts"],
    command: ["gradle", "test"],
  },
  {
    runner: "rake test",
    id: "unit",
    files: ["Rakefile"],
    command: ["bundle", "exec", "rake", "test"],
  },
];

/**
 * The command-producer integration Kibi proposes for the repository's test
 * runner: the package.json `test` script when there is one (it is what the
 * project already runs), otherwise the first detected runner. A command
 * integration is the universal floor: Kibi judges the run by its exit code
 * (aggregate-run provenance), so it works for every runner without a
 * reporter; a native producer can replace it later through an update plan.
 */
// implements REQ-kibi-verification-evidence-contract
export function proposeProofIntegration(
  root: string,
  overrideId?: string,
): ProposedIntegration | null {
  const npmCommand = packageTestCommand(root);
  const detected =
    npmCommand !== null
      ? {
          runner: `package.json test script (${npmCommand.join(" ")})`,
          id: "unit",
          command: npmCommand,
        }
      : RUNNER_COMMANDS.find((entry) =>
          entry.files.some((file) => existsSync(path.join(root, file))),
        );
  if (detected === undefined) return null;
  const id = overrideId ?? detected.id;
  return {
    runner: detected.runner,
    integration: {
      id,
      producer: "command",
      command: [...detected.command],
      targets: ["default"],
      description: `Command proof: runs ${detected.command.join(" ")} once per kibi prove and judges every selected test by its exit code.`,
    },
    contractDefaults: {
      version: PROOF_CONTRACT_VERSION,
      integration: id,
      required_proofs: [{ symbol_id: "SYM-<symbol the test proves>", target: "default" }],
      success_policy: "all_required_first_attempt",
    },
  };
}

function sha256(bytes: string | Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function fileHash(filePath: string): string | null {
  try {
    return sha256(readFileSync(filePath));
  } catch {
    return null;
  }
}

function sourceHashes(root: string): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const file of PROPOSAL_SOURCES) {
    const hash = fileHash(path.join(root, file));
    if (hash !== null) hashes[file] = hash;
  }
  return hashes;
}

function readIntegrationsFile(root: string): {
  version: string;
  integrations: ProofIntegration[];
} | null {
  try {
    const parsed = JSON.parse(readFileSync(integrationsPath(root), "utf8")) as {
      version: string;
      integrations: ProofIntegration[];
    };
    return proofIntegrationErrors(parsed).length === 0 ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Build the hash-bound `kibi.migration-plan.v2` that writes
 * `.kb/proof/integrations.json` through Kibi. Without `update`, a plan is
 * produced only while the file does not exist; with `update` it adds or
 * replaces the named integration of an existing, valid file. The plan carries the file's
 * current hash and the hashes of the files the proposal was derived from;
 * `kb_apply_plan` refuses it once either changed.
 */
// implements REQ-kibi-verification-evidence-contract
export function buildProofIntegrationPlan(
  root: string,
  options: Readonly<{ update?: string }> = {},
): ProofIntegrationPlanResult {
  const filePath = integrationsPath(root);
  const exists = existsSync(filePath);
  const update = options.update?.trim() || undefined;
  if (exists && update === undefined) {
    return {
      plan: null,
      proposal: null,
      reason: `${PROOF_INTEGRATIONS_PATH} already exists; Kibi will not overwrite it. Run kibi proof inspect --update <integration id> for a plan that adds or replaces one named integration.`,
    };
  }
  if (!exists && update !== undefined) {
    return {
      plan: null,
      proposal: null,
      reason: `${PROOF_INTEGRATIONS_PATH} does not exist yet. Run kibi proof inspect without --update for a plan that creates it.`,
    };
  }
  if (update !== undefined && readIntegrationsFile(root) === null)
      return {
        plan: null,
        proposal: null,
        reason: `${PROOF_INTEGRATIONS_PATH} is not a valid ${PROOF_INTEGRATION_VERSION} file, so Kibi cannot update one integration in it. Run kibi prove for the validation error.`,
      };
  const proposal = proposeProofIntegration(root, update);
  if (proposal === null) {
    return {
      plan: null,
      proposal: null,
      reason:
        "No test runner detected (no package.json test script and no known runner configuration), so Kibi has no command to propose. Proof integration stays deferred until the first proof-bearing test introduces a harness.",
    };
  }
  const action: MigrationAction = migrationAction({
    id: `proof-integration-${proposal.integration.id}`,
    code: PROOF_INTEGRATION_CONFIGURE,
    category: "proof",
    safety: "automatic",
    autoApplicable: true,
    invocation: {
      kind: "review",
      instruction: `Review the proposed ${proposal.integration.producer} integration '${proposal.integration.id}' (command: ${proposal.integration.command.join(" ")}), then apply this plan with kb_apply_plan (plan, approvedPlanHash, approvedActionIds) to ${update === undefined ? "create" : "update"} ${PROOF_INTEGRATIONS_PATH}.`,
    },
    affectedFiles: [PROOF_INTEGRATIONS_PATH],
    evidence: {
      path: PROOF_INTEGRATIONS_PATH,
      mode: update === undefined ? "create" : "update",
      integration: proposal.integration,
      runner: proposal.runner,
      contractDefaults: proposal.contractDefaults,
      previousFileHash: update === undefined ? null : fileHash(filePath),
      sourceHashes: sourceHashes(root),
    },
    postconditions: [
      { file: PROOF_INTEGRATIONS_PATH, version: PROOF_INTEGRATION_VERSION },
    ],
  });
  return {
    plan: buildMigrationPlan({
      evaluatedDomains: ["proof"],
      actions: [action],
    }),
    proposal,
    reason: `Applying the plan ${update === undefined ? "creates" : "updates"} ${PROOF_INTEGRATIONS_PATH} with the ${proposal.integration.producer} integration '${proposal.integration.id}' (${proposal.integration.command.join(" ")}). Proof-bearing tests then name it in proof_contract.integration and kibi prove runs it.`,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * Apply one reviewed `proof_integration_configure` action: write
 * `.kb/proof/integrations.json` (`kibi.proof-integration.v1`). A create is
 * refused when the file exists; an update is refused unless the file still
 * has the hash the plan was built against, and it adds or replaces only the
 * named integration. Either is refused when
 * a file the proposal was derived from changed since planning.
 */
// implements REQ-kibi-verification-evidence-contract
export function applyProofIntegrationAction(
  action: MigrationAction,
  root: string,
): void {
  const evidence = action.evidence;
  const integration = evidence.integration;
  if (
    evidence.path !== PROOF_INTEGRATIONS_PATH ||
    (evidence.mode !== "create" && evidence.mode !== "update") ||
    !isRecord(integration) ||
    typeof integration.id !== "string"
  )
    throw new Error(
      `Proof integration action '${action.id}' is malformed; rerun kibi proof inspect for a new plan.`,
    );
  const planned = isRecord(evidence.sourceHashes) ? evidence.sourceHashes : {};
  const live = sourceHashes(root);
  const changed = [
    ...new Set([...Object.keys(planned), ...Object.keys(live)]),
  ].filter((file) => planned[file] !== live[file]);
  if (changed.length > 0)
    throw new Error(
      `Proof integration plan refused: ${changed.join(", ")} changed since planning; rerun kibi proof inspect and review the new plan.`,
    );
  const filePath = integrationsPath(root);
  let integrations: unknown[];
  if (evidence.mode === "create") {
    if (existsSync(filePath))
      throw new Error(
        `Proof integration plan refused: ${PROOF_INTEGRATIONS_PATH} already exists and this plan only creates it. Run kibi proof inspect --update <integration id> for a plan that adds or replaces one named integration.`,
      );
    integrations = [integration];
  } else {
    if (fileHash(filePath) !== evidence.previousFileHash)
      throw new Error(
        `Proof integration plan refused: ${PROOF_INTEGRATIONS_PATH} changed since planning; rerun kibi proof inspect --update ${integration.id}.`,
      );
    const current = readIntegrationsFile(root);
    if (current === null)
      throw new Error(
        `Proof integration plan refused: ${PROOF_INTEGRATIONS_PATH} is not a valid ${PROOF_INTEGRATION_VERSION} file.`,
      );
    integrations = current.integrations.some(
      (entry) => entry.id === integration.id,
    )
      ? current.integrations.map((entry) =>
          entry.id === integration.id ? integration : entry,
        )
      : [...current.integrations, integration];
  }
  const file = { version: PROOF_INTEGRATION_VERSION, integrations };
  const errors = proofIntegrationErrors(file);
  if (errors.length > 0)
    throw new Error(
      `Proof integration plan refused: the result would be invalid (${errors.join("; ")}).`,
    );
  mkdirSync(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(file, null, 2)}\n`, "utf8");
  renameSync(temporary, filePath);
}
