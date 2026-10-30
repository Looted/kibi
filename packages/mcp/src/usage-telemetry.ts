// implements REQ-kibi-anonymous-usage-telemetry
import {
  type TelemetrySource,
  detectTelemetryHost,
  flushTelemetry,
  recordOperationTelemetry,
  takeTelemetryNotice,
} from "kibi-agent-core/usage-telemetry";

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
}): void {
  recordOperationTelemetry(telemetrySource(input.clientName), {
    interface: "mcp",
    operation: input.operation,
    status: input.status,
    durationMs: Date.now() - input.startedAt.getTime(),
    errorCategory:
      input.error !== undefined
        ? classifyDiagnosticError(input.error).error_category
        : input.status === "error"
          ? resultErrorCode(input.result)
          : undefined,
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
