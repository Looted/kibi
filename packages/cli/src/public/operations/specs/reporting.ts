import { executePlaceholder } from "../types.js";
import type { OperationSpec } from "../types.js";

export const findGapsSpec = {
  name: "kb_find_gaps",
  cliName: "find-gaps",
  description:
    "Run bulk missing/present relationship analysis over KB entities. Use for questions like which requirements lack scenarios or tests. No mutation side effects.",
  businessInputSchema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["req", "scenario", "test", "adr", "flag", "event", "symbol", "fact"],
      },
      missingRelationships: { type: "array", items: { type: "string" } },
      presentRelationships: { type: "array", items: { type: "string" } },
      tags: { type: "array", items: { type: "string" } },
      sourceFile: { type: "string" },
      limit: { type: "integer", default: 100 },
      offset: { type: "integer", default: 0 },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;

export const coverageSpec = {
  name: "kb_coverage",
  cliName: "coverage",
  description:
    "Generate curated coverage reports for requirements, symbols, or grouped types. Read-only reporting with no mutation side effects.",
  businessInputSchema: {
    type: "object",
    properties: {
      by: { type: "string", enum: ["req", "symbol", "type"], default: "req" },
      tags: { type: "array", items: { type: "string" } },
      includePassing: { type: "boolean", default: false },
      includeTransitive: { type: "boolean", default: true },
      limit: { type: "integer", default: 100 },
      offset: { type: "integer", default: 0 },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;

export const graphSpec = {
  name: "kb_graph",
  cliName: "graph",
  description:
    "Run bounded graph traversal from one or more seed IDs across curated relationship types. No mutation side effects.",
  businessInputSchema: {
    type: "object",
    required: ["seedIds"],
    properties: {
      seedIds: { type: "array", items: { type: "string" } },
      relationships: { type: "array", items: { type: "string" } },
      direction: {
        type: "string",
        enum: ["outgoing", "incoming", "both"],
        default: "outgoing",
      },
      depth: { type: "integer", default: 1, minimum: 1, maximum: 5 },
      entityTypes: { type: "array", items: { type: "string" } },
      maxNodes: { type: "integer", default: 200 },
      maxEdges: { type: "integer", default: 500 },
    },
  },
  requiresProlog: true,
  effects: ["kb-read"],
  execute: executePlaceholder,
} as const satisfies OperationSpec;
