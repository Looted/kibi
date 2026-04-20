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

import {
  DIAGNOSTIC_MODE_ENABLED,
  DIAGNOSTIC_TELEMETRY_SCHEMA,
} from "./diagnostics.js";

const BASE_TOOLS = [
  // implements REQ-002
  {
    name: "kb_query",
    description:
      "Read entities from the KB with filters. Use for discovery and lookup before edits. Do not use for writes. No mutation side effects. Tags filter by metadata tags only, not entity IDs.",
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
    name: "kb_search",
    description:
      "Search KB entities for discovery using metadata and markdown body text. Use for exploratory lookup before exact follow-up with kb_query. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["query"],
      properties: {
        query: {
          type: "string",
          description:
            "Free-text query for metadata and markdown body discovery. Example: 'OAuth login flow'.",
        },
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
            "Optional entity type filter to narrow discovery. Example: 'req'.",
        },
        limit: {
          type: "integer",
          default: 20,
          description:
            "Optional max rows to return after ranking. Default: 20.",
        },
        offset: {
          type: "integer",
          default: 0,
          description: "Optional zero-based pagination offset. Default: 0.",
        },
      },
    },
  },
  {
    name: "kb_status",
    description:
      "Report current branch, snapshot, and freshness metadata for the attached KB. Read-only status inspection with no mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "kb_find_gaps",
    description:
      "Run bulk missing/present relationship analysis over KB entities. Use for questions like which requirements lack scenarios or tests. No mutation side effects.",
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
        },
        missingRelationships: {
          type: "array",
          items: { type: "string" },
        },
        presentRelationships: {
          type: "array",
          items: { type: "string" },
        },
        tags: {
          type: "array",
          items: { type: "string" },
        },
        sourceFile: {
          type: "string",
        },
        limit: {
          type: "integer",
          default: 100,
        },
        offset: {
          type: "integer",
          default: 0,
        },
      },
    },
  },
  {
    name: "kb_coverage",
    description:
      "Generate curated coverage reports for requirements, symbols, or grouped types. Read-only reporting with no mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        by: {
          type: "string",
          enum: ["req", "symbol", "type"],
          default: "req",
        },
        tags: {
          type: "array",
          items: { type: "string" },
        },
        includePassing: {
          type: "boolean",
          default: false,
        },
        includeTransitive: {
          type: "boolean",
          default: true,
        },
        limit: {
          type: "integer",
          default: 100,
        },
        offset: {
          type: "integer",
          default: 0,
        },
      },
    },
  },
  {
    name: "kb_graph",
    description:
      "Run bounded graph traversal from one or more seed IDs across curated relationship types. No mutation side effects.",
    inputSchema: {
      type: "object",
      required: ["seedIds"],
      properties: {
        seedIds: {
          type: "array",
          items: { type: "string" },
        },
        relationships: {
          type: "array",
          items: { type: "string" },
        },
        direction: {
          type: "string",
          enum: ["outgoing", "incoming", "both"],
          default: "outgoing",
        },
        depth: {
          type: "integer",
          default: 1,
          minimum: 1,
          maximum: 5,
        },
        entityTypes: {
          type: "array",
          items: { type: "string" },
        },
        maxNodes: {
          type: "integer",
          default: 200,
        },
        maxEdges: {
          type: "integer",
          default: 500,
        },
      },
    },
  },
  {
    name: "kb_upsert",
    description:
      "Create or update one entity and optional relationships. Use for KB mutations after validating intent. Use the `relationships` array for batch creation of multiple links in a single call (e.g., linking a requirement to multiple tests or facts). Prefer modeling requirements as reusable fact links (`constrains`, `requires_property`) so consistency and contradiction checks remain queryable. Relationship endpoints must already exist in KB. For requirements, the write will be rejected if it contradicts existing current requirements that constrain the same subject with incompatible properties. To replace a conflicting requirement, include a `supersedes` relationship from the new requirement to the old one in the same request. Do not use for read-only inspection. Side effects: writes KB, may refresh symbol coordinates.",
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
              description:
                "Required lifecycle state. Allowed values depend on entity type; backward-compatible legacy statuses are also accepted. Examples: 'open', 'passing', 'accepted', 'active'.",
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
                  "executable_for",
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
                  "Relationship type enum. Use only supported values. Direction semantics follow KB model (e.g., implements symbol->req, verified_by req/scenario->test, executable_for symbol->test).",
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
      "Run KB validation rules and return violations. Use before or after mutations. Do not use for point lookups. No write side effects. Prefer explicit rules for faster iteration.",
    inputSchema: {
      type: "object",
      properties: {
        rules: {
          type: "array",
          items: {
            type: "string",
            enum: [
              "must-priority-coverage",
              "symbol-coverage",
              "symbol-traceability",
              "no-dangling-refs",
              "no-cycles",
              "required-fields",
              "deprecated-adr-no-successor",
              "domain-contradictions",
              "strict-fact-shape",
            ],
          },
          description:
            "Optional rule subset. Allowed: must-priority-coverage, symbol-coverage, symbol-traceability, no-dangling-refs, no-cycles, required-fields, deprecated-adr-no-successor, domain-contradictions, strict-fact-shape. If omitted, server runs all.",
        },
      },
    },
  },
  {
    name: "kb_autopilot_generate",
    description:
      "Generate autopilot candidate batches for KB population. Read-only analysis that returns activation state, candidate entities with evidence, payoff summary, and exact applyPlan payloads for later kb_upsert calls. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        includeGenericMarkdown: {
          type: "boolean",
          default: true,
          description:
            "Whether to include generic markdown file content as candidate facts. Default: true.",
        },
        minConfidence: {
          type: "number",
          default: 0.8,
          minimum: 0.6,
          maximum: 0.95,
          description:
            "Minimum confidence threshold for candidates. Clamped to [0.60, 0.95]. Default: 0.80.",
        },
        maxCandidates: {
          type: "integer",
          default: 50,
          minimum: 1,
          maximum: 200,
          description:
            "Maximum number of candidates to return. Clamped to [1, 200]. Default: 50.",
        },
        entityTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["req", "scenario", "test", "adr", "fact", "symbol"],
          },
          description:
            "Optional filter to limit candidate generation to specific entity types.",
        },
      },
    },
  },
  {
    name: "kb_briefing_generate",
    description:
      "Generate a deterministic, read-only, start-task briefing from task text, source files, and seed IDs. No mutation side effects.",
    inputSchema: {
      type: "object",
      properties: {
        taskText: {
          type: "string",
          description:
            "Optional task description used to rank relevant cited entities for the briefing.",
        },
        sourceFiles: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional source-file paths used to gather cited entities for the briefing.",
        },
        seedIds: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional seed entity IDs used to anchor the briefing graph expansion.",
        },
      },
    },
  }
];

/**
 * Tool configuration type with flexible inputSchema.
 */
interface ToolConfig {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * Inject _diagnostic_telemetry schema into tool inputs when diagnostic mode is enabled.
 * TODO: This function is compile-time guarded by DIAGNOSTIC_MODE_ENABLED and only
 * executes when the server starts with the --diagnostic-mode flag. It cannot be
 * covered without a CLI integration test.
 */
function withDiagnosticTelemetrySchema(tools: ToolConfig[]): ToolConfig[] {
  return tools.map((tool) => {
    const schema = tool.inputSchema;
    const properties =
      schema.properties && typeof schema.properties === "object"
        ? (schema.properties as Record<string, unknown>)
        : {};
    return {
      ...tool,
      inputSchema: {
        ...schema,
        properties: {
          ...properties,
          _diagnostic_telemetry: DIAGNOSTIC_TELEMETRY_SCHEMA,
        },
      },
    };
  });
}

/**
 * Active tools list.
 * In diagnostic mode, all tools include the _diagnostic_telemetry parameter.
 */
export const TOOLS: ToolConfig[] = DIAGNOSTIC_MODE_ENABLED
  ? withDiagnosticTelemetrySchema(BASE_TOOLS as ToolConfig[])
  : (BASE_TOOLS as ToolConfig[]);
