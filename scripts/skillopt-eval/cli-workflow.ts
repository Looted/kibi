import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type ArtifactPath,
  ArtifactRootRequiredError,
  prepareArtifactPath,
} from "./artifact-path";
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
import { runRealOptimization } from "./real-workflow";
import type { HeldOutCellRunner } from "./real-workflow-types";
import { runCodexCell } from "./runtime/codex-cell-runner";
import {
  type CodexRuntimeLease,
  createCodexRuntimeLease,
} from "./runtime/codex-runtime";

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
  const preflight = await dependencies.runPreflight({
    runId: options.runId,
    sourceWorktree: process.cwd(),
    artifactRoot: options.artifactRoot,
  });
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
    if (!(error instanceof EvaluationInfrastructureError)) throw error;
    process.stdout.write(
      `${JSON.stringify({ command, ...evaluationInfrastructurePayload(error) })}\n`,
    );
    return 1;
  } finally {
    await runtimeLease.cleanup();
  }
}
