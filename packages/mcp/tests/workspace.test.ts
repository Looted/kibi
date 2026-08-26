import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { branchStorePath } from "kibi-cli/public/branch-resolver";
import {
  resolveEnvFilePath,
  resolveKbPath,
  resolveWorkspaceRoot,
} from "../src/workspace.js";

describe("workspace utilities", () => {
  let tempDir: string;
  let isolationRoot: string;
  const originalEnv = { ...process.env };

  function tempRootParent(): string {
    const candidates =
      process.platform === "linux" ? ["/dev/shm", os.tmpdir()] : [os.tmpdir()];
    const parent = candidates.find(
      (candidate) =>
        fs.existsSync(candidate) &&
        !fs.existsSync(path.join(candidate, ".git")) &&
        !fs.existsSync(path.join(candidate, ".kb")),
    );
    if (!parent) {
      throw new Error("No marker-free temporary directory is available");
    }
    return parent;
  }

  beforeEach(() => {
    // Use a private marker-free temp parent so upward traversal never reaches
    // the checkout or shared os.tmpdir markers.
    isolationRoot = fs.mkdtempSync(
      path.join(tempRootParent(), "kibi-workspace-test-"),
    );
    tempDir = path.join(isolationRoot, "workspace");
    fs.mkdirSync(tempDir);
    // Clear relevant env vars (assign-and-delete rather than `= undefined`,
    // which coerces to the truthy string "undefined" and defeats env resolution)
    for (const key of [
      "KIBI_WORKSPACE",
      "KIBI_PROJECT_ROOT",
      "KIBI_ROOT",
      "KIBI_KB_PATH",
      "KB_PATH",
    ]) {
      delete process.env[key];
    }
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
