import { afterEach, describe, expect, mock, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrologPort } from "kibi-cli/operations/runtime-types";
import type { RuntimeOperationSpec } from "kibi-runtime";

import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";
import type { ToolsRuntime } from "../../src/server/tools.js";
import { addTool } from "../../src/server/tools.js";
import {
  type WorkspaceMismatchDiagnostic,
  type WorkspaceRouter,
  setWorkspaceRouter,
} from "../../src/server/workspace-router.js";

type Handler = (args: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  structuredContent: Record<string, unknown>;
  isError?: boolean;
}>;

const TIMEOUT_ENV = "KIBI_MCP_TOOL_TIMEOUT_MS";
const previousTimeout = process.env[TIMEOUT_ENV];
afterEach(() => {
  setWorkspaceRouter(undefined);
  if (previousTimeout === undefined)
    Reflect.deleteProperty(process.env, TIMEOUT_ENV);
  else process.env[TIMEOUT_ENV] = previousTimeout;
});

function runtime(overrides: Partial<ToolsRuntime<unknown>> = {}) {
  const usage: Record<string, unknown>[] = [];
  const base = {
    diagnosticModeEnabled: () => false,
    appendUsageLogLine: (entry: Record<string, unknown>) => {
      usage.push(entry);
    },
    classifyDiagnosticError: (error: unknown) => ({
      error_name: "Error",
      error_message: error instanceof Error ? error.message : String(error),
      error_category: "handler_error",
      error_stage: "handler",
      error_summary: "failed",
    }),
    deriveDiagnosticFields: () => ({ result_summary: "summary" }),
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
    operationRuntime: createMcpRuntime<unknown>({
      workspaceRoot: "/workspace",
      activeBranchName: () => "main",
      attachedBranchKbPath: () => null,
      refreshAttachedBranchStamp: async () => {},
      ensureProlog: async () => ({}),
      adaptProlog: (): PrologPort => ({
        query: async () => ({ success: true, bindings: {} }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      }),
    }),
    ...overrides,
  } as unknown as ToolsRuntime<unknown>;
  return { runtime: base, usage };
}

function register(
  name: string,
  handler: (args: Record<string, unknown>) => Promise<unknown>,
  tools: ToolsRuntime<unknown>,
  spec?: RuntimeOperationSpec<Record<string, unknown>, unknown>,
): Handler {
  let wrapped: Handler | undefined;
  const server = {
    registerTool: (_name: string, _config: unknown, h: Handler) => {
      wrapped = h;
    },
  } as unknown as McpServer;
  addTool(server, name, "d", { type: "object" }, handler as never, tools, spec);
  if (!wrapped) throw new Error("not registered");
  return wrapped;
}

describe("addTool, exact", () => {
  test("without a router the routing-only workspaceRoot is dropped, except for kb_check", async () => {
    const seen: Record<string, unknown>[] = [];
    const handler = async (args: Record<string, unknown>) => {
      seen.push(args);
      return { ok: true };
    };
    const { runtime: tools } = runtime();
    await register("kb_query", handler, tools)({ workspaceRoot: "/w", q: 1 });
    await register("kb_check", handler, tools)({ workspaceRoot: "/w", q: 2 });
    await register("kb_query", handler, tools)({ q: 3 });
    expect(seen).toStrictEqual([
      { q: 1 },
      { workspaceRoot: "/w", q: 2 },
      { q: 3 },
    ]);
  });

  test("a routing notice is appended to the result diagnostics", async () => {
    const notice: WorkspaceMismatchDiagnostic = {
      code: "workspace_mismatch",
      severity: "warning",
      message: "answered elsewhere",
      detail: {
        requested: "/a",
        resolved: null,
        answeredFrom: "/b",
        reason: "not_a_kibi_workspace",
      },
    };
    setWorkspaceRouter({
      route: async (_name: string, args: Record<string, unknown>) => ({
        kind: "local",
        args,
        notice,
      }),
    } as unknown as WorkspaceRouter);
    const { runtime: tools } = runtime();
    const result = await register(
      "kb_query",
      async () => ({ ok: true }),
      tools,
    )({});
    const diagnostics = result.structuredContent.diagnostics as unknown[];
    expect(diagnostics.at(-1)).toStrictEqual(notice);
  });

  test("a coded error answers with the coded error envelope", async () => {
    const { runtime: tools } = runtime();
    const failure = Object.assign(new Error("ignored"), {
      name: "OperationError",
      code: "VALIDATION_FAILED",
      detail: "the payload is bad",
      retryable: false,
    });
    const result = await register(
      "kb_query",
      async () => {
        throw failure;
      },
      tools,
    )({});
    expect(result.isError).toBe(true);
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Tool kb_query failed: [VALIDATION_FAILED] the payload is bad",
      },
    ]);
    expect(result.structuredContent.status).toBe("error");
    expect(result.structuredContent.error).toMatchObject({
      code: "VALIDATION_FAILED",
      message: "the payload is bad",
      retryable: false,
    });
  });

  test("a coded error keeps the routing notice", async () => {
    const notice = {
      code: "workspace_mismatch",
      severity: "warning",
      message: "m",
      detail: {
        requested: "/a",
        resolved: "/c",
        answeredFrom: "/b",
        reason: "pinned",
      },
    };
    setWorkspaceRouter({
      route: async (_name: string, args: Record<string, unknown>) => ({
        kind: "local",
        args,
        notice,
      }),
    } as unknown as WorkspaceRouter);
    const { runtime: tools } = runtime();
    const result = await register(
      "kb_query",
      async () => {
        throw Object.assign(new Error("x"), {
          name: "InputError",
          code: "INVALID_INPUT",
          detail: "bad input",
          retryable: true,
        });
      },
      tools,
    )({});
    expect(
      (result.structuredContent.diagnostics as unknown[]).at(-1),
    ).toStrictEqual(notice);
  });

  test("a wedged mutation resets the engine and records the reset in usage", async () => {
    process.env[TIMEOUT_ENV] = "20";
    for (const [reset, expected] of [
      [
        async () => {},
        { reset_attempted: true, reset_succeeded: true, reset_error: null },
      ],
      [
        async () => {
          throw new Error("reset broke");
        },
        {
          reset_attempted: true,
          reset_succeeded: false,
          reset_error: "reset broke",
        },
      ],
      [
        () => Promise.reject("plain"),
        { reset_attempted: true, reset_succeeded: false, reset_error: "plain" },
      ],
    ] as const) {
      const resetProlog = mock(reset);
      const { runtime: tools, usage } = runtime({
        diagnosticModeEnabled: () => true,
        resetProlog,
      });
      const spec: RuntimeOperationSpec<Record<string, unknown>, unknown> = {
        name: "kb_delete",
        effects: ["kb-write"],
        requiresProlog: false,
        execute: () => new Promise(() => {}),
      };
      const result = await register(
        "kb_delete",
        async () => undefined,
        tools,
        spec,
      )({ ids: ["X"] });
      expect(resetProlog).toHaveBeenCalledWith("tool timeout: kb_delete");
      expect(
        (result.structuredContent.error as Record<string, unknown>).code,
      ).toBe("MUTATION_OUTCOME_UNKNOWN");
      expect(usage).toHaveLength(1);
      expect(usage[0]).toMatchObject(expected);
    }
  }, 20_000);

  test("a mutation that settles soon after the timeout is not reset", async () => {
    process.env[TIMEOUT_ENV] = "20";
    const resetProlog = mock(async () => {});
    const { runtime: tools } = runtime({ resetProlog });
    const spec: RuntimeOperationSpec<Record<string, unknown>, unknown> = {
      name: "kb_delete",
      effects: ["workspace-write"],
      requiresProlog: false,
      execute: (_input, context) =>
        new Promise((resolve) => {
          context.signal?.addEventListener("abort", () =>
            setTimeout(() => resolve({ late: true }), 30),
          );
        }),
    };
    await register("kb_delete", async () => undefined, tools, spec)({});
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(resetProlog).not.toHaveBeenCalled();
  });
});
