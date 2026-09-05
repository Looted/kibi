import { execSync as nodeExecSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { spyOn } from "bun:test";
import { isolatedCliSandboxEnv } from "./isolated-env.js";

export function createTempDir(prefix = "kibi-inproc-"): string {
  return mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function removeTempDir(directory: string): void {
  if (existsSync(directory)) {
    rmSync(directory, { recursive: true, force: true });
  }
}

export function git(cwd: string, args: string): string {
  return nodeExecSync(
    `git -c commit.gpgsign=false -c core.fsmonitor=false -c core.untrackedCache=false ${args}`,
    {
      cwd,
      encoding: "utf8",
      timeout: 15_000,
      stdio: ["pipe", "pipe", "pipe"],
      env: isolatedCliSandboxEnv({
        GIT_TERMINAL_PROMPT: "0",
        GIT_EDITOR: "true",
        GIT_PAGER: "cat",
        GIT_OPTIONAL_LOCKS: "0",
        GIT_CONFIG_GLOBAL: "/dev/null",
        GIT_CONFIG_SYSTEM: "/dev/null",
        GIT_CONFIG_NOSYSTEM: "1",
      }),
    },
  );
}

export function createGitWorkspace(branch = "main"): string {
  const directory = createTempDir();
  git(directory, `init -b ${branch} --template=`);
  git(directory, "config user.email 'test@test.com'");
  git(directory, "config user.name 'Kibi Test'");
  git(directory, "config commit.gpgsign false");
  git(directory, "commit --allow-empty --no-verify -m init");
  return directory;
}

export function writeHook(cwd: string, name: string, body: string): string {
  const hookPath = path.join(cwd, ".git", "hooks", name);
  mkdirSync(path.dirname(hookPath), { recursive: true });
  writeFileSync(hookPath, body, { encoding: "utf8", mode: 0o644 });
  return hookPath;
}

export function makeExecutable(filePath: string): void {
  chmodSync(filePath, 0o755);
}

const stableCwd = process.cwd();

export function restoreWorkspaceCwd(): void {
  try {
    process.chdir(stableCwd);
  } catch {
    // The original workspace is the fallback if a test deleted its cwd.
  }
}

export async function withCwd<T>(
  directory: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  const previous = process.cwd();
  process.chdir(directory);
  try {
    return await fn();
  } finally {
    try {
      process.chdir(previous);
    } catch {
      process.chdir(stableCwd);
    }
  }
}

export function isolateKibiEnv(): () => void {
  const previousBranch = process.env.KIBI_BRANCH;
  const previousWorkspace = process.env.KIBI_WORKSPACE;
  const previousProject = process.env.KIBI_PROJECT_ROOT;
  const previousRoot = process.env.KIBI_ROOT;
  const previousDiagnostic = process.env.KIBI_CLI_DIAGNOSTIC_MODE;
  const previousKbPl = process.env.KIBI_KB_PL_PATH;
  const previousDebug = process.env.KIBI_DEBUG;
  const previousTrace = process.env.KIBI_TRACE;
  const previousPrologDebug = process.env.KIBI_PROLOG_DEBUG;
  Reflect.deleteProperty(process.env, "KIBI_BRANCH");
  Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
  Reflect.deleteProperty(process.env, "KIBI_PROJECT_ROOT");
  Reflect.deleteProperty(process.env, "KIBI_ROOT");
  Reflect.deleteProperty(process.env, "KIBI_CLI_DIAGNOSTIC_MODE");
  Reflect.deleteProperty(process.env, "KIBI_KB_PL_PATH");
  Reflect.deleteProperty(process.env, "KIBI_DEBUG");
  Reflect.deleteProperty(process.env, "KIBI_TRACE");
  Reflect.deleteProperty(process.env, "KIBI_PROLOG_DEBUG");
  return () => {
    restoreEnv("KIBI_BRANCH", previousBranch);
    restoreEnv("KIBI_WORKSPACE", previousWorkspace);
    restoreEnv("KIBI_PROJECT_ROOT", previousProject);
    restoreEnv("KIBI_ROOT", previousRoot);
    restoreEnv("KIBI_CLI_DIAGNOSTIC_MODE", previousDiagnostic);
    restoreEnv("KIBI_KB_PL_PATH", previousKbPl);
    restoreEnv("KIBI_DEBUG", previousDebug);
    restoreEnv("KIBI_TRACE", previousTrace);
    restoreEnv("KIBI_PROLOG_DEBUG", previousPrologDebug);
  };
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
  } else {
    process.env[name] = value;
  }
}

export function captureIo(
  options: { stdio?: boolean } = {},
): {
  logs: string[];
  errors: string[];
  warns: string[];
  stdout: string[];
  stderr: string[];
  restore: () => void;
  logText: () => string;
  errorText: () => string;
} {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];
  const stdout: string[] = [];
  const stderr: string[] = [];
  const stringify = (args: unknown[]) =>
    args
      .map((value) => (typeof value === "string" ? value : String(value)))
      .join(" ");
  const logSpy = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    logs.push(stringify(args));
  });
  const errorSpy = spyOn(console, "error").mockImplementation(
    (...args: unknown[]) => {
      errors.push(stringify(args));
    },
  );
  const warnSpy = spyOn(console, "warn").mockImplementation(
    (...args: unknown[]) => {
      warns.push(stringify(args));
    },
  );
  // Spying process.stdout/stderr.write deadlocks Bun around execSync and
  // expect().rejects. Only replace those streams when a test reads them.
  const stdoutSpy = options.stdio
    ? spyOn(process.stdout, "write").mockImplementation(((chunk: unknown) => {
        stdout.push(String(chunk));
        return true;
      }) as typeof process.stdout.write)
    : undefined;
  const stderrSpy = options.stdio
    ? spyOn(process.stderr, "write").mockImplementation(((chunk: unknown) => {
        stderr.push(String(chunk));
        return true;
      }) as typeof process.stderr.write)
    : undefined;
  const previousExit = process.exitCode;
  return {
    logs,
    errors,
    warns,
    stdout,
    stderr,
    restore: () => {
      logSpy.mockRestore();
      errorSpy.mockRestore();
      warnSpy.mockRestore();
      stdoutSpy?.mockRestore();
      stderrSpy?.mockRestore();
      process.exitCode = previousExit;
    },
    logText: () => logs.join("\n"),
    errorText: () => errors.join("\n"),
  };
}
