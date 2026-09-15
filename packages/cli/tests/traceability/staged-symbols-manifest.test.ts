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
} from "../../src/traceability/staged-symbols-manifest.js";
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

  it("accepts identical declaration owners but rejects a stale duplicate binding", () => {
    const original = 'export function app() {\n  return "old";\n}\n';
    const changed = 'export function app() {\n  return "new";\n}\n';
    const manifest = `symbols:
  - id: SYM-app
    title: app
    sourceFile: src/app.ts
  - id: SYM-other
    title: app
    sourceFile: src/app.ts
`;
    const pairedCoordinates = (first: string, second: string): string => {
      const other = appCoordinatesArtifact(second, 1)
        .replace("  SYM-app:", "  SYM-other:")
        .replace(
          sha256("SYM-app\u0000app\u0000src/app.ts\u0000"),
          sha256("SYM-other\u0000app\u0000src/app.ts\u0000"),
        );
      return (
        appCoordinatesArtifact(first, 1) + other.split("coordinates:\n")[1]
      );
    };
    writeFile(tmpDir, "src/app.ts", original);
    writeFile(tmpDir, ".kb/symbols.yaml", manifest);
    writeFile(
      tmpDir,
      ".kb/symbol-coordinates.yaml",
      pairedCoordinates(original, original),
    );
    commitAll(tmpDir, "initial identical owners");
    writeFile(tmpDir, "src/app.ts", changed);
    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const source = createSourceStagedFile(tmpDir);
      const assess = (second: string) =>
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [source],
          stagedFiles: [
            source,
            {
              path: ".kb/symbol-coordinates.yaml",
              status: "M",
              hunkRanges: [],
              content: pairedCoordinates(changed, second),
            },
          ],
        });
      expect(assess(changed).state).toBe("fresh");
      expect(assess(original)).toEqual({
        state: "stale",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbol-coordinates.yaml",
      });
    } finally {
      process.chdir(previousCwd);
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
        state: "not_required",
        sourcePaths: [],
        path: ".kb/symbol-coordinates.yaml",
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
        state: "not_required",
        sourcePaths: [],
        path: ".kb/symbol-coordinates.yaml",
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
        path: ".kb/symbol-coordinates.yaml",
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
        path: ".kb/symbol-coordinates.yaml",
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
        path: ".kb/symbol-coordinates.yaml",
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
        path: ".kb/symbol-coordinates.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("still rejects a stale granular coordinate in a mixed manifest", () => {
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
      const staleCoordinates: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: appCoordinatesArtifact(initialSource, 1),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, staleCoordinates],
        }),
      ).toEqual({
        state: "stale",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbol-coordinates.yaml",
      });
    } finally {
      process.chdir(previousCwd);
    }
  });

  it("does not exempt a stale granular duplicate beside a coarse title anchor", () => {
    const initialSource = `export function app() {
  return "ok";
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
  - id: SYM-app-module
    title: app
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
`;
    writeFile(tmpDir, "src/app.ts", stagedSource);

    const previousCwd = process.cwd();
    process.chdir(tmpDir);
    try {
      const sourceFile = createSourceStagedFile(tmpDir);
      const staleCoordinates: StagedFile = {
        path: ".kb/symbol-coordinates.yaml",
        status: "M",
        hunkRanges: [],
        content: appCoordinatesArtifact(initialSource, 1),
      };

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [sourceFile],
          stagedFiles: [sourceFile, staleCoordinates],
        }),
      ).toEqual({
        state: "stale",
        sourcePaths: ["src/app.ts"],
        path: ".kb/symbol-coordinates.yaml",
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
        path: ".kb/symbol-coordinates.yaml",
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
        path: ".kb/symbol-coordinates.yaml",
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
        path: ".kb/symbol-coordinates.yaml",
      });

      commitAll(tmpDir, "second");

      expect(
        assessStagedSymbolsManifest({
          symbolsManifestPath: ".kb/symbols.yaml",
          sourceFiles: [stagedSecondSource],
          stagedFiles: [stagedSecondSource],
        }),
      ).toEqual({
        state: "not_required",
        sourcePaths: [],
        path: ".kb/symbol-coordinates.yaml",
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
        path: ".kb/symbol-coordinates.yaml",
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
        path: ".kb/symbol-coordinates.yaml",
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
      expect(result.state).toBe("missing");
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
