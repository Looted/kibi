import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve, sep } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";

const fixtureChild = process.env.KIBI_CACHE_RESOLUTION_FIXTURE === "1";

if (fixtureChild) {
  // Import the side-effect-free package list first, write a complete fake
  // tarball set, then import helpers (which bootstraps pack resolution).
  const { packagesForPack } = await import("./packed-packages.js");
  const packageNames = packagesForPack;
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
    "KIBI_E2E_PACK_CACHE_KEY",
    "KIBI_E2E_PACK_CACHE_ROOT",
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
  const { writePackedInstallManifest } = await import(
    "./packed-install-manifest.js"
  );

  after(() => {
    try {
      helpers.cleanupSharedPackedInstallation();
      rmSync(tempRoot, { recursive: true, force: true });
    } finally {
      for (const key of environmentKeys) {
        const value = originalEnvironment[key];
        if (value === undefined) unset(key);
        else process.env[key] = value;
      }
    }
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

  // -- shared pack cache (KIBI_E2E_PACK_CACHE_KEY contract) ---------------------

  const cacheRoot = join(tempRoot, "pack-cache");

  /** Fabricate a complete published area the way a populating runner would. */
  function stageFakeScratch(scratch: string): void {
    mkdirSync(join(scratch, "prefix", "bin"), { recursive: true });
    mkdirSync(join(scratch, "tarballs"), { recursive: true });
    writeFileSync(join(scratch, "prefix", "bin", "kibi"), "", "utf8");
    for (const packageName of packageNames) {
      writeFileSync(
        join(scratch, "tarballs", `kibi-${packageName}-0.0.0.tgz`),
        `Opaque immutable ${packageName} archive fixture.\n`,
        "utf8",
      );
    }
  }

  function stageInstallMetadata(scratch: string): Map<string, Buffer> {
    const prefix = join(scratch, "prefix");
    const archive = (name: string) =>
      join(scratch, "tarballs", `kibi-${name}-0.0.0.tgz`);
    const tarballs: import("./helpers.js").Tarballs = {
      "agent-core": archive("agent-core"),
      core: archive("core"),
      cli: archive("cli"),
      runtime: archive("runtime"),
      mcp: archive("mcp"),
      opencode: archive("opencode"),
      codex: archive("codex"),
      cursor: archive("cursor"),
      "plugin-sdk": archive("plugin-sdk"),
      "plugin-builtin": archive("plugin-builtin"),
      "plugin-jev": archive("plugin-jev"),
      "plugin-treesitter": archive("plugin-treesitter"),
      swipl: archive("swipl"),
    };
    writePackedInstallManifest(prefix, tarballs);
    const manifest = JSON.parse(
      readFileSync(join(prefix, "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    const lock = {
      lockfileVersion: 3,
      packages: {
        "": { dependencies: manifest.dependencies },
        "node_modules/kibi-core": {
          resolved: manifest.dependencies["kibi-core"],
        },
        "node_modules/foreign": {
          resolved: `file:${join(tempRoot, "foreign.tgz")}`,
        },
      },
      similarPath: `file:${join(scratch, "tarballs-other", "foreign.tgz")}`,
    };
    mkdirSync(join(prefix, "node_modules"), { recursive: true });
    writeFileSync(join(prefix, "package-lock.json"), JSON.stringify(lock));
    writeFileSync(
      join(prefix, "node_modules", ".package-lock.json"),
      JSON.stringify(lock),
    );
    return new Map(
      [
        "package.json",
        "pnpm-workspace.yaml",
        "package-lock.json",
        "node_modules/.package-lock.json",
      ].map((name) => [name, readFileSync(join(prefix, name))]),
    );
  }

  test("published install provenance identifies the final immutable tarballs", () => {
    process.env.KIBI_E2E_PACK_CACHE_KEY = "published-provenance";
    process.env.KIBI_E2E_PACK_CACHE_ROOT = join(cacheRoot, 'quoted "path"');
    const claim = helpers.claimSharedPackCache();
    assert.notEqual(claim.scratch, null);
    if (claim.scratch === null) throw new Error("Expected staging claim");
    const scratch = claim.scratch;
    stageFakeScratch(scratch);
    const before = stageInstallMetadata(scratch);
    const originalTarballs = packageNames.map((name) =>
      readFileSync(join(scratch, "tarballs", `kibi-${name}-0.0.0.tgz`)),
    );
    const published = helpers.publishSharedPackCache(claim);
    assert.notEqual(published, null);
    if (published === null) throw new Error("Expected successful publication");
    assert.equal(existsSync(claim.scratch), false);
    const manifest = JSON.parse(
      readFileSync(join(published.prefix, "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    for (const [name, path] of Object.entries(manifest.dependencies)) {
      const expected: string = `file:${join(published.tarballsRoot, `${name}-0.0.0.tgz`)}`;
      assert.equal(path, expected);
      assert.equal(existsSync(path.slice("file:".length)), true);
    }
    for (const [name, bytes] of before) {
      assert.equal(
        readFileSync(join(published.prefix, name), "utf8"),
        bytes
          .toString()
          .replaceAll(
            JSON.stringify(`file:${join(scratch, "tarballs")}${sep}`).slice(
              1,
              -1,
            ),
            JSON.stringify(`file:${published.tarballsRoot}${sep}`).slice(1, -1),
          ),
      );
    }
    for (const [index, name] of packageNames.entries())
      assert.deepEqual(
        readFileSync(join(published.tarballsRoot, `kibi-${name}-0.0.0.tgz`)),
        originalTarballs[index],
      );
    const next = helpers.claimSharedPackCache();
    assert.equal(next.reusable, true);
    assert.equal(next.area, claim.area);
  });

  test("a losing publisher preserves the exact original staging provenance", () => {
    process.env.KIBI_E2E_PACK_CACHE_KEY = "provenance-race";
    process.env.KIBI_E2E_PACK_CACHE_ROOT = cacheRoot;
    const first = helpers.claimSharedPackCache();
    const second = helpers.claimSharedPackCache();
    if (first.scratch === null || second.scratch === null)
      throw new Error("Expected two staging claims");
    stageFakeScratch(first.scratch);
    stageInstallMetadata(first.scratch);
    stageFakeScratch(second.scratch);
    const before = stageInstallMetadata(second.scratch);
    assert.notEqual(helpers.publishSharedPackCache(first), null);
    assert.equal(helpers.publishSharedPackCache(second), null);
    for (const [name, bytes] of before)
      assert.deepEqual(
        readFileSync(join(second.scratch, "prefix", name)),
        bytes,
      );
    const manifest = JSON.parse(
      readFileSync(join(second.scratch, "prefix", "package.json"), "utf8"),
    ) as { dependencies: Record<string, string> };
    for (const path of Object.values(manifest.dependencies))
      assert.equal(existsSync(path.slice("file:".length)), true);
  });

  test("shared pack cache is disabled without a key", () => {
    unset("KIBI_E2E_PACK_CACHE_KEY");
    unset("KIBI_E2E_PACK_CACHE_ROOT");
    if (helpers.resolveSharedPackCache() !== null) {
      throw new Error("Expected no cache resolution without a key");
    }
    const claim = helpers.claimSharedPackCache();
    if (claim.reusable || claim.scratch !== null) {
      throw new Error(
        `Expected a no-op claim without a key, got ${JSON.stringify(claim)}`,
      );
    }
  });

  test("shared pack cache resolves a complete published area and reuses it", () => {
    process.env.KIBI_E2E_PACK_CACHE_KEY = "campaign-1";
    process.env.KIBI_E2E_PACK_CACHE_ROOT = cacheRoot;

    const claim = helpers.claimSharedPackCache();
    if (claim.reusable || claim.scratch === null) {
      throw new Error("Expected a staging claim for a missing area");
    }
    if (!claim.scratch.startsWith(claim.area)) {
      throw new Error("Staging tree must live beside its published area");
    }
    stageFakeScratch(claim.scratch);
    const published = helpers.publishSharedPackCache(claim);
    if (published === null) {
      throw new Error("Expected the first publisher to win the rename");
    }
    if (published.prefix !== join(claim.area, "prefix")) {
      throw new Error("Published prefix must live inside the cache area");
    }

    const resolution = helpers.resolveSharedPackCache();
    if (
      resolution === null ||
      resolution.area !== claim.area ||
      resolution.prefix !== join(claim.area, "prefix") ||
      resolution.tarballsRoot !== join(claim.area, "tarballs")
    ) {
      throw new Error(
        `Expected the published area to resolve, got ${JSON.stringify(resolution)}`,
      );
    }

    const secondClaim = helpers.claimSharedPackCache();
    if (!secondClaim.reusable || secondClaim.area !== claim.area) {
      throw new Error(
        `Expected the second runner to reuse the published area, got ${JSON.stringify(secondClaim)}`,
      );
    }
  });

  test("shared pack cache keys are sanitized and namespaces isolated", () => {
    process.env.KIBI_E2E_PACK_CACHE_KEY = "../../evil key!";
    process.env.KIBI_E2E_PACK_CACHE_ROOT = cacheRoot;
    const claim = helpers.claimSharedPackCache();
    // The sanitized key must be a single safe path segment inside a namespace
    // directory of the shape <cacheRoot>/kibi-e2e-pack/<12-hex>, so a hostile
    // key can neither traverse nor escape the cache root.
    const areaSegment = basename(claim.area);
    if (!/^[A-Za-z0-9._-]+$/.test(areaSegment)) {
      throw new Error(`Unsafe area segment: ${areaSegment}`);
    }
    const namespaceName = basename(dirname(claim.area));
    if (!/^[0-9a-f]{12}$/.test(namespaceName)) {
      throw new Error(`Unexpected namespace directory: ${namespaceName}`);
    }
    if (dirname(dirname(claim.area)) !== join(cacheRoot, "kibi-e2e-pack")) {
      throw new Error(`Area escaped the cache root: ${claim.area}`);
    }

    // A different key must never resolve another key's published area.
    unset("KIBI_E2E_PACK_CACHE_KEY");
    if (helpers.resolveSharedPackCache() !== null) {
      throw new Error("Expected no resolution without a key");
    }
  });

  test("a sibling that published first wins the rename; the loser keeps its staging", () => {
    process.env.KIBI_E2E_PACK_CACHE_KEY = "race";
    process.env.KIBI_E2E_PACK_CACHE_ROOT = cacheRoot;

    const first = helpers.claimSharedPackCache();
    const second = helpers.claimSharedPackCache();
    if (first.scratch === null || second.scratch === null) {
      throw new Error("Expected two staging claims");
    }
    if (first.scratch === second.scratch) {
      throw new Error("Staging claims must be distinct");
    }
    stageFakeScratch(first.scratch);
    stageFakeScratch(second.scratch);

    if (helpers.publishSharedPackCache(first) === null) {
      throw new Error("Expected the first publisher to win the rename");
    }
    if (helpers.publishSharedPackCache(second) !== null) {
      throw new Error("Expected the second publisher to lose the rename");
    }
    if (!existsSync(second.scratch)) {
      throw new Error("Loser staging must survive for this process to use");
    }

    const third = helpers.claimSharedPackCache();
    if (!third.reusable || third.area !== first.area) {
      throw new Error("Expected later runners to reuse the published area");
    }
  });

  test("an incomplete published area is never resolved or reused", () => {
    process.env.KIBI_E2E_PACK_CACHE_KEY = "partial";
    process.env.KIBI_E2E_PACK_CACHE_ROOT = cacheRoot;

    const claim = helpers.claimSharedPackCache();
    if (claim.scratch === null) throw new Error("Expected a staging claim");
    // Publish without the kibi binary or all tarballs: incomplete area.
    mkdirSync(join(claim.scratch, "prefix"), { recursive: true });
    mkdirSync(join(claim.scratch, "tarballs"), { recursive: true });
    const published = helpers.publishSharedPackCache(claim);
    if (published === null) throw new Error("Expected the rename to succeed");
    if (helpers.resolveSharedPackCache() !== null) {
      throw new Error("Incomplete areas must not resolve");
    }
    const nextClaim = helpers.claimSharedPackCache();
    if (nextClaim.reusable) {
      throw new Error("Incomplete areas must not be reused");
    }
  });

  function unset(key: string): void {
    Reflect.deleteProperty(process.env, key);
  }
} else {
  test("cache-resolution fixtures do not alter the sibling packed environment", () => {
    const originalPrefix = process.env.KIBI_E2E_PREFIX;
    const originalTarballs = process.env.KIBI_TEST_TARBALLS;
    const testFile = fileURLToPath(import.meta.url);
    const childArgs = process.versions.bun
      ? ["test", testFile]
      : ["--test", "--test-concurrency=1", "--test-force-exit", testFile];
    const child = spawnSync(process.execPath, childArgs, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        KIBI_CACHE_RESOLUTION_FIXTURE: "1",
      },
      encoding: "utf8",
    });

    if (child.error) throw child.error;
    if (child.status !== 0) {
      throw new Error(
        `Cache-resolution fixture child failed with ${child.status ?? child.signal}\nstdout:\n${child.stdout}\nstderr:\n${child.stderr}`,
      );
    }
    if (
      process.env.KIBI_E2E_PREFIX !== originalPrefix ||
      process.env.KIBI_TEST_TARBALLS !== originalTarballs
    ) {
      throw new Error(
        "Cache-resolution fixture changed the packed environment seen by sibling tests",
      );
    }
  });
}
