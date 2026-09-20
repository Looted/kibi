/*
 * E2E: SkillOpt external trust boundaries fail closed through the real CLIs.
 *
 * REQ-skillopt-external-adoption-verdict and REQ-skillopt-paid-launch-accounting
 * — production adoption and paid launches are gated behind independently
 * verified external verdicts and an immutable external trust plane. This
 * exerciser drives the real CLI entry points as processes (no injected
 * dependencies) and asserts the guaranteed fail-closed outcomes:
 *
 *   1. The external trust plane probe reports a structured no-activity receipt
 *      (nothing spawned, nothing contacted, no ledger writes) when the
 *      provisioned trust files are absent.
 *   2. The paid optimize lane refuses unpaid use, unconfigured use, and
 *      produces a structured exit-1 preflight no-go (with a durable gate
 *      receipt) when the Codex executable is missing from the runtime PATH.
 *   3. Local/offline evidence stays review-only: `adopt` refuses to run
 *      without `--fake`, the offline adoption plan is a dry run, and the
 *      canonical skill surface is never mutated.
 *
 * Run via `bun run documentation/tests/e2e/skillopt-trust-boundaries.e2e.ts`.
 */
import { spawnSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareArtifact } from "../../../scripts/skillopt-eval/prepared-root";
import { receipt as hostReceipt } from "../../../scripts/skillopt-eval/preflight-host-model";
import {
  rootAuthorizationFixture,
  supervisorParentFixture,
} from "../../../scripts/skillopt-eval/tests/fixtures/trust-plane-fixtures";

const REPO_ROOT = process.cwd();
const BUN = process.execPath;

function assert(condition: unknown, message: string): void {
  if (!condition) {
    console.error(`E2E FAILURE: ${message}`);
    process.exit(1);
  }
}

type RunResult = {
  status: number | null;
  stdout: string;
  stderr: string;
};

function runBun(
  script: string,
  args: readonly string[],
  options: Readonly<{
    cwd?: string;
    env?: NodeJS.ProcessEnv;
  }> = {},
): RunResult {
  const result = spawnSync(BUN, [join(REPO_ROOT, script), ...args], {
    cwd: options.cwd ?? REPO_ROOT,
    env: { ...process.env, ...(options.env ?? {}) },
    encoding: "utf8",
    timeout: 180_000,
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function directoryFingerprint(root: string): string {
  const hash = createHash("sha256");
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort(
      (left, right) => left.name.localeCompare(right.name),
    )) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        hash.update(`${entry.name}/\n`);
        walk(full);
        continue;
      }
      hash.update(`${entry.name}\n`);
      hash.update(createHash("sha256").update(readFileSync(full)).digest("hex"));
      hash.update("\n");
    }
  };
  walk(root);
  return hash.digest("hex");
}

const scratch = mkdtempSync(join(tmpdir(), "kibi-skillopt-boundaries-"));
try {
  // ── 1. The external trust plane probe fails closed with no activity ──────
  const trust = runBun(
    "scripts/skillopt-eval/runtime/external-trust-client-cli.ts",
    [],
  );
  assert(
    trust.status === 78,
    `the trust probe must exit 78 (config error) when the external plane is missing, got ${trust.status}:\n${trust.stdout}\n${trust.stderr}`,
  );
  const noActivity = JSON.parse(trust.stderr.trim().split("\n").pop() ?? "{}") as {
    code?: string;
    missing?: string[];
    processSpawned?: boolean;
    providerContacted?: boolean;
    ledgerWritten?: boolean;
    installerCommand?: string;
  };
  assert(
    noActivity.code === "EXTERNAL_PREREQUISITE_MISSING",
    `the no-activity receipt must carry the structured code, got: ${JSON.stringify(noActivity)}`,
  );
  assert(
    Array.isArray(noActivity.missing) && noActivity.missing.length === 3,
    `every provisioned trust path must be reported missing: ${JSON.stringify(noActivity.missing)}`,
  );
  assert(
    noActivity.processSpawned === false &&
      noActivity.providerContacted === false &&
      noActivity.ledgerWritten === false,
    `a missing trust plane must record zero activity: ${JSON.stringify(noActivity)}`,
  );
  assert(
    typeof noActivity.installerCommand === "string" &&
      noActivity.installerCommand.length > 0,
    "the receipt must point at the provisioning command",
  );

  // ── 2. The paid optimize lane fails closed at every gate ─────────────────
  // Artifact roots are private (0700, current euid) directories; anything
  // looser is rejected by the artifact-path guard before command dispatch.
  const artifactRoot = join(scratch, "artifacts");
  const fixtureRunRoot = join(scratch, "fixture-runs");
  const paidArtifactRoot = join(scratch, "paid-artifacts");
  for (const directory of [artifactRoot, fixtureRunRoot, paidArtifactRoot]) {
    mkdirSync(directory, { mode: 0o700 });
    chmodSync(directory, 0o700);
  }
  const runId = randomUUID();
  const cli = "scripts/skillopt-eval/cli.ts";

  const unpaid = runBun(cli, [
    "optimize",
    "--run-id",
    runId,
    "--artifact-root",
    artifactRoot,
  ]);
  assert(
    unpaid.status === 2,
    `unpaid optimize must be a usage failure (exit 2), got ${unpaid.status}:\n${unpaid.stdout}\n${unpaid.stderr}`,
  );
  assert(
    (unpaid.stderr + unpaid.stdout).includes("requires --allow-paid"),
    "the refusal must name the paid gate",
  );

  const unconfigured = runBun(cli, [
    "optimize",
    "--allow-paid",
    "--skill",
    "kibi-usage",
    "--run-id",
    runId,
    "--artifact-root",
    artifactRoot,
  ]);
  assert(
    unconfigured.status === 2,
    `optimize without the bounded cell runtime must be a usage failure, got ${unconfigured.status}:\n${unconfigured.stdout}\n${unconfigured.stderr}`,
  );
  assert(
    (unconfigured.stderr + unconfigured.stdout).includes("--fixture-run-root"),
    "the refusal must name the missing cell runtime option",
  );

  // A clean fixture worktree so preflight's source-clean gate passes and the
  // run reaches runtime staging, where the stripped PATH hides the Codex
  // executable and must produce the structured no-go.
  const cleanWorktree = join(scratch, "source");
  mkdirSync(cleanWorktree, { recursive: true });
  cpSync(
    join(REPO_ROOT, "packages/cli/src/public/skills"),
    join(cleanWorktree, "packages/cli/src/public/skills"),
    { recursive: true },
  );
  writeFileSync(join(cleanWorktree, "README.md"), "boundary fixture\n", "utf8");
  for (const command of [
    ["init", "--quiet"],
    ["add", "-A"],
    [
      "commit",
      "--quiet",
      "-m",
      "boundary fixture",
      "--author",
      "boundary <boundary@example.invalid>",
    ],
  ] as const) {
    const git = spawnSync("git", [...command], {
      cwd: cleanWorktree,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "boundary",
        GIT_AUTHOR_EMAIL: "boundary@example.invalid",
        GIT_COMMITTER_NAME: "boundary",
        GIT_COMMITTER_EMAIL: "boundary@example.invalid",
      },
      encoding: "utf8",
    });
    assert(
      git.status === 0,
      `fixture git ${command[0]} failed: ${git.stderr ?? ""}`,
    );
  }

  const strippedPath = runBun(
    cli,
    [
      "optimize",
      "--allow-paid",
      "--skill",
      "kibi-usage",
      "--fixture-run-root",
      fixtureRunRoot,
      "--run-id",
      runId,
      "--artifact-root",
      paidArtifactRoot,
    ],
    {
      cwd: cleanWorktree,
      // Hide codex/bwrap so runtime staging must reject the environment.
      env: { PATH: "/usr/bin:/bin" },
    },
  );
  assert(
    strippedPath.status === 1,
    `a paid launch without the Codex runtime must exit 1, got ${strippedPath.status}:\n${strippedPath.stdout}\n${strippedPath.stderr}`,
  );
  const noGo = JSON.parse(strippedPath.stdout.trim().split("\n").pop() ?? "{}") as {
    command?: string;
    stage?: string;
    verdict?: string;
    reason?: string;
  };
  assert(
    noGo.command === "optimize" && noGo.stage === "preflight",
    `the no-go must identify the failed stage, got: ${JSON.stringify(noGo)}`,
  );
  assert(
    noGo.verdict === "no-go",
    `the preflight receipt must be a no-go verdict, got: ${JSON.stringify(noGo)}`,
  );
  assert(
    typeof noGo.reason === "string" && noGo.reason.length > 0,
    "the no-go must carry a structured reason",
  );
  const gateReceipt = join(paidArtifactRoot, "preflight.json");
  assert(
    readFileSync(gateReceipt, "utf8").includes('"no-go"'),
    `the durable preflight gate receipt must be written under the artifact root: ${gateReceipt}`,
  );

  // ── 3. Local evidence stays review-only ───────────────────────────────────
  const skillsRoot = join(REPO_ROOT, "packages/cli/src/public/skills");
  const skillsBefore = directoryFingerprint(skillsRoot);

  const liveAdopt = runBun(cli, [
    "adopt",
    "--run-id",
    runId,
    "--artifact-root",
    artifactRoot,
  ]);
  assert(
    liveAdopt.status === 2,
    `adopt without --fake must be refused (exit 2), got ${liveAdopt.status}:\n${liveAdopt.stdout}\n${liveAdopt.stderr}`,
  );
  assert(
    (liveAdopt.stderr + liveAdopt.stdout).includes("requires --fake"),
    "adopt must name the offline review lane",
  );

  const reviewAdopt = runBun(cli, [
    "adopt",
    "--fake",
    "--run-id",
    runId,
    "--artifact-root",
    artifactRoot,
  ]);
  assert(
    reviewAdopt.status === 0,
    `offline adopt must produce a review plan, got ${reviewAdopt.status}:\n${reviewAdopt.stdout}\n${reviewAdopt.stderr}`,
  );
  const plan = JSON.parse(reviewAdopt.stdout.trim().split("\n").pop() ?? "{}") as {
    command?: string;
    dryRun?: boolean;
  };
  assert(
    plan.command === "adopt" && plan.dryRun === true,
    `the offline adoption plan must stay a dry run, got: ${JSON.stringify(plan)}`,
  );

  assert(
    directoryFingerprint(skillsRoot) === skillsBefore,
    "no review path may mutate the canonical skill surface",
  );

  // ── 4. The verification harness binds every identity before review ───────
  // The harness is the independently verified external-verdict boundary: it
  // validates the preflight receipt, immutable root authorization, supervisor
  // parent (candidate/invocation/matrix identity), and prepared-root binding
  // against the authorized source tree, then runs the review workflow with
  // production adoption still gated on an external verdict.
  const verifyScratch = mkdtempSync(join(scratch, "verify-XXXXXX"));
  const verifySource = join(verifyScratch, "source");
  const verifyPrepared = join(verifyScratch, "prepared");
  const verifyArtifactRoot = join(verifyScratch, "artifacts");
  mkdirSync(join(verifySource, "packages/cli/src/public"), {
    recursive: true,
  });
  cpSync(
    join(REPO_ROOT, "packages/cli/src/public/skills"),
    join(verifySource, "packages/cli/src/public/skills"),
    { recursive: true },
  );
  writeFileSync(join(verifySource, "source.txt"), "authorized source\n");
  for (const command of [
    ["init", "--quiet"],
    ["config", "user.email", "boundary@example.invalid"],
    ["config", "user.name", "boundary"],
    ["add", "."],
    ["commit", "--quiet", "-m", "verify fixture"],
  ] as const) {
    const git = spawnSync("git", [...command], {
      cwd: verifySource,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "boundary",
        GIT_AUTHOR_EMAIL: "boundary@example.invalid",
        GIT_COMMITTER_NAME: "boundary",
        GIT_COMMITTER_EMAIL: "boundary@example.invalid",
      },
      encoding: "utf8",
    });
    assert(
      git.status === 0,
      `verify fixture git ${command[0]} failed: ${git.stderr ?? ""}`,
    );
  }
  const prepared = await prepareArtifact({
    preparedRoot: verifyPrepared,
    runId,
    sourceRoot: verifySource,
    candidates: {
      baseline: "baseline\n",
      oneShot: "skillopt-baseline\n",
      skillopt: "skillopt-candidate\n",
    },
  });
  const parent = {
    ...supervisorParentFixture,
    sourceRoot: prepared.sourceRoot,
    candidateHashes: prepared.candidateHashes,
    invocationHash: prepared.invocationHash,
    matrixId: prepared.matrixId,
  };
  const rootAuthorization = join(verifyScratch, "root-authorization.json");
  const preflightReceipt = join(verifyScratch, "preflight.json");
  const verificationParent = join(verifyScratch, "verification-parent.json");
  writeFileSync(
    rootAuthorization,
    JSON.stringify(rootAuthorizationFixture),
    "utf8",
  );
  writeFileSync(
    preflightReceipt,
    JSON.stringify(hostReceipt({ status: "qualified", code: "OK" })),
    "utf8",
  );
  writeFileSync(verificationParent, JSON.stringify(parent), "utf8");
  const verifyOutput = join(verifyArtifactRoot, "verification-review.json");
  mkdirSync(verifyArtifactRoot, { mode: 0o700 });
  chmodSync(verifyArtifactRoot, 0o700);

  const harnessArgs = [
    "--skill",
    "kibi-usage",
    "--run-id",
    runId,
    "--artifact-root",
    verifyArtifactRoot,
    "--target-root",
    join(verifyScratch, "target-root"),
    "--root-authorization",
    rootAuthorization,
    "--prepared-root",
    verifyPrepared,
    "--preflight-receipt",
    preflightReceipt,
    "--verification-parent",
    verificationParent,
    "--output",
    verifyOutput,
  ];
  const tamperedParent = {
    ...parent,
    candidateHashes: {
      ...parent.candidateHashes,
      skillopt: "f".repeat(64),
    },
  };
  writeFileSync(verificationParent, JSON.stringify(tamperedParent), "utf8");
  const tampered = runBun("scripts/skillopt-eval/verify-harness.ts", harnessArgs, {
    cwd: verifySource,
  });
  assert(
    tampered.status === 2,
    `a tampered candidate binding must be rejected (exit 2), got ${tampered.status}:\n${tampered.stdout}\n${tampered.stderr}`,
  );
  assert(
    (tampered.stderr + tampered.stdout)
      .trim()
      .includes("candidate_binding_mismatch"),
    "the rejection must name the binding that failed",
  );

  writeFileSync(verificationParent, JSON.stringify(parent), "utf8");
  const verified = runBun("scripts/skillopt-eval/verify-harness.ts", harnessArgs, {
    cwd: verifySource,
  });
  assert(
    verified.status === 0,
    `the bound verification harness must complete, got ${verified.status}:\n${verified.stdout}\n${verified.stderr}`,
  );
  const review = JSON.parse(verified.stdout.trim().split("\n").pop() ?? "{}") as {
    productionAdoption?: string;
    paidModelCalls?: number;
    sourceModified?: boolean;
    targetModified?: boolean;
    verificationParentHash?: string;
  };
  assert(
    review.productionAdoption === "external-verdict-required",
    `a complete offline review must still gate production adoption on the external verdict, got: ${JSON.stringify(review)}`,
  );
  assert(
    review.paidModelCalls === 0 &&
      review.sourceModified === false &&
      review.targetModified === false,
    `the offline review must stay free of paid calls and mutations, got: ${JSON.stringify(review)}`,
  );
  assert(
    typeof review.verificationParentHash === "string" &&
      review.verificationParentHash.length === 64,
    "the review must bind the supervisor parent identity",
  );
  assert(
    readFileSync(verifyOutput, "utf8").includes("external-verdict-required"),
    "the durable review artifact must record the adoption gate",
  );

  // ── 5. Canonical skill mirrors stay consistent without mutation ──────────
  // The mirrors are part of the production surface the external verdict gates;
  // a non-mutating consistency check must pass against the canonical skill.
  const mirrorCheck = runBun("scripts/sync-agent-skills.ts", ["--check"]);
  assert(
    mirrorCheck.status === 0,
    `the skill mirrors must match the canonical surface, got ${mirrorCheck.status}:\n${mirrorCheck.stdout}\n${mirrorCheck.stderr}`,
  );
  assert(
    (mirrorCheck.stdout + mirrorCheck.stderr).includes("checked"),
    "the mirror check must report what it verified",
  );
  assert(
    directoryFingerprint(skillsRoot) === skillsBefore,
    "the mirror check must not mutate the canonical surface",
  );

  console.log("skillopt trust boundary e2e: all stages passed");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
