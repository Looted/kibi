import { describe, expect, test } from "bun:test";
import { _setConsoleError, resetClient, setClient } from "../src/logger";
import {
  type V2PluginContext,
  createV2Setup,
  legacyToolOutput,
} from "../src/opencode-v2";
import type { Hooks } from "../src/plugin";

describe("legacyToolOutput", () => {
  test("a completed call keeps its result, a failed one its error", () => {
    const base = { sessionID: "s", id: "c", tool: "edit", input: {} };
    expect(
      legacyToolOutput({ ...base, status: "completed", result: { ok: 1 } }),
    ).toEqual({ status: "completed", result: { ok: 1 } });
    expect(
      legacyToolOutput({ ...base, status: "error", error: "boom" }),
    ).toEqual({ status: "error", error: "boom" });
  });
});

describe("cleanup", () => {
  test("disposes in reverse order and keeps going after a failure", async () => {
    const disposed: string[] = [];
    const registration = (name: string, fail = false) => ({
      dispose: async () => {
        disposed.push(name);
        if (fail) throw new Error(`${name} broke`);
      },
    });
    const context: V2PluginContext = {
      location: { directory: "/repo", project: { directory: "/repo" } },
      session: {
        hook: async () => registration("session"),
        prompt: async () => {},
      },
      tool: { hook: async () => registration("tool", true) },
      command: { transform: async () => registration("command") },
    };
    const hooks: Hooks = {
      "experimental.chat.system.transform": () => {},
      event: () => {},
      config: (config) => {
        (config as unknown as { command: Record<string, unknown> }).command.x =
          { template: "t" };
      },
    };
    const cleanup = await createV2Setup(async () => hooks)(context);
    const logged: unknown[][] = [];
    const bodies: unknown[] = [];
    _setConsoleError((...args: unknown[]) => {
      logged.push(args);
    });
    setClient({
      app: {
        log: async ({ body }: { body: unknown }) => {
          bodies.push(body);
        },
      },
    } as never);
    try {
      await cleanup();
    } finally {
      _setConsoleError(null);
      resetClient();
    }
    expect(disposed).toEqual(["command", "tool", "session"]);
    expect(logged).toHaveLength(1);
    expect(String(logged[0]?.[1])).toContain(
      "OpenCode v2 registration cleanup failed",
    );
    expect(bodies).toEqual([
      {
        service: "kibi-opencode",
        level: "error",
        message: "OpenCode v2 registration cleanup failed",
        error: expect.stringContaining("tool broke"),
      },
    ]);
  });
});
