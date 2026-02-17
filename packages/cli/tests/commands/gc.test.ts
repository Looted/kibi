import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const kibiBin = path.resolve(__dirname, "../../bin/kibi");

function runArgs(args: string[], cwd: string) {
  return spawnSync("bun", [kibiBin, ...args], { cwd, encoding: "utf-8" });
}

describe("kibi gc", () => {
  const tmp = path.resolve(__dirname, "tmp-gc");

  beforeEach(() => {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
    fs.mkdirSync(tmp, { recursive: true });
    // init git repo
    spawnSync("git", ["init"], { cwd: tmp });
    fs.writeFileSync(path.join(tmp, "README.md"), "init\n");
    spawnSync("git", ["add", "README.md"], { cwd: tmp });
    spawnSync("git", ["commit", "-m", "init"], { cwd: tmp });
    fs.mkdirSync(path.join(tmp, ".kb/branches"), { recursive: true });
    // create main and stale branch dirs
    fs.mkdirSync(path.join(tmp, ".kb/branches/main"));
    fs.mkdirSync(path.join(tmp, ".kb/branches/old-branch"));
    // create a git branch that matches 'keep-branch'
    spawnSync("git", ["checkout", "-b", "keep-branch"], { cwd: tmp });
  });

  afterEach(() => {
    if (fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  });

  test("dry-run does not delete stale KB", () => {
    const res = runArgs(["gc", "--dry-run"], tmp);
    expect(res.status).toBe(0);
    expect(fs.existsSync(path.join(tmp, ".kb/branches/old-branch"))).toBe(true);
    expect(res.stdout).toMatch(/Found 1 stale branch KB/);
  });

  test("force deletes stale KB", () => {
    const res = runArgs(["gc", "--force"], tmp);
    expect(fs.existsSync(path.join(tmp, ".kb/branches/old-branch"))).toBe(
      false,
    );
    expect(res.stdout).toMatch(/Deleted 1 stale branch KB/);
  });

  test("main is preserved", () => {
    const res = runArgs(["gc", "--force"], tmp);
    expect(fs.existsSync(path.join(tmp, ".kb/branches/main"))).toBe(true);
  });

  test("no stale branches reports zero", () => {
    fs.rmSync(path.join(tmp, ".kb/branches/old-branch"), {
      recursive: true,
      force: true,
    });
    const res = runArgs(["gc", "--dry-run"], tmp);
    expect(res.stdout).toMatch(/Found 0 stale branch KB/);
  });
});
