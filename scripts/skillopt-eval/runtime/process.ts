import { spawn } from "node:child_process";
import { z } from "zod";

// implements REQ-skillopt-codex-optimization
export type ProcessResult = Readonly<{
  argv: readonly string[];
  stdout: string;
  stderr: string;
  exitCode: number;
  signal: NodeJS.Signals | null;
}>;

export type ProcessOptions = Readonly<{
  argv: readonly [string, ...string[]];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  killGraceMs?: number;
  stdin?: string;
  groupMode?: "owned" | "inherited";
}>;

export class ProcessControlError extends Error {
  readonly name = "ProcessControlError";

  constructor(
    readonly kind: "spawn" | "timeout" | "interrupted",
    readonly result: ProcessResult,
    options?: ErrorOptions,
  ) {
    super(`process_${kind}:${result.argv[0]}`, options);
  }
}

const JsonObjectSchema = z.record(z.string(), z.unknown());

export type JsonLine = Readonly<{
  line: string;
  event: Readonly<Record<string, unknown>>;
}>;

export class JsonLinesError extends Error {
  readonly name = "JsonLinesError";

  constructor(
    readonly lineNumber: number,
    options?: ErrorOptions,
  ) {
    super(`malformed_jsonl:${lineNumber}`, options);
  }
}

// implements REQ-skillopt-codex-optimization
export function parseJsonLines(stdout: string): readonly JsonLine[] {
  const parsed: JsonLine[] = [];
  const lines = stdout.split("\n");
  for (const [index, line] of lines.entries()) {
    if (line.trim() === "") continue;
    try {
      const event = JsonObjectSchema.parse(JSON.parse(line));
      parsed.push({ line, event });
    } catch (error) {
      throw new JsonLinesError(index + 1, { cause: error });
    }
  }
  return parsed;
}

function terminateGroup(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ESRCH")
    ) {
      throw error;
    }
  }
}

function terminateChild(
  child: ReturnType<typeof spawn>,
  signal: NodeJS.Signals,
): void {
  child.kill(signal);
}

// implements REQ-skillopt-codex-optimization
export function runBoundedProcess(
  options: ProcessOptions,
): Promise<ProcessResult> {
  const killGraceMs = options.killGraceMs ?? 2_000;
  const ownsGroup = options.groupMode !== "inherited";
  return new Promise((resolve, reject) => {
    const [command, ...args] = options.argv;
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      detached: ownsGroup,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let terminalKind: "timeout" | "interrupted" | null = null;
    let killTimer: NodeJS.Timeout | undefined;

    const beginTermination = (kind: "timeout" | "interrupted"): void => {
      if (terminalKind !== null || child.pid === undefined) return;
      terminalKind = kind;
      if (ownsGroup) terminateGroup(child.pid, "SIGTERM");
      else terminateChild(child, "SIGTERM");
      killTimer = setTimeout(() => {
        if (child.pid === undefined) return;
        if (ownsGroup) terminateGroup(child.pid, "SIGKILL");
        else terminateChild(child, "SIGKILL");
      }, killGraceMs);
    };
    const interrupt = (): void => beginTermination("interrupted");
    process.on("SIGINT", interrupt);
    process.on("SIGTERM", interrupt);
    const timeout = setTimeout(
      () => beginTermination("timeout"),
      options.timeoutMs,
    );

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.once("error", (error) => {
      clearTimeout(timeout);
      if (killTimer !== undefined) clearTimeout(killTimer);
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", interrupt);
      reject(
        new ProcessControlError(
          "spawn",
          { argv: options.argv, stdout, stderr, exitCode: -1, signal: null },
          { cause: error },
        ),
      );
    });
    child.once("close", (code, signal) => {
      clearTimeout(timeout);
      if (killTimer !== undefined) clearTimeout(killTimer);
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", interrupt);
      const result: ProcessResult = {
        argv: options.argv,
        stdout,
        stderr,
        exitCode: code ?? -1,
        signal,
      };
      if (terminalKind !== null) {
        reject(new ProcessControlError(terminalKind, result));
        return;
      }
      resolve(result);
    });
    child.stdin.end(options.stdin);
  });
}
