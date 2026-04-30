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
    appendPrompt?: (text: string) => void | Promise<void>;
    clearPrompt?: () => void | Promise<void>;
    submitPrompt?: () => void | Promise<void>;
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
      appendPrompt: boolean;
    };
  };
};

export type LocalBriefConfig = {
  autoSubmit: boolean;
};

export type DeliverResult = {
  appended: boolean;
};

/**
 * Builds a deterministic render block from the envelope content.
 * Uses promptBlock when available; falls back to summary + citations.
 */
function buildRenderBlock(envelope: IdleBriefEnvelope): string {
  if (envelope.briefing.promptBlock.trim()) {
    return envelope.briefing.promptBlock;
  }

  // Fallback: deterministic non-empty render from stored envelope content
  const parts: string[] = [];

  const summary = envelope.summary || envelope.briefing.tldr;
  if (summary) {
    parts.push(summary);
  }

  const { citations } = envelope.briefing;
  if (citations.length > 0) {
    parts.push("");
    parts.push(
      citations
        .map((c) => `- ${c.id}${c.title ? `: ${c.title}` : ""}`)
        .join("\n"),
    );
  }

  // Validation signal
  if (envelope.validation.count > 0) {
    parts.push("");
    parts.push(`Validation: ${envelope.validation.count} issue(s)`);
  }

  // Ensure non-empty output
  if (parts.length === 0) {
    parts.push("Brief available");
  }

  return parts.join("\n");
}

/**
 * Delivers a Kibi briefing to the TUI via passive render-first append.
 *
 * Uses the REAL OpenCode plugin API:
 * - client.tui.showToast(payload) — optional notification, not a success-path requirement
 * - client.tui.appendPrompt(text) — primary passive rendering
 *
 * The briefing block is appended to the prompt buffer without auto-submit.
 * When promptBlock is empty, a deterministic fallback is derived from
 * the envelope's summary, citations, and validation signal.
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
  localConfig: LocalBriefConfig,
): Promise<DeliverResult> {
  // Early exit if TUI delivery is disabled
  if (!sharedPolicy.briefs.channels.tui) {
    logger.info("TUI brief delivery disabled by shared policy");
    return { appended: false };
  }

  const tui = client.tui;

  // Optional toast notification (best-effort, not a success-path requirement)
  if (sharedPolicy.briefs.tui.toast && typeof tui?.showToast === "function") {
    try {
      await tui.showToast({
        body: {
          variant: envelope.type === "warning" ? "warning" : "info",
          title: "Kibi",
          message: envelope.briefing.tldr,
          duration: 5000,
        },
      });
    } catch {
      // Toast is best-effort; do not let failures affect appended status
    }
  }

  // Passive render-first: append the briefing block to the prompt buffer
  const appendPrompt = tui?.appendPrompt;
  if (typeof appendPrompt === "function") {
    try {
      const renderBlock = buildRenderBlock(envelope);
      await appendPrompt(renderBlock);
      return { appended: true };
    } catch (err) {
      logger.error("Failed to append brief to prompt buffer", {
        event: "idle_brief_append_failed",
        error: err instanceof Error ? err.message : String(err),
      });
      return { appended: false };
    }
  } else {
    logger.info("TUI appendPrompt API unavailable, brief not rendered to buffer");
    return { appended: false };
  }
}
