import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import { buildSkillCatalog } from "./catalog";
import { EpisodeRequestSchema } from "./contracts/episode";
import { materializeFixtureRun } from "./fixtures/materialize";
import { taskScopedPublicSkillDescriptors } from "./real-workflow-setup";
import {
  claudeReportedCostUsd,
  createClaudeRuntimeLease,
  selectedSkillOptHost,
} from "./runtime/claude-code-host";
import { runCodexCell } from "./runtime/codex-cell-runner";
import { createCodexRuntimeLease } from "./runtime/codex-runtime";
import { PublicTaskClaimSchema } from "./runtime/file-bridge";
import { taskFinalStateRequests } from "./runtime/final-state-requests";
import { assertSkillOptModelsReadyForPaidWork } from "./runtime/models";
import { resolveTaskFixture } from "./runtime/task-fixture";
import { initializeTargetEpisodeBudget } from "./target-episode-budget";

/**
 * Paid single-cell smoke: one development task, one variant, one target
 * episode, scored by the normal evaluator. It proves the host and dialogue
 * plumbing end to end before a paired campaign; it is not a comparison and
 * its result never feeds `confirm` or `package`.
 *
 * bun scripts/skillopt-eval/host-cell-smoke.ts --artifact-root DIR \
 *   --skill kibi-bootstrap --family approval-plan-apply \
 *   [--body-file candidate.md] [--timeout-ms 600000] --allow-paid
 */
// implements REQ-skillopt-claude-code-host
export async function hostCellSmokeMain(
  argv: readonly string[],
): Promise<number> {
  const { values } = parseArgs({
    args: [...argv],
    options: {
      "artifact-root": { type: "string" },
      skill: { type: "string", default: "kibi-bootstrap" },
      family: { type: "string" },
      "body-file": { type: "string" },
      "timeout-ms": { type: "string", default: "600000" },
      "allow-paid": { type: "boolean", default: false },
    },
    strict: true,
  });
  if (values["allow-paid"] !== true) {
    process.stderr.write(
      "host-cell-smoke dispatches a paid model: pass --allow-paid\n",
    );
    return 2;
  }
  const skill = values.skill as CanonicalSkill;
  if (!CANONICAL_SKILLS.includes(skill)) {
    process.stderr.write(`unknown skill ${skill}\n`);
    return 2;
  }
  if (values["artifact-root"] === undefined || values.family === undefined) {
    process.stderr.write("--artifact-root and --family are required\n");
    return 2;
  }
  assertSkillOptModelsReadyForPaidWork();
  const sourceRoot = process.cwd();
  const artifactRoot = resolve(values["artifact-root"]);
  await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
  const fixtureRunRoot = materializeFixtureRun({
    runRoot: join(artifactRoot, `fixtures-${randomUUID()}`),
    canonicalSkillRoot: join(sourceRoot, "packages/cli/src/public/skills"),
    publicTasks: buildSkillCatalog(skill).filter(
      (task) => task.split !== "held-out",
    ),
    heldOutTasks: [],
  }).roots.runRoot;
  const tasks = await taskScopedPublicSkillDescriptors(
    "development",
    fixtureRunRoot,
    skill,
  );
  const task = tasks.find((entry) => entry.family === values.family);
  if (task === undefined) {
    process.stderr.write(
      `no development task for family ${values.family}; have ${tasks.map((entry) => entry.family).join(", ")}\n`,
    );
    return 2;
  }
  const budgetEnv = await initializeTargetEpisodeBudget(
    join(artifactRoot, "target-budget"),
    1,
  );
  const env = { ...process.env, ...budgetEnv };
  const body =
    values["body-file"] === undefined
      ? undefined
      : await readFile(resolve(values["body-file"]), "utf8");
  const publicClaim = PublicTaskClaimSchema.parse(task.publicClaim);
  const fixture = await resolveTaskFixture({
    fixtureRunRoot,
    taskId: task.id,
    publicClaim,
  });
  const runId = randomUUID();
  const request = EpisodeRequestSchema.parse({
    schemaVersion: "1.0.0",
    artifactType: "episode-request",
    episodeId: randomUUID(),
    runId,
    runLockHash: createHash("sha256")
      .update(`host-cell-smoke\0${runId}`)
      .digest("hex"),
    variant: body === undefined ? "baseline" : "skillopt",
    skill,
    taskId: task.id,
    attempt: 1,
    replicate: 1,
    prompt: fixture.publicClaim.text,
    workspaceFixtureHash: fixture.workspaceHash,
  });
  const lease =
    selectedSkillOptHost(env) === "claude-code"
      ? await createClaudeRuntimeLease({ artifactRoot }, env)
      : await createCodexRuntimeLease({ artifactRoot });
  try {
    const completed = await runCodexCell({
      request,
      fixtureRoot: fixture.workspaceRoot,
      sourceWorktree: sourceRoot,
      artifactRoot,
      targetSkill: skill,
      ...(body === undefined ? {} : { candidate: { body } }),
      codexExecutable: lease.codexExecutable,
      bwrapExecutable: lease.bwrapExecutable,
      env,
      finalStateRequests: taskFinalStateRequests(
        task.id,
        fixture.evaluatorManifest.protocolContract?.exactMigrationApply !==
          undefined,
      ),
      evaluatorManifest: fixture.evaluatorManifest,
      hiddenMarkers: [],
      pricingHash: "0".repeat(64),
      priceAmount: 0,
      timeoutMs: Number(values["timeout-ms"]),
    });
    const transcript = await readFile(
      join(completed.artifactDirectory, "raw-host.jsonl"),
      "utf8",
    ).catch(() => "");
    const summary = {
      host: selectedSkillOptHost(env),
      taskId: task.id,
      family: task.family,
      variant: request.variant,
      bodySha256:
        body === undefined
          ? null
          : createHash("sha256").update(body).digest("hex"),
      status: completed.receipt.result.status,
      score: completed.receipt.result.score,
      hardPass: completed.receipt.result.hardPass,
      criticalFailures: completed.receipt.result.criticalFailures,
      violations: completed.receipt.violations,
      usage: completed.receipt.result.usage,
      hostReportedCostUsd: claudeReportedCostUsd(transcript),
      artifactDirectory: completed.artifactDirectory,
    };
    await writeFile(
      join(artifactRoot, "smoke-summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      { mode: 0o600 },
    );
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    return 0;
  } finally {
    await lease.cleanup();
  }
}

if (import.meta.main)
  process.exitCode = await hostCellSmokeMain(process.argv.slice(2));
