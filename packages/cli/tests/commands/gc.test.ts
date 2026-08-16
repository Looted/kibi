import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { branchStoreKey } from "../../src/utils/branch-store-locator.js";

const kibiBin = path.resolve(__dirname, "../../bin/kibi");

function runArgs(args: string[], cwd: string) {
  return spawnSync("bun", [kibiBin, ...args], { cwd, encoding: "utf-8" });
}

describe("kibi gc", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-gc-"));
    spawnSync("git", ["init", "-b", "keep-branch"], { cwd: tmpDir });
    spawnSync("git", ["config", "user.email", "test@example.com"], {
      cwd: tmpDir,
    });
    spawnSync("git", ["config", "user.name", "Kibi Test"], { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, "README.md"), "init\n");
    spawnSync("git", ["add", "README.md"], { cwd: tmpDir });
    spawnSync("git", ["commit", "-m", "init"], { cwd: tmpDir });
    fs.mkdirSync(path.join(tmpDir, ".kb/branches/main"), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".kb/branches/old-branch"), {
      recursive: true,
    });
    fs.writeFileSync(path.join(tmpDir, ".kb/branches/main/kb.rdf"), "legacy");
    fs.writeFileSync(
      path.join(tmpDir, ".kb/branches/old-branch/kb.rdf"),
      "legacy",
    );
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  test("dry-run enumerates stale literal stores without deleting", () => {
    const res = runArgs(["gc", "--dry-run"], tmpDir);
    expect(res.status).toBe(0);
    expect(res.stdout).toMatch(/Found 2 stale branch KB/);
    expect(fs.existsSync(path.join(tmpDir, ".kb/branches/old-branch"))).toBe(
      true,
    );
  });

  test("force quarantines stale stores and purge is explicit", () => {
    const res = runArgs(["gc", "--force"], tmpDir);
    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(tmpDir, ".kb/branches/old-branch"))).toBe(
      false,
    );
    const quarantine = path.join(
      tmpDir,
      ".kb/quarantine/branches",
      branchStoreKey("old-branch"),
    );
    expect(fs.existsSync(quarantine)).toBe(true);
    expect(res.stdout).toContain("Quarantined old-branch");

    const purge = runArgs(["gc", "--purge", "--retention-days", "0"], tmpDir);
    expect(purge.status).toBe(0);
    expect(fs.existsSync(quarantine)).toBe(false);
  });

  test("live branch stores are preserved", () => {
    const live = path.join(tmpDir, ".kb/branches/keep-branch");
    fs.mkdirSync(live, { recursive: true });
    fs.writeFileSync(path.join(live, "kb.rdf"), "live");
    const res = runArgs(["gc", "--force"], tmpDir);
    expect(res.status).toBe(0);
    expect(fs.existsSync(live)).toBe(true);
  });
});
