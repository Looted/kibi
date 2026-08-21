import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { EngineClient } from "kibi-cli/engine";
import {
  type OperationName,
  executeOperation,
  getSpec,
  nodeFilesystem,
  nodeGit,
} from "kibi-cli/operations";
import type { PrologProcess } from "kibi-cli/prolog";

import {
  appendUsageLogLine,
  classifyDiagnosticError,
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../../src/diagnostics.js";
import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";
import type { ToolsRuntime } from "../../src/server/tool-types.js";
import { registerAllTools } from "../../src/server/tools.js";
import { TOOLS } from "../../src/tools-config.js";

type McpOperationResult = {
  readonly structuredContent: unknown;
  readonly error?: unknown;
};

// implements REQ-kibi-operation-interface-parity
export async function runMcpOperation(
  workspaceRoot: string,
  opName: string,
  input: unknown,
): Promise<McpOperationResult> {
  // The parity adapter intentionally exercises the same Node-hosted engine as
  // production MCP sessions.  Keeping a second direct SWI attachment here
  // would race the CLI client for rdf_persistency's branch lock and would no
  // longer represent a supported transport.
  const prolog = new EngineClient({
    workspaceRoot,
    branch: "contracts-seed",
    timeout: 120_000,
  });
  let prologStarted = false;
  let lastResult: Awaited<ReturnType<EngineClient["query"]>> | null = null;
  const ensureProlog = async (): Promise<PrologProcess> => {
    if (!prologStarted) {
      await prolog.start();
      prologStarted = true;
    }
    return prolog as unknown as PrologProcess;
  };
  const operationRuntime = createMcpRuntime<PrologProcess>({
    workspaceRoot,
    fs: nodeFilesystem,
    git: nodeGit,
    activeBranchName: async () => "contracts-seed",
    attachedBranchKbPath: () =>
      path.join(workspaceRoot, ".kb", "branches", "contracts-seed"),
    ensureProlog,
    adaptProlog: () => ({
      query: async (goal) => {
        lastResult = await prolog.query(goal);
        return lastResult;
      },
      nextSolution: async () => {
        const result = lastResult;
        lastResult = null;
        return result;
      },
      save: () => prolog.query("kb_save"),
      queryEntities: (input) => prolog.queryEntities(input),
      searchEntities: (input) => prolog.searchEntities(input),
      storageStatus: () => prolog.storageStatus(),
    }),
    net: { fetch: (input, init) => globalThis.fetch(input, init) },
    refreshAttachedBranchStamp: async () => undefined,
  });
  const executeNamed = async (
    name: OperationName,
    value: object,
  ): Promise<unknown> => {
    return executeOperation(
      operationRuntime,
      getSpec(name),
      { ...value },
      { workspaceRoot },
    );
  };
  const runtime: ToolsRuntime<PrologProcess> = {
    diagnosticModeEnabled: () => false,
    appendUsageLogLine,
    classifyDiagnosticError,
    deriveDiagnosticFields,
    extractToolCallPayload,
    tools: [...TOOLS],
    activeBranchName: async () => "contracts-seed",
    ensureProlog,
    resetProlog: async () => undefined,
    inFlightRequests: () => new Map<string, Promise<unknown>>(),
    isShuttingDown: () => false,
    prologProcess: () => (prologStarted ? prolog : null),
    operationRuntime,
    handleKbCheck: (_prolog, args) => executeNamed("kb_check", args),
    handleKbCoverage: (_prolog, args) => executeNamed("kb_coverage", args),
    handleKbDelete: (_prolog, args) => executeNamed("kb_delete", args),
    handleKbFindGaps: (_prolog, args) => executeNamed("kb_find_gaps", args),
    handleKbGraph: (_prolog, args) => executeNamed("kb_graph", args),
    handleSparql: (args, context) =>
      getSpec("kb_sparql_remote").execute(args, context),
    handleKbQuery: (_prolog, args) => executeNamed("kb_query", args),
    handleKbSearch: (_prolog, args) => executeNamed("kb_search", args),
    handleKbStatus: (_prolog, args) => executeNamed("kb_status", args),
    handleKbSemanticAdvisor: (args) =>
      executeNamed("kb_semantic_advisor", args),
    handleKbSkillsList: (args) => executeNamed("kb_skills_list", args),
    handleKbSkillsLoad: (args) => executeNamed("kb_skills_load", args),
    handleKbSkillsRead: (args) => executeNamed("kb_skills_read", args),
    handleKbUpsert: (_prolog, args) => executeNamed("kb_upsert", args),
    handleKbValidateUpsert: (_prolog, args) =>
      executeNamed("kb_validate_upsert", args),
    handleKbModelRequirement: (_prolog, args) =>
      executeNamed("kb_model_requirement", args),
    handleKbSuggestPredicates: (_prolog, args) =>
      executeNamed("kb_suggest_predicates", args),
    handleKbPlanBootstrap: (args) =>
      executeNamed("kb_plan_bootstrap", args),
  };

  const server = new McpServer({ name: "kibi-parity", version: "1.0.0" });
  const client = new Client({ name: "kibi-parity-client", version: "1.0.0" });
  registerAllTools(server, runtime);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);
  try {
    const toolArguments =
      input !== null && typeof input === "object" && !Array.isArray(input)
        ? Object.fromEntries(Object.entries(input))
        : undefined;
    const result = await client.callTool({
      name: opName,
      arguments: toolArguments,
    });
    if (result.isError) {
      return { structuredContent: undefined, error: result.content };
    }
    return { structuredContent: result.structuredContent };
  } catch (error) {
    if (error instanceof Error) {
      return { structuredContent: undefined, error };
    }
    throw error;
  } finally {
    await Promise.all([
      client.close(),
      server.close(),
      prologStarted ? prolog.terminate() : Promise.resolve(),
    ]);
  }
}
