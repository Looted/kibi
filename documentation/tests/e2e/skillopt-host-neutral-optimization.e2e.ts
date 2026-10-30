/*
 * E2E: SkillOpt runs on the harness chosen for the run and keeps evidence
 * from different harnesses apart.
 *
 * REQ-skillopt-host-neutral-optimization — the harness is an explicit
 * per-run choice, recorded with its CLI version, and evidence produced on one
 * harness never confirms or packages a run on another. A protocol miss is
 * recorded as the first missing required call, as public data only.
 *
 * Nothing here calls a model. The prior evaluation comes from the campaign
 * workflow with offline fixture dependencies; every refusal is then driven
 * through the real CLI entry points as processes.
 *
 *   1. A Codex evaluation records the host and CLI version in campaign.json
 *      and the evaluation context, and its candidate cells carry the first
 *      missing required call; public-feedback.json names it without task,
 *      fixture or evaluator content.
 *   2. The scorer names the first missing call by tool and position.
 *   3. `campaign.ts confirm --host claude-code` refuses the Codex evaluation
 *      with evaluation_host_mismatch before writing anything, and the flag
 *      wins over KIBI_SKILLOPT_HOST in both directions.
 *   4. `campaign.ts package --evaluation --host claude-code` refuses it with
 *      package_evidence_host_mismatch before assembly.
 *   5. An unknown `--host` exits 2 on campaign.ts; `cli.ts` and `operator.ts`
 *      refuse the Codex-only workflow on another host with exit 2.
 *   6. The offline workflow contracts are at 1.1.0 and carry no bundle.
 *
 * Run via `bun run documentation/tests/e2e/skillopt-host-neutral-optimization.e2e.ts`.
 */
import "../../../scripts/skillopt-eval/offline-test-preload";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runEvaluateCampaign } from "../../../scripts/skillopt-eval/campaign-workflow";
import { OFFLINE_CONTRACT_SCHEMA_VERSION } from "../../../scripts/skillopt-eval/contracts/common";
import { firstMissingRequiredCall } from "../../../scripts/skillopt-eval/scoring/cell";
import {
  candidateManifest,
  defaultCellDependencies,
  dependencies,
} from "../../../scripts/skillopt-eval/tests/fixtures/campaign-workflow-fixtures";
import {
  PRIVATE_PATH,
  protocolEvidence,
  protocolManifest,
} from "../../../scripts/skillopt-eval/tests/fixtures/protocol-failure-fixtures";

const REPO_ROOT = process.cwd();
const BUN = process.execPath;

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error(`E2E FAILURE: ${message}`);
    process.exit(1);
  }
}

function run(
  script: string,
  args: readonly string[],
  env: Record<string, string | undefined>,
) {
  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete childEnv[key];
    else childEnv[key] = value;
  }
  return spawnSync(BUN, [`scripts/skillopt-eval/${script}`, ...args], {
    cwd: REPO_ROOT,
    env: childEnv,
    encoding: "utf8",
    timeout: 120_000,
  });
}

const root = realpathSync(
  mkdtempSync(join(tmpdir(), "skillopt-host-neutral-e2e-")),
);
try {
  // 1. A complete Codex evaluation with protocol misses in candidate cells.
  const priorRoot = join(root, "prior");
  const fake = dependencies();
  const prior = await runEvaluateCampaign({
    sourceRoot: REPO_ROOT,
    artifactRoot: priorRoot,
    skill: "kibi-usage",
    manifests: [candidateManifest()],
    repeats: 1,
    maxTargetEpisodes: 16,
    allowPaid: true,
    runId: "00000000-0000-4000-8000-0000000000e2",
    host: "codex",
    dependencies: defaultCellDependencies(fake.deps),
  });
  assert(prior.status === "complete", "prior evaluation did not complete");
  assert(
    prior.context.host?.id === "codex" &&
      prior.context.host.cliVersion === "test",
    "evaluation context does not record the host and CLI version",
  );
  const campaign = JSON.parse(
    readFileSync(join(priorRoot, "campaign.json"), "utf8"),
  ) as { host?: { id: string; cliVersion: string | null } };
  assert(
    campaign.host?.id === "codex" && campaign.host.cliVersion === "test",
    "campaign.json does not record the host",
  );
  const missed = prior.cells.filter((cell) => cell.protocolFailure);
  assert(
    missed.length > 0 &&
      missed.every(
        (cell) =>
          cell.variant !== "baseline" &&
          cell.protocolFailure?.kind === "missing_required_call" &&
          cell.protocolFailure.tool === "kb_query" &&
          cell.protocolFailure.position === 2,
      ),
    "candidate cells do not carry the first missing required call",
  );
  const feedbackText = readFileSync(
    join(priorRoot, "public-feedback.json"),
    "utf8",
  );
  const feedback = JSON.parse(feedbackText) as {
    observations: { family: string; observation: string }[];
  };
  assert(
    feedback.observations.length > 0 &&
      feedback.observations.every((entry) =>
        entry.observation.includes("required call 2 (kb_query)"),
      ),
    "public feedback does not name the missing call",
  );
  for (const leak of ["development-1", "taskId", "episode", "scorer"])
    assert(!feedbackText.includes(leak), `public feedback leaks ${leak}`);
  const evaluationPath = join(priorRoot, "evaluation.json");
  assert(existsSync(evaluationPath), "evaluation.json was not written");

  // 2. The scorer names the first missing call and never its arguments.
  const failure = firstMissingRequiredCall(
    protocolManifest(true),
    protocolEvidence([{ tool: "kb_search" }, { tool: "kb_query" }]),
  );
  assert(
    failure?.tool === "kb_search" && failure.position === 1,
    "argument miss is not reported as the first missing call",
  );
  assert(
    !JSON.stringify(failure).includes(PRIVATE_PATH),
    "missing call record leaks private arguments",
  );

  // 3. confirm refuses evidence from another harness before any work.
  const confirmRoot = join(root, "confirm");
  const confirmArgs = (host: readonly string[]) => [
    "confirm",
    "--artifact-root",
    confirmRoot,
    "--previous-evaluation",
    evaluationPath,
    "--repeats",
    "1",
    "--max-target-episodes",
    "20",
    "--allow-paid",
    ...host,
  ];
  const mismatch = run("campaign.ts", confirmArgs(["--host", "claude-code"]), {
    KIBI_SKILLOPT_HOST: "codex",
  });
  assert(
    mismatch.status === 1 &&
      mismatch.stderr.includes("evaluation_host_mismatch"),
    `confirm on another host exited ${mismatch.status}: ${mismatch.stderr}`,
  );
  assert(!existsSync(confirmRoot), "refused confirm wrote artifacts");
  const fromEnv = run("campaign.ts", confirmArgs([]), {
    KIBI_SKILLOPT_HOST: "claude-code",
  });
  assert(
    fromEnv.status === 1 && fromEnv.stderr.includes("evaluation_host_mismatch"),
    "KIBI_SKILLOPT_HOST is not the fallback host",
  );
  // The flag overrides the environment; without --allow-paid the same-host
  // confirm then stops at the paid guard instead of the host check.
  const sameHost = run(
    "campaign.ts",
    confirmArgs(["--host", "codex"]).filter((arg) => arg !== "--allow-paid"),
    { KIBI_SKILLOPT_HOST: "claude-code" },
  );
  assert(
    sameHost.status === 1 &&
      sameHost.stderr.includes("allow_paid_required") &&
      !sameHost.stderr.includes("host"),
    `--host did not win over the environment: ${sameHost.stderr}`,
  );

  // 4. package refuses evidence from another harness before assembly.
  const manifestPath = join(root, "candidate.json");
  writeFileSync(manifestPath, JSON.stringify(prior.candidates[0]));
  const packageRoot = join(root, "package");
  const packaged = run(
    "campaign.ts",
    [
      "package",
      "--artifact-root",
      packageRoot,
      "--candidate-manifest",
      manifestPath,
      "--evaluation",
      evaluationPath,
      "--host",
      "claude-code",
    ],
    { KIBI_SKILLOPT_HOST: undefined },
  );
  assert(
    packaged.status === 1 &&
      packaged.stderr.includes("package_evidence_host_mismatch"),
    `package on another host exited ${packaged.status}: ${packaged.stderr}`,
  );
  assert(
    !existsSync(packageRoot) || readdirSync(packageRoot).length === 0,
    "refused package assembled skills",
  );

  // 5. Unknown hosts and the Codex-only workflow are refused with exit 2.
  const unknown = run(
    "campaign.ts",
    ["evaluate", "--artifact-root", join(root, "unknown"), "--host", "other"],
    { KIBI_SKILLOPT_HOST: "codex" },
  );
  assert(
    unknown.status === 2 && unknown.stderr.includes("--host must be one of"),
    `unknown --host exited ${unknown.status}`,
  );
  const legacy = run(
    "cli.ts",
    ["optimize", "--run-id", "e2e", "--allow-paid", "--host", "claude-code"],
    { KIBI_SKILLOPT_HOST: undefined },
  );
  assert(
    legacy.status === 2,
    `cli.ts optimize on claude-code exited ${legacy.status}`,
  );
  const operator = run("operator.ts", ["optimize", "--host", "claude-code"], {
    KIBI_SKILLOPT_HOST: undefined,
  });
  assert(
    operator.status === 2,
    `operator.ts optimize on claude-code exited ${operator.status}`,
  );

  // 6. Offline workflow contracts no longer carry the assembled bundle.
  assert(
    OFFLINE_CONTRACT_SCHEMA_VERSION === "1.1.0",
    "offline contract version not bumped",
  );
  for (const name of [
    "run-lock",
    "ledger-entry",
    "run-state",
    "report",
    "proposal",
    "approval",
  ]) {
    const schema = readFileSync(
      join(REPO_ROOT, `documentation/evaluations/skillopt/${name}.schema.json`),
      "utf8",
    );
    assert(!/bundle/i.test(schema), `${name} schema still names a bundle`);
  }

  console.log("skillopt host-neutral optimization e2e: all assertions passed");
} finally {
  rmSync(root, { recursive: true, force: true });
}
