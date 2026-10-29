import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  WordPieceTokenizer,
  normalize,
  preTokenize,
} from "../src/tokenizer.js";

const vocabulary = readFileSync(
  new URL("../assets/vocab.txt", import.meta.url),
  "utf8",
)
  .split("\n")
  .filter((_, index, all) => index < all.length - 1);
// Recorded with Hugging Face `tokenizers` from potion-base-8M's
// tokenizer.json (add_special_tokens: false).
const fixtures = JSON.parse(
  readFileSync(
    new URL("./fixtures/tokenizer-parity.json", import.meta.url),
    "utf8",
  ),
) as { text: string; ids: number[] }[];
// Edges of every CJK range, ASCII punctuation range, control and whitespace
// class, the 100-character word limit and each special token, recorded the
// same way (scripts/gen-tokenizer-boundaries.py).
const boundaries = JSON.parse(
  readFileSync(
    new URL("./fixtures/tokenizer-boundaries.json", import.meta.url),
    "utf8",
  ),
) as { text: string; ids: number[] }[];

// executable_for TEST-kibi-plugin-search-hints
describe("WordPiece tokenizer", () => {
  const tokenizer = new WordPieceTokenizer(vocabulary);

  test("matches the reference tokenizer id for id", () => {
    const mismatches = fixtures.filter(
      (fixture) =>
        JSON.stringify(tokenizer.encode(fixture.text)) !==
        JSON.stringify(fixture.ids),
    );
    expect(mismatches.map((fixture) => fixture.text)).toEqual([]);
    expect(fixtures.length).toBeGreaterThan(200);
  });

  test("matches the reference tokenizer at every character-class edge", () => {
    const mismatches = boundaries.filter(
      (fixture) =>
        JSON.stringify(tokenizer.encode(fixture.text)) !==
        JSON.stringify(fixture.ids),
    );
    expect(mismatches.map((fixture) => fixture.text)).toEqual([]);
    expect(boundaries.length).toBe(94);
  });

  test("normalization drops controls and turns spacing into single spaces", () => {
    expect(normalize("A\u0000\tb\u3000C\u0007\ufffd")).toBe("a b c");
  });

  test("pre-tokenization yields no empty words", () => {
    expect(preTokenize("  ab  .c. d ")).toEqual(["ab", ".", "c", ".", "d"]);
    expect(preTokenize("")).toEqual([]);
  });

  test("a vocabulary without [UNK] is rejected", () => {
    expect(() => new WordPieceTokenizer(["a", "b"])).toThrow(
      "vocabulary has no [UNK] token",
    );
  });
});
