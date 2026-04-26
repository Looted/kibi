export type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

export type ToastCapableClient = {
  tui?: {
    showToast?: (payload: ToastPayload) => void | Promise<void>;
  };
};

// implements REQ-opencode-kibi-plugin-v1
export function sendToast(
  client: ToastCapableClient,
  payload: ToastPayload,
): Promise<void> {
  if (typeof client.tui?.showToast === "function") {
    return Promise.resolve(client.tui.showToast(payload));
  }

  return Promise.resolve();
}
