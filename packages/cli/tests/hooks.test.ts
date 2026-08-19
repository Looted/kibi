// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execSync } from "./helpers/isolated-env.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("Git hooks", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    execSync("git init -b main", { cwd: tmpDir });
    const kibiBin = path.resolve(__dirname, "../bin/kibi");
    // run init (hooks are installed by default)
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "inherit" });
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
    // Branch checkout hooks compile the current checkout; they never clone a
    // previous branch's compiled store.
    expect(content).toMatch(/branch_flag is 1 for branch checkout/);
    expect(content).not.toContain("branch ensure --from");
  });

  it("should install pre-commit hook as the hard enforcement boundary", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/pre-commit");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi check");
    expect(content).toContain("Hard enforcement boundary");
    expect(content).toContain(".kb/symbols.yaml");
    expect(content).toContain("kibi sync --refresh-symbol-coordinates");
  });

  it("should install post-merge hook that refreshes merge assumptions", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-merge");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi sync");
    expect(content).toContain("Refresh KB state after merge");
  });

  it("should install post-checkout hook (duplicate check - verifies content)", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi sync");
  });

  it("should preserve an existing hook with legacy unmanaged content", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    const legacyContent = "#!/bin/sh\nkibi sync\n";

    fs.writeFileSync(hookPath, legacyContent, { mode: 0o755 });

    const kibiBin = path.resolve(__dirname, "../bin/kibi");
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "inherit" });

    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toBe(legacyContent);
  });

  it("should install post-checkout hook without legacy branch-copy sed logic", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).not.toContain("sed 's/\\^.*//'");
  });

  it("should not update hook with full branch logic if already correct", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");

    // Get the current correct content
    const currentContent = fs.readFileSync(hookPath, "utf-8");

    // Re-run init
    const kibiBin = path.resolve(__dirname, "../bin/kibi");
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "inherit" });

    // Content should remain the same (not duplicated or corrupted)
    const newContent = fs.readFileSync(hookPath, "utf-8");
    expect(newContent).toBe(currentContent);
  });

  it("should install post-merge hook without --refresh-symbol-coordinates", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-merge");
    const content = fs.readFileSync(hookPath, "utf-8");
    // Must NOT refresh symbol coordinates in automatic hook contexts
    expect(content).not.toContain("--refresh-symbol-coordinates");
  });

  it("should install post-checkout hook without --refresh-symbol-coordinates", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    const content = fs.readFileSync(hookPath, "utf-8");
    // Must NOT refresh symbol coordinates in automatic hook contexts
    expect(content).not.toContain("--refresh-symbol-coordinates");
  });

  it("should install post-rewrite hook that syncs without coordinate refresh", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-rewrite");
    expect(fs.existsSync(hookPath)).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi sync");
    expect(content).toContain("post-rewrite hook for kibi");
    // Must NOT refresh symbol coordinates in automatic hook contexts
    expect(content).not.toContain("--refresh-symbol-coordinates");
  });
});
