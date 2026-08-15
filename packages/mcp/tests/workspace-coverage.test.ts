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

const originalKibiWorkspace = process.env.KIBI_WORKSPACE;
const originalKibiProjectRoot = process.env.KIBI_PROJECT_ROOT;
const originalKibiRoot = process.env.KIBI_ROOT;
const originalKibiKbPath = process.env.KIBI_KB_PATH;
const originalKbPath = process.env.KB_PATH;

function restoreEnvVar(key: string, value: string | undefined): void {
  if (value === undefined) {
    Reflect.deleteProperty(process.env, key);
    return;
  }

  process.env[key] = value;
}

function setEnvVar(key: string, value: string | undefined): void {
  restoreEnvVar(key, value);
}

describe.serial("workspace uncovered path coverage", () => {
  let isolationRoot: string;
  let workspaceRoot: string;

  beforeEach(() => {
    isolationRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), "kibi-workspace-coverage-"),
    );
    workspaceRoot = path.join(isolationRoot, "workspace");
    fs.mkdirSync(workspaceRoot);

    for (const marker of [".git", ".kb"]) {
      const staleMarker = path.join(os.tmpdir(), marker);
      if (fs.existsSync(staleMarker)) {
        fs.rmSync(staleMarker, { recursive: true, force: true });
      }
    }

    setEnvVar("KIBI_WORKSPACE", undefined);
    setEnvVar("KIBI_PROJECT_ROOT", undefined);
    setEnvVar("KIBI_ROOT", undefined);
    setEnvVar("KIBI_KB_PATH", undefined);
    setEnvVar("KB_PATH", undefined);
  });

  afterEach(() => {
    fs.rmSync(isolationRoot, { recursive: true, force: true });

    restoreEnvVar("KIBI_WORKSPACE", originalKibiWorkspace);
    restoreEnvVar("KIBI_PROJECT_ROOT", originalKibiProjectRoot);
    restoreEnvVar("KIBI_ROOT", originalKibiRoot);
    restoreEnvVar("KIBI_KB_PATH", originalKibiKbPath);
    restoreEnvVar("KB_PATH", originalKbPath);
  });

  describe("resolveWorkspaceRoot", () => {
    test("prefers the first non-empty configured workspace env var", () => {
      const preferredRoot = path.join(workspaceRoot, "preferred-root");
      const fallbackRoot = path.join(workspaceRoot, "fallback-root");
      fs.mkdirSync(preferredRoot);
      fs.mkdirSync(fallbackRoot);

      setEnvVar("KIBI_WORKSPACE", "   ");
      setEnvVar("KIBI_PROJECT_ROOT", preferredRoot);
      setEnvVar("KIBI_ROOT", fallbackRoot);

      expect(resolveWorkspaceRoot(workspaceRoot)).toBe(preferredRoot);
    });

    test("ignores blank and undefined workspace env vars before falling back to git root", () => {
      const gitRoot = path.join(workspaceRoot, "repo-root");
      const nestedRoot = path.join(gitRoot, "nested", "child");
      fs.mkdirSync(path.join(gitRoot, ".git"), { recursive: true });
      fs.mkdirSync(nestedRoot, { recursive: true });

      setEnvVar("KIBI_WORKSPACE", "   ");
      setEnvVar("KIBI_PROJECT_ROOT", undefined);
      setEnvVar("KIBI_ROOT", "\t");

      expect(resolveWorkspaceRoot(nestedRoot)).toBe(gitRoot);
    });

    test("finds a .kb directory when walking upward", () => {
      fs.mkdirSync(path.join(workspaceRoot, ".kb"));
      const nestedRoot = path.join(workspaceRoot, "a", "b", "c");
      fs.mkdirSync(nestedRoot, { recursive: true });

      expect(resolveWorkspaceRoot(nestedRoot)).toBe(workspaceRoot);
    });

    test("falls back to the git root when no .kb directory exists", () => {
      fs.mkdirSync(path.join(workspaceRoot, ".git"));
      const nestedRoot = path.join(workspaceRoot, "d", "e", "f");
      fs.mkdirSync(nestedRoot, { recursive: true });

      expect(resolveWorkspaceRoot(nestedRoot)).toBe(workspaceRoot);
    });

    test("returns the starting directory when no markers are found", () => {
      const nestedRoot = path.join(workspaceRoot, "no", "markers", "here");
      fs.mkdirSync(nestedRoot, { recursive: true });

      setEnvVar("KIBI_WORKSPACE", undefined);
      setEnvVar("KIBI_PROJECT_ROOT", "   ");
      setEnvVar("KIBI_ROOT", undefined);

      expect(resolveWorkspaceRoot(nestedRoot)).toBe(path.resolve(nestedRoot));
    });
  });

  describe("resolveKbPath", () => {
    test("uses KB_PATH when KIBI_KB_PATH is blank", () => {
      const legacyKbRoot = path.join(workspaceRoot, "legacy-kb");
      setEnvVar("KIBI_KB_PATH", "   ");
      setEnvVar("KB_PATH", legacyKbRoot);

      expect(resolveKbPath(workspaceRoot, "main")).toBe(
        branchStorePath(path.resolve(legacyKbRoot), "main"),
      );
    });

    test("returns the configured branch path unchanged", () => {
      const branchKbPath = path.join(
        workspaceRoot,
        "custom-kb",
        "branches",
        "feature-x",
      );
      setEnvVar("KIBI_KB_PATH", branchKbPath);

      expect(resolveKbPath(workspaceRoot, "main")).toBe(
        path.resolve(branchKbPath),
      );
    });

    test("builds the default branch path when no env override exists", () => {
      expect(resolveKbPath(workspaceRoot, "main")).toBe(
        branchStorePath(workspaceRoot, "main"),
      );
    });
  });

  describe("resolveEnvFilePath", () => {
    test("returns absolute env file paths unchanged", () => {
      const absoluteEnvFile = path.join(workspaceRoot, ".env.absolute");

      expect(resolveEnvFilePath(absoluteEnvFile, "/ignored")).toBe(
        absoluteEnvFile,
      );
    });

    test("resolves relative env file paths against the workspace root", () => {
      expect(resolveEnvFilePath(".env.local", workspaceRoot)).toBe(
        path.resolve(workspaceRoot, ".env.local"),
      );
    });
  });
});
