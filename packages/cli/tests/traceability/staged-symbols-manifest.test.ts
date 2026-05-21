import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { StagedFile } from "../../src/traceability/git-staged.js";
import { assessStagedSymbolsManifest } from "../../src/traceability/staged-symbols-manifest.js";

function writeFile(root: string, relativePath: string, content: string): void {
  const fullPath = path.join(root, relativePath);
  writeFileSync(fullPath, content);
}

function commitAll(cwd: string, message: string): void {
  execSync("git add .", { cwd, stdio: "pipe" });
  execSync(`git commit -m "${message}"`, { cwd, stdio: "pipe" });
}

function createSourceStagedFile(cwd: string): StagedFile {
  return {
    path: "src/app.ts",
    status: "M",
    hunkRanges: [],
    content: readFileSync(path.join(cwd, "src", "app.ts"), "utf8"),
  };
}

describe("assessStagedSymbolsManifest", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(tmpdir(), "kibi-staged-symbols-manifest-"));
    execSync("git init", { cwd: tmpDir, stdio: "pipe" });
    execSync('git config user.email "test@example.com"', {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync('git config user.name "Test User"', {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync("mkdir -p src custom", { cwd: tmpDir, stdio: "pipe" });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("uses configured paths.symbols (yaml) for baseline manifest comparison", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function customFunction() {\n  return "custom";\n}\n`,
    );
    writeFile(
      tmpDir,
      "custom/my-symbols.yaml",
      "symbols:\n  - id: SYMBOL-CUSTOM-001\n    title: customFunction\n    sourceFile: src/app.ts\n    sourceLine: 1\n    sourceColumn: 16\n    sourceEndLine: 3\n    sourceEndColumn: 1\n",
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `export function customFunction() {\n  return "custom modified";\n}\n`,
    );
    execSync("git add src/app.ts", { cwd: tmpDir, stdio: "pipe" });

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const result = assessStagedSymbolsManifest({
        symbolsManifestPath: "custom/my-symbols.yaml",
        sourceFiles: [createSourceStagedFile(tmpDir)],
        stagedFiles: [createSourceStagedFile(tmpDir)],
      });
      expect(result).toEqual({ state: "not_required", sourcePaths: [] });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("supports configured .yml symbols manifests", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function customFunction() {\n  return "custom";\n}\n`,
    );
    writeFile(
      tmpDir,
      "custom/my-symbols.yml",
      "symbols:\n  - id: SYMBOL-CUSTOM-001\n    title: customFunction\n    sourceFile: src/app.ts\n    sourceLine: 1\n    sourceColumn: 16\n    sourceEndLine: 3\n    sourceEndColumn: 1\n",
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `export function customFunction() {\n  return "custom modified";\n}\n`,
    );
    execSync("git add src/app.ts", { cwd: tmpDir, stdio: "pipe" });

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const result = assessStagedSymbolsManifest({
        symbolsManifestPath: "custom/my-symbols.yml",
        sourceFiles: [createSourceStagedFile(tmpDir)],
        stagedFiles: [createSourceStagedFile(tmpDir)],
      });
      expect(result).toEqual({ state: "not_required", sourcePaths: [] });
    } finally {
      process.chdir(previousCwd);
    }
  });
});
