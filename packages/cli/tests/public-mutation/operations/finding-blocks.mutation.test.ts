import { describe, expect, test } from "bun:test";
import { tagStagedFindings } from "../../../src/commands/check.js";
import {
  isBlockingFinding,
  tagBlocks,
} from "../../../src/public/operations/finding-blocks.js";

describe("isBlockingFinding", () => {
  test("blocking: true or severity error blocks; anything else does not", () => {
    expect(isBlockingFinding({ blocking: true })).toBe(true);
    expect(isBlockingFinding({ severity: "error" })).toBe(true);
    expect(isBlockingFinding({ blocking: false, severity: "error" })).toBe(
      true,
    );
    expect(isBlockingFinding({ blocking: false, severity: "warning" })).toBe(
      false,
    );
    expect(isBlockingFinding({ blocking: "true", severity: "ERROR" })).toBe(
      false,
    );
    expect(isBlockingFinding({})).toBe(false);
  });
});

describe("tagBlocks", () => {
  test("a blocking finding stops the level, any other nothing", () => {
    expect(
      tagBlocks(
        [
          { id: "a", blocking: true },
          { id: "b", severity: "warning" },
        ],
        "commit",
      ),
    ).toStrictEqual([
      { id: "a", blocking: true, blocks: "commit" },
      { id: "b", severity: "warning", blocks: "none" },
    ]);
    expect(tagBlocks([{ id: "c", severity: "error" }], "merge")).toStrictEqual([
      { id: "c", severity: "error", blocks: "merge" },
    ]);
  });

  test("allBlock tags every finding with the level", () => {
    expect(tagBlocks([{ rule: "r" }], "merge", true)).toStrictEqual([
      { rule: "r", blocks: "merge" },
    ]);
    expect(tagBlocks([], "commit", true)).toStrictEqual([]);
  });

  test("the input findings are left as they were", () => {
    const finding = { id: "a" };
    tagBlocks([finding], "commit", true);
    expect(finding).toStrictEqual({ id: "a" });
  });
});

describe("tagStagedFindings", () => {
  test("every staged violation and blocking diagnostic stops the commit; advice stops nothing", () => {
    expect(
      tagStagedFindings(
        [{ rule: "symbol-coverage" }, { rule: "evidence-floor" }],
        [
          { id: "staged_file_ownership_missing", blocking: false },
          { id: "symbols_manifest_stale", severity: "error" },
        ],
        [{ id: "symbol_semantic_review_needed", blocking: true }, { id: "q" }],
      ),
    ).toStrictEqual({
      violations: [
        { rule: "symbol-coverage", blocks: "commit" },
        { rule: "evidence-floor", blocks: "commit" },
      ],
      count: 2,
      diagnostics: [
        {
          id: "staged_file_ownership_missing",
          blocking: false,
          blocks: "none",
        },
        { id: "symbols_manifest_stale", severity: "error", blocks: "commit" },
      ],
      qualityDiagnostics: [
        {
          id: "symbol_semantic_review_needed",
          blocking: true,
          blocks: "commit",
        },
        { id: "q", blocks: "none" },
      ],
    });
  });
});
