import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { load as parseYAML } from "js-yaml";
import { acquireSymbolCompilerLock } from "kibi-runtime";
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

function readCoordinates(raw: string): Record<string, Record<string, unknown>> {
  const parsed = parseYAML(raw) as
    | { coordinates?: Record<string, Record<string, unknown>> }
    | undefined;

  return parsed?.coordinates ?? {};
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

  test("writes refreshed coordinates to the coordinate artifact and leaves symbols.yaml untouched", async () => {
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

    const manifestPath = path.join(workspaceRoot, ".kb", "symbols.yaml");
    const originalManifest = [
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
    ].join("\n");
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, originalManifest, "utf8");
    const coordinatesPath = path.join(
      workspaceRoot,
      ".kb",
      "symbol-coordinates.yaml",
    );

    const result = await handleKbSymbolsRefresh({
      dryRun: false,
      workspaceRoot,
    });
    const writtenManifest = readFileSync(manifestPath, "utf8");
    const artifact = readFileSync(coordinatesPath, "utf8");
    const coordinates = readCoordinates(artifact);

    expect(result.structuredContent?.dryRun).toBe(false);
    expect(result.structuredContent?.refreshed).toBe(2);
    expect(result.structuredContent?.failed).toBe(1);
    expect(result.structuredContent?.unchanged).toBe(4);
    expect(result.content[0]?.text).toContain(
      "completed for .kb/symbol-coordinates.yaml",
    );
    expect(writtenManifest).toBe(originalManifest);
    expect(existsSync(coordinatesPath)).toBe(true);
    expect(artifact).toContain("# symbol-coordinates.yaml");
    expect(artifact).toContain("version: 2");
    expect(artifact).not.toContain("coordinatesGeneratedAt:");

    expect(coordinates["SYM-matched"]).toEqual(
      expect.objectContaining({
        sourceFile: "src/matched.ts",
        sourceLine: expect.any(Number),
        sourceColumn: expect.any(Number),
        sourceEndLine: expect.any(Number),
        sourceEndColumn: expect.any(Number),
        identityHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
    expect(coordinates["SYM-preserved"]).toBeUndefined();
    expect(coordinates["SYM-failed"]).toBeUndefined();
    expect(coordinates["SYM-doc"]).toBeUndefined();
    expect(coordinates["SYM-missing-file"]).toBeUndefined();
    expect(coordinates["SYM-no-source"]).toBeUndefined();
  });

  test("does not write symbols.yaml or the coordinate artifact during dry runs", async () => {
    writeWorkspaceFile(
      workspaceRoot,
      "src/dry-run.ts",
      "export function dryRunSymbol() {\n  return true;\n}\n",
    );

    const manifestPath = path.join(workspaceRoot, ".kb", "symbols.yaml");
    const original = [
      "symbols:",
      "  - id: SYM-dry-run",
      "    title: dryRunSymbol",
      "    status: active",
      "    sourceFile: src/dry-run.ts",
      "",
    ].join("\n");

    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, original, "utf8");
    const coordinatesPath = path.join(
      workspaceRoot,
      ".kb",
      "symbol-coordinates.yaml",
    );

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
      "kb_symbols_refresh (dry run) completed for .kb/symbol-coordinates.yaml",
    );
    expect(readFileSync(manifestPath, "utf8")).toBe(original);
    expect(existsSync(coordinatesPath)).toBe(false);
  });

  test("persists whole-file coordinates for unmatched coarse anchors", async () => {
    const source = "first line\nsecond line\n";
    writeWorkspaceFile(workspaceRoot, "src/coarse.ts", source);
    const manifestPath = path.join(workspaceRoot, ".kb", "symbols.yaml");
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(
      manifestPath,
      [
        "symbols:",
        "  - id: SYM-coarse",
        "    title: missing suite title",
        "    status: active",
        "    sourceFile: src/coarse.ts",
        "    granularity_reason: test-suite",
      ].join("\n"),
      "utf8",
    );

    const first = await handleKbSymbolsRefresh({ workspaceRoot });
    expect(first.structuredContent?.refreshed).toBe(1);
    const coordinatesPath = path.join(
      workspaceRoot,
      ".kb",
      "symbol-coordinates.yaml",
    );
    const firstCoordinates = readCoordinates(
      readFileSync(coordinatesPath, "utf8"),
    );
    expect(firstCoordinates["SYM-coarse"]).toEqual(
      expect.objectContaining({
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 3,
        sourceEndColumn: 0,
      }),
    );

    await handleKbSymbolsRefresh({ workspaceRoot });
    expect(
      readCoordinates(readFileSync(coordinatesPath, "utf8"))["SYM-coarse"],
    ).toEqual(firstCoordinates["SYM-coarse"]);
  });

  test("waits for the shared workspace symbol compiler lock", async () => {
    writeWorkspaceFile(
      workspaceRoot,
      "src/locked.ts",
      "export function lockedSymbol() {}\n",
    );
    const manifestPath = path.join(workspaceRoot, ".kb", "symbols.yaml");
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(
      manifestPath,
      "symbols:\n  - id: SYM-LOCKED\n    title: lockedSymbol\n    sourceFile: src/locked.ts\n",
      "utf8",
    );

    const lock = await acquireSymbolCompilerLock(workspaceRoot);
    let settled = false;
    const refresh = handleKbSymbolsRefresh({ workspaceRoot }).then(() => {
      settled = true;
    });

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
    expect(settled).toBe(false);
    lock.release();
    await refresh;
    expect(settled).toBe(true);
  });

  test("cleans temporary coordinate output when publication fails", async () => {
    writeWorkspaceFile(
      workspaceRoot,
      "src/failing.ts",
      "export function failingSymbol() {}\n",
    );
    const manifestPath = path.join(workspaceRoot, ".kb", "symbols.yaml");
    const coordinatesPath = path.join(
      workspaceRoot,
      ".kb",
      "symbol-coordinates.yaml",
    );
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(
      manifestPath,
      "symbols:\n  - id: SYM-FAIL\n    title: failingSymbol\n    sourceFile: src/failing.ts\n",
      "utf8",
    );
    mkdirSync(coordinatesPath);

    await expect(handleKbSymbolsRefresh({ workspaceRoot })).rejects.toThrow();
    expect(existsSync(coordinatesPath)).toBe(true);
    expect(
      readdirSync(path.dirname(coordinatesPath)).some((name: string) =>
        name.startsWith("symbol-coordinates.yaml.kibi-tmp-"),
      ),
    ).toBe(false);
  });

  test("throws a clear error for invalid symbol manifests", async () => {
    const manifestPath = path.join(workspaceRoot, ".kb", "symbols.yaml");
    mkdirSync(path.dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, "symbols: invalid", "utf8");

    return expect(handleKbSymbolsRefresh({ workspaceRoot })).rejects.toThrow(
      `Invalid symbols manifest at ${manifestPath}`,
    );
  });
});
