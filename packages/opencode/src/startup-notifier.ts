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
  version?: string;
  suppressToast?: boolean;
  directory?: string;
};

// implements REQ-opencode-kibi-plugin-v1
export function notifyStartup(
  client: StartupNotifierClient,
  cfg: StartupNotifierConfig,
): void {
  const message = "kibi-opencode started";
  const displayMessage = cfg.version
    ? `${message} (v${cfg.version})`
    : message;
  const toastPayload: ToastPayload = {
    variant: "success",
    title: "Kibi OpenCode",
    message: displayMessage,
    duration: 4000,
  };

  if (!cfg.suppressToast) {
    void sendToast(client, toastPayload).then((result: SendToastResult) => {
      const base = {
        service: "kibi-opencode",
        ...(cfg.directory ? { directory: cfg.directory } : {}),
      };

      if (result.status === "delivered") {
        void client.app.log({
          body: {
            ...base,
            level: "info",
            message: "startup toast delivered",
            transport: result.transport,
          },
        }).catch(() => {
          // Advisory log failure stays silent
        });
      } else if (result.status === "unavailable") {
        void client.app.log({
          body: {
            ...base,
            level: "info",
            message: "startup toast unavailable",
            reason: result.reason,
          },
        }).catch(() => {
          // Advisory log failure stays silent
        });
      } else if (result.status === "failed") {
        void client.app.log({
          body: {
            ...base,
            level: "warn",
            message: "startup toast delivery failed",
            transport: result.transport,
            reason: result.reason,
            ...(result.error ? { error: result.error } : {}),
          },
        }).catch(() => {
          // Advisory log failure stays silent
        });
      }
    });
  }

  void Promise.resolve(
    client.app.log({
      body: {
        service: "kibi-opencode",
        level: "info",
        message,
        ...(cfg.version ? { version: cfg.version } : {}),
        ...(cfg.directory ? { directory: cfg.directory } : {}),
      },
    }),
  ).catch((err) => {
    // Advisory log failure stays silent
  });
}
