// executable_for TEST-prolog-bundled-runtime
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  SwiplResolutionError,
  type SwiplResolverDeps,
  inspectSwiplBundle,
  resetSwiplResolverCache,
  resolveSwipl,
  resolveSwiplWith,
  swiplChildEnv,
  swiplIdentity,
} from "../../src/prolog/swipl-resolver.js";

const tempRoots: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "kibi-swipl-resolver-"));
  tempRoots.push(dir);
  return dir;
}

afterEach(() => {
  resetSwiplResolverCache();
  for (const dir of tempRoots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function versionBanner(version: string): string {
  return `SWI-Prolog version ${version} for x86_64-linux\n`;
}

/** Writes an executable shell script that prints a SWI-style version banner. */
function writeSwipl(file: string, version: string): string {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `#!/bin/sh\nprintf '%s' '${versionBanner(version)}'\n`);
  chmodSync(file, 0o755);
  return file;
}

type BundleOptions = {
  key?: string;
  version?: string;
  packageVersion?: string;
  mutateManifest?: (manifest: Record<string, unknown>) => void;
  rawManifest?: string;
  skipManifest?: boolean;
  skipBinary?: boolean;
  tamperBinary?: boolean;
  skipHome?: boolean;
};

/** Builds a platform package directory shaped like the pipeline output. */
function writeBundle(root: string, options: BundleOptions = {}): string {
  const key = options.key ?? "linux-x64-gnu";
  const version = options.version ?? "10.0.2";
  const dir = path.join(root, `kibi-swipl-${key}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({
      name: `kibi-swipl-${key}`,
      version: "1.0.0",
      kibi: { swiplVersion: options.packageVersion ?? version, target: key },
    }),
  );
  const binary = path.join(dir, "bin", "swipl");
  if (options.skipBinary !== true) writeSwipl(binary, version);
  const sha = createHash("sha256")
    .update(
      options.skipBinary === true
        ? ""
        : `#!/bin/sh\nprintf '%s' '${versionBanner(version)}'\n`,
    )
    .digest("hex");
  if (options.tamperBinary === true) {
    writeFileSync(binary, "#!/bin/sh\necho tampered\n");
    chmodSync(binary, 0o755);
  }
  if (options.skipHome !== true)
    mkdirSync(path.join(dir, "lib", "swipl"), { recursive: true });
  const manifest: Record<string, unknown> = {
    schema: "kibi.swipl-build.v1",
    target: key,
    swiplVersion: version,
    binary: { path: "bin/swipl", sha256: sha },
    home: "lib/swipl",
    requiredLibraries: ["semweb/rdf_db"],
  };
  options.mutateManifest?.(manifest);
  if (options.skipManifest !== true) {
    writeFileSync(
      path.join(dir, "build-manifest.json"),
      options.rawManifest ?? JSON.stringify(manifest),
    );
  }
  return dir;
}

/** Fake host facts; version output comes from the real scripts unless set. */
function makeDeps(
  overrides: Partial<SwiplResolverDeps> = {},
): SwiplResolverDeps {
  return {
    platform: "linux",
    arch: "x64",
    glibc: true,
    locatePackage: () => undefined,
    runVersion: (bin) => {
      throw new Error(`unexpected version probe of ${bin}`);
    },
    ...overrides,
  };
}

function scriptVersions(
  versions: Record<string, string>,
): SwiplResolverDeps["runVersion"] {
  return (bin) => {
    const version = versions[bin];
    if (version === undefined) throw new Error(`no fake version for ${bin}`);
    return versionBanner(version);
  };
}

const LINUX_INSTALL =
  "sudo apt-add-repository ppa:swi-prolog/stable && sudo apt-get update && sudo apt-get install swi-prolog";

describe("resolveSwipl lookup order", () => {
  test("KIBI_SWIPL wins over an installed bundle and swipl on PATH", () => {
    const root = tempDir();
    const pkgDir = writeBundle(root);
    const override = writeSwipl(path.join(root, "custom", "swipl"), "9.3.1");
    const onPath = writeSwipl(path.join(root, "pathbin", "swipl"), "10.0.0");
    const resolved = resolveSwiplWith(
      { KIBI_SWIPL: override, PATH: path.dirname(onPath) },
      makeDeps({
        locatePackage: () => pkgDir,
        runVersion: scriptVersions({ [override]: "9.3.1", [onPath]: "10.0.0" }),
      }),
    );
    expect(resolved).toEqual({
      bin: override,
      version: "9.3.1",
      source: "env",
    });
    expect(swiplChildEnv(resolved)).toEqual({});
  });

  test.each([
    ["a relative path", "bin/swipl", "is not an absolute path"],
    ["a missing file", "/nonexistent/kibi/swipl", "is not an executable file"],
  ])(
    "KIBI_SWIPL set to %s fails instead of falling through",
    (_label, value, detail) => {
      const root = tempDir();
      const onPath = writeSwipl(path.join(root, "pathbin", "swipl"), "10.0.0");
      let failure: unknown;
      try {
        resolveSwiplWith(
          { KIBI_SWIPL: value, PATH: path.dirname(onPath) },
          makeDeps({ runVersion: scriptVersions({ [onPath]: "10.0.0" }) }),
        );
      } catch (error) {
        failure = error;
      }
      expect(failure).toBeInstanceOf(SwiplResolutionError);
      expect((failure as SwiplResolutionError).code).toBe("swipl_env_invalid");
      expect((failure as SwiplResolutionError).message).toContain(
        `KIBI_SWIPL=${value} ${detail}`,
      );
    },
  );

  test("KIBI_SWIPL pointing at swipl older than 9.0 is rejected", () => {
    const root = tempDir();
    const old = writeSwipl(path.join(root, "old", "swipl"), "8.4.2");
    expect(() =>
      resolveSwiplWith(
        { KIBI_SWIPL: old },
        makeDeps({ runVersion: scriptVersions({ [old]: "8.4.2" }) }),
      ),
    ).toThrow("is SWI-Prolog 8.4.2, but 9.0 or newer is required");
  });

  test("KIBI_SWIPL that cannot report a version is rejected", () => {
    const root = tempDir();
    const broken = writeSwipl(path.join(root, "broken", "swipl"), "10.0.0");
    expect(() =>
      resolveSwiplWith(
        { KIBI_SWIPL: broken },
        makeDeps({ runVersion: () => "not a banner" }),
      ),
    ).toThrow("could not report its version (unrecognized --version output");
  });

  test("KIBI_SWIPL=system skips an installed bundle and uses PATH", () => {
    const root = tempDir();
    const pkgDir = writeBundle(root);
    const onPath = writeSwipl(path.join(root, "pathbin", "swipl"), "9.2.9");
    const resolved = resolveSwiplWith(
      { KIBI_SWIPL: "system", PATH: path.dirname(onPath) },
      makeDeps({
        locatePackage: () => pkgDir,
        runVersion: scriptVersions({ [onPath]: "9.2.9" }),
      }),
    );
    expect(resolved).toEqual({ bin: onPath, version: "9.2.9", source: "path" });
  });

  test("KIBI_SWIPL=system with no swipl on PATH reports the skipped bundle", () => {
    const root = tempDir();
    const pkgDir = writeBundle(root);
    let failure: unknown;
    try {
      resolveSwiplWith(
        { KIBI_SWIPL: "system", PATH: path.join(root, "empty") },
        makeDeps({ locatePackage: () => pkgDir }),
      );
    } catch (error) {
      failure = error;
    }
    const message = (failure as SwiplResolutionError).message;
    expect(message).toContain(
      "Bundled SWI-Prolog: skipped because KIBI_SWIPL=system.",
    );
    expect(message).toContain("swipl was not found on PATH");
  });

  test("uses the verified bundle, its SWI home, and the manifest version", () => {
    const root = tempDir();
    const pkgDir = writeBundle(root, { version: "10.0.2" });
    const onPath = writeSwipl(path.join(root, "pathbin", "swipl"), "9.0.4");
    const resolved = resolveSwiplWith(
      { PATH: path.dirname(onPath) },
      makeDeps({ locatePackage: () => pkgDir }),
    );
    expect(resolved).toEqual({
      bin: path.join(pkgDir, "bin", "swipl"),
      home: path.join(pkgDir, "lib", "swipl"),
      version: "10.0.2",
      source: "bundled",
    });
    expect(swiplChildEnv(resolved)).toEqual({
      SWI_HOME_DIR: path.join(pkgDir, "lib", "swipl"),
    });
    expect(swiplIdentity(resolved)).toBe(
      `${path.join(pkgDir, "bin", "swipl")}@10.0.2`,
    );
    expect(
      inspectSwiplBundle(makeDeps({ locatePackage: () => pkgDir })),
    ).toEqual({
      state: "installed",
      packageName: "kibi-swipl-linux-x64-gnu",
    });
  });

  test.each<[string, BundleOptions, string]>([
    [
      "a binary that does not match the manifest checksum",
      { tamperBinary: true },
      "SHA-256",
    ],
    [
      "a manifest without the binary checksum",
      {
        mutateManifest: (manifest) => {
          manifest.binary = { path: "bin/swipl" };
        },
      },
      "binary.sha256 must be 64 lowercase hex digits",
    ],
    [
      "a manifest without a version",
      {
        mutateManifest: (manifest) => {
          Reflect.deleteProperty(manifest, "swiplVersion");
        },
      },
      "swiplVersion is missing or invalid",
    ],
    [
      "a manifest without a home",
      {
        mutateManifest: (manifest) => {
          Reflect.deleteProperty(manifest, "home");
        },
      },
      "home must be a normalized relative path",
    ],
    [
      "a manifest home that escapes the package",
      {
        mutateManifest: (manifest) => {
          manifest.home = "../elsewhere";
        },
      },
      "home must be a normalized relative path",
    ],
    [
      "a manifest built for another platform",
      {
        mutateManifest: (manifest) => {
          manifest.target = "darwin-arm64";
        },
      },
      "does not match linux-x64-gnu",
    ],
    [
      "a manifest version that disagrees with kibi.swiplVersion",
      { packageVersion: "10.0.1" },
      "does not match package kibi.swiplVersion 10.0.1",
    ],
    ["a manifest that is not JSON", { rawManifest: "{" }, "is not valid JSON"],
    [
      "a manifest that is not an object",
      { rawManifest: "[]" },
      "manifest is not a JSON object",
    ],
    [
      "a missing binary",
      { skipBinary: true },
      "bin/swipl is missing or not executable",
    ],
    [
      "a manifest missing beside a binary",
      { skipManifest: true },
      "build-manifest.json is missing next to bin/swipl",
    ],
    ["a missing SWI home", { skipHome: true }, "lib/swipl is missing"],
  ])("refuses a bundle with %s", (_label, options, reason) => {
    const root = tempDir();
    const pkgDir = writeBundle(root, options);
    const onPath = writeSwipl(path.join(root, "pathbin", "swipl"), "10.0.0");
    const deps = makeDeps({
      locatePackage: () => pkgDir,
      runVersion: scriptVersions({ [onPath]: "10.0.0" }),
    });
    let failure: unknown;
    try {
      resolveSwiplWith({ PATH: path.dirname(onPath) }, deps);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(SwiplResolutionError);
    const error = failure as SwiplResolutionError;
    expect(error.code).toBe("swipl_bundle_corrupt");
    expect(error.packageName).toBe("kibi-swipl-linux-x64-gnu");
    expect(error.message).toContain("kibi-swipl-linux-x64-gnu is damaged");
    expect(error.message).toContain(reason);
    expect(error.message).toContain("KIBI_SWIPL=system");
    // The operator escape hatch still works on the same install.
    expect(
      resolveSwiplWith(
        { KIBI_SWIPL: "system", PATH: path.dirname(onPath) },
        deps,
      ).source,
    ).toBe("path");
    expect(inspectSwiplBundle(deps)).toMatchObject({ state: "corrupt" });
  });

  test("an unpopulated workspace package is not a bundle and falls through to PATH", () => {
    const root = tempDir();
    const pkgDir = path.join(root, "kibi-swipl-linux-x64-gnu");
    mkdirSync(pkgDir, { recursive: true });
    writeFileSync(path.join(pkgDir, "package.json"), "{}");
    const onPath = writeSwipl(path.join(root, "pathbin", "swipl"), "10.0.2");
    const deps = makeDeps({
      locatePackage: () => pkgDir,
      runVersion: scriptVersions({ [onPath]: "10.0.2" }),
    });
    expect(resolveSwiplWith({ PATH: path.dirname(onPath) }, deps)).toEqual({
      bin: onPath,
      version: "10.0.2",
      source: "path",
    });
    expect(inspectSwiplBundle(deps)).toEqual({
      state: "empty",
      packageName: "kibi-swipl-linux-x64-gnu",
    });
  });

  test("uses swipl from PATH (first match) when no bundle is installed", () => {
    const root = tempDir();
    const first = writeSwipl(path.join(root, "a", "swipl"), "9.0.4");
    const second = writeSwipl(path.join(root, "b", "swipl"), "10.0.2");
    const resolved = resolveSwiplWith(
      {
        PATH: [path.dirname(first), path.dirname(second)].join(path.delimiter),
      },
      makeDeps({
        runVersion: scriptVersions({ [first]: "9.0.4", [second]: "10.0.2" }),
      }),
    );
    expect(resolved).toEqual({ bin: first, version: "9.0.4", source: "path" });
    expect(resolved.home).toBeUndefined();
  });

  test("rejects swipl on PATH older than 9.0 and says so", () => {
    const root = tempDir();
    const old = writeSwipl(path.join(root, "a", "swipl"), "8.4.2");
    let failure: unknown;
    try {
      resolveSwiplWith(
        { PATH: path.dirname(old) },
        makeDeps({ runVersion: scriptVersions({ [old]: "8.4.2" }) }),
      );
    } catch (error) {
      failure = error;
    }
    const error = failure as SwiplResolutionError;
    expect(error.code).toBe("swipl_not_found");
    expect(error.message).toContain(
      `System SWI-Prolog: swipl on PATH (${old}) is version 8.4.2, older than 9.0.`,
    );
    expect(error.message).toContain(LINUX_INSTALL);
  });

  test("reports a swipl on PATH that cannot run", () => {
    const root = tempDir();
    const broken = writeSwipl(path.join(root, "a", "swipl"), "10.0.2");
    expect(() =>
      resolveSwiplWith(
        { PATH: path.dirname(broken) },
        makeDeps({
          runVersion: () => {
            throw new Error("exec format error");
          },
        }),
      ),
    ).toThrow(
      `swipl on PATH (${broken}) could not report its version (exec format error)`,
    );
  });
});

describe("resolveSwipl failure text", () => {
  function failureFor(
    deps: SwiplResolverDeps,
    env: NodeJS.ProcessEnv,
  ): SwiplResolutionError {
    try {
      resolveSwiplWith(env, deps);
    } catch (error) {
      return error as SwiplResolutionError;
    }
    throw new Error("expected resolution to fail");
  }

  test("names platform, covering package, and the exact Linux install command", () => {
    const error = failureFor(makeDeps(), { PATH: "/nonexistent/kibi-path" });
    expect(error).toBeInstanceOf(SwiplResolutionError);
    expect(error.code).toBe("swipl_not_found");
    expect(error.platform).toBe("linux-x64 (glibc)");
    expect(error.packageName).toBe("kibi-swipl-linux-x64-gnu");
    expect(error.message).toBe(
      [
        "Kibi could not find a usable SWI-Prolog (9.0 or newer is required).",
        "Detected platform: linux-x64 (glibc).",
        "Bundled SWI-Prolog: package kibi-swipl-linux-x64-gnu would cover this platform but is not installed. It is skipped by installs that omit optional dependencies (npm --omit=optional, --no-optional) and by pnpm supportedArchitectures settings that exclude this platform.",
        "  Add it with: npm install --save-dev kibi-swipl-linux-x64-gnu",
        "System SWI-Prolog: swipl was not found on PATH.",
        `  Install it with: ${LINUX_INSTALL}`,
        "Or set KIBI_SWIPL to the absolute path of a SWI-Prolog 9.0+ executable.",
      ].join("\n"),
    );
  });

  test("uses the macOS package and Homebrew command on Apple silicon and Intel", () => {
    for (const arch of ["arm64", "x64"] as const) {
      const error = failureFor(
        makeDeps({ platform: "darwin", arch, glibc: undefined }),
        {
          PATH: "/nonexistent/kibi-path",
        },
      );
      expect(error.platform).toBe(`darwin-${arch}`);
      expect(error.packageName).toBe(`kibi-swipl-darwin-${arch}`);
      expect(error.message).toContain(
        `npm install --save-dev kibi-swipl-darwin-${arch}`,
      );
      expect(error.message).toContain(
        "  Install it with: brew install swi-prolog",
      );
    }
  });

  test("uses the arm64 Linux package", () => {
    const error = failureFor(makeDeps({ arch: "arm64" }), { PATH: "" });
    expect(error.packageName).toBe("kibi-swipl-linux-arm64-gnu");
  });

  test.each<[string, Partial<SwiplResolverDeps>, string, string]>([
    ["musl Linux", { glibc: false }, "linux-x64 (musl)", LINUX_INSTALL],
    [
      "native Windows",
      { platform: "win32", glibc: undefined },
      "win32-x64",
      "download the installer from https://www.swi-prolog.org/download/stable and add swipl to PATH",
    ],
    [
      "an unsupported architecture",
      { arch: "ppc64", glibc: true },
      "linux-ppc64 (glibc)",
      LINUX_INSTALL,
    ],
  ])("reports no bundle for %s", (_label, overrides, platformText, command) => {
    const error = failureFor(makeDeps(overrides), { PATH: "" });
    expect(error.platform).toBe(platformText);
    expect(error.packageName).toBeUndefined();
    expect(error.message).toContain(
      `Bundled SWI-Prolog: no bundled build exists for ${platformText} (supported: linux-x64-gnu, linux-arm64-gnu, darwin-arm64, darwin-x64).`,
    );
    expect(error.message).not.toContain("npm install --save-dev kibi-swipl-");
    expect(error.message).toContain(`  Install it with: ${command}`);
  });
});

describe("resolveSwipl process cache", () => {
  test("caches per process until the seam resets it", () => {
    const root = tempDir();
    const script = writeSwipl(path.join(root, "swipl"), "10.0.2");
    const env = { KIBI_SWIPL: script, PATH: "" };
    const first = resolveSwipl(env);
    expect(first).toEqual({ bin: script, version: "10.0.2", source: "env" });
    rmSync(script);
    expect(resolveSwipl(env)).toBe(first);
    resetSwiplResolverCache();
    expect(() => resolveSwipl(env)).toThrow("is not an executable file");
  });

  test("a different selecting environment is resolved separately", () => {
    const root = tempDir();
    const one = writeSwipl(path.join(root, "one", "swipl"), "10.0.2");
    const two = writeSwipl(path.join(root, "two", "swipl"), "9.3.0");
    expect(resolveSwipl({ KIBI_SWIPL: one }).version).toBe("10.0.2");
    expect(resolveSwipl({ KIBI_SWIPL: two }).version).toBe("9.3.0");
  });
});
