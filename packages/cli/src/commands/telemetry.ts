// implements REQ-kibi-anonymous-usage-telemetry
import {
  TELEMETRY_DOCS_URL,
  detectTelemetryHost,
  setTelemetryPreference,
  telemetryStatus,
} from "kibi-agent-core/usage-telemetry";
import type { CommandResult } from "../cli-command.js";

export type TelemetryAction = "status" | "enable" | "disable";

/** Where the channel in effect comes from, in words. */
const CHANNEL_SOURCE_TEXT: Readonly<Record<string, string>> = {
  KIBI_TELEMETRY_CHANNEL: "set by KIBI_TELEMETRY_CHANNEL",
  checkout: "Kibi runs from a checkout of its own repository",
  installed: "Kibi runs from an installed package",
};

// implements REQ-kibi-anonymous-usage-telemetry
/** `kibi telemetry [status|enable|disable]`: show or persist the choice. */
export async function telemetryCommand(
  action: string | undefined,
  options: { format?: "json" | "text" } = {},
  env: NodeJS.ProcessEnv = process.env,
): Promise<CommandResult> {
  const chosen = action ?? "status";
  if (chosen !== "status" && chosen !== "enable" && chosen !== "disable") {
    console.error(
      `Error: unknown telemetry action "${chosen}"; use status, enable or disable`,
    );
    return { exitCode: 1 };
  }
  if (chosen !== "status") {
    setTelemetryPreference(chosen === "enable" ? "enabled" : "disabled", env);
  }
  const status = telemetryStatus(env);
  // The host this shell's events carry comes from KIBI_HOST or the
  // variables an agent host set for the processes it starts.
  const host = detectTelemetryHost(env) ?? "unknown";
  if (options.format === "json") {
    console.log(JSON.stringify({ ...status, host, docs: TELEMETRY_DOCS_URL }));
    return { exitCode: 0 };
  }
  console.log(
    `Anonymous usage telemetry is ${status.enabled ? "on" : "off"} (${status.reason}).`,
  );
  console.log(
    `Channel: ${status.channel} (${CHANNEL_SOURCE_TEXT[status.channelSource]}). Host: ${host} (set KIBI_HOST to override).`,
  );
  console.log(`Settings and queue: ${status.directory}`);
  console.log(`What is collected: ${TELEMETRY_DOCS_URL}`);
  return { exitCode: 0 };
}
