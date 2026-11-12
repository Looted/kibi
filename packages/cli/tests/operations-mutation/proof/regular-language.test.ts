import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  type LanguageSpec,
  UnsupportedPattern,
  compileLanguage,
  languageAccepts,
  languagesDisjoint,
  languagesEqual,
} from "../../../src/operations/proof/regular-language.js";

// Golden decisions; each pattern's acceptance row was cross-checked against
// JavaScript RegExp and Python re when the fixture was generated.
type PatternCase = { spec: LanguageSpec; expected: string };
type PairCase = {
  kind: "pair";
  relation: "equal" | "disjoint";
  left: LanguageSpec;
  right: LanguageSpec;
  expected: string;
};
const golden = JSON.parse(
  readFileSync(
    path.join(import.meta.dir, "fixtures", "regular-language.golden.json"),
    "utf8",
  ),
) as { texts: string[]; cases: (PatternCase | PairCase)[] };

function refusal(run: () => string): string {
  try {
    return run();
  } catch (error) {
    if (error instanceof UnsupportedPattern) return `refused: ${error.message}`;
    throw error;
  }
}

function evaluate(entry: PatternCase | PairCase): string {
  if ("kind" in entry) {
    const decide =
      entry.relation === "equal" ? languagesEqual : languagesDisjoint;
    return refusal(() => JSON.stringify(decide(entry.left, entry.right)));
  }
  return refusal(() => {
    compileLanguage(entry.spec);
    return golden.texts
      .map((text) => (languageAccepts(entry.spec, text) ? "1" : "0"))
      .join("");
  });
}

describe("regular-language golden decisions", () => {
  for (const [index, entry] of golden.cases.entries()) {
    const label =
      "kind" in entry
        ? `${entry.relation} ${JSON.stringify([entry.left, entry.right])}`
        : JSON.stringify(entry.spec);
    test(`case ${index}: ${label}`, () => {
      expect(evaluate(entry)).toBe(entry.expected);
    });
  }
});

describe("patterns the real engines reject", () => {
  const refused = (spec: LanguageSpec) =>
    refusal(() => {
      compileLanguage(spec);
      return "compiled";
    });
  const js = (source: string, flags: string): LanguageSpec =>
    ({ type: "pattern", flavor: "js", source, flags, mode: "search" }) as LanguageSpec;

  test("a lone { in a JavaScript u pattern", () => {
    expect(refused(js("a{", "u"))).toStartWith("refused: ");
    expect(refused(js("a{", ""))).toBe("compiled");
  });

  test("an escaped - outside a class in a JavaScript u pattern", () => {
    expect(refused(js("\\-", "u"))).toStartWith("refused: ");
    expect(refused(js("[\\-]", "u"))).toBe("compiled");
    expect(refused(js("\\-", ""))).toBe("compiled");
  });

  test("a Python pattern with both the a and u flags", () => {
    expect(
      refused({
        type: "pattern",
        flavor: "python",
        source: "a",
        flags: "au",
        mode: "search",
      } as LanguageSpec),
    ).toBe("refused: the Python flags a and u are incompatible");
  });
});

// Targeted decisions; every acceptance below was cross-checked against
// JavaScript RegExp (with ^(?:...)$ for a full match) and Python re.search
// or re.fullmatch.
const jsSpec = (source: string, flags = "", mode = "full"): LanguageSpec =>
  ({ type: "pattern", flavor: "js", source, flags, mode }) as LanguageSpec;
const pySpec = (source: string, flags = "", mode = "full"): LanguageSpec =>
  ({ type: "pattern", flavor: "python", source, flags, mode }) as LanguageSpec;

describe("targeted acceptance", () => {
  const cases: [LanguageSpec, string[], string[]][] = [
    [jsSpec("Z", "i", "search"), ["z", "Z", "xz"], ["y"]],
    [jsSpec("a", "i"), ["A", "a"], ["b"]],
    [jsSpec("_", "i"), ["_"], ["?", "\x7f"]],
    [jsSpec("[Y-a]", "i"), ["y", "z", "A", "a", "["], ["B", "{", ";", "?"]],
    [jsSpec("[a-\\x7f]", "i"), ["A", "\x7f", "a", "~"], ["@"]],
    [jsSpec("\\x7f", "i"), ["\x7f"], []],
    [pySpec("[\\x80]", "i"), ["\x80"], ["\x81"]],
    [jsSpec("[ca]"), ["a", "c"], ["b"]],
    [jsSpec("[\\d\\s]"), ["5", " ", "\t"], ["a"]],
    [jsSpec("a", "u"), ["a"], ["\u{10000}", "\u{10061}"]],
    [jsSpec("a*{"), ["a{", "{", "aa{"], ["a"]],
    [jsSpec("a*b{2}"), ["abb", "bb"], ["ab"]],
    [jsSpec("(?<ab>a)"), ["a"], ["b"]],
    [jsSpec("(?<a1>a)"), ["a"], ["b"]],
    [pySpec("(?P<ab>a)"), ["a"], ["b"]],
    [jsSpec("\\0"), ["\0"], ["0"]],
    [jsSpec("\\u0041{2}", "u"), ["AA"], ["A"]],
    [jsSpec("\\u{41}{2}", "u"), ["AA"], ["A"]],
    [
      { type: "pattern", flavor: "js", source: "a", mode: "search" } as LanguageSpec,
      ["a"],
      ["b"],
    ],
    [pySpec("a$\\n"), ["a\n"], ["a"]],
    [pySpec("a$\\n", "", "search"), ["a\n", "xa\n"], ["a"]],
    [pySpec("a$\\n\\n"), [], ["a\n\n"]],
    [pySpec("a$\\n\\n", "", "search"), [], ["a\n\n", "a\n\n\n"]],
    [pySpec("a{}"), ["a{}"], ["", "a"]],
    [pySpec("a{,3}"), ["", "aaa"], ["aaaa"]],
    [jsSpec("a{2,5}"), ["aa", "aaaaa"], ["a", "aaaaaa"]],
    [jsSpec("a{2,}"), ["aa", "aaaaaaa"], ["a"]],
    [jsSpec("\\uD800\\uDC00", "u"), ["\u{10000}"], []],
    [jsSpec("\\uDBFF\\uDFFF", "u"), ["\u{10FFFF}"], []],
    [jsSpec("\\uDBFF\\uDC00", "u"), ["\u{10FC00}"], []],
    [jsSpec("\\uD7FF\\uDC00", "u"), [], ["\uD7FF", "\uFC00"]],
    [jsSpec("\uFFFFa", "u"), ["\uFFFFa"], ["\uFFFF"]],
    [pySpec("\uFFFFa"), ["\uFFFFa"], ["\uFFFF"]],
    [jsSpec("[a-a]"), ["a"], ["b"]],
    [jsSpec("[a-zbc]"), ["y", "a", "c"], ["{"]],
    [jsSpec("[\\uD7FF-\\uE000]", "u"), ["\uD7FF", "\uE000"], ["\uD7FE", "\uE001"]],
    [jsSpec("[\\uD7FF\\uE000]", "u"), ["\uD7FF", "\uE000"], ["\uE001"]],
    [
      jsSpec("[\\u{E000}-\\u{10000}]", "u"),
      ["\uE000", "\uFFFF", "\u{10000}"],
      ["\u{10001}", "\uDFFF\u{10000}"],
    ],
    [jsSpec("[\\u{FFFF}-\\u{10000}]", "u"), ["\uFFFF", "\u{10000}"], ["\uFFFE"]],
    [jsSpec("[\\u{10000}-\\u{10001}]", "u"), ["\u{10000}", "\u{10001}"], ["\u{10002}"]],
    [
      jsSpec("[\\u{103FF}-\\u{10400}]", "u"),
      ["\u{103FF}", "\u{10400}"],
      ["\u{10401}", "\u{103FE}"],
    ],
    [
      jsSpec("[\\u{10000}-\\u{107FF}]", "u"),
      ["\u{10000}", "\u{105FF}", "\u{107FF}"],
      ["\u{10800}"],
    ],
    [jsSpec("[\\0-\\uFFFE]", "u"), [], ["\uFFFF"]],
    [jsSpec("[^\\0-\\uFFFE]"), ["\uFFFF"], ["\uFFFE"]],
    [jsSpec("[^\\0-\\u{10FFFE}]", "u"), ["\u{10FFFF}"], ["\u{10FFFE}"]],
    [jsSpec("[^\\0-\\uFFFF]", "u"), ["\u{10000}"], ["\uFFFF"]],
    [{ type: "literal", value: "" }, [""], ["a"]],
    [{ type: "literal", value: "ab" }, ["ab"], ["a", "abb"]],
    [{ type: "literal", value: "\u{1F600}" }, ["\u{1F600}"], ["\u{1F601}"]],
  ];
  for (const [spec, accepted, rejected] of cases)
    test(JSON.stringify(spec), () => {
      for (const text of accepted) expect([text, languageAccepts(spec, text)]).toEqual([text, true]);
      for (const text of rejected) expect([text, languageAccepts(spec, text)]).toEqual([text, false]);
    });
});

describe("targeted refusals", () => {
  const cases: [LanguageSpec, string][] = [
    [
      jsSpec("a", "au"),
      "the a flag is not supported (g and y make test() depend on lastIndex, m makes ^ and $ match at every line, v changes class syntax)",
    ],
    [pySpec("a{,}"), "a {,} quantifier (at offset 1)"],
    [jsSpec("^*"), "a quantified assertion (at offset 1)"],
    [pySpec("\\A?"), "a quantified assertion (at offset 2)"],
    [jsSpec("$+"), "a quantified assertion (at offset 1)"],
    [jsSpec("a???"), "a quantifier on a quantifier (at offset 3)"],
    [jsSpec("a{2}{3}"), "a quantifier on a quantifier (at offset 4)"],
    [jsSpec("a*{2}"), "a quantifier on a quantifier (at offset 2)"],
    [jsSpec("{1}"), "a quantifier with nothing to repeat (at offset 0)"],
    [jsSpec("(?#?<a>)"), "an inline flag, comment or atomic group (at offset 1)"],
    [jsSpec("(?x?=a)"), "an inline flag, comment or atomic group (at offset 1)"],
    [jsSpec("\\xg12"), "a malformed \\x escape (at offset 2)"],
    [pySpec("\\xg12"), "a malformed \\x escape (at offset 2)"],
    [pySpec("\\Ug00000041"), "a malformed \\U escape (at offset 2)"],
    [pySpec("\\\u0080"), "the escape \\\u0080 (at offset 1)"],
    [pySpec("[a[:b]"), "a POSIX class (at offset 2)"],
    [jsSpec("[a-"), "an unclosed character class (at offset 3)"],
    [jsSpec("\\c"), "the escape \\c (at offset 1)"],
    [jsSpec("a{1001,}"), "a counted repeat above 1000 (at offset 1)"],
    [pySpec("a{1001,}"), "a counted repeat above 1000 (at offset 1)"],
    [
      jsSpec("[a-\\u0080]", "i"),
      "a non-ASCII range under case-insensitive matching (Kibi folds case exactly only for ASCII letters) (at offset 9)",
    ],
    [
      jsSpec("\u00E9", "i"),
      "a non-ASCII letter under case-insensitive matching (Kibi folds case exactly only for ASCII letters) (at offset 1)",
    ],
    [jsSpec("{", "u"), "a { that does not start a quantifier (at offset 0)"],
    [jsSpec("a{", "u"), "a { that does not start a quantifier (at offset 1)"],
    [jsSpec("a{x}", "u"), "a { that does not start a quantifier (at offset 1)"],
  ];
  for (const [spec, message] of cases)
    test(JSON.stringify(spec), () => {
      expect(() => compileLanguage(spec)).toThrow(new UnsupportedPattern(message));
    });
});

describe("targeted language decisions", () => {
  test("never explores a string that is not well-formed", () => {
    expect(
      languagesEqual(jsSpec("\\uD800[^\\uDC00-\\uDFFF]", "", "search"), jsSpec("[^\\s\\S]")),
    ).toEqual({ holds: true });
  });

  test("tries only code units", () => {
    expect(languagesEqual(jsSpec("", "", "search"), jsSpec("[\\0-\\uFFFF]*"))).toEqual({
      holds: true,
    });
  });

  test("reports the most readable shortest witness", () => {
    const both = (witness: string) => ({
      holds: false,
      witness,
      reason: `${JSON.stringify(witness)} is in both languages`,
    });
    for (const [source, witness] of [
      ["[ -/]", " "],
      ["[bd]", "b"],
      ["[B-Z]", "B"],
      ["[1-9]", "1"],
      ["[!-/]", "!"],
      ["[\\x01-\\x1f]", "\x01"],
      ["[\\u0100-\\u0200]", "\u0100"],
      ["[\\x01 !b\\u0100]", "b"],
    ] as const)
      expect(languagesDisjoint(jsSpec(source), jsSpec(source))).toEqual(both(witness));
  });

  test("refuses a product automaton past its bound", () => {
    expect(() =>
      languagesDisjoint(pySpec("b*a((b*a){251})*b*"), pySpec("(((a|c)*b){251})*(a|c)*c[abc]*")),
    ).toThrow(new UnsupportedPattern("the languages' product automaton grew too large to decide"));
  });

  test("refuses a pattern automaton past its bound", () => {
    let state = 2463534242;
    let text = "";
    for (let index = 0; index < 60_000; index++) {
      state ^= state << 13;
      state >>>= 0;
      state ^= state >>> 17;
      state ^= state << 5;
      state >>>= 0;
      text += state & 1 ? "a" : "b";
    }
    expect(() => languageAccepts(jsSpec("[ab]*a[ab]{19}"), text)).toThrow(
      new UnsupportedPattern("the pattern's automaton grew too large to decide"),
    );
  });
});
