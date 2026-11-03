import { afterEach, describe, expect, test } from "bun:test";
import { _setConsoleError, resetClient, setClient } from "../src/logger";
import {
  type V2CommandDefinition,
  type V2PluginContext,
  type V2SessionContextHookInput,
  type V2ToolExecuteAfterInput,
  commandText,
  createV2Setup,
  extractPatchFileOperations,
  legacyEventsFromToolExecution,
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

afterEach(() => {
  _setConsoleError(null);
  resetClient();
});

function captureErrors(): unknown[] {
  const bodies: unknown[] = [];
  _setConsoleError(() => {});
  setClient({
    app: {
      log: async ({ body }: { body: unknown }) => {
        bodies.push(body);
      },
    },
  } as never);
  return bodies;
}

const registration = { dispose: () => {} };

describe("extractPatchFileOperations", () => {
  test("markers are matched after trimming lines and file names", () => {
    expect(
      extractPatchFileOperations(
        [
          "  *** Add File:   a.ts  ",
          "*** Update File: b.ts",
          "*** Move to:   c.ts",
          "*** Delete File: d.ts",
        ].join("\n"),
      ),
    ).toEqual([
      { type: "file.created", file: "a.ts" },
      { type: "file.deleted", file: "b.ts" },
      { type: "file.created", file: "c.ts" },
      { type: "file.deleted", file: "d.ts" },
    ]);
  });

  test("empty names and moves without an updated file are ignored", () => {
    expect(
      extractPatchFileOperations(
        [
          "*** Move to: x.ts",
          "*** Add File: ",
          "*** Add File: a.ts",
          "*** Move to: y.ts",
          "*** Update File: b.ts",
          "*** Move to: ",
        ].join("\n"),
      ),
    ).toEqual([
      { type: "file.created", file: "a.ts" },
      { type: "file.edited", file: "b.ts" },
    ]);
  });
});

describe("legacyEventsFromToolExecution", () => {
  const base = { sessionID: "s", tool: "edit" };
  const fileEvents = (input: V2ToolExecuteAfterInput) =>
    legacyEventsFromToolExecution(input, "/repo").slice(1);

  test("the tool event carries the call id only when there is one", () => {
    expect(
      legacyEventsFromToolExecution(
        { ...base, status: "error", input: { path: "a" } },
        "/repo",
      ),
    ).toStrictEqual([
      {
        type: "tool.execute.after",
        properties: {
          tool: "edit",
          sessionID: "s",
          status: "error",
          args: { path: "a" },
        },
      },
    ]);
  });

  test.each([
    [{ path: "a.ts" }, "/repo/a.ts"],
    [{ filePath: "b.ts" }, "/repo/b.ts"],
    [{ path: "", filePath: "b.ts" }, "/repo/b.ts"],
    [{ path: "/abs/c.ts" }, "/abs/c.ts"],
  ])("an edit of %p is a file edit", (input, file) => {
    expect(fileEvents({ ...base, status: "completed", input })).toEqual([
      { type: "file.edited", properties: { file } },
    ]);
  });

  test.each([[null], ["text"], [{}], [{ path: 5 }]])(
    "an edit without a usable path adds no file event: %p",
    (input) => {
      expect(fileEvents({ ...base, status: "completed", input })).toEqual([]);
    },
  );

  test.each([
    ["write", { output: { existed: false } }, "file.created"],
    ["write", { output: { existed: true } }, "file.edited"],
    ["write", { output: null }, "file.edited"],
    ["write", null, "file.edited"],
    ["edit", { output: { existed: false } }, "file.edited"],
  ])("%s with result %p is %s", (tool, result, type) => {
    expect(
      fileEvents({
        ...base,
        tool,
        status: "completed",
        input: { path: "a.ts" },
        result,
      }),
    ).toEqual([{ type, properties: { file: "/repo/a.ts" } }]);
  });

  test.each([["patch"], ["apply_patch"]])(
    "%s bodies become file events",
    (tool) => {
      expect(
        fileEvents({
          ...base,
          tool,
          status: "completed",
          input: { patchText: "*** Add File: n.ts" },
        }),
      ).toEqual([{ type: "file.created", properties: { file: "/repo/n.ts" } }]);
    },
  );

  test.each([
    ["patch", {}],
    ["bash", { patchText: "*** Add File: n.ts", path: "a.ts" }],
  ])("%s with %p adds no file event", (tool, input) => {
    expect(fileEvents({ ...base, tool, status: "completed", input })).toEqual(
      [],
    );
  });
});

describe("commandText", () => {
  test.each([
    ["  run $ARGUMENTS  ", "x", "run x"],
    ["run", " x ", "run\n\n x"],
    ["run ", "  ", "run "],
  ])("%p with %p", (template, args, expected) => {
    expect(commandText(template, args)).toBe(expected);
  });
});

describe("createV2Setup", () => {
  test("hooks register on their v2 domains by name", async () => {
    const names: string[] = [];
    const context: V2PluginContext = {
      location: { directory: "/repo" },
      session: {
        hook: async (name) => {
          names.push(name);
          return registration;
        },
      },
      tool: {
        hook: async (name) => {
          names.push(name);
          return registration;
        },
      },
    };
    const bodies = captureErrors();
    await createV2Setup(async () => ({
      "experimental.chat.system.transform": async () => {},
      event: async () => {},
    }))(context);
    expect(names).toEqual(["context", "execute.after"]);
    expect(bodies).toEqual([]);
  });

  test("missing domains are skipped quietly and leave nothing to clean up", async () => {
    const bodies = captureErrors();
    const cleanup = await createV2Setup(async () => ({
      "experimental.chat.system.transform": async () => {},
      event: async () => {},
      config: async (config) => {
        (config as unknown as { command: Record<string, unknown> }).command.x =
          { template: "t" };
      },
    }))({ location: { directory: "/repo" } });
    await cleanup();
    expect(bodies).toEqual([]);
  });

  test("a failing registration names its domain", async () => {
    const bodies = captureErrors();
    const fail = async () => {
      throw new Error("nope");
    };
    await createV2Setup(async () => ({
      "tool.execute.after": async () => {},
      config: async (config) => {
        (config as unknown as { command: Record<string, unknown> }).command.x =
          { template: "t" };
      },
    }))({
      location: { directory: "/repo" },
      tool: { hook: fail },
      command: { transform: fail },
    });
    expect(bodies).toEqual([
      {
        service: "kibi-opencode",
        level: "error",
        message: "OpenCode v2 tool.execute.after registration failed",
        domain: "tool.execute.after",
        error: "nope",
      },
      {
        service: "kibi-opencode",
        level: "error",
        message: "OpenCode v2 command.transform registration failed",
        domain: "command.transform",
        error: "nope",
      },
    ]);
  });

  test("the system transform sees the existing text and appends new strings", async () => {
    let callback: ((input: V2SessionContextHookInput) => unknown) | undefined;
    const seen: string[][] = [];
    await createV2Setup(async () => ({
      "experimental.chat.system.transform": async (_input, output) => {
        seen.push([...output.system]);
        output.system.push("", 5 as unknown as string, "added");
      },
    }))({
      location: { directory: "/repo" },
      session: {
        hook: async (_name, cb) => {
          callback = cb;
          return registration;
        },
      },
    });
    const request: V2SessionContextHookInput = {
      sessionID: "s",
      system: [{ type: "text", text: "a" }, { type: "file" }],
    };
    await callback?.(request);
    expect(seen).toEqual([["a", ""]]);
    expect(request.system).toEqual([
      { type: "text", text: "a" },
      { type: "file" },
      { type: "text", text: "added" },
    ]);
  });

  test("a failing hook is logged with its name", async () => {
    let callback: ((input: V2ToolExecuteAfterInput) => unknown) | undefined;
    const bodies = captureErrors();
    await createV2Setup(async () => ({
      "tool.execute.after": async () => {
        throw new Error("hook broke");
      },
    }))({
      location: { directory: "/repo" },
      tool: {
        hook: async (_name, cb) => {
          callback = cb;
          return registration;
        },
      },
    });
    await callback?.({ sessionID: "s", tool: "x", status: "error", input: {} });
    expect(bodies).toEqual([
      {
        service: "kibi-opencode",
        level: "error",
        message: "OpenCode v2 tool.execute.after hook failed",
        hook: "tool.execute.after",
        error: "hook broke",
      },
    ]);
  });

  test.each([["event"], ["tool.execute.after"]] as const)(
    "a bridge with only the %s hook runs cleanly",
    async (only) => {
      let callback: ((input: V2ToolExecuteAfterInput) => unknown) | undefined;
      const calls: string[] = [];
      const bodies = captureErrors();
      await createV2Setup(async () => ({
        [only]: async () => {
          calls.push(only);
        },
      }))({
        location: { directory: "/repo" },
        tool: {
          hook: async (_name, cb) => {
            callback = cb;
            return registration;
          },
        },
      });
      await callback?.({
        sessionID: "s",
        tool: "x",
        status: "completed",
        input: {},
      });
      expect(calls).toEqual([only]);
      expect(bodies).toEqual([]);
    },
  );
});

describe("bridged commands", () => {
  async function commands(
    entries: Record<string, unknown>,
    session?: V2PluginContext["session"],
  ): Promise<{ added: V2CommandDefinition[]; transformed: boolean }> {
    const added: V2CommandDefinition[] = [];
    let transformed = false;
    await createV2Setup(async () => ({
      config: async (config) => {
        Object.assign(
          (config as unknown as { command: Record<string, unknown> }).command,
          entries,
        );
      },
    }))({
      location: { directory: "/repo" },
      ...(session ? { session } : {}),
      command: {
        transform: async (callback) => {
          transformed = true;
          callback({ add: (definition) => added.push(definition) });
          return registration;
        },
      },
    });
    return { added, transformed };
  }

  test("only string templates become commands; descriptions must be strings", async () => {
    const { added } = await commands({
      a: null,
      b: { description: "d" },
      c: { template: "t", description: 5 },
      d: { template: "t", description: "d" },
    });
    expect(added.map((definition) => Object.keys(definition))).toEqual([
      ["name", "execute"],
      ["name", "description", "execute"],
    ]);
    expect(added.map((definition) => definition.name)).toEqual(["c", "d"]);
  });

  test("no commands means no transform", async () => {
    expect((await commands({ a: { description: "d" } })).transformed).toBe(
      false,
    );
  });

  test("a command without a session prompt does nothing", async () => {
    const withoutSession = await commands({ c: { template: "t" } });
    await withoutSession.added[0]?.execute({ sessionID: "s" });
    const withoutPrompt = await commands(
      { c: { template: "t" } },
      { hook: async () => registration },
    );
    await withoutPrompt.added[0]?.execute({ sessionID: "s" });
  });

  test("a command passes only the prompt parts it was given", async () => {
    const prompts: unknown[] = [];
    const { added } = await commands(
      { c: { template: "t $ARGUMENTS" } },
      {
        hook: async () => registration,
        prompt: async (input) => {
          prompts.push(input);
        },
      },
    );
    await added[0]?.execute({ sessionID: "s" });
    await added[0]?.execute({
      sessionID: "s",
      delivery: "d",
      prompt: { text: "x", files: ["f"], agents: ["a"], skills: ["k"] },
    });
    expect(prompts).toStrictEqual([
      { sessionID: "s", text: "t" },
      {
        sessionID: "s",
        text: "t x",
        delivery: "d",
        files: ["f"],
        agents: ["a"],
        skills: ["k"],
      },
    ]);
  });
});
