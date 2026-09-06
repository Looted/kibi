// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, test } from "bun:test";
import { parsePrivateEvaluatorManifestValue } from "../fixtures/evaluator-contracts";

afterEach(() => {
  if (process.exitCode === 1) process.exitCode = 0;
});

function baseManifest(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: "1.1.0",
    taskId: "held-out-usage-discovery-01",
    scorerKey: "scorer-0123456789abcdef",
    scorerReference: "scorer-ref-0123456789abcdef",
    publicManifestHash: "a".repeat(64),
    workspaceHash: "b".repeat(64),
    fixtureSeedHash: "c".repeat(64),
    expectedFinalState: [
      {
        key: "final-discovery",
        query: "state://kibi-usage/discovery/complete",
        expected: true,
        critical: true,
      },
    ],
    orderedMcpPredicates: {
      required: [{ tool: "kb_search", predicate: "sequence=1" }],
      forbidden: [{ tool: "kb_upsert", predicate: "unless required" }],
    },
    isolationSentinels: ["PRIVATE_SENTINEL_secret", "SIBLING_SENTINEL_secret"],
    rubric: [
      { key: "final_state", points: 60, criticalAssertionKeys: ["final-discovery"] },
      { key: "protocol", points: 25, criticalAssertionKeys: [] },
      { key: "isolation", points: 15, criticalAssertionKeys: [] },
    ],
    blindedVariants: [
      { slot: "variant-a", variant: "one-shot" },
      { slot: "variant-b", variant: "baseline" },
      { slot: "variant-c", variant: "skillopt" },
    ],
    adversarialAssessments: [
      "malformed-task-descriptor",
      "prompt-injection",
      "generated-stale-state",
      "dirty-worktree",
      "long-materialization",
      "misleading-success-output",
      "mid-operation-interruption",
      "approval-boundary",
    ].map((assessmentClass) => ({
      class: assessmentClass,
      applicable: false,
      reason: "Not applicable to this scoring fixture.",
      fixturePath: null,
      approvalPhase: "not-applicable",
    })),
    ...overrides,
  };
}

describe("evaluator-contracts remaining superRefine branches", () => {
  test("rejects unallocated critical keys and duplicated blinded variants", () => {
    expect(() =>
      parsePrivateEvaluatorManifestValue(
        baseManifest({
          rubric: [
            { key: "final_state", points: 60, criticalAssertionKeys: [] },
            { key: "protocol", points: 25, criticalAssertionKeys: [] },
            { key: "isolation", points: 15, criticalAssertionKeys: [] },
          ],
        }),
      ),
    ).toThrow(/critical final-state keys must be allocated/);

    expect(() =>
      parsePrivateEvaluatorManifestValue(
        baseManifest({
          blindedVariants: [
            { slot: "variant-a", variant: "baseline" },
            { slot: "variant-b", variant: "baseline" },
            { slot: "variant-c", variant: "skillopt" },
          ],
        }),
      ),
    ).toThrow(/blinded variants must be unique/);
  });
});
