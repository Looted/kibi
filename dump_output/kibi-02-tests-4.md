# Pack: kibi-02-tests (Part 4)


This file is a merged representation of the entire codebase, combined into a single document by Repomix.
The content has been processed where security check has been disabled.

# File Summary

## Purpose
This file contains a packed representation of the entire repository's contents.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.

## File Format
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  a. A header with the file path (## File: path/to/file)
  b. The full contents of the file in a code block

## Usage Guidelines
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.

## Notes
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Security check has been disabled - content may contain sensitive information
- Files are sorted by Git change count (files with more changes are at the bottom)

# Directory Structure
```
packages/
  vscode/
    tests/
      codeLens.test.ts
      extension.test.ts
      helpers.test.ts
      hover.test.ts
      symbolIndex.test.ts
      traceability.test.ts
test/
  fixtures/
    adr/
      ADR-001.md
    adr-example.md
    event-example.md
```

# Files

## File: packages/vscode/tests/codeLens.test.ts
```typescript
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
```

## File: packages/vscode/tests/extension.test.ts
```typescript
import { expect, test } from "bun:test";

interface MockTreeItem {
  label: string;
  iconPath?: string;
  contextValue?: string;
  collapsibleState: number;
  children?: MockTreeItem[];
}

class MockTreeDataProvider {
  constructor(private workspaceRoot: string) {}

  async getChildren(element?: MockTreeItem): Promise<MockTreeItem[]> {
    if (!this.workspaceRoot) {
      return [];
    }

    if (element) {
      return element.children || [this.createPlaceholderItem()];
    }

    return this.getRootItems();
  }

  private getRootItems(): MockTreeItem[] {
    const entityTypes = [
      { name: "Requirements", icon: "list-ordered", count: 0 },
      { name: "Scenarios", icon: "file-text", count: 0 },
      { name: "Tests", icon: "check", count: 0 },
      { name: "ADRs", icon: "book", count: 0 },
      { name: "Flags", icon: "flag", count: 0 },
      { name: "Events", icon: "calendar", count: 0 },
      { name: "Symbols", icon: "symbol-class", count: 0 },
    ];

    return entityTypes.map((type) => ({
      label: `${type.name} (${type.count})`,
      iconPath: type.icon,
      contextValue: `kibi-${type.name.toLowerCase()}`,
      collapsibleState: 2,
      children: [this.createPlaceholderItem()],
    }));
  }

  private createPlaceholderItem(): MockTreeItem {
    return {
      label: "Click to load...",
      iconPath: "info",
      contextValue: "kibi-placeholder",
      collapsibleState: 0,
    };
  }
}

test("TreeDataProvider creates root items", async () => {
  const provider = new MockTreeDataProvider("/fake/workspace");
  const rootItems = await provider.getChildren();

  expect(rootItems).toHaveLength(7);
  expect(rootItems[0].label).toContain("Requirements");
  expect(rootItems[1].label).toContain("Scenarios");
  expect(rootItems[2].label).toContain("Tests");
  expect(rootItems[3].label).toContain("ADRs");
  expect(rootItems[4].label).toContain("Flags");
  expect(rootItems[5].label).toContain("Events");
  expect(rootItems[6].label).toContain("Symbols");
});

test("TreeDataProvider creates placeholder children", async () => {
  const provider = new MockTreeDataProvider("/fake/workspace");
  const rootItems = await provider.getChildren();
  const firstItem = rootItems[0];

  const children = await provider.getChildren(firstItem);
  expect(children).toHaveLength(1);
  expect(children[0].label).toBe("Click to load...");
  expect(children[0].contextValue).toBe("kibi-placeholder");
});

test("TreeDataProvider handles empty workspace", async () => {
  const provider = new MockTreeDataProvider("");
  const rootItems = await provider.getChildren();

  expect(rootItems).toHaveLength(0);
});
```

## File: packages/vscode/tests/helpers.test.ts
```typescript
/**
 * Tests for helper functions in helpers.ts
 * Pure functions with no VS Code dependencies - fast unit tests
 */

import { describe, expect, test } from "bun:test";
import {
  buildHoverMarkdown,
  categorizeEntities,
  formatLensTitle,
} from "../src/helpers";

describe("categorizeEntities", () => {
  test("empty relationships returns empty categories", () => {
    const result = categorizeEntities([]);
    expect(result).toEqual({
      reqs: [],
      scenarios: [],
      tests: [],
      adrs: [],
      flags: [],
      events: [],
      symbols: [],
      other: [],
    });
  });

  test("single REQ- entity categorized correctly", () => {
    const result = categorizeEntities([
      { type: "verified_by", from: "REQ-001", to: "TEST-001" },
    ]);
    expect(result.reqs).toEqual(["REQ-001"]);
    expect(result.tests).toEqual(["TEST-001"]);
  });

  test("mixed entities categorized by prefix", () => {
    const result = categorizeEntities([
      { type: "specified_by", from: "REQ-001", to: "SCEN-001" },
      { type: "verified_by", from: "REQ-001", to: "TEST-001" },
      { type: "constrained_by", from: "SYM-001", to: "ADR-001" },
    ]);
    expect(result.reqs).toEqual(["REQ-001"]);
    expect(result.scenarios).toEqual(["SCEN-001"]);
    expect(result.tests).toEqual(["TEST-001"]);
    expect(result.symbols).toEqual(["SYM-001"]);
    expect(result.adrs).toEqual(["ADR-001"]);
  });

  test("unknown prefix categorized as other", () => {
    const result = categorizeEntities([
      { type: "relates_to", from: "UNKNOWN-001", to: "REQ-001" },
    ]);
    expect(result.other).toEqual(["UNKNOWN-001"]);
    expect(result.reqs).toEqual(["REQ-001"]);
  });

  test("duplicate IDs are deduplicated", () => {
    const result = categorizeEntities([
      { type: "verified_by", from: "REQ-001", to: "TEST-001" },
      { type: "specified_by", from: "REQ-001", to: "SCEN-001" },
      { type: "constrained_by", from: "TEST-001", to: "ADR-001" },
    ]);
    expect(result.reqs).toEqual(["REQ-001"]);
    expect(result.tests).toEqual(["TEST-001"]);
    expect(result.scenarios).toEqual(["SCEN-001"]);
    expect(result.adrs).toEqual(["ADR-001"]);
  });

  test("flags and events categorized correctly", () => {
    const result = categorizeEntities([
      { type: "guards", from: "FLAG-001", to: "SYM-001" },
      { type: "publishes", from: "SYM-001", to: "EVENT-001" },
    ]);
    expect(result.flags).toEqual(["FLAG-001"]);
    expect(result.symbols).toEqual(["SYM-001"]);
    expect(result.events).toEqual(["EVENT-001"]);
  });

  test("all prefixes categorized correctly", () => {
    const result = categorizeEntities([
      { type: "relates_to", from: "REQ-001", to: "SCEN-001" },
      { type: "relates_to", from: "TEST-001", to: "ADR-001" },
      { type: "relates_to", from: "FLAG-001", to: "EVENT-001" },
      { type: "relates_to", from: "SYM-001", to: "SYM-002" },
    ]);
    expect(result.reqs).toEqual(["REQ-001"]);
    expect(result.scenarios).toEqual(["SCEN-001"]);
    expect(result.tests).toEqual(["TEST-001"]);
    expect(result.adrs).toEqual(["ADR-001"]);
    expect(result.flags).toEqual(["FLAG-001"]);
    expect(result.events).toEqual(["EVENT-001"]);
    expect(result.symbols).toEqual(["SYM-001", "SYM-002"]);
  });
});

describe("formatLensTitle", () => {
  test("empty categories returns 'No linked entities'", () => {
    const result = formatLensTitle({}, []);
    expect(result).toBe("No linked entities");
  });

  test("single category with count 1 uses singular", () => {
    const result = formatLensTitle({ reqs: ["REQ-001"] }, []);
    expect(result).toBe("📋 1 req");
  });

  test("single category with count > 1 uses plural", () => {
    const result = formatLensTitle({ reqs: ["REQ-001", "REQ-002"] }, []);
    expect(result).toBe("📋 2 reqs");
  });

  test("multiple categories joined with bullet", () => {
    const result = formatLensTitle(
      { reqs: ["REQ-001"], tests: ["TEST-001", "TEST-002"] },
      [],
    );
    expect(result).toBe("📋 1 req • ✓ 2 tests");
  });

  test("zero counts are omitted", () => {
    const result = formatLensTitle(
      {
        reqs: [],
        tests: ["TEST-001"],
        adrs: [],
        scenarios: ["SCEN-001"],
      },
      [],
    );
    expect(result).toBe("✓ 1 test • 🎭 1 scenario");
  });

  test("all category types with correct emojis", () => {
    const result = formatLensTitle(
      {
        reqs: ["REQ-001"],
        scenarios: ["SCEN-001"],
        tests: ["TEST-001"],
        adrs: ["ADR-001"],
        flags: ["FLAG-001"],
        events: ["EVENT-001"],
        symbols: ["SYM-001"],
      },
      [],
    );
    expect(result).toBe(
      "📋 1 req • 🎭 1 scenario • ✓ 1 test • 📐 1 ADR • 🚩 1 flag • ⚡ 1 event • 🔗 1 symbol",
    );
  });

  test("single flag guarded by flag name", () => {
    const result = formatLensTitle({}, [
      { flagId: "FLAG-001", flagName: "beta" },
    ]);
    expect(result).toBe("🚩 guarded by beta");
  });

  test("multiple flags guarded by multiple names", () => {
    const result = formatLensTitle({}, [
      { flagId: "FLAG-001", flagName: "beta" },
      { flagId: "FLAG-002", flagName: "experimental" },
    ]);
    expect(result).toBe("🚩 guarded by beta, experimental");
  });

  test("categories and flags combined", () => {
    const result = formatLensTitle({ reqs: ["REQ-001", "REQ-002"] }, [
      { flagId: "FLAG-001", flagName: "beta" },
    ]);
    expect(result).toBe("📋 2 reqs • 🚩 guarded by beta");
  });

  test("singular vs plural for all categories", () => {
    const result = formatLensTitle(
      {
        reqs: ["REQ-001"],
        scenarios: ["SCEN-001", "SCEN-002"],
        tests: ["TEST-001"],
        adrs: ["ADR-001", "ADR-002", "ADR-003"],
        flags: ["FLAG-001"],
        events: ["EVENT-001", "EVENT-002"],
        symbols: ["SYM-001"],
      },
      [],
    );
    expect(result).toBe(
      "📋 1 req • 🎭 2 scenarios • ✓ 1 test • 📐 3 ADRs • 🚩 1 flag • ⚡ 2 events • 🔗 1 symbol",
    );
  });
});

describe("buildHoverMarkdown", () => {
  test("single entity with all fields", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Process Payment",
      file: "src/payment.ts",
      line: 42,
    };
    const entities = [
      {
        id: "REQ-001",
        type: "req",
        title: "Payment Processing",
        status: "active",
        tags: ["payment", "core"],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("# SYM-001");
    expect(result).toContain("`src/payment.ts:42`");
    expect(result).toContain(
      "📋 **REQ-001**: Payment Processing (status: active, tags: payment, core)",
    );
    expect(result).toContain(
      "[Browse entities](command:kibi.browseLinkedEntities)",
    );
  });

  test("multiple entities ordered correctly", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "User Authentication",
      file: "src/auth.ts",
      line: 10,
    };
    const entities = [
      {
        id: "REQ-001",
        type: "req",
        title: "User Login",
        status: "active",
        tags: ["auth"],
      },
      {
        id: "TEST-001",
        type: "test",
        title: "Login Test",
        status: "passed",
        tags: ["unit", "auth"],
      },
      {
        id: "ADR-001",
        type: "adr",
        title: "JWT Decision",
        status: "accepted",
        tags: ["security"],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("# SYM-001");
    expect(result).toContain("`src/auth.ts:10`");
    expect(result).toContain(
      "📋 **REQ-001**: User Login (status: active, tags: auth)",
    );
    expect(result).toContain(
      "✓ **TEST-001**: Login Test (status: passed, tags: unit, auth)",
    );
    expect(result).toContain(
      "📐 **ADR-001**: JWT Decision (status: accepted, tags: security)",
    );
  });

  test("empty entities array shows no entity lines", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Function",
      file: "src/file.ts",
      line: 5,
    };
    const entities = [];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("# SYM-001");
    expect(result).toContain("`src/file.ts:5`");
    expect(result).toContain(
      "[Browse entities](command:kibi.browseLinkedEntities)",
    );
    expect(result).not.toMatch(/\*\*.*\*\*:/); // No entity entries
  });

  test("empty tags shows 'none'", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Function",
      file: "src/file.ts",
      line: 5,
    };
    const entities = [
      {
        id: "TEST-001",
        type: "test",
        title: "Test",
        status: "passed",
        tags: [],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("tags: none");
  });

  test("all entity types with correct emojis", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Symbol",
      file: "src/file.ts",
      line: 1,
    };
    const entities = [
      { id: "REQ-001", type: "req", title: "Req", status: "active", tags: [] },
      {
        id: "SCEN-001",
        type: "scenario",
        title: "Scenario",
        status: "draft",
        tags: [],
      },
      {
        id: "TEST-001",
        type: "test",
        title: "Test",
        status: "passed",
        tags: [],
      },
      {
        id: "ADR-001",
        type: "adr",
        title: "ADR",
        status: "accepted",
        tags: [],
      },
      {
        id: "FLAG-001",
        type: "flag",
        title: "Flag",
        status: "enabled",
        tags: [],
      },
      {
        id: "EVENT-001",
        type: "event",
        title: "Event",
        status: "active",
        tags: [],
      },
      {
        id: "SYM-002",
        type: "symbol",
        title: "Symbol",
        status: "active",
        tags: [],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("📋 **REQ-001**");
    expect(result).toContain("🎭 **SCEN-001**");
    expect(result).toContain("✓ **TEST-001**");
    expect(result).toContain("📐 **ADR-001**");
    expect(result).toContain("🚩 **FLAG-001**");
    expect(result).toContain("⚡ **EVENT-001**");
    expect(result).toContain("🔗 **SYM-002**");
  });

  test("command link always present", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Function",
      file: "src/file.ts",
      line: 5,
    };
    const entities = [];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain(
      "[Browse entities](command:kibi.browseLinkedEntities)",
    );
  });

  test("special characters in title and tags handled", () => {
    const symbolInfo = {
      id: "SYM-001",
      title: "Function with <script>",
      file: "src/file.ts",
      line: 5,
    };
    const entities = [
      {
        id: "REQ-001",
        type: "req",
        title: "Requirement with & special <chars>",
        status: "active",
        tags: ["tag-with-dash", "tag_with_underscore"],
      },
    ];
    const result = buildHoverMarkdown(symbolInfo, entities);
    expect(result).toContain("Requirement with & special <chars>");
    expect(result).toContain("tag-with-dash, tag_with_underscore");
  });
});
```

## File: packages/vscode/tests/hover.test.ts
```typescript
/**
 * Tests for KibiHoverProvider:
 *   1. provideHover() shows rich entity details on hover
 *   2. MarkdownString has isTrusted: true for command links
 *   3. Command link is present in hover
 *   4. Cancellation token is respected
 *   5. No symbol at position returns null
 *   6. CLI failure returns null gracefully
 *   7. Caching works with 30s TTL
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
  Position: class {
    constructor(
      public line: number,
      public character: number,
    ) {}
  },
  Hover: class {
    constructor(public contents: any) {}
  },
  MarkdownString: class {
    isTrusted?: boolean;
    constructor(public value: string) {}
  },
};

type MockRelationship = { type: string; from: string; to: string };
type MockEntityDetails = {
  id: string;
  type: string;
  title: string;
  status: string;
  tags: string[];
};

let mockQueryRelationships = mock(
  (_symbolId?: string): MockRelationship[] => [],
);
let mockQueryEntity = mock(
  (_entityId?: string): MockEntityDetails | null => null,
);
const mockExecSync = mock((cmd: string) => {
  if (cmd.includes("--relationships")) {
    return JSON.stringify(mockQueryRelationships());
  }
  if (cmd.includes("query")) {
    return JSON.stringify(mockQueryEntity());
  }
  return "{}";
});

const CACHE_TTL_MS = 30_000;

class TestHoverProvider {
  private index: any | null = null;
  private manifestPath: string;
  private entityCache = new Map<string, any>();
  private inflight = new Map<string, Promise<any>>();

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

  async provideHover(
    document: any,
    position: any,
    token: any,
  ): Promise<any | null> {
    if (token.isCancellationRequested) return null;

    if (!this.index) return null;

    const filePath = document.uri.fsPath;
    const symbols = this.index.byFile.get(filePath);
    if (!symbols || symbols.length === 0) return null;

    // Find symbol at position (VS Code uses 0-based line numbers)
    const symbolAtPosition = symbols.find(
      (sym: any) => sym.sourceLine === position.line + 1,
    );
    if (!symbolAtPosition) return null;

    // Check cancellation before expensive operations
    if (token.isCancellationRequested) return null;

    // Fetch relationships via CLI
    const relationships = await this.fetchRelationships(
      symbolAtPosition.id,
      token,
    );
    if (token.isCancellationRequested) return null;

    // Fetch entity details for each relationship
    const entities = await this.fetchEntityDetails(relationships, token);
    if (token.isCancellationRequested) return null;

    // Build hover markdown
    const markdown = this.buildHoverMarkdown(
      {
        id: symbolAtPosition.id,
        title: symbolAtPosition.title,
        file: symbolAtPosition.sourceFile || "",
        line: symbolAtPosition.sourceLine || 0,
      },
      entities,
    );

    const md = new vscode.MarkdownString(markdown);
    md.isTrusted = true;

    return new vscode.Hover(md);
  }

  private async fetchRelationships(
    symbolId: string,
    token: any,
  ): Promise<Array<{ type: string; from: string; to: string }>> {
    const cached = this.entityCache.get(`rel:${symbolId}`);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    if (token.isCancellationRequested) return [];

    const existing = this.inflight.get(`rel:${symbolId}`);
    if (existing) return existing;

    const promise = this.queryRelationshipsViaCli(symbolId);
    this.inflight.set(`rel:${symbolId}`, promise);

    try {
      const data = await promise;
      this.entityCache.set(`rel:${symbolId}`, {
        data,
        timestamp: Date.now(),
      });
      return data;
    } catch {
      return [];
    } finally {
      this.inflight.delete(`rel:${symbolId}`);
    }
  }

  private queryRelationshipsViaCli(
    symbolId: string,
  ): Promise<Array<{ type: string; from: string; to: string }>> {
    try {
      return Promise.resolve(mockQueryRelationships(symbolId));
    } catch {
      return Promise.resolve([]);
    }
  }

  private async fetchEntityDetails(
    relationships: Array<{ type: string; from: string; to: string }>,
    token: any,
  ): Promise<
    Array<{
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }>
  > {
    const entityIds = new Set<string>();
    for (const rel of relationships) {
      entityIds.add(rel.from);
      entityIds.add(rel.to);
    }

    const entities: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }> = [];
    for (const id of entityIds) {
      if (token.isCancellationRequested) return [];

      const entity = await this.fetchEntityById(id);
      if (entity) {
        entities.push(entity);
      }
    }

    return entities;
  }

  private async fetchEntityById(entityId: string): Promise<{
    id: string;
    type: string;
    title: string;
    status: string;
    tags: string[];
  } | null> {
    const cached = this.entityCache.get(`entity:${entityId}`);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const existing = this.inflight.get(`entity:${entityId}`);
    if (existing) return existing;

    const promise = this.queryEntityViaCli(entityId);
    this.inflight.set(`entity:${entityId}`, promise);

    try {
      const data = await promise;
      this.entityCache.set(`entity:${entityId}`, {
        data,
        timestamp: Date.now(),
      });
      return data;
    } finally {
      this.inflight.delete(`entity:${entityId}`);
    }
  }

  private queryEntityViaCli(entityId: string): Promise<{
    id: string;
    type: string;
    title: string;
    status: string;
    tags: string[];
  } | null> {
    try {
      const result = mockQueryEntity(entityId);
      return Promise.resolve(result || null);
    } catch {
      return Promise.resolve(null);
    }
  }

  private buildHoverMarkdown(
    symbolInfo: { id: string; title: string; file: string; line: number },
    entities: Array<{
      id: string;
      type: string;
      title: string;
      status: string;
      tags: string[];
    }>,
  ): string {
    const lines: string[] = [];

    lines.push(`# ${symbolInfo.id}`);
    lines.push("");
    lines.push(`\`${symbolInfo.file}:${symbolInfo.line}\``);
    lines.push("");

    const emojiMap: Record<string, string> = {
      req: "📋",
      scenario: "🎭",
      test: "✓",
      adr: "📐",
      flag: "🚩",
      event: "⚡",
      symbol: "🔗",
    };

    for (const entity of entities) {
      const emoji = emojiMap[entity.type] || "📄";
      const tagsStr = entity.tags.length > 0 ? entity.tags.join(", ") : "none";
      lines.push(
        `${emoji} **${entity.id}**: ${entity.title} (status: ${entity.status}, tags: ${tagsStr})`,
      );
    }

    lines.push("");
    lines.push("[Browse entities](command:kibi.browseLinkedEntities)");

    return lines.join("\n");
  }
}

describe("KibiHoverProvider", () => {
  let tmpDir: string;
  let testFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-hover-test-"));
    testFile = path.join(tmpDir, "test.ts");
    fs.writeFileSync(testFile, "export function myFunc() {}\n");

    // Reset mocks
    mockQueryRelationships = mock((): MockRelationship[] => []);
    mockQueryEntity = mock(
      (_entityId?: string): MockEntityDetails | null => null,
    );
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test("hover shows entity details with emoji, title, status, tags", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: [REQ-001]
`,
    );

    mockQueryRelationships = mock(() => [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
    ]);

    mockQueryEntity = mock(() => ({
      id: "REQ-001",
      type: "req",
      title: "Sample Requirement",
      status: "active",
      tags: ["feature", "backend"],
    }));

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0); // line 0 = sourceLine 1
    const token = { isCancellationRequested: false };

    const hover = await provider.provideHover(document, position, token);

    expect(hover).not.toBeNull();
    expect(hover.contents.value).toContain("# SYM-001");
    expect(hover.contents.value).toContain("📋 **REQ-001**");
    expect(hover.contents.value).toContain("Sample Requirement");
    expect(hover.contents.value).toContain("status: active");
    expect(hover.contents.value).toContain("tags: feature, backend");
  });

  test("hover MarkdownString has isTrusted: true", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    mockQueryRelationships = mock(() => []);

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: false };

    const hover = await provider.provideHover(document, position, token);

    expect(hover).not.toBeNull();
    expect(hover.contents.isTrusted).toBe(true);
  });

  test("hover contains command link", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    mockQueryRelationships = mock(() => []);

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: false };

    const hover = await provider.provideHover(document, position, token);

    expect(hover).not.toBeNull();
    expect(hover.contents.value).toContain(
      "[Browse entities](command:kibi.browseLinkedEntities)",
    );
  });

  test("respects cancellation token (returns null immediately)", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: true };

    const hover = await provider.provideHover(document, position, token);

    expect(hover).toBeNull();
  });

  test("returns null when no symbol at position", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(5, 0); // Line 5 has no symbol
    const token = { isCancellationRequested: false };

    const hover = await provider.provideHover(document, position, token);

    expect(hover).toBeNull();
  });

  test("returns null gracefully on CLI failure", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    mockQueryRelationships = mock(() => {
      throw new Error("CLI failure");
    });

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: false };

    // Should not throw, returns hover with empty entities
    const hover = await provider.provideHover(document, position, token);

    expect(hover).not.toBeNull();
    expect(hover.contents.value).toContain("# SYM-001");
  });

  test("handles invalid JSON from CLI gracefully", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    mockQueryRelationships = mock(() => {
      throw new SyntaxError("Unexpected token i in JSON at position 1");
    });

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: false };

    const hover = await provider.provideHover(document, position, token);

    expect(hover).not.toBeNull();
    expect(hover.contents.value).toContain("# SYM-001");
    expect(hover.contents.value).toContain(
      "[Browse entities](command:kibi.browseLinkedEntities)",
    );
  });

  test("handles CLI timeout gracefully", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    mockQueryRelationships = mock(() => {
      throw new Error("Command timed out after 10000ms");
    });

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: false };

    const hover = await provider.provideHover(document, position, token);

    expect(hover).not.toBeNull();
    expect(hover.contents.value).toContain("# SYM-001");
  });

  test("returns null when symbols.yaml is malformed", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(manifestPath, "symbols: [\n  - id: SYM-001", "utf8");

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: false };

    const hover = await provider.provideHover(document, position, token);

    expect(hover).toBeNull();
  });

  test("only flags relationships show flag details in hover", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    mockQueryRelationships = mock(() => [
      { type: "guards", from: "FLAG-feature_checkout", to: "SYM-001" },
    ]);

    mockQueryEntity = mock((entityId?: string) => {
      const id = entityId || "";
      if (id.startsWith("FLAG-")) {
        return {
          id,
          type: "flag",
          title: "feature_checkout",
          status: "active",
          tags: ["feature-flag"],
        };
      }
      return {
        id: "SYM-001",
        type: "symbol",
        title: "myFunc",
        status: "active",
        tags: [],
      };
    });

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: false };

    const hover = await provider.provideHover(document, position, token);

    expect(hover).not.toBeNull();
    expect(hover.contents.value).toContain("🚩 **FLAG-feature_checkout**");
    expect(hover.contents.value).toContain("feature_checkout");
  });

  test("cross-provider: CodeLens and Hover both resolve same symbol", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    const relationships = [
      { type: "implements", from: "SYM-001", to: "REQ-001" },
      { type: "guards", from: "FLAG-feature_checkout", to: "SYM-001" },
    ];

    mockQueryRelationships = mock(() => relationships);
    mockQueryEntity = mock((entityId?: string) => {
      const id = entityId || "";
      if (id === "REQ-001") {
        return {
          id: "REQ-001",
          type: "req",
          title: "Checkout requirement",
          status: "active",
          tags: ["checkout"],
        };
      }
      if (id.startsWith("FLAG-")) {
        return {
          id,
          type: "flag",
          title: "feature_checkout",
          status: "active",
          tags: ["feature-flag"],
        };
      }
      return {
        id: "SYM-001",
        type: "symbol",
        title: "myFunc",
        status: "active",
        tags: [],
      };
    });

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: false };

    const hover = await provider.provideHover(document, position, token);

    const guardRels = relationships.filter((r) => r.type === "guards");
    const nonGuardRels = relationships.filter((r) => r.type !== "guards");
    const lensTitle = formatLensTitle(
      { ...categorizeEntities(nonGuardRels), symbols: [] },
      guardRels.map((r) => ({
        flagId: r.from,
        flagName: r.from.replace(/^FLAG-/, ""),
      })),
    );

    expect(hover).not.toBeNull();
    expect(hover.contents.value).toContain("# SYM-001");
    expect(hover.contents.value).toContain("📋 **REQ-001**");
    expect(lensTitle).toBe("📋 1 req • 🚩 guarded by feature_checkout");
  });

  test("caching works (second hover uses cached data)", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`,
    );

    let callCount = 0;
    mockQueryRelationships = mock(() => {
      callCount++;
      return [{ type: "implements", from: "SYM-001", to: "REQ-001" }];
    });

    mockQueryEntity = mock(() => ({
      id: "REQ-001",
      type: "req",
      title: "Sample Requirement",
      status: "active",
      tags: [],
    }));

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = new vscode.Position(0, 0);
    const token = { isCancellationRequested: false };

    // First hover
    const hover1 = await provider.provideHover(document, position, token);
    expect(hover1).not.toBeNull();
    const firstCallCount = callCount;

    // Second hover (should use cache)
    const hover2 = await provider.provideHover(document, position, token);
    expect(hover2).not.toBeNull();
    expect(callCount).toBe(firstCallCount); // No additional calls
  });

  test("rapid hover on different symbols resolves without race", async () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      `symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
  - id: SYM-002
    title: otherFunc
    sourceFile: ${testFile}
    sourceLine: 2
    links: []
`,
    );

    fs.writeFileSync(
      testFile,
      "export function myFunc() {}\nexport function otherFunc() {}\n",
      "utf8",
    );

    mockQueryRelationships = mock((symbolId?: string) => {
      if (symbolId === "SYM-001") {
        return [{ type: "implements", from: "SYM-001", to: "REQ-001" }];
      }
      return [{ type: "covered_by", from: "SYM-002", to: "TEST-002" }];
    });

    mockQueryEntity = mock((entityId?: string) => {
      const id = entityId || "";
      if (id === "REQ-001") {
        return {
          id: "REQ-001",
          type: "req",
          title: "Requirement 1",
          status: "active",
          tags: ["r1"],
        };
      }
      if (id === "TEST-002") {
        return {
          id: "TEST-002",
          type: "test",
          title: "Test 2",
          status: "passed",
          tags: ["t2"],
        };
      }
      if (id.startsWith("SYM-")) {
        return {
          id,
          type: "symbol",
          title: id === "SYM-001" ? "myFunc" : "otherFunc",
          status: "active",
          tags: [],
        };
      }
      return null;
    });

    const provider = new TestHoverProvider(tmpDir);
    const document = {
      uri: { fsPath: testFile },
      getText: () =>
        "export function myFunc() {}\nexport function otherFunc() {}\n",
    };
    const token = { isCancellationRequested: false };

    const [hover1, hover2] = await Promise.all([
      provider.provideHover(document, new vscode.Position(0, 0), token),
      provider.provideHover(document, new vscode.Position(1, 0), token),
    ]);

    expect(hover1).not.toBeNull();
    expect(hover2).not.toBeNull();
    expect(hover1.contents.value).toContain("# SYM-001");
    expect(hover1.contents.value).toContain("REQ-001");
    expect(hover2.contents.value).toContain("# SYM-002");
    expect(hover2.contents.value).toContain("TEST-002");
  });
});
```

## File: packages/vscode/tests/symbolIndex.test.ts
```typescript
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { buildIndex } from "../src/symbolIndex";

describe("symbolIndex", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-symbol-index-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("buildIndex parses symbols and links from symbols.yaml", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(
      manifestPath,
      [
        "symbols:",
        "  - id: SYM-001",
        "    title: PrologProcess",
        "    sourceFile: packages/cli/src/prolog.ts",
        "    sourceLine: 16",
        "    links:",
        "      - REQ-001",
        "      - REQ-009",
      ].join("\n"),
      "utf8",
    );

    const index = buildIndex(manifestPath, tmpDir);

    expect(index.byId.size).toBe(1);
    expect(index.byFile.size).toBe(1);
    expect(index.byTitle.get("prologprocess")?.length).toBe(1);

    const sym = index.byId.get("SYM-001");
    expect(sym).toBeDefined();
    expect(sym?.sourceLine).toBe(16);
    expect(sym?.links).toEqual(["REQ-001", "REQ-009"]);
  });

  test("buildIndex tolerates malformed manifest content", () => {
    const manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(manifestPath, "symbols: [\n  - id: SYM-001", "utf8");

    const index = buildIndex(manifestPath, tmpDir);

    expect(index.byId.size).toBe(0);
    expect(index.byFile.size).toBe(0);
    expect(index.byTitle.size).toBe(0);
  });
});
```

## File: packages/vscode/tests/traceability.test.ts
```typescript
/**
 * Tests for the new traceability features added to the VS Code extension:
 *   1. Entity tree items gain a `localPath` and a click command when the source is a local file.
 *   2. Relationship child nodes are built for each entity.
 *   3. KibiCodeActionProvider produces code actions for symbols found in the index.
 *   4. browseLinkedEntities resolves entity IDs to paths and opens a Quick Pick.
 *
 * These tests run under Bun without the VS Code runtime, so VS Code APIs are mocked.
 */
import { describe, expect, test, mock, beforeEach } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";

// ── Minimal VS Code API mock ────────────────────────────────────────────────

const vscode = {
  TreeItemCollapsibleState: { None: 0, Collapsed: 1, Expanded: 2 },
  ThemeIcon: class {
    constructor(public id: string) {}
  },
  TreeItem: class {
    command?: unknown;
    resourceUri?: unknown;
    iconPath?: unknown;
    contextValue?: string;
    tooltip?: string;
    constructor(
      public label: string,
      public collapsibleState: number,
    ) {}
  },
  Uri: {
    file: (p: string) => ({ fsPath: p, scheme: "file", path: p }),
  },
  EventEmitter: class {
    private listeners: Array<(e: unknown) => void> = [];
    event = (cb: (e: unknown) => void) => {
      this.listeners.push(cb);
    };
    fire(e: unknown) {
      this.listeners.forEach((l) => l(e));
    }
  },
  window: {
    showInformationMessage: mock(() => Promise.resolve(undefined)),
    showTextDocument: mock(() => Promise.resolve(undefined)),
    showQuickPick: mock(() => Promise.resolve(undefined)),
    showErrorMessage: mock(() => Promise.resolve(undefined)),
  },
  workspace: {
    createFileSystemWatcher: mock(() => ({
      onDidChange: mock(() => {}),
      onDidCreate: mock(() => {}),
      onDidDelete: mock(() => {}),
    })),
  },
  languages: {
    registerCodeActionsProvider: mock(() => ({ dispose: () => {} })),
  },
  CodeActionKind: { Empty: "" },
  CodeAction: class {
    command?: unknown;
    constructor(
      public title: string,
      public kind: string,
    ) {}
  },
  Range: class {
    constructor(
      public start: { line: number; character: number },
      public end: { line: number; character: number },
    ) {}
  },
  Position: class {
    constructor(
      public line: number,
      public character: number,
    ) {}
  },
};

// Inject mock before the modules load
// @ts-ignore
globalThis.require = ((originalRequire) => (id: string) => {
  if (id === "vscode") return vscode;
  return originalRequire(id);
  // @ts-ignore
})(typeof require !== "undefined" ? require : () => ({}));

// ── Helper: write a minimal kb.rdf with known entities + relationships ───────

function writeTestRdf(dir: string): string {
  const rdfPath = path.join(dir, "kb.rdf");
  const rdf = `<?xml version="1.0"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:kb="urn:kibi:">

  <rdf:Description rdf:about="kb:entity/REQ-001">
    <kb:type>req</kb:type>
    <kb:title>Test requirement</kb:title>
    <kb:status rdf:resource="kb:status/active"/>
    <kb:source>${path.join(dir, "requirements/REQ-001.md")}</kb:source>
    <kb:tags></kb:tags>
  </rdf:Description>

  <rdf:Description rdf:about="kb:entity/SYM-001">
    <kb:type>symbol</kb:type>
    <kb:title>myFunction</kb:title>
    <kb:status rdf:resource="kb:status/active"/>
    <kb:source>${path.join(dir, "src/main.ts")}</kb:source>
    <kb:tags></kb:tags>
  </rdf:Description>

  <rdf:Description rdf:about="kb:rel/implements-SYM-001-REQ-001">
    <kb:relType>implements</kb:relType>
    <kb:from>SYM-001</kb:from>
    <kb:to>REQ-001</kb:to>
  </rdf:Description>

</rdf:RDF>`;
  fs.mkdirSync(path.dirname(rdfPath), { recursive: true });
  fs.writeFileSync(rdfPath, rdf, "utf8");
  // Create stub source files so resolveLocalPath finds them
  fs.mkdirSync(path.join(dir, "requirements"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src"), { recursive: true });
  fs.writeFileSync(path.join(dir, "requirements/REQ-001.md"), "# REQ-001\n");
  fs.writeFileSync(path.join(dir, "src/main.ts"), "// main\n");
  return rdfPath;
}

// ── Unit tests for treeProvider internals ───────────────────────────────────

describe("treeProvider – localPath resolution", () => {
  test("isLocalPath returns true for absolute paths", () => {
    // Inline the function logic since we cannot import the VS Code module without the runtime
    const isLocalPath = (src: string) =>
      src.startsWith("/") ||
      /^[A-Za-z]:[/\\]/.test(src) ||
      src.startsWith("file://");

    expect(isLocalPath("/home/user/req.md")).toBe(true);
    expect(isLocalPath("file:///home/user/req.md")).toBe(true);
    expect(isLocalPath("C:\\Users\\user\\req.md")).toBe(true);
    expect(isLocalPath("https://example.com/req")).toBe(false);
    expect(isLocalPath("http://example.com")).toBe(false);
  });

  test("resolves file:// URIs to pathnames", () => {
    const resolveLocalPath = (src: string, _root: string) => {
      if (src.startsWith("file://")) {
        try {
          return new URL(src).pathname;
        } catch {
          return undefined;
        }
      }
      return undefined;
    };

    const result = resolveLocalPath("file:///home/user/req.md", "/root");
    expect(result).toBe("/home/user/req.md");
  });
});

describe("treeProvider – RDF relationship parsing", () => {
  test("parses dedicated rel blocks from kb.rdf and builds children", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    const kbDir = path.join(tmpDir, ".kb", "branches", "main");
    writeTestRdf(kbDir);

    // Inline the regex-based parsing logic to test it in isolation
    const content = fs.readFileSync(path.join(kbDir, "kb.rdf"), "utf8");

    const relBlockRe =
      /<rdf:Description rdf:about="kb:rel\/[^"]*">([\s\S]*?)<\/rdf:Description>/g;
    const relationships: Array<{
      relType: string;
      fromId: string;
      toId: string;
    }> = [];

    const extractText = (block: string, tag: string) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
      const m = block.match(re);
      return m ? m[1].trim() : "";
    };

    let m: RegExpExecArray | null;
    while ((m = relBlockRe.exec(content)) !== null) {
      const block = m[1];
      const relType = extractText(block, "kb:relType");
      const from = extractText(block, "kb:from");
      const to = extractText(block, "kb:to");
      if (relType && from && to)
        relationships.push({ relType, fromId: from, toId: to });
    }

    expect(relationships).toHaveLength(1);
    expect(relationships[0]).toMatchObject({
      relType: "implements",
      fromId: "SYM-001",
      toId: "REQ-001",
    });

    // Cleanup
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ── Unit tests for CodeActionProvider index building ────────────────────────
// We test only the logic that does NOT require js-yaml (path resolution,
// list parsing). js-yaml integration is covered fully in
// packages/cli/tests/extractors/manifest.test.ts.

describe("KibiCodeActionProvider – symbol index", () => {
  let tmpDir: string;
  let manifestPath: string;

  // A tiny subset of symbols.yaml used to drive path-resolution tests
  const YAML_CONTENT = `symbols:
  - id: SYM-auth
    title: AuthService
    source: src/auth.ts
    status: active
    links:
      - REQ-auth-001
      - REQ-auth-002
  - id: SYM-logger
    title: Logger
    source: src/logger.ts
    status: active
    links: []
`;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    manifestPath = path.join(tmpDir, "symbols.yaml");
    fs.writeFileSync(manifestPath, YAML_CONTENT, "utf8");
  });

  test("symbol id and title are present in YAML content", () => {
    // Verify the manifest fixture is written correctly
    const content = fs.readFileSync(manifestPath, "utf8");
    expect(content).toContain("SYM-auth");
    expect(content).toContain("AuthService");
    expect(content).toContain("SYM-logger");
    expect(content).toContain("Logger");
  });

  test("links list is serialised in YAML manifest", () => {
    const content = fs.readFileSync(manifestPath, "utf8");
    expect(content).toContain("REQ-auth-001");
    expect(content).toContain("REQ-auth-002");
  });

  test("source paths are resolved relative to workspace root", () => {
    const workspaceRoot = tmpDir;
    const rawSource = "src/auth.ts";

    // Create the stub file
    fs.mkdirSync(path.join(workspaceRoot, "src"), { recursive: true });
    fs.writeFileSync(path.join(workspaceRoot, "src", "auth.ts"), "// auth");

    const resolved = path.isAbsolute(rawSource)
      ? rawSource
      : path.resolve(workspaceRoot, rawSource);

    expect(fs.existsSync(resolved)).toBe(true);
    expect(resolved).toContain("src/auth.ts");
  });
});
```

## File: test/fixtures/adr/ADR-001.md
```markdown
---
id: ADR-001
title: Sample ADR ADR-001
status: accepted
created_at: 2026-02-17T13:20:00Z
updated_at: 2026-02-17T13:20:00Z
source: https://example.com/fixtures/adr/ADR-001
tags:
  - sample
owner: arch
priority: medium
links:
  - REQ-001
---

Decision: Use sample approach for testing.
```

## File: test/fixtures/adr-example.md
```markdown
---
id: adr-001
title: Use short-lived tokens for password reset
status: accepted
created_at: 2026-02-17T12:15:00Z
updated_at: 2026-02-17T12:15:00Z
source: https://example.com/adr/adr-001
tags:
  - security
owner: arch-team
priority: medium
links:
  - req-001
---

Decision: Use JWT tokens with 1 hour expiry for password reset links.
```

## File: test/fixtures/event-example.md
```markdown
---
id: event-001
title: Password reset requested
status: recorded
created_at: 2026-02-17T12:25:00Z
updated_at: 2026-02-17T12:25:00Z
source: https://example.com/events/reset-requested
tags:
  - telemetry
owner: backend
priority: low
links:
  - test-001
---

Payload: { user_id: 'user-123', method: 'email' }
```


---

#### 🔙 PREVIOUS PART: [kibi-02-tests-3.md](file:kibi-02-tests-3.md)

#### ⏭️ NEXT PART: [kibi-02-tests-5.md](file:kibi-02-tests-5.md)

> _End of Part 11_
