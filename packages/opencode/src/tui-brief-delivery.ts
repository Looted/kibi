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
      const summaryLine = envelope.summary || envelope.briefing.tldr || "Brief available";
      const toastLines = [summaryLine];
      if (envelope.validation.count > 0) {
        toastLines.push(`⚠️ Validation: ${envelope.validation.count} issue(s)`);
      }
      if (envelope.briefing.citations.length > 0) {
        toastLines.push(`📎 ${envelope.briefing.citations.length} citation(s)`);
      }
      if ((envelope.briefing.missingEvidence?.length ?? 0) > 0) {
        toastLines.push(
          `❓ Missing evidence: ${envelope.briefing.missingEvidence?.length} item(s)`,
        );
      }

      await tui.showToast({
        body: {
          variant: envelope.type === "warning" ? "warning" : "info",
          title: "Kibi Brief",
          message: toastLines.join("\n"),
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
    logger.info(
      "TUI showToast API unavailable, brief not delivered",
    );
    return { delivered: false };
  }
}
