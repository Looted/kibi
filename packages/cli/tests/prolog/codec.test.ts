/*
 * Kibi — repo-local, per-branch, queryable long-term memory for software projects
 * Copyright (C) 2026 Piotr Franczyk
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { describe, expect, test } from "bun:test";
import {
  escapeAtom,
  escapeAtomContent,
  parseAtomList,
  parseEntityFromBinding,
  parseEntityFromList,
  parseListOfLists,
  parsePairList,
  parsePropertyList,
  parsePrologValue,
  parseTriples,
  parseViolationRows,
  splitTopLevel,
  splitTopLevelGeneral,
  toPrologAtom,
} from "../../src/prolog/codec";

const xsd = "http://www.w3.org/2001/XMLSchema";

describe("atom escaping helpers", () => {
  test("doubles single quotes in atom content", () => {
    expect(escapeAtom("rock'n'roll")).toBe("rock''n''roll");
    expect(escapeAtomContent("it's 'quoted' already")).toBe(
      "it''s ''quoted'' already",
    );
  });

  test("leaves simple atoms unchanged and quotes complex atoms", () => {
    expect(toPrologAtom("simple_atom42")).toBe("simple_atom42");
    expect(toPrologAtom("Needs'Quotes")).toBe("'Needs''Quotes'");
    expect(toPrologAtom("has-hyphen")).toBe("'has-hyphen'");
  });
});

describe("parseListOfLists", () => {
  test("returns an empty array for an empty outer list", () => {
    expect(parseListOfLists("[]")).toEqual([]);
  });

  test("parses a single nested list", () => {
    expect(parseListOfLists("[[a,b,c]]")).toEqual([["a", "b", "c"]]);
  });

  test("parses multiple nested lists", () => {
    expect(parseListOfLists("[[a,b],[c,d]]")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  test("preserves nested brackets inside inner list values", () => {
    expect(parseListOfLists("[[a,[b,c]],[d,e]]")).toEqual([
      ["a", "[b,c]"],
      ["d", "e"],
    ]);
  });

  test("skips empty inner lists", () => {
    expect(parseListOfLists("[[],[a],[b,c],[]]")).toEqual([["a"], ["b", "c"]]);
  });
});

describe("parseEntityFromBinding", () => {
  test("parses flat property bindings", () => {
    expect(
      parseEntityFromBinding(`['REQ-001',req,[name="Alpha",links=[a,b]]]`),
    ).toEqual({
      id: "REQ-001",
      links: ["a", "b"],
      name: "Alpha",
      type: "req",
    });
  });

  test("returns an empty object for short bindings", () => {
    expect(parseEntityFromBinding("['REQ-001',req]")).toEqual({});
  });

  test("strips quotes and normalizes file URIs in quoted ids", () => {
    expect(
      parseEntityFromBinding(
        "[\"file:///tmp/entities/REQ-002\",fact,[label='Beta']]",
      ),
    ).toEqual({
      id: "REQ-002",
      label: "Beta",
      type: "fact",
    });
  });

  test("keeps unquoted ids unchanged", () => {
    expect(parseEntityFromBinding("[REQ-RAW,req,[label='Unquoted']]")).toEqual({
      id: "REQ-RAW",
      label: "Unquoted",
      type: "req",
    });
  });
});

describe("parseEntityFromList", () => {
  test("parses list-based entities with property lists", () => {
    expect(
      parseEntityFromList(["'REQ-003'", "req", "[name='Gamma',kind=\"spec\"]"]),
    ).toEqual({
      id: "REQ-003",
      kind: "spec",
      name: "Gamma",
      type: "req",
    });
  });

  test("returns an empty object for short arrays", () => {
    expect(parseEntityFromList(["REQ-003", "req"])).toEqual({});
  });

  test("normalizes quoted file URI ids and parses quoted values", () => {
    expect(
      parseEntityFromList([
        '"file:///var/tmp/REQ-004"',
        "fact",
        '[label="Delta",path=file:///tmp/source.ts]',
      ]),
    ).toEqual({
      id: "REQ-004",
      label: "Delta",
      path: "source.ts",
      type: "fact",
    });
  });
});

describe("parsePropertyList", () => {
  test("parses simple properties and typed literals", () => {
    expect(
      parsePropertyList(
        `[name="alpha",count=^^("42", '${xsd}#integer'),active=^^("true", '${xsd}#boolean')]`,
      ),
    ).toEqual({
      active: true,
      count: 42,
      name: "alpha",
    });
  });

  test("parses nested brackets in values", () => {
    expect(parsePropertyList("[items=[a,[b,c],d],raw='beta']")).toEqual({
      items: ["a", ["b", "c"], "d"],
      raw: "beta",
    });
  });

  test("skips ellipsis placeholders and invalid entries", () => {
    expect(
      parsePropertyList(
        "[...,tail=...|...,skip=...,keep=foo,invalid,nested=[x,y]]",
      ),
    ).toEqual({
      keep: "foo",
      nested: ["x", "y"],
    });
  });

  test("returns an empty object for empty input", () => {
    expect(parsePropertyList("")).toEqual({});
    expect(parsePropertyList("[]")).toEqual({});
  });
});

describe("parsePrologValue", () => {
  test("parses integer typed literals", () => {
    expect(parsePrologValue(`^^("42", '${xsd}#integer')`)).toBe(42);
  });

  test("parses decimal and double typed literals", () => {
    expect(parsePrologValue(`^^("3.14", '${xsd}#decimal')`)).toBe(3.14);
    expect(parsePrologValue(`^^("2.5", '${xsd}#double')`)).toBe(2.5);
  });

  test("parses boolean typed literals", () => {
    expect(parsePrologValue(`^^("true", '${xsd}#boolean')`)).toBe(true);
    expect(parsePrologValue(`^^("false", '${xsd}#boolean')`)).toBe(false);
  });

  test("parses string-typed arrays", () => {
    expect(parsePrologValue(`^^("[a,b]", '${xsd}#string')`)).toEqual([
      "a",
      "b",
    ]);
  });

  test("parses empty arrays inside string typed literals", () => {
    expect(parsePrologValue(`^^("[]", '${xsd}#string')`)).toEqual([]);
  });

  test("falls through to plain strings for string typed literals", () => {
    expect(parsePrologValue(`^^("hello", '${xsd}#string')`)).toBe("hello");
  });

  test("parses typed literals whose string content contains parentheses", () => {
    expect(parsePrologValue(`^^("fn(a,b)", '${xsd}#string')`)).toBe("fn(a,b)");
  });

  test("returns the original value for malformed typed literals", () => {
    expect(parsePrologValue('^^("hello")')).toBe('^^("hello")');
  });

  test("normalizes file URIs to their basename", () => {
    expect(parsePrologValue("file:///path/to/file.ts")).toBe("file.ts");
  });

  test("parses quoted strings", () => {
    expect(parsePrologValue('"hello"')).toBe("hello");
  });

  test("parses quoted atoms", () => {
    expect(parsePrologValue("'hello'")).toBe("hello");
  });

  test("recursively parses lists", () => {
    expect(
      parsePrologValue(
        `[foo,"bar",'baz',file:///tmp/test.ts,^^("42", '${xsd}#integer'),[x,y]]`,
      ),
    ).toEqual(["foo", "bar", "baz", "test.ts", 42, ["x", "y"]]);
  });

  test("parses empty lists", () => {
    expect(parsePrologValue("[]")).toEqual([]);
  });

  test("returns bare values as strings", () => {
    expect(parsePrologValue("foo")).toBe("foo");
  });
});

describe("splitTopLevelGeneral", () => {
  test("splits simple comma-delimited strings", () => {
    expect(splitTopLevelGeneral("a,b,c", ",")).toEqual(["a", "b", "c"]);
  });

  test("does not split inside brackets or parentheses", () => {
    expect(splitTopLevelGeneral("a,[b,c],fn(x,y),d", ",")).toEqual([
      "a",
      "[b,c]",
      "fn(x,y)",
      "d",
    ]);
  });

  test("does not split inside quoted strings or atoms", () => {
    expect(splitTopLevelGeneral("a,\"b,c\",'d,e',f", ",")).toEqual([
      "a",
      '"b,c"',
      "'d,e'",
      "f",
    ]);
  });

  test("ignores escaped quotes when tracking quoted sections", () => {
    expect(splitTopLevelGeneral('"a\\",b",c', ",")).toEqual(['"a\\",b"', "c"]);
  });

  test("returns an empty array for empty input", () => {
    expect(splitTopLevelGeneral("", ",")).toEqual([]);
  });
});

describe("splitTopLevel", () => {
  test("matches splitTopLevelGeneral for the same input", () => {
    const input = "a|[b,c]|'d|e'|fn(x,y)";
    expect(splitTopLevel(input, "|")).toEqual(splitTopLevelGeneral(input, "|"));
  });
});

describe("parseAtomList", () => {
  test("returns an empty array for an empty list", () => {
    expect(parseAtomList("[]")).toEqual([]);
  });

  test("returns an empty array for empty input", () => {
    expect(parseAtomList("")).toEqual([]);
  });

  test("returns an empty array for whitespace-only wrapped lists", () => {
    expect(parseAtomList("[   ]")).toEqual([]);
  });

  test("strips quotes from quoted atoms and strings", () => {
    expect(parseAtomList("['alpha',\"beta\",gamma]")).toEqual([
      "alpha",
      "beta",
      "gamma",
    ]);
  });

  test("preserves nested content as a single token", () => {
    expect(parseAtomList("[a,[b,c],d]")).toEqual(["a", "[b,c]", "d"]);
  });

  test("accepts already unwrapped content", () => {
    expect(parseAtomList("a,'b',\"c\"")).toEqual(["a", "b", "c"]);
  });
});

describe("parsePairList", () => {
  test("returns an empty array for empty input", () => {
    expect(parsePairList("[ ]")).toEqual([]);
  });

  test("parses a single pair", () => {
    expect(parsePairList("[[a,b]]")).toEqual([["a", "b"]]);
  });

  test("parses multiple pairs and ignores short rows", () => {
    expect(parsePairList("[[a,b],[solo],[\"c\",'d']]")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });
});

describe("parseTriples", () => {
  test("returns an empty array for empty input", () => {
    expect(parseTriples("[]")).toEqual([]);
  });

  test("parses a single triple", () => {
    expect(parseTriples("[[a,b,c]]")).toEqual([["a", "b", "c"]]);
  });

  test("parses multiple triples, ignores short rows, and truncates extras", () => {
    expect(parseTriples("[[a,b,c],[x,y],[\"d\",'e',f,g]]")).toEqual([
      ["a", "b", "c"],
      ["d", "e", "f"],
    ]);
  });

  test("preserves nested list content inside rows", () => {
    expect(parseTriples("[[a,[b,c],d]]")).toEqual([["a", "[b,c]", "d"]]);
  });
});

describe("parseViolationRows", () => {
  test("returns an empty array for empty input", () => {
    expect(parseViolationRows("")).toEqual([]);
    expect(parseViolationRows("[]")).toEqual([]);
  });

  test("parses a single violation with five arguments", () => {
    expect(
      parseViolationRows(
        `[violation(rule,'REQ-001',"Missing, field","Add subject_key",'documentation/facts/FACT-001.md')]`,
      ),
    ).toEqual([
      {
        description: "Missing, field",
        entityId: "REQ-001",
        rule: "rule",
        source: "documentation/facts/FACT-001.md",
        suggestion: "Add subject_key",
      },
    ]);
  });

  test("parses a single violation with four arguments", () => {
    expect(
      parseViolationRows(`[violation(rule,'REQ-002',"Missing","Add it")]`),
    ).toEqual([
      {
        description: "Missing",
        entityId: "REQ-002",
        rule: "rule",
        source: undefined,
        suggestion: "Add it",
      },
    ]);
  });

  test("parses multiple violations and skips malformed terms", () => {
    expect(
      parseViolationRows(
        `[violation(rule1,'E1',"Desc 1","Sugg 1",'src/one.md'),not_a_violation,violation(rule2,'E2',"Desc 2","Sugg 2"),violation(bad,'E3')]`,
      ),
    ).toEqual([
      {
        description: "Desc 1",
        entityId: "E1",
        rule: "rule1",
        source: "src/one.md",
        suggestion: "Sugg 1",
      },
      {
        description: "Desc 2",
        entityId: "E2",
        rule: "rule2",
        source: undefined,
        suggestion: "Sugg 2",
      },
    ]);
  });
});
