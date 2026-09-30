// implements REQ-claude-code-kibi-plugin-v1
/**
 * Claude Code hook input (JSON on stdin). Only the fields the runner uses are
 * parsed; everything else is ignored so newer hosts stay compatible.
 */
export type HookInput = {
  event: string;
  sessionId?: string;
  cwd?: string;
  toolName?: string;
  toolInput?: unknown;
  /** Stop: true when the conversation already continued because of a Stop hook. */
  stopHookActive?: boolean;
  /** SessionStart: startup | resume | clear | compact. */
  source?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

export function parseHookInput(input: unknown): HookInput {
  if (!isRecord(input)) {
    return { event: "" };
  }

  const parsed: HookInput = {
    event: readString(input, "hook_event_name") ?? "",
  };
  const sessionId = readString(input, "session_id");
  const cwd = readString(input, "cwd");
  const toolName = readString(input, "tool_name");
  const source = readString(input, "source");
  if (sessionId !== undefined) parsed.sessionId = sessionId;
  if (cwd !== undefined) parsed.cwd = cwd;
  if (toolName !== undefined) parsed.toolName = toolName;
  if (source !== undefined) parsed.source = source;
  if (input.tool_input !== undefined) parsed.toolInput = input.tool_input;
  if (input.stop_hook_active === true) parsed.stopHookActive = true;
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
  return trimmed.length === 0 ? {} : JSON.parse(trimmed);
}
