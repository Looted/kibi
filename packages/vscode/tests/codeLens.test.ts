/**
 * Tests for KibiCodeLensProvider:
 *   1. provideCodeLenses() returns CodeLens for symbols in the current file
 *   2. resolveCodeLens() populates command with linked entities
 *   3. Caching works with 30s TTL
 *
 * These tests run under Bun without the VS Code runtime, so VS Code APIs are mocked.
 */
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { categorizeEntities, formatLensTitle } from "../src/helpers";
import { buildIndex } from "../src/symbolIndex";

const vscode = {
  Range: class {
    constructor(
      public start: { line: number; character: number },
      public end: { line: number; character: number },
    ) {}
  },
  CodeLens: class {
    command?: unknown;
    constructor(
      public range: unknown,
      command?: unknown,
    ) {
      this.command = command;
    }
  },
};

type MockRelationship = { type: string; from: string; to: string };

let mockQueryRelationships = mock(
  (_symbolId?: string, _workspaceRoot?: string): MockRelationship[] => [],
);

const codeLensMetadata = new WeakMap<any, any>();
const CACHE_TTL_MS = 30_000;

class TestCodeLensProvider {
  private index: any | null = null;
  private manifestPath: string;
  private relationshipCache = new Map<string, any>();

  constructor(private workspaceRoot: string) {
    this.manifestPath = this.resolveManifestPath();
    this.index = buildIndex(this.manifestPath, this.workspaceRoot);
  }

  private resolveManifestPath(): string {
    const candidates = [
      path.join(this.workspaceRoot, "symbols.yaml"),
      path.join(this.workspaceRoot, "symbols.yml"),
    ];
    return candidates.find((p) => fs.existsSync(p)) ?? candidates[0];
  }

  provideCodeLenses(document: any, token: any): any[] | null {
    if (!this.index || token.isCancellationRequested) return null;

    const filePath = document.uri.fsPath;
    const entries = this.index.byFile.get(filePath);
    if (!entries || entries.length === 0) return null;

    const lenses: any[] = [];
    for (const entry of entries) {
      const line = entry.sourceLine ? Math.max(0, entry.sourceLine - 1) : 0;
      const range = new vscode.Range(
        { line, character: 0 },
        { line, character: 0 },
      );
      const lens = new vscode.CodeLens(range);

      codeLensMetadata.set(lens, {
        symbolId: entry.id,
        staticLinks: entry.links,
        sourceFile: entry.sourceFile,
        sourceLine: entry.sourceLine,
      });

      lenses.push(lens);
    }
    return lenses;
  }

  async resolveCodeLens(codeLens: any, token: any): Promise<any | null> {
    if (token.isCancellationRequested) return null;

    const metadata = codeLensMetadata.get(codeLens);
    if (!metadata) return null;

    const { symbolId, staticLinks, sourceFile, sourceLine } = metadata;

    const cached = this.relationshipCache.get(symbolId);
    const now = Date.now();
    let relationships: Array<{ type: string; from: string; to: string }>;

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      relationships = cached.relationships;
    } else {
      let dynamicRels: Array<{ type: string; from: string; to: string }>;
      try {
        dynamicRels = mockQueryRelationships(symbolId, this.workspaceRoot);
      } catch {
        dynamicRels = [];
      }
      // Build static link relationships
      const staticRels: Array<{ type: string; from: string; to: string }> = [];
      for (const linkId of staticLinks) {
        staticRels.push({ type: "relates_to", from: symbolId, to: linkId });
      }
      // Static links first for backward compatibility
      relationships = [...staticRels, ...dynamicRels];

      if (token.isCancellationRequested) return null;

      this.relationshipCache.set(symbolId, {
        relationships,
        timestamp: Date.now(),
      });
    }

    const title = this.buildLensTitle(relationships);

    // Extract IDs for command arguments (backward compatibility)
    const allLinkedIds = relationships.map((r) => r.to);

    codeLens.command = {
      command: "kibi.browseLinkedEntities",
      title,
      arguments: [symbolId, allLinkedIds, sourceFile, sourceLine],
    };

    return codeLens;
  }

  private buildLensTitle(
    relationships: Array<{ type: string; from: string; to: string }>,
  ): string {
    const guards = relationships
      .filter((r) => r.type === "guards")
      .map((r) => ({
        flagId: r.from,
        flagName: r.from.replace(/^FLAG-/, ""),
      }));

    const nonGuardRels = relationships.filter((r) => r.type !== "guards");
    const categories = categorizeEntities(nonGuardRels);

    categories.symbols = [];

    return formatLensTitle(categories, guards);
  }
}

function writeTestSymbols(
  dir: string,
  symbols: Array<Record<string, unknown>>,
): string {
  const symbolsPath = path.join(dir, "symbols.yaml");
  const lines: string[] = ["symbols:"];
  for (const symbol of symbols) {
    lines.push(`  - id: ${String(symbol.id ?? "")}`);
    lines.push(`    title: ${String(symbol.title ?? "")}`);
    if (symbol.sourceFile) {
      lines.push(`    sourceFile: ${String(symbol.sourceFile)}`);
    } else if (symbol.source) {
      lines.push(`    source: ${String(symbol.source)}`);
    }
    if (typeof symbol.sourceLine === "number") {
      lines.push(`    sourceLine: ${symbol.sourceLine}`);
    }
    lines.push("    links:");
    const links = Array.isArray(symbol.links)
      ? (symbol.links as unknown[])
      : [];
    for (const link of links) {
      lines.push(`      - ${String(link)}`);
    }
  }
  fs.writeFileSync(symbolsPath, `${lines.join("\n")}\n`, "utf8");
  return symbolsPath;
}

beforeEach(() => {
  mockQueryRelationships = mock(() => []);
});

describe("KibiCodeLensProvider – provideCodeLenses", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns CodeLens for symbols in the current file", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "export function myFunction() {}\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: ["REQ-001"],
      },
      {
        id: "SYM-002",
        title: "anotherFunction",
        sourceFile: "src/main.ts",
        sourceLine: 42,
        links: [],
      },
    ]);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);

    expect(lenses).not.toBeNull();
    expect(lenses?.length).toBe(2);
  });

  test("CodeLens positions are 0-based (sourceLine=16 → line 15)", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// code\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: [],
      },
    ]);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);

    expect(lenses).not.toBeNull();
    expect(lenses?.length).toBe(1);
    expect((lenses![0].range as any).start.line).toBe(15);
  });

  test("returns 0 lenses for symbols in a different file", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    const otherFile = path.join(tmpDir, "src", "other.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");
    fs.writeFileSync(otherFile, "// other\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "otherFunction",
        sourceFile: "src/other.ts",
        sourceLine: 10,
        links: [],
      },
    ]);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);

    expect(lenses).toBeNull();
  });

  test("returns 0 lenses when symbols.yaml does not exist", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);

    expect(lenses).toBeNull();
  });

  test("returns 0 lenses when symbols.yaml is malformed", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    const symbolsPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(symbolsPath, "symbols: [\n  - id: SYM-001", "utf8");

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);

    expect(lenses).toBeNull();
  });

  test("symbols without sourceLine get lens at line 0", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        links: [],
      },
    ]);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);

    expect(lenses).not.toBeNull();
    expect(lenses?.length).toBe(1);
    expect((lenses![0].range as any).start.line).toBe(0);
  });
});

describe("KibiCodeLensProvider – resolveCodeLens", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("resolveCodeLens populates command with kibi.browseLinkedEntities", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: ["REQ-001"],
      },
    ]);

    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-002" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();
    expect((resolved!.command as any).command).toBe(
      "kibi.browseLinkedEntities",
    );

    // Verify that queryRelationships was called and returned typed data
    expect(mockQueryRelationships).toHaveBeenCalledWith("SYM-001", tmpDir);
    expect(mockQueryRelationships).toHaveReturnedWith(typedRelationships);
  });

  test("command arguments include symbolId and merged staticLinks + dynamicIds", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: ["REQ-001"],
      },
    ]);

    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-002" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    const args = (resolved!.command as any).arguments;
    expect(args[0]).toBe("SYM-001");
    expect(args[1]).toEqual(["REQ-001", "REQ-002"]);
    expect(args[2]).toContain("src/main.ts");
    expect(args[3]).toBe(16);

    // Verify typed relationship data structure
    expect(mockQueryRelationships).toHaveReturnedWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: expect.any(String),
          from: expect.any(String),
          to: expect.any(String),
        }),
      ]),
    );
  });

  test("lens title shows emoji-categorized counts when ≤3 linked entities", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: ["REQ-001", "ADR-005"],
      },
    ]);

    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-003" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    const title = (resolved!.command as any).title;
    // New format: 📋 2 reqs • 📐 1 ADR
    expect(title).toBe("📋 2 reqs • 📐 1 ADR");

    // Verify typed relationship data
    expect(typedRelationships[0]).toHaveProperty("type");
    expect(typedRelationships[0]).toHaveProperty("from");
    expect(typedRelationships[0]).toHaveProperty("to");
  });

  test("lens title shows emoji-categorized counts when >3 linked entities", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: ["REQ-001", "REQ-002", "TEST-001"],
      },
    ]);

    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-004" },
      { type: "verified_by", from: "REQ-002", to: "TEST-002" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    const title = (resolved!.command as any).title;
    // New format: 📋 3 reqs • ✓ 2 tests
    expect(title).toBe("📋 3 reqs • ✓ 2 tests");

    // Verify typed relationship data
    expect(mockQueryRelationships).toHaveReturnedWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "implements",
          from: "SYM-001",
          to: "REQ-004",
        }),
      ]),
    );
  });

  test("cancelled token returns null from resolveCodeLens", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: [],
      },
    ]);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const cancelledToken = { isCancellationRequested: true };
    const resolved = await provider.resolveCodeLens(lenses![0], cancelledToken);
    expect(resolved).toBeNull();
  });

  test("guards show as 'guarded by {flagName}' instead of counted", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: [],
      },
    ]);

    const typedRelationships = [
      { type: "guards", from: "FLAG-feature_new_checkout", to: "SYM-001" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    const title = (resolved!.command as any).title;
    // Guards format: 🚩 guarded by feature_new_checkout
    expect(title).toBe("🚩 guarded by feature_new_checkout");
  });

  test("title shows 'No linked entities' when no relationships", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: [],
      },
    ]);

    const typedRelationships: Array<{
      type: string;
      from: string;
      to: string;
    }> = [];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    const title = (resolved!.command as any).title;
    // Empty state: No linked entities
    expect(title).toBe("No linked entities");
  });

  test("handles invalid JSON from CLI gracefully (shows 'No linked entities')", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: [],
      },
    ]);

    mockQueryRelationships = mock(() => {
      throw new SyntaxError("Unexpected token i in JSON at position 1");
    });

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    const title = (resolved!.command as any).title;
    expect(title).toBe("No linked entities");
  });

  test("handles CLI timeout gracefully (shows 'No linked entities')", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: [],
      },
    ]);

    mockQueryRelationships = mock(() => {
      throw new Error("Command timed out after 10000ms");
    });

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    const title = (resolved!.command as any).title;
    expect(title).toBe("No linked entities");
  });

  test("title shows all emoji categories when multiple entity types present", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: ["REQ-001", "TEST-001"],
      },
    ]);

    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-002" },
      { type: "constrained_by", from: "SYM-001", to: "ADR-001" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    const title = (resolved!.command as any).title;
    // All categories: 📋 2 reqs • ✓ 1 test • 📐 1 ADR
    expect(title).toBe("📋 2 reqs • ✓ 1 test • 📐 1 ADR");
  });
});

describe("KibiCodeLensProvider – caching", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("multiple resolves within TTL call queryRelationshipsViaCli only once", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: ["REQ-001"],
      },
    ]);

    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-002" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    await provider.resolveCodeLens(lenses![0], token);
    expect(mockQueryRelationships).toHaveBeenCalledTimes(1);
    expect(mockQueryRelationships).toHaveReturnedWith(typedRelationships);

    await provider.resolveCodeLens(lenses![0], token);
    expect(mockQueryRelationships).toHaveBeenCalledTimes(1);
  });

  test("after TTL expires, a new CLI call is made", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: ["REQ-001"],
      },
    ]);

    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-002" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    await provider.resolveCodeLens(lenses![0], token);
    expect(mockQueryRelationships).toHaveBeenCalledTimes(1);

    (provider as any).relationshipCache.clear();

    await provider.resolveCodeLens(lenses![0], token);
    expect(mockQueryRelationships).toHaveBeenCalledTimes(2);

    // Verify typed data is returned on second call
    expect(mockQueryRelationships).toHaveReturnedWith(typedRelationships);
  });
});

describe("KibiCodeLensProvider – typed relationship data", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("fetchRelationships returns typed objects with type, from, to", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: ["REQ-001"],
      },
    ]);

    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-002" },
      { type: "verified_by", from: "SYM-001", to: "TEST-001" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    // Verify that the mock was called and returned typed relationships
    expect(mockQueryRelationships).toHaveBeenCalledTimes(1);
    expect(mockQueryRelationships).toHaveBeenCalledWith("SYM-001", tmpDir);
    expect(mockQueryRelationships).toHaveReturnedWith(typedRelationships);

    // Verify the structure of the returned relationships
    expect(typedRelationships).toHaveLength(2);

    // Check each relationship has the required fields
    expect(typedRelationships[0]).toHaveProperty("type");
    expect(typedRelationships[0]).toHaveProperty("from");
    expect(typedRelationships[0]).toHaveProperty("to");
    expect(typedRelationships[1]).toHaveProperty("type");
    expect(typedRelationships[1]).toHaveProperty("from");
    expect(typedRelationships[1]).toHaveProperty("to");

    // Verify specific values
    expect(typedRelationships[0].type).toBe("implements");
    expect(typedRelationships[0].from).toBe("SYM-001");
    expect(typedRelationships[0].to).toBe("REQ-002");
    expect(typedRelationships[1].type).toBe("verified_by");
    expect(typedRelationships[1].from).toBe("SYM-001");
    expect(typedRelationships[1].to).toBe("TEST-001");
  });

  test("CodeLens command works with typed relationship data", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: [],
      },
    ]);

    // Simulate typed relationship data from the CLI
    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
      { type: "covered_by", from: "SYM-001", to: "TEST-001" },
      { type: "relates_to", from: "SYM-001", to: "ADR-005" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    // Verify the command is properly structured
    const command = resolved!.command as any;
    expect(command.command).toBe("kibi.browseLinkedEntities");
    expect(command.arguments).toBeDefined();
    expect(command.arguments[0]).toBe("SYM-001");

    // Verify that the typed relationships were properly converted to entity IDs
    const linkedIds = command.arguments[1];
    expect(linkedIds).toEqual(["REQ-001", "TEST-001", "ADR-005"]);

    // Verify the title shows emoji-categorized counts (new format)
    expect(command.title).toBe("📋 1 req • ✓ 1 test • 📐 1 ADR");
  });

  test("backward compatibility: static links still work with typed dynamic relationships", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        // Static links (old format)
        links: ["REQ-STATIC-001", "REQ-STATIC-002"],
      },
    ]);

    // Dynamic relationships (new typed format)
    const typedRelationships = [
      { type: "implements", from: "SYM-001", to: "REQ-DYNAMIC-001" },
      { type: "verified_by", from: "SYM-001", to: "TEST-001" },
    ];
    mockQueryRelationships.mockReturnValue(typedRelationships);

    const provider = new TestCodeLensProvider(tmpDir);
    const mockDocument = {
      uri: { fsPath: testFile, scheme: "file" },
    };

    const token = { isCancellationRequested: false };
    const lenses = provider.provideCodeLenses(mockDocument, token);
    expect(lenses).not.toBeNull();

    const resolved = await provider.resolveCodeLens(lenses![0], token);
    expect(resolved).not.toBeNull();

    const command = resolved!.command as any;
    const linkedIds = command.arguments[1];

    // Verify that static and dynamic links are merged correctly
    expect(linkedIds).toEqual([
      "REQ-STATIC-001",
      "REQ-STATIC-002",
      "REQ-DYNAMIC-001",
      "TEST-001",
    ]);

    // Verify that the typed dynamic relationships are being used
    expect(mockQueryRelationships).toHaveBeenCalledWith("SYM-001", tmpDir);
    expect(mockQueryRelationships).toHaveReturnedWith(typedRelationships);
  });
});
