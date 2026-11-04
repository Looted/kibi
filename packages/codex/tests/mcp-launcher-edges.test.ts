import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import { createRequire } from "node:module";
import os from "node:os";
import { PassThrough } from "node:stream";

const require = createRequire(import.meta.url);
const launcher = require("../bin/mcp-launcher.cjs") as {
  MISSING_KIBI_MCP_INSTRUCTIONS: string;
  proxyKibiMcp: (options?: Record<string, unknown>) => Promise<number>;
  serveSilent: (options?: Record<string, unknown>) => Promise<number>;
  silentServerResponse: (
    message: unknown,
    options?: Record<string, unknown>,
  ) => Record<string, unknown> | null;
};

type FakeChild = EventEmitter & {
  stdin: { write: (chunk: unknown) => void; end: () => void };
  stdout: PassThrough;
  stderr: PassThrough;
  killed: boolean;
  kill: () => boolean;
};

function closedStdinChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdin = {
    write: () => {
      throw new Error("write after end");
    },
    end: () => {
      throw new Error("already closed");
    },
  };
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killed = false;
  child.kill = () => true;
  return child;
}

describe("codex MCP launcher edges", () => {
  test("tools/call without a tool message explains the missing kibi-mcp", () => {
    expect(
      launcher.silentServerResponse({
        jsonrpc: "2.0",
        id: 9,
        method: "tools/call",
      }),
    ).toStrictEqual({
      jsonrpc: "2.0",
      id: 9,
      result: {
        content: [
          {
            type: "text",
            text: `Kibi tools are unavailable in this workspace. ${launcher.MISSING_KIBI_MCP_INSTRUCTIONS}`,
          },
        ],
      },
    });
  });

  test("serveSilent answers through a custom responder when one is given", async () => {
    const stdin = new PassThrough();
    const written: string[] = [];
    const stdout = Object.assign(new EventEmitter(), {
      write: (text: string) => {
        written.push(text);
        return true;
      },
    });
    const seen: unknown[] = [];
    const exit = launcher.serveSilent({
      stdin,
      stdout,
      response: (message: unknown) => {
        seen.push(message);
        return (message as { id: number }).id === 1 ? { echoed: 1 } : null;
      },
    });
    stdin.write('{"id":1}\n{"id":2}\n');
    stdin.end();
    expect(await exit).toBe(0);
    expect(seen).toStrictEqual([{ id: 1 }, { id: 2 }]);
    expect(written).toStrictEqual(['{"echoed":1}\n']);
  });

  test("a proxied child that closes without a code or signal exits 1", async () => {
    const stdin = new PassThrough();
    const child = closedStdinChild();
    const exit = launcher.proxyKibiMcp({
      workspaceRoot: os.tmpdir(),
      env: {},
      spawnImpl: () => child,
      stdin,
      stdout: new PassThrough(),
      stderr: new PassThrough(),
    });
    // Writes and the end of input reach a child whose stdin already closed.
    stdin.write("ping\n");
    stdin.end();
    await new Promise((resolve) => setTimeout(resolve, 10));
    child.emit("close", null, null);
    expect(await exit).toBe(1);
  });
});
