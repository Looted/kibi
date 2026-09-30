import { describe, expect, test } from "bun:test";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import {
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../../src/diagnostics.js";
import type { ToolHandler, ToolsRuntime } from "../../src/server/tool-types.js";
import { registerAllTools } from "../../src/server/tools.js";
import { TOOLS } from "../../src/tools-config.js";

/**
 * These tests drive the same registration path production uses, because the
 * fabricated-zero telemetry bug lived at the boundary between the tool wrapper
 * and the usage logger.  Helper-level tests that hand the logger a correctly
 * wrapped fixture passed throughout the period every real MCP row recorded a
 * count of zero, so the payload must arrive here the way `addTool` sends it.
 */

type LoggedRow = Record<string, unknown>;

type Handlers = Map<string, ToolHandler>;

function createHarness(
  handle: (toolName: string, args: Record<string, unknown>) => unknown,
): { handlers: Handlers; rows: LoggedRow[] } {
  const handlers: Handlers = new Map();
  const rows: LoggedRow[] = [];

  const server = {
    registerTool: (name: string, _config: unknown, handler: ToolHandler) => {
      handlers.set(name, handler);
    },
  } as unknown as McpServer;

  const operationRuntime = {
    open: async () => ({ workspaceRoot: "/tmp/kibi-telemetry-harness" }),
    close: async () => undefined,
    afterSuccess: async () => undefined,
    sessionProlog: () => ({}),
  };

  const runtime = {
    diagnosticModeEnabled: () => true,
    appendUsageLogLine: (entry: LoggedRow) => {
      rows.push(entry);
    },
    classifyDiagnosticError,
    deriveDiagnosticFields,
    extractToolCallPayload,
    tools: [...TOOLS],
    activeBranchName: async () => "telemetry-harness",
    ensureProlog: async () => ({}),
    resetProlog: async () => undefined,
    inFlightRequests: async () => new Map<string, Promise<unknown>>(),
    isShuttingDown: async () => false,
    prologProcess: async () => null,
    operationRuntime,
    handleKbCheck: (_prolog: unknown, args: Record<string, unknown>) =>
      handle("kb_check", args),
    handleKbCoverage: () => handle("kb_coverage", {}),
    handleKbDelete: () => handle("kb_delete", {}),
    handleKbFindGaps: () => handle("kb_find_gaps", {}),
    handleKbGraph: () => handle("kb_graph", {}),
    handleSparql: () => handle("kb_sparql_remote", {}),
    handleKbQuery: (_prolog: unknown, args: Record<string, unknown>) =>
      handle("kb_query", args),
    handleKbSearch: (_prolog: unknown, args: Record<string, unknown>) =>
      handle("kb_search", args),
    handleKbStatus: () => handle("kb_status", {}),
    handleKbSemanticAdvisor: (args: Record<string, unknown>) =>
      handle("kb_semantic_advisor", args),
    handleKbSkillsList: () => handle("kb_skills_list", {}),
    handleKbSkillsLoad: () => handle("kb_skills_load", {}),
    handleKbSkillsRead: () => handle("kb_skills_read", {}),
    handleKbUpsert: (_prolog: unknown, args: Record<string, unknown>) =>
      handle("kb_upsert", args),
    handleKbValidateUpsert: (_prolog: unknown, args: Record<string, unknown>) =>
      handle("kb_validate_upsert", args),
    handleKbModelRequirement: () => handle("kb_model_requirement", {}),
    handleKbSuggestPredicates: () => handle("kb_suggest_predicates", {}),
    handleKbPlanBootstrap: () => handle("kb_plan_bootstrap", {}),
  } as unknown as ToolsRuntime<unknown>;

  registerAllTools(server, runtime);
  return { handlers, rows };
}

async function callTool(
  handlers: Handlers,
  name: string,
  args: Record<string, unknown> = {},
): Promise<void> {
  const handler = handlers.get(name);
  if (!handler) throw new Error(`tool ${name} was not registered`);
  await handler(args);
}

describe("diagnostic usage telemetry through the registration path", () => {
  test("records the true search result count", async () => {
    const { handlers, rows } = createHarness(() => ({
      results: [{ id: "REQ-a" }, { id: "REQ-b" }, { id: "REQ-c" }],
      count: 3,
    }));

    await callTool(handlers, "kb_search", { query: "checkout" });

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tool: "kb_search",
      status: "success",
      result_count: 3,
      zero_results: false,
      result_summary: "3 results",
      protocol_version: 1,
      result_status: "success",
    });
  });

  test("records the true exact-lookup result count", async () => {
    const { handlers, rows } = createHarness(() => ({
      results: [{ id: "REQ-a" }],
      count: 1,
    }));

    await callTool(handlers, "kb_query", { id: "REQ-a" });

    expect(rows[0]).toMatchObject({
      tool: "kb_query",
      result_count: 1,
      zero_results: false,
      result_version: "kibi.kb_query.v1",
    });
  });

  test("records the true check violation count", async () => {
    const { handlers, rows } = createHarness(() => ({
      violations: Array.from({ length: 7 }, (_, index) => ({
        rule: `rule-${index}`,
      })),
      count: 7,
    }));

    await callTool(handlers, "kb_check", { rules: ["orphan-symbols"] });

    expect(rows[0]).toMatchObject({
      tool: "kb_check",
      violation_count: 7,
      requested_rules: ["orphan-symbols"],
      result_summary: "7 violations",
    });
  });

  test("records an advisor receipt", async () => {
    const { handlers, rows } = createHarness(() => ({
      receipt: {
        logic_readiness: "ready",
        candidate_lane: "strict",
        suggestions: [{ kind: "predicate" }],
        suggested_next_tools: ["kb_upsert"],
      },
    }));

    await callTool(handlers, "kb_semantic_advisor", { text: "must retain" });

    expect(rows[0]).toMatchObject({
      tool: "kb_semantic_advisor",
      semantic_logic_readiness: "ready",
      semantic_candidate_lane: "strict",
      semantic_suggestion_kinds: ["predicate"],
      result_summary: "semantic advisor ready via strict",
    });
  });

  test("preserves supplied session and actor identifiers", async () => {
    const { handlers, rows } = createHarness(() => ({ results: [], count: 0 }));

    await callTool(handlers, "kb_search", {
      query: "checkout",
      _diagnostic_telemetry: {
        is_autonomous: true,
        session_id: "session-1",
        actor_id: "actor-1",
      },
    });

    expect(rows[0]).toMatchObject({
      telemetry_status: "provided",
      session_id: "session-1",
      actor_id: "actor-1",
      result_count: 0,
      zero_results: true,
    });
  });

  test("records an unreadable payload as unknown rather than zero", async () => {
    const { handlers, rows } = createHarness(() => "not-a-payload");

    await callTool(handlers, "kb_search", { query: "checkout" });

    expect(rows[0]).toMatchObject({
      result_count: null,
      result_summary: "results count unavailable",
    });
    expect(rows[0]).not.toHaveProperty("zero_results");
  });

  test("records a failed call without claiming an empty result", async () => {
    const { handlers, rows } = createHarness(() => {
      throw new Error("engine connection closed");
    });

    await expect(
      callTool(handlers, "kb_search", { query: "checkout" }),
    ).rejects.toThrow("engine connection closed");

    expect(rows[0]).toMatchObject({
      tool: "kb_search",
      status: "error",
      error_message: "engine connection closed",
    });
    expect(rows[0]).not.toHaveProperty("result_count");
    expect(rows[0]).not.toHaveProperty("zero_results");
  });
});
