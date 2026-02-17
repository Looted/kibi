// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("Git hooks", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    execSync("git init", { cwd: tmpDir });
    const kibiBin = path.resolve(__dirname, "../bin/kibi");
    // run init with hooks via bun (match other CLI tests)
    execSync(`bun ${kibiBin} init --hooks`, { cwd: tmpDir, stdio: "inherit" });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("should install post-checkout hook and make it executable", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi sync");
  });

  it("should install post-merge hook and make it executable", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-merge");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi sync");
  });
});
