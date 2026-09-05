export const REQUIRED_KIBI_TOOLS = [
  "kb_plan_bootstrap",
  "kb_apply_plan",
  "kb_search",
  "kb_query",
  "kb_status",
  "kb_semantic_advisor",
  "kb_suggest_predicates",
  "kb_model_requirement",
  "kb_validate_upsert",
  "kb_check",
  "kb_graph",
  "kb_upsert",
  "kb_delete",
  "kb_ingest_proof",
  "kb_coverage",
  "kb_skills_list",
  "kb_skills_load",
  "kb_skills_read",
] as const;

type ToolDescriptor = Readonly<{ name: string } & Record<string, unknown>>;
type ToolListResponse = Readonly<{
  jsonrpc: unknown;
  id: unknown;
  result: Readonly<
    { tools: readonly ToolDescriptor[] } & Record<string, unknown>
  >;
}> &
  Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isToolDescriptor(value: unknown): value is ToolDescriptor {
  return isRecord(value) && typeof value.name === "string";
}

// implements REQ-skillopt-codex-optimization
export function filterAdvertisedTools(
  message: Readonly<Record<string, unknown>>,
): ToolListResponse {
  const result = message.result;
  if (!isRecord(result) || !Array.isArray(result.tools)) {
    throw new TypeError("tools_list_response_missing_tools");
  }
  const available = new Map(
    result.tools.filter(isToolDescriptor).map((tool) => [tool.name, tool]),
  );
  const tools = REQUIRED_KIBI_TOOLS.flatMap((name) => {
    const tool = available.get(name);
    return tool === undefined ? [] : [tool];
  });
  if (tools.length !== REQUIRED_KIBI_TOOLS.length) {
    throw new McpBrokerError("startup");
  }
  return {
    ...message,
    jsonrpc: message.jsonrpc,
    id: message.id,
    result: { ...result, tools },
  };
}

type BrokerLaunch = Readonly<{
  command: string;
  args: readonly string[];
  cwd: string;
}>;

export type BrokerOptions = Readonly<{
  downstream: BrokerLaunch;
  tracePath: string;
  startupTimeoutMs: number;
  toolTimeoutMs: number;
  killGraceMs: number;
}>;

export class McpBrokerError extends Error {
  readonly name = "McpBrokerError";

  constructor(
    readonly kind: "startup" | "timeout" | "protocol" | "server_exit",
  ) {
    super(`mcp_broker_${kind}`);
  }
}
