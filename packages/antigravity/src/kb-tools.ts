import {
  KIBI_WORKSPACE_ARGUMENT,
  canonicalKbToolName,
  effectiveKbOperation,
  kibiCliOperation,
} from "kibi-agent-core/kb-mcp-tools";

/**
 * Recognize Kibi usage in Antigravity tool calls so hooks stay quiet once the
 * agent is already consulting the knowledge base, and stamp `workspaceRoot`
 * onto Kibi MCP calls.
 *
 * Kibi is reachable through two peer surfaces:
 * - MCP tools, which Antigravity calls either through the `call_mcp_tool`
 *   wrapper (`{ ServerName: "antigravity_kibi", ToolName: "kb_query",
 *   Arguments: ... }`) or directly (`kb_check`, `kibi_kb_check`,
 *   `mcp_kibi_kb_check`, `mcp__kibi__kb_check`, `antigravity_kibi:kb_check`);
 * - the project-local CLI through `run_command` (`kibi check`,
 *   `npx --no-install kibi search`).
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

/**
 * Normalize any Antigravity MCP tool name naming a Kibi operation to its
 * canonical `kb_*` operation name.
 */
export function canonicalKbOperation(
  toolName: string | undefined,
): string | undefined {
  if (!toolName) return undefined;
  const trimmed = toolName.trim();
  const shared = canonicalKbToolName(trimmed);
  if (shared && /^kb_[a-z_]+$/.test(shared)) return shared;

  const afterColon = trimmed.includes(":")
    ? (trimmed.split(":").at(-1) as string)
    : trimmed;
  const match = /(?:^|(?:^|_)kibi_)(kb_[a-z_]+)$/.exec(afterColon);
  if (match?.[1]) return match[1];
  const mcpMatch = /^mcp_[^_]*kibi[^_]*_(kb_[a-z_]+)$/i.exec(afterColon);
  return mcpMatch?.[1];
}

type UnwrappedMcpCall = {
  operation: string;
  payload: Record<string, unknown>;
  wrapped: boolean;
  argumentsKey?: "Arguments" | "arguments";
  argumentsAsJsonString?: boolean;
};

function parseArgumentsField(raw: unknown): {
  parsed: Record<string, unknown>;
  asString: boolean;
} {
  if (isRecord(raw)) return { parsed: raw, asString: false };
  if (typeof raw === "string") {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isRecord(parsed)) return { parsed, asString: true };
    } catch {
      // Unparseable JSON string; leave empty.
    }
    return { parsed: {}, asString: true };
  }
  return { parsed: {}, asString: false };
}

function firstStringField(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

/**
 * Unwrap an Antigravity `call_mcp_tool` invocation or a direct `kb_*` MCP tool
 * call into its canonical Kibi operation and argument payload.
 */
export function unwrapKibiMcpCall(
  toolName: string | undefined,
  toolArgs: unknown,
): UnwrappedMcpCall | undefined {
  if (toolName === "call_mcp_tool" && isRecord(toolArgs)) {
    const innerName = firstStringField(toolArgs, ["ToolName", "toolName"]);
    const serverName = firstStringField(toolArgs, ["ServerName", "serverName"]);
    const operation = canonicalKbOperation(innerName);
    if (!operation) return undefined;
    if (serverName && !/kibi/i.test(serverName)) return undefined;
    const argumentsKey: "Arguments" | "arguments" =
      !("Arguments" in toolArgs) && "arguments" in toolArgs
        ? "arguments"
        : "Arguments";
    const { parsed, asString } = parseArgumentsField(toolArgs[argumentsKey]);
    return {
      operation,
      payload: parsed,
      wrapped: true,
      argumentsKey,
      argumentsAsJsonString: asString,
    };
  }

  const operation = canonicalKbOperation(toolName);
  if (!operation) return undefined;
  const payload = payloadOf(toolArgs);
  return { operation, payload, wrapped: false };
}

/**
 * Return the shallow `overwrite` object stamping `workspaceRoot` when the call
 * targets a Kibi MCP operation and `workspaceRoot` is not already set;
 * otherwise undefined.
 */
export function workspaceOverwrite(
  toolName: string | undefined,
  toolArgs: unknown,
  workspaceRoot: string | undefined,
): Record<string, unknown> | undefined {
  if (!workspaceRoot) return undefined;
  const unwrapped = unwrapKibiMcpCall(toolName, toolArgs);
  if (!unwrapped) return undefined;
  const existing = unwrapped.payload[KIBI_WORKSPACE_ARGUMENT];
  if (typeof existing === "string" && existing.trim().length > 0) {
    return undefined;
  }
  if (unwrapped.wrapped) {
    const updated = {
      ...unwrapped.payload,
      [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot,
    };
    const key = unwrapped.argumentsKey ?? "Arguments";
    return {
      [key]: unwrapped.argumentsAsJsonString
        ? JSON.stringify(updated)
        : updated,
    };
  }
  return { [KIBI_WORKSPACE_ARGUMENT]: workspaceRoot };
}

function payloadOf(toolArgs: unknown): Record<string, unknown> {
  if (!isRecord(toolArgs)) return {};
  const nested = toolArgs.arguments ?? toolArgs.args ?? toolArgs.Arguments;
  if (isRecord(nested)) return nested;
  if (typeof nested === "string") {
    try {
      const parsed: unknown = JSON.parse(nested);
      if (isRecord(parsed)) return parsed;
    } catch {
      // Ignore malformed JSON.
    }
  }
  return toolArgs;
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
    checkAll:
      check &&
      paths.length === 0 &&
      (payload.includeWorkingTreeDiff === true || payload.changed === true),
  };
}

export function extractMcpKbUsage(
  toolName: string | undefined,
  toolArgs: unknown,
): KbUsage | undefined {
  const unwrapped = unwrapKibiMcpCall(toolName, toolArgs);
  if (!unwrapped) return undefined;
  return usageFromPayload(
    effectiveKbOperation(unwrapped.operation, unwrapped.payload),
    unwrapped.payload,
  );
}

/**
 * A `git commit` that ran its hooks. With Kibi's pre-commit gate installed,
 * a commit that succeeded passed `kibi check --staged`.
 */
export function isVerifiedGitCommit(command: string): boolean {
  const gitCommit =
    /(?:^|[\s;&|(])git(?:\s+-[Cc]\s+\S+|\s+--?[\w-]+(?:=\S+)?)*\s+commit(?=\s|$|[;&|)])/;
  if (!gitCommit.test(command)) return false;
  return !/\s(?:--no-verify|-n)(?=\s|$)/.test(command);
}

/**
 * Recognize a Kibi CLI call in a shell command. JSON piped to `--input -` is
 * inspected when it appears inline in the command.
 */
export function extractCliKbUsage(command: string): KbUsage | undefined {
  const operation = kibiCliOperation(command);
  if (!operation) return undefined;

  let payload: Record<string, unknown> = {};
  const inline = /'(\{.*\})'/s.exec(command) ?? /"(\{.*\})"/s.exec(command);
  if (inline) {
    const json = inline[1] as string;
    try {
      payload = JSON.parse(json) as Record<string, unknown>;
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
