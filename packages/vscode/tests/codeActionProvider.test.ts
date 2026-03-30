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

class MockCodeAction {
  command?: {
    command: string;
    title: string;
    arguments: unknown[];
  };

  constructor(
    public title: string,
    public kind: unknown,
  ) {}
}

class MockPosition {
  constructor(
    public line: number,
    public character: number,
  ) {}
}

class MockRange {
  start: MockPosition;
  end: MockPosition;

  constructor(start: MockPosition, end: MockPosition) {
    this.start = start;
    this.end = end;
  }
}

class MockSelection extends MockRange {}

class MockRelativePattern {
  constructor(
    public base: unknown,
    public pattern: string,
  ) {}
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

const createdWatchers: MockFileSystemWatcher[] = [];
const infoMessages: string[] = [];
const quickPickCalls: Array<{ items: unknown[]; options: unknown }> = [];
const openTextDocumentCalls: string[] = [];
const showTextDocumentCalls: Array<{ lineCount: number }> = [];
const revealCalls: Array<{ startLine: number; revealType: unknown }> = [];

let quickPickResult: { label: string; detail?: string } | undefined;
let openedDocs = new Map<
  string,
  { uri: { fsPath: string }; lineCount: number }
>();
let lastEditor: {
  selection: MockSelection | undefined;
  revealRange: (range: MockRange, revealType: unknown) => void;
} | null = null;

const mockWorkspace = {
  createFileSystemWatcher: (pattern: unknown) => {
    const watcher = new MockFileSystemWatcher(pattern);
    createdWatchers.push(watcher);
    return watcher;
  },
  openTextDocument: async (uri: { fsPath: string }) => {
    openTextDocumentCalls.push(uri.fsPath);
    return openedDocs.get(uri.fsPath) ?? { uri, lineCount: 1 };
  },
};

const mockWindow = {
  showInformationMessage: (message: string) => {
    infoMessages.push(message);
  },
  showQuickPick: async (items: unknown[], options: unknown) => {
    quickPickCalls.push({ items, options });
    return quickPickResult;
  },
  showTextDocument: async (doc: { lineCount: number }) => {
    showTextDocumentCalls.push({ lineCount: doc.lineCount });
    lastEditor = {
      selection: undefined,
      revealRange: (range: MockRange, revealType: unknown) => {
        revealCalls.push({ startLine: range.start.line, revealType });
      },
    };
    return lastEditor;
  },
};

function configureVscodeMock() {
  resetVscodeMock({
    CodeAction: MockCodeAction,
    Position: MockPosition,
    Range: MockRange,
    RelativePattern: MockRelativePattern,
    Selection: MockSelection,
    TextEditorRevealType: { InCenter: "in-center" },
    Uri: { file: (p: string) => ({ fsPath: p, path: p, scheme: "file" }) },
    window: mockWindow,
    workspace: mockWorkspace,
  });
}

configureVscodeMock();

mock.module("vscode", () => getVscodeMockModule());

const { KibiCodeActionProvider, browseLinkedEntities, openFileAtLine } =
  await import("../src/codeActionProvider");

function writeSymbolsManifest(
  dir: string,
  symbols: Array<Record<string, unknown>>,
  fileName = "symbols.yaml",
) {
  const manifestPath = path.join(dir, fileName);
  const lines: string[] = ["symbols:"];
  for (const symbol of symbols) {
    lines.push(`  - id: ${String(symbol.id ?? "")}`);
    lines.push(`    title: ${String(symbol.title ?? "")}`);
    if (symbol.sourceFile)
      lines.push(`    sourceFile: ${String(symbol.sourceFile)}`);
    if (typeof symbol.sourceLine === "number") {
      lines.push(`    sourceLine: ${symbol.sourceLine}`);
    }
    lines.push("    links:");
    for (const link of (Array.isArray(symbol.links)
      ? symbol.links
      : []) as string[]) {
      lines.push(`      - ${link}`);
    }
  }
  fs.writeFileSync(manifestPath, `${lines.join("\n")}\n`, "utf8");
  return manifestPath;
}

function makeDocument(filePath: string, word = "") {
  return {
    uri: { fsPath: filePath },
    getWordRangeAtPosition: () =>
      word
        ? new MockRange(
            new MockPosition(0, 0),
            new MockPosition(0, word.length),
          )
        : undefined,
    getText: () => word,
  } as never;
}

function makeContext(): { subscriptions: unknown[] } {
  return { subscriptions: [] };
}

describe("KibiCodeActionProvider", () => {
  let tmpDir: string;
  let testFile: string;

  beforeEach(() => {
    configureVscodeMock();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-code-actions-"));
    testFile = path.join(tmpDir, "src", "feature.ts");
    fs.mkdirSync(path.dirname(testFile), { recursive: true });
    fs.writeFileSync(testFile, "export function feature() {}\n", "utf8");
    createdWatchers.length = 0;
    infoMessages.length = 0;
    quickPickCalls.length = 0;
    openTextDocumentCalls.length = 0;
    showTextDocumentCalls.length = 0;
    revealCalls.length = 0;
    quickPickResult = undefined;
    openedDocs = new Map();
    lastEditor = null;
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns no actions when manifest is missing", () => {
    const provider = new KibiCodeActionProvider(tmpDir);

    expect(
      provider.provideCodeActions(
        makeDocument(testFile, "feature"),
        new MockRange(new MockPosition(0, 0), new MockPosition(0, 0)) as never,
      ),
    ).toEqual([]);
  });

  test("returns deduplicated actions for file and title matches", () => {
    writeSymbolsManifest(tmpDir, [
      {
        id: "SYM-001",
        title: "feature",
        sourceFile: "src/feature.ts",
        sourceLine: 4,
        links: ["REQ-001"],
      },
      {
        id: "SYM-002",
        title: "feature",
        sourceFile: "src/other.ts",
        sourceLine: 8,
        links: ["REQ-002"],
      },
    ]);

    const provider = new KibiCodeActionProvider(tmpDir);
    const actions = provider.provideCodeActions(
      makeDocument(testFile, "feature"),
      new MockRange(new MockPosition(0, 0), new MockPosition(0, 0)) as never,
    );

    expect(actions).toHaveLength(2);
    expect(actions.map((action) => action.title)).toEqual([
      'Kibi: Browse linked entities for "feature"',
      'Kibi: Browse linked entities for "feature"',
    ]);
    expect(actions[0]?.command).toEqual({
      command: "kibi.browseLinkedEntities",
      title: "Browse linked entities",
      arguments: [
        "SYM-001",
        ["REQ-001"],
        path.join(tmpDir, "src", "feature.ts"),
        4,
      ],
    });
    expect(actions[1]?.command).toEqual({
      command: "kibi.browseLinkedEntities",
      title: "Browse linked entities",
      arguments: [
        "SYM-002",
        ["REQ-002"],
        path.join(tmpDir, "src", "other.ts"),
        8,
      ],
    });
  });

  test("returns no actions when no symbol matches and no word is found", () => {
    writeSymbolsManifest(tmpDir, [
      {
        id: "SYM-001",
        title: "different",
        sourceFile: "src/other.ts",
        sourceLine: 3,
        links: [],
      },
    ]);

    const provider = new KibiCodeActionProvider(tmpDir);

    expect(
      provider.provideCodeActions(
        makeDocument(testFile),
        new MockRange(new MockPosition(0, 0), new MockPosition(0, 0)) as never,
      ),
    ).toEqual([]);
  });

  test("watchManifest rebuilds on create and change, and clears on delete", () => {
    writeSymbolsManifest(tmpDir, [
      {
        id: "SYM-001",
        title: "feature",
        sourceFile: "src/feature.ts",
        sourceLine: 1,
        links: [],
      },
    ]);

    const provider = new KibiCodeActionProvider(tmpDir);
    const context = makeContext();
    provider.watchManifest(context as never);

    expect(createdWatchers).toHaveLength(1);
    expect(context.subscriptions).toHaveLength(1);
    expect(
      provider.provideCodeActions(
        makeDocument(testFile, "feature"),
        new MockRange(new MockPosition(0, 0), new MockPosition(0, 0)) as never,
      ),
    ).toHaveLength(1);

    fs.unlinkSync(path.join(tmpDir, "symbols.yaml"));
    createdWatchers[0]?.emitDelete();
    expect(
      provider.provideCodeActions(
        makeDocument(testFile, "feature"),
        new MockRange(new MockPosition(0, 0), new MockPosition(0, 0)) as never,
      ),
    ).toEqual([]);

    writeSymbolsManifest(
      tmpDir,
      [
        {
          id: "SYM-002",
          title: "created",
          sourceFile: "src/feature.ts",
          sourceLine: 2,
          links: ["REQ-123"],
        },
      ],
      "symbols.yml",
    );
    createdWatchers[0]?.emitCreate();
    let actions = provider.provideCodeActions(
      makeDocument(testFile, "created"),
      new MockRange(new MockPosition(0, 0), new MockPosition(0, 0)) as never,
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]?.command?.arguments).toEqual([
      "SYM-002",
      ["REQ-123"],
      path.join(tmpDir, "src", "feature.ts"),
      2,
    ]);

    writeSymbolsManifest(
      tmpDir,
      [
        {
          id: "SYM-003",
          title: "changed",
          sourceFile: "src/feature.ts",
          sourceLine: 3,
          links: ["REQ-456"],
        },
      ],
      "symbols.yml",
    );
    createdWatchers[0]?.emitChange();
    actions = provider.provideCodeActions(
      makeDocument(testFile, "changed"),
      new MockRange(new MockPosition(0, 0), new MockPosition(0, 0)) as never,
    );
    expect(actions).toHaveLength(1);
    expect(actions[0]?.command?.arguments).toEqual([
      "SYM-003",
      ["REQ-456"],
      path.join(tmpDir, "src", "feature.ts"),
      3,
    ]);
  });
});

describe("browseLinkedEntities", () => {
  beforeEach(() => {
    infoMessages.length = 0;
    quickPickCalls.length = 0;
    openTextDocumentCalls.length = 0;
    showTextDocumentCalls.length = 0;
    revealCalls.length = 0;
    quickPickResult = undefined;
    openedDocs = new Map();
    lastEditor = null;
  });

  test("shows an information message when no linked entities exist", async () => {
    await browseLinkedEntities("SYM-001", [], "/workspace", () => undefined);

    expect(infoMessages).toEqual([
      'No linked entities found for symbol "SYM-001".',
    ]);
    expect(quickPickCalls).toHaveLength(0);
  });

  test("returns early when quick pick selection is cancelled", async () => {
    await browseLinkedEntities(
      "SYM-001",
      [
        { type: "implements", from: "SYM-001", to: "REQ-001" },
        { type: "implements", from: "SYM-001", to: "REQ-001" },
      ],
      "/workspace",
      (id) =>
        id === "REQ-001"
          ? { localPath: "/workspace/req.md", line: 7 }
          : undefined,
    );

    expect(quickPickCalls).toHaveLength(1);
    expect(quickPickCalls[0]?.items).toEqual([
      {
        label: "REQ-001",
        description: "req.md",
        detail: "/workspace/req.md",
      },
    ]);
    expect(openTextDocumentCalls).toEqual([]);
  });

  test("opens the navigation target line when a linked entity is selected", async () => {
    const targetPath = "/workspace/requirements/REQ-001.md";
    quickPickResult = { label: "REQ-001", detail: targetPath };
    openedDocs.set(targetPath, { uri: { fsPath: targetPath }, lineCount: 10 });

    await browseLinkedEntities(
      "SYM-001",
      [{ type: "implements", from: "SYM-001", to: "REQ-001" }],
      "/workspace",
      () => ({ localPath: targetPath, line: 20 }),
    );

    expect(openTextDocumentCalls).toEqual([targetPath]);
    expect(showTextDocumentCalls).toEqual([{ lineCount: 10 }]);
    expect(lastEditor?.selection?.start.line).toBe(9);
    expect(revealCalls).toEqual([{ startLine: 9, revealType: "in-center" }]);
  });

  test("falls back to quick pick detail when no navigation target is returned", async () => {
    const detailPath = "/workspace/scenarios/SCEN-001.md";
    quickPickResult = { label: "SCEN-001", detail: detailPath };
    openedDocs.set(detailPath, { uri: { fsPath: detailPath }, lineCount: 4 });

    await browseLinkedEntities(
      "SYM-001",
      [{ type: "specified_by", from: "SCEN-001", to: "SYM-001" }],
      "/workspace",
      () => undefined,
    );

    expect(openTextDocumentCalls).toEqual([detailPath]);
    expect(revealCalls).toEqual([]);
  });

  test("shows an information message when the selected entity has no local file", async () => {
    quickPickResult = { label: "REQ-404" };

    await browseLinkedEntities(
      "SYM-001",
      [{ type: "implements", from: "SYM-001", to: "REQ-404" }],
      "/workspace",
      () => undefined,
    );

    expect(infoMessages).toEqual([
      'Entity "REQ-404" has no local source file.',
    ]);
    expect(openTextDocumentCalls).toEqual([]);
  });
});

describe("openFileAtLine", () => {
  beforeEach(() => {
    openTextDocumentCalls.length = 0;
    showTextDocumentCalls.length = 0;
    revealCalls.length = 0;
    openedDocs = new Map();
    lastEditor = null;
  });

  test("opens a document without changing selection when line is omitted or non-positive", async () => {
    const filePath = "/workspace/file.ts";
    openedDocs.set(filePath, { uri: { fsPath: filePath }, lineCount: 5 });

    await openFileAtLine(filePath);
    expect(lastEditor?.selection).toBeUndefined();
    expect(revealCalls).toEqual([]);

    await openFileAtLine(filePath, 0);
    expect(lastEditor?.selection).toBeUndefined();
    expect(revealCalls).toEqual([]);
  });
});

afterAll(() => {
  mock.restore();
});
