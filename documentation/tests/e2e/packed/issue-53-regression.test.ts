import assert from "node:assert";
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  createSandbox,
  kibi,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

/**
 * Issue #53 Packed E2E Regression Tests
 *
 * These tests verify that the npm-installed packages work correctly
 * for consumers, specifically addressing:
 * 1. Same-process attach/detach lifecycle stability
 * 2. Absence of load_files/Unknown option startup errors in MCP
 * 3. Proper handling of paths.symbols configuration
 */

if (RUN_NODE_TEST_SUITE) {
  describe(
    "Issue #53: Packed tarball consumer regression",
    { timeout: 180000 },
    () => {
      let tarballs: Tarballs;
      let sandbox: TestSandbox;

      before(
        async () => {
          tarballs = await packAll();
          sandbox = createSandbox();
          await sandbox.install(tarballs);
          await sandbox.initGitRepo();

          // Initialize kibi in the sandbox repo
          const initResult = await kibi(sandbox, ["init"]);
          assert.strictEqual(
            initResult.exitCode,
            0,
            `kibi init should succeed: ${initResult.stderr}`,
          );
        },
        { timeout: 120000 },
      );

      after(
        async () => {
          if (sandbox) {
            await sandbox.cleanup();
          }
        },
        { timeout: 60000 },
      );

      it(
        "installed kibi-cli should survive init and sync without errors",
        { timeout: 60000 },
        async () => {
          const docsDir = join(
            sandbox.repoDir,
            "documentation",
            "requirements",
          );
          mkdirSync(docsDir, { recursive: true });
          writeFileSync(
            join(docsDir, "REQ-ISSUE53-001.md"),
            "---\nid: REQ-ISSUE53-001\ntitle: Issue 53 Test Requirement\nstatus: open\n---\n\nTest requirement for issue 53 regression.",
            "utf8",
          );

          const syncResult = await kibi(sandbox, ["sync"]);
          assert.strictEqual(
            syncResult.exitCode,
            0,
            `kibi sync should succeed: ${syncResult.stderr}`,
          );

          const queryResult = await kibi(sandbox, ["query", "req"]);
          assert.strictEqual(
            queryResult.exitCode,
            0,
            `kibi query should succeed: ${queryResult.stderr}`,
          );
          assert(
            !queryResult.stderr.includes("Query timeout after"),
            `Query should not time out: ${queryResult.stderr}`,
          );
        },
      );

      it(
        "installed kibi-mcp should start without load_files or Unknown option errors",
        { timeout: 30000 },
        async () => {
          const mcpProcess = spawn("node", [sandbox.kibiMcpBin], {
            cwd: sandbox.repoDir,
            env: sandbox.env,
            stdio: ["pipe", "pipe", "pipe"],
          });

          let stdout = "";
          let stderr = "";
          let receivedInitResponse = false;

          const timeout = setTimeout(() => {
            mcpProcess.kill();
          }, 15000);

          return new Promise<void>((resolve, reject) => {
            mcpProcess.stdout?.on("data", (data: Buffer) => {
              stdout += data.toString();

              try {
                const lines = stdout.trim().split("\n");
                for (const line of lines) {
                  if (line.trim() && !receivedInitResponse) {
                    const msg = JSON.parse(line);
                    if (msg.id === 1 && msg.result?.protocolVersion) {
                      receivedInitResponse = true;
                      clearTimeout(timeout);
                      void mcpProcess.kill();
                    }
                  }
                }
              } catch {
                // Not valid JSON yet, keep waiting
              }
            });

            mcpProcess.stderr?.on("data", (data: Buffer) => {
              stderr += data.toString();
            });

            mcpProcess.on("error", (err: Error) => {
              clearTimeout(timeout);
              reject(err);
            });

            mcpProcess.on("close", () => {
              clearTimeout(timeout);

              // Verify no load_files or Unknown option errors
              const hasLoadFilesError = stderr.includes("load_files(");
              const hasUnknownOptionError = stderr.includes("Unknown option");
              const hasSourceSinkError = stderr.includes("source_sink");

              if (
                hasLoadFilesError ||
                hasUnknownOptionError ||
                hasSourceSinkError
              ) {
                reject(
                  new Error(
                    `MCP startup errors detected:\nstderr: ${stderr}\nstdout: ${stdout}`,
                  ),
                );
                return;
              }

              // Verify we got a valid init response
              assert(
                receivedInitResponse,
                "Should receive valid initialize response",
              );

              resolve();
            });

            // Send initialize request
            const initRequest = {
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                  name: "issue-53-regression-test",
                  version: "1.0.0",
                },
              },
            };

            mcpProcess.stdin?.write(`${JSON.stringify(initRequest)}\n`);
          });
        },
      );

      it(
        "installed kibi-mcp should list only the 4 public tools",
        { timeout: 30000 },
        async () => {
          const mcpProcess = spawn("node", [sandbox.kibiMcpBin], {
            cwd: sandbox.repoDir,
            env: sandbox.env,
            stdio: ["pipe", "pipe", "pipe"],
          });

          let stdout = "";
          let receivedToolsList = false;
          let toolsList: Array<{ name: string }> = [];

          const timeout = setTimeout(() => {
            mcpProcess.kill();
          }, 15000);

          return new Promise<void>((resolve, reject) => {
            mcpProcess.stdout?.on("data", (data: Buffer) => {
              stdout += data.toString();

              try {
                const lines = stdout.trim().split("\n");
                for (const line of lines) {
                  if (line.trim()) {
                    const msg = JSON.parse(line);
                    if (msg.id === 2 && msg.result?.tools) {
                      toolsList = msg.result.tools;
                      receivedToolsList = true;
                      clearTimeout(timeout);
                      void mcpProcess.kill();
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

              if (!receivedToolsList) {
                reject(new Error("Did not receive tools/list response"));
                return;
              }

              const toolNames = toolsList.map((t) => t.name).sort();
              const expectedTools = [
                "kb_check",
                "kb_delete",
                "kb_query",
                "kb_upsert",
              ];

              assert.deepStrictEqual(
                toolNames,
                expectedTools,
                `MCP should expose exactly the 4 public tools, got: ${toolNames.join(", ")}`,
              );

              resolve();
            });

            // Initialize first
            const initRequest = {
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                  name: "issue-53-regression-test",
                  version: "1.0.0",
                },
              },
            };

            const toolsRequest = {
              jsonrpc: "2.0",
              id: 2,
              method: "tools/list",
            };

            mcpProcess.stdin?.write(`${JSON.stringify(initRequest)}\n`);
            setTimeout(() => {
              mcpProcess.stdin?.write(`${JSON.stringify(toolsRequest)}\n`);
            }, 500);
          });
        },
      );

      it(
        "installed kibi-mcp should handle concurrent kb_query burst without timeout",
        { timeout: 45000 },
        async () => {
          const mcpProcess = spawn("node", [sandbox.kibiMcpBin], {
            cwd: sandbox.repoDir,
            env: sandbox.env,
            stdio: ["pipe", "pipe", "pipe"],
          });

          const burstCount = 20;
          const expectedIds = new Set<number>();
          const responses = new Map<number, { error?: { message?: string } }>();
          let buffer = "";
          let stderr = "";
          let initialized = false;

          const timeout = setTimeout(() => {
            mcpProcess.kill();
          }, 25000);

          return new Promise<void>((resolve, reject) => {
            mcpProcess.stdout?.on("data", (data: Buffer) => {
              buffer += data.toString();
              const lines = buffer.split("\n");
              buffer = lines.pop() ?? "";

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;

                try {
                  const message = JSON.parse(trimmed) as {
                    id?: number;
                    result?: unknown;
                    error?: { message?: string };
                  };

                  if (message.id === 1 && message.result && !initialized) {
                    initialized = true;
                    for (let i = 0; i < burstCount; i++) {
                      const id = 100 + i;
                      expectedIds.add(id);
                      const request = {
                        jsonrpc: "2.0",
                        id,
                        method: "tools/call",
                        params: {
                          name: "kb_query",
                          arguments: { type: "req" },
                        },
                      };
                      mcpProcess.stdin?.write(`${JSON.stringify(request)}\n`);
                    }
                    continue;
                  }

                  if (message.id && expectedIds.has(message.id)) {
                    responses.set(
                      message.id,
                      message.error ? { error: message.error } : {},
                    );
                    if (responses.size === burstCount) {
                      clearTimeout(timeout);
                      void mcpProcess.kill();
                    }
                  }
                } catch {
                  reject(new Error(`Invalid JSON-RPC line: ${trimmed}`));
                  return;
                }
              }
            });

            mcpProcess.stderr?.on("data", (data: Buffer) => {
              stderr += data.toString();
            });

            mcpProcess.on("error", (err: Error) => {
              clearTimeout(timeout);
              reject(err);
            });

            mcpProcess.on("close", () => {
              clearTimeout(timeout);

              assert.strictEqual(
                initialized,
                true,
                "Initialize should succeed",
              );
              assert.strictEqual(
                responses.size,
                burstCount,
                `Expected ${burstCount} responses, got ${responses.size}`,
              );

              for (const [id, response] of responses) {
                assert.strictEqual(
                  response.error,
                  undefined,
                  `Burst request ${id} should not fail`,
                );
              }

              assert(
                !stderr.includes("Query timeout after"),
                `MCP stderr should not contain query timeout errors: ${stderr}`,
              );

              resolve();
            });

            const initRequest = {
              jsonrpc: "2.0",
              id: 1,
              method: "initialize",
              params: {
                protocolVersion: "2024-11-05",
                capabilities: {},
                clientInfo: {
                  name: "issue-53-regression-test",
                  version: "1.0.0",
                },
              },
            };

            mcpProcess.stdin?.write(`${JSON.stringify(initRequest)}\n`);
          });
        },
      );
    },
  );
}
