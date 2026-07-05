/**
 * Coverage completion tests for VS Code activation modules.
 *
 * The existing activation tests use query-string dynamic imports
 * (`import(`../src/...?case=${Date.now()}`)`) to get a fresh module instance
 * per test. Bun's coverage instrumentation does not record hits for those
 * query-string module paths, so files like workspace.ts, extension.ts,
 * treeView.ts, and contextOnOpen.ts report artificially low coverage even
 * though their behaviour is exercised.
 *
 * This file imports the same modules with regular dynamic imports (no query
 * string) and re-triggers the uncovered branches so the coverage tracker
 * records the hits. It uses the public `_reset*ForTests` helpers to keep
 * module state deterministic between tests.
 *
 * IMPORTANT: Bun freezes the `vscode` namespace at first import, so the
 * source modules capture whatever `vscode.workspace` (etc.) pointed to at
 * module load time. Calling `resetVscodeMock()` after the imports rebinds
 * `state` to a new object but the source modules still see the original
 * workspace reference. To work around this we mutate the captured workspace
 * object IN-PLACE rather than replacing it.
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
import {
  DefaultFileSystemWatcher,
  getVscodeMockModule,
  resetVscodeMock,
} from "./shared/vscode-mock";

type DisposableLike = { dispose: () => void };
type WorkspaceMock = Record<string, unknown> & {
  workspaceFolders?: unknown;
  onDidOpenTextDocument?: unknown;
  onDidChangeWorkspaceFolders?: unknown;
  createFileSystemWatcher?: unknown;
  getConfiguration?: unknown;
};
type WindowMock = Record<string, unknown> & {
  createOutputChannel?: unknown;
  createTreeView?: unknown;
  showInformationMessage?: unknown;
};
type CommandsMock = Record<string, unknown> & {
  registerCommand?: unknown;
  executeCommand?: unknown;
};

// ---------------------------------------------------------------------------
// Capture arrays + mock functions — declared early so configureCaptureMocks
// can install them on the vscode namespace before source modules import it.
// ---------------------------------------------------------------------------
const registerCommandCalls: Array<{
  commandId: string;
  callback: (...args: unknown[]) => void;
}> = [];

const createTreeViewCalls: Array<{ id: string; options: unknown }> = [];

let capturedDocOpenListener:
  | ((doc: unknown) => Promise<void> | void)
  | null = null;
let capturedWorkspaceFolderListener: ((event: unknown) => void) | null = null;
let capturedWatcher: DefaultFileSystemWatcher | null = null;

const showInformationMessage = mock(async (_msg: string) => undefined);
const executeCommandMock = mock(
  async (_command: string, ..._args: unknown[]) => undefined,
);
// Captures every output channel created by `vscode.window.createOutputChannel`
// so tests can inspect appendLine calls across multiple `activate()` invocations.
const createdOutputChannels: Array<{
  appendLine: ReturnType<typeof mock<(value: string) => void>>;
  dispose: () => void;
}> = [];

function configureCaptureMocks(): void {
  const vscode = getVscodeMockModule() as Record<string, unknown>;
  const workspace = vscode.workspace as WorkspaceMock;
  const window = vscode.window as WindowMock;
  const commands = vscode.commands as CommandsMock;

  // Replace in-place so the already-imported source modules see these.
  workspace.onDidOpenTextDocument = mock(
    (listener: (doc: unknown) => Promise<void> | void): DisposableLike => {
      capturedDocOpenListener = listener;
      return { dispose() {} };
    },
  );
  workspace.onDidChangeWorkspaceFolders = mock(
    (listener: (event: unknown) => void): DisposableLike => {
      capturedWorkspaceFolderListener = listener;
      return { dispose() {} };
    },
  );
  workspace.createFileSystemWatcher = mock((_pattern: unknown) => {
    capturedWatcher = new DefaultFileSystemWatcher(_pattern);
    return capturedWatcher;
  });
  workspace.getConfiguration = mock((_section?: string) => ({
    get: <T>(_key: string, defaultValue?: T) => defaultValue as T,
  }));

  window.createOutputChannel = mock(() => {
    const channel = {
      appendLine: mock((_value: string) => {}),
      dispose() {},
    };
    createdOutputChannels.push(channel);
    return channel;
  });
  window.createTreeView = mock((id: string, options: unknown) => {
    createTreeViewCalls.push({ id, options });
    return { dispose() {} };
  });
  window.showInformationMessage = showInformationMessage;

  commands.registerCommand = mock(
    (
      commandId: string,
      callback: (...args: unknown[]) => void,
    ): DisposableLike => {
      registerCommandCalls.push({ commandId, callback });
      return { dispose() {} };
    },
  );
  commands.executeCommand = executeCommandMock;
}

// ---------------------------------------------------------------------------
// Register the vscode mock FIRST, then import the source modules with regular
// dynamic imports (NO query string) so Bun's coverage tracker records hits.
// ---------------------------------------------------------------------------
resetVscodeMock();
configureCaptureMocks();
mock.module("vscode", () => getVscodeMockModule());

// Hold the workspace reference so tests can mutate it in-place. Bun freezes
// the namespace at import time, so this is the same object the source modules
// see via `vscode.workspace`.
const vscodeNamespace = getVscodeMockModule() as Record<string, unknown>;
const workspaceNamespace = vscodeNamespace.workspace as WorkspaceMock;

const [workspaceMod, treeViewMod, contextOnOpenMod, extensionMod] =
  await Promise.all([
    import("../src/activation/workspace"),
    import("../src/activation/treeView"),
    import("../src/activation/contextOnOpen"),
    import("../src/extension"),
  ]);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
let tmpDir: string;
const originalEnv = { ...process.env };

function makeOutput() {
  return { appendLine: mock((_message: string) => {}) };
}

function makeContext() {
  return { subscriptions: [] as DisposableLike[] };
}

function setupKbRoot(root: string): void {
  fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".kb", "config.json"),
    JSON.stringify({ paths: { symbols: "documentation/symbols.yaml" } }),
  );
  fs.mkdirSync(path.join(root, ".kb", "branches", "develop"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(root, ".kb", "branches", "develop", "kb.rdf"),
    "<?xml version=\"1.0\"?><rdf:RDF></rdf:RDF>",
  );
  fs.mkdirSync(path.join(root, "documentation"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "documentation", "symbols.yaml"),
    "symbols: []\n",
  );
}

beforeEach(() => {
  // IMPORTANT: do NOT call resetVscodeMock() here — it would rebind `state`
  // to a new object while the source modules still reference the original
  // workspace captured at import time. Mutate the existing namespace in-place
  // instead.
  workspaceNamespace.workspaceFolders = undefined;
  registerCommandCalls.length = 0;
  createTreeViewCalls.length = 0;
  capturedDocOpenListener = null;
  capturedWorkspaceFolderListener = null;
  capturedWatcher = null;
  showInformationMessage.mockReset();
  executeCommandMock.mockReset();
  createdOutputChannels.length = 0;
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-cov-"));
  process.env = { ...originalEnv };
  workspaceMod._resetWorkspaceFsDepsForTests();
  contextOnOpenMod._resetContextOnOpenFsDepsForTests();
  extensionMod._resetWorkspaceFeaturesForTests();
});

afterEach(() => {
  workspaceMod._resetWorkspaceFsDepsForTests();
  contextOnOpenMod._resetContextOnOpenFsDepsForTests();
  extensionMod._resetWorkspaceFeaturesForTests();
  process.env = { ...originalEnv };
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

afterAll(() => {
  mock.restore();
});

// ---------------------------------------------------------------------------
// workspace.ts — resolveWorkspaceRoot + helpers (regular import)
// ---------------------------------------------------------------------------
describe("activation/workspace coverage", () => {
  test("resolveWorkspaceRoot returns workspace folder fsPath when present", () => {
    const root = path.join(tmpDir, "ws");
    fs.mkdirSync(root, { recursive: true });
    workspaceNamespace.workspaceFolders = [
      { uri: { fsPath: root, path: root, scheme: "file" } },
    ];

    const output = makeOutput();
    expect(workspaceMod.resolveWorkspaceRoot(output as never)).toBe(root);
    expect(output.appendLine).toHaveBeenCalledWith(`Workspace root: ${root}`);
  });

  test("resolveWorkspaceRoot uses KIBI_WORKSPACE_ROOT fallback when .kb/config.json exists", () => {
    workspaceNamespace.workspaceFolders = undefined;
    const fallbackRoot = path.join(tmpDir, "fallback");
    fs.mkdirSync(path.join(fallbackRoot, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(fallbackRoot, ".kb", "config.json"), "{}");
    process.env.KIBI_WORKSPACE_ROOT = fallbackRoot;

    const output = makeOutput();
    expect(workspaceMod.resolveWorkspaceRoot(output as never)).toBe(
      fallbackRoot,
    );
    expect(output.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("KIBI_WORKSPACE_ROOT fallback"),
    );
  });

  test("resolveWorkspaceRoot reports missing .kb/config.json and returns undefined", () => {
    workspaceNamespace.workspaceFolders = undefined;
    const fallbackRoot = path.join(tmpDir, "no-kb");
    fs.mkdirSync(fallbackRoot, { recursive: true });
    process.env.KIBI_WORKSPACE_ROOT = fallbackRoot;

    const output = makeOutput();
    expect(workspaceMod.resolveWorkspaceRoot(output as never)).toBeUndefined();
    expect(output.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("missing .kb/config.json"),
    );
    expect(output.appendLine).toHaveBeenCalledWith(
      "No workspace folder found; activation skipped.",
    );
  });

  test("resolveWorkspaceRoot returns undefined when no folder and no env var", () => {
    workspaceNamespace.workspaceFolders = undefined;
    delete process.env.KIBI_WORKSPACE_ROOT;

    const output = makeOutput();
    expect(workspaceMod.resolveWorkspaceRoot(output as never)).toBeUndefined();
    expect(output.appendLine).toHaveBeenCalledWith(
      "No workspace folder found; activation skipped.",
    );
  });

  test("_setWorkspaceFsDepsForTests and _resetWorkspaceFsDepsForTests toggle existsSync", () => {
    workspaceNamespace.workspaceFolders = undefined;
    const fallbackRoot = path.join(tmpDir, "fb");
    process.env.KIBI_WORKSPACE_ROOT = fallbackRoot;

    workspaceMod._setWorkspaceFsDepsForTests({ existsSync: () => true });
    const output = makeOutput();
    expect(workspaceMod.resolveWorkspaceRoot(output as never)).toBe(
      fallbackRoot,
    );

    workspaceMod._resetWorkspaceFsDepsForTests();
    const secondOutput = makeOutput();
    expect(
      workspaceMod.resolveWorkspaceRoot(secondOutput as never),
    ).toBeUndefined();
  });

  test("getWorkspaceFolderUri returns matched folder uri or file fallback", () => {
    const root = path.join(tmpDir, "match");
    fs.mkdirSync(root, { recursive: true });
    workspaceNamespace.workspaceFolders = [
      { uri: { fsPath: root, path: root, scheme: "file" } },
    ];

    expect(workspaceMod.getWorkspaceFolderUri(root).fsPath).toBe(root);
    expect(
      workspaceMod.getWorkspaceFolderUri(path.join(tmpDir, "other")).fsPath,
    ).toBe(path.join(tmpDir, "other"));
  });
});

// ---------------------------------------------------------------------------
// treeView.ts — refresh command callback (line 35) coverage
// ---------------------------------------------------------------------------
describe("activation/treeView coverage", () => {
  test("refresh command callback invokes treeDataProvider.refresh", () => {
    setupKbRoot(tmpDir);
    const output = makeOutput();
    const context = makeContext();
    const workspaceFolderUri = {
      fsPath: tmpDir,
      path: tmpDir,
      scheme: "file",
    };

    const result = treeViewMod.registerTreeView(
      context as never,
      output as never,
      tmpDir,
      workspaceFolderUri as never,
    );

    let refreshCount = 0;
    result.treeDataProvider.onDidChangeTreeData(() => {
      refreshCount++;
    });

    const refreshCall = registerCommandCalls.find(
      (c) => c.commandId === "kibi.refreshTree",
    );
    expect(refreshCall).toBeDefined();
    if (!refreshCall) throw new Error("refreshTree command was not registered");
    refreshCall.callback();

    expect(refreshCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// contextOnOpen.ts — early return when .kb is missing (line 48) coverage
// ---------------------------------------------------------------------------
describe("activation/contextOnOpen coverage", () => {
  test("document open listener returns early when .kb folder is missing", async () => {
    contextOnOpenMod._setContextOnOpenFsDepsForTests({
      existsSync: () => false,
    });

    const output = makeOutput();
    const context = makeContext();
    contextOnOpenMod.registerContextOnOpen(
      context as never,
      output as never,
      tmpDir,
    );

    expect(capturedDocOpenListener).not.toBeNull();
    if (!capturedDocOpenListener) throw new Error("listener not captured");

    await capturedDocOpenListener({
      uri: { scheme: "file", fsPath: path.join(tmpDir, "src", "f.ts") },
    });

    expect(executeCommandMock).not.toHaveBeenCalled();
    expect(showInformationMessage).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// extension.ts — idempotency skip (lines 46-49) and deferred return (line 131)
// ---------------------------------------------------------------------------
describe("extension coverage", () => {
  test("activate immediate path initializes features", () => {
    setupKbRoot(tmpDir);
    workspaceNamespace.workspaceFolders = [
      { uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } },
    ];

    const context = makeContext();
    extensionMod.activate(context as never);

    expect(createTreeViewCalls).toHaveLength(1);
    const refreshCalls = registerCommandCalls.filter(
      (c) => c.commandId === "kibi.refreshTree",
    );
    expect(refreshCalls).toHaveLength(1);
  });

  test("second activate call hits idempotency skip branch without duplicating work", () => {
    setupKbRoot(tmpDir);
    workspaceNamespace.workspaceFolders = [
      { uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } },
    ];

    // activate() creates its own output channel internally, so capture all
    // channels it creates and inspect the second one for the skip message.
    const channelsBefore = createdOutputChannels.length;
    const firstContext = makeContext();
    extensionMod.activate(firstContext as never);
    const firstTreeViews = createTreeViewCalls.length;

    capturedWorkspaceFolderListener = null;

    const secondContext = makeContext();
    extensionMod.activate(secondContext as never);

    expect(createTreeViewCalls).toHaveLength(firstTreeViews);
    // The second activation must have created a new output channel.
    expect(createdOutputChannels.length).toBe(channelsBefore + 2);
    const secondChannel = createdOutputChannels[channelsBefore + 1];
    expect(secondChannel.appendLine).toHaveBeenCalledWith(
      expect.stringContaining("already initialized"),
    );
  });

  test("activate defers when workspace missing and returns after listener registration", () => {
    setupKbRoot(tmpDir);
    workspaceNamespace.workspaceFolders = undefined;

    const initialTreeViews = createTreeViewCalls.length;
    const context = makeContext();
    extensionMod.activate(context as never);

    expect(capturedWorkspaceFolderListener).not.toBeNull();
    expect(createTreeViewCalls).toHaveLength(initialTreeViews);
    expect(context.subscriptions.length).toBeGreaterThan(0);
  });

  test("deferred activate initializes features when workspace folder change fires", () => {
    setupKbRoot(tmpDir);
    workspaceNamespace.workspaceFolders = undefined;

    const context = makeContext();
    extensionMod.activate(context as never);

    expect(capturedWorkspaceFolderListener).not.toBeNull();

    // Simulate VS Code emitting a workspace folder change event with a
    // valid workspace — this should trigger initializeWorkspaceFeatures.
    workspaceNamespace.workspaceFolders = [
      { uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } },
    ];
    capturedWorkspaceFolderListener?.({ added: [], removed: [] });

    expect(createTreeViewCalls).toHaveLength(1);
  });
});
