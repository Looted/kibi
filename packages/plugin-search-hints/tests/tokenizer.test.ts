import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { WordPieceTokenizer } from "../src/tokenizer.js";

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
});
