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
import {
  getCurrentBranch,
  getWorkspaceFolderUri,
  registerBriefWatcher,
  registerContextOnOpen,
  registerNavigationCommands,
  registerTraceability,
  registerTreeView,
  resolveWorkspaceRoot,
  validateMcpServerPath,
} from "./activation";
import { BriefDocumentProvider } from "./briefDocumentProvider";

// Flag to ensure workspace features are initialized exactly once (idempotency)
let workspaceFeaturesInitialized = false;

/**
 * Shared helper to initialize all workspace-dependent features.
 * Called either immediately during activation or deferred via workspace folder change listener.
 */
function initializeWorkspaceFeatures(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  workspaceRoot: string,
): void {
  // Idempotency: ensure features are initialized exactly once
  if (workspaceFeaturesInitialized) {
    output.appendLine(
      "Workspace features already initialized. Skipping duplicate initialization.",
    );
    return;
  }
  workspaceFeaturesInitialized = true;

  const workspaceFolderUri = getWorkspaceFolderUri(workspaceRoot);

  // Keep validateMcpServerPath non-blocking - it logs warnings but doesn't fail activation
  validateMcpServerPath(output);

  const treeViewResult = registerTreeView(
    context,
    output,
    workspaceRoot,
    workspaceFolderUri,
  );

  // Get current branch for brief watching
  const currentBranch = getCurrentBranch(workspaceRoot);

  // Register brief watcher for toast notifications
  const briefWatcherResult = registerBriefWatcher(
    context,
    output,
    workspaceRoot,
    currentBranch,
  );

  const navigationCommands = registerNavigationCommands(
    output,
    treeViewResult.treeDataProvider,
  );

  const traceabilityResult = registerTraceability(
    context,
    output,
    workspaceRoot,
    treeViewResult.treeDataProvider,
  );

  registerContextOnOpen(context, output, workspaceRoot);

  // Register brief document provider for virtual document viewing
  const briefProvider = new BriefDocumentProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      BriefDocumentProvider.scheme,
      briefProvider,
    ),
  );

  const subscriptions: vscode.Disposable[] = [
    treeViewResult.watcher,
    treeViewResult.treeView,
    treeViewResult.refreshCommand,
    briefWatcherResult.watcher,
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

export function activate(context: vscode.ExtensionContext) {
  const output = vscode.window.createOutputChannel("Kibi");
  output.appendLine("Activating Kibi extension...");
  context.subscriptions.push(output);

  const workspaceRoot = resolveWorkspaceRoot(output);
  if (!workspaceRoot) {
    // Workspace not available at activation time.
    // Register a listener to initialize features when a workspace becomes available.
    output.appendLine(
      "Workspace folder not available. Deferring activation until workspace opens...",
    );
    const workspaceFolderChangeListener = vscode.workspace.onDidChangeWorkspaceFolders(
      () => {
        const newWorkspaceRoot = resolveWorkspaceRoot(output);
        if (newWorkspaceRoot) {
          // Workspace is now available - initialize features
          initializeWorkspaceFeatures(context, output, newWorkspaceRoot);
        }
      },
    );
    context.subscriptions.push(workspaceFolderChangeListener);
    return;
  }

  // Workspace is immediately available - initialize features now
  initializeWorkspaceFeatures(context, output, workspaceRoot);
}

// implements REQ-vscode-traceability
export function deactivate() {}

