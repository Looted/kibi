import { describe, expect, test } from "bun:test";
import { parsePrivateEvaluatorManifest } from "../fixtures/private";
import { decodeFinalStatePredicateSnapshot } from "../runtime/final-state";
import { scoreCell } from "../scoring/cell";
import {
  evaluatorEvidence,
  evaluatorManifest,
  evaluatorRoots,
  predicateSnapshot,
} from "./fixtures/evaluator-authority-fixtures";

describe("evaluator authority", () => {
  test("Given compound normative prose When only one clause is grounded Then logical coverage fails behaviorally", () => {
    const taskId = "kibi-usage-fact-predicate-modeling-train-1";
    const manifest = parsePrivateEvaluatorManifest(
      JSON.stringify({
        ...evaluatorManifest("predicate"),
        taskId,
        predicateExpectation: {
          semanticClass: "builtin_relational",
          expectedLane: "predicate",
          expectedPredicateName: "dependency_rule",
          expectedPredicateArgs: [
            "checkout",
            "payment_authorization",
            "order_submission",
          ],
          expectedPolarity: "assert",
          expectedEdges: [
            { relationship: "requires_predicate", target: "dependency_rule" },
            { relationship: "constrains", target: "customer_data" },
            {
              relationship: "requires_property",
              target: "retention_years=7",
            },
          ],
          expectedGroundFactKinds: ["predicate", "subject", "property_value"],
          expectedLogicClaimCount: 2,
          privateRationale: "Both atomic clauses must be grounded.",
        },
      }),
    );
    const complete = predicateSnapshot({
      binding: { caseId: taskId, roots: evaluatorRoots, sequence: 1 },
      facts: [
        {
          id: "FACT-dependency",
          factKind: "predicate",
          predicateName: "dependency_rule",
          predicateArgs: [
            "checkout",
            "payment_authorization",
            "order_submission",
          ],
          polarity: "assert",
          claimKey: "CLAIM-AAAAAAAAAAAAAAAA",
          claimText:
            "Checkout requires payment authorization before order submission.",
        },
        { id: "FACT-customer-data", factKind: "subject" },
        {
          id: "FACT-retention",
          factKind: "property_value",
          claimKey: "CLAIM-BBBBBBBBBBBBBBBB",
          claimText: "Customer data must be retained for 7 years.",
        },
      ],
      relationships: [
        { relationship: "requires_predicate", target: "dependency_rule" },
        { relationship: "constrains", target: "customer_data" },
        { relationship: "requires_property", target: "retention_years=7" },
      ],
      logicClaims: ["CLAIM-AAAAAAAAAAAAAAAA", "CLAIM-BBBBBBBBBBBBBBBB"],
    });

    expect(scoreCell(manifest, evaluatorEvidence(complete)).outcome).toBe(
      "pass",
    );

    const incomplete = scoreCell(
      manifest,
      evaluatorEvidence(
        predicateSnapshot({
          ...complete,
          facts: complete.facts.filter(
            (fact) => fact.factKind !== "property_value",
          ),
          relationships: complete.relationships.filter(
            (edge) => edge.relationship !== "requires_property",
          ),
          logicClaims: ["CLAIM-AAAAAAAAAAAAAAAA"],
        }),
      ),
    );
    expect(incomplete.terminalCategory).toBe("behavioral_failure");
    expect(incomplete.criticalFailures).toEqual(
      expect.arrayContaining([
        "logical-fact-lanes",
        "logic-claim-manifest",
        "logic-claim-grounding",
      ]),
    );
  });

  test("Given a read-only predicate snapshot When the required deny predicate is present Then it passes", () => {
    const receipt = scoreCell(
      evaluatorManifest("predicate"),
      evaluatorEvidence(predicateSnapshot()),
    );
    expect(receipt.outcome).toBe("pass");
  });

  test("Given a snapshot using an observation lane When a predicate lane is required Then it fails", () => {
    const receipt = scoreCell(
      evaluatorManifest("predicate"),
      evaluatorEvidence(
        predicateSnapshot({
          facts: [
            {
              id: "FACT-held-out-matrix",
              factKind: "observation",
              canonicalKey: "held_out_matrix",
            },
          ],
        }),
      ),
    );
    expect(receipt.terminalCategory).toBe("behavioral_failure");
    expect(receipt.criticalFailures).toContain("predicate-lane");
  });

  test("Given a predicate snapshot without its required predicate When the evaluator scores it Then it fails", () => {
    const receipt = scoreCell(
      evaluatorManifest("predicate"),
      evaluatorEvidence(predicateSnapshot({ facts: [] })),
    );
    expect(receipt.terminalCategory).toBe("behavioral_failure");
    expect(receipt.criticalFailures).toContain("predicate-name");
  });

  test("Given an ontology-gap observation in a read-only snapshot When it has the review edge Then it passes", () => {
    const receipt = scoreCell(
      evaluatorManifest("ontology_gap_observation"),
      evaluatorEvidence(
        predicateSnapshot({
          facts: [
            {
              id: "FACT-ontology-gap",
              factKind: "observation",
              canonicalKey: "review:ontology-gap",
            },
          ],
          relationships: [
            { relationship: "relates_to", target: "review:ontology-gap" },
          ],
          logicClaims: [],
        }),
      ),
    );
    expect(receipt.outcome).toBe("pass");
  });

  test("Given replayed evidence When evaluator evidence is decoded Then it has a typed private failure", () => {
    const receipt = scoreCell(
      evaluatorManifest("predicate"),
      evaluatorEvidence(
        predicateSnapshot({
          binding: {
            caseId: "replayed-case",
            roots: evaluatorRoots,
            sequence: 1,
          },
        }),
      ),
    );
    expect(receipt.outcome).toBe("ambiguous");
    expect(receipt.terminalCategory).toBe("evidence_conflict");
    expect(receipt.predicateEvidence).toEqual({
      outcome: "fail",
      caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
      failure: "replayed-evidence",
    });
  });

  test("Given a snapshot from the wrong graph When evaluator evidence is decoded Then it has a typed private failure", () => {
    // Given
    const wrongGraph = predicateSnapshot({
      binding: {
        caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
        roots: { ...evaluatorRoots, workspaceHash: "d".repeat(64) },
        sequence: 1,
      },
    });

    // When
    const receipt = scoreCell(
      evaluatorManifest("predicate"),
      evaluatorEvidence(wrongGraph),
    );

    // Then
    expect(receipt.predicateEvidence).toEqual({
      outcome: "fail",
      caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
      failure: "wrong-graph",
    });
  });

  test("Given a mixed final-state snapshot When evaluator evidence is decoded Then it has a typed private failure", () => {
    // Given
    const snapshot = predicateSnapshot();
    const finalState = JSON.stringify({
      schemaVersion: "1.0.0",
      workspaceRoot: "/isolated/workspace",
      binding: {
        caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
        roots: evaluatorRoots,
        sequence: 1,
      },
      requests: [
        {
          tool: "kb_query",
          args: { type: "fact" },
          result: snapshot,
          resultHash: "0".repeat(64),
        },
      ],
    });

    // When
    const receipt = scoreCell(
      evaluatorManifest("predicate"),
      evaluatorEvidence(finalState),
    );

    // Then
    expect(receipt.predicateEvidence).toEqual({
      outcome: "fail",
      caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
      failure: "mixed-snapshot",
    });
  });

  test("Given a read-only kb_query receipt When final-state evidence is decoded Then only its bound snapshot is accepted", () => {
    const snapshot = predicateSnapshot();
    const receipt = JSON.stringify({
      schemaVersion: "1.0.0",
      workspaceRoot: "/isolated/workspace",
      binding: {
        caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
        roots: evaluatorRoots,
        sequence: 1,
      },
      requests: [
        {
          tool: "kb_query",
          args: { type: "fact" },
          result: snapshot,
          resultHash: new Bun.CryptoHasher("sha256")
            .update(JSON.stringify(snapshot))
            .digest("hex"),
        },
      ],
    });
    expect(
      decodeFinalStatePredicateSnapshot(receipt, snapshot.binding),
    ).toEqual(snapshot);
  });

  test("Given a captured final-state receipt When the cell scores it Then no caller-provided snapshot facts are used", () => {
    const snapshot = predicateSnapshot();
    const finalState = JSON.stringify({
      schemaVersion: "1.0.0",
      workspaceRoot: "/isolated/workspace",
      binding: {
        caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
        roots: evaluatorRoots,
        sequence: 1,
      },
      requests: [
        {
          tool: "kb_query",
          args: { type: "fact" },
          result: snapshot,
          resultHash: new Bun.CryptoHasher("sha256")
            .update(JSON.stringify(snapshot))
            .digest("hex"),
        },
      ],
    });
    const receipt = scoreCell(
      evaluatorManifest("predicate"),
      evaluatorEvidence(finalState),
    );
    expect(receipt.outcome).toBe("pass");
  });

  test("Given an authentic MCP query result When final-state evidence is decoded Then predicate facts and incoming edges are bound", () => {
    const result = {
      content: [{ type: "text", text: "Found 2 entities." }],
      structuredContent: {
        entities: [
          {
            id: "REQ-held-out-matrix",
            type: "req",
            logic_claims: ["CLAIM-AAAAAAAAAAAAAAAA"],
            requires_predicate: "kb:entity/FACT-held-out-matrix",
          },
          {
            id: "FACT-held-out-matrix",
            type: "fact",
            fact_kind: "predicate",
            canonical_key:
              "held_out_matrix(terminal_matrix_id,frozen_skillopt_candidate_hash)",
            predicate_name: "held_out_matrix",
            predicate_args: [
              "terminal_matrix_id",
              "frozen_skillopt_candidate_hash",
            ],
            polarity: "deny",
            claim_key: "CLAIM-AAAAAAAAAAAAAAAA",
            claim_text: "The matrix must deny changed candidate bytes.",
          },
        ],
        count: 2,
      },
    };
    const finalState = JSON.stringify({
      schemaVersion: "1.0.0",
      workspaceRoot: "/isolated/workspace",
      binding: {
        caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
        roots: evaluatorRoots,
        sequence: 1,
      },
      requests: [
        {
          tool: "kb_query",
          args: {},
          result,
          resultHash: new Bun.CryptoHasher("sha256")
            .update(JSON.stringify(result))
            .digest("hex"),
        },
      ],
    });

    expect(
      decodeFinalStatePredicateSnapshot(finalState, {
        caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
        roots: evaluatorRoots,
        sequence: 1,
      }),
    ).toEqual({
      binding: {
        caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
        roots: evaluatorRoots,
        sequence: 1,
      },
      facts: [
        {
          id: "FACT-held-out-matrix",
          factKind: "predicate",
          canonicalKey:
            "held_out_matrix(terminal_matrix_id,frozen_skillopt_candidate_hash)",
          predicateName: "held_out_matrix",
          predicateArgs: [
            "terminal_matrix_id",
            "frozen_skillopt_candidate_hash",
          ],
          polarity: "deny",
          claimKey: "CLAIM-AAAAAAAAAAAAAAAA",
          claimText: "The matrix must deny changed candidate bytes.",
        },
      ],
      relationships: [
        { relationship: "requires_predicate", target: "held_out_matrix" },
      ],
      logicClaims: ["CLAIM-AAAAAAAAAAAAAAAA"],
    });
  });

  test("Given an authentic wrong-lane MCP query result When scored Then it is a behavioral failure", () => {
    const result = {
      content: [{ type: "text", text: "Found 1 entity." }],
      structuredContent: {
        entities: [
          {
            id: "FACT-ontology-gap",
            type: "fact",
            fact_kind: "observation",
            tags: ["review:ontology-gap"],
          },
        ],
        count: 1,
      },
    };
    const finalState = JSON.stringify({
      schemaVersion: "1.0.0",
      workspaceRoot: "/isolated/workspace",
      binding: {
        caseId: "kibi-usage-fact-predicate-modeling-held-out-3",
        roots: evaluatorRoots,
        sequence: 1,
      },
      requests: [
        {
          tool: "kb_query",
          args: {},
          result,
          resultHash: new Bun.CryptoHasher("sha256")
            .update(JSON.stringify(result))
            .digest("hex"),
        },
      ],
    });

    const receipt = scoreCell(
      evaluatorManifest("predicate"),
      evaluatorEvidence(finalState),
    );

    expect(receipt.terminalCategory).toBe("behavioral_failure");
    expect(receipt.criticalFailures).toContain("predicate-lane");
    expect(receipt.criticalFailures).toContain("predicate-name");
  });
});
