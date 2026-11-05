import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Fixture = {
  names: string[];
  cases: { text: string; results: unknown[] }[];
};

/**
 * Pins, for every sentence in a fixture, the result of each exported
 * function of `mod` called as fn(text, "subj_key"). The sentences include
 * line-break, spacing and one-letter variants of each pattern, so every
 * boundary of each sentence pattern is pinned.
 */
export function pinSentenceRows(
  mod: Record<string, unknown>,
  fixture: string,
): void {
  const { names, cases } = JSON.parse(
    readFileSync(join(import.meta.dir, "fixtures", fixture), "utf8"),
  ) as Fixture;

  test("fixture names every exported function", () => {
    expect(names).toStrictEqual(
      Object.keys(mod).filter((key) => typeof mod[key] === "function"),
    );
  });

  for (const [index, { text, results }] of cases.entries()) {
    test(`sentence ${index}: ${JSON.stringify(text)}`, () => {
      const actual = names.map((name) =>
        (mod[name] as (text: string, subject: string) => unknown)(
          text,
          "subj_key",
        ),
      );
      expect(actual).toStrictEqual(results);
    });
  }
}
