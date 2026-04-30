import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { BriefModel } from "./briefs";

export class BriefDocumentProvider
  implements vscode.TextDocumentContentProvider
{
  // implements REQ-vscode-kibi-briefing-v2
  static scheme = "kibi-brief";

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  onDidChange = this._onDidChange.event;

  provideTextDocumentContent(uri: vscode.Uri): string {
    // implements REQ-vscode-kibi-briefing-v2
    const workspaceRoot = decodeURIComponent(uri.authority);
    const briefsDir = path.join(workspaceRoot, ".kb", "briefs");

    if (!fs.existsSync(briefsDir)) {
      return "# No Kibi Briefs\n\nNo briefs directory found.";
    }

    const briefId = path.basename(uri.path, ".md");
    const files = fs
      .readdirSync(briefsDir)
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

    lines.push(
      `# Kibi Brief: ${brief.type === "warning" ? "⚠️ Warning" : "✅ Success"}`,
    );
    lines.push("");
    lines.push(`**Branch:** ${brief.branch}`);
    lines.push(`**Created:** ${brief.createdAt}`);
    lines.push(`**Session:** ${brief.sessionId}`);
    lines.push(`**Unread:** ${brief.unread ? "Yes" : "No"}`);
    lines.push("");

    // 1. Overview
    lines.push("## Overview");
    if (brief.briefing.tldr) {
      lines.push(brief.briefing.tldr);
    } else if (brief.briefing.promptBlock) {
      lines.push(brief.briefing.promptBlock);
    } else {
      lines.push("*No overview available.*");
    }
    lines.push("");

    // 2. Session Summary
    lines.push("## Session Summary");
    lines.push(brief.summary);
    lines.push("");

    // 3. What Changed
    lines.push("## What Changed");
    lines.push(
      `- ${brief.counts.requirementsAdded} entit${brief.counts.requirementsAdded === 1 ? "y" : "ies"} changed`,
    );
    lines.push(
      `- ${brief.counts.relationshipsAdded} relationship${brief.counts.relationshipsAdded === 1 ? "" : "s"} changed`,
    );
    lines.push(
      `- ${brief.counts.entitiesDeleted} entit${brief.counts.entitiesDeleted === 1 ? "y" : "ies"} deleted`,
    );
    lines.push("");

    // 4. Relevant KB Context
    lines.push("## Relevant KB Context");
    const hasContext =
      brief.briefing.citations.length > 0 ||
      (brief.briefing.constraints && brief.briefing.constraints.length > 0) ||
      (brief.briefing.regressionRisks &&
        brief.briefing.regressionRisks.length > 0);
    if (!hasContext) {
      lines.push("*No relevant context available.*");
      lines.push("");
    } else {
      if (brief.briefing.citations.length > 0) {
        lines.push("### Citations");
        for (const c of brief.briefing.citations) {
          lines.push(
            `- **${c.id}**${c.title ? `: ${c.title}` : ""}${c.source ? ` (${c.source})` : ""}`,
          );
        }
        lines.push("");
      }
      if (brief.briefing.constraints && brief.briefing.constraints.length > 0) {
        lines.push("### Constraints");
        for (const c of brief.briefing.constraints) {
          lines.push(`- ${c.statement} (${c.citationIds.join(", ")})`);
        }
        lines.push("");
      }
      if (
        brief.briefing.regressionRisks &&
        brief.briefing.regressionRisks.length > 0
      ) {
        lines.push("### Regression Risks");
        for (const r of brief.briefing.regressionRisks) {
          lines.push(`- ${r.statement} (${r.citationIds.join(", ")})`);
        }
        lines.push("");
      }
    }

    // 5. Validation Status
    lines.push("## Validation Status");
    const hasViolations = brief.validation.violations.length > 0;
    const hasMissingEvidence =
      brief.briefing.missingEvidence &&
      brief.briefing.missingEvidence.length > 0;

    if (hasViolations) {
      lines.push(
        `**Validation issues:** ${brief.validation.count} violation(s) found.`,
      );
      lines.push("");
      for (const v of brief.validation.violations) {
        lines.push(
          `- **${v.rule}** on ${v.entityId}: ${v.description}${v.suggestion ? ` (${v.suggestion})` : ""}`,
        );
      }
      lines.push("");
    } else {
      lines.push("✅ No validation issues found.");
      lines.push("");
    }

    if (hasMissingEvidence) {
      lines.push("### Missing Evidence");
      for (const m of brief.briefing.missingEvidence ?? []) {
        lines.push(`- ${m.statement} (${m.citationIds.join(", ")})`);
      }
      lines.push("");
    }

    // 6. Next Step
    lines.push("## Next Step");
    if (hasViolations) {
      lines.push("Address validation issues first");
    } else if (hasMissingEvidence) {
      lines.push("Review missing evidence");
    } else if (brief.briefing.citations.length > 0) {
      lines.push("Open cited entities for details");
    } else {
      lines.push("Use `/brief-kibi` for a fresh briefing");
    }
    lines.push("");

    lines.push("---");
    lines.push(
      `*Brief ID: ${brief.briefId} | Content Hash: ${brief.contentHash}*`,
    );

    return lines.join("\n");
  }
}
