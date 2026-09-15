import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type ArtifactPath,
  ArtifactRootRequiredError,
  prepareArtifactPath,
} from "./artifact-path";
import {
  type BundleSurface,
  type BundleSurfaces,
  runPaidBundleGate,
} from "./bundle-workflow";
import {
  CampaignArtifactError,
  readBundleCandidateManifest,
  sha256Text,
  validateCampaignManifestAgainstSurface,
} from "./campaign-artifacts";
import { CANONICAL_SKILLS } from "./catalog";
import { CliUsageError, type WorkflowOptions } from "./cli-options";
import {
  EvaluationInfrastructureError,
  evaluationInfrastructurePayload,
} from "./evaluation-infrastructure";
import { defaultEvaluateHeldOut } from "./held-out-evaluation";
import {
  buildOfflineReviewArtifacts,
  planOfflineAdoption,
  writeOfflineReviewArtifacts,
} from "./offline-artifacts";
import { RunStore, runOfflineWorkflow } from "./orchestration";
import { runCapabilityCanary, runPreflight } from "./preflight";
import { prepareArtifact } from "./prepared-root";
import { runRealOptimization, surface } from "./real-workflow";
import type { HeldOutCellRunner } from "./real-workflow-types";
import { runCodexCell } from "./runtime/codex-cell-runner";
import {
  type CodexRuntimeLease,
  createCodexRuntimeLease,
} from "./runtime/codex-runtime";
import type { SkillSurface } from "./runtime/skill-assembly";
import {
  TargetEpisodeBudgetError,
  initializeTargetEpisodeBudget,
  readTargetEpisodeBudget,
} from "./target-episode-budget";

const STATEFUL_COMMANDS = new Set([
  "run",
  "resume",
  "status",
  "report",
  "approve",
  "adopt",
  "optimize",
]);

export type WorkflowDependencies = Readonly<{
  readonly runPreflight: typeof runPreflight;
  readonly runCapabilityCanary: typeof runCapabilityCanary;
  readonly runRealOptimization: typeof runRealOptimization;
  readonly evaluateHeldOut: typeof defaultEvaluateHeldOut;
  readonly cellRunner: HeldOutCellRunner;
  readonly resolveBundleSurfaces?: typeof resolveBundleSurfaces;
  readonly createCodexRuntimeLease: (
    options: Readonly<{ artifactRoot: string }>,
  ) => Promise<CodexRuntimeLease>;
}>;

export const defaultWorkflowDependencies = {
  runPreflight,
  runCapabilityCanary,
  runRealOptimization,
  evaluateHeldOut: defaultEvaluateHeldOut,
  cellRunner: runCodexCell,
  createCodexRuntimeLease,
} satisfies WorkflowDependencies;

export type BundleSurfaceSet = Readonly<{
  baselineSurfaces: BundleSurfaces;
  candidateSurfaces: BundleSurfaces;
}>;

export async function resolveBundleSurfaces(
  sourceRoot: string,
  bundleManifestPath: string,
): Promise<BundleSurfaceSet> {
  const bundle = await readBundleCandidateManifest(bundleManifestPath);
  const baselineEntries = await Promise.all(
    CANONICAL_SKILLS.map(async (skill) => {
      const current = await surface(sourceRoot, skill);
      return [skill, current] as const;
    }),
  );
  const baselineSurfaces = Object.fromEntries(
    baselineEntries,
  ) as BundleSurfaces;
  const candidateSurfaces = { ...baselineSurfaces } as Record<
    (typeof CANONICAL_SKILLS)[number],
    BundleSurface
  >;

  for (const entry of bundle.bundle.entries) {
    if (entry.arm === "baseline") continue;
    const manifest = bundle.candidates.get(entry.skill);
    if (manifest === undefined)
      throw new CampaignArtifactError("bundle_candidate_manifest_missing");
    const current = baselineSurfaces[entry.skill];
    validateCampaignManifestAgainstSurface(manifest, current);
    candidateSurfaces[entry.skill] = {
      body: manifest.frozenBody,
      frontmatterHash: manifest.frontmatterHash,
      resourcesHash: manifest.resourcesHash,
    } satisfies SkillSurface;
  }

  if (
    !CANONICAL_SKILLS.some(
      (skill) =>
        sha256Text(baselineSurfaces[skill].body) !==
        sha256Text(candidateSurfaces[skill].body),
    )
  ) {
    throw new CampaignArtifactError("bundle_no_improvement");
  }
  return { baselineSurfaces, candidateSurfaces };
}

type WorkflowExecution = Readonly<{
  options: WorkflowOptions;
  dependencies: WorkflowDependencies;
  artifactPath: ArtifactPath;
}>;

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function runWorkflowCommand(
  command: string,
  options: WorkflowOptions,
  dependencies: WorkflowDependencies = defaultWorkflowDependencies,
): Promise<number> {
  const sourceRoot = options.sourceRoot ?? process.cwd();

  if (STATEFUL_COMMANDS.has(command) && !options.artifactRootExplicit) {
    throw new ArtifactRootRequiredError(
      `${command} requires explicit --artifact-root`,
    );
  }

  let tempRoot: string | undefined;
  const isTemp = options.artifactRootExplicit === false;
  const artRoot = isTemp
    ? await mkdtemp(join(tmpdir(), "kibi-skillopt-"))
    : options.artifactRoot;
  if (isTemp) tempRoot = artRoot;
  const artifactPath = await prepareArtifactPath({
    artifactRoot: artRoot,
    sourceRoot,
    canonicalRoots: [
      join(sourceRoot, "packages", "cli", "src", "public", "skills"),
    ],
  });
  try {
    return await runWorkflowAtRoot(command, {
      options: { ...options, artifactRoot: artRoot, sourceRoot },
      dependencies,
      artifactPath,
    });
  } finally {
    await artifactPath.close();
    if (tempRoot !== undefined) {
      const { rm } = await import("node:fs/promises");
      await rm(tempRoot, { recursive: true, force: true }).catch(
        () => undefined,
      );
    }
  }
}

async function runWorkflowAtRoot(
  command: string,
  execution: WorkflowExecution,
): Promise<number> {
  const { artifactPath, dependencies, options } = execution;
  if (command === "dry-run") {
    await artifactPath.writeText(
      "dry-run.json",
      `${JSON.stringify({
        schemaVersion: "1.0.0",
        artifactType: "skillopt-dry-run",
        mode: "dry-run",
        runId: options.runId,
        artifactRoot: options.artifactRoot,
      })}\n`,
    );
    process.stdout.write(`${JSON.stringify({ verdict: "pass", command })}\n`);
    return 0;
  }
  if (command === "prepare") {
    const prepared = await prepareArtifact({
      preparedRoot: options.artifactRoot,
      runId: options.runId,
      sourceRoot: options.sourceRoot ?? process.cwd(),
      candidates: {
        baseline: "# baseline\n",
        oneShot: "# one-shot\n",
        skillopt: "# skillopt\n",
      },
    });
    process.stdout.write(
      `${JSON.stringify({
        verdict: "pass",
        command,
        preparedArtifactRoot: prepared.generatedArtifactRoot,
      })}\n`,
    );
    return 0;
  }
  if (command === "status") {
    const store = new RunStore(
      options.artifactRoot,
      options.runId,
      artifactPath,
    );
    const state = await store.readState();
    process.stdout.write(
      `${JSON.stringify({ runId: options.runId, state })}\n`,
    );
    return state === undefined ? 1 : 0;
  }
  if (command === "report" || command === "approve" || command === "adopt") {
    if (!options.fake)
      throw new CliUsageError(
        `${command} requires --fake for offline review artifacts`,
      );
    const artifacts = await buildOfflineReviewArtifacts(
      process.cwd(),
      options.runId,
      options.artifactRoot,
    );
    await writeOfflineReviewArtifacts(artifactPath, artifacts);
    if (command === "adopt") {
      const plan = await planOfflineAdoption(process.cwd(), artifacts);
      process.stdout.write(
        `${JSON.stringify({ command, dryRun: true, plan })}\n`,
      );
      return 0;
    }
    process.stdout.write(`${JSON.stringify({ command, verdict: "pass" })}\n`);
    return 0;
  }
  if (command === "optimize" && !options.fake)
    return await runPaidOptimization(
      command,
      options,
      dependencies,
      artifactPath,
    );
  if (command === "bundle" && !options.fake)
    return await runPaidBundleStage(options, dependencies, artifactPath);
  if (!options.fake)
    throw new CliUsageError(
      `${command} requires --fake until the bounded real smoke gate is enabled`,
    );
  const result = await runOfflineWorkflow({
    root: options.artifactRoot,
    runId: options.runId,
    runLockHash: "0".repeat(64),
    artifactPath,
  });
  process.stdout.write(`${JSON.stringify({ command, ...result })}\n`);
  return result.phase === "complete" ? 0 : 1;
}

async function runPaidOptimization(
  command: string,
  options: WorkflowOptions,
  dependencies: WorkflowDependencies,
  artifactPath: ArtifactPath,
): Promise<number> {
  if (!options.allowPaid)
    throw new CliUsageError(
      "optimize requires --allow-paid after preflight and smoke",
    );
  if (options.skill === undefined || options.skill === "all")
    throw new CliUsageError(
      "real optimize requires one --skill (use bundle for the assembled suite)",
    );
  if (options.cellRuntime === undefined)
    throw new CliUsageError(
      "optimize requires --fixture-run-root for bounded Codex cells",
    );
  let env = process.env;
  if (options.developmentOnly === true) {
    // Development-only runs are the bounded paid lane. The normal optimize
    // route and the separate bundle stage retain their existing budgets.
    try {
      const budgetEnv = await initializeTargetEpisodeBudget(
        options.artifactRoot,
        64,
      );
      env = { ...process.env, ...budgetEnv };
    } catch (error) {
      if (!(error instanceof TargetEpisodeBudgetError)) throw error;
      return await reportTargetBudgetFailure(
        command,
        options,
        artifactPath,
        error,
        env,
      );
    }
  }
  const preflight = await dependencies.runPreflight({
    runId: options.runId,
    sourceWorktree: process.cwd(),
    artifactRoot: options.artifactRoot,
  });
  await writeGateReceipt(artifactPath, "preflight.json", preflight);
  if (preflight.verdict !== "pass") {
    process.stdout.write(
      `${JSON.stringify({ command, stage: "preflight", ...preflight })}\n`,
    );
    return 1;
  }
  const smoke = await dependencies.runCapabilityCanary({
    runId: options.runId,
    sourceWorktree: process.cwd(),
    artifactRoot: options.artifactRoot,
  });
  await writeGateReceipt(artifactPath, "smoke.json", smoke);
  if (smoke.verdict !== "pass") {
    process.stdout.write(
      `${JSON.stringify({ command, stage: "smoke", ...smoke })}\n`,
    );
    return 1;
  }
  let runtimeLease: CodexRuntimeLease;
  try {
    runtimeLease = await dependencies.createCodexRuntimeLease({
      artifactRoot: options.artifactRoot,
    });
  } catch (error) {
    const failure = new EvaluationInfrastructureError({
      stage: "runtime",
      taskId: "runtime-staging",
      variant: "skillopt",
      status: "runtime-staging-failure",
      criticalFailures: [
        error instanceof Error ? error.message : "runtime_staging_failure",
      ],
      receiptPath: null,
    });
    process.stdout.write(
      `${JSON.stringify({ command, ...evaluationInfrastructurePayload(failure) })}\n`,
    );
    return 1;
  }
  try {
    const result = await dependencies.runRealOptimization(
      {
        runId: options.runId,
        artifactRoot: options.artifactRoot,
        sourceWorktree: process.cwd(),
        skills: [options.skill],
        maxSteps: options.maxSteps,
        developmentOnly: options.developmentOnly ?? false,
        env,
        ...(options.seedCandidate === undefined
          ? {}
          : { seedCandidatePath: options.seedCandidate }),
        cellRuntime: {
          ...options.cellRuntime,
          codexExecutable: runtimeLease.codexExecutable,
          bwrapExecutable: runtimeLease.bwrapExecutable,
        },
        artifactPath,
      },
      {
        evaluateHeldOut: (input) =>
          dependencies.evaluateHeldOut({
            ...input,
            cellRunner: dependencies.cellRunner,
          }),
      },
    );
    process.stdout.write(
      `${JSON.stringify({ command, preflight, smoke, ...result })}\n`,
    );
    return 0;
  } catch (error) {
    if (error instanceof TargetEpisodeBudgetError) {
      return await reportTargetBudgetFailure(
        command,
        options,
        artifactPath,
        error,
        env,
      );
    }
    if (!(error instanceof EvaluationInfrastructureError)) throw error;
    process.stdout.write(
      `${JSON.stringify({ command, ...evaluationInfrastructurePayload(error) })}\n`,
    );
    return 1;
  } finally {
    await runtimeLease.cleanup();
  }
}

async function reportTargetBudgetFailure(
  command: string,
  options: WorkflowOptions,
  artifactPath: ArtifactPath,
  error: TargetEpisodeBudgetError,
  env: NodeJS.ProcessEnv,
): Promise<number> {
  const targetEpisodeBudget = await readTargetEpisodeBudget(
    env,
    process.cwd(),
  ).catch(() => undefined);
  const failure = {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-optimization-failure",
    command,
    runId: options.runId,
    artifactRoot: artifactPath.path,
    verdict: "no-go",
    stage: "development",
    status: "blocked",
    reason: error.code,
    reviewPath: join(artifactPath.path, "optimization-review.json"),
    failurePath: join(artifactPath.path, "optimization-failure.json"),
    ...(targetEpisodeBudget === undefined ? {} : { targetEpisodeBudget }),
  } as const;
  await artifactPath.writeText(
    "optimization-failure.json",
    `${JSON.stringify(failure, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(failure)}\n`);
  return 1;
}

// implements REQ-skillopt-codex-optimization
async function runPaidBundleStage(
  options: WorkflowOptions,
  dependencies: WorkflowDependencies,
  artifactPath: ArtifactPath,
): Promise<number> {
  if (!options.allowPaid)
    throw new CliUsageError(
      "bundle requires --allow-paid after preflight and smoke",
    );
  if (options.skill !== "all")
    throw new CliUsageError("real bundle requires --skill all");
  if (options.cellRuntime === undefined)
    throw new CliUsageError(
      "bundle requires --fixture-run-root for bounded Codex cells",
    );
  if (options.candidateManifest === undefined)
    throw new CliUsageError("bundle requires --candidate-manifest PATH");
  const sourceWorktree = options.sourceRoot ?? process.cwd();
  let bundleSurfaces: BundleSurfaceSet;
  try {
    bundleSurfaces = await (
      dependencies.resolveBundleSurfaces ?? resolveBundleSurfaces
    )(sourceWorktree, options.candidateManifest);
  } catch (error) {
    if (error instanceof CliUsageError) throw error;
    throw new CliUsageError(
      `bundle candidate manifest rejected: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
  const preflight = await dependencies.runPreflight({
    runId: options.runId,
    sourceWorktree,
    artifactRoot: options.artifactRoot,
  });
  await writeGateReceipt(artifactPath, "preflight.json", preflight);
  if (preflight.verdict !== "pass") {
    process.stdout.write(
      `${JSON.stringify({ command: "bundle", stage: "preflight", ...preflight })}\n`,
    );
    return 1;
  }
  const smoke = await dependencies.runCapabilityCanary({
    runId: options.runId,
    sourceWorktree,
    artifactRoot: options.artifactRoot,
  });
  await writeGateReceipt(artifactPath, "smoke.json", smoke);
  if (smoke.verdict !== "pass") {
    process.stdout.write(
      `${JSON.stringify({ command: "bundle", stage: "smoke", ...smoke })}\n`,
    );
    return 1;
  }
  const runtimeLease = await dependencies.createCodexRuntimeLease({
    artifactRoot: options.artifactRoot,
  });
  try {
    const result = await runPaidBundleGate(
      {
        runId: options.runId,
        artifactRoot: options.artifactRoot,
        sourceWorktree,
        fixtureRunRoot: options.cellRuntime.fixtureRunRoot,
        baselineSurfaces: bundleSurfaces.baselineSurfaces,
        candidateSurfaces: bundleSurfaces.candidateSurfaces,
        env: process.env,
        codexExecutable: runtimeLease.codexExecutable,
        bwrapExecutable: runtimeLease.bwrapExecutable,
      },
      { runCodexCell: async (cellOptions) => await runCodexCell(cellOptions) },
    );
    const verdictLine = {
      command: "bundle",
      verdict: result.verdict,
      reportPath: result.reportPath,
      productionAdoption: "external-verdict-required",
    };
    process.stdout.write(`${JSON.stringify(verdictLine)}\n`);
    return result.exitCode;
  } finally {
    await runtimeLease.cleanup();
  }
}

async function writeGateReceipt(
  artifactPath: ArtifactPath,
  name: "preflight.json" | "smoke.json",
  receipt: unknown,
): Promise<void> {
  await artifactPath.writeText(name, `${JSON.stringify(receipt, null, 2)}\n`);
}
