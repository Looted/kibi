import { describe, expect, test } from "bun:test";
import { decodeFinalStatePredicateSnapshot } from "../runtime/final-state";
import { scoreCell } from "../scoring/cell";
import {
  evaluatorEvidence,
  evaluatorManifest,
  evaluatorRoots,
  predicateSnapshot,
} from "./fixtures/evaluator-authority-fixtures";

describe("evaluator authority", () => {
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
});
