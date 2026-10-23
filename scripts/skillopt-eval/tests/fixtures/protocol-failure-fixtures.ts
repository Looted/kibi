import { parsePrivateEvaluatorManifest } from "../../fixtures/private";
import type { CellEvidence } from "../../scoring/cell";

/**
 * A private evaluator manifest with two ordered required MCP calls, and cell
 * evidence for a given call sequence, for protocol-failure tests and the
 * host-neutral optimization e2e exerciser.
 */

export const PRIVATE_PATH = "src/private-governed-module.ts";

export function protocolManifest(withContract: boolean) {
  return parsePrivateEvaluatorManifest(
    JSON.stringify({
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
        {
          key: "workspace-isolated",
          query: "workspace://isolation/sentinel-count",
          expected: 0,
          critical: true,
        },
      ],
      orderedMcpPredicates: {
        required: [
          { tool: "kb_search", predicate: "sequence=1" },
          { tool: "kb_query", predicate: "sequence=2" },
        ],
        forbidden: [
          { tool: "kb_upsert", predicate: "before discovery or approval" },
        ],
      },
      ...(withContract
        ? {
            protocolContract: {
              requiredCalls: [
                {
                  tool: "kb_search",
                  args: { sourceLocations: [{ path: PRIVATE_PATH }] },
                },
                { tool: "kb_query" },
              ],
              forbiddenTools: [],
            },
          }
        : {}),
      isolationSentinels: [
        "PRIVATE_SENTINEL_secret",
        "SIBLING_SENTINEL_secret",
      ],
      rubric: [
        {
          key: "final_state",
          points: 60,
          criticalAssertionKeys: ["final-discovery"],
        },
        { key: "protocol", points: 25, criticalAssertionKeys: [] },
        {
          key: "isolation",
          points: 15,
          criticalAssertionKeys: ["workspace-isolated"],
        },
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
    }),
  );
}

export function protocolEvidence(
  calls: readonly Readonly<{ tool: string; args?: Record<string, unknown> }>[],
): CellEvidence {
  const source = {
    complete: true,
    integrityValid: true,
    claims: [{ key: "shared-task-state", value: "complete" }],
  };
  return {
    finalState: {
      ...source,
      claims: [
        ...source.claims,
        { key: "final-discovery", value: true },
        { key: "workspace-isolated", value: 0 },
      ],
    },
    broker: {
      ...source,
      orderedCalls: calls.map(({ tool }, index) => ({
        tool,
        predicate: `sequence=${index + 1}`,
      })),
      rawCalls: calls.map(({ tool, args }) => ({
        tool,
        args: args ?? {},
        resultOk: true,
      })),
    },
    diagnostic: source,
    codex: source,
    isolation: { observedSentinels: [], violations: [] },
  };
}
