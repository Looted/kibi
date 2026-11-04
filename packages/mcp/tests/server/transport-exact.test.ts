import { afterEach, describe, expect, spyOn, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import * as session from "../../src/server/session.js";
import {
  keepStdoutForProtocol,
  setupTransportHandlers,
} from "../../src/server/transport.js";

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

describe("transport, exact", () => {
  test("console methods that write to stdout go to stderr", () => {
    const saved = {
      log: console.log,
      info: console.info,
      debug: console.debug,
    };
    const errors: unknown[][] = [];
    const error = spyOn(console, "error").mockImplementation((...args) => {
      errors.push(args);
    });
    spies.push(error);
    try {
      keepStdoutForProtocol();
      console.log("a", 1);
      console.info("b");
      console.debug("c", { d: 2 });
    } finally {
      Object.assign(console, saved);
    }
    expect(errors).toStrictEqual([["a", 1], ["b"], ["c", { d: 2 }]]);
  });

  test("a failed error response is logged and shuts the server down", async () => {
    const shutdown = spyOn(
      session,
      "initiateGracefulShutdown",
    ).mockResolvedValue(undefined);
    spies.push(shutdown);
    spies.push(
      spyOn(process, "on").mockImplementation((() => process) as never),
    );
    const logged: unknown[][] = [];
    spies.push(
      spyOn(console, "error").mockImplementation((...args) => {
        logged.push(args);
      }),
    );
    const failure = new Error("write failed");
    const transport = {
      send: () => Promise.reject(failure),
    } as unknown as StdioServerTransport;
    setupTransportHandlers({} as McpServer, transport);
    const syntax = new Error("bad json");
    syntax.name = "SyntaxError";
    const zod = new Error("bad shape");
    zod.name = "ZodError";
    transport.onerror?.(syntax);
    transport.onerror?.(zod);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(logged).toStrictEqual([
      ["[KIBI-MCP] Failed to send parse error response:", failure],
      ["[KIBI-MCP] Failed to send invalid request response:", failure],
    ]);
    expect(shutdown.mock.calls).toStrictEqual([[1], [1]]);
  });
});
