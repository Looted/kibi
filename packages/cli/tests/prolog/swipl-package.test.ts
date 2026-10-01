// executable_for TEST-prolog-bundled-runtime
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  BUNDLED_BINARY_PATH,
  PLATFORM_PACKAGES,
  locatePlatformPackage,
  platformKey,
  sha256File,
  validateBuildManifest,
} from "kibi-swipl";

const tempRoots: string[] = [];

afterEach(() => {
  for (const dir of tempRoots.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function validManifest(): Record<string, unknown> {
  return {
    schema: "kibi.swipl-build.v1",
    target: "darwin-arm64",
    swiplVersion: "10.0.2",
    binary: { path: BUNDLED_BINARY_PATH, sha256: "a".repeat(64) },
    home: "lib/swipl",
  };
}

describe("kibi-swipl platform table", () => {
  test("maps supported hosts to their platform packages", () => {
    expect(platformKey({ platform: "linux", arch: "x64", glibc: true })).toBe(
      "linux-x64-gnu",
    );
    expect(platformKey({ platform: "linux", arch: "arm64", glibc: true })).toBe(
      "linux-arm64-gnu",
    );
    expect(platformKey({ platform: "darwin", arch: "arm64" })).toBe(
      "darwin-arm64",
    );
    expect(platformKey({ platform: "darwin", arch: "x64" })).toBe("darwin-x64");
    expect(
      Object.values(PLATFORM_PACKAGES).map((entry) => entry.package),
    ).toEqual([
      "kibi-swipl-linux-x64-gnu",
      "kibi-swipl-linux-arm64-gnu",
      "kibi-swipl-darwin-arm64",
      "kibi-swipl-darwin-x64",
    ]);
  });

  test("has no bundle for musl, unknown libc, Windows, or other architectures", () => {
    expect(
      platformKey({ platform: "linux", arch: "x64", glibc: false }),
    ).toBeUndefined();
    expect(platformKey({ platform: "linux", arch: "x64" })).toBeUndefined();
    expect(
      platformKey({ platform: "linux", arch: "ia32", glibc: true }),
    ).toBeUndefined();
    expect(platformKey({ platform: "win32", arch: "x64" })).toBeUndefined();
    expect(platformKey({ platform: "darwin", arch: "ppc" })).toBeUndefined();
  });
});

describe("validateBuildManifest", () => {
  test("accepts the pipeline manifest shape", () => {
    expect(
      validateBuildManifest(validManifest(), {
        target: "darwin-arm64",
        swiplVersion: "10.0.2",
      }),
    ).toEqual({
      ok: true,
      swiplVersion: "10.0.2",
      binaryPath: "bin/swipl",
      binarySha256: "a".repeat(64),
      home: "lib/swipl",
    });
  });

  test.each<[string, (manifest: Record<string, unknown>) => void, string]>([
    [
      "wrong schema",
      (m) => {
        m.schema = "other";
      },
      "schema must be kibi.swipl-build.v1",
    ],
    [
      "wrong target",
      (m) => {
        m.target = "linux-x64-gnu";
      },
      "does not match darwin-arm64",
    ],
    [
      "non-semver version",
      (m) => {
        m.swiplVersion = "10.0";
      },
      "swiplVersion is missing or invalid",
    ],
    [
      "version mismatch",
      (m) => {
        m.swiplVersion = "10.0.3";
      },
      "does not match package kibi.swiplVersion 10.0.2",
    ],
    [
      "missing binary entry",
      (m) => {
        Reflect.deleteProperty(m, "binary");
      },
      "binary entry is missing",
    ],
    [
      "binary elsewhere",
      (m) => {
        m.binary = { path: "bin/other", sha256: "a".repeat(64) };
      },
      "binary.path must be bin/swipl",
    ],
    [
      "uppercase checksum",
      (m) => {
        m.binary = { path: "bin/swipl", sha256: "A".repeat(64) };
      },
      "64 lowercase hex digits",
    ],
    [
      "absolute home",
      (m) => {
        m.home = "/etc";
      },
      "normalized relative path",
    ],
    [
      "traversing home",
      (m) => {
        m.home = "lib/../../x";
      },
      "normalized relative path",
    ],
    [
      "windows home",
      (m) => {
        m.home = "lib\\swipl";
      },
      "normalized relative path",
    ],
  ])("rejects %s", (_label, mutate, reason) => {
    const manifest = validManifest();
    mutate(manifest);
    const result = validateBuildManifest(manifest, {
      target: "darwin-arm64",
      swiplVersion: "10.0.2",
    });
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.reason).toContain(reason);
  });

  test("rejects non-object manifests", () => {
    for (const value of [null, "x", 4, []]) {
      expect(validateBuildManifest(value, { target: "darwin-arm64" }).ok).toBe(
        false,
      );
    }
  });
});

describe("package location and hashing", () => {
  test("locatePlatformPackage resolves from the given resolver and reports absence", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-swipl-locate-"));
    tempRoots.push(root);
    const pkg = path.join(root, "kibi-swipl-fake");
    mkdirSync(pkg);
    writeFileSync(path.join(pkg, "package.json"), "{}");
    const resolver = {
      resolve: (request: string) => {
        if (request === "kibi-swipl-fake/package.json") {
          return path.join(pkg, "package.json");
        }
        throw Object.assign(new Error("missing"), { code: "MODULE_NOT_FOUND" });
      },
    };
    expect(locatePlatformPackage("kibi-swipl-fake", resolver)).toBe(pkg);
    expect(locatePlatformPackage("kibi-swipl-other", resolver)).toBeUndefined();
    expect(() =>
      locatePlatformPackage("kibi-swipl-fake", {
        resolve: () => {
          throw Object.assign(new Error("denied"), { code: "EACCES" });
        },
      }),
    ).toThrow("denied");
  });

  test("sha256File hashes file contents", () => {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-swipl-hash-"));
    tempRoots.push(root);
    const file = path.join(root, "f");
    writeFileSync(file, "abc");
    expect(sha256File(file)).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
