export type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

export type StartupNotifierClient = {
  tui?: {
    showToast?: (payload: {
      body: {
        title?: string;
        message: string;
        variant?: "info" | "success" | "warning" | "error";
        duration?: number;
      };
    }) => void | Promise<void>;
    toast?: (payload: ToastPayload) => void | Promise<void>;
  };
  app: {
    log: (payload: Record<string, unknown>) => Promise<void>;
  };
};

export type StartupNotifierConfig = {
  version?: string;
  suppressToast?: boolean;
  directory?: string;
};

function hasShowToast(
  client: StartupNotifierClient,
): client is StartupNotifierClient & {
  tui: {
    showToast: (payload: {
      body: {
        title?: string;
        message: string;
        variant?: "info" | "success" | "warning" | "error";
        duration?: number;
      };
    }) => void | Promise<void>;
  };
} {
  return typeof client.tui?.showToast === "function";
}

function hasLegacyToast(
  client: StartupNotifierClient,
): client is StartupNotifierClient & {
  tui: {
    toast: (payload: ToastPayload) => void | Promise<void>;
  };
} {
  return typeof client.tui?.toast === "function";
}

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
    if (hasShowToast(client)) {
      void Promise.resolve(client.tui.showToast({ body: toastPayload }))
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
    } else if (hasLegacyToast(client)) {
      void Promise.resolve(client.tui.toast(toastPayload)).catch((err) => {
        console.error("[kibi-opencode] startup toast failed:", err);
      });
    }
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
