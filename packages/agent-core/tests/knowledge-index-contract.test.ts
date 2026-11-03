// implements REQ-claude-code-kibi-plugin-v1, REQ-kibi-hooks-flow-manifest
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  buildKnowledgeIndex,
  loadKnowledgeIndex,
  manifestStateOf,
  readEntitySummary,
  scanSymbolCoordinates,
  scanSymbolsManifest,
} from "../src/knowledge-index";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kibi-ki-c-"));
  roots.push(dir);
  return dir;
}

function write(root: string, relative: string, text: string): string {
  const file = path.join(root, relative);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

/** The single record a one-symbol manifest scans to. */
function one(lines: string[]): unknown {
  const records = scanSymbolsManifest(`symbols:\n${lines.join("\n")}\n`);
  expect(records).toHaveLength(1);
  return records[0];
}

/** The `v` value a flow (or scalar) `- v: <raw>` item line scans to. */
function flowValue(raw: string): unknown {
  return (one([`  - v: ${raw}`]) as Record<string, unknown>).v;
}

describe("scalar unquoting", () => {
  test("double-quoted scalars are JSON-decoded, or stripped when not valid JSON", () => {
    expect(flowValue('"a\\"b"')).toBe('a"b');
    expect(flowValue('"a\\tb"')).toBe("a\tb");
    expect(flowValue('"bad\\x"')).toBe("bad\\x");
    expect(flowValue('""')).toBe("");
  });

  test("single-quoted scalars unescape doubled quotes", () => {
    expect(flowValue("'it''s'")).toBe("it's");
    expect(flowValue("''")).toBe("");
    expect(flowValue("'a''''b'")).toBe("a''b");
  });

  test("a lone or one-sided quote is a plain scalar", () => {
    expect(flowValue('"')).toBe('"');
    expect(flowValue("'")).toBe("'");
    expect(flowValue('"abc')).toBe('"abc');
    expect(flowValue('abc"')).toBe('abc"');
    expect(flowValue("'abc")).toBe("'abc");
    expect(flowValue("abc'")).toBe("abc'");
  });

  test("plain scalars drop a trailing comment only after whitespace", () => {
    expect(flowValue("plain # note")).toBe("plain");
    expect(flowValue("plain\t# note")).toBe("plain");
    expect(flowValue("a#b")).toBe("a#b");
    expect(flowValue("x   #c")).toBe("x");
    expect(flowValue('"q # kept"')).toBe("q # kept");
  });

  test("keys are unquoted too", () => {
    expect(one(['  - "id": a', "    'title': t"])).toStrictEqual({
      id: "a",
      title: "t",
    });
  });
});

describe("flow collections", () => {
  test("sequences of plain, quoted and nested values", () => {
    expect(flowValue("[a, b c, 'd''e', \"f\\ng\"]")).toStrictEqual([
      "a",
      "b c",
      "d'e",
      "f\ng",
    ]);
    expect(flowValue("[[a], [], [b, [c]]]")).toStrictEqual([
      ["a"],
      [],
      ["b", ["c"]],
    ]);
    expect(flowValue("[]")).toStrictEqual([]);
    expect(flowValue("[ ]")).toStrictEqual([]);
    expect(flowValue("[a,]")).toStrictEqual(["a"]);
    expect(flowValue("[a, , b]")).toStrictEqual(["a", "", "b"]);
    expect(flowValue("[\ta\t,\tb\t]")).toStrictEqual(["a", "b"]);
    expect(flowValue("[a#b, c]")).toStrictEqual(["a#b", "c"]);
    expect(flowValue("[\"a]b\", 'c,d']")).toStrictEqual(["a]b", "c,d"]);
    expect(flowValue("[x: y]")).toStrictEqual(["x: y"]);
    expect(flowValue("[a {b]")).toStrictEqual(["a {b"]);
  });

  test("mappings with plain, quoted, empty and nested entries", () => {
    expect(flowValue("{type: implements, target: REQ-1}")).toStrictEqual({
      type: "implements",
      target: "REQ-1",
    });
    expect(flowValue("{}")).toStrictEqual({});
    expect(flowValue("{ }")).toStrictEqual({});
    expect(flowValue("{a: 1,}")).toStrictEqual({ a: "1" });
    expect(flowValue("{k:v}")).toStrictEqual({ "k:v": undefined });
    expect(flowValue("{k:}")).toStrictEqual({ k: undefined });
    expect(flowValue("{k: }")).toStrictEqual({ k: undefined });
    expect(flowValue("{k:, j: 1}")).toStrictEqual({ k: undefined, j: "1" });
    expect(flowValue("{k}")).toStrictEqual({ k: undefined });
    expect(flowValue("{k, j}")).toStrictEqual({ k: undefined, j: undefined });
    expect(flowValue("{a:b: c}")).toStrictEqual({ "a:b": "c" });
    expect(flowValue("{a:\tc}")).toStrictEqual({ a: "c" });
    expect(flowValue("{a:,}")).toStrictEqual({ a: undefined });
    expect(flowValue("{url: http://x/y}")).toStrictEqual({
      url: "http://x/y",
    });
    expect(flowValue('{: v, "": w, k: x}')).toStrictEqual({ k: "x" });
    expect(flowValue('{"a b": "c", \'d\': [e]}')).toStrictEqual({
      "a b": "c",
      d: ["e"],
    });
    expect(flowValue("{a: {b: [c, {d: e}]}}")).toStrictEqual({
      a: { b: ["c", { d: "e" }] },
    });
  });

  test("flow text with trailing content is a plain scalar", () => {
    for (const raw of ["[a b] c", "[a] x", "{a: b} c", "[WIP] fix rounding"])
      expect(flowValue(raw)).toBe(raw);
  });

  test("flow text that never balances is a plain scalar once the record ends", () => {
    for (const raw of [
      "[a b}",
      "{a: b]",
      "{a: b c d",
      "{a b c: [d}",
      "{a: [b}",
      "{'a: b}",
      "{a: 'b}",
      '["a]',
      '["a\\"]',
      '{"a": b',
      "{a:]x: c}",
    ])
      expect(
        scanSymbolsManifest(`symbols:\n  - v: ${raw}\n  - id: z\n`),
      ).toStrictEqual([{ v: raw }, { id: "z" }]);
    // The kept opening line is still a plain scalar, so a comment drops off.
    expect(
      scanSymbolsManifest("symbols:\n  - v: {a #x}\n  - w: [a #c]\n  - id: z"),
    ).toStrictEqual([{ v: "{a" }, { w: "[a" }, { id: "z" }]);
  });

  test("a complete flow value may carry a trailing comment", () => {
    expect(flowValue("[a] # note")).toStrictEqual(["a"]);
    expect(flowValue("[a]#note")).toStrictEqual(["a"]);
    expect(flowValue("{a: b} # note")).toStrictEqual({ a: "b" });
  });

  test("a flow list item may carry trailing whitespace", () => {
    expect(one(["  - id: a", "    links:", "      - [b, c]   "])).toStrictEqual(
      { id: "a", links: [["b", "c"]] },
    );
  });
});

describe("block manifests", () => {
  test("the canonical writer layout scans every field and list form", () => {
    const records = scanSymbolsManifest(
      [
        "# generated",
        "symbols:",
        "  - id: S1",
        "    title: First",
        "    sourceFile: src/a.ts",
        "    sourceLine: 3",
        "    links:",
        "      - REQ-1",
        "      - 'REQ-2'",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-3",
        "      - { type: covered_by, target: TEST-1 }",
        "      - type: executable_for",
        "        target: [x, y]",
        "",
        "  - id: S2",
        "    sourceFile: src/b.ts",
        "  # comment between records",
        "  - id: S3",
      ].join("\n"),
    );
    expect(records).toStrictEqual([
      {
        id: "S1",
        title: "First",
        sourceFile: "src/a.ts",
        sourceLine: "3",
        links: ["REQ-1", "REQ-2"],
        relationships: [
          { type: "implements", target: "REQ-3" },
          { type: "covered_by", target: "TEST-1" },
          { type: "executable_for", target: ["x", "y"] },
        ],
      },
      { id: "S2", sourceFile: "src/b.ts" },
      { id: "S3" },
    ]);
  });

  test("CRLF line endings scan like LF", () => {
    expect(
      scanSymbolsManifest("symbols:\r\n  - id: a\r\n    title: t\r\n"),
    ).toStrictEqual([{ id: "a", title: "t" }]);
  });

  test("a bare root sequence is read, other top-level sequences are not", () => {
    expect(
      scanSymbolsManifest(
        [
          "- id: root1",
          "other:",
          "  - id: skipped",
          "    title: no",
          "symbols:",
          "  - id: kept",
          '"symbols":',
          "  - id: quoted",
          "symbolsX:",
          "  - id: not-me",
        ].join("\n"),
      ),
    ).toStrictEqual([{ id: "root1" }, { id: "kept" }, { id: "quoted" }]);
  });

  test("a top-level line without a key closes the section", () => {
    expect(
      scanSymbolsManifest(
        ["symbols:", "  - id: a", "...", "  - id: b"].join("\n"),
      ),
    ).toStrictEqual([{ id: "a" }]);
  });

  test("records may sit at any indent, nested dashes only feed the open list", () => {
    expect(
      scanSymbolsManifest(
        [
          "symbols:",
          "    -   id: a",
          "        title: t",
          "      stray: ignored",
          "        - orphan",
          "          deeper: no",
          "    - just text",
          "    - id: b",
          "    indented: at item indent",
          "  shallower: line",
        ].join("\n"),
      ),
    ).toStrictEqual([{ id: "a", title: "t" }, {}, { id: "b" }]);
  });

  test("an empty first key opens a list, later keys open or replace lists", () => {
    expect(
      one([
        "  - links:",
        "      - a",
        "    title: t",
        "    title:",
        "      - x",
        "    rel:",
        "      - key:",
        "      - 'q'",
        "      - k: v",
        "        more: w",
        "        empty:",
        "      - k2: [a, b]",
        "      - k3: ''",
        '      - k4: "["',
      ]),
    ).toStrictEqual({
      links: ["a"],
      title: ["x"],
      rel: [
        "key:",
        "q",
        { k: "v", more: "w" },
        { k2: ["a", "b"] },
        { k3: "" },
        { k4: "[" },
      ],
    });
  });

  test("a dash item value with only trailing spaces opens a list", () => {
    expect(one(["  - links:   ", "      - a"])).toStrictEqual({
      links: ["a"],
    });
  });

  test("scalar keys after a list item close it", () => {
    expect(
      one([
        "  - id: a",
        "    rel:",
        "      - type: t",
        "    title: x",
        "        target: lost",
      ]),
    ).toStrictEqual({ id: "a", rel: [{ type: "t" }], title: "x" });
  });

  test("list items after a flow list item take no continuation keys", () => {
    expect(
      one([
        "  - id: a",
        "    rel:",
        "      - {type: t}",
        "        target: lost",
        "      - plain",
        "        target: lost",
      ]),
    ).toStrictEqual({ id: "a", rel: [{ type: "t" }, "plain"] });
  });

  test("lines that are not key-value pairs are skipped", () => {
    expect(
      one(["  - id: a", "    .hidden: x", "    no colon here", "    title: t"]),
    ).toStrictEqual({ id: "a", title: "t" });
  });

  test("key characters: letters, digits, underscore, quotes and dash may start a key", () => {
    expect(
      one([
        "  - Az09_-: 1",
        "    9k: 2",
        "    _k: 3",
        "    -k: 4",
        "    Zk: 5",
        "    zk: 6",
        "    $k: 7",
        "    a b: 8",
        "    k:: 9",
      ]),
    ).toStrictEqual({
      "Az09_-": "1",
      "9k": "2",
      _k: "3",
      "-k": "4",
      Zk: "5",
      zk: "6",
      "a b": "8",
    });
  });
});

describe("flow values wrapped over several lines", () => {
  test("a wrapped field value is joined until its brackets balance", () => {
    expect(
      one([
        "  - id: a",
        "    relationships: [",
        "      {type: implements,",
        "       target: REQ-1},",
        "      # comment inside",
        "",
        "      {type: covered_by, target: TEST-1}",
        "    ]",
        "    title: t",
      ]),
    ).toStrictEqual({
      id: "a",
      relationships: [
        { type: "implements", target: "REQ-1" },
        { type: "covered_by", target: "TEST-1" },
      ],
      title: "t",
    });
  });

  test("the first key of a record may wrap", () => {
    expect(one(["  - links: [a,", "      b]", "    title: t"])).toStrictEqual({
      links: ["a", "b"],
      title: "t",
    });
  });

  test("a wrapped value on a list item lands on that item", () => {
    expect(
      one([
        "  - id: a",
        "    rel:",
        "      - type: implements",
        "        target: [x,",
        "          y]",
        "        extra: z",
      ]),
    ).toStrictEqual({
      id: "a",
      rel: [{ type: "implements", target: ["x", "y"], extra: "z" }],
    });
  });

  test("an unbalanced value cut off by the next record stays a plain scalar", () => {
    expect(
      scanSymbolsManifest(
        ["symbols:", "  - id: a", "    links: [b,", "  - id: c"].join("\n"),
      ),
    ).toStrictEqual([{ id: "a", links: "[b," }, { id: "c" }]);
  });

  test("an unbalanced value cut off by a top-level key stays a plain scalar", () => {
    expect(
      scanSymbolsManifest(
        ["symbols:", "  - id: a", "    links: {b: c,", "other: x"].join("\n"),
      ),
    ).toStrictEqual([{ id: "a", links: "{b: c," }]);
  });

  test("an unbalanced first key cut off by the next record stays a plain scalar", () => {
    expect(
      scanSymbolsManifest(
        ["symbols:", "  - links: [b,", "  - id: c"].join("\n"),
      ),
    ).toStrictEqual([{ links: "[b," }, { id: "c" }]);
  });

  test("an unbalanced list-item value cut off by the next record stays on the item", () => {
    expect(
      scanSymbolsManifest(
        [
          "symbols:",
          "  - id: a",
          "    rel:",
          "      - type: t",
          "        target: [x,",
          "  - id: b",
        ].join("\n"),
      ),
    ).toStrictEqual([
      { id: "a", rel: [{ type: "t", target: "[x," }] },
      { id: "b" },
    ]);
  });

  test("an unbalanced value never closed keeps reading to the end", () => {
    expect(
      scanSymbolsManifest(
        ["symbols:", "  - id: a", "    links: [b,", "      c"].join("\n"),
      ),
    ).toStrictEqual([{ id: "a" }]);
  });

  test("a dash line deeper than the record indent continues the value", () => {
    expect(one(["  - id: a", "    links: [", "      - b]"])).toStrictEqual({
      id: "a",
      links: ["- b"],
    });
  });

  test("a non-dash line at the record indent ends the value", () => {
    expect(
      scanSymbolsManifest(
        ["symbols:", "  - id: a", "    links: [b,", "  c]"].join("\n"),
      ),
    ).toStrictEqual([{ id: "a", links: "[b," }]);
  });
});

describe("flow-sequence manifests", () => {
  const flowRecord = { id: "a", sourceFile: "x.ts" };

  test("the whole `symbols:` value on the header line", () => {
    for (const header of [
      "symbols: [",
      "symbols:[",
      "symbols:\t[",
      "symbols:  \t [",
    ])
      expect(
        scanSymbolsManifest(`${header}{id: a, sourceFile: x.ts}, b, [c]]\n`),
      ).toStrictEqual([flowRecord]);
  });

  test("a flow sequence spanning lines with CRLF and comments before it", () => {
    expect(
      scanSymbolsManifest(
        "# head\r\n\r\nversion: 1\r\nsymbols: [\r\n  {id: a,\r\n   sourceFile: x.ts}\r\n]\r\n",
      ),
    ).toStrictEqual([flowRecord]);
  });

  test("the value on a later line", () => {
    expect(
      scanSymbolsManifest("symbols:\n# c\n\n  [{id: a, sourceFile: x.ts}]\n"),
    ).toStrictEqual([flowRecord]);
    expect(
      scanSymbolsManifest("symbols: # c\n  [{id: a, sourceFile: x.ts}]\n"),
    ).toStrictEqual([flowRecord]);
  });

  test("a later line that is not a sequence falls back to block reading", () => {
    expect(scanSymbolsManifest("symbols:\n  - id: a\n")).toStrictEqual([
      { id: "a" },
    ]);
    expect(scanSymbolsManifest("symbols:\n  {id: a}\n")).toStrictEqual([]);
  });

  test("a root flow sequence counts only as the first meaningful line", () => {
    expect(
      scanSymbolsManifest("# c\n\n  [{id: a, sourceFile: x.ts}]\n"),
    ).toStrictEqual([flowRecord]);
    expect(
      scanSymbolsManifest("version: 1\n[{id: a, sourceFile: x.ts}]\n"),
    ).toStrictEqual([]);
  });

  test("an indented header is not the section", () => {
    expect(scanSymbolsManifest("other:\n  symbols: [{id: a}]\n")).toStrictEqual(
      [],
    );
  });

  test("a header for another key is skipped", () => {
    expect(
      scanSymbolsManifest("other: [{id: b}]\nsymbols: [{id: a}]\n"),
    ).toStrictEqual([{ id: "a" }]);
  });

  test("a sequence that never closes yields no records", () => {
    expect(scanSymbolsManifest("symbols: [{id: a}\n")).toStrictEqual([]);
    expect(scanSymbolsManifest("[{id: a}\n")).toStrictEqual([]);
    expect(scanSymbolsManifest("symbols:\n  [{id: a}\n")).toStrictEqual([]);
  });
});

describe("scanSymbolCoordinates", () => {
  test("reads lines, end lines and normalized source files per symbol", () => {
    expect(
      scanSymbolCoordinates(
        [
          "# coords",
          "version: 1",
          "coordinates:",
          "  S1:",
          "    sourceFile: .\\src\\a.ts",
          "    sourceLine: 3",
          '    sourceEndLine: "9"',
          "",
          "  'S2':",
          "    sourceLine: abc",
          "    sourceEndLine: 0x10",
          "    sourceFile: ''",
          "    other: 5",
          "  S3: inline",
          "    sourceLine: 08",
          "    sourceFile:",
          "    sourceEndLine:",
          "other:",
          "  S4:",
          "    sourceLine: 1",
        ].join("\r\n"),
      ),
    ).toStrictEqual({
      S1: { sourceFile: "src/a.ts", line: 3, endLine: 9 },
      S2: { endLine: 0 },
      S3: { line: 8 },
    });
  });

  test("lines shallower than the id indent are not fields", () => {
    expect(
      scanSymbolCoordinates(
        [
          "coordinates:",
          "    S1:",
          "      sourceLine: 1",
          "  sourceLine: 7",
          "   sourceEndLine: 4",
          "      sourceEndLine: 5",
          "    - junk",
        ].join("\n"),
      ),
    ).toStrictEqual({ S1: { line: 1, endLine: 5 } });
  });

  test("a repeated id keeps its earlier fields", () => {
    expect(
      scanSymbolCoordinates(
        [
          "coordinates:",
          "  S1:",
          "    sourceLine: 1",
          "  S1:",
          "    sourceEndLine: 2",
        ].join("\n"),
      ),
    ).toStrictEqual({ S1: { line: 1, endLine: 2 } });
  });

  test("nothing outside a coordinates section", () => {
    expect(scanSymbolCoordinates("")).toStrictEqual({});
    expect(scanSymbolCoordinates("  S1:\n    sourceLine: 1\n")).toStrictEqual(
      {},
    );
  });
});

describe("manifestStateOf", () => {
  test("missing, indexed and empty states", () => {
    expect(manifestStateOf(undefined, 0)).toBe("missing");
    expect(manifestStateOf(undefined, 3)).toBe("missing");
    expect(manifestStateOf("anything", 1)).toBe("indexed");
    expect(manifestStateOf("", 0)).toBe("empty");
  });

  test("comments, blank lines, empty symbols values and markers stay empty", () => {
    for (const text of [
      "# only a comment\n\n   \n",
      "symbols:",
      "symbols: []",
      "symbols:[]",
      "symbols: [  ]",
      "  symbols:   \r\n",
      "[]",
      "  []  ",
      "---\nsymbols: []\n...",
      "%YAML 1.2\n---",
      "version: 2",
      "version:\t3.1",
      "a\n".replace("a", "# x"),
    ])
      expect(manifestStateOf(text, 0)).toBe("empty");
  });

  test("anything else with no record is unreadable", () => {
    for (const text of [
      "symbols: [] x",
      "symbols: [x]",
      "xsymbols:",
      "symbols: x",
      "[ ]",
      "[] x",
      "x []",
      "%",
      "% x",
      "x%Y",
      "----",
      "--- x",
      "x---",
      "....",
      "x...",
      "version:",
      "version: 2 3",
      "xversion: 2",
      "- id: a",
      "# c\nsymbols:\nother: 1",
    ])
      expect(manifestStateOf(text, 0)).toBe("unreadable");
  });
});

describe("buildKnowledgeIndex", () => {
  test("defaults: no coordinates, legacy links, state from the record count", () => {
    expect(buildKnowledgeIndex([])).toStrictEqual({
      files: {},
      symbolCount: 0,
      manifest: "empty",
      coordinateFiles: [],
      unlinkedFiles: [],
    });
    expect(
      buildKnowledgeIndex([{ id: "a", sourceFile: "x.ts", links: "REQ-1" }]),
    ).toStrictEqual({
      files: {
        "x.ts": [
          {
            id: "a",
            title: "a",
            implements: ["REQ-1"],
            coveredBy: [],
            executableFor: [],
          },
        ],
      },
      symbolCount: 1,
      manifest: "indexed",
      coordinateFiles: [],
      unlinkedFiles: [],
    });
    expect(buildKnowledgeIndex([], {}, {}, "unreadable").manifest).toBe(
      "unreadable",
    );
  });

  test("records need a non-empty string id and source file", () => {
    const index = buildKnowledgeIndex([
      { sourceFile: "x.ts", links: ["REQ-1"] },
      { id: "", sourceFile: "x.ts", links: ["REQ-1"] },
      { id: 5, sourceFile: "x.ts", links: ["REQ-1"] },
      { id: "a", links: ["REQ-1"] },
      { id: "a", sourceFile: "", links: ["REQ-1"] },
      { id: "a", sourceFile: 3, links: ["REQ-1"] },
    ]);
    expect(index.symbolCount).toBe(0);
    expect(index.files).toStrictEqual({});
    expect(index.unlinkedFiles).toStrictEqual([]);
  });

  test("links, typed links and relationships fill each relationship list once", () => {
    const index = buildKnowledgeIndex(
      [
        {
          id: "a",
          title: "Alpha",
          sourceFile: ".\\src\\a.ts",
          links: [
            "REQ-1",
            "REQ-1",
            null,
            7,
            { type: "covered_by", target: "TEST-1" },
            { type: "covered_by" },
            { target: "REQ-9" },
            { type: 1, target: "REQ-9" },
          ],
          relationships: [
            { type: "implements", target: "REQ-2" },
            { type: "implements", target: "REQ-1" },
            { type: "covered_by", target: "TEST-1" },
            { type: "executable_for", target: "SCEN-1" },
            { type: "executable_for", target: "SCEN-1" },
            { type: "relates_to", target: "ADR-1" },
            { type: "implements" },
            { target: "REQ-8" },
            { type: "implements", target: 3 },
            null,
            "REQ-7",
          ],
          sourceLine: "4",
          sourceEndLine: 9,
        },
      ],
      {},
      {},
    );
    expect(index.files).toStrictEqual({
      "src/a.ts": [
        {
          id: "a",
          title: "Alpha",
          implements: ["REQ-1", "REQ-2"],
          coveredBy: ["TEST-1"],
          executableFor: ["SCEN-1"],
          line: 4,
          endLine: 9,
        },
      ],
    });
  });

  test("a non-string title falls back to the id", () => {
    expect(
      buildKnowledgeIndex([
        { id: "a", title: 3, sourceFile: "x.ts", links: ["REQ-1"] },
      ]).files["x.ts"]?.[0]?.title,
    ).toBe("a");
  });

  test("relationships that are not a list are ignored", () => {
    const index = buildKnowledgeIndex([
      {
        id: "a",
        sourceFile: "x.ts",
        relationships: { type: "implements", target: "REQ-1" },
      },
    ]);
    expect(index.files).toStrictEqual({});
    expect(index.unlinkedFiles).toStrictEqual(["x.ts"]);
  });

  test("links that are neither a string nor a list are ignored", () => {
    expect(
      buildKnowledgeIndex([
        { id: "a", sourceFile: "x.ts", links: { type: "implements" } },
      ]).files,
    ).toStrictEqual({});
  });

  test("adapters that opt out ignore links but keep typed relationships", () => {
    const record = {
      id: "a",
      sourceFile: "x.ts",
      links: ["REQ-1", { type: "covered_by", target: "TEST-1" }],
      relationships: [{ type: "implements", target: "REQ-2" }],
    };
    expect(
      buildKnowledgeIndex([record], {}, { legacyLinksAsImplements: false })
        .files["x.ts"],
    ).toStrictEqual([
      {
        id: "a",
        title: "a",
        implements: ["REQ-2"],
        coveredBy: [],
        executableFor: [],
      },
    ]);
    expect(
      buildKnowledgeIndex([record], {}, { legacyLinksAsImplements: true })
        .files["x.ts"]?.[0]?.implements,
    ).toStrictEqual(["REQ-1", "REQ-2"]);
  });

  test("record lines win over coordinates, which fill gaps", () => {
    const coordinates = {
      a: { line: 10, endLine: 20, sourceFile: "z.ts" },
      b: { line: 11 },
      c: { endLine: 12 },
      d: { sourceFile: "src/y.ts" },
      e: { sourceFile: "z.ts" },
    };
    const linked = { sourceFile: "x.ts", links: ["REQ-1"] };
    const index = buildKnowledgeIndex(
      [
        { id: "a", ...linked, sourceLine: 1, sourceEndLine: "2" },
        { id: "b", ...linked, sourceLine: 0, sourceEndLine: -3 },
        { id: "c", ...linked, sourceLine: "abc", sourceEndLine: 2.5 },
        { id: "d", ...linked, sourceLine: Number.POSITIVE_INFINITY },
        { id: "f", ...linked, sourceLine: "1.9" },
      ],
      coordinates,
    );
    const lines = (index.files["x.ts"] ?? []).map(({ id, line, endLine }) => ({
      id,
      line,
      endLine,
    }));
    expect(lines).toStrictEqual([
      { id: "a", line: 1, endLine: 2 },
      { id: "b", line: 11, endLine: undefined },
      { id: "c", line: undefined, endLine: 2.5 },
      { id: "d", line: undefined, endLine: undefined },
      { id: "f", line: 1, endLine: undefined },
    ]);
    const d = index.files["x.ts"]?.[3];
    expect(d === undefined ? [] : Object.keys(d)).toStrictEqual([
      "id",
      "title",
      "implements",
      "coveredBy",
      "executableFor",
    ]);
    expect(index.coordinateFiles).toStrictEqual(["src/y.ts", "z.ts"]);
  });

  test("symbols group by file; files with only unlinked records are listed sorted", () => {
    const index = buildKnowledgeIndex([
      { id: "a", sourceFile: "b.ts", links: ["REQ-1"] },
      { id: "b", sourceFile: "b.ts", links: ["REQ-2"] },
      { id: "c", sourceFile: "b.ts" },
      { id: "d", sourceFile: "z.ts" },
      { id: "e", sourceFile: "a.ts", links: [] },
      { id: "f", sourceFile: "z.ts" },
    ]);
    expect(index.symbolCount).toBe(6);
    expect((index.files["b.ts"] ?? []).map((s) => s.id)).toStrictEqual([
      "a",
      "b",
    ]);
    expect(Object.keys(index.files)).toStrictEqual(["b.ts"]);
    expect(index.unlinkedFiles).toStrictEqual(["a.ts", "z.ts"]);
  });
});

describe("loadKnowledgeIndex", () => {
  const manifest = [
    "symbols:",
    "  - id: S1",
    "    sourceFile: src/a.ts",
    "    links:",
    "      - REQ-1",
  ].join("\n");

  test("without a cache directory nothing is written", () => {
    const root = tempDir();
    write(root, ".kb/symbols.yaml", manifest);
    write(
      root,
      ".kb/symbol-coordinates.yaml",
      "coordinates:\n  S1:\n    sourceLine: 5\n    sourceFile: src/a.ts\n",
    );
    expect(loadKnowledgeIndex(root)).toStrictEqual({
      files: {
        "src/a.ts": [
          {
            id: "S1",
            title: "S1",
            implements: ["REQ-1"],
            coveredBy: [],
            executableFor: [],
            line: 5,
          },
        ],
      },
      symbolCount: 1,
      manifest: "indexed",
      coordinateFiles: ["src/a.ts"],
      unlinkedFiles: [],
    });
    expect(fs.readdirSync(path.join(root, ".kb")).sort()).toStrictEqual([
      "symbol-coordinates.yaml",
      "symbols.yaml",
    ]);
  });

  test("a missing manifest is reported as missing", () => {
    const root = tempDir();
    expect(loadKnowledgeIndex(root)).toStrictEqual({
      files: {},
      symbolCount: 0,
      manifest: "missing",
      coordinateFiles: [],
      unlinkedFiles: [],
    });
  });

  test("the cache file carries the format, mode and both file signatures", () => {
    const root = tempDir();
    const cacheDir = path.join(root, "nested", "cache");
    const symbolsPath = write(root, ".kb/symbols.yaml", manifest);
    const built = loadKnowledgeIndex(root, cacheDir);
    expect(fs.readdirSync(cacheDir)).toStrictEqual(["knowledge-index.json"]);
    const stats = fs.statSync(symbolsPath);
    const cached = JSON.parse(
      fs.readFileSync(path.join(cacheDir, "knowledge-index.json"), "utf8"),
    );
    expect(cached).toStrictEqual({
      signature: `kibi-agent-core.knowledge-index.v2|legacy|${stats.size}:${stats.mtimeMs}|missing`,
      index: built,
    });

    loadKnowledgeIndex(root, cacheDir, {
      legacyLinksAsImplements: false,
      cacheFileName: "typed.json",
    });
    const typed = JSON.parse(
      fs.readFileSync(path.join(cacheDir, "typed.json"), "utf8"),
    );
    expect(typed.signature).toBe(
      `kibi-agent-core.knowledge-index.v2|typed|${stats.size}:${stats.mtimeMs}|missing`,
    );
    expect(typed.index.files).toStrictEqual({});
  });

  test("a cache with the current signature is returned as stored", () => {
    const root = tempDir();
    const cacheDir = path.join(root, "cache");
    write(root, ".kb/symbols.yaml", manifest);
    loadKnowledgeIndex(root, cacheDir);
    const cachePath = path.join(cacheDir, "knowledge-index.json");
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const sentinel = { ...cached.index, symbolCount: 99 };
    fs.writeFileSync(
      cachePath,
      JSON.stringify({ signature: cached.signature, index: sentinel }),
    );
    expect(loadKnowledgeIndex(root, cacheDir)).toStrictEqual(sentinel);
    // Another mode does not reuse it.
    fs.writeFileSync(
      cachePath,
      JSON.stringify({ signature: cached.signature, index: sentinel }),
    );
    expect(
      loadKnowledgeIndex(root, cacheDir, { legacyLinksAsImplements: false })
        .symbolCount,
    ).toBe(1);
  });

  test("a stale, index-less or corrupt cache is rebuilt and rewritten", () => {
    const root = tempDir();
    const cacheDir = path.join(root, "cache");
    write(root, ".kb/symbols.yaml", manifest);
    const cachePath = path.join(cacheDir, "knowledge-index.json");
    const fresh = loadKnowledgeIndex(root, cacheDir);
    const { signature } = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    const stale = { ...fresh, symbolCount: 99 };

    for (const body of [
      JSON.stringify({ signature: `${signature}x`, index: stale }),
      JSON.stringify({ signature }),
      JSON.stringify({ index: stale }),
      "{not json",
    ]) {
      fs.writeFileSync(cachePath, body);
      expect(loadKnowledgeIndex(root, cacheDir)).toStrictEqual(fresh);
      expect(JSON.parse(fs.readFileSync(cachePath, "utf8"))).toStrictEqual({
        signature,
        index: fresh,
      });
    }
    expect(fs.readdirSync(cacheDir)).toStrictEqual(["knowledge-index.json"]);
  });

  test("an edited manifest changes the signature", () => {
    const root = tempDir();
    const cacheDir = path.join(root, "cache");
    write(root, ".kb/symbols.yaml", manifest);
    expect(loadKnowledgeIndex(root, cacheDir).symbolCount).toBe(1);
    write(
      root,
      ".kb/symbol-coordinates.yaml",
      "coordinates:\n  S1:\n    sourceLine: 2\n",
    );
    expect(
      loadKnowledgeIndex(root, cacheDir).files["src/a.ts"]?.[0]?.line,
    ).toBe(2);
  });

  test("an unwritable cache directory only costs the cache", () => {
    const root = tempDir();
    write(root, ".kb/symbols.yaml", "symbols: x\n");
    const blocker = write(root, "blocker", "file");
    expect(loadKnowledgeIndex(root, path.join(blocker, "cache"))).toStrictEqual(
      {
        files: {},
        symbolCount: 0,
        manifest: "unreadable",
        coordinateFiles: [],
        unlinkedFiles: [],
      },
    );
  });

  test("a manifest that is a directory reads as missing", () => {
    const root = tempDir();
    fs.mkdirSync(path.join(root, ".kb", "symbols.yaml"), { recursive: true });
    expect(loadKnowledgeIndex(root).manifest).toBe("missing");
  });

  test("an empty manifest reads as empty", () => {
    const root = tempDir();
    write(root, ".kb/symbols.yaml", "symbols: []\n");
    expect(loadKnowledgeIndex(root).manifest).toBe("empty");
  });
});

function shardPath(root: string, id: string): string {
  const hash = createHash("sha256").update(id).digest("hex");
  return path.join(root, ".kb", "relationships", `${hash.slice(0, 2)}.yaml`);
}

describe("readEntitySummary", () => {
  test("each prefix reads its own lane", () => {
    const root = tempDir();
    const lanes: [string, string][] = [
      ["REQ-1", "requirements"],
      ["SCEN-1", "scenarios"],
      ["TEST-1", "tests"],
      ["ADR-1", "adr"],
      ["FACT-1", "facts"],
      ["FLAG-1", "flags"],
      ["EVT-1", "events"],
    ];
    for (const [id, lane] of lanes)
      write(root, `.kb/${lane}/${id}.md`, `---\ntitle: T ${id}\n---\n`);
    for (const [id] of lanes)
      expect(readEntitySummary(root, id).title).toBe(`T ${id}`);
    write(root, ".kb/requirements/SCEN-1.md", "---\ntitle: wrong lane\n---\n");
    expect(readEntitySummary(root, "SCEN-1").title).toBe("T SCEN-1");
  });

  test("unknown prefixes, unsafe ids, missing or headless documents give the bare id", () => {
    const root = tempDir();
    write(root, ".kb/requirements/REQ-a b.md", "---\ntitle: x\n---\n");
    write(root, ".kb/requirements/REQ-x.md", "title: x\n---\n");
    write(root, ".kb/requirements/xREQ-1.md", "---\ntitle: x\n---\n");
    write(root, ".kb/requirements/REQ-_.md", "---\ntitle: x\n---\n");
    for (const id of [
      "NOPE-1",
      "xREQ-1",
      "req-1",
      "REQ-a b",
      "REQ-../x",
      "REQ-x/",
      "REQ-missing",
      "REQ-x",
    ])
      expect(readEntitySummary(root, id)).toStrictEqual({ id });
    expect(readEntitySummary(root, "REQ-_").title).toBe("x");
  });

  test("ids may hold dots, underscores and dashes after the first character", () => {
    const root = tempDir();
    write(root, ".kb/requirements/REQ-a.b_c-9.md", "---\ntitle: ok\n---\n");
    expect(readEntitySummary(root, "REQ-a.b_c-9").title).toBe("ok");
  });

  test("an opening marker may carry surrounding whitespace", () => {
    const root = tempDir();
    write(root, ".kb/scenarios/SCEN-1.md", "  ---  \r\ntitle: t\r\n  ---\r\n");
    expect(readEntitySummary(root, "SCEN-1")).toStrictEqual({
      id: "SCEN-1",
      title: "t",
    });
  });

  test("title, status and firmness are unquoted; empty ones are skipped", () => {
    const root = tempDir();
    write(
      root,
      ".kb/scenarios/SCEN-1.md",
      [
        "---",
        "title: 'A title'",
        'status: "active"',
        "firmness: firm",
        "---",
      ].join("\n"),
    );
    write(
      root,
      ".kb/scenarios/SCEN-2.md",
      ["---", "title:", "status:", "firmness:", "---"].join("\n"),
    );
    expect(readEntitySummary(root, "SCEN-1")).toStrictEqual({
      id: "SCEN-1",
      title: "A title",
      status: "active",
      firmness: "firm",
    });
    expect(readEntitySummary(root, "SCEN-2")).toStrictEqual({ id: "SCEN-2" });
  });

  test("only the first 8 KiB of a document is read", () => {
    const root = tempDir();
    const filler = `x: ${"y".repeat(8200)}`;
    write(
      root,
      ".kb/requirements/REQ-1.md",
      `---\ntitle: early\n${filler}\nstatus: late\n---\n`,
    );
    write(
      root,
      ".kb/requirements/REQ-2.md",
      `---\ntitle: t\n${"z".repeat(8170)}\n---\nBody.\n`,
    );
    expect(readEntitySummary(root, "REQ-1")).toStrictEqual({
      id: "REQ-1",
      title: "early",
    });
    expect(readEntitySummary(root, "REQ-2")).toStrictEqual({
      id: "REQ-2",
      title: "t",
      firmness: "firm",
      statement: "Body",
    });
  });

  test("statements read plain, quoted, continued and block scalars", () => {
    const root = tempDir();
    const cases: [string, string[], string | undefined][] = [
      ["plain", ["semantic_text: one", "  two", "\tthree"], "one two three"],
      ["quoted", ['semantic_text: "a \\"b\\""'], 'a "b"'],
      ["quotedWrap", ["semantic_text: 'it''s", "  wrapped'"], "it's wrapped"],
      ["folded", ["semantic_text: >-", "  a", "  b"], "a b"],
      ["literal", ["semantic_text: |", "  a"], "a"],
      ["keep", ["semantic_text: |+", "  a"], "a"],
      ["strip", ["semantic_text: >+", "  'a'"], "'a'"],
      ["notBlock", ["semantic_text: >x", "  b"], ">x b"],
      ["notBlock2", ["semantic_text: x>", "  b"], "x> b"],
      ["blockList", ["semantic_text: >", "  - a", "  b"], "- a b"],
      ["plainList", ["semantic_text: a", "  - b", "  c"], "a"],
      ["plainDash", ["semantic_text: a", "  -b"], "a -b"],
      ["stopsAtKey", ["semantic_text: a", "title: t"], "a"],
      ["stopsAtBlank", ["semantic_text: a", "", "  b"], "a"],
      ["stopsAtWs", ["semantic_text: a", "   ", "  b"], "a"],
      ["empty", ['semantic_text: ""', "status: s"], undefined],
      ["emptyBlock", ["semantic_text: >"], undefined],
      ["none", ["semantic_text:", "  hidden"], undefined],
    ];
    for (const [name, lines] of cases)
      write(
        root,
        `.kb/scenarios/SCEN-${name}.md`,
        ["---", ...lines, "---", "", "Body."].join("\n"),
      );
    for (const [name, , statement] of cases)
      expect([name, readEntitySummary(root, `SCEN-${name}`).statement]).toEqual(
        [name, statement],
      );
    write(
      root,
      ".kb/scenarios/SCEN-dash.md",
      ["---", "semantic_text: a", "  b", "  ---", "title: t", "---"].join("\n"),
    );
    expect(readEntitySummary(root, "SCEN-dash")).toStrictEqual({
      id: "SCEN-dash",
      statement: "a b",
    });
    write(
      root,
      ".kb/scenarios/SCEN-eof.md",
      ["---", "semantic_text: a", "  b"].join("\n"),
    );
    expect(readEntitySummary(root, "SCEN-eof").statement).toBe("a b");
  });

  test("a scalar field ends an open links list and value set", () => {
    const root = tempDir();
    write(
      root,
      ".kb/scenarios/SCEN-1.md",
      [
        "---",
        "links:",
        "  - type: implements",
        "    target: REQ-1",
        "semantic_text: s",
        "  - REQ-2",
        "value_set:",
        "  - a",
        "unit: ms",
        "  - b",
        "---",
      ].join("\n"),
    );
    expect(readEntitySummary(root, "SCEN-1")).toStrictEqual({
      id: "SCEN-1",
      statement: "s",
      links: [{ type: "implements", target: "REQ-1" }],
      claim: { unit: "ms", values: ["a"] },
    });
  });

  test("fact claims gather every typed field and value form", () => {
    const root = tempDir();
    write(
      root,
      ".kb/facts/FACT-1.md",
      [
        "---",
        "title: Fact",
        "fact_kind: property",
        "subject_key: 'svc.api'",
        "property_key: timeout",
        "operator: lte",
        "unit: ms",
        'claim_text: "API times out"',
        "value_string: 'text'",
        "value_int: 3",
        "value_number: 2.5",
        "value_bool: true",
        "value_set: [a, 'b', c ]  ",
        "value_set:",
        "  - d",
        "  -e",
        "  - ",
        "  x",
        "status: s",
        "  - ignored",
        "value_string:",
        "value_set: []",
        "value_set: [ ]",
        "value_set:  ",
        "---",
      ].join("\n"),
    );
    expect(readEntitySummary(root, "FACT-1")).toStrictEqual({
      id: "FACT-1",
      title: "Fact",
      status: "s",
      claim: {
        factKind: "property",
        subjectKey: "svc.api",
        propertyKey: "timeout",
        operator: "lte",
        unit: "ms",
        claimText: "API times out",
        values: ["text", "3", "2.5", "true", "a", "b", "c", "d", "e", ""],
      },
    });
  });

  test("only lower-case keys at the start of a line are fields", () => {
    const root = tempDir();
    write(
      root,
      ".kb/facts/FACT-1.md",
      [
        "---",
        "Unit: no",
        " unit: no",
        "unit2: no",
        "value_set_x: [a]",
        " value_set: [b]",
        "value_set: [c] x",
        "x_value_set: [d]",
        "value_set:x",
        "  - e",
        "---",
      ].join("\n"),
    );
    expect(readEntitySummary(root, "FACT-1")).toStrictEqual({ id: "FACT-1" });
  });

  test("firmness follows the origin when unauthored, for requirements and ADRs only", () => {
    const root = tempDir();
    const docs: [string, string, string[]][] = [
      ["REQ-flow", "requirements", ["origin: { kind: agent, by: x }"]],
      ["REQ-flowq", "requirements", ["origin: {by: x, kind: 'agent'}"]],
      ["REQ-flowh", "requirements", ['origin: {kind: "human"}']],
      ["REQ-nested", "requirements", ["origin:", "  by: x", '  kind: "agent"']],
      ["REQ-nested2", "requirements", ["origin:", "\tkind: agent"]],
      [
        "REQ-after",
        "requirements",
        ["origin:", "  by: x", "other: 1", "  kind: agent"],
      ],
      ["REQ-notorigin", "requirements", ["source:", "  kind: agent"]],
      ["REQ-inline", "requirements", ["origin: agent", "  kind: agent"]],
      ["REQ-topkind", "requirements", ["kind: agent"]],
      ["REQ-word", "requirements", ["origin: {mykind: agent}"]],
      [
        "REQ-authored",
        "requirements",
        ["firmness: exploratory", "origin: {kind: agent}"],
      ],
      ["REQ-none", "requirements", []],
      ["ADR-1", "adr", ["origin: {kind: agent}"]],
      ["ADR-2", "adr", []],
      ["SCEN-1", "scenarios", ["origin: {kind: agent}"]],
      ["FACT-1", "facts", []],
    ];
    for (const [id, lane, lines] of docs)
      write(root, `.kb/${lane}/${id}.md`, ["---", ...lines, "---"].join("\n"));
    write(root, ".kb/requirements/REQ-open.md", "---\norigin: {kind: agent}\n");
    const firmness = Object.fromEntries(
      [...docs.map(([id]) => id), "REQ-open"].map((id) => [
        id,
        readEntitySummary(root, id).firmness,
      ]),
    );
    expect(firmness).toStrictEqual({
      "REQ-flow": "default",
      "REQ-flowq": "default",
      "REQ-flowh": "firm",
      "REQ-nested": "default",
      "REQ-nested2": "default",
      "REQ-after": "firm",
      "REQ-notorigin": "firm",
      "REQ-inline": "firm",
      "REQ-topkind": "firm",
      "REQ-word": "firm",
      "REQ-authored": "exploratory",
      "REQ-none": "firm",
      "ADR-1": "default",
      "ADR-2": "firm",
      "SCEN-1": undefined,
      "FACT-1": undefined,
      "REQ-open": undefined,
    });
  });

  test("frontmatter links: bare, typed in either order, quoted, and cut off", () => {
    const root = tempDir();
    write(
      root,
      ".kb/scenarios/SCEN-1.md",
      [
        "---",
        "links:",
        "  - REQ-1",
        "  - 'REQ-2'",
        "  - not safe!",
        "  - type: covered_by",
        "    target: TEST-1",
        "  - target: 'ADR-1'",
        '    type: "supersedes"',
        "  -   target: REQ-3",
        "  - type: only_type",
        "  -",
        "    target: REQ-4",
        "  - type:",
        "  - target: ''",
        "    note: ignored",
        "  - REQ-1",
        "title: after",
        "  - REQ-9",
        "---",
      ].join("\n"),
    );
    expect(readEntitySummary(root, "SCEN-1")).toStrictEqual({
      id: "SCEN-1",
      title: "after",
      links: [
        { type: "relates_to", target: "REQ-1" },
        { type: "relates_to", target: "REQ-2" },
        { type: "covered_by", target: "TEST-1" },
        { type: "supersedes", target: "ADR-1" },
        { type: "relates_to", target: "REQ-3" },
        { type: "relates_to", target: "REQ-4" },
      ],
    });
  });

  test("a links header with a value opens no list; an unclosed one flushes at the end", () => {
    const root = tempDir();
    write(
      root,
      ".kb/scenarios/SCEN-1.md",
      ["---", "links: [REQ-1]", "  - REQ-2", "---"].join("\n"),
    );
    write(
      root,
      ".kb/scenarios/SCEN-2.md",
      ["---", "links:", "  - type: implements", "    target: REQ-5"].join("\n"),
    );
    write(
      root,
      ".kb/scenarios/SCEN-3.md",
      ["---", "links:  ", "  - REQ-6", "---"].join("\n"),
    );
    expect(readEntitySummary(root, "SCEN-1")).toStrictEqual({ id: "SCEN-1" });
    expect(readEntitySummary(root, "SCEN-2")).toStrictEqual({
      id: "SCEN-2",
      links: [{ type: "implements", target: "REQ-5" }],
    });
    expect(readEntitySummary(root, "SCEN-3").links).toStrictEqual([
      { type: "relates_to", target: "REQ-6" },
    ]);
  });

  test("shard links merge after authored ones, deduplicated and capped", () => {
    const root = tempDir();
    write(
      root,
      ".kb/scenarios/SCEN-1.md",
      [
        "---",
        "links:",
        "  - REQ-0",
        "  - type: implements",
        "    target: REQ-A",
        "---",
      ].join("\n"),
    );
    const records = [
      "relationships:",
      "  - type: implements",
      "    from: SCEN-1",
      "    to: REQ-A",
      "  - type: relates_to",
      "    from: SCEN-1",
      "    to: REQ-0",
      "  - type: depends_on",
      "    from: SCEN-1",
      "    to: REQ-B",
      "  - type: depends_on",
      "    from: OTHER",
      "    to: REQ-C",
      "  - type: depends_on",
      "    from: SCEN-1",
      "  - from: SCEN-1",
      "    to: REQ-D",
      "  - type: 5",
      "    from: SCEN-1",
      "    to: [REQ-E]",
      "  - type: depends_on",
      "    from: SCEN-1",
      "    to: ''",
    ];
    for (let n = 0; n < 30; n += 1)
      records.push(
        "  - type: verified_by",
        "    from: SCEN-1",
        `    to: TEST-${n}`,
      );
    write(
      root,
      path.relative(root, shardPath(root, "SCEN-1")),
      records.join("\n"),
    );
    const links = readEntitySummary(root, "SCEN-1").links ?? [];
    expect(links).toHaveLength(24);
    expect(links.slice(0, 4)).toStrictEqual([
      { type: "relates_to", target: "REQ-0" },
      { type: "implements", target: "REQ-A" },
      { type: "depends_on", target: "REQ-B" },
      { type: "verified_by", target: "TEST-0" },
    ]);
    expect(links[23]).toStrictEqual({ type: "verified_by", target: "TEST-20" });
  });

  test("exactly 24 links are all kept", () => {
    const root = tempDir();
    const lines = ["---", "links:"];
    for (let n = 0; n < 24; n += 1) lines.push(`  - REQ-${n}`);
    write(root, ".kb/scenarios/SCEN-1.md", [...lines, "---"].join("\n"));
    expect(readEntitySummary(root, "SCEN-1").links).toHaveLength(24);
    lines.push("  - REQ-24");
    write(root, ".kb/scenarios/SCEN-2.md", [...lines, "---"].join("\n"));
    expect(readEntitySummary(root, "SCEN-2").links).toHaveLength(24);
  });

  test("shard links are reread when the shard changes or disappears", () => {
    const root = tempDir();
    write(root, ".kb/scenarios/SCEN-7.md", "---\ntitle: t\n---\n");
    const shard = shardPath(root, "SCEN-7");
    const record = (to: string) =>
      `relationships:\n  - type: implements\n    from: SCEN-7\n    to: ${to}\n`;
    expect(readEntitySummary(root, "SCEN-7").links).toBeUndefined();
    write(root, path.relative(root, shard), record("REQ-1"));
    expect(readEntitySummary(root, "SCEN-7").links).toStrictEqual([
      { type: "implements", target: "REQ-1" },
    ]);
    expect(readEntitySummary(root, "SCEN-7").links).toStrictEqual([
      { type: "implements", target: "REQ-1" },
    ]);
    write(root, path.relative(root, shard), record("REQ-22"));
    expect(readEntitySummary(root, "SCEN-7").links).toStrictEqual([
      { type: "implements", target: "REQ-22" },
    ]);
    fs.rmSync(shard);
    expect(readEntitySummary(root, "SCEN-7").links).toBeUndefined();
    write(root, path.relative(root, shard), record("REQ-1"));
    expect(readEntitySummary(root, "SCEN-7").links).toStrictEqual([
      { type: "implements", target: "REQ-1" },
    ]);
  });

  test("a shard in flow form or under another key", () => {
    const root = tempDir();
    write(root, ".kb/scenarios/SCEN-8.md", "---\ntitle: t\n---\n");
    write(
      root,
      path.relative(root, shardPath(root, "SCEN-8")),
      "symbols:\n  - type: a\n    from: SCEN-8\n    to: X\nrelationships: [{type: b, from: SCEN-8, to: Y}]\n",
    );
    expect(readEntitySummary(root, "SCEN-8").links).toStrictEqual([
      { type: "b", target: "Y" },
    ]);
  });

  test("a requirement without semantic_text takes its first body paragraph", () => {
    const root = tempDir();
    const body = (id: string, text: string, lane = "requirements") =>
      write(root, `.kb/${lane}/${id}.md`, `---\ntitle: t\n---\n${text}`);
    body("REQ-1", "\n# Heading\n\nFirst line\n  second line\n\nLater.\n");
    body("REQ-2", "Para\n## Next\nmore\n");
    body("REQ-3", "\n\n   \n");
    body("REQ-4", "####### not a heading\n");
    body("REQ-5", "#tag line\n");
    body("REQ-6", "###### h6\ntext\n");
    body("SCEN-1", "Scenario body\n", "scenarios");
    write(
      root,
      ".kb/requirements/REQ-7.md",
      "---\nsemantic_text: authored\n---\nBody\n",
    );
    write(root, ".kb/requirements/REQ-8.md", "---\ntitle: t\nBody\n");
    const statement = (id: string) => readEntitySummary(root, id).statement;
    expect(statement("REQ-1")).toBe("First line second line");
    expect(statement("REQ-2")).toBe("Para");
    expect(readEntitySummary(root, "REQ-3")).toStrictEqual({
      id: "REQ-3",
      title: "t",
      firmness: "firm",
    });
    expect(statement("REQ-4")).toBe("####### not a heading");
    expect(statement("REQ-5")).toBe("#tag line");
    expect(statement("REQ-6")).toBe("text");
    expect(statement("SCEN-1")).toBeUndefined();
    expect(statement("REQ-7")).toBe("authored");
    expect(statement("REQ-8")).toBeUndefined();
  });
});

describe("flow reader edge cases", () => {
  test("blanks before separators and colons are skipped after quoted scalars", () => {
    expect(flowValue("[\"a\"\t, 'b'\t]")).toStrictEqual(["a", "b"]);
    expect(flowValue("{\"a\" : b, 'c'\t: d}")).toStrictEqual({
      a: "b",
      c: "d",
    });
  });

  test("a backslash escapes only inside double quotes", () => {
    expect(flowValue("['a\\', b]")).toStrictEqual(["a\\", "b"]);
    expect(flowValue('["a\\"b", c]')).toStrictEqual(['a"b', "c"]);
    expect(flowValue('["a\\ b", c]')).toStrictEqual(["a\\ b", "c"]);
  });

  test("doubled quotes escape only inside single quotes", () => {
    expect(
      scanSymbolsManifest('symbols:\n  - v: ["a""b"]\n  - id: z\n'),
    ).toStrictEqual([{ v: '["a""b"]' }, { id: "z" }]);
  });

  test("a mapping value may hold `: `", () => {
    expect(flowValue("{a: b: c}")).toStrictEqual({ a: "b: c" });
  });

  test("comments inside a wrapped value are skipped", () => {
    expect(
      one(["  - id: a", "    links: [a, # note", "      b]"]),
    ).toStrictEqual({ id: "a", links: ["a", "b"] });
    expect(
      one(["  - id: a", "    links: {k: v # note", "      }"]),
    ).toStrictEqual({ id: "a", links: { k: "v" } });
  });

  test("a plain scalar ends at a line break", () => {
    expect(
      scanSymbolsManifest(
        [
          "symbols:",
          "  - id: a",
          "    links: [a",
          "      b]",
          "  - id: c",
        ].join("\n"),
      ),
    ).toStrictEqual([{ id: "a", links: "[a" }, { id: "c" }]);
    expect(scanSymbolsManifest("symbols: [{id: a, t: x\r y}]\n")).toStrictEqual(
      [],
    );
  });

  test("a later flow header does not replace a block section", () => {
    expect(
      scanSymbolsManifest("symbols:\n  - id: a\nsymbols: [{id: b}]\n"),
    ).toStrictEqual([{ id: "a" }]);
  });

  test("a wrapped value opens no list for deeper dashes", () => {
    expect(
      one(["  - id: a", "    links: [b,", "      c]", "      - d"]),
    ).toStrictEqual({ id: "a", links: ["b", "c"] });
    expect(one(["  - links: [b,", "      c]", "      - d"])).toStrictEqual({
      links: ["b", "c"],
    });
  });

  test("an unbalanced flow list item is a plain scalar", () => {
    expect(
      one(["  - id: a", "    links:", "      - [a, b", "      - {c"]),
    ).toStrictEqual({ id: "a", links: ["[a, b", "{c"] });
  });
});

describe("block manifest edge cases", () => {
  test("a key needs a space or the line end after its colon", () => {
    expect(
      one(["  - id: a", "    title:x", "    - b", "    url: http://x"]),
    ).toStrictEqual({ id: "a", url: "http://x" });
  });

  test("a top-level comment between records keeps the section open", () => {
    expect(
      scanSymbolsManifest(
        ["symbols:", "  - id: a", "# note", "  - id: b", "    title: x #"].join(
          "\n",
        ),
      ),
    ).toStrictEqual([{ id: "a" }, { id: "b", title: "x" }]);
  });

  test("a dash inside a value does not start an item", () => {
    expect(one(["  - id: a", "    title: a - b"])).toStrictEqual({
      id: "a",
      title: "a - b",
    });
  });

  test("a line holding a stray carriage return is not a record", () => {
    expect(scanSymbolsManifest("symbols:\n  - id: a\rb\n")).toStrictEqual([]);
  });

  test("a key at the record indent does not continue a list item", () => {
    expect(
      one(["  - id: a", "    rel:", "      - type: t", "  target: x"]),
    ).toStrictEqual({ id: "a", rel: [{ type: "t" }] });
  });

  test("indented keys before any record are skipped", () => {
    expect(
      scanSymbolsManifest(
        ["symbols:", "  - id: a", "other: 1", "symbols:", "    title: x"].join(
          "\n",
        ),
      ),
    ).toStrictEqual([{ id: "a" }]);
    expect(
      scanSymbolsManifest(["symbols:", "  foo: bar", "  - id: a"].join("\n")),
    ).toStrictEqual([{ id: "a" }]);
  });
});

describe("index edge cases", () => {
  test("only a leading ./ is dropped from source files", () => {
    expect(
      Object.keys(
        buildKnowledgeIndex([
          { id: "a", sourceFile: "src/./a.ts", links: ["REQ-1"] },
          { id: "b", sourceFile: "./../b.ts", links: ["REQ-1"] },
        ]).files,
      ),
    ).toStrictEqual(["src/./a.ts", "../b.ts"]);
  });

  test("a version stamp needs no space after its colon", () => {
    expect(manifestStateOf("version:2", 0)).toBe("empty");
  });

  test("typed legacy links fill their own list", () => {
    expect(
      buildKnowledgeIndex([
        {
          id: "a",
          sourceFile: "x.ts",
          links: [
            { type: "covered_by", target: "TEST-9" },
            { type: "executable_for" },
          ],
        },
      ]).files["x.ts"],
    ).toStrictEqual([
      {
        id: "a",
        title: "a",
        implements: [],
        coveredBy: ["TEST-9"],
        executableFor: [],
      },
    ]);
  });

  test("any one relationship kind links a symbol", () => {
    const index = buildKnowledgeIndex([
      {
        id: "a",
        sourceFile: "x.ts",
        relationships: [
          { type: "implements", target: "REQ-1" },
          { type: "executable_for", target: "SCEN-1" },
        ],
      },
      {
        id: "b",
        sourceFile: "x.ts",
        relationships: [{ type: "covered_by", target: "TEST-1" }],
      },
      {
        id: "c",
        sourceFile: "x.ts",
        relationships: [{ type: "executable_for", target: "SCEN-1" }],
      },
    ]);
    expect((index.files["x.ts"] ?? []).map((s) => s.id)).toStrictEqual([
      "a",
      "b",
      "c",
    ]);
  });
});

describe("entity summary edge cases", () => {
  test("ids without a known prefix are never read from any lane", () => {
    const root = tempDir();
    write(root, ".kb/events/NOPE-1.md", "---\ntitle: x\n---\n");
    expect(readEntitySummary(root, "NOPE-1")).toStrictEqual({ id: "NOPE-1" });
  });

  test("scalar values may carry trailing whitespace and inner dashes", () => {
    const root = tempDir();
    const doc = (name: string, lines: string[]) =>
      write(
        root,
        `.kb/scenarios/SCEN-${name}.md`,
        ["---", ...lines, "---"].join("\n"),
      );
    doc("a", ["semantic_text: >-   ", "  folded", "  - kept"]);
    doc("b", ["semantic_text: a   ", "  b"]);
    doc("c", ["semantic_text: x", "  a - b"]);
    doc("d", ["semantic_text:x"]);
    expect(readEntitySummary(root, "SCEN-a").statement).toBe("folded - kept");
    expect(readEntitySummary(root, "SCEN-b").statement).toBe("a b");
    expect(readEntitySummary(root, "SCEN-c").statement).toBe("x a - b");
    expect(readEntitySummary(root, "SCEN-d").statement).toBe("x");
  });

  test("indented lines before any key open no section", () => {
    const root = tempDir();
    write(
      root,
      ".kb/facts/FACT-1.md",
      ["---", "  - REQ-1", "  kind: agent", "title: t", "---"].join("\n"),
    );
    write(
      root,
      ".kb/requirements/REQ-1.md",
      ["---", "  kind: agent", "---"].join("\n"),
    );
    expect(readEntitySummary(root, "FACT-1")).toStrictEqual({
      id: "FACT-1",
      title: "t",
    });
    expect(readEntitySummary(root, "REQ-1").firmness).toBe("firm");
  });

  test("field keys must start their line and may omit the space", () => {
    const root = tempDir();
    write(
      root,
      ".kb/facts/FACT-1.md",
      [
        "---",
        "title:yes",
        "subtitle: no",
        "status:s",
        "xstatus: no",
        "firmness:f",
        "xfirmness: no",
        "value_set:[a]",
        "x_value_set:",
        "  - no",
        "value_set:",
        "  a-b",
        "  --x",
        "xlinks:",
        "  - REQ-1",
        "---",
      ].join("\n"),
    );
    expect(readEntitySummary(root, "FACT-1")).toStrictEqual({
      id: "FACT-1",
      title: "yes",
      status: "s",
      firmness: "f",
      claim: { values: ["a", "-x"] },
    });
  });

  test("origin kinds are read only from origin, in flow or nested form", () => {
    const root = tempDir();
    const docs: [string, string[], string][] = [
      ["REQ-a", ["xorigin: {kind: agent}"], "firm"],
      ["REQ-b", ["origin:{kind: agent}"], "default"],
      ["REQ-c", ["origin: {kind:agent}"], "default"],
      ["REQ-d", ["origin:", "  note: my kind: agent"], "firm"],
      ["REQ-e", ["origin:", "  kind:agent"], "default"],
      ["REQ-f", ["xorigin:", "  kind: agent"], "firm"],
      ["REQ-g", ["origin:x", "  kind: agent"], "firm"],
    ];
    for (const [id, lines] of docs)
      write(
        root,
        `.kb/requirements/${id}.md`,
        ["---", ...lines, "---"].join("\n"),
      );
    for (const [id, , firmness] of docs)
      expect([id, readEntitySummary(root, id).firmness]).toStrictEqual([
        id,
        firmness,
      ]);
  });

  test("link entries: no space after the dash or colon, stray lines ignored", () => {
    const root = tempDir();
    write(
      root,
      ".kb/scenarios/SCEN-1.md",
      [
        "---",
        "links:",
        "    target: LOST-1",
        "  -REQ-5",
        "  - type:covered_by",
        "    target:TEST-1",
        "    subtype: x",
        "    subtarget: y",
        "---",
      ].join("\n"),
    );
    expect(readEntitySummary(root, "SCEN-1").links).toStrictEqual([
      { type: "relates_to", target: "REQ-5" },
      { type: "covered_by", target: "TEST-1" },
    ]);
  });

  test("a requirement with no body paragraph has no statement", () => {
    const root = tempDir();
    write(root, ".kb/requirements/REQ-1.md", "---\ntitle: t\n---\n\n# Only\n");
    expect(readEntitySummary(root, "REQ-1")).toStrictEqual({
      id: "REQ-1",
      title: "t",
      firmness: "firm",
    });
  });

  test("a shard holding only other ids, or unreadable, adds no links", () => {
    const root = tempDir();
    write(root, ".kb/scenarios/SCEN-1.md", "---\ntitle: t\n---\n");
    write(root, ".kb/scenarios/SCEN-2.md", "---\ntitle: t\n---\n");
    write(
      root,
      path.relative(root, shardPath(root, "SCEN-1")),
      "relationships:\n  - type: a\n    from: OTHER\n    to: X\n  - type: a\n    from: [SCEN-1]\n    to: X\n",
    );
    fs.mkdirSync(shardPath(root, "SCEN-2"), { recursive: true });
    expect(readEntitySummary(root, "SCEN-1")).toStrictEqual({
      id: "SCEN-1",
      title: "t",
    });
    expect(readEntitySummary(root, "SCEN-2")).toStrictEqual({
      id: "SCEN-2",
      title: "t",
    });
  });

  test("a parsed shard is reused while its size and mtime hold", () => {
    const root = tempDir();
    write(root, ".kb/scenarios/SCEN-9.md", "---\ntitle: t\n---\n");
    const shard = shardPath(root, "SCEN-9");
    const record = (to: string) =>
      `relationships:\n  - type: implements\n    from: SCEN-9\n    to: ${to}\n`;
    write(root, path.relative(root, shard), record("REQ-1"));
    fs.utimesSync(shard, 1_700_000_000, 1_700_000_000);
    expect(readEntitySummary(root, "SCEN-9").links).toStrictEqual([
      { type: "implements", target: "REQ-1" },
    ]);
    fs.writeFileSync(shard, record("REQ-2"));
    fs.utimesSync(shard, 1_700_000_000, 1_700_000_000);
    expect(readEntitySummary(root, "SCEN-9").links).toStrictEqual([
      { type: "implements", target: "REQ-1" },
    ]);
    fs.utimesSync(shard, 1_700_000_001, 1_700_000_001);
    expect(readEntitySummary(root, "SCEN-9").links).toStrictEqual([
      { type: "implements", target: "REQ-2" },
    ]);
  });

  test.skipIf(!fs.existsSync("/proc/self/fd"))(
    "reading a summary leaves no file descriptor open",
    () => {
      const root = tempDir();
      write(root, ".kb/scenarios/SCEN-1.md", "---\ntitle: t\n---\n");
      readEntitySummary(root, "SCEN-1");
      const before = fs.readdirSync("/proc/self/fd").length;
      for (let n = 0; n < 20; n += 1) readEntitySummary(root, "SCEN-1");
      expect(fs.readdirSync("/proc/self/fd").length).toBe(before);
    },
  );
});
