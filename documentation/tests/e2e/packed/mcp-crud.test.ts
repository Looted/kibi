import assert from "node:assert";
import type { ChildProcess } from "node:child_process";
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
        "requirements/req1.md",
        {
          id: "req1",
          title: "Initial Requirement",
          type: "req",
          status: "draft",
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

  it("should filter queries by ID", { timeout: TEST_TIMEOUT_MS }, async () => {
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
  });

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
                status: "draft",
                source: "test://integration",
                tags: ["new"],
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
                status: "approved",
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
      assert.ok(queryResult.content?.[0]?.text.includes("approved"));
    },
  );

  it(
    "should remove entity via kb_delete",
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
      };
      assert.ok(
        deleteResult.content && deleteResult.content.length > 0,
        "Should have at least one content item",
      );
      assert.ok(
        deleteResult.content && deleteResult.content.length > 0,
        "Should have at least one content item",
      );
      assert.ok(deleteResult.content?.[0]?.text.includes("Deleted"));

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
      assert.ok(
        queryText &&
          (queryText.includes("No entities") || queryText.includes("[]")),
      );
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
