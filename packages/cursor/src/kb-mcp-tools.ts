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

function readBoolean(
  record: Record<string, unknown>,
  keys: readonly string[],
): boolean | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function readStringArray(
  record: Record<string, unknown>,
  keys: readonly string[],
): string[] {
  for (const key of keys) {
    const value = record[key];
    if (!Array.isArray(value)) {
      continue;
    }

    return value.filter(
      (item): item is string => typeof item === "string" && item.length > 0,
    );
  }

  return [];
}

function readRecord(
  record: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> | undefined {
  for (const key of keys) {
    const value = record[key];
    if (isRecord(value)) {
      return value;
    }
  }

  return undefined;
}

export type KbMcpToolCall = {
  toolName: string;
  impactCheckRun: boolean;
  sourceFiles: string[];
};

export type McpState = "observed" | "unknown";
export type KibiInterface = "mcp" | "cli" | "setup";

export function resolveKibiInterface(
  mcpState: McpState,
  workspaceTrusted: boolean,
): KibiInterface {
  if (mcpState === "observed") {
    return "mcp";
  }
  return workspaceTrusted ? "cli" : "setup";
}

export function extractKbMcpToolCall(
  toolName: string | undefined,
  toolInput: unknown,
): KbMcpToolCall | undefined {
  const directToolName = toolName?.trim();
  let normalizedToolName = directToolName?.startsWith("kb_")
    ? directToolName
    : undefined;

  if (isRecord(toolInput)) {
    normalizedToolName ??= readString(toolInput, [
      "toolName",
      "tool_name",
      "name",
    ]);

    const args = readRecord(toolInput, ["arguments", "args"]);
    const payload = args ?? toolInput;
    const includeImpactDiagnostics = readBoolean(payload, [
      "includeImpactDiagnostics",
      "include_impact_diagnostics",
    ]);
    const includeWorkingTreeDiff = readBoolean(payload, [
      "includeWorkingTreeDiff",
      "include_working_tree_diff",
    ]);
    const sourceFiles = readStringArray(payload, [
      "sourceFiles",
      "source_files",
    ]);

    if (normalizedToolName?.startsWith("kb_")) {
      return {
        toolName: normalizedToolName,
        impactCheckRun:
          normalizedToolName === "kb_check" &&
          includeImpactDiagnostics === true &&
          includeWorkingTreeDiff === true &&
          sourceFiles.length > 0,
        sourceFiles,
      };
    }

    const nestedArgs = toolInput.arguments ?? toolInput.args;
    if (isRecord(nestedArgs)) {
      const nestedTool = readString(nestedArgs, [
        "toolName",
        "tool_name",
        "name",
      ]);
      if (nestedTool?.startsWith("kb_")) {
        return { toolName: nestedTool, impactCheckRun: false, sourceFiles: [] };
      }
    }
  }

  if (normalizedToolName?.startsWith("kb_")) {
    return {
      toolName: normalizedToolName,
      impactCheckRun: false,
      sourceFiles: [],
    };
  }

  return undefined;
}

export function extractKbMcpToolName(
  toolName: string | undefined,
  toolInput: unknown,
): string | undefined {
  const toolCall = extractKbMcpToolCall(toolName, toolInput);
  if (toolCall) {
    return toolCall.toolName;
  }

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
    const nestedTool = readString(nestedArgs, [
      "toolName",
      "tool_name",
      "name",
    ]);
    if (nestedTool?.startsWith("kb_")) {
      return nestedTool;
    }
  }

  return undefined;
}
