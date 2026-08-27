/*
 * Workspace resolution utilities for Kibi VS Code extension
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

let workspaceExistsSync: typeof fs.existsSync = fs.existsSync;

export function _setWorkspaceFsDepsForTests(overrides: {
  existsSync?: typeof fs.existsSync;
}): void {
  workspaceExistsSync = overrides.existsSync ?? fs.existsSync;
}

export function _resetWorkspaceFsDepsForTests(): void {
  workspaceExistsSync = fs.existsSync;
}

/**
 * Resolves the workspace root using VS Code workspace folders or KIBI_WORKSPACE_ROOT env var.
 * Returns the workspace root path or undefined if not found.
 */
export function resolveWorkspaceRoot(
  // implements REQ-vscode-traceability
  output: vscode.OutputChannel,
): string | undefined {
  let workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

  // Fall back to KIBI_WORKSPACE_ROOT environment variable
  if (!workspaceRoot) {
    const envWorkspaceRoot = process.env.KIBI_WORKSPACE_ROOT;
    if (envWorkspaceRoot) {
      const resolved = path.resolve(envWorkspaceRoot);
      const kbManifestPath = path.join(resolved, ".kb", "manifest.json");
      if (workspaceExistsSync(kbManifestPath)) {
        workspaceRoot = resolved;
        output.appendLine(
          `No workspace folder attached; using KIBI_WORKSPACE_ROOT fallback: ${workspaceRoot}`,
        );
      } else {
        output.appendLine(
          `KIBI_WORKSPACE_ROOT is set but missing .kb/manifest.json: ${resolved}`,
        );
      }
    }
  }

  if (!workspaceRoot) {
    output.appendLine("No workspace folder found; activation skipped.");
    return undefined;
  }

  output.appendLine(`Workspace root: ${workspaceRoot}`);
  return workspaceRoot;
}

/**
 * Gets the workspace folder URI for the given workspace root path.
 */
export function getWorkspaceFolderUri(workspaceRoot: string): vscode.Uri {
  const workspaceFolder = vscode.workspace.workspaceFolders?.find(
    (folder) => folder.uri.fsPath === workspaceRoot,
  );
  return workspaceFolder?.uri ?? vscode.Uri.file(workspaceRoot);
}
