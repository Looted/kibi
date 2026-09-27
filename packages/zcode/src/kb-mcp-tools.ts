// implements REQ-zcode-kibi-plugin-v1
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

/**
 * Canonical Kibi operation name for a host tool name. Hosts prefix MCP tools
 * (`mcp__kibi__kb_check`, `mcp__plugin_<plugin>_kibi__kb_check`,
 * `MCP:kb_check`, `kibi_kb_check`); an unprefixed `kb_check` passes through.
 */
export function canonicalKbToolName(
  toolName: string | undefined,
): string | undefined {
  const trimmed = toolName?.trim() ?? "";
  const lastSegment = trimmed.includes("__")
    ? (trimmed.split("__").at(-1) ?? "")
    : trimmed.replace(/^MCP:/i, "");
  const operation = lastSegment.replace(/^kibi_/, "");
  return operation.startsWith("kb_") ? operation : undefined;
}

export type KbMcpToolCall = {
  toolName: string;
  impactCheckRun: boolean;
  sourceFiles: string[];
};

export function extractKbMcpToolCall(
  toolName: string | undefined,
  toolInput: unknown,
): KbMcpToolCall | undefined {
  let normalizedToolName = canonicalKbToolName(toolName);

  if (!isRecord(toolInput)) {
    return normalizedToolName
      ? { toolName: normalizedToolName, impactCheckRun: false, sourceFiles: [] }
      : undefined;
  }

  normalizedToolName ??= readString(toolInput, [
    "toolName",
    "tool_name",
    "name",
  ]);
  if (!normalizedToolName?.startsWith("kb_")) {
    return undefined;
  }

  const args = readRecord(toolInput, ["arguments", "args"]);
  const payload = args ?? toolInput;
  const sourceFiles = readStringArray(payload, ["sourceFiles", "source_files"]);
  const impactCheckRun =
    normalizedToolName === "kb_check" &&
    readBoolean(payload, [
      "includeImpactDiagnostics",
      "include_impact_diagnostics",
    ]) === true &&
    readBoolean(payload, [
      "includeWorkingTreeDiff",
      "include_working_tree_diff",
    ]) === true &&
    sourceFiles.length > 0;

  return { toolName: normalizedToolName, impactCheckRun, sourceFiles };
}
