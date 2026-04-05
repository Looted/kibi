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
export function error(msg: string, metadata?: LogMetadata): void {
  // Always emit to console for user visibility
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
