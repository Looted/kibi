// implements REQ-kibi-change-to-proof-plan-compiler-v2
import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../../src/diagnostics.js";
import type { ToolsRuntime } from "../../src/server/tool-types.js";
import { registerAllTools } from "../../src/server/tools.js";
import { TOOLS } from "../../src/tools-config.js";

type Handler = (args: Record<string, unknown>) => Promise<unknown>;

function harness(outcome: "refused" | "reconciliation_required"): Handler {
  const handlers = new Map<string, Handler>();
  const server = {
    registerTool: (name: string, _config: unknown, handler: Handler) => {
      handlers.set(name, handler);
    },
  } as unknown as McpServer;
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
    operationRuntime: {
      open: async (_spec: unknown, options: Record<string, unknown> = {}) => ({
        workspaceRoot: "/tmp/kibi-apply-refused-harness",
        signal: new AbortController().signal,
        clock: () => new Date(0),
        ...options,
      }),
      close: async () => undefined,
      afterSuccess: async () => undefined,
      sessionProlog: () => ({}),
    },
    handleKbApplyPlan: async () => ({
      content: [{ type: "text", text: "Refused migration plan." }],
      structuredContent: {
        version: "kibi.migration-apply-result.v1",
        outcome,
        planHash: "a".repeat(64),
        actionResults: [
          {
            actionId: "proof-integration-configure",
            outcome: "failed",
            detail:
              "Proof integration plan refused: .kb/proof/integrations.json already exists and this plan only creates it.",
          },
        ],
        finalSnapshots: {
          branch: "harness",
          kbSnapshotId: "stamp:test",
          workspaceSnapshot: "0".repeat(64),
        },
        notes: [],
        closeout: {
          taskOutcome: "blocked",
          kbState: "clean_fresh",
          snapshotState: "fresh",
          proofState: "not_evaluated",
          limitationDisposition: "not_applicable",
        },
      },
    }),
  } as unknown as ToolsRuntime<unknown>;
  registerAllTools(server, runtime);
  const handler = handlers.get("kb_apply_plan");
  if (!handler) throw new Error("kb_apply_plan was not registered");
  return handler;
}

describe("kb_apply_plan over MCP for a refused migration plan", () => {
  test("a plan refused before any change is an MCP error with MIGRATION_PLAN_REFUSED", async () => {
    const result = (await harness("refused")({
      recoveryJournalId: "bootstrap-0123456789abcdef",
    })) as {
      isError?: boolean;
      structuredContent: {
        status: string;
        error?: { code: string; message: string };
        data: { outcome: string };
      };
    };
    expect(result.isError).toBe(true);
    expect(result.structuredContent.status).toBe("error");
    expect(result.structuredContent.error?.code).toBe("MIGRATION_PLAN_REFUSED");
    expect(result.structuredContent.error?.message).toContain("already exists");
    expect(result.structuredContent.data.outcome).toBe("refused");
  });

  test("a failure that needs reconciliation stays a successful MCP result", async () => {
    const result = (await harness("reconciliation_required")({
      recoveryJournalId: "bootstrap-0123456789abcdef",
    })) as { isError?: boolean; structuredContent: { status: string } };
    expect(result.isError).toBeUndefined();
    expect(result.structuredContent.status).toBe("success");
  });
});
