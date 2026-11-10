// implements REQ-kibi-anonymous-usage-telemetry
import type { Command } from "commander";
import {
  detectTelemetryHost,
  flushTelemetry,
  recordOperationTelemetry,
  takeTelemetryNotice,
  telemetryErrorClass,
  telemetryRootError,
} from "kibi-agent-core/usage-telemetry";

import { operationTelemetrySignals } from "./telemetry-details.js";

/**
 * Anonymous usage telemetry for the CLI: one summary event per command,
 * named by its registered command path (`sync`, `storage compact`, `search`)
 * and never by its arguments. The queue is sent only when a batch is due, so
 * most runs exit without touching the network.
 */

/** Commands that manage telemetry itself are not recorded. */
const UNRECORDED_COMMANDS = new Set(["telemetry"]);

let notedErrorCategory: string | undefined;
let notedErrorClass: string | undefined;
let notedError: unknown;
let notedCall: Parameters<typeof operationTelemetrySignals>[0] | undefined;

/**
 * Commands whose non-zero exit without a thrown error is their answer, not a
 * fault: a check that found violations, tests that failed. Naming the
 * outcome keeps them apart from failures nobody categorized.
 */
const OUTCOME_CATEGORIES: Readonly<Record<string, string>> = {
  check: "check_violations",
  "check-diff": "check_violations",
  "check-generated": "generated_artifacts_stale",
  prove: "tests_failed",
  "proof run-steps": "tests_failed",
};

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

// implements REQ-kibi-telemetry-expected-outcomes
/**
 * Note an error an operation threw before its route turned it into a result:
 * its code (a coded rejection such as ENTITY_VALIDATION_FAILED) when it has
 * one, and its class. Never its message.
 */
export function noteCliThrownError(error: unknown): void {
  const root = telemetryRootError(error);
  const code =
    root !== null && typeof root === "object"
      ? (root as { code?: unknown }).code
      : undefined;
  // An empty code is no category: noteCliErrorCategory ignores it.
  if (typeof code === "string") noteCliErrorCategory(code);
  notedErrorClass ??= telemetryErrorClass(error) ?? undefined;
  notedError ??= error;
}

// implements REQ-kibi-telemetry-agent-signals
/**
 * Note the Kibi operation a command ran, with its input and result, so the
 * event recorded at exit carries its struggle signals (see
 * telemetry-details.ts). Only fixed vocabulary and counts are derived.
 */
export function noteCliOperationCall(
  call: Parameters<typeof operationTelemetrySignals>[0],
): void {
  notedCall ??= call;
}

// implements REQ-kibi-anonymous-usage-telemetry
/** The error code of a failed JSON result printed by a command, if any. */
export function noteCliResultError(stdout: string | undefined): void {
  // No output, `null` and a result without `error` all throw here and are
  // ignored like any other text that is not a JSON result.
  try {
    const parsed = JSON.parse(stdout as string) as {
      status?: unknown;
      error: { code?: unknown };
    };
    if (parsed.status === "error" && typeof parsed.error.code === "string") {
      noteCliErrorCategory(parsed.error.code);
    }
  } catch {
    // Not a JSON result.
  }
}

/** A thrown error's code or class name; never its message. */
function thrownErrorCategory(thrown: unknown): string {
  const error = telemetryRootError(thrown);
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
    let current = actionCommand;
    while (current.parent) {
      names.unshift(current.name());
      current = current.parent;
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
  const notedClass = notedErrorClass;
  const thrown = notedError ?? input.error;
  const call = notedCall;
  notedErrorCategory = undefined;
  notedErrorClass = undefined;
  notedError = undefined;
  notedCall = undefined;
  if (!command || UNRECORDED_COMMANDS.has(command.split(" ")[0] as string)) {
    return;
  }
  const notice = takeTelemetryNotice(env);
  if (notice) process.stderr.write(`${notice}\n`);
  recordOperationTelemetry(
    {
      packageName: "kibi-cli",
      packageVersion: input.packageVersion,
      host: detectTelemetryHost(env),
      workspaceRoot: process.cwd(),
    },
    {
      interface: "cli",
      operation: command,
      // rationale: telemetryOutcome reads every status but "success" as a
      // failure, so how the failure status is spelled is not observable.
      // Stryker disable next-line StringLiteral
      status: input.exitCode === 0 ? "success" : "error",
      durationMs: Date.now() - input.startedAt.getTime(),
      exitCode: input.exitCode,
      errorCategory:
        input.exitCode === 0
          ? undefined
          : (noted ??
            (input.error === undefined
              ? OUTCOME_CATEGORIES[command]
              : thrownErrorCategory(input.error))),
      // Only a failure sends its class, so a success's class is never read.
      errorClass: notedClass ?? telemetryErrorClass(input.error) ?? undefined,
      signals: operationTelemetrySignals({
        // A noted call names its own operation.
        operation: command,
        ...call,
        ...(thrown !== undefined ? { error: thrown } : {}),
      }),
    },
    env,
  );
  await flushTelemetry({}, env);
}
