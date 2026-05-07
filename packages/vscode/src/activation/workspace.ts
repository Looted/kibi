import * as cp from "node:child_process";
/*
 * Workspace resolution utilities for Kibi VS Code extension
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

let workspaceExistsSync: typeof fs.existsSync = fs.existsSync;
let workspaceReadFileSync: typeof fs.readFileSync = fs.readFileSync;

export function _setWorkspaceFsDepsForTests(
  // implements REQ-vscode-traceability
  overrides: {
    existsSync?: typeof fs.existsSync;
    readFileSync?: typeof fs.readFileSync;
  },
): void {
  workspaceExistsSync = overrides.existsSync ?? fs.existsSync;
  workspaceReadFileSync = overrides.readFileSync ?? fs.readFileSync;
}

export function _resetWorkspaceFsDepsForTests(): void {
  // implements REQ-vscode-traceability
  workspaceExistsSync = fs.existsSync;
  workspaceReadFileSync = fs.readFileSync;
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
      const kbConfigPath = path.join(resolved, ".kb", "config.json");
      if (workspaceExistsSync(kbConfigPath)) {
        workspaceRoot = resolved;
        output.appendLine(
          `No workspace folder attached; using KIBI_WORKSPACE_ROOT fallback: ${workspaceRoot}`,
        );
      } else {
        output.appendLine(
          `KIBI_WORKSPACE_ROOT is set but missing .kb/config.json: ${resolved}`,
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

/**
 * Gets the current git branch for the given workspace root.
 * Returns 'main' as fallback if git command fails.
 */
export function getCurrentBranch(workspaceRoot: string): string {
  // implements REQ-vscode-kibi-briefing-v1
  try {
    const branch = cp
      .execSync("git branch --show-current", {
        cwd: workspaceRoot,
        encoding: "utf-8",
        timeout: 5000,
      })
      .trim();
    return branch || "main";
  } catch {
    // Fallback: try to read from .git/HEAD ref
    try {
      const headPath = path.join(workspaceRoot, ".git", "HEAD");
      if (workspaceExistsSync(headPath)) {
        const headContent = workspaceReadFileSync(headPath, "utf-8").trim();
        const match = headContent.match(/ref: refs\/heads\/(.+)/);
        if (match?.[1]) {
          return match[1].trim();
        }
        return headContent.trim() || "main";
      }
    } catch {
      // Ignore and fallback
    }
    return "main";
  }
}
