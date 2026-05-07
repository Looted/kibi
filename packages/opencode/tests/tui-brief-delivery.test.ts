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

import type {
  IdleBriefEnvelope,
  IdleBriefEnvelopeV2,
} from "../src/idle-brief-store.js";
import * as logger from "../src/logger.js";
import { deliverBriefTui } from "../src/tui-brief-delivery.js";

describe("tui-brief-delivery", () => {
  let mockClient: {
    tui?: {
      showToast?: ReturnType<typeof mock>;
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
        citations: [
          { id: "REQ-001", type: "req", title: "Linked requirement" },
        ],
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
  });

  // --- Toast rendering (primary path) ---

  test("shows toast with summary by default", async () => {
    envelope.briefing.citations = [];
    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message:
            "## What changed\nTest summary\n\n## Why it matters\nTest prompt block",
        }),
      }),
    );
  });

  test("never calls submitPrompt regardless of autoSubmit config", async () => {
    localConfig.autoSubmit = true;
    envelope.briefing.citations = [];

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalled();
  });

  test("shows toast even when autoSubmit is false", async () => {
    localConfig.autoSubmit = false;
    envelope.briefing.citations = [];

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalled();
  });

  // --- Empty summary fallback ---

  test("falls back to tldr when summary is empty", async () => {
    envelope.summary = "";
    envelope.briefing.tldr = "Test summary";
    envelope.briefing.citations = [];

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };
    expect(calledWith.body?.message).toContain("Test summary");
  });

  test("includes citations in toast message when citations exist", async () => {
    envelope.briefing.citations = [
      { id: "REQ-001", type: "req", title: "Linked requirement" },
      { id: "REQ-002", type: "req", title: "Another requirement" },
    ];

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };
    expect(calledWith.body?.message).toContain("## Project knowledge impact");
    expect(calledWith.body?.message).toContain("- **REQ-001**: Linked requirement");
    expect(calledWith.body?.message).toContain("- **REQ-002**: Another requirement");
  });

  test("includes validation signal in toast when violations exist", async () => {
    envelope.briefing.citations = [];
    envelope.validation.count = 3;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };
    expect(calledWith.body?.message).toContain("## Interpretation note");
    expect(calledWith.body?.message).toContain(
      "Validation checks reported unresolved items: 3 issue(s).",
    );
  });

  test("produces non-empty toast even with minimal envelope", async () => {
    envelope.summary = "";
    envelope.briefing.tldr = "";
    envelope.briefing.citations = [];
    envelope.validation.count = 0;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };
    expect(calledWith.body?.message).toContain("## What changed");
    expect(calledWith.body?.message).toContain(
      "Knowledge updates were recorded in this brief.",
    );
  });

  test("uses tldr as fallback when summary is empty", async () => {
    envelope.summary = "";
    envelope.briefing.tldr = "TLDR fallback";
    envelope.briefing.citations = [];

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };
    expect(calledWith.body?.message).toContain("## What changed\nTLDR fallback");
  });

  test("shows schema-2.0 change narrative in toast message", async () => {
    const v2Envelope = envelope as IdleBriefEnvelopeV2;
    v2Envelope.schemaVersion = "2.0";
    v2Envelope.briefing.changeNarrative = [
      "Modified REQ-001: Tightened summary language",
      "Added TEST-002: Covers new toast fallback",
      "Removed obsolete note",
    ];
    v2Envelope.changes = {
      entities: {
        added: [],
        modified: [
          { id: "REQ-001", type: "req", title: "Tightened summary language" },
        ],
        removed: [],
      },
      relationships: { changed: 0 },
    };
    v2Envelope.briefing.citations = [];

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };
    expect(calledWith.body?.message).toContain("## What changed");
    expect(calledWith.body?.message).toContain("Modified REQ-001: Tightened summary language");
    expect(calledWith.body?.message).toContain("Added TEST-002: Covers new toast fallback");
    expect(calledWith.body?.message).not.toContain("Removed obsolete note");
  });

  test("falls back to schema-2.0 entity headline when narrative is empty", async () => {
    const v2Envelope = envelope as IdleBriefEnvelopeV2;
    v2Envelope.schemaVersion = "2.0";
    v2Envelope.summary = "";
    v2Envelope.briefing.tldr = "";
    v2Envelope.briefing.changeNarrative = [];
    v2Envelope.changes = {
      entities: {
        added: [
          { id: "TEST-002", type: "test", title: "Covers new toast fallback" },
        ],
        modified: [],
        removed: [],
      },
      relationships: { changed: 0 },
    };
    v2Envelope.briefing.citations = [];

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };
    expect(calledWith.body?.message).toContain("## What changed");
    expect(calledWith.body?.message).toContain("Added TEST-002: Covers new toast fallback");
  });

  // --- Optional toast (not a success-path requirement) ---

  test("shows optional toast when toast is enabled and capability exists", async () => {
    sharedPolicy.briefs.tui.toast = true;
    envelope.briefing.citations = [];

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledWith({
      body: {
        variant: "info",
        title: "Kibi Knowledge Update",
        message:
          "## What changed\nTest summary\n\n## Why it matters\nTest prompt block",
        duration: 8000,
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

  test("does not show toast when toast is disabled", async () => {
    sharedPolicy.briefs.tui.toast = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).not.toHaveBeenCalled();
  });

  // --- Graceful no-op when TUI capability unavailable ---

  test("does not throw when client.tui is undefined", async () => {
    const clientWithoutTui: Parameters<typeof deliverBriefTui>[0] = {};

    await expect(
      deliverBriefTui(clientWithoutTui, envelope, sharedPolicy, localConfig),
    ).resolves.toEqual({ delivered: false });
  });

  test("does not throw when showToast is missing", async () => {
    mockClient.tui = {};

    await expect(
      deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig),
    ).resolves.toEqual({ delivered: false });
  });

  test("logs info when showToast is unavailable", async () => {
    mockClient.tui = {};

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining("showToast API unavailable"),
        }),
      }),
    );
  });

  // --- Delivery result contract ---

  test("returns delivered result when showToast succeeds", async () => {
    const result = await deliverBriefTui(
      mockClient,
      envelope,
      sharedPolicy,
      localConfig,
    );

    expect(result).toEqual({ delivered: true });
  });

  test("returns not-delivered result when showToast is missing", async () => {
    mockClient.tui = {};

    const result = await deliverBriefTui(
      mockClient,
      envelope,
      sharedPolicy,
      localConfig,
    );

    expect(result).toEqual({ delivered: false });
  });

  test("returns not-delivered result when showToast throws", async () => {
    mockClient.tui = {
      showToast: mock(() => {
        throw new Error("showToast failed");
      }),
    };

    const result = await deliverBriefTui(
      mockClient,
      envelope,
      sharedPolicy,
      localConfig,
    );

    expect(result).toEqual({ delivered: false });
    expect(mockLog).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining("Failed to deliver brief toast"),
        }),
      }),
    );
  });

  test("returns not-delivered when TUI channel disabled", async () => {
    sharedPolicy.briefs.channels.tui = false;

    const result = await deliverBriefTui(
      mockClient,
      envelope,
      sharedPolicy,
      localConfig,
    );

    expect(result).toEqual({ delivered: false });
  });
});
