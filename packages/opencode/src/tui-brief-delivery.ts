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

type ShowToastPayload = {
  body: {
    variant?: "info" | "success" | "warning" | "error";
    title?: string;
    message: string;
    duration?: number;
  };
};

type ShowToast = (payload: ShowToastPayload) => void | Promise<void>;

type TuiCapabilities = {
  showToast?: ShowToast;
  appendPrompt?: (text: string) => void | Promise<void>;
  clearPrompt?: () => void | Promise<void>;
  submitPrompt?: () => void | Promise<void>;
};

export type ToastCapableClient = {
  tui?: TuiCapabilities;
};

type ClientWithShowToast = ToastCapableClient & {
  tui: TuiCapabilities & {
    showToast: ShowToast;
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

function hasShowToast(
  client: ToastCapableClient,
): client is ClientWithShowToast {
  return typeof client.tui?.showToast === "function";
}

/**
 * Delivers a Kibi briefing to the TUI via OpenCode client capabilities.
 *
 * This helper models TUI capabilities (showToast, appendPrompt, clearPrompt, submitPrompt)
 * and orchestrates brief delivery based on shared policy and local config.
 *
 * @param client - OpenCode client with optional TUI capabilities
 * @param envelope - Idle brief envelope containing briefing content
 * @param sharedPolicy - Shared brief policy from `.kb/config.json`
 * @param localConfig - Local OpenCode config with autoSubmit preference
 *
 * Delivery behavior:
 * - Returns early if sharedPolicy.briefs.channels.tui is false
 * - Shows toast if sharedPolicy.briefs.tui.toast is true
 * - If localConfig.autoSubmit is true: clearPrompt → appendPrompt('/brief-kibi') → submitPrompt()
 * - If localConfig.autoSubmit is false: appendPrompt('Kibi: <summary>. Full brief: /brief-kibi')
 * - Skips append/submit if envelope.briefing.promptBlock is empty or sharedPolicy.briefs.tui.appendPrompt is false
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

  const { summary } = envelope.briefing;
  const { toast, appendPrompt: appendPromptEnabled } = sharedPolicy.briefs.tui;

  // Show toast if enabled
  if (toast && hasShowToast(client)) {
    await client.tui!.showToast({
      body: {
        variant: envelope.type === "warning" ? "warning" : "info",
        title: "Kibi",
        message: summary,
        duration: 5000,
      },
    });
  }

  // Skip prompt operations if appendPrompt is disabled or promptBlock is empty
  if (!appendPromptEnabled || !envelope.briefing.promptBlock?.trim()) {
    logger.info(
      `Skipping prompt delivery: appendPrompt=${appendPromptEnabled}, promptBlockPresent=${!!envelope.briefing.promptBlock?.trim()}`,
    );
    return;
  }

  const { autoSubmit } = localConfig;
  const appendText = autoSubmit ? "/brief-kibi" : `Kibi: ${summary}. Full brief: /brief-kibi`;

  // Deliver based on autoSubmit mode
  if (autoSubmit) {
    if (client.tui?.clearPrompt) {
      await client.tui.clearPrompt();
    }
    if (client.tui?.appendPrompt) {
      await client.tui.appendPrompt(appendText);
    }
    if (client.tui?.submitPrompt) {
      await client.tui.submitPrompt();
    }
  } else {
    if (client.tui?.appendPrompt) {
      await client.tui.appendPrompt(appendText);
    }
  }
}
