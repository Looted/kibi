import { describe, expect, test } from "bun:test";
import {
  escapeAtom,
  escapeAtomContent,
  fallbackWhenPairMissing,
  fileUriLeaf,
  firstTwoDefinedParts,
  normalizeEntityId,
  parsePairList,
  parsePrologValue,
  parseViolationRows,
  toPrologAtom,
  toPrologString,
  typedLiteralFromParts,
} from "../../src/prolog/codec.js";

describe("atom and string escaping", () => {
  test("escapes every ISO Prolog control character", () => {
    expect(escapeAtom("\u0007")).toBe("\\a");
    expect(escapeAtom("\u0008")).toBe("\\b");
    expect(escapeAtom("\u000c")).toBe("\\f");
    expect(escapeAtom("\n")).toBe("\\n");
    expect(escapeAtom("\r")).toBe("\\r");
    expect(escapeAtom("\t")).toBe("\\t");
    expect(escapeAtom("\u000b")).toBe("\\v");
    expect(escapeAtom("\\")).toBe("\\\\");
    expect(escapeAtom("it's")).toBe("it''s");
    expect(escapeAtomContent("a\u0007b")).toBe("a\\ab");
  });

  test("keeps simple atoms bare and quotes everything else", () => {
    expect(toPrologAtom("lower_case123")).toBe("lower_case123");
    expect(toPrologAtom("UpperCase")).toBe("'UpperCase'");
    expect(toPrologAtom("1abc")).toBe("'1abc'");
    expect(toPrologAtom("has-dash")).toBe("'has-dash'");
    expect(toPrologAtom("with space")).toBe("'with space'");
    expect(toPrologAtom("")).toBe("''");
  });

  test("escapes double-quoted string literals", () => {
    expect(toPrologString('a"b\\c')).toBe('"a\\"b\\\\c"');
    expect(toPrologString("line\nbreak\ttab\rreturn")).toBe(
      '"line\\nbreak\\ttab\\rreturn"',
    );
  });
});

describe("quoted literal decoding", () => {
  test("decodes each recognized escape sequence", () => {
    expect(parsePrologValue("'\\a'")).toBe("\u0007");
    expect(parsePrologValue("'\\b'")).toBe("\b");
    expect(parsePrologValue("'\\e'")).toBe("\u001b");
    expect(parsePrologValue("'\\f'")).toBe("\f");
    expect(parsePrologValue("'\\n'")).toBe("\n");
    expect(parsePrologValue("'\\r'")).toBe("\r");
    expect(parsePrologValue("'\\t'")).toBe("\t");
    expect(parsePrologValue("'\\v'")).toBe("\u000b");
    expect(parsePrologValue("'\\\\'")).toBe("\\");
    expect(parsePrologValue("'\\''")).toBe("'");
    expect(parsePrologValue("'\\\"'")).toBe('"');
  });

  test("decodes hexadecimal unicode escapes with validation", () => {
    expect(parsePrologValue("'\\u0041'")).toBe("A");
    expect(parsePrologValue("'\\uZZZZ'")).toBe("\\uZZZZ");
    expect(parsePrologValue("'\\U0001F600'")).toBe("😀");
    expect(parsePrologValue("'\\U00110000'")).toBe("\\U00110000");
    expect(parsePrologValue("'\\U0001F6'")).toBe("\\U0001F6");
    expect(parsePrologValue("'\\x41\\'")).toBe("A");
    expect(parsePrologValue("'\\xZZ\\'")).toBe("\\xZZ\\");
    expect(parsePrologValue("'\\x41'")).toBe("\\x41");
    expect(parsePrologValue("'\\x110000\\'")).toBe("\\x110000\\");
  });

  test("falls back to the raw slice for malformed literals", () => {
    expect(parsePrologValue("'tra\\")).toBe("'tra\\");
    expect(parsePrologValue("'can''t'")).toBe("can't");
    expect(parsePrologValue("'unbalanced")).toBe("'unbalanced");
    expect(parsePrologValue('"\\q"')).toBe("\\q");
    expect(parsePrologValue('"bad \\qescape"')).toBe("bad \\qescape");
    expect(parsePrologValue("'odd''")).toBe("odd'");
    expect(parsePrologValue('""')).toBe("");
  });

  test("double-quoted strings with escapes decode through the same path", () => {
    expect(parsePrologValue('"tab\\there"')).toBe("tab\there");
    expect(parsePrologValue('"bad \\escape"')).toBe("bad \u001bscape");
  });
});

describe("typed literal edges", () => {
  test("decodes the literal half before coercion", () => {
    expect(
      typedLiteralFromParts(['"42"', "^^<http://x#integer>"], "original"),
    ).toBe(42);
    expect(
      typedLiteralFromParts(['"true"', "^^<http://x#boolean>"], "original"),
    ).toBe(true);
    expect(
      typedLiteralFromParts(['"false"', "^^<http://x#boolean>"], "original"),
    ).toBe(false);
    expect(
      typedLiteralFromParts(['"1.5"', "^^<http://x#decimal>"], "original"),
    ).toBe(1.5);
    expect(
      typedLiteralFromParts(['"2.5"', "^^<http://x#double>"], "original"),
    ).toBe(2.5);
  });

  test("keeps malformed escapes as raw content and splits list literals", () => {
    expect(
      typedLiteralFromParts(['"a\\qb"', "^^<http://x#string>"], "original"),
    ).toBe("a\\qb");
    expect(
      typedLiteralFromParts(["[one, two]", "^^<http://x#string>"], "original"),
    ).toEqual(["one", "two"]);
    expect(
      typedLiteralFromParts(["[]", "^^<http://x#string>"], "original"),
    ).toEqual([]);
    expect(
      typedLiteralFromParts(['"plain"', "^^<http://x#unknown>"], "original"),
    ).toBe("plain");
  });

  test("returns the original string when a pair is missing", () => {
    expect(typedLiteralFromParts(["only"], "original")).toBe("original");
    expect(typedLiteralFromParts([], "original")).toBe("original");
    expect(firstTwoDefinedParts(["a"])).toBeUndefined();
    expect(firstTwoDefinedParts(["a", "b"])).toEqual(["a", "b"]);
    expect(fallbackWhenPairMissing(undefined, "fallback")).toBe("fallback");
    expect(fallbackWhenPairMissing(["a", "b"], "fallback")).toBeNull();
  });
});

describe("id and uri normalization helpers", () => {
  test("normalizes entity ids from kb and file forms", () => {
    expect(normalizeEntityId("kb:entity/REQ-1")).toBe("REQ-1");
    expect(normalizeEntityId("file:///repo/.kb/x.md")).toBe("x.md");
    expect(normalizeEntityId("REQ-2")).toBe("REQ-2");
  });

  test("extracts file uri leaves with and without slashes", () => {
    expect(fileUriLeaf("file:///a/b/c.md")).toBe("c.md");
    expect(fileUriLeaf("plain")).toBe("plain");
  });
});

describe("pair and violation row parsing", () => {
  test("parsePairList skips short rows and fails closed on non-lists", () => {
    expect(parsePairList("[[a,b],[only]]")).toEqual([["a", "b"]]);
    expect(parsePairList("not-a-list")).toEqual([]);
    expect(parsePairList("[[a,b,c]]")).toEqual([["a", "b"]]);
    expect(parsePairList("[]")).toEqual([]);
  });

  test("parseViolationRows skips malformed terms and reads source columns", () => {
    expect(parseViolationRows("[]")).toEqual([]);
    expect(
      parseViolationRows("other(a,b,c), violation(rule1, id1, desc, fix)"),
    ).toEqual([
      {
        rule: "rule1",
        entityId: "id1",
        description: "desc",
        suggestion: "fix",
      },
    ]);
    expect(parseViolationRows("violation(rule1, id1, desc)")).toEqual([]);
    expect(
      parseViolationRows(
        "violation('rule 2', 'id 2', 'desc, with comma', 'fix', 'src.md')",
      ),
    ).toEqual([
      {
        rule: "rule 2",
        entityId: "id 2",
        description: "desc, with comma",
        suggestion: "fix",
        source: "src.md",
      },
    ]);
    expect(
      parseViolationRows("violation(rule, id, desc, fix, '')").at(0)?.source,
    ).toBeUndefined();
  });
});
