import { runBoundedProcess } from "../runtime/process";
import type {
  CursorQualificationCheck,
  CursorQualificationReceipt,
} from "./types";

export type CursorQualificationDependencies = Readonly<{
  cursorExecutable: string;
  cwd: string;
  env?: NodeJS.ProcessEnv;
  run?: typeof runBoundedProcess;
}>;

type ProcessOutcome = Awaited<ReturnType<typeof runBoundedProcess>>;

const DEFAULT_TIMEOUT_MS = 20_000;

function lines(text: string): readonly string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Qualifies the local cursor-agent CLI for the non-authoritative
 * compatibility lane. The receipt never records tokens, account emails, or
 * model identifiers beyond availability; only booleans and versions pass
 * through.
 */

// implements REQ-skillopt-cursor-compat
export async function runCursorQualification(
  dependencies: CursorQualificationDependencies,
): Promise<CursorQualificationReceipt> {
  const run = dependencies.run ?? runBoundedProcess;
  const env = dependencies.env ?? process.env;
  const checks: CursorQualificationCheck[] = [];
  const reasons: string[] = [];

  const version = await safeRun(run, {
    argv: [dependencies.cursorExecutable, "--version"],
    cwd: dependencies.cwd,
    env,
  });
  const versionText = version.stdout.trim().split("\n")[0] ?? "";
  const versionOk = version.exitCode === 0 && versionText.length > 0;
  checks.push({
    name: "version",
    status: versionOk ? "pass" : "no-go",
    detail: versionOk ? versionText : `exit ${version.exitCode}`,
  });
  if (!versionOk) reasons.push("cursor_version_unavailable");

  const status = await safeRun(run, {
    argv: [dependencies.cursorExecutable, "status", "--format", "json"],
    cwd: dependencies.cwd,
    env,
  });
  let authenticated = false;
  if (status.exitCode === 0) {
    try {
      const parsed: unknown = JSON.parse(status.stdout);
      authenticated =
        typeof parsed === "object" &&
        parsed !== null &&
        (authenticatedFlag(parsed) || emailPresent(parsed));
    } catch {
      authenticated = false;
    }
  }
  checks.push({
    name: "authenticated",
    status: authenticated ? "pass" : "no-go",
    detail: authenticated ? "session active" : "no active session",
  });
  if (!authenticated) reasons.push("cursor_not_authenticated");

  const models = await safeRun(run, {
    argv: [dependencies.cursorExecutable, "models"],
    cwd: dependencies.cwd,
    env,
  });
  const modelsOk = models.exitCode === 0 && lines(models.stdout).length > 0;
  checks.push({
    name: "models",
    status: modelsOk ? "pass" : "no-go",
    detail: modelsOk
      ? `${lines(models.stdout).length} available`
      : "unavailable",
  });
  if (!modelsOk) reasons.push("cursor_models_unavailable");

  const mcp = await safeRun(run, {
    argv: [dependencies.cursorExecutable, "mcp", "list"],
    cwd: dependencies.cwd,
    env,
  });
  const kibiReady = lines(`${mcp.stdout}\n${mcp.stderr}`).some(
    (line) =>
      line.toLowerCase().startsWith("kibi:") &&
      line.toLowerCase().includes("ready"),
  );
  const needsApproval = lines(`${mcp.stdout}\n${mcp.stderr}`).some((line) =>
    line.toLowerCase().includes("needs approval"),
  );
  checks.push({
    name: "kibi-mcp-ready",
    status: kibiReady ? "pass" : "no-go",
    detail: kibiReady
      ? "approved"
      : needsApproval
        ? "awaiting approval"
        : "not reported",
  });
  if (!kibiReady) reasons.push("cursor_kibi_mcp_not_ready");

  return {
    schemaVersion: "1.0.0",
    artifactType: "skillopt-cursor-qualification",
    verdict: reasons.length === 0 ? "pass" : "no-go",
    cursorVersion: versionOk ? versionText : null,
    reasons,
    checks,
    paidModelCalls: 0,
  };
}

function authenticatedFlag(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return record.loggedIn === true || record.authenticated === true;
}

function emailPresent(value: unknown): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.email === "string" ||
    (typeof record.account === "object" &&
      record.account !== null &&
      typeof (record.account as Record<string, unknown>).email === "string")
  );
}

async function safeRun(
  run: typeof runBoundedProcess,
  input: {
    argv: readonly [string, ...string[]];
    cwd: string;
    env: NodeJS.ProcessEnv;
  },
): Promise<ProcessOutcome> {
  try {
    return await run({
      argv: input.argv,
      cwd: input.cwd,
      env: input.env,
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
  } catch (error) {
    return {
      argv: input.argv,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error),
      exitCode: -1,
      signal: null,
    };
  }
}
