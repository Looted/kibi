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
  // `String(undefined)` is "undefined", which is no kb_ operation either.
  const trimmed = String(toolName).trim();
  const lastSegment = trimmed.includes("__")
    ? (trimmed.split("__").at(-1) as string)
    : trimmed.replace(/^MCP:/i, "");
  const operation = lastSegment.replace(/^kibi_/, "");
  return operation.startsWith("kb_") ? operation : undefined;
}

/**
 * The public tool argument naming the workspace a Kibi MCP call is about.
 * Host pre-tool hooks fill it from the agent's current directory on every
 * Kibi MCP call; kibi-mcp answers from that workspace, so a session working
 * in a git worktree is never answered from another checkout's branch.
 */
export const KIBI_WORKSPACE_ARGUMENT = "workspaceRoot";

/**
 * True for a Kibi MCP tool as hosts name it in pre-tool hooks:
 * `mcp__<server>__kb_*` from a server whose name mentions kibi, or Cursor's
 * `MCP:kb_*` (Cursor does not name the server there).
 */
export function isKibiMcpToolName(toolName: string | undefined): boolean {
  const name = String(toolName).trim();
  if (/^MCP:kb_[a-z_]+$/i.test(name)) return true;
  const segments = name.split("__");
  if (segments[0] !== "mcp") return false;
  // Fewer than three segments leave the server empty, which never matches.
  const server = segments.slice(1, -1).join("__");
  return /kibi/i.test(server) && /^kb_[a-z_]+$/.test(segments.at(-1) as string);
}

/**
 * The Kibi MCP tool input with the workspace stamp added, or undefined when
 * the tool is not a Kibi MCP tool or no workspace is known.
 */
export function stampKibiWorkspace(
  toolName: string | undefined,
  toolInput: unknown,
  workspaceRoot: string | undefined,
): Record<string, unknown> | undefined {
  if (!workspaceRoot || !isKibiMcpToolName(toolName)) return undefined;
  const base = isRecord(toolInput) ? toolInput : {};
  return { ...base, [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot };
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

const TOOL_NAME_KEYS = ["toolName", "tool_name", "name"] as const;

export function extractKbMcpToolCall(
  toolName: string | undefined,
  toolInput: unknown,
): KbMcpToolCall | undefined {
  const input = isRecord(toolInput) ? toolInput : {};
  let name = canonicalKbToolName(toolName) ?? readString(input, TOOL_NAME_KEYS);
  if (!name?.startsWith("kb_")) {
    // Hosts that wrap MCP calls may name the tool inside the arguments only.
    const nested = input.arguments ?? input.args;
    const nestedTool = isRecord(nested)
      ? readString(nested, TOOL_NAME_KEYS)
      : undefined;
    return nestedTool?.startsWith("kb_")
      ? { toolName: nestedTool, impactCheckRun: false, sourceFiles: [] }
      : undefined;
  }

  const payload = readRecord(input, ["arguments", "args"]) ?? input;
  // A dry-run upsert only validates; report it as the read-only operation
  // it routes to so hooks do not treat it as a KB write.
  if (name === "kb_upsert" && readBoolean(payload, ["dryRun"]) === true) {
    name = "kb_validate_upsert";
  }
  const sourceFiles = readStringArray(payload, ["sourceFiles", "source_files"]);
  return {
    toolName: name,
    impactCheckRun:
      name === "kb_check" &&
      readBoolean(payload, [
        "includeImpactDiagnostics",
        "include_impact_diagnostics",
      ]) === true &&
      readBoolean(payload, [
        "includeWorkingTreeDiff",
        "include_working_tree_diff",
      ]) === true &&
      sourceFiles.length > 0,
    sourceFiles,
  };
}

export function extractKbMcpToolName(
  toolName: string | undefined,
  toolInput: unknown,
): string | undefined {
  return extractKbMcpToolCall(toolName, toolInput)?.toolName;
}

/** Project-local CLI routes and the Kibi operation each one runs. */
const KIBI_CLI_ROUTES: Readonly<Record<string, string>> = {
  check: "kb_check",
  query: "kb_query",
  "kb-query": "kb_query",
  search: "kb_search",
  status: "kb_status",
  graph: "kb_graph",
  coverage: "kb_coverage",
  "find-gaps": "kb_find_gaps",
  gaps: "kb_find_gaps",
  upsert: "kb_upsert",
  sync: "kb_sync",
};

/**
 * The Kibi operation a shell command runs through the project-local CLI
 * (`kibi search`, `npx --no-install kibi query --input -`), or undefined.
 */
export function kibiCliOperation(command: unknown): string | undefined {
  if (typeof command !== "string") return undefined;
  const route = /(?:^|[\s;&|(/])kibi\s+([a-z-]+)/.exec(command)?.[1];
  return route ? KIBI_CLI_ROUTES[route] : undefined;
}

/** Host tool names that run a shell command from `tool_input.command`. */
const SHELL_TOOL_NAMES = new Set(["Bash", "bash", "Shell", "shell"]);

/**
 * The Kibi operation a host tool call ran through either peer surface: a Kibi
 * MCP tool under any host prefix, or the project-local CLI in a shell tool.
 */
export function hostKbOperation(
  toolName: string | undefined,
  toolInput: unknown,
): string | undefined {
  // A canonical name always starts with kb_, and `String(undefined)` never
  // matches, so only the operation's characters are checked.
  const mcp = canonicalKbToolName(toolName);
  if (/kb_[a-z_]+$/.test(String(mcp))) return mcp;
  if (!toolName || !SHELL_TOOL_NAMES.has(toolName) || !isRecord(toolInput)) {
    return undefined;
  }
  return kibiCliOperation(toolInput.command);
}
