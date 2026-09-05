// implements REQ-skillopt-codex-optimization
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { EvidenceBindingError } from "../contracts/evidence";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import * as predicateEvidence from "../scoring/predicate-evidence";
import {
  type CellEvidence,
  classifyPreActionInfrastructureFailure,
  migrationApplyContractViolations,
  scoreCell,
} from "../scoring/cell";

const spies: Array<{ mockRestore: () => void }> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

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
        { tool: "kb_upsert", predicate: "unless task explicitly requires removal" },
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

const PLAN = {
  version: "kibi.migration-plan.v2",
  planHash: "c".repeat(64),
  actions: [
    {
      id: "action-1",
      code: "symbol_refresh_coordinates",
      state: "ready",
      safety: "automatic",
      autoApplicable: true,
      invocation: {
        kind: "cli",
        command_argv: ["kibi", "sync", "--refresh-symbol-coordinates"],
      },
    },
  ],
};

describe("scoreCell remaining integrity, protocol, and contract branches", () => {
  test("marks broken integrity and missing assertion keys as ambiguous", () => {
    expect(
      scoreCell(
        manifest,
        completeEvidence({
          diagnostic: {
            complete: true,
            integrityValid: false,
            claims: [],
          },
        }),
      ).terminalCategory,
    ).toBe("evidence_conflict");

    expect(
      scoreCell(
        manifest,
        completeEvidence({
          finalState: {
            complete: true,
            integrityValid: true,
            claims: [{ key: "workspace-isolated", value: 0 }],
          },
        }),
      ).terminalCategory,
    ).toBe("incomplete_evidence");
  });

  test("treats isolation violations as a critical security failure", () => {
    const receipt = scoreCell(
      manifest,
      completeEvidence({
        isolation: { observedSentinels: [], violations: ["escaped"] },
      }),
    );
    expect(receipt.terminalCategory).toBe("critical_security_failure");
    expect(receipt.criticalFailures).toEqual(["isolation-1"]);
  });

  test("maps EvidenceBindingError into an evidence conflict receipt", () => {
    const evaluate = spyOn(
      predicateEvidence,
      "evaluatePredicateCase",
    ).mockImplementation(() => {
      throw new EvidenceBindingError("roots");
    });
    spies.push(evaluate);
    const receipt = scoreCell(manifest, completeEvidence());
    expect(receipt.terminalCategory).toBe("evidence_conflict");
    expect(receipt.predicateEvidence).toBeUndefined();
  });

  test("rethrows unexpected predicate evaluation errors", () => {
    const evaluate = spyOn(
      predicateEvidence,
      "evaluatePredicateCase",
    ).mockImplementation(() => {
      throw new Error("boom");
    });
    spies.push(evaluate);
    expect(() => scoreCell(manifest, completeEvidence())).toThrow("boom");
  });

  test("fails protocol on unless-forbidden tools and before-order violations", () => {
    const unless = scoreCell(
      manifest,
      completeEvidence({
        broker: {
          complete: true,
          integrityValid: true,
          claims: [{ key: "shared-task-state", value: "complete" }],
          orderedCalls: [
            { tool: "kb_search", predicate: "sequence=1" },
            { tool: "kb_query", predicate: "sequence=2" },
            { tool: "kb_upsert", predicate: "sequence=3" },
          ],
        },
      }),
    );
    expect(unless.components.protocol).toBe(0);

    const before = scoreCell(
      manifest,
      completeEvidence({
        broker: {
          complete: true,
          integrityValid: true,
          claims: [{ key: "shared-task-state", value: "complete" }],
          orderedCalls: [
            { tool: "kb_delete", predicate: "sequence=0" },
            { tool: "kb_search", predicate: "sequence=1" },
            { tool: "kb_query", predicate: "sequence=2" },
          ],
        },
      }),
    );
    expect(before.components.protocol).toBe(0);
  });

  test("migrationApplyContractViolations covers envelope, argv, and missing-plan branches", () => {
    const contract = manifest.protocolContract!;
    const evidenceFrom = (
      rawCalls: NonNullable<CellEvidence["broker"]["rawCalls"]>,
    ): CellEvidence =>
      completeEvidence({
        broker: {
          complete: true,
          integrityValid: true,
          claims: [{ key: "shared-task-state", value: "complete" }],
          orderedCalls: rawCalls.map((call, index) => ({
            tool: call.tool,
            predicate: `sequence=${index + 1}`,
          })),
          rawCalls,
        },
      });

    expect(
      migrationApplyContractViolations(
        contract,
        completeEvidence({
          broker: {
            complete: true,
            integrityValid: true,
            claims: [],
            orderedCalls: [],
          },
        }),
      ),
    ).toEqual(["no kb_apply_plan attempt"]);

    const circular: Record<string, unknown> = {};
    circular.self = circular;
    expect(
      migrationApplyContractViolations(
        contract,
        evidenceFrom([
          {
            tool: "kb_coverage",
            args: {},
            resultOk: true,
            result: {
              structured_content: {
                migrationPlan: {
                  actions: [
                    {
                      state: "ready",
                      safety: "automatic",
                      autoApplicable: true,
                      code: "symbol_refresh_coordinates",
                      invocation: { command_argv: circular },
                    },
                  ],
                },
              },
            },
          },
          {
            tool: "kb_apply_plan",
            args: { plan: null },
            resultOk: true,
            result: { data: { outcome: "rejected" } },
          },
        ]),
      ),
    ).toEqual(
      expect.arrayContaining([
        "selected action invocation.command_argv must equal exactMigrationApply.invocationCommandArgv",
        "coverage action id missing",
        "coverage planHash missing",
        "applied plan must be unchanged from the coverage preview",
        "apply outcome must be applied (got rejected)",
      ]),
    );

    expect(
      migrationApplyContractViolations(
        contract,
        evidenceFrom([
          {
            tool: "kb_coverage",
            args: {},
            resultOk: true,
            result: {
              structuredContent: {
                kibiProtocol: 1,
                data: {
                  migrationPlan: {
                    planHash: "c".repeat(64),
                    actions: "not-array",
                  },
                },
              },
            },
          },
          {
            tool: "kb_apply_plan",
            args: {
              approvedPlanHash: "c".repeat(64),
              approvedActionIds: ["action-1"],
              plan: PLAN,
            },
            resultOk: true,
            result: { structuredContent: "nope" },
          },
        ]),
      ),
    ).toEqual(
      expect.arrayContaining([
        "coverage must expose exactly one ready automatic symbol_refresh_coordinates action (found 0)",
        "kb_apply_plan returned no typed result",
      ]),
    );

    expect(
      migrationApplyContractViolations(
        contract,
        evidenceFrom([
          {
            tool: "kb_coverage",
            args: {},
            resultOk: true,
            result: {
              structuredContent: {
                migrationPlan: PLAN,
              },
            },
          },
          {
            tool: "kb_apply_plan",
            args: {
              approvedPlanHash: PLAN.planHash,
              approvedActionIds: [PLAN.actions[0]?.id],
              plan: PLAN,
            },
            resultOk: true,
            result: {
              structuredContent: {
                kibiProtocol: 1,
                data: { outcome: "applied" },
              },
            },
          },
        ]),
      ),
    ).toEqual([]);
  });

  test("second pre-action failure stays incomplete rather than retryable", () => {
    expect(classifyPreActionInfrastructureFailure(2).retryable).toBe(false);
  });
});
