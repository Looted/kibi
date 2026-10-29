// implements REQ-kibi-anonymous-usage-telemetry
import {
  type TelemetrySource,
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

let source: TelemetrySource | undefined;

function telemetrySource(): TelemetrySource {
  source ??= {
    packageName: "kibi-mcp",
    packageVersion: readMcpPackageVersion(),
    host: process.env.KIBI_MCP_HOST,
  };
  return source;
}

// implements REQ-kibi-anonymous-usage-telemetry
export function recordMcpToolTelemetry(input: {
  readonly operation: string;
  readonly startedAt: Date;
  readonly status: "success" | "error";
  readonly error?: unknown;
}): void {
  recordOperationTelemetry(telemetrySource(), {
    interface: "mcp",
    operation: input.operation,
    status: input.status,
    durationMs: Date.now() - input.startedAt.getTime(),
    errorCategory:
      input.error === undefined
        ? undefined
        : classifyDiagnosticError(input.error).error_category,
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
