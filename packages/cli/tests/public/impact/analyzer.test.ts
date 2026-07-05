import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { analyzeChangedFileImpact } from "../../../src/public/impact/analyzer.js";

function withTempWorkspace(run: (workspaceRoot: string) => void): void {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "kibi-impact-analyzer-"));
  try {
    run(workspaceRoot);
  } finally {
    rmSync(workspaceRoot, { recursive: true, force: true });
  }
}

describe("analyzeChangedFileImpact", () => {
  it("summarizes explicit source-file impact without diagnostics when requested", () => {
    withTempWorkspace((workspaceRoot) => {
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

      const result = analyzeChangedFileImpact({
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

  it("caps generated impact diagnostics when maxDiagnostics is non-negative", () => {
    withTempWorkspace((workspaceRoot) => {
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

      const result = analyzeChangedFileImpact({
        workspaceRoot,
        sourceFiles: [sourcePath],
        maxDiagnostics: 0,
      });

      expect(result.impactDiagnostics).toEqual([]);
      expect(result.extractedSymbols).toHaveLength(1);
    });
  });

  it("includes active manifest results for changed source files", () => {
    withTempWorkspace((workspaceRoot) => {
      mkdirSync(join(workspaceRoot, ".kb"), { recursive: true });
      mkdirSync(join(workspaceRoot, "documentation"), { recursive: true });
      mkdirSync(join(workspaceRoot, "src"), { recursive: true });
      const sourcePath = join(workspaceRoot, "src", "upload.ts");
      writeFileSync(
        join(workspaceRoot, ".kb", "config.json"),
        JSON.stringify({ paths: { symbols: "documentation/symbols.yaml" } }),
      );
      writeFileSync(
        join(workspaceRoot, "documentation", "symbols.yaml"),
        [
          "symbols:",
          "  - id: SYM-UPLOAD",
          "    title: upload",
          "    source: documentation/symbols.yaml",
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
          "export function upload(): string {",
          "  return 'ok';",
          "}",
          "",
        ].join("\n"),
      );

      const result = analyzeChangedFileImpact({
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
});
