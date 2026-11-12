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
  /** UserPromptSubmit: the text the person submitted. */
  prompt?: string;
};

function readString(
  record: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}

export function parseHookInput(raw: unknown): HookInput {
  // Only null and undefined cannot be indexed; any other value that is not a
  // record (a string, a number, an array) has none of these fields.
  const input = (raw ?? {}) as Record<string, unknown>;
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
  const prompt = readString(input, "prompt");
  if (source !== undefined) parsed.source = source;
  if (prompt !== undefined) parsed.prompt = prompt;
  if (input.tool_input !== undefined) parsed.toolInput = input.tool_input;
  if (input.stop_hook_active === true) parsed.stopHookActive = true;
  return parsed;
}

export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    // Buffer.from copies a Buffer chunk and encodes a string one.
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export function parseStdinJson(rawInput: string): unknown {
  const trimmed = rawInput.trim();
  return trimmed.length === 0 ? {} : JSON.parse(trimmed);
}
