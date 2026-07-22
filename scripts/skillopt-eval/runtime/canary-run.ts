import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CanaryEvidenceError,
  verifyCapabilityEvidence,
} from "./canary-evidence";
import { CodexAuthError, prepareExistingLogin } from "./codex-auth";
import {
  type IsolationWorkspace,
  createIsolationWorkspace,
} from "./isolation-workspace";
import {
  type CanaryModel,
  type CanaryRole,
  type CanaryRunner,
  type CapabilityCanaryModelRun,
  type CapabilityCanaryOptions,
  OPTIMIZER_MODEL,
  TARGET_MODEL,
  buildCodexConfig,
  buildCodexExecArgv,
  stageCapabilityCanary,
  summarizeProcessFailure,
  writeCapabilityProbe,
} from "./permissions";
import { JsonLinesError, ProcessControlError, parseJsonLines } from "./process";

export type ModelCanaryResult =
  | Readonly<{
      kind: "pass";
      authMode: "file" | "keyring";
      run: CapabilityCanaryModelRun;
    }>
  | Readonly<{
      kind: "no-go";
      authMode: "file" | "keyring" | null;
      paidModelCalls: 0 | 1;
      reason: string;
      run?: CapabilityCanaryModelRun;
    }>;

export type ModelCanaryContext = Readonly<{
  options: CapabilityCanaryOptions;
  role: CanaryRole;
  sourceWorktree: string;
  artifactRoot: string;
  env: NodeJS.ProcessEnv;
  run: CanaryRunner;
}>;

function modelRun(
  role: CanaryRole,
  events: readonly Readonly<Record<string, unknown>>[],
): CapabilityCanaryModelRun {
  const model: CanaryModel = role === "target" ? TARGET_MODEL : OPTIMIZER_MODEL;
  return { role, model, events };
}

function permissionPaths(
  workspace: IsolationWorkspace,
  sourceWorktree: string,
  realCodexHome: string,
) {
  return {
    workspace: workspace.target,
    runPrivateHome: workspace.codexHome,
    realCodexHome,
    sourceWorktree,
    fixtureKb: join(workspace.target, ".kb"),
    privateScorer: workspace.privateScorer,
    privateEvidence: workspace.privateEvidence,
    siblingRuns: workspace.siblingRun,
  } as const;
}

// implements REQ-skillopt-codex-optimization
export async function runModelCanary(
  context: ModelCanaryContext,
): Promise<ModelCanaryResult> {
  const workspace = await createIsolationWorkspace({
    artifactRoot: context.artifactRoot,
    runId: context.options.runId,
    role: context.role,
  });
  let authMode: "file" | "keyring" | null = null;
  let events: readonly Readonly<Record<string, unknown>>[] = [];
  let paidModelCalls: 0 | 1 = 0;
  try {
    const auth = await prepareExistingLogin({
      privateCodexHome: workspace.codexHome,
      env: context.env,
      run: (argv, childEnv) =>
        context.run(argv, workspace.target, childEnv, 15_000),
    });
    authMode = auth.mode;
    const staged = await stageCapabilityCanary(
      workspace,
      context.sourceWorktree,
    );
    await writeFile(
      join(workspace.codexHome, "config.toml"),
      buildCodexConfig({
        role: context.role,
        authMode,
        paths: permissionPaths(
          workspace,
          context.sourceWorktree,
          auth.realCodexHome,
        ),
        nodeCommand: process.execPath,
        codexExecutable: staged.codexCommand,
        kibiServer: join(context.sourceWorktree, "packages/mcp/dist/server.js"),
      }),
      { encoding: "utf8", mode: 0o600 },
    );
    const probe = await writeCapabilityProbe(workspace, [
      join(auth.realCodexHome, "auth.json"),
      workspace.codexHome,
      context.sourceWorktree,
      join(context.sourceWorktree, ".kb"),
      workspace.privateScorer,
      workspace.privateEvidence,
      workspace.siblingRun,
      "/tmp",
      "/var/tmp",
    ]);
    paidModelCalls = 1;
    const result = await context.run(
      buildCodexExecArgv({
        codexCommand: staged.codexCommand,
        workspace: workspace.target,
        outputSchema: staged.schemaPath,
        role: context.role,
      }),
      workspace.target,
      auth.env,
      120_000,
      `Use shell_command exactly once to execute ${probe.command}. Do not infer or claim success without that tool event. If it exits zero, return probeExecuted=true; otherwise fail.`,
    );
    events = parseJsonLines(result.stdout).map(({ event }) => event);
    const run = modelRun(context.role, events);
    if (result.exitCode !== 0) {
      return {
        kind: "no-go",
        authMode,
        paidModelCalls,
        reason: summarizeProcessFailure(result),
        run,
      };
    }
    if (
      events.some(
        (event) => event.type === "error" || event.type === "turn.failed",
      )
    ) {
      return {
        kind: "no-go",
        authMode,
        paidModelCalls,
        reason: "codex_event_failure",
        run,
      };
    }
    if (!events.some((event) => event.type === "turn.completed")) {
      return {
        kind: "no-go",
        authMode,
        paidModelCalls,
        reason: "missing_turn_completed",
        run,
      };
    }
    await verifyCapabilityEvidence(events, probe);
    return { kind: "pass", authMode, run };
  } catch (error) {
    if (
      error instanceof CodexAuthError ||
      error instanceof ProcessControlError ||
      error instanceof JsonLinesError ||
      error instanceof CanaryEvidenceError
    ) {
      return {
        kind: "no-go",
        authMode,
        paidModelCalls,
        reason: error.message,
        ...(paidModelCalls === 1
          ? { run: modelRun(context.role, events) }
          : {}),
      };
    }
    const reason =
      error instanceof Error
        ? `${error.name}:${error.message}`.slice(0, 600)
        : "UnknownError";
    return {
      kind: "no-go",
      authMode,
      paidModelCalls,
      reason: `canary_infrastructure:${reason}`,
      ...(paidModelCalls === 1 ? { run: modelRun(context.role, events) } : {}),
    };
  } finally {
    await workspace.cleanup();
  }
}
