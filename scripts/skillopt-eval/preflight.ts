import { constants as fsConstants } from "node:fs";
import { access, realpath, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { CodexAuthError, prepareExistingLogin } from "./runtime/codex-auth";
import {
  type CapabilityCanaryReceipt,
  OPTIMIZER_MODEL,
  TARGET_MODEL,
  buildCodexConfig,
} from "./runtime/permissions";
import {
  ProcessControlError,
  type ProcessResult,
  runBoundedProcess,
} from "./runtime/process";
import {
  type IsolationWorkspace,
  createIsolationWorkspace,
  runCapabilityCanary,
} from "./runtime/workspace";

const SKILLOPT_COMMIT = "b860a5cf88ce75e2bd02ca981ac21fb28cffba83";
export type PreflightConfig = Readonly<{
  runId: string;
  sourceWorktree?: string;
  artifactRoot?: string;
  env?: NodeJS.ProcessEnv;
}>;

export type PreflightReceipt = Readonly<{
  verdict: "pass" | "no-go";
  runId: string;
  targetModel: typeof TARGET_MODEL;
  optimizerModel: typeof OPTIMIZER_MODEL;
  skilloptCommit: typeof SKILLOPT_COMMIT;
  codexVersion: string | null;
  authMode: "file" | "keyring" | null;
  bwrap: boolean;
  sourceClean: boolean;
  configValid: boolean;
  paidModelCalls: 0;
  reason?: string;
}>;

export { runCapabilityCanary };
export type { CapabilityCanaryReceipt };

export type PreflightDependencies = Readonly<{
  run: (
    argv: readonly [string, ...string[]],
    cwd: string,
    env: NodeJS.ProcessEnv,
    timeoutMs: number,
    stdin?: string,
  ) => Promise<ProcessResult>;
  executable: (command: string) => Promise<boolean>;
  sourceClean: (
    sourceWorktree: string,
    env: NodeJS.ProcessEnv,
  ) => Promise<boolean>;
}>;

export async function sourceWorktreeIsClean(
  sourceWorktree: string,
  env: NodeJS.ProcessEnv,
): Promise<boolean> {
  const result = await runBoundedProcess({
    argv: ["git", "status", "--porcelain", "--untracked-files=all"],
    cwd: sourceWorktree,
    env,
    timeoutMs: 10_000,
  });
  return result.exitCode === 0 && result.stdout.trim() === "";
}

const runtimeDependencies: PreflightDependencies = {
  run: (argv, cwd, env, timeoutMs, stdin) =>
    runBoundedProcess({ argv, cwd, env, timeoutMs, stdin }),
  executable: async (command) => {
    try {
      await access(command, fsConstants.X_OK);
      return true;
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return false;
      }
      throw error;
    }
  },
  sourceClean: sourceWorktreeIsClean,
};

function baseReceipt(
  config: PreflightConfig,
  state: Readonly<{
    codexVersion: string | null;
    authMode: "file" | "keyring" | null;
    bwrap: boolean;
    sourceClean: boolean;
    configValid: boolean;
  }>,
): Omit<PreflightReceipt, "verdict" | "reason"> {
  return {
    runId: config.runId,
    targetModel: TARGET_MODEL,
    optimizerModel: OPTIMIZER_MODEL,
    skilloptCommit: SKILLOPT_COMMIT,
    ...state,
    paidModelCalls: 0,
  };
}

function noGo(
  config: PreflightConfig,
  state: Parameters<typeof baseReceipt>[1],
  reason: string,
): PreflightReceipt {
  return { ...baseReceipt(config, state), verdict: "no-go", reason };
}

function pathsFor(
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

async function prepareConfig(
  options: Readonly<{
    workspace: IsolationWorkspace;
    sourceWorktree: string;
    env: NodeJS.ProcessEnv;
    dependencies: PreflightDependencies;
  }>,
) {
  const runAuth = (
    argv: readonly [string, ...string[]],
    env: NodeJS.ProcessEnv,
  ) => options.dependencies.run(argv, options.workspace.target, env, 15_000);
  const auth = await prepareExistingLogin({
    privateCodexHome: options.workspace.codexHome,
    env: options.env,
    run: runAuth,
  });
  const config = buildCodexConfig({
    role: "target",
    authMode: auth.mode,
    paths: pathsFor(
      options.workspace,
      options.sourceWorktree,
      auth.realCodexHome,
    ),
    nodeCommand: process.execPath,
    codexExecutable: await realpath(Bun.which("codex") ?? "codex"),
    kibiServer: join(options.sourceWorktree, "packages/mcp/dist/server.js"),
  });
  await writeFile(join(options.workspace.codexHome, "config.toml"), config, {
    encoding: "utf8",
    mode: 0o600,
  });
  return auth;
}

// implements REQ-skillopt-codex-optimization
export async function runPreflight(
  config: PreflightConfig,
  dependencies: PreflightDependencies = runtimeDependencies,
): Promise<PreflightReceipt> {
  const sourceWorktree = resolve(config.sourceWorktree ?? process.cwd());
  const artifactRoot = resolve(
    config.artifactRoot ??
      join(sourceWorktree, "artifacts/skillopt/isolation-canary"),
  );
  const env = config.env ?? process.env;
  let state: Parameters<typeof baseReceipt>[1] = {
    codexVersion: null,
    authMode: null,
    bwrap: false,
    sourceClean: false,
    configValid: false,
  };
  if (!(await dependencies.executable("/usr/bin/bwrap"))) {
    return noGo(config, state, "missing_isolation:bwrap");
  }
  state = { ...state, bwrap: true };
  const clean = await dependencies.sourceClean(sourceWorktree, env);
  state = { ...state, sourceClean: clean };
  if (!clean) return noGo(config, state, "source_not_clean");
  const workspace = await createIsolationWorkspace({
    artifactRoot,
    runId: config.runId,
    role: "target",
  });
  try {
    const version = await dependencies.run(
      ["codex", "--version"],
      sourceWorktree,
      env,
      10_000,
    );
    if (version.exitCode !== 0)
      return noGo(config, state, "missing_host:codex");
    state = { ...state, codexVersion: version.stdout.trim() };
    const auth = await prepareConfig({
      workspace,
      sourceWorktree,
      env,
      dependencies,
    });
    state = { ...state, authMode: auth.mode };
    const doctor = await dependencies.run(
      ["codex", "doctor", "--json"],
      workspace.target,
      auth.env,
      30_000,
    );
    if (doctor.exitCode !== 0) return noGo(config, state, "config_invalid");
    state = { ...state, configValid: true };
    return { ...baseReceipt(config, state), verdict: "pass" };
  } catch (error) {
    if (error instanceof CodexAuthError)
      return noGo(config, state, error.message);
    if (error instanceof ProcessControlError)
      return noGo(config, state, error.message);
    throw error;
  } finally {
    await workspace.cleanup();
  }
}
