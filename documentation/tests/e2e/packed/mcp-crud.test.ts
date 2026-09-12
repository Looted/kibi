import assert from "node:assert";
import { spawn } from "node:child_process";
import { after, before, describe, it } from "node:test";
import {
  type Tarballs,
  type TestSandbox,
  checkPrologAvailable,
  createMarkdownFile,
  createSandbox,
  kibi,
  packAll,
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
    content?: Array<{ type: string; text: string }>;
    structuredContent?: Record<string, unknown>;
  };
  error?: {
    code: number;
    message: string;
  };
}

/** Send a JSON-RPC request to the MCP server */
async function sendJsonRpc(
  mcpBin: string,
  tmpDir: string,
  env: NodeJS.ProcessEnv,
  request: JsonRpcRequest,
): Promise<JsonRpcResponse> {
  return new Promise((resolve, reject) => {
    const mcpProcess = spawn("node", [mcpBin], {
      cwd: tmpDir,
      env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let responseBuffer = "";
    const stop = () =>
      new Promise<void>((resolveStop) => {
        if (mcpProcess.exitCode !== null || mcpProcess.killed) {
          resolveStop();
          return;
        }
        mcpProcess.once("close", () => resolveStop());
        mcpProcess.kill();
        setTimeout(() => resolveStop(), 2000);
      });
    const timeout = setTimeout(() => {
      void stop().finally(() => {
        reject(new Error("Timed out waiting for MCP JSON-RPC response"));
      });
    }, 120000);

    mcpProcess.stdout?.on("data", (data: Buffer) => {
      responseBuffer += data.toString();
      const lines = responseBuffer.split("\n");
      responseBuffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const response = JSON.parse(trimmed) as JsonRpcResponse;
          if (response.id === request.id) {
            clearTimeout(timeout);
            void stop().finally(() => {
              resolve(response);
            });
            return;
          }
        } catch {}
      }
    });

    mcpProcess.stderr?.on("data", (data: Buffer) => {
      console.error("MCP stderr:", data.toString());
    });

    mcpProcess.on("error", (err: Error) => {
      clearTimeout(timeout);
      reject(err);
    });

    mcpProcess.on("exit", (code: number | null) => {
      if (code !== 0 && code !== null && !mcpProcess.killed) {
        clearTimeout(timeout);
        reject(new Error(`MCP process exited with code ${code}`));
      }
    });

    if (mcpProcess.stdin) {
      mcpProcess.stdin.write(`${JSON.stringify(request)}\n`);
    }
  });
}

if (RUN_NODE_TEST_SUITE) {
  describe("E2E: MCP Server CRUD Operations", () => {
    const TEST_TIMEOUT_MS = 120000;
    let tarballs: Tarballs;
    let sandbox: TestSandbox;
    let hasProlog = false;

    before(
      async () => {
        hasProlog = checkPrologAvailable();
        if (!hasProlog) {
          console.warn("⚠️  SWI-Prolog not available, skipping MCP CRUD tests");
          return;
        }

        tarballs = await packAll();
        sandbox = createSandbox();
        await sandbox.install(tarballs);
        await sandbox.initGitRepo();
        await kibi(sandbox, ["init"]);

        createMarkdownFile(
          sandbox,
          ".kb/requirements/req1.md",
          {
            id: "req1",
            title: "Initial Requirement",
            type: "req",
            status: "open",
            tags: ["test"],
          },
          "Test requirement for MCP operations.",
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
      "should query existing entities",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: {
                type: "req",
              },
            },
          },
        );

        assert.strictEqual(response.jsonrpc, "2.0");
        assert.strictEqual(response.id, 1);
        assert.ok(response.result, "Should have result");

        const result = response.result as {
          content: Array<{ type: string; text: string }>;
        };
        assert.ok(result.content, "Should have content");
        assert.ok(
          result.content.length > 0,
          "Should have at least one content item",
        );
        assert.ok(
          result.content[0]?.text.includes("req1"),
          "Should contain req1",
        );
        assert.ok(
          result.content.length > 0,
          "Should have at least one content item",
        );
        assert.ok(
          result.content[0]?.text.includes("req1"),
          "Should contain req1",
        );
      },
    );

    it(
      "should filter queries by type",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 2,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: {
                type: "scenario",
              },
            },
          },
        );

        assert.ok(response.result);
        const result = response.result as {
          content: Array<{ type: string; text: string }>;
        };
        assert.ok(
          result.content && result.content.length > 0,
          "Should have at least one content item",
        );
        const contentText = result.content?.[0]?.text;
        assert.ok(
          contentText?.includes("No entities") || contentText?.includes("[]"),
          "Should return empty for scenario type",
        );
      },
    );

    it(
      "should filter queries by ID",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 3,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: {
                id: "req1",
              },
            },
          },
        );

        assert.ok(response.result);
        const result = response.result as {
          content: Array<{ type: string; text: string }>;
        };
        const contentText = result.content?.[0]?.text;
        assert.ok(contentText?.includes("req1"));
        assert.ok(contentText?.includes("Initial Requirement"));
      },
    );

    it(
      "should filter queries by tags",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 4,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: {
                tags: ["test"],
              },
            },
          },
        );

        assert.ok(response.result);
        const result = response.result as {
          content: Array<{ type: string; text: string }>;
        };
        assert.ok(
          result.content && result.content.length > 0,
          "Should have at least one content item",
        );
        assert.ok(result.content?.[0]?.text.includes("req1"));
      },
    );

    it(
      "should create new entity via kb_upsert",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 5,
            method: "tools/call",
            params: {
              name: "kb_upsert",
              arguments: {
                type: "req",
                id: "req-new",
                properties: {
                  title: "New Requirement",
                  status: "open",
                  source: "test://integration",
                  tags: ["new"],
                },
                document: {
                  path: ".kb/requirements/req-new.md",
                },
              },
            },
          },
        );

        assert.ok(response.result);
        const result = response.result as {
          content: Array<{ type: string; text: string }>;
        };
        assert.ok(
          result.content && result.content.length > 0,
          "Should have at least one content item",
        );
        assert.ok(result.content?.[0]?.text.includes("req-new"));

        // Verify it was created
        const queryResponse = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 6,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: {
                id: "req-new",
              },
            },
          },
        );

        const queryResult = queryResponse.result as {
          content: Array<{ type: string; text: string }>;
        };
        assert.ok(
          queryResult.content && queryResult.content.length > 0,
          "Should have at least one content item",
        );
        assert.ok(
          queryResult.content && queryResult.content.length > 0,
          "Should have at least one content item",
        );
        assert.ok(queryResult.content?.[0]?.text.includes("req-new"));
        assert.ok(queryResult.content?.[0]?.text.includes("New Requirement"));
        assert.ok(queryResult.content?.[0]?.text.includes("New Requirement"));
      },
    );

    it(
      "should update existing entity via kb_upsert",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 7,
            method: "tools/call",
            params: {
              name: "kb_upsert",
              arguments: {
                type: "req",
                id: "req1",
                properties: {
                  title: "Updated Title",
                  status: "open",
                  source: "test://integration",
                  tags: ["updated"],
                },
              },
            },
          },
        );

        assert.ok(response.result);

        const queryResponse = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 8,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: {
                id: "req1",
              },
            },
          },
        );

        const queryResult = queryResponse.result as {
          content: Array<{ type: string; text: string }>;
        };
        assert.ok(
          queryResult.content && queryResult.content.length > 0,
          "Should have at least one content item",
        );
        assert.ok(
          queryResult.content && queryResult.content.length > 0,
          "Should have at least one content item",
        );
        assert.ok(queryResult.content?.[0]?.text.includes("Updated Title"));
        assert.ok(queryResult.content?.[0]?.text.includes("status=open"));
      },
    );

    it(
      "should require an explicit supersession plan for authored requirements",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const deleteResponse = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 9,
            method: "tools/call",
            params: {
              name: "kb_delete",
              arguments: {
                ids: ["req1"],
              },
            },
          },
        );

        assert.ok(deleteResponse.result);
        const deleteResult = deleteResponse.result as {
          content: Array<{ type: string; text: string }>;
          structuredContent?: Record<string, unknown>;
        };
        assert.ok(
          deleteResult.content && deleteResult.content.length > 0,
          "Should have at least one content item",
        );
        assert.ok(
          deleteResult.content && deleteResult.content.length > 0,
          "Should have at least one content item",
        );
        assert.match(
          deleteResult.content?.[0]?.text ?? "",
          /Deletion plan .*kb_apply_plan/,
        );
        const envelope = deleteResult.structuredContent as
          | { data?: { deletionPlan?: { supersessionRequired?: boolean } } }
          | undefined;
        assert.strictEqual(
          envelope?.data?.deletionPlan?.supersessionRequired,
          true,
        );

        const queryResponse = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 10,
            method: "tools/call",
            params: {
              name: "kb_query",
              arguments: {
                id: "req1",
              },
            },
          },
        );

        const queryResult = queryResponse.result as {
          content: Array<{ type: string; text: string }>;
        };
        assert.ok(
          queryResult.content && queryResult.content.length > 0,
          "Should have at least one content item",
        );
        const queryText = queryResult.content?.[0]?.text;
        assert.ok(queryText?.includes("req1"));
      },
    );

    it(
      "should reject a contradicting requirement with the actionable structured error",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        // Strict-lane fixtures: one subject fact, two incompatible
        // property-value facts on the same subject/property.
        const upsert = async (
          id: number,
          name: string,
          args: Record<string, unknown>,
        ) =>
          sendJsonRpc(sandbox.kibiMcpBin, sandbox.repoDir, sandbox.env, {
            jsonrpc: "2.0",
            id,
            method: "tools/call",
            params: { name, arguments: args },
          });

        await upsert(20, "kb_upsert", {
          type: "fact",
          id: "FACT-E2E-SUBJ",
          properties: {
            title: "E2E session subject",
            status: "active",
            source: "test://e2e-contradiction",
            fact_kind: "subject",
            subject_key: "e2e.session",
          },
          document: { path: ".kb/facts/FACT-E2E-SUBJ.md" },
        });
        await upsert(21, "kb_upsert", {
          type: "fact",
          id: "FACT-E2E-PROP-A",
          properties: {
            title: "E2E timeout 30 minutes",
            status: "active",
            source: "test://e2e-contradiction",
            fact_kind: "property_value",
            subject_key: "e2e.session",
            property_key: "timeout_minutes",
            operator: "eq",
            value_type: "int",
            value_int: 30,
          },
          document: { path: ".kb/facts/FACT-E2E-PROP-A.md" },
        });
        await upsert(22, "kb_upsert", {
          type: "req",
          id: "REQ-E2E-A",
          properties: {
            title: "Requirement A: 30 min timeout",
            status: "open",
            source: "test://e2e-contradiction",
          },
          relationships: [
            { type: "constrains", from: "REQ-E2E-A", to: "FACT-E2E-SUBJ" },
            {
              type: "requires_property",
              from: "REQ-E2E-A",
              to: "FACT-E2E-PROP-A",
            },
          ],
          document: { path: ".kb/requirements/REQ-E2E-A.md" },
        });
        await upsert(23, "kb_upsert", {
          type: "fact",
          id: "FACT-E2E-PROP-B",
          properties: {
            title: "E2E timeout 60 minutes",
            status: "active",
            source: "test://e2e-contradiction",
            fact_kind: "property_value",
            subject_key: "e2e.session",
            property_key: "timeout_minutes",
            operator: "eq",
            value_type: "int",
            value_int: 60,
          },
          document: { path: ".kb/facts/FACT-E2E-PROP-B.md" },
        });

        const conflicting = await upsert(24, "kb_upsert", {
          type: "req",
          id: "REQ-E2E-B",
          properties: {
            title: "Requirement B: 60 min timeout",
            status: "open",
            source: "test://e2e-contradiction",
          },
          relationships: [
            { type: "constrains", from: "REQ-E2E-B", to: "FACT-E2E-SUBJ" },
            {
              type: "requires_property",
              from: "REQ-E2E-B",
              to: "FACT-E2E-PROP-B",
            },
          ],
          document: { path: ".kb/requirements/REQ-E2E-B.md" },
        });

        // The rejection must carry the actionable contradiction text, parsed
        // from the structured Prolog error term end to end.
        const responseText = JSON.stringify(conflicting);
        assert.ok(
          /Contradiction detected for requirement REQ-E2E-B/i.test(
            responseText,
          ),
          "Expected the contradiction rejection message",
        );
        assert.ok(
          responseText.includes("Conflicts with REQ-E2E-A"),
          "Expected the conflicting requirement id in the message",
        );
        assert.ok(
          responseText.includes("To resolve:"),
          "Expected remediation guidance in the message",
        );

        // The failed write must not persist the conflicting requirement.
        const queryResponse = await upsert(25, "kb_query", {
          id: "REQ-E2E-B",
        });
        const queryText = JSON.stringify(queryResponse.result ?? {});
        assert.ok(
          !queryText.includes("Requirement B: 60 min timeout"),
          "The rejected requirement must not be queryable",
        );
      },
    );

    it(
      "should run kb_check with a migration rule selected through the generated registry",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 26,
            method: "tools/call",
            params: {
              name: "kb_check",
              arguments: { rules: ["strict-readiness"] },
            },
          },
        );

        assert.ok(response.result, "strict-readiness must be selectable");
        const result = response.result as {
          content: Array<{ type: string; text: string }>;
        };
        assert.ok(result.content && result.content.length > 0);
      },
    );

    it(
      "should handle deleting non-existent entity",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 11,
            method: "tools/call",
            params: {
              name: "kb_delete",
              arguments: {
                ids: ["non-existent"],
              },
            },
          },
        );

        assert.ok(response.result);
      },
    );

    it(
      "should validate KB via kb_check",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 12,
            method: "tools/call",
            params: {
              name: "kb_check",
              arguments: {},
            },
          },
        );

        assert.ok(response.result);
        const result = response.result as {
          content: Array<{ type: string; text: string }>;
        };
        assert.ok(result.content);
        assert.ok(result.content.length > 0);
        const violationsText = result.content?.[0]?.text ?? "";
        assert.ok(/(\d+ violations|No violations found)/.test(violationsText));
      },
    );

    it(
      "should return error for invalid method",
      { timeout: TEST_TIMEOUT_MS },
      async () => {
        if (!hasProlog) return;

        const response = await sendJsonRpc(
          sandbox.kibiMcpBin,
          sandbox.repoDir,
          sandbox.env,
          {
            jsonrpc: "2.0",
            id: 13,
            method: "invalid_method",
            params: {},
          },
        );

        assert.ok(response.error);
        assert.strictEqual(response.error?.code, -32601);
      },
    );
  });
}
