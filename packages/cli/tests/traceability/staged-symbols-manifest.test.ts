import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
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
  manifestRecordSourcePath,
} from "../../src/traceability/staged-symbols-manifest.js";
import {
  createGitWorkspace,
  git,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";
import { execSync } from "../helpers/isolated-env.js";

function writeFile(root: string, relativePath: string, content: string): void {
  const fullPath = path.join(root, relativePath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
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

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function appCoordinatesArtifact(
  source: string,
  sourceLine: number,
  granularityReason = "",
  sourceFile = "src/app.ts",
): string {
  return `version: 2
coordinates:
  SYM-app:
    identityHash: ${sha256(`SYM-app\u0000app\u0000${sourceFile}\u0000${granularityReason}`)}
    sourceHash: ${sha256(source)}
    sourceFile: ${sourceFile}
    sourceLine: ${sourceLine}
    sourceColumn: 16
    sourceEndLine: ${sourceLine + 2}
    sourceEndColumn: 1
`;
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
    execSync("mkdir -p src custom .kb", {
      cwd: tmpDir,
      stdio: "pipe",
    });
  });

  afterEach(() => {
    if (tmpDir && existsSync(tmpDir)) {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("uses canonical .kb/symbols.yaml for baseline manifest comparison", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function customFunction() {\n  return "custom";\n}\n`,
    );
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
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
        symbolsManifestPath: ".kb/symbols.yaml",
        sourceFiles: [createSourceStagedFile(tmpDir)],
        stagedFiles: [createSourceStagedFile(tmpDir)],
      });
      expect(result).toEqual({
        state: "fresh",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("reports per-file uncovered symbols when extraction outruns the manifest", () => {
    const oldSource = `export function app() {\n  return "ok";\n}\n`;
    writeFile(tmpDir, "src/app.ts", oldSource);
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYMBOL-CUSTOM-001\n    title: app\n    sourceFile: src/app.ts\n    sourceLine: 1\n    sourceColumn: 16\n    sourceEndLine: 3\n    sourceEndColumn: 1\n",
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(oldSource, 1),
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `export function app() {\n  return "ok";\n}\n\nexport interface AppConfig {\n  name: string;\n}\n`,
    );
    execSync("git add src/app.ts .kb/symbol-coordinates.yaml", {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile = createSourceStagedFile(tmpDir);
      const coordinatesFile: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: readFileSync(
          path.join(tmpDir, ".kb", "symbol-coordinates.yaml"),
          "utf8",
        ),
      };
      const result = assessStagedSymbolsManifest({
        symbolsManifestPath: ".kb/symbols.yaml",
        sourceFiles: [sourceFile],
        stagedFiles: [sourceFile, coordinatesFile],
      });
      expect(result.state).toBe("stale");
      expect(result.fileDetails?.[0]).toMatchObject({
        path: "src/app.ts",
        expectedCount: 2,
        coveredCount: 1,
        missing: [{ title: "AppConfig", line: 5 }],
        extra: [],
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("supports the canonical .yml twin of .kb/symbols.yaml", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function customFunction() {\n  return "custom";\n}\n`,
    );
    writeFile(
      tmpDir,
      ".kb/symbols.yml",
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
        symbolsManifestPath: ".kb/symbols.yml",
        sourceFiles: [createSourceStagedFile(tmpDir)],
        stagedFiles: [createSourceStagedFile(tmpDir)],
      });
      expect(result).toEqual({
        state: "fresh",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yml",
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
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-app\n    title: app\n    sourceFile: src/app.ts\n  - id: SYM-private-helper\n    title: privateHelper\n    sourceFile: src/app.ts\n    granularity_reason: module-level-behavior\n",
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(
        `export function app() {\n  return "ok";\n}\n\nfunction privateHelper() {\n  return "private";\n}\n`,
        1,
      ),
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `\nexport function app() {\n  return "ok";\n}\n\nfunction privateHelper() {\n  return "private";\n}\n`,
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(
        `\nexport function app() {\n  return "ok";\n}\n\nfunction privateHelper() {\n  return "private";\n}\n`,
        2,
      ),
    );

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile = createSourceStagedFile(tmpDir);
      const coordinatesFile: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: readFileSync(
          path.join(tmpDir, ".kb", "symbol-coordinates.yaml"),
          "utf8",
        ),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, coordinatesFile],
        }),
      ).toEqual({
        state: "fresh",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("treats a source file documented only with coarse records as not_required", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function app() {\n  return "ok";\n}\n\nexport function helper() {\n  return "helper";\n}\n`,
    );
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-app-module
    title: app
    sourceFile: src/app.ts
    granularity_reason: module-level-behavior
    status: active
`,
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `export function app() {\n  const subject = "world";\n  return "hi " + subject;\n}\n\nexport function helper() {\n  return "helper";\n}\n`,
    );
    execSync("git add src/app.ts", { cwd: tmpDir, stdio: "pipe" });

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [createSourceStagedFile(tmpDir)],
          stagedFiles: [createSourceStagedFile(tmpDir)],
        }),
      ).toEqual({
        state: "not_required",
        sourcePaths: [],
        path: ".kb/symbols.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("excludes coarse records whose title matches an extracted symbol from coordinate comparison", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function app() {\n  return "ok";\n}\n`,
    );
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-app
    title: app
    sourceFile: src/app.ts
    sourceLine: 1
    sourceColumn: 16
    sourceEndLine: 3
    sourceEndColumn: 1
  - id: SYM-app-module
    title: app
    sourceFile: src/app.ts
    granularity_reason: module-level-behavior
`,
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(`export function app() {\n  return "ok";\n}\n`, 1),
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `\nexport function app() {\n  return "ok";\n}\n`,
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(
        `\nexport function app() {\n  return "ok";\n}\n`,
        2,
      ),
    );

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile = createSourceStagedFile(tmpDir);
      const coordinatesFile: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: readFileSync(
          path.join(tmpDir, ".kb", "symbol-coordinates.yaml"),
          "utf8",
        ),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, coordinatesFile],
        }),
      ).toEqual({
        state: "fresh",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("checks granular symbols in a mixed manifest while exempting named coarse anchors", () => {
    const initialSource = `export function app() {
  return "ok";
}

export function helper() {
  return "helper";
}
`;
    writeFile(tmpDir, "src/app.ts", initialSource);
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-app
    title: app
    sourceFile: src/app.ts
  - id: SYM-helper-module
    title: helper
    sourceFile: src/app.ts
    granularity_reason: module-level-behavior
`,
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(initialSource, 1),
    );
    commitAll(tmpDir, "initial");

    const stagedSource = `
export function app() {
  return "ok";
}

export function helper() {
  return "helper";
}
`;
    writeFile(tmpDir, "src/app.ts", stagedSource);

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile = createSourceStagedFile(tmpDir);
      const coordinatesFile: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: appCoordinatesArtifact(stagedSource, 2),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, coordinatesFile],
        }),
      ).toEqual({
        state: "fresh",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("does not let a coarse anchor hide a newly extracted export", () => {
    const initialSource = `export function app() {
  return "ok";
}

export function helper() {
  return "helper";
}
`;
    writeFile(tmpDir, "src/app.ts", initialSource);
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-app
    title: app
    sourceFile: src/app.ts
  - id: SYM-helper-module
    title: helper
    sourceFile: src/app.ts
    granularity_reason: module-level-behavior
`,
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(initialSource, 1),
    );
    commitAll(tmpDir, "initial");

    const stagedSource = `
export function app() {
  return "ok";
}

export function helper() {
  return "helper";
}

export function added() {
  return "added";
}
`;
    writeFile(tmpDir, "src/app.ts", stagedSource);

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile = createSourceStagedFile(tmpDir);
      const coordinatesFile: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: appCoordinatesArtifact(stagedSource, 2),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, coordinatesFile],
        }),
      ).toEqual({
        state: "stale",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yaml",
        fileDetails: [
          {
            path: "src/app.ts",
            expectedCount: 2,
            coveredCount: 1,
            missing: [{ title: "added", line: 10 }],
            extra: [],
          },
        ],
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("uses staged source bytes when working tree bytes have moved on", () => {
    const sourcePath = "src/odd name;marker.ts";
    const initialSource = `export function app() {
  return "ok";
}
`;
    writeFile(tmpDir, sourcePath, initialSource);
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-app
    title: app
    sourceFile: ${sourcePath}
`,
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(initialSource, 1, "", sourcePath),
    );
    commitAll(tmpDir, "initial");

    const stagedSource = `
export function app() {
  return "ok";
}
`;
    const workingSource = `
export function app() {
  return "working tree changed";
}
`;
    writeFile(tmpDir, sourcePath, stagedSource);
    execSync(`git add -- '${sourcePath}'`, { cwd: tmpDir, stdio: "pipe" });
    writeFile(tmpDir, sourcePath, workingSource);

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile: StagedFile = {
        path: sourcePath,
        status: "M",
        hunkRanges: [],
        content: stagedSource,
      };
      const coordinatesFile: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: appCoordinatesArtifact(stagedSource, 2, "", sourcePath),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, coordinatesFile],
        }),
      ).toEqual({
        state: "fresh",
        sourcePaths: [sourcePath],
        path: ".kb/symbols.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("does not reuse HEAD content after a later commit in the same process", () => {
    const initialSource = `export function app() {
  return "initial";
}
`;
    writeFile(tmpDir, "src/app.ts", initialSource);
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-app
    title: app
    sourceFile: src/app.ts
`,
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(initialSource, 1),
    );
    commitAll(tmpDir, "initial");

    const secondSource = `
export function app() {
  return "second";
}
`;
    writeFile(tmpDir, "src/app.ts", secondSource);
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(secondSource, 2),
    );
    execSync("git add src/app.ts .kb/symbol-coordinates.yaml", {
      cwd: tmpDir,
      stdio: "pipe",
    });

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const stagedSecondSource: StagedFile = {
        path: "src/app.ts",
        status: "M",
        hunkRanges: [],
        content: secondSource,
      };
      const stagedSecondCoordinates: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: appCoordinatesArtifact(secondSource, 2),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [stagedSecondSource],
          stagedFiles: [stagedSecondSource, stagedSecondCoordinates],
        }),
      ).toEqual({
        state: "fresh",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yaml",
      });

      // The next commit retitles the record, so only a fresh HEAD read sees
      // the declaration uncovered.
      writeFile(
        tmpDir,
        ".kb/symbols.yaml",
        "symbols:\n  - id: SYM-app\n    title: renamedApp\n    sourceFile: src/app.ts\n",
      );
      commitAll(tmpDir, "second");

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [stagedSecondSource],
          stagedFiles: [stagedSecondSource],
        }),
      ).toMatchObject({
        state: "stale",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("treats legacy-link records as coordinate-bearing in freshness comparisons", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function app() {\n  return "ok";\n}\n`,
    );
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-app
    title: app
    sourceFile: src/app.ts
    sourceLine: 1
    sourceColumn: 16
    sourceEndLine: 3
    sourceEndColumn: 1
    granularity_reason: legacy-link
`,
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      appCoordinatesArtifact(
        `export function app() {\n  return "ok";\n}\n`,
        1,
        "legacy-link",
      ),
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `\nexport function app() {\n  return "ok";\n}\n`,
    );

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile = createSourceStagedFile(tmpDir);
      const coordinatesFile: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: appCoordinatesArtifact(
          `\nexport function app() {\n  return "ok";\n}\n`,
          2,
          "legacy-link",
        ),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, coordinatesFile],
        }),
      ).toEqual({
        state: "fresh",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("still fails when an incomplete mixed manifest leaves extracted symbols uncovered", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function app() {\n  return "ok";\n}\n\nexport function helper() {\n  return "helper";\n}\n`,
    );
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-app
    title: app
    sourceFile: src/app.ts
    sourceLine: 1
    sourceColumn: 16
    sourceEndLine: 3
    sourceEndColumn: 1
`,
    );
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      `coordinates:
  SYM-app:
    sourceFile: src/app.ts
    sourceLine: 1
    sourceColumn: 16
    sourceEndLine: 3
    sourceEndColumn: 1
`,
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `\nexport function app() {\n  return "ok";\n}\n\nexport function helper() {\n  return "helper";\n}\n`,
    );

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile = createSourceStagedFile(tmpDir);
      const stagedCoordinates = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: `coordinates:
  SYM-app:
    sourceFile: src/app.ts
    sourceLine: 2
    sourceColumn: 16
    sourceEndLine: 4
    sourceEndColumn: 1
`,
      } as StagedFile;

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, stagedCoordinates],
        }),
      ).toEqual({
        state: "stale",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbols.yaml",
        fileDetails: [
          {
            path: "src/app.ts",
            expectedCount: 2,
            coveredCount: 1,
            missing: [{ title: "helper", line: 6 }],
            extra: [],
          },
        ],
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("does not treat an unknown granularity reason as coarse coverage", () => {
    writeFile(
      tmpDir,
      "src/app.ts",
      `export function app() {\n  return "ok";\n}\n`,
    );
    writeFile(
      tmpDir,
      ".kb/symbols.yaml",
      `symbols:
  - id: SYM-app-module
    title: app
    sourceFile: src/app.ts
    granularity_reason: made-up-reason
    status: active
`,
    );
    commitAll(tmpDir, "initial");

    writeFile(
      tmpDir,
      "src/app.ts",
      `\nexport function app() {\n  return "ok";\n}\n`,
    );
    execSync("git add src/app.ts", { cwd: tmpDir, stdio: "pipe" });

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const result = assessStagedSymbolsManifest({
        symbolsManifestPath: ".kb/symbols.yaml",
        sourceFiles: [createSourceStagedFile(tmpDir)],
        stagedFiles: [createSourceStagedFile(tmpDir)],
      });
      // An unknown reason is not coarse, so the file is judged by its titles.
      expect(result.state).toBe("fresh");
      expect(result.sourcePaths).toEqual(["src/app.ts"]);
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
      ".kb/symbols.yaml",
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
      ".kb/symbols.yaml",
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
        path: ".kb/symbols.yaml",
        status: "M",
        hunkRanges: [],
        content: readFileSync(path.join(tmpDir, ".kb", "symbols.yaml"), "utf8"),
      };

      expect(
        collectStagedAuthoredSymbolsManifestEvidence({
          sourceFiles: [createSourceStagedFile(tmpDir)],
          stagedFiles: [manifestFile],
        }),
      ).toEqual({
        path: ".kb/symbols.yaml",
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
      ".kb/symbols.yaml",
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
      ".kb/symbols.yaml",
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
            path: ".kb/symbols.yaml",
            status: "M",
            hunkRanges: [],
            content: readFileSync(
              path.join(tmpDir, ".kb", "symbols.yaml"),
              "utf8",
            ),
          },
        ],
      });

      expect(result).toEqual({
        path: ".kb/symbols.yaml",
        entries: [],
        changedEntityIds: [],
      });
    } finally {
      process.chdir(previousCwd);
    }
  });
});

describe("staged symbols manifest record normalization fallbacks", () => {
  const roots: string[] = [];
  const restores: Array<() => void> = [];
  const previousExitCode = process.exitCode;

  afterEach(() => {
    for (const restore of restores.splice(0)) restore();
    restoreWorkspaceCwd();
    for (const root of roots.splice(0)) removeTempDir(root);
    if (typeof previousExitCode === "number")
      process.exitCode = previousExitCode;
    else if (typeof process.exitCode === "number") process.exitCode = 0;
  });

  function preparedWorkspace(): string {
    restores.push(isolateKibiEnv());
    const cwd = createGitWorkspace();
    roots.push(cwd);
    return cwd;
  }

  it("skips invalid links, uses source fallbacks, and reports authored id changes", async () => {
    const cwd = preparedWorkspace();
    mkdirSync(path.join(cwd, "src"), { recursive: true });
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    writeFileSync(
      path.join(cwd, "src", "app.ts"),
      "export function greet() { return 1; }\n",
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      `symbols:
  - id: SYM-GREET
    title: greet
    source: src/app.ts
    sourceLine: 1
    links:
      - REQ-1
      - type: implements
        target: REQ-1
      - 12
      - type: missing
    relationships:
      - type: implements
        target: REQ-1
      - type: only
      - 4
    tags:
      - core
      - 1
    owner: alice
    priority: must
    severity: high
    text_ref: body
    granularity_reason: exported-function
`,
    );
    writeFileSync(
      path.join(cwd, ".kb", "symbol-coordinates.yaml"),
      "not: valid-coordinates\n",
    );
    git(cwd, "add src/app.ts .kb/symbols.yaml .kb/symbol-coordinates.yaml");
    git(cwd, "commit --no-verify -m symbols");
    writeFileSync(
      path.join(cwd, ".kb", "symbols.yaml"),
      `symbols:
  - id: SYM-GREET
    title: greet
    sourceFile: src/app.ts
    sourceLine: 1
    links: REQ-2
    relationships: not-a-list
    tags: not-a-list
`,
    );
    git(cwd, "add .kb/symbols.yaml");
    await withCwd(cwd, () => {
      const staged = {
        path: ".kb/symbols.yaml",
        status: "M" as const,
        hunkRanges: [],
        content: [
          "symbols:",
          "  - id: SYM-GREET",
          "    title: greet",
          "    sourceFile: src/app.ts",
          "    sourceLine: 1",
          "    links: REQ-2",
          "    relationships: not-a-list",
          "    tags: not-a-list",
        ].join("\n"),
      };
      const source = {
        path: "src/app.ts",
        status: "M" as const,
        hunkRanges: [],
        content: "export function greet() { return 1; }\n",
      };
      const evidence = collectStagedAuthoredSymbolsManifestEvidence({
        sourceFiles: [source],
        stagedFiles: [staged],
      });
      expect(evidence.path).toBe(".kb/symbols.yaml");
      expect(evidence.changedEntityIds).toContain("SYM-GREET");
      expect(
        collectStagedAuthoredSymbolsManifestEvidence({
          sourceFiles: [source],
          stagedFiles: [],
        }).entries,
      ).toEqual([]);
      expect(
        collectStagedAuthoredSymbolsManifestEvidence({
          sourceFiles: [source],
          stagedFiles: [{ ...staged, content: "symbols: [" }],
        }).entries,
      ).toEqual([]);
      const assessment = assessStagedSymbolsManifest({
        symbolsManifestPath: ".kb/symbols.yaml",
        sourceFiles: [source],
        stagedFiles: [staged, source],
      });
      expect(["stale", "missing", "not_required", "fresh"]).toContain(
        assessment.state,
      );
    });
  });

  it("manifestRecordSourcePath returns null for unusable inputs", () => {
    expect(manifestRecordSourcePath({ sourceFile: "src/a.ts" })).toBe(
      "src/a.ts",
    );
    expect(manifestRecordSourcePath({ source: "src/b.ts" })).toBe("src/b.ts");
    expect(manifestRecordSourcePath({ sourceFile: 12, source: 9 })).toBeNull();
  });
});
