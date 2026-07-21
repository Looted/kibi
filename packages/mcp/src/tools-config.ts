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

import { getSpec } from "kibi-cli/operations";
import type { OperationName } from "kibi-cli/operations";

import {
  DIAGNOSTIC_MODE_ENABLED,
  DIAGNOSTIC_TELEMETRY_SCHEMA,
} from "./diagnostics.js";

interface ToolConfig {
  name: string;
  description: string;
  inputSchema: Readonly<Record<string, unknown>>;
}

const MCP_TOOL_ORDER = [
  "kb_query",
  "kb_search",
  "kb_status",
  "kb_skills_list",
  "kb_skills_load",
  "kb_skills_read",
  "kb_find_gaps",
  "kb_coverage",
  "kb_graph",
  "kb_sparql_remote",
  "kb_semantic_advisor",
  "kb_upsert",
  "kb_validate_upsert",
  "kb_delete",
  "kb_check",
  "kb_model_requirement",
  "kb_suggest_predicates",
  "kb_autopilot_generate",
] as const satisfies readonly OperationName[];

const BASE_TOOLS: readonly ToolConfig[] = MCP_TOOL_ORDER.map((name) => {
  const spec = getSpec(name);
  return {
    name: spec.name,
    description: spec.description,
    inputSchema: spec.businessInputSchema,
  };
});

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
export const TOOLS: ToolConfig[] = DIAGNOSTIC_MODE_ENABLED
  ? withDiagnosticTelemetrySchema(BASE_TOOLS)
  : [...BASE_TOOLS];
