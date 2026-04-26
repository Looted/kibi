/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { beforeEach, describe, expect, mock, test } from "bun:test";

import type { BriefingEnvelope } from "../src/idle-brief-runtime.js";
import { deliverBriefTui } from "../src/tui-brief-delivery.js";

describe("tui-brief-delivery", () => {
  let mockClient: {
    tui: {
      showToast?: (payload: { body: { variant?: string; title?: string; message: string; duration?: number } }) => void | Promise<void>;
      appendPrompt?: (text: string) => void | Promise<void>;
      clearPrompt?: () => void | Promise<void>;
      submitPrompt?: () => void | Promise<void>;
    };
  };

  let sharedPolicy: {
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

  let localConfig: {
    autoSubmit: boolean;
  };

  let envelope: BriefingEnvelope;

  beforeEach(() => {
    mockClient = {
      tui: {
        showToast: mock(),
        appendPrompt: mock(),
        clearPrompt: mock(),
        submitPrompt: mock(),
      },
    };

    sharedPolicy = {
      briefs: {
        enabled: true,
        channels: {
          tui: true,
          vscode: true,
        },
        tui: {
          toast: true,
          appendPrompt: true,
        },
      },
    };

    localConfig = {
      autoSubmit: true,
    };

    envelope = {
      id: "test-id",
      sessionId: "test-session",
      contentHash: "test-hash",
      createdAt: new Date().toISOString(),
      briefing: {
        summary: "Test summary",
        citedReqs: ["REQ-001"],
        citedSyms: ["SYM-001"],
        promptBlock: "Test prompt block",
      },
    };
  });

  test("returns early when TUI delivery is disabled", async () => {
    sharedPolicy.briefs.channels.tui = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.showToast).not.toHaveBeenCalled();
    expect(mockClient.tui!.appendPrompt).not.toHaveBeenCalled();
    expect(mockClient.tui!.clearPrompt).not.toHaveBeenCalled();
    expect(mockClient.tui!.submitPrompt).not.toHaveBeenCalled();
  });

  test("shows toast when enabled", async () => {
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.showToast).toHaveBeenCalledWith({
      body: expect.objectContaining({
        message: "Test summary",
        variant: "info",
        title: "Kibi",
      }),
    });
  });

  test("does not show toast when disabled", async () => {
    sharedPolicy.briefs.tui.toast = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.showToast).not.toHaveBeenCalled();
  });

  test("auto-submit mode clears, appends, and submits", async () => {
    localConfig.autoSubmit = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.clearPrompt).toHaveBeenCalled();
    expect(mockClient.tui!.appendPrompt).toHaveBeenCalledWith("/brief-kibi");
    expect(mockClient.tui!.submitPrompt).toHaveBeenCalled();
  });

  test("append-only mode appends one-line hint", async () => {
    localConfig.autoSubmit = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.clearPrompt).not.toHaveBeenCalled();
    expect(mockClient.tui!.appendPrompt).toHaveBeenCalledWith("Kibi: Test summary. Full brief: /brief-kibi");
    expect(mockClient.tui!.submitPrompt).not.toHaveBeenCalled();
  });

  test("skips append/submit when promptBlock is empty", async () => {
    envelope.briefing.promptBlock = "";

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.appendPrompt).not.toHaveBeenCalled();
    expect(mockClient.tui!.submitPrompt).not.toHaveBeenCalled();
  });

  test("skips toast when appendPrompt is disabled", async () => {
    sharedPolicy.briefs.tui.appendPrompt = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.appendPrompt).not.toHaveBeenCalled();
    expect(mockClient.tui!.submitPrompt).not.toHaveBeenCalled();
  });
});
