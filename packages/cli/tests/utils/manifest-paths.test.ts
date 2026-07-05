import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  test("resolves default manifest and coordinate paths", async () => {
    const manifestPathExports = await import(manifestPathsModulePath).catch(
      () => {
        return {} as Record<string, unknown>;
      },
    );

    expect(typeof manifestPathExports.resolveSymbolsManifestPaths).toBe(
      "function",
    );
    if (typeof manifestPathExports.resolveSymbolsManifestPaths !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const result = (
      manifestPathExports.resolveSymbolsManifestPaths as (
        workspaceRoot: string,
        configPath?: string,
      ) => { coordinatesPath: string; symbolsPath: string }
    )(workspaceRoot);

    expect(result).toEqual({
      coordinatesPath: join(
        workspaceRoot,
        "documentation",
        "symbol-coordinates.yaml",
      ),
      symbolsPath: join(workspaceRoot, "documentation", "symbols.yaml"),
    });
    expect(manifestPathExports.DEFAULT_SYMBOLS_PATH).toBe(
      "documentation/symbols.yaml",
    );
    expect(manifestPathExports.DEFAULT_COORDINATES_PATH).toBe(
      "documentation/symbol-coordinates.yaml",
    );
  });

  test("uses config override for symbols path and derives coordinates path beside it", async () => {
    const manifestPathExports = await import(manifestPathsModulePath).catch(
      () => {
        return {} as Record<string, unknown>;
      },
    );

    expect(typeof manifestPathExports.resolveSymbolsManifestPaths).toBe(
      "function",
    );
    if (typeof manifestPathExports.resolveSymbolsManifestPaths !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const configDir = join(workspaceRoot, ".kb");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({ paths: { symbols: "docs/symbols.yaml" } }),
      "utf8",
    );

    const result = (
      manifestPathExports.resolveSymbolsManifestPaths as (
        workspaceRoot: string,
        configPath?: string,
      ) => { coordinatesPath: string; symbolsPath: string }
    )(workspaceRoot);

    expect(result).toEqual({
      coordinatesPath: join(workspaceRoot, "docs", "symbol-coordinates.yaml"),
      symbolsPath: join(workspaceRoot, "docs", "symbols.yaml"),
    });
  });

  test("preserves legacy symbolsManifest resolution", async () => {
    const manifestPathExports = await import(manifestPathsModulePath).catch(
      () => {
        return {} as Record<string, unknown>;
      },
    );

    expect(typeof manifestPathExports.resolveSymbolsManifestPaths).toBe(
      "function",
    );
    if (typeof manifestPathExports.resolveSymbolsManifestPaths !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const configDir = join(workspaceRoot, ".kb");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({ symbolsManifest: "legacy/symbols.yml" }),
      "utf8",
    );

    const result = (
      manifestPathExports.resolveSymbolsManifestPaths as (
        workspaceRoot: string,
        configPath?: string,
      ) => { coordinatesPath: string; symbolsPath: string }
    )(workspaceRoot);

    expect(result).toEqual({
      coordinatesPath: join(workspaceRoot, "legacy", "symbol-coordinates.yaml"),
      symbolsPath: join(workspaceRoot, "legacy", "symbols.yml"),
    });
  });

  test("uses absolute configured symbols path", async () => {
    const manifestPathExports = await import(manifestPathsModulePath).catch(
      () => {
        return {} as Record<string, unknown>;
      },
    );

    expect(typeof manifestPathExports.resolveSymbolsManifestPaths).toBe(
      "function",
    );
    if (typeof manifestPathExports.resolveSymbolsManifestPaths !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const symbolsPath = join(workspaceRoot, "absolute", "symbols.yaml");
    const configDir = join(workspaceRoot, ".kb");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(
      join(configDir, "config.json"),
      JSON.stringify({ paths: { symbols: symbolsPath } }),
      "utf8",
    );

    const result = (
      manifestPathExports.resolveSymbolsManifestPaths as (
        workspaceRoot: string,
        configPath?: string,
      ) => { coordinatesPath: string; symbolsPath: string }
    )(workspaceRoot);

    expect(result).toEqual({
      coordinatesPath: join(workspaceRoot, "absolute", "symbol-coordinates.yaml"),
      symbolsPath,
    });
  });

  test("ignores invalid config and prefers existing root-level symbols manifests", async () => {
    const manifestPathExports = await import(manifestPathsModulePath).catch(
      () => {
        return {} as Record<string, unknown>;
      },
    );

    expect(typeof manifestPathExports.resolveSymbolsManifestPaths).toBe(
      "function",
    );
    if (typeof manifestPathExports.resolveSymbolsManifestPaths !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const configDir = join(workspaceRoot, ".kb");
    mkdirSync(configDir, { recursive: true });
    writeFileSync(join(configDir, "config.json"), "{", "utf8");
    writeFileSync(join(workspaceRoot, "symbols.yaml"), "symbols: []\n", "utf8");

    const result = (
      manifestPathExports.resolveSymbolsManifestPaths as (
        workspaceRoot: string,
        configPath?: string,
      ) => { coordinatesPath: string; symbolsPath: string }
    )(workspaceRoot);

    expect(result).toEqual({
      coordinatesPath: join(workspaceRoot, "symbol-coordinates.yaml"),
      symbolsPath: join(workspaceRoot, "symbols.yaml"),
    });
  });

  test("uses explicit relative config path and falls back on blank configured value", async () => {
    const manifestPathExports = await import(manifestPathsModulePath).catch(
      () => {
        return {} as Record<string, unknown>;
      },
    );

    expect(typeof manifestPathExports.resolveSymbolsManifestPaths).toBe(
      "function",
    );
    if (typeof manifestPathExports.resolveSymbolsManifestPaths !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    mkdirSync(join(workspaceRoot, "config"), { recursive: true });
    writeFileSync(
      join(workspaceRoot, "config", "symbols-config.json"),
      JSON.stringify({ paths: { symbols: "   " }, symbolsManifest: "" }),
      "utf8",
    );
    writeFileSync(join(workspaceRoot, "symbols.yml"), "symbols: []\n", "utf8");

    const result = (
      manifestPathExports.resolveSymbolsManifestPaths as (
        workspaceRoot: string,
        configPath?: string,
      ) => { coordinatesPath: string; symbolsPath: string }
    )(workspaceRoot, "config/symbols-config.json");

    expect(result).toEqual({
      coordinatesPath: join(workspaceRoot, "symbol-coordinates.yaml"),
      symbolsPath: join(workspaceRoot, "symbols.yml"),
    });
  });

  test("backward compatible wrapper returns only the symbols path", async () => {
    const manifestPathExports = await import(manifestPathsModulePath).catch(
      () => {
        return {} as Record<string, unknown>;
      },
    );

    expect(typeof manifestPathExports.resolveSymbolsManifestPath).toBe(
      "function",
    );
    if (typeof manifestPathExports.resolveSymbolsManifestPath !== "function") {
      return;
    }

    const workspaceRoot = createWorkspace();
    const resolvedSymbolsPath = (
      manifestPathExports.resolveSymbolsManifestPath as (
        workspaceRoot: string,
        configPath?: string,
      ) => string
    )(workspaceRoot);

    expect(resolvedSymbolsPath).toBe(
      join(workspaceRoot, "documentation", "symbols.yaml"),
    );
  });
});
