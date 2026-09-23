import { describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeChangedFileImpact } from "../../../src/public/impact/analyzer.js";

function runGit(workspaceRoot: string, args: readonly string[]): void {
  execFileSync("git", args, {
    cwd: workspaceRoot,
    env: { ...process.env, GIT_MASTER: "1" },
    stdio: "pipe",
  });
}

async function withTempWorkspace(
  run: (workspaceRoot: string) => void | Promise<void>,
): Promise<void> {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "kibi-impact-analyzer-"));
  try {
    await run(workspaceRoot);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

describe("analyzeChangedFileImpact", () => {
  it("summarizes explicit source-file impact without diagnostics when requested", async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      mkdirSync(join(workspaceRoot, "src"), { recursive: true });
      const sourcePath = join(workspaceRoot, "src", "upload.ts");
      writeFileSync(
        sourcePath,
        [
          "// implements REQ-UPLOAD",
          "export function upload(): string {",
          "  return 'ok';",
          "}",
          "",
        ].join("\n"),
      );

      const result = await analyzeChangedFileImpact({
        workspaceRoot,
        sourceFiles: [sourcePath],
        includeImpactDiagnostics: false,
      });

      expect(result.impactDiagnostics).toEqual([]);
      expect(result.sourceFiles).toEqual(["src/upload.ts"]);
      expect(result.extractedSymbols).toEqual([
        expect.objectContaining({
          name: "upload",
          hunkRanges: [{ start: 1, end: 5 }],
          linkedEntityIds: [],
        }),
      ]);
      expect(result.linkedEntities).toEqual([]);
      expect(result.nextActions).toHaveLength(4);
    });
  });

  it("caps generated impact diagnostics when maxDiagnostics is non-negative", async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      mkdirSync(join(workspaceRoot, "src"), { recursive: true });
      const sourcePath = join(workspaceRoot, "src", "upload.ts");
      writeFileSync(
        sourcePath,
        [
          "// implements REQ-UPLOAD",
          "export function upload(): string {",
          "  return 'ok';",
          "}",
          "",
        ].join("\n"),
      );

      const result = await analyzeChangedFileImpact({
        workspaceRoot,
        sourceFiles: [sourcePath],
        maxDiagnostics: 0,
      });

      expect(result.impactDiagnostics).toEqual([]);
      expect(result.extractedSymbols).toHaveLength(1);
    });
  });

  it("includes active manifest results for changed source files", async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      mkdirSync(join(workspaceRoot, ".kb"), { recursive: true });
      mkdirSync(join(workspaceRoot, "src"), { recursive: true });
      const sourcePath = join(workspaceRoot, "src", "upload.ts");
      writeFileSync(
        join(workspaceRoot, ".kb", "config.json"),
        JSON.stringify({ paths: { symbols: "documentation/symbols.yaml" } }),
      );
      writeFileSync(
        join(workspaceRoot, ".kb", "symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-UPLOAD",
          "    title: upload",
          "    source: .kb/symbols.yaml",
          "    sourceFile: src/upload.ts",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-UPLOAD",
          "",
        ].join("\n"),
      );
      writeFileSync(
        sourcePath,
        ["export function upload(): string {", "  return 'ok';", "}", ""].join(
          "\n",
        ),
      );

      const result = await analyzeChangedFileImpact({
        workspaceRoot,
        sourceFiles: [sourcePath],
        includeImpactDiagnostics: false,
      });

      expect(result.linkedEntities).toEqual([
        {
          id: "REQ-UPLOAD",
          relationshipType: "implements",
          sourceSymbolId: "SYM-UPLOAD",
          sourceSymbolName: "upload",
        },
      ]);
    });
  });

  it("does not report a coarse manifest symbol when a working-tree sibling changes", async () => {
    await withTempWorkspace(async (workspaceRoot) => {
      // Given
      mkdirSync(join(workspaceRoot, ".kb"), { recursive: true });
      mkdirSync(join(workspaceRoot, "src"), { recursive: true });
      const sourcePath = join(workspaceRoot, "src", "upload.ts");
      writeFileSync(
        join(workspaceRoot, ".kb", "config.json"),
        JSON.stringify({ paths: { symbols: "documentation/symbols.yaml" } }),
      );
      writeFileSync(
        join(workspaceRoot, ".kb", "symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-STABLE-ANCHOR",
          "    title: stableAnchor",
          "    source: .kb/symbols.yaml",
          "    sourceFile: src/upload.ts",
          "    relationships:",
          "      - type: implements",
          "        target: REQ-UPLOAD",
          "",
        ].join("\n"),
      );
      writeFileSync(
        sourcePath,
        [
          "export function stableAnchor(): string {",
          "  return 'stable';",
          "}",
          "",
          "export function changedAction(): string {",
          "  return 'before';",
          "}",
          "",
        ].join("\n"),
      );
      runGit(workspaceRoot, ["init", "--quiet"]);
      runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
      runGit(workspaceRoot, ["config", "user.name", "Kibi Test"]);
      runGit(workspaceRoot, ["add", "."]);
      runGit(workspaceRoot, ["commit", "--quiet", "-m", "baseline"]);
      writeFileSync(
        sourcePath,
        [
          "export function stableAnchor(): string {",
          "  return 'stable';",
          "}",
          "",
          "export function changedAction(): string {",
          "  return 'after';",
          "}",
          "",
        ].join("\n"),
      );

      // When
      const result = await analyzeChangedFileImpact({
        workspaceRoot,
        sourceFiles: [sourcePath],
        includeWorkingTreeDiff: true,
      });

      // Then
      expect(
        result.impactDiagnostics.filter(
          (diagnostic) => diagnostic.id === "symbol_granularity_violation",
        ),
      ).toEqual([]);
    });
  });
});
