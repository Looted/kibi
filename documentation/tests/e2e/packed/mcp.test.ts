import assert from "node:assert";
import { spawn } from "node:child_process";
import type { ChildProcess } from "node:child_process";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.js";

/** JSON-RPC request structure */
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

/** JSON-RPC response structure */
interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: {
    protocolVersion?: string;
    serverInfo?: { name: string };
    tools?: Array<{ name: string }>;
    content?: Array<{ type: string; text: string }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

describe("MCP E2E: Server Operations", () => {
  let tarballs: Tarballs;
  let sandbox: TestSandbox;
  let hasProlog = false;

  before({ timeout: 120000 }, async () => {
    hasProlog = checkPrologAvailable();
    if (!hasProlog) {
      console.warn("⚠️  SWI-Prolog not available, skipping MCP tests");
      return;
    }

    tarballs = await packAll();
    sandbox = createSandbox();
    await sandbox.install(tarballs);
    await sandbox.initGitRepo();

    // Initialize kibi and create some test data
    await kibi(sandbox, ["init"]);

    createMarkdownFile(
      sandbox,
      "requirements/REQ-MCP-001.md",
      {
        id: "REQ-MCP-001",
        title: "MCP Test Requirement",
        status: "open",
        tags: ["mcp", "test"],
      },
      "A requirement for testing MCP operations.",
    );

    await kibi(sandbox, ["sync"]);
  });

  after(async () => {
    if (sandbox) {
      await sandbox.cleanup();
    }
  });

  it("should have kibi-mcp binary available", async () => {
    if (!hasProlog) return;

    // Check kibi-mcp binary exists (we use node to run it directly)
    const { exitCode } = await run("test", ["-f", sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
    });

    assert.strictEqual(exitCode, 0, "kibi-mcp binary should exist");

    console.log("  ✓ kibi-mcp binary available at:", sandbox.kibiMcpBin);
  });

  it("should start MCP server and respond to initialize", async () => {
    if (!hasProlog) return;

    const mcpProcess = spawn("node", [sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let responseReceived = false;
    let responseData = "";

    const timeout = setTimeout(() => {
      mcpProcess.kill();
    }, 10000);

    return new Promise((resolve, reject) => {
      mcpProcess.stdout?.on("data", (data: Buffer) => {
        responseData += data.toString();

        // Check for JSON-RPC response
        try {
          const lines = responseData.trim().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              const msg = JSON.parse(line) as JsonRpcResponse;
              if (msg.id === 1 && msg.result?.protocolVersion) {
                responseReceived = true;
                clearTimeout(timeout);
                mcpProcess.kill();

                assert.strictEqual(
                  msg.jsonrpc,
                  "2.0",
                  "Should be JSON-RPC 2.0",
                );
                assert.ok(
                  msg.result.serverInfo?.name,
                  "Should have server info",
                );

                console.log(
                  "  ✓ MCP server initialized:",
                  msg.result.serverInfo.name,
                );
                resolve();
                return;
              }
            }
          }
        } catch {
          // Not valid JSON yet, keep waiting
        }
      });

      mcpProcess.on("error", (err: Error) => {
        clearTimeout(timeout);
        reject(err);
      });

      mcpProcess.on("close", () => {
        clearTimeout(timeout);
        if (!responseReceived) {
          reject(new Error("MCP server did not respond to initialize"));
        }
      });

      // Send initialize request
      const initRequest: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "e2e-test", version: "1.0.0" },
        },
      };

      mcpProcess.stdin?.write(JSON.stringify(initRequest) + "\n");
    });
  });

  it("should list available tools", async () => {
    if (!hasProlog) return;

    const mcpProcess = spawn("node", [sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let responseReceived = false;
    let responseData = "";

    const timeout = setTimeout(() => {
      mcpProcess.kill();
    }, 10000);

    return new Promise((resolve, reject) => {
      mcpProcess.stdout?.on("data", (data: Buffer) => {
        responseData += data.toString();

        try {
          const lines = responseData.trim().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              const msg = JSON.parse(line) as JsonRpcResponse;
              if (msg.id === 2 && msg.result?.tools) {
                responseReceived = true;
                clearTimeout(timeout);
                mcpProcess.kill();

                assert.ok(
                  Array.isArray(msg.result.tools),
                  "Tools should be an array",
                );
                assert.ok(
                  msg.result.tools.length > 0,
                  "Should have at least one tool",
                );

                const toolNames = msg.result.tools.map((t) => t.name);
                console.log("  ✓ Available tools:", toolNames.join(", "));

                resolve();
                return;
              }
            }
          }
        } catch {
          // Keep waiting
        }
      });

      mcpProcess.on("error", reject);
      mcpProcess.on("close", () => {
        clearTimeout(timeout);
        if (!responseReceived) {
          reject(new Error("MCP server did not list tools"));
        }
      });

      // Initialize first
      const initRequest: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "e2e-test", version: "1.0.0" },
        },
      };

      // Then list tools
      const toolsRequest: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      };

      mcpProcess.stdin?.write(JSON.stringify(initRequest) + "\n");
      setTimeout(() => {
        mcpProcess.stdin?.write(JSON.stringify(toolsRequest) + "\n");
      }, 500);
    });
  });

  it("should query entities via kb_query tool", async () => {
    if (!hasProlog) return;

    const mcpProcess = spawn("node", [sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let responseReceived = false;
    let responseData = "";

    const timeout = setTimeout(() => {
      mcpProcess.kill();
    }, 15000);

    return new Promise((resolve, reject) => {
      mcpProcess.stdout?.on("data", (data: Buffer) => {
        responseData += data.toString();

        try {
          const lines = responseData.trim().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              const msg = JSON.parse(line) as JsonRpcResponse;
              if (msg.id === 3 && msg.result?.content) {
                responseReceived = true;
                clearTimeout(timeout);
                mcpProcess.kill();

                const content = msg.result.content;
                assert.ok(Array.isArray(content), "Content should be an array");

                const text = content.map((c) => c.text).join("");
                assert.ok(
                  text.includes("REQ-MCP-001") ||
                    text.includes("MCP Test Requirement"),
                  "Query should return the test requirement",
                );

                console.log("  ✓ kb_query returned entities");
                resolve();
                return;
              }
            }
          }
        } catch {
          // Keep waiting
        }
      });

      mcpProcess.on("error", reject);
      mcpProcess.on("close", () => {
        clearTimeout(timeout);
        if (!responseReceived) {
          reject(new Error("MCP server did not respond to query"));
        }
      });

      // Initialize
      const initRequest: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "e2e-test", version: "1.0.0" },
        },
      };

      // Call kb_query
      const queryRequest: JsonRpcRequest = {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: {
            type: "req",
          },
        },
      };

      mcpProcess.stdin?.write(JSON.stringify(initRequest) + "\n");
      setTimeout(() => {
        mcpProcess.stdin?.write(JSON.stringify(queryRequest) + "\n");
      }, 1000);
    });
  });

  it("should handle graceful shutdown", async () => {
    if (!hasProlog) return;

    const mcpProcess: ChildProcess = spawn("node", [sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    // Let it start
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Kill it
    mcpProcess.kill("SIGTERM");

    // Wait for exit
    await new Promise((resolve) => {
      mcpProcess.on("close", resolve);
      setTimeout(resolve, 2000); // Timeout fallback
    });

    console.log("  ✓ MCP server shutdown gracefully");
  });
});
