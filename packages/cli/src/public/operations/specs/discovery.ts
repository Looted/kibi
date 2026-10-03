import {
  executeQuery,
  executeSearch,
  executeStatus,
} from "../discovery-executors.js";
import type {
  QueryInput,
  QueryPayload,
  SearchInput,
  SearchPayload,
  StatusInput,
  StatusPayload,
} from "../discovery-executors.js";
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
          "Optional exact entity ID. Example: 'REQ-cli-gc'. If omitted, returns matching entities by other filters.",
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
  agentVisibleStructuredData: true,
  execute: executeQuery,
} as const satisfies OperationSpec<QueryInput, QueryPayload>;

export const searchSpec = {
  name: "kb_search",
  cliName: "search",
  description:
    "Ask the KB a question or search it. Default intent-v1 ranking accepts questions, host-agent semantic facets and changed-code source locations, returns evidence, abstains below its confidence threshold and adds an answer layer: the current requirements that govern the topic, what must stay true (linked facts), why (ADRs) and what verifies it (scenarios, tests). Use before changing behavior, then kb_query for exact follow-up. No mutation side effects.",
  businessInputSchema: {
    type: "object",
    required: ["query"],
    properties: {
      query: {
        type: "string",
        minLength: 1,
        maxLength: 4096,
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
        minimum: 0,
        default: 20,
        description: "Optional max rows to return after ranking. Default: 20.",
      },
      offset: {
        type: "integer",
        minimum: 0,
        default: 0,
        description: "Optional zero-based pagination offset. Default: 0.",
      },
      rankingMode: {
        type: "string",
        enum: ["legacy", "intent-v1"],
        default: "intent-v1",
        description:
          "Optional deterministic ranking mode. Default intent-v1: question-aware ranking with semantic facets, source-aware evidence, graph boosts, superseded demotion and abstention. Use legacy for the older lexical ranking.",
      },
      answer: {
        type: "boolean",
        default: true,
        description:
          "Intent-v1 only, first page only. When true (default) the result includes an answer layer: current governing requirements with their linked facts, scenarios, tests and ADRs, superseded requirements listed separately, and observation facts labelled as notes. Bounded in size; discovery, not proof.",
      },
      semanticFacets: {
        type: "object",
        additionalProperties: false,
        properties: {
          actors: { type: "array", items: { type: "string" }, maxItems: 20 },
          actions: { type: "array", items: { type: "string" }, maxItems: 20 },
          objects: { type: "array", items: { type: "string" }, maxItems: 20 },
          constraints: {
            type: "array",
            items: { type: "string" },
            maxItems: 20,
          },
          aliases: { type: "array", items: { type: "string" }, maxItems: 20 },
        },
        description:
          "Optional host-agent semantic interpretation. Kibi uses these strings as deterministic aliases/facets; it does not call a model itself.",
      },
      sourceLocations: {
        type: "array",
        maxItems: 20,
        items: {
          type: "object",
          required: ["path"],
          additionalProperties: false,
          properties: {
            path: {
              type: "string",
              minLength: 1,
              description: "Workspace-relative source path.",
            },
            line: { type: "integer", minimum: 1 },
            column: { type: "integer", minimum: 1 },
            symbol: { type: "string", minLength: 1 },
          },
        },
        description:
          "Optional changed-code locations. Results are matched to source-linked symbols/entities and include source evidence.",
      },
      minScore: {
        type: "number",
        minimum: 0,
        maximum: 1,
        default: 0.18,
        description:
          "Intent-v1 acceptance threshold between 0 and 1. Low-confidence queries abstain instead of returning misleading matches.",
      },
      fields: {
        type: "string",
        enum: ["summary", "full"],
        default: "summary",
        description:
          "Optional result detail. 'summary' returns identifying metadata plus the match snippet for discovery. Use 'full' to include complete entity bodies, or follow up with kb_query for the exact entities you need.",
      },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  agentVisibleStructuredData: true,
  execute: executeSearch,
} as const satisfies OperationSpec<SearchInput, SearchPayload>;

export const statusSpec = {
  name: "kb_status",
  cliName: "status",
  description:
    "Report current branch, KB snapshot, freshness metadata, schema status, and a typed kibi.migration-plan.v2 action graph. Read-only status inspection with no mutation side effects; damaged stores are diagnosed without starting the engine.",
  businessInputSchema: { type: "object", properties: {} },
  // Status must remain available when the branch store cannot be attached.
  requiresProlog: false,
  effects: ["kb-read", "workspace-read"],
  agentVisibleStructuredData: true,
  execute: executeStatus,
} as const satisfies OperationSpec<StatusInput, StatusPayload>;
