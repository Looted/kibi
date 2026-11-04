import { afterEach, describe, expect, test } from "bun:test";
import {
  needsConflictReview,
  withConflictReviewSignals,
} from "../../../src/operations/bootstrap/conflict-review.js";
import type {
  Candidate,
  SourceOnlySignal,
} from "../../../src/operations/bootstrap/types.js";
import { removeTempWorkspaces, tempWorkspace } from "../workspace.js";

afterEach(removeTempWorkspaces);

const candidate = (overrides: Partial<Candidate> = {}): Candidate => ({
  candidateId: "c1",
  entityType: "req",
  title: "Users export reports",
  sourceKind: "intent_claim",
  sourcePath: "docs/intent.md",
  confidence: 0.9,
  confidenceBand: "high",
  evidence: ["intent_claim:docs/intent.md#L3"],
  relationships: [],
  applyPlan: [],
  ...overrides,
});

const signal = (
  overrides: Partial<SourceOnlySignal> = {},
): SourceOnlySignal => ({
  kind: "req",
  title: "Signal",
  sourcePath: "docs/signal.md",
  confidence: 0.5,
  evidence: ["intent_claim:docs/signal.md#L9"],
  claimStatement: "Users export reports",
  ...overrides,
});

const unmodeled = {
  id: "REQ-u",
  title: "Report export",
  semanticText: "Users export reports weekly.",
  modeled: false,
};

const CANDIDATE_DIAGNOSTIC = (citation: string, title: string, named: string) =>
  `conflict-review: Intent claim at ${citation} ("${title}") was not checked for contradictions against current requirement ${named}, which has no logical representation. Compare them before approval: on a contradiction show both to the human, then drop the claim or keep it and supersede the requirement after apply; record a conflict the human has not decided as a review:conflict observation fact.`;
const SIGNAL_DIAGNOSTIC = (
  citation: string,
  statement: string,
  named: string,
) =>
  `conflict-review: Intent claim at ${citation} ("${statement}") needs authoring and was not checked for contradictions against current requirement ${named}, which has no logical representation. When you compile the claim with kb_compile_intent, compare it with them and report each verdict through conflictReviews; on a contradiction show both to the human before writing.`;

describe("needsConflictReview", () => {
  test("looks for review_against evidence", () => {
    expect(
      needsConflictReview({ evidence: ["x", "review_against:REQ-a"] }),
    ).toBe(true);
    expect(
      needsConflictReview({
        evidence: ["xreview_against:REQ-a", "review_against"],
      }),
    ).toBe(false);
    expect(needsConflictReview({ evidence: [] })).toBe(false);
  });
});

describe("withConflictReviewSignals", () => {
  test("changes nothing without unmodeled requirements", async () => {
    const candidates = [candidate()];
    const signals = [signal()];
    const result = await withConflictReviewSignals(
      candidates,
      [
        { ...unmodeled, modeled: true },
        {
          id: "REQ-unknown",
          title: "Report export",
          semanticText: "Users export reports weekly.",
        },
      ],
      tempWorkspace(),
      signals,
    );
    expect(result).toStrictEqual({ candidates, signals, diagnostics: [] });
    expect(result.candidates).not.toBe(candidates);
    expect(result.signals).not.toBe(signals);
    expect(
      await withConflictReviewSignals([], [], tempWorkspace()),
    ).toStrictEqual({
      candidates: [],
      signals: [],
      diagnostics: [],
    });
  });

  test("names related unmodeled requirements on intent claim candidates", async () => {
    const other = {
      id: "REQ-v",
      title: "Weekly reports",
      semanticText: "Users export reports weekly to auditors.",
      modeled: false,
    };
    const result = await withConflictReviewSignals(
      [
        candidate(),
        candidate({
          candidateId: "c2",
          evidence: ["source:x"],
          sourcePath: "docs/other.md",
        }),
        candidate({ candidateId: "c3", sourceKind: "markdown" }),
        candidate({ candidateId: "c4", entityType: "scenario" }),
        candidate({ candidateId: "c5", title: "Billing invoices tax" }),
      ],
      [
        unmodeled,
        other,
        {
          id: "REQ-m",
          title: "Modeled export",
          semanticText: "Users export reports weekly.",
          modeled: true,
        },
      ],
      tempWorkspace(),
    );
    const named = 'REQ-u ("Report export"), REQ-v ("Weekly reports")';
    expect(result.diagnostics).toStrictEqual([
      CANDIDATE_DIAGNOSTIC("docs/intent.md#L3", "Users export reports", named),
      CANDIDATE_DIAGNOSTIC("docs/other.md", "Users export reports", named),
    ]);
    expect(
      result.candidates.map((c) => [c.candidateId, c.evidence]),
    ).toStrictEqual([
      [
        "c1",
        [
          "intent_claim:docs/intent.md#L3",
          "review_against:REQ-u",
          "review_against:REQ-v",
        ],
      ],
      ["c2", ["source:x", "review_against:REQ-u", "review_against:REQ-v"]],
      ["c3", ["intent_claim:docs/intent.md#L3"]],
      ["c4", ["intent_claim:docs/intent.md#L3"]],
      ["c5", ["intent_claim:docs/intent.md#L3"]],
    ]);
    expect(result.candidates[0]).toStrictEqual({
      ...candidate(),
      evidence: [
        "intent_claim:docs/intent.md#L3",
        "review_against:REQ-u",
        "review_against:REQ-v",
      ],
    });
    expect(result.signals).toStrictEqual([]);
  });

  test("ranks requirements by their type too", async () => {
    const result = await withConflictReviewSignals(
      [candidate({ title: "req" })],
      [
        {
          id: "R-1",
          title: "Alpha",
          semanticText: "Beta gamma.",
          modeled: false,
        },
      ],
      tempWorkspace(),
    );
    expect(result.candidates[0]?.evidence).toStrictEqual([
      "intent_claim:docs/intent.md#L3",
      "review_against:R-1",
    ]);
  });

  test("names at most five requirements", async () => {
    const requirements = ["a", "b", "c", "d", "e", "f"].map((suffix) => ({
      ...unmodeled,
      id: `REQ-${suffix}`,
    }));
    const result = await withConflictReviewSignals(
      [candidate()],
      requirements,
      tempWorkspace(),
    );
    expect(
      result.candidates[0]?.evidence.filter((entry) =>
        entry.startsWith("review_against:"),
      ),
    ).toHaveLength(5);
  });

  test("names related unmodeled requirements on claim signals that need authoring", async () => {
    const result = await withConflictReviewSignals(
      [],
      [unmodeled],
      tempWorkspace(),
      [
        signal(),
        signal({ evidence: [], sourcePath: "docs/plain.md" }),
        signal({ kind: "scenario" }),
        signal({ claimStatement: undefined }),
        signal({ claimStatement: "Billing invoices tax" }),
      ],
    );
    expect(result.diagnostics).toStrictEqual([
      SIGNAL_DIAGNOSTIC(
        "docs/signal.md#L9",
        "Users export reports",
        'REQ-u ("Report export")',
      ),
      SIGNAL_DIAGNOSTIC(
        "docs/plain.md",
        "Users export reports",
        'REQ-u ("Report export")',
      ),
    ]);
    expect(result.signals).toStrictEqual([
      signal({
        evidence: ["intent_claim:docs/signal.md#L9", "review_against:REQ-u"],
      }),
      signal({
        evidence: ["review_against:REQ-u"],
        sourcePath: "docs/plain.md",
      }),
      signal({ kind: "scenario" }),
      signal({ claimStatement: undefined }),
      signal({ claimStatement: "Billing invoices tax" }),
    ]);
  });
});
