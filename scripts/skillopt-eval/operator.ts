import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, chmod, mkdir } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { resolve } from "node:path";
import { main as cliMain } from "./cli";
import { materializeFixtureRun } from "./fixtures/private";

export type OperatorCommand = "smoke" | "optimize";

export type OptimizeLayout = Readonly<{
  runId: string;
  artifactRoot: string;
  fixtureRunRoot: string;
  canonicalSkillRoot: string;
}>;

export type OperatorBaseResolutionOptions = Readonly<{
  runtimeDir?: string;
  cacheRoot?: string;
  tempRoot?: string;
}>;

export type OperatorDependencies = Readonly<{
  cwd: string;
  randomId: () => string;
  runCli: typeof cliMain;
  materialize: typeof materializeFixtureRun;
  resolveOperatorBase: () => Promise<string>;
  runProcess: (
    argv: readonly [string, ...string[]],
    cwd: string,
  ) => Promise<{ exitCode: number; stdout: string; stderr: string }>;
  which: (command: string) => string | null;
}>;

const OPERATOR_SUBPATH = ["kibi-skillopt", "operator"] as const;

function defaultWhich(command: string): string | null {
  return Bun.which(command);
}

async function defaultRunProcess(
  argv: readonly [string, ...string[]],
  cwd: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return await new Promise((resolvePromise, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolvePromise({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}

async function ensurePrivateDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: 0o700 });
  await chmod(path, 0o700);
}

function unavailable(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "EACCES" ||
      error.code === "ENOENT" ||
      error.code === "EROFS")
  );
}

// implements REQ-skillopt-codex-optimization
export async function resolveOperatorBase(
  options: OperatorBaseResolutionOptions = {
    runtimeDir: process.env.XDG_RUNTIME_DIR,
    cacheRoot: process.env.XDG_CACHE_HOME ?? resolve(homedir(), ".cache"),
    tempRoot: tmpdir(),
  },
): Promise<string> {
  const candidates = [
    options.runtimeDir,
    options.cacheRoot,
    options.tempRoot ?? tmpdir(),
  ].filter((value): value is string => value !== undefined && value !== "");

  for (const root of candidates) {
    try {
      await access(root, constants.W_OK);
      const namespaceRoot = resolve(root, OPERATOR_SUBPATH[0]);
      const base = resolve(root, ...OPERATOR_SUBPATH);
      await ensurePrivateDirectory(namespaceRoot);
      await ensurePrivateDirectory(base);
      return base;
    } catch (error) {
      if (!unavailable(error)) throw error;
    }
  }
  throw new Error("no writable SkillOpt operator artifact base");
}

export const defaultOperatorDependencies: OperatorDependencies = {
  cwd: process.cwd(),
  randomId: () => randomUUID(),
  runCli: cliMain,
  materialize: materializeFixtureRun,
  resolveOperatorBase,
  runProcess: defaultRunProcess,
  which: defaultWhich,
};

// implements REQ-skillopt-codex-optimization
export function buildOptimizeLayout(
  cwd: string,
  runId: string,
  operatorBase: string,
): OptimizeLayout {
  return {
    runId,
    artifactRoot: resolve(operatorBase, "optimize", runId),
    fixtureRunRoot: resolve(operatorBase, "fixtures", runId),
    canonicalSkillRoot: resolve(
      cwd,
      "packages",
      "cli",
      "src",
      "public",
      "skills",
    ),
  };
}

async function ensureUvPin(dependencies: OperatorDependencies): Promise<void> {
  const uv = dependencies.which("uv");
  if (uv === null) {
    throw new Error("uv is required for SkillOpt pin verification");
  }
  const sync = await dependencies.runProcess(
    [uv, "sync", "--project", "tools/skillopt", "--frozen"],
    dependencies.cwd,
  );
  if (sync.exitCode !== 0) {
    throw new Error(
      `uv sync failed (exit ${sync.exitCode}): ${sync.stderr || sync.stdout}`,
    );
  }
  const pin = await dependencies.runProcess(
    [
      uv,
      "run",
      "--project",
      "tools/skillopt",
      "python",
      "tools/skillopt/verify_pin.py",
    ],
    dependencies.cwd,
  );
  if (pin.exitCode !== 0) {
    throw new Error(
      `SkillOpt pin verification failed (exit ${pin.exitCode}): ${pin.stderr || pin.stdout}`,
    );
  }
}

async function ensureCodexLogin(
  dependencies: OperatorDependencies,
): Promise<void> {
  const codex = dependencies.which("codex");
  if (codex === null) {
    throw new Error("codex CLI is required on PATH");
  }
  const login = await dependencies.runProcess(
    [codex, "login", "status"],
    dependencies.cwd,
  );
  const text = `${login.stdout}\n${login.stderr}`;
  if (
    login.exitCode !== 0 ||
    !text
      .split("\n")
      .map((line) => line.trim())
      .includes("Logged in using ChatGPT")
  ) {
    throw new Error(
      "codex login status must report Logged in using ChatGPT before paid SkillOpt",
    );
  }
}

async function preparePaidOptimize(
  dependencies: OperatorDependencies,
): Promise<OptimizeLayout> {
  const operatorBase = await dependencies.resolveOperatorBase();
  const layout = buildOptimizeLayout(
    dependencies.cwd,
    dependencies.randomId(),
    operatorBase,
  );
  await ensurePrivateDirectory(resolve(operatorBase, "optimize"));
  await ensurePrivateDirectory(layout.artifactRoot);
  // materializeFixtureRun requires the run root itself to be absent.
  await ensurePrivateDirectory(resolve(operatorBase, "fixtures"));
  dependencies.materialize({
    runRoot: layout.fixtureRunRoot,
    canonicalSkillRoot: layout.canonicalSkillRoot,
  });
  return layout;
}

// implements REQ-skillopt-codex-optimization
export async function runOperatorCommand(
  command: OperatorCommand,
  dependencies: OperatorDependencies = defaultOperatorDependencies,
): Promise<number> {
  await ensureUvPin(dependencies);
  await ensureCodexLogin(dependencies);
  if (command === "smoke") {
    const runId = dependencies.randomId();
    process.stderr.write(`skillopt smoke run-id=${runId}\n`);
    return await dependencies.runCli([
      "smoke",
      "--allow-paid",
      "--run-id",
      runId,
    ]);
  }
  const layout = await preparePaidOptimize(dependencies);
  process.stderr.write(
    `skillopt optimize run-id=${layout.runId}\nartifact-root=${layout.artifactRoot}\nfixture-run-root=${layout.fixtureRunRoot}\n`,
  );
  return await dependencies.runCli([
    "optimize",
    "--skill",
    "kibi-usage",
    "--allow-paid",
    "--run-id",
    layout.runId,
    "--artifact-root",
    layout.artifactRoot,
    "--fixture-run-root",
    layout.fixtureRunRoot,
  ]);
}

export async function main(
  args: readonly string[],
  dependencies: OperatorDependencies = defaultOperatorDependencies,
): Promise<number> {
  const command = args[0];
  if (command !== "smoke" && command !== "optimize") {
    process.stderr.write(
      "Usage: bun run scripts/skillopt-eval/operator.ts <smoke|optimize>\n",
    );
    return 2;
  }
  try {
    return await runOperatorCommand(command, dependencies);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

if (import.meta.main) {
  process.exitCode = await main(process.argv.slice(2));
}
