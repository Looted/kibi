/** The data-only kibi-lang-* grammar packs kibi-plugin-treesitter reads with. */
export const languagePackDirs = [
  "lang-go",
  "lang-rust",
  "lang-java",
  "lang-csharp",
  "lang-php",
  "lang-c",
  "lang-cpp",
  "lang-bash",
  "lang-ruby",
  "lang-hcl",
  "lang-python",
  "lang-prolog",
] as const;

export type LanguagePackDir = (typeof languagePackDirs)[number];

/** Workspace package dirs that must be present in every packed tarball set. */
export const packagesForPack = [
  "core",
  "plugin-sdk",
  "agent-core",
  "plugin-builtin",
  "plugin-jev",
  "plugin-ui",
  "plugin-search-hints",
  "plugin-treesitter",
  ...languagePackDirs,
  "swipl",
  "runtime",
  "cli",
  "mcp",
  "opencode",
  "codex",
  "cursor",
] as const;

export type PackedPackageName = (typeof packagesForPack)[number];

/** The kibi-swipl-<platform> package for this host (glibc Linux or macOS). */
export function hostSwiplPlatformPackage(): string {
  if (process.platform === "linux")
    return `kibi-swipl-linux-${process.arch}-gnu`;
  return `kibi-swipl-${process.platform}-${process.arch}`;
}
