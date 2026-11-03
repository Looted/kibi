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

// Both the bundled bin/hook-runner.mjs and dist/*.js sit one level below the
// plugin root that holds package.json. A hook process records at most a few
// rows, so the manifest is read once, on load; an unreadable one is null.
const pluginVersion = readPackageVersion(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
);

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
      // The shared recorder names the claude-code adapter package kibi-claude.
      host: "claude-code",
      packageVersion: pluginVersion,
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
export const flushHookTelemetry = finishHookTelemetry;
