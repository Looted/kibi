// implements REQ-opencode-kibi-briefing-v4

import { buildBriefingContext } from "./brief-intent.js";
import { buildDeliveryReasons } from "./brief-delivery-reasons.js";
import type { BriefingWorkspaceCtx } from "./briefing-runtime.js";
import type { AuditDelta } from "./idle-brief-audit.js";
import {
  atomicWriteBrief,
  pruneOldBriefs,
  resolveBriefFilePath,
} from "./idle-brief-paths.js";
import {
  type IdleBriefEnvelope,
  type IdleBriefEnvelopeV2,
  type DeliveryReasons,
  computeContentHash,
  createBriefId,
} from "./idle-brief-store.js";
import { reconcileAuditEntries } from "./reconcile-engine.js";

export interface IdleBriefResult {
  success: boolean;
  briefPath: string | null;
  envelope: IdleBriefEnvelope | null;
}

export interface CheckResult {
  violations: Array<{
    rule: string;
    entityId: string;
    description: string;
    suggestion?: string;
    source?: string;
  }>;
  count: number;
  diagnostics: Array<{
    category: string;
    severity: string;
    message: string;
    file?: string;
    suggestion?: string;
  }>;
}

export interface IdleBriefStatement {
  statement: string;
  citationIds: string[];
}

export interface IdleBriefingResult {
  briefingState: string;
  tldr: string;
  promptBlock: string;
  citations: Array<{
    id: string;
    type?: string;
    title?: string;
    source?: string;
    textRef?: string;
  }>;
  constraints?: IdleBriefStatement[];
  regressionRisks?: IdleBriefStatement[];
  missingEvidence?: IdleBriefStatement[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

type SessionApi = {
  create: (parameters: {
    directory: string;
    title: string;
  }) => Promise<unknown>;
  prompt: (parameters: {
    sessionID: string;
    parts: Array<{ type: "text"; text: string }>;
    tools: { [key: string]: boolean };
    format: { type: "json_schema"; schema: Record<string, unknown> };
  }) => Promise<unknown>;
};

function getSessionApi(client: unknown): SessionApi | null {
  const root = asRecord(client);
  const session = asRecord(root?.session);
  if (!session) {
    return null;
  }

  const create = session.create;
  const prompt = session.prompt;
  if (typeof create !== "function" || typeof prompt !== "function") {
    return null;
  }

  return {
    create: create as SessionApi["create"],
    prompt: prompt as SessionApi["prompt"],
  };
}

function extractSessionId(response: unknown): string | null {
  const root = asRecord(response);
  if (!root) {
    return null;
  }

  const directId = asString(root.id).trim();
  if (directId) {
    return directId;
  }

  const data = asRecord(root.data);
  return asString(data?.id).trim() || null;
}

function extractPromptResponseJson(
  response: unknown,
): Record<string, unknown> | null {
  const root = asRecord(response);
  if (!root) return null;
  const data = asRecord(root.data);
  const parts = Array.isArray(data?.parts)
    ? data.parts
    : Array.isArray(root.parts)
      ? root.parts
      : null;
  if (!parts) return null;
  for (const part of parts) {
    const partRecord = asRecord(part);
    if (partRecord?.type === "text") {
      const text = asString(partRecord.text);
      if (text) {
        try {
          const parsed = JSON.parse(text);
          return asRecord(parsed) ?? null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
const CHECK_PROMPT_FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      violations: { type: "array" },
      count: { type: "number" },
      diagnostics: { type: "array" },
    },
    required: ["violations", "count", "diagnostics"],
  },
};

const BRIEFING_PROMPT_FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      briefingState: { type: "string" },
      tldr: { type: "string" },
      promptBlock: { type: "string" },
      citations: { type: "array" },
      constraints: { type: "array" },
      regressionRisks: { type: "array" },
      missingEvidence: { type: "array" },
    },
    required: ["briefingState"],
  },
};

function parseCheckResult(response: unknown): CheckResult {
  const record = asRecord(response);
  if (!record || !("violations" in record)) {
    return { violations: [], count: 0, diagnostics: [] };
  }

  const violations = Array.isArray(record.violations)
    ? record.violations.map((v) => asRecord(v) ?? {})
    : [];
  const diagnostics = Array.isArray(record.diagnostics)
    ? record.diagnostics.map((d) => asRecord(d) ?? {})
    : [];

  return {
    violations: violations.map((v) => ({
      rule: asString(v.rule),
      entityId: asString(v.entityId),
      description: asString(v.description),
      suggestion: asString(v.suggestion),
      source: asString(v.source),
    })),
    count: asNumber(record.count),
    diagnostics: diagnostics.map((d) => ({
      category: asString(d.category),
      severity: asString(d.severity),
      message: asString(d.message),
      file: asString(d.file),
      suggestion: asString(d.suggestion),
    })),
  };
}

async function loadCheckResult(
  client: unknown,
  workspaceCtx: BriefingWorkspaceCtx,
): Promise<CheckResult> {
  const sessionApi = getSessionApi(client);
  if (!sessionApi) return { violations: [], count: 0, diagnostics: [] };

  try {
    const worker = await sessionApi.create({
      directory: workspaceCtx.workspaceRoot,
      title: "Kibi Idle Brief Worker",
    });
    const sessionID = extractSessionId(worker);
    if (!sessionID) throw new Error("Failed to resolve worker session ID");
    const result = await sessionApi.prompt({
      sessionID,
      parts: [
        { type: "text", text: JSON.stringify({ tool: "kb_check", args: {} }) },
      ],
      tools: { kb_check: true },
      format: CHECK_PROMPT_FORMAT,
    });
    return parseCheckResult(extractPromptResponseJson(result));
  } catch {
    return { violations: [], count: 0, diagnostics: [] };
  }
}

function parseBriefStatements(value: unknown): IdleBriefStatement[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item: unknown) => {
      const rec = asRecord(item);
      if (!rec) return null;
      return {
        statement: asString(rec.statement),
        citationIds: Array.isArray(rec.citationIds)
          ? rec.citationIds.map((id: unknown) => String(id))
          : [],
      };
    })
    .filter((s): s is IdleBriefStatement => s !== null);
}

async function loadBriefingResultForIdle(
  client: unknown,
  workspaceCtx: BriefingWorkspaceCtx,
  sourceFiles: string[],
  seedIds: string[],
): Promise<IdleBriefingResult> {
  const sessionApi = getSessionApi(client);
  if (!sessionApi) {
    return {
      briefingState: "no_briefing",
      tldr: "",
      promptBlock: "",
      citations: [],
    };
  }
  if (sourceFiles.length === 0) {
    return {
      briefingState: "no_briefing",
      tldr: "",
      promptBlock: "",
      citations: [],
    };
  }

  try {
    const worker = await sessionApi.create({
      directory: workspaceCtx.workspaceRoot,
      title: "Kibi Idle Brief Worker",
    });
    const sessionID = extractSessionId(worker);
    if (!sessionID) throw new Error("Failed to resolve worker session ID");
    const result = await sessionApi.prompt({
      sessionID,
      parts: [
        {
          type: "text",
          text: JSON.stringify({
            tool: "kb_briefing_generate",
            args: { sourceFiles, seedIds },
          }),
        },
      ],
      tools: { kb_briefing_generate: true },
      format: BRIEFING_PROMPT_FORMAT,
    });
    const record = extractPromptResponseJson(result);

    if (record && "briefingState" in record) {
      const citations = Array.isArray(record.citations)
        ? record.citations.map((c: unknown) => asRecord(c) ?? {})
        : [];
      return {
        briefingState: asString(record.briefingState),
        tldr: asString(record.tldr),
        promptBlock: asString(record.promptBlock),
        citations: citations.map((c) => ({
          id: asString(c.id),
          type: asString(c.type),
          title: asString(c.title),
          source: asString(c.source),
          textRef: asString(c.textRef),
        })),
        constraints: parseBriefStatements(record.constraints),
        regressionRisks: parseBriefStatements(record.regressionRisks),
        missingEvidence: parseBriefStatements(record.missingEvidence),
      };
    }
  } catch {
    // briefing command not available or failed
  }

  return {
    briefingState: "no_briefing",
    tldr: "",
    promptBlock: "",
    citations: [],
  };
}

function computeCounts(auditDelta: AuditDelta): IdleBriefEnvelopeV2["counts"] {
  const reconciled = reconcileAuditEntries(auditDelta.entries);
  const added = reconciled.added.filter((item) => item.id !== "workspace-sync");
  const modified = reconciled.modified.filter((item) => item.id !== "workspace-sync");
  const removed = reconciled.removed.filter((item) => item.id !== "workspace-sync");

  return {
    entitiesAdded: added.length,
    entitiesModified: modified.length,
    entitiesRemoved: removed.length,
    relationshipsChanged: reconciled.relationshipsChanged,
  };
}

function computeSummary(
  counts: IdleBriefEnvelopeV2["counts"],
  violationsCount: number,
): string {
  const parts: string[] = [];
  const entitiesChanged = counts.entitiesAdded + counts.entitiesModified;

  if (entitiesChanged > 0) {
    parts.push(
      `${entitiesChanged} entit${entitiesChanged > 1 ? "ies" : "y"} changed`,
    );
  }
  if (counts.relationshipsChanged > 0) {
    parts.push(
      `${counts.relationshipsChanged} relationship${counts.relationshipsChanged > 1 ? "s" : ""} changed`,
    );
  }
  if (counts.entitiesRemoved > 0) {
    parts.push(
      `${counts.entitiesRemoved} entit${counts.entitiesRemoved > 1 ? "ies" : "y"} deleted`,
    );
  }

  const validationText =
    violationsCount === 0
      ? "clean"
      : `${violationsCount} issue${violationsCount > 1 ? "s" : ""}`;

  const changeText = parts.length > 0 ? parts.join(", ") : "no changes";

  return `${changeText} | ${validationText}`;
}

function humanizeEntityType(type: string): string {
  switch (type) {
    case "req":
      return "requirement";
    case "scenario":
      return "scenario";
    case "test":
      return "test";
    case "fact":
      return "fact";
    case "adr":
      return "ADR";
    case "flag":
      return "flag";
    case "event":
      return "event";
    case "symbol":
      return "symbol";
    default:
      return type;
  }
}

function buildChangeNarrative(auditDelta: AuditDelta): string[] {
  const reconciled = reconcileAuditEntries(auditDelta.entries);
  const added = reconciled.added.filter((item) => item.id !== "workspace-sync");
  const modified = reconciled.modified.filter((item) => item.id !== "workspace-sync");
  const removed = reconciled.removed.filter((item) => item.id !== "workspace-sync");
  const lines = [
    ...added.map(
      (item) =>
        `Added ${humanizeEntityType(item.type)} ${item.id}${item.title ? `: ${item.title}` : ""}`,
    ),
    ...modified.map(
      (item) =>
        `Modified ${humanizeEntityType(item.type)} ${item.id}${item.title ? `: ${item.title}` : ""}`,
    ),
    ...removed.map(
      (item) =>
        `Removed ${humanizeEntityType(item.type)} ${item.id}${item.title ? `: ${item.title}` : ""}`,
    ),
  ];

  if (reconciled.relationshipsChanged > 0) {
    lines.push(
      `Changed ${reconciled.relationshipsChanged} relationship${reconciled.relationshipsChanged > 1 ? "s" : ""}`,
    );
  }

  return lines;
}

function buildEnvelopeParts(
  briefId: string,
  type: "success" | "warning",
  sessionId: string,
  branch: string,
  createdAt: string,
  auditDelta: AuditDelta,
  summary: string,
  counts: IdleBriefEnvelopeV2["counts"],
  checkResult: CheckResult,
  briefingResult: IdleBriefingResult,
  deliveryReasons?: DeliveryReasons,
): Omit<IdleBriefEnvelopeV2, "contentHash"> {
  const reconciled = reconcileAuditEntries(auditDelta.entries);

  return {
    schemaVersion: "2.0",
    briefId,
    type,
    sessionId,
    branch,
    createdAt,
    unread: true,
    auditCursor: auditDelta.newCursor,
    summary,
    counts,
    changes: {
      entities: {
        added: reconciled.added,
        modified: reconciled.modified,
        removed: reconciled.removed,
      },
      relationships: {
        changed: reconciled.relationshipsChanged,
      },
    },
    validation: {
      violations: checkResult.violations,
      count: checkResult.count,
      diagnostics: checkResult.diagnostics,
    },
    briefing: {
      tldr: briefingResult.tldr || summary,
      promptBlock: briefingResult.promptBlock,
      citations: briefingResult.citations,
      changeNarrative: buildChangeNarrative(auditDelta),
      ...(deliveryReasons ? { deliveryReasons } : {}),
      ...(briefingResult.constraints && briefingResult.constraints.length > 0
        ? { constraints: briefingResult.constraints }
        : {}),
      ...(briefingResult.regressionRisks &&
      briefingResult.regressionRisks.length > 0
        ? { regressionRisks: briefingResult.regressionRisks }
        : {}),
      ...(briefingResult.missingEvidence &&
      briefingResult.missingEvidence.length > 0
        ? { missingEvidence: briefingResult.missingEvidence }
        : {}),
    },
  };
}

// implements REQ-opencode-kibi-briefing-v4
export async function generateIdleBrief(
  client: unknown,
  workspaceCtx: BriefingWorkspaceCtx,
  auditDelta: AuditDelta,
  sessionId: string,
  options?: { sourceFiles?: string[]; changedEntityIds?: string[] },
): Promise<IdleBriefResult> {
  if (!client) {
    return { success: true, briefPath: null, envelope: null };
  }
  if (!auditDelta.hasChanges) {
    return {
      success: true,
      briefPath: null,
      envelope: null,
    };
  }
  const reconciled = reconcileAuditEntries(auditDelta.entries);
  const derivedSourceFiles = [
    ...reconciled.added
      .map((item) => item.source)
      .filter((source): source is string => !!source),
    ...reconciled.modified
      .map((item) => item.source)
      .filter((source): source is string => !!source),
    ...reconciled.removed
      .map((item) => item.source)
      .filter((source): source is string => !!source),
  ];
  const sourceFiles =
    options?.sourceFiles !== undefined
      ? options.sourceFiles
      : derivedSourceFiles.length > 0
        ? derivedSourceFiles
        : [auditDelta.entries[0]?.entityId ?? "unknown"];
  const briefingContext = buildBriefingContext({
    sourceFiles,
    ...(options?.changedEntityIds
      ? { changedEntityIds: options.changedEntityIds }
      : {}),
  });
  const { seedIds } = briefingContext;
  let checkResult: CheckResult;
  let briefingResult: IdleBriefingResult;

  try {
    checkResult = await loadCheckResult(client, workspaceCtx);
  } catch {
    checkResult = { violations: [], count: 0, diagnostics: [] };
  }

  try {
    briefingResult = await loadBriefingResultForIdle(
      client,
      workspaceCtx,
      sourceFiles,
      seedIds,
    );
  } catch {
    briefingResult = {
      briefingState: "no_briefing",
      tldr: "",
      promptBlock: "",
      citations: [],
    };
  }

  const counts = computeCounts(auditDelta);
  const violationsCount = checkResult.violations.length;
  const isSuccess = violationsCount === 0;
  const type: "success" | "warning" = isSuccess ? "success" : "warning";
  const summary = computeSummary(counts, violationsCount);
  const deliveryReasons = buildDeliveryReasons({
    entitiesAdded: reconciled.added
      .filter((item) => item.id !== "workspace-sync")
      .map((item) => item.id),
    entitiesModified: reconciled.modified
      .filter((item) => item.id !== "workspace-sync")
      .map((item) => item.id),
    entitiesRemoved: reconciled.removed
      .filter((item) => item.id !== "workspace-sync")
      .map((item) => item.id),
    relationshipsChanged: counts.relationshipsChanged,
    validationCount: checkResult.count,
    conflictReasons: checkResult.violations.map((violation) => violation.description).filter((reason) => !!reason),
  });

  const briefId = createBriefId();
  const timestamp = Date.now();
  const createdAt = new Date().toISOString();

  const envelopeWithoutHash = buildEnvelopeParts(
    briefId,
    type,
    sessionId,
    workspaceCtx.branch,
    createdAt,
    auditDelta,
    summary,
    counts,
    checkResult,
    briefingResult,
    deliveryReasons,
  );

  const contentHash = computeContentHash(envelopeWithoutHash);

  const envelope: IdleBriefEnvelope = {
    ...envelopeWithoutHash,
    contentHash,
  };

  let briefPath: string | null = null;

  try {
    atomicWriteBrief(
      workspaceCtx.workspaceRoot,
      timestamp,
      JSON.stringify(envelope, null, 2),
    );
    briefPath = resolveBriefFilePath(workspaceCtx.workspaceRoot, timestamp);
    pruneOldBriefs(workspaceCtx.workspaceRoot, workspaceCtx.branch);
  } catch {
    // still return envelope
  }

  return {
    success: true,
    briefPath,
    envelope,
  };
}
