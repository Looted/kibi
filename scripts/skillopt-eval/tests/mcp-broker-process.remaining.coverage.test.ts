// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, setDefaultTimeout, spyOn, test } from "bun:test";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import { McpBrokerError, REQUIRED_KIBI_TOOLS } from "../runtime/mcp-broker";
import { runMcpBroker } from "../runtime/mcp-broker-process";

const spies: Array<{ mockRestore: () => void }> = [];
const roots: string[] = [];
setDefaultTimeout(20_000);

afterEach(async () => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
  if (process.exitCode === 1) process.exitCode = 0;
});

function lineServer(handler: string): string {
  return `const decoder = new TextDecoder();
let buffer = "";
for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk);
  let newline;
  while ((newline = buffer.indexOf("\\n")) >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const request = JSON.parse(line);
    ${handler}
  }
}
`;
}

describe("mcp-broker-process remaining protocol and ESRCH branches", () => {
  test("fails closed on malformed server JSON and incomplete tools/list", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-broker-remain-"));
    roots.push(root);
    const malformedPath = join(root, "malformed.ts");
    await writeFile(
      malformedPath,
      lineServer(`if (request.method === "initialize") {
      console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{}}));
    } else {
      console.log("not-json");
    }`),
      { mode: 0o700 },
    );
    const input = new PassThrough();
    const output = new PassThrough();
    const error = new PassThrough();
    const malformed = runMcpBroker(
      {
        downstream: {
          command: process.execPath,
          args: [malformedPath],
          cwd: root,
        },
        tracePath: join(root, "trace-malformed.jsonl"),
        startupTimeoutMs: 5_000,
        toolTimeoutMs: 2_000,
        killGraceMs: 25,
      },
      { input, output, error },
    );
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`,
    );
    input.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`,
    );
    await expect(malformed).rejects.toBeInstanceOf(McpBrokerError);

    const emptyPath = join(root, "empty-tools.ts");
    await writeFile(
      emptyPath,
      lineServer(`if (request.method === "initialize") {
      console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{}}));
    } else {
      console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{tools:[]}}));
    }`),
      { mode: 0o700 },
    );
    const emptyInput = new PassThrough();
    const emptyOutput = new PassThrough();
    const emptyError = new PassThrough();
    const incomplete = runMcpBroker(
      {
        downstream: {
          command: process.execPath,
          args: [emptyPath],
          cwd: root,
        },
        tracePath: join(root, "trace-empty.jsonl"),
        startupTimeoutMs: 5_000,
        toolTimeoutMs: 2_000,
        killGraceMs: 25,
      },
      { input: emptyInput, output: emptyOutput, error: emptyError },
    );
    emptyInput.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`,
    );
    emptyInput.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })}\n`,
    );
    await expect(incomplete).rejects.toBeInstanceOf(McpBrokerError);
  });

  test("swallows ESRCH when the process group is already gone", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-broker-esrch-"));
    roots.push(root);
    const originalKill = process.kill.bind(process);
    const kill = spyOn(process, "kill").mockImplementation(((pid, signal) => {
      if (typeof pid === "number" && pid < 0) {
        try {
          originalKill(pid, signal as NodeJS.Signals);
        } catch {
          // The group may already be gone; still exercise the ESRCH swallow.
        }
        const error = new Error("No such process");
        (error as Error & { code: string }).code = "ESRCH";
        throw error;
      }
      return originalKill(pid as number, signal as NodeJS.Signals);
    }) as typeof process.kill);
    spies.push(kill);
    const serverPath = join(root, "ready.ts");
    await writeFile(
      serverPath,
      `console.error("ready");
await new Promise(() => {});
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
        tracePath: join(root, "trace.jsonl"),
        startupTimeoutMs: 300,
        toolTimeoutMs: 100,
        killGraceMs: 10,
      },
      { input, output, error: stderr },
    );
    await once(stderr, "data");
    await expect(attempt).rejects.toBeInstanceOf(McpBrokerError);
    expect(REQUIRED_KIBI_TOOLS.length).toBeGreaterThan(0);
  });
});
