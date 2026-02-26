import process from "node:process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PrologProcess } from "kibi-cli/prolog";
import { z } from "zod";
import { loadDefaultEnvFile } from "./env.js";
import { attachMcpcat } from "./mcpcat.js";
import { TOOLS } from "./tools-config.js";
import {
  type BranchEnsureArgs,
  type BranchGcArgs,
  handleKbBranchEnsure,
  handleKbBranchGc,
} from "./tools/branch.js";
import { type CheckArgs, handleKbCheck } from "./tools/check.js";
import { type ContextArgs, handleKbContext } from "./tools/context.js";
import {
  type CoverageReportArgs,
  handleKbCoverageReport,
} from "./tools/coverage-report.js";
import { type DeleteArgs, handleKbDelete } from "./tools/delete.js";
import { type DeriveArgs, handleKbDerive } from "./tools/derive.js";
import { type ImpactArgs, handleKbImpact } from "./tools/impact.js";
import {
  type ListEntityTypesResult,
  type ListRelationshipTypesResult,
  handleKbListEntityTypes,
  handleKbListRelationshipTypes,
} from "./tools/list-types.js";
import {
  type QueryRelationshipsArgs,
  handleKbQueryRelationships,
} from "./tools/query-relationships.js";
import { type QueryArgs, handleKbQuery } from "./tools/query.js";
import {
  type SymbolsRefreshArgs,
  handleKbSymbolsRefresh,
} from "./tools/symbols.js";
import { type UpsertArgs, handleKbUpsert } from "./tools/upsert.js";
import { resolveKbPath, resolveWorkspaceRoot } from "./workspace.js";

interface DocResource {
  uri: string;
  name: string;
  description: string;
  mimeType: "text/markdown";
  text: string;
}

function renderToolsDoc(): string {
  const lines = [
    "# kibi-mcp Tools",
    "",
    "Use this reference to choose the correct tool before calling it.",
    "",
    "| Tool | Summary | Required Parameters |",
    "| --- | --- | --- |",
  ];

  for (const tool of TOOLS) {
    const required = Array.isArray(tool.inputSchema?.required)
      ? tool.inputSchema.required.join(", ")
      : "none";
    lines.push(`| ${tool.name} | ${tool.description} | ${required} |`);
  }

  return lines.join("\n");
}

const PROMPTS = [
  {
    name: "kibi_overview",
    description: "High-level model for using kibi-mcp safely and effectively.",
    text: [
      "# kibi-mcp Overview",
      "",
      "Treat this server as a branch-aware knowledge graph interface for software traceability.",
      "",
      "- Encode requirements as linked facts: `req --constrains--> fact` plus `req --requires_property--> fact`.",
      "- Reuse canonical fact IDs across requirements; shared constrained facts make contradictions detectable.",
      "- Use read tools first (`kb_query`, `kb_query_relationships`, `kbcontext`) to establish context.",
      "- Use mutation tools (`kb_upsert`, `kb_delete`, branch tools) only after you can justify the change.",
      "- Use inference tools (`kb_derive`, `kb_impact`, `kb_coverage_report`) for deterministic analysis.",
      "- Prefer explicit IDs and enum values to avoid invalid parameters.",
      "- Assume every write can affect downstream traceability queries.",
    ].join("\n"),
  },
  {
    name: "kibi_workflow",
    description:
      "Step-by-step call order for discovery, mutation, and verification.",
    text: [
      "# kibi-mcp Workflow",
      "",
      "Follow this sequence for reliable operation:",
      "",
      "1. **Discover**: Call `kb_list_entity_types`/`kb_list_relationship_types` if you are unsure about allowed values.",
      "2. **Inspect**: Call `kb_query` or `kbcontext` to confirm current state before any mutation.",
      "3. **Model requirements as facts**: For new/updated reqs, create/reuse fact entities first, then express req semantics with `constrains` + `requires_property`.",
      "4. **Validate intent**: If creating links, call `kb_query` for both endpoint IDs first.",
      "5. **Mutate**: Call `kb_upsert` for create/update, or `kb_delete` for explicit removals.",
      "6. **Verify integrity**: Call `kb_check` after mutations.",
      "7. **Assess impact**: Call `kb_impact`, `kb_derive`, or `kb_coverage_report` as needed.",
      "",
      "If a tool returns empty results, do not assume failure. Re-check filters (type, id, tags, sourceFile, or relationship type).",
    ].join("\n"),
  },
  {
    name: "kibi_constraints",
    description: "Operational limits, validation rules, and mutation gotchas.",
    text: [
      "# kibi-mcp Constraints",
      "",
      "Apply these rules before calling write operations:",
      "",
      "- `kb_upsert` validates entity and relationship payloads against JSON Schema.",
      "- `kb_delete` blocks deletion when dependents still reference the entity.",
      "- `kb_branch_gc` may permanently remove stale branch KB directories when `dry_run` is `false`.",
      "- Relationship and rule names are strict enums; unknown values fail validation.",
      "- Branch names are sanitized; path traversal patterns are rejected.",
      "- `kb_symbols_refresh` can rewrite the symbols manifest unless `dryRun` is enabled.",
    ].join("\n"),
  },
];

function registerDocResources(): DocResource[] {
  const overview = [
    "# kibi-mcp Server Overview",
    "",
    "kibi-mcp is a stdio MCP server for querying and mutating the Kibi knowledge base.",
    "",
    "Scope:",
    "- Entity CRUD-like operations for KB records",
    "- Relationship inspection",
    "- Validation and branch KB maintenance",
    "- Deterministic inference for traceability and impact analysis",
    "",
    "Use this server when you need branch-local, machine-readable project memory.",
  ].join("\n");

  const errors = [
    "# kibi-mcp Error Guide",
    "",
    "Common failure modes and recoveries:",
    "",
    "- `-32602 INVALID_PARAMS`: Tool arguments are missing/invalid. Recover by checking enum values and required fields.",
    "- `-32601 METHOD_NOT_FOUND`: Unknown MCP method. Recover by using supported methods (`tools/*`, `prompts/*`, `resources/*`).",
    "- `-32000 PROLOG_QUERY_FAILED`: Prolog query failed. Recover by validating IDs, rule names, and relationship types.",
    "- `VALIDATION_ERROR` message: `kb_upsert` payload failed schema checks. Recover by fixing required fields and enum values.",
    "- Delete blocked by dependents: `kb_delete` detected incoming references. Recover by removing/rewiring relationships first.",
    "- Empty results: filters may be too strict. Recover by loosening type/id/tags/source filters and retrying.",
  ].join("\n");

  const examples = [
    "# kibi-mcp Examples",
    "",
    "## Model requirements as reusable facts",
    "1. `kb_query` to find existing fact IDs before creating new ones",
    "2. `kb_upsert` for the req entity and include `relationships` with `constrains` and `requires_property`",
    "3. Reuse the same constrained fact ID across related requirements; vary property facts only when semantics differ",
    '4. `kb_check` with `{ "rules": ["required-fields","no-dangling-refs"] }`',
    "",
    "## Discover requirement coverage gaps",
    '1. `kb_query` with `{ "type": "req", "limit": 20 }`',
    '2. `kb_coverage_report` with `{ "type": "req" }`',
    '3. `kb_derive` with `{ "rule": "coverage_gap" }`',
    "",
    "## Add a requirement and link it to a test",
    "1. `kb_query` for existing IDs to avoid collisions",
    "2. `kb_upsert` with entity payload and `relationships` containing `verified_by`",
    '3. `kb_check` with `{ "rules": ["required-fields","no-dangling-refs"] }`',
    "",
    "## Safe cleanup of stale branch KBs",
    '1. `kb_branch_gc` with `{ "dry_run": true }`',
    "2. Review `structuredContent.stale`",
    '3. `kb_branch_gc` with `{ "dry_run": false }` only when deletion is intended',
  ].join("\n");

  return [
    {
      uri: "kibi://docs/overview",
      name: "kibi docs overview",
      description: "Full server description, purpose, and scope.",
      mimeType: "text/markdown",
      text: overview,
    },
    {
      uri: "kibi://docs/tools",
      name: "kibi docs tools",
      description: "Available tools with summaries and required parameters.",
      mimeType: "text/markdown",
      text: renderToolsDoc(),
    },
    {
      uri: "kibi://docs/errors",
      name: "kibi docs errors",
      description: "Common error modes and suggested recovery actions.",
      mimeType: "text/markdown",
      text: errors,
    },
    {
      uri: "kibi://docs/examples",
      name: "kibi docs examples",
      description: "Concrete tool call sequences for common tasks.",
      mimeType: "text/markdown",
      text: examples,
    },
  ];
}

const DOC_RESOURCES = registerDocResources();

function getHelpText(topic?: string): string {
  const normalized = (topic ?? "overview").trim().toLowerCase();

  if (normalized === "tools") {
    return renderToolsDoc();
  }

  if (normalized === "workflow") {
    return PROMPTS.find((p) => p.name === "kibi_workflow")?.text ?? "";
  }

  if (normalized === "constraints") {
    return PROMPTS.find((p) => p.name === "kibi_constraints")?.text ?? "";
  }

  if (normalized === "examples") {
    return (
      DOC_RESOURCES.find((r) => r.uri === "kibi://docs/examples")?.text ?? ""
    );
  }

  if (normalized === "errors") {
    return (
      DOC_RESOURCES.find((r) => r.uri === "kibi://docs/errors")?.text ?? ""
    );
  }

  if (normalized === "branching") {
    return [
      "# Branch Selection",
      "",
      "Kibi is branch-aware. By default, the MCP server detects the current git branch and attaches to the corresponding KB in `.kb/branches/<branch>`.",
      "",
      "## Forcing a Branch",
      "You can override the detected branch by setting the `KIBI_BRANCH` environment variable before starting the server.",
      "",
      "Example:",
      "```bash",
      "KIBI_BRANCH=feature/auth bun run packages/mcp/src/server.ts",
      "```",
      "",
      "## How it works",
      "1. If `KIBI_BRANCH` is set, it uses that value.",
      "2. If not set, it runs `git branch --show-current`.",
      "3. If git detection fails, it falls back to `develop`.",
      "4. The server logs the selection process to stderr on startup.",
    ].join("\n");
  }

  return (
    DOC_RESOURCES.find((r) => r.uri === "kibi://docs/overview")?.text ?? ""
  );
}

let prologProcess: PrologProcess | null = null;
let isInitialized = false;
let activeBranchName = "develop";
// Shutdown tracking state
let isShuttingDown = false;
let shutdownTimeout: NodeJS.Timeout | null = null;
const inFlightRequests = new Map<string, Promise<unknown>>();

function debugLog(...args: Parameters<typeof console.error>): void {
  if (process.env.KIBI_MCP_DEBUG) {
    console.error(...args);
  }
}

async function initiateGracefulShutdown(exitCode = 0): Promise<void> {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  debugLog(`[KIBI-MCP] Initiating graceful shutdown (exit code: ${exitCode})`);

  // Wait for in-flight requests
  if (inFlightRequests.size > 0) {
    debugLog(
      `[KIBI-MCP] Waiting for ${inFlightRequests.size} in-flight requests to complete...`,
    );

    const timeoutPromise = new Promise((_, reject) => {
      shutdownTimeout = setTimeout(() => {
        reject(new Error("Shutdown timeout"));
      }, 10000); // 10 second timeout
    });

    try {
      await Promise.race([
        Promise.allSettled(Array.from(inFlightRequests.values())),
        timeoutPromise,
      ]);
      debugLog("[KIBI-MCP] All in-flight requests completed");
    } catch (_error) {
      console.error("[KIBI-MCP] Shutdown timeout reached, forcing exit");
    } finally {
      if (shutdownTimeout) {
        clearTimeout(shutdownTimeout);
        shutdownTimeout = null;
      }
    }
  }

  // Cleanup Prolog process
  if (prologProcess?.isRunning()) {
    debugLog("[KIBI-MCP] Terminating Prolog process...");
    try {
      await prologProcess.terminate();
      debugLog("[KIBI-MCP] Prolog process terminated");
    } catch (error) {
      console.error("[KIBI-MCP] Error terminating Prolog:", error);
    }
  }

  // Exit
  process.exit(exitCode);
}

async function ensureProlog(): Promise<PrologProcess> {
  if (isInitialized && prologProcess?.isRunning()) {
    return prologProcess;
  }

  debugLog("[KIBI-MCP] Initializing Prolog process...");

  prologProcess = new PrologProcess({ timeout: 30000 });
  await prologProcess.start();

  const workspaceRoot = resolveWorkspaceRoot();
  let branch = process.env.KIBI_BRANCH || "develop";
  let gitBranch: string | undefined;

  if (!process.env.KIBI_BRANCH) {
    try {
      const { execSync } = await import("node:child_process");
      const detected = execSync("git branch --show-current", {
        cwd: workspaceRoot,
        encoding: "utf8",
        timeout: 3000,
      }).trim();
      if (detected) {
        gitBranch = detected === "master" ? "develop" : detected;
        branch = gitBranch;
      }
    } catch {
      // fall back to develop
    }
  }

  debugLog("[KIBI-MCP] Branch selection:");
  debugLog(
    `[KIBI-MCP]   KIBI_BRANCH env: ${process.env.KIBI_BRANCH || "not set"}`,
  );
  debugLog(`[KIBI-MCP]   Git branch: ${gitBranch || "n/a"}`);
  debugLog(`[KIBI-MCP]   Attached to: ${branch}`);
  debugLog("[KIBI-MCP] To change branch: set KIBI_BRANCH=<branch> and restart");

  activeBranchName = branch;
  const kbPath = resolveKbPath(workspaceRoot, branch);
  const attachResult = await prologProcess.query(`kb_attach('${kbPath}')`);

  if (!attachResult.success) {
    throw new Error(
      `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
    );
  }

  isInitialized = true;
  debugLog(
    `[KIBI-MCP] Prolog process started (PID: ${prologProcess.getPid()})`,
  );
  debugLog(`[KIBI-MCP] KB attached: ${kbPath}`);
  return prologProcess;
}

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

type ToolHandlerArgs = Record<string, unknown> & {
  _requestId?: string;
};

type JsonPrimitive = string | number | boolean | null;

function jsonSchemaToZod(schema: unknown): z.ZodTypeAny {
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

      let objectSchema = z.object(shape);
      if (obj.additionalProperties !== false) {
        objectSchema = objectSchema.passthrough();
      }
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

function addTool(
  server: McpServer,
  name: string,
  description: string,
  inputSchema: object,
  handler: ToolHandler,
): void {
  const wrappedHandler: ToolHandler = async (args) => {
    try {
      // Validate that args is a valid object
      if (typeof args !== "object" || args === null) {
        throw new Error(
          `Invalid arguments for tool ${name}: expected object, got ${typeof args}`,
        );
      }

      // Check if shutting down before processing
      if (isShuttingDown) {
        throw new Error(`Tool ${name} rejected: server is shutting down`);
      }

      // Extract or generate requestId from args
      const requestIdArg = (args as ToolHandlerArgs)._requestId;
      const requestId =
        typeof requestIdArg === "string"
          ? requestIdArg
          : `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

      // Log tool call for debugging (to stderr to avoid breaking stdio protocol)
      if (process.env.KIBI_MCP_DEBUG) {
        console.error(
          `[KIBI-MCP] Tool called: ${name} (requestId: ${requestId}) with args:`,
          JSON.stringify(args),
        );
      }

      // Track the handler promise in inFlightRequests Map
      const handlerPromise = handler(args);
      inFlightRequests.set(requestId, handlerPromise);

      try {
        // Execute handler
        const result = await handlerPromise;
        return result;
      } finally {
        // Always clean up from Map when done (success or failure)
        inFlightRequests.delete(requestId);
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

export async function startServer(): Promise<void> {
  loadDefaultEnvFile();

  const server = new McpServer({ name: "kibi-mcp", version: "0.1.0" });

  attachMcpcat(server);

  for (const prompt of PROMPTS) {
    server.prompt(prompt.name, prompt.description, async () => ({
      messages: [
        {
          role: "user" as const,
          content: { type: "text" as const, text: prompt.text },
        },
      ],
    }));
  }

  for (const resource of DOC_RESOURCES) {
    server.resource(
      resource.name,
      resource.uri,
      { description: resource.description, mimeType: resource.mimeType },
      async () => ({
        contents: [
          {
            uri: resource.uri,
            mimeType: resource.mimeType,
            text: resource.text,
          },
        ],
      }),
    );
  }

  const toolDef = (name: string) => {
    const t = TOOLS.find((t) => t.name === name);
    if (!t) throw new Error(`Unknown tool: ${name}`);
    return t;
  };

  addTool(
    server,
    "kb_query",
    toolDef("kb_query").description,
    toolDef("kb_query").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbQuery(prolog, args as QueryArgs);
    },
  );

  addTool(
    server,
    "kb_upsert",
    toolDef("kb_upsert").description,
    toolDef("kb_upsert").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbUpsert(prolog, args as unknown as UpsertArgs);
    },
  );

  addTool(
    server,
    "kb_delete",
    toolDef("kb_delete").description,
    toolDef("kb_delete").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbDelete(prolog, args as unknown as DeleteArgs);
    },
  );

  addTool(
    server,
    "kb_check",
    toolDef("kb_check").description,
    toolDef("kb_check").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbCheck(prolog, args as CheckArgs);
    },
  );

  addTool(
    server,
    "kb_branch_ensure",
    toolDef("kb_branch_ensure").description,
    toolDef("kb_branch_ensure").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbBranchEnsure(prolog, args as unknown as BranchEnsureArgs);
    },
  );

  addTool(
    server,
    "kb_branch_gc",
    toolDef("kb_branch_gc").description,
    toolDef("kb_branch_gc").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbBranchGc(prolog, args as BranchGcArgs);
    },
  );

  addTool(
    server,
    "kb_query_relationships",
    toolDef("kb_query_relationships").description,
    toolDef("kb_query_relationships").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbQueryRelationships(prolog, args as QueryRelationshipsArgs);
    },
  );

  addTool(
    server,
    "kb_derive",
    toolDef("kb_derive").description,
    toolDef("kb_derive").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbDerive(prolog, args as unknown as DeriveArgs);
    },
  );

  addTool(
    server,
    "kb_impact",
    toolDef("kb_impact").description,
    toolDef("kb_impact").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbImpact(prolog, args as unknown as ImpactArgs);
    },
  );

  addTool(
    server,
    "kb_coverage_report",
    toolDef("kb_coverage_report").description,
    toolDef("kb_coverage_report").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbCoverageReport(prolog, args as CoverageReportArgs);
    },
  );

  addTool(
    server,
    "kb_symbols_refresh",
    toolDef("kb_symbols_refresh").description,
    toolDef("kb_symbols_refresh").inputSchema,
    async (args) => handleKbSymbolsRefresh(args as SymbolsRefreshArgs),
  );

  addTool(
    server,
    "kb_list_entity_types",
    toolDef("kb_list_entity_types").description,
    toolDef("kb_list_entity_types").inputSchema,
    handleKbListEntityTypes,
  );

  addTool(
    server,
    "kb_list_relationship_types",
    toolDef("kb_list_relationship_types").description,
    toolDef("kb_list_relationship_types").inputSchema,
    handleKbListRelationshipTypes,
  );

  addTool(
    server,
    "kbcontext",
    toolDef("kbcontext").description,
    toolDef("kbcontext").inputSchema,
    async (args) => {
      const prolog = await ensureProlog();
      return handleKbContext(
        prolog,
        args as unknown as ContextArgs,
        activeBranchName,
      );
    },
  );

  addTool(
    server,
    "get_help",
    toolDef("get_help").description,
    toolDef("get_help").inputSchema,
    async (args) => {
      const topic = typeof args?.topic === "string" ? args.topic : undefined;
      const text = getHelpText(topic);
      return {
        content: [{ type: "text" as const, text }],
        structuredContent: { topic: topic ?? "overview" },
      };
    },
  );

  const transport = new StdioServerTransport();

  transport.onerror = (error: Error) => {
    // Stdio transport surfaces JSON parse / schema validation failures via onerror.
    // Those errors should not crash the server: emit a JSON-RPC error (id omitted)
    // and continue reading subsequent messages.
    if (error.name === "SyntaxError") {
      debugLog("[KIBI-MCP] Parse error from stdin:", error.message);
      void transport
        .send({
          jsonrpc: "2.0",
          error: { code: -32700, message: "Parse error" },
        })
        .catch((sendError) => {
          console.error(
            "[KIBI-MCP] Failed to send parse error response:",
            sendError,
          );
          initiateGracefulShutdown(1);
        });
      return;
    }

    if (error.name === "ZodError") {
      debugLog("[KIBI-MCP] Invalid JSON-RPC message:", error.message);
      void transport
        .send({
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request" },
        })
        .catch((sendError) => {
          console.error(
            "[KIBI-MCP] Failed to send invalid request response:",
            sendError,
          );
          initiateGracefulShutdown(1);
        });
      return;
    }

    console.error(`[KIBI-MCP] Transport error: ${error.message}`, error);
    debugLog("[KIBI-MCP] Transport error stack:", error.stack);
    initiateGracefulShutdown(1);
  };

  transport.onclose = () => {
    debugLog("[KIBI-MCP] Transport closed");
    initiateGracefulShutdown(0);
  };

  await server.connect(transport);

  process.stdout.on("error", (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[KIBI-MCP] stdout error:", message);
    debugLog("[KIBI-MCP] stdout error detail:", error as Error);
    initiateGracefulShutdown(1);
  });

  process.stderr.on("error", (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    try {
      console.error("[KIBI-MCP] stderr error:", message);
    } catch {}
    initiateGracefulShutdown(1);
  });

  process.on("SIGTERM", () => {
    debugLog("[KIBI-MCP] Received SIGTERM");
    initiateGracefulShutdown(0);
  });

  process.on("SIGINT", () => {
    debugLog("[KIBI-MCP] Received SIGINT");
    initiateGracefulShutdown(0);
  });

  // Handle stdin EOF/close for clean shutdown when client disconnects
  // Use debugLog so these are only noisy when KIBI_MCP_DEBUG is set.
  try {
    process.stdin.on("end", () => {
      debugLog("[KIBI-MCP] stdin ended");
      // fire-and-forget; initiateGracefulShutdown is idempotent
      void initiateGracefulShutdown(0);
    });

    process.stdin.on("close", () => {
      debugLog("[KIBI-MCP] stdin closed");
      void initiateGracefulShutdown(0);
    });
  } catch (e) {
    // Defensive: do not let stdin handler setup throw during startup
    debugLog("[KIBI-MCP] Failed to attach stdin handlers:", e as Error);
  }
}
