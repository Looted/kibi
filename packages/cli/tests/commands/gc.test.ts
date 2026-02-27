import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const kibiBin = path.resolve(__dirname, "../../bin/kibi");

function runArgs(args: string[], cwd: string) {
  return spawnSync("bun", [kibiBin, ...args], { cwd, encoding: "utf-8" });
}

describe("kibi gc", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-gc-"));
    // init git repo
    spawnSync("git", ["init"], { cwd: tmpDir });
    spawnSync("git", ["config", "user.email", "test@example.com"], {
      cwd: tmpDir,
    });
    spawnSync("git", ["config", "user.name", "Kibi Test"], { cwd: tmpDir });
    fs.writeFileSync(path.join(tmpDir, "README.md"), "init\n");
    spawnSync("git", ["add", "README.md"], { cwd: tmpDir });
    spawnSync("git", ["commit", "-m", "init"], { cwd: tmpDir });
    fs.mkdirSync(path.join(tmpDir, ".kb/branches"), { recursive: true });
    // create main and stale branch dirs
    fs.mkdirSync(path.join(tmpDir, ".kb/branches/main"));
    fs.mkdirSync(path.join(tmpDir, ".kb/branches/old-branch"));
    // create a git branch that matches 'keep-branch'
    spawnSync("git", ["checkout", "-b", "keep-branch"], { cwd: tmpDir });
    // Create KB branch matching git branch
    fs.mkdirSync(path.join(tmpDir, ".kb/branches/keep-branch"), {
      recursive: true,
    });
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("dry-run does not delete stale KB", () => {
    const res = runArgs(["gc", "--dry-run"], tmpDir);
    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(tmpDir, ".kb/branches/old-branch"))).toBe(
      true,
    );
    expect(res.stdout).toMatch(/Found 1 stale branch KB/);
  });

  test("force deletes stale KB", () => {
    const res = runArgs(["gc", "--force"], tmpDir);
    expect(fs.existsSync(path.join(tmpDir, ".kb/branches/old-branch"))).toBe(
      false,
    );
    expect(res.stdout).toMatch(/Deleted 1 stale branch KB/);
  });

  test("main is preserved", () => {
    const res = runArgs(["gc", "--force"], tmpDir);
    expect(fs.existsSync(path.join(tmpDir, ".kb/branches/main"))).toBe(true);
  });

  test("no stale branches reports zero", () => {
    fs.rmSync(path.join(tmpDir, ".kb/branches/old-branch"), {
      recursive: true,
      force: true,
    });
    const res = runArgs(["gc", "--dry-run"], tmpDir);
    expect(res.stdout).toMatch(/Found 0 stale branch KB/);
  });
});
