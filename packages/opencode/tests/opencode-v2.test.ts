import { describe, expect, test } from "bun:test";
import path from "node:path";
import pluginDefinition from "../src/index";
import { _setConsoleError } from "../src/logger";
import {
  KIBI_OPENCODE_PLUGIN_ID,
  type V2CommandDefinition,
  type V2PluginContext,
  type V2SessionContextHookInput,
  type V2ToolExecuteAfterInput,
  createPluginDefinition,
  createV2Setup,
  extractPatchFileOperations,
  legacyEventsFromToolExecution,
  legacyInputFromV2Context,
} from "../src/opencode-v2";
import kibiOpencodePlugin from "../src/plugin";
import type { Hooks, PluginInput } from "../src/plugin";

type Registered = {
  context?: (input: V2SessionContextHookInput) => Promise<void> | void;
  tool?: (input: V2ToolExecuteAfterInput) => Promise<void> | void;
  commands: V2CommandDefinition[];
  disposed: string[];
  prompts: Array<{ sessionID: string; text: string; delivery?: unknown }>;
};

function fakeContext(directory = "/repo/app", project = "/repo") {
  const registered: Registered = { commands: [], disposed: [], prompts: [] };
  const context: V2PluginContext = {
    location: { directory, project: { directory: project } },
    session: {
      hook: async (_name, callback) => {
        registered.context = callback;
        return { dispose: () => void registered.disposed.push("session") };
      },
      prompt: async (input) => {
        registered.prompts.push(input);
      },
    },
    tool: {
      hook: async (_name, callback) => {
        registered.tool = callback;
        return { dispose: () => void registered.disposed.push("tool") };
      },
    },
    command: {
      transform: async (callback) => {
        callback({ add: (definition) => registered.commands.push(definition) });
        return { dispose: () => void registered.disposed.push("command") };
      },
    },
  };
  return { context, registered };
}

describe("OpenCode v2 plugin definition", () => {
  test("default export satisfies the v2 { id, setup } module contract", () => {
    // OpenCode v2 rejects function-valued default exports (Expected object).
    expect(typeof pluginDefinition).toBe("object");
    expect(pluginDefinition).not.toBeNull();
    expect(typeof pluginDefinition.id).toBe("string");
    expect(pluginDefinition.id).toBe(KIBI_OPENCODE_PLUGIN_ID);
    expect(typeof pluginDefinition.setup).toBe("function");
  });

  test("default export still satisfies the v1 { id, server } module contract", () => {
    // OpenCode v1 >= 1.4 reads default.server; it must be the v1 plugin and
    // the definition must not also declare a tui entrypoint.
    expect(pluginDefinition.server).toBe(kibiOpencodePlugin);
    expect("tui" in pluginDefinition).toBe(false);
  });

  test("createPluginDefinition wires server and setup to the same plugin", () => {
    const plugin = async () => ({});
    const definition = createPluginDefinition(plugin);
    expect(definition.server).toBe(plugin);
    expect(typeof definition.setup).toBe("function");
  });
});

describe("legacyInputFromV2Context", () => {
  test("uses the project directory as worktree and location as directory", () => {
    const { context } = fakeContext("/repo/app", "/repo");
    expect(legacyInputFromV2Context(context)).toEqual({
      worktree: "/repo",
      directory: "/repo/app",
    });
  });

  test("falls back to the location directory without project info", () => {
    expect(
      legacyInputFromV2Context({ location: { directory: "/solo" } }),
    ).toEqual({ worktree: "/solo", directory: "/solo" });
  });
});

describe("extractPatchFileOperations", () => {
  test("maps patch markers to file lifecycle events", () => {
    const patch = [
      "*** Begin Patch",
      "*** Add File: src/new.ts",
      "+export {};",
      "*** Update File: src/old.ts",
      "*** Move to: src/renamed.ts",
      "@@",
      "-a",
      "+b",
      "*** Delete File: src/gone.ts",
      "*** End Patch",
    ].join("\n");
    expect(extractPatchFileOperations(patch)).toEqual([
      { type: "file.created", file: "src/new.ts" },
      { type: "file.edited", file: "src/old.ts" },
      { type: "file.created", file: "src/renamed.ts" },
      { type: "file.deleted", file: "src/gone.ts" },
    ]);
  });
});

describe("legacyEventsFromToolExecution", () => {
  const base = { sessionID: "ses_1", id: "call_1" } as const;

  test("always emits a tool.execute.after event", () => {
    const events = legacyEventsFromToolExecution(
      { ...base, tool: "kb_search", input: {}, status: "completed" },
      "/repo",
    );
    expect(events).toEqual([
      {
        type: "tool.execute.after",
        properties: {
          tool: "kb_search",
          sessionID: "ses_1",
          callID: "call_1",
          status: "completed",
        },
      },
    ]);
  });

  test("derives file.edited from edit/write tools and resolves relative paths", () => {
    const edit = legacyEventsFromToolExecution(
      {
        ...base,
        tool: "edit",
        input: { path: "src/a.ts" },
        status: "completed",
      },
      "/repo",
    );
    expect(edit[1]).toEqual({
      type: "file.edited",
      properties: { file: path.resolve("/repo", "src/a.ts") },
    });
    const write = legacyEventsFromToolExecution(
      {
        ...base,
        tool: "write",
        input: { path: "/abs/b.ts" },
        status: "completed",
      },
      "/repo",
    );
    expect(write[1]).toEqual({
      type: "file.edited",
      properties: { file: "/abs/b.ts" },
    });
  });

  test("derives lifecycle events from patch tool input", () => {
    const events = legacyEventsFromToolExecution(
      {
        ...base,
        tool: "patch",
        input: { patchText: "*** Delete File: x.ts\n" },
        status: "completed",
      },
      "/repo",
    );
    expect(events[1]).toEqual({
      type: "file.deleted",
      properties: { file: path.resolve("/repo", "x.ts") },
    });
  });

  test("failed tool calls emit no file lifecycle events", () => {
    const events = legacyEventsFromToolExecution(
      { ...base, tool: "edit", input: { path: "a.ts" }, status: "error" },
      "/repo",
    );
    expect(events.map((event) => event.type)).toEqual(["tool.execute.after"]);
  });
});

describe("createV2Setup", () => {
  test("passes a synthesized legacy input to the v1 plugin", async () => {
    let seen: PluginInput | undefined;
    const setup = createV2Setup(async (input) => {
      seen = input;
      return {};
    });
    const { context, registered } = fakeContext();
    await setup(context);
    expect(seen).toEqual({ worktree: "/repo", directory: "/repo/app" });
    expect(registered.context).toBeUndefined();
    expect(registered.tool).toBeUndefined();
    expect(registered.commands).toEqual([]);
  });

  test("bridges system.transform onto session context hook", async () => {
    const hooks: Hooks = {
      "experimental.chat.system.transform": async (_input, output) => {
        output.system.push("kibi guidance");
      },
    };
    const { context, registered } = fakeContext();
    await createV2Setup(async () => hooks)(context);
    const request: V2SessionContextHookInput = {
      sessionID: "ses_1",
      system: [{ type: "text", text: "base prompt" }],
    };
    await registered.context?.(request);
    expect(request.system).toEqual([
      { type: "text", text: "base prompt" },
      { type: "text", text: "kibi guidance" },
    ]);
  });

  test("bridges tool.execute.after and event hooks onto the tool domain", async () => {
    const afterCalls: unknown[] = [];
    const events: Array<{ type: string }> = [];
    const hooks: Hooks = {
      "tool.execute.after": async (input, output) => {
        afterCalls.push({ input, output });
      },
      event: async ({ event }) => {
        events.push(event as { type: string });
      },
    };
    const { context, registered } = fakeContext();
    await createV2Setup(async () => hooks)(context);
    await registered.tool?.({
      tool: "edit",
      sessionID: "ses_1",
      id: "call_1",
      input: { path: "src/a.ts" },
      status: "completed",
      result: { output: "ok" },
    });
    expect(afterCalls).toEqual([
      {
        input: { tool: "edit", sessionID: "ses_1", args: { path: "src/a.ts" } },
        output: { status: "completed", result: { output: "ok" } },
      },
    ]);
    expect(events.map((event) => event.type)).toEqual([
      "tool.execute.after",
      "file.edited",
    ]);
  });

  test("registers config-provided commands through command.transform", async () => {
    const hooks: Hooks = {
      config: async (config) => {
        const target = config as unknown as {
          command: Record<string, { template: string; description?: string }>;
        };
        target.command["kibi-bootstrap"] = {
          template: "# /kibi-bootstrap",
          description: "Bootstrap Kibi",
        };
      },
    };
    const { context, registered } = fakeContext();
    await createV2Setup(async () => hooks)(context);
    expect(registered.commands.map((command) => command.name)).toEqual([
      "kibi-bootstrap",
    ]);
    expect(registered.commands[0]?.description).toBe("Bootstrap Kibi");
    await registered.commands[0]?.execute({
      sessionID: "ses_1",
      delivery: "queue",
    });
    expect(registered.prompts).toEqual([
      { sessionID: "ses_1", text: "# /kibi-bootstrap", delivery: "queue" },
    ]);
  });

  test("a failing domain registration does not block the others", async () => {
    const hooks: Hooks = {
      "experimental.chat.system.transform": () => {},
      event: () => {},
    };
    const { context, registered } = fakeContext();
    const broken: V2PluginContext = {
      ...context,
      session: {
        hook: async () => {
          throw new Error("unsupported");
        },
      },
    };
    const logged: unknown[][] = [];
    _setConsoleError((...args: unknown[]) => {
      logged.push(args);
    });
    try {
      await createV2Setup(async () => hooks)(broken);
    } finally {
      _setConsoleError(null);
    }
    expect(typeof registered.tool).toBe("function");
    expect(logged).toHaveLength(1);
    expect(String(logged[0]?.[1])).toContain(
      "OpenCode v2 session.context registration failed",
    );
  });

  test("cleanup disposes every registration", async () => {
    const hooks: Hooks = {
      "experimental.chat.system.transform": () => {},
      event: () => {},
      config: (config) => {
        (config as unknown as { command: Record<string, unknown> }).command.x =
          { template: "t" };
      },
    };
    const { context, registered } = fakeContext();
    const cleanup = await createV2Setup(async () => hooks)(context);
    await cleanup();
    expect(registered.disposed.sort()).toEqual(["command", "session", "tool"]);
  });
});
