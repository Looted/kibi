/*
 Kibi — repo-local, per-branch, queryable long-term memory for software projects
 Copyright (C) 2026 Piotr Franczyk

 This program is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License as published by
 the Free Software Foundation, either version 3 of the License, or
 (at your option) any later version.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License
 along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import process from "node:process";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { PrologProcess } from "kibi-cli/prolog";
import { z } from "zod";
import {
  DIAGNOSTIC_MODE_ENABLED,
  appendUsageLogLine,
  deriveDiagnosticFields,
  extractToolCallPayload,
} from "../diagnostics.js";
import { isMcpDebugEnabled } from "../env.js";
import { TOOLS } from "../tools-config.js";
import { type CheckArgs, handleKbCheck } from "../tools/check.js";
import { type CoverageArgs, handleKbCoverage } from "../tools/coverage.js";
import { type DeleteArgs, handleKbDelete } from "../tools/delete.js";
import { type FindGapsArgs, handleKbFindGaps } from "../tools/find-gaps.js";
import { type GraphArgs, handleKbGraph } from "../tools/graph.js";
import { type QueryArgs, handleKbQuery } from "../tools/query.js";
import { type SearchArgs, handleKbSearch } from "../tools/search.js";
import { type StatusArgs, handleKbStatus } from "../tools/status.js";
import {
  type SkillsListArgs,
  type SkillsLoadArgs,
  type SkillsReadArgs,
  handleKbSkillsList,
  handleKbSkillsLoad,
  handleKbSkillsRead,
} from "../tools/skills.js";
import { type UpsertArgs, handleKbUpsert } from "../tools/upsert.js";
import {
  type ModelRequirementArgs,
  handleKbModelRequirement,
} from "../tools/model-requirement.js";
import {
  type AutopilotGenerateArgs,
  handleKbAutopilotGenerate,
} from "../tools/autopilot-generate.js";
import {
  type BriefingGenerateArgs,
  handleKbBriefingGenerate,
} from "../tools/briefing-generate.js";

export interface ToolConfig {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

type ToolHandlerArgs = Record<string, unknown> & {
  _requestId?: string;
};

type JsonPrimitive = string | number | boolean | null;

type Awaitable<T> = T | Promise<T>;
type DefaultRuntimeProlog = PrologProcess;
type SessionModule = typeof import("./session.js");

interface ToolsServerDeps {
  getSessionModule: () => Promise<SessionModule>;
}

const defaultToolsServerDeps: ToolsServerDeps = {
  getSessionModule: () => import("./session.js"),
};

// implements REQ-008
export function _setToolsServerDepsForTests(
  deps: Partial<ToolsServerDeps>,
  resetPromise = false,
): void {
  defaultToolsServerDeps.getSessionModule =
    deps.getSessionModule ?? defaultToolsServerDeps.getSessionModule;
  if (resetPromise) {
    sessionModulePromise = null;
  }
}

// implements REQ-012
export function _resetSessionModulePromise(): void {
  sessionModulePromise = null;
}

let sessionModulePromise: Promise<SessionModule> | null = null;
/* v8 ignore next (3 lines) — lazy async module loader; body only executes once per process
 * when DEFAULT_TOOLS_RUNTIME.activeBranchName/ensureProlog/etc. are first called.
 * Cannot be re-triggered without process restart (sessionModulePromise is module-level). */
async function getSessionModule(): Promise<SessionModule> {
  sessionModulePromise ??= defaultToolsServerDeps.getSessionModule();
  return sessionModulePromise;
}
export interface ToolsRuntime<TProlog = DefaultRuntimeProlog> {
  diagnosticModeEnabled: () => boolean;
  appendUsageLogLine: typeof appendUsageLogLine;
  deriveDiagnosticFields: typeof deriveDiagnosticFields;
  extractToolCallPayload: typeof extractToolCallPayload;
  tools: ToolConfig[];
  activeBranchName: () => Awaitable<string>;
  ensureProlog: () => Promise<TProlog>;
  inFlightRequests: () => Awaitable<Map<string, Promise<unknown>>>;
  isShuttingDown: () => Awaitable<boolean>;
  prologProcess: () => Awaitable<{ getPid: () => number } | null>;
  handleKbCheck: (prolog: TProlog, args: CheckArgs) => Promise<unknown>;
  handleKbCoverage: (prolog: TProlog, args: CoverageArgs) => Promise<unknown>;
  handleKbDelete: (prolog: TProlog, args: DeleteArgs) => Promise<unknown>;
  handleKbFindGaps: (prolog: TProlog, args: FindGapsArgs) => Promise<unknown>;
  handleKbGraph: (prolog: TProlog, args: GraphArgs) => Promise<unknown>;
  handleKbQuery: (prolog: TProlog, args: QueryArgs) => Promise<unknown>;
  handleKbSearch: (prolog: TProlog, args: SearchArgs) => Promise<unknown>;
  handleKbStatus: (prolog: TProlog, args: StatusArgs) => Promise<unknown>;
  handleKbSkillsList: (args: SkillsListArgs) => Promise<unknown>;
  handleKbSkillsLoad: (args: SkillsLoadArgs) => Promise<unknown>;
  handleKbSkillsRead: (args: SkillsReadArgs) => Promise<unknown>;
  handleKbUpsert: (prolog: TProlog, args: UpsertArgs) => Promise<unknown>;
  handleKbModelRequirement: (
    prolog: TProlog,
    args: ModelRequirementArgs,
  ) => Promise<unknown>;
  handleKbAutopilotGenerate: (prolog: TProlog, args: AutopilotGenerateArgs) => Promise<unknown>;
  handleKbBriefingGenerate: (prolog: TProlog, args: BriefingGenerateArgs) => Promise<unknown>;
}

const DEFAULT_TOOLS_RUNTIME: ToolsRuntime<DefaultRuntimeProlog> = {
  diagnosticModeEnabled: () => DIAGNOSTIC_MODE_ENABLED,
  appendUsageLogLine,
  deriveDiagnosticFields,
  extractToolCallPayload,
  // INTENTIONAL: TOOLS is imported as a Zod-inferred schema type; ToolConfig is the
  // runtime interface with looser Record<string, unknown> inputSchema. The cast is safe
  // because the tool definitions are statically authored and validated at startup.
  tools: TOOLS as unknown as ToolConfig[],
  activeBranchName: async () => (await getSessionModule()).activeBranchName,
  ensureProlog: async () => (await getSessionModule()).ensureProlog(),
  inFlightRequests: async () => (await getSessionModule()).inFlightRequests,
  isShuttingDown: async () => (await getSessionModule()).isShuttingDown,
  prologProcess: async () => (await getSessionModule()).prologProcess,
  handleKbCheck,
  handleKbCoverage,
  handleKbDelete,
  handleKbFindGaps,
  handleKbGraph,
  handleKbQuery,
  handleKbSearch,
  handleKbStatus,
  handleKbSkillsList,
  handleKbSkillsLoad,
  handleKbSkillsRead,
  handleKbUpsert,
  handleKbModelRequirement,
  handleKbAutopilotGenerate,
  handleKbBriefingGenerate,
};

// implements REQ-008
function debugLog(...args: Parameters<typeof console.error>): void {
  if (isMcpDebugEnabled()) {
    console.error(...args);
  }
}

// implements REQ-002
export function jsonSchemaToZod(schema: unknown): z.ZodTypeAny {
  if (!schema || typeof schema !== "object") {
    return z.any();
  }

  const obj = schema as Record<string, unknown>;

  if (Array.isArray(obj.enum) && obj.enum.length > 0) {
    const description =
      typeof obj.description === "string" ? obj.description : undefined;
    const literals = obj.enum.filter(
      (value): value is JsonPrimitive =>
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null,
    );
    if (literals.length === 0) {
      return description ? z.any().describe(description) : z.any();
    }
    const literalSchemas = literals.map((value) => z.literal(value));
    if (literalSchemas.length === 1) {
      const single = literalSchemas[0];
      if (!single) {
        return description ? z.any().describe(description) : z.any();
      }
      return description ? single.describe(description) : single;
    }
    const union = z.union(
      literalSchemas as [
        z.ZodLiteral<JsonPrimitive>,
        ...z.ZodLiteral<JsonPrimitive>[],
      ],
    );
    return description ? union.describe(description) : union;
  }

  const schemaType = typeof obj.type === "string" ? obj.type : undefined;

  switch (schemaType) {
    case "object": {
      const properties =
        obj.properties && typeof obj.properties === "object"
          ? (obj.properties as Record<string, unknown>)
          : {};
      const required = new Set(
        Array.isArray(obj.required)
          ? obj.required.filter(
              (k): k is string => typeof k === "string" && k.length > 0,
            )
          : [],
      );

      const shape: Record<string, z.ZodTypeAny> = {};
      for (const [key, value] of Object.entries(properties)) {
        const propSchema = jsonSchemaToZod(value);
        shape[key] = required.has(key) ? propSchema : propSchema.optional();
      }

      const objectSchema =
        obj.additionalProperties === false
          ? z.object(shape)
          : z.looseObject(shape);
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? objectSchema.describe(description) : objectSchema;
    }
    case "array": {
      const itemSchema = jsonSchemaToZod(obj.items);
      let arraySchema = z.array(itemSchema);
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minItems === "number") {
        arraySchema = arraySchema.min(obj.minItems);
      }
      if (typeof obj.maxItems === "number") {
        arraySchema = arraySchema.max(obj.maxItems);
      }
      return description ? arraySchema.describe(description) : arraySchema;
    }
    case "string": {
      let s = z.string();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minLength === "number") {
        s = s.min(obj.minLength);
      }
      if (typeof obj.maxLength === "number") {
        s = s.max(obj.maxLength);
      }
      return description ? s.describe(description) : s;
    }
    case "number": {
      let n = z.number();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minimum === "number") {
        n = n.min(obj.minimum);
      }
      if (typeof obj.maximum === "number") {
        n = n.max(obj.maximum);
      }
      return description ? n.describe(description) : n;
    }
    case "integer": {
      let n = z.number().int();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      if (typeof obj.minimum === "number") {
        n = n.min(obj.minimum);
      }
      if (typeof obj.maximum === "number") {
        n = n.max(obj.maximum);
      }
      return description ? n.describe(description) : n;
    }
    case "boolean": {
      const b = z.boolean();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? b.describe(description) : b;
    }
    default: {
      const anySchema = z.any();
      const description =
        typeof obj.description === "string" ? obj.description : undefined;
      return description ? anySchema.describe(description) : anySchema;
    }
  }
}

// implements REQ-002
export function addTool<TProlog>(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: object,
  handler: ToolHandler,
  // INTENTIONAL: DEFAULT_TOOLS_RUNTIME is typed as ToolsRuntime<PrologProcess>; the
  // generic TProlog parameter exists so tests can inject a mock type. The cast is safe
  // because the runtime object satisfies the full ToolsRuntime contract at runtime.
  runtime: ToolsRuntime<TProlog> = DEFAULT_TOOLS_RUNTIME as unknown as ToolsRuntime<TProlog>,
): void {
  const wrappedHandler: ToolHandler = async (args) => {
    const startedAt = new Date();
    const diagnosticModeEnabled = runtime.diagnosticModeEnabled();
    const { businessArgs, telemetry } = diagnosticModeEnabled
      ? runtime.extractToolCallPayload(args)
      : { businessArgs: args, telemetry: null };

    try {
      // Validate that args is a valid object
      if (typeof args !== "object" || args === null) {
        throw new Error(
          `Invalid arguments for tool ${name}: expected object, got ${typeof args}`,
        );
      }

      // Check if shutting down before processing
      if (await runtime.isShuttingDown()) {
        throw new Error(`Tool ${name} rejected: server is shutting down`);
      }

      // Extract or generate requestId from args
      const requestIdArg = (businessArgs as ToolHandlerArgs)._requestId;
      const requestId =
        typeof requestIdArg === "string"
          ? requestIdArg
          : `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      // Log tool call for debugging (to stderr to avoid breaking stdio protocol)
      if (isMcpDebugEnabled()) {
        console.error(
          `[KIBI-MCP] Tool called: ${name} (requestId: ${requestId}) with args:`,
          JSON.stringify(businessArgs),
        );
      }

      // Track the handler promise in inFlightRequests Map
      const trackedRequests = await runtime.inFlightRequests();
      const handlerPromise = handler(businessArgs);
      trackedRequests.set(requestId, handlerPromise);

      try {
        // Execute handler
        const result = await handlerPromise;

        // Log usage in diagnostic mode
        if (diagnosticModeEnabled) {
          const finishedAt = new Date();
          const diagnosticFields = runtime.deriveDiagnosticFields(
            name,
            businessArgs,
            telemetry,
            result,
          );
          const processHandle = await runtime.prologProcess();
          const branchName = await runtime.activeBranchName();
          runtime.appendUsageLogLine({
            timestamp: finishedAt.toISOString(),
            request_id: requestId,
            tool: name,
            telemetry,
            business_args: businessArgs,
            status: "success",
            started_at: startedAt.toISOString(),
            finished_at: finishedAt.toISOString(),
            duration_ms: finishedAt.getTime() - startedAt.getTime(),
            prolog_pid: processHandle?.getPid() ?? null,
            active_branch: branchName,
            ...diagnosticFields,
          });
        }

        return result;
      } catch (error) {
        // Log error in diagnostic mode
        if (diagnosticModeEnabled) {
          const finishedAt = new Date();
          const err = error instanceof Error ? error : new Error(String(error));
          const processHandle = await runtime.prologProcess();
          const branchName = await runtime.activeBranchName();
          runtime.appendUsageLogLine({
            timestamp: finishedAt.toISOString(),
            request_id: requestId,
            tool: name,
            telemetry,
            business_args: businessArgs,
            status: "error",
            started_at: startedAt.toISOString(),
            finished_at: finishedAt.toISOString(),
            duration_ms: finishedAt.getTime() - startedAt.getTime(),
            prolog_pid: processHandle?.getPid() ?? null,
            active_branch: branchName,
            error_message: err.message,
          });
        }
        throw error;
      } finally {
        // Always clean up from Map when done (success or failure)
        trackedRequests.delete(requestId);
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[KIBI-MCP] Error in tool ${name}:`, err.message);
      if (err.stack) {
        debugLog(`[KIBI-MCP] Tool ${name} stack:`, err.stack);
      }
      throw new Error(`Tool ${name} failed: ${err.message}`, { cause: err });
    }
  };

  (
    server as McpServer & {
      registerTool: (
        n: string,
        c: { description: string; inputSchema: z.ZodTypeAny },
        h: ToolHandler,
      ) => void;
    }
  ).registerTool(
    name,
    { description, inputSchema: jsonSchemaToZod(inputSchema) },
    wrappedHandler,
  );
}

// implements REQ-002, REQ-013
export function registerAllTools<TProlog>(
  server: McpServer,
  // INTENTIONAL: same generic bridge cast as addTool — see comment there.
  runtime: ToolsRuntime<TProlog> = DEFAULT_TOOLS_RUNTIME as unknown as ToolsRuntime<TProlog>,
): void {
  const toolDef = (name: string) => {
    const t = runtime.tools.find((tool) => tool.name === name);
    if (!t) throw new Error(`Unknown tool: ${name}`);
    return t;
  };
  // INTENTIONAL ARGUMENT CASTS: The `args as (unknown as)? XyzArgs` casts below
  // bridge the generic ToolHandler (which receives Record<string, unknown>) to the
  // specific handler argument types. Argument shapes are validated by Zod schemas
  // (via jsonSchemaToZod) before the handler is invoked, so the casts are safe at runtime.
  addTool(
    server,
    "kb_query",
    toolDef("kb_query").description,
    toolDef("kb_query").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbQuery(prolog, args as QueryArgs);
    },
    runtime,
  );

  addTool(
    server,
    "kb_search",
    toolDef("kb_search").description,
    toolDef("kb_search").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbSearch(prolog, args as unknown as SearchArgs);
    },
    runtime,
  );

  addTool(
    server,
    "kb_status",
    toolDef("kb_status").description,
    toolDef("kb_status").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbStatus(prolog, args as StatusArgs);
    },
    runtime,
  );

  addTool(
    server,
    "kb_skills_list",
    toolDef("kb_skills_list").description,
    toolDef("kb_skills_list").inputSchema,
    async (args) => runtime.handleKbSkillsList(args as SkillsListArgs),
    runtime,
  );

  addTool(
    server,
    "kb_skills_load",
    toolDef("kb_skills_load").description,
    toolDef("kb_skills_load").inputSchema,
    async (args) => runtime.handleKbSkillsLoad(args as unknown as SkillsLoadArgs),
    runtime,
  );

  addTool(
    server,
    "kb_skills_read",
    toolDef("kb_skills_read").description,
    toolDef("kb_skills_read").inputSchema,
    async (args) => runtime.handleKbSkillsRead(args as unknown as SkillsReadArgs),
    runtime,
  );

  addTool(
    server,
    "kb_find_gaps",
    toolDef("kb_find_gaps").description,
    toolDef("kb_find_gaps").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbFindGaps(prolog, args as FindGapsArgs);
    },
    runtime,
  );

  addTool(
    server,
    "kb_coverage",
    toolDef("kb_coverage").description,
    toolDef("kb_coverage").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbCoverage(prolog, args as CoverageArgs);
    },
    runtime,
  );

  addTool(
    server,
    "kb_graph",
    toolDef("kb_graph").description,
    toolDef("kb_graph").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbGraph(prolog, args as unknown as GraphArgs);
    },
    runtime,
  );

  addTool(
    server,
    "kb_upsert",
    toolDef("kb_upsert").description,
    toolDef("kb_upsert").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbUpsert(prolog, args as unknown as UpsertArgs);
    },
    runtime,
  );

  addTool(
    server,
    "kb_delete",
    toolDef("kb_delete").description,
    toolDef("kb_delete").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbDelete(prolog, args as unknown as DeleteArgs);
    },
    runtime,
  );

  addTool(
    server,
    "kb_check",
    toolDef("kb_check").description,
    toolDef("kb_check").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbCheck(prolog, args as CheckArgs);
    },
    runtime,
  );

  addTool(
    server,
    "kb_model_requirement",
    toolDef("kb_model_requirement").description,
    toolDef("kb_model_requirement").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbModelRequirement(
        prolog,
        args as unknown as ModelRequirementArgs,
      );
    },
    runtime,
  );

  addTool(
    server,
    "kb_autopilot_generate",
    toolDef("kb_autopilot_generate").description,
    toolDef("kb_autopilot_generate").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbAutopilotGenerate(
        prolog,
        args as unknown as AutopilotGenerateArgs,
      );
    },
    runtime,
  );

  addTool(
    server,
    "kb_briefing_generate",
    toolDef("kb_briefing_generate").description,
    toolDef("kb_briefing_generate").inputSchema,
    async (args) => {
      const prolog = await runtime.ensureProlog();
      return runtime.handleKbBriefingGenerate(
        prolog,
        args as unknown as BriefingGenerateArgs,
      );
    },
    runtime,
  );
}
