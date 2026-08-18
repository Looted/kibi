/**
 * Tests for manifestResolver.ts
 * Pure function with file system operations - needs temp directories
 */

import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  test,
} from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as manifestResolver from "../src/shared/manifestResolver";

const resolveSymbolsManifestPath = manifestResolver.resolveSymbolsManifestPath;
const resolveSymbolsManifestPaths = (
  manifestResolver as Record<string, unknown>
).resolveSymbolsManifestPaths as
  | ((workspaceRoot: string) => {
      symbolsPath: string;
      coordinatesPath: string;
    })
  | undefined;

let tempDir: string;

beforeAll(() => {
  tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), "kibi-manifest-resolver-test-"),
  );
});

afterEach(() => {
  const kbDir = path.join(tempDir, ".kb");
  if (fs.existsSync(kbDir)) {
    fs.rmSync(kbDir, { recursive: true });
  }
  for (const name of ["symbols.yaml", "symbols.yml"]) {
    const candidate = path.join(tempDir, name);
    if (fs.existsSync(candidate)) {
      fs.unlinkSync(candidate);
    }
  }
  const docsDir = path.join(tempDir, "documentation");
  if (fs.existsSync(docsDir)) {
    fs.rmSync(docsDir, { recursive: true, force: true });
  }
  const customDir = path.join(tempDir, "custom");
  if (fs.existsSync(customDir)) {
    fs.rmSync(customDir, { recursive: true, force: true });
  }
});

afterAll(() => {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true });
  }
});

function writeKbSymbols(): string {
  const kbDir = path.join(tempDir, ".kb");
  fs.mkdirSync(kbDir, { recursive: true });
  const symbolsPath = path.join(kbDir, "symbols.yaml");
  fs.writeFileSync(symbolsPath, "symbols: []");
  return symbolsPath;
}

describe("resolveSymbolsManifestPath - canonical layout", () => {
  test("resolveSymbolsManifestPaths returns canonical paths when nothing exists", () => {
    expect(typeof resolveSymbolsManifestPaths).toBe("function");
    if (typeof resolveSymbolsManifestPaths !== "function") {
      return;
    }

    const result = resolveSymbolsManifestPaths(tempDir);
    expect(result).toEqual({
      symbolsPath: path.join(tempDir, ".kb", "symbols.yaml"),
      coordinatesPath: path.join(tempDir, ".kb", "symbol-coordinates.yaml"),
    });
    expect(resolveSymbolsManifestPath(tempDir)).toBe(result.symbolsPath);
  });

  test("empty workspace resolves to canonical .kb/symbols.yaml", () => {
    expect(resolveSymbolsManifestPath(tempDir)).toBe(
      path.join(tempDir, ".kb", "symbols.yaml"),
    );
  });

  test(".kb/symbols.yaml wins over leftover config.json and repo-root files", () => {
    const canonical = writeKbSymbols();
    fs.mkdirSync(path.join(tempDir, ".kb"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, ".kb", "config.json"),
      JSON.stringify({ paths: { symbols: "custom/symbols.yaml" } }),
    );
    fs.mkdirSync(path.join(tempDir, "custom"), { recursive: true });
    fs.writeFileSync(path.join(tempDir, "custom", "symbols.yaml"), "custom: true");
    fs.writeFileSync(path.join(tempDir, "symbols.yaml"), "root: true");

    expect(resolveSymbolsManifestPath(tempDir)).toBe(canonical);
  });

  test("legacy documentation/symbols.yaml is used when canonical is missing", () => {
    const docsDir = path.join(tempDir, "documentation");
    fs.mkdirSync(docsDir, { recursive: true });
    const docsSymbols = path.join(docsDir, "symbols.yaml");
    fs.writeFileSync(docsSymbols, "symbols: []");

    expect(resolveSymbolsManifestPath(tempDir)).toBe(docsSymbols);
  });

  test("repo-root symbols.yaml is used when canonical and documentation copies are missing", () => {
    const symbolsYaml = path.join(tempDir, "symbols.yaml");
    fs.writeFileSync(symbolsYaml, "test: value");
    expect(resolveSymbolsManifestPath(tempDir)).toBe(symbolsYaml);
  });

  test("repo-root symbols.yml is used when no yaml sibling exists", () => {
    const symbolsYml = path.join(tempDir, "symbols.yml");
    fs.writeFileSync(symbolsYml, "test: value");
    expect(resolveSymbolsManifestPath(tempDir)).toBe(symbolsYml);
  });

  test("leftover config.json cannot relocate the manifest", () => {
    fs.mkdirSync(path.join(tempDir, ".kb"), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, ".kb", "config.json"),
      JSON.stringify({ paths: { symbols: "custom/symbols.yaml" } }),
    );
    fs.mkdirSync(path.join(tempDir, "custom"), { recursive: true });
    const custom = path.join(tempDir, "custom", "symbols.yaml");
    fs.writeFileSync(custom, "custom: true");

    expect(resolveSymbolsManifestPath(tempDir)).toBe(
      path.join(tempDir, ".kb", "symbols.yaml"),
    );
  });
});

describe("resolveSymbolsManifestPaths - coordinates", () => {
  test("prefers canonical .kb/symbol-coordinates.yaml when present", () => {
    expect(typeof resolveSymbolsManifestPaths).toBe("function");
    if (typeof resolveSymbolsManifestPaths !== "function") {
      return;
    }

    const canonical = writeKbSymbols();
    const coordinatesPath = path.join(tempDir, ".kb", "symbol-coordinates.yaml");
    fs.writeFileSync(coordinatesPath, "coordinates: {}");

    expect(resolveSymbolsManifestPaths(tempDir)).toEqual({
      symbolsPath: canonical,
      coordinatesPath,
    });
  });

  test("legacy documentation coordinates sit beside the legacy symbols file", () => {
    expect(typeof resolveSymbolsManifestPaths).toBe("function");
    if (typeof resolveSymbolsManifestPaths !== "function") {
      return;
    }

    const docsDir = path.join(tempDir, "documentation");
    fs.mkdirSync(docsDir, { recursive: true });
    const docsSymbols = path.join(docsDir, "symbols.yaml");
    fs.writeFileSync(docsSymbols, "symbols: []");

    expect(resolveSymbolsManifestPaths(tempDir)).toEqual({
      symbolsPath: docsSymbols,
      coordinatesPath: path.join(docsDir, "symbol-coordinates.yaml"),
    });
  });
});
