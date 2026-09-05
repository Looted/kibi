import { constants as fsConstants } from "node:fs";
import {
  access,
  chmod,
  copyFile,
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { z } from "zod";
import { withHeldOutExecutionLease } from "../held-out-execution-lease";
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
const ChatGptAuthFileSchema = z.object({
  auth_mode: z.literal("chatgpt"),
  tokens: z.record(z.string(), z.unknown()),
  OPENAI_API_KEY: z.null().optional(),
  personal_access_token: z.null().optional(),
  bedrock_api_key: z.null().optional(),
});

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
  sandboxHome = codexHome,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of ["PATH", "LANG", "LC_ALL", "TERM", "TZ"] as const) {
    const value = source[name];
    if (value !== undefined) env[name] = value;
  }
  return {
    ...env,
    HOME: sandboxHome,
    USERPROFILE: sandboxHome,
    CODEX_HOME: codexHome,
    XDG_CONFIG_HOME: join(sandboxHome, "xdg-config"),
    XDG_CACHE_HOME: join(sandboxHome, "xdg-cache"),
    XDG_DATA_HOME: join(sandboxHome, "xdg-data"),
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
    sandboxHome?: string;
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
      ChatGptAuthFileSchema.parse(JSON.parse(await readFile(authPath, "utf8")));
      await copyFile(authPath, join(options.privateCodexHome, "auth.json"));
      await chmod(join(options.privateCodexHome, "auth.json"), 0o600);
    } catch (error) {
      throw new CodexAuthError("auth_file", { cause: error });
    }
  }
  const env = isolatedCodexEnvironment(
    options.env,
    options.privateCodexHome,
    options.sandboxHome,
  );
  const login = await options.run(["codex", "login", "status"], env);
  const loginLines = `${login.stdout}\n${login.stderr}`
    .split("\n")
    .map((line) => line.trim());
  if (login.exitCode !== 0 || !loginLines.includes("Logged in using ChatGPT")) {
    throw new CodexAuthError("login");
  }
  return {
    mode,
    realCodexHome,
    privateCodexHome: options.privateCodexHome,
    env,
  };
}

export type LoginAuthPaths = Readonly<{
  mode: AuthMode;
  realCodexHome: string;
  privateCodexHome: string;
}>;

function resolveRealCodexHome(env: NodeJS.ProcessEnv): string {
  return resolve(env.CODEX_HOME ?? join(homedir(), ".codex"));
}

// ChatGPT refresh tokens are single-use. Isolated cells copy auth.json into a
// private CODEX_HOME; without a write-back, the next cell retries the already
// consumed host refresh token and Codex fails with refresh_token_reused.
// implements REQ-skillopt-codex-optimization
export async function persistRefreshedLogin(
  auth: LoginAuthPaths,
): Promise<void> {
  if (auth.mode !== "file") return;
  const privateAuth = join(auth.privateCodexHome, "auth.json");
  const hostAuth = join(auth.realCodexHome, "auth.json");
  if (!(await readableFile(privateAuth))) return;
  let privateBody: string;
  try {
    privateBody = await readFile(privateAuth, "utf8");
    ChatGptAuthFileSchema.parse(JSON.parse(privateBody));
  } catch (error) {
    throw new CodexAuthError("auth_file", { cause: error });
  }
  const hostBody = (await readableFile(hostAuth))
    ? await readFile(hostAuth, "utf8")
    : "";
  if (privateBody === hostBody) return;
  const tempPath = join(auth.realCodexHome, ".auth.json.skillopt-tmp");
  await writeFile(tempPath, privateBody, { encoding: "utf8", mode: 0o600 });
  await chmod(tempPath, 0o600);
  await rename(tempPath, hostAuth);
  await chmod(hostAuth, 0o600);
}

// implements REQ-skillopt-codex-optimization
export async function withCodexAuthLease<T>(
  env: NodeJS.ProcessEnv,
  operation: () => Promise<T>,
): Promise<T> {
  const lockDir = join(resolveRealCodexHome(env), ".skillopt-auth-lock");
  await mkdir(lockDir, { recursive: true, mode: 0o700 });
  await chmod(lockDir, 0o700);
  return await withHeldOutExecutionLease(lockDir, operation);
}

export async function withPreparedLogin<T>(
  options: Readonly<{
    privateCodexHome: string;
    sandboxHome?: string;
    env: NodeJS.ProcessEnv;
    run: AuthProcessRunner;
  }>,
  operation: (auth: AuthPreparation) => Promise<T>,
): Promise<T> {
  return await withCodexAuthLease(options.env, async () => {
    const auth = await prepareExistingLogin(options);
    try {
      const result = await operation(auth);
      await persistRefreshedLogin(auth);
      return result;
    } catch (error) {
      try {
        await persistRefreshedLogin(auth);
      } catch {
        // Keep the original operation error.
      }
      throw error;
    }
  });
}
