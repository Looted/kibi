/**
 * Tests for deferred and idempotent activation in extension.ts
 *
 * Regression tests for the installed-VSIX failure mode where workspace.workspaceFolders
 * is undefined at activation time. Ensures extension defers workspace-dependent features
 * and initializes exactly once when workspace becomes available.
 */

import { afterAll, afterEach, beforeEach, expect, mock, test } from "bun:test";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { getVscodeMockModule, resetVscodeMock } from "../shared/vscode-mock";

resetVscodeMock({ workspace: { workspaceFolders: undefined } });

mock.module("vscode", () => getVscodeMockModule());

type WorkspaceFolderUri = { fsPath: string; path: string; scheme: string };

// Helper to get vscode mock workspace
function getWorkspaceMock() {
  return getVscodeMockModule().workspace as {
    workspaceFolders: Array<{ uri: WorkspaceFolderUri }> | undefined;
    createTreeViewCalls: Array<{ id: string; options: unknown }>;
    registerTextDocumentContentProvider: (
      scheme: string,
      provider: unknown,
    ) => unknown;
    emitWorkspaceFoldersChange: (value: unknown) => void;
  };
}

// Helper to get vscode mock window
function getWindowMock() {
  return getVscodeMockModule().window as {
    createTreeViewCalls: Array<{ id: string; options: unknown }>;
  };
}

// Helper to get vscode mock commands
function getCommandsMock() {
  return getVscodeMockModule().commands as {
    registerCommandCalls: Array<{
      commandId: string;
      callback: unknown;
    }>;
  };
}

// Helper to create a minimal workspace with .kb directory
function setupMinimalWorkspace(root: string) {
  const kbConfigDir = path.join(root, ".kb");
  fs.mkdirSync(kbConfigDir, { recursive: true });
  fs.writeFileSync(
    path.join(kbConfigDir, "manifest.json"),
    JSON.stringify({ paths: { symbols: ".kb/symbols.yaml" } }, null, 2),
  );
  const branchDir = path.join(root, ".kb", "branches", "develop");
  fs.mkdirSync(branchDir, { recursive: true });
  fs.writeFileSync(
    path.join(branchDir, "kb.rdf"),
    `<?xml version="1.0" encoding="UTF-8"?>
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
         xmlns:kb="http://kibi.dev/kb/">
</rdf:RDF>`,
  );
  fs.writeFileSync(path.join(root, ".kb", "symbols.yaml"), "symbols: []\n");
}

// Helper to import extension module with fresh vscode mock
async function importExtensionModule() {
  (globalThis as { vscode?: unknown }).vscode = getVscodeMockModule();
  (
    getVscodeMockModule().workspace as {
      registerTextDocumentContentProvider?: unknown;
    }
  ).registerTextDocumentContentProvider = mock(() => ({ dispose() {} }));
  mock.module("vscode", () => getVscodeMockModule());
  const module = await import(
    `../../src/extension?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  module._resetWorkspaceFeaturesForTests();
  return module;
}

let tmpDir: string;

beforeEach(() => {
  resetVscodeMock({ workspace: { workspaceFolders: undefined } });
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-activation-test-"));
});

afterEach(() => {
  if (tmpDir && fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
  (globalThis as { vscode?: unknown }).vscode = undefined;
});

test("activate defers workspace-dependent features when workspaceFolders is undefined", async () => {
  setupMinimalWorkspace(tmpDir);

  // Ensure workspaceFolders is undefined initially
  getWorkspaceMock().workspaceFolders = undefined;

  // Import extension with fresh vscode mock
  const { activate } = await importExtensionModule();

  // Create mock extension context
  const context = {
    subscriptions: [] as Array<{ dispose: () => void }>,
  };

  // Activate extension - should not fail, should defer
  activate(context);

  // Should have registered a workspace folder change listener
  const workspace = getWorkspaceMock();
  expect(
    (workspace as unknown as { workspaceFolderChangeListeners: unknown[] })
      .workspaceFolderChangeListeners,
  ).toHaveLength(1);

  // Should NOT have created tree view or registered commands yet (deferred)
  const window = getWindowMock();
  expect(window.createTreeViewCalls).toHaveLength(0);

  const commands = getCommandsMock();
  const refreshCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.refreshTree",
  );
  expect(refreshCommands).toHaveLength(0);
});

test("activate initializes features exactly once when workspace becomes available", async () => {
  setupMinimalWorkspace(tmpDir);

  // Ensure workspaceFolders is undefined initially
  getWorkspaceMock().workspaceFolders = undefined;

  // Import extension with fresh vscode mock
  const { activate } = await importExtensionModule();

  // Create mock extension context
  const context = {
    subscriptions: [] as Array<{ dispose: () => void }>,
  };

  // Activate extension
  activate(context);

  // Should have registered workspace folder change listener
  const workspace = getWorkspaceMock();
  expect(
    (workspace as unknown as { workspaceFolderChangeListeners: unknown[] })
      .workspaceFolderChangeListeners,
  ).toHaveLength(1);

  // Should NOT have initialized yet
  let window = getWindowMock();
  expect(window.createTreeViewCalls).toHaveLength(0);

  let commands = getCommandsMock();
  let refreshCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.refreshTree",
  );
  expect(refreshCommands).toHaveLength(0);

  // Now emit a workspace folder change event with a valid workspace
  getWorkspaceMock().workspaceFolders = [
    { uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } },
  ];

  // Emit the change event
  getWorkspaceMock().emitWorkspaceFoldersChange({
    added: [{ uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } }],
    removed: [],
  });

  // NOW should have created tree view and registered commands
  window = getWindowMock();
  expect(window.createTreeViewCalls).toHaveLength(1);
  expect(window.createTreeViewCalls[0].id).toBe("kibi-knowledge-base");

  commands = getCommandsMock();
  refreshCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.refreshTree",
  );
  expect(refreshCommands).toHaveLength(1);

  // Emit another workspace folder change event (idempotency test)
  getWorkspaceMock().emitWorkspaceFoldersChange({
    added: [],
    removed: [],
  });

  // Should STILL have exactly one tree view and one refresh command (no duplicates)
  window = getWindowMock();
  expect(window.createTreeViewCalls).toHaveLength(1);

  commands = getCommandsMock();
  refreshCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.refreshTree",
  );
  expect(refreshCommands).toHaveLength(1);
});

test("activate logs deferral message when workspace is not available", async () => {
  setupMinimalWorkspace(tmpDir);

  // Ensure workspaceFolders is undefined initially
  getWorkspaceMock().workspaceFolders = undefined;

  // Create a mock output channel that captures appendLine calls
  const appendLineCalls: string[] = [];
  const output = {
    appendLine: mock((message: string) => {
      appendLineCalls.push(message);
    }),
    dispose: mock(() => {}),
  };

  // Mock window.createOutputChannel to return our spy
  const window = getWindowMock();
  const windowMock = window as unknown as {
    createOutputChannel: (_name: string) => typeof output;
  };
  const originalCreateOutputChannel = windowMock.createOutputChannel;
  windowMock.createOutputChannel = mock((_name: string) => output);

  try {
    // Import extension with fresh vscode mock
    const { activate } = await importExtensionModule();

    // Create mock extension context
    const context = {
      subscriptions: [] as Array<{ dispose: () => void }>,
    };

    // Activate extension
    activate(context);

    // Should have logged a deferral message
    expect(
      appendLineCalls.some(
        (msg) =>
          msg.toLowerCase().includes("deferred") ||
          msg.toLowerCase().includes("waiting") ||
          msg.toLowerCase().includes("workspace"),
      ),
    ).toBe(true);
  } finally {
    // Restore original mock
    windowMock.createOutputChannel = originalCreateOutputChannel;
  }
});

test("activate happy path: registers everything once when workspace is immediately available", async () => {
  setupMinimalWorkspace(tmpDir);

  // Set workspaceFolders to be available immediately
  getWorkspaceMock().workspaceFolders = [
    { uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } },
  ];

  // Import extension with fresh vscode mock
  const { activate } = await importExtensionModule();

  // Create mock extension context
  const context = {
    subscriptions: [] as Array<{ dispose: () => void }>,
  };

  // Activate extension
  activate(context);

  // Should have created tree view
  const window = getWindowMock();
  expect(window.createTreeViewCalls).toHaveLength(1);
  expect(window.createTreeViewCalls[0].id).toBe("kibi-knowledge-base");

  // Should have registered kibi.refreshTree command
  const commands = getCommandsMock();
  const refreshCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.refreshTree",
  );
  expect(refreshCommands).toHaveLength(1);

  // Should have registered navigation commands
  const openEntityCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.openEntity",
  );
  expect(openEntityCommands).toHaveLength(1);

  const openEntityByIdCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.openEntityById",
  );
  expect(openEntityByIdCommands).toHaveLength(1);

  const openTreeItemSourceCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.openTreeItemSource",
  );
  expect(openTreeItemSourceCommands).toHaveLength(1);

  const focusKnowledgeBaseCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.focusKnowledgeBase",
  );
  expect(focusKnowledgeBaseCommands).toHaveLength(1);
});

test("activate idempotency: second activate call returns early without re-initializing features", async () => {
  setupMinimalWorkspace(tmpDir);

  // Set workspaceFolders to be available immediately
  getWorkspaceMock().workspaceFolders = [
    { uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } },
  ];

  // Capture output channel appendLine calls to observe idempotency log
  const appendLineCalls: string[] = [];
  const output = {
    appendLine: mock((message: string) => {
      appendLineCalls.push(message);
    }),
    dispose: mock(() => {}),
  };

  const window = getWindowMock();
  const windowMock = window as unknown as {
    createOutputChannel: (_name: string) => typeof output;
  };
  const originalCreateOutputChannel = windowMock.createOutputChannel;
  windowMock.createOutputChannel = mock((_name: string) => output);

  try {
    const { activate } = await importExtensionModule();

    const context = {
      subscriptions: [] as Array<{ dispose: () => void }>,
    };

    // First activation - initializes workspace features
    activate(context);

    // Verify features were initialized
    let win = getWindowMock();
    expect(win.createTreeViewCalls).toHaveLength(1);

    // Second activation with same module instance - should hit idempotency guard (lines 50-53)
    activate(context);

    // Should NOT have created additional tree views
    win = getWindowMock();
    expect(win.createTreeViewCalls).toHaveLength(1);

    // Should have logged the idempotency skip message
    expect(
      appendLineCalls.some((msg) =>
        msg.toLowerCase().includes("already initialized"),
      ),
    ).toBe(true);
  } finally {
    windowMock.createOutputChannel = originalCreateOutputChannel;
  }
});

test("activate deferred path: logs deferral and registers onDidChangeWorkspaceFolders listener", async () => {
  // Do NOT set up workspace - resolveWorkspaceRoot should return undefined
  // so the deferred path (lines 141-153) is exercised
  getWorkspaceMock().workspaceFolders = undefined;

  // Capture output to verify deferral log
  const appendLineCalls: string[] = [];
  const output = {
    appendLine: mock((message: string) => {
      appendLineCalls.push(message);
    }),
    dispose: mock(() => {}),
  };

  const window = getWindowMock();
  const windowMock = window as unknown as {
    createOutputChannel: (_name: string) => typeof output;
  };
  const originalCreateOutputChannel = windowMock.createOutputChannel;
  windowMock.createOutputChannel = mock((_name: string) => output);

  try {
    const { activate } = await importExtensionModule();

    const context = {
      subscriptions: [] as Array<{ dispose: () => void }>,
    };

    activate(context);

    // Lines 141-143: Should have logged the deferral message
    expect(
      appendLineCalls.some((msg) => msg.includes("Deferring activation")),
    ).toBe(true);

    // Lines 144-151: Should have registered a workspace folder change listener
    const workspace = getWorkspaceMock();
    expect(
      (workspace as unknown as { workspaceFolderChangeListeners: unknown[] })
        .workspaceFolderChangeListeners,
    ).toHaveLength(1);

    // Line 152: Listener disposable should have been pushed to subscriptions
    expect(context.subscriptions.length).toBeGreaterThan(0);
  } finally {
    windowMock.createOutputChannel = originalCreateOutputChannel;
  }
});

test("activate deferred path: onDidChangeWorkspaceFolders callback initializes features when workspace appears", async () => {
  setupMinimalWorkspace(tmpDir);

  // Workspace not available at activation time
  getWorkspaceMock().workspaceFolders = undefined;

  const { activate } = await importExtensionModule();

  const context = {
    subscriptions: [] as Array<{ dispose: () => void }>,
  };

  // Activate - enters deferred path (lines 141-153)
  activate(context);

  // No features initialized yet
  let window = getWindowMock();
  expect(window.createTreeViewCalls).toHaveLength(0);

  // Now simulate workspace folders appearing (lines 145-149 callback)
  getWorkspaceMock().workspaceFolders = [
    { uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } },
  ];
  getWorkspaceMock().emitWorkspaceFoldersChange({
    added: [{ uri: { fsPath: tmpDir, path: tmpDir, scheme: "file" } }],
    removed: [],
  });

  // Flush microtask queue so async operations inside the callback settle
  await new Promise((r) => setTimeout(r, 0));

  // Features should now be initialized
  window = getWindowMock();
  expect(window.createTreeViewCalls).toHaveLength(1);
  expect(window.createTreeViewCalls[0].id).toBe("kibi-knowledge-base");

  // Verify refresh command was registered
  const commands = getCommandsMock();
  const refreshCommands = commands.registerCommandCalls.filter(
    (c) => c.commandId === "kibi.refreshTree",
  );
  expect(refreshCommands).toHaveLength(1);
});
afterAll(() => {
  mock.restore();
});
