import { describe, expect, test } from "bun:test";

import { parseAtomList, parsePairList } from "../../src/tools/prolog-list.js";

describe("parseAtomList, exact", () => {
  test("empty lists and blanks give nothing", () => {
    for (const raw of ["", "  ", "[]", " [] ", "[ ]", "[,]"])
      expect(parseAtomList(raw)).toStrictEqual([]);
  });

  test("atoms are trimmed, unquoted and empty ones dropped", () => {
    expect(parseAtomList(" ['a', \"b\" , c,,d] ")).toStrictEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  test("only a fully bracketed value is unwrapped", () => {
    expect(parseAtomList("[a")).toStrictEqual(["[a"]);
    expect(parseAtomList("a]")).toStrictEqual(["a]"]);
    expect(parseAtomList("a,b")).toStrictEqual(["a", "b"]);
  });

  test("only matching quotes on both ends are stripped", () => {
    expect(parseAtomList("['a, b', 'c\", \"d']")).toStrictEqual([
      "a, b",
      'c", "d',
    ]);
    expect(parseAtomList("[x']")).toStrictEqual(["x'"]);
    expect(parseAtomList("['y]")).toStrictEqual(["'y"]);
    expect(parseAtomList('[x"]')).toStrictEqual(['x"']);
    expect(parseAtomList('["y]')).toStrictEqual(['"y']);
    expect(parseAtomList("[abc]")).toStrictEqual(["abc"]);
  });
});

describe("parsePairList, exact", () => {
  test("empty lists and blanks give nothing", () => {
    for (const raw of ["", "  ", "[]", " [] "])
      expect(parsePairList(raw)).toStrictEqual([]);
  });

  test("each inner list gives its first two parts", () => {
    expect(
      parsePairList(" [['a', \"b\"], [ c , d , e ],[f,[g,h]]] "),
    ).toStrictEqual([
      ["a", "b"],
      ["c", "d"],
      ["f", "[g,h]"],
    ]);
  });

  test("a row with one part is skipped", () => {
    expect(parsePairList("[[a],[b,c]]")).toStrictEqual([["b", "c"]]);
  });

  test("separators and text between rows do not leak into the next row", () => {
    expect(parsePairList("[[a,b],[c,d]]")).toStrictEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(parsePairList("[[a,b] x [c,d]]")).toStrictEqual([
      ["a", "b"],
      ["x c", "d"],
    ]);
  });
});
