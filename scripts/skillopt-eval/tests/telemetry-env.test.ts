import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { PassThrough } from "node:stream";

import { fixtureCliEnv } from "../runtime/fixture-kb-setup";
import { runMcpBroker } from "../runtime/mcp-broker-process";
import { runBoundedProcess } from "../runtime/process";
import { harnessChildEnv } from "../runtime/telemetry-env";

const KIBI_BIN = path.resolve(
  import.meta.dir,
  "../../../packages/cli/bin/kibi",
);
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function temporaryDirectory(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(directory);
  return directory;
}

function queued(state: string): number {
  const file = path.join(state, "telemetry-queue.jsonl");
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length
    : 0;
}

describe("harness child environment", () => {
  test("turns Kibi telemetry off and keeps the rest", () => {
    expect(harnessChildEnv({ PATH: "/bin", KIBI_TELEMETRY: "1" })).toEqual({
      PATH: "/bin",
      KIBI_TELEMETRY: "0",
    });
  });

  test("a Kibi CLI run in a fixture environment queues no telemetry (end to end)", async () => {
    const workspace = temporaryDirectory("kibi-harness-fixture-");
    spawnSync("git", ["init", "-q", "-b", "main"], { cwd: workspace });
    const run = (env: NodeJS.ProcessEnv, state: string) =>
      spawnSync("node", [KIBI_BIN, "status"], {
        cwd: workspace,
        env: {
          ...env,
          KIBI_TELEMETRY_DIR: state,
          KIBI_TELEMETRY_HOST: "http://127.0.0.1:9",
        },
        encoding: "utf8",
      });
    // The same run outside the harness queues an event, so the check below
    // can tell the two apart.
    const control = temporaryDirectory("kibi-harness-control-");
    run({ ...process.env, KIBI_TELEMETRY: "1" }, control);
    expect(queued(control)).toBeGreaterThan(0);

    // The operator's own environment asks for telemetry; the harness still
    // turns it off for its children.
    const previous = process.env.KIBI_TELEMETRY;
    process.env.KIBI_TELEMETRY = "1";
    try {
      const state = temporaryDirectory("kibi-harness-state-");
      const env = fixtureCliEnv(workspace);
      expect(env.KIBI_TELEMETRY).toBe("0");
      expect(env.KIBI_WORKSPACE).toBe(workspace);
      run(env, state);
      expect(queued(state)).toBe(0);

      const child = await runBoundedProcess({
        argv: [
          process.execPath,
          "-e",
          "process.stdout.write(String(process.env.KIBI_TELEMETRY))",
        ],
        cwd: workspace,
        env: { ...process.env },
        timeoutMs: 20_000,
      });
      expect(child.exitCode).toBe(0);
      expect(child.stdout).toBe("0");
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_TELEMETRY");
      else process.env.KIBI_TELEMETRY = previous;
    }
  }, 120_000);

  test("the MCP broker starts the downstream Kibi MCP server with telemetry off", async () => {
    const root = temporaryDirectory("kibi-harness-broker-");
    const serverPath = path.join(root, "server.ts");
    const seenPath = path.join(root, "telemetry.txt");
    fs.writeFileSync(
      serverPath,
      `require("node:fs").writeFileSync(${JSON.stringify(seenPath)}, String(process.env.KIBI_TELEMETRY));
const decoder = new TextDecoder();
let buffer = "";
for await (const chunk of Bun.stdin.stream()) {
  buffer += decoder.decode(chunk);
  let newline;
  while ((newline = buffer.indexOf("\\n")) >= 0) {
    const line = buffer.slice(0, newline);
    buffer = buffer.slice(newline + 1);
    if (!line) continue;
    const request = JSON.parse(line);
    console.log(JSON.stringify({jsonrpc:"2.0",id:request.id,result:{protocolVersion:"2024-11-05",capabilities:{tools:{}},serverInfo:{name:"fake",version:"1"}}}));
  }
}
`,
    );
    const previous = process.env.KIBI_TELEMETRY;
    process.env.KIBI_TELEMETRY = "1";
    try {
      const input = new PassThrough();
      const attempt = runMcpBroker(
        {
          downstream: {
            command: process.execPath,
            args: [serverPath],
            cwd: root,
          },
          tracePath: path.join(root, "trace.jsonl"),
          startupTimeoutMs: 5_000,
          toolTimeoutMs: 2_000,
          killGraceMs: 50,
        },
        { input, output: new PassThrough(), error: new PassThrough() },
      );
      input.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })}\n`,
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      input.end();
      await attempt;
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_TELEMETRY");
      else process.env.KIBI_TELEMETRY = previous;
    }
    expect(fs.readFileSync(seenPath, "utf8")).toBe("0");
  });
});
