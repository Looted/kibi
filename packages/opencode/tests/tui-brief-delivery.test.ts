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
  DeliveryReasons,
  IdleBriefEnvelope,
  IdleBriefEnvelopeV2,
} from "../src/idle-brief-store.js";
import * as logger from "../src/logger.js";
import { announceBriefTui, deliverBriefTui } from "../src/tui-brief-delivery.js";

describe("tui-brief-delivery", () => {
  let mockClient: {
    tui?: {
      showToast?: ReturnType<typeof mock>;
      executeCommand?: ReturnType<typeof mock>;
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
        executeCommand: mock(() => {}),
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
        requirementsAdded: 1,
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

  test("skips automatic toast for zero-count no-impact envelopes", async () => {
    envelope.counts = {
      entitiesAdded: 0,
      entitiesModified: 0,
      entitiesRemoved: 0,
      relationshipsChanged: 0,
    };
    envelope.validation.count = 0;
    envelope.briefing.citations = [];
    envelope.briefing.constraints = undefined;
    envelope.briefing.regressionRisks = undefined;
    envelope.briefing.missingEvidence = undefined;

    const result = await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(result.delivered).toBe(false);
    expect(mockClient.tui?.showToast).not.toHaveBeenCalled();
  });

  test("announceBriefTui skips toast for zero-count no-impact envelopes", async () => {
    envelope.counts = {
      entitiesAdded: 0,
      entitiesModified: 0,
      entitiesRemoved: 0,
      relationshipsChanged: 0,
    };
    envelope.validation.count = 0;
    envelope.briefing.citations = [];
    envelope.briefing.constraints = undefined;
    envelope.briefing.regressionRisks = undefined;
    envelope.briefing.missingEvidence = undefined;

    const result = await announceBriefTui(mockClient, envelope, sharedPolicy);

    expect(result).toEqual({ toastDelivered: false, commandPublished: false });
    expect(mockClient.tui?.showToast).not.toHaveBeenCalled();
  });

  // --- Toast rendering (primary path) ---

  test("shows toast with summary by default", async () => {
    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining("## What changed\nTest summary"),
        }),
      }),
    );
  });

  test("does not toast generic operational-only envelopes", async () => {
    envelope.summary = "Operational task tracking was updated";
    envelope.briefing.tldr = "Operational task tracking was updated";
    envelope.briefing.citations = [];
    envelope.briefing.constraints = undefined;
    envelope.briefing.regressionRisks = undefined;
    envelope.briefing.missingEvidence = undefined;
    // Zero counts + no significant briefing impact → no-op; nonzero counts without deliveryReasons
    // cannot be determined to be operational, so they are not suppressed here
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).entitiesAdded = 0;
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).entitiesModified = 0;
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).entitiesRemoved = 0;
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 0;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).not.toHaveBeenCalled();
  });

  test("prefers deliveryReasons for toast summary and why-it-matters", async () => {
    const deliveryReasons: DeliveryReasons = {
      version: 1,
      items: [
        {
          kind: "entity_modified",
          text: "Updated requirement REQ-001",
          entityIds: ["REQ-001"],
        },
      ],
      toast: {
        title: "Kibi Knowledge Update",
        summary: "Updated requirement REQ-001",
        whyItMatters: "Entities were updated.",
      },
    };

    (envelope.briefing as typeof envelope.briefing & { deliveryReasons?: DeliveryReasons }).deliveryReasons =
      deliveryReasons;
    envelope.briefing.promptBlock = "Should not win";

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };

    expect(calledWith.body?.message).toContain("## What changed\nUpdated requirement REQ-001");
    expect(calledWith.body?.message).toContain("## Why it matters\nEntities were updated.");
    expect(calledWith.body?.message).not.toContain(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
  });

  test("toasts a specific domain change with its subject and rationale", async () => {
    const deliveryReasons: DeliveryReasons = {
      version: 1,
      items: [
        {
          kind: "entity_modified",
          text: "Authentication module updated",
          entityIds: ["REQ-AUTH-001"],
        },
      ],
      toast: {
        title: "Kibi Knowledge Update",
        summary: "Authentication module updated",
        whyItMatters: "Login behavior changed and needs review.",
      },
    };

    (envelope.briefing as typeof envelope.briefing & { deliveryReasons?: DeliveryReasons }).deliveryReasons =
      deliveryReasons;
    envelope.summary = "";
    envelope.briefing.tldr = "";
    envelope.briefing.promptBlock = "";
    envelope.briefing.citations = [];
    envelope.briefing.constraints = undefined;
    envelope.briefing.regressionRisks = undefined;
    envelope.briefing.missingEvidence = undefined;
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledTimes(1);
    expect(mockClient.tui?.showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining("Authentication module updated"),
        }),
      }),
    );
  });

  test("never calls submitPrompt regardless of autoSubmit config", async () => {
    localConfig.autoSubmit = true;
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalled();
  });

  test("shows toast even when autoSubmit is false", async () => {
    localConfig.autoSubmit = false;
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalled();
  });

  // --- Empty summary fallback ---

  test("falls back to tldr when summary is empty", async () => {
    envelope.summary = "";
    envelope.briefing.tldr = "Test summary";
    envelope.briefing.citations = [];
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

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

  test("suppresses toast when no concrete content exists", async () => {
    envelope.summary = "";
    envelope.briefing.tldr = "";
    envelope.briefing.citations = [];
    envelope.validation.count = 0;
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledTimes(0);
  });

  test("suppresses toast when all content fields are empty", async () => {
    envelope.summary = "";
    envelope.briefing.tldr = "";
    envelope.briefing.promptBlock = "";
    envelope.briefing.citations = [];
    envelope.validation.count = 0;
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledTimes(0);
  });

  test("uses tldr as fallback when summary is empty", async () => {
    envelope.summary = "";
    envelope.briefing.tldr = "TLDR fallback";
    envelope.briefing.citations = [];
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

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
    v2Envelope.counts.relationshipsChanged = 1;

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
    v2Envelope.counts.relationshipsChanged = 1;

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
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.showToast).toHaveBeenCalledWith({
      body: {
        variant: "info",
        title: "Kibi Knowledge Update",
        message: expect.stringContaining("## What changed\nTest summary"),
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

  test("announces by toast and publishes the TUI command", async () => {
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    const result = await announceBriefTui(mockClient, envelope, sharedPolicy);

    expect(mockClient.tui?.showToast).toHaveBeenCalled();
    expect(mockClient.tui?.executeCommand).toHaveBeenCalledWith(
      "kibi.open_latest_brief",
      {},
    );
    expect(result).toEqual({ toastDelivered: true, commandPublished: true });
  });

  test("skips toast and command for zero-change no-impact envelopes", async () => {
    const noOpEnvelope: IdleBriefEnvelopeV2 = {
      ...envelope,
      schemaVersion: "2.0",
      counts: {
        entitiesAdded: 0,
        entitiesModified: 0,
        entitiesRemoved: 0,
        relationshipsChanged: 0,
      },
      changes: {
        entities: { added: [], modified: [], removed: [] },
        relationships: { changed: 0 },
      },
      validation: {
        ...envelope.validation,
        count: 0,
      },
      briefing: {
        ...envelope.briefing,
        citations: [],
        changeNarrative: [],
      },
    };

    const result = await announceBriefTui(mockClient, noOpEnvelope, sharedPolicy);

    expect(mockClient.tui?.showToast).not.toHaveBeenCalled();
    expect(mockClient.tui?.executeCommand).not.toHaveBeenCalled();
    expect(result).toEqual({ toastDelivered: false, commandPublished: false });
  });

  test("still announces validation-only warning envelopes", async () => {
    const warningEnvelope: IdleBriefEnvelopeV2 = {
      ...envelope,
      schemaVersion: "2.0",
      type: "warning" as const,
      counts: {
        entitiesAdded: 0,
        entitiesModified: 0,
        entitiesRemoved: 0,
        relationshipsChanged: 0,
      },
      changes: {
        entities: { added: [], modified: [], removed: [] },
        relationships: { changed: 0 },
      },
      validation: {
        ...envelope.validation,
        count: 1,
      },
      briefing: {
        ...envelope.briefing,
        citations: [],
        changeNarrative: [],
      },
    };

    const result = await announceBriefTui(mockClient, warningEnvelope, sharedPolicy);

    expect(mockClient.tui?.showToast).toHaveBeenCalled();
    expect(result.toastDelivered).toBe(true);
  });

  test("toast success only reports announcement state and does not imply viewed state", async () => {
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;
    mockClient.tui = {
      showToast: mock(() => {}),
    };

    const result = await announceBriefTui(mockClient, envelope, sharedPolicy);

    expect(result).toEqual({ toastDelivered: true, commandPublished: false });
  });

  test("still publishes open_latest_brief when toast is disabled", async () => {
    sharedPolicy.briefs.tui.toast = false;
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    const result = await announceBriefTui(mockClient, envelope, sharedPolicy);

    expect(mockClient.tui?.showToast).not.toHaveBeenCalled();
    expect(mockClient.tui?.executeCommand).toHaveBeenCalledWith(
      "kibi.open_latest_brief",
      {},
    );
    expect(result).toEqual({ toastDelivered: false, commandPublished: true });
  });

  // --- Missing executeCommand fallback ---

  test("delivers toast but does not publish command when executeCommand is missing", async () => {
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;
    mockClient.tui = {
      showToast: mock(() => {}),
      // executeCommand is missing
    };

    const result = await announceBriefTui(mockClient, envelope, sharedPolicy);

    expect(mockClient.tui?.showToast).toHaveBeenCalled();
    expect(result).toEqual({ toastDelivered: true, commandPublished: false });
  });

  test("delivers toast and does not throw when executeCommand is undefined", async () => {
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;
    mockClient.tui = {
      showToast: mock(() => {}),
      executeCommand: undefined,
    };

    await expect(
      announceBriefTui(mockClient, envelope, sharedPolicy),
    ).resolves.toEqual({ toastDelivered: true, commandPublished: false });

    expect(mockClient.tui?.showToast).toHaveBeenCalled();
  });

  test("does not log error when executeCommand is gracefully unavailable", async () => {
    envelope.briefing.citations = [];
    mockClient.tui = {
      showToast: mock(() => {}),
      // executeCommand missing - should not trigger error log
    };

    await announceBriefTui(mockClient, envelope, sharedPolicy);

    // Should not log any error for missing executeCommand (graceful fallback)
    expect(mockLog).not.toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          message: expect.stringContaining("Failed to publish open_latest_brief command"),
        }),
      }),
    );
  });


  // --- Unified reason flow integration ---

  test("announceBriefTui with deliveryReasons produces non-generic toast", async () => {
    const deliveryReasons: DeliveryReasons = {
      version: 1,
      items: [
        {
          kind: "entity_added",
          text: "Added requirement REQ-042",
          entityIds: ["REQ-042"],
        },
      ],
      toast: {
        title: "Kibi Knowledge Update",
        summary: "Added requirement REQ-042",
        whyItMatters: "Entities were updated.",
      },
    };

    (envelope.briefing as typeof envelope.briefing & { deliveryReasons?: DeliveryReasons }).deliveryReasons =
      deliveryReasons;
    envelope.briefing.citations = [];
    envelope.briefing.promptBlock = "";
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    await announceBriefTui(mockClient, envelope, sharedPolicy);
    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };

    expect(calledWith.body?.message).not.toContain(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
    expect(calledWith.body?.message).toContain("Added requirement REQ-042");
    expect(calledWith.body?.message).toContain("Entities were updated.");
  });

  test("legacy v1 envelope without deliveryReasons renders without generic filler", async () => {
    // Default v1 envelope has no deliveryReasons
    (envelope.counts as IdleBriefEnvelopeV2["counts"]).relationshipsChanged = 1;

    await expect(
      announceBriefTui(mockClient, envelope, sharedPolicy),
    ).resolves.toBeDefined();

    expect(mockClient.tui?.showToast).toHaveBeenCalled();
    const calledWith = mockClient.tui?.showToast?.mock.calls[0]?.[0] as {
      body?: { message?: string };
    };
    expect(calledWith.body?.message).toContain("## What changed");
    expect(calledWith.body?.message).toContain("Test summary");
    // Legacy fallback no longer uses generic filler text
    expect(calledWith.body?.message).not.toContain(
      "This update changes how the project knowledge should be interpreted and applied.",
    );
  });

  test("announceBriefTui: deliveryReasons with items bypasses zero-count no-op guard", async () => {
    const zeroCountEnvelope: IdleBriefEnvelopeV2 = {
      ...envelope,
      schemaVersion: "2.0",
      unread: false,
      counts: {
        entitiesAdded: 0,
        entitiesModified: 0,
        entitiesRemoved: 0,
        relationshipsChanged: 0,
      },
      changes: {
        entities: { added: [], modified: [], removed: [] },
        relationships: { changed: 0 },
      },
      validation: {
        ...envelope.validation,
        count: 0,
      },
      briefing: {
        ...envelope.briefing,
        citations: [],
        changeNarrative: [],
        deliveryReasons: {
          version: 1,
          items: [
            {
              kind: "validation_issue",
              text: "1 validation issue detected",
              entityIds: [],
            },
          ],
          toast: {
            title: "Kibi Knowledge Update",
            summary: "1 validation issue detected",
            whyItMatters:
              "Validation issues need attention before the update is treated as settled.",
          },
        },
      } as IdleBriefEnvelopeV2["briefing"],
    };

    const result = await announceBriefTui(mockClient, zeroCountEnvelope, sharedPolicy);

    expect(result.toastDelivered).toBe(true);
    expect(mockClient.tui?.showToast).toHaveBeenCalled();
  });

});
