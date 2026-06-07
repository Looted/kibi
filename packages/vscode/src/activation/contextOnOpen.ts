/*
 * Context on file open registration utilities for Kibi VS Code extension
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

let contextOnOpenExistsSync: typeof fs.existsSync = fs.existsSync;

export function _setContextOnOpenFsDepsForTests(
  // implements REQ-vscode-traceability
  overrides: { existsSync?: typeof fs.existsSync },
): void {
  contextOnOpenExistsSync = overrides.existsSync ?? fs.existsSync;
}

export function _resetContextOnOpenFsDepsForTests(): void {
  // implements REQ-vscode-traceability
  contextOnOpenExistsSync = fs.existsSync;
}

/**
 * Registers a listener that shows KB entities linked to files when they are opened.
 */
export function registerContextOnOpen(
  // implements REQ-vscode-traceability
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  workspaceRoot: string,
): void {
  const config = vscode.workspace.getConfiguration("kibi");
  const contextOnOpen = config.get<boolean>("contextOnOpen", true);

  if (!contextOnOpen) {
    return;
  }

  const docOpenListener = vscode.workspace.onDidOpenTextDocument(
    async (document) => {
      if (!workspaceRoot || document.uri.scheme !== "file") {
        return;
      }

      const kbConfigPath = path.join(workspaceRoot, ".kb");
      const kbExists = contextOnOpenExistsSync(kbConfigPath);

      if (!kbExists) {
        return;
      }

      const relativePath = path.relative(workspaceRoot, document.uri.fsPath);

      try {
        interface McpResult {
          structuredContent?: {
            entities?: unknown[];
          };
        }
        const mcpResult = await vscode.commands.executeCommand<McpResult>(
          "kibi-mcp.kb_query",
          { sourceFile: relativePath },
        );

        if (
          mcpResult?.structuredContent?.entities &&
          Array.isArray(mcpResult.structuredContent.entities) &&
          mcpResult.structuredContent.entities.length > 0
        ) {
          const count = mcpResult.structuredContent.entities.length;
          vscode.window.showInformationMessage(
            `Kibi: ${count} KB entities linked to this file. Open Kibi panel to explore.`,
          );
        }
      } catch (error) {
        output.appendLine(
          `Context query failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  );

  context.subscriptions.push(docOpenListener);
  output.appendLine("Context on file open listener registered.");
}
