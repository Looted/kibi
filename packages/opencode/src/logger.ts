// implements REQ-opencode-kibi-plugin-v1
export function info(msg: string): void {
  console.log("[kibi-opencode]", msg);
}

export function warn(msg: string): void {
  console.warn("[kibi-opencode]", msg);
}
