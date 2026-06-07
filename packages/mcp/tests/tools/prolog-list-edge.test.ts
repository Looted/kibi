import { describe, expect, test } from "bun:test";
import { parseAtomList, parsePairList } from "../../src/tools/prolog-list.js";

describe("Prolog list parser edge cases", () => {
  test("treats whitespace-only atom lists as empty", () => {
    expect(parseAtomList("[   ]")).toEqual([]);
  });

  test("treats whitespace-only pair lists as empty", () => {
    expect(parsePairList("[   ]")).toEqual([]);
  });

  test("preserves nested list content inside pair rows", () => {
    expect(parsePairList("[[a,[b,c]],[d,e]]")).toEqual([
      ["a", "[b,c]"],
      ["d", "e"],
    ]);
  });

  test("parses comma-delimited atoms even without outer brackets", () => {
    expect(parseAtomList("alpha,beta")).toEqual(["alpha", "beta"]);
  });
});
