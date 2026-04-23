// implements REQ-opencode-kibi-briefing-v2

import type { BriefIntentResult } from "./brief-intent.js";

export type BriefingWorkspaceCtx = {
  workspaceRoot: string;
  branch: string;
  directory?: string;
  workspace?: string;
  ttlMs?: number;
};

export type BriefingCitation = {
  id: string;
  type?: string;
  title?: string;
  source?: string;
  textRef?: string;
};

export type BriefingRuntimeResult = {
  state: "ready" | "tldr_fallback" | "no_briefing";
  promptBlock: string;
  tldr: string;
  citations: BriefingCitation[];
  showManualCue: boolean;
  toastMessage: string;
};

type PromptTextPart = {
  type: "text";
  text: string;
};

type SessionCreateParams = {
  directory: string;
  title: string;
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

type PromptPayload = {
  briefingState?: unknown;
  tldr?: unknown;
  promptBlock?: unknown;
  citations?: unknown;
};

const DEFAULT_TTL_MS = 300_000;
const WORKER_TITLE = "Kibi Auto Brief Worker";
const READY_TOAST = "Kibi brief ready — summary added to guidance.";
const TLDR_FALLBACK_TOAST =
  "Kibi brief summary added — use /brief-kibi for full details.";
const UNAVAILABLE_TOAST =
  "Kibi brief unavailable — keeping /brief-kibi manual path.";
const PROMPT_INSTRUCTION =
  "Call only kb_briefing_generate once with the provided sourceFiles and seedIds. If briefingState is ready, copy only cited fields. If briefingState is no_briefing, return empty promptBlock/citations and keep manual cue availability. Never invent claims.";
const PROMPT_FORMAT: SessionPromptParams["format"] = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      briefingState: { type: "string" },
      tldr: { type: "string" },
      promptBlock: { type: "string" },
      citations: { type: "array", items: { type: "object" } },
      activationState: { type: "string" },
      confidence: { type: "string" },
      freshness: { type: "string" },
    },
    required: ["briefingState"],
  },
};

const workerSessionIds = new Map<string, string>();
const workerSessionPromises = new Map<string, Promise<string>>();
const resultCache = new Map<
  string,
  {
    result: BriefingRuntimeResult;
    timestamp: number;
  }
>();
const inFlightResults = new Map<string, Promise<BriefingRuntimeResult>>();

function noBriefingResult(): BriefingRuntimeResult {
  return {
    state: "no_briefing",
    promptBlock: "",
    tldr: "",
    citations: [],
    showManualCue: true,
    toastMessage: UNAVAILABLE_TOAST,
  };
}

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

function sanitizePromptBlock(value: unknown): string {
  return asString(value).trim();
}

function sanitizeCitations(value: unknown): BriefingCitation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const citations: BriefingCitation[] = [];
  for (const item of value) {
    const record = asRecord(item);
    if (!record) {
      continue;
    }

    const id = asString(record.id).trim();
    if (!id) {
      continue;
    }

    const citation: BriefingCitation = { id };
    const type = asString(record.type).trim();
    const title = asString(record.title).trim();
    const source = asString(record.source).trim();
    const textRef = asString(record.textRef).trim();

    if (type) {
      citation.type = type;
    }
    if (title) {
      citation.title = title;
    }
    if (source) {
      citation.source = source;
    }
    if (textRef) {
      citation.textRef = textRef;
    }

    citations.push(citation);
  }

  return citations;
}

function hasBriefingState(value: unknown): value is PromptPayload {
  const record = asRecord(value);
  return record !== null && "briefingState" in record;
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

function parsePromptPayload(response: unknown): PromptPayload | null {
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
      if (hasBriefingState(parsed)) {
        return parsed;
      }
    } catch {
      // Ignore malformed text parts and continue searching from the end.
    }
  }

  return null;
}

function normalizeResult(payload: PromptPayload | null): BriefingRuntimeResult {
  if (!payload) {
    return noBriefingResult();
  }

  const briefingState = asString(payload.briefingState).trim();
  const tldr = asString(payload.tldr).trim();
  const promptBlock = sanitizePromptBlock(payload.promptBlock);

  if (briefingState === "ready" && promptBlock) {
    return {
      state: "ready",
      promptBlock,
      tldr,
      citations: sanitizeCitations(payload.citations),
      showManualCue: false,
      toastMessage: READY_TOAST,
    };
  }

  if (briefingState === "ready" && tldr) {
    return {
      state: "tldr_fallback",
      promptBlock: `- ${tldr}\n- Full details: run /brief-kibi.`,
      tldr,
      citations: [],
      showManualCue: true,
      toastMessage: TLDR_FALLBACK_TOAST,
    };
  }

  return noBriefingResult();
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
      title: WORKER_TITLE,
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

async function loadBriefingResult(
  sessionApi: SessionApi,
  workspaceCtx: BriefingWorkspaceCtx,
  intentResult: BriefIntentResult,
): Promise<BriefingRuntimeResult> {
  const sessionID = await getWorkerSessionId(sessionApi, workspaceCtx);
  const response = await sessionApi.prompt({
    sessionID,
    tools: { kb_briefing_generate: true },
    format: PROMPT_FORMAT,
    parts: [
      {
        type: "text",
        text: PROMPT_INSTRUCTION,
      },
      {
        type: "text",
        text: JSON.stringify({
          sourceFiles: intentResult.sourceFiles,
          seedIds: intentResult.seedIds,
        }),
      },
    ],
  });

  return normalizeResult(parsePromptPayload(response));
}

// implements REQ-opencode-kibi-briefing-v2
export async function fetchBriefingResult(
  client: unknown,
  workspaceCtx: BriefingWorkspaceCtx,
  intentResult: BriefIntentResult,
): Promise<BriefingRuntimeResult> {
  const ttlMs = workspaceCtx.ttlMs ?? DEFAULT_TTL_MS;
  const cached = resultCache.get(intentResult.fingerprint);
  const now = Date.now();

  if (cached && now - cached.timestamp <= ttlMs) {
    return cached.result;
  }

  if (cached) {
    resultCache.delete(intentResult.fingerprint);
  }

  const pending = inFlightResults.get(intentResult.fingerprint);
  if (pending) {
    return pending;
  }

  const sessionApi = getSessionApi(client);
  if (!sessionApi || !intentResult.eligible) {
    const result = noBriefingResult();
    resultCache.set(intentResult.fingerprint, {
      result,
      timestamp: now,
    });
    return result;
  }

  const promise = (async () => {
    try {
      const result = await loadBriefingResult(sessionApi, workspaceCtx, intentResult);
      resultCache.set(intentResult.fingerprint, {
        result,
        timestamp: Date.now(),
      });
      return result;
    } catch {
      const result = noBriefingResult();
      resultCache.set(intentResult.fingerprint, {
        result,
        timestamp: Date.now(),
      });
      return result;
    }
  })().finally(() => {
    inFlightResults.delete(intentResult.fingerprint);
  });

  inFlightResults.set(intentResult.fingerprint, promise);
  return promise;
}
