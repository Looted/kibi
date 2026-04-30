/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import type { IdleBriefEnvelope } from "../src/idle-brief-store.js";
import { deliverBriefTui } from "../src/tui-brief-delivery.js";
import * as logger from "../src/logger.js";

describe("tui-brief-delivery", () => {
  let mockClient: {
    tui?: {
      showToast?: ReturnType<typeof mock>;
      appendPrompt?: ReturnType<typeof mock>;
      submitPrompt?: ReturnType<typeof mock>;
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
  let mockLog: ReturnType<typeof mock>;

  beforeEach(() => {
    mockLog = mock(() => Promise.resolve());
    logger.setClient({ app: { log: mockLog } });

    mockClient = {
      tui: {
        showToast: mock(() => {}),
        appendPrompt: mock(() => Promise.resolve()),
        submitPrompt: mock(() => Promise.resolve()),
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
      autoSubmit: false,
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

  afterEach(() => {
    logger.resetClient();
  });

  // --- Channel gating ---

  test("returns early when TUI delivery is disabled by shared policy", async () => {
    sharedPolicy.briefs.channels.tui = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).not.toHaveBeenCalled();
    expect(mockClient.tui?.appendPrompt).not.toHaveBeenCalled();
  });

  // --- Append-only rendering (primary path) ---

  test("appends promptBlock to prompt buffer", async () => {
    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.appendPrompt).toHaveBeenCalledWith(
      "Test prompt block",
    );
  });

  test("never calls submitPrompt regardless of autoSubmit config", async () => {
    localConfig.autoSubmit = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.submitPrompt).not.toHaveBeenCalled();
  });

  test("appends even when autoSubmit is false", async () => {
    localConfig.autoSubmit = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.appendPrompt).toHaveBeenCalledWith(
      "Test prompt block",
    );
  });

  // --- Empty promptBlock fallback ---

  test("falls back to summary when promptBlock is empty", async () => {
    envelope.briefing.promptBlock = "";

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.appendPrompt?.mock.calls[0]?.[0] as string;
    expect(calledWith).toContain("Test summary");
    expect(calledWith).not.toBe("");
  });

  test("includes citations in fallback when promptBlock is empty", async () => {
    envelope.briefing.promptBlock = "";

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.appendPrompt?.mock.calls[0]?.[0] as string;
    expect(calledWith).toContain("REQ-001");
    expect(calledWith).toContain("Linked requirement");
  });

  test("includes validation signal in fallback when violations exist", async () => {
    envelope.briefing.promptBlock = "";
    envelope.validation.count = 3;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.appendPrompt?.mock.calls[0]?.[0] as string;
    expect(calledWith).toContain("Validation: 3 issue(s)");
  });

  test("produces non-empty fallback even with minimal envelope", async () => {
    envelope.briefing.promptBlock = "";
    envelope.summary = "";
    envelope.briefing.tldr = "";
    envelope.briefing.citations = [];
    envelope.validation.count = 0;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.appendPrompt?.mock.calls[0]?.[0] as string;
    expect(calledWith.length).toBeGreaterThan(0);
    expect(calledWith).toBe("Brief available");
  });

  test("uses tldr as fallback when summary is empty", async () => {
    envelope.briefing.promptBlock = "";
    envelope.summary = "";
    envelope.briefing.tldr = "TLDR fallback";
    envelope.briefing.citations = [];

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.appendPrompt?.mock.calls[0]?.[0] as string;
    expect(calledWith).toBe("TLDR fallback");
  });

  // --- Optional toast (not a success-path requirement) ---

  test("shows optional toast when toast is enabled and capability exists", async () => {
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledWith({
      body: {
        variant: "info",
        title: "Kibi",
        message: "Test summary",
        duration: 5000,
      },
    });
  });

  test("does not show toast when disabled", async () => {
    sharedPolicy.briefs.tui.toast = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).not.toHaveBeenCalled();
  });

  test("uses warning toast variant for warning envelope type", async () => {
    envelope.type = "warning";
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ variant: "warning" }),
      }),
    );
  });

  test("uses info toast variant for success envelope type", async () => {
    envelope.type = "success";
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({ variant: "info" }),
      }),
    );
  });

  test("appends prompt even when toast is disabled", async () => {
    sharedPolicy.briefs.tui.toast = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.appendPrompt).toHaveBeenCalledWith(
      "Test prompt block",
    );
  });

  // --- Graceful no-op when TUI capability unavailable ---

  test("does not throw when client.tui is undefined", async () => {
    const clientWithoutTui: Parameters<typeof deliverBriefTui>[0] = {};

    await expect(
      deliverBriefTui(clientWithoutTui, envelope, sharedPolicy, localConfig),
    ).resolves.toEqual({ appended: false });
  });

  test("does not throw when appendPrompt is missing but showToast exists", async () => {
    mockClient.tui = {
      showToast: mock(() => {}),
    };

    await expect(
      deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig),
    ).resolves.toEqual({ appended: false });
  });

  test("logs info when appendPrompt is unavailable", async () => {
    mockClient.tui = {
      showToast: mock(() => {}),
    };

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining("appendPrompt API unavailable"),
        }),
      }),
    );
  });

  // --- Delivery result contract ---

  test("returns appended result when appendPrompt succeeds", async () => {
    const result = await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(result).toEqual({ appended: true });
  });

  test("returns append-unavailable result when appendPrompt is missing", async () => {
    mockClient.tui = {
      showToast: mock(() => {}),
    };

    const result = await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(result).toEqual({ appended: false });
  });

  test("returns append-failed result when appendPrompt throws", async () => {
    mockClient.tui!.appendPrompt = mock(() => {
      throw new Error("append failed");
    });

    const result = await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(result).toEqual({ appended: false });
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining("Failed to append"),
        }),
      }),
    );
  });

  test("returns not-appended when TUI channel disabled", async () => {
    sharedPolicy.briefs.channels.tui = false;

    const result = await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(result).toEqual({ appended: false });
  });
});