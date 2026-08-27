export function isOperationalArtifactPath(pathLike: string): boolean {
  // implements REQ-001
  const normalized = pathLike.replaceAll("\\", "/");

  // Recovery journals and pending-source receipts are runtime-owned
  // operational state.  They must remain visible to Kibi's recovery/status
  // services, but they are not authored evidence and must not make a Git
  // verification snapshot dirty or enter source compilation as arbitrary
  // untracked files.
  return (
    /(^|\/)\.sisyphus\//.test(normalized) ||
    /(^|\/)\.kb\/recovery(?:\/|$)/.test(normalized)
  );
}
