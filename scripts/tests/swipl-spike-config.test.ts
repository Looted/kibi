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
  patches: Array<{
    path: string;
    sha256: string;
    files: Record<string, { original: string; patched: string }>;
  }>;
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
  test.each(["linux-x64-gnu", "linux-arm64-gnu", "darwin-arm64", "darwin-x64"])(
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
    ["missing checked patches", { ...PIN, patches: [] }],
    [
      "changed patch bytes",
      { ...PIN, patches: [{ ...PIN.patches[0], sha256: "0".repeat(64) }] },
    ],
    [
      "patch path outside the patch lane",
      { ...PIN, patches: [{ ...PIN.patches[0], path: "../../outside.patch" }] },
    ],
    [
      "source patch file traversal",
      {
        ...PIN,
        patches: [
          {
            ...PIN.patches[0],
            files: {
              "../outside.c": PIN.patches[0].files["src/os/pl-files.c"],
            },
          },
        ],
      },
    ],
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

  test.each(["repeat", "unknown", "partial", "inventory"])(
    "checked source patch handles %s source without an unsafe write",
    (mode) => {
      const control = String.raw`
import difflib, hashlib, importlib.util, json, sys, tempfile
from pathlib import Path
spec = importlib.util.spec_from_file_location('spike', Path(sys.argv[1]) / 'scripts/swipl-spike.py')
spike = importlib.util.module_from_spec(spec)
spec.loader.exec_module(spike)
digest = lambda value: hashlib.sha256(value).hexdigest()
with tempfile.TemporaryDirectory(prefix='kibi-patch-test-') as temporary:
    root = Path(temporary)
    spike.ROOT = root
    source = root / 'source'
    source.mkdir()
    patch = root / 'scripts/patches/test.patch'
    patch.parent.mkdir(parents=True)
    files = {}
    chunks = []
    for name in ('one.c', 'two.h'):
        before = 'original ' + name + '\n'
        after = 'patched ' + name + '\n'
        (source / name).write_text(before)
        files[name] = {'original': digest(before.encode()), 'patched': digest(after.encode())}
        chunks.extend(difflib.unified_diff(before.splitlines(keepends=True), after.splitlines(keepends=True), fromfile='a/' + name, tofile='b/' + name))
    patch.write_text(''.join(chunks))
    entry = {'path': 'scripts/patches/test.patch', 'sha256': digest(patch.read_bytes()), 'files': files}
    mode = sys.argv[2]
    if mode == 'unknown':
        (source / 'one.c').write_text('unknown source\n')
    elif mode == 'partial':
        (source / 'one.c').write_text('patched one.c\n')
    elif mode == 'inventory':
        del files['two.h']
    before_state = {file.name: file.read_bytes() for file in source.iterdir()}
    try:
        spike.apply_source_patches(source, {'patches': [entry]})
        if mode != 'repeat':
            raise AssertionError('unsafe source accepted')
        once = {file.name: file.read_bytes() for file in source.iterdir()}
        spike.apply_source_patches(source, {'patches': [entry]})
        assert once == {file.name: file.read_bytes() for file in source.iterdir()}
        assert once != before_state
    except ValueError:
        assert mode != 'repeat'
        assert before_state == {file.name: file.read_bytes() for file in source.iterdir()}
    print('control passed: ' + mode)
`;
      const result = spawnSync("python3", ["-c", control, ROOT, mode], {
        encoding: "utf8",
        timeout: 10_000,
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
      });
      expect(result.status).toBe(0);
      expect(result.stderr).toBe("");
      expect(result.stdout).toContain(`control passed: ${mode}`);
    },
  );
});
