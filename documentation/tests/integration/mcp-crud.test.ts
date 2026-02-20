import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { type ChildProcess, spawn } from "node:child_process";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

describe("MCP server CRUD operations", () => {
  let tmpDir: string;
  let mcpProcess: ChildProcess;
  const kibiBin = path.resolve(__dirname, "../../../packages/cli/bin/kibi");
  const mcpBin = path.resolve(__dirname, "../../../packages/mcp/bin/kibi-mcp");

  beforeEach(async () => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-integration-mcp-"));

    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@example.com'", {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync("git config user.name 'Test User'", {
      cwd: tmpDir,
      stdio: "pipe",
    });

    execSync(`bun ${kibiBin} init`, {
      cwd: tmpDir,
      stdio: "pipe",
    });

    // After init we need to ensure branch is named 'main' once a commit exists.
    // The init command may have created the first commit; normalize branch name.
    const branchCheck = execSync("git branch --show-current", {
      cwd: tmpDir,
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    if (branchCheck === "master") {
      execSync("git branch -m master main", { cwd: tmpDir, stdio: "pipe" });
    }

    // Ensure default branch is 'main' after the initial commit performed by init
    try {
      const branch = execSync("git branch --show-current", {
        cwd: tmpDir,
        encoding: "utf8",
        stdio: "pipe",
      }).trim();
      if (branch === "master") {
        execSync("git branch -m master main", { cwd: tmpDir, stdio: "pipe" });
      }
    } catch {}

    const reqDir = path.join(tmpDir, "requirements");
    mkdirSync(reqDir, { recursive: true });

    writeFileSync(
      path.join(reqDir, "req1.md"),
      `---
id: req1
title: Initial Requirement
type: req
status: draft
tags: [test]
---

# Initial

Test requirement for MCP operations.
`,
    );

    execSync(`bun ${kibiBin} sync`, {
      cwd: tmpDir,
      stdio: "pipe",
    });
  });

  afterEach(() => {
    if (mcpProcess && !mcpProcess.killed) {
      mcpProcess.kill();
    }
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  async function sendJsonRpc(
    request: JsonRpcRequest,
  ): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      mcpProcess = spawn("bun", [mcpBin], {
        cwd: tmpDir,
        stdio: ["pipe", "pipe", "pipe"],
      });

      let responseData = "";

      mcpProcess.stdout?.on("data", (data) => {
        responseData += data.toString();
        try {
          const response = JSON.parse(responseData);
          mcpProcess.kill();
          resolve(response);
        } catch {
          // Continue accumulating data
        }
      });

      mcpProcess.stderr?.on("data", (data) => {
        console.error("MCP stderr:", data.toString());
      });

      mcpProcess.on("error", (err) => {
        reject(err);
      });

      mcpProcess.on("exit", (code) => {
        if (code !== 0 && code !== null && !responseData) {
          reject(new Error(`MCP process exited with code ${code}`));
        }
      });

      if (mcpProcess.stdin) {
        mcpProcess.stdin.write(`${JSON.stringify(request)}\n`);
        mcpProcess.stdin.end();
      }
    });
  }

  test("kb_query: returns existing entities", async () => {
    const response = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: {
        name: "kb_query",
        arguments: {
          type: "req",
        },
      },
    });

    expect(response.jsonrpc).toBe("2.0");
    expect(response.id).toBe(1);
    expect(response.result).toBeDefined();

    const result = response.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(result.content).toBeDefined();
    expect(result.content[0].text).toContain("req1");
  });

  test("kb_query: filters by type", async () => {
    const response = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "kb_query",
        arguments: {
          type: "scenario",
        },
      },
    });

    expect(response.result).toBeDefined();
    const result = response.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(result.content[0].text).toContain("No entities found");
  });

  test("kb_query: filters by ID", async () => {
    const response = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: {
        name: "kb_query",
        arguments: {
          id: "req1",
        },
      },
    });

    expect(response.result).toBeDefined();
    const result = response.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(result.content[0].text).toContain("req1");
    expect(result.content[0].text).toContain("Initial Requirement");
  });

  test("kb_query: filters by tags", async () => {
    const response = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: {
        name: "kb_query",
        arguments: {
          tags: ["test"],
        },
      },
    });

    expect(response.result).toBeDefined();
    const result = response.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(result.content[0].text).toContain("req1");
  });

  test("kb_upsert: creates new entity", async () => {
    const response = await sendJsonRpc({
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
    });

    expect(response.result).toBeDefined();
    const result = response.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(result.content[0].text).toContain("req-new");

    const queryResponse = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 6,
      method: "tools/call",
      params: {
        name: "kb_query",
        arguments: {
          id: "req-new",
        },
      },
    });

    const queryResult = queryResponse.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(queryResult.content[0].text).toContain("req-new");
    expect(queryResult.content[0].text).toContain("New Requirement");
  });

  test("kb_upsert: updates existing entity", async () => {
    const response = await sendJsonRpc({
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
    });

    expect(response.result).toBeDefined();

    const queryResponse = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 8,
      method: "tools/call",
      params: {
        name: "kb_query",
        arguments: {
          id: "req1",
        },
      },
    });

    const queryResult = queryResponse.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(queryResult.content[0].text).toContain("Updated Title");
    expect(queryResult.content[0].text).toContain("approved");
  });

  test("kb_delete: removes entity", async () => {
    const deleteResponse = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 9,
      method: "tools/call",
      params: {
        name: "kb_delete",
        arguments: {
          ids: ["req1"],
        },
      },
    });

    expect(deleteResponse.result).toBeDefined();
    const deleteResult = deleteResponse.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(deleteResult.content[0].text).toContain("Deleted 1 entities");

    const queryResponse = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 10,
      method: "tools/call",
      params: {
        name: "kb_query",
        arguments: {
          id: "req1",
        },
      },
    });

    const queryResult = queryResponse.result as {
      content: Array<{ type: string; text: string }>;
    };
    expect(queryResult.content[0].text).toContain("No entities found");
  });

  test("kb_delete: handles non-existent entity", async () => {
    const response = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 11,
      method: "tools/call",
      params: {
        name: "kb_delete",
        arguments: {
          ids: ["non-existent"],
        },
      },
    });

    expect(response.result).toBeDefined();
  });

  test("kb_check: validates KB", async () => {
    const response = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 12,
      method: "tools/call",
      params: {
        name: "kb_check",
        arguments: {},
      },
    });

    expect(response.result).toBeDefined();
    const result = response.result as {
      content: Array<{ type: string; text: string }>;
    };
    // defensive checks: ensure content exists and has at least one item
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(0);
    // Match either 'N violations' or 'No violations found'
    expect(result.content[0].text).toMatch(
      /(\d+ violations|No violations found)/,
    );
  });

  test("error: invalid JSON-RPC request returns error", async () => {
    const response = await sendJsonRpc({
      jsonrpc: "2.0",
      id: 13,
      method: "invalid_method",
      params: {},
    });

    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe(-32601);
  });
});
