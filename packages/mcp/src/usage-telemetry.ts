// implements REQ-kibi-anonymous-usage-telemetry
import {
  type TelemetrySource,
  detectTelemetryHost,
  flushTelemetry,
  recordOperationTelemetry,
  takeTelemetryNotice,
  telemetryErrorClass,
} from "kibi-agent-core/usage-telemetry";
import { operationTelemetrySignals } from "kibi-cli/telemetry-details";

import { classifyDiagnosticError } from "./diagnostics-helpers.js";
import { readMcpPackageVersion } from "./diagnostics.js";

/**
 * Anonymous usage telemetry for the MCP server: one summary event per tool
 * call, queued by kibi-agent-core and sent in batches from this long-lived
 * process. The detailed, opt-in `.kb/usage.log` rows are separate and never
 * sent.
 */

/** How often the server sends whatever the hooks, CLI and tools queued. */
const FLUSH_INTERVAL_MS = 60 * 1000;

let packageVersion: string | null | undefined;

/**
 * The host comes from the launcher's `KIBI_MCP_HOST` or the host's own
 * variables, else from the client name the host sent on initialize.
 */
function telemetrySource(clientName: string | undefined): TelemetrySource {
  if (packageVersion === undefined) packageVersion = readMcpPackageVersion();
  return {
    packageName: "kibi-mcp",
    packageVersion,
    host: detectTelemetryHost() ?? clientName,
    workspaceRoot:
      process.env.KIBI_MCP_ATTACH_ROOT ??
      process.env.KIBI_WORKSPACE ??
      process.cwd(),
  };
}

/** A failed result's error code, e.g. `UPSERT_DRY_RUN_INVALID`. */
function resultErrorCode(result: unknown): string | undefined {
  if (result === null || typeof result !== "object") return undefined;
  const error = (result as { error?: unknown }).error;
  if (error === null || typeof error !== "object") return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

// implements REQ-kibi-telemetry-expected-outcomes
/**
 * The category of a thrown error: the diagnostic classification, unless it
 * found nothing more specific than `handler_error` and the error carries its
 * own code (a coded rejection such as ENTITY_VALIDATION_FAILED, or a system
 * error such as ENOENT).
 */
function thrownErrorCategory(error: unknown): string {
  const classified = classifyDiagnosticError(error).error_category;
  if (classified !== "handler_error") return classified;
  const code =
    error !== null && typeof error === "object"
      ? (error as { code?: unknown }).code
      : undefined;
  return typeof code === "string" && code !== "" ? code : classified;
}

// implements REQ-kibi-anonymous-usage-telemetry
export function recordMcpToolTelemetry(input: {
  readonly operation: string;
  readonly startedAt: Date;
  readonly status: "success" | "error";
  /** A thrown error, classified into a fixed category. */
  readonly error?: unknown;
  /** The result envelope, whose error code names a returned failure. */
  readonly result?: unknown;
  /** The client name the host sent on initialize. */
  readonly clientName?: string | undefined;
  /** The tool's business arguments; only fixed signals are derived. */
  readonly args?: unknown;
}): void {
  recordOperationTelemetry(telemetrySource(input.clientName), {
    interface: "mcp",
    operation: input.operation,
    status: input.status,
    durationMs: Date.now() - input.startedAt.getTime(),
    errorCategory:
      input.error !== undefined
        ? thrownErrorCategory(input.error)
        : input.status === "error"
          ? resultErrorCode(input.result)
          : undefined,
    errorClass:
      input.error !== undefined
        ? (telemetryErrorClass(input.error) ?? undefined)
        : undefined,
    // implements REQ-kibi-telemetry-agent-signals
    signals: operationTelemetrySignals({
      operation: input.operation,
      args: input.args,
      result: input.result,
      ...(input.error !== undefined ? { error: input.error } : {}),
    }),
  });
}

// implements REQ-kibi-anonymous-usage-telemetry
/** Show the one-time notice on stderr and send the queue every minute. */
export function startMcpTelemetry(): void {
  const notice = takeTelemetryNotice();
  if (notice) process.stderr.write(`[KIBI-MCP] ${notice}\n`);
  setInterval(() => {
    void flushTelemetry();
  }, FLUSH_INTERVAL_MS).unref();
}

// implements REQ-kibi-anonymous-usage-telemetry
/** Send everything still queued before the server exits. */
export async function flushMcpTelemetry(): Promise<void> {
  await flushTelemetry({ force: true });
}
