import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { branchEnsureCommand } from "../../src/commands/branch.js";
import { loadConfig } from "../../src/utils/config.js";

describe("kibi branch ensure", () => {
  const TEST_TIMEOUT_MS = 15000;
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-branch-"));
    process.chdir(tmpDir);

    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync("git config user.email 'test@test.com'", { cwd: tmpDir });
    execSync("git config user.name 'Test User'", { cwd: tmpDir });
    execSync("git checkout -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });

    mkdirSync(path.join(tmpDir, ".kb/branches"), { recursive: true });
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test(
    "creates branch KB from --from when source exists",
    async () => {
      const sourceBranch = "feature-src";
      const targetBranch = "feature-target";

      mkdirSync(path.join(tmpDir, ".kb/branches", sourceBranch), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", sourceBranch, "kb.rdf"),
        "test rdf content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({ from: sourceBranch });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "falls back to default branch when --from is missing",
    async () => {
      const targetBranch = "feature-branch";

      mkdirSync(path.join(tmpDir, ".kb/branches", "main"), { recursive: true });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "main", "kb.rdf"),
        "main rdf content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({});

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "falls back to default branch when --from KB does not exist",
    async () => {
      const targetBranch = "feature-branch";

      mkdirSync(path.join(tmpDir, ".kb/branches", "main"), { recursive: true });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "main", "kb.rdf"),
        "main rdf content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({ from: "nonexistent-branch" });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "creates empty schema when neither --from nor default branch KB exists",
    async () => {
      const targetBranch = "feature-branch";

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({});

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "rejects invalid --from branch name",
    async () => {
      const targetBranch = "feature-branch";

      mkdirSync(path.join(tmpDir, ".kb/branches", "main"), { recursive: true });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "main", "kb.rdf"),
        "main rdf content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({ from: "../etc/passwd" });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "rejects decorated --from branch name (refs/heads/)",
    async () => {
      const targetBranch = "feature-branch";

      mkdirSync(path.join(tmpDir, ".kb/branches", "main"), { recursive: true });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "main", "kb.rdf"),
        "main rdf content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({ from: "refs/heads/main" });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(targetPath)).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(true);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "does nothing when branch KB already exists",
    async () => {
      const existingBranch = "feature-branch";

      mkdirSync(path.join(tmpDir, ".kb/branches", existingBranch), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", existingBranch, "existing.rdf"),
        "existing content",
      );

      execSync(`git checkout -b ${existingBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({ from: "other-branch" });

      const targetPath = path.join(tmpDir, ".kb/branches", existingBranch);
      expect(existsSync(path.join(targetPath, "existing.rdf"))).toBe(true);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "uses configured defaultBranch over origin/HEAD",
    async () => {
      const targetBranch = "feature-branch";

      writeFileSync(
        path.join(tmpDir, ".kb/config.json"),
        JSON.stringify({ defaultBranch: "develop" }),
      );

      mkdirSync(path.join(tmpDir, ".kb/branches", "develop"), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "develop", "develop.rdf"),
        "develop content",
      );

      mkdirSync(path.join(tmpDir, ".kb/branches", "main"), { recursive: true });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "main", "main.rdf"),
        "main content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({});

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(path.join(targetPath, "develop.rdf"))).toBe(true);
      expect(existsSync(path.join(targetPath, "main.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "excludes volatile artifacts when copying",
    async () => {
      const sourceBranch = "feature-src";
      const targetBranch = "feature-target";

      mkdirSync(path.join(tmpDir, ".kb/branches", sourceBranch), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", sourceBranch, "kb.rdf"),
        "rdf content",
      );
      writeFileSync(
        path.join(tmpDir, ".kb/branches", sourceBranch, "sync-cache.json"),
        "cache content",
      );
      writeFileSync(
        path.join(tmpDir, ".kb/branches", sourceBranch, "audit.log"),
        "audit content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({ from: sourceBranch });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(path.join(targetPath, "kb.rdf"))).toBe(true);
      expect(existsSync(path.join(targetPath, "sync-cache.json"))).toBe(false);
      expect(existsSync(path.join(targetPath, "audit.log"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );

  test(
    "prefers --from over default branch when both exist",
    async () => {
      const fromBranch = "custom-source";
      const targetBranch = "feature-target";

      mkdirSync(path.join(tmpDir, ".kb/branches", fromBranch), {
        recursive: true,
      });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", fromBranch, "custom.rdf"),
        "custom content",
      );

      mkdirSync(path.join(tmpDir, ".kb/branches", "main"), { recursive: true });
      writeFileSync(
        path.join(tmpDir, ".kb/branches", "main", "main.rdf"),
        "main content",
      );

      execSync(`git checkout -b ${targetBranch}`, {
        cwd: tmpDir,
        stdio: "pipe",
      });

      await branchEnsureCommand({ from: fromBranch });

      const targetPath = path.join(tmpDir, ".kb/branches", targetBranch);
      expect(existsSync(path.join(targetPath, "custom.rdf"))).toBe(true);
      expect(existsSync(path.join(targetPath, "main.rdf"))).toBe(false);
    },
    TEST_TIMEOUT_MS,
  );
});
