export type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

export type StartupNotifierClient = {
  tui?: {
    showToast?: (payload: {
      body: ToastPayload;
      query?: { directory?: string };
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
};

function hasShowToast(
  client: StartupNotifierClient,
): client is StartupNotifierClient & {
  tui: {
    showToast: (payload: {
      body: ToastPayload;
      query?: { directory?: string };
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
      void client.tui.showToast({ body: toastPayload });
    } else if (hasLegacyToast(client)) {
      void client.tui.toast(toastPayload);
    }
  }

  void client.app.log({
    body: {
      service: "kibi-opencode",
      level: "info",
      message,
      ...(cfg.version ? { version: cfg.version } : {}),
    },
  });
}
