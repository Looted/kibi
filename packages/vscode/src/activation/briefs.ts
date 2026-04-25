/*
 * Brief watcher registration utilities for Kibi VS Code extension
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  parseLatestBrief,
  readBriefId,
  markBriefRead,
  type BriefModel,
} from "../briefs";
import { BriefDocumentProvider } from "../briefDocumentProvider";
import { KIBI_SHOW_LATEST_BRIEF_COMMAND } from "../extensionIds";

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
      await showLatestBriefCommand(context.workspaceState, workspaceRoot, branch, brief.briefId);
    }

    // Mark as read when user dismisses (or views) the notification
    if (selection === "Dismiss" || selection === "View Brief") {
      // Find actual brief file path
      const allBriefs = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceRoot, ".kb/briefs/*_brief.json")
      );
      const matchingBrief = allBriefs.find((u) => {
        try {
          const content = fs.readFileSync(u.fsPath, "utf-8");
          const b: BriefModel = JSON.parse(content);
          return b.briefId === brief.briefId;
        } catch {
          return false;
        }
      });
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

  // Register showLatestBrief command
  const showLatestBriefDisposable = vscode.commands.registerCommand(
    KIBI_SHOW_LATEST_BRIEF_COMMAND,
    () => showLatestBriefCommand(context.workspaceState, workspaceRoot, branch)
  );
  context.subscriptions.push(showLatestBriefDisposable);

  return {
    watcher,
    dispose: () => {
      watcher.dispose();
    },
  };
}

/**
 * Command handler for kibi.showLatestBrief command.
 * Opens the latest brief document, marks it as read, and shows a message if none available.
 */
export async function showLatestBriefCommand(
  // implements REQ-vscode-kibi-briefing-v1
  workspaceState: vscode.Memento,
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

  // Find brief file path for markBriefRead
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  if (fs.existsSync(briefsDir)) {
    const files = fs.readdirSync(briefsDir)
      .filter((f) => f.endsWith("_brief.json"))
      .map((f) => {
        const fullPath = path.join(briefsDir, f);
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const b: BriefModel = JSON.parse(content);
          return { path: fullPath, brief: b };
        } catch {
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.brief.briefId === brief.briefId);

    if (files.length > 0) {
      const firstFile = files[0];
      if (firstFile) {
        markBriefRead(workspaceState, workspaceRoot, branch, brief.briefId, firstFile.path);
      }
    }
  }

  // Open virtual document via document provider
  const uri = vscode.Uri.parse(
    `${BriefDocumentProvider.scheme}://${encodeURIComponent(workspaceRoot)}/${branch}/${brief.briefId}.md`
  );
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
}
