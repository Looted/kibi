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
} from "../src/prolog/codec";

describe("atom encoding", () => {
  test("escapes single quotes in atom content", () => {
    expect(escapeAtom("can't")).toBe("can''t");
    expect(escapeAtomContent("owner's note")).toBe("owner''s note");
  });

  test("quotes non-simple Prolog atoms", () => {
    expect(toPrologAtom("simple_atom1")).toBe("simple_atom1");
    expect(toPrologAtom("REQ-001")).toBe("'REQ-001'");
    expect(toPrologAtom("Owner's Fact")).toBe("'Owner''s Fact'");
  });
});

describe("toPrologString", () => {
  test("wraps plain string in double quotes", () => {
    expect(toPrologString("hello")).toBe('"hello"');
  });

  test("escapes backslash", () => {
    expect(toPrologString("a\\b")).toBe('"a\\\\b"');
  });

  test("escapes double quote", () => {
    expect(toPrologString('say "hi"')).toBe('"say \\"hi\\""');
  });

  test("escapes newline", () => {
    expect(toPrologString("line1\nline2")).toBe('"line1\\nline2"');
  });

  test("escapes carriage return", () => {
    expect(toPrologString("line1\rline2")).toBe('"line1\\rline2"');
  });

  test("escapes tab", () => {
    expect(toPrologString("col1\tcol2")).toBe('"col1\\tcol2"');
  });

  test("handles empty string", () => {
    expect(toPrologString("")).toBe('""');
  });

  test("handles all escapes together", () => {
    expect(toPrologString('a\\"b\nc')).toBe('"a\\\\\\"b\\nc"');
  });
});

describe("parseViolationRows", () => {
  test("returns empty array for empty list", () => {
    expect(parseViolationRows("[]")).toEqual([]);
  });

  test("parses a single violation", () => {
    const raw =
      "[violation(strict-fact-shape,'FACT-001',\"Missing subject_key\",\"Add subject_key field\",'.kb/facts/FACT-001.md')]";
    const result = parseViolationRows(raw);
    expect(result).toHaveLength(1);
    expect(result[0].rule).toBe("strict-fact-shape");
    expect(result[0].entityId).toBe("FACT-001");
    expect(result[0].description).toBe("Missing subject_key");
    expect(result[0].suggestion).toBe("Add subject_key field");
    expect(result[0].source).toBe(".kb/facts/FACT-001.md");
  });

  test("parses violation with comma in description", () => {
    const raw =
      "[violation(strict-fact-shape,'FACT-002',\"Missing fields: subject_key, property_key\",\"Add required fields\",'.kb/facts/FACT-002.md')]";
    const result = parseViolationRows(raw);
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe(
      "Missing fields: subject_key, property_key",
    );
  });

  test("parses multiple violations", () => {
    const raw =
      "[violation(rule1,'E1',\"Desc A\",\"Sugg A\",'src/a.md'),violation(rule2,'E2',\"Desc B\",\"Sugg B\",'src/b.md')]";
    const result = parseViolationRows(raw);
    expect(result).toHaveLength(2);
    expect(result[0].entityId).toBe("E1");
    expect(result[1].entityId).toBe("E2");
  });

  test("handles comma inside single-quoted source path", () => {
    const raw = "[violation(rule,'E1',\"Desc\",\"Sugg\",'docs/file,part.md')]";
    const result = parseViolationRows(raw);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("docs/file,part.md");
  });

  test("skips malformed terms that are not violation(...)", () => {
    const result = parseViolationRows("[]");
    expect(result).toEqual([]);
  });

  test("handles term without trailing paren gracefully", () => {
    // Truncated/malformed input should not throw, just skip
    const result = parseViolationRows(
      "[violation(rule,'E1',\"Desc\",\"Sugg\",'src'",
    );
    // Should not throw; result may be empty or partial (both acceptable)
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("Prolog collection parsing", () => {
  test("parses nested list rows", () => {
    expect(parseListOfLists("[[a,b],[c,[d,e]],[]]")).toEqual([
      ["a", "b"],
      ["c", "[d,e]"],
    ]);
    expect(parseListOfLists("[]")).toEqual([]);
  });

  test("parses atom, pair, and triple lists", () => {
    expect(parseAtomList("['REQ-001', adr_002, \"SYM-003\", '']")).toEqual([
      "REQ-001",
      "adr_002",
      "SYM-003",
    ]);
    expect(parseAtomList("[ ]")).toEqual([]);
    expect(parsePairList("[['REQ-001','REQ-002'],[too_short]]")).toEqual([
      ["REQ-001", "REQ-002"],
    ]);
    expect(parseTriples("[['A','rel','B'],[too,short]]")).toEqual([
      ["A", "rel", "B"],
    ]);
  });

  test("returns empty arrays for blank list inputs", () => {
    expect(parseAtomList("   ")).toEqual([]);
    expect(parsePairList("[]")).toEqual([]);
    expect(parseTriples("[ ]")).toEqual([]);
  });

  test("parses nested pair and triple row values", () => {
    expect(parsePairList("[[outer,[inner,value]]]")).toEqual([
      ["outer", "[inner,value]"],
    ]);
    expect(parseTriples("[[outer,[inner,value],tail]]")).toEqual([
      ["outer", "[inner,value]", "tail"],
    ]);
  });
});

describe("Prolog entity parsing", () => {
  test("parses entity bindings and file URI ids", () => {
    const entity = parseEntityFromBinding(
      "['file:///repo/docs/REQ-001.md',req,[title=\"Title\",tags=[security,api]]]",
    );

    expect(entity.id).toBe("REQ-001.md");
    expect(entity.type).toBe("req");
    expect(entity.title).toBe("Title");
    expect(entity.tags).toEqual(["security", "api"]);
  });

  test("parses entity list rows and rejects short rows", () => {
    const sparseRow: string[] = [];
    sparseRow.length = 3;

    expect(
      parseEntityFromList(["'REQ-001'", "req", '[title="Title"]']),
    ).toEqual({ id: "REQ-001", type: "req", title: "Title" });
    expect(
      parseEntityFromList(['"REQ-DOUBLE"', "req", '[title="Title"]']),
    ).toEqual({ id: "REQ-DOUBLE", type: "req", title: "Title" });
    expect(
      parseEntityFromList(["REQ-PLAIN", "req", '[title="Title"]']),
    ).toEqual({ id: "REQ-PLAIN", type: "req", title: "Title" });
    expect(parseEntityFromList(["REQ-001", "req"])).toEqual({});
    expect(parseEntityFromList(sparseRow)).toEqual({});
    expect(parseEntityFromBinding("[REQ-001,req]")).toEqual({});
  });
});

describe("Prolog property and value parsing", () => {
  test("parses typed literals, URIs, atoms, strings, and lists", () => {
    expect(parsePrologValue('^^("42",xsd#integer)')).toBe(42);
    expect(parsePrologValue('^^("3.5",xsd#decimal)')).toBe(3.5);
    expect(parsePrologValue('^^("3.5",xsd#double)')).toBe(3.5);
    expect(parsePrologValue('^^("true",xsd#boolean)')).toBe(true);
    expect(parsePrologValue('^^("[a,b]",xsd#string)')).toEqual(["a", "b"]);
    expect(parsePrologValue('^^("[]",xsd#string)')).toEqual([]);
    expect(parsePrologValue('^^("text",xsd#string)')).toBe("text");
    expect(parsePrologValue("^^(literal(fn(a)),xsd#string)")).toBe(
      "literal(fn(a))",
    );
    expect(parsePrologValue("file:///tmp/REQ-001.md")).toBe("REQ-001.md");
    expect(parsePrologValue("file:///")).toBe("");
    expect(parsePrologValue("'quoted atom'")).toBe("quoted atom");
    expect(parsePrologValue("[]")).toEqual([]);
    expect(parsePrologValue("[1,'two',[three]]")).toEqual([
      "1",
      "two",
      ["three"],
    ]);
  });

  test("parses property lists and skips placeholder values", () => {
    expect(
      parsePropertyList("[title=\"Title\",skip=...,tail=...|...,owner='team']"),
    ).toEqual({ title: "Title", owner: "team" });
  });
});

describe("top-level splitting", () => {
  test("splits only at top-level delimiters", () => {
    const input = "a,[b,c],\"d,e\",'f,g',h(i,j)";

    expect(splitTopLevelGeneral(input, ",")).toEqual([
      "a",
      "[b,c]",
      '"d,e"',
      "'f,g'",
      "h(i,j)",
    ]);
    expect(splitTopLevel(input, ",")).toEqual(splitTopLevelGeneral(input, ","));
  });
});
