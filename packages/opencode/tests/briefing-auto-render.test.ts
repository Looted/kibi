/// <reference types="bun-types" />
// implements REQ-opencode-kibi-briefing-v2

import { afterEach, describe, test } from "bun:test";
import { strict as assert } from "node:assert";
import type { BriefIntentResult } from "../src/brief-intent";

const READY_TOAST = "Kibi brief ready — summary added to guidance.";
const TLDR_FALLBACK_TOAST =
  "Kibi brief summary added — use /brief-kibi for full details.";
const UNAVAILABLE_TOAST =
  "Kibi brief unavailable — keeping /brief-kibi manual path.";
const WORKER_PROMPT_INSTRUCTION =
  "Call only kb_briefing_generate once with the provided sourceFiles and seedIds. If briefingState is ready, copy only cited fields. If briefingState is no_briefing, return empty promptBlock/citations and keep manual cue availability. Never invent claims.";

type BriefingWorkspaceCtx = {
  workspaceRoot: string;
  branch: string;
  directory?: string;
  workspace?: string;
  ttlMs?: number;
};

type BriefingCitation = {
  id: string;
  type?: string;
  title?: string;
  source?: string;
  textRef?: string;
};

type BriefingRuntimeResult = {
  state: "ready" | "tldr_fallback" | "no_briefing";
  promptBlock: string;
  tldr: string;
  citations: BriefingCitation[];
  showManualCue: boolean;
  toastMessage: string;
};

type BriefingRuntimeModule = {
  fetchBriefingResult?: (
    client: unknown,
    workspaceCtx: BriefingWorkspaceCtx,
    intentResult: BriefIntentResult,
  ) => Promise<BriefingRuntimeResult>;
};

type CreateParameters = {
  directory?: string;
  workspace?: string;
  title?: string;
};

type PromptParameters = {
  sessionID: string;
  directory?: string;
  workspace?: string;
  tools?: Record<string, boolean>;
  format?: Record<string, unknown>;
  parts?: Array<{ type: "text"; text: string }>;
};

const originalDateNow = Date.now;
let workspaceCounter = 0;

afterEach(() => {
  Date.now = originalDateNow;
});

async function loadModule(): Promise<BriefingRuntimeModule> {
  try {
    const modulePath = "../src/" + "briefing-runtime.js";
    return (await import(modulePath)) as BriefingRuntimeModule;
  } catch {
    return {};
  }
}

async function fetchRuntimeResult(
  client: unknown,
  workspaceCtx: BriefingWorkspaceCtx,
  intentResult: BriefIntentResult,
): Promise<BriefingRuntimeResult> {
  const mod = await loadModule();
  assert.equal(
    typeof mod.fetchBriefingResult,
    "function",
    "Expected briefing-runtime.ts to export fetchBriefingResult(client, workspaceCtx, intentResult)",
  );
  if (typeof mod.fetchBriefingResult !== "function") {
    throw new Error("fetchBriefingResult export missing");
  }
  return mod.fetchBriefingResult(client, workspaceCtx, intentResult);
}

async function waitFor(
  predicate: () => boolean,
  attempts = 10,
): Promise<void> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (predicate()) {
      return;
    }
    await Promise.resolve();
  }

  assert.fail("Timed out waiting for async condition");
}

function makeWorkspaceCtx(
  overrides: Partial<BriefingWorkspaceCtx> = {},
): BriefingWorkspaceCtx {
  workspaceCounter += 1;
  return {
    workspaceRoot: `/workspace-${workspaceCounter}`,
    branch: `feature-${workspaceCounter}`,
    ttlMs: 300_000,
    ...overrides,
  };
}

function makeIntent(
  workspaceCtx: BriefingWorkspaceCtx,
  overrides: Partial<BriefIntentResult> = {},
): BriefIntentResult {
  const editedFilePath =
    overrides.sourceFiles?.[0] ?? `${workspaceCtx.workspaceRoot}/src/edited.ts`;

  return {
    eligible: true,
    reason: "Eligible for auto-briefing",
    fingerprint:
      overrides.fingerprint ??
      `brief:${workspaceCtx.workspaceRoot}\0${workspaceCtx.branch}\0${editedFilePath}\0behavior_candidate`,
    sourceFiles: overrides.sourceFiles ?? [editedFilePath],
    seedIds: overrides.seedIds ?? ["REQ-001"],
    keepManualCue: overrides.keepManualCue ?? true,
    ...overrides,
  };
}

function promptResponseFromJson(value: unknown): unknown {
  return {
    data: {
      info: {
        id: "message-1",
        role: "assistant",
      },
      parts: [
        {
          type: "text",
          text: JSON.stringify(value),
        },
      ],
    },
  };
}

function promptResponseFromText(text: string): unknown {
  return {
    data: {
      info: {
        id: "message-1",
        role: "assistant",
      },
      parts: [
        {
          type: "text",
          text,
        },
      ],
    },
  };
}

function createClientStub(options: {
  createResult?: unknown;
  createError?: Error;
  promptResults?: unknown[];
  promptError?: Error;
  promptImpl?: (parameters: PromptParameters) => Promise<unknown>;
} = {}) {
  const createCalls: CreateParameters[] = [];
  const promptCalls: PromptParameters[] = [];
  const showToastCalls: unknown[] = [];
  let promptCallIndex = 0;

  const client = {
    session: {
      create: async (parameters?: CreateParameters) => {
        createCalls.push(parameters ?? {});
        if (options.createError) {
          throw options.createError;
        }
        return options.createResult ?? {
          data: {
            id: "session-1",
            title: parameters?.title ?? "Kibi Auto Brief Worker",
          },
        };
      },
      prompt: async (parameters: PromptParameters) => {
        promptCalls.push(parameters);
        if (options.promptImpl) {
          return options.promptImpl(parameters);
        }
        if (options.promptError) {
          throw options.promptError;
        }

        const result =
          options.promptResults?.[promptCallIndex] ??
          options.promptResults?.[options.promptResults.length - 1] ??
          promptResponseFromJson({ briefingState: "no_briefing" });
        promptCallIndex += 1;
        return result;
      },
    },
    tui: {
      showToast: async (payload: unknown) => {
        showToastCalls.push(payload);
        return true;
      },
    },
  };

  return {
    client,
    createCalls,
    promptCalls,
    showToastCalls,
  };
}

describe("fetchBriefingResult", () => {
  test("returns ready state for non-empty promptBlock without sending toast directly", async () => {
    const workspaceCtx = makeWorkspaceCtx();
    const intentResult = makeIntent(workspaceCtx, {
      seedIds: ["REQ-001", "SCEN-001"],
      sourceFiles: [`${workspaceCtx.workspaceRoot}/src/feature.ts`],
    });
    const citations = [
      {
        id: "REQ-001",
        type: "req",
        title: "Requirement 001",
        source: "documentation/requirements/REQ-001.md",
        textRef: "REQ-001#L1",
      },
    ];
    const { client, createCalls, promptCalls, showToastCalls } = createClientStub({
      promptResults: [
        promptResponseFromJson({
          briefingState: "ready",
          tldr: "Requirement and scenario context are available.",
          promptBlock: "\n- REQ-001: Respect the documented invariant.\n- SCEN-001: Preserve the canonical flow.\n",
          citations,
        }),
      ],
    });

    const result = await fetchRuntimeResult(client, workspaceCtx, intentResult);

    assert.deepEqual(result, {
      state: "ready",
      promptBlock:
        "- REQ-001: Respect the documented invariant.\n- SCEN-001: Preserve the canonical flow.",
      tldr: "Requirement and scenario context are available.",
      citations,
      showManualCue: false,
      toastMessage: READY_TOAST,
    });
    assert.equal(showToastCalls.length, 0, "runtime helper must not send toasts");
    assert.equal(createCalls.length, 1);
    assert.deepEqual(createCalls[0], {
      directory: workspaceCtx.workspaceRoot,
      title: "Kibi Auto Brief Worker",
    });
    assert.equal(promptCalls.length, 1);
    assert.equal(promptCalls[0]?.sessionID, "session-1");
    assert.deepEqual(promptCalls[0]?.tools, { kb_briefing_generate: true });
    assert.equal("model" in (promptCalls[0] ?? {}), false);
    assert.deepEqual(promptCalls[0]?.parts, [
      {
        type: "text",
        text: WORKER_PROMPT_INSTRUCTION,
      },
      {
        type: "text",
        text: JSON.stringify({
          sourceFiles: intentResult.sourceFiles,
          seedIds: intentResult.seedIds,
        }),
      },
    ]);
    assert.equal(promptCalls[0]?.format?.type, "json_schema");
    assert.ok(
      typeof promptCalls[0]?.format?.schema === "object" &&
        promptCalls[0]?.format?.schema !== null,
      "expected prompt call to request json_schema output",
    );
  });

  test("returns tldr_fallback when promptBlock is empty but tldr is present", async () => {
    const workspaceCtx = makeWorkspaceCtx();
    const intentResult = makeIntent(workspaceCtx);
    const { client } = createClientStub({
      promptResults: [
        promptResponseFromJson({
          briefingState: "ready",
          tldr: "Linked requirements were found.",
          promptBlock: "   ",
          citations: [{ id: "REQ-001", type: "req", title: "Requirement 001" }],
        }),
      ],
    });

    const result = await fetchRuntimeResult(client, workspaceCtx, intentResult);

    assert.deepEqual(result, {
      state: "tldr_fallback",
      promptBlock:
        "- Linked requirements were found.\n- Full details: run /brief-kibi.",
      tldr: "Linked requirements were found.",
      citations: [],
      showManualCue: true,
      toastMessage: TLDR_FALLBACK_TOAST,
    });
  });

  test("returns no_briefing for an explicit no_briefing response without fabricating prompt content", async () => {
    const workspaceCtx = makeWorkspaceCtx();
    const intentResult = makeIntent(workspaceCtx);
    const { client } = createClientStub({
      promptResults: [
        promptResponseFromJson({
          briefingState: "no_briefing",
          tldr: "This text must not be surfaced.",
          promptBlock: "- fabricated",
          citations: [{ id: "REQ-001", type: "req", title: "Requirement 001" }],
        }),
      ],
    });

    const result = await fetchRuntimeResult(client, workspaceCtx, intentResult);

    assert.deepEqual(result, {
      state: "no_briefing",
      promptBlock: "",
      tldr: "",
      citations: [],
      showManualCue: true,
      toastMessage: UNAVAILABLE_TOAST,
    });
  });

  test("returns no_briefing for malformed JSON that does not contain briefingState", async () => {
    const workspaceCtx = makeWorkspaceCtx();
    const intentResult = makeIntent(workspaceCtx);
    const { client } = createClientStub({
      promptResults: [promptResponseFromText('{"tldr":"Partial content only"}')],
    });

    const result = await fetchRuntimeResult(client, workspaceCtx, intentResult);

    assert.deepEqual(result, {
      state: "no_briefing",
      promptBlock: "",
      tldr: "",
      citations: [],
      showManualCue: true,
      toastMessage: UNAVAILABLE_TOAST,
    });
  });

  test("returns no_briefing when session.create throws", async () => {
    const workspaceCtx = makeWorkspaceCtx();
    const intentResult = makeIntent(workspaceCtx);
    const { client, createCalls, promptCalls } = createClientStub({
      createError: new Error("session create failed"),
    });

    const result = await fetchRuntimeResult(client, workspaceCtx, intentResult);

    assert.equal(createCalls.length, 1);
    assert.equal(promptCalls.length, 0);
    assert.deepEqual(result, {
      state: "no_briefing",
      promptBlock: "",
      tldr: "",
      citations: [],
      showManualCue: true,
      toastMessage: UNAVAILABLE_TOAST,
    });
  });

  test("returns no_briefing when session.prompt throws", async () => {
    const workspaceCtx = makeWorkspaceCtx();
    const intentResult = makeIntent(workspaceCtx);
    const { client, createCalls, promptCalls } = createClientStub({
      promptError: new Error("session prompt failed"),
    });

    const result = await fetchRuntimeResult(client, workspaceCtx, intentResult);

    assert.equal(createCalls.length, 1);
    assert.equal(promptCalls.length, 1);
    assert.deepEqual(result, {
      state: "no_briefing",
      promptBlock: "",
      tldr: "",
      citations: [],
      showManualCue: true,
      toastMessage: UNAVAILABLE_TOAST,
    });
  });

  test("caches the same fingerprint within TTL and only prompts once", async () => {
    const workspaceCtx = makeWorkspaceCtx();
    const intentResult = makeIntent(workspaceCtx);
    const { client, createCalls, promptCalls } = createClientStub({
      promptResults: [
        promptResponseFromJson({
          briefingState: "ready",
          tldr: "Cached briefing.",
          promptBlock: "- Cached bullet",
          citations: [],
        }),
      ],
    });

    const first = await fetchRuntimeResult(client, workspaceCtx, intentResult);
    const second = await fetchRuntimeResult(client, workspaceCtx, intentResult);

    assert.deepEqual(second, first);
    assert.equal(createCalls.length, 1);
    assert.equal(promptCalls.length, 1);
  });

  test("deduplicates concurrent in-flight requests for the same fingerprint", async () => {
    const workspaceCtx = makeWorkspaceCtx();
    const intentResult = makeIntent(workspaceCtx);
    let resolvePrompt: ((value: unknown) => void) | undefined;
    const promptGate = new Promise<unknown>((resolve) => {
      resolvePrompt = resolve;
    });
    const { client, createCalls, promptCalls } = createClientStub({
      promptImpl: async () => promptGate,
    });

    const firstPromise = fetchRuntimeResult(client, workspaceCtx, intentResult);
    const secondPromise = fetchRuntimeResult(client, workspaceCtx, intentResult);
    await waitFor(() => createCalls.length === 1 && promptCalls.length === 1);

    assert.equal(createCalls.length, 1);
    assert.equal(promptCalls.length, 1);
    resolvePrompt?.(
      promptResponseFromJson({
        briefingState: "ready",
        tldr: "Concurrent briefing.",
        promptBlock: "- Concurrent bullet",
        citations: [],
      }),
    );

    const [first, second] = await Promise.all([firstPromise, secondPromise]);

    assert.deepEqual(second, first);
    assert.equal(promptCalls.length, 1);
  });

  test("expires cached results after the TTL window and prompts again", async () => {
    const workspaceCtx = makeWorkspaceCtx({ ttlMs: 10 });
    const intentResult = makeIntent(workspaceCtx);
    let now = 1_000;
    Date.now = () => now;
    const { client, createCalls, promptCalls } = createClientStub({
      promptResults: [
        promptResponseFromJson({
          briefingState: "ready",
          tldr: "First briefing.",
          promptBlock: "- First bullet",
          citations: [],
        }),
        promptResponseFromJson({
          briefingState: "ready",
          tldr: "Second briefing.",
          promptBlock: "- Second bullet",
          citations: [],
        }),
      ],
    });

    const first = await fetchRuntimeResult(client, workspaceCtx, intentResult);
    now += 25;
    const second = await fetchRuntimeResult(client, workspaceCtx, intentResult);

    assert.equal(createCalls.length, 1, "worker session should be reused");
    assert.equal(promptCalls.length, 2, "cache should miss after TTL expiry");
    assert.equal(first.promptBlock, "- First bullet");
    assert.equal(second.promptBlock, "- Second bullet");
  });

  test("uses separate prompt calls for different fingerprints while reusing the worker session", async () => {
    const workspaceCtx = makeWorkspaceCtx();
    const firstIntent = makeIntent(workspaceCtx, {
      fingerprint: `brief:${workspaceCtx.workspaceRoot}\0${workspaceCtx.branch}\0${workspaceCtx.workspaceRoot}/src/a.ts\0behavior_candidate`,
      sourceFiles: [`${workspaceCtx.workspaceRoot}/src/a.ts`],
      seedIds: ["REQ-001"],
    });
    const secondIntent = makeIntent(workspaceCtx, {
      fingerprint: `brief:${workspaceCtx.workspaceRoot}\0${workspaceCtx.branch}\0${workspaceCtx.workspaceRoot}/src/b.ts\0behavior_candidate`,
      sourceFiles: [`${workspaceCtx.workspaceRoot}/src/b.ts`],
      seedIds: ["REQ-002"],
    });
    const { client, createCalls, promptCalls } = createClientStub({
      promptResults: [
        promptResponseFromJson({
          briefingState: "ready",
          tldr: "First fingerprint.",
          promptBlock: "- First fingerprint bullet",
          citations: [],
        }),
        promptResponseFromJson({
          briefingState: "ready",
          tldr: "Second fingerprint.",
          promptBlock: "- Second fingerprint bullet",
          citations: [],
        }),
      ],
    });

    const first = await fetchRuntimeResult(client, workspaceCtx, firstIntent);
    const second = await fetchRuntimeResult(client, workspaceCtx, secondIntent);

    assert.equal(createCalls.length, 1);
    assert.equal(promptCalls.length, 2);
    assert.equal(first.promptBlock, "- First fingerprint bullet");
    assert.equal(second.promptBlock, "- Second fingerprint bullet");
    assert.notEqual(firstIntent.fingerprint, secondIntent.fingerprint);
  });
});
