import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  resolveWorkspaceRoot,
  resolveWorkspaceRootInfo,
  resolveKbPath,
  resolveEnvFilePath,
} from "../src/workspace.js";

describe("workspace utilities", () => {
  let tempDir: string;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-workspace-test-"));
    // Clear relevant env vars
    delete process.env.KIBI_WORKSPACE;
    delete process.env.KIBI_PROJECT_ROOT;
    delete process.env.KIBI_ROOT;
    delete process.env.KIBI_KB_PATH;
    delete process.env.KB_PATH;
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
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

  describe("resolveWorkspaceRootInfo", () => {
    test("should return 'env' reason", () => {
      process.env.KIBI_WORKSPACE = tempDir;
      const info = resolveWorkspaceRootInfo();
      expect(info.root).toBe(path.resolve(tempDir));
      expect(info.reason).toBe("env");
    });

    test("should return 'kb' reason", () => {
      fs.mkdirSync(path.join(tempDir, ".kb"));
      const info = resolveWorkspaceRootInfo(tempDir);
      expect(info.root).toBe(path.resolve(tempDir));
      expect(info.reason).toBe("kb");
    });

    test("should return 'git' reason", () => {
      fs.mkdirSync(path.join(tempDir, ".git"));
      const info = resolveWorkspaceRootInfo(tempDir);
      expect(info.root).toBe(path.resolve(tempDir));
      expect(info.reason).toBe("git");
    });

    test("should return 'cwd' reason", () => {
      const info = resolveWorkspaceRootInfo(tempDir);
      expect(info.root).toBe(path.resolve(tempDir));
      expect(info.reason).toBe("cwd");
    });
  });

  describe("resolveKbPath", () => {
    test("should resolve from KIBI_KB_PATH (absolute)", () => {
      const kbPath = path.join(tempDir, "custom-kb");
      process.env.KIBI_KB_PATH = kbPath;
      expect(resolveKbPath(tempDir, "main")).toBe(
        path.join(path.resolve(kbPath), "branches", "main"),
      );
    });

    test("should resolve from KIBI_KB_PATH (branch path)", () => {
      const kbPath = path.join(tempDir, "custom-kb", "branches", "feature");
      process.env.KIBI_KB_PATH = kbPath;
      expect(resolveKbPath(tempDir, "main")).toBe(path.resolve(kbPath));
    });

    test("should use default path", () => {
      const expected = path.join(tempDir, ".kb", "branches", "main");
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
