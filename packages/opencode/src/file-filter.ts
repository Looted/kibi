// implements REQ-opencode-kibi-plugin-v1
export function shouldHandleFile(path: string): boolean {
  // simple stub: accept markdown and ts/js files
  return /\.(md|ts|tsx|js|jsx)$/.test(path);
}
