/// <reference types="bun-types" />

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const importMetaDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(importMetaDir, "../../..");
const runnerPath = path.join(repoRoot, "scripts", "run-prolog-mutation.pl");
const tempDirs: string[] = [];

// Each runner call waits up to RUNNER_TIMEOUT_MS, so a hung run fails with its
// own output instead of a test timeout.
const RUNNER_TIMEOUT_MS = 15_000;

// The Mutalog version the runner pins, read from the runner itself so a pin
// bump does not have to touch this test.
const pinnedMutalogVersion =
  /mutalog_version\('([^']+)'\)/.exec(readFileSync(runnerPath, "utf8"))?.[1] ??
  "unknown";

// A stand-in for Mutalog's library(mutalog): its entry point prints where it
// was loaded from and the arguments it received, so a test can tell which
// copy the runner chose without running a real mutation pass.
function stubMutalog(label: string): string {
  return [
    ":- module(mutalog, []).",
    "main :-",
    "    current_prolog_flag(argv, Argv),",
    `    format("stub ~w ~q~n", [${label}, Argv]),`,
    "    halt(0).",
    "",
  ].join("\n");
}

function tempDir(name: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), `kibi-${name}-`));
  tempDirs.push(dir);
  return dir;
}

function writeStub(prologDir: string, label: string) {
  mkdirSync(prologDir, { recursive: true });
  writeFileSync(path.join(prologDir, "mutalog.pl"), stubMutalog(label), "utf8");
}

// The runner's output goes to files, not pipes: on CI runners Bun can miss a
// readiness event on a child's pipe and leave spawnSync blocked after the
// child has exited.
function runMutation(cwd: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const { MUTALOG_HOME: _ignored, ...base } = process.env;
  const outputRoot = tempDir("mutalog-out");
  const stdoutPath = path.join(outputRoot, "stdout");
  const stderrPath = path.join(outputRoot, "stderr");
  const stdoutFd = openSync(stdoutPath, "w");
  const stderrFd = openSync(stderrPath, "w");
  let status: number | null;
  try {
    status = spawnSync("swipl", [runnerPath, ...args], {
      cwd,
      env: { ...base, ...env },
      stdio: ["ignore", stdoutFd, stderrFd],
      timeout: RUNNER_TIMEOUT_MS,
    }).status;
  } finally {
    closeSync(stdoutFd);
    closeSync(stderrFd);
  }
  return {
    status,
    stdout: readFileSync(stdoutPath, "utf8"),
    stderr: readFileSync(stderrPath, "utf8"),
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe("run-prolog-mutation.pl", () => {
  test("runs the Mutalog checkout named by MUTALOG_HOME with the given arguments", () => {
    const home = tempDir("mutalog-home");
    writeStub(path.join(home, "prolog"), "home");
    const cwd = tempDir("mutalog-cwd");

    const result = runMutation(cwd, ["run", "--only", "a.pl:1:1:arith:1"], {
      MUTALOG_HOME: home,
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain(
      "stub home [run,'--only','a.pl:1:1:arith:1']",
    );
    expect(result.stderr).not.toContain("Installing Mutalog");
    expect(
      existsSync(path.join(cwd, ".cache", "prolog-packs", "mutalog")),
    ).toBe(false);
  });

  test("uses the pinned Mutalog pack already installed under .cache/prolog-packs", () => {
    const cwd = tempDir("mutalog-pack");
    const packDir = path.join(cwd, ".cache", "prolog-packs", "mutalog");
    writeStub(path.join(packDir, "prolog"), "pack");
    writeFileSync(
      path.join(packDir, "pack.pl"),
      "name(mutalog).\nversion('0.3.2').\ntitle('Mutalog stub').\n",
      "utf8",
    );

    const result = runMutation(cwd, ["list"]);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("stub pack [list]");
    expect(result.stderr).not.toContain("Installing Mutalog");
  });

  test("refuses to run a cached Mutalog pack whose version is not the pinned one", () => {
    const cwd = tempDir("mutalog-stale");
    const packDir = path.join(cwd, ".cache", "prolog-packs", "mutalog");
    writeStub(path.join(packDir, "prolog"), "stale");
    writeFileSync(
      path.join(packDir, "pack.pl"),
      "name(mutalog).\nversion('0.0.1').\ntitle('Mutalog stub').\n",
      "utf8",
    );
    // A curl that always fails stands in for the download, so the test needs
    // no network and the runner cannot fall back to the stale copy.
    const bin = tempDir("mutalog-bin");
    const fakeCurl = path.join(bin, "curl");
    writeFileSync(fakeCurl, "#!/bin/sh\nexit 22\n", { mode: 0o755 });

    const result = runMutation(cwd, ["list"], {
      PATH: `${bin}${path.delimiter}${process.env.PATH ?? ""}`,
    });

    expect(result.status, `${result.stdout}\n${result.stderr}`).not.toBe(0);
    expect(result.stderr).toContain(
      `Installing Mutalog ${pinnedMutalogVersion}`,
    );
    expect(result.stdout).not.toContain("stub stale");
  });
});
