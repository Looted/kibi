import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CANONICAL_SKILLS } from "./catalog";
import { CliUsageError, type WorkflowOptions } from "./cli-options";
import {
  buildOfflineReviewArtifacts,
  planOfflineAdoption,
  writeOfflineReviewArtifacts,
} from "./offline-artifacts";
import { RunStore, runOfflineWorkflow } from "./orchestration";
import { runCapabilityCanary, runPreflight } from "./preflight";
import { runRealOptimization } from "./real-workflow";

// implements REQ-skillopt-codex-optimization
// covered_by TEST-skillopt-codex-optimization
export async function runWorkflowCommand(
  command: string,
  options: WorkflowOptions,
): Promise<number> {
  if (command === "dry-run" || command === "prepare") {
    await mkdir(options.artifactRoot, { recursive: true, mode: 0o700 });
    await writeFile(
      join(options.artifactRoot, "dry-run.json"),
      `${JSON.stringify({ schemaVersion: "1.0.0", artifactType: "skillopt-dry-run", mode: "dry-run", runId: options.runId, artifactRoot: options.artifactRoot })}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
    process.stdout.write(`${JSON.stringify({ verdict: "pass", command })}\n`);
    return 0;
  }
  if (command === "status") {
    const state = await new RunStore(
      options.artifactRoot,
      options.runId,
    ).readState();
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
      options.runId,
      options.artifactRoot,
    );
    await writeOfflineReviewArtifacts(options.artifactRoot, artifacts);
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
    return await runPaidOptimization(command, options);
  if (!options.fake)
    throw new CliUsageError(
      `${command} requires --fake until the bounded real smoke gate is enabled`,
    );
  const result = await runOfflineWorkflow({
    root: options.artifactRoot,
    runId: options.runId,
    runLockHash: "0".repeat(64),
  });
  process.stdout.write(`${JSON.stringify({ command, ...result })}\n`);
  return result.phase === "complete" ? 0 : 1;
}

async function runPaidOptimization(
  command: string,
  options: WorkflowOptions,
): Promise<number> {
  if (!options.allowPaid)
    throw new CliUsageError(
      "optimize requires --allow-paid after preflight and smoke",
    );
  if (options.cellRuntime === undefined)
    throw new CliUsageError(
      "optimize requires --fixture-root and --evaluator-manifest for bounded Codex cells",
    );
  const preflight = await runPreflight({
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
  const smoke = await runCapabilityCanary({
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
  const skills =
    options.skill === undefined || options.skill === "all"
      ? [...CANONICAL_SKILLS]
      : [options.skill];
  const result = await runRealOptimization({
    runId: options.runId,
    artifactRoot: options.artifactRoot,
    sourceWorktree: process.cwd(),
    skills,
    maxSteps: options.maxSteps,
    cellRuntime: options.cellRuntime,
  });
  process.stdout.write(
    `${JSON.stringify({ command, preflight, smoke, ...result })}\n`,
  );
  return 0;
}
