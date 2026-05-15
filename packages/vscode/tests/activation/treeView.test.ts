import { afterEach, beforeEach, expect, mock, test } from "bun:test";
import {
  type DefaultFileSystemWatcher,
  getVscodeMockModule,
  resetVscodeMock,
} from "../shared/vscode-mock";

type DisposableLike = { dispose: () => void };

const registerCommandCalls: Array<{
  commandId: string;
  callback: () => void;
}> = [];

const commandsApi = {
  registerCommand: mock(
    (commandId: string, callback: () => void): DisposableLike => {
      registerCommandCalls.push({ commandId, callback });
      return { dispose() {} };
    },
  ),
  executeCommand: mock(async () => undefined),
};

const createTreeViewCalls: Array<{ id: string; options: unknown }> = [];

const windowApi = {
  createTreeView: mock((id: string, options: unknown) => {
    createTreeViewCalls.push({ id, options });
    return { dispose() {} };
  }),
  createOutputChannel: mock(() => ({
    appendLine: mock((_value: string) => {}),
    dispose() {},
  })),
};

let capturedWatcher: DefaultFileSystemWatcher | null = null;

const workspaceApi = {
  createFileSystemWatcher: mock((_pattern: unknown) => {
    const { DefaultFileSystemWatcher } = require("../shared/vscode-mock") as {
      DefaultFileSystemWatcher: new (pattern?: unknown) => DefaultFileSystemWatcher;
    };
    capturedWatcher = new DefaultFileSystemWatcher(_pattern);
    return capturedWatcher;
  }),
};

resetVscodeMock({
  commands: commandsApi,
  window: windowApi,
  workspace: workspaceApi,
});

mock.module("vscode", () => getVscodeMockModule());

let output: { appendLine: ReturnType<typeof mock<(value: string) => void>> };
let context: { subscriptions: DisposableLike[] };

async function importTreeViewModule() {
  mock.module("vscode", () => getVscodeMockModule());
  return await import(
    `../../src/activation/treeView?case=${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
}

async function registerFresh(workspaceRoot = "/tmp/test-workspace") {
  registerCommandCalls.length = 0;
  createTreeViewCalls.length = 0;
  capturedWatcher = null;
  context.subscriptions = [];

  const { registerTreeView } = await importTreeViewModule();
  const workspaceFolderUri = { fsPath: workspaceRoot, path: workspaceRoot, scheme: "file" };

  return registerTreeView(
    context as never,
    output as never,
    workspaceRoot,
    workspaceFolderUri as never,
  );
}

beforeEach(() => {
  output = { appendLine: mock((_value: string) => {}) };
  context = { subscriptions: [] };
  registerCommandCalls.length = 0;
  createTreeViewCalls.length = 0;
  capturedWatcher = null;

  commandsApi.registerCommand.mockClear();
  commandsApi.executeCommand.mockClear();
  (windowApi.createTreeView as ReturnType<typeof mock>).mockClear();
  workspaceApi.createFileSystemWatcher.mockClear();

  resetVscodeMock({
    commands: commandsApi,
    window: windowApi,
    workspace: workspaceApi,
  });
});

afterEach(() => {
  resetVscodeMock();
  mock.restore();
});

test("registerTreeView returns treeDataProvider, treeView, refreshCommand, and watcher", async () => {
  const result = await registerFresh();

  expect(result.treeDataProvider).toBeDefined();
  expect(result.treeView).toBeDefined();
  expect(result.refreshCommand).toBeDefined();
  expect(result.watcher).toBeDefined();
});

test("registerTreeView creates file system watcher for .kb/branches/**/kb.rdf", async () => {
  await registerFresh();

  expect(workspaceApi.createFileSystemWatcher).toHaveBeenCalledTimes(1);
  expect(capturedWatcher).not.toBeNull();
});

test("watcher onDidChange triggers treeDataProvider.refresh", async () => {
  const result = await registerFresh();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emitter = (result.treeDataProvider as any)._onDidChangeTreeData;
  const fireCountBefore = emitter.fireCount;

  capturedWatcher!.emitChange();

  expect(emitter.fireCount).toBe(fireCountBefore + 1);
});

test("watcher onDidCreate triggers treeDataProvider.refresh", async () => {
  const result = await registerFresh();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emitter = (result.treeDataProvider as any)._onDidChangeTreeData;
  const fireCountBefore = emitter.fireCount;

  capturedWatcher!.emitCreate();

  expect(emitter.fireCount).toBe(fireCountBefore + 1);
});

test("watcher onDidDelete triggers treeDataProvider.refresh", async () => {
  const result = await registerFresh();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emitter = (result.treeDataProvider as any)._onDidChangeTreeData;
  const fireCountBefore = emitter.fireCount;

  capturedWatcher!.emitDelete();

  expect(emitter.fireCount).toBe(fireCountBefore + 1);
});

test("multiple watcher events each trigger refresh", async () => {
  const result = await registerFresh();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const emitter = (result.treeDataProvider as any)._onDidChangeTreeData;
  const fireCountBefore = emitter.fireCount;

  capturedWatcher!.emitChange();
  capturedWatcher!.emitCreate();
  capturedWatcher!.emitDelete();

  expect(emitter.fireCount).toBe(fireCountBefore + 3);
});
