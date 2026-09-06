// implements REQ-skillopt-codex-optimization
import { describe, expect, test } from "bun:test";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import {
  type CellEvidence,
  migrationApplyContractViolations,
  scoreCell,
} from "../scoring/cell";

const manifest = parsePrivateEvaluatorManifest(
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
    protocolContract: {
      requiredCalls: [{ tool: "kb_apply_plan" }],
      forbiddenTools: ["kb_upsert"],
      exactMigrationApply: {
        actionCode: "symbol_refresh_coordinates",
        invocationCommandArgv: ["kibi", "sync", "--refresh-symbol-coordinates"],
      },
    },
    orderedMcpPredicates: {
      required: [
        { tool: "kb_search", predicate: "sequence=1" },
        { tool: "kb_query", predicate: "sequence=2" },
      ],
      forbidden: [
        {
          tool: "kb_upsert",
          predicate: "unless task explicitly requires removal",
        },
        { tool: "kb_delete", predicate: "before kb_search" },
      ],
    },
    isolationSentinels: ["PRIVATE_SENTINEL_secret", "SIBLING_SENTINEL_secret"],
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

function completeEvidence(overrides: Partial<CellEvidence> = {}): CellEvidence {
  return {
    finalState: {
      complete: true,
      integrityValid: true,
      claims: [
        { key: "final-discovery", value: true },
        { key: "workspace-isolated", value: 0 },
        { key: "shared-task-state", value: "complete" },
      ],
    },
    broker: {
      complete: true,
      integrityValid: true,
      claims: [{ key: "shared-task-state", value: "complete" }],
      orderedCalls: [
        { tool: "kb_search", predicate: "sequence=1" },
        { tool: "kb_query", predicate: "sequence=2" },
      ],
    },
    diagnostic: {
      complete: true,
      integrityValid: true,
      claims: [{ key: "shared-task-state", value: "complete" }],
    },
    codex: {
      complete: true,
      integrityValid: true,
      claims: [{ key: "shared-task-state", value: "complete" }],
    },
    isolation: { observedSentinels: [], violations: [] },
    ...overrides,
  };
}

describe("scoreCell remaining protocol before-order and coverage lookup", () => {
  test("records coverage without a result and fails before-order forbidden tools", () => {
    const contract = manifest.protocolContract!;
    expect(
      migrationApplyContractViolations(
        contract,
        completeEvidence({
          broker: {
            complete: true,
            integrityValid: true,
            claims: [{ key: "shared-task-state", value: "complete" }],
            orderedCalls: [
              { tool: "kb_coverage", predicate: "sequence=1" },
              { tool: "kb_apply_plan", predicate: "sequence=2" },
            ],
            rawCalls: [
              { tool: "kb_coverage", args: {}, resultOk: true },
              {
                tool: "kb_apply_plan",
                args: {},
                resultOk: true,
                result: { data: { outcome: "applied" } },
              } as never,
            ],
          },
        }),
      ),
    ).toEqual(expect.arrayContaining(["no kb_coverage before kb_apply_plan"]));

    const graphForbidden = {
      ...manifest,
      protocolContract: undefined,
      orderedMcpPredicates: {
        required: [{ tool: "kb_search", predicate: "sequence=1" }],
        forbidden: [{ tool: "kb_graph", predicate: "sequence=9" }],
      },
    };
    expect(
      scoreCell(
        graphForbidden,
        completeEvidence({
          broker: {
            complete: true,
            integrityValid: true,
            claims: [{ key: "shared-task-state", value: "complete" }],
            orderedCalls: [
              { tool: "kb_search", predicate: "sequence=1" },
              { tool: "kb_graph", predicate: "sequence=9" },
            ],
          },
        }),
      ).components.protocol,
    ).toBe(0);

    const beforeOrder = {
      ...manifest,
      protocolContract: undefined,
      orderedMcpPredicates: {
        required: [
          { tool: "kb_search", predicate: "sequence=1" },
          { tool: "kb_query", predicate: "sequence=2" },
        ],
        forbidden: [{ tool: "kb_query", predicate: "before kb_search" }],
      },
    };
    expect(
      scoreCell(
        beforeOrder,
        completeEvidence({
          broker: {
            complete: true,
            integrityValid: true,
            claims: [{ key: "shared-task-state", value: "complete" }],
            orderedCalls: [
              { tool: "kb_query", predicate: "sequence=0" },
              { tool: "kb_search", predicate: "sequence=1" },
            ],
          },
        }),
      ).components.protocol,
    ).toBe(0);

    expect(
      scoreCell(
        beforeOrder,
        completeEvidence({
          broker: {
            complete: true,
            integrityValid: true,
            claims: [{ key: "shared-task-state", value: "complete" }],
            orderedCalls: [{ tool: "kb_query", predicate: "sequence=2" }],
          },
        }),
      ).components.protocol,
    ).toBe(0);

    expect(
      scoreCell(
        beforeOrder,
        completeEvidence({
          broker: {
            complete: true,
            integrityValid: true,
            claims: [{ key: "shared-task-state", value: "complete" }],
            orderedCalls: [
              { tool: "kb_search", predicate: "sequence=1" },
              { tool: "kb_query", predicate: "sequence=2" },
            ],
          },
        }),
      ).components.protocol,
    ).toBe(25);
  });
});
