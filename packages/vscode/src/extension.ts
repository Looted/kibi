import * as vscode from "vscode";
import { KibiTreeDataProvider } from "./treeProvider";

export function activate(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return;
  }

  const treeDataProvider = new KibiTreeDataProvider(workspaceFolder.uri.fsPath);

  vscode.window.createTreeView("kibi-knowledge-base", {
    treeDataProvider: treeDataProvider,
    showCollapseAll: true,
  });

  const refreshCommand = vscode.commands.registerCommand(
    "kibi.refreshTree",
    () => {
      treeDataProvider.refresh();
    },
  );

  context.subscriptions.push(refreshCommand);
}

export function deactivate() {}
