import { describe, expect, test } from "bun:test";
import { EpisodeRequestSchema } from "../contracts/episode";

const REQUEST = {
  schemaVersion: "1.0.0",
  artifactType: "episode-request",
  episodeId: "00000000-0000-4000-8000-000000000002",
  runId: "00000000-0000-4000-8000-000000000001",
  runLockHash: "a".repeat(64),
  variant: "skillopt",
  skill: "kibi-usage",
  taskId: "predicate-held-out-case",
  attempt: 2,
  prompt: "Use the sealed evaluator.",
  workspaceFixtureHash: "b".repeat(64),
} as const;

describe("held-out episode identity", () => {
  test("records replicate separately from a retry attempt", () => {
    // Given
    const raw = { ...REQUEST, replicate: 3 };

    // When
    const request = EpisodeRequestSchema.parse(raw);

    // Then
    expect(request.replicate).toBe(3);
    expect(request.attempt).toBe(2);
  });

  test("rejects a held-out replicate outside the fixed three-replicate matrix", () => {
    // Given
    const raw = { ...REQUEST, replicate: 4 };

    // When / Then
    expect(() => EpisodeRequestSchema.parse(raw)).toThrow();
  });
});
