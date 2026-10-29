// implements REQ-kibi-anonymous-usage-telemetry
import type { Command } from "commander";
import {
  flushTelemetry,
  recordOperationTelemetry,
  takeTelemetryNotice,
} from "kibi-agent-core/usage-telemetry";

/**
 * Anonymous usage telemetry for the CLI: one summary event per command,
 * named by its registered command path (`sync`, `storage compact`, `search`)
 * and never by its arguments. The queue is sent only when a batch is due, so
 * most runs exit without touching the network.
 */

/** Commands that manage telemetry itself are not recorded. */
const UNRECORDED_COMMANDS = new Set(["telemetry"]);

// implements REQ-kibi-anonymous-usage-telemetry
/** Remember which registered command ran, for the event recorded at exit. */
export function trackCommandPath(program: Command): () => string | undefined {
  let commandPath: string | undefined;
  program.hook("preAction", (_root, actionCommand) => {
    const names: string[] = [];
    for (
      let current: Command | null = actionCommand;
      current?.parent;
      current = current.parent
    ) {
      names.unshift(current.name());
    }
    commandPath = names.join(" ");
  });
  return () => commandPath;
}

// implements REQ-kibi-anonymous-usage-telemetry
export async function finishCliTelemetry(input: {
  readonly commandPath: string | undefined;
  readonly packageVersion: string;
  readonly startedAt: Date;
  readonly exitCode: number;
  readonly env?: NodeJS.ProcessEnv;
}): Promise<void> {
  const env = input.env ?? process.env;
  const command = input.commandPath;
  if (!command || UNRECORDED_COMMANDS.has(command.split(" ")[0] ?? "")) {
    return;
  }
  const notice = takeTelemetryNotice(env);
  if (notice) process.stderr.write(`${notice}\n`);
  recordOperationTelemetry(
    {
      packageName: "kibi-cli",
      packageVersion: input.packageVersion,
      host:
        env.KIBI_HOST?.trim() ||
        env.KIBI_MCP_HOST?.trim() ||
        (env.CLAUDECODE === "1" ? "claude-code" : undefined),
    },
    {
      interface: "cli",
      operation: command,
      status: input.exitCode === 0 ? "success" : "error",
      durationMs: Date.now() - input.startedAt.getTime(),
      exitCode: input.exitCode,
    },
    env,
  );
  await flushTelemetry({}, env);
}
