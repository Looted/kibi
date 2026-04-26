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

import type { IdleBriefEnvelope } from "../src/idle-brief-store.js";
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

  let envelope: IdleBriefEnvelope;

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
      schemaVersion: "1.0",
      briefId: "test-id",
      type: "success",
      sessionId: "test-session",
      branch: "main",
      createdAt: new Date().toISOString(),
      unread: false,
      auditCursor: {
        lastTimestamp: "2024-01-01T00:00:00Z",
        lastOperation: "test",
        entryCount: 0,
        fileSize: 0,
      },
      summary: "Test summary",
      counts: {
        requirementsAdded: 0,
        relationshipsAdded: 0,
        entitiesDeleted: 0,
      },
      validation: {
        violations: [],
        count: 0,
        diagnostics: [],
      },
      briefing: {
        tldr: "Test summary",
        promptBlock: "Test prompt block",
        citations: [{ id: "REQ-001", type: "req", title: "Linked requirement" }],
      },
      contentHash: "test-hash",
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
    const emptyEnvelope: IdleBriefEnvelope = {
      ...envelope,
      briefing: { ...envelope.briefing, promptBlock: "" },
    };

    await deliverBriefTui(mockClient, emptyEnvelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.appendPrompt).not.toHaveBeenCalled();
    expect(mockClient.tui!.submitPrompt).not.toHaveBeenCalled();
  });

  test("skips toast when appendPrompt is disabled", async () => {
    sharedPolicy.briefs.tui.appendPrompt = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.appendPrompt).not.toHaveBeenCalled();
    expect(mockClient.tui!.submitPrompt).not.toHaveBeenCalled();
  });

  // New tests: missing prompt capabilities (coverage for Task 5)
  test("missing appendPrompt capability still shows toast in non-autoSubmit mode", async () => {
    const partialClient = {
      tui: {
        showToast: mock(),
        clearPrompt: mock(),
        // appendPrompt: undefined (missing)
        submitPrompt: mock(),
      },
    };
    localConfig.autoSubmit = false;

    await deliverBriefTui(partialClient as any, envelope, sharedPolicy, localConfig);

    expect(partialClient.tui!.showToast).toHaveBeenCalled();
  });

  test("empty promptBlock with no TUI capabilities returns early silently", async () => {
    const noToastClient = {
      tui: {
        // No showToast
        appendPrompt: mock(),
        clearPrompt: mock(),
        submitPrompt: mock(),
      },
    };
    const emptyEnvelope: IdleBriefEnvelope = {
      ...envelope,
      briefing: { ...envelope.briefing, promptBlock: "" },
    };

    await deliverBriefTui(noToastClient as any, emptyEnvelope, sharedPolicy, localConfig);

    expect(noToastClient.tui!.appendPrompt).not.toHaveBeenCalled();
    expect(noToastClient.tui!.clearPrompt).not.toHaveBeenCalled();
    expect(noToastClient.tui!.submitPrompt).not.toHaveBeenCalled();
  });

  // New tests: envelope type variants (coverage for Task 5)
  test("uses warning toast variant for warning envelope type", async () => {
    envelope.type = "warning";
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient as any, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.showToast).toHaveBeenCalledWith({
      body: expect.objectContaining({
        variant: "warning",
      }),
    });
  });

  test("uses info toast variant for default envelope type", async () => {
    envelope.type = "success";
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient as any, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui!.showToast).toHaveBeenCalledWith({
      body: expect.objectContaining({
        variant: "info",
      }),
    });
  });
});