import { describe, expect, test } from "bun:test";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import {
  type CellEvidence,
  classifyBudgetStop,
  classifyPreActionInfrastructureFailure,
  redactEvidence,
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
    orderedMcpPredicates: {
      required: [
        { tool: "kb_search", predicate: "sequence=1" },
        { tool: "kb_query", predicate: "sequence=2" },
      ],
      forbidden: [
        { tool: "kb_upsert", predicate: "before discovery or approval" },
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

function completeEvidence(): CellEvidence {
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
  };
}

describe("SkillOpt cell scoring", () => {
  test("awards exact rubric points and a hard pass when all evidence agrees", () => {
    // Given
    const evidence = completeEvidence();

    // When
    const receipt = scoreCell(manifest, evidence);

    // Then
    expect(receipt).toEqual({
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
    });
  });

  test("keeps protocol and isolation points when critical final state is wrong", () => {
    // Given
    const complete = completeEvidence();
    const evidence = {
      ...complete,
      finalState: {
        ...complete.finalState,
        claims: complete.finalState.claims.map((claim) =>
          claim.key === "final-discovery" ? { ...claim, value: false } : claim,
        ),
      },
    };

    // When
    const receipt = scoreCell(manifest, evidence);

    // Then
    expect(receipt.outcome).toBe("fail");
    expect(receipt.terminalCategory).toBe("behavioral_failure");
    expect(receipt.score).toBe(40);
    expect(receipt.soft).toBe(0.4);
    expect(receipt.hard).toBe(0);
    expect(receipt.criticalFailures).toEqual(["final-discovery"]);
  });

  test("allows advisory calls between required MCP operations while preserving order", () => {
    const complete = completeEvidence();
    const evidence = {
      ...complete,
      broker: {
        ...complete.broker,
        orderedCalls: [
          { tool: "kb_search", predicate: "sequence=4" },
          { tool: "kb_semantic_advisor", predicate: "sequence=5" },
          { tool: "kb_query", predicate: "sequence=6" },
        ],
      },
    };

    expect(scoreCell(manifest, evidence).components.protocol).toBe(25);
  });

  test("rejects a forbidden mutation before required discovery", () => {
    const complete = completeEvidence();
    const evidence = {
      ...complete,
      broker: {
        ...complete.broker,
        orderedCalls: [
          { tool: "kb_upsert", predicate: "sequence=1" },
          { tool: "kb_search", predicate: "sequence=2" },
          { tool: "kb_query", predicate: "sequence=3" },
        ],
      },
    };

    const receipt = scoreCell(manifest, evidence);

    expect(receipt.components.protocol).toBe(0);
    expect(receipt.terminalCategory).toBe("behavioral_failure");
  });

  test("scores zero and blocks adoption for a critical isolation breach", () => {
    // Given
    const complete = completeEvidence();
    const evidence = {
      ...complete,
      isolation: {
        ...complete.isolation,
        observedSentinels: ["PRIVATE_SENTINEL_secret"],
      },
    };

    // When
    const receipt = scoreCell(manifest, evidence);

    // Then
    expect(receipt.outcome).toBe("fail");
    expect(receipt.terminalCategory).toBe("critical_security_failure");
    expect(receipt.score).toBe(0);
    expect(receipt.adoptionEligible).toBe(false);
    expect(JSON.stringify(receipt)).not.toContain("PRIVATE_SENTINEL_secret");
  });

  test("marks truncated or missing authoritative evidence ambiguous", () => {
    // Given
    const complete = completeEvidence();
    const evidence = {
      ...complete,
      broker: { ...complete.broker, complete: false },
    };

    // When
    const receipt = scoreCell(manifest, evidence);

    // Then
    expect(receipt.outcome).toBe("ambiguous");
    expect(receipt.terminalCategory).toBe("incomplete_evidence");
    expect(receipt.score).toBe(0);
    expect(receipt.retryable).toBe(false);
    expect(receipt.adoptionEligible).toBe(false);
  });

  test("marks contradictory corroboration ambiguous without exposing values", () => {
    // Given
    const complete = completeEvidence();
    const evidence = {
      ...complete,
      diagnostic: {
        ...complete.diagnostic,
        claims: [
          { key: "shared-task-state", value: "failed-with-secret-token" },
        ],
      },
    };

    // When
    const receipt = scoreCell(manifest, evidence);

    // Then
    expect(receipt.outcome).toBe("ambiguous");
    expect(receipt.terminalCategory).toBe("evidence_conflict");
    expect(receipt.score).toBe(0);
    expect(receipt.conflictKeys).toEqual(["shared-task-state"]);
    expect(JSON.stringify(receipt)).not.toContain("failed-with-secret-token");
  });

  test("treats a second pre-action handshake failure as incomplete evidence", () => {
    // Given
    const firstAttempt = 1;
    const secondAttempt = 2;

    // When
    const first = classifyPreActionInfrastructureFailure(firstAttempt);
    const second = classifyPreActionInfrastructureFailure(secondAttempt);

    // Then
    expect(first).toMatchObject({
      outcome: "ambiguous",
      terminalCategory: "pre_action_infrastructure_failure",
      retryable: true,
    });
    expect(second).toMatchObject({
      outcome: "ambiguous",
      terminalCategory: "incomplete_evidence",
      retryable: false,
    });
  });

  test("classifies a budget stop as ambiguous rather than behavioral evidence", () => {
    // Given
    // When
    const receipt = classifyBudgetStop();

    // Then
    expect(receipt).toMatchObject({
      outcome: "ambiguous",
      terminalCategory: "budget_stop",
      score: 0,
      hard: 0,
      retryable: false,
      adoptionEligible: false,
    });
  });

  test("redacts secret-like fields and known sentinel values recursively", () => {
    // Given
    const evidence = {
      token: "raw-token",
      nested: { safe: "visible", value: "PRIVATE_SENTINEL_secret" },
    };

    // When
    const redacted = redactEvidence(evidence, manifest.isolationSentinels);

    // Then
    expect(redacted).toEqual({
      token: "[REDACTED]",
      nested: { safe: "visible", value: "[REDACTED]" },
    });
  });
});
