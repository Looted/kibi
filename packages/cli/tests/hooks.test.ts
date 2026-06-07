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
    // Should gate on branch_flag and attempt to resolve old branch (name-rev may be stripped in some builds)
    expect(content).toMatch(/branch_flag is 1 for branch checkout/);
    expect(
      /git name-rev --name-only/.test(content) ||
        /kibi branch ensure --from/.test(content),
    ).toBe(true);
  });

  it("should install pre-commit hook as the hard enforcement boundary", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/pre-commit");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi check");
    expect(content).toContain("Hard enforcement boundary");
    expect(content).toContain("documentation/symbols.yaml");
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

  it("should install post-checkout hook with literal-caret sed expression (not line-anchor)", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    const content = fs.readFileSync(hookPath, "utf-8");
    // The sed expression must strip LITERAL '^' decorations from git name-rev output
    // (e.g. "develop^0" → "develop") so --from is correctly passed to branch ensure.
    // Without the backslash, sed uses '^' as a start-of-line anchor and empties old_branch
    // entirely — causing every new branch to get an empty KB instead of copying from source.
    // In the installed shell script this must read: sed 's/\^.*//'
    expect(content).toContain("sed 's/\\^.*//'");
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
