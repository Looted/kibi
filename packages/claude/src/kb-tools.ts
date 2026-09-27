// implements REQ-claude-code-kibi-plugin-v1
/**
 * Recognize Kibi usage in tool calls so hooks can stay quiet once the agent is
 * already using the knowledge base.
 *
 * Kibi is reachable through two peer surfaces:
 * - MCP tools, which Claude Code reports with a host prefix such as
 *   `mcp__plugin_kibi-claude_kibi__kb_check` or `mcp__kibi__kb_check`;
 * - the project-local CLI through Bash (`kibi check`, `npx --no-install kibi search`).
 */

export type KbUsage = {
  /** Canonical operation name, e.g. `kb_check`. */
  operation: string;
  /** Workspace paths the call explored or checked (raw, not yet canonical). */
  paths: string[];
  /** Entity IDs the call read. */
  ids: string[];
  /** True for a check that acknowledges pending edits. */
  check: boolean;
  /** True when a check covered every path (CLI check without a source filter). */
  checkAll: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return value.length > 0 ? [value] : [];
  return Array.isArray(value)
    ? value.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      )
    : [];
}

/** `mcp__<server>__kb_check` / `kibi_kb_check` / `kb_check` -> `kb_check`. */
export function canonicalKbOperation(
  toolName: string | undefined,
): string | undefined {
  const name = toolName?.trim() ?? "";
  const lastSegment = name.includes("__")
    ? (name.split("__").at(-1) ?? "")
    : name;
  const operation = lastSegment.replace(/^kibi_/, "");
  return /^kb_[a-z_]+$/.test(operation) ? operation : undefined;
}

function payloadOf(toolInput: unknown): Record<string, unknown> {
  if (!isRecord(toolInput)) return {};
  const nested = toolInput.arguments ?? toolInput.args;
  return isRecord(nested) ? nested : toolInput;
}

function usageFromPayload(
  operation: string,
  payload: Record<string, unknown>,
): KbUsage {
  const paths = [
    ...strings(payload.sourceFile),
    ...strings(payload.sourceFiles),
  ];
  if (Array.isArray(payload.sourceLocations)) {
    for (const location of payload.sourceLocations) {
      if (isRecord(location)) paths.push(...strings(location.path));
    }
  }
  const ids = [...strings(payload.id), ...strings(payload.ids)];
  const check = operation === "kb_check";
  return {
    operation,
    paths,
    ids,
    check,
    // A working-tree-diff check without a source filter covers every edit.
    checkAll:
      check && paths.length === 0 && payload.includeWorkingTreeDiff === true,
  };
}

export function extractMcpKbUsage(
  toolName: string | undefined,
  toolInput: unknown,
): KbUsage | undefined {
  const operation = canonicalKbOperation(toolName);
  return operation
    ? usageFromPayload(operation, payloadOf(toolInput))
    : undefined;
}

const CLI_ROUTES: Record<string, string> = {
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
 * A `git commit` that ran its hooks. With Kibi's pre-commit gate installed,
 * a commit that reached PostToolUse (failures go to PostToolUseFailure)
 * passed `kibi check --staged`.
 */
export function isVerifiedGitCommit(command: unknown): boolean {
  if (typeof command !== "string") return false;
  // `git [-C dir | -c key=value | --flag]... commit` followed by a separator.
  const gitCommit =
    /(?:^|[\s;&|(])git(?:\s+-[Cc]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+commit(?=\s|$|[;&|)])/;
  if (!gitCommit.test(command)) return false;
  return !/\s(?:--no-verify|-n)(?=\s|$)/.test(command);
}

/**
 * Recognize a Kibi CLI call in a Bash command. JSON piped to `--input -` is
 * inspected when it appears inline in the command.
 */
export function extractCliKbUsage(command: unknown): KbUsage | undefined {
  if (typeof command !== "string") return undefined;
  const match = /(?:^|[\s;&|(/])kibi\s+([a-z-]+)/.exec(command);
  const route = match?.[1];
  const operation = route ? CLI_ROUTES[route] : undefined;
  if (!operation) return undefined;

  let payload: Record<string, unknown> = {};
  const inline = /'(\{.*\})'/s.exec(command) ?? /"(\{.*\})"/s.exec(command);
  if (inline?.[1]) {
    try {
      const parsed: unknown = JSON.parse(inline[1]);
      if (isRecord(parsed)) payload = parsed;
    } catch {
      // Shell-escaped JSON the hook cannot decode: fall back to flags.
    }
  }
  const usage = usageFromPayload(operation, payload);
  if (operation === "kb_check" && usage.paths.length === 0) {
    usage.checkAll = true;
  }
  return usage;
}
