import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import process from "node:process";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import type { DiagnosticErrorFields } from "../../src/diagnostics.js";
import {
  type ToolConfig,
  type ToolsRuntime,
  _resetSessionModulePromise,
  _setToolsServerDepsForTests,
  addTool,
  registerAllTools,
} from "../../src/server/tools.js";
import {
  TOOLS,
  withDiagnosticTelemetrySchema,
} from "../../src/tools-config.js";
import type { AutopilotGenerateArgs } from "../../src/tools/autopilot-generate.js";
import type { CheckArgs } from "../../src/tools/check.js";
import type { CoverageArgs } from "../../src/tools/coverage.js";
import type { DeleteArgs } from "../../src/tools/delete.js";
import type { FindGapsArgs } from "../../src/tools/find-gaps.js";
import type { GraphArgs } from "../../src/tools/graph.js";
import type { ModelRequirementArgs } from "../../src/tools/model-requirement.js";
import type { QueryArgs } from "../../src/tools/query.js";
import type { SearchArgs } from "../../src/tools/search.js";
import type { SemanticAdvisorArgs } from "../../src/tools/semantic-advisor.js";
import type {
  SkillsListArgs,
  SkillsLoadArgs,
  SkillsReadArgs,
} from "../../src/tools/skills.js";
import type { SparqlArgs } from "../../src/tools/sparql.js";
import type { StatusArgs } from "../../src/tools/status.js";
import type { SuggestPredicatesArgs } from "../../src/tools/suggest-predicates.js";
import type { UpsertArgs } from "../../src/tools/upsert.js";

type MockProlog = { kind: "mock-prolog" };
type SessionModule = typeof import("../../src/server/session.js");
type ToolHandlerLike = (args: Record<string, unknown>) => Promise<unknown>;

type RegisteredTool = {
  name: string;
  config: {
    description: string;
    inputSchema: {
      safeParse: (value: unknown) => { success: boolean };
    };
  };
  handler: ToolHandlerLike;
};

const TOOL_NAMES = [
  "kb_query",
  "kb_search",
  "kb_status",
  "kb_skills_list",
  "kb_skills_load",
  "kb_skills_read",
  "kb_find_gaps",
  "kb_coverage",
  "kb_graph",
  "kb_sparql_remote",
  "kb_semantic_advisor",
  "kb_upsert",
  "kb_validate_upsert",
  "kb_delete",
  "kb_check",
  "kb_model_requirement",
  "kb_suggest_predicates",
  "kb_autopilot_generate",
] as const;

function objectRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

test("kb_upsert schema advertises typed fact fields", () => {
  const upsert = TOOLS.find((tool) => tool.name === "kb_upsert");
  expect(upsert).toBeDefined();
  const inputSchema = objectRecord(upsert?.inputSchema);
  const rootProperties = objectRecord(inputSchema.properties);
  const propertiesSchema = objectRecord(rootProperties.properties);
  const entityProperties = objectRecord(propertiesSchema.properties);

  expect(entityProperties.fact_kind).toBeDefined();
  expect(entityProperties.subject_key).toBeDefined();
  expect(entityProperties.property_key).toBeDefined();
  expect(entityProperties.operator).toBeDefined();
  expect(entityProperties.value_type).toBeDefined();
  expect(entityProperties.value_string).toBeDefined();
  expect(entityProperties.value_int).toBeDefined();
  expect(entityProperties.value_number).toBeDefined();
  expect(entityProperties.value_bool).toBeDefined();
});

test("kb_upsert schema advertises typed test verification fields", () => {
  const upsert = TOOLS.find((tool) => tool.name === "kb_upsert");
  expect(upsert).toBeDefined();
  const inputSchema = objectRecord(upsert?.inputSchema);
  const rootProperties = objectRecord(inputSchema.properties);
  const propertiesSchema = objectRecord(rootProperties.properties);
  const entityProperties = objectRecord(propertiesSchema.properties);

  expect(entityProperties.verification_scope).toBeDefined();
  expect(entityProperties.verification_perspective).toBeDefined();
});

test("kb_semantic_advisor schema accepts prose without mutation fields", () => {
  const advisor = TOOLS.find((tool) => tool.name === "kb_semantic_advisor");
  expect(advisor).toBeDefined();
  const inputSchema = objectRecord(advisor?.inputSchema);
  const rootProperties = objectRecord(inputSchema.properties);

  expect(inputSchema.required).toEqual(["text"]);
  expect(rootProperties.text).toBeDefined();
  expect(rootProperties.type).toBeDefined();
  expect(rootProperties.id).toBeDefined();
  expect(rootProperties.source).toBeDefined();
});

test("withDiagnosticTelemetrySchema adds telemetry to tool schema immutably", () => {
  const tools = [
    {
      name: "test",
      description: "desc",
      inputSchema: {
        type: "object",
        properties: {
          key: { type: "string" },
        },
      },
    },
  ];

  const original = structuredClone(tools);
  const result = withDiagnosticTelemetrySchema(tools);

  expect(result).toHaveLength(1);
  expect(result).not.toBe(tools);
  expect(result[0]).not.toBe(tools[0]);
  expect(result[0].inputSchema).not.toBe(tools[0].inputSchema);
  expect(result[0].inputSchema.properties).toMatchObject({
    key: { type: "string" },
    _diagnostic_telemetry: {
      type: "object",
    },
  });
  expect(result[0].inputSchema.properties).toHaveProperty(
    "_diagnostic_telemetry.properties",
  );
  expect(result[0].inputSchema.properties).toHaveProperty("key");
  expect(tools[0].inputSchema.properties).not.toHaveProperty(
    "_diagnostic_telemetry",
  );
  expect(tools).toEqual(original);
});

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function createToolConfigs(): ToolConfig[] {
  return TOOL_NAMES.map((name) => ({
    name,
    description: `${name} description`,
    inputSchema: {
      type: "object",
      properties: {
        marker: { type: "string" },
      },
    },
  }));
}

function createSessionModuleMock(
  activeBranchName: string,
  trackedRequests = new Map<string, Promise<unknown>>(),
): SessionModule {
  return {
    activeBranchName,
    ensureProlog: async () => {
      throw new Error("ensureProlog should not be called in this test");
    },
    ensureBranchKbExists: (): void => {},
    inFlightRequests: trackedRequests,
    initiateGracefulShutdown: async (): Promise<void> => {},
    isShuttingDown: false,
    resetProlog: async (): Promise<void> => {},
    _setSessionDepsForTests: (): void => {},
    _resetSessionDepsForTests: (): void => {},
    prologProcess: null,
    resetSessionStateForTests: (): void => {},
    attachedBranchKbPath: null,
    updateAttachedBranchStamp: (): void => {},
  };
}

function createCapturingServer(): {
  server: McpServer;
  registered: RegisteredTool[];
  registerTool: ReturnType<typeof mock>;
} {
  const registered: RegisteredTool[] = [];
  const registerTool = mock(
    (
      name: string,
      config: RegisteredTool["config"],
      handler: ToolHandlerLike,
    ): void => {
      registered.push({ name, config, handler });
    },
  );

  return {
    server: { registerTool } as unknown as McpServer,
    registered,
    registerTool,
  };
}

function getRegisteredTool(
  registered: RegisteredTool[],
  name: string,
): RegisteredTool {
  const tool = registered.find((candidate) => candidate.name === name);
  if (!tool) {
    throw new Error(`Expected tool ${name} to be registered`);
  }
  return tool;
}

async function invokeTool(
  tool: RegisteredTool,
  args: unknown,
): Promise<unknown> {
  return (tool.handler as unknown as (value: unknown) => Promise<unknown>)(
    args,
  );
}

function restoreEnvVar(name: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, name);
    return;
  }
  process.env[name] = value;
}

function consoleCallsContain(
  consoleErrorSpy: ReturnType<typeof mock>,
  fragment: string,
): boolean {
  return (consoleErrorSpy.mock.calls as unknown[][]).some((call) =>
    call.some((entry) => String(entry).includes(fragment)),
  );
}

async function getRejectedError(promise: Promise<unknown>): Promise<Error> {
  const error = await promise.then(
    () => null,
    (caught: unknown) =>
      caught instanceof Error ? caught : new Error(String(caught)),
  );

  if (!error) {
    throw new Error("Expected promise to reject");
  }

  return error;
}

async function flushWrappedHandlerSetup(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function createRuntime() {
  const trackedRequests = new Map<string, Promise<unknown>>();
  const mockProlog: MockProlog = { kind: "mock-prolog" };
  const prologHandle = { getPid: () => 4321 };

  const diagnosticModeEnabled = mock((): boolean => false);
  const appendUsageLogLine = mock(
    (_entry: Record<string, unknown>): void => {},
  );
  const deriveDiagnosticFields = mock(
    (
      _tool: string,
      _args: Record<string, unknown>,
      _telemetry: Record<string, unknown> | null,
      _result: unknown,
    ): Record<string, unknown> => ({ result_summary: "mock summary" }),
  );
  const classifyDiagnosticError = mock(
    (error: unknown): DiagnosticErrorFields => {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        error_name: err.name,
        error_message: err.message,
        error_category: "handler_error",
        error_stage: "handler",
        error_summary: "Unhandled MCP handler error.",
      };
    },
  );
  const extractToolCallPayload = mock(
    (
      args: Record<string, unknown>,
    ): {
      businessArgs: Record<string, unknown>;
      telemetry: Record<string, unknown> | null;
    } => ({
      businessArgs: args,
      telemetry: null,
    }),
  );
  const activeBranchName = mock(async (): Promise<string> => "feature/test");
  const ensureProlog = mock(async (): Promise<MockProlog> => mockProlog);
  const inFlightRequests = mock(
    async (): Promise<Map<string, Promise<unknown>>> => trackedRequests,
  );
  const isShuttingDown = mock(async (): Promise<boolean> => false);
  const prologProcess = mock(
    async (): Promise<{ getPid: () => number } | null> => prologHandle,
  );
  const resetProlog = mock(async (_reason: string): Promise<void> => {});

  const handleKbCheck: ToolsRuntime<MockProlog>["handleKbCheck"] = mock(
    async (_prolog: MockProlog, args: CheckArgs): Promise<unknown> => ({
      tool: "kb_check",
      args,
    }),
  );
  const handleKbCoverage: ToolsRuntime<MockProlog>["handleKbCoverage"] = mock(
    async (_prolog: MockProlog, args: CoverageArgs): Promise<unknown> => ({
      tool: "kb_coverage",
      args,
    }),
  );
  const handleKbDelete: ToolsRuntime<MockProlog>["handleKbDelete"] = mock(
    async (_prolog: MockProlog, args: DeleteArgs): Promise<unknown> => ({
      tool: "kb_delete",
      args,
    }),
  );
  const handleKbFindGaps: ToolsRuntime<MockProlog>["handleKbFindGaps"] = mock(
    async (_prolog: MockProlog, args: FindGapsArgs): Promise<unknown> => ({
      tool: "kb_find_gaps",
      args,
    }),
  );
  const handleKbGraph: ToolsRuntime<MockProlog>["handleKbGraph"] = mock(
    async (_prolog: MockProlog, args: GraphArgs): Promise<unknown> => ({
      tool: "kb_graph",
      args,
    }),
  );
  const handleSparql: ToolsRuntime<MockProlog>["handleSparql"] = mock(
    async (_prolog: MockProlog, args: SparqlArgs): Promise<unknown> => ({
      tool: "kb_sparql_remote",
      args,
    }),
  );
  const handleKbQuery: ToolsRuntime<MockProlog>["handleKbQuery"] = mock(
    async (_prolog: MockProlog, args: QueryArgs): Promise<unknown> => ({
      tool: "kb_query",
      args,
    }),
  );
  const handleKbSearch: ToolsRuntime<MockProlog>["handleKbSearch"] = mock(
    async (_prolog: MockProlog, args: SearchArgs): Promise<unknown> => ({
      tool: "kb_search",
      args,
    }),
  );
  const handleKbStatus: ToolsRuntime<MockProlog>["handleKbStatus"] = mock(
    async (_prolog: MockProlog, args: StatusArgs): Promise<unknown> => ({
      tool: "kb_status",
      args,
    }),
  );
  const handleKbSemanticAdvisor: ToolsRuntime<MockProlog>["handleKbSemanticAdvisor"] =
    mock(
      async (args: SemanticAdvisorArgs): Promise<unknown> => ({
        tool: "kb_semantic_advisor",
        args,
      }),
    );
  const handleKbSkillsList: ToolsRuntime<MockProlog>["handleKbSkillsList"] =
    mock(
      async (args: SkillsListArgs): Promise<unknown> => ({
        tool: "kb_skills_list",
        args,
      }),
    );
  const handleKbSkillsLoad: ToolsRuntime<MockProlog>["handleKbSkillsLoad"] =
    mock(
      async (args: SkillsLoadArgs): Promise<unknown> => ({
        tool: "kb_skills_load",
        args,
      }),
    );
  const handleKbSkillsRead: ToolsRuntime<MockProlog>["handleKbSkillsRead"] =
    mock(
      async (args: SkillsReadArgs): Promise<unknown> => ({
        tool: "kb_skills_read",
        args,
      }),
    );
  const handleKbUpsert: ToolsRuntime<MockProlog>["handleKbUpsert"] = mock(
    async (_prolog: MockProlog, args: UpsertArgs): Promise<unknown> => ({
      tool: "kb_upsert",
      args,
    }),
  );
  const handleKbValidateUpsert: ToolsRuntime<MockProlog>["handleKbValidateUpsert"] =
    mock(
      async (args: UpsertArgs): Promise<unknown> => ({
        tool: "kb_validate_upsert",
        args,
      }),
    );
  const handleKbModelRequirement: ToolsRuntime<MockProlog>["handleKbModelRequirement"] =
    mock(
      async (
        _prolog: MockProlog,
        args: ModelRequirementArgs,
      ): Promise<unknown> => ({
        tool: "kb_model_requirement",
        args,
      }),
    );
  const handleKbSuggestPredicates: ToolsRuntime<MockProlog>["handleKbSuggestPredicates"] =
    mock(
      async (
        _prolog: MockProlog,
        args: SuggestPredicatesArgs,
      ): Promise<unknown> => ({
        tool: "kb_suggest_predicates",
        args,
      }),
    );
  const handleKbAutopilotGenerate: ToolsRuntime<MockProlog>["handleKbAutopilotGenerate"] =
    mock(
      async (
        _prolog: MockProlog,
        args: AutopilotGenerateArgs,
      ): Promise<unknown> => ({
        tool: "kb_autopilot_generate",
        args,
      }),
    );
  const runtime = {
    diagnosticModeEnabled,
    appendUsageLogLine,
    classifyDiagnosticError,
    deriveDiagnosticFields,
    extractToolCallPayload,
    tools: createToolConfigs(),
    activeBranchName,
    ensureProlog,
    inFlightRequests,
    isShuttingDown,
    resetProlog,
    prologProcess,
    handleKbCheck,
    handleKbCoverage,
    handleKbDelete,
    handleKbFindGaps,
    handleKbGraph,
    handleSparql,
    handleKbQuery,
    handleKbSearch,
    handleKbStatus,
    handleKbSemanticAdvisor,
    handleKbSkillsList,
    handleKbSkillsLoad,
    handleKbSkillsRead,
    handleKbUpsert,
    handleKbValidateUpsert,
    handleKbModelRequirement,
    handleKbSuggestPredicates,
    handleKbAutopilotGenerate,
  } satisfies ToolsRuntime<MockProlog>;

  return {
    runtime,
    trackedRequests,
    mockProlog,
    spies: {
      diagnosticModeEnabled,
      appendUsageLogLine,
      classifyDiagnosticError,
      deriveDiagnosticFields,
      extractToolCallPayload,
      activeBranchName,
      ensureProlog,
      inFlightRequests,
      isShuttingDown,
      resetProlog,
      prologProcess,
      handleKbCheck,
      handleKbCoverage,
      handleKbDelete,
      handleKbFindGaps,
      handleKbGraph,
      handleSparql,
      handleKbQuery,
      handleKbSearch,
      handleKbStatus,
      handleKbSemanticAdvisor,
      handleKbSkillsList,
      handleKbSkillsLoad,
      handleKbSkillsRead,
      handleKbUpsert,
      handleKbValidateUpsert,
      handleKbModelRequirement,
      handleKbSuggestPredicates,
      handleKbAutopilotGenerate,
    },
  };
}

describe.serial("server tools coverage", () => {
  let originalDebug: string | undefined;
  let originalConsoleError: typeof console.error;
  let consoleErrorSpy: ReturnType<typeof mock>;

  beforeEach(() => {
    originalDebug = process.env.KIBI_MCP_DEBUG;
    originalConsoleError = console.error;
    consoleErrorSpy = mock((..._args: unknown[]) => {});
    console.error = consoleErrorSpy as typeof console.error;
  });

  afterEach(() => {
    console.error = originalConsoleError;
    restoreEnvVar("KIBI_MCP_DEBUG", originalDebug);
    _setToolsServerDepsForTests({}, true);
  });

  test("addTool rejects non-object arguments before running the handler", async () => {
    const { runtime, spies } = createRuntime();
    const { server, registered, registerTool } = createCapturingServer();
    const handler = mock(
      async (_args: Record<string, unknown>): Promise<unknown> => ({
        ok: true,
      }),
    );

    addTool(
      server,
      "invalid_args_tool",
      "invalid args tool",
      {},
      handler,
      runtime,
    );

    expect(registerTool).toHaveBeenCalledTimes(1);
    const tool = getRegisteredTool(registered, "invalid_args_tool");
    expect(tool.config.description).toBe("invalid args tool");
    expect(tool.config.inputSchema.safeParse({ anything: true }).success).toBe(
      true,
    );

    const error = await getRejectedError(invokeTool(tool, "bad args"));

    expect(error.message).toBe(
      "Tool invalid_args_tool failed: Invalid arguments for tool invalid_args_tool: expected object, got string",
    );

    expect(handler).not.toHaveBeenCalled();
    expect(spies.isShuttingDown).not.toHaveBeenCalled();
    expect(spies.extractToolCallPayload).not.toHaveBeenCalled();
    expect(
      consoleCallsContain(consoleErrorSpy, "Error in tool invalid_args_tool:"),
    ).toBe(true);
  });

  test("addTool rejects null arguments before running the handler", async () => {
    const { runtime } = createRuntime();
    const { server, registered } = createCapturingServer();
    const handler = mock(
      async (_args: Record<string, unknown>): Promise<unknown> => ({
        ok: true,
      }),
    );

    addTool(server, "null_args_tool", "null args tool", {}, handler, runtime);

    const tool = getRegisteredTool(registered, "null_args_tool");

    const error = await getRejectedError(invokeTool(tool, null));

    expect(error.message).toBe(
      "Tool null_args_tool failed: Invalid arguments for tool null_args_tool: expected object, got object",
    );

    expect(handler).not.toHaveBeenCalled();
  });

  test("addTool rejects requests while the server is shutting down", async () => {
    const { runtime, spies, trackedRequests } = createRuntime();
    const { server, registered } = createCapturingServer();
    const handler = mock(
      async (_args: Record<string, unknown>): Promise<unknown> => ({
        ok: true,
      }),
    );

    spies.isShuttingDown.mockImplementation(async () => true);

    addTool(server, "shutdown_tool", "shutdown tool", {}, handler, runtime);

    const tool = getRegisteredTool(registered, "shutdown_tool");

    const error = await getRejectedError(invokeTool(tool, { marker: "stop" }));

    expect(error.message).toBe(
      "Tool shutdown_tool failed: Tool shutdown_tool rejected: server is shutting down",
    );

    expect(handler).not.toHaveBeenCalled();
    expect(trackedRequests.size).toBe(0);
    expect(
      consoleCallsContain(consoleErrorSpy, "server is shutting down"),
    ).toBe(true);
  });

  test("addTool passes args directly and cleans up in-flight requests when diagnostics are disabled", async () => {
    const { runtime, spies, trackedRequests } = createRuntime();
    const { server, registered } = createCapturingServer();
    const deferred = createDeferred<{ ok: true }>();
    const handler = mock(
      (_args: Record<string, unknown>): Promise<{ ok: true }> =>
        deferred.promise,
    );

    addTool(server, "plain_tool", "plain tool", {}, handler, runtime);

    const tool = getRegisteredTool(registered, "plain_tool");
    const args = { marker: "plain" };
    const callPromise = invokeTool(tool, args);

    await flushWrappedHandlerSetup();

    expect(spies.extractToolCallPayload).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(args);
    expect(trackedRequests.size).toBe(1);

    const entries = Array.from(trackedRequests.entries());
    expect(entries).toHaveLength(1);
    expect(entries[0]?.[0]).toStartWith("plain_tool-");
    expect(entries[0]?.[1]).toBe(deferred.promise);

    deferred.resolve({ ok: true });

    const response = await callPromise;

    expect(response).toEqual({ ok: true });

    expect(trackedRequests.size).toBe(0);
    expect(spies.appendUsageLogLine).not.toHaveBeenCalled();
    expect(spies.deriveDiagnosticFields).not.toHaveBeenCalled();
    expect(spies.prologProcess).not.toHaveBeenCalled();
    expect(spies.activeBranchName).not.toHaveBeenCalled();
  });

  test("addTool extracts telemetry and appends usage logs on success in diagnostic mode", async () => {
    const { runtime, spies, trackedRequests } = createRuntime();
    const { server, registered } = createCapturingServer();
    const result = { structuredContent: { count: 2 } };
    const rawArgs = {
      marker: "diagnostic",
      _requestId: "req-success",
      _diagnostic_telemetry: { is_autonomous: true, confidence_score: 0.9 },
    };
    const businessArgs = { marker: "diagnostic", _requestId: "req-success" };
    const telemetry = { is_autonomous: true, confidence_score: 0.9 };
    const handler = mock(
      async (args: Record<string, unknown>): Promise<unknown> => ({
        ...result,
        args,
      }),
    );

    spies.diagnosticModeEnabled.mockImplementation(() => true);
    spies.extractToolCallPayload.mockImplementation(() => ({
      businessArgs,
      telemetry,
    }));
    spies.deriveDiagnosticFields.mockImplementation(
      (
        tool: string,
        args: Record<string, unknown>,
        toolTelemetry: Record<string, unknown> | null,
        toolResult: unknown,
      ): Record<string, unknown> => ({
        tool_name: tool,
        business_marker: args.marker,
        telemetry_kind: toolTelemetry?.is_autonomous,
        result_value: toolResult,
      }),
    );
    spies.activeBranchName.mockImplementation(async () => "feature/diagnostic");
    spies.prologProcess.mockImplementation(async () => ({
      getPid: () => 9876,
    }));

    addTool(server, "diagnostic_tool", "diagnostic tool", {}, handler, runtime);

    const tool = getRegisteredTool(registered, "diagnostic_tool");
    const response = await invokeTool(tool, rawArgs);

    expect(response).toEqual({ ...result, args: businessArgs });
    expect(handler).toHaveBeenCalledWith(businessArgs);
    expect(handler).not.toHaveBeenCalledWith(
      expect.objectContaining({
        _diagnostic_telemetry: expect.anything(),
      }),
    );
    expect(spies.extractToolCallPayload).toHaveBeenCalledWith(rawArgs);
    expect(spies.deriveDiagnosticFields).toHaveBeenCalledWith(
      "diagnostic_tool",
      businessArgs,
      telemetry,
      response,
    );
    expect(trackedRequests.size).toBe(0);
    expect(spies.appendUsageLogLine).toHaveBeenCalledTimes(1);
    expect(spies.appendUsageLogLine).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-success",
        tool: "diagnostic_tool",
        telemetry,
        business_args: businessArgs,
        status: "success",
        diagnostic_phase: "success",
        prolog_pid: 9876,
        active_branch: "feature/diagnostic",
        retry_key: expect.any(String),
        tool_call: expect.objectContaining({
          diagnostic_phase: "success",
          retry_key: expect.any(String),
          business_args: businessArgs,
          diagnostic_telemetry: telemetry,
        }),
        tool_name: "diagnostic_tool",
        business_marker: "diagnostic",
        telemetry_kind: true,
        result_value: response,
      }),
    );
  });

  test("addTool logs diagnostic errors, emits debug output, and wraps handler failures", async () => {
    const { runtime, spies, trackedRequests } = createRuntime();
    const { server, registered } = createCapturingServer();
    const deferred = createDeferred<never>();
    const rawArgs = {
      marker: "failure",
      _requestId: "req-error",
      _diagnostic_telemetry: { is_autonomous: false },
    };
    const businessArgs = { marker: "failure", _requestId: "req-error" };
    const telemetry = { is_autonomous: false };
    const handler = mock(
      (_args: Record<string, unknown>): Promise<never> => deferred.promise,
    );

    process.env.KIBI_MCP_DEBUG = "1";
    spies.diagnosticModeEnabled.mockImplementation(() => true);
    spies.extractToolCallPayload.mockImplementation(() => ({
      businessArgs,
      telemetry,
    }));
    spies.prologProcess.mockImplementation(async () => null);
    spies.activeBranchName.mockImplementation(async () => "feature/error");

    addTool(server, "failing_tool", "failing tool", {}, handler, runtime);

    const tool = getRegisteredTool(registered, "failing_tool");
    const callPromise = invokeTool(tool, rawArgs);

    await flushWrappedHandlerSetup();

    expect(trackedRequests.size).toBe(1);
    expect(
      consoleCallsContain(consoleErrorSpy, "Tool called: failing_tool"),
    ).toBe(true);

    deferred.reject("boom");

    const error = await getRejectedError(callPromise);

    expect(error.message).toBe("Tool failing_tool failed: boom");

    expect(trackedRequests.size).toBe(0);
    expect(spies.deriveDiagnosticFields).not.toHaveBeenCalled();
    expect(spies.appendUsageLogLine).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-error",
        tool: "failing_tool",
        telemetry,
        business_args: businessArgs,
        status: "error",
        diagnostic_phase: "error",
        prolog_pid: null,
        active_branch: "feature/error",
        error_message: "boom",
        error_category: "handler_error",
        error_stage: "handler",
        error_summary: "Unhandled MCP handler error.",
        diagnostic_hints: expect.arrayContaining([
          expect.stringContaining("handler_error handler:"),
        ]),
        tool_call: expect.objectContaining({
          diagnostic_phase: "error",
          diagnostic_telemetry: telemetry,
          business_args: businessArgs,
        }),
      }),
    );
    expect(
      consoleCallsContain(consoleErrorSpy, "Error in tool failing_tool:"),
    ).toBe(true);
    expect(
      consoleCallsContain(consoleErrorSpy, "Tool failing_tool stack:"),
    ).toBe(true);
  });

  test("addTool times out hung handlers, resets Prolog, logs diagnostics, and cleans in-flight requests", async () => {
    const originalTimeout = process.env.KIBI_MCP_TOOL_TIMEOUT_MS;
    process.env.KIBI_MCP_TOOL_TIMEOUT_MS = "5";
    const { runtime, spies, trackedRequests } = createRuntime();
    const { server, registered } = createCapturingServer();
    const deferred = createDeferred<never>();
    const rawArgs = {
      marker: "timeout",
      _requestId: "req-timeout",
      _diagnostic_telemetry: { is_autonomous: true },
    };
    const businessArgs = { marker: "timeout", _requestId: "req-timeout" };
    const telemetry = { is_autonomous: true };
    const handler = mock(
      (_args: Record<string, unknown>): Promise<never> => deferred.promise,
    );

    spies.diagnosticModeEnabled.mockImplementation(() => true);
    spies.extractToolCallPayload.mockImplementation(() => ({
      businessArgs,
      telemetry,
    }));
    spies.classifyDiagnosticError.mockImplementation((error: unknown) => {
      const err = error instanceof Error ? error : new Error(String(error));
      return {
        error_name: err.name,
        error_message: err.message,
        error_category: "tool_timeout",
        error_stage: "tool_timeout",
        error_summary: "MCP tool execution exceeded its bounded timeout.",
      };
    });
    spies.activeBranchName.mockImplementation(async () => "feature/timeout");
    spies.prologProcess.mockImplementation(async () => null);

    addTool(server, "timeout_tool", "timeout tool", {}, handler, runtime);

    const tool = getRegisteredTool(registered, "timeout_tool");
    const callPromise = invokeTool(tool, rawArgs);

    await flushWrappedHandlerSetup();

    expect(handler).toHaveBeenCalledWith(businessArgs);
    expect(trackedRequests.size).toBe(1);

    const error = await getRejectedError(callPromise);

    expect(error.message).toBe(
      "Tool timeout_tool failed: Tool timeout_tool timed out after 5ms",
    );
    expect(trackedRequests.size).toBe(0);
    expect(spies.resetProlog).toHaveBeenCalledWith(
      "tool timeout: timeout_tool",
    );
    expect(spies.appendUsageLogLine).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: "req-timeout",
        tool: "timeout_tool",
        status: "error",
        diagnostic_phase: "error",
        error_category: "tool_timeout",
        reset_attempted: true,
        reset_succeeded: true,
        reset_error: null,
        diagnostic_hints: expect.arrayContaining([
          expect.stringContaining("tool_timeout runtime:"),
        ]),
        tool_call: expect.objectContaining({
          diagnostic_phase: "error",
        }),
      }),
    );
    restoreEnvVar("KIBI_MCP_TOOL_TIMEOUT_MS", originalTimeout);
  });

  test("registerAllTools registers all configured tools and delegates to the matching runtime handlers", async () => {
    const { runtime, spies, mockProlog } = createRuntime();
    const { server, registered } = createCapturingServer();

    registerAllTools(server, runtime);

    expect(registered.map((tool) => tool.name)).toEqual([...TOOL_NAMES]);
    expect(
      registered.some((tool) => tool.name === "kb_autopilot_generate"),
    ).toBe(true);
    expect(
      registered.some((tool) => tool.name === "kb_briefing_generate"),
    ).toBe(false);

    const argsByTool = new Map<string, Record<string, unknown>>(
      TOOL_NAMES.map((name) => [name, { marker: name }]),
    );

    const results = await Promise.all(
      TOOL_NAMES.map(async (name) => {
        const tool = getRegisteredTool(registered, name);
        return invokeTool(tool, argsByTool.get(name) ?? {});
      }),
    );

    expect(results).toEqual(
      TOOL_NAMES.map((name) => ({
        tool: name,
        args: argsByTool.get(name),
      })),
    );

    expect(spies.ensureProlog).toHaveBeenCalledTimes(TOOL_NAMES.length - 5);
    expect(spies.handleKbQuery).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_query"),
    );
    expect(spies.handleKbSearch).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_search"),
    );
    expect(spies.handleKbStatus).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_status"),
    );
    expect(spies.handleKbSemanticAdvisor).toHaveBeenCalledWith(
      argsByTool.get("kb_semantic_advisor"),
    );
    expect(spies.handleKbSkillsList).toHaveBeenCalledWith(
      argsByTool.get("kb_skills_list"),
    );
    expect(spies.handleKbSkillsLoad).toHaveBeenCalledWith(
      argsByTool.get("kb_skills_load"),
    );
    expect(spies.handleKbSkillsRead).toHaveBeenCalledWith(
      argsByTool.get("kb_skills_read"),
    );
    expect(spies.handleKbFindGaps).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_find_gaps"),
    );
    expect(spies.handleKbCoverage).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_coverage"),
    );
    expect(spies.handleKbGraph).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_graph"),
    );
    expect(spies.handleKbUpsert).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_upsert"),
    );
    expect(spies.handleKbDelete).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_delete"),
    );
    expect(spies.handleKbCheck).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_check"),
    );
    expect(spies.handleKbModelRequirement).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_model_requirement"),
    );
    expect(spies.handleKbSuggestPredicates).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_suggest_predicates"),
    );
    expect(spies.handleKbAutopilotGenerate).toHaveBeenCalledWith(
      mockProlog,
      argsByTool.get("kb_autopilot_generate"),
    );
  });

  test("registerAllTools throws when a configured tool definition is missing", () => {
    const { runtime } = createRuntime();
    const { server, registerTool } = createCapturingServer();

    runtime.tools = runtime.tools.filter((tool) => tool.name !== "kb_query");

    expect(() => registerAllTools(server, runtime)).toThrow(
      "Unknown tool: kb_query",
    );
    expect(registerTool).not.toHaveBeenCalled();
  });

  describe("DI subsystem (_setToolsServerDepsForTests / _resetSessionModulePromise)", () => {
    test("_setToolsServerDepsForTests allows injecting a mock getSessionModule", () => {
      const mockSessionModule = createSessionModuleMock("injected-branch");
      let callCount = 0;
      const countingGetter = (): Promise<SessionModule> => {
        callCount++;
        return Promise.resolve(mockSessionModule);
      };
      _setToolsServerDepsForTests({ getSessionModule: countingGetter }, true);
      expect(callCount).toBe(0);
    });
    test("_setToolsServerDepsForTests({}, true) restores defaults and resets promise", () => {
      const mockSessionModule = createSessionModuleMock("default-branch");
      const getter = (): Promise<SessionModule> =>
        Promise.resolve(mockSessionModule);
      _setToolsServerDepsForTests({ getSessionModule: getter }, true);
      _setToolsServerDepsForTests({}, true);
    });

    test("_resetSessionModulePromise clears the lazy-loaded module cache", () => {
      const mockSessionModule = createSessionModuleMock("reset-branch");
      const getter = (): Promise<SessionModule> =>
        Promise.resolve(mockSessionModule);
      _setToolsServerDepsForTests({ getSessionModule: getter }, true);
      _resetSessionModulePromise();
    });

    test("_resetSessionModulePromise lets the next default runtime call repopulate the session module", async () => {
      const trackedRequests = new Map<string, Promise<unknown>>();
      const mockSessionModule = createSessionModuleMock(
        "reloaded-branch",
        trackedRequests,
      );
      let callCount = 0;
      const getter = (): Promise<SessionModule> => {
        callCount++;
        return Promise.resolve(mockSessionModule);
      };
      const { server, registered } = createCapturingServer();
      const handler = mock(async () => ({ ok: true }));

      _setToolsServerDepsForTests({ getSessionModule: getter }, true);
      _resetSessionModulePromise();

      addTool(
        server,
        "kb_query",
        "kb_query description",
        { type: "object", properties: {} },
        handler,
      );

      const tool = getRegisteredTool(registered, "kb_query");
      expect(await invokeTool(tool, { marker: "reload" })).toEqual({
        ok: true,
      });
      expect(callCount).toBe(1);
      expect(handler).toHaveBeenCalledWith({ marker: "reload" });
    });

    test("_setToolsServerDepsForTests({}, true) resets the promise to null", () => {
      // Verify resetPromise=true actually clears sessionModulePromise
      const mockSessionModule = createSessionModuleMock("reset-branch");
      const getter = (): Promise<SessionModule> =>
        Promise.resolve(mockSessionModule);
      _setToolsServerDepsForTests({ getSessionModule: getter }, true);
    });
  });
});
