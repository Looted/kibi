import { constants as fsConstants } from "node:fs";
import { access, chmod, copyFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import type { ProcessResult } from "./process";

const FORBIDDEN_ENV = [
  "CODEX_API_KEY",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "AZURE_OPENAI_API_KEY",
  "AZURE_OPENAI_ENDPOINT",
  "ANTHROPIC_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "OPENROUTER_API_KEY",
  "AWS_BEDROCK_RUNTIME_ENDPOINT",
  "OLLAMA_HOST",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_SESSION_TOKEN",
  "GOOGLE_APPLICATION_CREDENTIALS",
] as const;

const FORBIDDEN_ENV_SUFFIXES = ["_API_KEY", "_BASE_URL"] as const;
const FORBIDDEN_ENV_NAMES = new Set<string>(FORBIDDEN_ENV);

export type AuthMode = "file" | "keyring";

export type AuthPreparation = Readonly<{
  mode: AuthMode;
  realCodexHome: string;
  privateCodexHome: string;
  env: NodeJS.ProcessEnv;
}>;

export type AuthProcessRunner = (
  argv: readonly [string, ...string[]],
  env: NodeJS.ProcessEnv,
) => Promise<ProcessResult>;

export class CodexAuthError extends Error {
  readonly name = "CodexAuthError";

  constructor(
    readonly kind: "forbidden_env" | "login" | "auth_file",
    options?: ErrorOptions,
  ) {
    super(`codex_auth_${kind}`, options);
  }
}

// implements REQ-skillopt-codex-optimization
export function assertExistingLoginEnvironment(env: NodeJS.ProcessEnv): void {
  const present = Object.entries(env).filter(
    ([name, value]) =>
      value !== undefined &&
      value !== "" &&
      (FORBIDDEN_ENV_NAMES.has(name) ||
        FORBIDDEN_ENV_SUFFIXES.some((suffix) => name.endsWith(suffix))),
  );
  if (present.length > 0) throw new CodexAuthError("forbidden_env");
}

export function isolatedCodexEnvironment(
  source: NodeJS.ProcessEnv,
  codexHome: string,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of ["PATH", "LANG", "LC_ALL", "TERM", "TZ"] as const) {
    const value = source[name];
    if (value !== undefined) env[name] = value;
  }
  return {
    ...env,
    HOME: codexHome,
    USERPROFILE: codexHome,
    CODEX_HOME: codexHome,
    XDG_CONFIG_HOME: join(codexHome, "xdg-config"),
    XDG_CACHE_HOME: join(codexHome, "xdg-cache"),
    XDG_DATA_HOME: join(codexHome, "xdg-data"),
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_SYSTEM: "/dev/null",
  };
}

async function readableFile(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.R_OK);
    return (await stat(path)).isFile();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

// implements REQ-skillopt-codex-optimization
export async function prepareExistingLogin(
  options: Readonly<{
    privateCodexHome: string;
    env: NodeJS.ProcessEnv;
    run: AuthProcessRunner;
  }>,
): Promise<AuthPreparation> {
  assertExistingLoginEnvironment(options.env);
  const realCodexHome = resolve(
    options.env.CODEX_HOME ?? join(homedir(), ".codex"),
  );
  const authPath = join(realCodexHome, "auth.json");
  const mode: AuthMode = (await readableFile(authPath)) ? "file" : "keyring";
  if (mode === "file") {
    try {
      await copyFile(authPath, join(options.privateCodexHome, "auth.json"));
      await chmod(join(options.privateCodexHome, "auth.json"), 0o600);
    } catch (error) {
      throw new CodexAuthError("auth_file", { cause: error });
    }
  }
  const env = isolatedCodexEnvironment(options.env, options.privateCodexHome);
  const login = await options.run(["codex", "login", "status"], env);
  if (
    login.exitCode !== 0 ||
    !`${login.stdout}\n${login.stderr}`.includes("Logged in")
  ) {
    throw new CodexAuthError("login");
  }
  return {
    mode,
    realCodexHome,
    privateCodexHome: options.privateCodexHome,
    env,
  };
}
