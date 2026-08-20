import assert from "node:assert";
import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import fs from "node:fs";
import { join } from "node:path";
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

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

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
    prompts?: Array<{ name: string; description?: string }>;
    content?: Array<{ type: string; text: string }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

function stopProcess(mcpProcess: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (mcpProcess.exitCode !== null || mcpProcess.killed) {
      resolve();
      return;
    }
    mcpProcess.once("close", () => resolve());
    mcpProcess.kill();
    setTimeout(resolve, 2000);
  });
}

if (RUN_NODE_TEST_SUITE) {
  describe("MCP E2E: Server Operations", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
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
          ".kb/requirements/REQ-MCP-001.md",
          {
            id: "REQ-MCP-001",
            title: "MCP Test Requirement",
            status: "open",
            tags: ["mcp", "test"],
          },
          "A requirement for testing MCP operations.",
        );

        await kibi(sandbox, ["sync"]);
      },
      { timeout: 120000 },
    );

    after(
      async () => {
        if (sandbox) {
          await sandbox.cleanup();
        }
      },
      { timeout: 120000 },
    );

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
                  const result = msg.result;
                  responseReceived = true;
                  clearTimeout(timeout);
                  void stopProcess(mcpProcess).finally(() => {
                    assert.strictEqual(
                      msg.jsonrpc,
                      "2.0",
                      "Should be JSON-RPC 2.0",
                    );
                    assert.ok(
                      result.serverInfo?.name,
                      "Should have server info",
                    );

                    console.log(
                      "  ✓ MCP server initialized:",
                      result.serverInfo?.name,
                    );
                    resolve();
                  });
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

        mcpProcess.stdin?.write(`${JSON.stringify(initRequest)}\n`);
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
                  const tools = msg.result.tools;
                  responseReceived = true;
                  clearTimeout(timeout);
                  void stopProcess(mcpProcess).finally(() => {
                    assert.ok(Array.isArray(tools), "Tools should be an array");
                    const toolNames = tools.map((t) => t.name);
                    assert.deepStrictEqual(toolNames, [
                      "kb_query",
                      "kb_search",
                      "kb_status",
                      "kb_skills_list",
                      "kb_skills_load",
                      "kb_skills_read",
                      "kb_find_gaps",
                      "kb_coverage",
                      "kb_graph",
                      "kb_sparql_remote",
                      "kb_semantic_advisor",
                      "kb_upsert",
                      "kb_validate_upsert",
                      "kb_delete",
                      "kb_check",
                      "kb_model_requirement",
                      "kb_suggest_predicates",
                      "kb_autopilot_generate",
                      "kb_compile_intent",
                      "kb_apply_plan",
                      "kb_ingest_verification",
                    ]);
                    assert.ok(
                      !toolNames.includes("kb_briefing_generate"),
                      "Removed briefing tool should not be listed",
                    );
                    console.log("  ✓ Available tools:", toolNames.join(", "));

                    resolve();
                  });
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

        mcpProcess.stdin?.write(`${JSON.stringify(initRequest)}\n`);
        setTimeout(() => {
          mcpProcess.stdin?.write(`${JSON.stringify(toolsRequest)}\n`);
        }, 500);
      });
    });

    it("should expose the cold-start bootstrap prompt", async () => {
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
                if (msg.id === 2 && msg.result?.prompts) {
                  const prompts = msg.result.prompts;
                  responseReceived = true;
                  clearTimeout(timeout);
                  void stopProcess(mcpProcess).finally(() => {
                    assert.ok(
                      Array.isArray(prompts),
                      "Prompts should be an array",
                    );
                    const initPrompt = prompts.find(
                      (p) => p.name === "init-kibi",
                    );
                    assert.ok(initPrompt, "init-kibi should be registered");
                    assert.match(
                      initPrompt.description ?? "",
                      /interactive activation|new or empty/i,
                    );
                    resolve();
                  });
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
            reject(new Error("MCP server did not list prompts"));
          }
        });

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

        const promptsRequest: JsonRpcRequest = {
          jsonrpc: "2.0",
          id: 2,
          method: "prompts/list",
        };

        mcpProcess.stdin?.write(`${JSON.stringify(initRequest)}\n`);
        mcpProcess.stdin?.write(`${JSON.stringify(promptsRequest)}\n`);
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
                  const content = msg.result.content;
                  responseReceived = true;
                  clearTimeout(timeout);
                  void stopProcess(mcpProcess).finally(() => {
                    assert.ok(
                      Array.isArray(content),
                      "Content should be an array",
                    );

                    const text = content.map((c) => c.text).join("");
                    assert.ok(
                      text.includes("REQ-MCP-001") ||
                        text.includes("MCP Test Requirement"),
                      "Query should return the test requirement",
                    );
                    assert.ok(
                      text.includes("REQ-MCP-001") ||
                        text.includes("MCP Test Requirement"),
                      "Query should return the test requirement",
                    );

                    console.log("  ✓ kb_query returned entities");
                    resolve();
                  });
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

        mcpProcess.stdin?.write(`${JSON.stringify(initRequest)}\n`);
        setTimeout(() => {
          mcpProcess.stdin?.write(`${JSON.stringify(queryRequest)}\n`);
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
      await stopProcess(mcpProcess);

      console.log("  ✓ MCP server shutdown gracefully");
    });

    it("should create usage.log when started with --diagnostic-mode", async () => {
      if (!hasProlog) return;

      const mcpProcess: ChildProcess = spawn(
        "node",
        [sandbox.kibiMcpBin, "--diagnostic-mode"],
        {
          cwd: sandbox.repoDir,
          env: sandbox.env,
          stdio: ["pipe", "pipe", "pipe"],
        },
      );

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
                  void stopProcess(mcpProcess).finally(() => {
                    // Verify usage.log was created
                    const usageLogPath = join(
                      sandbox.repoDir,
                      ".kb",
                      "usage.log",
                    );
                    assert.ok(
                      fs.existsSync(usageLogPath),
                      "usage.log should exist when --diagnostic-mode is enabled",
                    );

                    // Verify usage.log contains valid JSON lines
                    const logContent = fs
                      .readFileSync(usageLogPath, "utf8")
                      .trim();
                    assert.ok(
                      logContent.length > 0,
                      "usage.log should not be empty",
                    );

                    const logLines = logContent.split("\n");
                    for (const logLine of logLines) {
                      const entry = JSON.parse(logLine);
                      assert.ok(
                        entry.timestamp,
                        "Log entry should have timestamp",
                      );
                      assert.ok(entry.tool, "Log entry should have tool name");
                      assert.ok(entry.status, "Log entry should have status");
                      assert.ok(
                        entry.active_branch,
                        "Log entry should have branch",
                      );
                    }

                    console.log(
                      "  ✓ usage.log created with valid diagnostic entries",
                    );
                    resolve();
                  });
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

        // Call kb_query to trigger diagnostic logging
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

        mcpProcess.stdin?.write(`${JSON.stringify(initRequest)}\n`);
        setTimeout(() => {
          mcpProcess.stdin?.write(`${JSON.stringify(queryRequest)}\n`);
        }, 1000);
      });
    });
  });
}
