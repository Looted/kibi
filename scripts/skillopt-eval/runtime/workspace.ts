import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import { CodexAuthError, prepareExistingLogin } from "./codex-auth";
import {
  type CanaryRunner,
  type CapabilityCanaryOptions,
  type CapabilityCanaryReceipt,
  TARGET_MODEL,
  buildCodexConfig,
  buildCodexExecArgv,
  parseCapabilityProbe,
  stageCapabilityCanary,
  summarizeProcessFailure,
  writeCapabilityProbe,
} from "./permissions";
import { JsonLinesError, ProcessControlError, parseJsonLines } from "./process";

export type IsolationWorkspace = Readonly<{
  root: string;
  codexHome: string;
  target: string;
  privateEvidence: string;
  privateScorer: string;
  siblingRun: string;
  cleanup: () => Promise<void>;
}>;

export type WorkspaceOptions = Readonly<{
  artifactRoot: string;
  runId: string;
  role: "optimizer" | "target";
}>;

function safeSegment(value: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(value)) {
    throw new TypeError("runId must be a safe path segment");
  }
  return value;
}

// implements REQ-skillopt-codex-optimization
export async function createIsolationWorkspace(
  options: WorkspaceOptions,
): Promise<IsolationWorkspace> {
  const artifactRoot = resolve(options.artifactRoot);
  await mkdir(artifactRoot, { recursive: true, mode: 0o700 });
  const root = await mkdtemp(
    join(artifactRoot, `${safeSegment(options.runId)}-${options.role}-`),
  );
  await chmod(root, 0o700);
  const codexHome = join(root, "codex-home");
  const target = join(root, "workspace");
  const privateEvidence = join(root, "private-evidence");
  const privateScorer = join(root, "private-scorer");
  const siblingRun = join(root, "sibling-run");
  await Promise.all(
    [codexHome, target, privateEvidence, privateScorer, siblingRun].map(
      async (directory) => {
        await mkdir(directory, { recursive: true, mode: 0o700 });
        await chmod(directory, 0o700);
      },
    ),
  );
  await writeFile(join(privateScorer, "sentinel"), "private\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  await writeFile(join(siblingRun, "sentinel"), "sibling\n", {
    encoding: "utf8",
    mode: 0o600,
  });
  let cleaned = false;
  return {
    root,
    codexHome,
    target,
    privateEvidence,
    privateScorer,
    siblingRun,
    cleanup: async () => {
      if (cleaned) return;
      cleaned = true;
      await rm(root, { recursive: true, force: true });
    },
  };
}

function canaryNoGo(
  options: CapabilityCanaryOptions,
  authMode: "file" | "keyring" | null,
  paidModelCalls: 0 | 1,
  reason: string,
  events: readonly Readonly<Record<string, unknown>>[] = [],
): CapabilityCanaryReceipt {
  return {
    verdict: "no-go",
    runId: options.runId,
    model: TARGET_MODEL,
    authMode,
    paidModelCalls,
    events,
    reason,
  };
}

// implements REQ-skillopt-codex-optimization
export async function runCapabilityCanary(
  options: CapabilityCanaryOptions,
  dependencies?: Readonly<{ run: CanaryRunner }>,
): Promise<CapabilityCanaryReceipt> {
  const sourceWorktree = resolve(options.sourceWorktree ?? process.cwd());
  const env = options.env ?? process.env;
  const artifactRoot = resolve(
    options.artifactRoot ??
      join(sourceWorktree, "artifacts/skillopt/isolation-canary"),
  );
  const run =
    dependencies?.run ??
    ((argv, cwd, childEnv, timeoutMs, stdin) =>
      import("./process").then(({ runBoundedProcess }) =>
        runBoundedProcess({ argv, cwd, env: childEnv, timeoutMs, stdin }),
      ));
  const workspace = await createIsolationWorkspace({
    artifactRoot,
    runId: options.runId,
    role: "target",
  });
  let authMode: "file" | "keyring" | null = null;
  let observedEvents: readonly Readonly<Record<string, unknown>>[] = [];
  try {
    const auth = await prepareExistingLogin({
      privateCodexHome: workspace.codexHome,
      env,
      run: (argv, childEnv) => run(argv, workspace.target, childEnv, 15_000),
    });
    authMode = auth.mode;
    const staged = await stageCapabilityCanary(workspace, sourceWorktree);
    await writeFile(
      join(workspace.codexHome, "config.toml"),
      buildCodexConfig({
        role: "target",
        authMode,
        paths: {
          workspace: workspace.target,
          runPrivateHome: workspace.codexHome,
          realCodexHome: auth.realCodexHome,
          sourceWorktree,
          fixtureKb: join(workspace.target, ".kb"),
          privateScorer: workspace.privateScorer,
          privateEvidence: workspace.privateEvidence,
          siblingRuns: workspace.siblingRun,
        },
        nodeCommand: process.execPath,
        codexExecutable: staged.codexCommand,
        kibiServer: join(sourceWorktree, "packages/mcp/dist/server.js"),
      }),
      { encoding: "utf8", mode: 0o600 },
    );
    await writeCapabilityProbe(workspace, [
      join(auth.realCodexHome, "auth.json"),
      workspace.codexHome,
      sourceWorktree,
      join(sourceWorktree, ".kb"),
      workspace.privateScorer,
      workspace.privateEvidence,
      workspace.siblingRun,
      "/tmp",
      "/var/tmp",
    ]);
    const result = await run(
      buildCodexExecArgv({
        codexCommand: staged.codexCommand,
        workspace: workspace.target,
        outputSchema: staged.schemaPath,
        role: "target",
      }),
      workspace.target,
      auth.env,
      120_000,
      "Call the shell tool exactly once with ./canary-probe. Do not write the final JSON yourself. Return probeExecuted=true only after that tool call exits zero.",
    );
    const events = parseJsonLines(result.stdout).map(({ event }) => event);
    observedEvents = events;
    if (result.exitCode !== 0)
      return canaryNoGo(
        options,
        authMode,
        1,
        summarizeProcessFailure(result),
        events,
      );
    if (
      events.some(
        (event) => event.type === "error" || event.type === "turn.failed",
      )
    ) {
      return canaryNoGo(options, authMode, 1, "codex_event_failure", events);
    }
    if (!events.some((event) => event.type === "turn.completed")) {
      return canaryNoGo(options, authMode, 1, "missing_turn_completed", events);
    }
    parseCapabilityProbe(
      JSON.parse(
        await readFile(join(workspace.target, "canary-result.json"), "utf8"),
      ),
    );
    return {
      verdict: "pass",
      runId: options.runId,
      model: TARGET_MODEL,
      authMode,
      paidModelCalls: 1,
      events,
    };
  } catch (error) {
    if (
      error instanceof CodexAuthError ||
      error instanceof ProcessControlError ||
      error instanceof JsonLinesError ||
      error instanceof z.ZodError
    ) {
      return canaryNoGo(
        options,
        authMode,
        error instanceof CodexAuthError ? 0 : 1,
        error.message,
      );
    }
    const reason =
      error instanceof Error
        ? `${error.name}:${error.message}`.slice(0, 600)
        : "UnknownError";
    return canaryNoGo(
      options,
      authMode,
      1,
      `canary_infrastructure:${reason}`,
      observedEvents,
    );
  } finally {
    await workspace.cleanup();
  }
}
