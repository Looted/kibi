export type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

type ShowToastPayload = {
  body: ToastPayload;
};

type ShowToast = (payload: ShowToastPayload) => void | Promise<void>;
type LegacyToast = (payload: ToastPayload) => void | Promise<void>;

type ToastUi = {
  showToast?: ShowToast;
  toast?: LegacyToast;
};

export type ToastCapableClient = {
  tui?: ToastUi;
};

type ClientWithShowToast = ToastCapableClient & {
  tui: ToastUi & {
    showToast: ShowToast;
  };
};

type ClientWithLegacyToast = ToastCapableClient & {
  tui: ToastUi & {
    toast: LegacyToast;
  };
};

// implements REQ-opencode-kibi-plugin-v1
export function hasShowToast(
  client: ToastCapableClient,
): client is ClientWithShowToast {
  return typeof client.tui?.showToast === "function";
}

// implements REQ-opencode-kibi-plugin-v1
export function hasLegacyToast(
  client: ToastCapableClient,
): client is ClientWithLegacyToast {
  return typeof client.tui?.toast === "function";
}

// implements REQ-opencode-kibi-plugin-v1
export function sendToast(
  client: ToastCapableClient,
  payload: ToastPayload,
): void | Promise<void> {
  if (hasShowToast(client)) {
    return client.tui.showToast({ body: payload });
  }

  if (hasLegacyToast(client)) {
    return client.tui.toast(payload);
  }
}
