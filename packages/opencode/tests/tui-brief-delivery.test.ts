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
      toast?: ReturnType<typeof mock>;
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
    logger.setClient({ app: { log: mockLog } } as any);

    mockClient = {
      tui: {
        toast: mock(() => {}),
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
        citations: [{ id: "REQ-001", type: "req", title: "Linked requirement" }],
      },
      contentHash: "test-hash",
    };
  });

  afterEach(() => {
    logger.resetClient();
  });

  test("returns early when TUI delivery is disabled", async () => {
    sharedPolicy.briefs.channels.tui = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.toast).not.toHaveBeenCalled();
  });

  test("shows toast when enabled", async () => {
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.toast).toHaveBeenCalledWith({
      variant: "info",
      title: "Kibi",
      message: "Test summary",
      duration: 5000,
    });
  });

  test("does not show toast when disabled", async () => {
    sharedPolicy.briefs.tui.toast = false;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.toast).not.toHaveBeenCalled();
  });

  test("uses warning toast variant for warning envelope type", async () => {
    envelope.type = "warning";
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "warning",
      }),
    );
  });

  test("uses info toast variant for success envelope type", async () => {
    envelope.type = "success";
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockClient.tui?.toast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: "info",
      }),
    );
  });

  test("does not throw when client.tui is undefined", async () => {
    const clientWithoutTui = {};

    await expect(
      deliverBriefTui(clientWithoutTui as any, envelope, sharedPolicy, localConfig),
    ).resolves.toBeUndefined();
  });

  test("logs autoSubmit message when enabled", async () => {
    localConfig.autoSubmit = true;
    sharedPolicy.briefs.tui.toast = true;

    await deliverBriefTui(mockClient, envelope, sharedPolicy, localConfig);

    expect(mockLog).toHaveBeenCalled();
    const call = mockLog.mock.calls[0];
    expect(call[0].body.message).toBe(
      "autoSubmit requested but not supported by OpenCode API",
    );
  });
});
