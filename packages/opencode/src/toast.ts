export type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

export type SendToastResult =
  | { status: "delivered"; transport: "legacy" | "sdk" }
  | { status: "unavailable"; reason: "missing-capability" }
  | { status: "failed"; transport: "legacy" | "sdk"; reason: string; error?: string };

export type ToastCapableClient = {
  tui?: {
    /** Legacy direct TUI toast (works in plugin context) */
    toast?: (payload: ToastPayload) => void | Promise<void>;
    /** SDK toast - receives { body: ToastPayload } */
    showToast?: (payload: { body: ToastPayload }) => void | Promise<void>;
    /** SDK command bridge - invoke TUI command */
    executeCommand?: (command: string, args?: object) => void | Promise<void>;
    clearPrompt?: () => void | Promise<void>;
    submitPrompt?: () => void | Promise<void>;
  };
};

// implements REQ-opencode-kibi-plugin-v1
export async function sendToast(
  client: ToastCapableClient,
  payload: ToastPayload,
): Promise<SendToastResult> {
  if (typeof client.tui?.toast === "function") {
    try {
      await client.tui.toast(payload);
      return { status: "delivered", transport: "legacy" };
    } catch (err) {
      return {
        status: "failed",
        transport: "legacy",
        reason: "rejected",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  if (typeof client.tui?.showToast === "function") {
    try {
      const result = client.tui.showToast({ body: payload });
      if (result && typeof result.then === "function") {
        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error("showToast timed out")), 3000);
        });
        await Promise.race([result, timeout]);
      }
      return { status: "delivered", transport: "sdk" };
    } catch (err) {
      return {
        status: "failed",
        transport: "sdk",
        reason:
          err instanceof Error && err.message === "showToast timed out"
            ? "timed-out"
            : "rejected",
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  return { status: "unavailable", reason: "missing-capability" };
}
