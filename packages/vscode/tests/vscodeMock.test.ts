import { afterEach, expect, mock, test } from "bun:test";
import { getVscodeMockModule, resetVscodeMock } from "./shared/vscode-mock";

type MockVscode = {
  workspace: {
    onDidChangeWorkspaceFolders: (
      listener: (event: unknown) => void,
    ) => unknown;
    emitWorkspaceFoldersChange: (event: unknown) => void;
    onDidOpenTextDocument: (listener: (doc: unknown) => void) => unknown;
    emitOpenTextDocument: (doc: unknown) => void;
  };
  window: {
    createTreeView: (id: string, options: unknown) => unknown;
    createTreeViewCalls: Array<{ id: string; options: unknown }>;
  };
  commands: {
    registerCommand: (commandId: string, callback: unknown) => unknown;
    registerCommandCalls: Array<{
      commandId: string;
      callback: unknown;
    }>;
  };
};

resetVscodeMock();

afterEach(() => {
  mock.restore();
  resetVscodeMock();
});

test("workspace folder change listeners are emitted", () => {
  const vscode = getVscodeMockModule() as unknown as MockVscode;
  const listener = mock((_event: unknown) => {});

  vscode.workspace.onDidChangeWorkspaceFolders(listener as never);
  vscode.workspace.emitWorkspaceFoldersChange({ added: [1], removed: [] });

  expect(listener).toHaveBeenCalledWith({ added: [1], removed: [] });
});

test("open text document listeners are emitted", () => {
  const vscode = getVscodeMockModule() as unknown as MockVscode;
  const listener = mock((_doc: unknown) => {});

  vscode.workspace.onDidOpenTextDocument(listener as never);
  vscode.workspace.emitOpenTextDocument({ uri: "file:///doc.ts" });

  expect(listener).toHaveBeenCalledWith({ uri: "file:///doc.ts" });
});

test("tree view and command registrations are captured", () => {
  const vscode = getVscodeMockModule() as unknown as MockVscode;
  const treeViewOptions = { showCollapseAll: true };
  const commandHandler = () => undefined;

  vscode.window.createTreeView("kibi.view", treeViewOptions);
  vscode.commands.registerCommand("kibi.refresh", commandHandler);

  expect(vscode.window.createTreeViewCalls).toEqual([
    { id: "kibi.view", options: treeViewOptions },
  ]);
  expect(vscode.commands.registerCommandCalls).toEqual([
    { commandId: "kibi.refresh", callback: commandHandler },
  ]);
});
