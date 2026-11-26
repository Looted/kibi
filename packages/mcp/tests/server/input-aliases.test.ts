import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { searchSpec } from "kibi-cli/operations";
import type { PrologPort } from "kibi-cli/operations/runtime-types";
import type { RuntimeOperationSpec } from "kibi-runtime";

import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";
import type { ToolsRuntime } from "../../src/server/tools.js";
import { addTool } from "../../src/server/tools.js";

/**
 * kb_search over MCP runs a `question` as its `query`, the same way the CLI
 * JSON route does, so an agent that guesses the field's name before the
 * schema is in its prompt is answered instead of refused.
 */
type Handler = (args: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  structuredContent: Record<string, unknown>;
  isError?: boolean;
}>;

function tools(): ToolsRuntime<unknown> {
  return {
    diagnosticModeEnabled: () => false,
    appendUsageLogLine: () => {},
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
  } as unknown as ToolsRuntime<unknown>;
}

function registerSearch(seen: Record<string, unknown>[]): Handler {
  let wrapped: Handler | undefined;
  const server = {
    registerTool: (_name: string, _config: unknown, h: Handler) => {
      wrapped = h;
    },
  } as unknown as McpServer;
  const spec: RuntimeOperationSpec<Record<string, unknown>, unknown> = {
    name: "kb_search",
    effects: ["kb-read"],
    requiresProlog: false,
    execute: async (args) => {
      seen.push(args);
      return { results: [] };
    },
  };
  addTool(
    server,
    "kb_search",
    "d",
    { type: "object" },
    (async () => undefined) as never,
    tools(),
    spec,
    undefined,
    undefined,
    searchSpec.businessInputSchema,
  );
  if (!wrapped) throw new Error("not registered");
  return wrapped;
}

describe("MCP input aliases", () => {
  test("kb_search runs a question as its query", async () => {
    const seen: Record<string, unknown>[] = [];
    const result = await registerSearch(seen)({
      question: "workspace label limit",
      limit: 3,
    });
    expect(result.isError).toBeUndefined();
    expect(seen).toStrictEqual([{ query: "workspace label limit", limit: 3 }]);
  });

  test("kb_search refuses a question given beside a query", async () => {
    const seen: Record<string, unknown>[] = [];
    const result = await registerSearch(seen)({
      query: "labels",
      question: "workspace label limit",
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent.error).toMatchObject({
      code: "VALIDATION_FAILED",
      message: "/ must NOT have additional properties: question",
    });
    expect(seen).toStrictEqual([]);
  });
});
