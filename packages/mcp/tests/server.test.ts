import { describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import path from "node:path";

/**
 * Helper to send JSON-RPC request and get response
 */
async function sendRequest(
  proc: ChildProcess,
  request: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let responseData = "";

    const onData = (chunk: Buffer) => {
      responseData += chunk.toString();
      const lines = responseData.split("\n");

      // Check if we have a complete line
      if (lines.length > 1) {
        proc.stdout?.off("data", onData);
        try {
          const response = JSON.parse(lines[0]);
          resolve(response);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${lines[0]}`));
        }
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

/**
 * Helper to start the MCP server
 */
function startServer(): ChildProcess {
  const serverPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
  const proc = spawn("bun", ["run", serverPath], {
    stdio: ["pipe", "pipe", "pipe"],
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

    // Send notification (no response expected, but no error either)
    proc.stdin?.write(
      `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
    );

    // Wait a bit for processing
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
    expect(tools.length).toBe(13);
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

    proc.kill();
  });

  test("should return error for invalid method", async () => {
    const proc = startServer();

    const response = await sendRequest(proc, {
      jsonrpc: "2.0",
      id: 1,
      method: "invalid_method",
    });

    expect(response.error).toBeDefined();
    const error = response.error as Record<string, unknown>;
    expect(error.code).toBe(-32601); // METHOD_NOT_FOUND
    expect(error.message).toContain("Unknown method");

    proc.kill();
  });

  test("should return error for malformed JSON", async () => {
    const proc = startServer();

    return new Promise<void>((resolve) => {
      let responseData = "";

      proc.stdout?.on("data", (chunk) => {
        responseData += chunk.toString();
        const lines = responseData.split("\n");

        if (lines.length > 1) {
          const response = JSON.parse(lines[0]);
          expect(response.error).toBeDefined();
          const error = response.error as Record<string, unknown>;
          expect(error.code).toBe(-32700); // PARSE_ERROR

          proc.kill();
          resolve();
        }
      });

      // Send malformed JSON
      proc.stdin?.write("{invalid json}\n");
    });
  });
});
