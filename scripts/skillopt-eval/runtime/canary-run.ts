import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CanaryEvidenceError,
  verifyCapabilityEvidence,
  verifyProbeEvidence,
} from "./canary-evidence";
import {
  RequiredMcpStartupError,
  RuntimePrerequisiteError,
  sourceIsolationDeniedPaths,
  stageCapabilityCanary,
  summarizeProcessFailure,
  writeCapabilityProbe,
} from "./canary-runtime";
import type { McpServerLaunch, probeCodexSandbox } from "./canary-runtime";
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
  SKILLOPT_EVALUATION_BRANCH,
  TARGET_MODEL,
  buildCodexConfig,
  buildCodexExecArgv,
} from "./permissions";
import {
  JsonLinesError,
  ProcessControlError,
  type ProcessResult,
  parseJsonLines,
} from "./process";

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
  probeSandbox: typeof probeCodexSandbox;
  probeMcp: (launch: McpServerLaunch) => Promise<unknown>;
  verifyEvidence?: typeof verifyCapabilityEvidence;
  stageDependencies?: Parameters<typeof stageCapabilityCanary>[2];
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

function codexRequiredMcpFailure(
  result: ProcessResult,
): RequiredMcpStartupError | null {
  const stderr = result.stderr.toLowerCase();
  if (!stderr.includes("required mcp servers failed to initialize"))
    return null;
  const detail = stderr.includes("connection closed")
    ? "connection_closed"
    : "codex_required_server";
  return new RequiredMcpStartupError(detail);
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
      sandboxHome: workspace.sandboxHome,
      env: context.env,
      run: (argv, childEnv) =>
        context.run(argv, workspace.target, childEnv, 15_000),
    });
    authMode = auth.mode;
    const staged = await stageCapabilityCanary(
      workspace,
      context.sourceWorktree,
      context.stageDependencies,
    );
    const runtimeEnv = {
      ...auth.env,
      KIBI_BRANCH: SKILLOPT_EVALUATION_BRANCH,
      PATH: "/usr/bin:/bin",
    };
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
        bwrapExecutable: staged.bwrapExecutable,
        codexExecutable: staged.codexCommand,
        mcpServer: staged.mcpServer,
      }),
      { encoding: "utf8", mode: 0o600 },
    );
    const probe = await writeCapabilityProbe(
      workspace,
      sourceIsolationDeniedPaths(
        workspace,
        context.sourceWorktree,
        auth.realCodexHome,
      ),
    );
    await context.probeMcp({ ...staged.mcpServer, env: runtimeEnv });
    await context.probeSandbox({
      codexCommand: staged.codexCommand,
      workspace: workspace.target,
      env: runtimeEnv,
      run: context.run,
      probe,
    });
    const prompt =
      context.role === "target"
        ? `Use shell_command exactly once to execute ${probe.command}. Do not infer or claim success without that tool event. If it exits zero, return probeExecuted=true; otherwise fail.`
        : [
            "Call the kibi MCP tool kb_semantic_advisor exactly once first with requirement text `A session timeout must be 30 minutes.` and complete diagnostic telemetry (is_autonomous=true, a brief reasoning string, confidence_score=1, attempt_number=1, missing_context empty). Wait for its successful result.",
            "Then call the kibi MCP tool kb_status exactly once with complete diagnostic telemetry (is_autonomous=true, a brief reasoning string, confidence_score=1, attempt_number=1, missing_context empty). Wait for its successful result and confirm it reports branch `skillopt-eval`.",
            `Then use shell_command exactly once to execute ${probe.command}.`,
            "Do not call any other shell or MCP tool. Do not infer or claim success without all three completed tool calls. If all three succeed, return probeExecuted=true; otherwise fail.",
          ].join(" ");
    const result = await context.run(
      buildCodexExecArgv({
        codexCommand: staged.codexCommand,
        workspace: workspace.target,
        outputSchema: staged.schemaPath,
        role: context.role,
      }),
      workspace.target,
      runtimeEnv,
      120_000,
      prompt,
    );
    const requiredMcpFailure = codexRequiredMcpFailure(result);
    if (requiredMcpFailure !== null) throw requiredMcpFailure;
    paidModelCalls = 1;
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
    const brokerTrace = await readFile(
      staged.mcpServer.tracePath,
      "utf8",
    ).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        return "";
      throw error;
    });
    const diagnosticReceipt = await readFile(
      join(workspace.target, ".kb/usage.log"),
      "utf8",
    ).catch((error: unknown) => {
      if (error instanceof Error && "code" in error && error.code === "ENOENT")
        return "";
      throw error;
    });
    if (context.role === "target") {
      await (context.verifyEvidence ?? verifyProbeEvidence)(events, probe);
    } else {
      await (context.verifyEvidence ?? verifyCapabilityEvidence)(
        events,
        probe,
        {
          brokerTrace,
          diagnosticReceipt,
          toolNames: ["kb_semantic_advisor", "kb_status"],
        },
      );
    }
    return { kind: "pass", authMode, run };
  } catch (error) {
    if (
      error instanceof CodexAuthError ||
      error instanceof ProcessControlError ||
      error instanceof JsonLinesError ||
      error instanceof CanaryEvidenceError ||
      error instanceof RuntimePrerequisiteError ||
      error instanceof RequiredMcpStartupError
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
