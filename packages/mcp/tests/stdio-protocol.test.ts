import { describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";

type JsonValue = null | boolean | number | string | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue };

function startServer(options?: {
  cwd?: string;
  env?: Record<string, string>;
}): ChildProcess {
  const serverPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
  return spawn("bun", ["run", serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: options?.cwd,
    env: options?.env ? { ...process.env, ...options.env } : process.env,
  });
}

function readNextJsonMessage(
  proc: ChildProcess,
  timeoutMs = 5000,
): Promise<JsonObject> {
  return new Promise((resolve, reject) => {
    let buffer = "";

    const parseLine = (line: string): JsonObject | null => {
      try {
        const value = JSON.parse(line) as unknown;
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return null;
        }
        return value as JsonObject;
      } catch {
        return null;
      }
    };

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");

      for (let i = 0; i < lines.length - 1; i++) {
        const line = (lines[i] ?? "").trim();
        if (!line) {
          continue;
        }

        const parsed = parseLine(line);
        if (!parsed) {
          cleanup();
          reject(new Error(`Non-JSON stdout line: ${line}`));
          return;
        }

        buffer = lines.slice(i + 1).join("\n");
        cleanup();
        resolve(parsed);
        return;
      }
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      proc.stdout?.off("data", onData);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout waiting for JSON message"));
    }, timeoutMs);

    proc.stdout?.on("data", onData);
  });
}

async function sendRequest(
  proc: ChildProcess,
  request: JsonObject,
): Promise<JsonObject> {
  proc.stdin?.write(`${JSON.stringify(request)}\n`);
  return readNextJsonMessage(proc);
}

function waitForExit(
  proc: ChildProcess,
  timeoutMs = 2000,
): Promise<{ code: number | null; signal: NodeJS.Signals | null }> {
  return new Promise((resolve, reject) => {
    if (proc.exitCode !== null) {
      resolve({ code: proc.exitCode, signal: null });
      return;
    }

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      resolve({ code, signal });
    };

    const cleanup = () => {
      clearTimeout(timeoutId);
      proc.off("exit", onExit);
    };

    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Timeout waiting for process exit"));
    }, timeoutMs);

    proc.on("exit", onExit);
  });
}

function getErrorCode(message: JsonObject): number | null {
  const errorValue = message.error;
  if (
    !errorValue ||
    typeof errorValue !== "object" ||
    Array.isArray(errorValue)
  ) {
    return null;
  }
  const code = (errorValue as Record<string, unknown>).code;
  return typeof code === "number" ? code : null;
}

describe("MCP stdio protocol hardening", () => {
  test("malformed JSON line returns parse error and server continues", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    proc.stdin?.write("not-json\n");
    const parseError = await readNextJsonMessage(proc);
    expect(parseError.jsonrpc).toBe("2.0");
    expect(parseError.error).toBeDefined();
    expect(getErrorCode(parseError)).toBe(-32700);

    const initResponse = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });
    expect(initResponse.result).toBeDefined();

    proc.kill();
  });

  test("invalid JSON-RPC shape returns invalid request and server continues", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    proc.stdin?.write("{}\n");
    const invalidReq = await readNextJsonMessage(proc);
    expect(invalidReq.jsonrpc).toBe("2.0");
    expect(invalidReq.error).toBeDefined();
    expect(getErrorCode(invalidReq)).toBe(-32600);

    const initResponse = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });
    expect(initResponse.result).toBeDefined();

    proc.kill();
  });

  test("stdout purity: all stdout lines are JSON", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    const tools = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });
    expect(tools.result).toBeDefined();

    proc.kill();
  });

  test("stdin EOF triggers clean shutdown", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    proc.stdin?.end();
    proc.stdin?.destroy();

    const exited = await waitForExit(proc, 2000);
    expect(exited.signal).toBeNull();
    expect(exited.code).toBe(0);
  });

  test("SIGTERM triggers graceful shutdown", async () => {
    const proc = startServer({
      env: { MCPCAT_PROJECT_ID: "" },
    });

    await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    proc.kill("SIGTERM");
    const exited = await waitForExit(proc, 2000);
    expect(exited.signal).toBeNull();
    expect(exited.code).toBe(0);
  });
});
