import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { locatePlatformPackage } from "kibi-swipl";
import {
  type BundleStatus,
  MINIMUM_SWIPL_MAJOR,
  REQUIRED_SWIPL_LIBRARIES,
  type ResolvedSwipl,
  type SwiplGoalRunner,
  SwiplResolutionError,
  type SwiplResolverDeps,
  defaultDeps,
  detectGlibc,
  executableDigest,
  inspectSwiplBundle,
  parseSwiplVersion,
  probeRequiredLibraries,
  resetSwiplResolverCache,
  resolveSwipl,
  resolveSwiplWith,
  runSwiplGoal,
  runSwiplVersion,
  swiplChildEnv,
  swiplIdentity,
} from "../../src/prolog/swipl-resolver.js";

const temps: string[] = [];

function temp(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "kibi-swipl-mutation-"));
  temps.push(dir);
  return dir;
}

afterEach(() => {
  resetSwiplResolverCache();
  for (const dir of temps.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

const banner = (version: string) =>
  `SWI-Prolog version ${version} for x86_64-linux\n`;

function script(file: string, body: string, mode = 0o755): string {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `#!/bin/sh\n${body}\n`);
  chmodSync(file, mode);
  return file;
}

/** A `swipl` script that prints the banner of `version`. */
function swipl(dir: string, version = "10.0.2"): string {
  return script(path.join(dir, "swipl"), `printf '%s' '${banner(version)}'`);
}

const LINUX_INSTALL =
  "sudo apt-add-repository ppa:swi-prolog/stable && sudo apt-get update && sudo apt-get install swi-prolog";
const SET_ENV =
  "Or set KIBI_SWIPL to the absolute path of a SWI-Prolog 9.0+ executable.";
const ENV_ADVICE =
  'Set KIBI_SWIPL to the absolute path of a SWI-Prolog 9.0+ executable, to "system" to use swipl from PATH, or unset it to use the bundled runtime.';

function deps(overrides: Partial<SwiplResolverDeps> = {}): SwiplResolverDeps {
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

/** Real version output of the scripts. */
const realVersions = (overrides: Partial<SwiplResolverDeps> = {}) =>
  deps({ runVersion: (bin) => runSwiplVersion(bin), ...overrides });

function caught(run: () => unknown): SwiplResolutionError {
  try {
    run();
  } catch (error) {
    if (error instanceof SwiplResolutionError) return error;
    throw error;
  }
  throw new Error("expected a resolution error");
}

const BINARY = `#!/bin/sh\nprintf '%s' '${banner("10.0.2")}'\n`;
const sha = (text: string) => createHash("sha256").update(text).digest("hex");

type BundleShape = {
  binary?: string | null;
  mode?: number;
  manifest?: Record<string, unknown> | string | null;
  packageJson?: unknown;
  home?: "dir" | "file" | null;
};

/** A platform package directory shaped like the release pipeline output. */
function bundle(shape: BundleShape = {}): string {
  const dir = path.join(temp(), "kibi-swipl-linux-x64-gnu");
  mkdirSync(dir, { recursive: true });
  const packageJson =
    "packageJson" in shape
      ? shape.packageJson
      : { kibi: { swiplVersion: "10.0.2" } };
  if (packageJson !== null)
    writeFileSync(
      path.join(dir, "package.json"),
      typeof packageJson === "string"
        ? packageJson
        : JSON.stringify(packageJson),
    );
  const binary = shape.binary === undefined ? BINARY : shape.binary;
  if (binary !== null) {
    mkdirSync(path.join(dir, "bin"));
    writeFileSync(path.join(dir, "bin", "swipl"), binary);
    chmodSync(path.join(dir, "bin", "swipl"), shape.mode ?? 0o755);
  }
  const home = shape.home === undefined ? "dir" : shape.home;
  if (home === "dir")
    mkdirSync(path.join(dir, "lib", "swipl"), { recursive: true });
  if (home === "file") {
    mkdirSync(path.join(dir, "lib"));
    writeFileSync(path.join(dir, "lib", "swipl"), "");
  }
  const manifest =
    shape.manifest === undefined
      ? {
          schema: "kibi.swipl-build.v1",
          target: "linux-x64-gnu",
          swiplVersion: "10.0.2",
          binary: { path: "bin/swipl", sha256: sha(BINARY) },
          home: "lib/swipl",
        }
      : shape.manifest;
  if (manifest !== null)
    writeFileSync(
      path.join(dir, "build-manifest.json"),
      typeof manifest === "string" ? manifest : JSON.stringify(manifest),
    );
  return dir;
}

const located = (dir: string) => deps({ locatePackage: () => dir });

describe("SwiplResolutionError", () => {
  test("carries its code, platform and package", () => {
    const error = new SwiplResolutionError("swipl_not_found", "m", "p", "k");
    expect(error).toBeInstanceOf(Error);
    expect([
      error.name,
      error.message,
      error.code,
      error.platform,
      error.packageName,
    ]).toStrictEqual([
      "SwiplResolutionError",
      "m",
      "swipl_not_found",
      "p",
      "k",
    ]);
    expect(MINIMUM_SWIPL_MAJOR).toBe(9);
  });
});

describe("detectGlibc", () => {
  const never = {
    getReport: () => {
      throw new Error("not consulted");
    },
  };

  test("is undefined off Linux", () => {
    expect(detectGlibc("darwin", never, () => true)).toBeUndefined();
  });

  test("reads the runtime glibc version from the process report", () => {
    const report = (header: unknown) => ({ getReport: () => ({ header }) });
    const exists = () => true;
    expect(
      detectGlibc("linux", report({ glibcVersionRuntime: "2.39" }), exists),
    ).toBe(true);
    expect(detectGlibc("linux", report({}), exists)).toBe(false);
    expect(
      detectGlibc("linux", report({ glibcVersionRuntime: 2 }), exists),
    ).toBe(false);
  });

  test("probes for a musl loader without a usable report", () => {
    const checked: string[] = [];
    const probe = (present: string | null) => (loader: string) => {
      checked.push(loader);
      return loader === present;
    };
    expect(detectGlibc("linux", never, probe(null))).toBe(true);
    expect(checked).toStrictEqual([
      "/lib/ld-musl-x86_64.so.1",
      "/lib/ld-musl-aarch64.so.1",
    ]);
    expect(detectGlibc("linux", never, probe("/lib/ld-musl-x86_64.so.1"))).toBe(
      false,
    );
    expect(
      detectGlibc("linux", never, probe("/lib/ld-musl-aarch64.so.1")),
    ).toBe(false);
    expect(detectGlibc("linux", { getReport: () => ({}) }, probe(null))).toBe(
      true,
    );
    expect(
      detectGlibc("linux", { getReport: () => undefined }, probe(null)),
    ).toBe(true);
  });

  test("defaults to this process", () => {
    expect(detectGlibc()).toBe(
      detectGlibc(process.platform, process.report, existsSync),
    );
  });
});

describe("host facts", () => {
  test("runSwiplVersion asks for --version with a bounded, quiet run", () => {
    const calls: unknown[] = [];
    expect(
      runSwiplVersion("/x/swipl", (...args) => {
        calls.push(args);
        return "out";
      }),
    ).toBe("out");
    expect(calls).toStrictEqual([
      [
        "/x/swipl",
        ["--version"],
        {
          encoding: "utf8",
          timeout: 10_000,
          stdio: ["ignore", "pipe", "pipe"],
        },
      ],
    ]);
    const echo = script(path.join(temp(), "echo"), 'echo "args:$*"');
    expect(runSwiplVersion(echo)).toBe("args:--version\n");
  });

  test("defaultDeps describes this process", () => {
    expect(defaultDeps()).toStrictEqual({
      platform: process.platform,
      arch: process.arch,
      glibc: detectGlibc(),
      locatePackage: locatePlatformPackage,
      runVersion: runSwiplVersion,
    });
  });
});

describe("parseSwiplVersion", () => {
  test("reads major, minor and an optional patch", () => {
    expect(parseSwiplVersion("SWI-Prolog version 10.0.2 for x")).toStrictEqual({
      version: "10.0.2",
      major: 10,
    });
    expect(parseSwiplVersion("VERSION  9.12.345")).toStrictEqual({
      version: "9.12.345",
      major: 9,
    });
    expect(parseSwiplVersion("version 9.1")).toStrictEqual({
      version: "9.1",
      major: 9,
    });
    expect(parseSwiplVersion("version 9")).toBeUndefined();
    expect(parseSwiplVersion("nothing")).toBeUndefined();
  });
});

describe("KIBI_SWIPL", () => {
  test("is trimmed before it is used", () => {
    const bin = swipl(temp());
    expect(
      resolveSwiplWith({ KIBI_SWIPL: `  ${bin}\n` }, realVersions()),
    ).toStrictEqual({ bin, version: "10.0.2", source: "env" });
    const onPath = swipl(temp(), "9.3.1");
    expect(
      resolveSwiplWith(
        { KIBI_SWIPL: " system ", PATH: path.dirname(onPath) },
        realVersions(),
      ),
    ).toStrictEqual({ bin: onPath, version: "9.3.1", source: "path" });
  });

  test("names the host and its package when invalid", () => {
    const error = caught(() =>
      resolveSwiplWith({ KIBI_SWIPL: "swipl" }, deps()),
    );
    expect([
      error.code,
      error.message,
      error.platform,
      error.packageName,
    ]).toStrictEqual([
      "swipl_env_invalid",
      `KIBI_SWIPL=swipl is not an absolute path. ${ENV_ADVICE}`,
      "linux-x64 (glibc)",
      "kibi-swipl-linux-x64-gnu",
    ]);
    const hosts: [Partial<SwiplResolverDeps>, string, string | undefined][] = [
      [{ glibc: false }, "linux-x64 (musl)", undefined],
      [{ glibc: undefined }, "linux-x64", undefined],
      [
        { platform: "darwin", arch: "arm64", glibc: true },
        "darwin-arm64",
        "kibi-swipl-darwin-arm64",
      ],
    ];
    for (const [host, platform, packageName] of hosts) {
      const hostError = caught(() =>
        resolveSwiplWith({ KIBI_SWIPL: "swipl" }, deps(host)),
      );
      expect([hostError.platform, hostError.packageName]).toStrictEqual([
        platform,
        packageName,
      ]);
    }
  });

  test("rejects what is not an executable file", () => {
    const dir = temp();
    const plain = script(path.join(dir, "plain"), "exit 0", 0o644);
    for (const target of [dir, plain, path.join(dir, "missing")]) {
      expect(
        caught(() => resolveSwiplWith({ KIBI_SWIPL: target }, deps())).message,
      ).toBe(`KIBI_SWIPL=${target} is not an executable file. ${ENV_ADVICE}`);
    }
  });

  test("rejects an executable that cannot report a usable version", () => {
    const bin = swipl(temp());
    const message = (runVersion: SwiplResolverDeps["runVersion"]) =>
      caught(() => resolveSwiplWith({ KIBI_SWIPL: bin }, deps({ runVersion })))
        .message;
    expect(
      message(() => {
        throw new Error("boom");
      }),
    ).toBe(
      `KIBI_SWIPL=${bin} could not report its version (boom). ${ENV_ADVICE}`,
    );
    expect(
      message(() => {
        throw "raw failure";
      }),
    ).toBe(
      `KIBI_SWIPL=${bin} could not report its version (raw failure). ${ENV_ADVICE}`,
    );
    const noise = `  ${"x".repeat(100)}  `;
    expect(message(() => noise)).toBe(
      `KIBI_SWIPL=${bin} could not report its version (unrecognized --version output "${"x".repeat(80)}"). ${ENV_ADVICE}`,
    );
    expect(message(() => banner("8.5.20"))).toBe(
      `KIBI_SWIPL=${bin} is SWI-Prolog 8.5.20, but 9.0 or newer is required. ${ENV_ADVICE}`,
    );
  });
});

describe("swipl on PATH", () => {
  const notFound = (env: NodeJS.ProcessEnv, host = realVersions()) =>
    caught(() => resolveSwiplWith({ KIBI_SWIPL: "system", ...env }, host));

  test("is absent without PATH, and skips empty and relative entries", () => {
    expect(notFound({}).message).toContain(
      "System SWI-Prolog: swipl was not found on PATH.",
    );
    const bin = swipl(temp());
    const relative = path.relative(process.cwd(), path.dirname(bin));
    expect(
      notFound({ PATH: ["", relative].join(path.delimiter) }).message,
    ).toContain("System SWI-Prolog: swipl was not found on PATH.");
  });

  test("uses the first executable swipl", () => {
    const first = swipl(temp(), "9.0.0");
    const second = swipl(temp(), "10.0.0");
    const plain = script(path.join(temp(), "swipl"), "exit 0", 0o644);
    expect(
      resolveSwiplWith(
        {
          KIBI_SWIPL: "system",
          PATH: [
            path.dirname(plain),
            path.dirname(first),
            path.dirname(second),
          ].join(path.delimiter),
        },
        realVersions(),
      ),
    ).toStrictEqual({ bin: first, version: "9.0.0", source: "path" });
  });

  test("on Windows, finds swipl.exe through a Path entry of any case", () => {
    const dir = temp();
    const exe = script(path.join(dir, "swipl.exe"), "exit 0");
    const versions: string[] = [];
    const windows = deps({
      platform: "win32",
      glibc: undefined,
      runVersion: (bin) => {
        versions.push(bin);
        return "SWI-Prolog version 9.2.9 for x64-win64\n";
      },
    });
    for (const name of ["Path", "PATH", "path"]) {
      expect(
        resolveSwiplWith({ KIBI_SWIPL: "system", [name]: dir }, windows),
      ).toStrictEqual({ bin: exe, version: "9.2.9", source: "path" });
    }
    expect(versions).toStrictEqual([exe, exe, exe]);
    // A bare `swipl` (a shell script) cannot run there and is not taken.
    const bare = temp();
    swipl(bare);
    expect(
      caught(() =>
        resolveSwiplWith({ KIBI_SWIPL: "system", Path: bare }, windows),
      ).message,
    ).toContain("System SWI-Prolog: swipl was not found on PATH.");
    expect(
      caught(() => resolveSwiplWith({ KIBI_SWIPL: "system" }, windows)).message,
    ).toContain("System SWI-Prolog: swipl was not found on PATH.");
  });

  test("off Windows, reads only PATH and never swipl.exe", () => {
    const dir = temp();
    script(path.join(dir, "swipl.exe"), `printf '%s' '${banner("10.0.0")}'`);
    expect(notFound({ Path: dir }).message).toContain(
      "System SWI-Prolog: swipl was not found on PATH.",
    );
    expect(notFound({ PATH: dir }).message).toContain(
      "System SWI-Prolog: swipl was not found on PATH.",
    );
    // Only Windows matches the variable name without regard to case.
    expect(notFound({ Path: path.dirname(swipl(temp())) }).message).toContain(
      "System SWI-Prolog: swipl was not found on PATH.",
    );
  });

  test("reports the first swipl when it is too old or unusable", () => {
    const old = swipl(temp(), "8.4.3");
    const newer = swipl(temp(), "10.0.0");
    const PATH = [path.dirname(old), path.dirname(newer)].join(path.delimiter);
    expect(notFound({ PATH }).message).toContain(
      `System SWI-Prolog: swipl on PATH (${old}) is version 8.4.3, older than 9.0.`,
    );
    const broken = deps({
      runVersion: () => {
        throw new Error("cannot execute");
      },
    });
    expect(notFound({ PATH }, broken).message).toContain(
      `System SWI-Prolog: swipl on PATH (${old}) could not report its version (cannot execute).`,
    );
  });
});

describe("not found guidance", () => {
  test("after KIBI_SWIPL=system on a covered host", () => {
    const error = caught(() =>
      resolveSwiplWith({ KIBI_SWIPL: "system" }, deps()),
    );
    expect([
      error.code,
      error.message,
      error.platform,
      error.packageName,
    ]).toStrictEqual([
      "swipl_not_found",
      [
        "Kibi could not find a usable SWI-Prolog (9.0 or newer is required).",
        "Detected platform: linux-x64 (glibc).",
        "Bundled SWI-Prolog: skipped because KIBI_SWIPL=system.",
        "  To use it, unset KIBI_SWIPL and install kibi-swipl-linux-x64-gnu.",
        "System SWI-Prolog: swipl was not found on PATH.",
        `  Install it with: ${LINUX_INSTALL}`,
        SET_ENV,
      ].join("\n"),
      "linux-x64 (glibc)",
      "kibi-swipl-linux-x64-gnu",
    ]);
  });

  test("after KIBI_SWIPL=system on an uncovered host", () => {
    const error = caught(() =>
      resolveSwiplWith(
        { KIBI_SWIPL: "system" },
        deps({ platform: "win32", glibc: undefined }),
      ),
    );
    expect([error.message, error.packageName]).toStrictEqual([
      [
        "Kibi could not find a usable SWI-Prolog (9.0 or newer is required).",
        "Detected platform: win32-x64.",
        "Bundled SWI-Prolog: skipped because KIBI_SWIPL=system.",
        "System SWI-Prolog: swipl was not found on PATH.",
        "  Install it with: download the installer from https://www.swi-prolog.org/download/stable and add swipl to PATH",
        SET_ENV,
      ].join("\n"),
      undefined,
    ]);
  });

  test("on a host without a bundled build", () => {
    const error = caught(() => resolveSwiplWith({}, deps({ glibc: false })));
    expect([error.message, error.packageName]).toStrictEqual([
      [
        "Kibi could not find a usable SWI-Prolog (9.0 or newer is required).",
        "Detected platform: linux-x64 (musl).",
        "Bundled SWI-Prolog: no bundled build exists for linux-x64 (musl) (supported: linux-x64-gnu, linux-arm64-gnu, darwin-arm64, darwin-x64).",
        "System SWI-Prolog: swipl was not found on PATH.",
        `  Install it with: ${LINUX_INSTALL}`,
        SET_ENV,
      ].join("\n"),
      undefined,
    ]);
  });

  test("when the covering package is missing or empty", () => {
    const missing = caught(() =>
      resolveSwiplWith({}, deps({ platform: "darwin", arch: "x64" })),
    );
    expect([missing.message, missing.packageName]).toStrictEqual([
      [
        "Kibi could not find a usable SWI-Prolog (9.0 or newer is required).",
        "Detected platform: darwin-x64.",
        "Bundled SWI-Prolog: package kibi-swipl-darwin-x64 would cover this platform but is not installed. It is skipped by installs that omit optional dependencies (npm --omit=optional, --no-optional) and by pnpm supportedArchitectures settings that exclude this platform.",
        "  Add it with: npm install --save-dev kibi-swipl-darwin-x64",
        "System SWI-Prolog: swipl was not found on PATH.",
        "  Install it with: brew install swi-prolog",
        SET_ENV,
      ].join("\n"),
      "kibi-swipl-darwin-x64",
    ]);
    const empty = bundle({ manifest: null, binary: null });
    const emptyError = caught(() => resolveSwiplWith({}, located(empty)));
    expect(emptyError.message.split("\n").slice(2, 4)).toStrictEqual([
      "Bundled SWI-Prolog: package kibi-swipl-linux-x64-gnu is installed but carries no runtime (a source checkout that was not populated from a release build).",
      "System SWI-Prolog: swipl was not found on PATH.",
    ]);
    expect(emptyError.packageName).toBe("kibi-swipl-linux-x64-gnu");
  });
});

describe("bundled runtime", () => {
  const status = (dir: string) => inspectSwiplBundle(located(dir));
  const corrupt = (reason: string): BundleStatus => ({
    state: "corrupt",
    packageName: "kibi-swipl-linux-x64-gnu",
    reason,
  });

  test("reports the state of absent packages", () => {
    expect(inspectSwiplBundle(deps({ glibc: false }))).toStrictEqual({
      state: "unsupported",
    });
    expect(inspectSwiplBundle(deps())).toStrictEqual({
      state: "missing",
      packageName: "kibi-swipl-linux-x64-gnu",
    });
    expect(status(bundle({ manifest: null, binary: null }))).toStrictEqual({
      state: "empty",
      packageName: "kibi-swipl-linux-x64-gnu",
    });
  });

  test("resolves a verified bundle", () => {
    const dir = bundle();
    expect(status(dir)).toStrictEqual({
      state: "installed",
      packageName: "kibi-swipl-linux-x64-gnu",
    });
    expect(resolveSwiplWith({}, located(dir))).toStrictEqual({
      bin: path.join(dir, "bin", "swipl"),
      home: path.join(dir, "lib", "swipl"),
      version: "10.0.2",
      source: "bundled",
    });
    for (const packageJson of [{}, { kibi: { swiplVersion: 10 } }]) {
      expect(status(bundle({ packageJson })).state).toBe("installed");
    }
  });

  test("names what is damaged", () => {
    expect(status(bundle({ manifest: null }))).toStrictEqual(
      corrupt("build-manifest.json is missing next to bin/swipl"),
    );
    const notJson = status(bundle({ manifest: "{oops" }));
    expect(notJson).toMatchObject({ state: "corrupt" });
    expect((notJson as { reason: string }).reason).toStartWith(
      "build-manifest.json is not valid JSON (",
    );
    expect((notJson as { reason: string }).reason).not.toBe(
      "build-manifest.json is not valid JSON ()",
    );
    const noPackage = status(bundle({ packageJson: null }));
    expect((noPackage as { reason: string }).reason).toStartWith(
      "package.json is unreadable (ENOENT",
    );
    expect(
      status(bundle({ packageJson: { kibi: { swiplVersion: "9.0.0" } } })),
    ).toStrictEqual(
      corrupt(
        "manifest swiplVersion 10.0.2 does not match package kibi.swiplVersion 9.0.0",
      ),
    );
    expect(status(bundle({ binary: null }))).toStrictEqual(
      corrupt("bin/swipl is missing or not executable"),
    );
    expect(status(bundle({ mode: 0o644 }))).toStrictEqual(
      corrupt("bin/swipl is missing or not executable"),
    );
    expect(
      status(bundle({ binary: "#!/bin/sh\necho tampered\n" })),
    ).toStrictEqual(
      corrupt(
        `bin/swipl SHA-256 ${sha("#!/bin/sh\necho tampered\n")} does not match the manifest (${sha(BINARY)})`,
      ),
    );
    expect(status(bundle({ home: null }))).toStrictEqual(
      corrupt("lib/swipl is missing"),
    );
    expect(status(bundle({ home: "file" }))).toStrictEqual(
      corrupt("lib/swipl is missing"),
    );
  });

  test("refuses to fall back from a damaged bundle", () => {
    const error = caught(() =>
      resolveSwiplWith({}, located(bundle({ home: null }))),
    );
    expect([
      error.code,
      error.message,
      error.platform,
      error.packageName,
    ]).toStrictEqual([
      "swipl_bundle_corrupt",
      [
        "The bundled SWI-Prolog package kibi-swipl-linux-x64-gnu is damaged: lib/swipl is missing.",
        "Detected platform: linux-x64 (glibc).",
        "Reinstall it (for example: npm install --save-dev kibi-swipl-linux-x64-gnu), or set KIBI_SWIPL=system to use swipl from PATH instead.",
      ].join("\n"),
      "linux-x64 (glibc)",
      "kibi-swipl-linux-x64-gnu",
    ]);
  });
});

describe("resolveSwipl cache", () => {
  test("is keyed by KIBI_SWIPL and PATH", () => {
    const a = swipl(temp());
    const b = swipl(temp(), "9.4.0");
    const first = resolveSwipl({ KIBI_SWIPL: a, PATH: "/p1" });
    expect(first).toStrictEqual({ bin: a, version: "10.0.2", source: "env" });
    expect(resolveSwipl({ KIBI_SWIPL: a, PATH: "/p1", OTHER: "x" })).toBe(
      first,
    );
    const otherPath = resolveSwipl({ KIBI_SWIPL: a, PATH: "/p2" });
    expect(otherPath).not.toBe(first);
    expect(otherPath).toStrictEqual(first);
    expect(resolveSwipl({ KIBI_SWIPL: b, PATH: "/p1" }).bin).toBe(b);
    resetSwiplResolverCache();
    expect(resolveSwipl({ KIBI_SWIPL: a, PATH: "/p1" })).not.toBe(first);
  });

  test("treats an unset KIBI_SWIPL or PATH like an empty one", () => {
    const a = swipl(temp());
    expect(resolveSwipl({ KIBI_SWIPL: a })).toBe(
      resolveSwipl({ KIBI_SWIPL: a, PATH: "" }),
    );
    // Whatever this host resolves to, a swipl on PATH makes resolution succeed.
    const PATH = path.dirname(a);
    expect(resolveSwipl({ PATH })).toBe(resolveSwipl({ KIBI_SWIPL: "", PATH }));
  });
});

describe("resolved runtime helpers", () => {
  test("identity and child environment", () => {
    const resolved: ResolvedSwipl = {
      bin: "/b/swipl",
      version: "10.0.2",
      source: "path",
    };
    expect(swiplIdentity(resolved)).toBe("/b/swipl@10.0.2");
    expect(swiplChildEnv(resolved)).toStrictEqual({});
    expect(swiplChildEnv({ home: "/h" })).toStrictEqual({ SWI_HOME_DIR: "/h" });
  });
});

describe("runSwiplGoal", () => {
  test("spawns a bounded, quiet process with the given environment", () => {
    const calls: unknown[] = [];
    const env = { FOO: "1" };
    const args = ["-q"] as const;
    expect(
      runSwiplGoal("/b/swipl", args, env, (...call) => {
        calls.push(call);
        return { status: 0, stdout: "out", stderr: "err" };
      }),
    ).toStrictEqual({ status: 0, stdout: "out", stderr: "err" });
    expect(calls).toStrictEqual([
      [
        "/b/swipl",
        ["-q"],
        {
          encoding: "utf8",
          timeout: 60_000,
          stdio: ["ignore", "pipe", "pipe"],
          env,
        },
      ],
    ]);
    expect((calls[0] as unknown[])[1]).not.toBe(args);
  });

  test("normalizes a process that could not start", () => {
    const error = new Error("ENOENT");
    expect(
      runSwiplGoal("/b/swipl", [], {}, () => ({
        status: null,
        stdout: null,
        stderr: null,
        error,
      })),
    ).toStrictEqual({ status: null, stdout: "", stderr: "", error });
  });

  test("runs a real process", () => {
    const echo = script(
      path.join(temp(), "echo"),
      'echo "args:$* foo:$FOO"; echo err >&2; exit 3',
    );
    expect(runSwiplGoal(echo, ["a", "b"], { FOO: "bar" })).toStrictEqual({
      status: 3,
      stdout: "args:a b foo:bar\n",
      stderr: "err\n",
    });
  });
});

describe("probeRequiredLibraries", () => {
  const resolved: ResolvedSwipl = {
    bin: "/b/swipl",
    home: "/h",
    version: "10.0.2",
    source: "bundled",
  };
  const answer = (result: ReturnType<SwiplGoalRunner>) => () => result;

  test("loads every required library in one process", () => {
    const calls: unknown[] = [];
    expect(
      probeRequiredLibraries(
        resolved,
        (...call) => {
          calls.push(call);
          return { status: 0, stdout: "", stderr: "" };
        },
        { PATH: "/p", SWI_HOME_DIR: "/old" },
      ),
    ).toStrictEqual({ kind: "ok" });
    expect(calls).toStrictEqual([
      [
        "/b/swipl",
        [
          "-q",
          "-g",
          `forall(member(L, [${REQUIRED_SWIPL_LIBRARIES.join(", ")}]), (catch(use_module(library(L)), _, fail) -> true ; format("__KIBI_MISSING_LIBRARY__:~w~n", [L])))`,
          "-t",
          "halt",
        ],
        { PATH: "/p", SWI_HOME_DIR: "/h" },
      ],
    ]);
    expect(REQUIRED_SWIPL_LIBRARIES[0]).toBe("semweb/rdf_db");
  });

  test("defaults to this process environment", () => {
    let seen: NodeJS.ProcessEnv = {};
    probeRequiredLibraries(
      { bin: "/b/swipl", version: "10.0.2", source: "path" },
      (_bin, _args, env) => {
        seen = env;
        return { status: 0, stdout: "", stderr: "" };
      },
    );
    expect(seen).toStrictEqual({ ...process.env });
  });

  test("lists the libraries that failed to load", () => {
    expect(
      probeRequiredLibraries(
        resolved,
        answer({
          status: 0,
          stdout:
            "noise\n__KIBI_MISSING_LIBRARY__:pcre \nx __KIBI_MISSING_LIBRARY__:sha\n__KIBI_MISSING_LIBRARY__:chr",
          stderr: "",
        }),
      ),
    ).toStrictEqual({ kind: "missing", libraries: ["pcre", "chr"] });
  });

  test("reports a probe that could not run", () => {
    expect(
      probeRequiredLibraries(
        resolved,
        answer({
          status: 0,
          stdout: "",
          stderr: "",
          error: new Error("spawn failed"),
        }),
      ),
    ).toStrictEqual({ kind: "failed", detail: "spawn failed" });
    expect(
      probeRequiredLibraries(
        resolved,
        answer({ status: 2, stdout: "", stderr: "  first\nsecond\n" }),
      ),
    ).toStrictEqual({ kind: "failed", detail: "exit status 2: first" });
    expect(
      probeRequiredLibraries(
        resolved,
        answer({ status: null, stdout: "", stderr: " \n" }),
      ),
    ).toStrictEqual({ kind: "failed", detail: "exit status none" });
  });
});

describe("executable digests", () => {
  test("hash an executable file and nothing else", () => {
    const dir = temp();
    const binary = path.join(dir, "swipl");
    writeFileSync(binary, "#!/bin/sh\n");
    chmodSync(binary, 0o755);
    expect(executableDigest(binary)).toBe(
      createHash("sha256").update("#!/bin/sh\n").digest("hex"),
    );
    expect(executableDigest(path.join(dir, "missing"))).toBeNull();
    expect(executableDigest(dir)).toBeNull();
  });

  test("an executable that cannot be read has no digest", () => {
    const dir = temp();
    const binary = path.join(dir, "swipl");
    writeFileSync(binary, "x");
    chmodSync(binary, 0o755);
    expect(
      executableDigest(binary, () => {
        throw new Error("EACCES");
      }),
    ).toBeNull();
  });
});
