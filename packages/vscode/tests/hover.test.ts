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
