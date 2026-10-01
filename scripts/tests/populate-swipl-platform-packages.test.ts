// executable_for TEST-prolog-bundled-release
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  materializeSymlinks,
  platformTargets,
  populatePlatformPackage,
  verifyArchiveSidecar,
} from "../populate-swipl-platform-packages.mjs";

const ROOT = path.join(import.meta.dir, "..", "..");
const PINNED: string = JSON.parse(
  readFileSync(path.join(ROOT, "scripts", "swipl-version.json"), "utf8"),
).version;
const TARGET = "linux-x64-gnu";

const scratch: string[] = [];
function tempDir(prefix = "kibi-populate-"): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  scratch.push(dir);
  return dir;
}
afterEach(() => {
  for (const dir of scratch.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const sha = (data: Buffer | string) =>
  createHash("sha256").update(data).digest("hex");

/** A minimal ELF-looking file that names the libraries it loads. */
function native(...needed: string[]): Buffer {
  return Buffer.concat([
    Buffer.from([0x7f, 0x45, 0x4c, 0x46]),
    ...needed.map((name) => Buffer.from(`\0${name}\0`)),
  ]);
}

function write(file: string, content: Buffer | string, mode = 0o644) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, content);
  chmodSync(file, mode);
}

function listing(root: string): string[] {
  const found: string[] = [];
  const visit = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else found.push(path.relative(root, full));
    }
  };
  visit(root);
  return found.sort();
}

describe("verifyArchiveSidecar", () => {
  function archiveWithSidecar(
    sidecar?: (digest: string, name: string) => string,
  ) {
    const dir = tempDir();
    const archive = path.join(dir, `swipl-${PINNED}-${TARGET}.tar.gz`);
    writeFileSync(archive, "archive bytes");
    const digest = sha("archive bytes");
    writeFileSync(
      `${archive}.sha256`,
      sidecar?.(digest, path.basename(archive)) ??
        `${digest}  ${path.basename(archive)}\n`,
    );
    return { archive, digest };
  }

  test("returns the digest of an archive its sidecar describes", () => {
    const { archive, digest } = archiveWithSidecar();
    expect(verifyArchiveSidecar(archive, `${archive}.sha256`)).toBe(digest);
  });

  test("refuses an archive whose bytes differ from the sidecar", () => {
    const { archive } = archiveWithSidecar();
    writeFileSync(archive, "tampered bytes");
    expect(() => verifyArchiveSidecar(archive, `${archive}.sha256`)).toThrow(
      "SHA-256 mismatch",
    );
  });

  test("refuses a sidecar that names a different archive", () => {
    const { archive } = archiveWithSidecar(
      (digest) => `${digest}  swipl-${PINNED}-darwin-arm64.tar.gz\n`,
    );
    expect(() => verifyArchiveSidecar(archive, `${archive}.sha256`)).toThrow(
      "names swipl-",
    );
  });

  test("refuses malformed sidecars, including uppercase digests and paths", () => {
    for (const body of [
      "not a digest\n",
      `${"A".repeat(64)}  swipl-${PINNED}-${TARGET}.tar.gz\n`,
      `${"a".repeat(64)} swipl-${PINNED}-${TARGET}.tar.gz\n`,
      `${"a".repeat(64)}  ../swipl-${PINNED}-${TARGET}.tar.gz\n`,
    ]) {
      const { archive } = archiveWithSidecar(() => body);
      expect(() => verifyArchiveSidecar(archive, `${archive}.sha256`)).toThrow(
        "is not '<sha256>  <archive name>'",
      );
    }
  });

  test("refuses a missing sidecar or archive", () => {
    const { archive } = archiveWithSidecar();
    rmSync(`${archive}.sha256`);
    expect(() => verifyArchiveSidecar(archive, `${archive}.sha256`)).toThrow(
      "checksum sidecar is missing",
    );
    rmSync(archive);
    expect(() => verifyArchiveSidecar(archive, `${archive}.sha256`)).toThrow(
      "archive is missing",
    );
  });
});

describe("materializeSymlinks", () => {
  function payload(): string {
    const root = tempDir("kibi-links-");
    // bin/swipl loads libz.so.1 and libswipl.so.10 by SONAME.
    write(
      path.join(root, "bin", "swipl"),
      native("libswipl.so.10", "libz.so.1"),
      0o755,
    );
    write(
      path.join(root, "lib/vendor/libz.so.1.3.2"),
      native("libz.so.1"),
      0o755,
    );
    symlinkSync("libz.so.1.3.2", path.join(root, "lib/vendor/libz.so.1"));
    symlinkSync("libz.so.1", path.join(root, "lib/vendor/libz.so"));
    write(
      path.join(root, "lib/swipl/lib/x/libswipl.so.10.0.2"),
      native("libswipl.so.10", "libswipl.so"),
      0o755,
    );
    symlinkSync(
      "libswipl.so.10.0.2",
      path.join(root, "lib/swipl/lib/x/libswipl.so.10"),
    );
    symlinkSync(
      "libswipl.so.10",
      path.join(root, "lib/swipl/lib/x/libswipl.so"),
    );
    write(path.join(root, "lib/swipl/library/lists.pl"), "% text\n");
    return root;
  }

  test("leaves no symbolic link and keeps every loader-visible name as a regular file", () => {
    const root = payload();
    const original = readFileSync(path.join(root, "lib/vendor/libz.so.1.3.2"));
    const summary = materializeSymlinks(root);
    for (const file of listing(root)) {
      expect(lstatSync(path.join(root, file)).isSymbolicLink()).toBe(false);
    }
    expect(readFileSync(path.join(root, "lib/vendor/libz.so.1"))).toEqual(
      original,
    );
    expect(existsSync(path.join(root, "lib/swipl/lib/x/libswipl.so.10"))).toBe(
      true,
    );
    expect(summary.dropped).toContain("lib/vendor/libz.so");
    expect(summary.dropped).toContain("lib/swipl/lib/x/libswipl.so");
  });

  test("does not ship a second copy under a name nothing loads", () => {
    const root = payload();
    materializeSymlinks(root);
    expect(listing(root).filter((file) => file.includes("libz"))).toEqual([
      "lib/vendor/libz.so.1",
    ]);
    expect(listing(root).filter((file) => file.includes("libswipl"))).toEqual([
      "lib/swipl/lib/x/libswipl.so.10",
    ]);
  });

  test("a library naming itself, or text mentioning a name, does not keep that name", () => {
    const root = payload();
    // libswipl.so.10.0.2 mentions "libswipl.so" and a text file mentions the
    // full name; neither is a loader reference.
    write(
      path.join(root, "lib/cmake/swipl.cmake"),
      "libswipl.so.10.0.2 libz.so.1.3.2\n",
    );
    materializeSymlinks(root);
    expect(existsSync(path.join(root, "lib/swipl/lib/x/libswipl.so"))).toBe(
      false,
    );
    expect(existsSync(path.join(root, "lib/vendor/libz.so.1.3.2"))).toBe(false);
  });

  test("copies instead of renaming when the real file's own name is loaded by another native file", () => {
    const root = payload();
    write(
      path.join(root, "lib/swipl/lib/x/uses-full-name.so"),
      native("libz.so.1.3.2"),
      0o755,
    );
    materializeSymlinks(root);
    expect(readFileSync(path.join(root, "lib/vendor/libz.so.1.3.2"))).toEqual(
      readFileSync(path.join(root, "lib/vendor/libz.so.1")),
    );
    expect(existsSync(path.join(root, "lib/vendor/libz.so"))).toBe(false);
  });

  test("keeps a real file whose only links are unused", () => {
    const root = tempDir("kibi-links-");
    write(path.join(root, "bin", "swipl"), native(), 0o755);
    write(path.join(root, "lib/libother.so.1.2"), native(), 0o755);
    symlinkSync("libother.so.1.2", path.join(root, "lib/libother.so"));
    const summary = materializeSymlinks(root);
    expect(summary.dropped).toEqual(["lib/libother.so"]);
    expect(existsSync(path.join(root, "lib/libother.so.1.2"))).toBe(true);
  });

  test("preserves the executable bit of renamed and copied libraries", () => {
    const root = payload();
    materializeSymlinks(root);
    expect(
      lstatSync(path.join(root, "lib/vendor/libz.so.1")).mode & 0o111,
    ).not.toBe(0);
  });

  test("refuses a link that escapes the payload or dangles", () => {
    const outside = tempDir("kibi-outside-");
    write(path.join(outside, "secret"), "secret");
    const escaping = tempDir("kibi-links-");
    symlinkSync(path.join(outside, "secret"), path.join(escaping, "link"));
    expect(() => materializeSymlinks(escaping)).toThrow("escapes the payload");
    const dangling = tempDir("kibi-links-");
    symlinkSync("missing", path.join(dangling, "link"));
    expect(() => materializeSymlinks(dangling)).toThrow();
  });

  test("npm pack ships the materialized libraries that a symlinked tree would lose", () => {
    const root = payload();
    writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "kibi-links-fixture",
        version: "1.0.0",
        files: ["bin", "lib"],
      }),
    );
    const packed = (): string[] => {
      const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
        cwd: root,
        encoding: "utf8",
      });
      expect(result.status).toBe(0);
      return JSON.parse(result.stdout)[0].files.map(
        (f: { path: string }) => f.path,
      );
    };
    // The control: npm silently drops the links, which is why we materialize.
    expect(packed()).not.toContain("lib/vendor/libz.so.1");
    materializeSymlinks(root);
    expect(packed()).toContain("lib/vendor/libz.so.1");
    expect(packed()).toContain("lib/swipl/lib/x/libswipl.so.10");
  });
});

/** Build a real pipeline archive (the pipeline's own writer) for TARGET. */
function pipelineArchive(provenance: Record<string, string> = {}): {
  artifacts: string;
  archive: string;
} {
  const base = tempDir("kibi-archive-");
  const script = String.raw`
import importlib.util, json, sys
from pathlib import Path
root, base, target = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
spec = importlib.util.spec_from_file_location('spike', root / 'scripts/swipl-spike.py')
spike = importlib.util.module_from_spec(spec); spec.loader.exec_module(spike)
manifest = json.loads((root / 'scripts/swipl-version.json').read_text())
prefix = base / 'prefix'
(prefix / 'bin').mkdir(parents=True)
binary = prefix / 'bin/swipl'
binary.write_bytes(b'\x7fELF\x00libz.so.1\x00')
binary.chmod(0o755)
(prefix / 'lib/vendor').mkdir(parents=True)
(prefix / 'lib/vendor/libz.so.1.3.2').write_bytes(b'\x7fELF\x00libz.so.1\x00')
(prefix / 'lib/vendor/libz.so.1').symlink_to('libz.so.1.3.2')
(prefix / 'lib/vendor/libz.so').symlink_to('libz.so.1')
for name in spike.REQUIRED_LIBRARIES:
    file = prefix / 'lib/swipl/library' / spike.REQUIRED_LIBRARY_PATHS[name]
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text('% presence fixture\n')
(prefix / 'licenses').mkdir()
for name in ('SWI-Prolog-LICENSE', 'OpenSSL-LICENSE.txt', 'PCRE2-COPYING', 'zlib-LICENSE'):
    (prefix / 'licenses' / name).write_text('licence text\n')
(prefix / 'share/man/man1').mkdir(parents=True)
(prefix / 'share/man/man1/swipl.1').write_text('man page\n')
out = base / 'artifacts' / ('swipl-' + target)
out.mkdir(parents=True)
print(spike.write_archive(prefix, manifest, target, out))
`;
  const result = spawnSync("python3", ["-c", script, ROOT, base, TARGET], {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH ?? "",
      PYTHONDONTWRITEBYTECODE: "1",
      ...provenance,
    },
  });
  expect(result.status, result.stderr).toBe(0);
  return {
    artifacts: path.join(base, "artifacts"),
    archive: result.stdout.trim().split("\n").pop() ?? "",
  };
}

/**
 * The environment the verifier sees. Never inherit GITHUB_SHA/GITHUB_RUN_ID
 * from the machine running the tests: on Actions they would be compared with
 * the synthetic archive's embedded provenance.
 */
const cleanEnv = (extra: Record<string, string> = {}) => ({
  PATH: process.env.PATH ?? "",
  ...extra,
});

/** A packages root holding the real platform package manifest and its README placeholder. */
function packagesRootFor(target = TARGET): string {
  const root = tempDir("kibi-packages-");
  const dir = path.join(root, `swipl-${target}`);
  mkdirSync(path.join(dir, "licenses"), { recursive: true });
  copyFileSync(
    path.join(ROOT, "packages", `swipl-${target}`, "package.json"),
    path.join(dir, "package.json"),
  );
  writeFileSync(path.join(dir, "licenses", "README.md"), "placeholder\n");
  return root;
}

describe("populatePlatformPackage", () => {
  test("turns a verified pipeline archive into a complete payload without share/", () => {
    const { artifacts } = pipelineArchive();
    const packages = packagesRootFor();
    const report = populatePlatformPackage({
      target: TARGET,
      artifactsDir: artifacts,
      packagesRoot: packages,
      scratchRoot: tempDir("kibi-scratch-"),
      env: cleanEnv(),
    });
    const dir = path.join(packages, `swipl-${TARGET}`);
    const files = listing(dir);
    expect(files).toContain("bin/swipl");
    expect(files).toContain("build-manifest.json");
    expect(files).toContain("licenses/README.md");
    expect(files.some((file) => file.startsWith("share/"))).toBe(false);
    expect(files.filter((file) => file.includes("libz"))).toEqual([
      "lib/vendor/libz.so.1",
    ]);
    const manifest = JSON.parse(
      readFileSync(path.join(dir, "build-manifest.json"), "utf8"),
    );
    expect(manifest.binary.sha256).toBe(
      sha(readFileSync(path.join(dir, "bin/swipl"))),
    );
    expect(report).toMatchObject({
      target: TARGET,
      package: `kibi-swipl-${TARGET}`,
      binarySha256: manifest.binary.sha256,
    });
    expect(report.archiveSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(lstatSync(path.join(dir, "bin/swipl")).mode & 0o111).not.toBe(0);
  });

  test("replaces stale payload files when run again", () => {
    const { artifacts } = pipelineArchive();
    const packages = packagesRootFor();
    const dir = path.join(packages, `swipl-${TARGET}`);
    write(path.join(dir, "lib/stale.so"), "stale");
    write(path.join(dir, "licenses/OLD-LICENSE"), "old");
    populatePlatformPackage({
      target: TARGET,
      artifactsDir: artifacts,
      packagesRoot: packages,
      scratchRoot: tempDir("kibi-scratch-"),
      env: cleanEnv(),
    });
    expect(existsSync(path.join(dir, "lib/stale.so"))).toBe(false);
    expect(existsSync(path.join(dir, "licenses/OLD-LICENSE"))).toBe(false);
    expect(existsSync(path.join(dir, "licenses/README.md"))).toBe(true);
  });

  test("refuses a tampered archive before extracting anything", () => {
    const { artifacts, archive } = pipelineArchive();
    writeFileSync(
      archive,
      Buffer.concat([readFileSync(archive), Buffer.from("x")]),
    );
    const packages = packagesRootFor();
    let extracted = false;
    expect(() =>
      populatePlatformPackage({
        target: TARGET,
        artifactsDir: artifacts,
        packagesRoot: packages,
        scratchRoot: tempDir("kibi-scratch-"),
        extract: () => {
          extracted = true;
          return "";
        },
      }),
    ).toThrow("SHA-256 mismatch");
    expect(extracted).toBe(false);
    expect(existsSync(path.join(packages, `swipl-${TARGET}`, "bin"))).toBe(
      false,
    );
  });

  test("refuses an archive whose manifest differs from the trusted pins even with a matching sidecar", () => {
    const { artifacts, archive } = pipelineArchive();
    // Rewrite the embedded manifest's source pin, then re-seal the sidecar the
    // way an attacker controlling the artifact would.
    const rewrite = String.raw`
import hashlib, io, json, sys, tarfile
from pathlib import Path
archive = Path(sys.argv[1])
with tarfile.open(archive, 'r:gz') as source:
    entries = [(m, source.extractfile(m).read() if m.isfile() else None) for m in source.getmembers()]
with tarfile.open(archive, 'w:gz') as out:
    for member, body in entries:
        if member.name.endswith('build-manifest.json'):
            data = json.loads(body); data['sourceArchiveSha256'] = '0' * 64
            body = json.dumps(data).encode(); member.size = len(body)
        out.addfile(member, io.BytesIO(body) if body is not None else None)
archive.with_name(archive.name + '.sha256').write_text(hashlib.sha256(archive.read_bytes()).hexdigest() + '  ' + archive.name + '\n')
`;
    const result = spawnSync("python3", ["-c", rewrite, archive], {
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
    expect(() =>
      populatePlatformPackage({
        target: TARGET,
        artifactsDir: artifacts,
        packagesRoot: packagesRootFor(),
        scratchRoot: tempDir("kibi-scratch-"),
        env: cleanEnv(),
      }),
    ).toThrow("differs from trusted pin");
  });

  test("accepts an archive built by this run and refuses one built by another commit or run", () => {
    const sha = "a".repeat(40);
    const { artifacts } = pipelineArchive({
      GITHUB_SHA: sha,
      GITHUB_RUN_ID: "4242",
    });
    const populate = (env: Record<string, string>) =>
      populatePlatformPackage({
        target: TARGET,
        artifactsDir: artifacts,
        packagesRoot: packagesRootFor(),
        scratchRoot: tempDir("kibi-scratch-"),
        env,
      });
    const report = populate(
      cleanEnv({ GITHUB_SHA: sha, GITHUB_RUN_ID: "4242" }),
    );
    expect(report.sourceCommit).toBe(sha);
    expect(report.workflowRunId).toBe("4242");
    expect(() =>
      populate(cleanEnv({ GITHUB_SHA: "b".repeat(40), GITHUB_RUN_ID: "4242" })),
    ).toThrow("Build provenance differs from this Actions run: sourceCommit");
    expect(() =>
      populate(cleanEnv({ GITHUB_SHA: sha, GITHUB_RUN_ID: "9999" })),
    ).toThrow("Build provenance differs from this Actions run: workflowRunId");
  });

  test("refuses a package that declares a different SWI-Prolog version than the pin", () => {
    const packages = packagesRootFor();
    const manifestPath = path.join(packages, `swipl-${TARGET}`, "package.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    manifest.kibi.swiplVersion = "9.0.0";
    writeFileSync(manifestPath, JSON.stringify(manifest));
    expect(() =>
      populatePlatformPackage({
        target: TARGET,
        artifactsDir: tempDir(),
        packagesRoot: packages,
      }),
    ).toThrow(`pins ${PINNED}`);
  });

  test("refuses a package directory that is not the requested target", () => {
    const packages = packagesRootFor();
    const dir = path.join(packages, "swipl-darwin-x64");
    mkdirSync(dir);
    copyFileSync(
      path.join(packages, `swipl-${TARGET}`, "package.json"),
      path.join(dir, "package.json"),
    );
    expect(() =>
      populatePlatformPackage({
        target: "darwin-x64",
        artifactsDir: tempDir(),
        packagesRoot: packages,
      }),
    ).toThrow("is not the darwin-x64 package");
  });
});

describe("platformTargets", () => {
  test("derives the four launch targets from the packages directory", () => {
    expect(platformTargets(path.join(ROOT, "packages"))).toEqual([
      "darwin-arm64",
      "darwin-x64",
      "linux-arm64-gnu",
      "linux-x64-gnu",
    ]);
  });
});

describe("command line", () => {
  test("refuses to run without an artifacts directory", () => {
    const result = spawnSync(
      process.execPath,
      [path.join(ROOT, "scripts", "populate-swipl-platform-packages.mjs")],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "usage: populate-swipl-platform-packages.mjs",
    );
  });

  test("a missing artifact is a hard failure naming the archive", () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(ROOT, "scripts", "populate-swipl-platform-packages.mjs"),
        "--artifacts",
        tempDir(),
        "--targets",
        TARGET,
      ],
      { encoding: "utf8" },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`swipl-${PINNED}-${TARGET}.tar.gz`);
  });
});
