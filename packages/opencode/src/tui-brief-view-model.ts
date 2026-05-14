/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import type {
  DeliveryReasons,
  IdleBriefCitation,
  IdleBriefEnvelope,
  IdleBriefStatement,
} from "./idle-brief-store.js";
import { renderFullBriefReasons } from "./brief-delivery-reasons.js";

// ─── View Model Types ──────────────────────────────────────────────────────

export interface TuiBriefViewModel {
  briefId: string;
  schemaVersion: "1.0" | "2.0";
  branch: string;
  createdAt: string;
  type: "success" | "warning";
  unread: boolean;
  contentHash: string;

  /** Short human-readable title derived from the envelope */
  title: string;

  /** "What changed" section content */
  whatChanged: string[];

  /** "Why it matters" section content */
  whyItMatters: string;

  /** Project knowledge impact section (citations, constraints, risks) */
  knowledgeImpact: {
    citations: IdleBriefCitation[];
    constraints: IdleBriefStatement[];
    regressionRisks: IdleBriefStatement[];
  };

  /** Interpretation note section (validation + missing evidence) */
  interpretationNote: {
    validationCount: number;
    missingEvidence: IdleBriefStatement[];
  };

  /** Summary counts (schema-aware) */
  counts:
    | {
        schemaVersion: "1.0";
        requirementsAdded: number;
        relationshipsAdded: number;
        entitiesDeleted: number;
      }
    | {
        schemaVersion: "2.0";
        entitiesAdded: number;
        entitiesModified: number;
        entitiesRemoved: number;
        relationshipsChanged: number;
      };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return "Knowledge updates were recorded in this brief.";
}

function defaultWhyItMatters(): string {
  return "This update changes how the project knowledge should be interpreted and applied.";
}

function deriveWhatChanged(envelope: IdleBriefEnvelope): string[] {
  const briefing = envelope.briefing as typeof envelope.briefing & {
    deliveryReasons?: DeliveryReasons;
  };
  const deliveryReasons = briefing.deliveryReasons;
  if (deliveryReasons?.items?.length) {
    return deliveryReasons.items.map((item) => item.text);
  }
  if (envelope.schemaVersion === "2.0") {
    const narrative = envelope.briefing.changeNarrative
      .map((line) => line.trim())
      .filter(Boolean);
    if (narrative.length > 0) {
      return narrative.slice(0, 2);
    }
    const fallbackEntity =
      envelope.changes.entities.modified[0] ??
      envelope.changes.entities.added[0];
    if (fallbackEntity) {
      const action = envelope.changes.entities.modified[0] ? "Modified" : "Added";
      return [
        `${action} ${fallbackEntity.id}: ${fallbackEntity.title ?? "Untitled"}`,
      ];
    }
  }
  return [firstNonEmpty(envelope.summary, envelope.briefing.tldr)];
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Build a structured view model from a persisted brief envelope.
 *
 * Derives all route-rendering data (title, sections, citations, counts) from
 * the envelope without regenerating any content. Supports both schema 1.0 and
 * 2.0 during the migration window.
 *
 * @param envelope - The persisted brief envelope
 * @returns A deterministic view model suitable for route rendering
 */
export function buildTuiBriefViewModel( // implements REQ-opencode-kibi-briefing-v6
  envelope: IdleBriefEnvelope,
): TuiBriefViewModel {
  const briefing = envelope.briefing as typeof envelope.briefing & {
    deliveryReasons?: DeliveryReasons;
  };
  const deliveryReasons = briefing.deliveryReasons;
  let title = firstNonEmpty(envelope.summary, envelope.briefing.tldr);
  if (deliveryReasons?.items?.length) {
    title = deliveryReasons.toast.summary;
  } else if (envelope.schemaVersion === "2.0" && envelope.briefing.changeNarrative.length > 0) {
    title = envelope.briefing.changeNarrative[0]?.trim() ?? title;
  }

  const base = {
    briefId: envelope.briefId,
    schemaVersion: envelope.schemaVersion,
    branch: envelope.branch,
    createdAt: envelope.createdAt,
    type: envelope.type,
    unread: envelope.unread,
    contentHash: envelope.contentHash,
    title,
    whatChanged: deriveWhatChanged(envelope),
    whyItMatters: deliveryReasons?.items?.length
      ? deliveryReasons.toast.whyItMatters
      : firstNonEmpty(envelope.briefing.promptBlock, defaultWhyItMatters()),
    knowledgeImpact: {
      citations: envelope.briefing.citations,
      constraints: envelope.briefing.constraints ?? [],
      regressionRisks: envelope.briefing.regressionRisks ?? [],
    },
    interpretationNote: {
      validationCount: envelope.validation.count,
      missingEvidence: envelope.briefing.missingEvidence ?? [],
    },
  };

  if (envelope.schemaVersion === "2.0") {
    return {
      ...base,
      counts: {
        schemaVersion: "2.0",
        entitiesAdded: envelope.counts.entitiesAdded,
        entitiesModified: envelope.counts.entitiesModified,
        entitiesRemoved: envelope.counts.entitiesRemoved,
        relationshipsChanged: envelope.counts.relationshipsChanged,
      },
    };
  }

  return {
    ...base,
    counts: {
      schemaVersion: "1.0",
      requirementsAdded: envelope.counts.requirementsAdded,
      relationshipsAdded: envelope.counts.relationshipsAdded,
      entitiesDeleted: envelope.counts.entitiesDeleted,
    },
  };
}

/**
 * Build a short summary text from a persisted brief envelope.
 *
 * Reuses the same section-building logic as `buildTuiBriefMessage` from
 * `tui-brief-delivery.ts`, producing a deterministic plain-text summary
 * suitable for TUI route rendering or server-side summary generation.
 *
 * @param envelope - The persisted brief envelope
 * @returns A multi-line summary string
 */
export function buildTuiBriefSummary(envelope: IdleBriefEnvelope): string { // implements REQ-opencode-kibi-briefing-v6
  const briefing = envelope.briefing as typeof envelope.briefing & {
    deliveryReasons?: DeliveryReasons;
  };
  const deliveryReasons = briefing.deliveryReasons;
  if (deliveryReasons?.items?.length) {
    return renderFullBriefReasons(deliveryReasons);
  }
  const lines: string[] = [];

  // What changed
  lines.push("## What changed");
  lines.push(...deriveWhatChanged(envelope));
  lines.push("");

  // Why it matters
  lines.push("## Why it matters");
  lines.push(
    firstNonEmpty(envelope.briefing.promptBlock, defaultWhyItMatters()),
  );
  lines.push("");

  // Project knowledge impact
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

  // Interpretation note
  const hasMissingEvidence =
    (envelope.briefing.missingEvidence?.length ?? 0) > 0;
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

  // Trim trailing blank lines
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }

  return lines.join("\n");
}
