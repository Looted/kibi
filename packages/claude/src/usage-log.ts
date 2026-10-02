// implements REQ-claude-code-kibi-plugin-v1
import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Opt-in hook telemetry.
 *
 * MCP and CLI usage rows show which Kibi operations ran, but not what the
 * agent was doing around them. Hook rows fill that gap: they record when the
 * agent read or edited a source file, whether Kibi context was shown or
 * suppressed, and whether the agent had consulted Kibi yet in the session.
 * Joined on `session_id`, they show whether lookups happen before edits or
 * only afterwards.
 *
 * Rows go to the same `.kb/usage.log` as MCP and CLI rows, tagged
 * `interface: "hook"`, so the existing ignore rule covers them. They are
 * written only when the operator opted in with `KIBI_DIAGNOSTIC_MODE`, the
 * same signal the MCP server and CLI honor; installing the plugin never
 * enables them.
 */

/** What the hook did for one tool call. Unset means "nothing to record". */
export type HookTrace = {
  action?: string;
  path?: string;
  pathKind?: string;
  requirementIds?: string[];
  kbOperation?: string;
  /** Session state before this call: had the agent used Kibi yet? */
  kbUsedBefore?: boolean | undefined;
};

export function hookTelemetryEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const value = env.KIBI_DIAGNOSTIC_MODE?.trim().toLowerCase();
  return value === "1" || value === "true";
}

let cachedPluginVersion: string | null | undefined;

function pluginVersion(): string | null {
  if (cachedPluginVersion !== undefined) return cachedPluginVersion;
  cachedPluginVersion = null;
  // Both the bundled bin/hook-runner.mjs and dist/*.js sit one level below
  // the plugin root that holds package.json.
  const candidate = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "package.json",
  );
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(candidate, "utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      typeof parsed.version === "string"
    ) {
      cachedPluginVersion = parsed.version;
    }
  } catch {
    // An unreadable manifest leaves the version unknown.
  }
  return cachedPluginVersion;
}

export type HookUsageRow = {
  workspaceRoot: string;
  event: string;
  sessionId: string | undefined;
  hostTool: string | undefined;
  trace: HookTrace;
  startedAt: Date;
};

export function appendHookUsage(
  row: HookUsageRow,
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!hookTelemetryEnabled(env) || row.trace.action === undefined) return;
  const finishedAt = new Date();
  const { trace } = row;
  const record = {
    timestamp: finishedAt.toISOString(),
    request_id: `hook-${randomUUID()}`,
    tool: `hook_${row.event}`,
    interface: "hook",
    host: "claude-code",
    package_version: pluginVersion(),
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
