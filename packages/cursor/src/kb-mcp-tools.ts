// implements REQ-cursor-kibi-plugin-v1
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

export function extractKbMcpToolName(
  toolName: string | undefined,
  toolInput: unknown,
): string | undefined {
  if (toolName) {
    const normalized = toolName.trim();
    if (normalized.startsWith("kb_")) {
      return normalized;
    }
  }

  if (!isRecord(toolInput)) {
    return undefined;
  }

  const directTool = readString(toolInput, ["toolName", "tool_name", "name"]);
  if (directTool?.startsWith("kb_")) {
    return directTool;
  }

  const nestedArgs = toolInput.arguments ?? toolInput.args;
  if (isRecord(nestedArgs)) {
    const nestedTool = readString(nestedArgs, ["toolName", "tool_name", "name"]);
    if (nestedTool?.startsWith("kb_")) {
      return nestedTool;
    }
  }

  return undefined;
}
