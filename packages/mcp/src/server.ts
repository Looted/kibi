import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import {
  type BranchEnsureArgs,
  type BranchGcArgs,
  handleKbBranchEnsure,
  handleKbBranchGc,
} from "./tools/branch.js";
import { type CheckArgs, handleKbCheck } from "./tools/check.js";
import { type DeleteArgs, handleKbDelete } from "./tools/delete.js";
import { type QueryArgs, handleKbQuery } from "./tools/query.js";
import {
  type QueryRelationshipsArgs,
  handleKbQueryRelationships,
} from "./tools/query-relationships.js";
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

// MCP Tool Definitions
const TOOLS = [
  {
    name: "kb_query",
    description:
      "Query entities from the knowledge base. Supports filtering by type, ID, tags, and pagination.",
    inputSchema: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["req", "scenario", "test", "adr", "flag", "event", "symbol"],
          description: "Entity type to query",
        },
        id: {
          type: "string",
          description: "Specific entity ID to retrieve",
        },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Filter by tags",
        },
        limit: {
          type: "number",
          default: 10,
          description: "Maximum number of results",
        },
        offset: {
          type: "number",
          default: 0,
          description: "Result pagination offset",
        },
      },
    },
  },
  {
    name: "kb_upsert",
    description:
      "Create or update an entity in the knowledge base. All properties are stored as RDF triples.",
    inputSchema: {
      type: "object",
      required: ["type", "id", "properties"],
      properties: {
        type: {
          type: "string",
          enum: ["req", "scenario", "test", "adr", "flag", "event", "symbol"],
          description: "Entity type",
        },
        id: {
          type: "string",
          description: "Unique entity identifier",
        },
        properties: {
          type: "object",
          description:
            "Key-value pairs to store as RDF properties (title, status, source, tags, owner, priority, etc.)",
        },
        relationships: {
          type: "array",
          description: "Optional relationships to create alongside this entity",
          items: {
            type: "object",
            required: ["type", "from", "to"],
            properties: {
              type: { type: "string" },
              from: { type: "string" },
              to: { type: "string" },
            },
          },
        },
      },
    },
  },
  {
    name: "kb_delete",
    description:
      "Delete an entity and all its properties from the knowledge base.",
    inputSchema: {
      type: "object",
      required: ["type", "id"],
      properties: {
        type: {
          type: "string",
          enum: ["req", "scenario", "test", "adr", "flag", "event", "symbol"],
          description: "Entity type",
        },
        id: {
          type: "string",
          description: "Entity ID to delete",
        },
      },
    },
  },
  {
    name: "kb_check",
    description:
      "Run validation rules on the knowledge base. Returns violations array with rule names and entity IDs.",
    inputSchema: {
      type: "object",
      properties: {
        rules: {
          type: "array",
          items: { type: "string" },
          description:
            "Specific rules to check (optional, defaults to all). Available: must-priority-coverage, no-dangling-refs, no-cycles, required-fields",
        },
      },
    },
  },
  {
    name: "kb_branch_ensure",
    description:
      "Ensure a branch exists in the knowledge base. Creates if missing.",
    inputSchema: {
      type: "object",
      required: ["branch"],
      properties: {
        branch: {
          type: "string",
          description: "Branch name (e.g., 'main', 'feature/xyz')",
        },
      },
    },
  },
  {
    name: "kb_branch_gc",
    description:
      "Garbage collect unused branches from the knowledge base. Preserves 'main' branch.",
    inputSchema: {
      type: "object",
      properties: {
        dry_run: {
          type: "boolean",
          default: true,
          description: "If true, only report what would be deleted",
        },
      },
    },
  },
  {
    name: "kb_query_relationships",
    description:
      "Query relationships between entities. Filter by source entity (from), target entity (to), or relationship type.",
    inputSchema: {
      type: "object",
      properties: {
        from: {
          type: "string",
          description: "Source entity ID",
        },
        to: {
          type: "string",
          description: "Target entity ID",
        },
        type: {
          type: "string",
          enum: [
            "depends_on",
            "specified_by",
            "verified_by",
            "implements",
            "covered_by",
            "constrained_by",
            "guards",
            "publishes",
            "consumes",
            "relates_to",
          ],
          description: "Relationship type to filter by",
        },
      },
    },
  },
  {
    name: "kb_list_entity_types",
    description: "List all supported entity types in the knowledge base.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "kb_list_relationship_types",
    description: "List all supported relationship types in the knowledge base.",
    inputSchema: { type: "object", properties: {} },
  },
];

// Server State
let prologProcess: PrologProcess | null = null;
let isInitialized = false;

/**
 * Type for tool handler functions
 */
type ToolHandler = (
  prolog: PrologProcess,
  params: any,
) => Promise<unknown>;

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
        if (detected && detected !== "master") branch = detected;
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

/**
 * Handle kb_list_entity_types tool
 */
async function handleKbListEntityTypes(
  _prolog: PrologProcess,
  _params: unknown,
): Promise<unknown> {
  return {
    content: [
      {
        type: "text",
        text: "Available entity types: req, scenario, test, adr, flag, event, symbol",
      },
    ],
    structuredContent: {
      types: ["req", "scenario", "test", "adr", "flag", "event", "symbol"],
    },
  };
}

/**
 * Handle kb_list_relationship_types tool
 */
async function handleKbListRelationshipTypes(
  _prolog: PrologProcess,
  _params: unknown,
): Promise<unknown> {
  return {
    content: [
      {
        type: "text",
        text: "Available relationship types: depends_on, specified_by, verified_by, implements, covered_by, constrained_by, guards, publishes, consumes, relates_to",
      },
    ],
    structuredContent: {
      types: [
        "depends_on",
        "specified_by",
        "verified_by",
        "implements",
        "covered_by",
        "constrained_by",
        "guards",
        "publishes",
        "consumes",
        "relates_to",
      ],
    },
  };
}

/**
 * Map of tool names to their handlers
 */
const TOOL_HANDLERS: Record<string, ToolHandler> = {
  kb_query: (prolog, params) =>
    handleKbQuery(prolog, params as Record<string, unknown>),
  kb_upsert: (prolog, params) => handleKbUpsert(prolog, params as UpsertArgs),
  kb_delete: (prolog, params) => handleKbDelete(prolog, params as DeleteArgs),
  kb_check: (prolog, params) => handleKbCheck(prolog, params as CheckArgs),
  kb_branch_ensure: (prolog, params) =>
    handleKbBranchEnsure(prolog, params as BranchEnsureArgs),
  kb_branch_gc: (prolog, params) =>
    handleKbBranchGc(prolog, params as BranchGcArgs),
  kb_query_relationships: (prolog, params) =>
    handleKbQueryRelationships(prolog, params as QueryRelationshipsArgs),
  kb_list_entity_types: handleKbListEntityTypes,
  kb_list_relationship_types: handleKbListRelationshipTypes,
};

/**
 * Handle tool invocation
 */
async function handleToolCall(
  toolName: string,
  params: unknown,
): Promise<unknown> {
  console.error(`[MCP] Tool call: ${toolName}`);

  // Auto-initialize if not already initialized (for testing/single-request scenarios)
  if (!isInitialized || !prologProcess?.isRunning()) {
    console.error("[MCP] Auto-initializing for tool call...");
    await handleInitializedNotification();
  }

  if (!prologProcess) {
    throw new Error("Prolog process failed to initialize");
  }

  try {
    const handler = TOOL_HANDLERS[toolName];
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await handler(prologProcess, params);
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

    case "tools/call": {
      const toolParams = params as { name?: string; arguments?: unknown };
      if (!toolParams.name) {
        throw new Error("Missing 'name' parameter for tools/call");
      }
      return handleToolCall(toolParams.name, toolParams.arguments);
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
