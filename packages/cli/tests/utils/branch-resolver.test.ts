import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  type BranchErrorCode,
  copyCleanSnapshot,
  getBranchDiagnostic,
  getVolatileArtifactPatterns,
  isDetachedHead,
  isValidBranchName,
  resolveActiveBranch,
  resolveDefaultBranch,
} from "../../src/utils/branch-resolver";

describe("branch-resolver", () => {
  let tmpDir: string;
  const originalEnv = process.env.KIBI_BRANCH;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-branch-resolver-"));
    process.env.KIBI_BRANCH = "";
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
    if (originalEnv !== undefined) {
      process.env.KIBI_BRANCH = originalEnv;
    } else {
      process.env.KIBI_BRANCH = "";
    }
  });

  describe("resolveActiveBranch", () => {
    test("returns branch from KIBI_BRANCH env var when set", () => {
      process.env.KIBI_BRANCH = "env-branch";

      const result = resolveActiveBranch(tmpDir);

      expect("branch" in result).toBe(true);
      expect((result as { branch: string }).branch).toBe("env-branch");
    });

    test("returns error for invalid KIBI_BRANCH value", () => {
      process.env.KIBI_BRANCH = "../etc/passwd";

      const result = resolveActiveBranch(tmpDir);

      expect("error" in result).toBe(true);
      expect((result as { error: string; code: BranchErrorCode }).code).toBe(
        "ENV_OVERRIDE",
      );
    });

    test("returns current git branch when KIBI_BRANCH not set", () => {
      execSync("git init", { cwd: tmpDir });
      execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
      execSync("git config user.name 'Test User'", { cwd: tmpDir });
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
      execSync("git checkout -b test-branch", { cwd: tmpDir });

      const result = resolveActiveBranch(tmpDir);

      expect("branch" in result).toBe(true);
      expect((result as { branch: string }).branch).toBe("test-branch");
    });

    test("returns DETACHED_HEAD error in detached HEAD state", () => {
      execSync("git init", { cwd: tmpDir });
      execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
      execSync("git config user.name 'Test User'", { cwd: tmpDir });
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
      // Create a commit and checkout it directly (detached HEAD)
      const commitHash = execSync("git rev-parse HEAD", {
        cwd: tmpDir,
        encoding: "utf8",
      }).trim();
      execSync(`git checkout ${commitHash}`, { cwd: tmpDir });

      const result = resolveActiveBranch(tmpDir);

      expect("error" in result).toBe(true);
      expect((result as { error: string; code: BranchErrorCode }).code).toBe(
        "DETACHED_HEAD",
      );
    });

    test("returns NOT_A_GIT_REPO error when not in git repo", () => {
      const result = resolveActiveBranch(tmpDir);

      expect("error" in result).toBe(true);
      expect((result as { error: string; code: BranchErrorCode }).code).toBe(
        "NOT_A_GIT_REPO",
      );
    });

    test("returns branch using git rev-parse when branch --show-current fails", () => {
      execSync("git init", { cwd: tmpDir });
      execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
      execSync("git config user.name 'Test User'", { cwd: tmpDir });
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
      execSync("git checkout -b feature/test", { cwd: tmpDir });

      const result = resolveActiveBranch(tmpDir);

      expect("branch" in result).toBe(true);
      expect((result as { branch: string }).branch).toBe("feature/test");
    });
  });

  describe("isDetachedHead", () => {
    test("returns true in detached HEAD state", () => {
      execSync("git init", { cwd: tmpDir });
      execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
      execSync("git config user.name 'Test User'", { cwd: tmpDir });
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
      const commitHash = execSync("git rev-parse HEAD", {
        cwd: tmpDir,
        encoding: "utf8",
      }).trim();
      execSync(`git checkout ${commitHash}`, { cwd: tmpDir });

      expect(isDetachedHead(tmpDir)).toBe(true);
    });

    test("returns false when on a branch", () => {
      execSync("git init", { cwd: tmpDir });
      execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
      execSync("git config user.name 'Test User'", { cwd: tmpDir });
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

      expect(isDetachedHead(tmpDir)).toBe(false);
    });

    test("returns true when not in git repo", () => {
      expect(isDetachedHead(tmpDir)).toBe(true);
    });
  });

  describe("isValidBranchName", () => {
    test("accepts valid branch names", () => {
      expect(isValidBranchName("main")).toBe(true);
      expect(isValidBranchName("develop")).toBe(true);
      expect(isValidBranchName("feature/test")).toBe(true);
      expect(isValidBranchName("bugfix-123")).toBe(true);
      expect(isValidBranchName("release/v1.0.0")).toBe(true);
      expect(isValidBranchName("hotfix_2024")).toBe(true);
    });

    test("rejects empty branch names", () => {
      expect(isValidBranchName("")).toBe(false);
    });

    test("rejects path traversal attempts", () => {
      expect(isValidBranchName("../etc/passwd")).toBe(false);
      expect(isValidBranchName("..")).toBe(false);
      expect(isValidBranchName("foo/../bar")).toBe(false);
    });

    test("rejects absolute paths", () => {
      expect(isValidBranchName("/etc/passwd")).toBe(false);
      expect(isValidBranchName("/main")).toBe(false);
    });

    test("revents backslash in branch names", () => {
      expect(isValidBranchName("foo\\bar")).toBe(false);
    });

    test("rejects double slashes", () => {
      expect(isValidBranchName("feature//test")).toBe(false);
    });

    test("rejects trailing slashes", () => {
      expect(isValidBranchName("feature/test/")).toBe(false);
    });

    test("rejects trailing dots", () => {
      expect(isValidBranchName("feature.test.")).toBe(false);
    });

    test("rejects names starting with dash", () => {
      expect(isValidBranchName("-malicious")).toBe(false);
    });

    test("rejects too long names", () => {
      expect(isValidBranchName("a".repeat(256))).toBe(false);
    });

    test("rejects invalid characters", () => {
      expect(isValidBranchName("feature@branch")).toBe(false);
      expect(isValidBranchName("feature#123")).toBe(false);
      expect(isValidBranchName("feature:123")).toBe(false);
      expect(isValidBranchName("feature;123")).toBe(false);
    });
  });

  describe("getBranchDiagnostic", () => {
    test("includes error message in diagnostic", () => {
      const diagnostic = getBranchDiagnostic(undefined, "Test error message");
      expect(diagnostic).toContain("Test error message");
    });

    test("includes branch if provided", () => {
      const diagnostic = getBranchDiagnostic("main", "Some error");
      expect(diagnostic).toContain("main");
    });

    test("includes resolution options", () => {
      const diagnostic = getBranchDiagnostic(undefined, "Error");
      expect(diagnostic).toContain("KIBI_BRANCH");
      expect(diagnostic).toContain("git checkout");
    });
  });

  describe("copyCleanSnapshot", () => {
    test("copies directory structure excluding volatile artifacts", () => {
      const sourceDir = path.join(tmpDir, "source");
      const targetDir = path.join(tmpDir, "target");

      mkdirSync(sourceDir, { recursive: true });
      mkdirSync(path.join(sourceDir, "subdir"), { recursive: true });

      // Create non-volatile files
      writeFileSync(path.join(sourceDir, "kb.rdf"), "test content");
      writeFileSync(path.join(sourceDir, "config.json"), "{}");
      writeFileSync(path.join(sourceDir, "subdir", "data.txt"), "data");

      // Create volatile artifacts that should be excluded
      writeFileSync(path.join(sourceDir, "sync-cache.json"), "{}");
      writeFileSync(path.join(sourceDir, "journal.log"), "log");
      writeFileSync(path.join(sourceDir, "lock"), "");
      writeFileSync(path.join(sourceDir, "audit.log"), "");
      writeFileSync(path.join(sourceDir, "temp.tmp"), "");

      copyCleanSnapshot(sourceDir, targetDir);

      // Non-volatile files should exist
      expect(existsSync(path.join(targetDir, "kb.rdf"))).toBe(true);
      expect(existsSync(path.join(targetDir, "config.json"))).toBe(true);
      expect(existsSync(path.join(targetDir, "subdir", "data.txt"))).toBe(true);

      // Volatile artifacts should NOT exist
      expect(existsSync(path.join(targetDir, "sync-cache.json"))).toBe(false);
      expect(existsSync(path.join(targetDir, "journal.log"))).toBe(false);
      expect(existsSync(path.join(targetDir, "lock"))).toBe(false);
      expect(existsSync(path.join(targetDir, "audit.log"))).toBe(false);
      expect(existsSync(path.join(targetDir, "temp.tmp"))).toBe(false);
    });

    test("throws error when source does not exist", () => {
      const sourceDir = path.join(tmpDir, "nonexistent");
      const targetDir = path.join(tmpDir, "target");

      expect(() => copyCleanSnapshot(sourceDir, targetDir)).toThrow(
        "Source branch KB does not exist",
      );
    });

    test("excludes journal files with timestamps", () => {
      const sourceDir = path.join(tmpDir, "source");
      const targetDir = path.join(tmpDir, "target");

      mkdirSync(sourceDir, { recursive: true });
      writeFileSync(path.join(sourceDir, "journal-2024-01-01.log"), "");
      writeFileSync(path.join(sourceDir, "journal-2024-12-31.log"), "");
      writeFileSync(path.join(sourceDir, "kb.rdf"), "content");

      copyCleanSnapshot(sourceDir, targetDir);

      expect(existsSync(path.join(targetDir, "journal-2024-01-01.log"))).toBe(
        false,
      );
      expect(existsSync(path.join(targetDir, "journal-2024-12-31.log"))).toBe(
        false,
      );
      expect(existsSync(path.join(targetDir, "kb.rdf"))).toBe(true);
    });
  });

  describe("getVolatileArtifactPatterns", () => {
    test("returns array of patterns", () => {
      const patterns = getVolatileArtifactPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns).toContain("sync-cache.json");
      expect(patterns).toContain("*.lock");
      expect(patterns).toContain("journal-*.log");
    });
  });

  describe("resolveDefaultBranch", () => {
    test("returns configured defaultBranch when set", () => {
      const result = resolveDefaultBranch(tmpDir, { defaultBranch: "trunk" });

      expect("branch" in result).toBe(true);
      expect((result as { branch: string }).branch).toBe("trunk");
    });

    test("preserves branch names with slashes", () => {
      const result = resolveDefaultBranch(tmpDir, {
        defaultBranch: "feature/nested/path",
      });

      expect("branch" in result).toBe(true);
      expect((result as { branch: string }).branch).toBe("feature/nested/path");
    });

    test("returns error for invalid configured branch name", () => {
      const result = resolveDefaultBranch(tmpDir, {
        defaultBranch: "../etc/passwd",
      });

      expect("error" in result).toBe(true);
      expect((result as { error: string; code: string }).code).toBe(
        "INVALID_CONFIG",
      );
      expect((result as { error: string; code: string }).error).toContain(
        "Invalid defaultBranch configured",
      );
    });

    test("returns origin/HEAD branch when config not set", () => {
      // Initialize git repo with origin/HEAD
      execSync("git init", { cwd: tmpDir });
      execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
      execSync("git config user.name 'Test User'", { cwd: tmpDir });
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
      execSync("git checkout -b develop", { cwd: tmpDir });
      // Create origin/HEAD pointing to develop
      execSync("git remote add origin .", { cwd: tmpDir });
      execSync(
        "git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/develop",
        {
          cwd: tmpDir,
        },
      );

      const result = resolveDefaultBranch(tmpDir, undefined);

      expect("branch" in result).toBe(true);
      expect((result as { branch: string }).branch).toBe("develop");
    });

    test("returns 'main' fallback when origin/HEAD does not exist", () => {
      // Initialize git repo without origin/HEAD
      execSync("git init", { cwd: tmpDir });
      execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
      execSync("git config user.name 'Test User'", { cwd: tmpDir });
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

      const result = resolveDefaultBranch(tmpDir, undefined);

      expect("branch" in result).toBe(true);
      expect((result as { branch: string }).branch).toBe("main");
    });

    test("returns 'main' fallback when not in a git repo", () => {
      const result = resolveDefaultBranch(tmpDir, undefined);

      expect("branch" in result).toBe(true);
      expect((result as { branch: string }).branch).toBe("main");
    });

    test("handles origin/HEAD with different branch names", () => {
      // Initialize git repo - git init creates 'master' by default
      execSync("git init", { cwd: tmpDir });
      execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
      execSync("git config user.name 'Test User'", { cwd: tmpDir });
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
      // Create origin/HEAD pointing to master (NOT normalized to main)
      execSync("git remote add origin .", { cwd: tmpDir });
      execSync(
        "git symbolic-ref refs/remotes/origin/HEAD refs/remotes/origin/master",
        {
          cwd: tmpDir,
        },
      );

      const result = resolveDefaultBranch(tmpDir, undefined);

      // Should return "master" verbatim, not normalized to "main"
      expect("branch" in result).toBe(true);
      expect((result as { branch: string }).branch).toBe("master");
    });
  });
});
