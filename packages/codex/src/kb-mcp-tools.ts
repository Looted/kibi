// implements REQ-codex-kibi-plugin-v1
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

export function extractKbMcpToolCall(
  toolName: string | undefined,
  toolInput: unknown,
): KbMcpToolCall | undefined {
  const directToolName = toolName?.trim();
  let normalizedToolName = directToolName?.startsWith("kb_")
    ? directToolName
    : undefined;

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
