import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { handleKbSymbolsRefresh } from "../../src/tools/symbols.js";

function writeWorkspaceFile(
  workspaceRoot: string,
  relativePath: string,
  content: string,
) {
  const filePath = path.join(workspaceRoot, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
  return filePath;
}

function getSymbolBlock(raw: string, symbolId: string): string {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `- id: ${symbolId}`);
  if (start < 0) {
    throw new Error(`Missing symbol block for ${symbolId}`);
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index++) {
    if (lines[index]?.trim().startsWith("- id: ")) {
      end = index;
      break;
    }
  }

  return lines.slice(start, end).join("\n");
}

describe.serial("handleKbSymbolsRefresh", () => {
  let workspaceRoot = "";

  beforeEach(() => {
    workspaceRoot = mkdtempSync(
      path.join(tmpdir(), "kibi-mcp-symbols-refresh-"),
    );
  });

  afterEach(() => {
    if (workspaceRoot) {
      rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test("refreshes changed symbols and classifies failed and unchanged entries", async () => {
    writeWorkspaceFile(
      workspaceRoot,
      "src/matched.ts",
      "export function matched() {\n  return 1;\n}\n",
    );
    writeWorkspaceFile(
      workspaceRoot,
      "src/nomatch.ts",
      "export function differentName() {\n  return 2;\n}\n",
    );
    writeWorkspaceFile(
      workspaceRoot,
      "src/preserved.ts",
      "export function anotherName() {\n  return 3;\n}\n",
    );
    writeWorkspaceFile(
      workspaceRoot,
      "docs/reference.md",
      "# Reference\nNo symbol match here.\n",
    );

    const manifestPath = path.join(workspaceRoot, "symbols.yaml");
    writeFileSync(
      manifestPath,
      [
        "symbols:",
        "  - stray-entry",
        "  - id: SYM-matched",
        "    title: matched",
        "    status: active",
        "    sourceFile: src/matched.ts",
        "  - id: SYM-failed",
        "    title: missingSymbol",
        "    status: active",
        "    sourceFile: src/nomatch.ts",
        "  - id: SYM-preserved",
        "    title: stillMissing",
        "    status: active",
        "    sourceFile: src/preserved.ts",
        "    sourceLine: 10",
        "    sourceColumn: 1",
        "    sourceEndLine: 10",
        "    sourceEndColumn: 15",
        "    coordinatesGeneratedAt: '2024-01-01T00:00:00.000Z'",
        "  - id: SYM-doc",
        "    title: absentFromDocs",
        "    status: active",
        "    sourceFile: docs/reference.md",
        "  - id: SYM-missing-file",
        "    title: absentFile",
        "    status: active",
        "    sourceFile: src/not-here.ts",
        "  - id: SYM-no-source",
        "    title: noSource",
        "    status: active",
      ].join("\n"),
      "utf8",
    );

    const result = await handleKbSymbolsRefresh({
      dryRun: false,
      workspaceRoot,
    });
    const written = readFileSync(manifestPath, "utf8");

    expect(result.structuredContent?.dryRun).toBe(false);
    expect(
      (result.structuredContent?.refreshed ?? 0) +
        (result.structuredContent?.failed ?? 0) +
        (result.structuredContent?.unchanged ?? 0),
    ).toBe(7);
    expect(result.content[0]?.text).toContain("completed for symbols.yaml");
    expect(written).toContain("# symbols.yaml");

    const matched = getSymbolBlock(written, "SYM-matched");
    const failed = getSymbolBlock(written, "SYM-failed");
    const preserved = getSymbolBlock(written, "SYM-preserved");

    expect(matched).toMatch(/sourceLine: \d+/);
    expect(matched).toMatch(/sourceColumn: \d+/);
    expect(matched).toMatch(/sourceEndLine: \d+/);
    expect(matched).toMatch(/sourceEndColumn: \d+/);
    expect(matched).toMatch(/coordinatesGeneratedAt: /);

    expect(failed).not.toContain("sourceLine:");
    expect(failed).not.toContain("coordinatesGeneratedAt:");

    expect(preserved).toContain("sourceLine: 10");
    expect(preserved).toContain("sourceColumn: 1");
    expect(preserved).toContain("sourceEndLine: 10");
    expect(preserved).toContain("sourceEndColumn: 15");
    expect(preserved).toContain(
      "coordinatesGeneratedAt: '2024-01-01T00:00:00.000Z'",
    );
  });

  test("does not write the manifest during dry runs", async () => {
    writeWorkspaceFile(
      workspaceRoot,
      "src/dry-run.ts",
      "export function dryRunSymbol() {\n  return true;\n}\n",
    );

    const manifestPath = path.join(workspaceRoot, "symbols.yaml");
    const original = [
      "symbols:",
      "  - id: SYM-dry-run",
      "    title: dryRunSymbol",
      "    status: active",
      "    sourceFile: src/dry-run.ts",
      "",
    ].join("\n");

    writeFileSync(manifestPath, original, "utf8");

    const result = await handleKbSymbolsRefresh({
      dryRun: true,
      workspaceRoot,
    });

    expect(result.structuredContent?.dryRun).toBe(true);
    expect(
      (result.structuredContent?.refreshed ?? 0) +
        (result.structuredContent?.failed ?? 0) +
        (result.structuredContent?.unchanged ?? 0),
    ).toBe(1);
    expect(result.content[0]?.text).toContain(
      "kb_symbols_refresh (dry run) completed",
    );
    expect(readFileSync(manifestPath, "utf8")).toBe(original);
  });

  test("throws a clear error for invalid symbol manifests", async () => {
    const manifestPath = path.join(workspaceRoot, "symbols.yaml");
    writeFileSync(manifestPath, "symbols: invalid", "utf8");

    return expect(handleKbSymbolsRefresh({ workspaceRoot })).rejects.toThrow(
      `Invalid symbols manifest at ${manifestPath}`,
    );
  });
});
