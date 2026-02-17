import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { PrologProcess } from "@kibi/cli/src/prolog.js";
import {
  handleKbBranchEnsure,
  handleKbBranchGc,
} from "../../src/tools/branch.js";

describe("MCP Branch Tool Handlers", () => {
  let prolog: PrologProcess;
  let testKbRoot: string;

  beforeAll(async () => {
    testKbRoot = path.join(process.cwd(), ".kb-test-mcp-branch");

    await fs.rm(testKbRoot, { recursive: true, force: true });
    await fs.mkdir(path.join(testKbRoot, ".kb/branches/main"), {
      recursive: true,
    });

    const mainPath = path.join(testKbRoot, ".kb/branches/main");
    await fs.writeFile(path.join(mainPath, "kb.rdf"), "");
    await fs.writeFile(path.join(mainPath, "kb.rdf.lock"), "");
    await fs.mkdir(path.join(mainPath, "journal"), { recursive: true });

    prolog = new PrologProcess();
    await prolog.start();
  });

  afterAll(async () => {
    if (prolog?.isRunning()) {
      await prolog.terminate();
    }

    await fs.rm(testKbRoot, { recursive: true, force: true });
  });

  describe("kb.branch.ensure", () => {
    test("should create new branch KB from main", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      try {
        const result = await handleKbBranchEnsure(prolog, {
          branch: "feature-test",
        });

        expect(result.content[0].text).toContain("Created branch KB");
        expect(result.structuredContent?.created).toBe(true);
        expect(result.structuredContent?.path).toContain("feature-test");

        // Verify directory was created
        const branchPath = path.join(testKbRoot, ".kb/branches/feature-test");
        const exists = await fs
          .access(branchPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);

        // Verify files were copied
        const rdfExists = await fs
          .access(path.join(branchPath, "kb.rdf"))
          .then(() => true)
          .catch(() => false);
        expect(rdfExists).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should return created=false for existing branch", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      try {
        const result = await handleKbBranchEnsure(prolog, {
          branch: "feature-test",
        });

        expect(result.content[0].text).toContain("already exists");
        expect(result.structuredContent?.created).toBe(false);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should reject empty branch name", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      try {
        await expect(
          handleKbBranchEnsure(prolog, { branch: "" }),
        ).rejects.toThrow(/Branch name is required/);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should reject path traversal in branch name", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      try {
        await expect(
          handleKbBranchEnsure(prolog, { branch: "../evil" }),
        ).rejects.toThrow(/Invalid branch name/);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should handle branch names with slashes (feature/xyz)", async () => {
      const originalCwd = process.cwd();
      process.chdir(testKbRoot);

      try {
        const result = await handleKbBranchEnsure(prolog, {
          branch: "feature/xyz",
        });

        expect(result.structuredContent?.created).toBe(true);

        const branchPath = path.join(testKbRoot, ".kb/branches/feature/xyz");
        const exists = await fs
          .access(branchPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      } finally {
        process.chdir(originalCwd);
      }
    });

    test("should fail if main branch does not exist", async () => {
      const originalCwd = process.cwd();
      const noMainKb = path.join(process.cwd(), ".kb-test-no-main");

      try {
        await fs.mkdir(path.join(noMainKb, ".kb/branches"), {
          recursive: true,
        });
        process.chdir(noMainKb);

        await expect(
          handleKbBranchEnsure(prolog, { branch: "new-branch" }),
        ).rejects.toThrow(/Main branch KB does not exist/);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(noMainKb, { recursive: true, force: true });
      }
    });
  });

  describe("kb.branch.gc", () => {
    test("should find stale branches in dry run mode", async () => {
      const originalCwd = process.cwd();

      // Create a fake git repo for testing
      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("touch README && git add README && git commit -m 'init'", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("git checkout -b main", { cwd: gitTestRoot, stdio: "ignore" });

        // Create .kb/branches structure
        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/main"), {
          recursive: true,
        });
        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/deleted-branch"), {
          recursive: true,
        });

        process.chdir(gitTestRoot);

        const result = await handleKbBranchGc(prolog, { dry_run: true });

        expect(result.content[0].text).toContain("dry run");
        expect(result.structuredContent?.stale).toContain("deleted-branch");
        expect(result.structuredContent?.deleted).toBe(0);

        // Verify branch still exists after dry run
        const exists = await fs
          .access(path.join(gitTestRoot, ".kb/branches/deleted-branch"))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should delete stale branches when dry_run=false", async () => {
      const originalCwd = process.cwd();

      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc-delete");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("touch README && git add README && git commit -m 'init'", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("git checkout -b main", { cwd: gitTestRoot, stdio: "ignore" });

        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/main"), {
          recursive: true,
        });
        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/stale-branch"), {
          recursive: true,
        });

        process.chdir(gitTestRoot);

        const result = await handleKbBranchGc(prolog, { dry_run: false });

        expect(result.structuredContent?.stale).toContain("stale-branch");
        expect(result.structuredContent?.deleted).toBe(1);

        // Verify branch was deleted
        const exists = await fs
          .access(path.join(gitTestRoot, ".kb/branches/stale-branch"))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(false);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should preserve main branch", async () => {
      const originalCwd = process.cwd();

      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc-main");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("touch README && git add README && git commit -m 'init'", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("git checkout -b main", { cwd: gitTestRoot, stdio: "ignore" });

        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/main"), {
          recursive: true,
        });

        process.chdir(gitTestRoot);

        const result = await handleKbBranchGc(prolog, { dry_run: false });

        expect(result.structuredContent?.stale).not.toContain("main");

        // Verify main branch still exists
        const exists = await fs
          .access(path.join(gitTestRoot, ".kb/branches/main"))
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should handle no stale branches", async () => {
      const originalCwd = process.cwd();

      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc-none");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("touch README && git add README && git commit -m 'init'", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync("git checkout -b main", { cwd: gitTestRoot, stdio: "ignore" });
        execSync("git checkout -b feature", {
          cwd: gitTestRoot,
          stdio: "ignore",
        });

        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/main"), {
          recursive: true,
        });
        await fs.mkdir(path.join(gitTestRoot, ".kb/branches/feature"), {
          recursive: true,
        });

        process.chdir(gitTestRoot);

        const result = await handleKbBranchGc(prolog, { dry_run: true });

        expect(result.structuredContent?.stale).toEqual([]);
        expect(result.structuredContent?.deleted).toBe(0);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should handle missing .kb/branches directory", async () => {
      const originalCwd = process.cwd();

      const gitTestRoot = path.join(process.cwd(), ".kb-test-git-gc-missing");
      await fs.rm(gitTestRoot, { recursive: true, force: true });
      await fs.mkdir(gitTestRoot, { recursive: true });

      try {
        execSync("git init", { cwd: gitTestRoot, stdio: "ignore" });
        execSync('git config user.email "test@example.com"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });
        execSync('git config user.name "Test User"', {
          cwd: gitTestRoot,
          stdio: "ignore",
        });

        process.chdir(gitTestRoot);

        const result = await handleKbBranchGc(prolog, { dry_run: true });

        expect(result.content[0].text).toContain("No branch KBs found");
        expect(result.structuredContent?.stale).toEqual([]);
        expect(result.structuredContent?.deleted).toBe(0);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(gitTestRoot, { recursive: true, force: true });
      }
    });

    test("should fail if not in git repository", async () => {
      const originalCwd = process.cwd();

      const nonGitRoot = path.join("/tmp", `.kb-test-non-git-${Date.now()}`);
      await fs.rm(nonGitRoot, { recursive: true, force: true });
      await fs.mkdir(path.join(nonGitRoot, ".kb/branches"), {
        recursive: true,
      });

      try {
        process.chdir(nonGitRoot);

        await expect(
          handleKbBranchGc(prolog, { dry_run: true }),
        ).rejects.toThrow(/git repository/);
      } finally {
        process.chdir(originalCwd);
        await fs.rm(nonGitRoot, { recursive: true, force: true });
      }
    });
  });
});
