/*
 * Navigation command registration utilities for Kibi VS Code extension
 */
import * as vscode from "vscode";
import { openFileAtLine } from "../codeActionProvider";
import {
  KIBI_CONTAINER_ID,
  KIBI_FOCUS_KB_COMMAND,
  KIBI_VIEW_ID,
} from "../extensionIds";

export interface NavigationCommandsResult {
  openEntityCommand: vscode.Disposable;
  openEntityByIdCommand: vscode.Disposable;
  openTreeItemSourceCommand: vscode.Disposable;
  focusKnowledgeBaseCommand: vscode.Disposable;
}

/**
 * Registers navigation commands for opening entities and focusing the knowledge base view.
 */
// implements REQ-vscode-traceability
export function registerNavigationCommands(
  output: vscode.OutputChannel,
  treeDataProvider: {
    getLocalPathForEntity: (entityId: string) => string | undefined;
    getNavigationTargetForEntity?: (
      entityId: string,
    ) => { localPath: string; line?: number | undefined } | undefined;
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
      const navigationTarget =
        treeDataProvider.getNavigationTargetForEntity?.(entityId);
      const localPath =
        navigationTarget?.localPath ??
        treeDataProvider.getLocalPathForEntity(entityId);

      if (localPath) {
        try {
          await openFileAtLine(localPath, navigationTarget?.line);
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

  const openTreeItemSourceCommand = vscode.commands.registerCommand(
    "kibi.openTreeItemSource",
    async (item?: {
      label?: string;
      localPath?: string;
      sourceLine?: number;
    }) => {
      if (!item?.localPath) {
        vscode.window.showInformationMessage(
          `Kibi: ${item?.label ?? "This item"} has no local source file.`,
        );
        return;
      }

      try {
        await openFileAtLine(item.localPath, item.sourceLine);
      } catch {
        vscode.window.showErrorMessage(
          `Kibi: Could not open file — ${item.localPath}`,
        );
      }
    },
  );

  const focusKnowledgeBaseCommand = vscode.commands.registerCommand(
    KIBI_FOCUS_KB_COMMAND,
    async () => {
      await vscode.commands.executeCommand(
        `workbench.view.extension.${KIBI_CONTAINER_ID}`,
      );
      await vscode.commands.executeCommand(`${KIBI_VIEW_ID}.focus`);
    },
  );

  output.appendLine("Navigation commands registered.");
  return {
    openEntityCommand,
    openEntityByIdCommand,
    openTreeItemSourceCommand,
    focusKnowledgeBaseCommand,
  };
}
