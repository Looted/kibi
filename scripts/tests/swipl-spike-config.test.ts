import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const SPIKE = join(ROOT, "scripts", "swipl-spike.sh");
type PinEntry = { version: string; sha256: string; url: string };
type PinManifest = {
  version: string;
  sha256: string;
  dependencies: { openssl: PinEntry; pcre2: PinEntry; zlib: PinEntry };
};
const PIN = JSON.parse(
  readFileSync(join(ROOT, "scripts", "swipl-version.json"), "utf8"),
) as PinManifest;
const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function fixture(pins: unknown): { manifest: string; workdir: string } {
  const dir = mkdtempSync(join(tmpdir(), "kibi-swipl-spike-config-"));
  tempDirs.push(dir);
  const manifest = join(dir, "pins.json");
  writeFileSync(manifest, JSON.stringify(pins));
  return { manifest, workdir: join(dir, "native-build") };
}

function verify(manifest: string, target: string, workdir: string) {
  return spawnSync("bash", [SPIKE, "verify-config", "--workdir", workdir], {
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_ACTIONS: "false",
      KIBI_SWIPL_SPIKE_MANIFEST: manifest,
      KIBI_SWIPL_SPIKE_TARGET: target,
    },
  });
}

describe("SWI-Prolog spike configuration", () => {
  test.each(["linux-x64-gnu", "darwin-arm64"])(
    "accepts the pinned source set for %s without starting a native build",
    (target) => {
      const { manifest, workdir } = fixture(PIN);
      const result = verify(manifest, target, workdir);

      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      const output = JSON.parse(result.stdout);
      expect(output.target).toBe(target);
      expect(output.version).toBe(PIN.version);
      expect(output.dependencies).toEqual({
        openssl: PIN.dependencies.openssl.version,
        pcre2: PIN.dependencies.pcre2.version,
        zlib: PIN.dependencies.zlib.version,
      });
      expect(output.requiredLibraries).toContain("semweb/rdf_persistency");
      expect(output.requiredLibraries).toContain("prolog_coverage");
      expect(existsSync(workdir)).toBe(false);
    },
  );

  test.each([
    ["non-object manifest", []],
    ["missing dependency pin", { ...PIN, dependencies: {} }],
    ["invalid source checksum", { ...PIN, sha256: "not-a-sha256" }],
    [
      "non-string dependency version",
      {
        ...PIN,
        dependencies: {
          ...PIN.dependencies,
          pcre2: {
            ...PIN.dependencies.pcre2,
            version: 10.47,
          },
        },
      },
    ],
  ])("rejects %s before a native build", (_label, pins) => {
    const { manifest, workdir } = fixture(pins);
    const result = verify(manifest, "linux-x64-gnu", workdir);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("SWI spike failed:");
    expect(existsSync(workdir)).toBe(false);
  });

  test("rejects a target outside the spike target set", () => {
    const { manifest, workdir } = fixture(PIN);
    const result = verify(manifest, "win32-x64", workdir);

    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("Unsupported SWI spike target: win32-x64");
    expect(existsSync(workdir)).toBe(false);
  });
});
