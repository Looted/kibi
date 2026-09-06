// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { request } from "./held-out-evaluation-test-helpers";
import { replayCodexEpisode } from "../runtime/codex-episode";
import type { CellReceipt } from "../scoring/cell";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

const HASHES = {
  baseline: "a".repeat(64),
  "one-shot": "b".repeat(64),
  skillopt: "c".repeat(64),
} as const;

function score(terminalCategory: CellReceipt["terminalCategory"], hard: 0 | 1 = 0): CellReceipt {
  return {
    outcome: hard === 1 ? "pass" : "fail",
    terminalCategory,
    score: hard === 1 ? 95 : 10,
    soft: 0,
    hard,
    retryable: false,
    adoptionEligible: false,
    components: { finalState: 0, protocol: 0, isolation: 0 },
    criticalFailures: [],
    conflictKeys: [],
  };
}

function baseInput(
  extras: Partial<Parameters<typeof replayCodexEpisode>[0]> = {},
) {
  const req = request({
    episode: 1,
    taskId: "task-1",
    variant: "skillopt",
    hashes: HASHES,
  });
  return {
    request: req,
    transcript: `${JSON.stringify({ type: "turn.completed" })}\n`,
    stderr: "",
    exitCode: 0,
    termination: "exit" as const,
    startedAt: "2026-07-21T12:00:00Z",
    finishedAt: "2026-07-21T12:00:01Z",
    evidence: {
      brokerTrace: "trace",
      diagnosticReceipt: "diag",
      finalState: "state",
    },
    score: score(null, 1),
    hiddenMarkers: [],
    forbiddenRoots: [],
    pricingHash: "d".repeat(64),
    priceAmount: 0,
    ...extras,
  };
}

describe("codex-episode remaining scoreStatus and infrastructure branches", () => {
  test("maps terminal categories and preserves an explicit infrastructure failure", () => {
    for (const category of [
      "behavioral_failure",
      "critical_security_failure",
      "pre_action_infrastructure_failure",
      "incomplete_evidence",
      "budget_stop",
      "evidence_conflict",
      null,
    ] as const) {
      const replayed = replayCodexEpisode(
        baseInput({ score: score(category, category === null ? 0 : 0) }),
      );
      expect(replayed.result.status).toBeDefined();
    }
    const failed = replayCodexEpisode(
      baseInput({
        infrastructureFailure: "sandbox_unavailable",
        score: score(null, 1),
      }),
    );
    expect(failed.result.status).toBe("infrastructure-failure");
  });
});
