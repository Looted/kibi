import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");

function writeStub(binDir: string, name: string, body: string): void {
  const path = join(binDir, name);
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`);
  chmodSync(path, 0o755);
}

describe("CI apt/SWI bootstrap", () => {
  test("bootstrap refreshes Ubuntu indexes before installing extras", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-apt-boot-"));
    try {
      const bin = join(root, "bin");
      const state = join(root, "state");
      mkdirSync(bin, { recursive: true });
      mkdirSync(state, { recursive: true });
      const log = join(state, "commands.log");
      writeStub(
        bin,
        "sudo",
        `if [ "$1" = "timeout" ]; then
  shift
  while [[ "\${1:-}" == --* ]] || [[ "\${1:-}" =~ ^[0-9]+$ ]]; do
    if [[ "\$1" == --kill-after=* ]]; then shift; continue; fi
    if [[ "\$1" == --kill-after ]]; then shift 2; continue; fi
    if [[ "\$1" =~ ^[0-9]+$ ]]; then shift; continue; fi
    break
  done
fi
exec "$@"`,
      );
      writeStub(
        bin,
        "timeout",
        `while [[ "\${1:-}" == --* ]] || [[ "\${1:-}" =~ ^[0-9]+$ ]]; do
  if [[ "\$1" == --kill-after=* ]]; then shift; continue; fi
  if [[ "\$1" == --kill-after ]]; then shift 2; continue; fi
  if [[ "\$1" =~ ^[0-9]+$ ]]; then shift; continue; fi
  break
done
exec "$@"`,
      );
      writeStub(bin, "fuser", "exit 1");
      writeStub(
        bin,
        "apt-get",
        `echo "apt-get $*" >> ${JSON.stringify(log)}
if [ "$1" = "update" ]; then
  touch ${JSON.stringify(join(state, "indexes-fresh"))}
  exit 0
fi
if [ "$1" = "install" ]; then
  if [ ! -f ${JSON.stringify(join(state, "indexes-fresh"))} ]; then
    echo "E: Failed to fetch http://archive.ubuntu.com/ubuntu/pool/main/b/bubblewrap/bubblewrap_0.9.0-1ubuntu0.1_amd64.deb  404 Not Found" >&2
    exit 100
  fi
  echo "installed $*" >> ${JSON.stringify(log)}
  exit 0
fi
exit 1`,
      );
      const result = spawnSync(
        "bash",
        [join(ROOT, "scripts/ci-apt-bootstrap.sh"), "bubblewrap"],
        {
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH ?? ""}`,
            KIBI_CI_APT_ROOT: join(root, "apt-root"),
            KIBI_APT_ATTEMPTS: "1",
            KIBI_APT_TIMEOUT_SECS: "5",
          },
          encoding: "utf8",
        },
      );
      expect(result.status).toBe(0);
      const recorded = readFileSync(log, "utf8");
      const updateAt = recorded.indexOf("apt-get update");
      const installAt = recorded.indexOf("apt-get install -y bubblewrap");
      expect(updateAt).toBeGreaterThanOrEqual(0);
      expect(installAt).toBeGreaterThan(updateAt);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("SWI installer refuses generic extras and never calls apt-add-repository", () => {
    const script = readFileSync(
      join(ROOT, "scripts/ci-install-swi-prolog.sh"),
      "utf8",
    );
    const lib = readFileSync(join(ROOT, "scripts/ci-apt-lib.sh"), "utf8");
    const bootstrap = readFileSync(
      join(ROOT, "scripts/ci-apt-bootstrap.sh"),
      "utf8",
    );
    expect(script).toContain("E8B739E3753FF4A12360BA6A4AB3A5F60EA9AEB3");
    expect(script).toContain("install_swi_from_official_source");
    expect(script).not.toContain("apt-add-repository -y");
    expect(script).toContain('if [ "$#" -gt 0 ]; then');
    expect(script).toContain(
      "ci-install-swi-prolog.sh no longer installs generic Ubuntu packages",
    );
    expect(bootstrap).toContain("bootstrap_ubuntu_packages");
    expect(lib).toContain("refresh_ubuntu_indexes");
    const extras = spawnSync("bash", [
      join(ROOT, "scripts/ci-install-swi-prolog.sh"),
      "bubblewrap",
    ]);
    expect(extras.status).toBe(2);
    expect(`${extras.stdout}${extras.stderr}`).toContain("ci-apt-bootstrap.sh");
  });

  test("SWI installer falls back to official source when the PPA keyserver fails", () => {
    const root = mkdtempSync(join(tmpdir(), "kibi-swi-src-"));
    try {
      const bin = join(root, "bin");
      const state = join(root, "state");
      mkdirSync(bin, { recursive: true });
      mkdirSync(state, { recursive: true });
      const log = join(state, "commands.log");
      writeStub(
        bin,
        "sudo",
        `if [ "$1" = "timeout" ]; then
  shift
  while [[ "\${1:-}" == --* ]] || [[ "\${1:-}" =~ ^[0-9]+$ ]]; do
    if [[ "\$1" == --kill-after=* ]]; then shift; continue; fi
    if [[ "\$1" == --kill-after ]]; then shift 2; continue; fi
    if [[ "\$1" =~ ^[0-9]+$ ]]; then shift; continue; fi
    break
  done
fi
exec "$@"`,
      );
      writeStub(
        bin,
        "timeout",
        `while [[ "\${1:-}" == --* ]] || [[ "\${1:-}" =~ ^[0-9]+$ ]]; do
  if [[ "\$1" == --kill-after=* ]]; then shift; continue; fi
  if [[ "\$1" == --kill-after ]]; then shift 2; continue; fi
  if [[ "\$1" =~ ^[0-9]+$ ]]; then shift; continue; fi
  break
done
exec "$@"`,
      );
      writeStub(bin, "fuser", "exit 1");
      writeStub(bin, "nproc", "echo 1");
      writeStub(bin, "tee", "cat >/dev/null");
      writeStub(
        bin,
        "curl",
        `echo "curl $*" >> ${JSON.stringify(log)}
exit 22`,
      );
      writeStub(
        bin,
        "apt-get",
        `echo "apt-get $*" >> ${JSON.stringify(log)}
if [ "$1" = "update" ]; then exit 0; fi
if [ "$1" = "install" ]; then exit 0; fi
exit 1`,
      );
      writeStub(
        bin,
        "cmake",
        `echo "cmake $*" >> ${JSON.stringify(log)}
if [ "$1" = "--build" ] || [ "$1" = "--install" ] || [ "$1" = "-S" ]; then exit 0; fi
exit 0`,
      );
      writeStub(
        bin,
        "sha256sum",
        `echo "sha256sum $*" >> ${JSON.stringify(log)}
exit 0`,
      );
      writeStub(
        bin,
        "tar",
        `echo "tar $*" >> ${JSON.stringify(log)}
mkdir -p "\$3/swipl-10.0.2"
exit 0`,
      );
      writeStub(
        bin,
        "swipl",
        `if [ "\$1" = "--version" ]; then echo "SWI-Prolog 10.0.2"; exit 0; fi
if [[ "$*" == *prolog_coverage* ]]; then
  if [ -f ${JSON.stringify(join(state, "coverage-ok"))} ]; then exit 0; fi
  exit 1
fi
exit 0`,
      );
      const first = spawnSync(
        "bash",
        [join(ROOT, "scripts/ci-install-swi-prolog.sh")],
        {
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH ?? ""}`,
            KIBI_CI_APT_ROOT: join(root, "apt-root"),
            KIBI_APT_ATTEMPTS: "1",
            KIBI_SWIPL_SRC_SHA256: "deadbeef",
          },
          encoding: "utf8",
        },
      );
      expect(first.status).not.toBe(0);
      expect(`${first.stdout}${first.stderr}`).toContain("PPA");

      writeFileSync(join(state, "coverage-ok"), "1");
      writeStub(bin, "sha256sum", "exit 0");
      const second = spawnSync(
        "bash",
        [join(ROOT, "scripts/ci-install-swi-prolog.sh")],
        {
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH ?? ""}`,
            KIBI_CI_APT_ROOT: join(root, "apt-root"),
            KIBI_APT_ATTEMPTS: "1",
          },
          encoding: "utf8",
        },
      );
      const recorded = readFileSync(log, "utf8");
      expect(recorded).toContain("apt-get update");
      expect(recorded).toContain("cmake");
      expect(
        second.status === 0 ||
          `${second.stderr}${second.stdout}`.includes(
            "library(prolog_coverage)",
          ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
