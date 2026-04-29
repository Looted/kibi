// implements REQ-opencode-kibi-briefing-v4

import type { BriefingWorkspaceCtx } from "./briefing-runtime.js";
import type { AuditDelta } from "./idle-brief-audit.js";
import {
  type IdleBriefEnvelope,
  createBriefId,
  computeContentHash,
} from "./idle-brief-store.js";
import { atomicWriteBrief, resolveBriefFilePath } from "./idle-brief-paths.js";

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
  create: (parameters: { directory: string; title: string }) => Promise<unknown>;
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

function extractPromptResponseJson(response: unknown): Record<string, unknown> | null {
  const root = asRecord(response);
  if (!root) return null;
  const data = asRecord(root.data);
  const parts = Array.isArray(data?.parts) ? data.parts : Array.isArray(root.parts) ? root.parts : null;
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
  schema: { type: "object", properties: { violations: { type: "array" }, count: { type: "number" }, diagnostics: { type: "array" } }, required: ["violations", "count", "diagnostics"] },
};

const BRIEFING_PROMPT_FORMAT = {
  type: "json_schema" as const,
  schema: { type: "object", properties: { briefingState: { type: "string" }, tldr: { type: "string" }, promptBlock: { type: "string" }, citations: { type: "array" } }, required: ["briefingState"] },
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
    const worker = await sessionApi.create({ directory: workspaceCtx.workspaceRoot, title: "Kibi Idle Brief Worker" });
    const sessionID = extractSessionId(worker);
    if (!sessionID) throw new Error("Failed to resolve worker session ID");
    const result = await sessionApi.prompt({
      sessionID,
      parts: [{ type: "text", text: JSON.stringify({ tool: "kb_check", args: {}}) }],
      tools: { kb_check: true },
      format: CHECK_PROMPT_FORMAT,
    });
    return parseCheckResult(extractPromptResponseJson(result));
  } catch {
    return { violations: [], count: 0, diagnostics: [] };
  }
}

async function loadBriefingResultForIdle(
  client: unknown,
  workspaceCtx: BriefingWorkspaceCtx,
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

  try {
    const worker = await sessionApi.create({ directory: workspaceCtx.workspaceRoot, title: "Kibi Idle Brief Worker" });
    const sessionID = extractSessionId(worker);
    if (!sessionID) throw new Error("Failed to resolve worker session ID");
    const result = await sessionApi.prompt({
      sessionID,
      parts: [{ type: "text", text: JSON.stringify({ tool: "kb_briefing_generate", args: {}}) }],
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

function computeCounts(auditDelta: AuditDelta): {
  requirementsAdded: number;
  relationshipsAdded: number;
  entitiesDeleted: number;
} {
  let requirementsAdded = 0;
  let relationshipsAdded = 0;
  let entitiesDeleted = 0;

  for (const entry of auditDelta.entries) {
    if (entry.operation === "upsert") {
      requirementsAdded++;
    } else if (entry.operation === "upsert_rel") {
      relationshipsAdded++;
    } else if (entry.operation === "delete") {
      entitiesDeleted++;
    }
  }

  return { requirementsAdded, relationshipsAdded, entitiesDeleted };
}

function computeSummary(
  counts: { requirementsAdded: number; relationshipsAdded: number; entitiesDeleted: number },
  violationsCount: number,
): string {
  const parts: string[] = [];

  if (counts.requirementsAdded > 0) {
    parts.push(`${counts.requirementsAdded} requirement${counts.requirementsAdded > 1 ? "s" : ""} added`);
  }
  if (counts.relationshipsAdded > 0) {
    parts.push(`${counts.relationshipsAdded} relationship${counts.relationshipsAdded > 1 ? "s" : ""} added`);
  }
  if (counts.entitiesDeleted > 0) {
    parts.push(`${counts.entitiesDeleted} deleted`);
  }

  const validationText = violationsCount === 0
    ? "clean"
    : `${violationsCount} issue${violationsCount > 1 ? "s" : ""}`;

  const changeText = parts.length > 0 ? parts.join(", ") : "no changes";

  return `${changeText} | ${validationText}`;
}

function buildEnvelopeParts(
  briefId: string,
  type: "success" | "warning",
  sessionId: string,
  branch: string,
  createdAt: string,
  auditDelta: AuditDelta,
  summary: string,
  counts: { requirementsAdded: number; relationshipsAdded: number; entitiesDeleted: number },
  checkResult: CheckResult,
  briefingResult: IdleBriefingResult,
): Omit<IdleBriefEnvelope, "contentHash"> {
  return {
    schemaVersion: "1.0",
    briefId,
    type,
    sessionId,
    branch,
    createdAt,
    unread: true,
    auditCursor: auditDelta.newCursor,
    summary,
    counts,
    validation: {
      violations: checkResult.violations,
      count: checkResult.count,
      diagnostics: checkResult.diagnostics,
    },
    briefing: {
      tldr: briefingResult.tldr || summary,
      promptBlock: briefingResult.promptBlock,
      citations: briefingResult.citations,
    },
  };
}

// implements REQ-opencode-kibi-briefing-v4
export async function generateIdleBrief(
  client: unknown,
  workspaceCtx: BriefingWorkspaceCtx,
  auditDelta: AuditDelta,
  sessionId: string,
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
  let checkResult: CheckResult;
  let briefingResult: IdleBriefingResult;

  try {
    checkResult = await loadCheckResult(client, workspaceCtx);
  } catch {
    checkResult = { violations: [], count: 0, diagnostics: [] };
  }

  try {
    briefingResult = await loadBriefingResultForIdle(client, workspaceCtx);
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
  } catch {
    // still return envelope
  }

  return {
    success: true,
    briefPath,
    envelope,
  };
}
