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
import { buildIndex } from "../src/symbolIndex";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

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

class MockRange {
  start: { line: number; character: number };
  end: { line: number; character: number };

  constructor(
    startLine: number,
    startCharacter: number,
    endLine: number,
    endCharacter: number,
  ) {
    this.start = { line: startLine, character: startCharacter };
    this.end = { line: endLine, character: endCharacter };
  }
}

class MockCodeLens {
  command?: unknown;

  constructor(
    public range: unknown,
    command?: unknown,
  ) {
    this.command = command;
  }
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

const createdWatchers: MockFileSystemWatcher[] = [];
const mockWorkspace = {
  createFileSystemWatcher: (pattern: unknown) => {
    const watcher = new MockFileSystemWatcher(pattern);
    createdWatchers.push(watcher);
    return watcher;
  },
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
}

configureVscodeMock();

mock.module("vscode", () => getVscodeMockModule());

let mockQueryImpl: (
  symbolId: string,
  workspaceRoot: string,
) => Array<{ type: string; from: string; to: string }> = () => [];

mock.module("../src/symbolIndex", () => ({
  buildIndex,
  queryRelationshipsViaCli: (symbolId: string, workspaceRoot: string) =>
    mockQueryImpl(symbolId, workspaceRoot),
}));

const { KibiCodeLensProvider } = await import("../src/codeLensProvider");
const { RelationshipCache } = await import("../src/relationshipCache");

function writeTestSymbols(
  dir: string,
  symbols: Array<Record<string, unknown>>,
  fileName = "symbols.yaml",
): string {
  const symbolsPath = path.join(dir, fileName);
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

type MockExtensionContext = { subscriptions: unknown[] };

function makeContext(): MockExtensionContext {
  return { subscriptions: [] };
}

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

async function waitForDebounce() {
  await new Promise((resolve) => setTimeout(resolve, 550));
}

const noCancel = { isCancellationRequested: false } as never;
const cancelledToken = { isCancellationRequested: true } as never;

describe("KibiCodeLensProvider – provideCodeLenses", () => {
  let tmpDir: string;

  beforeEach(() => {
    configureVscodeMock();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    mockQueryImpl = () => [];
    createdWatchers.length = 0;
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

  test("returns null when request is cancelled before providing", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// code\n", "utf8");
    writeTestSymbols(tmpDir, [
      {
        id: "SYM-001",
        title: "myFunction",
        sourceFile: "src/main.ts",
        sourceLine: 1,
        links: [],
      },
    ]);

    const provider = makeProvider(tmpDir);
    expect(
      provider.provideCodeLenses(makeDoc(testFile), cancelledToken),
    ).toBeNull();
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
    expect(
      getRange(lenses[0] as InstanceType<typeof MockCodeLens>).start.line,
    ).toBe(77);
    expect(
      getRange(lenses[1] as InstanceType<typeof MockCodeLens>).start.line,
    ).toBe(114);
  });

  test("returns null when symbols.yaml is malformed", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    const symbolsPath = path.join(tmpDir, "symbols.yaml");
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

describe("KibiCodeLensProvider – resolveCodeLens", () => {
  let tmpDir: string;

  beforeEach(() => {
    configureVscodeMock();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    mockQueryImpl = () => [];
    createdWatchers.length = 0;
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

  test("returns null when resolving a lens with no metadata", async () => {
    const provider = makeProvider(tmpDir);
    const lens = new MockCodeLens(new MockRange(0, 0, 0, 0)) as never;
    expect(await provider.resolveCodeLens(lens, noCancel)).toBeNull();
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
    expect(cmd.arguments[1]).toEqual([
      { type: "relates_to", from: "SYM-001", to: "REQ-001" },
      { type: "implements", from: "SYM-001", to: "REQ-002" },
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

    expect(cmd.arguments[1]).toEqual([
      { type: "relates_to", from: "SYM-001", to: "REQ-STATIC-001" },
      { type: "relates_to", from: "SYM-001", to: "REQ-STATIC-002" },
      { type: "implements", from: "SYM-001", to: "REQ-DYNAMIC-001" },
      { type: "verified_by", from: "SYM-001", to: "TEST-001" },
    ]);
  });

  test("duplicate static and dynamic tuples are deduplicated", async () => {
    const { resolved } = await setupAndResolve(
      tmpDir,
      ["REQ-001"],
      [
        { type: "relates_to", from: "SYM-001", to: "REQ-001" },
        { type: "relates_to", from: "SYM-001", to: "REQ-001" },
      ],
    );

    if (!resolved) throw new Error("resolved is null");
    const cmd = getCommand(resolved as InstanceType<typeof MockCodeLens>);
    expect(cmd.arguments[1]).toEqual([
      { type: "relates_to", from: "SYM-001", to: "REQ-001" },
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

describe("KibiCodeLensProvider – caching", () => {
  let tmpDir: string;

  beforeEach(() => {
    configureVscodeMock();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-test-"));
    mockQueryImpl = () => [];
    createdWatchers.length = 0;
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

    cache.clear();

    await provider.resolveCodeLens(lenses[0], noCancel);
    expect(callCount).toBe(2);
  });
});

describe("KibiCodeLensProvider – refresh and watchers", () => {
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

  test("refresh uses relative symbolsManifest from .kb/config.json", () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    const altDir = path.join(tmpDir, "config");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");

    const provider = makeProvider(tmpDir);
    expect(provider.provideCodeLenses(makeDoc(testFile), noCancel)).toBeNull();

    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.mkdirSync(altDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, ".kb", "config.json"),
      JSON.stringify({ symbolsManifest: "config/symbols.yaml" }),
      "utf8",
    );
    writeTestSymbols(
      altDir,
      [
        {
          id: "SYM-001",
          title: "main",
          sourceFile: "src/main.ts",
          sourceLine: 3,
          links: [],
        },
      ],
      "symbols.yaml",
    );

    provider.refresh();

    const lenses = provider.provideCodeLenses(makeDoc(testFile), noCancel);
    expect(lenses?.length).toBe(1);
  });

  test("refresh uses absolute paths.symbols, clears cache, and emits change", async () => {
    const testFile = path.join(tmpDir, "src", "main.ts");
    const manifestDir = path.join(tmpDir, "absolute");
    const manifestPath = path.join(manifestDir, "symbols.yml");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.mkdirSync(path.join(tmpDir, ".kb"), { recursive: true });
    fs.mkdirSync(manifestDir, { recursive: true });
    fs.writeFileSync(testFile, "// main\n", "utf8");
    fs.writeFileSync(
      path.join(tmpDir, ".kb", "config.json"),
      JSON.stringify({ paths: { symbols: manifestPath } }),
      "utf8",
    );
    writeTestSymbols(
      manifestDir,
      [
        {
          id: "SYM-ABS-001",
          title: "main",
          sourceFile: "src/main.ts",
          sourceLine: 5,
          links: [],
        },
      ],
      "symbols.yml",
    );

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

  test("refresh ignores malformed config and falls back to symbols.yml", () => {
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

    expect(
      provider.provideCodeLenses(makeDoc(testFile), noCancel)?.length,
    ).toBe(1);
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
  mock.restore();
});
