/**
 * Tests for KibiCodeLensProvider from src/codeLensProvider.ts.
 *
 * Exercises the real implementation (not an in-test reimplementation) by:
 *  1. Mocking the `vscode` module (unavailable outside VS Code runtime)
 *  2. Mocking `queryRelationshipsViaCli` from `../src/symbolIndex`
 *  3. Writing real symbols.yaml fixture files to a temp directory
 *  4. Calling the public API and asserting correct behaviour
 *
 * This ensures that changes to the real class (cache keys, merge logic, argument
 * shape, etc.) are caught — unlike the prior approach of testing an in-file
 * reimplementation.
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
// Import the real buildIndex before registering mocks — symbolIndex has no vscode
// dependency so this is safe. Captured here so the synchronous mock factory below
// can include the real implementation without using an async factory (which races
// with Bun's synchronous named-export resolution and drops the export).
import { buildIndex } from "../src/symbolIndex";
import {
  DefaultCodeLens as MockCodeLens,
  DefaultRange as MockRange,
  getVscodeMockModule,
  resetVscodeMock,
} from "./shared/vscode-mock";

mock.module("vscode", () => getVscodeMockModule());

// ---------------------------------------------------------------------------
// Mock queryRelationshipsViaCli — keep buildIndex real (reads YAML)
// ---------------------------------------------------------------------------
let mockQueryImpl: (
  symbolId: string,
  workspaceRoot: string,
) => Array<{ type: string; from: string; to: string }> = () => [];

mock.module("../src/symbolIndex", () => ({
  buildIndex,
  queryRelationshipsViaCli: (symbolId: string, workspaceRoot: string) =>
    mockQueryImpl(symbolId, workspaceRoot),
}));

// ---------------------------------------------------------------------------
// Import real classes AFTER mocks are registered
// ---------------------------------------------------------------------------
const moduleNonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const { KibiCodeLensProvider } = await import(
  `../src/codeLensProvider?case=${moduleNonce}`
);
const { RelationshipCache } = await import(
  `../src/relationshipCache?case=${moduleNonce}`
);
// Capture the workspace object that Bun snapshots into vscode.workspace inside
// codeLensProvider.ts at `import * as vscode from "vscode"` time.  Bun freezes
// the namespace at first import so resetVscodeMock workspace overrides do NOT
// propagate through the getter.  We hold a reference to this original object so
// configureVscodeMock can mutate its createFileSystemWatcher in-place.
const vscodeWorkspaceSpy = (getVscodeMockModule() as Record<string, unknown>)
  .workspace as Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function writeTestSymbols(
  dir: string,
  symbols: Array<Record<string, unknown>>,
  fileName = "symbols.yaml",
): string {
  const symbolsPath = path.join(dir, ".kb", fileName);
  fs.mkdirSync(path.dirname(symbolsPath), { recursive: true });
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

function makeProvider(
  workspaceRoot: string,
  cache?: InstanceType<typeof RelationshipCache>,
): InstanceType<typeof KibiCodeLensProvider> {
  return new KibiCodeLensProvider(
    workspaceRoot,
    cache ?? new RelationshipCache(),
  );
}

function makeDoc(fsPath: string) {
  return { uri: { fsPath, scheme: "file" } } as never;
}

const noCancel = { isCancellationRequested: false } as never;
const cancelledToken = { isCancellationRequested: true } as never;

function getRange(lens: InstanceType<typeof MockCodeLens>) {
  return lens.range as MockRange;
}

function getCommand(lens: InstanceType<typeof MockCodeLens>) {
  return lens.command as {
    command: string;
    title: string;
    arguments: unknown[];
  };
}

// ---------------------------------------------------------------------------
// Helpers for "refresh and watchers" tests
// ---------------------------------------------------------------------------
class MockEventEmitter {
  listeners: Array<() => void> = [];
  fireCount = 0;

  event = (listener?: () => void) => {
    if (listener) this.listeners.push(listener);
    return { dispose() {} };
  };

  fire() {
    this.fireCount++;
    for (const listener of this.listeners) listener();
  }

  dispose() {}
}

class MockFileSystemWatcher {
  changeListeners: Array<() => void> = [];
  createListeners: Array<() => void> = [];
  deleteListeners: Array<() => void> = [];

  constructor(public pattern: unknown) {}

  onDidChange(listener: () => void) {
    this.changeListeners.push(listener);
  }

  onDidCreate(listener: () => void) {
    this.createListeners.push(listener);
  }

  onDidDelete(listener: () => void) {
    this.deleteListeners.push(listener);
  }

  emitChange() {
    for (const listener of this.changeListeners) listener();
  }

  emitCreate() {
    for (const listener of this.createListeners) listener();
  }

  emitDelete() {
    for (const listener of this.deleteListeners) listener();
  }

  dispose() {}
}

const MockUri = {
  file: (p: string) => ({ fsPath: p, path: p, scheme: "file" }),
};
const MockRelativePattern = class {
  constructor(
    public base: unknown,
    public pattern: string,
  ) {}
};
const MockTreeItemCollapsibleState = { None: 0, Collapsed: 1, Expanded: 2 };
class MockThemeIcon {
  constructor(public id: string) {}
}
class MockTreeItem {
  constructor(
    public label: string,
    public collapsibleState: number,
  ) {}
  iconPath?: MockThemeIcon;
  contextValue?: string;
}
const mockWindow = { showInformationMessage: () => {} };

const createdWatchers: MockFileSystemWatcher[] = [];
const mockWorkspace = {
  createFileSystemWatcher: (pattern: unknown) => {
    const watcher = new MockFileSystemWatcher(pattern);
    createdWatchers.push(watcher);
    return watcher;
  },
};

function configureVscodeMock() {
  resetVscodeMock({
    EventEmitter: MockEventEmitter,
    Range: MockRange,
    CodeLens: MockCodeLens,
    Uri: MockUri,
    RelativePattern: MockRelativePattern,
    workspace: mockWorkspace,
    TreeItemCollapsibleState: MockTreeItemCollapsibleState,
    ThemeIcon: MockThemeIcon,
    TreeItem: MockTreeItem,
    window: mockWindow,
  });
  // Bun snapshots vscode.workspace at codeLensProvider import time, so the
  // workspace override in resetVscodeMock doesn't reach it.  Mutate the
  // snapshotted workspace object's createFileSystemWatcher directly.
  vscodeWorkspaceSpy.createFileSystemWatcher =
    mockWorkspace.createFileSystemWatcher;
}

type MockExtensionContext = { subscriptions: unknown[] };

function makeContext(): MockExtensionContext {
  return { subscriptions: [] };
}

async function waitForDebounce() {
  await new Promise((resolve) => setTimeout(resolve, 550));
}

// ---------------------------------------------------------------------------
// provideCodeLenses
// ---------------------------------------------------------------------------
describe("KibiCodeLensProvider – provideCodeLenses", () => {
  let tmpDir: string;

  beforeEach(() => {
    resetVscodeMock();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    mockQueryImpl = () => [];
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

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);

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

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);

    expect(lenses?.length).toBe(1);
    if (!lenses) throw new Error("lenses is null");
    // Real class: new vscode.Range(line, 0, line, 0) where line = sourceLine - 1
    expect(
      getRange(lenses[0] as InstanceType<typeof MockCodeLens>).start.line,
    ).toBe(15);
  });

  test("returns null for symbols in a different file", () => {
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

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);

    expect(lenses).toBeNull();
  });

  test("returns null when symbols.yaml does not exist", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);

    expect(lenses).toBeNull();
  });

  test("internal helper function entry produces CodeLens at correct line", () => {
    const testFile = path.join(tmpDir, "src", "linker.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// linker\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-INT-001",
        title: "mergeStaticLinks",
        sourceFile: "src/linker.ts",
        sourceLine: 42,
        links: ["REQ-010"],
      },
    ]);

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);

    expect(lenses?.length).toBe(1);
    if (!lenses) throw new Error("lenses is null");
    // sourceLine=42 → 0-based line 41
    expect(
      getRange(lenses[0] as InstanceType<typeof MockCodeLens>).start.line,
    ).toBe(41);
  });

  test("class method entry produces CodeLens at correct line", () => {
    const testFile = path.join(tmpDir, "src", "codeLensProvider.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// provider\n", "utf8");

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-METHOD-001",
        title: "provideCodeLenses",
        sourceFile: "src/codeLensProvider.ts",
        sourceLine: 78,
        links: ["REQ-vscode-codelens"],
      },
      {
        id: "SYM-METHOD-002",
        title: "resolveCodeLens",
        sourceFile: "src/codeLensProvider.ts",
        sourceLine: 115,
        links: ["REQ-vscode-codelens"],
      },
    ]);

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);

    expect(lenses?.length).toBe(2);
    if (!lenses) throw new Error("lenses is null");

    // sourceLine=78 → 0-based line 77
    expect(
      getRange(lenses[0] as InstanceType<typeof MockCodeLens>).start.line,
    ).toBe(77);

    // sourceLine=115 → 0-based line 114
    expect(
      getRange(lenses[1] as InstanceType<typeof MockCodeLens>).start.line,
    ).toBe(114);
  });

  test("returns null when symbols.yaml is malformed", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    const symbolsPath = path.join(tmpDir, ".kb", "symbols.yaml");
    fs.mkdirSync(path.dirname(symbolsPath), { recursive: true });
    fs.writeFileSync(symbolsPath, "symbols: [\n  - id: SYM-001", "utf8");

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);

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

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);

    expect(lenses?.length).toBe(1);
    if (!lenses) throw new Error("lenses is null");
    expect(
      getRange(lenses[0] as InstanceType<typeof MockCodeLens>).start.line,
    ).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveCodeLens
// ---------------------------------------------------------------------------
describe("KibiCodeLensProvider – resolveCodeLens", () => {
  let tmpDir: string;

  beforeEach(() => {
    resetVscodeMock();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    mockQueryImpl = () => [];
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  async function setupAndResolve(
    workspaceRoot: string,
    symbolLinks: string[],
    dynamicRels: Array<{ type: string; from: string; to: string }>,
  ) {
    const testFile = path.join(workspaceRoot, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    writeTestSymbols(workspaceRoot, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 16,
        links: symbolLinks,
      },
    ]);

    mockQueryImpl = () => dynamicRels;

    const provider = makeProvider(workspaceRoot);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);
    if (!lenses || lenses.length === 0) throw new Error("no lenses");

    return {
      provider,
      lens: lenses[0] as InstanceType<typeof MockCodeLens>,
      resolved: await provider.resolveCodeLens(lenses[0], noCancel),
    };
  }

  test("resolveCodeLens populates command with kibi.browseLinkedEntities", async () => {
    const { resolved } = await setupAndResolve(
      tmpDir,
      ["REQ-001"],
      [{ type: "implements", from: "SYM-001", to: "REQ-002" }],
    );

    expect(resolved).not.toBeNull();
    if (!resolved) throw new Error("resolved is null");
    expect(
      getCommand(resolved as InstanceType<typeof MockCodeLens>).command,
    ).toBe("kibi.browseLinkedEntities");
  });

  test("command arguments[1] contains full relationship objects (not just IDs)", async () => {
    const { resolved } = await setupAndResolve(
      tmpDir,
      ["REQ-001"],
      [{ type: "implements", from: "SYM-001", to: "REQ-002" }],
    );

    if (!resolved) throw new Error("resolved is null");
    const cmd = getCommand(resolved as InstanceType<typeof MockCodeLens>);

    expect(cmd.arguments[0]).toBe("SYM-001");
    // Real class: args[1] is the full relationships array (type+from+to objects)
    expect(cmd.arguments[1]).toEqual([
      { type: "relates_to", from: "SYM-001", to: "REQ-001" }, // static link converted
      { type: "implements", from: "SYM-001", to: "REQ-002" }, // dynamic
    ]);
    expect(String(cmd.arguments[2])).toContain("src/main.ts");
    expect(cmd.arguments[3]).toBe(16);
  });

  test("lens title shows emoji-categorized counts", async () => {
    const { resolved } = await setupAndResolve(
      tmpDir,
      ["REQ-001", "ADR-005"],
      [{ type: "implements", from: "SYM-001", to: "REQ-003" }],
    );

    if (!resolved) throw new Error("resolved is null");
    const cmd = getCommand(resolved as InstanceType<typeof MockCodeLens>);
    expect(cmd.title).toBe("📋 2 reqs • 📐 1 ADR");
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

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);
    if (!lenses || lenses.length === 0) throw new Error("no lenses");

    const resolved = await provider.resolveCodeLens(lenses[0], cancelledToken);
    expect(resolved).toBeNull();
  });

  test("guards show as 'guarded by {flagName}' instead of counted", async () => {
    const { resolved } = await setupAndResolve(
      tmpDir,
      [],
      [{ type: "guards", from: "FLAG-feature_new_checkout", to: "SYM-001" }],
    );

    if (!resolved) throw new Error("resolved is null");
    const cmd = getCommand(resolved as InstanceType<typeof MockCodeLens>);
    expect(cmd.title).toBe("🚩 guarded by feature_new_checkout");
  });

  test("title shows 'No linked entities' when no relationships", async () => {
    const { resolved } = await setupAndResolve(tmpDir, [], []);

    if (!resolved) throw new Error("resolved is null");
    const cmd = getCommand(resolved as InstanceType<typeof MockCodeLens>);
    expect(cmd.title).toBe("No linked entities");
  });

  test("empty dynamic result shows 'No linked entities'", async () => {
    const { resolved } = await setupAndResolve(tmpDir, [], []);

    if (!resolved) throw new Error("resolved is null");
    const cmd = getCommand(resolved as InstanceType<typeof MockCodeLens>);
    expect(cmd.title).toBe("No linked entities");
  });

  test("static links are merged with dynamic relationships (static first)", async () => {
    const { resolved } = await setupAndResolve(
      tmpDir,
      ["REQ-STATIC-001", "REQ-STATIC-002"],
      [
        { type: "implements", from: "SYM-001", to: "REQ-DYNAMIC-001" },
        { type: "verified_by", from: "SYM-001", to: "TEST-001" },
      ],
    );

    if (!resolved) throw new Error("resolved is null");
    const cmd = getCommand(resolved as InstanceType<typeof MockCodeLens>);

    // args[1] is the full merged relationships array — static links first
    expect(cmd.arguments[1]).toEqual([
      { type: "relates_to", from: "SYM-001", to: "REQ-STATIC-001" },
      { type: "relates_to", from: "SYM-001", to: "REQ-STATIC-002" },
      { type: "implements", from: "SYM-001", to: "REQ-DYNAMIC-001" },
      { type: "verified_by", from: "SYM-001", to: "TEST-001" },
    ]);
  });

  test("title shows all emoji categories when multiple entity types present", async () => {
    const { resolved } = await setupAndResolve(
      tmpDir,
      ["REQ-001", "TEST-001"],
      [
        { type: "implements", from: "SYM-001", to: "REQ-002" },
        { type: "constrained_by", from: "SYM-001", to: "ADR-001" },
      ],
    );

    if (!resolved) throw new Error("resolved is null");
    const cmd = getCommand(resolved as InstanceType<typeof MockCodeLens>);
    expect(cmd.title).toBe("📋 2 reqs • ✓ 1 test • 📐 1 ADR");
  });
});

// ---------------------------------------------------------------------------
// Caching — real RelationshipCache with TTL
// ---------------------------------------------------------------------------
describe("KibiCodeLensProvider – caching", () => {
  let tmpDir: string;

  beforeEach(() => {
    resetVscodeMock();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    mockQueryImpl = () => [];
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
        links: [],
      },
    ]);

    let callCount = 0;
    mockQueryImpl = () => {
      callCount++;
      return [{ type: "implements", from: "SYM-001", to: "REQ-001" }];
    };

    const provider = makeProvider(tmpDir);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);
    if (!lenses || lenses.length === 0) throw new Error("no lenses");

    await provider.resolveCodeLens(lenses[0], noCancel);
    expect(callCount).toBe(1);

    await provider.resolveCodeLens(lenses[0], noCancel);
    // Second call should hit cache — no additional CLI invocation
    expect(callCount).toBe(1);
  });

  test("after cache cleared, a new CLI call is made", async () => {
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

    let callCount = 0;
    mockQueryImpl = () => {
      callCount++;
      return [{ type: "implements", from: "SYM-001", to: "REQ-001" }];
    };

    const cache = new RelationshipCache();
    const provider = new KibiCodeLensProvider(tmpDir, cache);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);
    if (!lenses || lenses.length === 0) throw new Error("no lenses");

    await provider.resolveCodeLens(lenses[0], noCancel);
    expect(callCount).toBe(1);

    // Clear the shared cache directly
    cache.clear();

    await provider.resolveCodeLens(lenses[0], noCancel);
    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// refresh and watchers
// ---------------------------------------------------------------------------
describe("KibiCodeLensProvider \u2013 refresh and watchers", () => {
  let tmpDir: string;

  beforeEach(() => {
    configureVscodeMock();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-codelens-refresh-"));
    mockQueryImpl = () => [];
    createdWatchers.length = 0;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("refresh uses canonical .kb/symbols.yaml", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    const provider = makeProvider(tmpDir);
    expect(provider.provideCodeLenses(makeDoc(testFile), noCancel)).toBeNull();

    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "main",
        sourceFile: "src/main.ts",
        sourceLine: 3,
        links: [],
      },
    ]);

    provider.refresh();

    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);
    expect(lenses?.length).toBe(1);
  });

  test("refresh uses canonical .kb/symbols.yaml, clears cache, and emits change", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");
    writeTestSymbols(tmpDir, [
      {
        id: "SYM-ABS-001",
        title: "main",
        sourceFile: "src/main.ts",
        sourceLine: 5,
        links: [],
      },
    ]);

    const cache = new RelationshipCache();
    cache.set("codelens:rel:SYM-ABS-001", { data: [], timestamp: Date.now() });
    const provider = makeProvider(tmpDir, cache);
    let fireCount = 0;
    provider.onDidChangeCodeLenses(() => {
      fireCount++;
    });

    provider.refresh();

    expect(cache.get("codelens:rel:SYM-ABS-001")).toBeUndefined();
    expect(fireCount).toBe(1);
    expect(
      provider.provideCodeLenses(makeDoc(testFile), noCancel)?.length,
    ).toBe(1);
  });

  test("refresh ignores leftover config.json and repo-root symbols.yml", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");
    fs.writeFileSync(path.join(tmpDir, ".kb", "config.json"), "{", "utf8");
    writeTestSymbols(
      tmpDir,
      [
        {
          id: "SYM-YML-001",
          title: "main",
          sourceFile: "src/main.ts",
          sourceLine: 7,
          links: [],
        },
      ],
      "symbols.yml",
    );

    const provider = makeProvider(tmpDir);
    provider.refresh();

    expect(provider.provideCodeLenses(makeDoc(testFile), noCancel)).toBeNull();
  });

  test("refresh falls back to default symbols.yaml path when no manifest exists", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    const cache = new RelationshipCache();
    cache.set("orphan", { data: [], timestamp: Date.now() });
    const provider = makeProvider(tmpDir, cache);
    let fireCount = 0;
    provider.onDidChangeCodeLenses(() => {
      fireCount++;
    });

    provider.refresh();

    expect(cache.get("orphan")).toBeUndefined();
    expect(fireCount).toBe(1);
    expect(provider.provideCodeLenses(makeDoc(testFile), noCancel)).toBeNull();
  });

  test("watchSources registers watchers and manifest changes debounce refresh", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    const provider = makeProvider(tmpDir);
    let fireCount = 0;
    provider.onDidChangeCodeLenses(() => {
      fireCount++;
    });

    const context = makeContext();
    provider.watchSources(context as never);

    expect(createdWatchers.length).toBe(2);
    expect(context.subscriptions.length).toBe(2);

    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "main",
        sourceFile: "src/main.ts",
        sourceLine: 2,
        links: [],
      },
    ]);

    createdWatchers[0]?.emitChange();
    createdWatchers[0]?.emitChange();
    await waitForDebounce();

    expect(fireCount).toBe(1);
    expect(
      provider.provideCodeLenses(makeDoc(testFile), noCancel)?.length,
    ).toBe(1);
  });

  test("watchSources clears relationship cache on KB watcher events", async () => {
    const cache = new RelationshipCache();
    cache.set("codelens:rel:SYM-001", { data: [], timestamp: Date.now() });
    const provider = makeProvider(tmpDir, cache);
    let fireCount = 0;
    provider.onDidChangeCodeLenses(() => {
      fireCount++;
    });

    provider.watchSources(makeContext() as never);
    createdWatchers[1]?.emitCreate();
    await waitForDebounce();

    expect(cache.get("codelens:rel:SYM-001")).toBeUndefined();
    expect(fireCount).toBe(1);
  });

  test("debounce helper only invokes the latest call", async () => {
    const provider = makeProvider(tmpDir);
    const calls: string[] = [];
    const withDebounce = provider as unknown as {
      debounce: (
        fn: (value: string) => void,
        delay: number,
      ) => (value: string) => void;
    };
    const debounced = withDebounce.debounce((value: string) => {
      calls.push(value);
    }, 20);

    debounced("first");
    debounced("second");
    await new Promise((resolve) => setTimeout(resolve, 40));

    expect(calls).toEqual(["second"]);
  });
});

afterAll(() => {
  resetVscodeMock();
  mock.restore();
});

describe("KibiCodeLensProvider - remaining branch coverage", () => {
  let tmpDir: string;

  beforeEach(() => {
    configureVscodeMock();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cl-remain-"));
    mockQueryImpl = () => [];
    createdWatchers.length = 0;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("resolveCodeLens uses cached data without calling CLI", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main", "utf8");
    writeTestSymbols(tmpDir, [
      {
        id: "SYM-CACHE",
        title: "cache",
        sourceFile: "src/main.ts",
        sourceLine: 1,
        links: [],
      },
    ]);
    const cache = new RelationshipCache();
    cache.set("codelens:rel:SYM-CACHE", {
      data: [{ type: "implements", from: "SYM-CACHE", to: "REQ-001" }],
      timestamp: Date.now(),
    });
    const provider = new KibiCodeLensProvider(tmpDir, cache);
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);
    if (!lenses || lenses.length === 0) throw new Error("no lenses");
    let queryCalled = false;
    mockQueryImpl = () => {
      queryCalled = true;
      return [];
    };
    const resolved = await provider.resolveCodeLens(lenses[0], noCancel);
    expect(queryCalled).toBe(false);
    expect(queryCalled).toBe(false);
    expect(resolved?.command?.command).toBe("kibi.browseLinkedEntities");
  });

  test("resolveCodeLens with guards and non-guard relationships", async () => {
    const testFile = path.join(tmpDir, "src", "guarded.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// guarded", "utf8");
    writeTestSymbols(tmpDir, [
      {
        id: "SYM-G",
        title: "g",
        sourceFile: "src/guarded.ts",
        sourceLine: 1,
        links: [],
      },
    ]);
    mockQueryImpl = () => [
      { type: "guards", from: "SYM-G", to: "FLAG-001" },
      { type: "implements", from: "SYM-G", to: "REQ-001" },
    ];
    const provider = new KibiCodeLensProvider(tmpDir, new RelationshipCache());
    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);
    if (!lenses || lenses.length === 0) throw new Error("no lenses");
    const resolved = await provider.resolveCodeLens(lenses[0], noCancel);
    expect(resolved?.command?.title).toContain("g");
  });

  test("provideCodeLenses returns null for no-match document", () => {
    const testFile = path.join(tmpDir, "src", "no-match.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// no-match", "utf8");
    writeTestSymbols(tmpDir, [
      {
        id: "SYM-X",
        title: "x",
        sourceFile: "other/file.ts",
        sourceLine: 1,
        links: [],
      },
    ]);
    const provider = new KibiCodeLensProvider(tmpDir, new RelationshipCache());
    expect(provider.provideCodeLenses(makeDoc(testFile), noCancel)).toBeNull();
  });
});
