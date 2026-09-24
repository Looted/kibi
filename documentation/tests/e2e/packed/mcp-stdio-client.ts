import { type ChildProcess, spawn } from "node:child_process";
import { createInterface } from "node:readline";

/**
 * Minimal MCP stdio client for packed E2E tests.
 *
 * Speaks newline-delimited JSON-RPC 2.0 against a spawned kibi-mcp process:
 * initialize handshake, then tools/list / tools/call. Intentionally dependency
 * free so packed tests can exercise the real MCP transport surface.
 */
export interface McpStdioServer {
  call(
    name: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  protocol(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
  close(): Promise<void>;
}

interface PendingEntry {
  resolve: (value: Record<string, unknown>) => void;
  reject: (error: Error) => void;
}

export async function startMcpStdioServer(options: {
  command: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
}): Promise<McpStdioServer> {
  const child: ChildProcess = spawn(options.command, options.args, {
    cwd: options.cwd,
    env: options.env,
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (child.stdin === null || child.stdout === null || child.stderr === null) {
    throw new Error("MCP stdio server spawned without pipes");
  }

  const pending = new Map<number, PendingEntry>();
  let nextId = 1;
  let bufferStderr = "";
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    bufferStderr += chunk;
  });

  const readline = createInterface({ input: child.stdout });
  readline.on("line", (line) => {
    const trimmed = line.trim();
    if (trimmed === "") return;
    let message: Record<string, unknown>;
    try {
      message = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return;
    }
    const id = message.id;
    if (typeof id !== "number") return;
    const entry = pending.get(id);
    if (!entry) return;
    pending.delete(id);
    if (message.error !== undefined) {
      entry.reject(
        new Error(
          `MCP error ${JSON.stringify(message.error)}: ${bufferStderr.slice(-2000)}`,
        ),
      );
      return;
    }
    entry.resolve(message.result as Record<string, unknown>);
  });

  function request(
    method: string,
    params: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<Record<string, unknown>> {
    const id = nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(
          new Error(
            `MCP request ${method} timed out after ${timeoutMs}ms: ${bufferStderr.slice(-2000)}`,
          ),
        );
      }, timeoutMs);
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      child.stdin?.write(`${payload}\n`);
    });
  }

  function notify(method: string, params: Record<string, unknown>): void {
    child.stdin?.write(
      `${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`,
    );
  }

  const callTimeout = options.timeoutMs ?? 60_000;
  const initialized = await request(
    "initialize",
    {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "packed-e2e-client", version: "1.0.0" },
    },
    callTimeout,
  );
  if (initialized.serverInfo === undefined) {
    throw new Error("MCP initialize response missing serverInfo");
  }
  notify("notifications/initialized", {});

  return {
    async call(name, args) {
      const result = await request(
        "tools/call",
        { name, arguments: args },
        callTimeout,
      );
      return result;
    },
    protocol(method, params = {}) {
      return request(method, params, callTimeout);
    },
    close() {
      return new Promise((resolve) => {
        child.stdin?.end();
        const done = () => resolve();
        child.once("exit", done);
        setTimeout(() => {
          child.kill("SIGKILL");
          done();
        }, 5000);
      });
    },
  };
}

/** Extract the JSON payload from a tools/call result. */
export function mcpToolPayload(
  result: Record<string, unknown>,
): Record<string, unknown> {
  const structured = result.structuredContent;
  if (structured !== null && typeof structured === "object") {
    const candidate = structured as Record<string, unknown>;
    if (candidate.data !== null && typeof candidate.data === "object") {
      return candidate.data as Record<string, unknown>;
    }
    return candidate;
  }
  const content = result.content;
  if (Array.isArray(content) && content.length > 0) {
    const first = content[0] as { text?: string };
    if (typeof first.text === "string") {
      const parsed = JSON.parse(first.text) as Record<string, unknown>;
      if (parsed.data !== null && typeof parsed.data === "object") {
        return parsed.data as Record<string, unknown>;
      }
      return parsed;
    }
  }
  throw new Error(
    `MCP tool result carried no payload: ${JSON.stringify(result).slice(0, 400)}`,
  );
}
