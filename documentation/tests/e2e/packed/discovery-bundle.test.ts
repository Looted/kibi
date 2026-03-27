import assert from "node:assert";
import { type ChildProcess, spawn } from "node:child_process";
import fs from "node:fs";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createSandbox,
  kibi,
  packAll,
} from "./helpers.js";

const RUN_NODE_TEST_SUITE =
  typeof (globalThis as { Bun?: unknown }).Bun === "undefined";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

async function stopProcess(proc: ChildProcess): Promise<void> {
  await new Promise<void>((resolve) => {
    if (proc.exitCode !== null || proc.killed) {
      resolve();
      return;
    }
    proc.once("close", () => resolve());
    proc.kill();
    setTimeout(() => resolve(), 2000);
  });
}

async function startMcpServer(
  sandbox: TestSandbox,
  args: string[] = [],
): Promise<ChildProcess> {
  const proc = spawn("node", [sandbox.kibiMcpBin, ...args], {
    cwd: sandbox.repoDir,
    env: sandbox.env,
    stdio: ["pipe", "pipe", "pipe"],
  });

  await sendMcpRequest(proc, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "discovery-e2e", version: "1.0.0" },
    },
  });

  proc.stdin?.write(
    `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
  );

  return proc;
}

async function sendMcpRequest(
  proc: ChildProcess,
  request: JsonRpcRequest,
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    let responseData = "";
    const timeout = setTimeout(() => {
      proc.stdout?.off("data", onData);
      reject(new Error("Timed out waiting for MCP response"));
    }, 30000);

    const onData = (chunk: Buffer) => {
      responseData += chunk.toString();
      const lines = responseData.split("\n");
      responseData = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) {
          continue;
        }

        const parsed = JSON.parse(trimmed) as JsonRpcResponse;
        if (parsed.id === request.id) {
          clearTimeout(timeout);
          proc.stdout?.off("data", onData);
          resolve(parsed);
          return;
        }
      }
    };

    proc.stdout?.on("data", onData);
    proc.stdin?.write(`${JSON.stringify(request)}\n`);
  });
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: Discovery bundle parity", () => {
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) {
          console.warn(
            "⚠️  SWI-Prolog not available, skipping discovery bundle E2E",
          );
          return;
        }

        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init"]);

        fs.mkdirSync(join(sandbox.repoDir, "documentation", "requirements"), {
          recursive: true,
        });
        fs.mkdirSync(join(sandbox.repoDir, "documentation", "scenarios"), {
          recursive: true,
        });
        fs.mkdirSync(join(sandbox.repoDir, "documentation", "tests"), {
          recursive: true,
        });

        fs.writeFileSync(
          join(
            sandbox.repoDir,
            "documentation",
            "requirements",
            "REQ-DISC-001.md",
          ),
          `---
id: REQ-DISC-001
title: OAuth login flow
status: open
priority: must
tags: [auth, discovery]
links:
  - type: specified_by
    target: SCEN-DISC-001
  - type: verified_by
    target: TEST-DISC-001
---

The markdown body mentions latent discovery token.
`,
          "utf8",
        );

        fs.writeFileSync(
          join(
            sandbox.repoDir,
            "documentation",
            "scenarios",
            "SCEN-DISC-001.md",
          ),
          `---
id: SCEN-DISC-001
title: Login scenario
status: active
---

Given a valid account
When the user logs in
Then access is granted
`,
          "utf8",
        );

        fs.writeFileSync(
          join(sandbox.repoDir, "documentation", "tests", "TEST-DISC-001.md"),
          `---
id: TEST-DISC-001
title: Login test
status: passing
links:
  - type: validates
    target: REQ-DISC-001
---

Verifies login behavior.
`,
          "utf8",
        );

        fs.writeFileSync(
          join(
            sandbox.repoDir,
            "documentation",
            "requirements",
            "REQ-DISC-002.md",
          ),
          `---
id: REQ-DISC-002
title: Optional telemetry note
status: open
tags: [discovery]
---

This requirement is intentionally not must-priority.
`,
          "utf8",
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

    it(
      "keeps CLI and MCP aligned for search/status/gaps/coverage/graph",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;

        const searchCli = await kibi(sandbox, [
          "search",
          "latent discovery token",
          "--format",
          "json",
        ]);
        const searchCliJson = JSON.parse(searchCli.stdout) as {
          count: number;
          results: Array<{ entity: { id: string } }>;
        };
        assert.strictEqual(searchCliJson.count, 1);
        assert.strictEqual(searchCliJson.results[0]?.entity.id, "REQ-DISC-001");

        const statusCli = await kibi(sandbox, ["status", "--format", "json"]);
        const statusCliJson = JSON.parse(statusCli.stdout) as {
          branch: string;
          dirty: boolean;
        };
        assert.strictEqual(statusCliJson.branch, "develop");
        assert.strictEqual(statusCliJson.dirty, false);

        const gapsCli = await kibi(sandbox, [
          "gaps",
          "req",
          "--missing-rel",
          "specified_by",
          "--format",
          "json",
        ]);
        const gapsCliJson = JSON.parse(gapsCli.stdout) as {
          count: number;
          rows: Array<{ id: string }>;
        };
        assert.strictEqual(gapsCliJson.count, 1);
        assert.strictEqual(gapsCliJson.rows[0]?.id, "REQ-DISC-002");

        const coverageCli = await kibi(sandbox, [
          "coverage",
          "--by",
          "req",
          "--format",
          "json",
        ]);
        const coverageCliJson = JSON.parse(coverageCli.stdout) as {
          summary: {
            fullyCovered: number;
            notApplicable: number;
            total: number;
          };
          rows: Array<{
            id: string;
            coverageStatus: string;
            evaluated: boolean;
          }>;
        };
        assert.strictEqual(coverageCliJson.summary.fullyCovered, 1);
        assert.strictEqual(coverageCliJson.summary.notApplicable, 1);
        assert.strictEqual(coverageCliJson.summary.total, 2);
        assert.ok(
          coverageCliJson.rows.some(
            (row) =>
              row.id === "REQ-DISC-002" &&
              row.coverageStatus === "not_applicable" &&
              row.evaluated === false,
          ),
        );

        const graphCli = await kibi(sandbox, [
          "graph",
          "--from",
          "REQ-DISC-001",
          "--relationships",
          "specified_by",
          "--depth",
          "1",
          "--format",
          "json",
        ]);
        const graphCliJson = JSON.parse(graphCli.stdout) as {
          nodes: Array<{ id: string }>;
        };
        assert.ok(
          graphCliJson.nodes.some((node) => node.id === "REQ-DISC-001"),
        );
        assert.ok(
          graphCliJson.nodes.some((node) => node.id === "SCEN-DISC-001"),
        );

        const nestedCoreDir = join(
          sandbox.npmPrefix,
          "node_modules",
          "kibi-mcp",
          "node_modules",
          "kibi-core",
        );
        const topLevelCoreDir = join(
          sandbox.npmPrefix,
          "node_modules",
          "kibi-core",
        );
        fs.mkdirSync(
          join(sandbox.npmPrefix, "node_modules", "kibi-mcp", "node_modules"),
          {
            recursive: true,
          },
        );
        fs.cpSync(topLevelCoreDir, nestedCoreDir, { recursive: true });

        const mcp = await startMcpServer(sandbox);
        try {
          const searchMcp = await sendMcpRequest(mcp, {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
              name: "kb_search",
              arguments: { query: "latent discovery token" },
            },
          });
          const searchStructured = (searchMcp.result?.structuredContent ??
            {}) as {
            count?: number;
            results?: Array<{ entity: { id: string } }>;
          };
          assert.strictEqual(searchStructured.count, searchCliJson.count);
          assert.strictEqual(
            searchStructured.results?.[0]?.entity.id,
            searchCliJson.results[0]?.entity.id,
          );

          const statusMcp = await sendMcpRequest(mcp, {
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
              name: "kb_status",
              arguments: {},
            },
          });
          const statusStructured = (statusMcp.result?.structuredContent ??
            {}) as {
            branch?: string;
            dirty?: boolean;
          };
          assert.strictEqual(statusStructured.branch, statusCliJson.branch);
          assert.strictEqual(statusStructured.dirty, statusCliJson.dirty);

          const gapsMcp = await sendMcpRequest(mcp, {
            jsonrpc: "2.0",
            id: 4,
            method: "tools/call",
            params: {
              name: "kb_find_gaps",
              arguments: {
                type: "req",
                missingRelationships: ["specified_by"],
              },
            },
          });
          const gapsStructured = (gapsMcp.result?.structuredContent ?? {}) as {
            count?: number;
            rows?: Array<{ id: string }>;
          };
          assert.strictEqual(gapsStructured.count, gapsCliJson.count);
          assert.strictEqual(
            gapsStructured.rows?.[0]?.id,
            gapsCliJson.rows[0]?.id,
          );

          const coverageMcp = await sendMcpRequest(mcp, {
            jsonrpc: "2.0",
            id: 5,
            method: "tools/call",
            params: {
              name: "kb_coverage",
              arguments: { by: "req" },
            },
          });
          const coverageStructured = (coverageMcp.result?.structuredContent ??
            {}) as {
            summary?: {
              fullyCovered?: number;
              notApplicable?: number;
              total?: number;
            };
            rows?: Array<{
              id: string;
              coverageStatus: string;
              evaluated: boolean;
            }>;
          };
          assert.strictEqual(
            coverageStructured.summary?.fullyCovered,
            coverageCliJson.summary.fullyCovered,
          );
          assert.strictEqual(
            coverageStructured.summary?.notApplicable,
            coverageCliJson.summary.notApplicable,
          );
          assert.strictEqual(
            coverageStructured.summary?.total,
            coverageCliJson.summary.total,
          );
          assert.ok(
            coverageStructured.rows?.some(
              (row) =>
                row.id === "REQ-DISC-002" &&
                row.coverageStatus === "not_applicable" &&
                row.evaluated === false,
            ),
          );

          const graphMcp = await sendMcpRequest(mcp, {
            jsonrpc: "2.0",
            id: 6,
            method: "tools/call",
            params: {
              name: "kb_graph",
              arguments: {
                seedIds: ["REQ-DISC-001"],
                relationships: ["specified_by"],
                depth: 1,
              },
            },
          });
          const graphStructured = (graphMcp.result?.structuredContent ??
            {}) as {
            nodes?: Array<{ id: string }>;
          };
          assert.ok(
            graphStructured.nodes?.some((node) => node.id === "REQ-DISC-001"),
          );
          assert.ok(
            graphStructured.nodes?.some((node) => node.id === "SCEN-DISC-001"),
          );
        } finally {
          await stopProcess(mcp);
        }
      },
    );

    it(
      "writes derived diagnostic fields in MCP diagnostic mode",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;

        const proc = await startMcpServer(sandbox, ["--diagnostic-mode"]);
        try {
          await sendMcpRequest(proc, {
            jsonrpc: "2.0",
            id: 4,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: {
                type: "req",
                _diagnostic_telemetry: {
                  is_autonomous: true,
                  reasoning: "packed e2e diagnostic check",
                  confidence_score: 0.9,
                },
              },
            },
          });

          const usageLogPath = join(sandbox.repoDir, ".kb", "usage.log");
          const logLines = fs
            .readFileSync(usageLogPath, "utf8")
            .trim()
            .split("\n");
          const lastLine = JSON.parse(logLines[logLines.length - 1] ?? "{}");
          assert.strictEqual(lastLine.tool, "kb_query");
          assert.strictEqual(lastLine.telemetry_status, "provided");
          assert.ok(typeof lastLine.result_count === "number");
          assert.ok(typeof lastLine.result_summary === "string");
        } finally {
          await stopProcess(proc);
        }
      },
    );

    it(
      "fails closed when isolated core root is missing discovery.pl sibling",
      { timeout: 120000 },
      async () => {
        if (!hasProlog) return;

        const isolatedDir = join(sandbox.repoDir, "isolated-broken-core");
        const isolatedSrc = join(isolatedDir, "src");
        fs.mkdirSync(isolatedSrc, { recursive: true });
        const topCoreSrc = join(
          sandbox.npmPrefix,
          "node_modules",
          "kibi-core",
          "src",
        );
        fs.copyFileSync(join(topCoreSrc, "kb.pl"), join(isolatedSrc, "kb.pl"));
        const topCoreSchema = join(
          sandbox.npmPrefix,
          "node_modules",
          "kibi-core",
          "schema",
        );
        fs.cpSync(topCoreSchema, join(isolatedDir, "schema"), {
          recursive: true,
        });

        const brokenEnv = {
          ...sandbox.env,
          KIBI_KB_PL_PATH: join(isolatedSrc, "kb.pl"),
        };
        delete brokenEnv.KIBI_DISCOVERY_PL_PATH;
        delete brokenEnv.KIBI_CHECKS_PL_PATH;

        const proc = spawn("node", [sandbox.kibiMcpBin], {
          cwd: sandbox.repoDir,
          env: brokenEnv,
          stdio: ["pipe", "pipe", "pipe"],
        });

        await sendMcpRequest(proc, {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "broken-core-e2e", version: "1.0.0" },
          },
        });
        proc.stdin?.write(
          `${JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" })}\n`,
        );

        try {
          const graphResult = await sendMcpRequest(proc, {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
              name: "kb_graph",
              arguments: {
                seedIds: ["REQ-DISC-001"],
                relationships: ["specified_by"],
                depth: 1,
              },
            },
          });

          const hasError =
            graphResult.error !== undefined ||
            graphResult.result?.isError === true;
          const errorText = JSON.stringify(graphResult);
          assert.ok(
            hasError ||
              errorText.includes("root-consistency") ||
              errorText.includes("discovery.pl"),
            `Expected root-consistency or discovery.pl error, got: ${errorText.slice(0, 500)}`,
          );
        } finally {
          await stopProcess(proc);
        }
      },
    );
  });
}
