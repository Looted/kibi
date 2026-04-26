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
    toast?: (payload: ToastPayload) => void | Promise<void>;
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
 * - client.tui.toast(payload) - legacy toast API
 *
 * Note: autoSubmit via appendPrompt/clearPrompt/submitPrompt is NOT supported
 * because OpenCode doesn't provide these APIs.
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

  // Show toast using legacy API (the real OpenCode API)
  if (toast && typeof client.tui?.toast === "function") {
    await client.tui.toast({
      variant: envelope.type === "warning" ? "warning" : "info",
      title: "Kibi",
      message: summary,
      duration: 5000,
    });
  }

  // Note: appendPrompt/submitPrompt are not available in OpenCode
  // autoSubmit is ignored - user must use /brief-kibi manually
  if (localConfig.autoSubmit) {
    logger.info("autoSubmit requested but not supported by OpenCode API");
  }
}
