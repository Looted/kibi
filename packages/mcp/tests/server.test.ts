import { describe, expect, test } from "bun:test";
import { type ChildProcess, execSync, spawn } from "node:child_process";
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

    // Timeout after 15s
    setTimeout(() => {
      proc.stdout?.off("data", onData);
      reject(new Error("Request timeout"));
    }, 15000);
    setTimeout(() => {
      proc.stdout?.off("data", onData);
      reject(new Error("Request timeout"));
    }, 5000);
  });
}

function startServer(options?: {
  cwd?: string;
  env?: Record<string, string>;
  args?: string[];
}): ChildProcess {
  const serverPath = path.resolve(import.meta.dir, "../bin/kibi-mcp");
  const proc = spawn("bun", ["run", serverPath, ...(options?.args ?? [])], {
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
      "0.2.1",
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
    expect(tools.length).toBe(4);
    expect(tools.map((tool) => tool.name)).toEqual([
      "kb_query",
      "kb_upsert",
      "kb_delete",
      "kb_check",
    ]);
    proc.kill();
  });

  test("should include diagnostic telemetry schema in diagnostic mode", async () => {
    const proc = startServer({ args: ["--diagnostic-mode"] });

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
      method: "tools/list",
    });

    const result = response.result as Record<string, unknown>;
    const tools = result.tools as Array<Record<string, unknown>>;

    for (const tool of tools) {
      const inputSchema = tool.inputSchema as Record<string, unknown>;
      const properties = inputSchema.properties as Record<string, unknown>;
      expect(properties._diagnostic_telemetry).toBeDefined();
    }

    proc.kill();
  });

  test("should reject removed MCP tools", async () => {
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
      method: "tools/call",
      params: {
        name: "kb_branch_gc",
        arguments: { dry_run: true },
      },
    });

    // MCP SDK returns tool errors in result with isError flag, not as top-level error
    const result = response.result as Record<string, unknown> | undefined;
    expect(result?.isError).toBe(true);
    const content = result?.content as
      | Array<{ type: string; text: string }>
      | undefined;
    expect(content?.[0]?.text).toMatch(/not found/i);

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

  test("should auto-create branch KB for active branch before first tool call", async () => {
    const tempRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-mcp-branch-init-"),
    );

    execSync("git init", { cwd: tempRoot, stdio: "ignore" });
    execSync('git config user.email "test@example.com"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    execSync('git config user.name "Kibi Test"', {
      cwd: tempRoot,
      stdio: "ignore",
    });
    fs.writeFileSync(path.join(tempRoot, "README.md"), "test\n");
    execSync("git add README.md", { cwd: tempRoot, stdio: "ignore" });
    execSync('git commit -m "init"', { cwd: tempRoot, stdio: "ignore" });
    execSync("git checkout -b develop", { cwd: tempRoot, stdio: "ignore" });
    execSync("git checkout -b feature-auto-ensure", {
      cwd: tempRoot,
      stdio: "ignore",
    });

    const developKb = path.join(tempRoot, ".kb/branches/develop");
    fs.mkdirSync(path.join(developKb, "journal"), { recursive: true });
    fs.writeFileSync(path.join(developKb, "kb.rdf"), "");
    fs.writeFileSync(path.join(developKb, "kb.rdf.lock"), "");

    const proc = startServer({ cwd: tempRoot });

    try {
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
        method: "tools/call",
        params: {
          name: "kb_query",
          arguments: { type: "req" },
        },
      });

      expect(response.error).toBeUndefined();
      expect(
        fs.existsSync(path.join(tempRoot, ".kb/branches/feature-auto-ensure")),
      ).toBe(true);
    } finally {
      proc.kill();
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
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
