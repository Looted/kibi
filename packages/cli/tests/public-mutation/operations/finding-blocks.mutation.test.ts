import { describe, expect, test } from "bun:test";
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
