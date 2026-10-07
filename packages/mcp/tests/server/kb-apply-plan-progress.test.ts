// implements REQ-bootstrap-apply-long-running
import { afterEach, describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import Ajv2020 from "ajv/dist/2020";

import {
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../../src/diagnostics.js";
import { getJob, resetJobsForTests } from "../../src/server/jobs.js";
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

describe("kb_apply_plan over MCP for long plans", () => {
  test("forwards per-action progress as notifications/progress for a progressToken", async () => {
    const { handler, calls } = createHarness(3);
    const sent: Array<{ method: string; params: Record<string, unknown> }> = [];
    await handler(
      { recoveryJournalId: "bootstrap-0123456789abcdef" },
      {
        _meta: { progressToken: "apply-1" },
        sendNotification: async (notification) => {
          sent.push(notification);
        },
      },
    );
    expect(calls[0]?.hadProgress).toBe(true);
    expect(sent.map((row) => row.method)).toEqual(
      Array(4).fill("notifications/progress"),
    );
    expect(sent.map((row) => row.params.progress)).toEqual([0, 1, 2, 3]);
    expect(sent.every((row) => row.params.progressToken === "apply-1")).toBe(
      true,
    );
    expect(sent.every((row) => row.params.total === 3)).toBe(true);
  });

  test("sends no progress without a progressToken", async () => {
    const { handler, calls } = createHarness(2);
    const sent: unknown[] = [];
    await handler(
      { recoveryJournalId: "bootstrap-0123456789abcdef" },
      {
        sendNotification: async (notification) => {
          sent.push(notification);
        },
      },
    );
    expect(calls[0]?.hadProgress).toBe(false);
    expect(sent).toEqual([]);
  });

  test("async:true returns a kibi.job.v1 receipt and the job holds the apply result", async () => {
    process.env.KIBI_MCP_OPTIONAL_TOOLS = "kb_job_status";
    const { handler, calls } = createHarness(2);
    const result = (await handler({
      recoveryJournalId: "bootstrap-0123456789abcdef",
      async: true,
    })) as { structuredContent: { data: Record<string, unknown> } };
    const receipt = result.structuredContent.data;
    expect(receipt).toMatchObject({
      jobVersion: "kibi.job.v1",
      tool: "kb_apply_plan",
      status: "running",
      pollWith: "kb_job_status",
    });
    const tool = TOOLS.find((candidate) => candidate.name === "kb_apply_plan");
    const validate = new Ajv2020({ strict: false }).compile(
      tool?.outputSchema as Record<string, unknown>,
    );
    expect(validate(result.structuredContent)).toBe(true);
    const jobId = String(receipt.jobId);
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if (getJob(jobId)?.status !== "running") break;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
    const job = getJob(jobId);
    expect(job?.status).toBe("succeeded");
    expect(
      (job?.result as { structuredContent: { outcome: string } })
        .structuredContent.outcome,
    ).toBe("applied");
    // The job runs without the finished request's progress channel and
    // never sees the async flag.
    expect(calls[0]?.hadProgress).toBe(false);
    expect(calls[0]?.args).toEqual({
      recoveryJournalId: "bootstrap-0123456789abcdef",
    });
  });

  test("async:true without kb_job_status applies synchronously", async () => {
    process.env.KIBI_MCP_OPTIONAL_TOOLS = "";
    const { handler } = createHarness(1);
    const result = (await handler({
      recoveryJournalId: "bootstrap-0123456789abcdef",
      async: true,
    })) as { structuredContent: { data: Record<string, unknown> } };
    expect(result.structuredContent.data.outcome).toBe("applied");
  });
});
