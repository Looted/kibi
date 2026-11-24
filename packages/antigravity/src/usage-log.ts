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
 * Opt-in hook telemetry for Antigravity.
 *
 * The row format, the `KIBI_DIAGNOSTIC_MODE` opt-in, and the write to the
 * workspace's `.kb/usage.log` are shared with the other host adapters through
 * kibi-agent-core; this module only names the host and the plugin version.
 */
export { type HookTrace, hookTelemetryEnabled };

const pluginVersion = readPackageVersion(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json"),
);

type HookUsageRow = {
  workspaceRoot: string;
  event: string;
  sessionId: string | undefined;
  hostTool: string | undefined;
  trace: HookTrace;
  startedAt: Date;
};

/** Record one hook decision as Antigravity, through the shared recorder. */
export function appendHookUsage(
  row: HookUsageRow,
  env: NodeJS.ProcessEnv = process.env,
): void {
  appendSharedHookUsage(
    {
      ...row,
      host: "antigravity",
      packageName: "kibi-antigravity",
      packageVersion: pluginVersion,
    },
    env,
  );
}

export const flushHookTelemetry = finishHookTelemetry;
