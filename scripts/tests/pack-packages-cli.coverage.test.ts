import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { packCatalogPackages, runPackPackagesIfMain } from "../pack-packages";
import {
  type PackageCatalogSlice,
  catalogEntriesForSlice,
  dirsForSlice,
  lookupCatalogEntry,
  runPackageCatalogCliIfMain,
} from "../package-catalog";

// npm stand-in: records each call and the manifest it saw, then exits with
// FAKE_NPM_STATUS (0 by default).
const FAKE_NPM = `#!/bin/sh
echo "$PWD $*" >> "$FAKE_NPM_LOG"
/bin/cat package.json >> "$FAKE_NPM_LOG"
echo >> "$FAKE_NPM_LOG"
exit "\${FAKE_NPM_STATUS:-0}"
`;

const created: string[] = [];
const savedEnv = { ...process.env };

function tempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  created.push(dir);
  return dir;
}

function fakeBin(): { bin: string; log: string } {
  const root = tempDir("kibi-pack-bin-");
  const bin = path.join(root, "bin");
  mkdirSync(bin);
  writeFileSync(path.join(bin, "npm"), FAKE_NPM);
  chmodSync(path.join(bin, "npm"), 0o755);
  const log = path.join(root, "npm.log");
  writeFileSync(log, "");
  process.env.PATH = bin;
  process.env.FAKE_NPM_LOG = log;
  return { bin, log };
}

function fakeRepo(slice: PackageCatalogSlice): string {
  const root = tempDir("kibi-pack-repo-");
  const entries = catalogEntriesForSlice(slice);
  for (const entry of entries) {
    const dir = path.join(root, "packages", entry.dir);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "package.json"),
      `${JSON.stringify({
        name: entry.npmName,
        version: "1.2.3",
        dependencies: Object.fromEntries(
          entries
            .filter((other) => other.npmName !== entry.npmName)
            .slice(0, 1)
            .map((other) => [other.npmName, "^1.2.3"]),
        ),
      })}\n`,
    );
  }
  return root;
}

afterEach(() => {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
  process.exitCode = 0;
  for (const dir of created.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("packCatalogPackages", () => {
  test("packs every slice package into the destination", () => {
    const { log } = fakeBin();
    const repoRoot = fakeRepo("default-install");
    const destination = path.join(tempDir("kibi-pack-out-"), "nested");
    packCatalogPackages({ slice: "default-install", repoRoot, destination });
    const calls = readFileSync(log, "utf8")
      .split("\n")
      .filter((line) => line.includes(" pack"));
    expect(calls).toStrictEqual(
      dirsForSlice("default-install").map(
        (dir) =>
          `${path.join(repoRoot, "packages", dir)} pack --pack-destination ${destination}`,
      ),
    );
  });

  test("stamps dev versions while packing and restores the manifests", () => {
    const { log } = fakeBin();
    const repoRoot = fakeRepo("default-install");
    const [first] = dirsForSlice("default-install");
    const manifestPath = path.join(
      repoRoot,
      "packages",
      String(first),
      "package.json",
    );
    const before = readFileSync(manifestPath, "utf8");
    packCatalogPackages({
      slice: "default-install",
      repoRoot,
      devSuffix: "abc123",
    });
    expect(readFileSync(manifestPath, "utf8")).toBe(before);
    const packed = readFileSync(log, "utf8");
    expect(packed).toContain('"version": "1.2.3-dev.abc123"');
    expect(packed).not.toContain("--pack-destination");
  });

  test("a failed npm pack names the package and still restores manifests", () => {
    fakeBin();
    process.env.FAKE_NPM_STATUS = "1";
    const repoRoot = fakeRepo("default-install");
    const [first] = dirsForSlice("default-install");
    const manifestPath = path.join(
      repoRoot,
      "packages",
      String(first),
      "package.json",
    );
    const before = readFileSync(manifestPath, "utf8");
    expect(() =>
      packCatalogPackages({
        slice: "default-install",
        repoRoot,
        devSuffix: "abc123",
      }),
    ).toThrow(`npm pack failed for packages/${first}`);
    expect(readFileSync(manifestPath, "utf8")).toBe(before);
  });

  test("defaults to the CI slice in this repository", () => {
    fakeBin();
    process.env.FAKE_NPM_STATUS = "2";
    expect(() => packCatalogPackages()).toThrow(
      `npm pack failed for packages/${dirsForSlice("ci-pack")[0]}`,
    );
  });

  test("a missing npm counts as a failed pack", () => {
    process.env.PATH = tempDir("kibi-pack-empty-");
    const repoRoot = fakeRepo("default-install");
    expect(() =>
      packCatalogPackages({ slice: "default-install", repoRoot }),
    ).toThrow("npm pack failed for packages/");
  });
});

describe("runPackPackagesIfMain", () => {
  test("does nothing unless run as the entry point", () => {
    expect(runPackPackagesIfMain(false, ["--slice", "nope"])).toBeUndefined();
  });

  test("reads the slice from either flag form", () => {
    fakeBin();
    expect(() => runPackPackagesIfMain(true, ["--slice=nope"])).toThrow(
      "Unknown package catalog slice: nope",
    );
    expect(() => runPackPackagesIfMain(true, ["--slice", "other"])).toThrow(
      "Unknown package catalog slice: other",
    );
  });

  test("reads the destination and dev suffix from either flag form", () => {
    fakeBin();
    for (const argv of [
      ["--slice=nope", "--destination=out", "--dev-version=abc"],
      ["--slice=nope", "--destination", "out"],
      ["--slice=nope", "--destination"],
    ]) {
      expect(() => runPackPackagesIfMain(true, argv)).toThrow(
        "Unknown package catalog slice: nope",
      );
    }
  });

  test("a bare --dev-version takes the short commit and needs git", () => {
    const { bin } = fakeBin();
    writeFileSync(path.join(bin, "git"), "#!/bin/sh\necho 0123456789ab\n");
    chmodSync(path.join(bin, "git"), 0o755);
    expect(() =>
      runPackPackagesIfMain(true, ["--slice=nope", "--dev-version"]),
    ).toThrow("Unknown package catalog slice: nope");

    writeFileSync(path.join(bin, "git"), "#!/bin/sh\nexit 0\n");
    expect(() =>
      runPackPackagesIfMain(true, ["--slice=nope", "--dev-version"]),
    ).toThrow("--dev-version needs a git checkout or an explicit suffix");

    writeFileSync(path.join(bin, "git"), "#!/bin/sh\necho abc\nexit 1\n");
    expect(() =>
      runPackPackagesIfMain(true, ["--slice=nope", "--dev-version"]),
    ).toThrow("--dev-version needs a git checkout or an explicit suffix");

    rmSync(path.join(bin, "git"));
    expect(() =>
      runPackPackagesIfMain(true, ["--slice=nope", "--dev-version"]),
    ).toThrow("--dev-version needs a git checkout or an explicit suffix");
  });

  test("packs the CI slice by default", () => {
    fakeBin();
    process.env.FAKE_NPM_STATUS = "7";
    expect(() => runPackPackagesIfMain(true, [])).toThrow(
      `npm pack failed for packages/${dirsForSlice("ci-pack")[0]}`,
    );
  });
});

describe("package catalog command line", () => {
  let stdout: string[];
  let stderr: string[];
  beforeEach(() => {
    stdout = [];
    stderr = [];
    spyOn(process.stdout, "write").mockImplementation((chunk) => {
      stdout.push(String(chunk));
      return true;
    });
    spyOn(process.stderr, "write").mockImplementation((chunk) => {
      stderr.push(String(chunk));
      return true;
    });
  });
  afterEach(() => {
    (process.stdout.write as unknown as { mockRestore(): void }).mockRestore();
    (process.stderr.write as unknown as { mockRestore(): void }).mockRestore();
  });

  test("does nothing unless run as the entry point", () => {
    runPackageCatalogCliIfMain(false, ["--print-dirs"]);
    expect(stdout).toStrictEqual([]);
  });

  test("prints slice directories, publishable by default", () => {
    runPackageCatalogCliIfMain(true, ["--print-dirs"]);
    runPackageCatalogCliIfMain(true, ["--print-dirs", "pack-all"]);
    expect(stdout).toStrictEqual([
      `${dirsForSlice("publishable").join(" ")}\n`,
      `${dirsForSlice("pack-all").join(" ")}\n`,
    ]);
  });

  test("prints the publishable directory and npm name table", () => {
    runPackageCatalogCliIfMain(true, ["--print-publishable-tsv"]);
    expect(stdout).toStrictEqual(
      catalogEntriesForSlice("publishable").map(
        (entry) => `${entry.dir}\t${entry.npmName}\n`,
      ),
    );
  });

  test("looks a package up by directory or npm name", () => {
    const [entry] = catalogEntriesForSlice("publishable");
    if (entry === undefined) throw new Error("catalog is empty");
    expect(lookupCatalogEntry(entry.dir)).toBe(entry);
    expect(lookupCatalogEntry(entry.npmName)).toBe(entry);
    runPackageCatalogCliIfMain(true, ["--lookup", entry.npmName]);
    expect(stdout).toStrictEqual([`${entry.dir}\t${entry.npmName}\n`]);
  });

  test("a lookup needs a known name", () => {
    runPackageCatalogCliIfMain(true, ["--lookup"]);
    expect(stderr).toStrictEqual([
      "package-catalog --lookup requires a name\n",
    ]);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    runPackageCatalogCliIfMain(true, ["--lookup", "no-such-package"]);
    expect(stderr.at(-1)).toBe("Unknown package: no-such-package\n");
    expect(process.exitCode).toBe(1);
  });

  test("prints nothing without a known flag", () => {
    runPackageCatalogCliIfMain(true, ["--other"]);
    expect(stdout).toStrictEqual([]);
    expect(stderr).toStrictEqual([]);
  });

  test("an unknown slice is rejected", () => {
    expect(() => catalogEntriesForSlice("nope" as PackageCatalogSlice)).toThrow(
      "Unknown package catalog slice: nope",
    );
  });
});
