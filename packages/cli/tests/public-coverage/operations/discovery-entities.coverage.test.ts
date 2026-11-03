import { describe, expect, test } from "bun:test";
import {
  loadCurrentRequirementTexts,
  loadEntitiesPaged,
  loadEntityRows,
} from "../../../src/public/operations/discovery-entities.js";

type Answer = {
  success: boolean;
  bindings?: Record<string, string>;
  error?: string;
};

function port(answer: (goal: string) => Answer) {
  return {
    async query(goal: string) {
      return { bindings: {}, ...answer(goal) } as {
        success: boolean;
        bindings: Record<string, string>;
        error?: string;
      };
    },
  };
}

describe("loadEntitiesPaged", () => {
  test("rejects a page size that is not a positive integer", async () => {
    const prolog = port(() => ({ success: true }));
    for (const size of [0, -1, 1.5])
      await expect(loadEntitiesPaged(prolog, "req", size)).rejects.toThrow(
        "loadEntitiesPaged pageSize must be a positive integer",
      );
  });
});

describe("loadCurrentRequirementTexts", () => {
  test("reads current requirements sorted by id", async () => {
    const prolog = port(
      (goal): Answer =>
        goal.startsWith("findall(R, kb:current_req(R)")
          ? {
              success: true,
              bindings: { Ids: "['REQ-b','REQ-a','REQ-c','TEST-x']" },
            }
          : {
              success: true,
              bindings: {
                Results:
                  "[['REQ-b',req,[title='B',semantic_text='b text']],['REQ-a',req,[title='A',semantic_text='a text']],['REQ-c',req,[]],['TEST-x',test,[title='T']]]",
              },
            },
    );
    expect(await loadCurrentRequirementTexts(prolog)).toStrictEqual([
      { id: "REQ-a", title: "A", semanticText: "a text" },
      { id: "REQ-b", title: "B", semanticText: "b text" },
      { id: "REQ-c", title: "", semanticText: "" },
    ]);
  });

  test("an empty enumeration reads nothing, a failed one throws", async () => {
    expect(
      await loadCurrentRequirementTexts(port(() => ({ success: true }))),
    ).toStrictEqual([]);
    await expect(
      loadCurrentRequirementTexts(
        port(() => ({ success: false, error: "boom" })),
      ),
    ).rejects.toThrow("Current requirement enumeration failed: boom");
    await expect(
      loadCurrentRequirementTexts(port(() => ({ success: false }))),
    ).rejects.toThrow("Current requirement enumeration failed: Unknown error");
  });
});

describe("loadEntityRows", () => {
  test("a failed row query throws its error", async () => {
    await expect(
      loadEntityRows(
        port(() => ({ success: false, error: "bad" })),
        ["REQ-a"],
      ),
    ).rejects.toThrow("bad");
    await expect(
      loadEntityRows(
        port(() => ({ success: false })),
        ["REQ-a"],
      ),
    ).rejects.toThrow("Entity row query failed");
  });
});
