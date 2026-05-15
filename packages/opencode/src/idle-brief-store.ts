import * as crypto from "node:crypto";
import type { EntityChangeItem } from "./reconcile-engine.js";

export interface IdleBriefAuditCursor {
  lastTimestamp: string;
  lastOperation: string;
  entryCount: number;
  fileSize: number;
}

export interface IdleBriefCitation {
  id: string;
  type?: string;
  title?: string;
  source?: string;
  textRef?: string;
}

export interface IdleBriefStatement {
  statement: string;
  citationIds: string[];
}

export type ReasonItem = {
  kind:
    | "entity_added"
    | "entity_modified"
    | "entity_removed"
    | "relationship_changed"
    | "validation_issue"
    | "conflict_detected";
  text: string;
  entityIds: string[];
  citationIds?: string[];
  severity?: "info" | "warning" | "error";
};

export type DeliveryReasons = {
  version: 1;
  toast: {
    title: string;
    summary: string;
    whyItMatters: string;
  };
  items: ReasonItem[];
};

export interface IdleBriefValidationViolation {
  rule: string;
  entityId: string;
  description: string;
  suggestion?: string;
  source?: string;
}

export interface IdleBriefValidationDiagnostic {
  category: string;
  severity: string;
  message: string;
  file?: string;
  suggestion?: string;
}

export interface IdleBriefBaseEnvelope {
  briefId: string;
  type: "success" | "warning";
  sessionId: string;
  branch: string;
  createdAt: string;
  unread: boolean;
  auditCursor: IdleBriefAuditCursor;
  summary: string;
  validation: {
    violations: IdleBriefValidationViolation[];
    count: number;
    diagnostics: IdleBriefValidationDiagnostic[];
  };
  contentHash: string;
}

export interface IdleBriefEnvelopeV1 extends IdleBriefBaseEnvelope {
  schemaVersion: "1.0";
  counts: {
    requirementsAdded: number;
    relationshipsAdded: number;
    entitiesDeleted: number;
  };
  briefing: {
    tldr: string;
    promptBlock: string;
    citations: IdleBriefCitation[];
    constraints?: IdleBriefStatement[];
    regressionRisks?: IdleBriefStatement[];
    missingEvidence?: IdleBriefStatement[];
  };
}

export interface IdleBriefEnvelopeV2 extends IdleBriefBaseEnvelope {
  schemaVersion: "2.0";
  counts: {
    entitiesAdded: number;
    entitiesModified: number;
    entitiesRemoved: number;
    relationshipsChanged: number;
  };
  changes: {
    entities: {
      added: EntityChangeItem[];
      modified: EntityChangeItem[];
      removed: EntityChangeItem[];
    };
    relationships: {
      changed: number;
    };
  };
  briefing: {
    tldr: string;
    promptBlock: string;
    citations: IdleBriefCitation[];
    changeNarrative: string[];
    deliveryReasons?: DeliveryReasons;
    constraints?: IdleBriefStatement[];
    regressionRisks?: IdleBriefStatement[];
    missingEvidence?: IdleBriefStatement[];
  };
}

export type IdleBriefEnvelope = IdleBriefEnvelopeV1 | IdleBriefEnvelopeV2;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === "string")
  );
}

function isCitation(value: unknown): value is IdleBriefCitation {
  return isRecord(value) && typeof value.id === "string";
}

function isStatement(value: unknown): value is IdleBriefStatement {
  return (
    isRecord(value) &&
    typeof value.statement === "string" &&
    isStringArray(value.citationIds)
  );
}

function isValidationViolation(
  value: unknown,
): value is IdleBriefValidationViolation {
  return (
    isRecord(value) &&
    typeof value.rule === "string" &&
    typeof value.entityId === "string" &&
    typeof value.description === "string"
  );
}

function isValidationDiagnostic(
  value: unknown,
): value is IdleBriefValidationDiagnostic {
  return (
    isRecord(value) &&
    typeof value.category === "string" &&
    typeof value.severity === "string" &&
    typeof value.message === "string"
  );
}

function isAuditCursor(value: unknown): value is IdleBriefAuditCursor {
  return (
    isRecord(value) &&
    typeof value.lastTimestamp === "string" &&
    typeof value.lastOperation === "string" &&
    typeof value.entryCount === "number" &&
    typeof value.fileSize === "number"
  );
}

function isValidation(
  value: unknown,
): value is IdleBriefBaseEnvelope["validation"] {
  return (
    isRecord(value) &&
    Array.isArray(value.violations) &&
    value.violations.every(isValidationViolation) &&
    typeof value.count === "number" &&
    Array.isArray(value.diagnostics) &&
    value.diagnostics.every(isValidationDiagnostic)
  );
}

function isBriefingBase(value: unknown): value is {
  tldr: string;
  promptBlock: string;
  citations: IdleBriefCitation[];
  constraints?: IdleBriefStatement[];
  regressionRisks?: IdleBriefStatement[];
  missingEvidence?: IdleBriefStatement[];
} {
  return (
    isRecord(value) &&
    typeof value.tldr === "string" &&
    typeof value.promptBlock === "string" &&
    Array.isArray(value.citations) &&
    value.citations.every(isCitation) &&
    (value.constraints === undefined ||
      (Array.isArray(value.constraints) &&
        value.constraints.every(isStatement))) &&
    (value.regressionRisks === undefined ||
      (Array.isArray(value.regressionRisks) &&
        value.regressionRisks.every(isStatement))) &&
    (value.missingEvidence === undefined ||
      (Array.isArray(value.missingEvidence) &&
        value.missingEvidence.every(isStatement)))
  );
}

function isBriefingV2(
  value: unknown,
): value is IdleBriefEnvelopeV2["briefing"] {
  return (
    isBriefingBase(value) &&
    isStringArray((value as Record<string, unknown>).changeNarrative) &&
    ((value as Record<string, unknown>).deliveryReasons === undefined ||
      isDeliveryReasons((value as Record<string, unknown>).deliveryReasons))
  );
}

function isReasonItem(value: unknown): value is ReasonItem {
  return (
    isRecord(value) &&
    typeof value.kind === "string" &&
    typeof value.text === "string" &&
    isStringArray(value.entityIds) &&
    (value.citationIds === undefined || isStringArray(value.citationIds)) &&
    (value.severity === undefined ||
      value.severity === "info" ||
      value.severity === "warning" ||
      value.severity === "error")
  );
}

function isDeliveryReasons(value: unknown): value is DeliveryReasons {
  return (
    isRecord(value) &&
    value.version === 1 &&
    isRecord(value.toast) &&
    typeof value.toast.title === "string" &&
    typeof value.toast.summary === "string" &&
    typeof value.toast.whyItMatters === "string" &&
    Array.isArray(value.items) &&
    value.items.every(isReasonItem)
  );
}

function isChangeItem(value: unknown): value is EntityChangeItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.type === "string"
  );
}

function hasRenderableText(value: string): boolean {
  return value.trim().replace(/\s+/g, " ").length > 0;
}

export function isIdleBriefEnvelope(
  // implements REQ-opencode-kibi-briefing-v4
  value: unknown,
): value is IdleBriefEnvelope {
  if (!isRecord(value)) return false;

  const hasBaseFields =
    (value.schemaVersion === "1.0" || value.schemaVersion === "2.0") &&
    typeof value.briefId === "string" &&
    (value.type === "success" || value.type === "warning") &&
    typeof value.sessionId === "string" &&
    typeof value.branch === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.unread === "boolean" &&
    isAuditCursor(value.auditCursor) &&
    typeof value.summary === "string" &&
    isValidation(value.validation) &&
    typeof value.contentHash === "string";

  if (!hasBaseFields) return false;

  if (value.schemaVersion === "1.0") {
    return (
      isRecord(value.counts) &&
      typeof value.counts.requirementsAdded === "number" &&
      typeof value.counts.relationshipsAdded === "number" &&
      typeof value.counts.entitiesDeleted === "number" &&
      isBriefingBase(value.briefing)
    );
  }

  return (
    isRecord(value.counts) &&
    typeof value.counts.entitiesAdded === "number" &&
    typeof value.counts.entitiesModified === "number" &&
    typeof value.counts.entitiesRemoved === "number" &&
    typeof value.counts.relationshipsChanged === "number" &&
    isRecord(value.changes) &&
    isRecord(value.changes.entities) &&
    Array.isArray(value.changes.entities.added) &&
    value.changes.entities.added.every(isChangeItem) &&
    Array.isArray(value.changes.entities.modified) &&
    value.changes.entities.modified.every(isChangeItem) &&
    Array.isArray(value.changes.entities.removed) &&
    value.changes.entities.removed.every(isChangeItem) &&
    isRecord(value.changes.relationships) &&
    typeof value.changes.relationships.changed === "number" &&
    isBriefingV2(value.briefing)
  );
}

export function createBriefId(): string {
  // implements REQ-opencode-kibi-briefing-v4
  return `brief-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function computeContentHash(payload: object): string {
  // implements REQ-opencode-kibi-briefing-v4
  const env = payload as IdleBriefEnvelope;

  // Normalize string: trim and collapse internal whitespace
  const norm = (s: string): string => s.trim().replace(/\s+/g, " ");

  const normalizeCitations = (
    citations: IdleBriefCitation[],
  ): IdleBriefCitation[] =>
    citations.map((c) => ({
      id: c.id,
      ...(c.type ? { type: norm(c.type) } : {}),
      ...(c.title ? { title: norm(c.title) } : {}),
      ...(c.source ? { source: norm(c.source) } : {}),
      ...(c.textRef ? { textRef: norm(c.textRef) } : {}),
    }));

  const normalizeStatements = (
    statements: IdleBriefStatement[] = [],
  ): IdleBriefStatement[] =>
    statements.map((statement) => ({
      statement: norm(statement.statement),
      citationIds: statement.citationIds,
    }));

  const normalizeReasonItems = (items: ReasonItem[] = []): ReasonItem[] =>
    items
      .map((item) => ({
        kind: item.kind,
        text: norm(item.text),
        entityIds: [...item.entityIds].sort(),
        ...(item.citationIds ? { citationIds: [...item.citationIds].sort() } : {}),
        ...(item.severity ? { severity: item.severity } : {}),
      }))
      .filter((item) => hasRenderableText(item.text));

  const normalizeDeliveryReasons = (deliveryReasons?: DeliveryReasons) => {
    if (!deliveryReasons) return undefined;
    const items = normalizeReasonItems(deliveryReasons.items);
    if (items.length === 0) return undefined;
    return {
      version: deliveryReasons.version,
      toast: {
        title: norm(deliveryReasons.toast.title),
        summary: norm(deliveryReasons.toast.summary),
        whyItMatters: norm(deliveryReasons.toast.whyItMatters),
      },
      items,
    };
  };

  const normalizeChangeItems = (
    items: EntityChangeItem[],
  ): EntityChangeItem[] =>
    items.map((item) => ({
      id: item.id,
      type: norm(item.type),
      ...(item.title ? { title: norm(item.title) } : {}),
      ...(item.source ? { source: norm(item.source) } : {}),
      ...(item.textRef ? { textRef: norm(item.textRef) } : {}),
    }));

  // Build canonical visible-content projection (ignoring volatile fields)
  const projection =
    env.schemaVersion === "2.0"
      ? {
          schemaVersion: "2.0" as const,
          type: env.type,
          summary: norm(env.summary),
          counts: env.counts,
          changes: {
            entities: {
              added: normalizeChangeItems(env.changes.entities.added),
              modified: normalizeChangeItems(env.changes.entities.modified),
              removed: normalizeChangeItems(env.changes.entities.removed),
            },
            relationships: {
              changed: env.changes.relationships.changed,
            },
          },
          briefing: {
            tldr: norm(env.briefing.tldr),
            normalizedPromptBlock: norm(env.briefing.promptBlock),
            citations: normalizeCitations(env.briefing.citations ?? []),
            changeNarrative: env.briefing.changeNarrative.map((line) =>
              norm(line),
            ),
            deliveryReasons: normalizeDeliveryReasons(env.briefing.deliveryReasons),
            constraints: normalizeStatements(env.briefing.constraints),
            regressionRisks: normalizeStatements(env.briefing.regressionRisks),
            missingEvidence: normalizeStatements(env.briefing.missingEvidence),
          },
          validation: {
            count: env.validation.count,
            violations: env.validation.violations.map((v) => ({
              rule: v.rule,
              entityId: v.entityId,
              description: norm(v.description),
            })),
          },
        }
      : {
          type: env.type,
          summary: norm(env.summary),
          counts: env.counts,
          briefing: {
            tldr: norm(env.briefing.tldr),
            normalizedPromptBlock: norm(env.briefing.promptBlock),
            citations: (env.briefing.citations ?? []).map((c) => ({
              id: c.id,
              title: c.title ?? "",
            })),
            constraints: (env.briefing.constraints ?? []).map((c) => ({
              statement: norm(c.statement),
              citationIds: c.citationIds,
            })),
            regressionRisks: (env.briefing.regressionRisks ?? []).map((r) => ({
              statement: norm(r.statement),
              citationIds: r.citationIds,
            })),
            missingEvidence: (env.briefing.missingEvidence ?? []).map((m) => ({
              statement: norm(m.statement),
              citationIds: m.citationIds,
            })),
            deliveryReasons: normalizeDeliveryReasons(
              (env.briefing as { deliveryReasons?: DeliveryReasons }).deliveryReasons,
            ),
          },
          validation: {
            count: env.validation.count,
            violations: env.validation.violations.map((v) => ({
              rule: v.rule,
              entityId: v.entityId,
              description: norm(v.description),
            })),
          },
        };

  return crypto
    .createHash("sha256")
    .update(JSON.stringify(projection))
    .digest("hex");
}
