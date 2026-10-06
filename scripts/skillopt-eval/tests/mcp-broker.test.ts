import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { once } from "node:events";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { PassThrough } from "node:stream";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { runIndependentFinalState } from "../runtime/final-state";
import { stopFixtureEngine } from "../runtime/fixture-kb-setup";
import { createIsolationWorkspace } from "../runtime/isolation-workspace";
import {
  appendTraceReceipt,
  redactJsonRpcValue,
  verifyTraceChain,
} from "../runtime/jsonrpc";
import {
  McpBrokerError,
  REQUIRED_KIBI_TOOLS,
  filterAdvertisedTools,
} from "../runtime/mcp-broker";
import { runMcpBroker } from "../runtime/mcp-broker-process";
import { stageKibiMcpBroker } from "../runtime/mcp-broker-stage";

const roots: string[] = [];
setDefaultTimeout(30_000);

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function temporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

describe("evaluator-owned Kibi MCP evidence", () => {
  test("staged MCP hosts the real engine without Node on PATH", async () => {
    const root = await temporaryRoot("skillopt-staged-node-");
    const workspace = await createIsolationWorkspace({
      artifactRoot: root,
      runId: "staged-node",
      role: "optimizer",
    });
    const client = new Client({ name: "staged-node-regression", version: "1" });
    try {
      const isolatedPath = join(root, "bin");
      await mkdir(isolatedPath);
      const gitPath = Bun.which("git");
      if (gitPath === null) throw new Error("The engine fixture requires Git.");
      await symlink(gitPath, join(isolatedPath, "git"));
      const staged = await stageKibiMcpBroker(workspace, process.cwd());
      const transport = new StdioClientTransport({
        command: staged.command,
        args: [...staged.args],
        cwd: staged.cwd,
        env: {
          HOME: workspace.sandboxHome,
          PATH: isolatedPath,
          KIBI_BRANCH: "skillopt-eval",
          KIBI_SWIPL: Bun.which("swipl") ?? "",
        },
        stderr: "pipe",
      });
      await client.connect(transport);
      const result = await client.callTool({
        name: "kb_model",
        arguments: {
          mode: "analyze",
          text: "A session timeout must be 30 minutes.",
          _diagnostic_telemetry: {
            is_autonomous: true,
            reasoning: "Verify the isolated engine runtime.",
            confidence_score: 1,
            attempt_number: 1,
            missing_context: "",
          },
        },
      });
      if (result.isError) throw new Error(JSON.stringify(result));
      expect(result.structuredContent).toMatchObject({ status: "success" });
    } finally {
      await client.close();
      await stopFixtureEngine(workspace.target);
      await workspace.cleanup();
    }
  });

  test("redacts nested secrets while preserving unknown JSON-RPC fields", () => {
    // Given
    const message = {
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      futureField: { opaque: true },
      params: {
        name: "kb_query",
        arguments: { token: "secret", nested: { apiKey: "also-secret" } },
      },
    };

    // When
    const redacted = redactJsonRpcValue(message);

    // Then
    expect(redacted).toEqual({
      jsonrpc: "2.0",
      id: 7,
      method: "tools/call",
      futureField: { opaque: true },
      params: {
        name: "kb_query",
        arguments: {
          token: "[REDACTED]",
          nested: { apiKey: "[REDACTED]" },
        },
      },
    });
  });

  test("detects append-only trace tampering", async () => {
    // Given
    const root = await temporaryRoot("skillopt-trace-");
    const tracePath = join(root, "broker.jsonl");
    await appendTraceReceipt(tracePath, {
      correlationId: "rpc-000001",
      direction: "target_to_server",
      kind: "request",
      payload: { id: 1, method: "tools/list" },
    });
    await appendTraceReceipt(tracePath, {
      correlationId: "rpc-000001",
      direction: "server_to_target",
      kind: "response",
      payload: { id: 1, result: { tools: [] } },
    });
    const valid = await readFile(tracePath, "utf8");

    // When
    const verified = verifyTraceChain(valid);
    const tampered = verifyTraceChain(
      valid.replace('"tools":[]', '"tools":[{}]'),
    );

    // Then
    expect(verified).toMatchObject({ valid: true, entries: 2 });
    expect(tampered).toMatchObject({ valid: false });
  });

  test("advertises only evaluator-required Kibi tools", () => {
    // Given
    const response = {
      jsonrpc: "2.0",
      id: 2,
      result: {
        tools: [
          ...REQUIRED_KIBI_TOOLS.map((name) => ({ name, inputSchema: {} })),
          { name: "kb_autopilot_generate", inputSchema: {} },
          { name: "unrelated_host_tool", inputSchema: {} },
        ],
      },
    };

    // When
    const filtered = filterAdvertisedTools(response);

    // Then
    expect(filtered.result.tools.map(({ name }) => name)).toEqual([
      ...REQUIRED_KIBI_TOOLS,
    ]);
  });

  test("rejects startup when a required evaluator tool is absent", () => {
    // Given
    const response = {
      jsonrpc: "2.0",
      id: 2,
      result: { tools: [{ name: "kb_query", inputSchema: {} }] },
    };

    // When
    const filter = () => filterAdvertisedTools(response);

    // Then
    expect(filter).toThrow("mcp_broker_startup");
  });

  test("stages the broker and downstream runtime outside the target mount", async () => {
    // Given
    const artifactRoot = await temporaryRoot("skillopt-broker-stage-");
    const workspace = await createIsolationWorkspace({
      artifactRoot,
      runId: "broker-stage",
      role: "target",
    });

    try {
      // When
      const staged = await stageKibiMcpBroker(workspace, process.cwd());

      // Then
      const runtimeRoot = resolve(workspace.target, ".runtime/mcp");
      expect(staged.command.startsWith(`${runtimeRoot}/broker/`)).toBe(true);
      expect(staged.downstream.command.startsWith(`${runtimeRoot}/kibi/`)).toBe(
        true,
      );
      expect(staged.tracePath.startsWith(`${workspace.privateEvidence}/`)).toBe(
        true,
      );
      expect(staged.command.startsWith(`${workspace.privateEvidence}/`)).toBe(
        false,
      );
      expect(staged.downstream.args).toContain("--diagnostic-mode");
      expect(
        (await readFile(staged.bundlePath, "utf8")).includes(
          resolve(process.cwd(), "packages"),
        ),
      ).toBe(false);
    } finally {
      await workspace.cleanup();
    }
  });

  test("bounds startup separately and reaps an unresponsive downstream group", async () => {
    // Given
    const root = await temporaryRoot("skillopt-broker-timeout-");
    const pidPath = join(root, "pid");
    const serverPath = join(root, "hung.ts");
    const tracePath = join(root, "trace.jsonl");
    await writeFile(
      serverPath,
      `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));
console.error("ready");
process.on("SIGTERM", () => {});
await new Promise(() => {});
`,
      { mode: 0o700 },
    );
    const input = new PassThrough();
    const output = new PassThrough();
    const stderr = new PassThrough();
    const ready = once(stderr, "data");

    // When
    const attempt = runMcpBroker(
      {
        downstream: {
          command: process.execPath,
          args: [serverPath],
          cwd: root,
        },
        tracePath,
        startupTimeoutMs: 500,
        toolTimeoutMs: 100,
        killGraceMs: 25,
      },
      { input, output, error: stderr },
    );
    const caughtPromise = attempt.catch((failure: unknown) => failure);
    await ready;
    const caught = await caughtPromise;

    // Then
    expect(caught).toBeInstanceOf(McpBrokerError);
    if (!(caught instanceof McpBrokerError)) throw caught;
    expect(caught.kind).toBe("startup");
    const childPid = Number.parseInt(await readFile(pidPath, "utf8"), 10);
    expect(() => process.kill(-childPid, 0)).toThrow();
    expect(await readFile(tracePath, "utf8")).toContain('"kind":"startup"');
  });

  test("relays a target response to a server request without arming a tool timeout", async () => {
    // Given a server that asks the client for roots before answering a call
    const root = await temporaryRoot("skillopt-broker-roots-");
    const serverPath = join(root, "roots.ts");
    const tracePath = join(root, "trace.jsonl");
    await writeFile(
      serverPath,
      `import { createInterface } from "node:readline";
const send = (m) => console.log(JSON.stringify(m));
for await (const line of createInterface({ input: process.stdin })) {
  const m = JSON.parse(line);
  if (m.method === "initialize") send({jsonrpc:"2.0",id:m.id,result:{protocolVersion:"2025-11-25",capabilities:{tools:{}},serverInfo:{name:"fake",version:"1"}}});
  else if (m.method === "ping") { send({jsonrpc:"2.0",id:0,method:"roots/list"}); }
  else if (m.id === 0 && m.method === undefined) send({jsonrpc:"2.0",id:7,result:{rootsSeen:true}});
}
`,
      { mode: 0o700 },
    );
    const input = new PassThrough();
    const output = new PassThrough();
    const lines = createInterface({ input: output });
    const received: Record<string, unknown>[] = [];
    lines.on("line", (line) => received.push(JSON.parse(line)));
    const attempt = runMcpBroker(
      {
        downstream: {
          command: process.execPath,
          args: [serverPath],
          cwd: root,
        },
        tracePath,
        startupTimeoutMs: 5_000,
        toolTimeoutMs: 150,
        killGraceMs: 25,
      },
      { input, output, error: new PassThrough() },
    );
    const until = async (predicate: () => boolean) => {
      for (let tries = 0; tries < 200 && !predicate(); tries += 1)
        await new Promise((resolveWait) => setTimeout(resolveWait, 10));
    };
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`,
    );
    await until(() => received.some((m) => m.id === 1));
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 7, method: "ping" })}\n`,
    );
    await until(() => received.some((m) => m.method === "roots/list"));

    // When the target answers the server request and stays idle past the timeout
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 0, result: { roots: [] } })}\n`,
    );
    await until(() => received.some((m) => m.id === 7));
    await new Promise((resolveWait) => setTimeout(resolveWait, 400));
    input.end();

    // Then the broker shut down normally instead of failing with a timeout
    await attempt;
    expect(received.find((m) => m.id === 7)).toMatchObject({
      result: { rootsSeen: true },
    });
    expect(await readFile(tracePath, "utf8")).not.toContain('"kind":"timeout"');
  });

  test("reaps an unresponsive downstream group when the target transport closes", async () => {
    // Given
    const root = await temporaryRoot("skillopt-broker-close-");
    const pidPath = join(root, "pid");
    const serverPath = join(root, "hung.ts");
    const tracePath = join(root, "trace.jsonl");
    await writeFile(
      serverPath,
      `import { writeFileSync } from "node:fs";
writeFileSync(${JSON.stringify(pidPath)}, String(process.pid));
console.error("ready");
process.on("SIGTERM", () => {});
await new Promise(() => {});
`,
      { mode: 0o700 },
    );
    const input = new PassThrough();
    const output = new PassThrough();
    const stderr = new PassThrough();
    const ready = once(stderr, "data");
    const attempt = runMcpBroker(
      {
        downstream: {
          command: process.execPath,
          args: [serverPath],
          cwd: root,
        },
        tracePath,
        startupTimeoutMs: 10_000,
        toolTimeoutMs: 100,
        killGraceMs: 25,
      },
      { input, output, error: stderr },
    );
    await ready;
    const childPid = Number.parseInt(await readFile(pidPath, "utf8"), 10);

    // When
    input.end();
    await attempt;

    // Then
    expect(() => process.kill(-childPid, 0)).toThrow();
  });
});

describe("independent final-state client", () => {
  test("queries the staged Kibi runtime on the fixed non-Git evaluation branch", async () => {
    const artifactRoot = await temporaryRoot("skillopt-final-state-branch-");
    const workspace = await createIsolationWorkspace({
      artifactRoot,
      runId: "final-state-branch",
      role: "target",
    });

    try {
      await mkdir(join(workspace.target, ".kb"), { mode: 0o700 });
      const staged = await stageKibiMcpBroker(workspace, process.cwd());
      const launchEnv: Record<string, string> = {};
      for (const [name, value] of Object.entries(process.env)) {
        if (typeof value === "string") launchEnv[name] = value;
      }
      launchEnv.KIBI_BRANCH = "skillopt-eval";
      const receipt = await runIndependentFinalState({
        launch: {
          ...staged.downstream,
          args: [...staged.downstream.args],
          env: launchEnv,
        },
        receiptPath: join(workspace.privateEvidence, "final-state.json"),
        requests: [
          { tool: "kb_status", args: {} },
          { tool: "kb_query", args: { type: "fact" } },
          { tool: "kb_check", args: {} },
        ],
        timeoutMs: 15_000,
      });

      expect(receipt.requests).toHaveLength(3);
      for (const request of receipt.requests) {
        expect(request.result).not.toMatchObject({ isError: true });
      }
      expect(receipt.requests[0]?.result).toMatchObject({
        structuredContent: {
          kibiProtocol: 1,
          operation: "kb_status",
          status: "success",
          data: { branch: "skillopt-eval" },
        },
      });
    } finally {
      await workspace.cleanup();
    }
  });

  test("queries evaluator-selected state and writes a durable receipt", async () => {
    // Given
    const root = await temporaryRoot("skillopt-final-state-");
    const serverPath = join(root, "fake-mcp.ts");
    const observedPath = join(root, "observed.json");
    const receiptPath = join(root, "final-state.json");
    await writeFile(
      serverPath,
      `import { appendFileSync } from "node:fs";
const decoder = new TextDecoder();
let buffer = "";
for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk);
  let newline;
  while ((newline = buffer.indexOf("\\n")) >= 0) {
    const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const request = JSON.parse(line);
    appendFileSync(${JSON.stringify(observedPath)}, JSON.stringify(request) + "\\n");
    if (request.method === "initialize") console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{protocolVersion:"2024-11-05",capabilities:{tools:{}},serverInfo:{name:"fake",version:"1"}}}));
    else if (request.method === "notifications/initialized") continue;
    else if (request.method === "tools/list") console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{tools:[{name:"kb_query",description:"query",inputSchema:{type:"object"}}]}}));
    else if (request.method === "tools/call") console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{content:[{type:"text",text:"evaluator-state"}],structuredContent:{count:1,ids:["REQ-EVALUATOR"]}}}));
  }
}
`,
      { mode: 0o700 },
    );
    await chmod(serverPath, 0o700);

    // When
    const receipt = await runIndependentFinalState({
      launch: { command: process.execPath, args: [serverPath], cwd: root },
      receiptPath,
      requests: [
        { tool: "kb_query", args: { type: "req", id: "REQ-EVALUATOR" } },
      ],
      timeoutMs: 2_000,
    });

    // Then
    expect(receipt.requests).toHaveLength(1);
    expect(receipt.requests[0]?.tool).toBe("kb_query");
    expect(receipt.requests[0]?.result).toMatchObject({
      structuredContent: { count: 1, ids: ["REQ-EVALUATOR"] },
    });
    expect(JSON.parse(await readFile(receiptPath, "utf8"))).toEqual(receipt);
    const observed = await readFile(observedPath, "utf8");
    expect(observed).toContain("REQ-EVALUATOR");
    expect(observed).not.toContain("target-generated");
    expect(resolve(receipt.workspaceRoot)).toBe(root);
  });
});
