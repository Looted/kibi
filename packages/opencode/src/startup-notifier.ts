export type StartupNotifierClient = {
  tui?: {
    toast?: (payload: {
      variant?: "info" | "success" | "warning" | "error";
      title?: string;
      message: string;
      duration?: number;
    }) => void | Promise<void>;
  };
  app: {
    log: (payload: Record<string, unknown>) => Promise<void>;
  };
};

export type StartupNotifierConfig = {
  version?: string;
  suppressToast?: boolean;
};

function hasToast(
  client: StartupNotifierClient,
): client is StartupNotifierClient & {
  tui: {
    toast: (payload: {
      variant?: "info" | "success" | "warning" | "error";
      title?: string;
      message: string;
      duration?: number;
    }) => void | Promise<void>;
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

  if (!cfg.suppressToast && hasToast(client)) {
    void client.tui.toast({
      variant: "success",
      title: "Kibi OpenCode",
      message,
      duration: 4000,
    });
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
