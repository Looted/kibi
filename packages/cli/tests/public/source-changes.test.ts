import {
  describe,
  expect,
  it,
  afterEach,
  beforeEach,
} from "bun:test";
import { execSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { collectSourceChanges } from "../../src/public/impact/source-changes.js";

function createTempRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), "kibi-source-changes-"));
  execSync("git init", { cwd: dir, stdio: "pipe" });
  execSync('git config user.name "Kibi Test"', { cwd: dir, stdio: "pipe" });
  execSync('git config user.email "test@kibi.invalid"', {
    cwd: dir,
    stdio: "pipe",
  });
  return dir;
}

describe("collectSourceChanges", () => {
  const originalCwd = process.cwd();

  beforeEach(() => {
    process.chdir(originalCwd);
  });

  afterEach(() => {
    process.chdir(originalCwd);
  });

  it("prefers staged diffs over working-tree diffs and source filters", () => {
    const repoDir = createTempRepo();

    try {
      mkdirSync(join(repoDir, "src"), { recursive: true });
      const trackedPath = join(repoDir, "src", "tracked.ts");
      const ignoredPath = join(repoDir, "src", "notes.txt");
      const workingPath = join(repoDir, "src", "working.ts");

      writeFileSync(trackedPath, "export const value = 1;\n");
      writeFileSync(ignoredPath, "ignore me\n");
      execSync("git add src/tracked.ts src/notes.txt", {
        cwd: repoDir,
        stdio: "pipe",
      });
      execSync('git commit -m "base"', {
        cwd: repoDir,
        stdio: "pipe",
      });

      writeFileSync(trackedPath, "export const value = 2;\n");
      writeFileSync(workingPath, "export const working = 1;\n");
      writeFileSync(ignoredPath, "updated ignore\n");
      writeFileSync(ignoredPath, "updated ignore again\n", {
        flag: "w",
      });

      execSync("git add src/tracked.ts", {
        cwd: repoDir,
        stdio: "pipe",
      });
      execSync("git add src/notes.txt", {
        cwd: repoDir,
        stdio: "pipe",
      });

      const result = collectSourceChanges({
        workspaceRoot: repoDir,
        staged: true,
        includeWorkingTreeDiff: true,
        sourceFiles: [trackedPath, ignoredPath, workingPath],
      });

      expect(result).toEqual([
        {
          file: "src/tracked.ts",
          status: "M",
          hunkRanges: [{ start: 1, end: 1 }],
          content: "export const value = 2;\n",
        },
      ]);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("collects tracked working-tree edits for supported files", () => {
    const repoDir = createTempRepo();

    try {
      mkdirSync(join(repoDir, "src"), { recursive: true });
      writeFileSync(join(repoDir, "src", "tracked.ts"), "export const value = 1;\n");
      writeFileSync(join(repoDir, "src", "notes.md"), "tracked note\n");
      execSync("git add src/tracked.ts src/notes.md", {
        cwd: repoDir,
        stdio: "pipe",
      });
      execSync('git commit -m "base"', {
        cwd: repoDir,
        stdio: "pipe",
      });

      writeFileSync(join(repoDir, "src", "tracked.ts"), "export const value = 1;\nexport const next = 2;\n");
      writeFileSync(join(repoDir, "src", "notes.md"), "tracked note\nupdated\n");

      const result = collectSourceChanges({
        workspaceRoot: repoDir,
        includeWorkingTreeDiff: true,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        file: "src/tracked.ts",
        status: "M",
        content: "export const value = 1;\nexport const next = 2;\n",
      });
      expect(result[0]?.hunkRanges[0]).toBeDefined();
      expect(result[0]?.hunkRanges.length).toBe(1);
      expect(result.map((change) => change.file)).toEqual(["src/tracked.ts"]);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("builds full-file hunks for explicit supported source files", () => {
    const repoDir = createTempRepo();

    try {
      mkdirSync(join(repoDir, "src"), { recursive: true });
      const trackedPath = join(repoDir, "src", "explicit.ts");
      const ignoredPath = join(repoDir, "src", "explicit.txt");
      writeFileSync(trackedPath, "export const a = 1;\nexport const b = 2;\n");
      writeFileSync(ignoredPath, "not a source file\n");

      const result = collectSourceChanges({
        workspaceRoot: repoDir,
        sourceFiles: [trackedPath, ignoredPath],
      });

      expect(result).toEqual([
        {
          file: "src/explicit.ts",
          status: "M",
          hunkRanges: [{ start: 1, end: 3 }],
          content: "export const a = 1;\nexport const b = 2;\n",
        },
      ]);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });

  it("returns an empty list when no supported explicit source files are provided", () => {
    const repoDir = createTempRepo();

    try {
      mkdirSync(join(repoDir, "src"), { recursive: true });
      writeFileSync(join(repoDir, "src", "tracked.ts"), "export const value = 1;\n");

      const result = collectSourceChanges({
        workspaceRoot: repoDir,
      });

      expect(result).toEqual([]);
    } finally {
      rmSync(repoDir, { recursive: true, force: true });
    }
  });
});
