import { describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function sendRequest(
  proc: ChildProcess,
  request: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let responseData = "";

    const parseJson = (value: string): Record<string, unknown> | null => {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return null;
      }
    };

    const onData = (chunk: Buffer) => {
      responseData += chunk.toString();
      const lines = responseData.split("\n");

      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i]?.trim();
        if (!line) {
          continue;
        }

        const response = parseJson(line);
        if (response) {
          responseData = lines.slice(i + 1).join("\n");
          proc.stdout?.off("data", onData);
          resolve(response);
          return;
        }
      }

      const fallback = parseJson(responseData.trim());
      if (fallback) {
        responseData = "";
        proc.stdout?.off("data", onData);
        resolve(fallback);
      }
    };

    proc.stdout?.on("data", onData);

    // Write request
    proc.stdin?.write(`${JSON.stringify(request)}\n`);

    // Timeout after 5s
    setTimeout(() => {
      proc.stdout?.off("data", onData);
      reject(new Error("Request timeout"));
    }, 5000);
  });
}

function startServer(options?: {
  cwd?: string;
  env?: Record<string, string>;
}): ChildProcess {
  const serverPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
  const proc = spawn("bun", ["run", serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: options?.cwd,
    env: options?.env ? { ...process.env, ...options.env } : process.env,
  });

  return proc;
}

describe("MCP Server", () => {
  test("should parse valid JSON-RPC request", async () => {
    const proc = startServer();

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();

    proc.kill();
  });

  test("should handle initialize request", async () => {
    const proc = startServer();

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    const result = response.result as Record<string, unknown>;
    expect(result.protocolVersion).toBe("2024-11-05");
    expect(result.serverInfo).toBeDefined();
    expect((result.serverInfo as Record<string, unknown>).name).toBe(
      "kibi-mcp",
    );
    expect((result.serverInfo as Record<string, unknown>).version).toBe(
      "0.1.0",
    );
    expect(result.capabilities).toBeDefined();

    proc.kill();
  });

  test("should handle notifications/initialized", async () => {
    const proc = startServer();

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

    proc.stdin?.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    proc.kill();
  });

  test("should handle tools/list request", async () => {
    const proc = startServer();

    // Initialize first
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

    // Request tools list
    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
    });

    const result = response.result as Record<string, unknown>;
    expect(result.tools).toBeDefined();
    const tools = result.tools as Array<Record<string, unknown>>;
    expect(tools.length).toBe(15);
    expect(tools[0].name).toBe("kb_query");
    expect(tools[1].name).toBe("kb_upsert");
    expect(tools[2].name).toBe("kb_delete");
    expect(tools[3].name).toBe("kb_check");
    expect(tools[4].name).toBe("kb_branch_ensure");
    expect(tools[5].name).toBe("kb_branch_gc");
    expect(tools[6].name).toBe("kb_query_relationships");
    expect(tools[7].name).toBe("kb_derive");
    expect(tools[8].name).toBe("kb_impact");
    expect(tools[9].name).toBe("kb_coverage_report");
    expect(tools[10].name).toBe("kb_symbols_refresh");
    expect(tools[11].name).toBe("kb_list_entity_types");
    expect(tools[12].name).toBe("kb_list_relationship_types");
    expect(tools[13].name).toBe("kbcontext");
    expect(tools[14].name).toBe("get_help");

    proc.kill();
  });

  test("should initialize from non-repo cwd with workspace override", async () => {
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-"));
    const workspaceRoot = path.resolve(import.meta.dir, "../../..");
    const proc = startServer({
      cwd: tempRoot,
      env: { KIBI_WORKSPACE: workspaceRoot },
    });

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "test", version: "1.0" },
      },
    });

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();

    proc.kill();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  test("should return error for invalid method", async () => {
    const proc = startServer();

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

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 2,
      method: "invalid_method",
    });

    expect(response.error).toBeDefined();
    const error = response.error as Record<string, unknown>;
    expect(error.code).toBe(-32601); // METHOD_NOT_FOUND
    expect(error.message).toContain("Method not found");

    proc.kill();
  });
});
