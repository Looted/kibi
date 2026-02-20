import "./env.js";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import { trackQueryUsage } from "./mcpcat.js";
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
  type QueryRelationshipsArgs,
  handleKbQueryRelationships,
} from "./tools/query-relationships.js";
import { type QueryArgs, handleKbQuery } from "./tools/query.js";
import {
  type SymbolsRefreshArgs,
  handleKbSymbolsRefresh,
} from "./tools/symbols.js";
import { type UpsertArgs, handleKbUpsert } from "./tools/upsert.js";

// JSON-RPC 2.0 Types
interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JsonRpcError;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

// JSON-RPC 2.0 Error Codes
const ERROR_CODES = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  // Custom error codes
  PROLOG_QUERY_FAILED: -32000,
  KB_NOT_ATTACHED: -32001,
  VALIDATION_ERROR: -32002,
} as const;

interface PromptArgumentDefinition {
  name: string;
  description: string;
  required?: boolean;
}

interface PromptDefinition {
  name: string;
  description: string;
  arguments?: PromptArgumentDefinition[];
  text: string;
}

interface DocResource {
  uri: string;
  name: string;
  description: string;
  mimeType: "text/markdown";
  text: string;
}

const TOOLS = [
  {
    name: "kb_query",
    description:
      "Read entities from the KB with filters. Use for discovery and lookup before edits. Do not use for writes. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: [
            "req",
            "scenario",
            "test",
            "adr",
            "flag",
            "event",
            "symbol",
            "fact",
          ],
          description:
            "Optional entity type filter. Allowed: req, scenario, test, adr, flag, event, symbol, fact. Example: 'req'.",
        },
        id: {
          type: "string",
          description:
            "Optional exact entity ID. Example: 'REQ-001'. If omitted, returns matching entities by other filters.",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional tag filter. Matches entities that contain any provided tag. Example: ['security','billing'].",
        },
        sourceFile: {
          type: "string",
          description:
            "Optional source-file substring filter. Example: 'src/auth/login.ts'. Uses KB source linkage, not file-system scanning.",
        },
        limit: {
          type: "number",
          default: 100,
          description:
            "Optional max rows to return after filtering. Default: 100 when omitted. Example: 25.",
        },
        offset: {
          type: "number",
          default: 0,
          description:
            "Optional zero-based pagination offset. Default: 0. Example: 50 to skip first 50 rows.",
        },
      },
    },
  },
  {
    name: "kb_upsert",
    description:
      "Create or update one entity and optional relationships. Use for KB mutations after validating intent. Prefer modeling requirements as reusable fact links (`constrains`, `requires_property`) so consistency and contradiction checks remain queryable. Do not use for read-only inspection. Side effects: writes KB, may refresh symbol coordinates.",
    inputSchema: {
      type: "object",
      required: ["type", "id", "properties"],
      properties: {
        type: {
          type: "string",
          enum: [
            "req",
            "scenario",
            "test",
            "adr",
            "flag",
            "event",
            "symbol",
            "fact",
          ],
          description:
            "Entity type to create/update. Allowed: req, scenario, test, adr, flag, event, symbol, fact. Example: 'req'.",
        },
        id: {
          type: "string",
          description:
            "Unique entity ID (string). Example: 'REQ-123'. Existing ID updates the entity; new ID creates it.",
        },
        properties: {
          type: "object",
          description:
            "Entity fields to persist. Must include title and status. If created_at, updated_at, or source are omitted, server fills defaults.",
          properties: {
            title: {
              type: "string",
              description:
                "Required short title. Example: 'Protect account settings endpoint'.",
            },
            status: {
              type: "string",
              enum: [
                "active",
                "draft",
                "archived",
                "deleted",
                "approved",
                "rejected",
                "pending",
                "in_progress",
                "superseded",
              ],
              description:
                "Required lifecycle state. Allowed values are fixed enum options. Example: 'active'.",
            },
            source: {
              type: "string",
              description:
                "Optional provenance string. Example: 'docs/requirements/REQ-123.md'. Defaults to 'mcp://kibi/upsert'.",
            },
            tags: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional categorization tags. Example: ['security','api'].",
            },
            owner: {
              type: "string",
              description:
                "Optional owner name/team. Example: 'platform-team'.",
            },
            priority: {
              type: "string",
              description: "Optional priority label. Example: 'high'.",
            },
            severity: {
              type: "string",
              description: "Optional severity label. Example: 'critical'.",
            },
            links: {
              type: "array",
              items: { type: "string" },
              description:
                "Optional references. Example: ['REQ-010','https://example.com/spec'].",
            },
            text_ref: {
              type: "string",
              description:
                "Optional text anchor/reference. Example: 'requirements.md#L40'.",
            },
          },
          required: ["title", "status"],
        },
        relationships: {
          type: "array",
          description:
            "Optional relationship rows to create in the same call. For requirement encoding, prefer `constrains` + `requires_property` edges from req IDs to shared fact IDs to maximize reuse and detect conflicts. Side effect: asserts edges in KB.",
          items: {
            type: "object",
            required: ["type", "from", "to"],
            properties: {
              type: {
                type: "string",
                enum: [
                  "depends_on",
                  "specified_by",
                  "verified_by",
                  "validates",
                  "implements",
                  "covered_by",
                  "constrained_by",
                  "constrains",
                  "requires_property",
                  "guards",
                  "publishes",
                  "consumes",
                  "supersedes",
                  "relates_to",
                ],
                description:
                  "Relationship type enum. Use only supported values. Direction semantics follow KB model (e.g., implements symbol->req, verified_by req->test).",
              },
              from: {
                type: "string",
                description:
                  "Source entity ID (must exist). Example: 'SYM-login-handler'.",
              },
              to: {
                type: "string",
                description:
                  "Target entity ID (must exist). Example: 'REQ-001'.",
              },
            },
          },
        },
      },
    },
  },
  {
    name: "kb_delete",
    description:
      "Delete entities by ID. Use only for intentional removals after dependency checks. Do not use as a bulk cleanup shortcut. Side effects: mutates and saves KB; skips entities with dependents.",
    inputSchema: {
      type: "object",
      required: ["ids"],
      properties: {
        ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Required list of entity IDs to delete. Example: ['REQ-001','TEST-002']. At least one ID is required.",
        },
      },
    },
  },
  {
    name: "kb_check",
    description:
      "Run KB validation rules and return violations. Use before or after mutations. Do not use for point lookups. No write side effects.",
    inputSchema: {
      type: "object",
      properties: {
        rules: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional rule subset. Allowed: must-priority-coverage, no-dangling-refs, no-cycles, required-fields. If omitted, server runs all.",
        },
      },
    },
  },
  {
    name: "kb_branch_ensure",
    description:
      "Ensure a branch KB exists, creating it from main when missing. Use when targeting non-main branches. Do not use to switch git branches. Side effects: creates .kb/branches/<branch>.",
    inputSchema: {
      type: "object",
      required: ["branch"],
      properties: {
        branch: {
          type: "string",
          description:
            "Required git branch name. Example: 'feature/auth-hardening'. Path traversal patterns are rejected.",
        },
      },
    },
  },
  {
    name: "kb_branch_gc",
    description:
      "Find or delete stale branch KB directories not present in git. Use for repository hygiene. Do not use if you need historical branch KBs. Side effects: can delete branch KB folders when dry_run is false.",
    inputSchema: {
      type: "object",
      properties: {
        dry_run: {
          type: "boolean",
          default: true,
          description:
            "Optional safety flag. true = report only; false = delete stale branch KBs. Default: true.",
        },
      },
    },
  },
  {
    name: "kb_query_relationships",
    description:
      "Read relationship edges with optional from/to/type filters. Use for traceability traversal. Do not use to create links. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Optional source entity ID filter. Example: 'REQ-001'.",
        },
        to: {
          type: "string",
          description: "Optional target entity ID filter. Example: 'TEST-010'.",
        },
        type: {
          type: "string",
          enum: [
            "depends_on",
            "specified_by",
            "verified_by",
            "validates",
            "implements",
            "covered_by",
            "constrained_by",
            "constrains",
            "requires_property",
            "guards",
            "publishes",
            "consumes",
            "supersedes",
            "relates_to",
          ],
          description:
            "Optional relationship type filter. Allowed enum values only. Example: 'implements'.",
        },
      },
    },
  },
  {
    name: "kb_derive",
    description:
      "Run deterministic inference predicates and return rows. Use for impact, coverage, and consistency analysis. Do not use for entity CRUD. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["rule"],
      properties: {
        rule: {
          type: "string",
          enum: [
            "transitively_implements",
            "transitively_depends",
            "impacted_by_change",
            "affected_symbols",
            "coverage_gap",
            "untested_symbols",
            "stale",
            "orphaned",
            "conflicting",
            "deprecated_still_used",
            "current_adr",
            "adr_chain",
            "superseded_by",
            "domain_contradictions",
          ],
          description:
            "Required inference rule name. Allowed values are the enum options. Example: 'coverage_gap'.",
        },
        params: {
          type: "object",
          description:
            "Optional rule-specific parameters. Example: { changed: 'REQ-001' } for impacted_by_change.",
        },
      },
    },
  },
  {
    name: "kb_impact",
    description:
      "Return entities impacted by a changed entity ID. Use for quick change blast radius checks. Do not use for general querying. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["entity"],
      properties: {
        entity: {
          type: "string",
          description: "Required changed entity ID. Example: 'REQ-001'.",
        },
      },
    },
  },
  {
    name: "kb_coverage_report",
    description:
      "Compute aggregate traceability coverage for requirements and/or symbols. Use for health snapshots. Do not use for raw entity dumps. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["req", "symbol"],
          description:
            "Optional focus scope: 'req' or 'symbol'. Omit to include both.",
        },
      },
    },
  },
  {
    name: "kb_symbols_refresh",
    description:
      "Refresh generated symbol coordinates in the symbols manifest. Use after refactors that move symbols. Do not use for semantic edits. Side effects: may rewrite symbols.yaml unless dryRun is true.",
    inputSchema: {
      type: "object",
      properties: {
        dryRun: {
          type: "boolean",
          default: false,
          description:
            "Optional preview mode. true = report only, false = apply file updates. Default: false.",
        },
      },
    },
  },
  {
    name: "kb_list_entity_types",
    description:
      "List supported entity type names. Use when building valid tool arguments. Do not use for entity data retrieval. No mutation side effects.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "kb_list_relationship_types",
    description:
      "List supported relationship type names. Use before asserting or filtering relationships. Do not use for graph traversal. No mutation side effects.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "kbcontext",
    description:
      "Return KB entities linked to a source file plus first-hop relationships. Use for file-centric traceability. Do not use for cross-repo search. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["sourceFile"],
      properties: {
        sourceFile: {
          type: "string",
          description:
            "Required source path substring. Example: 'src/auth/login.ts'.",
        },
        branch: {
          type: "string",
          description:
            "Optional branch hint for clients. Server-side handler currently resolves against attached branch context.",
        },
      },
    },
  },
  {
    name: "get_help",
    description:
      "Returns documentation for this MCP server. Call this first if you are unsure how to proceed or which tool to use. Available topics: overview, tools, workflow, constraints, examples, errors.",
    inputSchema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: [
            "overview",
            "tools",
            "workflow",
            "constraints",
            "examples",
            "errors",
          ],
          description:
            "Optional documentation section. Omit to return overview. Example: 'workflow'.",
        },
      },
    },
  },
];

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

function registerPrompts(): PromptDefinition[] {
  return [
    {
      name: "kibi_overview",
      description:
        "High-level model for using kibi-mcp safely and effectively.",
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
      description:
        "Operational limits, validation rules, and mutation gotchas.",
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
}

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

const PROMPTS = registerPrompts();
const DOC_RESOURCES = registerDocResources();

function getHelpText(topic?: string): string {
  const normalized = (topic ?? "overview").trim().toLowerCase();

  if (normalized === "tools") {
    return renderToolsDoc();
  }

  if (normalized === "workflow") {
    return (
      PROMPTS.find((prompt) => prompt.name === "kibi_workflow")?.text ?? ""
    );
  }

  if (normalized === "constraints") {
    return (
      PROMPTS.find((prompt) => prompt.name === "kibi_constraints")?.text ?? ""
    );
  }

  if (normalized === "examples") {
    return (
      DOC_RESOURCES.find((res) => res.uri === "kibi://docs/examples")?.text ??
      ""
    );
  }

  if (normalized === "errors") {
    return (
      DOC_RESOURCES.find((res) => res.uri === "kibi://docs/errors")?.text ?? ""
    );
  }

  return (
    DOC_RESOURCES.find((res) => res.uri === "kibi://docs/overview")?.text ?? ""
  );
}

// Server State
let prologProcess: PrologProcess | null = null;
let isInitialized = false;

/**
 * Create a JSON-RPC 2.0 success response
 */
function createResponse(id: string | number, result: unknown): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

/**
 * Create a JSON-RPC 2.0 error response
 */
function createError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return {
    jsonrpc: "2.0",
    id: id ?? 0,
    error: {
      code,
      message,
      data,
    },
  };
}

/**
 * Handle the 'initialize' method
 */
async function handleInitialize(
  params: unknown,
): Promise<Record<string, unknown>> {
  const clientParams = params as {
    protocolVersion?: string;
    capabilities?: unknown;
    clientInfo?: unknown;
  };

  // Log client info to stderr
  console.error(
    `[MCP] Client connected: ${JSON.stringify(clientParams.clientInfo)}`,
  );

  return {
    protocolVersion: "2024-11-05",
    serverInfo: {
      name: "kibi-mcp",
      version: "0.1.0",
    },
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  };
}

/**
 * Handle the 'notifications/initialized' notification
 */
async function handleInitializedNotification(): Promise<void> {
  console.error("[MCP] Client initialized, starting Prolog process...");

  try {
    // Start Prolog process
    prologProcess = new PrologProcess({ timeout: 30000 });
    await prologProcess.start();

    // Determine current branch from env override or git
    let branch = process.env.KIBI_BRANCH || "main";
    if (!process.env.KIBI_BRANCH) {
      try {
        const { execSync } = await import("node:child_process");
        const detected = execSync("git branch --show-current", {
          cwd: process.cwd(),
          encoding: "utf8",
          timeout: 3000,
        }).trim();
        if (detected) {
          branch = detected === "master" ? "main" : detected;
        }
      } catch {
        // fall back to main
      }
    }

    // Attach KB to the resolved branch
    const kbPath = path.resolve(process.cwd(), `.kb/branches/${branch}`);
    const attachResult = await prologProcess.query(`kb_attach('${kbPath}')`);

    if (!attachResult.success) {
      throw new Error(
        `Failed to attach KB: ${attachResult.error || "Unknown error"}`,
      );
    }

    isInitialized = true;
    console.error(
      `[MCP] Prolog process started (PID: ${prologProcess.getPid()})`,
    );
    console.error(`[MCP] KB attached: ${kbPath}`);
  } catch (error) {
    console.error(
      `[MCP] Failed to start Prolog: ${error instanceof Error ? error.message : String(error)}`,
    );
    throw error;
  }
}

/**
 * Handle the 'tools/list' method
 */
async function handleToolsList(): Promise<Record<string, unknown>> {
  return {
    tools: TOOLS,
  };
}

async function handlePromptsList(): Promise<Record<string, unknown>> {
  return {
    prompts: PROMPTS.map((prompt) => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments ?? [],
    })),
  };
}

async function handlePromptsGet(
  params: unknown,
): Promise<Record<string, unknown>> {
  const request = params as {
    name?: string;
    arguments?: Record<string, unknown>;
  };

  if (!request.name) {
    throw new Error("Missing 'name' parameter for prompts/get");
  }

  const prompt = PROMPTS.find((entry) => entry.name === request.name);
  if (!prompt) {
    throw new Error(`Unknown prompt: ${request.name}`);
  }

  return {
    description: prompt.description,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: prompt.text,
        },
      },
    ],
  };
}

async function handleResourcesList(): Promise<Record<string, unknown>> {
  return {
    resources: DOC_RESOURCES.map((resource) => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
    })),
  };
}

async function handleResourcesRead(
  params: unknown,
): Promise<Record<string, unknown>> {
  const request = params as { uri?: string };

  if (!request.uri) {
    throw new Error("Missing 'uri' parameter for resources/read");
  }

  const resource = DOC_RESOURCES.find((entry) => entry.uri === request.uri);
  if (!resource) {
    throw new Error(`Unknown resource: ${request.uri}`);
  }

  return {
    contents: [
      {
        uri: resource.uri,
        mimeType: resource.mimeType,
        text: resource.text,
      },
    ],
  };
}

/**
 * Handle tool invocation
 */
async function handleToolCall(
  toolName: string,
  params: unknown,
  requestId?: string | number,
): Promise<unknown> {
  console.error(`[MCP] Tool call: ${toolName}`);

  if (toolName === "kb_symbols_refresh") {
    return handleKbSymbolsRefresh(params as SymbolsRefreshArgs);
  }

  // Auto-initialize if not already initialized (for testing/single-request scenarios)
  if (!isInitialized || !prologProcess?.isRunning()) {
    console.error("[MCP] Auto-initializing for tool call...");
    await handleInitializedNotification();
  }

  if (!prologProcess) {
    throw new Error("Prolog process failed to initialize");
  }

  try {
    switch (toolName) {
      case "kb_query": {
        const queryArgs = params as QueryArgs;
        const startTime = Date.now();
        try {
          const result = await handleKbQuery(prologProcess, queryArgs);
          const durationMs = Date.now() - startTime;
          const structuredEntities = result.structuredContent?.entities ?? [];
          const fallbackContentLength = result.content.length ?? 0;
          const shownCount = structuredEntities.length
            ? structuredEntities.length
            : fallbackContentLength;
          const resultCount = result.structuredContent?.count ?? shownCount;
          trackQueryUsage({
            requestId,
            args: queryArgs,
            durationMs,
            resultCount,
            shownCount,
          });
          return result;
        } catch (error) {
          const durationMs = Date.now() - startTime;
          const message =
            error instanceof Error ? error.message : String(error);
          trackQueryUsage({
            requestId,
            args: queryArgs,
            durationMs,
            error: message,
          });
          throw error;
        }
      }

      case "kb_upsert":
        return await handleKbUpsert(prologProcess, params as UpsertArgs);

      case "kb_delete":
        return await handleKbDelete(prologProcess, params as DeleteArgs);

      case "kb_check":
        return await handleKbCheck(prologProcess, params as CheckArgs);

      case "kb_branch_ensure":
        return await handleKbBranchEnsure(
          prologProcess,
          params as BranchEnsureArgs,
        );

      case "kb_branch_gc":
        return await handleKbBranchGc(prologProcess, params as BranchGcArgs);

      case "kb_query_relationships":
        return await handleKbQueryRelationships(
          prologProcess,
          params as QueryRelationshipsArgs,
        );

      case "kb_derive":
        return await handleKbDerive(prologProcess, params as DeriveArgs);

      case "kb_impact":
        return await handleKbImpact(prologProcess, params as ImpactArgs);

      case "kb_coverage_report":
        return await handleKbCoverageReport(
          prologProcess,
          params as CoverageReportArgs,
        );

      case "kb_symbols_refresh":
        return await handleKbSymbolsRefresh(params as SymbolsRefreshArgs);

      case "kb_list_entity_types":
        return {
          content: [
            {
              type: "text",
              text: "Available entity types: req, scenario, test, adr, flag, event, symbol, fact",
            },
          ],
          structuredContent: {
            types: [
              "req",
              "scenario",
              "test",
              "adr",
              "flag",
              "event",
              "symbol",
              "fact",
            ],
          },
        };

      case "kb_list_relationship_types":
        return {
          content: [
            {
              type: "text",
              text: "Available relationship types: depends_on, specified_by, verified_by, validates, implements, covered_by, constrained_by, constrains, requires_property, guards, publishes, consumes, supersedes, relates_to",
            },
          ],
          structuredContent: {
            types: [
              "depends_on",
              "specified_by",
              "verified_by",
              "validates",
              "implements",
              "covered_by",
              "constrained_by",
              "constrains",
              "requires_property",
              "guards",
              "publishes",
              "consumes",
              "supersedes",
              "relates_to",
            ],
          },
        };

      case "kbcontext":
        return await handleKbContext(prologProcess, params as ContextArgs);

      case "get_help": {
        const helpArgs = (params ?? {}) as { topic?: string };
        const topic =
          typeof helpArgs.topic === "string" ? helpArgs.topic : undefined;
        const text = getHelpText(topic);
        return {
          content: [
            {
              type: "text",
              text,
            },
          ],
          structuredContent: {
            topic: topic ?? "overview",
          },
        };
      }

      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  } catch (error) {
    // Re-throw with proper error type
    if (error instanceof Error) {
      if (error.name === "KB_NOT_ATTACHED") {
        error.name = "KB_NOT_ATTACHED";
      } else if (error.message.includes("validation failed")) {
        const validationError = new Error(error.message);
        validationError.name = "VALIDATION_ERROR";
        throw validationError;
      }
    }
    throw error;
  }
}

/**
 * Dispatch a JSON-RPC request to the appropriate handler
 */
async function dispatchRequest(request: JsonRpcRequest): Promise<unknown> {
  const { method, params } = request;

  switch (method) {
    case "initialize":
      return handleInitialize(params);

    case "notifications/initialized":
      await handleInitializedNotification();
      return undefined; // Notification, no response

    case "tools/list":
      return handleToolsList();

    case "prompts/list":
      return handlePromptsList();

    case "prompts/get":
      return handlePromptsGet(params);

    case "resources/list":
      return handleResourcesList();

    case "resources/read":
      return handleResourcesRead(params);

    case "tools/call": {
      const toolParams = params as { name?: string; arguments?: unknown };
      if (!toolParams.name) {
        throw new Error("Missing 'name' parameter for tools/call");
      }
      return handleToolCall(toolParams.name, toolParams.arguments, request.id);
    }

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

/**
 * Process a single JSON-RPC message
 */
async function processMessage(line: string): Promise<void> {
  let request: JsonRpcRequest;

  // Parse JSON
  try {
    request = JSON.parse(line);
  } catch (error) {
    const response = createError(
      null,
      ERROR_CODES.PARSE_ERROR,
      "Parse error",
      error instanceof Error ? error.message : String(error),
    );
    console.log(JSON.stringify(response));
    return;
  }

  // Validate JSON-RPC structure
  if (request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    const response = createError(
      request.id ?? null,
      ERROR_CODES.INVALID_REQUEST,
      "Invalid request",
    );
    console.log(JSON.stringify(response));
    return;
  }

  // Handle notification (no id, no response)
  if (request.id === undefined) {
    try {
      await dispatchRequest(request);
    } catch (error) {
      console.error(
        `[MCP] Notification error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }

  // Handle request (has id, requires response)
  try {
    const result = await dispatchRequest(request);
    const response = createResponse(request.id, result);
    console.log(JSON.stringify(response));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    let errorCode: number = ERROR_CODES.INTERNAL_ERROR;

    // Map errors to JSON-RPC error codes
    if (errorMessage.includes("Unknown method")) {
      errorCode = ERROR_CODES.METHOD_NOT_FOUND;
    } else if (
      errorMessage.includes("Missing") ||
      errorMessage.includes("Invalid")
    ) {
      errorCode = ERROR_CODES.INVALID_PARAMS;
    } else if (errorMessage.includes("Prolog")) {
      errorCode = ERROR_CODES.PROLOG_QUERY_FAILED;
    } else if (errorMessage.includes("KB not")) {
      errorCode = ERROR_CODES.KB_NOT_ATTACHED;
    }

    const response = createError(request.id, errorCode, errorMessage);
    console.log(JSON.stringify(response));
  }
}

/**
 * Start the MCP server (stdio transport)
 */
export async function startServer(): Promise<void> {
  console.error("[MCP] Kibi MCP Server v0.1.0");
  console.error("[MCP] Listening on stdin...");

  // Set up readline interface for line-by-line stdin processing
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Process each line as a JSON-RPC message
  rl.on("line", async (line: string) => {
    if (line.trim()) {
      await processMessage(line);
    }
  });

  // Handle EOF
  rl.on("close", async () => {
    console.error("[MCP] stdin closed, shutting down...");
    if (prologProcess) {
      await prologProcess.terminate();
    }
    process.exit(0);
  });

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.error("[MCP] Shutting down...");
    if (prologProcess) {
      await prologProcess.terminate();
    }
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    console.error("[MCP] Shutting down...");
    if (prologProcess) {
      await prologProcess.terminate();
    }
    process.exit(0);
  });
}
