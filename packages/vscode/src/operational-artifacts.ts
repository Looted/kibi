export function isOperationalArtifactPath(pathLike: string): boolean { // implements REQ-vscode-kibi-briefing-v1
  const normalized = pathLike.replaceAll("\\", "/");
  return /(^|\/)\.sisyphus\//.test(normalized);
}
