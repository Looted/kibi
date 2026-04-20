// implements REQ-opencode-kibi-plugin-v1

export interface PluginClient {
  app: {
    log: (payload: Record<string, unknown>) => Promise<void>;
  };
}

export type LogMetadata = Record<string, unknown>;

let client: PluginClient | null = null;

// implements REQ-opencode-kibi-plugin-v1
export function setClient(c: PluginClient): void {
  client = c;
}

// implements REQ-opencode-kibi-plugin-v1
export function resetClient(): void {
  client = null;
}

function buildBody(
  level: "info" | "warn" | "error",
  message: string,
  metadata?: LogMetadata,
): Record<string, unknown> {
  return {
    service: "kibi-opencode",
    level,
    message,
    ...(metadata ?? {}),
  };
}

// implements REQ-opencode-kibi-plugin-v1
export function info(msg: string, metadata?: LogMetadata): void {
  if (client) {
    void client.app
      .log({
        body: buildBody("info", msg, metadata),
      })
      .catch(console.error);
    return;
  }
  // Fallback when no client is available (e.g. during tests or early init)
}

// implements REQ-opencode-kibi-plugin-v1
export function warn(msg: string, metadata?: LogMetadata): void {
  if (client) {
    void client.app
      .log({
        body: buildBody("warn", msg, metadata),
      })
      .catch(console.error);
    return;
  }
  // Fallback when no client is available
}

// implements REQ-opencode-kibi-plugin-v1

/**
 * Failure classification contract for kibi-opencode logging.
 *
 * Three categories of failures, each with distinct routing:
 *
 * 1. **Advisory (background maintenance)** — e.g. scheduler sync/check failures,
 *    degraded-mode latches. These are non-blocking and advisory-only.
 *    Route through `errorStructuredOnly()`: emits to `client.app.log()` when
 *    client is bound; completely silent (no console.error) when no client exists.
 *    Advisory noise must never pollute the TUI.
 *
 * 2. **Operational (plugin failures)** — e.g. bootstrap-needed, hook/init failures.
 *    Route through `error()`: always emits to `console.error` for terminal
 *    visibility, plus `client.app.log()` when client is bound.
 *
 * 3. **Authoritative external failures** — git hooks, CLI checks. These are
 *    outside the plugin's logging surface entirely.
 *
 * ## Contract Rules
 *
 * - Once `client` is bound (after `setClient()`), advisory logging MUST use
 *   `errorStructuredOnly()` which routes through `client.app.log()` only.
 * - `errorStructuredOnly()` is completely silent when no client is bound
 *   (no console.error fallback). Advisory failures never pollute the terminal.
 * - `error()` preserves full terminal visibility for operational failures.
 */

export type FailureClassification =
  | "advisory_background"
  | "operational_plugin"
  | "authoritative_external";

// implements REQ-opencode-kibi-plugin-v1
export function errorStructuredOnly(
  msg: string,
  metadata?: LogMetadata,
): void {
  if (client) {
    void client.app
      .log({
        body: buildBody("error", msg, metadata),
      })
      .catch(() => {
        // Advisory failures are intentionally silent even on client logging
        // failures — advisory noise must never pollute the TUI or terminal.
      });
    return;
  }
  // No client bound: advisory failures are intentionally silent
  // (no console.error fallback — advisory noise must not pollute TUI)
}

// implements REQ-opencode-kibi-plugin-v1
export function error(msg: string, metadata?: LogMetadata): void {
  // Always emit to console for user visibility (operational failures)
  console.error("[kibi-opencode]", msg);
  // Also emit to structured logs if client is available
  if (client) {
    void client.app
      .log({
        body: buildBody("error", msg, metadata),
      })
      .catch(console.error);
  }
}
