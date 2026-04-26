import {
  sendToast,
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
  const toastPayload: ToastPayload = {
    variant: "success",
    title: "Kibi OpenCode",
    message,
    duration: 4000,
  };

  if (!cfg.suppressToast) {
    void Promise.resolve(sendToast(client, toastPayload))
      .then(
        (result) =>
          void Promise.resolve(
            client.app.log({
              body: {
                service: "kibi-opencode",
                level: "info",
                message: "startup toast result",
                result: String(result),
                ...(cfg.directory ? { directory: cfg.directory } : {}),
              },
            }),
          ).catch((logErr) => {
            console.error(
              "[kibi-opencode] startup toast result log failed:",
              logErr,
            );
          }),
      )
      .catch((err) => {
        console.error("[kibi-opencode] startup toast failed:", err);
        void Promise.resolve(
          client.app.log({
            body: {
              service: "kibi-opencode",
              level: "warn",
              message: "startup toast failed",
              error: String(err),
              ...(cfg.directory ? { directory: cfg.directory } : {}),
            },
          }),
        ).catch((logErr) => {
          console.error("[kibi-opencode] startup toast log failed:", logErr);
        });
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
    console.error("[kibi-opencode] startup log failed:", err);
  });
}
