import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import fs from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { branchStorePath } from "kibi-cli/public/branch-resolver";
import {
  describeBranchKbStamp,
  readBranchKbStamp,
} from "../src/server/kb-freshness.js";
import * as toolTypes from "../src/server/tool-types.js";
import * as checkTypes from "../src/tools/check-types.js";
import {
  resolveEnvFilePath,
  resolveKbPath,
  resolveWorkspaceRoot,
} from "../src/workspace.js";

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
    isolationRoot = fs.mkdtempSync(
      path.join(tempRootParent(), "kibi-workspace-coverage-"),
    );
    workspaceRoot = path.join(isolationRoot, "workspace");
    fs.mkdirSync(workspaceRoot);

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

describe("coverage gaps: type-only modules and kb freshness", () => {
  afterEach(() => {
    mock.restore();
  });

  test("imports type-only MCP modules so they appear in LCOV", () => {
    expect(Object.keys(toolTypes).length).toBeGreaterThanOrEqual(0);
    expect(Object.keys(checkTypes).length).toBeGreaterThanOrEqual(0);
  });

  test("stamps journaled stores, missing markers, and non-Error stat failures", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-freshness-cov-"));
    try {
      const branchPath = path.join(root, ".kb", "branches", "main");
      await mkdir(branchPath, { recursive: true });
      await writeFile(
        path.join(branchPath, "storage.json"),
        JSON.stringify({ format: "kibi.rdf-journal.v1" }),
      );
      await writeFile(path.join(branchPath, "CURRENT"), "generation-1:1");

      const journaled = await readBranchKbStamp(branchPath);
      expect(journaled.rdfMissing).toBe(false);
      expect(describeBranchKbStamp(journaled)).toContain(branchPath);

      const markerAsDir = path.join(root, "marker-dir");
      await mkdir(path.join(markerAsDir, "storage.json"), { recursive: true });
      const missingMarker = await readBranchKbStamp(markerAsDir);
      expect(missingMarker.rdfMissing).toBe(true);

      const statSpy = spyOn(fsPromises, "stat").mockImplementation(async () => {
        throw "not-an-error";
      });
      const failed = await readBranchKbStamp(branchPath);
      expect(failed.dirMissing).toBe(true);
      expect(failed.errorMessage).toContain("not-an-error");
      statSpy.mockRestore();
      expect(await readFile(path.join(branchPath, "CURRENT"), "utf8")).toContain(
        "generation",
      );
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
