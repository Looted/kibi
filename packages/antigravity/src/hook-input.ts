export type AntigravityHookInput = {
  event: string;
  conversationId?: string | undefined;
  workspacePaths: string[];
  cwd?: string | undefined;
  lastUserInput?: string | undefined;
  invocationNum?: number | undefined;
  toolCallId?: string | undefined;
  toolName?: string | undefined;
  toolArgs?: Record<string, unknown> | undefined;
  error?: string | undefined;
  terminationReason?: string | undefined;
  fullyIdle?: boolean | undefined;
  continuationActive: boolean;
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function readString(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function readBoolean(
  record: Record<string, unknown>,
  keys: readonly string[],
): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function readStringArray(
  record: Record<string, unknown>,
  keys: readonly string[],
): string[] {
  for (const key of keys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      );
    }
  }
  return [];
}

function readNumber(
  record: Record<string, unknown>,
  keys: readonly string[],
): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

/**
 * Parse Antigravity's protojson (camelCase) hook stdin payload.
 *
 * Common fields include `hookEventName`, `conversationId`, `workspacePaths`,
 * `cwd`, and `lastUserInput`. Tool hooks wrap the call under `toolCall`
 * (`id`, `name`, `args`), and `Stop` provides `terminationReason` and
 * `continuationActive`.
 */
export function parseHookInput(raw: unknown): AntigravityHookInput {
  const input = asRecord(raw);
  const toolCall = asRecord(input.toolCall ?? input.tool_call);
  const argsRecord =
    toolCall.args ?? toolCall.arguments ?? input.toolInput ?? input.tool_input;
  const toolArgs =
    typeof argsRecord === "object" &&
    argsRecord !== null &&
    !Array.isArray(argsRecord)
      ? (argsRecord as Record<string, unknown>)
      : undefined;

  return {
    event:
      readString(input, ["hookEventName", "hook_event_name", "event"]) ?? "",
    conversationId: readString(input, [
      "conversationId",
      "conversation_id",
      "sessionId",
      "session_id",
    ]),
    workspacePaths: readStringArray(input, [
      "workspacePaths",
      "workspace_paths",
    ]),
    cwd: readString(input, ["cwd"]),
    lastUserInput: readString(input, [
      "lastUserInput",
      "last_user_input",
      "prompt",
    ]),
    invocationNum: readNumber(input, ["invocationNum", "invocation_num"]),
    toolCallId: readString(toolCall, ["id"]),
    toolName:
      readString(toolCall, ["name"]) ??
      readString(input, ["toolName", "tool_name"]),
    toolArgs,
    error: readString(input, ["error"]),
    terminationReason: readString(input, [
      "terminationReason",
      "termination_reason",
    ]),
    fullyIdle: readBoolean(input, ["fullyIdle", "fully_idle"]),
    continuationActive:
      readBoolean(input, [
        "continuationActive",
        "continuation_active",
        "stopHookActive",
        "stop_hook_active",
      ]) ?? false,
  };
}
