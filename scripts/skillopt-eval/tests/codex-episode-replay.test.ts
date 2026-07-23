import { describe, expect, test } from "bun:test";
import { type EpisodeRequest, EpisodeResultSchema } from "../contracts/episode";
import {
  CodexEpisodeReceiptSchema,
  replayCodexEpisode,
} from "../runtime/codex-episode";
import type { CellReceipt } from "../scoring/cell";

const REQUEST: EpisodeRequest = {
  schemaVersion: "1.0.0",
  artifactType: "episode-request",
  episodeId: "00000000-0000-4000-8000-000000000001",
  runId: "00000000-0000-4000-8000-000000000002",
  runLockHash: "a".repeat(64),
  variant: "skillopt",
  skill: "kibi-usage",
  taskId: "task-public-1",
  attempt: 1,
  prompt: "Complete the public fixture task.",
  workspaceFixtureHash: "b".repeat(64),
};

const PASS_SCORE: CellReceipt = {
  outcome: "pass",
  terminalCategory: null,
  score: 100,
  soft: 1,
  hard: 1,
  retryable: false,
  adoptionEligible: true,
  components: { finalState: 60, protocol: 25, isolation: 15 },
  criticalFailures: [],
  conflictKeys: [],
};

const EVIDENCE = {
  brokerTrace: '{"kind":"tools/call"}\n',
  diagnosticReceipt: '{"tool":"kb_status"}\n',
  finalState: '{"status":"fresh"}\n',
} as const;

const HAPPY_TRANSCRIPT = [
  JSON.stringify({ type: "thread.started", thread_id: "thread-1" }),
  JSON.stringify({
    type: "turn.completed",
    usage: { input_tokens: 10, cached_input_tokens: 2, output_tokens: 3 },
  }),
].join("\n");

function replay(
  overrides: Partial<Parameters<typeof replayCodexEpisode>[0]> = {},
) {
  return replayCodexEpisode({
    request: REQUEST,
    transcript: HAPPY_TRANSCRIPT,
    stderr: "sanitized stderr\n",
    exitCode: 0,
    termination: "exit",
    startedAt: "2026-07-23T10:00:00Z",
    finishedAt: "2026-07-23T10:00:01Z",
    evidence: EVIDENCE,
    score: PASS_SCORE,
    hiddenMarkers: [],
    forbiddenRoots: [],
    pricingHash: "c".repeat(64),
    priceAmount: 0.001,
    ...overrides,
  });
}

describe("deterministic Codex episode replay", () => {
  test("Given a happy fake transcript When replayed Then the terminal receipt and evidence references validate", () => {
    // Given
    const input = HAPPY_TRANSCRIPT;

    // When
    const receipt = replay({ transcript: input });

    // Then
    expect(CodexEpisodeReceiptSchema.parse(receipt)).toEqual(receipt);
    expect(EpisodeResultSchema.parse(receipt.result)).toEqual(receipt.result);
    expect(receipt.result).toMatchObject({
      status: "completed",
      exitCode: 0,
      score: 100,
      hardPass: true,
      reconciliation: {
        brokerTrace: true,
        diagnosticReceipt: true,
        finalStateQuery: true,
      },
    });
    expect(Object.keys(receipt.artifacts)).toEqual([
      "rawTranscript",
      "rawStderr",
      "normalizedEvents",
      "brokerTrace",
      "diagnosticReceipt",
      "finalState",
      "evidenceIndex",
    ]);
  });

  test("Given malformed noise around valid events When replayed Then normalization remains deterministic", () => {
    // Given
    const transcript = `{bad\n${HAPPY_TRANSCRIPT}\n42`;

    // When
    const first = replay({ transcript });
    const second = replay({ transcript });

    // Then
    expect(first).toEqual(second);
    expect(first.result.status).toBe("completed");
    expect(first.evidenceIndex.events.map(({ event }) => event.type)).toEqual([
      "malformed",
      "thread.started",
      "turn.completed",
      "malformed",
    ]);
  });

  test("Given empty JSONL When replayed Then it becomes a terminal behavioral failure", () => {
    // Given
    const transcript = "\n  \n";

    // When
    const receipt = replay({ transcript });

    // Then
    expect(receipt.result).toMatchObject({
      status: "behavioral-failure",
      score: 0,
      hardPass: false,
    });
    expect(receipt.result.criticalFailures).toContain("empty_jsonl");
  });

  test("Given missing broker evidence When replayed Then required MCP failure cannot claim completion", () => {
    // Given
    const evidence = { ...EVIDENCE, brokerTrace: "" };

    // When
    const receipt = replay({ evidence });

    // Then
    expect(receipt.result.status).toBe("infrastructure-failure");
    expect(receipt.result.criticalFailures).toContain("missing_mcp_evidence");
    expect(receipt.result.reconciliation.brokerTrace).toBe(false);
  });

  test("Given a post-launch timeout When replayed Then it is terminal and non-passing", () => {
    // Given
    const termination = "timeout" as const;

    // When
    const receipt = replay({ termination, exitCode: null });

    // Then
    expect(receipt.result.status).toBe("behavioral-failure");
    expect(receipt.result.exitCode).toBeNull();
    expect(receipt.result.criticalFailures).toContain("timeout");
  });

  test("Given hidden output and a forbidden write When replayed Then leakage is redacted and scores zero", () => {
    // Given
    const transcript = [
      JSON.stringify({
        type: "item.completed",
        item: { type: "agent_message", text: "held-out-secret" },
      }),
      JSON.stringify({
        type: "item.completed",
        item: { type: "file_change", changes: [{ path: "../PWNED" }] },
      }),
      HAPPY_TRANSCRIPT,
    ].join("\n");

    // When
    const receipt = replay({
      transcript,
      hiddenMarkers: ["held-out-secret"],
    });

    // Then
    expect(receipt.result.status).toBe("behavioral-failure");
    expect(receipt.result.criticalFailures).toEqual([
      "hidden_data_leakage",
      "forbidden_write",
    ]);
    expect(JSON.stringify(receipt.evidenceIndex)).not.toContain(
      "held-out-secret",
    );
  });
});
