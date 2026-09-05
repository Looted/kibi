// implements REQ-014
import { describe, expect, test } from "bun:test";
import {
  escapeAtom,
  escapeAtomContent,
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
  toPrologAtom,
  toPrologString,
} from "../../src/prolog/codec.js";

const xsd = "http://www.w3.org/2001/XMLSchema";

describe("prolog codec leftover branches", () => {
  test("encodes atoms and strings with every escape", () => {
    expect(escapeAtom("it's")).toBe("it''s");
    expect(escapeAtomContent("O'Hara")).toBe("O''Hara");
    expect(toPrologAtom("ok")).toBe("ok");
    expect(toPrologAtom("Not Simple")).toBe("'Not Simple'");
    expect(toPrologAtom("can't")).toBe("'can''t'");
    expect(toPrologString('a\\b"c\nd\te\r')).toBe('"a\\\\b\\"c\\nd\\te\\r"');
  });

  test("parseListOfLists walks depth, empty current, and inter-list commas", () => {
    expect(parseListOfLists("[[a,[b]],[]]")).toEqual([["a", "[b]"]]);
    expect(parseListOfLists("[[a,],[b]]")).toEqual([["a"], ["b"]]);
    expect(parseListOfLists(" [ [x] , [y] ] ")).toEqual([["x"], ["y"]]);
  });

  test("parseEntity helpers handle short, quoted, and file ids", () => {
    expect(parseEntityFromBinding("[]")).toEqual({});
    expect(parseEntityFromBinding("[id]")).toEqual({});
    expect(parseEntityFromList([])).toEqual({});
    expect(parseEntityFromList(["id", "type"])).toEqual({});
    expect(
      parseEntityFromList(["file:///tmp/only", "req", "[title='T']"]),
    ).toMatchObject({ id: "only", type: "req" });
    expect(
      parseEntityFromBinding("['file:///',req,[title='T']]"),
    ).toMatchObject({ type: "req" });
  });

  test("parsePropertyList skips ellipsis, malformed JSON fields, and duplicates", () => {
    expect(
      parsePropertyList(
        `[rule_ir="{not-json",semantic_inventory="[]",proof_receipts="{\\"ok\\":true}",proof_contract="1",proof_bindings="[]",dup=1,dup=2,skip]`,
      ),
    ).toMatchObject({
      rule_ir: "{not-json",
      semantic_inventory: [],
      proof_receipts: { ok: true },
      proof_contract: 1,
      proof_bindings: [],
      dup: ["1", "2"],
    });
  });

  test("parsePrologValue covers typed, URI, quote, and list edges", () => {
    expect(parsePrologValue(`^^("x", '${xsd}#unknown')`)).toBe("x");
    expect(parsePrologValue("^^(")).toBe("^^(");
    expect(parsePrologValue("file:///")).toBe("");
    expect(parsePrologValue("file:///tmp/only")).toBe("only");
    expect(parsePrologValue('"unterminated')).toBe('"unterminated');
    expect(parsePrologValue('"bad\\')).toBe('"bad\\');
    expect(parsePrologValue('"ok"')).toBe("ok");
    expect(parsePrologValue("'atom'")).toBe("atom");
    expect(parsePrologValue("[]")).toEqual([]);
    expect(parsePrologValue("[nested,[a,b]]")).toEqual(["nested", ["a", "b"]]);
    expect(parsePrologValue("plain")).toBe("plain");
    expect(parsePrologValue(`^^("true", '${xsd}#boolean')`)).toBe(true);
    expect(parsePrologValue(`^^("7", '${xsd}#integer')`)).toBe(7);
    expect(parsePrologValue(`^^("1.5", '${xsd}#decimal')`)).toBe(1.5);
    expect(parsePrologValue(`^^("2.5", '${xsd}#double')`)).toBe(2.5);
    expect(parsePrologValue(`^^("false", '${xsd}#boolean')`)).toBe(false);
    expect(parsePrologValue(`^^([], '${xsd}#string')`)).toEqual([]);
    expect(parsePrologValue(`^^([a,b], '${xsd}#string')`)).toEqual(["a", "b"]);
    expect(parsePrologValue(`^^("unquoted", '${xsd}#string')`)).toBe("unquoted");
  });

  test("split helpers honor quotes, escapes, and leftover current", () => {
    expect(splitTopLevel("a,'b,c',\"d,e\"", ",")).toEqual([
      "a",
      "'b,c'",
      '"d,e"',
    ]);
    expect(splitTopLevelGeneral(`a,"b\\"c",d`, ",")).toEqual([
      "a",
      '"b\\"c"',
      "d",
    ]);
    expect(splitTopLevelGeneral("only", ",")).toEqual(["only"]);
    expect(splitTopLevelGeneral("a,,b", ",")).toEqual(["a", "b"]);
  });

  test("list parsers unwrap empty, nested, and unwrapped rows", () => {
    expect(parseAtomList("")).toEqual([]);
    expect(parseAtomList("[]")).toEqual([]);
    expect(parseAtomList("[ ]")).toEqual([]);
    expect(parseAtomList("['a',\"b\",,]")).toEqual(["a", "b"]);
    expect(parseAtomList("a,b")).toEqual(["a", "b"]);
    expect(parseAtomList("['quoted',\"double\"]")).toEqual(["quoted", "double"]);
    expect(parsePairList("")).toEqual([]);
    expect(parsePairList("[]")).toEqual([]);
    expect(parsePairList("[[a],[b,c]]")).toEqual([["b", "c"]]);
    expect(parsePairList("[[from,to],[x]]")).toEqual([["from", "to"]]);
    expect(parseTriples("")).toEqual([]);
    expect(parseTriples("[[a,b],[c,d,e]]")).toEqual([["c", "d", "e"]]);
    expect(parseTriples("a,b,c")).toEqual([]);
    expect(parseTriples("[[a,b,c],[d,e,f,g]]")).toEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  test("parseViolationRows covers empty, unwrap, short, and sourced rows", () => {
    expect(parseViolationRows("")).toEqual([]);
    expect(parseViolationRows("[]")).toEqual([]);
    expect(parseViolationRows("not-a-list")).toEqual([]);
    expect(
      parseViolationRows(
        `[violation('rule','REQ-1',"desc","fix",'src/file.ts'),violation(short),violation('r2','E2',"d2","s2")]`,
      ),
    ).toEqual([
      {
        rule: "rule",
        entityId: "REQ-1",
        description: "desc",
        suggestion: "fix",
        source: "src/file.ts",
      },
      {
        rule: "r2",
        entityId: "E2",
        description: "d2",
        suggestion: "s2",
      },
    ]);
  });
});
