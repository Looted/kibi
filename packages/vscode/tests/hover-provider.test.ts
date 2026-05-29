/**
 * Unit tests for the real KibiHoverProvider source module.
 * Covers provideHover(), fetchRelationships(), fetchEntityDetails(), and caching.
 * Uses mock.module("vscode") to intercept the VS Code import.
 */
import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  mock,
  test,
} from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

resetVscodeMock();

mock.module("vscode", () => getVscodeMockModule());

const { KibiHoverProvider } = await import("../src/hoverProvider");
const { buildIndex } = await import("../src/symbolIndex");

let tmpDir: string;
let testFile: string;
let manifestPath: string;

beforeEach(() => {
  resetVscodeMock();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-hover-unit-"));
  testFile = path.join(tmpDir, "test.ts");
  fs.writeFileSync(testFile, "export function myFunc() {}\n");
  manifestPath = path.join(tmpDir, "symbols.yaml");
});

afterEach(() => {
  if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

afterAll(() => {
  mock.restore();
});

function writeManifest(symbols: string) {
  fs.writeFileSync(manifestPath, symbols, "utf8");
}

// Helper to create a mock RelationshipCache
function createMockCache() {
  const cache = new Map<string, { data: unknown; timestamp: number }>();
  const inflight = new Map<string, Promise<unknown>>();
  return {
    get: (key: string) => cache.get(key),
    set: (key: string, value: { data: unknown; timestamp: number }) =>
      cache.set(key, value),
    getInflight: (key: string) => inflight.get(key),
    setInflight: (key: string, promise: Promise<unknown>) =>
      inflight.set(key, promise),
    deleteInflight: (key: string) => inflight.delete(key),
  };
}

describe("KibiHoverProvider — real module import", () => {
  test("provideHover returns null when symbolIndex is null", async () => {
    const cache = createMockCache();
    const provider = new KibiHoverProvider(tmpDir, null, cache as never);

    const document = {
      uri: { fsPath: testFile },
      getText: () => "export function myFunc() {}\n",
    };
    const position = { line: 0, character: 0, isCancellationRequested: false };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    expect(result).toBeNull();
  });

  test("provideHover returns null when cancellation is requested early", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const provider = new KibiHoverProvider(tmpDir, symbolIndex, cache as never);

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: true };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    expect(result).toBeNull();
  });

  test("provideHover returns null when no symbol at position", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const provider = new KibiHoverProvider(tmpDir, symbolIndex, cache as never);

    const document = {
      uri: { fsPath: testFile },
    };
    // Line 5 has no symbol (symbol is at line 1 = 0-indexed line 0)
    const position = { line: 5, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    expect(result).toBeNull();
  });

  test("provideHover returns null when no symbols for file", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${path.join(tmpDir, "other.ts")}
    sourceLine: 1
    links: []
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const provider = new KibiHoverProvider(tmpDir, symbolIndex, cache as never);

    // testFile doesn't match the symbol's sourceFile
    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    expect(result).toBeNull();
  });

  test("provideHover returns hover with entity details when relationships exist", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: [REQ-001]
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const mockExecCli = mock((_cmd: string) => {
      return JSON.stringify([
        { type: "implements", from: "SYM-001", to: "REQ-001" },
      ]);
    });

    const mockBuildMarkdown = mock(
      (
        _sym: { id: string; title: string; file: string; line: number },
        entities: Array<{ id: string; type: string }>,
      ) => {
        return `# ${entities.map((e) => e.id).join(", ")}`;
      },
    );

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      {
        execCli: mockExecCli,
        buildMarkdown: mockBuildMarkdown,
      },
    );

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    expect(result).not.toBeNull();
  });

  test("provideHover returns null when relationships query returns empty", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const mockExecCli = mock((_cmd: string) => {
      return JSON.stringify([]); // No relationships
    });

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      { execCli: mockExecCli },
    );

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    expect(result).toBeNull();
  });

  test("provideHover handles CLI failure gracefully", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const mockExecCli = mock((_cmd: string) => {
      throw new Error("CLI failed");
    });

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      { execCli: mockExecCli },
    );

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    // CLI failure should be caught, relationships empty → null
    expect(result).toBeNull();
  });

  test("provideHover resolves entity details from CLI output", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: [REQ-001]
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    let callCount = 0;
    const mockExecCli = mock((cmd: string) => {
      callCount++;
      if (cmd.includes("--relationships")) {
        return JSON.stringify([
          { type: "implements", from: "SYM-001", to: "REQ-001" },
        ]);
      }
      // Entity query
      return JSON.stringify({
        id: "REQ-001",
        title: "Sample Req",
        status: "open",
        tags: ["feature"],
      });
    });

    const mockBuildMarkdown = mock(
      (
        sym: { id: string; title: string; file: string; line: number },
        entities: Array<{
          id: string;
          type: string;
          title: string;
          status: string;
          tags: string[];
        }>,
      ) => {
        const lines = [`# ${sym.id}`];
        for (const e of entities) {
          lines.push(`${e.type}: ${e.title}`);
        }
        return lines.join("\n");
      },
    );

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      { execCli: mockExecCli, buildMarkdown: mockBuildMarkdown },
    );

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    expect(result).not.toBeNull();
    expect(mockBuildMarkdown).toHaveBeenCalled();
    // Should have called for relationships and then for entity details
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  test("provideHover uses cached relationships on second call", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: [REQ-001]
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    let cliCallCount = 0;
    const mockExecCli = mock((cmd: string) => {
      cliCallCount++;
      if (cmd.includes("--relationships")) {
        return JSON.stringify([
          { type: "implements", from: "SYM-001", to: "REQ-001" },
        ]);
      }
      return JSON.stringify({
        id: "REQ-001",
        title: "Req",
        status: "open",
        tags: [],
      });
    });

    const mockBuildMarkdown = mock(
      (
        _sym: { id: string; title: string; file: string; line: number },
        _entities: unknown[],
      ) => "# cached test",
    );

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      { execCli: mockExecCli, buildMarkdown: mockBuildMarkdown },
    );

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    // First call
    await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    const firstCallCount = cliCallCount;

    // Second call — should use cache
    await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    // CLI calls should not increase because relationships were cached
    expect(cliCallCount).toBe(firstCallCount);
  });

  test("provideHover uses default buildMarkdown when only execCli is injected", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: [REQ-001]
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const mockExecCli = mock((cmd: string) => {
      if (cmd.includes("--relationships")) {
        return JSON.stringify([
          { type: "implements", from: "SYM-001", to: "REQ-001" },
        ]);
      }

      return JSON.stringify({
        id: "REQ-001",
        title: "Requirement title",
        status: "accepted",
        tags: ["traceability"],
      });
    });

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      {
        execCli: mockExecCli,
      },
    );

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );

    expect(result).not.toBeNull();
  });

  test("provideHover uses default execCli and returns null when CLI command fails", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: [REQ-001]
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);
    const provider = new KibiHoverProvider(tmpDir, symbolIndex, cache as never);

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );

    expect(result).toBeNull();
  });

  test("provideHover handles invalid entity ID prefix gracefully", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const mockExecCli = mock((cmd: string) => {
      if (cmd.includes("--relationships")) {
        // Return relationship with entity that has no valid prefix
        return JSON.stringify([
          { type: "relates_to", from: "SYM-001", to: "unknown-123" },
        ]);
      }
      return JSON.stringify({});
    });

    const mockBuildMarkdown = mock(
      (
        _sym: { id: string; title: string; file: string; line: number },
        entities: unknown[],
      ) => `# ${entities.length} entities`,
    );

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      { execCli: mockExecCli, buildMarkdown: mockBuildMarkdown },
    );

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    // Should not crash, may return hover with no entities
    expect(result).not.toBeNull();
  });

  test("provideHover handles entity query returning array", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const mockExecCli = mock((cmd: string) => {
      if (cmd.includes("--relationships")) {
        return JSON.stringify([
          { type: "implements", from: "SYM-001", to: "REQ-001" },
        ]);
      }
      // Return array format instead of single object
      return JSON.stringify([
        {
          id: "REQ-001",
          title: "Array Req",
          status: "open",
          tags: [],
        },
      ]);
    });

    const mockBuildMarkdown = mock(
      (
        _sym: { id: string; title: string; file: string; line: number },
        entities: Array<{ id: string }>,
      ) => `# ${entities.map((e) => e.id).join(", ")}`,
    );

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      { execCli: mockExecCli, buildMarkdown: mockBuildMarkdown },
    );

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const result = await provider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    expect(result).not.toBeNull();
  });

  test("provideHover handles cancellation before entity details fetch", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: []
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    const mockExecCli = mock((cmd: string) => {
      if (cmd.includes("--relationships")) {
        return JSON.stringify([
          { type: "implements", from: "SYM-001", to: "REQ-001" },
        ]);
      }
      return JSON.stringify({
        id: "REQ-001",
        title: "Test",
        status: "open",
        tags: [],
      });
    });

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      { execCli: mockExecCli },
    );

    // Create a token that becomes cancelled during entity fetch
    const token = { isCancellationRequested: false };

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };

    // Token is cancelled after relationships but before entities
    const cancellableProvider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      {
        execCli: (cmd: string) => {
          if (cmd.includes("--relationships")) {
            return JSON.stringify([
              { type: "implements", from: "SYM-001", to: "REQ-001" },
            ]);
          }
          // Cancel during entity fetch
          token.isCancellationRequested = true;
          return JSON.stringify({
            id: "REQ-001",
            title: "Test",
            status: "open",
            tags: [],
          });
        },
      },
    );

    const result = await cancellableProvider.provideHover(
      document as never,
      position as never,
      token as never,
    );
    // Should return null due to cancellation
    expect(result).toBeNull();
  });

  test("provideHover reuses inflight relationship lookups across concurrent calls", async () => {
    writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: [REQ-001]
`);

    const cache = createMockCache();
    const symbolIndex = buildIndex(manifestPath, tmpDir);

    let relationshipCalls = 0;
    const mockExecCli = mock((cmd: string) => {
      if (cmd.includes("--relationships")) {
        relationshipCalls++;
        return JSON.stringify([
          { type: "implements", from: "SYM-001", to: "REQ-001" },
        ]);
      }

      return JSON.stringify({
        id: "REQ-001",
        title: "Concurrent Req",
        status: "open",
        tags: [],
      });
    });

    const provider = new KibiHoverProvider(
      tmpDir,
      symbolIndex,
      cache as never,
      {
        execCli: ((cmd: string) => mockExecCli(cmd)) as never,
        buildMarkdown: () => "# concurrent",
      },
    );

    const document = {
      uri: { fsPath: testFile },
    };
    const position = { line: 0, character: 0 };
    const token = { isCancellationRequested: false };

    const [first, second] = await Promise.all([
      provider.provideHover(
        document as never,
        position as never,
        token as never,
      ),
      provider.provideHover(
        document as never,
        position as never,
        token as never,
      ),
    ]);

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(relationshipCalls).toBe(1);
  });
});

test("provideHover uses default buildHoverMarkdown when not injected", async () => {
  writeManifest(`symbols:
  - id: SYM-001
    title: myFunc
    sourceFile: ${testFile}
    sourceLine: 1
    links: [REQ-001]
`);

  const cache = createMockCache();
  const symbolIndex = buildIndex(manifestPath, tmpDir);

  const mockExecCli = mock((cmd: string) => {
    if (cmd.includes("--relationships")) {
      return JSON.stringify([
        { type: "implements", from: "SYM-001", to: "REQ-001" },
      ]);
    }
    return JSON.stringify({
      id: "REQ-001",
      title: "Sample Req",
      status: "open",
      tags: ["feature"],
    });
  });

  // Only inject execCli, NOT buildMarkdown — so default buildHoverMarkdown is used
  const provider = new KibiHoverProvider(
    tmpDir,
    symbolIndex,
    cache as never,
    { execCli: mockExecCli } as never,
  );

  const document = {
    uri: { fsPath: testFile },
  };
  const position = { line: 0, character: 0 };
  const token = { isCancellationRequested: false };

  const result = await provider.provideHover(
    document as never,
    position as never,
    token as never,
  );
  expect(result).not.toBeNull();

  // Default buildHoverMarkdown formats: "# SYM-001" then "`file:line`"
  const contents = (result as never as { contents: { value: string } })
    .contents;
  expect(contents.value).toContain("# SYM-001");
  expect(contents.value).toContain("REQ-001");
  expect(contents.value).toContain(
    "[Browse entities](command:kibi.browseLinkedEntities)",
  );
});
