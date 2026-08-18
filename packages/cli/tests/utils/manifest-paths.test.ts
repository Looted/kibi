import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const tempRoots: string[] = [];
const manifestPathsModulePath = "../../src/utils/manifest-paths.js";

function createWorkspace(): string {
  const workspaceRoot = mkdtempSync(join(tmpdir(), "kibi-manifest-paths-"));
  tempRoots.push(workspaceRoot);
  return workspaceRoot;
}

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    rmSync(tempRoot, { force: true, recursive: true });
  }
});

describe("manifest path resolver", () => {
  test("resolves canonical manifest and coordinate paths", async () => {
    const { resolveSymbolsManifestPaths, DEFAULT_SYMBOLS_PATH, DEFAULT_COORDINATES_PATH } =
      await import(manifestPathsModulePath);

    const workspaceRoot = createWorkspace();
    const result = resolveSymbolsManifestPaths(workspaceRoot);

    expect(result).toEqual({
      coordinatesPath: join(workspaceRoot, ".kb", "symbol-coordinates.yaml"),
      symbolsPath: join(workspaceRoot, ".kb", "symbols.yaml"),
    });
    expect(DEFAULT_SYMBOLS_PATH).toBe(".kb/symbols.yaml");
    expect(DEFAULT_COORDINATES_PATH).toBe(".kb/symbol-coordinates.yaml");
  });

  test("backward compatible wrapper returns only the symbols path", async () => {
    const { resolveSymbolsManifestPath } = await import(manifestPathsModulePath);

    const workspaceRoot = createWorkspace();
    expect(resolveSymbolsManifestPath(workspaceRoot)).toBe(
      join(workspaceRoot, ".kb", "symbols.yaml"),
    );
  });

  test("ignores legacy config.json and always uses canonical paths", async () => {
    const { resolveSymbolsManifestPaths } = await import(manifestPathsModulePath);

    const workspaceRoot = createWorkspace();
    mkdirSync(join(workspaceRoot, ".kb"), { recursive: true });
    const result = resolveSymbolsManifestPaths(workspaceRoot);

    expect(result.symbolsPath).toBe(join(workspaceRoot, ".kb", "symbols.yaml"));
    expect(result.coordinatesPath).toBe(
      join(workspaceRoot, ".kb", "symbol-coordinates.yaml"),
    );
  });
});
