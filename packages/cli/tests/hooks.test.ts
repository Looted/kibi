// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "./helpers/isolated-env.js";

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
    expect(content).toContain('"$KIBI_BIN" sync');
    expect(content).toContain("KIBI_BIN=");
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
    expect(content).toContain('"$KIBI_BIN" check --staged');
    expect(content).toContain("KIBI_BIN=");
    expect(content).toContain("Hard enforcement boundary");
    expect(content).toContain(".kb/symbols.yaml");
    expect(content).toContain("kibi sync --refresh-symbol-coordinates");
  });

  it("should resolve a locally installed kibi when node_modules/.bin is off PATH", () => {
    // Git does not put node_modules/.bin on the hook's PATH, so a project-local
    // dependency must still resolve via the hook's walk-up from the repo root.
    const binDir = path.join(tmpDir, "node_modules/.bin");
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      path.join(binDir, "kibi"),
      "#!/bin/sh\nprintf '%s\\n' \"$*\" > .kibi-hook-stub-args\ntouch .kibi-hook-stub\n",
      { mode: 0o755 },
    );

    const hookPath = path.join(tmpDir, ".git/hooks/pre-commit");
    execSync(hookPath, {
      cwd: tmpDir,
      env: { PATH: "/usr/bin:/bin" },
      stdio: "pipe",
    });

    expect(fs.existsSync(path.join(tmpDir, ".kibi-hook-stub"))).toBe(true);
    expect(
      fs.readFileSync(path.join(tmpDir, ".kibi-hook-stub-args"), "utf-8"),
    ).toContain("check --staged");
  });

  it("should resolve kibi from a parent directory node_modules (monorepo layout)", () => {
    const appDir = path.join(tmpDir, "app");
    fs.mkdirSync(appDir);
    execSync("git init -b main", { cwd: appDir });
    const kibiBin = path.resolve(__dirname, "../bin/kibi");
    execSync(`bun ${kibiBin} init`, { cwd: appDir, stdio: "pipe" });

    // kibi is installed in the workspace root, not in the git repository.
    const binDir = path.join(tmpDir, "node_modules/.bin");
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      path.join(binDir, "kibi"),
      "#!/bin/sh\ntouch .kibi-hook-stub\n",
      { mode: 0o755 },
    );

    const hookPath = path.join(appDir, ".git/hooks/pre-commit");
    execSync(hookPath, {
      cwd: appDir,
      env: { PATH: "/usr/bin:/bin" },
      stdio: "pipe",
    });

    expect(fs.existsSync(path.join(appDir, ".kibi-hook-stub"))).toBe(true);
  });

  it("should fail with remediation guidance when kibi cannot be resolved", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/pre-commit");
    expect(() =>
      execSync(hookPath, {
        cwd: tmpDir,
        env: { PATH: "/usr/bin:/bin" },
        stdio: "pipe",
      }),
    ).toThrow(/cannot locate the kibi CLI/);
  });

  it("should install post-merge hook that refreshes merge assumptions", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-merge");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain('"$KIBI_BIN" sync');
    expect(content).toContain("Refresh KB state after merge");
  });

  it("should install post-checkout hook (duplicate check - verifies content)", () => {
    const hookPath = path.join(tmpDir, ".git/hooks/post-checkout");
    expect(fs.existsSync(hookPath)).toBe(true);
    const stats = fs.statSync(hookPath);
    expect((stats.mode & 0o111) !== 0).toBe(true);
    const content = fs.readFileSync(hookPath, "utf-8");
    expect(content).toContain('"$KIBI_BIN" sync');
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
    expect(content).toContain('"$KIBI_BIN" sync');
    expect(content).toContain("post-rewrite hook for kibi");
    // Must NOT refresh symbol coordinates in automatic hook contexts
    expect(content).not.toContain("--refresh-symbol-coordinates");
  });
});
