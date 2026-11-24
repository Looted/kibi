// The release dry run's archive cache. swipl-build.yml reads the mode and
// hashes these files into the cache key; the workflow contract tests check
// the workflow against this module.

/** Files whose bytes decide a platform archive. A change misses the cache. */
export const SWIPL_RELEASE_ARCHIVE_CACHE_INPUTS = [
  "scripts/swipl-version.json",
  "scripts/swipl-spike.py",
  "scripts/swipl-spike.sh",
  "scripts/swipl-windows-repack.py",
  "scripts/patches/swipl-*.patch",
  ".github/workflows/swipl-build.yml",
] as const;

/**
 * How a release-pack run treats the archive cache.
 * Pull requests restore. A develop push rebuilds and saves. Anything else,
 * including publish (which omits the input) and a manual dry run, stays off.
 */
export function swiplArchiveCacheMode(
  eventName: string,
): "read" | "write" | "off" {
  if (eventName === "pull_request") return "read";
  if (eventName === "push") return "write";
  return "off";
}
