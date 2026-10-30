// implements REQ-claude-hook-usage-telemetry-v2
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  type HookTrace,
  appendHookUsage as appendSharedHookUsage,
  finishHookTelemetry,
  hookTelemetryEnabled,
  readPackageVersion,
} from "kibi-agent-core/hook-usage-log";

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

// implements REQ-kibi-anonymous-usage-telemetry
/** Record one hook decision as Claude Code, through the shared recorder. */
export function appendHookUsage(
  row: HookUsageRow,
  env: NodeJS.ProcessEnv = process.env,
): void {
  appendSharedHookUsage(
    {
      ...row,
      host: "claude-code",
      packageName: "kibi-claude",
      packageVersion: pluginVersion(),
    },
    env,
  );
}

// implements REQ-kibi-anonymous-usage-telemetry
/**
 * Remember the session for the workspace and send the anonymous telemetry
 * queue: always on Stop, which runs every turn, so events reach PostHog even
 * when an ephemeral container is reclaimed without a session-end hook.
 */
export async function flushHookTelemetry(
  input: {
    readonly event: string;
    readonly workspaceRoot: string | undefined;
    readonly sessionId: string | undefined;
  },
  env: NodeJS.ProcessEnv = process.env,
): Promise<void> {
  await finishHookTelemetry(input, env);
}
