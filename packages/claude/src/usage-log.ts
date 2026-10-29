// implements REQ-claude-hook-usage-telemetry-v2
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type HookTrace,
  appendHookUsage as appendSharedHookUsage,
  hookTelemetryEnabled,
  readPackageVersion,
} from "kibi-agent-core/hook-usage-log";
import {
  flushTelemetry,
  recordHookTelemetry,
} from "kibi-agent-core/usage-telemetry";

/**
 * Opt-in hook telemetry for Claude Code.
 *
 * The row format, the `KIBI_DIAGNOSTIC_MODE` opt-in, and the write to the
 * workspace's `.kb/usage.log` are shared with the other host adapters through
 * kibi-agent-core; this module only names the host and the plugin version.
 */
export { type HookTrace, hookTelemetryEnabled };

let cachedPluginVersion: string | null | undefined;

function pluginVersion(): string | null {
  if (cachedPluginVersion !== undefined) return cachedPluginVersion;
  // Both the bundled bin/hook-runner.mjs and dist/*.js sit one level below
  // the plugin root that holds package.json. An unreadable manifest is
  // cached as null rather than re-read on every row.
  cachedPluginVersion = readPackageVersion(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "package.json",
    ),
  );
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
  if (row.trace.action === undefined) return;
  // implements REQ-kibi-anonymous-usage-telemetry
  recordHookTelemetry(
    {
      packageName: "kibi-claude",
      packageVersion: pluginVersion(),
      host: "claude-code",
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
  appendSharedHookUsage(
    { ...row, host: "claude-code", packageVersion: pluginVersion() },
    env,
  );
}

// implements REQ-kibi-anonymous-usage-telemetry
/**
 * Send the anonymous telemetry queue at the end of each turn. Stop runs on
 * every turn, so events reach PostHog even when an ephemeral container is
 * reclaimed without a session-end hook.
 */
export async function flushHookTelemetry(
  event: string,
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  if (event !== "Stop") return;
  await flushTelemetry({ force: true }, env);
}
