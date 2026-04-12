export type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

export type StartupNotifierClient = {
  tui?: {
    showToast?: (payload: {
      title?: string;
      message: string;
      variant?: "info" | "success" | "warning" | "error";
      duration?: number;
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
      title?: string;
      message: string;
      variant?: "info" | "success" | "warning" | "error";
      duration?: number;
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
export async function notifyStartup(
  client: StartupNotifierClient,
  cfg: StartupNotifierConfig,
): Promise<void> {
  const message = "kibi-opencode started";
  const toastPayload: ToastPayload = {
    variant: "success",
    title: "Kibi OpenCode",
    message,
    duration: 4000,
  };

  if (!cfg.suppressToast) {
    if (hasShowToast(client)) {
      try {
        await client.tui.showToast(toastPayload);
      } catch (err) {
        console.error("[kibi-opencode] startup toast failed:", err);
        await client.app.log({
          body: {
            service: "kibi-opencode",
            level: "warn",
            message: "startup toast failed",
            error: String(err),
            ...(cfg.directory ? { directory: cfg.directory } : {}),
          },
        });
      }
    } else if (hasLegacyToast(client)) {
      await client.tui.toast(toastPayload);
    }
  }

  return client.app.log({
    body: {
      service: "kibi-opencode",
      level: "info",
      message,
      ...(cfg.version ? { version: cfg.version } : {}),
      ...(cfg.directory ? { directory: cfg.directory } : {}),
    },
  });
}
