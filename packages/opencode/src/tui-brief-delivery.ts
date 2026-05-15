/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type { ToastPayload as SendToastPayload, ToastCapableClient as SendToastCapableClient } from "./toast.js";
import { sendToast } from "./toast.js";
import { renderToastSummary } from "./brief-delivery-reasons.js";
import type { DeliveryReasons, IdleBriefEnvelope } from "./idle-brief-store.js";
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
    };
  };
};

export type LocalBriefConfig = {
  autoSubmit: boolean;
};

export type DeliverResult = {
  delivered: boolean;
};

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return undefined;
}


function buildTuiBriefMessage(envelope: IdleBriefEnvelope): string | undefined {
  const lines: string[] = [];
  const briefing = envelope.briefing as typeof envelope.briefing & {
    deliveryReasons?: DeliveryReasons;
  };
  const deliveryReasons = briefing.deliveryReasons;
  const renderedToast = deliveryReasons?.items?.length
    ? renderToastSummary(deliveryReasons)
    : undefined;
  const whatChanged = renderedToast
    ? [renderedToast.summary]
    : envelope.schemaVersion === "2.0"
    ? envelope.briefing.changeNarrative.map((line) => line.trim()).filter(Boolean)
    : [];

  lines.push("## What changed");
  if (whatChanged.length > 0) {
    lines.push(...whatChanged.slice(0, 2));
  } else if (envelope.schemaVersion === "2.0") {
    const fallbackEntity =
      envelope.changes.entities.modified[0] ?? envelope.changes.entities.added[0];
    if (fallbackEntity) {
      const action = envelope.changes.entities.modified[0] ? "Modified" : "Added";
      lines.push(`${action} ${fallbackEntity.id}: ${fallbackEntity.title ?? "Untitled"}`);
    } else {
      const fallback = firstNonEmpty(envelope.summary, envelope.briefing.tldr);
      if (fallback) lines.push(fallback);
    }
  } else {
    const fallback = firstNonEmpty(envelope.summary, envelope.briefing.tldr);
    if (fallback) lines.push(fallback);
  }
  lines.push("");

  const whyItMatters = firstNonEmpty(
    deliveryReasons?.items?.length ? renderedToast?.whyItMatters : undefined,
  );
  if (whyItMatters) {
    lines.push("## Why it matters");
    lines.push(whyItMatters);
    lines.push("");
  }

  const hasKnowledgeImpact =
    envelope.briefing.citations.length > 0 ||
    (envelope.briefing.constraints?.length ?? 0) > 0 ||
    (envelope.briefing.regressionRisks?.length ?? 0) > 0;

  if (hasKnowledgeImpact) {
    lines.push("## Project knowledge impact");
    if (envelope.briefing.citations.length > 0) {
      for (const citation of envelope.briefing.citations) {
        lines.push(
          `- **${citation.id}**${citation.title ? `: ${citation.title}` : ""}${citation.source ? ` (${citation.source})` : ""}`,
        );
      }
    }
    if ((envelope.briefing.constraints?.length ?? 0) > 0) {
      for (const constraint of envelope.briefing.constraints ?? []) {
        lines.push(`- ${constraint.statement}`);
      }
    }
    if ((envelope.briefing.regressionRisks?.length ?? 0) > 0) {
      for (const risk of envelope.briefing.regressionRisks ?? []) {
        lines.push(`- ${risk.statement}`);
      }
    }
    lines.push("");
  }

  const hasMissingEvidence = (envelope.briefing.missingEvidence?.length ?? 0) > 0;
  if (envelope.validation.count > 0 || hasMissingEvidence) {
    lines.push("## Interpretation note");
    if (envelope.validation.count > 0) {
      lines.push(
        `Validation checks reported unresolved items: ${envelope.validation.count} issue(s).`,
      );
    }
    if (hasMissingEvidence) {
      lines.push("This brief includes unresolved evidence notes:");
      for (const item of envelope.briefing.missingEvidence ?? []) {
        lines.push(`- ${item.statement}`);
      }
    }
    lines.push("");
  }

  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  const result = lines.join("\n");
  if (result === "## What changed") {
    return undefined;
  }
  return result;
}

function buildTuiBriefToastPayload(envelope: IdleBriefEnvelope): SendToastPayload | undefined {
  const message = buildTuiBriefMessage(envelope);
  if (message === undefined) {
    return undefined;
  }
  return {
    variant: envelope.type === "warning" ? "warning" : "info",
    title: "Kibi Knowledge Update",
    message,
    duration: 8000,
  };
}

function hasSignificantBriefingImpact(envelope: IdleBriefEnvelope): boolean {
  const briefing = envelope.briefing;
  return !(
    briefing.citations.length === 0 &&
    (!briefing.constraints || briefing.constraints.length === 0) &&
    (!briefing.regressionRisks || briefing.regressionRisks.length === 0) &&
    (!briefing.missingEvidence || briefing.missingEvidence.length === 0)
  );
}

function isNoOpBriefEnvelope(envelope: IdleBriefEnvelope): boolean {
  const counts = envelope.counts;
  const zeroCounts =
    "relationshipsChanged" in counts
      ? counts.entitiesAdded === 0 &&
        counts.entitiesModified === 0 &&
        counts.entitiesRemoved === 0 &&
        counts.relationshipsChanged === 0
      : counts.requirementsAdded === 0 &&
        counts.relationshipsAdded === 0 &&
        counts.entitiesDeleted === 0;

  const briefing = envelope.briefing as typeof envelope.briefing & {
    deliveryReasons?: DeliveryReasons;
  };
  const hasDeliveryReasons = (briefing.deliveryReasons?.items.length ?? 0) > 0;

  if (hasDeliveryReasons) {
    const toast = briefing.deliveryReasons ? renderToastSummary(briefing.deliveryReasons) : undefined;
    if (toast === undefined) return true; // all operational → no-op
    return false;
  }

  // Generic operational envelope: same summary/tldr, no deliveryReasons, no impact
  const isGenericOperational =
    envelope.validation.count === 0 &&
    !hasSignificantBriefingImpact(envelope) &&
    envelope.summary.trim() === envelope.briefing.tldr.trim() &&
    envelope.summary.trim().length > 0;

  return (
    (zeroCounts &&
      envelope.validation.count === 0 &&
      !hasSignificantBriefingImpact(envelope)) ||
    isGenericOperational
  );
}

function getEnvelopeChangeTotal(envelope: IdleBriefEnvelope): number {
  const counts = envelope.counts;
  return "relationshipsChanged" in counts
    ? counts.entitiesAdded +
        counts.entitiesModified +
        counts.entitiesRemoved +
        counts.relationshipsChanged
    : counts.requirementsAdded + counts.relationshipsAdded + counts.entitiesDeleted;
}

/**
 * Delivers a Kibi briefing to the TUI via toast notification.
 *
 * Uses the REAL OpenCode plugin API:
 * - client.tui.showToast(payload) — primary (and only) delivery mechanism
 *
 * The toast contains a rich summary from the envelope and is displayed
 * for 8 seconds so users can read the content.
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
  _localConfig: LocalBriefConfig,
): Promise<DeliverResult> {
  // Early exit if TUI delivery is disabled
  if (!sharedPolicy.briefs.channels.tui) {
    logger.info("TUI brief delivery disabled by shared policy");
    return { delivered: false };
  }

  const tui = client.tui;

  // Toast is the primary delivery mechanism
  if (sharedPolicy.briefs.tui.toast && typeof tui?.showToast === "function") {
    if (isNoOpBriefEnvelope(envelope)) {
      return { delivered: false };
    }
    try {
      const message = buildTuiBriefMessage(envelope);
      if (message === undefined) {
        return { delivered: false };
      }

      await tui.showToast({
        body: {
          variant: envelope.type === "warning" ? "warning" : "info",
          title: "Kibi Knowledge Update",
          message,
          duration: 8000,
        },
      });
      return { delivered: true };
    } catch (err) {
      logger.error("Failed to deliver brief toast", {
        event: "idle_brief_toast_failed",
        error: err instanceof Error ? err.message : String(err),
      });
      return { delivered: false };
    }
  } else {
    logger.info("TUI showToast API unavailable, brief not delivered");
    return { delivered: false };
  }
}

/**
 * Client type for announcement-only TUI delivery.
 * Extends toast capability with the SDK command bridge.
 */
export type AnnouncementClient = SendToastCapableClient;

export type AnnouncementResult = {
  toastDelivered: boolean;
  commandPublished: boolean;
};

/**
 * Announcement-only TUI delivery coordinator.
 *
 * Sends the summary toast and invokes the official SDK bridge
 * (`executeCommand`) but does NOT mutate read/seen state.
 * The caller is responsible for any state transitions after the
 * TUI route confirms render success.
 */
export async function announceBriefTui( // implements REQ-opencode-kibi-briefing-v6
  client: AnnouncementClient,
  envelope: IdleBriefEnvelope,
  sharedPolicy: SharedBriefPolicy,
): Promise<AnnouncementResult> {
  if (!sharedPolicy.briefs.channels.tui) {
    logger.info("TUI brief delivery disabled by shared policy");
    return { toastDelivered: false, commandPublished: false };
  }

  const briefing = envelope.briefing as typeof envelope.briefing & {
    deliveryReasons?: DeliveryReasons;
  };
  if (
    !envelope.unread &&
    isNoOpBriefEnvelope(envelope) &&
    !(briefing.deliveryReasons?.items.length ?? 0)
  ) {
    return { toastDelivered: false, commandPublished: false };
  }
  const totalChanges = getEnvelopeChangeTotal(envelope);
  const hasDeliveryReasons = (briefing.deliveryReasons?.items.length ?? 0) > 0;

  if (
    !envelope.unread &&
    totalChanges === 0 &&
    envelope.validation.count === 0 &&
    !hasDeliveryReasons &&
    isNoOpBriefEnvelope(envelope)
  ) {
    return { toastDelivered: false, commandPublished: false };
  }

  let toastDelivered = false;
  let commandPublished = false;

  if (sharedPolicy.briefs.tui.toast) {
    const payload = buildTuiBriefToastPayload(envelope);
    if (payload !== undefined) {
      const toastResult = await sendToast(client, payload);
      if (toastResult.status === "delivered") {
        toastDelivered = true;
      } else if (toastResult.status === "failed") {
        logger.error("Failed to deliver brief toast", {
          event: "idle_brief_toast_failed",
          error: toastResult.error ?? toastResult.reason,
        });
      } else {
        logger.info("TUI showToast API unavailable, brief not delivered");
      }
    }
  }

  // Step 2: Invoke the SDK command bridge to open the brief in the TUI
  if (typeof client.tui?.executeCommand === "function") {
    try {
      await client.tui.executeCommand("kibi.open_latest_brief", {});
      commandPublished = true;
    } catch (err) {
      logger.error("Failed to publish open_latest_brief command", {
        event: "idle_brief_command_failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { toastDelivered, commandPublished };
}
