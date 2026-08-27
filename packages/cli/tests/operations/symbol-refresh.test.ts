import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  coordinateSourceHash,
  mergeCoordinatesWithManifest,
  parseCoordinateArtifact,
} from "../../src/extractors/symbol-coordinates.js";
import { refreshSymbolCoordinatesForManifest } from "../../src/operations/mutation/symbol-refresh.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const workspaces: string[] = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    rmSync(workspace, { recursive: true, force: true });
  }
});

function context(workspaceRoot: string): OperationContext {
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-01-01T00:00:00.000Z"),
    fs: {
      readFile: async (filePath) => readFileSync(filePath, "utf8"),
      writeFile: async (filePath, data) => {
        writeFileSync(filePath, data, "utf8");
      },
      mkdir: async (filePath) => {
        mkdirSync(filePath, { recursive: true });
      },
      stat: async () => ({
        isDirectory: () => false,
        isFile: () => true,
      }),
    },
  };
}

describe("targeted symbol coordinate refresh", () => {
  test("updates one record in a legacy artifact without migrating the unrelated record", async () => {
    const workspace = mkdtempSync(
      join(tmpdir(), "kibi-targeted-legacy-update-"),
    );
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    mkdirSync(join(workspace, "src"), { recursive: true });

    const source =
      "export function target() {}\nexport function unrelated() {}\n";
    const manifestPath = join(workspace, ".kb", "symbols.yaml");
    const artifactPath = join(workspace, ".kb", "symbol-coordinates.yaml");
    writeFileSync(
      manifestPath,
      "symbols:\n  - id: SYM-TARGET\n    title: target\n    sourceFile: src/legacy.ts\n",
      "utf8",
    );
    writeFileSync(join(workspace, "src", "legacy.ts"), source, "utf8");
    writeFileSync(
      artifactPath,
      "coordinates:\n  SYM-TARGET:\n    sourceFile: src/legacy.ts\n    sourceLine: 9\n    sourceColumn: 2\n    sourceEndLine: 9\n    sourceEndColumn: 8\n  SYM-UNRELATED:\n    sourceFile: src/legacy.ts\n    sourceLine: 2\n    sourceColumn: 16\n    sourceEndLine: 2\n    sourceEndColumn: 25\n",
      "utf8",
    );

    const result = await refreshSymbolCoordinatesForManifest(
      "SYM-TARGET",
      manifestPath,
      context(workspace),
    );

    expect(result).toMatchObject({
      refreshed: true,
      found: true,
      outcome: "updated",
    });
    const rawArtifact = readFileSync(artifactPath, "utf8");
    expect(rawArtifact).not.toContain("version:");
    expect(rawArtifact).not.toContain("identityHash:");
    expect(rawArtifact).not.toContain("sourceHash:");
    expect(rawArtifact.indexOf("SYM-TARGET")).toBeLessThan(
      rawArtifact.indexOf("SYM-UNRELATED"),
    );
    const artifact = parseCoordinateArtifact(rawArtifact);
    expect(artifact).toMatchObject({ status: "legacy" });
    if (artifact.status !== "legacy") return;
    expect(artifact.coordinates).toEqual({
      "SYM-TARGET": {
        sourceFile: "src/legacy.ts",
        sourceLine: 1,
        sourceColumn: 16,
        sourceEndLine: 1,
        sourceEndColumn: 27,
      },
      "SYM-UNRELATED": {
        sourceFile: "src/legacy.ts",
        sourceLine: 2,
        sourceColumn: 16,
        sourceEndLine: 2,
        sourceEndColumn: 25,
      },
    });
  });

  test("removes one record from a legacy artifact without migrating the unrelated record", async () => {
    const workspace = mkdtempSync(
      join(tmpdir(), "kibi-targeted-legacy-remove-"),
    );
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    mkdirSync(join(workspace, "src"), { recursive: true });

    const manifestPath = join(workspace, ".kb", "symbols.yaml");
    const artifactPath = join(workspace, ".kb", "symbol-coordinates.yaml");
    writeFileSync(
      manifestPath,
      "symbols:\n  - id: SYM-UNRELATED\n    title: unrelated\n    sourceFile: src/legacy.ts\n",
      "utf8",
    );
    writeFileSync(
      join(workspace, "src", "legacy.ts"),
      "export function unrelated() {}\n",
      "utf8",
    );
    writeFileSync(
      artifactPath,
      "coordinates:\n  SYM-TARGET:\n    sourceFile: src/legacy.ts\n    sourceLine: 1\n    sourceColumn: 16\n    sourceEndLine: 1\n    sourceEndColumn: 22\n  SYM-UNRELATED:\n    sourceFile: src/legacy.ts\n    sourceLine: 1\n    sourceColumn: 16\n    sourceEndLine: 1\n    sourceEndColumn: 25\n",
      "utf8",
    );

    const result = await refreshSymbolCoordinatesForManifest(
      "SYM-TARGET",
      manifestPath,
      context(workspace),
    );

    expect(result).toMatchObject({
      refreshed: true,
      found: false,
      outcome: "removed",
    });
    const rawArtifact = readFileSync(artifactPath, "utf8");
    expect(rawArtifact).not.toContain("version:");
    expect(rawArtifact).not.toContain("identityHash:");
    expect(rawArtifact).not.toContain("sourceHash:");
    const artifact = parseCoordinateArtifact(rawArtifact);
    expect(artifact).toMatchObject({ status: "legacy" });
    if (artifact.status !== "legacy") return;
    expect(artifact.coordinates).toEqual({
      "SYM-UNRELATED": {
        sourceFile: "src/legacy.ts",
        sourceLine: 1,
        sourceColumn: 16,
        sourceEndLine: 1,
        sourceEndColumn: 25,
      },
    });
  });

  test("writes bound whole-file coordinates for extractor-miss anchors", async () => {
    const workspace = mkdtempSync(join(tmpdir(), "kibi-targeted-coordinates-"));
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    mkdirSync(join(workspace, "src"), { recursive: true });

    const source = "line one\nline two\n";
    const manifestPath = join(workspace, ".kb", "symbols.yaml");
    const artifactPath = join(workspace, ".kb", "symbol-coordinates.yaml");
    writeFileSync(
      manifestPath,
      "symbols:\n  - id: SYM-COARSE\n    title: Missing extractor declaration\n    sourceFile: src/coarse.ts\n    granularity_reason: extractor-miss\n",
      "utf8",
    );
    writeFileSync(join(workspace, "src", "coarse.ts"), source, "utf8");

    const result = await refreshSymbolCoordinatesForManifest(
      "SYM-COARSE",
      manifestPath,
      context(workspace),
    );

    expect(result).toMatchObject({
      refreshed: true,
      found: true,
      outcome: "updated",
    });
    const artifact = parseCoordinateArtifact(
      readFileSync(artifactPath, "utf8"),
    );
    expect(artifact).toMatchObject({ status: "parsed" });
    if (artifact.status !== "parsed") return;
    expect(artifact.coordinates["SYM-COARSE"]).toMatchObject({
      sourceFile: "src/coarse.ts",
      sourceLine: 1,
      sourceColumn: 0,
      sourceEndLine: 3,
      sourceEndColumn: 0,
      sourceHash: coordinateSourceHash(source),
    });
    expect(
      mergeCoordinatesWithManifest(
        [
          {
            id: "SYM-COARSE",
            title: "Missing extractor declaration",
            sourceFile: "src/coarse.ts",
            granularity_reason: "extractor-miss",
          },
        ],
        artifact,
        { resolveSourceText: () => source },
      ),
    ).toMatchObject([
      {
        id: "SYM-COARSE",
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 3,
        sourceEndColumn: 0,
      },
    ]);
  });

  test("removes stale coordinates when a renamed symbol is no longer extractable", async () => {
    const workspace = mkdtempSync(
      join(tmpdir(), "kibi-targeted-stale-remove-"),
    );
    workspaces.push(workspace);
    mkdirSync(join(workspace, ".kb"), { recursive: true });
    mkdirSync(join(workspace, "src"), { recursive: true });

    const manifestPath = join(workspace, ".kb", "symbols.yaml");
    const artifactPath = join(workspace, ".kb", "symbol-coordinates.yaml");
    writeFileSync(
      manifestPath,
      "symbols:\n  - id: SYM-RENAMED\n    title: oldName\n    sourceFile: src/renamed.ts\n",
      "utf8",
    );
    writeFileSync(
      join(workspace, "src", "renamed.ts"),
      "export function newName() {}\n",
      "utf8",
    );
    writeFileSync(
      artifactPath,
      [
        "version: 2",
        "coordinates:",
        "  SYM-RENAMED:",
        "    sourceFile: src/renamed.ts",
        "    sourceLine: 1",
        "    sourceColumn: 16",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 23",
        `    identityHash: ${"a".repeat(64)}`,
        `    sourceHash: ${"b".repeat(64)}`,
        "",
      ].join("\n"),
      "utf8",
    );

    const result = await refreshSymbolCoordinatesForManifest(
      "SYM-RENAMED",
      manifestPath,
      context(workspace),
    );

    expect(result).toMatchObject({
      refreshed: true,
      found: true,
      outcome: "removed",
    });
    const artifact = parseCoordinateArtifact(
      readFileSync(artifactPath, "utf8"),
    );
    expect(artifact).toMatchObject({ status: "parsed" });
    if (artifact.status !== "parsed") return;
    expect(artifact.coordinates["SYM-RENAMED"]).toBeUndefined();
  });
});
