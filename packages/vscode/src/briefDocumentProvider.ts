import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import type { BriefModel } from "./briefs";

function getWhatChangedLines(brief: BriefModel): string[] {
  if (
    brief.schemaVersion === "2.0" &&
    brief.briefing.changeNarrative.length > 0
  ) {
    return brief.briefing.changeNarrative;
  }

  if (brief.briefing.tldr) {
    return [brief.briefing.tldr];
  }

  if (brief.summary) {
    return [brief.summary];
  }

  if (brief.briefing.promptBlock) {
    return [brief.briefing.promptBlock];
  }

  return ["Knowledge updates were recorded in this brief."];
}

function getWhyItMattersLines(brief: BriefModel): string[] {
  if (brief.briefing.promptBlock) {
    return [brief.briefing.promptBlock];
  }

  if (brief.briefing.tldr) {
    return [
      "This update refines how the project knowledge should be interpreted and reused.",
    ];
  }

  return [
    "This brief captures the latest project knowledge state for consistent interpretation over time.",
  ];
}

function hasKnowledgeImpactContext(brief: BriefModel): boolean {
  return (
    brief.briefing.citations.length > 0 ||
    (brief.briefing.constraints?.length ?? 0) > 0 ||
    (brief.briefing.regressionRisks?.length ?? 0) > 0
  );
}

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
    const hasContext = hasKnowledgeImpactContext(brief);
    const hasMissingEvidence =
      brief.briefing.missingEvidence && brief.briefing.missingEvidence.length > 0;
    const hasViolations = brief.validation.violations.length > 0;

    lines.push(
      `# Kibi Brief: ${brief.type === "warning" ? "⚠️ Warning" : "✅ Success"}`,
    );
    lines.push("");
    lines.push(`**Branch:** ${brief.branch}`);
    lines.push(`**Created:** ${brief.createdAt}`);
    lines.push("");

    lines.push("## What changed");
    lines.push(...getWhatChangedLines(brief));
    lines.push("");

    lines.push("## Why it matters");
    lines.push(...getWhyItMattersLines(brief));
    lines.push("");

    if (hasContext) {
      lines.push("## Project knowledge impact");
      lines.push("### Evidence and authority updates");
      if (brief.briefing.citations.length > 0) {
        for (const c of brief.briefing.citations) {
          lines.push(
            `- **${c.id}**${c.title ? `: ${c.title}` : ""}${c.source ? ` (${c.source})` : ""}`,
          );
        }
        lines.push("");
      }
      if (brief.briefing.constraints && brief.briefing.constraints.length > 0) {
        lines.push("### Constraints now reflected");
        for (const c of brief.briefing.constraints) {
          lines.push(`- ${c.statement} (${c.citationIds.join(", ")})`);
        }
        lines.push("");
      }
      if (
        brief.briefing.regressionRisks &&
        brief.briefing.regressionRisks.length > 0
      ) {
        lines.push("### Regression considerations");
        for (const r of brief.briefing.regressionRisks) {
          lines.push(`- ${r.statement} (${r.citationIds.join(", ")})`);
        }
        lines.push("");
      }
    }

    if (hasViolations || hasMissingEvidence) {
      lines.push("## Interpretation note");
      if (hasViolations) {
        lines.push(
          "Validation checks reported unresolved items that may affect interpretation of this update:",
        );
        for (const v of brief.validation.violations) {
          lines.push(
            `- ${v.rule} on ${v.entityId}: ${v.description}${v.suggestion ? ` (${v.suggestion})` : ""}`,
          );
        }
      }
      if (hasMissingEvidence) {
        lines.push("This brief includes unresolved evidence notes:");
        for (const m of brief.briefing.missingEvidence ?? []) {
          lines.push(`- ${m.statement}`);
        }
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}
