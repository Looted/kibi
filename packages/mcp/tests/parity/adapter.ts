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
import { withWorkspaceRootSchema } from "../../src/server/workspace-router.js";
import { buildBaseTools } from "../../src/tools-config.js";

/**
 * Narrow catalog operations that MCP reaches through a composite tool. The
 * adapter calls the composite and projects its result back onto the narrow
 * operation so CLI routes and MCP stay comparable one operation at a time.
 */
const ROUTED_OPERATIONS: Readonly<
  Record<string, { tool: string; selector: Record<string, unknown> }>
> = {
  kb_skills_list: { tool: "kb_skills", selector: { action: "list" } },
  kb_skills_load: { tool: "kb_skills", selector: { action: "load" } },
  kb_skills_read: { tool: "kb_skills", selector: { action: "read" } },
  kb_semantic_advisor: { tool: "kb_model", selector: { mode: "analyze" } },
  kb_model_requirement: { tool: "kb_model", selector: { mode: "requirement" } },
  kb_suggest_predicates: { tool: "kb_model", selector: { mode: "predicates" } },
  kb_validate_upsert: { tool: "kb_upsert", selector: { dryRun: true } },
};

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function projectRoutedResult(
  opName: string,
  selector: Record<string, unknown>,
  structured: unknown,
): unknown {
  if (!record(structured) || !record(structured.data)) return structured;
  const dropped = new Set([...Object.keys(selector), "skippedEffects"]);
  const data = Object.fromEntries(
    Object.entries(structured.data).filter(([key]) => !dropped.has(key)),
  );
  const spec = getSpec(opName as OperationName);
  return {
    ...structured,
    operation: opName,
    resultVersion: spec.resultVersion,
    data,
    effects: spec.effects.map((kind) => ({
      kind,
      status: structured.status === "error" ? "failed" : "completed",
    })),
  };
}

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
      query: async (goal, signal) => {
        lastResult = await prolog.query(goal, signal);
        return lastResult;
      },
      nextSolution: async () => {
        const result = lastResult;
        lastResult = null;
        return result;
      },
      save: (signal) => prolog.query("kb_save", signal),
      queryEntities: (input, signal) => prolog.queryEntities(input, signal),
      searchEntities: (input, signal) => prolog.searchEntities(input, signal),
      storageStatus: () => prolog.storageStatus(),
      // Required for status parity: typed status goes through the daemon's
      // exactBranchStatus enrichment (attachedPath / attachedGeneration).
      queryStatusJson: (signal) => prolog.queryStatusJson(signal),
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
    tools: withWorkspaceRootSchema(
      buildBaseTools(new Set(["kb_sparql_remote"])),
    ),
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
    handleKbPlanBootstrap: (args) => executeNamed("kb_plan_bootstrap", args),
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
    const routed = ROUTED_OPERATIONS[opName];
    const result = await client.callTool({
      name: routed?.tool ?? opName,
      arguments: routed
        ? { ...routed.selector, ...toolArguments }
        : toolArguments,
    });
    if (result.isError) {
      return { structuredContent: undefined, error: result.content };
    }
    return {
      structuredContent: routed
        ? projectRoutedResult(opName, routed.selector, result.structuredContent)
        : result.structuredContent,
    };
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
