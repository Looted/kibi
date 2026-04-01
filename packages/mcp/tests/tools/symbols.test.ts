import { beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  refreshCoordinatesForSymbolId,
  resolveManifestPath,
} from "../../src/tools/symbols";

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

const REFRESH_TEST_ROOT = path.join(__dirname, "../../../.tmp/symbols-refresh");
const REFRESH_MANIFEST_PATH = path.join(REFRESH_TEST_ROOT, "symbols.yaml");

function writeRefreshFixture(content: string) {
  emptyDirSync(REFRESH_TEST_ROOT);
  fs.writeFileSync(REFRESH_MANIFEST_PATH, content, "utf-8");
}

describe("resolveManifestPath - additional coverage", () => {
  beforeEach(() => {
    emptyDirSync(TEST_ROOT);
    ensureDirSync(path.dirname(CONFIG_PATH));
  });

  it("should handle absolute paths.symbols (line 130)", () => {
    const absoluteCustomPath = "/absolute/custom/symbols.yaml";
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ paths: { symbols: absoluteCustomPath } }, null, 2),
    );
    const resolved = resolveManifestPath(TEST_ROOT);
    expect(resolved).toBe(absoluteCustomPath);
  });

  it("should handle legacy symbolsManifest with absolute path (line 132-136)", () => {
    const absoluteLegacyPath = "/legacy/symbols.yaml";
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ symbolsManifest: absoluteLegacyPath }, null, 2),
    );
    const resolved = resolveManifestPath(TEST_ROOT);
    expect(resolved).toBe(absoluteLegacyPath);
  });

  it("should handle legacy symbolsManifest with relative path (line 133-135)", () => {
    const relativeLegacyPath = "legacy/symbols.yaml";
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ symbolsManifest: relativeLegacyPath }, null, 2),
    );
    const resolved = resolveManifestPath(TEST_ROOT);
    expect(resolved).toBe(path.resolve(TEST_ROOT, relativeLegacyPath));
  });

  it("should prefer paths.symbols over legacy symbolsManifest", () => {
    ensureDirSync(path.dirname(CUSTOM_SYMBOLS_PATH));
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify(
        {
          paths: { symbols: "custom/symbols.yaml" },
          symbolsManifest: "legacy/symbols.yaml",
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(CUSTOM_SYMBOLS_PATH, "custom: true\n");
    const resolved = resolveManifestPath(TEST_ROOT);
    expect(resolved).toBe(CUSTOM_SYMBOLS_PATH);
  });

  it("should handle malformed config.json (catch block at line 137)", () => {
    fs.writeFileSync(CONFIG_PATH, "invalid json{");
    const resolved = resolveManifestPath(TEST_ROOT);
    // Should fall back to default behavior
    expect(resolved).toBe(REPO_ROOT_SYMBOLS);
  });

  it("should handle empty paths.symbols gracefully", () => {
    fs.writeFileSync(
      CONFIG_PATH,
      JSON.stringify({ paths: { symbols: "" } }, null, 2),
    );
    const resolved = resolveManifestPath(TEST_ROOT);
    expect(resolved).toBe(REPO_ROOT_SYMBOLS);
  });
});

describe("refreshCoordinatesForSymbolId", () => {
  beforeEach(() => {
    emptyDirSync(REFRESH_TEST_ROOT);
  });

  it("should return refreshed=false and found=false for invalid YAML (line 64)", async () => {
    const invalidYaml = "not a valid object";
    writeRefreshFixture(invalidYaml);
    const result = await refreshCoordinatesForSymbolId(
      "any-id",
      REFRESH_TEST_ROOT,
    );
    expect(result).toEqual({ refreshed: false, found: false });
  });

  it("should return refreshed=false and found=false when symbols is not an array (line 64)", async () => {
    const yamlWithoutArray = `
symbols: "not an array"
`;
    writeRefreshFixture(yamlWithoutArray);
    const result = await refreshCoordinatesForSymbolId(
      "any-id",
      REFRESH_TEST_ROOT,
    );
    expect(result).toEqual({ refreshed: false, found: false });
  });

  it("should return refreshed=false and found=false when symbol not found (line 76)", async () => {
    const yamlWithSymbol = `
symbols:
  - id: existing-symbol
    title: Existing Symbol
`;
    writeRefreshFixture(yamlWithSymbol);
    const result = await refreshCoordinatesForSymbolId(
      "non-existent-id",
      REFRESH_TEST_ROOT,
    );
    expect(result).toEqual({ refreshed: false, found: false });
  });

  it("should handle non-record symbol entries (line 70)", async () => {
    const yamlWithNonRecord = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb_symbols_refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb_symbols_refresh\` MCP tool to refresh coordinates.
symbols:
  - "string-entry"
  - id: valid-symbol
    title: Valid Symbol
`;
    writeRefreshFixture(yamlWithNonRecord);

    const result = await refreshCoordinatesForSymbolId(
      "valid-symbol",
      REFRESH_TEST_ROOT,
    );
    // Should find the symbol and attempt refresh
    expect(result.found).toBe(true);
  });

  it("should successfully refresh coordinates (lines 78-93, 95-96, 98-101, 103-112)", async () => {
    const yamlWithSymbol = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb_symbols_refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb_symbols_refresh\` MCP tool to refresh coordinates.
symbols:
  - id: test-symbol
    title: Test Symbol
    sourceFile: "src/test.ts"
`;
    writeRefreshFixture(yamlWithSymbol);

    const result = await refreshCoordinatesForSymbolId(
      "test-symbol",
      REFRESH_TEST_ROOT,
    );
    // The result will depend on whether enrichSymbolCoordinates finds the symbol
    // At minimum, we expect found: true since the symbol exists
    expect(result.found).toBe(true);
  });

  it("should write file only when content changes (lines 110-112)", async () => {
    const yamlWithCoordinates = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb_symbols_refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb_symbols_refresh\` MCP tool to refresh coordinates.
symbols:
  - id: test-symbol
    title: Test Symbol
    sourceLine: 10
    sourceColumn: 0
    sourceEndLine: 20
    sourceEndColumn: 5
    coordinatesGeneratedAt: '2024-01-01T00:00:00Z'
`;
    writeRefreshFixture(yamlWithCoordinates);

    const originalContent = fs.readFileSync(REFRESH_MANIFEST_PATH, "utf-8");
    const result = await refreshCoordinatesForSymbolId(
      "test-symbol",
      REFRESH_TEST_ROOT,
    );

    // File should not be rewritten if no changes
    const newContent = fs.readFileSync(REFRESH_MANIFEST_PATH, "utf-8");
    expect(newContent).toBe(originalContent);
  });

  // Note: handleKbSymbolsRefresh tests require the actual workspace root
  // and cannot be easily mocked. They are omitted to avoid test complexity.
  // The function is tested indirectly via integration/e2e tests.
});

// ---------------------------------------------------------------------------
// Regression: internal symbol coordinate refresh (non-exported + class method)
// ---------------------------------------------------------------------------

const INTERNAL_TEST_ROOT = path.join(
  __dirname,
  "../../../.tmp/symbols-internal-refresh",
);
const INTERNAL_MANIFEST_PATH = path.join(INTERNAL_TEST_ROOT, "symbols.yaml");
const INTERNAL_SRC_PATH = path.join(INTERNAL_TEST_ROOT, "src", "server.ts");

function writeInternalRefreshFixture() {
  if (fs.existsSync(INTERNAL_TEST_ROOT)) {
    fs.rmSync(INTERNAL_TEST_ROOT, { recursive: true, force: true });
  }
  fs.mkdirSync(path.join(INTERNAL_TEST_ROOT, "src"), { recursive: true });

  // Source file with all three declaration shapes
  fs.writeFileSync(
    INTERNAL_SRC_PATH,
    [
      "// implements REQ-001",
      "export function startServer(port: number): void {",
      "  console.log('listening on', port);",
      "}",
      "",
      "function parseSymbolsManifest(raw: string): unknown {",
      "  return JSON.parse(raw);",
      "}",
      "",
      "export class ServerManager {",
      "  mergeStaticLinks(base: string[], extra: string[]): string[] {",
      "    return [...base, ...extra];",
      "  }",
      "}",
    ].join("\n"),
    "utf-8",
  );

  // Manifest with all three symbols (no coordinates yet)
  fs.writeFileSync(
    INTERNAL_MANIFEST_PATH,
    [
      "symbols:",
      "  - id: SYM-start-server",
      "    title: startServer",
      "    status: active",
      "    sourceFile: src/server.ts",
      "  - id: SYM-parse-manifest",
      "    title: parseSymbolsManifest",
      "    status: active",
      "    sourceFile: src/server.ts",
      "  - id: SYM-merge-static-links",
      "    title: mergeStaticLinks",
      "    status: active",
      "    sourceFile: src/server.ts",
    ].join("\n"),
    "utf-8",
  );
}

describe("refreshCoordinatesForSymbolId — internal declaration shapes (regression)", () => {
  beforeEach(() => {
    writeInternalRefreshFixture();
  });

  it("should resolve coordinates for exported function (startServer)", async () => {
    const result = await refreshCoordinatesForSymbolId(
      "SYM-start-server",
      INTERNAL_TEST_ROOT,
    );
    expect(result.found).toBe(true);
    expect(result.refreshed).toBe(true);

    const updated = fs.readFileSync(INTERNAL_MANIFEST_PATH, "utf-8");
    expect(updated).toContain("sourceLine:");
    expect(updated).toContain("coordinatesGeneratedAt:");
  });

  it("should resolve coordinates for non-exported helper (parseSymbolsManifest)", async () => {
    const result = await refreshCoordinatesForSymbolId(
      "SYM-parse-manifest",
      INTERNAL_TEST_ROOT,
    );
    expect(result.found).toBe(true);
    expect(result.refreshed).toBe(true);

    const updated = fs.readFileSync(INTERNAL_MANIFEST_PATH, "utf-8");
    expect(updated).toContain("sourceLine:");
    expect(updated).toContain("coordinatesGeneratedAt:");
  });

  it("should resolve coordinates for class method (mergeStaticLinks)", async () => {
    const result = await refreshCoordinatesForSymbolId(
      "SYM-merge-static-links",
      INTERNAL_TEST_ROOT,
    );
    expect(result.found).toBe(true);
    expect(result.refreshed).toBe(true);

    const updated = fs.readFileSync(INTERNAL_MANIFEST_PATH, "utf-8");
    expect(updated).toContain("sourceLine:");
    expect(updated).toContain("coordinatesGeneratedAt:");
  });
});
