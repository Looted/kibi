// executable_for TEST-prolog-bundled-runtime
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PLATFORM_PACKAGES } from "../../packages/swipl/index.js";
import { PACKAGE_CATALOG } from "../package-catalog.ts";
import { verifySwiplPayload } from "../verify-swipl-payload.mjs";

const ROOT = path.join(import.meta.dir, "..", "..");
const PLATFORMS = Object.entries(PLATFORM_PACKAGES);

function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(ROOT, relative), "utf8"));
}

const pinnedVersion: string = readJson("scripts/swipl-version.json").version;

describe("kibi-swipl package family metadata", () => {
  test("every platform package restricts os, cpu, and libc and avoids install scripts", () => {
    for (const [key, entry] of PLATFORMS) {
      const manifest = readJson(`packages/swipl-${key}/package.json`);
      expect(manifest.name).toBe(entry.package);
      expect(manifest.os).toEqual([entry.os]);
      expect(manifest.cpu).toEqual([entry.cpu]);
      expect(manifest.libc).toEqual("libc" in entry ? [entry.libc] : undefined);
      expect(manifest.preferUnplugged).toBe(true);
      expect(manifest.files).toEqual([
        "bin/",
        "lib/",
        "licenses/",
        "build-manifest.json",
      ]);
      for (const hook of ["preinstall", "install", "postinstall"]) {
        expect(manifest.scripts?.[hook]).toBeUndefined();
      }
      expect(manifest.kibi).toEqual({
        swiplVersion: pinnedVersion,
        target: key,
      });
    }
  });

  test("all kibi-swipl packages version together and the resolver lists every platform", () => {
    const resolver = readJson("packages/swipl/package.json");
    expect(resolver.name).toBe("kibi-swipl");
    expect(resolver.kibi.swiplVersion).toBe(pinnedVersion);
    const versions = new Set([resolver.version]);
    for (const [key, entry] of PLATFORMS) {
      const manifest = readJson(`packages/swipl-${key}/package.json`);
      versions.add(manifest.version);
      expect(resolver.optionalDependencies[entry.package]).toBe(
        manifest.version,
      );
    }
    expect(versions.size).toBe(1);
    expect(Object.keys(resolver.optionalDependencies)).toEqual(
      PLATFORMS.map(([, entry]) => entry.package),
    );
  });

  test("the changesets fixed group covers exactly the kibi-swipl packages", () => {
    const config = readJson(".changeset/config.json");
    expect(config.fixed).toEqual([
      ["kibi-swipl", ...PLATFORMS.map(([, entry]) => entry.package)],
    ]);
  });

  test("kibi-cli and kibi-runtime depend on the resolver package", () => {
    for (const dir of ["cli", "runtime"]) {
      expect(
        readJson(`packages/${dir}/package.json`).dependencies["kibi-swipl"],
      ).toBe(`^${readJson("packages/swipl/package.json").version}`);
    }
  });

  test("the runtime bundles keep the resolver and platform packages external", () => {
    const build: string = readJson("packages/runtime/package.json").scripts
      .build;
    const commands = build
      .split("&&")
      .filter((part) => part.includes("bun build"));
    expect(commands).toHaveLength(2);
    for (const command of commands) {
      expect(command).toContain("--external kibi-swipl ");
      expect(command).toContain("--external 'kibi-swipl-*'");
    }
  });

  test("catalog order puts platform packages before the resolver, and both before their dependents", () => {
    const dirs = PACKAGE_CATALOG.map((entry) => entry.dir) as string[];
    const swipl = dirs.indexOf("swipl");
    expect(swipl).toBeGreaterThan(-1);
    for (const [key] of PLATFORMS) {
      expect(dirs.indexOf(`swipl-${key}`)).toBeGreaterThan(-1);
      expect(dirs.indexOf(`swipl-${key}`)).toBeLessThan(swipl);
    }
    expect(swipl).toBeLessThan(dirs.indexOf("runtime"));
    expect(swipl).toBeLessThan(dirs.indexOf("cli"));
  });
});

describe("verifySwiplPayload", () => {
  const roots: string[] = [];
  afterEach(() => {
    for (const dir of roots.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function populated(
    mutate?: (root: string, manifest: Record<string, unknown>) => void,
  ): string {
    const root = mkdtempSync(path.join(tmpdir(), "kibi-swipl-payload-"));
    roots.push(root);
    const binary = "#!/bin/sh\necho swipl\n";
    mkdirSync(path.join(root, "bin"));
    mkdirSync(path.join(root, "lib", "swipl"), { recursive: true });
    mkdirSync(path.join(root, "licenses"));
    writeFileSync(path.join(root, "bin", "swipl"), binary);
    for (const name of [
      "SWI-Prolog-LICENSE",
      "OpenSSL-LICENSE.txt",
      "PCRE2-COPYING",
      "zlib-LICENSE",
    ]) {
      writeFileSync(path.join(root, "licenses", name), "licence text");
    }
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        kibi: { swiplVersion: "10.0.2", target: "darwin-x64" },
      }),
    );
    const manifest: Record<string, unknown> = {
      schema: "kibi.swipl-build.v1",
      target: "darwin-x64",
      swiplVersion: "10.0.2",
      binary: {
        path: "bin/swipl",
        sha256: createHash("sha256").update(binary).digest("hex"),
      },
      home: "lib/swipl",
    };
    mutate?.(root, manifest);
    writeFileSync(
      path.join(root, "build-manifest.json"),
      JSON.stringify(manifest),
    );
    return root;
  }

  test("accepts a populated package", () => {
    expect(verifySwiplPayload(populated())).toEqual([]);
  });

  test("refuses the committed placeholder packages (no payload)", () => {
    // Only what git tracks: a populated working copy must not change this.
    for (const [key] of PLATFORMS) {
      const root = mkdtempSync(path.join(tmpdir(), "kibi-swipl-placeholder-"));
      roots.push(root);
      writeFileSync(
        path.join(root, "package.json"),
        readFileSync(
          path.join(ROOT, "packages", `swipl-${key}`, "package.json"),
        ),
      );
      expect(verifySwiplPayload(root)[0]).toContain(
        "build-manifest.json is missing",
      );
    }
  });

  test("refuses a checksum mismatch, missing home, and missing licences", () => {
    const tampered = populated((root) =>
      writeFileSync(path.join(root, "bin", "swipl"), "x"),
    );
    expect(verifySwiplPayload(tampered)).toEqual([
      "bin/swipl does not match its manifest SHA-256",
    ]);
    const noHome = populated((root) =>
      rmSync(path.join(root, "lib"), { recursive: true }),
    );
    expect(verifySwiplPayload(noHome)).toEqual([
      "lib/swipl (SWI_HOME_DIR) is missing",
    ]);
    const noLicense = populated((root) =>
      rmSync(path.join(root, "licenses", "zlib-LICENSE")),
    );
    expect(verifySwiplPayload(noLicense)).toEqual([
      "licenses/ has no non-empty zlib licence text",
    ]);
    const emptyLicense = populated((root) =>
      writeFileSync(path.join(root, "licenses", "PCRE2-COPYING"), ""),
    );
    expect(verifySwiplPayload(emptyLicense)).toEqual([
      "licenses/ has no non-empty pcre2 licence text",
    ]);
  });

  test("refuses a manifest for a different version", () => {
    const root = populated((_root, manifest) => {
      manifest.swiplVersion = "10.0.3";
    });
    expect(verifySwiplPayload(root)[0]).toContain(
      "does not match package kibi.swiplVersion 10.0.2",
    );
  });
});
