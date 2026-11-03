import { describe, expect, test } from "bun:test";
import {
  SOURCE_PATH_REVIEW_CODE,
  SUPERSESSION_CYCLE_REVIEW_CODE,
  lifecycleActionsFromViolations,
  sourcePathReviewActionInput,
} from "../../../src/public/operations/schema6-check-actions.js";

describe("sourcePathReviewActionInput for text_ref", () => {
  test("names the rewrite when there is one", () => {
    const action = sourcePathReviewActionInput({
      entityId: "REQ-1",
      field: "text_ref",
      value: "docs/old.md",
      file: ".kb/requirements/REQ-1.md",
      reason: "multi-line",
      rewrite: ".kb/docs/old.md",
    });
    expect(action).toStrictEqual({
      id: "review-text-ref-dangling-REQ-1",
      code: SOURCE_PATH_REVIEW_CODE,
      category: "quality",
      safety: "review",
      invocation: {
        kind: "review",
        instruction:
          "REQ-1 has text_ref 'docs/old.md' in .kb/requirements/REQ-1.md, a file path that does not exist (multi-line). A person edits the frontmatter by hand: replace the whole field with the single line 'text_ref: .kb/docs/old.md'. Then rerun kibi migrate.",
      },
      affectedEntityIds: ["REQ-1"],
      affectedFiles: [".kb/requirements/REQ-1.md"],
      dispositionRequired: true,
      evidence: {
        entityId: "REQ-1",
        field: "text_ref",
        text_ref: "docs/old.md",
        refused: "multi-line",
        rewrite: ".kb/docs/old.md",
      },
    });
  });

  test("without file, reason or rewrite", () => {
    const action = sourcePathReviewActionInput({
      entityId: "REQ-1",
      field: "text_ref",
      value: ["x"],
    });
    expect(action.invocation).toStrictEqual({
      kind: "review",
      instruction:
        "REQ-1 has text_ref '[\"x\"]', a file path that does not exist (the edit would not read back as exactly that change). A person edits the frontmatter by hand: point text_ref at the evidence file's current path, or delete the field when that evidence is gone. Then rerun kibi migrate.",
    });
    expect(action.affectedFiles).toStrictEqual([]);
    expect(action.evidence).toStrictEqual({
      entityId: "REQ-1",
      field: "text_ref",
      text_ref: ["x"],
    });
  });
});

describe("lifecycleActionsFromViolations", () => {
  test("a supersession cycle keeps only well-formed edges", () => {
    const { actions, consumed } = lifecycleActionsFromViolations([
      {
        rule: "superseded-requirement-open",
        entityId: "REQ-a",
        evidence: {
          cycle: ["REQ-a", "REQ-b"],
          edges: [["REQ-a", "REQ-b"], ["REQ-b"], "x"],
        },
      },
      { rule: "superseded-requirement-open", entityId: "", evidence: {} },
    ]);
    expect(actions.map((action) => action.code)).toContain(
      SUPERSESSION_CYCLE_REVIEW_CODE,
    );
    const cycle = actions.find(
      (action) => action.code === SUPERSESSION_CYCLE_REVIEW_CODE,
    );
    expect(
      (cycle?.evidence as { edges?: unknown } | undefined)?.edges,
    ).toStrictEqual([["REQ-a", "REQ-b"]]);
    expect([...consumed]).toStrictEqual([0]);
  });
});
