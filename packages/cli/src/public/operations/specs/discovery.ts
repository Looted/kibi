import { executePlaceholder } from "../types.js";
import type { OperationSpec } from "../types.js";

const ENTITY_TYPES = [
  "req",
  "scenario",
  "test",
  "adr",
  "flag",
  "event",
  "symbol",
  "fact",
] as const;

export const querySpec = {
  name: "kb_query",
  cliName: "query",
  description:
    "Read entities from the KB with filters. Use for discovery and lookup before edits. Do not use for writes. No mutation side effects. Tags filter by metadata tags only, not entity IDs.",
  businessInputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ENTITY_TYPES,
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
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;

export const searchSpec = {
  name: "kb_search",
  cliName: "search",
  description:
    "Search KB entities for discovery using metadata and markdown body text. Use for exploratory lookup before exact follow-up with kb_query. No mutation side effects.",
  businessInputSchema: {
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
        enum: ENTITY_TYPES,
        description:
          "Optional entity type filter to narrow discovery. Example: 'req'.",
      },
      limit: {
        type: "integer",
        default: 20,
        description: "Optional max rows to return after ranking. Default: 20.",
      },
      offset: {
        type: "integer",
        default: 0,
        description: "Optional zero-based pagination offset. Default: 0.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;

export const statusSpec = {
  name: "kb_status",
  cliName: "status",
  description:
    "Report current branch, snapshot, and freshness metadata for the attached KB. Read-only status inspection with no mutation side effects.",
  businessInputSchema: { type: "object", properties: {} },
  requiresProlog: true,
  effects: ["kb-read", "workspace-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;
