import { afterAll, describe, expect, test } from "bun:test";
import {
  needsConflictReview,
  withConflictReviewSignals,
} from "../../../src/operations/bootstrap/conflict-review.js";
import type { Candidate, SourceOnlySignal } from "../../../src/operations/bootstrap/types.js";
import { scratch } from "../helpers.js";

const ws = scratch();
afterAll(() => ws.cleanup());

const candidate = (fields: Partial<Candidate>): Candidate => ({
  candidateId: "c1",
  entityType: "req",
  title: "Uploads must verify the checksum of every chunk",
  sourceKind: "intent_claim",
  sourcePath: "docs/intent.md",
  confidence: 0.9,
  confidenceBand: "high",
  evidence: ["intent_claim:docs/intent.md#L3"],
  relationships: [],
  applyPlan: [],
  ...fields,
});
const signal = (fields: Partial<SourceOnlySignal>): SourceOnlySignal => ({
  kind: "req",
  title: "claim",
  sourcePath: "docs/intent.md",
  confidence: 0.5,
  evidence: [],
  ...fields,
});
const requirements = [
  {
    id: "REQ-checksum",
    title: "Upload checksum verification",
    semanticText: "Uploads must verify the checksum of every chunk before completion.",
    modeled: false,
  },
  { id: "REQ-modeled", title: "Modeled", semanticText: "x", modeled: true },
] as unknown as Parameters<typeof withConflictReviewSignals>[1];

describe("withConflictReviewSignals", () => {
  test("passes everything through without unmodeled requirements", async () => {
    const rows = [candidate({})];
    expect(await withConflictReviewSignals(rows, [], ws.root)).toStrictEqual({
      candidates: rows,
      signals: [],
      diagnostics: [],
    });
  });

  test("marks claims and signals that must be compared with an unmodeled requirement", async () => {
    const result = await withConflictReviewSignals(
      [
        candidate({}),
        candidate({ candidateId: "c2", sourceKind: "markdown" }),
        candidate({ candidateId: "c3", title: "Dark mode toggles the theme palette", evidence: [] }),
      ],
      requirements,
      ws.root,
      [
        signal({ claimStatement: "Uploads must verify the checksum of every chunk" }),
        signal({ kind: "test", claimStatement: "Uploads must verify the checksum" }),
        signal({ title: "plain" }),
        signal({ claimStatement: "Dark mode toggles the theme palette" }),
      ],
    );
    expect(result.candidates.map(needsConflictReview)).toStrictEqual([true, false, false]);
    expect(result.candidates[0]?.evidence).toStrictEqual([
      "intent_claim:docs/intent.md#L3",
      "review_against:REQ-checksum",
    ]);
    expect(result.signals.map(needsConflictReview)).toStrictEqual([true, false, false, false]);
    expect(result.diagnostics).toStrictEqual([
      'conflict-review: Intent claim at docs/intent.md#L3 ("Uploads must verify the checksum of every chunk") was not checked for contradictions against current requirement REQ-checksum ("Upload checksum verification"), which has no logical representation. Compare them before approval: on a contradiction show both to the human, then drop the claim or keep it and supersede the requirement after apply; record a conflict the human has not decided as a review:conflict observation fact.',
      'conflict-review: Intent claim at docs/intent.md ("Uploads must verify the checksum of every chunk") needs authoring and was not checked for contradictions against current requirement REQ-checksum ("Upload checksum verification"), which has no logical representation. When you compile the claim with kb_compile_intent, compare it with them and report each verdict through conflictReviews; on a contradiction show both to the human before writing.',
    ]);
  });
});
