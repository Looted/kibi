import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { loadBundledSkillFrom } from "../../packages/cli/src/public/skills";
import { prepareArtifactPath } from "./artifact-path";
import { validateCompleteCandidateBody } from "./candidate-body";
import { CANONICAL_SKILLS, type CanonicalSkill } from "./catalog";
import {
  type ScreenSample,
  runDevelopmentScreen,
  summarizeScreen,
  validateScreenPlan,
} from "./development-screen";
import {
  EvaluationInfrastructureError,
  evaluationInfrastructurePayload,
} from "./evaluation-infrastructure";
import { materializeFixtureRun } from "./fixtures/private";
import { inspectHistoricalCandidates } from "./historical-candidates";
import { resolveOperatorBase } from "./operator";
import {
  runCapabilityCanary,
  runPreflight,
  sourceWorktreeIsClean,
} from "./preflight";
import { surface } from "./real-workflow";
import { taskScopedPublicSkillDescriptors } from "./real-workflow-setup";
import { canonicalHash } from "./real-workflow-types";
import { runCodexCell } from "./runtime/codex-cell-runner";
import { createCodexRuntimeLease } from "./runtime/codex-runtime";
import { TARGET_EFFORT, TARGET_MODEL } from "./runtime/permissions";
import { runBoundedProcess } from "./runtime/process";
import { readTargetEpisodeBudget } from "./target-episode-budget";
import { defaultEvaluateDevelopment } from "./training-setup";
import { createBaselineVariant, freezeCandidateVariant } from "./variants";

// implements REQ-skillopt-codex-optimization
export function parseScreenArgs(args: readonly string[]) {
  const hashes: string[] = [];
  let allowPaid = false;
  let skill: CanonicalSkill = "kibi-usage";
  let repeats = 2;
  let maxCells: number | undefined;
  let historyRoot: string | undefined;
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--allow-paid" && !allowPaid) {
      allowPaid = true;
      continue;
    }
    if (
      !flag ||
      ![
        "--candidate-hash",
        "--skill",
        "--repeats",
        "--max-cells",
        "--history-root",
      ].includes(flag) ||
      (flag !== "--candidate-hash" && seen.has(flag))
    )
      throw new Error("invalid_screen_option");
    seen.add(flag);
    const value = args[++index];
    if (!value || value.startsWith("--"))
      throw new Error("screen_option_requires_value");
    if (flag === "--candidate-hash") {
      if (!/^[a-f0-9]{64}$/.test(value) || hashes.includes(value))
        throw new Error("invalid_or_duplicate_candidate_hash");
      hashes.push(value);
    } else if (flag === "--skill") {
      if (!(CANONICAL_SKILLS as readonly string[]).includes(value))
        throw new Error("invalid_screen_skill");
      skill = value as CanonicalSkill;
    } else if (flag === "--repeats") repeats = Number(value);
    else if (flag === "--max-cells") maxCells = Number(value);
    else historyRoot = resolve(value);
  }
  if (!allowPaid) throw new Error("screen_requires_allow_paid");
  if (
    hashes.length < 1 ||
    hashes.length > 3 ||
    !Number.isInteger(repeats) ||
    repeats < 1 ||
    repeats > 3 ||
    maxCells === undefined ||
    !Number.isInteger(maxCells) ||
    maxCells < 4 * (hashes.length + 1) * repeats ||
    maxCells > 48
  )
    throw new Error("screen_budget_invalid");
  return { hashes, skill, repeats, maxCells, historyRoot };
}

// implements REQ-skillopt-codex-optimization
export async function main(args: readonly string[]): Promise<number> {
  if (args.length === 1 && args[0] === "--help") {
    process.stdout.write(
      "Usage: screen-history.ts --allow-paid --candidate-hash SHA256 [--candidate-hash SHA256] --max-cells N [--repeats 1..3] [--skill ID] [--history-root PATH]\nDevelopment screening only; fresh canary adds at most two model invocations.\n",
    );
    return 0;
  }
  const options = parseScreenArgs(args);
  const sourceWorktree = process.cwd();
  const campaignBudget = await readTargetEpisodeBudget(
    process.env,
    sourceWorktree,
  );
  if (campaignBudget && campaignBudget.remainingCount < options.maxCells) {
    throw new Error("screen_campaign_budget_insufficient");
  }
  if (!(await sourceWorktreeIsClean(sourceWorktree, process.env)))
    throw new Error("source_not_clean");
  const base = await resolveOperatorBase();
  const baselineSurface = await surface(sourceWorktree, options.skill);
  const built = loadBundledSkillFrom(
    join(sourceWorktree, "packages/cli/dist/public/skills"),
    options.skill,
  );
  if (
    built.body !== baselineSurface.body ||
    canonicalHash(built.manifest) !== baselineSurface.frontmatterHash
  )
    throw new Error("baseline_dist_stale");
  const baseline = createBaselineVariant({
    skill: options.skill,
    ...baselineSurface,
  });
  const historyRoot = options.historyRoot ?? join(base, "optimize");
  const inventory = await inspectHistoricalCandidates({
    artifactRoot: historyRoot,
    baselineBodies: { [options.skill]: baseline.body },
  });
  const variants = [baseline];
  const origins = [];
  for (const hash of options.hashes) {
    const entry = inventory.shortlist.find(
      (candidate) =>
        candidate.skill === options.skill && candidate.hash === hash,
    );
    const origin = entry?.origins.find((candidate) => candidate.verified);
    if (!origin) throw new Error(`candidate_not_shortlisted:${hash}`);
    const body = await readFile(resolve(historyRoot, origin.path), "utf8");
    if (createHash("sha256").update(body).digest("hex") !== hash)
      throw new Error("candidate_changed_after_inventory");
    validateCompleteCandidateBody(body);
    variants.push(
      freezeCandidateVariant({
        skill: options.skill,
        variant: "skillopt",
        body,
        frontmatterHash: baseline.frontmatterHash,
        resourcesHash: baseline.resourcesHash,
        provenance: "skillopt",
        sourceRequestHash: canonicalHash(origin),
      }),
    );
    origins.push({ bodyHash: hash, ...origin });
  }
  const pin = await runBoundedProcess({
    argv: [
      "uv",
      "run",
      "--project",
      "tools/skillopt",
      "python",
      "tools/skillopt/verify_pin.py",
    ],
    cwd: sourceWorktree,
    env: process.env,
    timeoutMs: 120000,
  });
  if (pin.exitCode !== 0) throw new Error("skillopt_pin_invalid");
  const runId = randomUUID();
  await mkdir(join(base, "screen"), { recursive: true, mode: 0o700 });
  const root = join(base, "screen", runId);
  const artifacts = await prepareArtifactPath({
    artifactRoot: root,
    sourceRoot: sourceWorktree,
    canonicalRoots: [join(sourceWorktree, "packages/cli/src/public/skills")],
  });
  const fixtureRunRoot = join(base, "fixtures", runId);
  const write = (path: string, data: unknown) =>
    artifacts.writeText(path, `${JSON.stringify(data, null, 2)}\n`);
  let smokeModelInvocationAttempts = 0;
  try {
    const git = await runBoundedProcess({
      argv: ["git", "rev-parse", "HEAD"],
      cwd: sourceWorktree,
      env: process.env,
      timeoutMs: 10000,
    });
    if (git.exitCode !== 0) throw new Error("source_identity_unavailable");
    const lock = {
      schemaVersion: "1.0.0",
      artifactType: "skillopt-development-screen-lock",
      runId,
      sourceCommit: git.stdout.trim(),
      skill: options.skill,
      repeats: options.repeats,
      maxCells: options.maxCells,
      ...(campaignBudget === undefined ? {} : { campaignBudget }),
      targetModel: TARGET_MODEL,
      targetEffort: TARGET_EFFORT,
      policy: "baseline-relative-development-screen.v2",
      origins,
      surfaces: variants.map(({ body, ...variant }) => variant),
      productionAdoption: "external-verdict-required",
    };
    const assertSourceUnchanged = async () => {
      const current = await runBoundedProcess({
        argv: ["git", "rev-parse", "HEAD"],
        cwd: sourceWorktree,
        env: process.env,
        timeoutMs: 10000,
      });
      if (
        current.exitCode !== 0 ||
        current.stdout.trim() !== lock.sourceCommit ||
        !(await sourceWorktreeIsClean(sourceWorktree, process.env)) ||
        canonicalHash(await surface(sourceWorktree, options.skill)) !==
          canonicalHash(baselineSurface)
      )
        throw new Error("source_changed_during_screen");
    };
    await write("screen-lock.json", lock);
    for (const variant of variants)
      await artifacts.writeText(`body-${variant.bodyHash}.md`, variant.body);
    process.stderr.write(`screen run-id=${runId}\nartifact-root=${root}\n`);
    const preflight = await runPreflight({
      runId,
      sourceWorktree,
      artifactRoot: root,
    });
    await write("preflight.json", preflight);
    if (preflight.verdict !== "pass")
      throw new Error(`preflight:${preflight.reason}`);
    const readiness = await runBoundedProcess({
      argv: [
        process.execPath,
        join(sourceWorktree, "scripts/skillopt-eval/fixture-readiness.ts"),
        join(root, "fixture-readiness"),
        join(sourceWorktree, "packages/cli"),
      ],
      cwd: sourceWorktree,
      env: process.env,
      timeoutMs: 120000,
    });
    await write("fixture-readiness.json", { ...readiness, paidModelCalls: 0 });
    if (readiness.exitCode !== 0)
      throw new Error("seeded_fixture_readiness_failed");
    await mkdir(join(base, "fixtures"), { recursive: true, mode: 0o700 });
    materializeFixtureRun({
      runRoot: fixtureRunRoot,
      canonicalSkillRoot: join(
        sourceWorktree,
        "packages/cli/src/public/skills",
      ),
    });
    const tasks = await taskScopedPublicSkillDescriptors(
      "development",
      fixtureRunRoot,
      options.skill,
    );
    validateScreenPlan({
      variants,
      tasks,
      repeats: options.repeats,
      maxCells: options.maxCells,
    });
    const identity = { ...lock, tasks };
    const lockHash = canonicalHash(identity);
    await write("screen-lock.json", { ...identity, lockHash });
    const runtime = await createCodexRuntimeLease({ artifactRoot: root });
    try {
      await assertSourceUnchanged();
      const smoke = await runCapabilityCanary({
        runId,
        sourceWorktree,
        artifactRoot: root,
      });
      smokeModelInvocationAttempts = smoke.modelInvocationAttempts;
      await write("smoke.json", smoke);
      if (smoke.verdict !== "pass") throw new Error("screen_smoke_no_go");
      const result = await runDevelopmentScreen({
        variants,
        tasks,
        repeats: options.repeats,
        maxCells: options.maxCells,
        checkpoint: async (state) => {
          if (state.status === "completed") {
            await assertSourceUnchanged();
          }
          await write("screen-review.json", {
            schemaVersion: "1.0.0",
            artifactType: "skillopt-development-screen-review",
            runId,
            lockHash,
            ...state,
            smokeModelInvocationAttempts,
            targetEpisodesAttempted: state.attemptedCells,
            targetEpisodesCompleted: state.cells.length,
            summaries:
              state.status === "completed"
                ? summarizeScreen(state.cells, variants)
                : [],
            heldOut: "not-run",
            productionAdoption: "external-verdict-required",
          });
        },
        evaluate: async (variant, task, replicate) => {
          await assertSourceUnchanged();
          let sample: ScreenSample | undefined;
          await defaultEvaluateDevelopment({
            skill: options.skill,
            candidate: variant,
            descriptors: [task],
            sourceWorktree,
            artifactRoot: root,
            runId,
            env: process.env,
            runtime: {
              fixtureRunRoot,
              codexExecutable: runtime.codexExecutable,
              bwrapExecutable: runtime.bwrapExecutable,
              timeoutMs: 300000,
            },
            cellRunner: async (input) => {
              const cell = await runCodexCell({
                ...input,
                request: { ...input.request, replicate, runLockHash: lockHash },
              });
              sample = {
                score: cell.receipt.result.score,
                hardPass: cell.receipt.result.hardPass,
                criticalFailures: cell.receipt.result.criticalFailures,
                securityFailures: [
                  ...cell.receipt.violations,
                  ...cell.receipt.result.criticalFailures.filter((failure) =>
                    /^(isolation|sentinel)-/.test(failure),
                  ),
                ],
                receiptPath: cell.receiptPath,
                usage: cell.receipt.result.usage,
              };
              return cell;
            },
          });
          if (!sample) throw new Error("screen_receipt_missing");
          process.stderr.write(
            `cell ${replicate} ${task.family} ${variant.bodyHash.slice(0, 12)} score=${sample.score} hard=${sample.hardPass}\n`,
          );
          return sample;
        },
      });
      process.stdout.write(
        `${JSON.stringify({ runId, artifactRoot: root, ...result, smokeModelInvocationAttempts, heldOut: "not-run", productionAdoption: "external-verdict-required" }, null, 2)}\n`,
      );
      return 0;
    } finally {
      await runtime.cleanup();
    }
  } catch (error) {
    await write("failure.json", {
      runId,
      smokeModelInvocationAttempts,
      error: error instanceof Error ? error.message : String(error),
      ...(error instanceof EvaluationInfrastructureError
        ? evaluationInfrastructurePayload(error)
        : {}),
      productionAdoption: "external-verdict-required",
    });
    throw error;
  } finally {
    await artifacts.close();
  }
}

if (import.meta.main) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      process.stderr.write(
        `${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 1;
    });
}
