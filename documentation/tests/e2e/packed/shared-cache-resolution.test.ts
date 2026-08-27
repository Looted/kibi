import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { after, test } from "node:test";

const packageNames = [
  "core",
  "cli",
  "runtime",
  "mcp",
  "opencode",
  "codex",
  "cursor",
] as const;
const tempRoot = mkdtempSync(join(tmpdir(), "kibi-cache-resolution-test-"));
const fakePrefix = join(tempRoot, "prefix");
const fakeTarballs = join(tempRoot, "tarballs");
const fakeHome = join(tempRoot, "home");
mkdirSync(join(fakePrefix, "bin"), { recursive: true });
mkdirSync(fakeTarballs, { recursive: true });
mkdirSync(fakeHome, { recursive: true });
writeFileSync(join(fakePrefix, "bin", "kibi"), "", "utf8");
for (const packageName of packageNames) {
  writeFileSync(
    join(fakeTarballs, `kibi-${packageName}-0.0.0.tgz`),
    "",
    "utf8",
  );
}

const environmentKeys = [
  "KIBI_E2E_PREFIX",
  "KIBI_TEST_TARBALLS",
  "KIBI_E2E_NPM_CACHE",
  "npm_config_cache",
  "HOME",
  "USERPROFILE",
] as const;
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);
process.env.KIBI_E2E_PREFIX = fakePrefix;
process.env.KIBI_TEST_TARBALLS = fakeTarballs;
unset("KIBI_E2E_NPM_CACHE");
unset("npm_config_cache");
process.env.HOME = fakeHome;

const helpers = await import("./helpers.js");

after(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) unset(key);
    else process.env[key] = value;
  }
  helpers.cleanupSharedPackedInstallation();
  rmSync(tempRoot, { recursive: true, force: true });
});

// executable_for TEST-test-journaled-engine-harness
test("suite cache resolution prioritizes explicit, ambient, then original HOME", () => {
  process.env.KIBI_E2E_NPM_CACHE = join(tempRoot, "explicit-cache");
  assertCache(join(tempRoot, "explicit-cache"), false);

  unset("KIBI_E2E_NPM_CACHE");
  process.env.npm_config_cache = join(tempRoot, "ambient-cache");
  assertCache(join(tempRoot, "ambient-cache"), false);

  unset("npm_config_cache");
  assertCache(join(resolve(fakeHome), ".npm"), false);

  unset("HOME");
  unset("USERPROFILE");
  const fallback = helpers.resolveSharedNpmCache();
  if (!fallback.owned || !existsSync(fallback.path)) {
    throw new Error(
      `Expected an owned fallback cache, got ${JSON.stringify(fallback)}`,
    );
  }
  helpers.cleanupSharedPackedInstallation();
  if (existsSync(fallback.path)) {
    throw new Error(`Owned fallback cache was not cleaned: ${fallback.path}`);
  }
});

function assertCache(expectedPath: string, expectedOwned: boolean): void {
  const cache = helpers.resolveSharedNpmCache();
  if (cache.path !== expectedPath || cache.owned !== expectedOwned) {
    throw new Error(
      `Unexpected cache resolution: ${JSON.stringify(cache)}; expected ${JSON.stringify({ path: expectedPath, owned: expectedOwned })}`,
    );
  }
}

function unset(key: string): void {
  Reflect.deleteProperty(process.env, key);
}
