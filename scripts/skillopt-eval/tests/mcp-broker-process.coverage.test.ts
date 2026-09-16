import { afterEach, describe, expect, setDefaultTimeout, test } from "bun:test";
import { once } from "node:events";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";

import { McpBrokerError, REQUIRED_KIBI_TOOLS } from "../runtime/mcp-broker";
import { runMcpBroker } from "../runtime/mcp-broker-process";

const roots: string[] = [];
setDefaultTimeout(20_000);

afterEach(async () => {
  Reflect.deleteProperty(process.env, "KIBI_SKILLOPT_PROCESS_GROUP");
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function temporaryRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function advertisedTools() {
  return REQUIRED_KIBI_TOOLS.map((name) => ({
    name,
    description: name,
    inputSchema: { type: "object" },
  }));
}

describe("runMcpBroker JSON-RPC forwarding", () => {
  test("forwards initialize, tools/list, and known tools while rejecting unknown tools", async () => {
    const root = await temporaryRoot("skillopt-broker-rpc-");
    const serverPath = join(root, "echo-mcp.ts");
    const tracePath = join(root, "trace.jsonl");
    await writeFile(
      serverPath,
      `const decoder = new TextDecoder();
let buffer = "";
for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk);
  let newline;
  while ((newline = buffer.indexOf("\\n")) >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const request = JSON.parse(line);
    if (request.method === "initialize") {
      console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{protocolVersion:"2024-11-05",capabilities:{tools:{}},serverInfo:{name:"fake",version:"1"}}}));
    } else if (request.method === "tools/list") {
      console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{tools:${JSON.stringify(advertisedTools())}}}));
    } else if (request.method === "tools/call") {
      console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{content:[{type:"text",text:"ok"}]}}));
    } else {
      console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{}}));
    }
  }
}
`,
      { mode: 0o700 },
    );
    await chmod(serverPath, 0o700);
    const input = new PassThrough();
    const output = new PassThrough();
    const stderr = new PassThrough();
    const chunks: string[] = [];
    output.on("data", (chunk) => chunks.push(String(chunk)));
    const attempt = runMcpBroker(
      {
        downstream: {
          command: process.execPath,
          args: [serverPath],
          cwd: root,
        },
        tracePath,
        startupTimeoutMs: 5_000,
        toolTimeoutMs: 2_000,
        killGraceMs: 50,
      },
      { input, output, error: stderr },
    );
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`,
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" })}\n`,
    );
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "not-a-kibi-tool", arguments: {} } })}\n`,
    );
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "kb_status", arguments: {} } })}\n`,
    );
    await new Promise((resolve) => setTimeout(resolve, 120));
    input.end();
    await attempt;
    const joined = chunks.join("");
    const trace = await readFile(tracePath, "utf8");
    expect(trace.length).toBeGreaterThan(0);
    expect(joined).toContain("jsonrpc");
    expect(joined).toContain("Tool not exposed by evaluator broker");
  });

  test("records a protocol error for malformed JSON-RPC", async () => {
    const root = await temporaryRoot("skillopt-broker-protocol-");
    const serverPath = join(root, "echo-mcp.ts");
    const tracePath = join(root, "trace.jsonl");
    await writeFile(
      serverPath,
      `const decoder = new TextDecoder();
let buffer = "";
for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk);
  let newline;
  while ((newline = buffer.indexOf("\\n")) >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const request = JSON.parse(line);
    if (request.method === "initialize") {
      console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{protocolVersion:"2024-11-05",capabilities:{tools:{}},serverInfo:{name:"fake",version:"1"}}}));
    }
  }
}
`,
      { mode: 0o700 },
    );
    const input = new PassThrough();
    const output = new PassThrough();
    const stderr = new PassThrough();
    const attempt = runMcpBroker(
      {
        downstream: {
          command: process.execPath,
          args: [serverPath],
          cwd: root,
        },
        tracePath,
        startupTimeoutMs: 5_000,
        toolTimeoutMs: 2_000,
        killGraceMs: 50,
      },
      { input, output, error: stderr },
    );
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`,
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    input.write("not-json\n");
    await expect(attempt).rejects.toBeInstanceOf(McpBrokerError);
    const trace = await readFile(tracePath, "utf8");
    expect(trace).toContain("error");
  });

  test("times out a hung tools/call and uses inherited process-group termination", async () => {
    const root = await temporaryRoot("skillopt-broker-hung-call-");
    const serverPath = join(root, "hung-call.ts");
    const tracePath = join(root, "trace.jsonl");
    await writeFile(
      serverPath,
      `const decoder = new TextDecoder();
let buffer = "";
for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk);
  let newline;
  while ((newline = buffer.indexOf("\\n")) >= 0) {
    const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const request = JSON.parse(line);
    if (request.method === "initialize") {
      console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{protocolVersion:"2024-11-05",capabilities:{tools:{}},serverInfo:{name:"fake",version:"1"}}}));
    }
  }
}
`,
      { mode: 0o700 },
    );
    process.env.KIBI_SKILLOPT_PROCESS_GROUP = "python_bridge";
    const input = new PassThrough();
    const output = new PassThrough();
    const stderr = new PassThrough();
    const attempt = runMcpBroker(
      {
        downstream: {
          command: process.execPath,
          args: [serverPath],
          cwd: root,
        },
        tracePath,
        startupTimeoutMs: 5_000,
        toolTimeoutMs: 80,
        killGraceMs: 20,
      },
      { input, output, error: stderr },
    );
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`,
    );
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "kb_status", arguments: {} } })}\n`,
    );
    const caught = await attempt.then(
      () => null,
      (error: unknown) => error,
    );
    expect(caught).toBeInstanceOf(McpBrokerError);
  });
});
