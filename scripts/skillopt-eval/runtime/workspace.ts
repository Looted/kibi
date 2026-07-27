import { resolve } from "node:path";
import {
  resolveArtifactRoot,
  resolveIsolationArtifactRoot,
} from "./artifact-root";
import { runModelCanary } from "./canary-run";
import {
  probeCodexSandbox,
  probeRequiredMcp,
  type stageCapabilityCanary,
} from "./canary-runtime";
import {
  type IsolationWorkspace,
  type WorkspaceOptions,
  createIsolationWorkspace,
} from "./isolation-workspace";
import {
  type CanaryRunner,
  type CapabilityCanaryModelRun,
  type CapabilityCanaryOptions,
  type CapabilityCanaryReceipt,
  OPTIMIZER_MODEL,
  TARGET_MODEL,
} from "./permissions";

export { createIsolationWorkspace };
export type { IsolationWorkspace, WorkspaceOptions };

function noGoReceipt(
  options: CapabilityCanaryOptions,
  authMode: "file" | "keyring" | null,
  paidModelCalls: 0 | 1 | 2,
  reason: string,
  modelRuns: readonly CapabilityCanaryModelRun[],
): CapabilityCanaryReceipt {
  return {
    verdict: "no-go",
    runId: options.runId,
    targetModel: TARGET_MODEL,
    optimizerModel: OPTIMIZER_MODEL,
    authMode,
    paidModelCalls,
    modelRuns,
    events: modelRuns.flatMap(({ events }) => events),
    reason,
  };
}

// implements REQ-skillopt-codex-optimization
export async function runCapabilityCanary(
  options: CapabilityCanaryOptions,
  dependencies?: Readonly<{
    run: CanaryRunner;
    probeSandbox?: typeof probeCodexSandbox;
    probeRequiredMcp?: typeof probeRequiredMcp;
    stageDependencies?: Parameters<typeof stageCapabilityCanary>[2];
  }>,
): Promise<CapabilityCanaryReceipt> {
  const sourceWorktree = resolve(options.sourceWorktree ?? process.cwd());
  const configuredArtifactRoot = await resolveArtifactRoot(
    options.artifactRoot,
  );
  const artifactRoot = resolveIsolationArtifactRoot(
    configuredArtifactRoot,
    sourceWorktree,
  );
  const run =
    dependencies?.run ??
    ((argv, cwd, env, timeoutMs, stdin) =>
      import("./process").then(({ runBoundedProcess }) =>
        runBoundedProcess({ argv, cwd, env, timeoutMs, stdin }),
      ));
  const modelRuns: CapabilityCanaryModelRun[] = [];
  let authMode: "file" | "keyring" | null = null;
  let paidCount = 0;
  let firstFailure: string | null = null;
  for (const role of ["target", "optimizer"] as const) {
    const result = await runModelCanary({
      options,
      role,
      sourceWorktree,
      artifactRoot,
      env: options.env ?? process.env,
      run,
      probeSandbox: dependencies?.probeSandbox ?? probeCodexSandbox,
      probeMcp: dependencies?.probeRequiredMcp ?? probeRequiredMcp,
      stageDependencies: dependencies?.stageDependencies,
    });
    authMode = result.authMode ?? authMode;
    if (result.kind === "pass") {
      modelRuns.push(result.run);
      paidCount += 1;
      continue;
    }
    if (result.run !== undefined) modelRuns.push(result.run);
    paidCount += result.paidModelCalls;
    firstFailure ??= result.reason;
  }
  const paidModelCalls = paidCount === 2 ? 2 : paidCount === 1 ? 1 : 0;
  if (firstFailure !== null) {
    return noGoReceipt(
      options,
      authMode,
      paidModelCalls,
      firstFailure,
      modelRuns,
    );
  }
  return {
    verdict: "pass",
    runId: options.runId,
    targetModel: TARGET_MODEL,
    optimizerModel: OPTIMIZER_MODEL,
    authMode,
    paidModelCalls: 2,
    modelRuns,
    events: modelRuns.flatMap(({ events }) => events),
  };
}
