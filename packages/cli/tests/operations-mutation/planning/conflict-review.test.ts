import { describe, expect, test } from "bun:test";
import {
  type ConflictReviewCandidate,
  MAX_REVIEW_CANDIDATES,
  REVIEW_CANDIDATE_MIN_SCORE,
  loadReviewRequirements,
  reviewCandidate,
  reviewNextAction,
  reviewSentence,
} from "../../../src/operations/planning/conflict-review.js";

type Result = { success: boolean; bindings: Record<string, string> };

function fakeProlog(rows: Result, entities: string) {
  const goals: string[] = [];
  return {
    goals,
    prolog: {
      query: async (goal: string): Promise<Result> => {
        goals.push(goal);
        return goal.startsWith("findall([R,M]")
          ? rows
          : { success: true, bindings: { Results: entities } };
      },
    },
  };
}

describe("review constants", () => {
  test("are stable", () => {
    expect(REVIEW_CANDIDATE_MIN_SCORE).toBe(0.1);
    expect(MAX_REVIEW_CANDIDATES).toBe(5);
  });
});

describe("loadReviewRequirements", () => {
  test("asks nothing for no ids", async () => {
    const { prolog, goals } = fakeProlog(
      { success: true, bindings: { Rows: "[]" } },
      "[]",
    );
    expect(await loadReviewRequirements(prolog, ["", ""])).toStrictEqual(
      new Map(),
    );
    expect(goals).toStrictEqual([]);
  });

  test("returns nothing when the query fails", async () => {
    const { prolog, goals } = fakeProlog(
      { success: false, bindings: {} },
      "[]",
    );
    expect(await loadReviewRequirements(prolog, ["REQ-a"])).toStrictEqual(
      new Map(),
    );
    expect(goals).toHaveLength(1);
  });

  test("loads current requirements with their modeled flag", async () => {
    const { prolog, goals } = fakeProlog(
      {
        success: true,
        bindings: {
          Rows: "[['REQ-a',modeled],['REQ-b',unmodeled],['\"REQ-c\"',modeled],['REQ-''q',unmodeled]]",
        },
      },
      "[['REQ-a',req,[title=\" A title \",semantic_text=\"A text.\"]],['REQ-b',req,[title=\"B\"]],['REQ-x',req,[title=\"X\"]],['REQ-c',req,[]],['REQ-''q',req,[title=\"Q\"]]]",
    );
    expect(
      await loadReviewRequirements(prolog, [
        "REQ-a",
        "O'Brien",
        "REQ-a",
        "",
        "REQ-b",
      ]),
    ).toStrictEqual(
      new Map([
        [
          "REQ-a",
          {
            id: "REQ-a",
            title: "A title",
            semanticText: "A text.",
            modeled: true,
          },
        ],
        [
          "REQ-b",
          { id: "REQ-b", title: "B", semanticText: "", modeled: false },
        ],
        ["REQ-c", { id: "REQ-c", title: "", semanticText: "", modeled: true }],
        [
          "REQ-'q",
          { id: "REQ-'q", title: "Q", semanticText: "", modeled: false },
        ],
      ]),
    );
    expect(goals[0]).toBe(
      "findall([R,M], (member(R, ['REQ-a','O''Brien','REQ-b']), kb:current_req(R), (once((member(T, [constrains,requires_property,requires_predicate,requires_rule]), kb_relationship(T, R, _))) -> M = modeled ; M = unmodeled)), Rows)",
    );
    expect(goals[1]).toBe(
      "findall([Id,Type,Row], (member(Id, ['REQ-a','REQ-b','REQ-c']), kb_entity(Id, Type, Props), findall(Key=Value, (member(Key=Value, Props), memberchk(Key, ['id','title','semantic_text'])), Row)), Results)".replace(
        "'REQ-c'",
        "'REQ-c','REQ-''q'",
      ),
    );
  });
});

describe("reviewSentence", () => {
  test("picks the sentence sharing the most intent terms, the first on a tie", () => {
    const requirement = {
      title: "Title",
      semanticText:
        "Exports run nightly. Labels are limited to 200 characters!  Labels\nlength matters?\n\nOther",
    };
    expect(
      reviewSentence("label length must be at most 200", requirement),
    ).toBe("Labels are limited to 200 characters!");
    expect(reviewSentence("nothing shared", requirement)).toBe(
      "Exports run nightly.",
    );
    expect(
      reviewSentence("beta gamma", {
        title: "T",
        semanticText: "Alpha.  Beta one. Gamma two.",
      }),
    ).toBe("Beta one.");
    expect(
      reviewSentence("x", { title: "T", semanticText: "Alpha.Beta" }),
    ).toBe("Alpha.Beta");
    expect(
      reviewSentence("beta", { title: "T", semanticText: "Alpha.\tBeta" }),
    ).toBe("Beta");
    expect(
      reviewSentence("beta", { title: "T", semanticText: "Alpha\nBeta" }),
    ).toBe("Beta");
  });

  test("falls back to the title without prose", () => {
    expect(reviewSentence("x", { title: "Title", semanticText: "" })).toBe(
      "Title",
    );
    expect(reviewSentence("x", { title: "Title", semanticText: " \n " })).toBe(
      "Title",
    );
  });
});

describe("reviewCandidate", () => {
  const requirement = {
    id: "REQ-a",
    title: "Title",
    semanticText: "Labels are short.",
    modeled: false,
  };

  test("describes a pending candidate", () => {
    expect(
      reviewCandidate("labels", requirement, 0.12345, undefined),
    ).toStrictEqual({
      requirementId: "REQ-a",
      title: "Title",
      sentence: "Labels are short.",
      statement: "Labels are short.",
      score: 0.123,
      modeled: false,
      review: "pending",
    });
  });

  test("carries the agent's verdict and note", () => {
    expect(
      reviewCandidate("x", { ...requirement, modeled: true }, 0.5, {
        requirementId: "REQ-a",
        verdict: "conflict",
        note: "Opposite",
      }),
    ).toMatchObject({ modeled: true, review: "conflict", note: "Opposite" });
    expect(
      "note" in
        reviewCandidate("x", requirement, 0, {
          requirementId: "REQ-a",
          verdict: "no_conflict",
          note: "",
        }),
    ).toBe(false);
  });

  test("bounds the statement and falls back to the title", () => {
    const at = (text: string) =>
      reviewCandidate("x", { ...requirement, semanticText: text }, 0, undefined)
        .statement;
    expect(at("a".repeat(600))).toBe("a".repeat(600));
    expect(at(`${"a".repeat(598)}  b`)).toBe(`${"a".repeat(598)}…`);
    expect(at("a".repeat(601))).toBe(`${"a".repeat(599)}…`);
    expect(at("")).toBe("Title");
  });
});

describe("reviewNextAction", () => {
  const candidate = (
    id: string,
    review: ConflictReviewCandidate["review"],
  ): ConflictReviewCandidate => ({
    requirementId: id,
    title: id,
    sentence: id,
    statement: id,
    score: 0,
    modeled: false,
    review,
  });

  test("resolves conflicts first", () => {
    expect(
      reviewNextAction(
        [
          candidate("REQ-a", "conflict"),
          candidate("REQ-b", "pending"),
          candidate("REQ-c", "conflict"),
        ],
        ["C"],
      ),
    ).toBe(
      "You judged that the intent contradicts REQ-a, REQ-c. Ask the human which rule holds, then supersede or change the conflicting requirement, or change the intent, and compile again. Record a conflict the human has not decided yet as a review:conflict observation fact.",
    );
  });

  test("then compares pending candidates", () => {
    expect(
      reviewNextAction(
        [
          candidate("REQ-a", "no_conflict"),
          candidate("REQ-b", "pending"),
          candidate("REQ-d", "pending"),
        ],
        ["C"],
      ),
    ).toBe(
      'Kibi could not compare this intent with REQ-b, REQ-d logically. Read each reviewCandidates entry (its statement and sentence) and decide whether the intent contradicts it, then call kb_compile_intent again with the same arguments plus conflictReviews: [{requirementId, verdict: "conflict" | "no_conflict", note}] for each.',
    );
  });

  test("then models unchecked claims", () => {
    expect(
      reviewNextAction(
        [candidate("REQ-a", "no_conflict")],
        ["CLAIM-1", "CLAIM-2"],
      ),
    ).toBe(
      "Kibi could not check claim CLAIM-1, CLAIM-2 for contradictions because it has no logical model: model it with kb_model (mode requirement or predicates) and compile again. Until then no conflict is confirmed, only reviewed.",
    );
    expect(reviewNextAction([], [])).toBeUndefined();
  });
});
