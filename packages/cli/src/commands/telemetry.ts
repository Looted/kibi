// implements REQ-kibi-anonymous-usage-telemetry
import {
  TELEMETRY_DOCS_URL,
  setTelemetryPreference,
  telemetryStatus,
} from "kibi-agent-core/usage-telemetry";
import type { CommandResult } from "../cli-command.js";

export type TelemetryAction = "status" | "enable" | "disable";

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
  if (options.format === "json") {
    console.log(JSON.stringify({ ...status, docs: TELEMETRY_DOCS_URL }));
    return { exitCode: 0 };
  }
  console.log(
    `Anonymous usage telemetry is ${status.enabled ? "on" : "off"} (${status.reason}).`,
  );
  console.log(`Settings and queue: ${status.directory}`);
  console.log(`What is collected: ${TELEMETRY_DOCS_URL}`);
  return { exitCode: 0 };
}
