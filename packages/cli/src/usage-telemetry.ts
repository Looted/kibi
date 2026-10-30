// implements REQ-kibi-anonymous-usage-telemetry
import type { Command } from "commander";
import {
  detectTelemetryHost,
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

let notedErrorCategory: string | undefined;

// implements REQ-kibi-anonymous-usage-telemetry
/**
 * Name why this command failed with a fixed identifier (an error code, a
 * failing doctor check), for the event recorded at exit. The first note wins.
 */
export function noteCliErrorCategory(category: string | undefined): void {
  if (category && notedErrorCategory === undefined) {
    notedErrorCategory = category;
  }
}

// implements REQ-kibi-anonymous-usage-telemetry
/** The error code of a failed JSON result printed by a command, if any. */
export function noteCliResultError(stdout: string | undefined): void {
  if (!stdout) return;
  try {
    const parsed = JSON.parse(stdout) as {
      status?: unknown;
      error?: { code?: unknown };
    };
    if (parsed.status === "error" && typeof parsed.error?.code === "string") {
      noteCliErrorCategory(parsed.error.code);
    }
  } catch {
    // Not a JSON result.
  }
}

/** A thrown error's code or class name; never its message. */
function thrownErrorCategory(error: unknown): string {
  if (error !== null && typeof error === "object") {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && code !== "") return code;
    const name = (error as { name?: unknown }).name;
    if (typeof name === "string" && name !== "" && name !== "Error") {
      return name;
    }
  }
  return "uncaught_error";
}

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
  /** The error the command threw, when it failed by throwing. */
  readonly error?: unknown;
  readonly env?: NodeJS.ProcessEnv;
}): Promise<void> {
  const env = input.env ?? process.env;
  const command = input.commandPath;
  const noted = notedErrorCategory;
  notedErrorCategory = undefined;
  if (!command || UNRECORDED_COMMANDS.has(command.split(" ")[0] ?? "")) {
    return;
  }
  const notice = takeTelemetryNotice(env);
  if (notice) process.stderr.write(`${notice}\n`);
  recordOperationTelemetry(
    {
      packageName: "kibi-cli",
      packageVersion: input.packageVersion,
      host: detectTelemetryHost(env),
    },
    {
      interface: "cli",
      operation: command,
      status: input.exitCode === 0 ? "success" : "error",
      durationMs: Date.now() - input.startedAt.getTime(),
      exitCode: input.exitCode,
      errorCategory:
        input.exitCode === 0
          ? undefined
          : (noted ??
            (input.error === undefined
              ? undefined
              : thrownErrorCategory(input.error))),
    },
    env,
  );
  await flushTelemetry({}, env);
}
