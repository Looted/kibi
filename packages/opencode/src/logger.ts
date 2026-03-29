// implements REQ-opencode-kibi-plugin-v1

interface PluginClient {
  app: {
    log: (payload: Record<string, unknown>) => Promise<void>;
  };
}

let client: PluginClient | null = null;

// implements REQ-opencode-kibi-plugin-v1
export function setClient(c: PluginClient): void {
  client = c;
}

// implements REQ-opencode-kibi-plugin-v1
export function resetClient(): void {
  client = null;
}

// implements REQ-opencode-kibi-plugin-v1
export function info(msg: string): void {
  if (client) {
    client.app.log({
      body: {
        service: "kibi-opencode",
        level: "info",
        message: msg,
      },
    });
    return;
  }
  // Fallback when no client is available (e.g. during tests or early init)
}

// implements REQ-opencode-kibi-plugin-v1
export function warn(msg: string): void {
  if (client) {
    client.app.log({
      body: {
        service: "kibi-opencode",
        level: "warn",
        message: msg,
      },
    });
    return;
  }
  // Fallback when no client is available
}

// implements REQ-opencode-kibi-plugin-v1
export function error(msg: string): void {
  // Always emit to console for user visibility
  console.error("[kibi-opencode]", msg);
  // Also emit to structured logs if client is available
  if (client) {
    client.app.log({
      body: {
        service: "kibi-opencode",
        level: "error",
        message: msg,
      },
    });
}
}
