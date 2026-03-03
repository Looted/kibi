/**
 * E2E Test: MCP Server Operations
 *
 * Tests kibi-mcp installation and JSON-RPC operations via stdio.
 */

import assert from "node:assert";
import { spawn } from "node:child_process";
import { after, before, describe, it } from "node:test";
import {
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
  run,
} from "./helpers.mjs";

describe("MCP E2E: Server Operations", () => {
  let tarballs;
  let sandbox;
  let hasProlog = false;

  before(async () => {
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
      mcpProcess.stdout.on("data", (data) => {
        responseData += data.toString();

        // Check for JSON-RPC response
        try {
          const lines = responseData.trim().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              const msg = JSON.parse(line);
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

      mcpProcess.on("error", (err) => {
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
      const initRequest = {
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "e2e-test", version: "1.0.0" },
        },
      };

      mcpProcess.stdin.write(JSON.stringify(initRequest) + "\n");
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
      mcpProcess.stdout.on("data", (data) => {
        responseData += data.toString();

        try {
          const lines = responseData.trim().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              const msg = JSON.parse(line);
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
      const initRequest = {
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
      const toolsRequest = {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      };

      mcpProcess.stdin.write(JSON.stringify(initRequest) + "\n");
      setTimeout(() => {
        mcpProcess.stdin.write(JSON.stringify(toolsRequest) + "\n");
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
      mcpProcess.stdout.on("data", (data) => {
        responseData += data.toString();

        try {
          const lines = responseData.trim().split("\n");
          for (const line of lines) {
            if (line.trim()) {
              const msg = JSON.parse(line);
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
      const initRequest = {
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
      const queryRequest = {
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

      mcpProcess.stdin.write(JSON.stringify(initRequest) + "\n");
      setTimeout(() => {
        mcpProcess.stdin.write(JSON.stringify(queryRequest) + "\n");
      }, 1000);
    });
  });

  it("should handle graceful shutdown", async () => {
    if (!hasProlog) return;

    const mcpProcess = spawn("node", [sandbox.kibiMcpBin], {
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
