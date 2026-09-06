// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { EpisodeResultSchema } from "../contracts/episode";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

function result(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.0.0",
    artifactType: "episode-result",
    episodeId: "00000000-0000-4000-8000-000000000001",
    runId: "00000000-0000-4000-8000-000000000002",
    runLockHash: "a".repeat(64),
    status: "completed",
    startedAt: "2026-07-21T12:00:00Z",
    finishedAt: "2026-07-21T12:00:01Z",
    exitCode: 0,
    score: 95,
    hardPass: true,
    criticalFailures: [],
    evidenceIndexHash: "b".repeat(64),
    reconciliation: {
      brokerTrace: true,
      diagnosticReceipt: true,
      finalStateQuery: true,
    },
    usage: { inputTokens: 1, cachedInputTokens: 0, outputTokens: 1 },
    priceEquivalentEstimate: {
      currency: "USD",
      amount: 0,
      pricingHash: "c".repeat(64),
      kind: "price-equivalent-estimate-not-invoice",
    },
    ...overrides,
  };
}

describe("episode remaining result superRefine branches", () => {
  test("rejects inverted timestamps and invalid hard-pass claims", () => {
    expect(() =>
      EpisodeResultSchema.parse(
        result({
          finishedAt: "2026-07-21T11:00:00Z",
        }),
      ),
    ).toThrow(/finished timestamp precedes started timestamp/);

    expect(() =>
      EpisodeResultSchema.parse(
        result({
          hardPass: true,
          score: 40,
        }),
      ),
    ).toThrow(/hard pass requires score >= 85/);

    expect(() =>
      EpisodeResultSchema.parse(
        result({
          hardPass: true,
          score: 95,
          criticalFailures: ["broken-evidence"],
        }),
      ),
    ).toThrow(/hard pass requires score >= 85 and no critical failures/);
  });
});
