import { beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { resolveManifestPath } from "../../src/tools/symbols";

const TEST_ROOT = path.join(
  __dirname,
  "../../../.tmp/symbols-manifest-precedence",
);
const CONFIG_PATH = path.join(TEST_ROOT, ".kb/config.json");
const REPO_ROOT_SYMBOLS = path.join(TEST_ROOT, "symbols.yaml");
const CUSTOM_SYMBOLS_PATH = path.join(TEST_ROOT, "custom/symbols.yaml");

function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function emptyDirSync(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

function writeFixture({
  configSymbolsPath,
  hasRepoRootSymbols,
  hasCustomSymbols,
}: {
  configSymbolsPath: string | null;
  hasRepoRootSymbols: boolean;
  hasCustomSymbols: boolean;
}) {
  emptyDirSync(TEST_ROOT);
  ensureDirSync(path.dirname(CONFIG_PATH));
  ensureDirSync(path.dirname(CUSTOM_SYMBOLS_PATH));

  // Write .kb/config.json with paths.symbols if provided
  if (configSymbolsPath) {
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ paths: { symbols: configSymbolsPath } }, null, 2),
    );
  }

  // Write stray repo-root symbols.yaml if requested
  if (hasRepoRootSymbols) {
    fs.writeFileSync(REPO_ROOT_SYMBOLS, "repo-root: true\n");
  }

  // Write custom symbols.yaml if requested
  if (hasCustomSymbols) {
    ensureDirSync(path.dirname(CUSTOM_SYMBOLS_PATH));
    fs.writeFileSync(CUSTOM_SYMBOLS_PATH, "custom: true\n");
  }
}

describe("resolveManifestPath precedence (regression)", () => {
  beforeEach(() => {
    emptyDirSync(TEST_ROOT);
  });

  it("should prefer .kb/config.json paths.symbols over repo-root symbols.yaml (regression)", () => {
    writeFixture({
      configSymbolsPath: "custom/symbols.yaml",
      hasRepoRootSymbols: true,
      hasCustomSymbols: true,
    });
    // This is the regression: MCP currently ignores paths.symbols and picks repo-root
    const resolved = resolveManifestPath(TEST_ROOT);
    // This should be CUSTOM_SYMBOLS_PATH, but MCP currently returns REPO_ROOT_SYMBOLS
    expect(resolved).toBe(CUSTOM_SYMBOLS_PATH);
  });

  it("should fall back to repo-root symbols.yaml if no paths.symbols is set", () => {
    writeFixture({
      configSymbolsPath: null,
      hasRepoRootSymbols: true,
      hasCustomSymbols: true,
    });
    const resolved = resolveManifestPath(TEST_ROOT);
    expect(resolved).toBe(REPO_ROOT_SYMBOLS);
  });

  it("should return fallback path if neither config nor repo-root symbols.yaml exist", () => {
    writeFixture({
      configSymbolsPath: null,
      hasRepoRootSymbols: false,
      hasCustomSymbols: false,
    });
    const resolved = resolveManifestPath(TEST_ROOT);
    expect(resolved).toBe(REPO_ROOT_SYMBOLS);
  });
});
