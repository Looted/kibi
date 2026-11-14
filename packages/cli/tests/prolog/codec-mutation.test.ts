import { describe, expect, test } from "bun:test";
import {
  entityFromBindingParts,
  fileUriLeaf,
  normalizeEntityId,
  parseAtomList,
  parseEntityFromBinding,
  parseEntityFromList,
  parseListOfLists,
  parsePairList,
  parsePrologValue,
  parsePropertyList,
  parseTriples,
  parseViolationRows,
  splitTopLevel,
  splitTopLevelGeneral,
  typedLiteralFromParts,
} from "../../src/prolog/codec.js";

describe("splitTopLevelGeneral", () => {
  test("keeps every bracket kind and quoted text together", () => {
    expect(
      splitTopLevelGeneral("a,[b,c],(d,e),{f,g},'h,i',\"j,k\"", ","),
    ).toStrictEqual(["a", "[b,c]", "(d,e)", "{f,g}", "'h,i'", '"j,k"']);
  });

  test("skips escaped characters inside quotes", () => {
    expect(splitTopLevelGeneral("'a\\',b',c", ",")).toStrictEqual([
      "'a\\',b'",
      "c",
    ]);
    expect(splitTopLevelGeneral("'it''s, x',y", ",")).toStrictEqual([
      "'it''s, x'",
      "y",
    ]);
    expect(splitTopLevelGeneral("a,'b\\", ",")).toStrictEqual(["a", "'b\\"]);
  });

  test("drops empty parts and honours multi-character delimiters", () => {
    expect(splitTopLevelGeneral(",a,,b,", ",")).toStrictEqual(["a", "b"]);
    expect(splitTopLevel("a::b::[c::d]", "::")).toStrictEqual([
      "a",
      "b",
      "[c::d]",
    ]);
    expect(splitTopLevelGeneral("a:b", "::")).toStrictEqual(["a:b"]);
    expect(splitTopLevelGeneral("", ",")).toStrictEqual([]);
  });

  test("never splits on an empty delimiter", () => {
    expect(splitTopLevelGeneral("ab", "")).toStrictEqual(["ab"]);
  });
});

describe("balanced scanning", () => {
  test("rejects rows with mismatched, unclosed or stray delimiters", () => {
    for (const row of [
      "(]",
      "[)",
      "{]",
      "[}",
      "a)",
      "a}",
      "a]",
      "(a",
      "{a",
      "'a",
      '"a',
    ]) {
      expect(parseListOfLists(`[[${row}],[ok]]`)).toStrictEqual([]);
    }
    // A row can be unbalanced inside a balanced outer list.
    expect(parseListOfLists("[[a][b],[ok]]")).toStrictEqual([["ok"]]);
    expect(parseListOfLists("[[[a][b]]]")).toStrictEqual([["[a][b]"]]);
    for (const row of ["(a)", "{a}", "[a]", "'a]'", '"a)"']) {
      expect(parseListOfLists(`[[${row}]]`)).toStrictEqual([[row]]);
    }
  });
});

describe("parseListOfLists", () => {
  test("trims columns and skips empty rows", () => {
    expect(parseListOfLists("[[], [,], [, ,], [ a ,  b ], [ ]]")).toStrictEqual(
      [["a", "b"]],
    );
    expect(parseListOfLists("[[a,  ,b]]")).toStrictEqual([["a", "", "b"]]);
    expect(parseListOfLists("[[ ,a]]")).toStrictEqual([["", "a"]]);
    expect(parseListOfLists("abc")).toStrictEqual([]);
    expect(parseListOfLists("[[a]x, [b]]")).toStrictEqual([]);
    expect(parseListOfLists("[x[a], [b]]")).toStrictEqual([]);
  });
});

describe("list rows", () => {
  test("need an outer list of list terms", () => {
    expect(parsePairList(", [a,b]")).toStrictEqual([]);
    expect(parsePairList("[a,b], [c,d] ,")).toStrictEqual([]);
    expect(parsePairList("[a,b]")).toStrictEqual([]);
    expect(parsePairList("[[a,b], c]")).toStrictEqual([]);
    expect(parsePairList("[[a,b], (c,d)]")).toStrictEqual([]);
    expect(parsePairList("[[a,b], [c,d]")).toStrictEqual([]);
    expect(parsePairList("[[a,b], [c,d]]x")).toStrictEqual([]);
    expect(parsePairList("[]")).toStrictEqual([]);
    expect(parsePairList("")).toStrictEqual([]);
    expect(parsePairList("[ ]")).toStrictEqual([]);
    // A quote left open, or a bracket left open, after the last row.
    expect(parsePairList("[[a,b]'x]]")).toStrictEqual([]);
    expect(parsePairList("[[a,b]([x]]")).toStrictEqual([]);
  });

  test("skip blank rows", () => {
    expect(parsePairList("  [[a,b], , [c,d]]  ")).toStrictEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("pairs keep two unquoted columns", () => {
    expect(parsePairList("[[ 'a' , \"b\" ,c], [d], [e,f]]")).toStrictEqual([
      ["a", "b"],
      ["e", "f"],
    ]);
  });

  test("triples keep three unquoted columns", () => {
    expect(
      parseTriples("[[ 'a' , \"b\" , c ,d], [e,f], [g,h,i]]"),
    ).toStrictEqual([
      ["a", "b", "c"],
      ["g", "h", "i"],
    ]);
  });
});

describe("parseAtomList", () => {
  test("unwraps, trims and unquotes atoms", () => {
    expect(parseAtomList("  [ a , 'b c', \"d\", , '' ]  ")).toStrictEqual([
      "a",
      "b c",
      "d",
    ]);
    expect(parseAtomList("[]")).toStrictEqual([]);
    expect(parseAtomList("")).toStrictEqual([]);
    expect(parseAtomList("a, b")).toStrictEqual(["a", "b"]);
    expect(parseAtomList("[a")).toStrictEqual(["[a"]);
    expect(parseAtomList("a]")).toStrictEqual(["a]"]);
  });
});

describe("quoted literals", () => {
  test("unquote either quote and decode valid escapes", () => {
    expect(parsePrologValue("'a\\nb'")).toBe("a\nb");
    expect(parsePrologValue('"a\\tb"')).toBe("a\tb");
    expect(parsePrologValue("'it''s'")).toBe("it's");
    expect(parsePrologValue('"say ""hi"""')).toBe('say ""hi""');
    expect(parsePrologValue("'")).toBe("");
    expect(parsePrologValue('"')).toBe("");
    expect(parsePrologValue("''")).toBe("");
  });

  test("leave half-quoted values alone", () => {
    for (const value of ["'abc", "abc'", '"abc', 'abc"', "'abc\"", "\"abc'"]) {
      expect(parsePrologValue(value)).toBe(value);
    }
  });

  test("keep content verbatim when an escape is invalid", () => {
    expect(parsePrologValue("'a'b'")).toBe("a'b");
    expect(parsePrologValue('"a\\qb"')).toBe("a\\qb");
    expect(parsePrologValue('"ab\\"')).toBe("ab\\");
    expect(parsePrologValue('"\\x\\"')).toBe("\\x\\");
    expect(parsePrologValue('"\\x41"')).toBe("\\x41");
    expect(parsePrologValue('"\\u12"')).toBe("\\u12");
    expect(parsePrologValue('"\\u12G4"')).toBe("\\u12G4");
    expect(parsePrologValue('"\\U0001F60"')).toBe("\\U0001F60");
    expect(parsePrologValue('"\\U00110000"')).toBe("\\U00110000");
    expect(parsePrologValue('"\\x110000\\"')).toBe("\\x110000\\");
  });

  test("decode code points up to the Unicode maximum", () => {
    expect(parsePrologValue('"\\u00e9\\u00C9"')).toBe("éÉ");
    expect(parsePrologValue('"\\U0001F600!"')).toBe("\u{1F600}!");
    expect(parsePrologValue('"\\U0010FFFF"')).toBe("\u{10FFFF}");
    expect(parsePrologValue('"\\x10ffff\\"')).toBe("\u{10FFFF}");
    expect(parsePrologValue('"\\x41\\b"')).toBe("Ab");
    expect(parsePrologValue('"\\a\\b\\e\\f\\n\\r\\t\\v\\\\\\\'\\""')).toBe(
      "\u0007\b\u001b\f\n\r\t\u000b\\'\"",
    );
  });
});

describe("parsePrologValue", () => {
  test("trims and reads URIs and lists", () => {
    expect(parsePrologValue("  plain  ")).toBe("plain");
    expect(parsePrologValue(" file:///a/b/c ")).toBe("c");
    expect(parsePrologValue("[]")).toStrictEqual([]);
    expect(parsePrologValue("[ 'a' , [b] , \"c\" ]")).toStrictEqual([
      "a",
      ["b"],
      "c",
    ]);
    expect(parsePrologValue("[a")).toBe("[a");
    expect(parsePrologValue("a]")).toBe("a]");
  });

  test("reads typed literals up to their closing parenthesis", () => {
    expect(parsePrologValue('^^("42", xsd#integer)')).toBe(42);
    expect(parsePrologValue("^^(f(x), xsd:string)")).toBe("f(x)");
    expect(parsePrologValue("^^(a, t)rest")).toBe("a");
    expect(parsePrologValue("^^(a)")).toBe("^^(a)");
    expect(parsePrologValue("^^(a, (b")).toBe("^^(a, (b");
  });
});

describe("typedLiteralFromParts", () => {
  test("trims, unquotes double quotes only, and converts by datatype", () => {
    const t = (literal: string, datatype = "xsd:string") =>
      typedLiteralFromParts([literal, datatype], "original");
    expect(typedLiteralFromParts(["x"], "original")).toBe("original");
    expect(typedLiteralFromParts([undefined, "t"], "original")).toBe(
      "original",
    );
    expect(t('  "a\\nb"  ')).toBe("a\nb");
    expect(t('"a\\qb"')).toBe("a\\qb");
    expect(t("'a'")).toBe("'a'");
    expect(t('"abc')).toBe('"abc');
    expect(t('abc"')).toBe('abc"');
    expect(t(" 12 ", " x#integer ")).toBe(12);
    expect(t("1.5", "x#decimal")).toBe(1.5);
    expect(t("2.5", "x#double")).toBe(2.5);
    expect(t("true", "x#boolean")).toBe(true);
    expect(t("yes", "x#boolean")).toBe(false);
    expect(t("[]")).toStrictEqual([]);
    expect(t("[ a , [b, c] ]")).toStrictEqual(["a", "[b, c]"]);
    expect(t("[a")).toBe("[a");
    expect(t("a]")).toBe("a]");
  });
});

describe("file and entity identifiers", () => {
  test("take the last path segment", () => {
    expect(fileUriLeaf("a/b/c")).toBe("c");
    expect(fileUriLeaf("plain")).toBe("plain");
    expect(fileUriLeaf("a/")).toBe("");
    expect(normalizeEntityId("kb:entity/REQ-1")).toBe("REQ-1");
    expect(normalizeEntityId("file:///x/REQ-2")).toBe("REQ-2");
    expect(normalizeEntityId("REQ-3/x")).toBe("REQ-3/x");
  });
});

describe("parsePropertyList", () => {
  test("strips brackets after trimming", () => {
    expect(parsePropertyList(" [a=1, b = 'x'] ")).toStrictEqual({
      a: "1",
      b: "x",
    });
    expect(parsePropertyList("a=1")).toStrictEqual({ a: "1" });
    expect(parsePropertyList("[a=1")).toStrictEqual({ a: "1" });
  });

  test("skips pairs without a value and elided pairs", () => {
    expect(
      parsePropertyList("[novalue, ...=1, b = ..., c=...|..., d= ... , e=2]"),
    ).toStrictEqual({ e: "2" });
  });

  test("parses JSON-carrying fields only when they are strings", () => {
    const json = '"{\\"k\\":1}"';
    const keys = [
      "rule_ir",
      "argument_constants",
      "argument_aliases",
      "semantic_inventory",
      "pair_reviews",
      "proof_receipts",
      "proof_contract",
      "proof_bindings",
      "origin",
    ];
    expect(
      parsePropertyList(`[${keys.map((key) => `${key}=${json}`).join(",")}]`),
    ).toStrictEqual(Object.fromEntries(keys.map((key) => [key, { k: 1 }])));
    expect(parsePropertyList(`[other=${json}]`)).toStrictEqual({
      other: '{"k":1}',
    });
    expect(parsePropertyList("[rule_ir=[1]]")).toStrictEqual({
      rule_ir: ["1"],
    });
    expect(parsePropertyList('[rule_ir="{bad"]')).toStrictEqual({
      rule_ir: "{bad",
    });
  });

  test("collects repeated keys", () => {
    expect(parsePropertyList("[a=1, a=2, a=3, b=[x], b=y]")).toStrictEqual({
      a: ["1", "2", "3"],
      b: ["x", "y"],
    });
  });
});

describe("entities", () => {
  test("from binding parts", () => {
    expect(entityFromBindingParts(["a", "t"])).toStrictEqual({});
    expect(entityFromBindingParts(["a", undefined, "x=1"])).toStrictEqual({});
    expect(
      entityFromBindingParts([" 'file:///p/E-1' ", " t ", "x=1", "y=2"]),
    ).toStrictEqual({ x: "1", y: "2", id: "E-1", type: "t" });
  });

  test("from a binding string", () => {
    expect(parseEntityFromBinding(" [a,t,[x=1]] ")).toStrictEqual({
      x: "1",
      id: "a",
      type: "t",
    });
    expect(parseEntityFromBinding("a,[t],c=1")).toStrictEqual({
      c: "1",
      id: "a",
      type: "[t]",
    });
    expect(parseEntityFromBinding("[a,[t],c=1]")).toStrictEqual({
      c: "1",
      id: "a",
      type: "[t]",
    });
  });

  test("from a list row", () => {
    const sparse = (index: number) => {
      const row = ["i", "t", "[x=1]"];
      delete row[index];
      return row;
    };
    for (const index of [0, 1, 2]) {
      expect(parseEntityFromList(sparse(index))).toStrictEqual({});
    }
    expect(parseEntityFromList(["a"])).toStrictEqual({});
    expect(
      parseEntityFromList([' "kb:entity/E-2" ', " t ", " [x=1] "]),
    ).toStrictEqual({ x: "1", id: "E-2", type: "t" });
  });
});

describe("parseViolationRows", () => {
  const row = "violation(r, 'E-1', \"desc, more\", s)";
  const parsed = {
    rule: "r",
    entityId: "E-1",
    description: "desc, more",
    suggestion: "s",
  };

  test("reads four or five arguments", () => {
    expect(parseViolationRows(` [${row}] `)).toStrictEqual([parsed]);
    expect(
      parseViolationRows(
        "[violation( r , e , d , s , 'src' ), violation(r,e,d,s,''), violation(r,e,d,s,  )]",
      ),
    ).toStrictEqual([
      {
        rule: "r",
        entityId: "e",
        description: "d",
        suggestion: "s",
        source: "src",
      },
      { rule: "r", entityId: "e", description: "d", suggestion: "s" },
      { rule: "r", entityId: "e", description: "d", suggestion: "s" },
    ]);
  });

  test("unwraps only a full outer list", () => {
    expect(parseViolationRows(row)).toStrictEqual([parsed]);
    expect(parseViolationRows(`${row}, x]`)).toStrictEqual([parsed]);
    expect(parseViolationRows(`[q], ${row}`)).toStrictEqual([parsed]);
    expect(parseViolationRows("[]")).toStrictEqual([]);
    expect(parseViolationRows("")).toStrictEqual([]);
  });

  test("skips other terms and short violations", () => {
    expect(
      parseViolationRows(
        "[other(a,b,c,d,e,f), violation(a,b,c,d)x, xviolation(a,b,c,d), violation(a,b,c)]",
      ),
    ).toStrictEqual([]);
  });
});
