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
import {
  assessStagedSymbolsManifest,
  collectStagedAuthoredSymbolsManifestEvidence,
} from "../../src/traceability/staged-symbols-manifest.js";

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
    execSync("git init -b main", { cwd: tmpDir, stdio: "pipe" });
    execSync('git config user.email "test@example.com"', {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync('git config user.name "Test User"', {
      cwd: tmpDir,
      stdio: "pipe",
    });
    execSync("mkdir -p src custom documentation", {
      cwd: tmpDir,
      stdio: "pipe",
    });
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
      expect(result).toEqual({
        state: "not_required",
        sourcePaths: [],
        path: "custom/symbol-coordinates.yaml",
      });
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
      expect(result).toEqual({
        state: "not_required",
        sourcePaths: [],
        path: "custom/symbol-coordinates.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("ignores explicitly justified non-extracted symbols in freshness comparisons", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function app() {\n  return "ok";\n}\n\nfunction privateHelper() {\n  return "private";\n}\n`,
    );
    writeFile(
      tmpDir,
      "documentation/symbols.yaml",
      "symbols:\n  - id: SYM-app\n    title: app\n    sourceFile: src/app.ts\n  - id: SYM-private-helper\n    title: privateHelper\n    sourceFile: src/app.ts\n    granularity_reason: module-level-behavior\n",
    );
    writeFile(
      tmpDir,
      "documentation/symbol-coordinates.yaml",
      "coordinates:\n  SYM-app:\n    sourceFile: src/app.ts\n    sourceLine: 1\n    sourceColumn: 16\n    sourceEndLine: 3\n    sourceEndColumn: 1\n",
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `\nexport function app() {\n  return "ok";\n}\n\nfunction privateHelper() {\n  return "private";\n}\n`,
    );
    writeFile(
      tmpDir,
      "documentation/symbol-coordinates.yaml",
      "coordinates:\n  SYM-app:\n    sourceFile: src/app.ts\n    sourceLine: 2\n    sourceColumn: 16\n    sourceEndLine: 4\n    sourceEndColumn: 1\n",
    );

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile = createSourceStagedFile(tmpDir);
      const coordinatesFile: StagedFile = {
        path: "documentation/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: readFileSync(
          path.join(tmpDir, "documentation", "symbol-coordinates.yaml"),
          "utf8",
        ),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: "documentation/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, coordinatesFile],
        }),
      ).toEqual({
        state: "fresh",
        sourcePaths: ["src/app.ts"],
        path: "documentation/symbol-coordinates.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("reports only authored symbol IDs whose staged manifest metadata changed", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export class App {
  run() {
    return "ok";
  }
}
`,
    );
    writeFile(
      tmpDir,
      "documentation/symbols.yaml",
      `symbols:
  - id: SYM-App
    title: App
    sourceFile: src/app.ts
    status: active
    relationships:
      - type: implements
        target: REQ-App
  - id: SYM-App-run
    title: App.run
    sourceFile: src/app.ts
    status: active
    relationships:
      - type: implements
        target: REQ-App
`,
    );
    commitAll(tmpDir, "initial");
    writeFile(
      tmpDir,
      "documentation/symbols.yaml",
      `symbols:
  - id: SYM-App
    title: App
    sourceFile: src/app.ts
    status: active
    relationships:
      - type: implements
        target: REQ-App
  - id: SYM-App-run
    title: App.run
    sourceFile: src/app.ts
    status: active
    relationships:
      - type: implements
        target: REQ-App
      - type: covered_by
        target: TEST-App-run
`,
    );

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const manifestFile: StagedFile = {
        path: "documentation/symbols.yaml",
        status: "M",
        hunkRanges: [],
        content: readFileSync(
          path.join(tmpDir, "documentation", "symbols.yaml"),
          "utf8",
        ),
      };

      expect(
        collectStagedAuthoredSymbolsManifestEvidence({
          sourceFiles: [createSourceStagedFile(tmpDir)],
          stagedFiles: [manifestFile],
        }),
      ).toEqual({
        path: "documentation/symbols.yaml",
        entries: [{ sourcePath: "src/app.ts", entityIds: ["SYM-App-run"] }],
        changedEntityIds: ["SYM-App-run"],
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("ignores comment-only staged manifest changes when selecting changed symbols", () => {
    writeFile(
      tmpDir,
      "src/duplicate.ts",
      `export function duplicate() {
  return "ok";
}
`,
    );
    writeFile(
      tmpDir,
      "documentation/symbols.yaml",
      `symbols:
  - id: SYM-DUP-001
    title: duplicate
    sourceFile: src/duplicate.ts
    status: active
  - id: SYM-DUP-002
    title: duplicate
    sourceFile: src/duplicate.ts
    status: active
`,
    );
    commitAll(tmpDir, "initial");
    writeFile(
      tmpDir,
      "documentation/symbols.yaml",
      `symbols:
  - id: SYM-DUP-001
    title: duplicate
    sourceFile: src/duplicate.ts
    status: active
  - id: SYM-DUP-002
    title: duplicate
    sourceFile: src/duplicate.ts
    status: active
    # staged overlap marker
`,
    );

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const result = collectStagedAuthoredSymbolsManifestEvidence({
        sourceFiles: [],
        stagedFiles: [
          {
            path: "documentation/symbols.yaml",
            status: "M",
            hunkRanges: [],
            content: readFileSync(
              path.join(tmpDir, "documentation", "symbols.yaml"),
              "utf8",
            ),
          },
        ],
      });

      expect(result).toEqual({
        path: "documentation/symbols.yaml",
        entries: [],
        changedEntityIds: [],
      });
    } finally {
      process.chdir(previousCwd);
    }
  });
});
