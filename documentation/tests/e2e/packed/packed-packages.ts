/** Workspace package dirs that must be present in every packed tarball set. */
// implements REQ-test-journaled-engine-harness
export const packagesForPack = [
  "core",
  "plugin-sdk",
  "plugin-builtin",
  "plugin-jev",
  "plugin-treesitter",
  "runtime",
  "cli",
  "mcp",
  "opencode",
  "codex",
  "cursor",
] as const;

// implements REQ-test-journaled-engine-harness
export type PackedPackageName = (typeof packagesForPack)[number];
