// implements REQ-cursor-kibi-plugin-v1
export type HookEvent =
  | "sessionStart"
  | "preToolUse"
  | "postToolUse"
  | "beforeReadFile"
  | "stop";

export type HookInput = {
  event: string;
  cwd?: string;
  toolName?: string;
  toolInput?: unknown;
  conversationId?: string;
  filePath?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
}

function normalizeEventName(event: string): string {
  const trimmed = event.trim();
  if (trimmed.length === 0) {
    return "";
  }

  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export function parseHookInput(input: unknown): HookInput {
  if (!isRecord(input)) {
    return { event: "" };
  }

  const rawEvent =
    readString(input, [
      "event",
      "hook_event",
      "hookEvent",
      "hook_event_name",
      "name",
    ]) ?? "";
  const event = normalizeEventName(rawEvent);
  const cwd = readString(input, [
    "cwd",
    "current_working_directory",
    "workspace",
  ]);
  const toolName = readString(input, ["toolName", "tool_name", "tool"]);
  const toolInput = input.toolInput ?? input.tool_input ?? input.input;
  const conversationId = readString(input, [
    "conversation_id",
    "conversationId",
  ]);
  const filePath = readString(input, ["file_path", "filePath", "path"]);
  const parsed: HookInput = { event };

  if (cwd !== undefined) {
    parsed.cwd = cwd;
  }

  if (toolName !== undefined) {
    parsed.toolName = toolName;
  }

  if (toolInput !== undefined) {
    parsed.toolInput = toolInput;
  }

  if (conversationId !== undefined) {
    parsed.conversationId = conversationId;
  }

  if (filePath !== undefined) {
    parsed.filePath = filePath;
  }

  return parsed;
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function parseStdinJson(rawInput: string): unknown {
  const trimmed = rawInput.trim();
  if (trimmed.length === 0) {
    return {};
  }

  return JSON.parse(trimmed);
}
