/** Workspace package dirs that must be present in every packed tarball set. */
// implements REQ-test-journaled-engine-harness
export const packagesForPack = [
  "core",
  "plugin-sdk",
  "agent-core",
  "plugin-builtin",
  "plugin-jev",
  "plugin-treesitter",
  "swipl",
  "runtime",
  "cli",
  "mcp",
  "opencode",
  "codex",
  "cursor",
] as const;

// implements REQ-test-journaled-engine-harness
export type PackedPackageName = (typeof packagesForPack)[number];

/** The kibi-swipl-<platform> package for this host (glibc Linux or macOS). */
// implements REQ-test-journaled-engine-harness
// implements REQ-prolog-bundled-release
export function hostSwiplPlatformPackage(): string {
  if (process.platform === "linux")
    return `kibi-swipl-linux-${process.arch}-gnu`;
  return `kibi-swipl-${process.platform}-${process.arch}`;
}
