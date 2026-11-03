import { describe, expect, mock, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  embedsStructuredText,
  progressReporter,
} from "../../src/server/tools.js";

function serverNamed(name: unknown): McpServer {
  return {
    server: { getClientVersion: () => ({ name }) },
  } as unknown as McpServer;
}

describe("embedsStructuredText, exact", () => {
  test("the explicit setting wins, trimmed and case-insensitive", () => {
    const claude = serverNamed("claude-code");
    expect(
      embedsStructuredText(claude, { KIBI_MCP_STRUCTURED_TEXT: " EMBED " }),
    ).toBe(true);
    expect(
      embedsStructuredText(undefined, { KIBI_MCP_STRUCTURED_TEXT: " Omit " }),
    ).toBe(false);
    // Any other value falls through to the host choice.
    expect(
      embedsStructuredText(undefined, { KIBI_MCP_STRUCTURED_TEXT: "maybe" }),
    ).toBe(true);
    expect(
      embedsStructuredText(claude, { KIBI_MCP_STRUCTURED_TEXT: "maybe" }),
    ).toBe(false);
  });

  test("the launcher host name is normalised before it is matched", () => {
    for (const host of [
      "claude-code",
      "Claude Code",
      "claude_code",
      "--Claude  Code--",
      " claude-code ",
    ]) {
      expect(embedsStructuredText(undefined, { KIBI_MCP_HOST: host })).toBe(
        false,
      );
    }
    for (const host of ["", "-", "opencode", "claude", "xclaude-code"]) {
      expect(embedsStructuredText(undefined, { KIBI_MCP_HOST: host })).toBe(
        true,
      );
    }
  });

  test("an unknown launcher host still defers to the client name", () => {
    expect(
      embedsStructuredText(serverNamed("Claude Code"), {
        KIBI_MCP_HOST: "other",
      }),
    ).toBe(false);
    expect(embedsStructuredText(serverNamed("claude_code"), {})).toBe(false);
    expect(embedsStructuredText(serverNamed("cursor"), {})).toBe(true);
    expect(embedsStructuredText(serverNamed(42), {})).toBe(true);
  });

  test("a server without client details keeps the copy", () => {
    expect(embedsStructuredText(undefined, {})).toBe(true);
    expect(embedsStructuredText({} as McpServer, {})).toBe(true);
    expect(
      embedsStructuredText({ server: {} } as unknown as McpServer, {}),
    ).toBe(true);
    expect(
      embedsStructuredText(
        {
          server: { getClientVersion: () => undefined },
        } as unknown as McpServer,
        {},
      ),
    ).toBe(true);
    const throwing = {
      server: {
        getClientVersion: () => {
          throw new Error("not connected");
        },
      },
    } as unknown as McpServer;
    expect(embedsStructuredText(throwing, {})).toBe(true);
  });

  test("the process environment is the default", () => {
    const previous = process.env.KIBI_MCP_STRUCTURED_TEXT;
    process.env.KIBI_MCP_STRUCTURED_TEXT = "omit";
    try {
      expect(embedsStructuredText(undefined)).toBe(false);
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_MCP_STRUCTURED_TEXT");
      else process.env.KIBI_MCP_STRUCTURED_TEXT = previous;
    }
  });
});

describe("progressReporter, exact", () => {
  test("no token or no sender means no reporter", () => {
    const activity = { touch: () => undefined };
    expect(progressReporter(undefined, activity)).toBeUndefined();
    expect(progressReporter({}, activity)).toBeUndefined();
    expect(
      progressReporter(
        { _meta: {}, sendNotification: async () => {} },
        activity,
      ),
    ).toBeUndefined();
    expect(
      progressReporter({ _meta: { progressToken: "t" } }, activity),
    ).toBeUndefined();
  });

  test("progress is forwarded, kept increasing and touches the timeout", async () => {
    const sent: unknown[] = [];
    const touch = mock(() => undefined);
    const report = progressReporter(
      {
        _meta: { progressToken: 0 },
        sendNotification: async (notification) => {
          sent.push(notification);
        },
      },
      { touch },
    );
    expect(report).toBeDefined();
    report?.({ progress: 0 });
    report?.({ progress: 0, total: 4, message: "again" });
    report?.({ progress: 3, total: 4 });
    report?.({ progress: 1, message: "back" });
    await Promise.resolve();
    expect(touch).toHaveBeenCalledTimes(4);
    expect(sent).toStrictEqual([
      {
        method: "notifications/progress",
        params: { progressToken: 0, progress: 0 },
      },
      {
        method: "notifications/progress",
        params: {
          progressToken: 0,
          progress: 0.001,
          total: 4,
          message: "again",
        },
      },
      {
        method: "notifications/progress",
        params: { progressToken: 0, progress: 3, total: 4 },
      },
      {
        method: "notifications/progress",
        params: { progressToken: 0, progress: 3.001, message: "back" },
      },
    ]);
  });

  test("a failed notification is logged only in debug mode", async () => {
    const previous = process.env.KIBI_MCP_DEBUG;
    const errors: unknown[][] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => {
      errors.push(args);
    };
    try {
      for (const [debug, failure] of [
        ["1", new Error("closed")],
        ["1", "gone"],
        [undefined, new Error("quiet")],
      ] as const) {
        if (debug === undefined)
          Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
        else process.env.KIBI_MCP_DEBUG = debug;
        const report = progressReporter(
          {
            _meta: { progressToken: "p" },
            sendNotification: () => Promise.reject(failure),
          },
          { touch: () => undefined },
        );
        report?.({ progress: 1 });
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    } finally {
      console.error = original;
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_MCP_DEBUG");
      else process.env.KIBI_MCP_DEBUG = previous;
    }
    expect(errors).toStrictEqual([
      ["[KIBI-MCP] progress notification failed:", "closed"],
      ["[KIBI-MCP] progress notification failed:", "gone"],
    ]);
  });
});
