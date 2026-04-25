// implements REQ-opencode-kibi-briefing-v3

import type { ToastCapableClient } from "./toast.js";
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
  toastMessage: string;
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

type SessionCreateParams = {
  directory: string;
  title: string;
};

type PromptTextPart = {
  type: "text";
  text: string;
};

type SessionPromptParams = {
  sessionID: string;
  tools: {
    [key: string]: boolean;
  };
  format: {
    type: "json_schema";
    schema: Record<string, unknown>;
  };
  parts: PromptTextPart[];
};

type SessionApi = {
  create: (parameters: SessionCreateParams) => Promise<unknown>;
  prompt: (parameters: SessionPromptParams) => Promise<unknown>;
};

const workerSessionIds = new Map<string, string>();
const workerSessionPromises = new Map<string, Promise<string>>();

const CHECK_PROMPT_INSTRUCTION =
  "Call kb_check with the current workspace. Return the validation result as JSON with fields: violations (array), count (number), diagnostics (array).";

const CHECK_PROMPT_FORMAT: SessionPromptParams["format"] = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      violations: { type: "array", items: { type: "object" } },
      count: { type: "number" },
      diagnostics: { type: "array", items: { type: "object" } },
    },
    required: ["violations", "count"],
  },
};

const BRIEFING_PROMPT_INSTRUCTION =
  "Call kb_briefing_generate with sourceFiles from the current workspace. Return the briefing as JSON with fields: briefingState, tldr, promptBlock, citations.";

const BRIEFING_PROMPT_FORMAT: SessionPromptParams["format"] = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      briefingState: { type: "string" },
      tldr: { type: "string" },
      promptBlock: { type: "string" },
      citations: { type: "array", items: { type: "object" } },
    },
    required: ["briefingState"],
  },
};

function workspaceSessionKey(workspaceCtx: BriefingWorkspaceCtx): string {
  return `${workspaceCtx.workspaceRoot}\0${workspaceCtx.branch}`;
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

function extractParts(response: unknown): unknown[] {
  const root = asRecord(response);
  if (!root) {
    return [];
  }

  const data = asRecord(root.data);
  const parts = data?.parts ?? root.parts;

  return Array.isArray(parts) ? parts : [];
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
  const dataId = asString(data?.id).trim();

  return dataId || null;
}

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

async function getWorkerSessionId(
  sessionApi: SessionApi,
  workspaceCtx: BriefingWorkspaceCtx,
): Promise<string> {
  const key = workspaceSessionKey(workspaceCtx);
  const existing = workerSessionIds.get(key);
  if (existing) {
    return existing;
  }

  const pending = workerSessionPromises.get(key);
  if (pending) {
    return pending;
  }

  const promise = (async () => {
    const response = await sessionApi.create({
      directory: workspaceCtx.workspaceRoot,
      title: "Kibi Auto Brief Worker",
    });
    const sessionId = extractSessionId(response);
    if (!sessionId) {
      throw new Error("Failed to resolve worker session ID");
    }

    workerSessionIds.set(key, sessionId);
    return sessionId;
  })().finally(() => {
    workerSessionPromises.delete(key);
  });

  workerSessionPromises.set(key, promise);
  return promise;
}

function parseCheckResult(response: unknown): CheckResult {
  const parts = extractParts(response);

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = asRecord(parts[index]);
    if (!part || part.type !== "text") {
      continue;
    }

    const text = asString(part.text);
    if (!text) {
      continue;
    }

    try {
      const parsed = JSON.parse(text) as unknown;
      const record = asRecord(parsed);
      if (record && "violations" in record) {
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
    } catch {
      // malformed, continue
    }
  }

  return { violations: [], count: 0, diagnostics: [] };
}

function parseBriefingResult(response: unknown): IdleBriefingResult {
  const parts = extractParts(response);

  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = asRecord(parts[index]);
    if (!part || part.type !== "text") {
      continue;
    }

    const text = asString(part.text);
    if (!text) {
      continue;
    }

    try {
      const parsed = JSON.parse(text) as unknown;
      const record = asRecord(parsed);
      if (record && "briefingState" in record) {
        const citations = Array.isArray(record.citations)
          ? record.citations.map((c) => asRecord(c) ?? {})
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
      // malformed, continue
    }
  }

  return {
    briefingState: "no_briefing",
    tldr: "",
    promptBlock: "",
    citations: [],
  };
}

async function loadCheckResult(
  sessionApi: SessionApi,
  workspaceCtx: BriefingWorkspaceCtx,
): Promise<CheckResult> {
  const sessionID = await getWorkerSessionId(sessionApi, workspaceCtx);
  const response = await sessionApi.prompt({
    sessionID,
    tools: { kb_check: true },
    format: CHECK_PROMPT_FORMAT,
    parts: [
      {
        type: "text",
        text: CHECK_PROMPT_INSTRUCTION,
      },
    ],
  });

  return parseCheckResult(response);
}

async function loadBriefingResultForIdle(
  sessionApi: SessionApi,
  workspaceCtx: BriefingWorkspaceCtx,
): Promise<IdleBriefingResult> {
  const sessionID = await getWorkerSessionId(sessionApi, workspaceCtx);
  const response = await sessionApi.prompt({
    sessionID,
    tools: { kb_briefing_generate: true },
    format: BRIEFING_PROMPT_FORMAT,
    parts: [
      {
        type: "text",
        text: BRIEFING_PROMPT_INSTRUCTION,
      },
      {
        type: "text",
        text: JSON.stringify({
          sourceFiles: [workspaceCtx.workspaceRoot],
          seedIds: [],
        }),
      },
    ],
  });

  return parseBriefingResult(response);
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
    : `${violationsCount} violation${violationsCount > 1 ? "s" : ""} found.`;

  if (parts.length > 0) {
    return `${parts.join(". ")}. KB validation: ${validationText}`;
  }

  return `No changes detected. KB validation: ${validationText}`;
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
      tldr: briefingResult.tldr,
      promptBlock: briefingResult.promptBlock,
      citations: briefingResult.citations,
    },
  };
}

// implements REQ-opencode-kibi-briefing-v3
export async function generateIdleBrief(
  client: ToastCapableClient,
  workspaceCtx: BriefingWorkspaceCtx,
  auditDelta: AuditDelta,
  sessionId: string,
): Promise<IdleBriefResult> {
  if (!auditDelta.hasChanges) {
    return {
      success: true,
      briefPath: null,
      envelope: null,
      toastMessage: "Kibi: No changes detected. Brief skipped.",
    };
  }

  const sessionApi = getSessionApi(client);
  if (!sessionApi) {
    return {
      success: false,
      briefPath: null,
      envelope: null,
      toastMessage: "Kibi: Worker session unavailable. Brief failed.",
    };
  }

  let checkResult: CheckResult;
  let briefingResult: IdleBriefingResult;

  try {
    checkResult = await loadCheckResult(sessionApi, workspaceCtx);
  } catch {
    checkResult = { violations: [], count: 0, diagnostics: [] };
  }

  try {
    briefingResult = await loadBriefingResultForIdle(sessionApi, workspaceCtx);
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

  const changesCount = auditDelta.entries.length;
  const toastMessage = isSuccess
    ? `Kibi: Session idle. ${changesCount} changes detected. KB healthy. Brief saved.`
    : `Kibi: Session idle. ${changesCount} changes detected. ${violationsCount} validation issues found. Brief saved.`;

  return {
    success: true,
    briefPath,
    envelope,
    toastMessage,
  };
}