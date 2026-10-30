// implements REQ-claude-hook-usage-telemetry-v2, REQ-kibi-telemetry-acceptance-gate-v2
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { hostKbOperation } from "./kb-mcp-tools.js";
import { classifyPath } from "./path-policy.js";
import {
  flushTelemetry,
  recordHookTelemetry,
  rememberHookSession,
  telemetryEnabled,
} from "./usage-telemetry.js";

/**
 * Opt-in hook telemetry shared by every host adapter.
 *
 * MCP and CLI usage rows show which Kibi operations ran, but not what the
 * agent was doing around them. Hook rows fill that gap: they record when the
 * agent read or edited a source file (and which requirements the file's
 * symbols implement), whether Kibi context was shown or suppressed, and which
 * Kibi operations the agent ran through MCP or the project-local CLI. Joined
 * on the host session id they show whether lookups happen before edits or
 * only afterwards; the telemetry acceptance report turns that into the
 * `lookup_before_first_edit` metric.
 *
 * Rows go to the same `.kb/usage.log` as MCP and CLI rows, tagged
 * `interface: "hook"`, so the existing ignore rule covers them. They are
 * written only when the operator opted in with `KIBI_DIAGNOSTIC_MODE`, the
 * same signal the MCP server and CLI honor; installing a plugin never
 * enables them.
 */

// implements REQ-claude-hook-usage-telemetry-v2, REQ-kibi-telemetry-acceptance-gate-v2
/** What the hook did for one tool call. Unset `action` means "nothing to record". */
export type HookTrace = {
  action?: string;
  path?: string;
  pathKind?: string;
  /** Requirements the touched file's symbols implement (symbol manifest). */
  requirementIds?: string[];
  /** Canonical Kibi operation (`kb_search`, `kb_query`, …) a call ran. */
  kbOperation?: string;
  /** Session state before this call: had the agent used Kibi yet? */
  kbUsedBefore?: boolean | undefined;
};

// implements REQ-claude-hook-usage-telemetry-v2, REQ-kibi-telemetry-acceptance-gate-v2
/** Hook actions the acceptance report reads; hosts emit these names. */
export const HOOK_ACTION_EDITED = "edited";
// implements REQ-claude-hook-usage-telemetry-v2, REQ-kibi-telemetry-acceptance-gate-v2
export const HOOK_ACTION_KB_USAGE = "kb_usage";

// implements REQ-claude-hook-usage-telemetry-v2
export function hookTelemetryEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const value = env.KIBI_DIAGNOSTIC_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
}

// implements REQ-claude-hook-usage-telemetry-v2
export type HookUsageRow = {
  /** Host agent, e.g. `claude-code`, `cursor`, `codex`, `zcode`, `opencode`. */
  host: string;
  /** Adapter npm package; defaults to `kibi-<host>` (`kibi-claude` for Claude Code). */
  packageName?: string | undefined;
  /** Version of the adapter package that wrote the row, when known. */
  packageVersion?: string | null | undefined;
  workspaceRoot: string;
  event: string;
  sessionId: string | undefined;
  hostTool: string | undefined;
  trace: HookTrace;
  startedAt: Date;
};

// implements REQ-claude-hook-usage-telemetry-v2
/**
 * Whether a host should build hook traces at all: for the opt-in
 * `.kb/usage.log` rows or for anonymous usage telemetry.
 */
export function hookTracesWanted(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return hookTelemetryEnabled(env) || telemetryEnabled(env);
}

function adapterPackage(host: string): string {
  return host === "claude-code" ? "kibi-claude" : `kibi-${host}`;
}

// implements REQ-claude-hook-usage-telemetry-v2, REQ-kibi-anonymous-usage-telemetry
/**
 * Record one hook decision: an anonymous summary event (unless telemetry is
 * off) and, when the operator opted in, the detailed `.kb/usage.log` row.
 */
export function appendHookUsage(
  row: HookUsageRow,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (row.trace.action === undefined) return;
  recordHookTelemetry(
    {
      packageName: row.packageName ?? adapterPackage(row.host),
      packageVersion: row.packageVersion,
      host: row.host,
      sessionId: row.sessionId,
    },
    {
      hookEvent: row.event,
      hookAction: row.trace.action,
      pathKind: row.trace.pathKind,
      kbOperation: row.trace.kbOperation,
      kbUsedBefore: row.trace.kbUsedBefore,
      requirementCount: row.trace.requirementIds?.length,
    },
    env,
  );
  if (!hookTelemetryEnabled(env)) return;
  const finishedAt = new Date();
  const { trace } = row;
  const record = {
    timestamp: finishedAt.toISOString(),
    request_id: `hook-${randomUUID()}`,
    tool: `hook_${row.event}`,
    interface: "hook",
    host: row.host,
    package_version: row.packageVersion ?? null,
    workspace_root: row.workspaceRoot,
    session_id: row.sessionId ?? null,
    hook_event: row.event,
    host_tool: row.hostTool ?? null,
    hook_action: trace.action,
    path: trace.path ?? null,
    path_kind: trace.pathKind ?? null,
    requirement_ids: trace.requirementIds ?? [],
    kb_operation: trace.kbOperation ?? null,
    kb_used_before: trace.kbUsedBefore ?? null,
    status: "success",
    duration_ms: finishedAt.getTime() - row.startedAt.getTime(),
  };
  try {
    const logPath = path.join(row.workspaceRoot, ".kb", "usage.log");
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, `${JSON.stringify(record)}\n`, "utf8");
  } catch {
    // Telemetry is best effort and must never disturb the tool call.
  }
}

// implements REQ-claude-hook-usage-telemetry-v2, REQ-kibi-telemetry-acceptance-gate-v2
/**
 * Trace for a tool call that ran a Kibi operation through MCP or the
 * project-local CLI, or undefined for any other tool.
 */
export function kbUsageTrace(
  toolName: string | undefined,
  toolInput: unknown,
): HookTrace | undefined {
  const kbOperation = hostKbOperation(toolName, toolInput);
  return kbOperation
    ? { action: HOOK_ACTION_KB_USAGE, kbOperation }
    : undefined;
}

// implements REQ-claude-hook-usage-telemetry-v2, REQ-kibi-telemetry-acceptance-gate-v2
/**
 * One `edited` trace per workspace-relative path an edit tool changed,
 * skipping docs, config, and generated paths. `requirementIdsFor` names the
 * requirements a file's symbols implement; KB files implement none.
 */
export function editTraces(
  relativePaths: readonly string[],
  requirementIdsFor: (relativePath: string) => string[],
): HookTrace[] {
  const traces: HookTrace[] = [];
  for (const relativePath of new Set(relativePaths)) {
    const pathKind = classifyPath(relativePath);
    if (pathKind === "other") continue;
    traces.push({
      action: HOOK_ACTION_EDITED,
      path: relativePath,
      pathKind,
      requirementIds: pathKind === "kb" ? [] : requirementIdsFor(relativePath),
    });
  }
  return traces;
}

// implements REQ-claude-hook-usage-telemetry-v2
/** Append one row per trace, sharing the call's host, session and tool. */
export function appendHookUsageRows(
  row: Omit<HookUsageRow, "trace">,
  traces: readonly HookTrace[],
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!hookTracesWanted(env)) return;
  for (const trace of traces) appendHookUsage({ ...row, trace }, env);
}

/** Host events that end a turn or a session: the queue is sent right away. */
const TURN_END_EVENTS = new Set(["stop", "sessionend"]);

// implements REQ-kibi-anonymous-usage-telemetry
/**
 * End-of-hook bookkeeping every host runs: remember the host session for the
 * workspace, so CLI and MCP events from that workspace can carry it, and send
 * the anonymous telemetry queue when it is due, or always at the end of a
 * turn. Never throws.
 */
export async function finishHookTelemetry(
  input: {
    readonly event: string;
    readonly workspaceRoot: string | undefined;
    readonly sessionId: string | undefined;
  },
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  try {
    if (input.workspaceRoot && input.sessionId) {
      rememberHookSession(input.workspaceRoot, input.sessionId, env);
    }
    const turnEnd = TURN_END_EVENTS.has(
      input.event.toLowerCase().replace(/[^a-z]/g, ""),
    );
    await flushTelemetry({ force: turnEnd }, env);
  } catch {
    // Telemetry is best effort and must never disturb the hook.
  }
}

// implements REQ-claude-hook-usage-telemetry-v2
/**
 * Version of the adapter package whose `package.json` sits at
 * `packageJsonPath`, or null when it cannot be read.
 */
export function readPackageVersion(packageJsonPath: string): string | null {
  try {
    const parsed: unknown = JSON.parse(
      fs.readFileSync(packageJsonPath, "utf8"),
    );
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      typeof parsed.version === "string"
    ) {
      return parsed.version;
    }
  } catch {
    // An unreadable manifest leaves the version unknown.
  }
  return null;
}
