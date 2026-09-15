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

const PROCESS_TREE_SETTLE_EXTRA_MS = 5_000;
const PROCESS_TREE_SETTLE_POLL_MS = 20;
const SUPPORTS_PROCESS_GROUPS = process.platform !== "win32";
const PROCESS_TABLE_TIMEOUT_MS = 100;
const PROCESS_TABLE_MAX_BUFFER = 1024 * 1024;

type ProcessTableRow = Readonly<{
  pid: number;
  parentPid: number;
  groupId: number;
}>;

function readProcessTable(killGraceMs: number): readonly ProcessTableRow[] {
  try {
    const listing = execFileSync("ps", ["-eo", "pid=,ppid=,pgid="], {
      encoding: "utf8",
      timeout: Math.max(1, Math.min(killGraceMs, PROCESS_TABLE_TIMEOUT_MS)),
      maxBuffer: PROCESS_TABLE_MAX_BUFFER,
    });
    return listing.split("\n").flatMap((line) => {
      const match = /^\s*(\d+)\s+(\d+)\s+(\d+)\s*$/.exec(line);
      if (match === null) return [];
      const [, pid, parentPid, groupId] = match.map(Number);
      return pid === undefined ||
        parentPid === undefined ||
        groupId === undefined
        ? []
        : [{ pid, parentPid, groupId }];
    });
  } catch {
    return [];
  }
}

function descendantPids(
  table: readonly ProcessTableRow[],
  pid: number,
): readonly number[] {
  const childrenByParent = new Map<number, number[]>();
  for (const row of table) {
    const children = childrenByParent.get(row.parentPid) ?? [];
    children.push(row.pid);
    childrenByParent.set(row.parentPid, children);
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

function pidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ESRCH") {
      return false;
    }
    return true;
  }
}

// implements REQ-skillopt-codex-optimization
export function runBoundedProcess(
  options: ProcessOptions,
): Promise<ProcessResult> {
  const killGraceMs = options.killGraceMs ?? 2_000;
  const ownsGroup = options.groupMode !== "inherited";
  return new Promise((resolve, reject) => {
    const [command, ...args] = options.argv;
    const initialProcessTable = ownsGroup ? [] : readProcessTable(killGraceMs);
    const inheritedGroupId = initialProcessTable.find(
      (row) => row.pid === process.pid,
    )?.groupId;
    const ownsInheritedGroup = inheritedGroupId === process.pid;
    const inheritedBaselinePids = new Set(
      initialProcessTable
        .filter((row) => row.groupId === inheritedGroupId)
        .map((row) => row.pid),
    );
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
    let settleTimer: NodeJS.Timeout | undefined;
    let closed = false;
    let settled = false;
    let treePids: readonly number[] = [];

    const settle = (finish: () => void): void => {
      if (settled) return;
      settled = true;
      if (killTimer !== undefined) clearTimeout(killTimer);
      if (settleTimer !== undefined) clearTimeout(settleTimer);
      process.off("SIGINT", interrupt);
      process.off("SIGTERM", interrupt);
      finish();
    };

    const refreshTreePids = (): readonly number[] => {
      if (ownsGroup || child.pid === undefined) return [];
      const table = readProcessTable(killGraceMs);
      const discovered = [
        ...(closed ? [] : descendantPids(table, child.pid)),
        ...table
          .filter(
            (row) =>
              inheritedGroupId !== undefined &&
              ownsInheritedGroup &&
              row.groupId === inheritedGroupId &&
              !inheritedBaselinePids.has(row.pid),
          )
          .map((row) => row.pid),
      ];
      treePids = [...new Set([...treePids, ...discovered])].filter(
        (descendantPid) => pidAlive(descendantPid),
      );
      return treePids;
    };

    const escalateToSigkill = (): void => {
      killTimer = undefined;
      if (child.pid === undefined) return;
      if (ownsGroup) {
        terminateGroup(child.pid, "SIGKILL");
        return;
      }
      for (const descendantPid of refreshTreePids())
        terminateProcess(descendantPid, "SIGKILL");
      terminateChild(child, "SIGKILL");
    };

    const beginTermination = (kind: "timeout" | "interrupted"): void => {
      if (terminalKind !== null || closed || child.pid === undefined) return;
      terminalKind = kind;
      if (ownsGroup) terminateGroup(child.pid, "SIGTERM");
      else {
        for (const descendantPid of refreshTreePids())
          terminateProcess(descendantPid, "SIGTERM");
        terminateChild(child, "SIGTERM");
      }
      killTimer = setTimeout(escalateToSigkill, killGraceMs);
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
      if (closed || settled) return;
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
      closed = true;
      clearTimeout(timeout);
      const result: ProcessResult = {
        argv: options.argv,
        stdout,
        stderr,
        exitCode: code ?? -1,
        signal,
      };
      const finish = (): void => {
        if (terminalKind !== null) {
          reject(new ProcessControlError(terminalKind, result));
          return;
        }
        resolve(result);
      };
      const leaderPid = child.pid;
      if (
        terminalKind === null ||
        !SUPPORTS_PROCESS_GROUPS ||
        leaderPid === undefined
      ) {
        settle(finish);
        return;
      }
      const deadline = Date.now() + killGraceMs + PROCESS_TREE_SETTLE_EXTRA_MS;
      const treeAlive = (): boolean =>
        ownsGroup ? pidAlive(-leaderPid) : refreshTreePids().length > 0;
      const awaitTreeExit = (): void => {
        if (!treeAlive()) {
          settle(finish);
          return;
        }
        if (Date.now() >= deadline) {
          escalateToSigkill();
          settle(finish);
          return;
        }
        settleTimer = setTimeout(awaitTreeExit, PROCESS_TREE_SETTLE_POLL_MS);
      };
      awaitTreeExit();
    });
    child.stdin.end(options.stdin);
  });
}
