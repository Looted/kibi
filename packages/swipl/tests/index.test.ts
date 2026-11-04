import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  BUNDLED_BINARY_PATH,
  MANIFEST_FILE,
  MANIFEST_SCHEMA,
  PLATFORM_PACKAGES,
  locatePlatformPackage,
  platformKey,
  sha256File,
  validateBuildManifest,
} from "../index.js";

const SHA = "0123456789abcdef".repeat(4);

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    schema: "kibi.swipl-build.v1",
    target: "linux-x64-gnu",
    swiplVersion: "10.0.2",
    binary: { path: "bin/swipl", sha256: SHA },
    home: "lib/swipl",
    ...overrides,
  };
}

const expected = { target: "linux-x64-gnu", swiplVersion: "10.0.2" };

function reason(
  m: unknown,
  exp: Parameters<typeof validateBuildManifest>[1] = expected,
) {
  const result = validateBuildManifest(m, exp);
  expect(result.ok).toBe(false);
  return (result as { reason: string }).reason;
}

describe("constants", () => {
  test("exports the manifest and binary names", () => {
    expect(MANIFEST_FILE).toBe("build-manifest.json");
    expect(MANIFEST_SCHEMA).toBe("kibi.swipl-build.v1");
    expect(BUNDLED_BINARY_PATH).toBe("bin/swipl");
  });

  test("lists every platform package in a frozen table", () => {
    expect(PLATFORM_PACKAGES).toStrictEqual({
      "linux-x64-gnu": {
        package: "kibi-swipl-linux-x64-gnu",
        os: "linux",
        cpu: "x64",
        libc: "glibc",
      },
      "linux-arm64-gnu": {
        package: "kibi-swipl-linux-arm64-gnu",
        os: "linux",
        cpu: "arm64",
        libc: "glibc",
      },
      "darwin-arm64": {
        package: "kibi-swipl-darwin-arm64",
        os: "darwin",
        cpu: "arm64",
      },
      "darwin-x64": {
        package: "kibi-swipl-darwin-x64",
        os: "darwin",
        cpu: "x64",
      },
    });
    expect(Object.keys(PLATFORM_PACKAGES)).toStrictEqual([
      "linux-x64-gnu",
      "linux-arm64-gnu",
      "darwin-arm64",
      "darwin-x64",
    ]);
    expect(Object.isFrozen(PLATFORM_PACKAGES)).toBe(true);
    for (const entry of Object.values(PLATFORM_PACKAGES)) {
      expect(Object.isFrozen(entry)).toBe(true);
    }
  });
});

describe("platformKey", () => {
  test("maps glibc Linux on x64 and arm64", () => {
    expect(platformKey({ platform: "linux", arch: "x64", glibc: true })).toBe(
      "linux-x64-gnu",
    );
    expect(platformKey({ platform: "linux", arch: "arm64", glibc: true })).toBe(
      "linux-arm64-gnu",
    );
  });

  test("rejects Linux without glibc or on other architectures", () => {
    expect(
      platformKey({ platform: "linux", arch: "x64", glibc: false }),
    ).toBeUndefined();
    expect(platformKey({ platform: "linux", arch: "x64" })).toBeUndefined();
    expect(
      platformKey({
        platform: "linux",
        arch: "x64",
        glibc: "true" as unknown as boolean,
      }),
    ).toBeUndefined();
    expect(
      platformKey({ platform: "linux", arch: "ia32", glibc: true }),
    ).toBeUndefined();
  });

  test("maps macOS on x64 and arm64 regardless of libc", () => {
    expect(platformKey({ platform: "darwin", arch: "x64" })).toBe("darwin-x64");
    expect(platformKey({ platform: "darwin", arch: "arm64" })).toBe(
      "darwin-arm64",
    );
    expect(
      platformKey({ platform: "darwin", arch: "ppc64", glibc: true }),
    ).toBeUndefined();
  });

  test("has no bundle for other platforms", () => {
    expect(
      platformKey({ platform: "win32", arch: "x64", glibc: true }),
    ).toBeUndefined();
    expect(platformKey({ platform: "freebsd", arch: "arm64" })).toBeUndefined();
  });
});

describe("locatePlatformPackage", () => {
  test("resolves an installed platform package from this package by default", () => {
    const dir = locatePlatformPackage("kibi-swipl-linux-x64-gnu");
    expect(typeof dir).toBe("string");
    const pkg = JSON.parse(
      readFileSync(path.join(dir as string, "package.json"), "utf8"),
    );
    expect(pkg.name).toBe("kibi-swipl-linux-x64-gnu");
    expect(locatePlatformPackage("kibi-swipl-not-a-package")).toBeUndefined();
  });

  test("returns the directory holding package.json", () => {
    const requests: string[] = [];
    const resolver = {
      resolve(request: string) {
        requests.push(request);
        return "/opt/pkgs/kibi-swipl-x/package.json";
      },
    };
    expect(locatePlatformPackage("kibi-swipl-x", resolver)).toBe(
      "/opt/pkgs/kibi-swipl-x",
    );
    expect(requests).toStrictEqual(["kibi-swipl-x/package.json"]);
  });

  function throwing(value: unknown) {
    return {
      resolve(): string {
        throw value;
      },
    };
  }

  test("treats a missing or unexported package as absent", () => {
    for (const code of ["MODULE_NOT_FOUND", "ERR_PACKAGE_PATH_NOT_EXPORTED"]) {
      const error = Object.assign(new Error("nope"), { code });
      expect(locatePlatformPackage("p", throwing(error))).toBeUndefined();
    }
  });

  test("rethrows any other failure unchanged", () => {
    const cases: unknown[] = [
      Object.assign(new Error("denied"), { code: "EACCES" }),
      new Error("no code"),
      null,
      "MODULE_NOT_FOUND",
      Object.assign(() => {}, { code: "MODULE_NOT_FOUND" }),
    ];
    for (const value of cases) {
      let caught: unknown = Symbol("none");
      try {
        locatePlatformPackage("p", throwing(value));
      } catch (error) {
        caught = error;
      }
      expect(caught).toBe(value);
    }
  });
});

describe("validateBuildManifest", () => {
  test("accepts a valid manifest and returns its fields", () => {
    expect(validateBuildManifest(manifest(), expected)).toStrictEqual({
      ok: true,
      swiplVersion: "10.0.2",
      binaryPath: "bin/swipl",
      binarySha256: SHA,
      home: "lib/swipl",
    });
  });

  test("skips the version comparison when none is expected", () => {
    expect(
      validateBuildManifest(manifest({ swiplVersion: "11.22.333" }), {
        target: "linux-x64-gnu",
      }),
    ).toStrictEqual({
      ok: true,
      swiplVersion: "11.22.333",
      binaryPath: "bin/swipl",
      binarySha256: SHA,
      home: "lib/swipl",
    });
  });

  test("rejects non-objects", () => {
    for (const value of [null, undefined, "x", 3, [], [manifest()]]) {
      expect(validateBuildManifest(value, expected)).toStrictEqual({
        ok: false,
        reason: "manifest is not a JSON object",
      });
    }
  });

  test("rejects a wrong schema", () => {
    expect(reason(manifest({ schema: "kibi.swipl-build.v2" }))).toBe(
      "manifest schema must be kibi.swipl-build.v1",
    );
  });

  test("rejects a target mismatch", () => {
    expect(reason(manifest({ target: "darwin-x64" }))).toBe(
      'manifest target "darwin-x64" does not match linux-x64-gnu',
    );
    expect(reason(manifest({ target: undefined }))).toBe(
      "manifest target undefined does not match linux-x64-gnu",
    );
  });

  test("rejects a missing or malformed swiplVersion", () => {
    for (const swiplVersion of [
      undefined,
      10,
      "10.0",
      "v10.0.2",
      "10.0.2-rc",
      "10.0.2\n",
      "1a.0.2",
      "",
      // An array stringifies to a valid-looking version but is no string.
      ["10.0.2"],
    ]) {
      expect(reason(manifest({ swiplVersion }))).toBe(
        "manifest swiplVersion is missing or invalid",
      );
    }
  });

  test("rejects a version that differs from the package's", () => {
    expect(reason(manifest({ swiplVersion: "10.0.3" }))).toBe(
      "manifest swiplVersion 10.0.3 does not match package kibi.swiplVersion 10.0.2",
    );
  });

  test("rejects a missing binary entry", () => {
    for (const binary of [undefined, null, "bin/swipl"]) {
      expect(reason(manifest({ binary }))).toBe(
        "manifest binary entry is missing",
      );
    }
  });

  test("rejects a wrong binary path", () => {
    for (const p of ["bin/swipl.exe", undefined]) {
      expect(reason(manifest({ binary: { path: p, sha256: SHA } }))).toBe(
        "manifest binary.path must be bin/swipl",
      );
    }
  });

  test("rejects a malformed sha256", () => {
    for (const sha256 of [
      undefined,
      123,
      SHA.toUpperCase(),
      SHA.slice(1),
      `${SHA}0`,
      `g${SHA.slice(1)}`,
      `${SHA.slice(1)}g`,
      `x${SHA}`,
      `${SHA}x`,
      // An array stringifies to valid hex but is no string.
      [SHA],
    ]) {
      expect(reason(manifest({ binary: { path: "bin/swipl", sha256 } }))).toBe(
        "manifest binary.sha256 must be 64 lowercase hex digits",
      );
    }
  });

  test("rejects an unsafe home path", () => {
    for (const home of [
      undefined,
      7,
      "",
      ".",
      "..",
      "../lib",
      "lib/../..",
      "lib/../swipl",
      "./lib",
      "lib//swipl",
      "/lib/swipl",
      "lib\\swipl",
      "lib\0swipl",
    ]) {
      expect(reason(manifest({ home }))).toBe(
        "manifest home must be a normalized relative path",
      );
    }
  });

  test("accepts other normalized relative homes", () => {
    for (const home of ["lib", "a/b/c", "lib/..swipl", "lib/swipl.."]) {
      expect(validateBuildManifest(manifest({ home }), expected).ok).toBe(true);
    }
  });
});

describe("sha256File", () => {
  test("hashes the file's bytes as lowercase hex", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "kibi-swipl-sha-"));
    try {
      const file = path.join(dir, "blob");
      const bytes = Buffer.from([0, 1, 2, 255, 10]);
      writeFileSync(file, bytes);
      expect(sha256File(file)).toBe(
        createHash("sha256").update(bytes).digest("hex"),
      );
      writeFileSync(file, "abc");
      expect(sha256File(file)).toBe(
        "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
