// implements REQ-skillopt-predicate-first-requirements
import { afterEach, describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import {
  heldOutEvaluationFromReceipt,
  reviewHeldOutMatrix,
} from "../held-out-review";
import { evaluation } from "./held-out-evaluation-test-helpers";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

describe("held-out review remaining eligible evaluation mapping", () => {
  test("maps an eligible receipt onto an external-verdict review", () => {
    expect(
      heldOutEvaluationFromReceipt({
        schemaVersion: "1.0.0",
        artifactType: "held-out-terminal-eligibility-receipt",
        eligibility: "eligible",
        reservationHash: "a".repeat(64),
        authorizationRootHash: "b".repeat(64),
        physicalCellCount: 96,
        frozenVariantHashes: {
          baseline: "c".repeat(64),
          oneShot: "d".repeat(64),
          skillopt: "e".repeat(64),
        },
        episodeHashes: [],
        evidenceHashes: [],
        gateOutcomes: {
          predicate: "eligible",
          skill: { outcome: "pass", adoptionEligible: true },
          bundle: { outcome: "pass", adoptionEligible: true },
        },
      }),
    ).toEqual({
      eligibility: "eligible",
      cellCount: 96,
      productionAdoption: "external-verdict-required",
    });
  });

  test("reviewHeldOutMatrix evaluates a complete reserved matrix", () => {
    const input = evaluation();
    roots.push(input.root);
    const review = reviewHeldOutMatrix({
      reservation: input.reservation,
      physicalCells: input.physicalCells,
    });
    expect(review.eligibility).toBe("eligible");
    expect(review.cellCount).toBe(input.physicalCells.length);
    expect((review as { productionAdoption: string }).productionAdoption).toBe(
      "external-verdict-required",
    );
  });
});
