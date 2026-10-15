import { describe, expect, test } from "bun:test";
import {
  loadReviewRequirements,
  reviewCandidate,
  reviewNextAction,
  reviewSentence,
} from "../../src/operations/planning/conflict-review.js";
import type { PrologQueryResult } from "../../src/public/operations/runtime-types.js";

const CANCEL = {
  id: "REQ-editor-escape-cancels",
  title: "Escape cancels a label edit",
  semanticText:
    "Labels are edited inline. Pressing Escape discards the label edit without saving.",
  modeled: false,
};

describe("contradiction review candidates", () => {
  test("quotes the sentence sharing the most terms with the intent", () => {
    expect(
      reviewSentence("Pressing Escape saves the label edit.", CANCEL),
    ).toBe("Pressing Escape discards the label edit without saving.");
    expect(
      reviewSentence("anything", { title: "Only a title", semanticText: "" }),
    ).toBe("Only a title");
  });

  test("carries the review verdict and bounds a long statement", () => {
    const pending = reviewCandidate(
      "Escape saves.",
      CANCEL,
      0.29199,
      undefined,
    );
    expect(pending).toMatchObject({
      requirementId: CANCEL.id,
      score: 0.292,
      modeled: false,
      review: "pending",
    });
    expect(pending.note).toBeUndefined();
    const long = reviewCandidate(
      "Escape saves.",
      { ...CANCEL, semanticText: "word ".repeat(400) },
      0.5,
      {
        requirementId: CANCEL.id,
        verdict: "no_conflict",
        note: "Different key.",
      },
    );
    expect(long.statement.length).toBe(600);
    expect(long.statement.endsWith("…")).toBe(true);
    expect(long).toMatchObject({
      review: "no_conflict",
      note: "Different key.",
    });
  });

  test("next action resolves a conflict first, then pending reviews, then modeling", () => {
    const candidate = (review: "pending" | "conflict" | "no_conflict") =>
      reviewCandidate(
        "Escape saves.",
        CANCEL,
        0.3,
        review === "pending"
          ? undefined
          : { requirementId: CANCEL.id, verdict: review },
      );
    expect(reviewNextAction([candidate("conflict")], ["CLAIM-1"])).toContain(
      "Ask the human which rule holds",
    );
    expect(reviewNextAction([candidate("pending")], ["CLAIM-1"])).toContain(
      "conflictReviews",
    );
    expect(reviewNextAction([candidate("no_conflict")], ["CLAIM-1"])).toContain(
      "kb_model",
    );
    expect(reviewNextAction([candidate("no_conflict")], [])).toBeUndefined();
  });

  test("loads only current requirements, marking which have logic", async () => {
    const goals: string[] = [];
    const prolog = {
      query: async (goal: string): Promise<PrologQueryResult> => {
        goals.push(goal);
        if (goal.includes("kb:current_req"))
          return {
            success: true,
            bindings: { Rows: "[['REQ-a',modeled],['REQ-b',unmodeled]]" },
          };
        return {
          success: true,
          bindings: {
            Results:
              "[['REQ-a',req,[title='A',semantic_text='A text.']],['REQ-b',req,[title='B']]]",
          },
        };
      },
    };
    const loaded = await loadReviewRequirements(prolog, [
      "REQ-a",
      "REQ-b",
      "REQ-gone",
      "REQ-a",
    ]);
    expect([...loaded.values()]).toEqual([
      { id: "REQ-a", title: "A", semanticText: "A text.", modeled: true },
      { id: "REQ-b", title: "B", semanticText: "", modeled: false },
    ]);
    expect(goals[0]).toContain("'REQ-gone'");
    expect(await loadReviewRequirements(prolog, [])).toEqual(new Map());
  });
});
