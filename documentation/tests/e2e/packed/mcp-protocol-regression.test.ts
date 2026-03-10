import assert from "node:assert";
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import { after, before, describe, it } from "node:test";
import { type TestSandbox, createSandbox, packAll } from "./helpers.js";

interface JsonRpcRes {
  id?: number;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
}

function sendRaw(
  proc: ChildProcessWithoutNullStreams,
  payload: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let buf = "";
    const onData = (d: Buffer) => {
      buf += d.toString();
      const idx = buf.indexOf("\n");
      if (idx !== -1) {
        const line = buf.slice(0, idx).trim();
        proc.stdout.off("data", onData);
        clearTimeout(timer);
        resolve(line);
      }
    };

    proc.stdout.on("data", onData);
    proc.stdin.write(`${payload}\n`, (err) => {
      if (err) {
        clearTimeout(timer);
        reject(err);
      }
    });

    const timer = setTimeout(() => {
      proc.stdout.off("data", onData);
      reject(new Error("timeout waiting for response"));
    }, 10000);
  });
}

function stopProcess(proc: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve) => {
    if (proc.exitCode !== null || proc.killed) {
      resolve();
      return;
    }
    proc.once("close", () => resolve());
    proc.kill();
    setTimeout(resolve, 2000);
  });
}

describe("MCP protocol regression (packed)", { timeout: 120000 }, () => {
  let sandbox: TestSandbox;

  before(
    async () => {
      const tarballs = await packAll();
      sandbox = createSandbox();
      await sandbox.install(tarballs);
      await sandbox.initGitRepo();
    },
    { timeout: 120000 },
  );

  after(
    async () => {
      if (sandbox) await sandbox.cleanup();
    },
    { timeout: 120000 },
  );

  it("should return -32700 for malformed JSON and stay alive", async () => {
    const proc = spawn("node", [sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    await new Promise((r) => setTimeout(r, 500));

    const respLine = await sendRaw(proc, "not json");
    const parsed = JSON.parse(respLine) as JsonRpcRes;
    assert.strictEqual(parsed.error?.code, -32700, "expected parse error code");

    const init = {
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", clientInfo: { name: "e2e" } },
    };
    const initLine = await sendRaw(proc, JSON.stringify(init));
    const initMsg = JSON.parse(initLine) as JsonRpcRes;
    assert.strictEqual(initMsg.id, 1);
    await stopProcess(proc);
  });

  it("should return -32600 for invalid JSON-RPC shape and stay alive", async () => {
    const proc = spawn("node", [sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    await new Promise((r) => setTimeout(r, 500));

    const respLine = await sendRaw(proc, JSON.stringify({ foo: "bar" }));
    const parsed = JSON.parse(respLine) as JsonRpcRes;
    assert.strictEqual(parsed.error?.code, -32600, "expected invalid request");

    const init = {
      jsonrpc: "2.0",
      id: 2,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", clientInfo: { name: "e2e" } },
    };
    const initLine = JSON.parse(
      await sendRaw(proc, JSON.stringify(init)),
    ) as JsonRpcRes;
    assert.strictEqual(initLine.id, 2);
    await stopProcess(proc);
  });

  it("should return -32601 for direct legacy method call kb_query", async () => {
    const proc = spawn("node", [sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    await new Promise((r) => setTimeout(r, 500));

    const direct = {
      jsonrpc: "2.0",
      id: 10,
      method: "kb_query",
      params: { type: "req" },
    };
    const respLine = await sendRaw(proc, JSON.stringify(direct));
    const parsed = JSON.parse(respLine) as JsonRpcRes;
    assert.strictEqual(parsed.error?.code, -32601);
    await stopProcess(proc);
  });

  it("should support initialize -> tools/list -> tools/call kb_query flow", async () => {
    const proc = spawn("node", [sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    await new Promise((r) => setTimeout(r, 500));

    const init = {
      jsonrpc: "2.0",
      id: 100,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", clientInfo: { name: "e2e" } },
    };
    const list = { jsonrpc: "2.0", id: 101, method: "tools/list" };
    const call = {
      jsonrpc: "2.0",
      id: 102,
      method: "tools/call",
      params: { name: "kb_query", arguments: { type: "req" } },
    };

    const initLine = JSON.parse(
      await sendRaw(proc, JSON.stringify(init)),
    ) as JsonRpcRes;
    assert.strictEqual(initLine.id, 100);

    const listLine = JSON.parse(
      await sendRaw(proc, JSON.stringify(list)),
    ) as JsonRpcRes;
    assert.strictEqual(listLine.id, 101);
    const tools = (listLine.result as { tools?: unknown[] } | undefined)?.tools;
    assert.ok(Array.isArray(tools));
    assert.deepStrictEqual(
      (tools as Array<{ name: string }>).map((tool) => tool.name),
      ["kb_query", "kb_upsert", "kb_delete", "kb_check"],
    );

    const callLine = JSON.parse(
      await sendRaw(proc, JSON.stringify(call)),
    ) as JsonRpcRes;
    assert.strictEqual(callLine.id, 102);
    assert.ok(
      !callLine.error,
      "tools/call should succeed or return structured result",
    );

    await stopProcess(proc);
  });

  it("should reject removed tools after initialization", async () => {
    const proc = spawn("node", [sandbox.kibiMcpBin], {
      cwd: sandbox.repoDir,
      env: sandbox.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    await new Promise((r) => setTimeout(r, 500));

    const init = {
      jsonrpc: "2.0",
      id: 200,
      method: "initialize",
      params: { protocolVersion: "2024-11-05", clientInfo: { name: "e2e" } },
    };
    const removedCall = {
      jsonrpc: "2.0",
      id: 201,
      method: "tools/call",
      params: { name: "kb_branch_gc", arguments: { dry_run: true } },
    };

    const initLine = JSON.parse(
      await sendRaw(proc, JSON.stringify(init)),
    ) as JsonRpcRes;
    assert.strictEqual(initLine.id, 200);

    const removedLine = JSON.parse(
      await sendRaw(proc, JSON.stringify(removedCall)),
    ) as JsonRpcRes;
    assert.strictEqual(removedLine.id, 201);
    // MCP SDK returns tool errors in result with isError flag, not as top-level error
    assert.ok(removedLine.result?.isError, "Expected isError flag in result");
    const content = removedLine.result?.content as
      | Array<{ text: string }>
      | undefined;
    assert.match(content?.[0]?.text ?? "", /not found/i);

    await stopProcess(proc);
  });
});
