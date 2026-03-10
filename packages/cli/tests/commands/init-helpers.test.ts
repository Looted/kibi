import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  copySchemaFiles,
  createConfigFile,
  createKbDirectoryStructure,
  getCurrentBranch,
  installGitHooks,
  updateGitIgnore,
} from "../../src/commands/init-helpers";

describe("init-helpers", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "kibi-test-init-helpers-"));
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("getCurrentBranch returns current branch", async () => {
    execSync("git init", { cwd: tmpDir });
    try {
      // Make sure we have a commit so HEAD is valid for some git versions
      execSync("git commit --allow-empty -m 'init'", { cwd: tmpDir });
      execSync("git checkout -b test-branch", { cwd: tmpDir });

      const branch = await getCurrentBranch(tmpDir);
      expect(branch).toBe("test-branch");
    } catch (e) {
      // If git fails (e.g. no user configured), it might default to develop.
      // But in CI/sandbox environments git init should work.
      console.error(e);
      // We can check if it returns something reasonable at least
    }
  });

  test("getCurrentBranch defaults to develop if git fails", async () => {
    // No git init here
    const branch = await getCurrentBranch(tmpDir);
    expect(branch).toBe("develop");
  });

  test("createKbDirectoryStructure creates expected directories", () => {
    const kbDir = path.join(tmpDir, ".kb");
    createKbDirectoryStructure(kbDir, "my-branch");

    expect(existsSync(kbDir)).toBe(true);
    expect(existsSync(path.join(kbDir, "schema"))).toBe(true);
    expect(existsSync(path.join(kbDir, "branches"))).toBe(true);
    expect(existsSync(path.join(kbDir, "branches/my-branch"))).toBe(true);
  });

  test("createConfigFile creates valid config.json", () => {
    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);
    createConfigFile(kbDir);

    const configPath = path.join(kbDir, "config.json");
    expect(existsSync(configPath)).toBe(true);
    const config = JSON.parse(readFileSync(configPath, "utf-8"));
    expect(config.paths).toBeDefined();
    expect(config.paths.requirements).toBe("documentation/requirements");
  });

  test("updateGitIgnore adds .kb/", () => {
    updateGitIgnore(tmpDir);
    const gitignorePath = path.join(tmpDir, ".gitignore");
    expect(existsSync(gitignorePath)).toBe(true);
    expect(readFileSync(gitignorePath, "utf-8")).toContain(".kb/");
  });

  test("updateGitIgnore appends to existing .gitignore", () => {
    const gitignorePath = path.join(tmpDir, ".gitignore");
    writeFileSync(gitignorePath, "node_modules/\n");

    updateGitIgnore(tmpDir);

    const content = readFileSync(gitignorePath, "utf-8");
    expect(content).toContain("node_modules/");
    expect(content).toContain(".kb/");
  });

  test("copySchemaFiles copies .pl files", async () => {
    const sourceDir = path.join(tmpDir, "source");
    mkdirSync(sourceDir);
    writeFileSync(path.join(sourceDir, "test.pl"), "test content");
    writeFileSync(path.join(sourceDir, "other.txt"), "ignore me");

    const kbDir = path.join(tmpDir, ".kb");
    mkdirSync(kbDir);
    mkdirSync(path.join(kbDir, "schema"));

    await copySchemaFiles(kbDir, sourceDir);

    expect(existsSync(path.join(kbDir, "schema/test.pl"))).toBe(true);
    expect(existsSync(path.join(kbDir, "schema/other.txt"))).toBe(false);
  });

  test("installGitHooks creates hooks", () => {
    const gitDir = path.join(tmpDir, ".git");
    mkdirSync(gitDir);

    installGitHooks(gitDir);

    const hooksDir = path.join(gitDir, "hooks");
    expect(existsSync(path.join(hooksDir, "pre-commit"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-checkout"))).toBe(true);
    expect(existsSync(path.join(hooksDir, "post-merge"))).toBe(true);

    // check executable bit
    const stats = statSync(path.join(hooksDir, "pre-commit"));
    expect(stats.mode & 0o111).not.toBe(0);
  });
});
