/*
 * Navigation command registration utilities for Kibi VS Code extension
 */
import * as vscode from "vscode";
import { openFileAtLine } from "../codeActionProvider";

const KIBI_VIEW_ID = "kibi-knowledge-base";

export interface NavigationCommandsResult {
  openEntityCommand: vscode.Disposable;
  openEntityByIdCommand: vscode.Disposable;
  focusKnowledgeBaseCommand: vscode.Disposable;
}

/**
 * Registers navigation commands for opening entities and focusing the knowledge base view.
 */
export function registerNavigationCommands(
  output: vscode.OutputChannel,
  treeDataProvider: {
    getLocalPathForEntity: (entityId: string) => string | undefined;
  },
): NavigationCommandsResult {
  /** Open an entity's source file by its local filesystem path, optionally at a 1-based line. */
  const openEntityCommand = vscode.commands.registerCommand(
    "kibi.openEntity",
    async (localPath: string, line?: number) => {
      try {
        await openFileAtLine(localPath, line);
      } catch {
        vscode.window.showErrorMessage(
          `Kibi: Could not open file — ${localPath}`,
        );
      }
    },
  );

  /** Open an entity's source file by its KB ID (looks up the local path from the tree). */
  const openEntityByIdCommand = vscode.commands.registerCommand(
    "kibi.openEntityById",
    async (entityId: string) => {
      const localPath = treeDataProvider.getLocalPathForEntity(entityId);
      if (localPath) {
        try {
          const uri = vscode.Uri.file(localPath);
          await vscode.window.showTextDocument(uri);
        } catch {
          vscode.window.showErrorMessage(
            `Kibi: Could not open file for entity "${entityId}"`,
          );
        }
      } else {
        vscode.window.showInformationMessage(
          `Kibi: Entity "${entityId}" has no local source file.`,
        );
      }
    },
  );

  const focusKnowledgeBaseCommand = vscode.commands.registerCommand(
    "kibi.focusKnowledgeBase",
    async () => {
      await vscode.commands.executeCommand(
        "workbench.view.extension.kibi-sidebar",
      );
      await vscode.commands.executeCommand(`${KIBI_VIEW_ID}.focus`);
    },
  );

  output.appendLine("Navigation commands registered.");
  return {
    openEntityCommand,
    openEntityByIdCommand,
    focusKnowledgeBaseCommand,
  };
}
