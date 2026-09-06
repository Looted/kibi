// implements REQ-skillopt-predicate-first-requirements
import { describe, expect, test } from "bun:test";
import {
  EvidenceBindingError,
  type PredicateCaseSnapshot,
} from "../contracts/evidence";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import type { CellEvidence } from "../scoring/cell";
import {
  evaluatePredicateCase,
  predicateBindingFailure,
} from "../scoring/predicate-evidence";

function baseManifest(
  extras: Record<string, unknown> = {},
): ReturnType<typeof parsePrivateEvaluatorManifest> {
  return parsePrivateEvaluatorManifest(
    JSON.stringify({
      schemaVersion: "1.1.0",
      taskId: "case-predicate-01",
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
        required: [{ tool: "kb_search", predicate: "sequence=1" }],
        forbidden: [{ tool: "kb_delete", predicate: "unless needed" }],
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
        reason: "n/a",
        fixturePath: null,
        approvalPhase: "not-applicable",
      })),
      predicateExpectation: {
        semanticClass: "builtin_relational",
        expectedLane: "predicate",
        expectedPredicateName: "commit_action",
        expectedPredicateArgs: ["editor", "save"],
        expectedPolarity: "assert",
        expectedEdges: [
          { relationship: "requires_predicate", target: "commit_action" },
        ],
        expectedGroundFactKinds: ["predicate"],
        expectedLogicClaimCount: 1,
        privateRationale: "exact fit",
      },
      ...extras,
    }),
  );
}

function binding() {
  return {
    caseId: "case-predicate-01",
    roots: {
      publicManifestHash: "a".repeat(64),
      workspaceHash: "b".repeat(64),
      fixtureSeedHash: "c".repeat(64),
    },
    sequence: 1,
  } as const;
}

function snapshot(
  overrides: Partial<PredicateCaseSnapshot> = {},
): PredicateCaseSnapshot {
  return {
    binding: binding(),
    facts: [
      {
        id: "FACT-1",
        factKind: "predicate",
        predicateName: "commit_action",
        predicateArgs: ["editor", "save"],
        polarity: "assert",
        claimKey: "CLAIM-1111111111111111",
        claimText: "The editor must save.",
      },
    ],
    relationships: [
      { relationship: "requires_predicate", target: "commit_action" },
    ],
    logicClaims: ["CLAIM-1111111111111111"],
    ...overrides,
  };
}

function evidence(snap?: PredicateCaseSnapshot | string): CellEvidence {
  return {
    finalState: {
      complete: true,
      integrityValid: true,
      claims: [],
      ...(snap === undefined ? {} : { snapshot: snap }),
    },
    broker: {
      complete: true,
      integrityValid: true,
      claims: [],
      orderedCalls: [],
    },
    diagnostic: { complete: true, integrityValid: true, claims: [] },
    codex: { complete: true, integrityValid: true, claims: [] },
    isolation: { observedSentinels: [], violations: [] },
  };
}

describe("evaluatePredicateCase remaining lane and failure branches", () => {
  test("returns no evidence when the manifest has no predicate expectation", () => {
    const manifest = baseManifest({ predicateExpectation: null });
    expect(evaluatePredicateCase(manifest, evidence(snapshot()))).toEqual({
      failureCodes: [],
    });
  });

  test("passes a matching object snapshot and string snapshots that decode", () => {
    const manifest = baseManifest();
    expect(evaluatePredicateCase(manifest, evidence(snapshot()))).toEqual({
      predicateEvidence: { outcome: "pass", caseId: "case-predicate-01" },
      failureCodes: [],
    });
  });

  test("records every predicate failure family", () => {
    const manifest = baseManifest({
      predicateExpectation: {
        semanticClass: "project_local_schema",
        expectedLane: "rule",
        expectedPredicateName: "other_pred",
        expectedPredicateArgs: ["x"],
        expectedPolarity: "deny",
        expectedEdges: [{ relationship: "requires_rule", target: "missing" }],
        expectedGroundFactKinds: ["rule", "subject"],
        expectedLogicClaimCount: 2,
        expectedRuleSemanticKey: "SEM-AAAAAAAAAAAAAAAAAAAAAAAA",
        expectedRuleHash: "d".repeat(64),
        privateRationale: "fail all",
      },
    });
    const result = evaluatePredicateCase(
      manifest,
      evidence(
        snapshot({
          facts: [
            {
              id: "FACT-OBS",
              factKind: "observation",
            },
          ],
          relationships: [],
          logicClaims: ["CLAIM-1111111111111111"],
        }),
      ),
    );
    expect(result.failureCodes).toEqual(
      expect.arrayContaining([
        "predicate-lane",
        "logical-fact-lanes",
        "logic-claim-manifest",
        "logic-claim-grounding",
        "predicate-name",
        "rule-semantic-key",
        "rule-hash",
        "predicate-edges",
      ]),
    );
    expect(result.predicateEvidence).toMatchObject({ outcome: "fail" });
  });

  test("covers remaining lanes and mismatched predicate args or polarity", () => {
    const property = baseManifest({
      predicateExpectation: {
        semanticClass: "strict_scalar_counterexample",
        expectedLane: "strict_property",
        expectedPredicateName: null,
        expectedPredicateArgs: null,
        expectedPolarity: "assert",
        expectedEdges: [],
        expectedGroundFactKinds: ["subject", "property_value"],
        expectedLogicClaimCount: 1,
        privateRationale: "property",
      },
    });
    expect(
      evaluatePredicateCase(
        property,
        evidence(
          snapshot({
            facts: [
              { id: "S", factKind: "subject" },
              {
                id: "P",
                factKind: "property_value",
                claimKey: "CLAIM-1111111111111111",
                claimText: "enabled",
              },
            ],
            logicClaims: ["CLAIM-1111111111111111"],
          }),
        ),
      ).failureCodes,
    ).toEqual([]);

    const observation = baseManifest({
      predicateExpectation: {
        semanticClass: "ontology_gap",
        expectedLane: "ontology_gap_observation",
        expectedPredicateName: null,
        expectedPredicateArgs: null,
        expectedPolarity: "assert",
        expectedEdges: [],
        expectedGroundFactKinds: ["observation"],
        expectedLogicClaimCount: 0,
        privateRationale: "gap",
      },
    });
    expect(
      evaluatePredicateCase(
        observation,
        evidence(snapshot({ facts: [{ id: "O", factKind: "observation" }], logicClaims: [] })),
      ).failureCodes,
    ).toEqual([]);

    const mismatched = evaluatePredicateCase(
      baseManifest(),
      evidence(
        snapshot({
          facts: [
            {
              id: "FACT-1",
              factKind: "predicate",
              predicateName: "commit_action",
              predicateArgs: ["wrong"],
              polarity: "deny",
              claimKey: "CLAIM-1111111111111111",
              claimText: "x",
            },
          ],
        }),
      ),
    );
    expect(mismatched.failureCodes).toEqual(
      expect.arrayContaining(["predicate-args", "predicate-polarity"]),
    );
  });

  test("throws when a required snapshot is missing and maps binding failures", () => {
    const manifest = baseManifest();
    expect(() => evaluatePredicateCase(manifest, evidence())).toThrow(
      EvidenceBindingError,
    );
    expect(predicateBindingFailure(baseManifest({ predicateExpectation: null }), new EvidenceBindingError("roots"))).toBeUndefined();
    expect(predicateBindingFailure(manifest, new EvidenceBindingError("roots"))).toMatchObject({
      failure: "wrong-graph",
    });
    expect(predicateBindingFailure(manifest, new EvidenceBindingError("case-id"))).toMatchObject({
      failure: "replayed-evidence",
    });
    expect(predicateBindingFailure(manifest, new EvidenceBindingError("sequence"))).toMatchObject({
      failure: "replayed-evidence",
    });
    expect(
      predicateBindingFailure(manifest, new EvidenceBindingError("snapshot-hash")),
    ).toMatchObject({ failure: "mixed-snapshot" });
    expect(
      predicateBindingFailure(
        manifest,
        new EvidenceBindingError("malformed-snapshot"),
      ),
    ).toMatchObject({ failure: "malformed-snapshot" });
  });
});
