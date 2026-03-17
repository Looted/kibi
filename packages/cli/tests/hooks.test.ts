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

  it("should install post-checkout hook (duplicate check - verifies content)", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi sync");
  });

  it("should update existing hook with partial kibi content", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");

    // Simulate the regression: hook exists with partial kibi content
    // (like what users had after broken init or manual edits)
    fs.writeFileSync(hookPath, "#!/bin/sh\nkibi sync\n", { mode: 0o755 });

    // Re-run init to trigger reinstallation
    const kibiBin = path.resolve(__dirname, "../bin/kibi");
    execSync(`bun ${kibiBin} init`, { cwd: tmpDir, stdio: "inherit" });

    // Should be UPDATED with full branch logic, not skipped
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain("kibi branch ensure");
    expect(content).toMatch(/branch_flag is 1 for branch checkout/);
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
});
