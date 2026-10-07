// implements REQ-mcp-apply-plan-async-preflight
import { afterEach, describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../../src/diagnostics.js";
import { resetJobsForTests } from "../../src/server/jobs.js";
import type { ToolsRuntime } from "../../src/server/tool-types.js";
import { registerAllTools } from "../../src/server/tools.js";
import { TOOLS } from "../../src/tools-config.js";

type Extra = {
  _meta?: { progressToken?: string | number };
  sendNotification?: (notification: {
    method: string;
    params: Record<string, unknown>;
  }) => Promise<void>;
};
type Handler = (
  args: Record<string, unknown>,
  extra?: Extra,
) => Promise<unknown>;

type ApplyCall = {
  args: Record<string, unknown>;
  hadProgress: boolean;
};

function createHarness(actions: number) {
  const handlers = new Map<string, Handler>();
  const calls: ApplyCall[] = [];
  const server = {
    registerTool: (name: string, _config: unknown, handler: Handler) => {
      handlers.set(name, handler);
    },
  } as unknown as McpServer;
  const operationRuntime = {
    open: async (_spec: unknown, options: Record<string, unknown> = {}) => ({
      workspaceRoot: "/tmp/kibi-apply-progress-harness",
      signal: new AbortController().signal,
      clock: () => new Date(0),
      ...options,
    }),
    close: async () => undefined,
    afterSuccess: async () => undefined,
    sessionProlog: () => ({}),
  };
  const runtime = {
    diagnosticModeEnabled: () => false,
    appendUsageLogLine,
    classifyDiagnosticError,
    deriveDiagnosticFields,
    extractToolCallPayload,
    tools: [...TOOLS],
    activeBranchName: async () => "harness",
    ensureProlog: async () => ({}),
    resetProlog: async () => undefined,
    inFlightRequests: async () => new Map<string, Promise<unknown>>(),
    isShuttingDown: async () => false,
    prologProcess: async () => null,
    operationRuntime,
    handleKbApplyPlan: async (
      args: Record<string, unknown>,
      context: {
        onProgress?: (row: {
          progress: number;
          total?: number;
          message?: string;
        }) => void;
      },
    ) => {
      calls.push({ args, hadProgress: context.onProgress !== undefined });
      for (let index = 0; index <= actions; index += 1) {
        context.onProgress?.({
          progress: index,
          total: actions,
          message: `action ${index}`,
        });
      }
      return {
        content: [{ type: "text", text: "Applied bootstrap plan." }],
        structuredContent: {
          version: "kibi.plan-apply-result.v1",
          outcome: "applied",
          planHash: "a".repeat(64),
          actionResults: [],
          changedEntities: actions,
          changedRelationships: 0,
          changedPaths: [],
          finalSnapshots: {},
          validationSummary: {},
          recoveryJournalId: null,
        },
      };
    },
  } as unknown as ToolsRuntime<unknown>;
  registerAllTools(server, runtime);
  const handler = handlers.get("kb_apply_plan");
  if (!handler) throw new Error("kb_apply_plan was not registered");
  return { handler, calls };
}

const previousOptional = process.env.KIBI_MCP_OPTIONAL_TOOLS;
afterEach(() => {
  if (previousOptional === undefined)
    Reflect.deleteProperty(process.env, "KIBI_MCP_OPTIONAL_TOOLS");
  else process.env.KIBI_MCP_OPTIONAL_TOOLS = previousOptional;
  resetJobsForTests();
});

describe("kb_apply_plan async preflight over MCP", () => {
  const bootstrapPlan = {
    version: "kibi.bootstrap-plan.v1",
    status: "ready",
    planHash: "b".repeat(64),
    actions: [],
  };

  for (const [label, extra, message] of [
    ["a missing approvedPlanHash", {}, "approvedPlanHash must be"],
    [
      "a malformed approvedPlanHash",
      { approvedPlanHash: "not-a-hash" },
      "approvedPlanHash must be",
    ],
    [
      "an approvedPlanHash that differs from planHash",
      { approvedPlanHash: "c".repeat(64) },
      "approvedPlanHash does not match planHash",
    ],
  ] as const) {
    test(`async:true with ${label} fails the call itself and starts no job`, async () => {
      process.env.KIBI_MCP_OPTIONAL_TOOLS = "kb_job_status";
      const { handler, calls } = createHarness(1);
      let failure: unknown;
      try {
        await handler({ plan: bootstrapPlan, ...extra, async: true });
      } catch (error) {
        failure = error;
      }
      expect(String(failure)).toContain(message);
      // No detached job ran the apply.
      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(calls).toEqual([]);
    });
  }
});
