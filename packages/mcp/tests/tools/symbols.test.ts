import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  refreshCoordinatesForSymbolId,
  resolveManifestPath,
} from "../../src/tools/symbols";

// --- Shared helpers ---

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "kibi-symbols-"));
}

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

// ---------------------------------------------------------------------------
// Suite 1: resolveManifestPath precedence
// ---------------------------------------------------------------------------

describe("resolveManifestPath precedence (regression)", () => {
  let testRoot: string;
  let configPath: string;
  let repoRootSymbols: string;
  let customSymbolsPath: string;

  beforeEach(() => {
    testRoot = makeTmpDir();
    configPath = path.join(testRoot, ".kb/config.json");
    repoRootSymbols = path.join(testRoot, "symbols.yaml");
    customSymbolsPath = path.join(testRoot, "custom/symbols.yaml");
    emptyDirSync(testRoot);
  });

  afterEach(() => {
    fs.rmSync(testRoot, { recursive: true, force: true });
  });

  function writeFixture({
    configSymbolsPath,
    hasRepoRootSymbols,
    hasCustomSymbols,
  }: {
    configSymbolsPath: string | null;
    hasRepoRootSymbols: boolean;
    hasCustomSymbols: boolean;
  }) {
    emptyDirSync(testRoot);
    ensureDirSync(path.dirname(configPath));
    ensureDirSync(path.dirname(customSymbolsPath));

    if (configSymbolsPath) {
      fs.writeFileSync(
        configPath,
        JSON.stringify({ paths: { symbols: configSymbolsPath } }, null, 2),
      );
    }

    if (hasRepoRootSymbols) {
      fs.writeFileSync(repoRootSymbols, "repo-root: true\n");
    }

    if (hasCustomSymbols) {
      fs.writeFileSync(customSymbolsPath, "custom: true\n");
    }
  }

  it("should prefer .kb/config.json paths.symbols over repo-root symbols.yaml (regression)", () => {
    writeFixture({
      configSymbolsPath: "custom/symbols.yaml",
      hasRepoRootSymbols: true,
      hasCustomSymbols: true,
    });
    const resolved = resolveManifestPath(testRoot);
    expect(resolved).toBe(customSymbolsPath);
  });

  it("should fall back to repo-root symbols.yaml if no paths.symbols is set", () => {
    writeFixture({
      configSymbolsPath: null,
      hasRepoRootSymbols: true,
      hasCustomSymbols: true,
    });
    const resolved = resolveManifestPath(testRoot);
    expect(resolved).toBe(repoRootSymbols);
  });

  it("should return fallback path if neither config nor repo-root symbols.yaml exist", () => {
    writeFixture({
      configSymbolsPath: null,
      hasRepoRootSymbols: false,
      hasCustomSymbols: false,
    });
    const resolved = resolveManifestPath(testRoot);
    expect(resolved).toBe(repoRootSymbols);
  });
});

// ---------------------------------------------------------------------------
// Suite 2: resolveManifestPath additional coverage
// ---------------------------------------------------------------------------

describe("resolveManifestPath - additional coverage", () => {
  let testRoot: string;
  let configPath: string;
  let repoRootSymbols: string;
  let customSymbolsPath: string;

  beforeEach(() => {
    testRoot = makeTmpDir();
    configPath = path.join(testRoot, ".kb/config.json");
    repoRootSymbols = path.join(testRoot, "symbols.yaml");
    customSymbolsPath = path.join(testRoot, "custom/symbols.yaml");
    emptyDirSync(testRoot);
    ensureDirSync(path.dirname(configPath));
  });

  afterEach(() => {
    fs.rmSync(testRoot, { recursive: true, force: true });
  });

  it("should handle absolute paths.symbols (line 130)", () => {
    const absoluteCustomPath = "/absolute/custom/symbols.yaml";
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: absoluteCustomPath } }, null, 2),
    );
    const resolved = resolveManifestPath(testRoot);
    expect(resolved).toBe(absoluteCustomPath);
  });

  it("should handle legacy symbolsManifest with absolute path (line 132-136)", () => {
    const absoluteLegacyPath = "/legacy/symbols.yaml";
    fs.writeFileSync(
      configPath,
      JSON.stringify({ symbolsManifest: absoluteLegacyPath }, null, 2),
    );
    const resolved = resolveManifestPath(testRoot);
    expect(resolved).toBe(absoluteLegacyPath);
  });

  it("should handle legacy symbolsManifest with relative path (line 133-135)", () => {
    const relativeLegacyPath = "legacy/symbols.yaml";
    fs.writeFileSync(
      configPath,
      JSON.stringify({ symbolsManifest: relativeLegacyPath }, null, 2),
    );
    const resolved = resolveManifestPath(testRoot);
    expect(resolved).toBe(path.resolve(testRoot, relativeLegacyPath));
  });

  it("should prefer paths.symbols over legacy symbolsManifest", () => {
    ensureDirSync(path.dirname(customSymbolsPath));
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          paths: { symbols: "custom/symbols.yaml" },
          symbolsManifest: "legacy/symbols.yaml",
        },
        null,
        2,
      ),
    );
    fs.writeFileSync(customSymbolsPath, "custom: true\n");
    const resolved = resolveManifestPath(testRoot);
    expect(resolved).toBe(customSymbolsPath);
  });

  it("should handle malformed config.json (catch block at line 137)", () => {
    fs.writeFileSync(configPath, "invalid json{");
    const resolved = resolveManifestPath(testRoot);
    expect(resolved).toBe(repoRootSymbols);
  });

  it("should handle empty paths.symbols gracefully", () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: "" } }, null, 2),
    );
    const resolved = resolveManifestPath(testRoot);
    expect(resolved).toBe(repoRootSymbols);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: refreshCoordinatesForSymbolId
// ---------------------------------------------------------------------------

describe("refreshCoordinatesForSymbolId", () => {
  let refreshTestRoot: string;
  let refreshManifestPath: string;

  beforeEach(() => {
    refreshTestRoot = makeTmpDir();
    refreshManifestPath = path.join(refreshTestRoot, "symbols.yaml");
    emptyDirSync(refreshTestRoot);
  });

  afterEach(() => {
    fs.rmSync(refreshTestRoot, { recursive: true, force: true });
  });

  function writeRefreshFixture(content: string) {
    emptyDirSync(refreshTestRoot);
    fs.writeFileSync(refreshManifestPath, content, "utf-8");
  }

  it("should return refreshed=false and found=false for invalid YAML (line 64)", async () => {
    writeRefreshFixture("not a valid object");
    const result = await refreshCoordinatesForSymbolId(
      "any-id",
      refreshTestRoot,
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
      refreshTestRoot,
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
      refreshTestRoot,
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
      refreshTestRoot,
    );
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
      refreshTestRoot,
    );
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

    const originalContent = fs.readFileSync(refreshManifestPath, "utf-8");
    await refreshCoordinatesForSymbolId("test-symbol", refreshTestRoot);

    const newContent = fs.readFileSync(refreshManifestPath, "utf-8");
    expect(newContent).toBe(originalContent);
  });
});

// ---------------------------------------------------------------------------
// Suite 4: refreshCoordinatesForSymbolId — internal declaration shapes
// ---------------------------------------------------------------------------

describe("refreshCoordinatesForSymbolId — internal declaration shapes (regression)", () => {
  let internalTestRoot: string;
  let internalManifestPath: string;
  let internalSrcPath: string;

  beforeEach(() => {
    internalTestRoot = makeTmpDir();
    internalManifestPath = path.join(internalTestRoot, "symbols.yaml");
    internalSrcPath = path.join(internalTestRoot, "src", "server.ts");

    // Source file with all three declaration shapes
    fs.mkdirSync(path.join(internalTestRoot, "src"), { recursive: true });
    fs.writeFileSync(
      internalSrcPath,
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
      internalManifestPath,
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
  });

  afterEach(() => {
    fs.rmSync(internalTestRoot, { recursive: true, force: true });
  });

  it("should resolve coordinates for exported function (startServer)", async () => {
    const result = await refreshCoordinatesForSymbolId(
      "SYM-start-server",
      internalTestRoot,
    );
    expect(result.found).toBe(true);
    expect(result.refreshed).toBe(true);

    const updated = fs.readFileSync(internalManifestPath, "utf-8");
    expect(updated).toContain("sourceLine:");
    expect(updated).toContain("coordinatesGeneratedAt:");
  });

  it("should resolve coordinates for non-exported helper (parseSymbolsManifest)", async () => {
    const result = await refreshCoordinatesForSymbolId(
      "SYM-parse-manifest",
      internalTestRoot,
    );
    expect(result.found).toBe(true);
    expect(result.refreshed).toBe(true);

    const updated = fs.readFileSync(internalManifestPath, "utf-8");
    expect(updated).toContain("sourceLine:");
    expect(updated).toContain("coordinatesGeneratedAt:");
  });

  it("should resolve coordinates for class method (mergeStaticLinks)", async () => {
    const result = await refreshCoordinatesForSymbolId(
      "SYM-merge-static-links",
      internalTestRoot,
    );
    expect(result.found).toBe(true);
    expect(result.refreshed).toBe(true);

    const updated = fs.readFileSync(internalManifestPath, "utf-8");
    expect(updated).toContain("sourceLine:");
    expect(updated).toContain("coordinatesGeneratedAt:");
  });
});
