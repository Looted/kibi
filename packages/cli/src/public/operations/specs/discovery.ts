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

const FACT_KINDS = [
  "subject",
  "property_value",
  "predicate",
  "predicate_schema",
  "observation",
  "meta",
  "rule",
  "rule_schema",
] as const;

export const querySpec = {
  name: "kb_query",
  cliName: "query",
  description:
    "Read entities from the KB with exact filters, or ask typed fact questions. Use for lookup by id, type, tags or sourceFile, and for precise questions about modeled facts: predicate facts by name with named arguments (predicate + where), property facts of a subject (subjectKey + propertyKey), or the catalog of facts of one kind (factKind; 'predicate_schema' lists the predicates you can ask about with their argument names and constants). Typed answers return matching fact rows plus factQuery: the schema used, distinct counts, values that do exist when nothing matched, warnings about the question and the next call to make. Read-only. Tags filter by metadata tags only, not entity IDs.",
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
      factKind: {
        type: "string",
        enum: FACT_KINDS,
        description:
          "Typed fact filter: list facts of one kind with their typed fields. 'predicate_schema' returns the catalog of askable predicates (argument names, constants, fact counts). Example: 'predicate_schema'.",
      },
      predicate: {
        type: "string",
        description:
          "Typed fact filter: predicate name to ask about, e.g. 'has_role' or 'permission_rule'. Combine with where for named arguments. Returns every stored fact of that predicate with its arguments, polarity and allow/deny effect.",
      },
      namespace: {
        type: "string",
        description:
          "Optional predicate namespace when the same name exists in several. Default: any namespace.",
      },
      where: {
        type: "object",
        additionalProperties: { type: "string" },
        description:
          "Named argument values for predicate, order-free, using the argument names from the predicate's schema. Example: {actor: 'admin', decision: 'allow'}. An unknown name returns a warning with the declared names; no match returns the values that do exist.",
      },
      args: {
        type: "array",
        items: { type: ["string", "null"] },
        description:
          "Positional argument values for predicate when it has no schema; null matches any value. Example: ['admin', null, null, 'allow']. Prefer where.",
      },
      polarity: {
        type: "string",
        enum: ["assert", "deny"],
        description:
          "Optional polarity filter for predicate facts. Default: both.",
      },
      scope: {
        type: "string",
        enum: ["all", "current_requirements"],
        description:
          "Optional: 'current_requirements' keeps only facts a current (not superseded or retired) requirement requires.",
      },
      distinct: {
        type: "string",
        description:
          "Optional argument name to count distinct values of across the matching predicate facts, e.g. distinct: 'role' with predicate 'has_role' and where {user: 'alice'} answers how many roles alice has.",
      },
      subjectKey: {
        type: "string",
        description:
          "Typed fact filter: dotted subject key whose property facts to list, e.g. 'user.role_assignment'. Combine with propertyKey for one property.",
      },
      propertyKey: {
        type: "string",
        description:
          "Optional property key under subjectKey, e.g. 'max_roles'. Returns operator, value and unit of each fact.",
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
      includeBody: {
        type: "boolean",
        default: false,
        description:
          "With id only: also return the entity's authored Markdown body (the prose after its front matter) as body {id, path, text}, so a stale statement in it can be corrected; kb_upsert document.body replaces it. Default: false.",
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
    "Ask the KB a question or search it. Default intent-v1 ranking accepts questions, host-agent semantic facets and changed-code source locations, returns evidence, abstains below its confidence threshold and adds an answer layer: the current requirements that govern the topic, what must stay true (linked facts), why (ADRs) and what verifies it (scenarios, tests). A weak answer may add queryAnalysis.hints from a search-hints plugin: requirements the question may mean, to re-ask with. Use before changing behavior, then kb_query for exact follow-up. No mutation side effects.",
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
        default: 10,
        description:
          "Optional max rows to return after ranking. Default: 10; raise it or page with offset when the answer layer is not enough.",
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
      hints: {
        type: "boolean",
        default: true,
        description:
          "Intent-v1 only, first page only. When true (default) and the project activates a kibi.search-hints.v1 plugin, a weak or abstained answer adds queryAnalysis.hints: requirements the question may mean, to re-ask with. Hints never change results or the answer layer.",
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
          "Optional host-agent semantic interpretation. Kibi uses these strings as deterministic aliases/facets; ranking never calls a model.",
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
    "Report current branch, KB snapshot, freshness metadata, schema status, and a typed kibi.migration-plan.v2 action graph. Call it first to orient on a branch or after a failed call; use kb_check for validation findings and kb_coverage for proof status. Read-only status inspection with no mutation side effects; damaged stores are diagnosed without starting the engine.",
  businessInputSchema: { type: "object", properties: {} },
  // Status must remain available when the branch store cannot be attached.
  requiresProlog: false,
  effects: ["kb-read", "workspace-read"],
  agentVisibleStructuredData: true,
  execute: executeStatus,
} as const satisfies OperationSpec<StatusInput, StatusPayload>;
