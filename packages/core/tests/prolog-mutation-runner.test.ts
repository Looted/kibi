/// <reference types="bun-types" />

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
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

function runMutation(cwd: string, args: string[], env: NodeJS.ProcessEnv = {}) {
  const { MUTALOG_HOME: _ignored, ...base } = process.env;
  return spawnSync("swipl", [runnerPath, ...args], {
    cwd,
    encoding: "utf8",
    env: { ...base, ...env },
  });
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
      "name(mutalog).\nversion('0.1.2').\ntitle('Mutalog stub').\n",
      "utf8",
    );

    const result = runMutation(cwd, ["list"]);

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
    expect(result.stdout).toContain("stub pack [list]");
    expect(result.stderr).not.toContain("Installing Mutalog");
  });
});
