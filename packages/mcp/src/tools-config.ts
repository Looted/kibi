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

import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { getSpec } from "kibi-runtime";
import type { OperationName } from "kibi-runtime";

import {
  DIAGNOSTIC_MODE_ENABLED,
  DIAGNOSTIC_TELEMETRY_SCHEMA,
} from "./diagnostics.js";
import { withWorkspaceRootSchema } from "./server/workspace-router.js";

interface ToolConfig {
  name: string;
  description: string;
  inputSchema: Readonly<Record<string, unknown>>;
  outputSchema?: Readonly<Record<string, unknown>>;
  annotations?: ToolAnnotations;
}

// implements REQ-kibi-mcp-tool-consolidation
/**
 * The agent-facing tool list. Narrower operations (kb_skills_list,
 * kb_semantic_advisor, kb_model_requirement, kb_suggest_predicates,
 * kb_validate_upsert) stay in the operation catalog and on the CLI; MCP
 * reaches them through kb_skills, kb_model and kb_upsert dryRun so hosts
 * load fewer tool definitions.
 */
const MCP_TOOL_ORDER = [
  "kb_query",
  "kb_search",
  "kb_status",
  "kb_skills",
  "kb_find_gaps",
  "kb_coverage",
  "kb_graph",
  "kb_model",
  "kb_upsert",
  "kb_delete",
  "kb_check",
  "kb_prepare_impact_review",
  "kb_plan_bootstrap",
  "kb_compile_intent",
  "kb_apply_plan",
  "kb_ingest_proof",
] as const satisfies readonly OperationName[];

/** Tools registered only when named in KIBI_MCP_OPTIONAL_TOOLS. */
// implements REQ-kibi-mcp-tool-consolidation
export const OPTIONAL_TOOL_NAMES = [
  "kb_sparql_remote",
  "kb_job_status",
] as const;
// implements REQ-kibi-mcp-tool-consolidation
export type OptionalToolName = (typeof OPTIONAL_TOOL_NAMES)[number];

/**
 * Parse KIBI_MCP_OPTIONAL_TOOLS: a comma-separated list of optional tool
 * names, or "all".
 */
// implements REQ-kibi-mcp-tool-consolidation
export function enabledOptionalTools(
  value: string | undefined = process.env.KIBI_MCP_OPTIONAL_TOOLS,
): ReadonlySet<OptionalToolName> {
  const requested = new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean),
  );
  return new Set(
    OPTIONAL_TOOL_NAMES.filter(
      (name) => requested.has("all") || requested.has(name),
    ),
  );
}

// implements REQ-002
const TOOL_ANNOTATIONS: Partial<Record<OperationName, ToolAnnotations>> = {
  kb_query: {
    title: "Query Kibi entities",
  },
  kb_search: {
    title: "Search Kibi knowledge base",
  },
  kb_status: {
    title: "Inspect Kibi branch status",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_skills: {
    title: "Read bundled Kibi skills",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_model: {
    title: "Model Kibi requirement prose",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_skills_list: {
    title: "List bundled Kibi skills",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_skills_load: {
    title: "Load a bundled Kibi skill",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_skills_read: {
    title: "Read a bundled Kibi skill resource",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_find_gaps: {
    title: "Find missing Kibi relationships",
  },
  kb_coverage: {
    title: "Report Kibi coverage and proofs",
  },
  kb_graph: {
    title: "Traverse Kibi graph",
  },
  kb_sparql_remote: {
    title: "Run a remote SPARQL query",
  },
  kb_semantic_advisor: {
    title: "Advise on Kibi requirement modeling",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_suggest_predicates: {
    title: "Suggest Kibi ontology predicates",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_upsert: {
    title: "Create or update Kibi entities",
  },
  kb_validate_upsert: {
    title: "Validate a Kibi upsert payload",
  },
  kb_delete: {
    title: "Delete a Kibi entity",
  },
  kb_check: {
    title: "Validate Kibi knowledge base",
  },
  kb_prepare_impact_review: {
    title: "Prepare an impact review",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_model_requirement: {
    title: "Model a Kibi requirement",
  },
  kb_compile_intent: {
    title: "Compile Kibi change intent",
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
  kb_plan_bootstrap: {
    title: "Plan Kibi bootstrap",
  },
  kb_apply_plan: {
    title: "Apply an approved Kibi plan",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
  kb_ingest_proof: {
    title: "Ingest proof-run evidence",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};

function exposedToolNames(
  optional: ReadonlySet<OptionalToolName>,
): readonly OperationName[] {
  return [
    ...MCP_TOOL_ORDER,
    ...(optional.has("kb_sparql_remote")
      ? (["kb_sparql_remote"] as const)
      : []),
  ];
}

function toolConfig(name: OperationName): ToolConfig {
  const spec = getSpec(name);
  const effects = spec.declaredEffects;
  const derived: ToolAnnotations = {
    readOnlyHint: effects.every((effect) => effect.mutability === "read"),
    destructiveHint: effects.some((effect) => effect.destructive),
    idempotentHint: effects.every((effect) => effect.retrySafety === "safe"),
    openWorldHint: effects.some((effect) => effect.openWorld),
  };
  return {
    name: spec.name,
    description: spec.description,
    inputSchema: spec.businessInputSchema,
    ...(spec.outputSchema ? { outputSchema: spec.outputSchema } : {}),
    annotations: {
      ...(TOOL_ANNOTATIONS[name] ?? {}),
      // Mutability and world-model hints are generated from the authoritative
      // operation effects. Hand-authored entries may supply presentation-only
      // metadata such as a title, but cannot contradict the catalog contract.
      ...derived,
    },
  };
}

/** Catalog tool configs for the base list plus the given optional tools. */
// implements REQ-kibi-mcp-tool-consolidation
export function buildBaseTools(
  optional: ReadonlySet<OptionalToolName> = enabledOptionalTools(),
): ToolConfig[] {
  return exposedToolNames(optional).map(toolConfig);
}

const BASE_TOOLS: readonly ToolConfig[] = buildBaseTools();

/**
 * Inject _diagnostic_telemetry schema into tool inputs when diagnostic mode is enabled.
 * Exported for unit coverage; TOOLS still applies it only when the server starts
 * with the --diagnostic-mode flag.
 */
export function withDiagnosticTelemetrySchema(
  tools: readonly ToolConfig[],
): ToolConfig[] {
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
export const TOOLS: ToolConfig[] = withWorkspaceRootSchema(
  DIAGNOSTIC_MODE_ENABLED
    ? withDiagnosticTelemetrySchema(BASE_TOOLS)
    : [...BASE_TOOLS],
);
