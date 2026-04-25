/*
 * Brief watcher registration utilities for Kibi VS Code extension
 */
import * as path from "node:path";
import * as vscode from "vscode";
import {
  parseLatestBrief,
  readBriefId,
  markBriefRead,
} from "../briefs";

export interface BriefWatcherResult {
  watcher: vscode.FileSystemWatcher;
  dispose: () => void;
}

/**
 * In-memory deduplication set for notifications in this session.
 * Ensures we don't notify about the same brief twice.
 */
const notifiedBriefIds = new Set<string>();

/**
 * Registers a file system watcher for brief JSON files in .kb/briefs/.
 * Shows toast notifications when new unread briefs appear.
 */
export function registerBriefWatcher(
  // implements REQ-vscode-kibi-briefing-v1
  context: vscode.ExtensionContext,
  _output: vscode.OutputChannel,
  workspaceRoot: string,
  branch: string,
): BriefWatcherResult {
  const briefsPattern = new vscode.RelativePattern(
    workspaceRoot,
    ".kb/briefs/*_brief.json"
  );

  const watcher = vscode.workspace.createFileSystemWatcher(briefsPattern);

  const handleBriefFile = async (uri: vscode.Uri) => {
    // Ignore temp files (those with .tmp extension)
    if (uri.fsPath.endsWith(".tmp")) {
      return;
    }

    // Parse the latest brief for this workspace/branch
    const brief = parseLatestBrief(workspaceRoot, branch);
    if (!brief) {
      return;
    }

    // Skip briefs that are already marked as read
    if (!brief.unread) {
      return;
    }

    // Check workspaceState for previously seen brief (persistent dedupe)
    const seenBriefId = readBriefId(context.workspaceState, workspaceRoot, branch);
    if (seenBriefId === brief.briefId) {
      return;
    }

    // In-memory dedupe for this session (suppresses duplicate create+change events)
    if (notifiedBriefIds.has(brief.briefId)) {
      return;
    }
    notifiedBriefIds.add(brief.briefId);

    // Build notification message
    const message = brief.type === "warning"
      ? `New Kibi Brief: ${brief.summary} (warning)`
      : `New Kibi Brief: ${brief.summary}`;

    // Show toast with "View Brief" and "Dismiss" actions
    const selection = await vscode.window.showInformationMessage(
      message,
      "View Brief",
      "Dismiss"
    );

    if (selection === "View Brief") {
      // Open the brief document
      await showLatestBriefCommand(workspaceRoot, branch, brief.briefId);
    }

    // Mark as read when user dismisses (or views) the notification
    if (selection === "Dismiss" || selection === "View Brief") {
      // Find actual brief file path
      const allBriefs = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceRoot, ".kb/briefs/*_brief.json")
      );
      const matchingBrief = allBriefs.find((u) => u.fsPath.includes(brief.briefId));
      if (matchingBrief) {
        markBriefRead(
          context.workspaceState,
          workspaceRoot,
          branch,
          brief.briefId,
          matchingBrief.fsPath
        );
      }
    }
  };

  // Watch both create and change events
  watcher.onDidCreate(handleBriefFile);
  watcher.onDidChange(handleBriefFile);

  // Register watcher so it gets disposed with the extension
  context.subscriptions.push(watcher);

  return {
    watcher,
    dispose: () => {
      watcher.dispose();
    },
  };
}

/**
 * Command handler for kibi.showLatestBrief command.
 * Opens the latest brief document or shows a message if none available.
 */
export async function showLatestBriefCommand(
  // implements REQ-vscode-kibi-briefing-v1
  workspaceRoot: string,
  branch: string,
  _briefId?: string,
): Promise<void> {
  const brief = parseLatestBrief(workspaceRoot, branch);
  if (!brief) {
    vscode.window.showInformationMessage(
      "No Kibi briefs available for this branch."
    );
    return;
  }

  // Open virtual document (URI scheme handled by document provider - Task 8)
  const doc = await vscode.workspace.openTextDocument(
    vscode.Uri.parse(
      `kibi-brief://${workspaceRoot}/${branch}/${brief.briefId}.md`
    )
  );
  await vscode.window.showTextDocument(doc, { preview: false });
}
