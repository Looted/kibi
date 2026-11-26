// Unit controls for scripts/swipl-windows-repack.py (executable_for
// TEST-prolog-bundled-release). The PE fixtures are synthetic byte buffers
// built here in TypeScript; no network and no Windows host are needed.
import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const ROOT = path.join(import.meta.dir, "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "swipl-windows-repack.py");
const PINS = path.join(ROOT, "scripts", "swipl-version.json");
const PINS_JSON = JSON.parse(readFileSync(PINS, "utf8"));

/** Import the repack module in python and evaluate an expression; returns parsed JSON. */
// biome-ignore lint/suspicious/noExplicitAny: loose JSON from the python child
function py(expr: string): any {
  const wrapped = [
    "import importlib.util, json, sys",
    `spec = importlib.util.spec_from_file_location("repack", ${JSON.stringify(SCRIPT)})`,
    "m = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(m)",
    `print(json.dumps(${expr}))`,
  ].join("\n");
  const r = spawnSync("python3", ["-c", wrapped], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(r.stdout);
}

/** Same, but returns the ValueError text (empty string when nothing was raised). */
function pyError(expr: string): string {
  const wrapped = [
    "import importlib.util, sys",
    `spec = importlib.util.spec_from_file_location("repack", ${JSON.stringify(SCRIPT)})`,
    "m = importlib.util.module_from_spec(spec)",
    "spec.loader.exec_module(m)",
    "try:",
    `    ${expr}`,
    "except ValueError as e:",
    '    print("VALUEERROR:", e)',
  ].join("\n");
  const r = spawnSync("python3", ["-c", wrapped], { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr);
  return r.stdout.trim();
}

/** Minimal synthetic PE32+ image with the given machine field and import DLL names. */
function syntheticPe(machine: number, imports: string[]): string {
  const eLfanew = 0x80;
  const optSize = 240;
  const numSections = 1;
  const secOff = eLfanew + 24 + optSize;
  const rawptr = 0x400;
  const rawsize = 0x200;
  const vaddr = 0x1000;
  const vsize = 0x1000;
  const data = Buffer.alloc(rawptr + rawsize);
  data.write("MZ", 0, "latin1");
  data.writeUInt32LE(eLfanew, 0x3c);
  data.write("PE\0\0", eLfanew, "latin1");
  data.writeUInt16LE(machine, eLfanew + 4);
  data.writeUInt16LE(numSections, eLfanew + 6);
  data.writeUInt16LE(optSize, eLfanew + 20);
  const opt = eLfanew + 24;
  data.writeUInt16LE(0x20b, opt); // PE32+
  data.writeUInt32LE(imports.length ? 0x1000 : 0, opt + 112 + 8); // data directory[1]
  data.write(".rdata\0", secOff, "latin1");
  data.writeUInt32LE(vsize, secOff + 8);
  data.writeUInt32LE(vaddr, secOff + 12);
  data.writeUInt32LE(rawsize, secOff + 16);
  data.writeUInt32LE(rawptr, secOff + 20);
  if (imports.length) {
    let off = rawptr;
    imports.forEach((name, i) => {
      const nameRva = 0x1000 + 0x80 + i * 0x20;
      data.writeUInt32LE(nameRva, off + 12); // IMAGE_IMPORT_DESCRIPTOR.Name
      off += 20;
    });
    off += 0; // terminator descriptor is already zeroed
    let noff = rawptr + 0x80;
    for (const name of imports) {
      data.write(name, noff, "latin1");
      data[noff + name.length] = 0;
      noff += 0x20;
    }
  }
  return data.toString("hex");
}

describe("repack pin validation", () => {
  test("verify-config accepts the committed pins", () => {
    const r = spawnSync(
      "python3",
      [SCRIPT, "verify-config", "--manifest", PINS],
      { encoding: "utf8" },
    );
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.target).toBe("win32-x64");
    expect(out.version).toBe("10.0.2");
    expect(out.trimDirs).toBe(9);
    expect(out.trimFiles).toBe(40);
    expect(out.requiredLibraries).toContain("semweb/rdf_persistency");
  });

  test("rejects malformed prebuilt blocks before any download", () => {
    const prebuilt = PINS_JSON.prebuilt["win32-x64"];
    const cases: Array<[string, unknown]> = [
      ["missing installer", { ...prebuilt, installer: undefined }],
      [
        "http installer url",
        { ...prebuilt, installer: { url: "http://x", sha256: "0".repeat(64) } },
      ],
      [
        "bad installer sha",
        { ...prebuilt, installer: { url: "https://x", sha256: "zz" } },
      ],
      [
        "unsafe trim path",
        { ...prebuilt, trim: { dirs: ["../doc"], files: [] } },
      ],
      ["non-list trim", { ...prebuilt, trim: { dirs: "doc", files: [] } }],
      [
        "bad license pin",
        {
          ...prebuilt,
          licenseSources: {
            gmp: { url: "https://x", sha256: "nope", member: "m", name: "n" },
          },
        },
      ],
    ];
    for (const [label, value] of cases) {
      const err = pyError(
        `m.validate_prebuilt(${JSON.stringify(PINS_JSON)}, ${JSON.stringify(value)})`,
      );
      expect(err, label).toContain("VALUEERROR:");
    }
  });
});

describe("PE audit", () => {
  test("reads the machine field and import names of a synthetic PE32+", () => {
    const hex = syntheticPe(0x8664, ["KERNEL32.dll", "libswipl.dll"]);
    expect(py(`m.pe_machine(bytes.fromhex(${JSON.stringify(hex)}))`)).toBe(
      0x8664,
    );
    expect(py(`m.pe_imports(bytes.fromhex(${JSON.stringify(hex)}))`)).toEqual([
      "KERNEL32.dll",
      "libswipl.dll",
    ]);
  });

  test("rejects non-PE bytes and reports other machines", () => {
    expect(pyError(`m.pe_machine(b"not a pe")`)).toContain("VALUEERROR:");
    const hex = syntheticPe(0xaa64, []);
    expect(py(`m.pe_machine(bytes.fromhex(${JSON.stringify(hex)}))`)).toBe(
      0xaa64,
    );
  });

  test("audit_payload flags wrong machine and non-system imports, passes a clean tree", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "repack-audit-"));
    try {
      const bin = path.join(dir, "bin");
      mkdirSync(bin);
      writeFileSync(
        path.join(bin, "libswipl.dll"),
        Buffer.from(
          syntheticPe(0x8664, ["KERNEL32.dll", "libgmp-10.dll"]),
          "hex",
        ),
      );
      writeFileSync(
        path.join(bin, "libgmp-10.dll"),
        Buffer.from(
          syntheticPe(0x8664, ["api-ms-win-core-console-l1-1-0.dll"]),
          "hex",
        ),
      );
      writeFileSync(
        path.join(bin, "evil.dll"),
        Buffer.from(syntheticPe(0x8664, ["evilcore.dll"]), "hex"),
      );
      writeFileSync(
        path.join(bin, "arm.exe"),
        Buffer.from(syntheticPe(0xaa64, []), "hex"),
      );
      const problems: string[] = py(
        `m.audit_payload(__import__("pathlib").Path(${JSON.stringify(dir)}))`,
      );
      expect(
        problems.some(
          (p) => p.includes("evil.dll") && p.includes("evilcore.dll"),
        ),
      ).toBe(true);
      expect(
        problems.some((p) => p.includes("arm.exe") && p.includes("x86-64")),
      ).toBe(true);
      expect(problems.filter((p) => p.includes("libswipl.dll"))).toHaveLength(
        0,
      );
      expect(problems.filter((p) => p.includes("libgmp-10.dll"))).toHaveLength(
        0,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe("trim and archive", () => {
  test("apply_trim fails when a pinned path is missing (upstream layout change)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "repack-trim-"));
    try {
      mkdirSync(path.join(dir, "doc"));
      const err = pyError(
        `m.apply_trim(__import__("pathlib").Path(${JSON.stringify(dir)}), {"dirs": ["doc", "xpce"], "files": []})`,
      );
      expect(err).toContain("trim dir does not exist");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("write_archive packs regular files only, 0755 on .exe/.dll, with a sidecar", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "repack-tar-"));
    try {
      const prefix = path.join(dir, "pkg");
      mkdirSync(path.join(prefix, "lib", "swipl", "bin"), { recursive: true });
      mkdirSync(path.join(prefix, "licenses"));
      writeFileSync(
        path.join(prefix, "lib", "swipl", "bin", "swipl.exe"),
        Buffer.from(syntheticPe(0x8664, ["KERNEL32.dll"]), "hex"),
      );
      writeFileSync(
        path.join(prefix, "lib", "swipl", "bin", "libswipl.dll"),
        Buffer.from(syntheticPe(0x8664, []), "hex"),
      );
      writeFileSync(path.join(prefix, "lib", "swipl", "boot.prc"), "boot");
      writeFileSync(
        path.join(prefix, "licenses", "swi-prolog-LICENSE.txt"),
        "bsd",
      );
      writeFileSync(path.join(prefix, "build-manifest.json"), "{}");
      const archiveName: string = py(
        `m.write_archive(__import__("pathlib").Path(${JSON.stringify(prefix)}), ${JSON.stringify(PINS_JSON)}, __import__("pathlib").Path(${JSON.stringify(dir)})).name`,
      );
      const archive = path.join(dir, archiveName);
      expect(archiveName).toBe("swipl-10.0.2-win32-x64.tar.gz");
      const sidecar = readFileSync(`${archive}.sha256`, "utf8");
      expect(sidecar).toBe(
        `${createHash("sha256").update(readFileSync(archive)).digest("hex")}  ${archiveName}\n`,
      );
      const listing = execFileSync("tar", ["--force-local", "-tvzf", archive], {
        encoding: "utf8",
      });
      expect(listing).toContain("lib/swipl/bin/swipl.exe");
      expect(listing).toContain("build-manifest.json");
      for (const line of listing.split("\n")) {
        if (line.endsWith("swipl.exe") || line.endsWith("libswipl.dll")) {
          expect(line.startsWith("-rwxr-xr-x")).toBe(true);
        } else if (
          line.includes("boot.prc") ||
          line.includes("LICENSE") ||
          line.includes("build-manifest")
        ) {
          expect(line.startsWith("-rw-r--r--")).toBe(true);
        }
        expect(line.startsWith("l")).toBe(false); // no symlinks
      }
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("verify_archive_files rejects a wrong name, sidecar or hash", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "repack-ver-"));
    try {
      const good = path.join(dir, "swipl-10.0.2-win32-x64.tar.gz");
      writeFileSync(good, "payload");
      const hash = createHash("sha256").update("payload").digest("hex");
      const sidecar = path.join(dir, "good.sha256");
      writeFileSync(sidecar, `${hash}  swipl-10.0.2-win32-x64.tar.gz\n`);
      expect(
        py(
          `(lambda: (m.verify_archive_files(__import__("pathlib").Path(${JSON.stringify(good)}), __import__("pathlib").Path(${JSON.stringify(sidecar)}), ${JSON.stringify(PINS_JSON)}), "ok"))()[1]`,
        ),
      ).toBe("ok");
      const badName = path.join(dir, "swipl-10.0.2-linux-x64-gnu.tar.gz");
      writeFileSync(badName, "payload");
      expect(
        pyError(
          `m.verify_archive_files(__import__("pathlib").Path(${JSON.stringify(badName)}), __import__("pathlib").Path(${JSON.stringify(sidecar)}), ${JSON.stringify(PINS_JSON)})`,
        ),
      ).toContain("Archive name");
      const badHash = path.join(dir, "bad.sha256");
      writeFileSync(
        badHash,
        `${"0".repeat(64)}  swipl-10.0.2-win32-x64.tar.gz\n`,
      );
      expect(
        pyError(
          `m.verify_archive_files(__import__("pathlib").Path(${JSON.stringify(good)}), __import__("pathlib").Path(${JSON.stringify(badHash)}), ${JSON.stringify(PINS_JSON)})`,
        ),
      ).toContain("SHA-256 mismatch");
      const badSidecar = path.join(dir, "bad2.sha256");
      writeFileSync(badSidecar, "not-a-sidecar\n");
      expect(
        pyError(
          `m.verify_archive_files(__import__("pathlib").Path(${JSON.stringify(good)}), __import__("pathlib").Path(${JSON.stringify(badSidecar)}), ${JSON.stringify(PINS_JSON)})`,
        ),
      ).toContain("sidecar");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("build-archive refuses a target other than win32-x64 and off-runner execution", () => {
    const r2 = spawnSync(
      "python3",
      [
        SCRIPT,
        "build-archive",
        "--target",
        "linux-x64-gnu",
        "--workdir",
        "/tmp/x",
      ],
      { encoding: "utf8" },
    );
    expect(r2.status).toBe(1);
    expect(r2.stderr).toContain("Unsupported repack target");
    const r3 = spawnSync(
      "python3",
      [SCRIPT, "build-archive", "--target", "win32-x64", "--workdir", "/tmp/x"],
      { encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "false" } },
    );
    expect(r3.status).toBe(1);
    expect(r3.stderr).toContain("only in GitHub Actions");
  });

  test("smoke-archive extracts the verified archive, audits it and writes report.json", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "repack-smoke-"));
    try {
      const prefix = path.join(dir, "pkg");
      mkdirSync(path.join(prefix, "lib", "swipl", "bin"), { recursive: true });
      writeFileSync(
        path.join(prefix, "lib", "swipl", "bin", "swipl.exe"),
        Buffer.from(syntheticPe(0x8664, ["KERNEL32.dll"]), "hex"),
      );
      writeFileSync(path.join(prefix, "build-manifest.json"), "{}");
      const archiveName: string = py(
        `m.write_archive(__import__("pathlib").Path(${JSON.stringify(prefix)}), ${JSON.stringify(PINS_JSON)}, __import__("pathlib").Path(${JSON.stringify(dir)})).name`,
      );
      const archive = path.join(dir, archiveName);
      const checksum = `${archive}.sha256`;
      const work = path.join(dir, "smoke");
      // The runner guard and the swipl.exe smoke need a real Windows runner;
      // stub them so the archive handling itself is what this test exercises.
      const driver = [
        "import importlib.util, json, argparse",
        `spec = importlib.util.spec_from_file_location("repack", ${JSON.stringify(SCRIPT)})`,
        "m = importlib.util.module_from_spec(spec)",
        "spec.loader.exec_module(m)",
        "m.require_windows_actions_runner = lambda: None",
        "m.smoke_payload = lambda prefix, manifest, work, report: None",
        `ns = argparse.Namespace(target="win32-x64", manifest=${JSON.stringify(PINS)}, workdir=${JSON.stringify(work)}, archive=${JSON.stringify(archive)}, checksum=${JSON.stringify(checksum)})`,
        "import io, contextlib",
        "buf = io.StringIO()",
        "with contextlib.redirect_stdout(buf):",
        "    m.cmd_smoke_archive(ns)",
        `print(json.dumps(json.load(open(${JSON.stringify(path.join(work, "report.json"))}))))`,
      ].join("\n");
      const run = spawnSync("python3", ["-c", driver], { encoding: "utf8" });
      if (run.status !== 0) throw new Error(run.stderr);
      const report = JSON.parse(run.stdout);
      expect(report.target).toBe("win32-x64");
      expect(report.checks["pe-audit"]).toBe("passed");
      expect(report.checks.smoke).toBe("passed");
      expect(
        existsSync(
          path.join(work, "prefix", "lib", "swipl", "bin", "swipl.exe"),
        ),
      ).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("extract-archive verifies and extracts on any host (no runner guard)", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "repack-extract-"));
    try {
      const prefix = path.join(dir, "pkg");
      mkdirSync(path.join(prefix, "lib", "swipl", "bin"), { recursive: true });
      writeFileSync(
        path.join(prefix, "lib", "swipl", "bin", "swipl.exe"),
        Buffer.from(syntheticPe(0x8664, ["KERNEL32.dll"]), "hex"),
      );
      writeFileSync(path.join(prefix, "build-manifest.json"), "{}");
      const archiveName: string = py(
        `m.write_archive(__import__("pathlib").Path(${JSON.stringify(prefix)}), ${JSON.stringify(PINS_JSON)}, __import__("pathlib").Path(${JSON.stringify(dir)})).name`,
      );
      const archive = path.join(dir, archiveName);
      const run = spawnSync(
        "python3",
        [
          SCRIPT,
          "extract-archive",
          "--target",
          "win32-x64",
          "--archive",
          archive,
          "--checksum",
          `${archive}.sha256`,
          "--workdir",
          path.join(dir, "out"),
        ],
        { encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "false" } },
      );
      expect(run.status).toBe(0);
      const result = JSON.parse(run.stdout.trim().split("\n").pop());
      expect(
        existsSync(
          path.join(result.prefix, "lib", "swipl", "bin", "swipl.exe"),
        ),
      ).toBe(true);
      // A second run into the same workdir must refuse to reuse the destination.
      const again = spawnSync(
        "python3",
        [
          SCRIPT,
          "extract-archive",
          "--target",
          "win32-x64",
          "--archive",
          archive,
          "--checksum",
          `${archive}.sha256`,
          "--workdir",
          path.join(dir, "out"),
        ],
        { encoding: "utf8", env: { ...process.env, GITHUB_ACTIONS: "false" } },
      );
      expect(again.status).toBe(1);
      expect(again.stderr).toContain("Archive destination must be new");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
