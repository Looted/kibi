import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  resolveEnvFilePath,
  resolveKbPath,
  resolveWorkspaceRoot,
} from "../src/workspace.js";
import { branchStorePath } from "kibi-cli/public/branch-resolver";

describe("workspace utilities", () => {
  let tempDir: string;
  let isolationRoot: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Create tempDir inside a dedicated subdirectory to isolate upward traversal
    // from any .git/.kb that may exist in os.tmpdir() itself (e.g. /tmp/.git)
    isolationRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-workspace-test-"),
    );
    tempDir = path.join(isolationRoot, "workspace");
    fs.mkdirSync(tempDir);
    // Remove any stale .git/.kb left in os.tmpdir() by prior test runs to prevent
    // findUpwards from traversing above our tempDir and hitting them
    for (const marker of [".git", ".kb"]) {
      const stale = path.join(os.tmpdir(), marker);
      if (fs.existsSync(stale)) {
        fs.rmSync(stale, { recursive: true, force: true });
      }
    }
    // Clear relevant env vars
    process.env.KIBI_WORKSPACE = undefined;
    process.env.KIBI_PROJECT_ROOT = undefined;
    process.env.KIBI_ROOT = undefined;
    process.env.KIBI_KB_PATH = undefined;
    process.env.KB_PATH = undefined;
  });

  afterEach(() => {
    fs.rmSync(isolationRoot, { recursive: true, force: true });
    // Restore original environment
    for (const key in process.env) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  describe("resolveWorkspaceRoot", () => {
    test("should resolve from KIBI_WORKSPACE", () => {
      const target = path.join(tempDir, "target");
      fs.mkdirSync(target);
      process.env.KIBI_WORKSPACE = target;
      expect(resolveWorkspaceRoot(tempDir)).toBe(target);
    });

    test("should resolve from KIBI_PROJECT_ROOT", () => {
      const target = path.join(tempDir, "target");
      fs.mkdirSync(target);
      process.env.KIBI_PROJECT_ROOT = target;
      expect(resolveWorkspaceRoot(tempDir)).toBe(target);
    });

    test("should resolve from KIBI_ROOT", () => {
      const target = path.join(tempDir, "target");
      fs.mkdirSync(target);
      process.env.KIBI_ROOT = target;
      expect(resolveWorkspaceRoot(tempDir)).toBe(target);
    });

    test("should find .kb upwards", () => {
      const kbDir = path.join(tempDir, ".kb");
      fs.mkdirSync(kbDir);
      const subDir = path.join(tempDir, "a", "b", "c");
      fs.mkdirSync(subDir, { recursive: true });

      expect(resolveWorkspaceRoot(subDir)).toBe(tempDir);
    });

    test("should find .git upwards", () => {
      const gitDir = path.join(tempDir, ".git");
      fs.mkdirSync(gitDir);
      const subDir = path.join(tempDir, "a", "b", "c");
      fs.mkdirSync(subDir, { recursive: true });

      expect(resolveWorkspaceRoot(subDir)).toBe(tempDir);
    });

    test("should fallback to startDir", () => {
      expect(resolveWorkspaceRoot(tempDir)).toBe(path.resolve(tempDir));
    });
  });

  describe("resolveKbPath", () => {
    test("should resolve from KIBI_KB_PATH (absolute)", () => {
      const kbPath = path.join(tempDir, "custom-kb");
      process.env.KIBI_KB_PATH = kbPath;
      expect(resolveKbPath(tempDir, "main")).toBe(
        branchStorePath(path.resolve(kbPath), "main"),
      );
    });

    test("should resolve from KIBI_KB_PATH (branch path)", () => {
      const kbPath = path.join(tempDir, "custom-kb", "branches", "feature");
      process.env.KIBI_KB_PATH = kbPath;
      expect(resolveKbPath(tempDir, "main")).toBe(path.resolve(kbPath));
    });

    test("should use default path", () => {
      const expected = branchStorePath(tempDir, "main");
      expect(resolveKbPath(tempDir, "main")).toBe(expected);
    });
  });

  describe("resolveEnvFilePath", () => {
    test("should handle absolute paths", () => {
      const absolutePath = path.join(tempDir, ".env.test");
      expect(resolveEnvFilePath(absolutePath, "/any")).toBe(absolutePath);
    });

    test("should handle relative paths", () => {
      const envFile = ".env.test";
      const expected = path.resolve(tempDir, envFile);
      expect(resolveEnvFilePath(envFile, tempDir)).toBe(expected);
    });
  });
});
