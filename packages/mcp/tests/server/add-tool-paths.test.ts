import { afterEach, describe, expect, mock, spyOn, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrologPort } from "kibi-cli/operations/runtime-types";
import {
  type OperationRuntime,
  QUERY_LIMIT_EXCEEDED_CODE,
  type RuntimeOperationSpec,
  detachedReadOnlyDiagnostic,
  toKibiResult,
} from "kibi-runtime";

import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";
import type { ToolsRuntime } from "../../src/server/tools.js";
import { addTool } from "../../src/server/tools.js";
import {
  type WorkspaceRouter,
  setWorkspaceRouter,
} from "../../src/server/workspace-router.js";
import * as telemetry from "../../src/usage-telemetry.js";

type Result = {
  content: { type: string; text?: unknown; [key: string]: unknown }[];
  structuredContent: Record<string, unknown>;
  isError?: boolean;
};
type Wrapped = (
  args: Record<string, unknown>,
  extra?: unknown,
) => Promise<Result>;
type Spec = RuntimeOperationSpec<Record<string, unknown>, unknown>;

const ENV_KEYS = [
  "KIBI_MCP_TOOL_TIMEOUT_MS",
  "KIBI_MCP_DEBUG",
  "KIBI_MCP_STRUCTURED_TEXT",
  "KIBI_MCP_HOST",
] as const;
const previousEnv = ENV_KEYS.map((key) => [key, process.env[key]] as const);
const spies: { mockRestore: () => void }[] = [];

afterEach(() => {
  setWorkspaceRouter(undefined);
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const [key, value] of previousEnv) {
    if (value === undefined) Reflect.deleteProperty(process.env, key);
    else process.env[key] = value;
  }
});

function clearEnv(): void {
  for (const key of ENV_KEYS) Reflect.deleteProperty(process.env, key);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function defaultOperationRuntime(): OperationRuntime {
  return createMcpRuntime<unknown>({
    workspaceRoot: "/workspace",
    attachedBranchKbPath: () => null,
    refreshAttachedBranchStamp: async () => {},
    ensureProlog: async () => ({}),
    adaptProlog: (): PrologPort => ({
      query: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    }),
  });
}

function runtime(overrides: Partial<ToolsRuntime<unknown>> = {}) {
  const usage: Record<string, unknown>[] = [];
  const tools = {
    diagnosticModeEnabled: () => false,
    appendUsageLogLine: (entry: Record<string, unknown>) => {
      usage.push(entry);
    },
    classifyDiagnosticError: () => ({
      error_name: "Error",
      error_message: "m",
      error_category: "handler_error",
      error_stage: "handler",
      error_summary: "failed",
    }),
    deriveDiagnosticFields: () => ({}),
    extractToolCallPayload: (args: Record<string, unknown>) => ({
      businessArgs: args,
      telemetry: null,
    }),
    tools: [],
    activeBranchName: () => "main",
    ensureProlog: async () => ({}),
    resetProlog: async () => {},
    inFlightRequests: () => new Map<string, Promise<unknown>>(),
    isShuttingDown: () => false,
    prologProcess: () => null,
    operationRuntime: defaultOperationRuntime(),
    ...overrides,
  } as unknown as ToolsRuntime<unknown>;
  return { tools, usage };
}

function register(
  name: string,
  handler: (args: Record<string, unknown>) => Promise<unknown>,
  tools: ToolsRuntime<unknown>,
  options: {
    spec?: Spec;
    outputSchema?: object;
    server?: Record<string, unknown>;
    inputSchema?: object;
  } = {},
): { call: Wrapped; config: Record<string, unknown> } {
  let call: Wrapped | undefined;
  let config: Record<string, unknown> = {};
  const server = {
    ...options.server,
    registerTool: (_n: string, c: Record<string, unknown>, h: Wrapped) => {
      call = h;
      config = c;
    },
  } as unknown as McpServer;
  addTool(
    server,
    name,
    "d",
    options.inputSchema ?? { type: "object" },
    handler as never,
    tools,
    options.spec,
    undefined,
    options.outputSchema,
  );
  if (!call) throw new Error("not registered");
  return { call, config };
}

function never(): Spec["execute"] {
  return () => new Promise(() => {});
}

/** Rejects with its abort reason once the call is cancelled. */
function rejectsOnAbort(): Spec["execute"] {
  return (_input, context) =>
    new Promise((_resolve, reject) => {
      context.signal?.addEventListener("abort", () =>
        reject(context.signal?.reason),
      );
    });
}

async function failure(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("expected a failure");
}

const STALE_HINT =
  " — this Kibi MCP server is running from files that are no longer installed (Kibi was likely upgraded or reinstalled after it started). Restart the Kibi MCP server; the project-local kibi CLI works in the meantime.";

describe("tool timeouts", () => {
  test("a wedged mutation among other effects resets the engine", async () => {
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "20";
    for (const effects of [["local-read", "kb-write"], ["workspace-write"]]) {
      const resetProlog = mock(async () => {});
      const { tools } = runtime({ resetProlog });
      const spec = { name: "kb_delete", effects, requiresProlog: false };
      await register("kb_delete", async () => undefined, tools, {
        spec: { ...spec, execute: never() } as Spec,
      }).call({});
      expect(resetProlog).toHaveBeenCalledTimes(1);
    }
  }, 10_000);

  test("a mutation that fails soon after the timeout is not reset", async () => {
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "20";
    const resetProlog = mock(async () => {});
    const { tools } = runtime({ resetProlog });
    const spec: Spec = {
      name: "kb_delete",
      effects: ["kb-write"],
      requiresProlog: false,
      execute: (_input, context) =>
        new Promise((_resolve, reject) => {
          context.signal?.addEventListener("abort", () =>
            setTimeout(() => reject(new Error("stopped")), 30),
          );
        }),
    };
    const message = await failure(
      register("kb_delete", async () => undefined, tools, { spec }).call({}),
    );
    expect(message).toBe("Tool kb_delete failed: stopped");
    expect(resetProlog).not.toHaveBeenCalled();
  });

  test("a read that fails after cancellation reports its own failure", async () => {
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "20";
    const { tools } = runtime();
    const spec: Spec = {
      name: "kb_query",
      effects: ["kb-read"],
      requiresProlog: false,
      execute: (_input, context) =>
        new Promise((_resolve, reject) => {
          context.signal?.addEventListener("abort", () =>
            setTimeout(() => reject(new Error("stopped")), 30),
          );
        }),
    };
    const message = await failure(
      register("kb_query", async () => undefined, tools, { spec }).call({}),
    );
    expect(message).toBe("Tool kb_query failed: stopped");
    await sleep(150);
  });

  test("progress keeps a slow operation alive", async () => {
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "40";
    const { tools } = runtime();
    const spec: Spec = {
      name: "kb_query",
      effects: ["kb-read"],
      requiresProlog: false,
      execute: async (_input, context) => {
        for (let step = 0; step < 12; step++) {
          await sleep(15);
          context.onProgress?.({ progress: step });
        }
        return { ok: true };
      },
    };
    const result = await register("kb_query", async () => undefined, tools, {
      spec,
    }).call(
      {},
      { _meta: { progressToken: "p" }, sendNotification: async () => {} },
    );
    expect(result.structuredContent.status).toBe("success");
  });

  test("progress after the timeout does not start it again", async () => {
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "30";
    const resetProlog = mock(async () => {});
    const { tools } = runtime({ resetProlog });
    const spec: Spec = {
      name: "kb_delete",
      effects: ["kb-write"],
      requiresProlog: false,
      execute: (_input, context) => {
        context.signal?.addEventListener("abort", () => {
          setTimeout(() => context.onProgress?.({ progress: 1 }), 5);
        });
        return new Promise(() => {});
      },
    };
    const result = await register("kb_delete", async () => undefined, tools, {
      spec,
    }).call(
      {},
      { _meta: { progressToken: "p" }, sendNotification: async () => {} },
    );
    expect(
      (result.structuredContent.error as Record<string, unknown>).code,
    ).toBe("MUTATION_OUTCOME_UNKNOWN");
    await sleep(300);
    expect(resetProlog).toHaveBeenCalledTimes(1);
  }, 10_000);

  test("a finished call is never cancelled afterwards", async () => {
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "30";
    const { tools } = runtime();
    let signal: AbortSignal | undefined;
    const spec: Spec = {
      name: "kb_query",
      effects: ["kb-read"],
      requiresProlog: false,
      execute: async (_input, context) => {
        signal = context.signal;
        return { ok: true };
      },
    };
    await register("kb_query", async () => undefined, tools, { spec }).call({});
    await sleep(60);
    expect(signal?.aborted).toBe(false);
  });

  test("a timeout that is not a positive whole number is ignored", async () => {
    const { tools } = runtime();
    const spec: Spec = {
      name: "kb_query",
      effects: ["kb-read"],
      requiresProlog: false,
      execute: async () => {
        await sleep(150);
        return { ok: true };
      },
    };
    for (const value of ["1.5", "0", "-3", "abc", ""]) {
      process.env.KIBI_MCP_TOOL_TIMEOUT_MS = value;
      const result = await register("kb_query", async () => undefined, tools, {
        spec,
      }).call({});
      expect(result.structuredContent.status).toBe("success");
    }
  });

  test("a kb_upsert dry run that times out fails like any read", async () => {
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "20";
    const { tools } = runtime();
    const spec: Spec = {
      name: "kb_upsert",
      effects: ["kb-write"],
      requiresProlog: false,
      execute: rejectsOnAbort(),
    };
    const { call } = register("kb_upsert", async () => undefined, tools, {
      spec,
    });
    expect(await failure(call({ dryRun: true }))).toBe(
      "Tool kb_upsert failed: Tool kb_upsert timed out after 20ms",
    );
    for (const args of [{ dryRun: false }, { dryRun: "true" }]) {
      const result = await call(args);
      expect(
        (result.structuredContent.error as Record<string, unknown>).code,
      ).toBe("MUTATION_OUTCOME_UNKNOWN");
    }
  });

  test("a timed-out mutation answers with the outcome-unknown envelope", async () => {
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "20";
    const { tools } = runtime();
    const spec: Spec = {
      name: "kb_delete",
      effects: ["kb-write"],
      requiresProlog: false,
      execute: rejectsOnAbort(),
    };
    const result = await register("kb_delete", async () => undefined, tools, {
      spec,
    }).call({ dryRun: true, _requestId: "req-1" });
    const recoveryActions = [
      {
        operation: "kb_status",
        reason:
          "Determine whether the mutation crossed the authoritative source/journal commit boundary before taking any further action.",
        required: true,
      },
      {
        operation: "kb_apply_plan",
        reason:
          "If status exposes a recovery journal, replay that typed journal action; never retry the timed-out mutation request.",
        required: true,
      },
    ];
    const envelope = toKibiResult(
      spec,
      {
        effectFailures: [
          {
            kind: "mutation",
            errorCode: "MUTATION_OUTCOME_UNKNOWN",
            detail: { requestId: "req-1", timeoutMs: 20 },
          },
        ],
        nextActions: recoveryActions,
      },
      {
        status: "error",
        nextActions: recoveryActions as never,
        error: {
          code: "MUTATION_OUTCOME_UNKNOWN",
          message:
            "The mutation timed out after cancellation; its commit state is indeterminate. Inspect status and replay the typed recovery action if required.",
          retryable: false,
          details: { requestId: "req-1", tool: "kb_delete" },
        },
      },
    );
    expect(result).toStrictEqual({
      content: [{ type: "text", text: JSON.stringify(envelope) }],
      structuredContent: envelope,
    } as never);
  });
});

describe("tool results", () => {
  test("results without content are wrapped in a JSON envelope", async () => {
    const { tools } = runtime();
    for (const value of [
      "text",
      null,
      [1],
      { ok: true },
      { status: "rejected" },
    ]) {
      const result = await register("kb_query", async () => value, tools).call(
        {},
      );
      const envelope = result.structuredContent;
      expect(envelope.data).toStrictEqual(value);
      const failed = envelope.status === "error";
      expect(failed).toBe(
        (value as { status?: unknown } | null)?.status === "rejected",
      );
      expect(result).toStrictEqual({
        content: [{ type: "text", text: JSON.stringify(envelope) }],
        structuredContent: envelope,
        ...(failed ? { isError: true } : {}),
      });
    }
  });

  test("opted-in tools put the data before a collapsed summary", async () => {
    clearEnv();
    const { tools } = runtime();
    const content = [
      { type: "text", text: "  first\n\n line" },
      { type: "image", data: "abc" },
      { type: "text", text: 5 },
      { type: "resource", text: "kept" },
      { type: "text", text: "second" },
    ];
    const spec: Spec = {
      name: "kb_search",
      effects: ["kb-read"],
      requiresProlog: false,
      agentVisibleStructuredData: true,
      execute: async () => ({ content, structuredContent: { hits: 1 } }),
    };
    const result = await register("kb_search", async () => undefined, tools, {
      spec,
    }).call({});
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: `${JSON.stringify({ hits: 1 })}\nfirst line second`,
      },
      { type: "image", data: "abc" },
      { type: "resource", text: "kept" },
    ]);

    const bare: Spec = {
      ...spec,
      execute: async () => ({
        content: [
          { type: "text", text: "   " },
          { type: "image", data: "x" },
        ],
        structuredContent: { hits: 2 },
      }),
    };
    const quiet = await register("kb_search", async () => undefined, tools, {
      spec: bare,
    }).call({});
    expect(quiet.content).toStrictEqual([
      { type: "text", text: JSON.stringify({ hits: 2 }) },
      { type: "image", data: "x" },
    ]);
  });

  test("a host that reads structured content keeps the text as is", async () => {
    clearEnv();
    const { tools } = runtime();
    const content = [{ type: "text", text: "summary" }];
    const spec: Spec = {
      name: "kb_search",
      effects: ["kb-read"],
      requiresProlog: false,
      agentVisibleStructuredData: true,
      execute: async () => ({ content, structuredContent: { hits: 1 } }),
    };
    const result = await register("kb_search", async () => undefined, tools, {
      spec,
      server: {
        server: { getClientVersion: () => ({ name: " Claude Code " }) },
      },
    }).call({});
    expect(result.content).toStrictEqual(content);
  });

  test("the output schema is registered only when given", () => {
    const { tools } = runtime();
    const handler = async () => ({});
    const withSchema = register("kb_query", handler, tools, {
      outputSchema: { type: "object", properties: { a: { type: "string" } } },
    });
    const schema = withSchema.config.outputSchema as {
      safeParse: (value: unknown) => { success: boolean };
    };
    expect(schema.safeParse({ a: "x" }).success).toBe(true);
    expect(schema.safeParse({ a: 1 }).success).toBe(false);
    expect(register("kb_query", handler, tools).config).not.toHaveProperty(
      "outputSchema",
    );
  });

  test("a call routed to another workspace returns that answer", async () => {
    const answer = { content: [], structuredContent: { from: "child" } };
    setWorkspaceRouter({
      route: async () => ({ kind: "remote", result: answer }),
    } as unknown as WorkspaceRouter);
    const handler = mock(async () => ({}));
    const { tools } = runtime();
    expect(await register("kb_query", handler, tools).call({})).toBe(
      answer as never,
    );
    expect(handler).not.toHaveBeenCalled();
  });
});

// implements REQ-kb-dependencies-git
describe("KB dependency scope", () => {
  const withKb = { type: "object", properties: { kb: { type: "string" } } };

  test("a kb call is answered by the dependency route, not this workspace", async () => {
    const answer = { content: [], structuredContent: { from: "dependency" } };
    const calls: unknown[][] = [];
    setWorkspaceRouter({
      routeKbDependency: async (...args: unknown[]) => {
        calls.push(args);
        return answer;
      },
      route: async () => {
        throw new Error("ordinary routing must not run");
      },
    } as unknown as WorkspaceRouter);
    const handler = mock(async () => ({}));
    const { tools } = runtime();
    const { call } = register("kb_search", handler, tools, {
      inputSchema: withKb,
    });
    expect(await call({ query: "q", kb: "billing" })).toBe(answer as never);
    expect(calls).toEqual([
      ["kb_search", "billing", { query: "q", kb: "billing" }],
    ]);
    expect(handler).not.toHaveBeenCalled();
  });

  test("without a router a kb call fails instead of reading this KB", async () => {
    const handler = mock(async () => ({}));
    const { tools } = runtime();
    const { call } = register("kb_search", handler, tools, {
      inputSchema: withKb,
    });
    await expect(call({ kb: "billing" })).rejects.toThrow(
      "KB dependency 'billing' can only be read through the Kibi MCP server's workspace router",
    );
    expect(handler).not.toHaveBeenCalled();
  });

  test("a tool without the kb input refuses a kb scope instead of acting on this KB", async () => {
    const route = mock(async () => ({ kind: "local", args: {} }));
    const routeKbDependency = mock(async () => ({}));
    setWorkspaceRouter({
      route,
      routeKbDependency,
    } as unknown as WorkspaceRouter);
    const { tools } = runtime();
    const handler = mock(async () => ({}));
    await expect(
      register("kb_upsert", handler, tools).call({
        id: "REQ-1",
        kb: "billing",
      }),
    ).rejects.toThrow(
      "kb_upsert does not take a kb scope: KB dependency 'billing' is read-only. Drop kb to act on this project's KB.",
    );
    await expect(
      register("kb_search", handler, tools, {
        inputSchema: { type: "object", properties: null },
      }).call({ kb: " billing " }),
    ).rejects.toThrow("KB dependency 'billing' is read-only");
    expect(handler).not.toHaveBeenCalled();
    expect(route).not.toHaveBeenCalled();
    expect(routeKbDependency).not.toHaveBeenCalled();
  });

  test("calls without a kb route as before", async () => {
    const answer = { content: [], structuredContent: { from: "child" } };
    const routed: unknown[] = [];
    setWorkspaceRouter({
      route: async (_name: string, args: unknown) => {
        routed.push(args);
        return { kind: "remote", result: answer };
      },
    } as unknown as WorkspaceRouter);
    const { tools } = runtime();
    const handler = mock(async () => ({}));
    await register("kb_upsert", handler, tools).call({ kb: " " });
    await register("kb_search", handler, tools, { inputSchema: withKb }).call({
      kb: " ",
    });
    await register("kb_search", handler, tools, { inputSchema: withKb }).call(
      {},
    );
    expect(routed).toEqual([{ kb: " " }, { kb: " " }, {}]);
  });
});

describe("operation runtime wiring", () => {
  test("the default spec, success hook, close and detached notice", async () => {
    const attachment = {
      kbBranch: "main",
      storePath: "/store",
      readOnly: { head: "abc", branchesAtHead: ["main"], notice: "read only" },
    };
    const opened: unknown[] = [];
    const operationRuntime: OperationRuntime = {
      open: mock(async (spec: unknown, options: { signal?: AbortSignal }) => {
        opened.push(spec);
        return {
          workspaceRoot: "/w",
          signal: options.signal,
          branchAttachment: attachment,
        };
      }) as never,
      afterSuccess: mock(async () => {}),
      close: mock(async () => {}),
    };
    const { tools } = runtime({ operationRuntime: operationRuntime as never });
    const result = await register(
      "kb_query",
      async () => ({ ok: true }),
      tools,
    ).call({});
    expect(opened).toHaveLength(1);
    const spec = opened[0] as Spec;
    expect(spec.name).toBe("kb_query");
    expect(spec.effects).toStrictEqual(["local-read"]);
    expect(spec.requiresProlog).toBe(false);
    const notice = detachedReadOnlyDiagnostic(attachment as never);
    expect(notice).toBeDefined();
    expect(
      (result.structuredContent.diagnostics as unknown[]).at(-1),
    ).toStrictEqual(notice);
    expect(operationRuntime.close).toHaveBeenCalledTimes(1);
    expect(operationRuntime.afterSuccess).not.toHaveBeenCalled();

    const write: Spec = {
      name: "kb_upsert",
      effects: ["kb-write"],
      requiresProlog: false,
      execute: async () => ({ ok: true }),
    };
    await register("kb_upsert", async () => undefined, tools, {
      spec: write,
    }).call({});
    expect(operationRuntime.afterSuccess).toHaveBeenCalledTimes(1);
    expect(
      (operationRuntime.afterSuccess as ReturnType<typeof mock>).mock
        .calls[0]?.[0],
    ).toBe(write);
  });

  test("a generated request id joins the tool, time and random suffix", async () => {
    const keys: string[] = [];
    class Recording extends Map<string, Promise<unknown>> {
      override set(key: string, value: Promise<unknown>) {
        keys.push(key);
        return super.set(key, value);
      }
    }
    const { tools } = runtime({ inFlightRequests: () => new Recording() });
    spies.push(spyOn(Math, "random").mockReturnValue(0.5));
    spies.push(spyOn(Date, "now").mockReturnValue(1000));
    const { call } = register("kb_query", async () => ({}), tools);
    await call({});
    await call({ _requestId: "mine" });
    await call({ _requestId: 7 });
    expect(keys).toStrictEqual(["kb_query-1000-i", "mine", "kb_query-1000-i"]);
  });
});

describe("logging and telemetry", () => {
  function errors() {
    const spy = spyOn(console, "error").mockImplementation(() => {});
    spy.mockClear();
    spies.push(spy);
    return () => spy.mock.calls.map((args) => args.map(String).join(" "));
  }

  test("the call is logged only in debug mode", async () => {
    clearEnv();
    const logs = errors();
    const { tools } = runtime();
    const { call } = register("kb_query", async () => ({}), tools);
    await call({ _requestId: "r", q: 1 });
    expect(logs().filter((line) => line.includes("Tool called"))).toStrictEqual(
      [],
    );
    process.env.KIBI_MCP_DEBUG = "1";
    await call({ _requestId: "r", q: 1 });
    expect(logs().filter((line) => line.includes("Tool called"))).toStrictEqual(
      [
        '[KIBI-MCP] Tool called: kb_query (requestId: r) with args: {"_requestId":"r","q":1}',
      ],
    );
  });

  test("a failure stack is logged only when the error has one", async () => {
    clearEnv();
    process.env.KIBI_MCP_DEBUG = "1";
    const logs = errors();
    const { tools } = runtime();
    const bare = Object.assign(new Error("bare"), { stack: "" });
    await failure(
      register(
        "kb_query",
        async () => {
          throw bare;
        },
        tools,
      ).call({}),
    );
    expect(logs().filter((line) => line.includes("stack:"))).toStrictEqual([]);
    await failure(
      register(
        "kb_query",
        async () => {
          throw Object.assign(new Error("full"), { stack: "at here" });
        },
        tools,
      ).call({}),
    );
    expect(logs().filter((line) => line.includes("stack:"))).toStrictEqual([
      "[KIBI-MCP] Tool kb_query stack: at here",
    ]);
  });

  test("telemetry records the outcome and the client", async () => {
    clearEnv();
    const record = spyOn(
      telemetry,
      "recordMcpToolTelemetry",
    ).mockImplementation(() => {});
    spies.push(record);
    spies.push(spyOn(console, "error").mockImplementation(() => {}));
    const { tools } = runtime();
    const server = {
      server: { getClientVersion: () => ({ name: "Some Host" }) },
    };
    await register("kb_query", async () => ({ ok: true }), tools, {
      server,
    }).call({});
    await register("kb_query", async () => ({ status: "rejected" }), tools, {
      server,
    }).call({});
    await failure(
      register(
        "kb_query",
        async () => {
          throw new Error("x");
        },
        tools,
      ).call({}),
    );
    const calls = record.mock.calls.map(
      ([entry]) => entry as Record<string, unknown>,
    );
    expect(calls.map((entry) => entry.status)).toStrictEqual([
      "success",
      "error",
      "error",
    ]);
    expect(calls.map((entry) => entry.clientName)).toStrictEqual([
      "some-host",
      "some-host",
      undefined,
    ]);
  });

  test("without diagnostic mode a failure writes no usage", async () => {
    spies.push(spyOn(console, "error").mockImplementation(() => {}));
    const { tools, usage } = runtime();
    await failure(
      register(
        "kb_query",
        async () => {
          throw new Error("x");
        },
        tools,
      ).call({}),
    );
    expect(usage).toStrictEqual([]);
  });

  test("a vanished install says to restart the server", async () => {
    spies.push(spyOn(console, "error").mockImplementation(() => {}));
    const { tools } = runtime();
    const cases: Array<[Error, string]> = [
      [
        Object.assign(new Error("gone"), { code: "ERR_MODULE_NOT_FOUND" }),
        STALE_HINT,
      ],
      [
        Object.assign(new Error("gone"), { code: "MODULE_NOT_FOUND" }),
        STALE_HINT,
      ],
      [new Error("Cannot find package 'x'"), STALE_HINT],
      [new Error("Cannot find module 'y'"), STALE_HINT],
      [Object.assign(new Error("gone"), { code: "OTHER" }), ""],
    ];
    for (const [error, hint] of cases) {
      const message = await failure(
        register(
          "kb_query",
          async () => {
            throw error;
          },
          tools,
        ).call({}),
      );
      expect(message).toBe(`Tool kb_query failed: ${error.message}${hint}`);
    }
  });

  test("a read stopped at its engine limit says which limit", async () => {
    const { tools } = runtime();
    const limitExceeded = { kind: "time", limit: 5 };
    const result = await register(
      "kb_query",
      async () => {
        throw Object.assign(new Error("limit hit"), {
          code: QUERY_LIMIT_EXCEEDED_CODE,
          limitExceeded,
        });
      },
      tools,
    ).call({});
    const envelope = toKibiResult(
      { name: "kb_query", effects: ["local-read"] },
      null,
      {
        status: "error",
        error: {
          code: QUERY_LIMIT_EXCEEDED_CODE,
          message: "limit hit",
          retryable: false,
          details: { limitExceeded },
        },
      },
    );
    expect(result).toStrictEqual({
      content: [{ type: "text", text: JSON.stringify(envelope) }],
      structuredContent: envelope,
      isError: true,
    } as never);
  });
});
