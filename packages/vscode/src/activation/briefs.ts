/*
 * Brief watcher registration utilities for Kibi VS Code extension
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import { BriefDocumentProvider } from "../briefDocumentProvider";
import {
  type BriefModel,
  markBriefSeen,
  markBriefRead,
  parseLatestBrief,
  readBriefId,
} from "../briefs";
import { KIBI_SHOW_LATEST_BRIEF_COMMAND } from "../extensionIds";
import { isOperationalArtifactPath } from "../operational-artifacts";
// Lightweight, optional loadable brief-config loader with safe fallbacks
declare const require: (module: string) => unknown;
type BriefPolicy = {
  briefs: { enabled: boolean; channels: { vscode: boolean } };
};
interface LoadBriefConfigModule {
  loadBriefConfig: (workspaceRoot: string) => BriefPolicy;
}
let __loadBriefConfig: (workspaceRoot: string) => BriefPolicy = (
  workspaceRoot: string,
) => ({ briefs: { enabled: true, channels: { vscode: true } } });
try {
  const tmp = require("kibi-cli/brief-config") as unknown;
  if (typeof tmp === "object" && tmp !== null) {
    const t = tmp as LoadBriefConfigModule;
    if (typeof t.loadBriefConfig === "function") {
      __loadBriefConfig = t.loadBriefConfig;
    }
  }
} catch {}
try {
  const tmp2 = require("../../cli/brief-config") as unknown;
  if (typeof tmp2 === "object" && tmp2 !== null) {
    const t2 = tmp2 as LoadBriefConfigModule;
    if (typeof t2.loadBriefConfig === "function") {
      __loadBriefConfig = t2.loadBriefConfig;
    }
  }
} catch {
  // keep default behavior
}

export interface BriefWatcherResult {
  watcher: vscode.FileSystemWatcher;
  dispose: () => void;
}

/**
 * In-memory deduplication set for notifications in this session.
 * Ensures we don't notify about the same brief twice.
 */
const notifiedBriefContentHashes = new Set<string>();

function isGenericFallbackText(text: string | undefined): boolean {
  if (!text) return true;
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;
  return ["brief", "update", "summary", "tldr", "tl;dr", "kibi brief"].some(
    (phrase) => normalized === phrase || normalized.startsWith(`${phrase}:`) || normalized.startsWith(`${phrase} -`),
  );
}

function isPurelyOperationalText(text: string | undefined): boolean {
  if (!text) return false;
  const normalized = text.trim();
  if (!normalized) return false;
  return (
    normalized.includes(".sisyphus/") &&
    !/[a-z0-9]{2,}/i.test(normalized.replace(/\.sisyphus\/[\w./-]*/g, ""))
  );
}

function getBriefSpecificity(brief: BriefModel): boolean {
  const b = brief as BriefModel & {
    title?: string;
    sourceFiles?: string[];
  };
  const briefingWithReasons = brief.briefing as typeof brief.briefing & {
    deliveryReasons?: { toast?: { summary?: string } };
  };

  const title = b.title ?? "";
  const summary = b.summary ?? b.briefing?.tldr ?? "";
  const toastSummary = briefingWithReasons.deliveryReasons?.toast?.summary ?? "";
  const sourceFiles = b.sourceFiles ?? [];

  if (toastSummary && !isPurelyOperationalText(toastSummary) && !isGenericFallbackText(toastSummary)) return true;
  if (title && !isPurelyOperationalText(title) && !isGenericFallbackText(title)) return true;
  if (summary && !isPurelyOperationalText(summary) && !isGenericFallbackText(summary)) return true;

  if (sourceFiles.length > 0 && sourceFiles.every((file) => isOperationalArtifactPath(file))) {
    return false;
  }

  return false;
}

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
    ".kb/briefs/*_brief.json",
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

    // Gate: read shared brief config and skip notifications if gating is enabled/disabled by policy
    const sharedPolicy = __loadBriefConfig(workspaceRoot);
    if (
      sharedPolicy?.briefs?.enabled === false ||
      sharedPolicy?.briefs?.channels?.vscode === false
    ) {
      // Do not show notification and do not mark as read when gating is off
      return;
    }

    // Check workspaceState for previously seen brief content (persistent dedupe by semantic hash)
    const seenContentHash = readBriefId(
      context.workspaceState,
      workspaceRoot,
      branch,
    );
    if (seenContentHash === brief.contentHash) {
      return;
    }

    // In-memory dedupe for this session (suppresses duplicate create+change events)
    if (notifiedBriefContentHashes.has(brief.contentHash)) {
      return;
    }
    notifiedBriefContentHashes.add(brief.contentHash);

    // Build notification message using the most specific available text
    const b = brief as BriefModel & {
      title?: string;
    };
    const briefingWithReasons = brief.briefing as typeof brief.briefing & {
      deliveryReasons?: { toast?: { summary?: string } };
    };
    const toastSummary = briefingWithReasons.deliveryReasons?.toast?.summary;
    const bodyText =
      toastSummary &&
      !isPurelyOperationalText(toastSummary) &&
      !isGenericFallbackText(toastSummary)
        ? toastSummary
        : b.title &&
            !isPurelyOperationalText(b.title) &&
            !isGenericFallbackText(b.title)
          ? b.title
          : brief.summary ?? brief.briefing?.tldr ?? "";
    const message =
      brief.type === "warning"
        ? `New Kibi Brief: ${bodyText} (warning)`
        : `New Kibi Brief: ${bodyText}`;

    const shouldNotify = getBriefSpecificity(brief);
    if (!shouldNotify) {
      markBriefSeen(context.workspaceState, workspaceRoot, branch, brief.contentHash);
      return;
    }

    // Show toast with "View Brief" and "Dismiss" actions
    const selection = await vscode.window.showInformationMessage(
      message,
      "View Brief",
      "Dismiss",
    );

    // Persist semantic dedupe even when the user closes the toast without action.
    // This prevents the same contentHash from reappearing on each new session.
    markBriefSeen(context.workspaceState, workspaceRoot, branch, brief.contentHash);

    if (selection === "View Brief") {
      // Open the brief document
      await showLatestBriefCommand(
        context.workspaceState,
        workspaceRoot,
        branch,
        brief.briefId,
      );
    }

    // Mark as read when user dismisses (or views) the notification
    if (selection === "Dismiss" || selection === "View Brief") {
      // Find actual brief file path
      const allBriefs = await vscode.workspace.findFiles(
        new vscode.RelativePattern(workspaceRoot, ".kb/briefs/*_brief.json"),
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
          brief.contentHash,
          matchingBrief.fsPath,
        );
      }
    }
  };

  // Watch both create and change events
  watcher.onDidCreate(handleBriefFile);
  watcher.onDidChange(handleBriefFile);

  // FileSystemWatcher only sees create/change events that happen after
  // registration. Replay the latest unread brief once on activation so a brief
  // generated while VS Code was reloading or before watcher startup still
  // surfaces without requiring another filesystem write.
  setTimeout(() => {
    void handleBriefFile(
      vscode.Uri.file(path.join(workspaceRoot, ".kb", "briefs", "startup.scan")),
    );
  }, 0);

  // Register watcher so it gets disposed with the extension
  context.subscriptions.push(watcher);

  // Register showLatestBrief command
  const showLatestBriefDisposable = vscode.commands.registerCommand(
    KIBI_SHOW_LATEST_BRIEF_COMMAND,
    () => showLatestBriefCommand(context.workspaceState, workspaceRoot, branch),
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
      "No Kibi briefs available for this branch.",
    );
    return;
  }

  // Find brief file path for markBriefRead
  const briefsDir = path.join(workspaceRoot, ".kb", "briefs");
  if (fs.existsSync(briefsDir)) {
    const files = fs
      .readdirSync(briefsDir)
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
        markBriefRead(
          workspaceState,
          workspaceRoot,
          branch,
          brief.contentHash,
          firstFile.path,
        );
      }
    }
  }

  // Open virtual document via document provider
  const uri = vscode.Uri.parse(
    `${BriefDocumentProvider.scheme}://${encodeURIComponent(workspaceRoot)}/${branch}/${brief.briefId}.md`,
  );
  const doc = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(doc, { preview: false });
}
