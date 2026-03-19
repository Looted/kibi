/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
import * as vscode from "vscode";
import {
  getWorkspaceFolderUri,
  registerContextOnOpen,
  registerNavigationCommands,
  registerTraceability,
  registerTreeView,
  resolveWorkspaceRoot,
  validateMcpServerPath,
} from "./activation";

// implements REQ-vscode-traceability
export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Kibi");
  output.appendLine("Activating Kibi extension...");
  context.subscriptions.push(output);

  // ── Workspace Resolution ─────────────────────────────────────────────────────
  const workspaceRoot = resolveWorkspaceRoot(output);
  if (!workspaceRoot) {
    return;
  }

  const workspaceFolderUri = getWorkspaceFolderUri(workspaceRoot);

  // ── MCP Server Path Validation ──────────────────────────────────────────────
  validateMcpServerPath(output);

  // ── Tree View Registration ──────────────────────────────────────────────────
  const treeViewResult = registerTreeView(
    context,
    output,
    workspaceRoot,
    workspaceFolderUri,
  );

  // ── Navigation Commands Registration ───────────────────────────────────────
  const navigationCommands = registerNavigationCommands(
    output,
    treeViewResult.treeDataProvider,
  );

  // ── Traceability Features Registration ─────────────────────────────────────
  const traceabilityResult = registerTraceability(
    context,
    output,
    workspaceRoot,
    treeViewResult.treeDataProvider,
  );

  // ── Context on File Open Registration ───────────────────────────────────────
  registerContextOnOpen(context, output, workspaceRoot);

  // ── Subscriptions ───────────────────────────────────────────────────────────
  const subscriptions: vscode.Disposable[] = [
    treeViewResult.refreshCommand,
    treeViewResult.treeView,
    treeViewResult.watcher,
    navigationCommands.openEntityCommand,
    navigationCommands.openEntityByIdCommand,
    navigationCommands.openTreeItemSourceCommand,
    navigationCommands.focusKnowledgeBaseCommand,
  ];

  if (traceabilityResult.browseLinkedEntitiesCommand) {
    subscriptions.push(traceabilityResult.browseLinkedEntitiesCommand);
  }
  if (traceabilityResult.codeActionRegistration) {
    subscriptions.push(traceabilityResult.codeActionRegistration);
  }
  if (traceabilityResult.codeLensRegistration) {
    subscriptions.push(traceabilityResult.codeLensRegistration);
  }
  if (traceabilityResult.hoverRegistration) {
    subscriptions.push(traceabilityResult.hoverRegistration);
  }

  context.subscriptions.push(...subscriptions);

  output.appendLine("Kibi extension activation complete.");
}

export function deactivate() {}
