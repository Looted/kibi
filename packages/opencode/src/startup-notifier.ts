import {
  sendToast,
  type SendToastResult,
  type ToastCapableClient,
  type ToastPayload,
} from "./toast.js";

export type { ToastPayload } from "./toast.js";

export type StartupNotifierClient = ToastCapableClient & {
  app: {
    log: (payload: Record<string, unknown>) => Promise<void>;
  };
};

export type StartupNotifierConfig = {
  versions?: { opencode?: string; mcp?: string; cli?: string; core?: string };
  suppressToast?: boolean;
  directory?: string;
};

const VERSION_ORDER = ["opencode", "mcp", "cli", "core"] as const;

// implements REQ-opencode-kibi-plugin-v1
export function notifyStartup(
  client: StartupNotifierClient,
  cfg: StartupNotifierConfig,
): void {
  const message = "kibi-opencode started";

  // Build toast message from known versions in order
  const versionParts: string[] = [];
  if (cfg.versions) {
    for (const key of VERSION_ORDER) {
      const val = cfg.versions[key];
      if (val !== undefined) {
        versionParts.push(`${key} v${val}`);
      }
    }
  }
  const displayMessage =
    versionParts.length > 0
      ? `${message} (${versionParts.join(", ")})`
      : message;

  // Compute unknown versions (keys from VERSION_ORDER not present in cfg.versions)
  const unknownVersions: string[] = [];
  if (cfg.versions) {
    for (const key of VERSION_ORDER) {
      if (cfg.versions[key] === undefined) {
        unknownVersions.push(key);
      }
    }
  }

  const toastPayload: ToastPayload = {
    variant: "success",
    title: "Kibi OpenCode",
    message: displayMessage,
    duration: 4000,
  };

  if (!cfg.suppressToast) {
    void sendToast(client, toastPayload).then((result: SendToastResult) => {
      const base: Record<string, unknown> = {
        service: "kibi-opencode",
        ...(cfg.directory ? { directory: cfg.directory } : {}),
      };

      if (result.status === "delivered") {
        void client.app
          .log({
            body: {
              ...base,
              level: "info",
              message: "startup toast delivered",
              transport: result.transport,
            },
          })
          .catch(() => {
            // Advisory log failure stays silent
          });
      } else if (result.status === "unavailable") {
        void client.app
          .log({
            body: {
              ...base,
              level: "info",
              message: "startup toast unavailable",
              reason: result.reason,
            },
          })
          .catch(() => {
            // Advisory log failure stays silent
          });
      } else if (result.status === "failed") {
        void client.app
          .log({
            body: {
              ...base,
              level: "warn",
              message: "startup toast delivery failed",
              transport: result.transport,
              reason: result.reason,
              ...(result.error ? { error: result.error } : {}),
            },
          })
          .catch(() => {
            // Advisory log failure stays silent
          });
      }
    });
  }

  // Structured startup log
  const logBody: Record<string, unknown> = {
    service: "kibi-opencode",
    level: "info",
    message,
  };

  if (cfg.versions && Object.keys(cfg.versions).length > 0) {
    logBody.versions = cfg.versions;
    logBody.unknownVersions = unknownVersions;
  }

  if (cfg.directory) {
    logBody.directory = cfg.directory;
  }

  void Promise.resolve(client.app.log({ body: logBody })).catch(() => {
    // Advisory log failure stays silent
  });
}
