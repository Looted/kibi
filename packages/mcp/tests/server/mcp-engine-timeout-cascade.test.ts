// implements REQ-002
import { afterEach, describe, expect, mock, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "kibi-cli/public/branch-resolver";
import { EngineClient } from "kibi-runtime";
import {
  createTempDir,
  isolateKibiEnv,
  removeTempDir,
} from "../../../cli/tests/helpers/in-process-workspace.js";
import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";
import type { ToolsRuntime } from "../../src/server/tool-types.js";
import {
  _adaptPrologForTests,
  _resetSessionModulePromise,
  _setToolsServerDepsForTests,
} from "../../src/server/tools-runtime.js";
import { addTool } from "../../src/server/tools.js";

/**
 * Regression for the Align/Cursor cascade:
 * MCP timeout must abort via AbortSignal through adaptProlog → EngineClient
 * without resetProlog()/terminate(), so siblings do not see
 * "Kibi engine connection closed".
 */

type CapturedTool = {
  name: string;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
};

function createCapturingServer() {
  const registered: CapturedTool[] = [];
  const registerTool = (
    name: string,
    _config: unknown,
    handler: (args: Record<string, unknown>) => Promise<unknown>,
  ) => {
    registered.push({ name, handler });
  };
  return {
    registered,
    server: { registerTool } as never,
  };
}

function healthyStore(root: string, branch = "main"): void {
  const store = branchStorePath(root, branch);
  ensureBranchStoreManifest(root, branch);
  mkdirSync(path.join(store, "rdf"), { recursive: true });
  writeFileSync(path.join(store, "storage.json"), "{}\n");
  writeFileSync(path.join(store, "CURRENT"), "generation-abc:1\n");
}

describe("MCP EngineClient timeout cascade regression", () => {
  const restores: Array<() => void> = [];
  const roots: string[] = [];
  const engines: EngineClient[] = [];

  afterEach(async () => {
    for (const engine of engines.splice(0)) {
      await engine.stop().catch(() => undefined);
      await engine.terminate().catch(() => undefined);
    }
    for (const restore of restores.splice(0)) restore();
    for (const root of roots.splice(0)) removeTempDir(root);
    _setToolsServerDepsForTests({}, true);
    _resetSessionModulePromise();
    Reflect.deleteProperty(process.env, "KIBI_MCP_TOOL_TIMEOUT_MS");
  });

  test("timed-out MCP read cancels EngineClient without resetProlog or connection closed", async () => {
    restores.push(isolateKibiEnv());
    const root = createTempDir("kibi-mcp-engine-timeout-");
    roots.push(root);
    healthyStore(root);
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "300";

    const engine = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 30_000,
    });
    engines.push(engine);
    await engine.start();

    const resetProlog = mock(async (_reason: string) => {
      throw new Error("resetProlog must not run for read timeouts");
    });
    const inFlight = new Map<string, Promise<unknown>>();
    _setToolsServerDepsForTests(
      {
        getSessionModule: async () =>
          ({
            getActiveBranchName: () => "main",
            getAttachedBranchKbPath: () => branchStorePath(root, "main"),
            ensureProlog: async () => engine,
            resetProlog,
            inFlightRequests: inFlight,
            getIsShuttingDown: () => false,
            getPrologProcess: () => engine,
            updateAttachedBranchStamp: () => {},
          }) as never,
      },
      true,
    );

    const operationRuntime = createMcpRuntime<EngineClient>({
      workspaceRoot: root,
      activeBranchName: async () => "main",
      attachedBranchKbPath: async () => branchStorePath(root, "main"),
      ensureProlog: async () => engine,
      adaptProlog: (prolog) => _adaptPrologForTests(prolog as never),
      refreshAttachedBranchStamp: async () => {},
    });

    const runtime: ToolsRuntime<EngineClient> = {
      diagnosticModeEnabled: () => false,
      appendUsageLogLine: () => {},
      classifyDiagnosticError: () => ({
        error_name: "Error",
        error_message: "unused",
        error_category: "handler_error",
        error_stage: "handler",
        error_summary: "unused",
      }),
      deriveDiagnosticFields: () => ({}),
      extractToolCallPayload: (args) => ({
        businessArgs: args as Record<string, unknown>,
        telemetry: null,
      }),
      tools: [],
      activeBranchName: async () => "main",
      ensureProlog: async () => engine,
      resetProlog,
      inFlightRequests: async () => inFlight,
      isShuttingDown: async () => false,
      prologProcess: async () => engine,
      operationRuntime,
      handleKbCheck: async () => ({}) as never,
      handleKbCoverage: async () => ({}) as never,
      handleKbDelete: async () => ({}) as never,
      handleKbFindGaps: async () => ({}) as never,
      handleKbGraph: async () => ({}) as never,
      handleSparql: async () => ({}) as never,
      handleKbQuery: async () => ({}) as never,
      handleKbSearch: async () => ({}) as never,
      handleKbStatus: async () => ({}) as never,
      handleKbSemanticAdvisor: async () => ({}) as never,
      handleKbSkillsList: async () => ({}) as never,
      handleKbSkillsLoad: async () => ({}) as never,
      handleKbSkillsRead: async () => ({}) as never,
      handleKbUpsert: async () => ({}) as never,
      handleKbValidateUpsert: async () => ({}) as never,
      handleKbModelRequirement: async () => ({}) as never,
      handleKbSuggestPredicates: async () => ({}) as never,
      handleKbPlanBootstrap: async () => ({}) as never,
    };

    const { server, registered } = createCapturingServer();
    addTool(
      server,
      "slow_read",
      "slow read through EngineClient",
      {},
      async () => undefined,
      runtime,
      {
        name: "slow_read",
        effects: ["kb-read"],
        requiresProlog: true,
        execute: async (_input, context) => {
          const prolog = context.prolog;
          if (!prolog) throw new Error("expected session prolog");
          const result = await prolog.query(
            "aggregate_all(count, between(1, 80000000, _), C)",
            context.signal,
          );
          return {
            content: [{ type: "text", text: "slow done" }],
            structuredContent: { success: result.success },
          };
        },
      },
    );
    addTool(
      server,
      "sibling_read",
      "sibling read through shared EngineClient",
      {},
      async () => undefined,
      runtime,
      {
        name: "sibling_read",
        effects: ["kb-read"],
        requiresProlog: true,
        execute: async (_input, context) => {
          const prolog = context.prolog;
          if (!prolog) throw new Error("expected session prolog");
          const result = await prolog.query("true", context.signal);
          return {
            content: [{ type: "text", text: "sibling ok" }],
            structuredContent: { success: result.success },
          };
        },
      },
    );

    const slowTool = registered.find((tool) => tool.name === "slow_read");
    const siblingTool = registered.find((tool) => tool.name === "sibling_read");
    if (slowTool === undefined || siblingTool === undefined) {
      throw new Error("expected slow_read and sibling_read tools");
    }

    const slowPromise = slowTool.handler({ _requestId: "slow" });
    const slowError = await slowPromise.then(
      () => null,
      (error: unknown) =>
        error instanceof Error ? error.message : String(error),
    );
    // Timeout aborts the signal; EngineClient surfaces cancel (not connection closed).
    expect(slowError).toMatch(/timed out|cancelled|failed/i);
    expect(slowError).not.toMatch(/connection closed/i);
    expect(resetProlog).not.toHaveBeenCalled();

    // In-flight SWI goals are not interruptible; the sibling may wait behind
    // the aborted aggregate. Give it enough MCP budget so the shared engine
    // can finish and answer (proves no reset/terminate cascade).
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "60000";

    const sibling = await siblingTool.handler({ _requestId: "sibling" });
    expect(sibling).toMatchObject({
      content: [{ type: "text", text: "sibling ok" }],
    });
    expect(resetProlog).not.toHaveBeenCalled();

    const after = await engine.query("true");
    expect(after.success).toBe(true);
  }, 60_000);
});
