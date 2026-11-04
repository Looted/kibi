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
