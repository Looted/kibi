import { execFileSync, spawn } from "node:child_process";
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

const PROCESS_TREE_DISCOVERY_TIMEOUT_MS = 100;
const PROCESS_TREE_DISCOVERY_MAX_BUFFER = 1024 * 1024;

// Inherited groups may contain the bridge, so terminate only this child's tree.
function descendantPids(pid: number, killGraceMs: number): readonly number[] {
  try {
    const listing = execFileSync("ps", ["-eo", "pid=,ppid="], {
      encoding: "utf8",
      timeout: Math.max(
        1,
        Math.min(killGraceMs, PROCESS_TREE_DISCOVERY_TIMEOUT_MS),
      ),
      maxBuffer: PROCESS_TREE_DISCOVERY_MAX_BUFFER,
    });
    const childrenByParent = new Map<number, number[]>();
    for (const line of listing.split("\n")) {
      const match = /^\s*(\d+)\s+(\d+)\s*$/.exec(line);
      if (match === null) continue;
      const [, childPidText, parentPidText] = match;
      if (childPidText === undefined || parentPidText === undefined) continue;
      const childPid = Number.parseInt(childPidText, 10);
      const parentPid = Number.parseInt(parentPidText, 10);
      const children = childrenByParent.get(parentPid) ?? [];
      children.push(childPid);
      childrenByParent.set(parentPid, children);
    }

    const descendants: number[] = [];
    const pending = [pid];
    for (let index = 0; index < pending.length; index += 1) {
      const parentPid = pending[index];
      if (parentPid === undefined) continue;
      for (const childPid of childrenByParent.get(parentPid) ?? []) {
        pending.push(childPid);
        descendants.push(childPid);
      }
    }
    return descendants.reverse();
  } catch {
    return [];
  }
}

function terminateProcess(pid: number, signal: NodeJS.Signals): void {
  try {
    process.kill(pid, signal);
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "ESRCH")
    ) {
      throw error;
    }
  }
}

function terminateInheritedTree(
  child: ReturnType<typeof spawn>,
  signal: NodeJS.Signals,
  descendantPidsToTerminate: readonly number[],
): void {
  for (const descendantPid of descendantPidsToTerminate)
    terminateProcess(descendantPid, signal);
  terminateChild(child, signal);
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
      const inheritedDescendantPids = ownsGroup
        ? []
        : descendantPids(child.pid, killGraceMs);
      if (ownsGroup) terminateGroup(child.pid, "SIGTERM");
      else terminateInheritedTree(child, "SIGTERM", inheritedDescendantPids);
      killTimer = setTimeout(() => {
        if (ownsGroup) {
          if (child.pid !== undefined) terminateGroup(child.pid, "SIGKILL");
        } else
          terminateInheritedTree(child, "SIGKILL", inheritedDescendantPids);
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
