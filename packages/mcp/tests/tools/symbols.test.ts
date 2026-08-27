import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { load as parseYAML } from "js-yaml";
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

function readCoordinatesArtifact(
  filePath: string,
): Record<string, Record<string, unknown>> {
  const parsed = parseYAML(fs.readFileSync(filePath, "utf-8")) as
    | { coordinates?: Record<string, Record<string, unknown>> }
    | undefined;

  return parsed?.coordinates ?? {};
}

// ---------------------------------------------------------------------------
// Suite 1: resolveManifestPath precedence
// ---------------------------------------------------------------------------

describe("resolveManifestPath precedence (regression)", () => {
  let testRoot: string;
  let configPath: string;
  let repoRootSymbols: string;
  let customSymbolsPath: string;
  let canonicalSymbols: string;

  beforeEach(() => {
    testRoot = makeTmpDir();
    configPath = path.join(testRoot, ".kb/config.json");
    repoRootSymbols = path.join(testRoot, "symbols.yaml");
    customSymbolsPath = path.join(testRoot, "custom/symbols.yaml");
    canonicalSymbols = path.join(testRoot, ".kb/symbols.yaml");
    emptyDirSync(testRoot);
  });

  afterEach(() => {
    fs.rmSync(testRoot, { recursive: true, force: true });
  });

  function writeFixture({
    configSymbolsPath,
    hasRepoRootSymbols,
    hasCustomSymbols,
    hasCanonicalSymbols,
  }: {
    configSymbolsPath: string | null;
    hasRepoRootSymbols: boolean;
    hasCustomSymbols: boolean;
    hasCanonicalSymbols?: boolean;
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

    if (hasCanonicalSymbols) {
      fs.writeFileSync(canonicalSymbols, "canonical: true\n");
    }

    if (hasRepoRootSymbols) {
      fs.writeFileSync(repoRootSymbols, "repo-root: true\n");
    }

    if (hasCustomSymbols) {
      fs.writeFileSync(customSymbolsPath, "custom: true\n");
    }
  }

  it("prefers canonical .kb/symbols.yaml over leftover config.json custom paths", async () => {
    writeFixture({
      configSymbolsPath: "custom/symbols.yaml",
      hasRepoRootSymbols: true,
      hasCustomSymbols: true,
      hasCanonicalSymbols: true,
    });
    const resolved = await resolveManifestPath(testRoot);
    expect(resolved).toBe(canonicalSymbols);
  });

  it("ignores leftover repo-root symbols.yaml when canonical is missing", async () => {
    writeFixture({
      configSymbolsPath: null,
      hasRepoRootSymbols: true,
      hasCustomSymbols: true,
    });
    const resolved = await resolveManifestPath(testRoot);
    expect(resolved).toBe(canonicalSymbols);
  });

  it("returns canonical .kb/symbols.yaml when no symbols file exists", async () => {
    writeFixture({
      configSymbolsPath: null,
      hasRepoRootSymbols: false,
      hasCustomSymbols: false,
    });
    const resolved = await resolveManifestPath(testRoot);
    expect(resolved).toBe(canonicalSymbols);
  });
});

describe("resolveManifestPath - leftover config.json is ignored", () => {
  let testRoot: string;
  let configPath: string;
  let repoRootSymbols: string;
  let customSymbolsPath: string;
  let canonicalSymbols: string;

  beforeEach(() => {
    testRoot = makeTmpDir();
    configPath = path.join(testRoot, ".kb/config.json");
    repoRootSymbols = path.join(testRoot, "symbols.yaml");
    customSymbolsPath = path.join(testRoot, "custom/symbols.yaml");
    canonicalSymbols = path.join(testRoot, ".kb/symbols.yaml");
    emptyDirSync(testRoot);
    ensureDirSync(path.dirname(configPath));
  });

  afterEach(() => {
    fs.rmSync(testRoot, { recursive: true, force: true });
  });

  it("ignores leftover absolute paths.symbols", async () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        { paths: { symbols: "/absolute/custom/symbols.yaml" } },
        null,
        2,
      ),
    );
    const resolved = await resolveManifestPath(testRoot);
    expect(resolved).toBe(canonicalSymbols);
  });

  it("ignores leftover symbolsManifest", async () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({ symbolsManifest: "/legacy/symbols.yaml" }, null, 2),
    );
    const resolved = await resolveManifestPath(testRoot);
    expect(resolved).toBe(canonicalSymbols);
  });

  it("ignores leftover custom relative paths even when the custom file exists", async () => {
    ensureDirSync(path.dirname(customSymbolsPath));
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: "custom/symbols.yaml" } }, null, 2),
    );
    fs.writeFileSync(customSymbolsPath, "custom: true\n");
    const resolved = await resolveManifestPath(testRoot);
    expect(resolved).toBe(canonicalSymbols);
  });

  it("ignores malformed leftover config.json", async () => {
    fs.writeFileSync(configPath, "invalid json{");
    const resolved = await resolveManifestPath(testRoot);
    expect(resolved).toBe(canonicalSymbols);
  });

  it("still ignores leftover repo-root symbols.yaml after ignoring leftover config", async () => {
    fs.writeFileSync(
      configPath,
      JSON.stringify({ paths: { symbols: "" } }, null, 2),
    );
    fs.writeFileSync(repoRootSymbols, "repo-root: true\n");
    const resolved = await resolveManifestPath(testRoot);
    expect(resolved).toBe(canonicalSymbols);
  });
});

// ---------------------------------------------------------------------------
// Suite 3: refreshCoordinatesForSymbolId
// ---------------------------------------------------------------------------

describe("refreshCoordinatesForSymbolId", () => {
  let refreshTestRoot: string;
  let refreshManifestPath: string;
  let refreshCoordinatesPath: string;

  beforeEach(() => {
    refreshTestRoot = makeTmpDir();
    refreshManifestPath = path.join(refreshTestRoot, ".kb", "symbols.yaml");
    refreshCoordinatesPath = path.join(
      refreshTestRoot,
      ".kb",
      "symbol-coordinates.yaml",
    );
    emptyDirSync(refreshTestRoot);
  });

  afterEach(() => {
    fs.rmSync(refreshTestRoot, { recursive: true, force: true });
  });

  function writeRefreshFixture(content: string) {
    emptyDirSync(refreshTestRoot);
    fs.mkdirSync(path.dirname(refreshManifestPath), { recursive: true });
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
    expect(fs.existsSync(refreshCoordinatesPath)).toBe(false);
  });

  it("writes refreshed coordinates to symbol-coordinates.yaml", async () => {
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
    fs.mkdirSync(path.join(refreshTestRoot, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(refreshTestRoot, "src/test.ts"),
      "export function Test Symbol() {\n  return true;\n}\n",
      "utf-8",
    );

    const result = await refreshCoordinatesForSymbolId(
      "test-symbol",
      refreshTestRoot,
    );
    expect(result.found).toBe(true);
    expect(result.refreshed).toBe(true);
    expect(fs.readFileSync(refreshManifestPath, "utf-8")).toBe(yamlWithSymbol);
    expect(fs.existsSync(refreshCoordinatesPath)).toBe(true);

    const coordinates = readCoordinatesArtifact(refreshCoordinatesPath);
    expect(coordinates["test-symbol"]).toEqual(
      expect.objectContaining({
        sourceFile: "src/test.ts",
        sourceLine: expect.any(Number),
        sourceColumn: expect.any(Number),
        sourceEndLine: expect.any(Number),
        sourceEndColumn: expect.any(Number),
        identityHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        sourceHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    );
  });

  it("uses a whole-file span for an unmatched coarse anchor", async () => {
    const source = "first line\nsecond line\n";
    writeRefreshFixture(
      "symbols:\n  - id: coarse-symbol\n    title: missing suite title\n    sourceFile: src/coarse.ts\n    granularity_reason: extractor-miss\n",
    );
    fs.mkdirSync(path.join(refreshTestRoot, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(refreshTestRoot, "src/coarse.ts"),
      source,
      "utf-8",
    );

    const result = await refreshCoordinatesForSymbolId(
      "coarse-symbol",
      refreshTestRoot,
    );

    expect(result.refreshed).toBe(true);
    expect(
      readCoordinatesArtifact(refreshCoordinatesPath)["coarse-symbol"],
    ).toEqual(
      expect.objectContaining({
        sourceLine: 1,
        sourceColumn: 0,
        sourceEndLine: 3,
        sourceEndColumn: 0,
      }),
    );
  });

  it("preserves an unrelated legacy whole-file coarse record during targeted refresh", async () => {
    writeRefreshFixture(
      [
        "symbols:",
        "  - id: target-symbol",
        "    title: targetSymbol",
        "    sourceFile: src/target.ts",
        "  - id: coarse-symbol",
        "    title: missing suite title",
        "    sourceFile: src/coarse.ts",
        "    granularity_reason: extractor-miss",
      ].join("\n"),
    );
    fs.mkdirSync(path.join(refreshTestRoot, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(refreshTestRoot, "src/target.ts"),
      "export function targetSymbol() {}\n",
      "utf-8",
    );
    fs.writeFileSync(
      path.join(refreshTestRoot, "src/coarse.ts"),
      "first line\nsecond line\n",
      "utf-8",
    );
    fs.writeFileSync(
      refreshCoordinatesPath,
      [
        "coordinates:",
        "  target-symbol:",
        "    sourceFile: src/target.ts",
        "    sourceLine: 1",
        "    sourceColumn: 16",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 27",
        "  coarse-symbol:",
        "    sourceFile: src/coarse.ts",
        "    sourceLine: 1",
        "    sourceColumn: 0",
        "    sourceEndLine: 3",
        "    sourceEndColumn: 0",
        "",
      ].join("\n"),
      "utf-8",
    );

    const result = await refreshCoordinatesForSymbolId(
      "target-symbol",
      refreshTestRoot,
    );

    expect(result.found).toBe(true);
    const coordinates = readCoordinatesArtifact(refreshCoordinatesPath);
    expect(coordinates["coarse-symbol"]).toEqual({
      sourceFile: "src/coarse.ts",
      sourceLine: 1,
      sourceColumn: 0,
      sourceEndLine: 3,
      sourceEndColumn: 0,
    });
  });

  it("omits stale coordinates after a symbol is renamed", async () => {
    writeRefreshFixture(
      "symbols:\n  - id: renamed-symbol\n    title: oldName\n    sourceFile: src/renamed.ts\n",
    );
    fs.mkdirSync(path.join(refreshTestRoot, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(refreshTestRoot, "src/renamed.ts"),
      "export function newName() {}\n",
      "utf-8",
    );
    fs.writeFileSync(
      refreshCoordinatesPath,
      [
        "version: 2",
        "coordinates:",
        "  renamed-symbol:",
        "    sourceFile: src/renamed.ts",
        "    sourceLine: 1",
        "    sourceColumn: 16",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 23",
        `    identityHash: ${"a".repeat(64)}`,
        `    sourceHash: ${"b".repeat(64)}`,
        "",
      ].join("\n"),
      "utf-8",
    );

    const result = await refreshCoordinatesForSymbolId(
      "renamed-symbol",
      refreshTestRoot,
    );

    expect(result).toMatchObject({ refreshed: false, found: true });
    expect(
      readCoordinatesArtifact(refreshCoordinatesPath)["renamed-symbol"],
    ).toBeUndefined();
  });

  it("does not publish unbound inline coordinates when source is unavailable", async () => {
    const yamlWithCoordinates = `# symbols.yaml
# AUTHORED fields (edit freely):
#   id, title, sourceFile, links, status, tags, owner, priority
# GENERATED fields (never edit manually — overwritten by kibi sync and kb_symbols_refresh):
#   sourceLine, sourceColumn, sourceEndLine, sourceEndColumn, coordinatesGeneratedAt
# Run \`kibi sync\` or call the \`kb_symbols_refresh\` MCP tool to refresh coordinates.
symbols:
  - id: test-symbol
    title: Test Symbol
    sourceFile: "src/test.ts"
    sourceLine: 10
    sourceColumn: 0
    sourceEndLine: 20
    sourceEndColumn: 5
    coordinatesGeneratedAt: '2024-01-01T00:00:00Z'
`;
    writeRefreshFixture(yamlWithCoordinates);

    const result = await refreshCoordinatesForSymbolId(
      "test-symbol",
      refreshTestRoot,
    );

    expect(result).toEqual({ refreshed: true, found: true });
    expect(fs.readFileSync(refreshManifestPath, "utf-8")).toBe(
      yamlWithCoordinates,
    );
    expect(fs.existsSync(refreshCoordinatesPath)).toBe(false);
  });

  it("rejects malformed coordinate records in legacy artifacts", async () => {
    const yamlWithSymbol = `symbols:
  - id: test-symbol
    title: Missing Symbol
`;
    writeRefreshFixture(yamlWithSymbol);
    fs.writeFileSync(
      refreshCoordinatesPath,
      [
        "coordinates:",
        "  valid-symbol:",
        "    sourceFile: src/valid.ts",
        "    sourceLine: 1",
        "    sourceColumn: 0",
        "    sourceEndLine: 1",
        "    sourceEndColumn: 5",
        "  malformed-symbol: not-a-record",
      ].join("\n"),
      "utf-8",
    );

    await expect(
      refreshCoordinatesForSymbolId("test-symbol", refreshTestRoot),
    ).rejects.toThrow(/invalid coordinate span/);
  });

  it("accepts a live-valid legacy artifact during targeted refresh", async () => {
    const yamlWithSymbol =
      "symbols:\n  - id: test-symbol\n    title: testSymbol\n    sourceFile: src/test.ts\n";
    writeRefreshFixture(yamlWithSymbol);
    fs.mkdirSync(path.join(refreshTestRoot, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(refreshTestRoot, "src/test.ts"),
      "export function testSymbol() {\n  return true;\n}\n",
      "utf-8",
    );
    fs.writeFileSync(
      refreshCoordinatesPath,
      "coordinates:\n  test-symbol:\n    sourceFile: src/test.ts\n    sourceLine: 1\n    sourceColumn: 16\n    sourceEndLine: 1\n    sourceEndColumn: 26\n",
      "utf-8",
    );

    const result = await refreshCoordinatesForSymbolId(
      "test-symbol",
      refreshTestRoot,
    );

    expect(result.found).toBe(true);
    expect(
      readCoordinatesArtifact(refreshCoordinatesPath)["test-symbol"],
    ).toEqual(
      expect.objectContaining({
        sourceFile: "src/test.ts",
        sourceLine: 1,
        sourceColumn: 16,
      }),
    );
    expect(
      parseYAML(fs.readFileSync(refreshCoordinatesPath, "utf-8")),
    ).not.toHaveProperty("version");
  });

  it("fails closed and preserves the artifact when the targeted read is denied", async () => {
    const yamlWithSymbol =
      "symbols:\n  - id: test-symbol\n    title: testSymbol\n    sourceFile: src/test.ts\n";
    writeRefreshFixture(yamlWithSymbol);
    fs.mkdirSync(path.join(refreshTestRoot, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(refreshTestRoot, "src/test.ts"),
      "export function testSymbol() {\n  return true;\n}\n",
      "utf-8",
    );
    const originalArtifact = [
      "version: 2",
      "coordinates:",
      "  test-symbol:",
      "    sourceFile: src/test.ts",
      "    sourceLine: 1",
      "    sourceColumn: 16",
      "    sourceEndLine: 1",
      "    sourceEndColumn: 26",
      `    identityHash: ${"a".repeat(64)}`,
      `    sourceHash: ${"b".repeat(64)}`,
      "",
    ].join("\n");
    fs.writeFileSync(refreshCoordinatesPath, originalArtifact, "utf-8");
    fs.chmodSync(refreshCoordinatesPath, 0o000);

    try {
      await expect(
        refreshCoordinatesForSymbolId("test-symbol", refreshTestRoot),
      ).rejects.toMatchObject({ code: "EACCES" });
    } finally {
      fs.chmodSync(refreshCoordinatesPath, 0o644);
    }

    expect(fs.readFileSync(refreshCoordinatesPath, "utf-8")).toBe(
      originalArtifact,
    );
    expect(
      fs
        .readdirSync(path.dirname(refreshCoordinatesPath))
        .filter((entry) => entry.includes("symbol-coordinates.yaml.kibi-tmp-")),
    ).toEqual([]);
  });

  it("rejects fractional and reversed legacy spans", async () => {
    writeRefreshFixture(
      "symbols:\n  - id: test-symbol\n    title: testSymbol\n",
    );
    fs.writeFileSync(
      refreshCoordinatesPath,
      "coordinates:\n  test-symbol:\n    sourceFile: src/test.ts\n    sourceLine: 1.5\n    sourceColumn: 0\n    sourceEndLine: 0\n    sourceEndColumn: 1\n",
      "utf-8",
    );

    await expect(
      refreshCoordinatesForSymbolId("test-symbol", refreshTestRoot),
    ).rejects.toThrow(/invalid coordinate span/);
  });

  it("matches the CLI span contract for every invalid boundary", async () => {
    const invalidSpans = [
      "sourceFile: ''\n    sourceLine: 1\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: 1",
      "sourceFile: src/test.ts\n    sourceLine: 0\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: 1",
      "sourceFile: src/test.ts\n    sourceLine: 1\n    sourceColumn: -1\n    sourceEndLine: 1\n    sourceEndColumn: 1",
      "sourceFile: src/test.ts\n    sourceLine: 1\n    sourceColumn: 0.5\n    sourceEndLine: 1\n    sourceEndColumn: 1",
      "sourceFile: src/test.ts\n    sourceLine: 2\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: 1",
      "sourceFile: src/test.ts\n    sourceLine: 1\n    sourceColumn: 0\n    sourceEndLine: 1.5\n    sourceEndColumn: 1",
      "sourceFile: src/test.ts\n    sourceLine: 1\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: -1",
      "sourceFile: src/test.ts\n    sourceLine: 1\n    sourceColumn: 0\n    sourceEndLine: 1\n    sourceEndColumn: 1.5",
    ];

    for (const span of invalidSpans) {
      writeRefreshFixture("symbols:\n  - id: test-symbol\n");
      fs.writeFileSync(
        refreshCoordinatesPath,
        `coordinates:\n  test-symbol:\n    ${span}\n`,
        "utf-8",
      );

      await expect(
        refreshCoordinatesForSymbolId("test-symbol", refreshTestRoot),
      ).rejects.toThrow(/invalid coordinate span/);
    }
  });

  it("does not create coordinate artifact when a found symbol has no coordinates", async () => {
    const yamlWithSymbol = `symbols:
  - id: test-symbol
    title: Missing Symbol
`;
    writeRefreshFixture(yamlWithSymbol);

    const result = await refreshCoordinatesForSymbolId(
      "test-symbol",
      refreshTestRoot,
    );

    expect(result).toEqual({ refreshed: false, found: true });
    expect(fs.existsSync(refreshCoordinatesPath)).toBe(false);
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
    internalManifestPath = path.join(internalTestRoot, ".kb", "symbols.yaml");
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

    fs.mkdirSync(path.dirname(internalManifestPath), { recursive: true });
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

    const updated = fs.readFileSync(internalManifestPath, "utf-8");
    expect(updated).not.toContain("sourceLine:");
    expect(updated).not.toContain("coordinatesGeneratedAt:");
    expect(
      readCoordinatesArtifact(
        internalManifestPath.replace("symbols.yaml", "symbol-coordinates.yaml"),
      )["SYM-start-server"],
    ).toEqual(
      expect.objectContaining({
        sourceFile: "src/server.ts",
        sourceLine: expect.any(Number),
      }),
    );
  });

  it("should resolve coordinates for non-exported helper (parseSymbolsManifest)", async () => {
    const result = await refreshCoordinatesForSymbolId(
      "SYM-parse-manifest",
      internalTestRoot,
    );
    expect(result.found).toBe(true);

    const updated = fs.readFileSync(internalManifestPath, "utf-8");
    expect(updated).not.toContain("sourceLine:");
    expect(updated).not.toContain("coordinatesGeneratedAt:");
    expect(
      readCoordinatesArtifact(
        internalManifestPath.replace("symbols.yaml", "symbol-coordinates.yaml"),
      )["SYM-parse-manifest"],
    ).toEqual(
      expect.objectContaining({
        sourceFile: "src/server.ts",
        sourceLine: expect.any(Number),
      }),
    );
  });

  it("should resolve coordinates for class method (mergeStaticLinks)", async () => {
    const result = await refreshCoordinatesForSymbolId(
      "SYM-merge-static-links",
      internalTestRoot,
    );
    expect(result.found).toBe(true);

    const updated = fs.readFileSync(internalManifestPath, "utf-8");
    expect(updated).not.toContain("sourceLine:");
    expect(updated).not.toContain("coordinatesGeneratedAt:");
    expect(
      readCoordinatesArtifact(
        internalManifestPath.replace("symbols.yaml", "symbol-coordinates.yaml"),
      )["SYM-merge-static-links"],
    ).toEqual(
      expect.objectContaining({
        sourceFile: "src/server.ts",
        sourceLine: expect.any(Number),
      }),
    );
  });
});
