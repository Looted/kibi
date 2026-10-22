/*
 * Requirements signoff view for the Kibi VS Code extension.
 *
 * `kibi signoff` writes the latest signoff view (the end-of-work summary, or
 * the decisions waiting for the person) to `.kb/briefs/signoff/`. This module
 * watches that view, offers to open it when it changes, and shows its
 * self-contained HTML page in a webview with scripts disabled.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";

export const SIGNOFF_COMMAND = "kibi.showSignoff";
const SIGNOFF_DIR = path.join(".kb", "briefs", "signoff");

export type SignoffAnnouncement = Readonly<{
  message: string;
  openLabel: string;
}>;

// implements REQ-kibi-signoff-views
/** The notification for a new signoff view, or undefined when unreadable. */
export function signoffAnnouncement(
  latestJson: string,
): SignoffAnnouncement | undefined {
  try {
    const view = JSON.parse(latestJson) as {
      kind?: unknown;
      requirements?: unknown;
      questions?: unknown;
    };
    if (view.kind === "questions" && Array.isArray(view.questions)) {
      const open = view.questions.filter((question) => {
        const answer = (question as { answer?: unknown }).answer;
        return typeof answer !== "string" || answer.trim() === "";
      }).length;
      if (open === 0) return undefined;
      return {
        message: `Kibi: ${open} ${open === 1 ? "decision waits" : "decisions wait"} for your answer.`,
        openLabel: "Show decisions",
      };
    }
    if (view.kind === "summary" && Array.isArray(view.requirements)) {
      const count = view.requirements.length;
      return {
        message: `Kibi: requirements signoff ready (${count} ${count === 1 ? "requirement" : "requirements"}).`,
        openLabel: "Show signoff",
      };
    }
  } catch {
    // Being rewritten or not a signoff view: say nothing.
  }
  return undefined;
}

function readLatest(workspaceRoot: string, file: string): string | undefined {
  try {
    return fs.readFileSync(path.join(workspaceRoot, SIGNOFF_DIR, file), "utf8");
  } catch {
    return undefined;
  }
}

const EMPTY_PAGE = `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"></head><body style="font-family:sans-serif;padding:16px"><p>No signoff view yet. The agent writes one with <code>kibi signoff</code>.</p></body></html>`;

// implements REQ-kibi-signoff-views
/**
 * Register `Kibi: Show Requirements Signoff` and the watcher that announces
 * new signoff views.
 */
export function registerSignoff(
  context: vscode.ExtensionContext,
  output: vscode.OutputChannel,
  workspaceRoot: string,
): vscode.Disposable[] {
  let panel: vscode.WebviewPanel | undefined;

  const render = () => {
    if (!panel) return;
    panel.webview.html = readLatest(workspaceRoot, "latest.html") ?? EMPTY_PAGE;
  };

  const show = () => {
    if (panel) {
      panel.reveal(vscode.ViewColumn.Beside);
    } else {
      panel = vscode.window.createWebviewPanel(
        "kibiSignoff",
        "Kibi signoff",
        vscode.ViewColumn.Beside,
        { enableScripts: false, retainContextWhenHidden: false },
      );
      panel.onDidDispose(() => {
        panel = undefined;
      });
    }
    render();
  };

  const command = vscode.commands.registerCommand(SIGNOFF_COMMAND, show);

  const watcher = vscode.workspace.createFileSystemWatcher(
    new vscode.RelativePattern(
      workspaceRoot,
      path.posix.join(".kb", "briefs", "signoff", "latest.json"),
    ),
  );
  const onChange = async () => {
    if (panel) {
      render();
      return;
    }
    const latest = readLatest(workspaceRoot, "latest.json");
    const announcement = latest ? signoffAnnouncement(latest) : undefined;
    if (!announcement) return;
    output.appendLine(announcement.message);
    const choice = await vscode.window.showInformationMessage(
      announcement.message,
      announcement.openLabel,
    );
    if (choice === announcement.openLabel) show();
  };
  watcher.onDidCreate(onChange);
  watcher.onDidChange(onChange);

  const disposables = [command, watcher];
  context.subscriptions.push(...disposables);
  return disposables;
}
