import type { PredicateCaseSnapshot } from "../../contracts/evidence";
import { parsePrivateEvaluatorManifest } from "../../fixtures/private";

// implements REQ-skillopt-predicate-first-requirements
export const evaluatorRoots = {
  publicManifestHash: "a".repeat(64),
  workspaceHash: "b".repeat(64),
  fixtureSeedHash: "c".repeat(64),
} as const;

// implements REQ-skillopt-predicate-first-requirements
export function evaluatorManifest(
  expectedLane: "predicate" | "ontology_gap_observation",
) {
  return parsePrivateEvaluatorManifest(
    JSON.stringify({
      schemaVersion: "1.1.0",
      taskId: "kibi-usage-fact-predicate-modeling-held-out-3",
      scorerKey: "scorer-0123456789abcdef",
      scorerReference: "scorer-ref-0123456789abcdef",
      ...evaluatorRoots,
      expectedFinalState: [
        {
          key: "final-predicate",
          query: "state://predicate/complete",
          expected: true,
          critical: true,
        },
        {
          key: "workspace-isolated",
          query: "workspace://isolation/sentinel-count",
          expected: 0,
          critical: true,
        },
      ],
      orderedMcpPredicates: {
        required: [{ tool: "kb_query", predicate: "sequence=1" }],
        forbidden: [{ tool: "kb_upsert", predicate: "before approval" }],
      },
      isolationSentinels: [
        "PRIVATE_SENTINEL_secret",
        "SIBLING_SENTINEL_secret",
      ],
      rubric: [
        {
          key: "final_state",
          points: 60,
          criticalAssertionKeys: ["final-predicate"],
        },
        { key: "protocol", points: 25, criticalAssertionKeys: [] },
        {
          key: "isolation",
          points: 15,
          criticalAssertionKeys: ["workspace-isolated"],
        },
      ],
      blindedVariants: [
        { slot: "variant-a", variant: "baseline" },
        { slot: "variant-b", variant: "one-shot" },
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
        reason: "Not applicable.",
        fixturePath: null,
        approvalPhase: "not-applicable",
      })),
      predicateExpectation:
        expectedLane === "predicate"
          ? {
              semanticClass: "deny_polarity",
              expectedLane,
              expectedPredicateName: "held_out_matrix",
              expectedPredicateArgs: [
                "terminal_matrix_id",
                "frozen_skillopt_candidate_hash",
              ],
              expectedPolarity: "deny",
              expectedEdges: [
                {
                  relationship: "requires_predicate",
                  target: "held_out_matrix",
                },
              ],
              privateRationale:
                "Held-out matrix changes require a denied predicate.",
            }
          : {
              semanticClass: "ontology_gap",
              expectedLane,
              expectedPredicateName: null,
              expectedPredicateArgs: null,
              expectedPolarity: null,
              expectedEdges: [
                { relationship: "relates_to", target: "review:ontology-gap" },
              ],
              privateRationale:
                "Unsupported claims remain ontology-gap observations.",
            },
    }),
  );
}

// implements REQ-skillopt-predicate-first-requirements
export function evaluatorEvidence(snapshot: unknown) {
  return {
    finalState: {
      complete: true,
      integrityValid: true,
      claims: [
        { key: "final-predicate", value: true },
        { key: "workspace-isolated", value: 0 },
      ],
      snapshot,
    },
    broker: {
      complete: true,
      integrityValid: true,
      claims: [],
      orderedCalls: [{ tool: "kb_query", predicate: "sequence=1" }],
    },
    diagnostic: { complete: true, integrityValid: true, claims: [] },
    codex: { complete: true, integrityValid: true, claims: [] },
    isolation: { observedSentinels: [], violations: [] },
  };
}

// implements REQ-skillopt-predicate-first-requirements
export function predicateSnapshot(
  overrides: Partial<PredicateCaseSnapshot> = {},
): PredicateCaseSnapshot {
  return {
    binding: {
      caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
      roots: evaluatorRoots,
      sequence: 1,
    },
    facts: [
      {
        id: "FACT-held-out-matrix",
        factKind: "predicate",
        canonicalKey: "held_out_matrix",
        predicateName: "held_out_matrix",
        predicateArgs: ["terminal_matrix_id", "frozen_skillopt_candidate_hash"],
        polarity: "deny",
      },
    ],
    relationships: [
      { relationship: "requires_predicate", target: "held_out_matrix" },
    ],
    ...overrides,
  };
}
