import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { CampaignDependencies } from "./campaign-workflow";
import {
  type PreflightConfig,
  type PreflightReceipt,
  sourceWorktreeIsClean,
} from "./legacy-preflight";
import { resolveArtifactRoot } from "./runtime/artifact-root";
import { RuntimePrerequisiteError } from "./runtime/canary-errors";
import {
  RequiredMcpStartupError,
  probeRequiredMcp,
} from "./runtime/canary-runtime";
import {
  claudeTargetEnv,
  createClaudeRuntimeLease,
  resolveClaudeExecutable,
  runClaudeModelCanary,
  selectedSkillOptHost,
  withClaudeAuthLease,
} from "./runtime/claude-code-host";
import { createIsolationWorkspace } from "./runtime/isolation-workspace";
import { stageKibiMcpBroker } from "./runtime/mcp-broker-stage";
import {
  SkillOptModelConfigError,
  activeSkillOptModelConfig,
  assertSkillOptModelsReadyForPaidWork,
} from "./runtime/models";
import type {
  CanaryRunner,
  CapabilityCanaryOptions,
  CapabilityCanaryReceipt,
} from "./runtime/permissions";
import { ProcessControlError, runBoundedProcess } from "./runtime/process";

const run: CanaryRunner = (argv, cwd, env, timeoutMs, stdin) =>
  runBoundedProcess({ argv, cwd, env, timeoutMs, stdin });

/**
 * Claude Code preflight: clean source, `claude --version`, priced models and
 * a real brokered MCP startup probe. No model call. `bwrap` is reported
 * false because the Claude host relies on permission rules, not an OS sandbox.
 */
// implements REQ-skillopt-claude-code-host
export async function runClaudeCodePreflight(
  config: PreflightConfig,
): Promise<PreflightReceipt> {
  const models = activeSkillOptModelConfig();
  const sourceWorktree = resolve(config.sourceWorktree ?? process.cwd());
  const env = config.env ?? process.env;
  let state = {
    codexVersion: null as string | null,
    sourceClean: false,
    configValid: false,
  };
  const receipt = (verdict: "pass" | "no-go", reason?: string) => ({
    verdict,
    runId: config.runId,
    targetModel: models.targetModel,
    optimizerModel: models.optimizerModel,
    skilloptCommit: "b860a5cf88ce75e2bd02ca981ac21fb28cffba83" as const,
    codexVersion: state.codexVersion,
    authMode: null,
    bwrap: false,
    sourceClean: state.sourceClean,
    configValid: state.configValid,
    paidModelCalls: 0 as const,
    ...(reason === undefined ? {} : { reason }),
  });
  const clean = await sourceWorktreeIsClean(sourceWorktree, env);
  state = { ...state, sourceClean: clean };
  if (!clean) return receipt("no-go", "source_not_clean");
  const artifactRoot = await resolveArtifactRoot(config.artifactRoot);
  const workspace = await createIsolationWorkspace({
    artifactRoot,
    runId: config.runId,
    role: "target",
  });
  try {
    assertSkillOptModelsReadyForPaidWork(env);
    const claudeExecutable = await resolveClaudeExecutable(env);
    const version = await run(
      [claudeExecutable, "--version"],
      workspace.target,
      { PATH: process.env.PATH ?? "/usr/bin:/bin" },
      15_000,
    );
    if (version.exitCode !== 0) return receipt("no-go", "missing_host:claude");
    state = { ...state, codexVersion: `claude-code ${version.stdout.trim()}` };
    await mkdir(join(workspace.target, ".kb"), {
      recursive: true,
      mode: 0o700,
    });
    const broker = await stageKibiMcpBroker(workspace, sourceWorktree);
    await probeRequiredMcp({
      ...broker,
      env: claudeTargetEnv({
        env,
        claudeExecutable,
        privateConfigDir: workspace.codexHome,
        sandboxHome: workspace.sandboxHome,
      }),
    });
    state = { ...state, configValid: true };
    return receipt("pass");
  } catch (error) {
    if (
      error instanceof RuntimePrerequisiteError ||
      error instanceof RequiredMcpStartupError ||
      error instanceof ProcessControlError ||
      error instanceof SkillOptModelConfigError
    )
      return receipt("no-go", error.message);
    throw error;
  } finally {
    await workspace.cleanup();
  }
}

// implements REQ-skillopt-claude-code-host
export async function runClaudeCodeCanary(
  options: CapabilityCanaryOptions,
): Promise<CapabilityCanaryReceipt> {
  const models = assertSkillOptModelsReadyForPaidWork(
    options.env ?? process.env,
  );
  const artifactRoot = await resolveArtifactRoot(options.artifactRoot);
  const scratchRoot = join(artifactRoot, ".runtime");
  await mkdir(scratchRoot, { recursive: true, mode: 0o700 });
  const root = await mkdtemp(join(scratchRoot, "claude-canary-"));
  const runs = [];
  try {
    // Only target-side commands run on this host (`revise` is refused), so
    // only the target model is probed. The auth lease serializes the probe
    // with cells that may refresh the shared login.
    const env = options.env ?? process.env;
    runs.push(
      await withClaudeAuthLease(env, () =>
        runClaudeModelCanary({ role: "target", env, scratchRoot: root, run }),
      ),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
  const failed = runs.find((entry) => !entry.passed);
  const attempts = runs.length as 0 | 1 | 2;
  return {
    verdict: failed === undefined && runs.length === 1 ? "pass" : "no-go",
    runId: options.runId,
    targetModel: models.targetModel,
    optimizerModel: models.optimizerModel,
    authMode: null,
    paidModelCalls: attempts,
    modelInvocationAttempts: attempts,
    modelRuns: runs.map((entry) => ({
      role: entry.role,
      model: entry.model,
      events: entry.events,
    })),
    events: runs.map((entry) => ({
      type: "claude-code.canary",
      role: entry.role,
      passed: entry.passed,
      hostReportedCostUsd: entry.reportedCostUsd,
      ...(entry.reason === undefined ? {} : { reason: entry.reason }),
    })),
    ...(failed === undefined
      ? {}
      : { phase: "model" as const, reason: failed.reason ?? "canary_failed" }),
  };
}

/**
 * Campaign dependency overrides for the selected host; `undefined` keeps the
 * Codex defaults. Only target-side commands (compose/evaluate/confirm) are
 * covered; `campaignMain` refuses `revise`, whose optimizer step is Codex.
 */
// implements REQ-skillopt-claude-code-host
export function hostCampaignDependencies(
  env: NodeJS.ProcessEnv = process.env,
): Partial<CampaignDependencies> | undefined {
  if (selectedSkillOptHost(env) !== "claude-code") return undefined;
  return {
    runPreflight: runClaudeCodePreflight,
    runCanary: runClaudeCodeCanary,
    createRuntimeLease: (options) => createClaudeRuntimeLease(options, env),
  };
}
