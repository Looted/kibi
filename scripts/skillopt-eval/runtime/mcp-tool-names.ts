/**
 * The Kibi MCP server reaches some catalog operations through consolidated
 * tools: `kb_model` dispatches by `mode`, `kb_skills` by `action`, and
 * `kb_upsert` with `dryRun: true`
 * is the read-only validation preflight. Its diagnostic usage log records the
 * routed catalog operation name, so evaluator evidence normalizes broker trace
 * calls the same way before comparing them with rubric predicates and usage
 * receipts. Keep this mapping identical to `routedOperationName` in
 * `packages/mcp/src/diagnostics.ts`.
 */
// implements REQ-kibi-mcp-tool-consolidation
export const MODEL_MODE_OPERATIONS: Readonly<Record<string, string>> = {
  analyze: "kb_semantic_advisor",
  requirement: "kb_model_requirement",
  predicates: "kb_suggest_predicates",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

// implements REQ-skillopt-codex-optimization
export function routedOperationName(
  toolName: string,
  args: Readonly<Record<string, unknown>>,
): string {
  if (toolName === "kb_model" && typeof args.mode === "string") {
    return MODEL_MODE_OPERATIONS[args.mode] ?? toolName;
  }
  if (toolName === "kb_skills") {
    if (args.action === "list") return "kb_skills_list";
    if (args.action === "load") return "kb_skills_load";
    if (args.action === "read") return "kb_skills_read";
  }
  if (toolName === "kb_upsert" && args.dryRun === true) {
    return "kb_validate_upsert";
  }
  return toolName;
}

/** Arguments of a JSON-RPC `tools/call` request payload, or `{}`. */
// implements REQ-kibi-mcp-tool-consolidation
export function toolCallArguments(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload) || !isRecord(payload.params)) return {};
  return isRecord(payload.params.arguments) ? payload.params.arguments : {};
}

const OPERATION_MCP_TOOLS: Readonly<Record<string, string>> = {
  kb_semantic_advisor: "kb_model",
  kb_model_requirement: "kb_model",
  kb_suggest_predicates: "kb_model",
  kb_validate_upsert: "kb_upsert",
  kb_skills_list: "kb_skills",
  kb_skills_load: "kb_skills",
  kb_skills_read: "kb_skills",
};

/** The default MCP tool that reaches a catalog operation. */
// implements REQ-kibi-mcp-tool-consolidation
export function mcpToolForOperation(operation: string): string {
  return OPERATION_MCP_TOOLS[operation] ?? operation;
}
