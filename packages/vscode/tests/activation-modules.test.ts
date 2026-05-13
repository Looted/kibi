import {
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

type Relationship = { type: string; from: string; to: string };

let openFileAtLineMock = mock(async (_localPath: string, _line?: number) => {});
let browseLinkedEntitiesMock = mock(
  async (
    _symbolId: string,
    _relationships: Relationship[],
    _workspaceRoot: string,
    _getNavigationTarget: (id: string) => unknown,
    _sourceFile?: string,
    _sourceLine?: number,
  ) => {},
);
let codeActionCtorError: Error | null = null;
let codeLensCtorError: Error | null = null;
let hoverCtorError: Error | null = null;
let codeActionWatchManifestMock = mock((_context: unknown) => {});
let codeLensWatchSourcesMock = mock((_context: unknown) => {});
let codeLensRefreshMock = mock(() => {});
let buildIndexResult = { byTitle: new Map(), byFile: new Map(), byId: new Map() };

resetVscodeMock();
mock.module("vscode", () => getVscodeMockModule());
mock.module("../src/codeActionProvider", () => ({
  openFileAtLine: (...args: Parameters<typeof openFileAtLineMock>) =>
    openFileAtLineMock(...args),
  browseLinkedEntities: (...args: Parameters<typeof browseLinkedEntitiesMock>) =>
    browseLinkedEntitiesMock(...args),
  KibiCodeActionProvider: class MockCodeActionProvider {
    static ACTION_KIND = "mock-action-kind";

    constructor(_workspaceRoot: string) {
      if (codeActionCtorError) throw codeActionCtorError;
    }

    watchManifest(context: unknown) {
      codeActionWatchManifestMock(context);
    }
  },
}));
mock.module("../src/codeLensProvider", () => ({
  KibiCodeLensProvider: class MockCodeLensProvider {
    constructor(_workspaceRoot: string, _cache: unknown) {
      if (codeLensCtorError) throw codeLensCtorError;
    }

    watchSources(context: unknown) {
      codeLensWatchSourcesMock(context);
    }

    refresh() {
      codeLensRefreshMock();
    }
  },
}));
mock.module("../src/hoverProvider", () => ({
  KibiHoverProvider: class MockHoverProvider {
    constructor(_workspaceRoot: string, _symbolIndex: unknown, _cache: unknown) {
      if (hoverCtorError) throw hoverCtorError;
    }
  },
}));
mock.module("../src/briefDocumentProvider", () => ({
  BriefDocumentProvider: Object.assign(function MockBriefDocumentProvider() {}, {
    scheme: "kibi-brief",
  }),
}));

const vscode = getVscodeMockModule();
const navigationModule = await import("../src/activation/navigation");
const traceabilityModule = await import("../src/activation/traceability");
const contextOnOpenModule = await import("../src/activation/contextOnOpen");
const briefsModule = await import("../src/activation/briefs");
mock.restore();

class FakeMemento {
  private store = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.store.get(key) as T | undefined;
  }

  update(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }
}

class TestWatcher {
  ignoreCreateEvents = false;
  ignoreChangeEvents = false;
  ignoreDeleteEvents = false;
  changeListeners: Array<(uri: { fsPath: string }) => unknown> = [];
  createListeners: Array<(uri: { fsPath: string }) => unknown> = [];
  deleteListeners: Array<(uri: { fsPath: string }) => unknown> = [];

  onDidChange(listener: (uri: { fsPath: string }) => unknown) {
    this.changeListeners.push(listener);
    return { dispose() {} };
  }

  onDidCreate(listener: (uri: { fsPath: string }) => unknown) {
    this.createListeners.push(listener);
    return { dispose() {} };
  }

  onDidDelete(listener: (uri: { fsPath: string }) => unknown) {
    this.deleteListeners.push(listener);
    return { dispose() {} };
  }

  emitCreate(uri: { fsPath: string }) {
    for (const listener of this.createListeners) {
      void listener(uri);
    }
  }

  dispose() {}
}

function createOutput() {
  return { appendLine: mock((_message: string) => {}) };
}

function createContext() {
  return {
    subscriptions: [] as unknown[],
    workspaceState: new FakeMemento(),
  };
}

function configureVscodeMock() {
  const commandCalls: Array<{ commandId: string; callback: (...args: unknown[]) => unknown }> = [];
  const openDocListeners: Array<(document: { uri: { fsPath: string; scheme: string } }) => unknown> =
    [];
  const workspaceFolderListeners: Array<() => unknown> = [];
  const watchers: TestWatcher[] = [];

  Object.assign(vscode.Uri as Record<string, unknown>, {
    parse: (value: string) => ({ fsPath: value, path: value, scheme: value.split(":")[0] ?? "file" }),
  });

  Object.assign(vscode.window as Record<string, unknown>, {
    showInformationMessage: mock(async (_message: string, ..._actions: string[]) => undefined),
    showWarningMessage: mock(async (_message: string) => undefined),
    showErrorMessage: mock(async (_message: string) => undefined),
    showTextDocument: mock(async (_doc: unknown, _options?: unknown) => ({ selection: undefined })),
    createTreeView: mock((_id: string, _options: unknown) => ({ dispose() {} })),
  });

  Object.assign(vscode.workspace as Record<string, unknown>, {
    workspaceFolders: undefined,
    openTextDocument: mock(async (uri: unknown) => ({ uri, lineCount: 1 })),
    findFiles: mock(async (_pattern: unknown) => []),
    getConfiguration: mock((_section?: string) => ({
      get: <T>(_key: string, defaultValue?: T) => defaultValue as T,
    })),
    onDidOpenTextDocument: mock((listener: (document: { uri: { fsPath: string; scheme: string } }) => unknown) => {
      openDocListeners.push(listener);
      return { dispose() {} };
    }),
    onDidChangeWorkspaceFolders: mock((listener: () => unknown) => {
      workspaceFolderListeners.push(listener);
      return { dispose() {} };
    }),
    createFileSystemWatcher: mock((_pattern: unknown) => {
      const watcher = new TestWatcher();
      watchers.push(watcher);
      return watcher;
    }),
    registerTextDocumentContentProvider: mock((_scheme: string, _provider: unknown) => ({
      dispose() {},
    })),
  });

  Object.assign(vscode.commands as Record<string, unknown>, {
    registerCommandCalls: commandCalls,
    registerCommand: mock((commandId: string, callback: (...args: unknown[]) => unknown) => {
      commandCalls.push({ commandId, callback });
      return { dispose() {} };
    }),
    executeCommand: mock(async (_command: string, ..._args: unknown[]) => undefined),
  });

  Object.assign(vscode.languages as Record<string, unknown>, {
    registerCodeActionsProvider: mock((_selector: unknown, _provider: unknown, _metadata?: unknown) => ({
      dispose() {},
    })),
    registerCodeLensProvider: mock((_selector: unknown, _provider: unknown) => ({ dispose() {} })),
    registerHoverProvider: mock((_selector: unknown, _provider: unknown) => ({ dispose() {} })),
  });

  return { commandCalls, openDocListeners, workspaceFolderListeners, watchers };
}

function getCommandCallback(
  commandCalls: Array<{ commandId: string; callback: (...args: unknown[]) => unknown }>,
  commandId: string,
) {
  const match = commandCalls.find((call) => call.commandId === commandId);
  if (!match) throw new Error(`Command not registered: ${commandId}`);
  return match.callback;
}

let tmpDir = "";

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-vscode-activation-"));
  openFileAtLineMock = mock(async (_localPath: string, _line?: number) => {});
  browseLinkedEntitiesMock = mock(async () => {});
  codeActionCtorError = null;
  codeLensCtorError = null;
  hoverCtorError = null;
  codeActionWatchManifestMock = mock((_context: unknown) => {});
  codeLensWatchSourcesMock = mock((_context: unknown) => {});
  codeLensRefreshMock = mock(() => {});
  buildIndexResult = { byTitle: new Map(), byFile: new Map(), byId: new Map() };
  process.env.KIBI_WORKSPACE_ROOT = undefined;
  configureVscodeMock();
  contextOnOpenModule._resetContextOnOpenFsDepsForTests();
});

afterEach(() => {
  contextOnOpenModule._resetContextOnOpenFsDepsForTests();
  process.env.KIBI_WORKSPACE_ROOT = undefined;
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  mock.restore();
});

describe("activation/navigation", () => {
  test("registers navigation commands and handles open/info/error flows", async () => {
    const output = createOutput();
    const { commandCalls } = configureVscodeMock();
    const showInfo = vscode.window.showInformationMessage as ReturnType<typeof mock>;
    const showError = vscode.window.showErrorMessage as ReturnType<typeof mock>;
    const executeCommand = vscode.commands.executeCommand as ReturnType<typeof mock>;

    openFileAtLineMock = mock(async (localPath: string) => {
      if (localPath.includes("fail")) throw new Error("boom");
    });

    const treeDataProvider = {
      getLocalPathForEntity: (entityId: string) =>
        entityId === "REQ-FALLBACK" ? "/docs/fallback.md" : undefined,
      getNavigationTargetForEntity: (entityId: string) => {
        if (entityId === "REQ-OK") return { localPath: "/docs/req.md", line: 7 };
        if (entityId === "REQ-FAIL") return { localPath: "/docs/fail.md", line: 3 };
        return undefined;
      },
    };

    navigationModule.registerNavigationCommands(output as never, treeDataProvider);

    await getCommandCallback(commandCalls, "kibi.openEntity")("/docs/file.md", 2);
    await getCommandCallback(commandCalls, "kibi.openEntity")("/docs/fail.md", 2);
    await getCommandCallback(commandCalls, "kibi.openEntityById")("REQ-OK");
    await getCommandCallback(commandCalls, "kibi.openEntityById")("REQ-FAIL");
    await getCommandCallback(commandCalls, "kibi.openEntityById")("REQ-FALLBACK");
    await getCommandCallback(commandCalls, "kibi.openEntityById")("REQ-NONE");
    await getCommandCallback(commandCalls, "kibi.openTreeItemSource")({ label: "Missing" });
    await getCommandCallback(commandCalls, "kibi.openTreeItemSource")({
      label: "Broken",
      localPath: "/docs/fail-source.md",
      sourceLine: 9,
    });
    await getCommandCallback(commandCalls, "kibi.focusKnowledgeBase")();

    expect(output.appendLine).toHaveBeenCalledWith("Navigation commands registered.");
    expect(openFileAtLineMock).toHaveBeenCalledWith("/docs/file.md", 2);
    expect(openFileAtLineMock).toHaveBeenCalledWith("/docs/req.md", 7);
    expect(openFileAtLineMock).toHaveBeenCalledWith("/docs/fallback.md", undefined);
    expect(showError).toHaveBeenCalledWith("Kibi: Could not open file — /docs/fail.md");
    expect(showError).toHaveBeenCalledWith(
      "Kibi: Could not open file for entity \"REQ-FAIL\"",
    );
    expect(showInfo).toHaveBeenCalledWith(
      'Kibi: Entity "REQ-NONE" has no local source file.',
    );
    expect(showInfo).toHaveBeenCalledWith(
      'Kibi: Missing has no local source file.',
    );
    expect(showError).toHaveBeenCalledWith(
      "Kibi: Could not open file — /docs/fail-source.md",
    );
    expect(executeCommand).toHaveBeenNthCalledWith(
      1,
      "workbench.view.extension.kibi-sidebar",
    );
    expect(executeCommand).toHaveBeenNthCalledWith(2, "kibi-knowledge-base.focus");
  });
});

describe("activation/traceability", () => {
  test("registers traceability features and wires browse command navigation fallback", async () => {
    const output = createOutput();
    const { commandCalls } = configureVscodeMock();
    const context = createContext();
    const treeDataProvider = {
      getLocalPathForEntity: (entityId: string) =>
        entityId === "REQ-FALLBACK" ? "/fallback/req.md" : undefined,
      getNavigationTargetForEntity: (entityId: string) =>
        entityId === "REQ-001" ? { localPath: "/docs/req.md", line: 12 } : undefined,
    };

    const result = traceabilityModule.registerTraceability(
      context as never,
      output as never,
      tmpDir,
      treeDataProvider,
    );

    await getCommandCallback(commandCalls, "kibi.browseLinkedEntities")(
      "SYM-001",
      [{ type: "implements", from: "SYM-001", to: "REQ-001" }],
      "src/file.ts",
      4,
    );

    const navigationResolver = browseLinkedEntitiesMock.mock.calls[0]?.[3] as
      | ((id: string) => { localPath: string; line?: number })
      | undefined;

    expect(result.symbolIndex).not.toBeNull();
    expect(codeActionWatchManifestMock).toHaveBeenCalledWith(context);
    expect(codeLensWatchSourcesMock).toHaveBeenCalledWith(context);
    expect(codeLensRefreshMock).toHaveBeenCalled();
    expect(output.appendLine).toHaveBeenCalledWith("Traceability code actions initialized.");
    expect(output.appendLine).toHaveBeenCalledWith("CodeLens indicators initialized.");
    expect(output.appendLine).toHaveBeenCalledWith("Hover provider initialized.");
    expect(browseLinkedEntitiesMock).toHaveBeenCalledWith(
      "SYM-001",
      [{ type: "implements", from: "SYM-001", to: "REQ-001" }],
      tmpDir,
      expect.any(Function),
      "src/file.ts",
      4,
    );
    expect(navigationResolver?.("REQ-001")).toEqual({ localPath: "/docs/req.md", line: 12 });
    expect(navigationResolver?.("REQ-FALLBACK")).toEqual({ localPath: "/fallback/req.md" });
  });

  test("reports initialization failures without blocking remaining features", () => {
    const output = createOutput();
    const context = createContext();
    const showWarning = vscode.window.showWarningMessage as ReturnType<typeof mock>;

    codeActionCtorError = new Error("action boom");
    codeLensCtorError = new Error("lens boom");
    hoverCtorError = new Error("hover boom");

    const result = traceabilityModule.registerTraceability(
      context as never,
      output as never,
      tmpDir,
      { getLocalPathForEntity: () => undefined },
    );

    expect(result.relationshipCache).toBeDefined();
    expect(result.symbolIndex).not.toBeNull();
    expect(result.browseLinkedEntitiesCommand).toBeUndefined();
    expect(result.codeActionRegistration).toBeUndefined();
    expect(result.codeLensRegistration).toBeUndefined();
    expect(result.hoverRegistration).toBeUndefined();
    expect(output.appendLine).toHaveBeenCalledWith(
      "Traceability initialization failed: action boom",
    );
    expect(output.appendLine).toHaveBeenCalledWith(
      "CodeLens initialization failed: lens boom",
    );
    expect(output.appendLine).toHaveBeenCalledWith(
      "Hover provider initialization failed: hover boom",
    );
    expect(showWarning).toHaveBeenCalledTimes(3);
  });
});

describe("activation/contextOnOpen", () => {
  test("skips registration when contextOnOpen is disabled", () => {
    const { openDocListeners } = configureVscodeMock();
    const context = createContext();
    const output = createOutput();
    (vscode.workspace as Record<string, unknown>).getConfiguration = mock(() => ({
      get: () => false,
    }));

    contextOnOpenModule.registerContextOnOpen(context as never, output as never, tmpDir);

    expect(openDocListeners).toHaveLength(0);
  });

  test("queries MCP on file open and logs failures", async () => {
    const { openDocListeners } = configureVscodeMock();
    const context = createContext();
    const output = createOutput();
    const showInfo = vscode.window.showInformationMessage as ReturnType<typeof mock>;
    const executeCommand = vscode.commands.executeCommand as ReturnType<typeof mock>;

    contextOnOpenModule._setContextOnOpenFsDepsForTests({ existsSync: () => true });
    contextOnOpenModule.registerContextOnOpen(context as never, output as never, tmpDir);

    expect(output.appendLine).toHaveBeenCalledWith("Context on file open listener registered.");
    const listener = openDocListeners[0];
    if (!listener) throw new Error("Expected open document listener");

    executeCommand.mockImplementationOnce(async () => ({
      structuredContent: { entities: [{}, {}] },
    }));
    await listener({ uri: { scheme: "file", fsPath: path.join(tmpDir, "src", "main.ts") } });

    executeCommand.mockImplementationOnce(async () => {
      throw new Error("mcp down");
    });
    await listener({ uri: { scheme: "file", fsPath: path.join(tmpDir, "src", "main.ts") } });
    await listener({ uri: { scheme: "untitled", fsPath: path.join(tmpDir, "src", "main.ts") } });

    expect(executeCommand).toHaveBeenCalledWith("kibi-mcp.kb_query", {
      sourceFile: path.join("src", "main.ts"),
    });
    expect(showInfo).toHaveBeenCalledWith(
      "Kibi: 2 KB entities linked to this file. Open Kibi panel to explore.",
    );
    expect(output.appendLine).toHaveBeenCalledWith("Context query failed: mcp down");
  });
});
