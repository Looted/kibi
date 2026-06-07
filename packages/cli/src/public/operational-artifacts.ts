export function isOperationalArtifactPath(pathLike: string): boolean {
  // implements REQ-001
  const normalized = pathLike.replaceAll("\\", "/");

  return /(^|\/)\.sisyphus\//.test(normalized);
}
