/*
 * Tree view registration utilities for Kibi VS Code extension
 */
import * as vscode from "vscode";
import { KibiTreeDataProvider } from "../treeProvider";

const KIBI_VIEW_ID = "kibi-knowledge-base";

export interface TreeViewRegistrationResult {
  treeDataProvider: KibiTreeDataProvider;
  treeView: vscode.TreeView<unknown>;
  refreshCommand: vscode.Disposable;
  watcher: vscode.FileSystemWatcher;
}

/**
 * Registers the Kibi tree view with file system watcher for auto-refresh.
 */
export function registerTreeView(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  workspaceRoot: string,
  workspaceFolderUri: vscode.Uri,
): TreeViewRegistrationResult {
  const treeDataProvider = new KibiTreeDataProvider(workspaceRoot, output);

  const treeView = vscode.window.createTreeView(KIBI_VIEW_ID, {
    treeDataProvider,
    showCollapseAll: true,
  });
  output.appendLine(`Tree view registered: ${KIBI_VIEW_ID}`);

  const refreshCommand = vscode.commands.registerCommand(
    "kibi.refreshTree",
    () => {
      treeDataProvider.refresh();
    },
  );

  // Watch .kb/branches/**/kb.rdf for changes and auto-refresh
  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(workspaceFolderUri, ".kb/branches/**/kb.rdf"),
  );
  watcher.onDidChange(() => treeDataProvider.refresh());
  watcher.onDidCreate(() => treeDataProvider.refresh());
  watcher.onDidDelete(() => treeDataProvider.refresh());

  return {
    treeDataProvider,
    treeView,
    refreshCommand,
    watcher,
  };
}
