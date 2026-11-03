import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  archiveName,
  main,
  materializeSymlinks,
  parseArgs,
  populatePlatformPackage,
  readPins,
  runCli,
} from "../populate-swipl-platform-packages.mjs";

const ROOT = path.join(import.meta.dir, "..", "..");
const TARGET = "linux-x64-gnu";
const VERSION: string = readPins(ROOT).version;
const BINARY = "#!/bin/sh\necho swipl\n";

const scratch: string[] = [];
function tempDir(prefix = "kibi-populate-rest-"): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  scratch.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of scratch.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

type Fixture = {
  packagesRoot: string;
  artifactsDir: string;
  prefix: string;
  extract: () => string;
};

/** A packages root, a sidecar-checked archive and a stub verifier prefix. */
function fixture(): Fixture {
  const packagesRoot = tempDir("kibi-populate-packages-");
  const packageDir = path.join(packagesRoot, `swipl-${TARGET}`);
  mkdirSync(path.join(packageDir, "licenses"), { recursive: true });
  copyFileSync(
    path.join(ROOT, "packages", `swipl-${TARGET}`, "package.json"),
    path.join(packageDir, "package.json"),
  );
  writeFileSync(path.join(packageDir, "licenses", "README.md"), "kept\n");

  const artifactsDir = tempDir("kibi-populate-artifacts-");
  const sourceDir = path.join(artifactsDir, `swipl-${TARGET}`);
  mkdirSync(sourceDir);
  const name = archiveName(VERSION, TARGET);
  writeFileSync(path.join(sourceDir, name), "archive bytes");
  writeFileSync(
    path.join(sourceDir, `${name}.sha256`),
    `${createHash("sha256").update("archive bytes").digest("hex")}  ${name}\n`,
  );

  const prefix = tempDir("kibi-populate-prefix-");
  mkdirSync(path.join(prefix, "bin"));
  writeFileSync(path.join(prefix, "bin", "swipl"), BINARY);
  chmodSync(path.join(prefix, "bin", "swipl"), 0o755);
  mkdirSync(path.join(prefix, "lib", "swipl"), { recursive: true });
  mkdirSync(path.join(prefix, "licenses"));
  for (const license of [
    "SWI-Prolog-LICENSE",
    "OpenSSL-LICENSE.txt",
    "PCRE2-COPYING",
    "zlib-LICENSE",
  ]) {
    writeFileSync(path.join(prefix, "licenses", license), "licence text\n");
  }
  writeFileSync(
    path.join(prefix, "build-manifest.json"),
    JSON.stringify({
      schema: "kibi.swipl-build.v1",
      target: TARGET,
      swiplVersion: VERSION,
      binary: {
        path: "bin/swipl",
        sha256: createHash("sha256").update(BINARY).digest("hex"),
      },
      home: "lib/swipl",
      sourceCommit: "a".repeat(40),
      workflowRunId: "12",
    }),
  );
  return { packagesRoot, artifactsDir, prefix, extract: () => prefix };
}

function populate(f: Fixture) {
  return populatePlatformPackage({
    target: TARGET,
    artifactsDir: f.artifactsDir,
    packagesRoot: f.packagesRoot,
    scratchRoot: tempDir("kibi-populate-scratch-"),
    extract: f.extract,
    env: {},
  });
}

describe("populate-swipl-platform-packages remaining checks", () => {
  test("a pin file without a version is refused", () => {
    const repo = tempDir();
    mkdirSync(path.join(repo, "scripts"));
    writeFileSync(path.join(repo, "scripts", "swipl-version.json"), "{}");
    expect(() => readPins(repo)).toThrow(
      "scripts/swipl-version.json has no version pin",
    );
  });

  test("a link to a directory is refused", () => {
    const root = tempDir();
    mkdirSync(path.join(root, "lib", "real"), { recursive: true });
    symlinkSync(
      path.join(root, "lib", "real"),
      path.join(root, "lib", "alias"),
    );
    expect(() => materializeSymlinks(root)).toThrow(
      `symlink does not end at a regular file: ${path.join(root, "lib", "alias")}`,
    );
  });

  test("populates the package from the verified prefix", () => {
    const f = fixture();
    const report = populate(f);
    expect(report).toMatchObject({
      target: TARGET,
      package: `kibi-swipl-${TARGET}`,
      archive: archiveName(VERSION, TARGET),
      archiveBytes: "archive bytes".length,
      sourceCommit: "a".repeat(40),
      workflowRunId: "12",
      links: { materialized: [], dropped: [], renamed: [] },
    });
  });

  test("refuses a missing package, a partial prefix, an invalid payload and a non-executable binary", () => {
    const missing = fixture();
    rmSync(path.join(missing.packagesRoot, `swipl-${TARGET}`), {
      recursive: true,
    });
    expect(() => populate(missing)).toThrow(
      `no platform package for ${TARGET} at ${path.join(missing.packagesRoot, `swipl-${TARGET}`)}`,
    );

    const partial = fixture();
    rmSync(path.join(partial.prefix, "lib"), { recursive: true });
    expect(() => populate(partial)).toThrow("archive prefix has no lib");

    const invalid = fixture();
    rmSync(path.join(invalid.prefix, "licenses", "zlib-LICENSE"));
    expect(() => populate(invalid)).toThrow(
      `populated kibi-swipl-${TARGET} is invalid: licenses/ has no non-empty zlib licence text`,
    );

    const inert = fixture();
    chmodSync(path.join(inert.prefix, "bin", "swipl"), 0o644);
    expect(() => populate(inert)).toThrow(
      "bin/swipl is not executable after extraction",
    );
  });

  test("the command line needs an artifacts directory", () => {
    expect(() => parseArgs(["--targets", "a"])).toThrow(
      "usage: populate-swipl-platform-packages.mjs --artifacts <dir> [--targets a,b] [--cached-build]",
    );
  });

  test("main populates every platform package and prints its report", () => {
    const f = fixture();
    const lines: string[] = [];
    const log = spyOn(console, "log").mockImplementation((line) => {
      lines.push(String(line));
    });
    try {
      const reports = main(["--artifacts", f.artifactsDir], {
        packagesRoot: f.packagesRoot,
        scratchRoot: tempDir("kibi-populate-scratch-"),
        extract: f.extract,
        env: {},
      });
      expect(
        reports.map((report: { target: string }) => report.target),
      ).toStrictEqual([TARGET]);
      expect(lines.map((line) => JSON.parse(line))).toStrictEqual(reports);
      expect(
        readFileSync(
          path.join(f.packagesRoot, `swipl-${TARGET}`, "licenses", "README.md"),
          "utf8",
        ),
      ).toBe("kept\n");
    } finally {
      log.mockRestore();
    }
  });

  test("runCli returns 0 on success and 1 with a message on failure", () => {
    const f = fixture();
    const errors: string[] = [];
    const log = spyOn(console, "log").mockImplementation(() => undefined);
    const error = spyOn(console, "error").mockImplementation((line) => {
      errors.push(String(line));
    });
    try {
      const overrides = {
        packagesRoot: f.packagesRoot,
        scratchRoot: tempDir("kibi-populate-scratch-"),
        extract: f.extract,
        env: {},
      };
      expect(
        runCli(["--artifacts", f.artifactsDir, "--targets", TARGET], overrides),
      ).toBe(0);
      expect(runCli(["--bogus"], overrides)).toBe(1);
      expect(errors).toStrictEqual([
        "populate-swipl-platform-packages: unknown argument: --bogus",
      ]);
    } finally {
      log.mockRestore();
      error.mockRestore();
    }
  });
});
