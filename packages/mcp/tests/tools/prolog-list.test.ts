import { describe, expect, test } from "bun:test";
import {
  parseAtomList,
  parsePairList,
  parseTriples,
} from "../../src/tools/prolog-list.js";

describe("Prolog List Parser", () => {
  describe("parseAtomList", () => {
    test("should handle empty input", () => {
      expect(parseAtomList("")).toEqual([]);
      expect(parseAtomList("   ")).toEqual([]);
      expect(parseAtomList("[]")).toEqual([]);
    });

    test("should parse simple atoms", () => {
      expect(parseAtomList("[a,b,c]")).toEqual(["a", "b", "c"]);
      expect(parseAtomList("[foo, bar, baz]")).toEqual(["foo", "bar", "baz"]);
    });

    test("should parse quoted atoms", () => {
      expect(parseAtomList("['a', 'b', 'c']")).toEqual(["a", "b", "c"]);
      expect(parseAtomList('["a", "b", "c"]')).toEqual(["a", "b", "c"]);
    });

    test("should handle mixed quotes and atoms", () => {
      expect(parseAtomList("[a, 'b', \"c\"]")).toEqual(["a", "b", "c"]);
    });

    test("should handle atoms with special characters", () => {
      expect(parseAtomList("['foo bar', 'baz-qux']")).toEqual([
        "foo bar",
        "baz-qux",
      ]);
      expect(parseAtomList('["hello, world", "test"]')).toEqual([
        "hello, world",
        "test",
      ]);
    });

    test("should handle nested lists (as strings)", () => {
      // The implementation of splitTopLevel suggests it respects brackets/parens depth
      // but parseAtomList might just treat the nested list as a string token if it doesn't recurse.
      // Let's verify expected behavior based on code reading:
      // splitTopLevel splits by comma at top level.
      // So [a, [b,c], d] -> "a", "[b,c]", "d"
      // Then stripQuotes is applied.
      expect(parseAtomList("[a, [b,c], d]")).toEqual(["a", "[b,c]", "d"]);
    });
  });

  describe("parsePairList", () => {
    test("should handle empty input", () => {
      expect(parsePairList("")).toEqual([]);
      expect(parsePairList("[]")).toEqual([]);
    });

    test("should parse simple pairs", () => {
      expect(parsePairList("[[a,b], [c,d]]")).toEqual([
        ["a", "b"],
        ["c", "d"],
      ]);
    });

    test("should handle whitespace", () => {
      expect(parsePairList(" [ [ a , b ] , [ c , d ] ] ")).toEqual([
        ["a", "b"],
        ["c", "d"],
      ]);
    });

    test("should parse mixed quotes", () => {
      expect(parsePairList("[['a', \"b\"], [c, 'd']]")).toEqual([
        ["a", "b"],
        ["c", "d"],
      ]);
    });

    test("should ignore incomplete pairs", () => {
      // parsePairList checks if parts.length >= 2
      expect(parsePairList("[[a], [b,c], [d]]")).toEqual([["b", "c"]]);
    });

    test("should take first two elements of longer lists", () => {
      // parsePairList takes parts[0] and parts[1]
      expect(parsePairList("[[a,b,c]]")).toEqual([["a", "b"]]);
    });
  });

  describe("parseTriples", () => {
    test("should handle empty input", () => {
      expect(parseTriples("")).toEqual([]);
      expect(parseTriples("[]")).toEqual([]);
    });

    test("should parse simple triples", () => {
      expect(parseTriples("[[a,b,c], [d,e,f]]")).toEqual([
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    test("should handle mixed quotes", () => {
      expect(parseTriples("[['a', \"b\", c]]")).toEqual([["a", "b", "c"]]);
    });

    test("should ignore incomplete triples", () => {
      // parseTriples checks if parts.length >= 3
      expect(parseTriples("[[a,b], [c,d,e]]")).toEqual([["c", "d", "e"]]);
    });

    test("should take first three elements of longer lists", () => {
      expect(parseTriples("[[a,b,c,d]]")).toEqual([["a", "b", "c"]]);
    });
  });
});
