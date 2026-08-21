import { execFileSync, spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import {
  isolatedPackedSandboxEnv,
  packAll as packAllPackages,
} from "./helpers.js";

export interface PnpmCommand {
  command: string;
  argsPrefix: string[];
}

export interface Tarballs {
  core: string;
  cli: string;
  runtime: string;
  mcp: string;
}

export interface PnpmUpgradeSandbox {
  baseDir: string;
  projectDir: string;
  env: NodeJS.ProcessEnv;
  pnpm: PnpmCommand;
  cleanup(): void;
}

export type IsolatedPnpmEnvironment = Readonly<{
  env: NodeJS.ProcessEnv;
  storeDir: string;
}>;

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export function resolvePnpm(): PnpmCommand {
  const envPnpm = process.env.PNPM_BIN;
  if (envPnpm) {
    if (!existsSync(envPnpm)) {
      throw new Error(`PNPM_BIN is set but does not exist: ${envPnpm}`);
    }
    return { command: envPnpm, argsPrefix: [] };
  }

  try {
    const pnpm = execFileSync("which", ["pnpm"], { encoding: "utf8" }).trim();
    if (pnpm) {
      return { command: pnpm, argsPrefix: [] };
    }
  } catch {}

  try {
    const corepack = execFileSync("which", ["corepack"], {
      encoding: "utf8",
    }).trim();
    if (corepack) {
      return { command: corepack, argsPrefix: ["pnpm"] };
    }
  } catch {}

  throw new Error(
    "pnpm is required for this regression test. Set PNPM_BIN, install pnpm on PATH, or enable corepack.",
  );
}

export function createPnpmUpgradeSandbox(): PnpmUpgradeSandbox {
  const pnpm = resolvePnpm();
  const baseDir = mkdtempSync(join(tmpdir(), "kibi-e2e-pnpm-upgrade-"));
  const projectDir = join(baseDir, "project");
  mkdirSync(projectDir, { recursive: true });
  const { env, storeDir } = createIsolatedPnpmEnvironment(baseDir, pnpm);

  writeFileSync(
    join(projectDir, "package.json"),
    JSON.stringify({ name: "kibi-pnpm-upgrade-e2e", private: true }, null, 2),
    "utf8",
  );

  writeFileSync(
    env.npm_config_userconfig ?? join(baseDir, "npmrc"),
    "",
    "utf8",
  );

  return {
    baseDir,
    projectDir,
    env,
    pnpm,
    cleanup(): void {
      rmSync(baseDir, { recursive: true, force: true });
    },
  };
}

export function createIsolatedPnpmEnvironment(
  baseDir: string,
  pnpm: PnpmCommand = resolvePnpm(),
): IsolatedPnpmEnvironment {
  const homeDir = join(baseDir, "home");
  const pnpmHome = join(baseDir, "pnpm-home");
  const cacheDir = join(baseDir, "cache");
  const dataDir = join(baseDir, "data");
  const configDir = join(baseDir, "config");
  const corepackHome = join(baseDir, "corepack");
  const storeDir = join(baseDir, "pnpm-store");

  for (const dir of [
    homeDir,
    pnpmHome,
    cacheDir,
    dataDir,
    configDir,
    corepackHome,
    storeDir,
  ]) {
    mkdirSync(dir, { recursive: true });
  }
  seedPnpmMetadataCache(cacheDir);
  seedCorepackHome(corepackHome);
  const hostStoreDir = resolveHostPnpmStore(pnpm);
  if (existsSync(hostStoreDir)) {
    cpSync(hostStoreDir, storeDir, { recursive: true });
  }

  const pnpmDir = dirname(pnpm.command);
  return {
    storeDir,
    env: isolatedPackedSandboxEnv({
      HOME: homeDir,
      USERPROFILE: homeDir,
      COREPACK_HOME: corepackHome,
      COREPACK_ENABLE_DOWNLOAD_PROMPT: "0",
      PNPM_HOME: pnpmHome,
      XDG_CACHE_HOME: cacheDir,
      XDG_DATA_HOME: dataDir,
      XDG_CONFIG_HOME: configDir,
      pnpm_config_store_dir: storeDir,
      npm_config_userconfig: join(baseDir, "npmrc"),
      PATH: `${pnpmHome}:${pnpmDir}:/usr/bin:${process.env.PATH ?? ""}`,
      NODE_ENV: "production",
    }),
  };
}

function resolveHostPnpmStore(pnpm: PnpmCommand): string {
  try {
    return execFileSync(pnpm.command, [...pnpm.argsPrefix, "store", "path"], {
      encoding: "utf8",
      env: process.env,
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    throw new Error(
      `Failed to resolve pnpm store path for offline test setup: ${(error as Error).message}`,
    );
  }
}

function seedPnpmMetadataCache(cacheDir: string): void {
  const home = process.env.HOME;
  const candidates = [
    process.env.XDG_CACHE_HOME
      ? join(process.env.XDG_CACHE_HOME, "pnpm")
      : null,
    home ? join(home, ".cache", "pnpm") : null,
  ].filter((candidate): candidate is string => Boolean(candidate));

  const hostCache = candidates.find((candidate) => existsSync(candidate));
  if (!hostCache) {
    return;
  }
  cpSync(hostCache, join(cacheDir, "pnpm"), { recursive: true });
}

function seedCorepackHome(corepackHome: string): void {
  const source = process.env.COREPACK_HOME;
  if (!source || !existsSync(source) || source === corepackHome) return;
  cpSync(source, corepackHome, { recursive: true });
}

export function runCommand(
  command: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs?: number },
): Promise<CommandResult> {
  const { cwd, env, timeoutMs = 120000 } = options;

  return new Promise((resolveResult, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let killed = false;
    const timeout = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
      setTimeout(() => child.kill("SIGKILL"), 5000);
    }, timeoutMs);

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (exitCode) => {
      clearTimeout(timeout);
      if (killed) {
        resolveResult({
          stdout,
          stderr: `${stderr}\nCommand timed out after ${timeoutMs}ms: ${command} ${args.join(" ")}`,
          exitCode: 124,
        });
        return;
      }
      resolveResult({ stdout, stderr, exitCode: exitCode ?? 0 });
    });
  });
}

export function runPnpm(
  sandbox: PnpmUpgradeSandbox,
  args: string[],
  options: { timeoutMs?: number } = {},
): Promise<CommandResult> {
  return runCommand(
    sandbox.pnpm.command,
    [...sandbox.pnpm.argsPrefix, ...args],
    {
      cwd: sandbox.projectDir,
      env: sandbox.env,
      timeoutMs: options.timeoutMs ?? 300000,
    },
  );
}

export async function installTarballsWithPnpm(
  sandbox: PnpmUpgradeSandbox,
  tarballs: string[],
  options: { offline?: boolean } = {},
): Promise<CommandResult> {
  // implements REQ-mcp-pnpm-upgrade-stale-path
  const installArgs = ["add"];
  if (options.offline !== false) {
    installArgs.push("--offline");
  }
  installArgs.push(...tarballs);
  return runPnpm(sandbox, installArgs, { timeoutMs: 300000 });
}

export async function resolveInstalledKibiMcp(
  sandbox: PnpmUpgradeSandbox,
): Promise<string> {
  const result = await runCommand(
    "node",
    [
      "--input-type=module",
      "-e",
      "import { createRequire } from 'node:module'; import { existsSync, readFileSync } from 'node:fs'; import path from 'node:path'; const require = createRequire(process.cwd() + '/package.json'); const resolved = require.resolve('kibi-mcp'); let dir = path.dirname(resolved); while (!existsSync(path.join(dir, 'package.json'))) dir = path.dirname(dir); const pkg = JSON.parse(readFileSync(path.join(dir, 'package.json'), 'utf8')); console.log(`${resolved} kibi-mcp@${pkg.version}`);",
    ],
    { cwd: sandbox.projectDir, env: sandbox.env, timeoutMs: 10000 },
  );
  if (result.exitCode !== 0) {
    throw new Error(
      `Failed to resolve installed kibi-mcp. stdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result.stdout.trim();
}

export function pnpmLabel(pnpm: PnpmCommand): string {
  return [basename(pnpm.command), ...pnpm.argsPrefix].join(" ");
}

// implements REQ-mcp-pnpm-upgrade-stale-path
export async function packAllForPnpmUpgrade(): Promise<Tarballs> {
  const tarballs = await packAllPackages();
  return {
    core: tarballs.core,
    cli: tarballs.cli,
    runtime: tarballs.runtime,
    mcp: tarballs.mcp,
  };
}
