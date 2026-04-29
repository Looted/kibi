import * as vscode from "vscode";
import * as path from "node:path";
import * as fs from "node:fs";
import type { BriefModel } from "./briefs";

export class BriefDocumentProvider implements vscode.TextDocumentContentProvider { // implements REQ-vscode-kibi-briefing-v2
  static scheme = "kibi-brief";

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this._onDidChange.event;

  provideTextDocumentContent(uri: vscode.Uri): string { // implements REQ-vscode-kibi-briefing-v2
    const workspaceRoot = decodeURIComponent(uri.authority);
    const briefsDir = path.join(workspaceRoot, ".kb", "briefs");

    if (!fs.existsSync(briefsDir)) {
      return "# No Kibi Briefs\n\nNo briefs directory found.";
    }

    const briefId = path.basename(uri.path, ".md");
    const files = fs.readdirSync(briefsDir)
      .filter((f) => f.endsWith("_brief.json"))
      .map((f) => {
        const fullPath = path.join(briefsDir, f);
        try {
          const content = fs.readFileSync(fullPath, "utf-8");
          const brief: BriefModel = JSON.parse(content);
          return { path: fullPath, brief };
        } catch {
          return null;
        }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .filter((item) => item.brief.briefId === briefId);

    if (files.length === 0) {
      return `# Brief Not Found\n\nNo brief found with ID: ${briefId}`;
    }

    const brief = files[0];
    if (!brief) {
      return `# Brief Not Found\n\nNo brief found with ID: ${briefId}`;
    }

    return this.renderBriefAsMarkdown(brief.brief);
  }

  private renderBriefAsMarkdown(brief: BriefModel): string {
    const lines: string[] = [];

    lines.push(`# Kibi Brief: ${brief.type === "warning" ? "⚠️ Warning" : "✅ Success"}`);
    lines.push("");
    lines.push(`**Branch:** ${brief.branch}`);
    lines.push(`**Created:** ${brief.createdAt}`);
    lines.push(`**Session:** ${brief.sessionId}`);
    lines.push(`**Unread:** ${brief.unread ? "Yes" : "No"}`);
    lines.push("");

    // Briefing section: render promptBlock when present, fallback otherwise
    if (brief.briefing.promptBlock) {
      lines.push("## Briefing");
      lines.push(brief.briefing.promptBlock);
      lines.push("");
    } else {
      lines.push("## Briefing");
      lines.push("*No full briefing body available. Showing summary from TL;DR and available data.*");
      lines.push("");
      if (brief.briefing.tldr) {
        lines.push(`**TL;DR:** ${brief.briefing.tldr}`);
        lines.push("");
      }
      if (brief.briefing.citations.length > 0) {
        lines.push("**Cited entities:** " + brief.briefing.citations.map((c) => c.id).join(", "));
        lines.push("");
      }
      if (brief.validation.violations.length > 0) {
        lines.push(`**Validation issues:** ${brief.validation.count} violation(s) found.`);
        lines.push("");
      }
    }

    lines.push("## Summary");
    lines.push(brief.summary);
    lines.push("");

    lines.push("## Changes");
    lines.push(`- Requirements added: ${brief.counts.requirementsAdded}`);
    lines.push(`- Relationships added: ${brief.counts.relationshipsAdded}`);
    lines.push(`- Entities deleted: ${brief.counts.entitiesDeleted}`);
    lines.push("");

    if (brief.validation.violations.length > 0) {
      lines.push("## Validation Issues");
      lines.push(`**Total violations:** ${brief.validation.count}`);
      lines.push("");
      for (const v of brief.validation.violations) {
        lines.push(`### ${v.rule}`);
        lines.push(`- **Entity:** ${v.entityId}`);
        lines.push(`- **Description:** ${v.description}`);
        if (v.suggestion) lines.push(`- **Suggestion:** ${v.suggestion}`);
        lines.push("");
      }
    } else {
      lines.push("## Validation");
      lines.push("✅ No validation issues found.");
      lines.push("");
    }

    if (brief.briefing.citations.length > 0) {
      lines.push("## Citations");
      for (const c of brief.briefing.citations) {
        lines.push(`- **${c.id}**${c.title ? `: ${c.title}` : ""}${c.source ? ` (${c.source})` : ""}`);
      }
      lines.push("");
    }

    lines.push("---");
    lines.push(`*Brief ID: ${brief.briefId} | Content Hash: ${brief.contentHash}*`);

    return lines.join("\n");
  }
}
