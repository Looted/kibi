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

/**
 * Delivers a Kibi briefing to the TUI via OpenCode client capabilities.
 *
 * Uses the REAL OpenCode plugin API:
 * - client.tui.showToast(payload)
 * - client.tui.appendPrompt(text)
 * - client.tui.clearPrompt()
 * - client.tui.submitPrompt()
 *
 * Note: autoSubmit requires the real TUI prompt APIs above. If available,
 * the briefing prompt block is appended to the prompt and submitted.
 *
 * @param client - OpenCode client with optional TUI capabilities
 * @param envelope - Idle brief envelope containing briefing content
 * @param sharedPolicy - Shared brief policy from `.kb/config.json`
 * @param localConfig - Local OpenCode config with autoSubmit preference
 */
// implements REQ-opencode-kibi-plugin-v1
export async function deliverBriefTui(
  client: ToastCapableClient,
  envelope: IdleBriefEnvelope,
  sharedPolicy: SharedBriefPolicy,
  localConfig: LocalBriefConfig,
): Promise<void> {
  // Early exit if TUI delivery is disabled
  if (!sharedPolicy.briefs.channels.tui) {
    logger.info("TUI brief delivery disabled by shared policy");
    return;
  }

  const { tldr: summary } = envelope.briefing;
  const { toast } = sharedPolicy.briefs.tui;

  // Show toast using the real OpenCode API
if (toast && typeof client.tui?.showToast === "function") {
    await client.tui.showToast({
      body: {
variant: envelope.type === "warning" ? "warning" : "info",
title: "Kibi",
message: summary,
      duration: 5000,
      },
});
}

  if (localConfig.autoSubmit && sharedPolicy.briefs.tui.appendPrompt) {
    const tui = client.tui;
    if (
      typeof tui?.appendPrompt === "function" &&
      typeof tui?.submitPrompt === "function"
    ) {
      await tui.appendPrompt(envelope.briefing.promptBlock);
      await tui.submitPrompt();
    } else {
      logger.info("autoSubmit requested but TUI prompt APIs are unavailable");
    }
  }
}
