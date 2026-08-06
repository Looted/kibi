import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import {
  appendTraceReceipt,
  jsonRpcId,
  jsonRpcMethod,
  parseJsonRpcObject,
  toolNameFromCall,
} from "./jsonrpc";
import {
  type BrokerOptions,
  McpBrokerError,
  REQUIRED_KIBI_TOOLS,
  filterAdvertisedTools,
} from "./mcp-broker";

const REQUIRED_TOOL_NAMES = new Set<string>(REQUIRED_KIBI_TOOLS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requestKey(id: string | number | null): string {
  return `${typeof id}:${String(id)}`;
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

type PendingRequest = Readonly<{
  correlationId: string;
  method?: string;
  toolName?: string;
  startedAt: number;
  timer: NodeJS.Timeout;
}>;

type BrokerIo = Readonly<{
  input: Readable;
  output: Writable;
  error: Writable;
}>;

// implements REQ-skillopt-codex-optimization
export async function runMcpBroker(
  options: BrokerOptions,
  io: BrokerIo = {
    input: process.stdin,
    output: process.stdout,
    error: process.stderr,
  },
): Promise<void> {
  const ownsGroup = process.env.KIBI_SKILLOPT_PROCESS_GROUP !== "python_bridge";
  const child = spawn(
    options.downstream.command,
    [...options.downstream.args],
    {
      cwd: options.downstream.cwd,
      env: process.env,
      detached: ownsGroup,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  if (child.pid === undefined) throw new McpBrokerError("startup");
  const pid = child.pid;
  const pending = new Map<string, PendingRequest>();
  let sequence = 0;
  let initialized = false;
  let shutdownRequested = false;
  let downstreamClosed = false;
  let terminalError: McpBrokerError | null = null;
  let killTimer: NodeJS.Timeout | undefined;
  let receiptQueue = Promise.resolve();
  const record = (input: Parameters<typeof appendTraceReceipt>[1]): void => {
    receiptQueue = receiptQueue
      .then(() => appendTraceReceipt(options.tracePath, input))
      .then(() => undefined);
  };
  const requestShutdown = (): void => {
    if (shutdownRequested) return;
    shutdownRequested = true;
    if (downstreamClosed) return;
    if (ownsGroup) terminateGroup(pid, "SIGTERM");
    else terminateChild(child, "SIGTERM");
    killTimer = setTimeout(() => {
      if (ownsGroup) terminateGroup(pid, "SIGKILL");
      else terminateChild(child, "SIGKILL");
    }, options.killGraceMs);
  };
  const fail = (error: McpBrokerError): void => {
    if (terminalError !== null) return;
    terminalError = error;
    record({
      correlationId: "broker",
      direction: "broker",
      kind: "error",
      payload: { kind: error.kind },
    });
    requestShutdown();
  };
  const interrupt = (): void => requestShutdown();
  process.on("SIGINT", interrupt);
  process.on("SIGTERM", interrupt);
  const startupTimer = setTimeout(
    () => fail(new McpBrokerError("startup")),
    options.startupTimeoutMs,
  );
  child.stderr.pipe(io.error, { end: false });

  const targetLines = createInterface({
    input: io.input,
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  targetLines.on("line", (line) => {
    let message: Record<string, unknown>;
    try {
      message = parseJsonRpcObject(line);
    } catch (error) {
      record({
        correlationId: `rpc-${String(++sequence).padStart(6, "0")}`,
        direction: "target_to_server",
        kind: "error",
        payload: {
          line,
          error: error instanceof Error ? error.message : String(error),
        },
      });
      fail(new McpBrokerError("protocol"));
      return;
    }
    const id = jsonRpcId(message);
    const method = jsonRpcMethod(message);
    const toolName = toolNameFromCall(message);
    const correlationId = `rpc-${String(++sequence).padStart(6, "0")}`;
    record({
      correlationId,
      direction: "target_to_server",
      kind: "request",
      method,
      toolName,
      requestId: id,
      payload: message,
    });
    if (
      method === "tools/call" &&
      (toolName === undefined || !REQUIRED_TOOL_NAMES.has(toolName))
    ) {
      const response = {
        jsonrpc: "2.0",
        id: id ?? null,
        error: {
          code: -32601,
          message: "Tool not exposed by evaluator broker",
        },
      };
      record({
        correlationId,
        direction: "broker",
        kind: "error",
        method,
        toolName,
        requestId: id,
        payload: response,
      });
      io.output.write(`${JSON.stringify(response)}\n`);
      return;
    }
    if (id !== undefined) {
      const timer = setTimeout(
        () => fail(new McpBrokerError("timeout")),
        options.toolTimeoutMs,
      );
      pending.set(requestKey(id), {
        correlationId,
        method,
        toolName,
        startedAt: performance.now(),
        timer,
      });
    }
    child.stdin.write(`${line}\n`);
  });
  targetLines.once("close", () => {
    child.stdin.end();
    requestShutdown();
  });

  const serverLines = createInterface({
    input: child.stdout,
    crlfDelay: Number.POSITIVE_INFINITY,
  });
  serverLines.on("line", (line) => {
    let message: Record<string, unknown>;
    try {
      message = parseJsonRpcObject(line);
    } catch {
      fail(new McpBrokerError("protocol"));
      return;
    }
    const id = jsonRpcId(message);
    const matched = id === undefined ? undefined : pending.get(requestKey(id));
    if (matched !== undefined && id !== undefined) {
      clearTimeout(matched.timer);
      pending.delete(requestKey(id));
    }
    if (matched?.method === "initialize") {
      initialized = true;
      clearTimeout(startupTimer);
    }
    let forwarded = message;
    if (matched?.method === "tools/list") {
      try {
        forwarded = filterAdvertisedTools(message);
      } catch {
        fail(new McpBrokerError("startup"));
        return;
      }
    }
    record({
      correlationId:
        matched?.correlationId ??
        `server-${String(++sequence).padStart(6, "0")}`,
      direction: "server_to_target",
      kind: isRecord(forwarded.error) ? "error" : "response",
      ...(matched?.method === undefined ? {} : { method: matched.method }),
      ...(matched?.toolName === undefined
        ? {}
        : { toolName: matched.toolName }),
      ...(id === undefined ? {} : { requestId: id }),
      ...(matched === undefined
        ? {}
        : { elapsedMs: performance.now() - matched.startedAt }),
      payload: forwarded,
    });
    io.output.write(`${JSON.stringify(forwarded)}\n`);
  });

  let exit: number | null;
  try {
    exit = await new Promise<number | null>((resolveExit, rejectExit) => {
      child.once("error", rejectExit);
      child.once("close", (code) => resolveExit(code));
    });
    downstreamClosed = true;
  } finally {
    clearTimeout(startupTimer);
    if (killTimer !== undefined) clearTimeout(killTimer);
    for (const request of pending.values()) clearTimeout(request.timer);
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
  if (pending.size > 0 && terminalError === null && !shutdownRequested)
    fail(new McpBrokerError("server_exit"));
  await receiptQueue;
  if (terminalError !== null) throw terminalError;
  if (!shutdownRequested && (!initialized || exit !== 0))
    throw new McpBrokerError("server_exit");
}
