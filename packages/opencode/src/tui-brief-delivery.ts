/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type { IdleBriefEnvelope } from "./idle-brief-store.js";
import * as logger from "./logger.js";

export type ToastPayload = {
  variant?: "info" | "success" | "warning" | "error";
  title?: string;
  message: string;
  duration?: number;
};

export type ToastCapableClient = {
  tui?: {
    showToast?: (payload: { body: ToastPayload }) => void | Promise<void>;
  };
};

export type SharedBriefPolicy = {
  briefs: {
    enabled: boolean;
    channels: {
      tui: boolean;
      vscode: boolean;
    };
    tui: {
      toast: boolean;
    };
  };
};

export type LocalBriefConfig = {
  autoSubmit: boolean;
};

export type DeliverResult = {
  delivered: boolean;
};

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "Knowledge updates were recorded in this brief.";
}

function defaultWhyItMatters(): string {
  return "This update changes how the project knowledge should be interpreted and applied.";
}

function buildTuiBriefMessage(envelope: IdleBriefEnvelope): string {
  const lines: string[] = [];
  const whatChanged =
    envelope.schemaVersion === "2.0"
      ? envelope.briefing.changeNarrative.map((line) => line.trim()).filter(Boolean)
      : [];

  lines.push("## What changed");
  if (whatChanged.length > 0) {
    lines.push(...whatChanged.slice(0, 2));
  } else if (envelope.schemaVersion === "2.0") {
    const fallbackEntity =
      envelope.changes.entities.modified[0] ?? envelope.changes.entities.added[0];
    if (fallbackEntity) {
      const action = envelope.changes.entities.modified[0] ? "Modified" : "Added";
      lines.push(`${action} ${fallbackEntity.id}: ${fallbackEntity.title ?? "Untitled"}`);
    } else {
      lines.push(firstNonEmpty(envelope.summary, envelope.briefing.tldr));
    }
  } else {
    lines.push(firstNonEmpty(envelope.summary, envelope.briefing.tldr));
  }
  lines.push("");

  lines.push("## Why it matters");
  lines.push(firstNonEmpty(envelope.briefing.promptBlock, defaultWhyItMatters()));
  lines.push("");

  const hasKnowledgeImpact =
    envelope.briefing.citations.length > 0 ||
    (envelope.briefing.constraints?.length ?? 0) > 0 ||
    (envelope.briefing.regressionRisks?.length ?? 0) > 0;

  if (hasKnowledgeImpact) {
    lines.push("## Project knowledge impact");
    if (envelope.briefing.citations.length > 0) {
      for (const citation of envelope.briefing.citations) {
        lines.push(
          `- **${citation.id}**${citation.title ? `: ${citation.title}` : ""}${citation.source ? ` (${citation.source})` : ""}`,
        );
      }
    }
    if ((envelope.briefing.constraints?.length ?? 0) > 0) {
      for (const constraint of envelope.briefing.constraints ?? []) {
        lines.push(`- ${constraint.statement}`);
      }
    }
    if ((envelope.briefing.regressionRisks?.length ?? 0) > 0) {
      for (const risk of envelope.briefing.regressionRisks ?? []) {
        lines.push(`- ${risk.statement}`);
      }
    }
    lines.push("");
  }

  const hasMissingEvidence = (envelope.briefing.missingEvidence?.length ?? 0) > 0;
  if (envelope.validation.count > 0 || hasMissingEvidence) {
    lines.push("## Interpretation note");
    if (envelope.validation.count > 0) {
      lines.push(
        `Validation checks reported unresolved items: ${envelope.validation.count} issue(s).`,
      );
    }
    if (hasMissingEvidence) {
      lines.push("This brief includes unresolved evidence notes:");
      for (const item of envelope.briefing.missingEvidence ?? []) {
        lines.push(`- ${item.statement}`);
      }
    }
    lines.push("");
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}

/**
 * Delivers a Kibi briefing to the TUI via toast notification.
 *
 * Uses the REAL OpenCode plugin API:
 * - client.tui.showToast(payload) — primary (and only) delivery mechanism
 *
 * The toast contains a rich summary from the envelope and is displayed
 * for 8 seconds so users can read the content.
 *
 * @param client - OpenCode client with optional TUI capabilities
 * @param envelope - Idle brief envelope containing briefing content
 * @param sharedPolicy - Shared brief policy from `.kb/config.json`
 * @param localConfig - Local OpenCode config
 */
// implements REQ-opencode-kibi-briefing-v4
export async function deliverBriefTui(
  client: ToastCapableClient,
  envelope: IdleBriefEnvelope,
  sharedPolicy: SharedBriefPolicy,
  _localConfig: LocalBriefConfig,
): Promise<DeliverResult> {
  // Early exit if TUI delivery is disabled
  if (!sharedPolicy.briefs.channels.tui) {
    logger.info("TUI brief delivery disabled by shared policy");
    return { delivered: false };
  }

  const tui = client.tui;

  // Toast is the primary delivery mechanism
  if (sharedPolicy.briefs.tui.toast && typeof tui?.showToast === "function") {
    try {
      const message = buildTuiBriefMessage(envelope);

      await tui.showToast({
        body: {
          variant: envelope.type === "warning" ? "warning" : "info",
          title: "Kibi Knowledge Update",
          message,
          duration: 8000,
        },
      });
      return { delivered: true };
    } catch (err) {
      logger.error("Failed to deliver brief toast", {
        event: "idle_brief_toast_failed",
        error: err instanceof Error ? err.message : String(err),
      });
      return { delivered: false };
    }
  } else {
    logger.info("TUI showToast API unavailable, brief not delivered");
    return { delivered: false };
  }
}
