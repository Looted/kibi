import { describe, expect, test } from "bun:test";
import {
  clampConfidence,
  cleanPredicate,
  cleanSubject,
  normalizeClaimValue,
  normalizeOptionalString,
  normalizeSourceFiles,
  normalizeText,
  stripListPrefix,
  trimSentenceTail,
} from "../../../src/operations/modeling/requirement-utils.js";

describe("normalizeText", () => {
  test("trims and rejects empty text", () => {
    expect(normalizeText("  a b  ")).toBe("a b");
    for (const value of ["", "   ", undefined as unknown as string]) {
      expect(() => normalizeText(value)).toThrow(
        /^Requirement modeling failed: text must be a non-empty string$/,
      );
    }
  });
});

describe("normalizeOptionalString", () => {
  test("trims or drops", () => {
    expect(normalizeOptionalString(" x ")).toBe("x");
    expect(normalizeOptionalString("  ")).toBeUndefined();
    expect(normalizeOptionalString(undefined)).toBeUndefined();
  });
});

describe("normalizeSourceFiles", () => {
  test("trims, drops blanks and dedupes in order", () => {
    expect(
      normalizeSourceFiles([
        " b.md",
        "a.md",
        "b.md ",
        "",
        "  ",
        null as never,
        "a.md",
      ]),
    ).toStrictEqual(["b.md", "a.md"]);
    expect(normalizeSourceFiles(undefined)).toStrictEqual([]);
  });
});

describe("clampConfidence", () => {
  test("defaults, clamps and rounds to two decimals", () => {
    expect(clampConfidence(undefined)).toBe(0.8);
    expect(clampConfidence(Number.NaN)).toBe(0.8);
    expect(clampConfidence(Number.POSITIVE_INFINITY)).toBe(0.8);
    expect(clampConfidence("0.3" as never)).toBe(0.8);
    expect(clampConfidence(1.7)).toBe(1);
    expect(clampConfidence(-2)).toBe(0);
    expect(clampConfidence(0.456)).toBe(0.46);
    expect(clampConfidence(0.454)).toBe(0.45);
  });
});

describe("normalizeClaimValue", () => {
  test("sorts and dedupes trimmed set members", () => {
    expect(normalizeClaimValue([" b", "a", "b "])).toStrictEqual(["a", "b"]);
  });

  test("rejects empty sets and blank or non-string members", () => {
    for (const value of [[], ["a", " "], ["a", 1]]) {
      expect(() => normalizeClaimValue(value)).toThrow(
        /^Requirement modeling failed: a set value must be a non-empty list of non-empty strings$/,
      );
    }
  });

  test("passes scalars through", () => {
    expect(normalizeClaimValue("x ")).toBe("x ");
    expect(normalizeClaimValue(3)).toBe(3);
    expect(normalizeClaimValue(false)).toBe(false);
  });

  test("rejects non-finite numbers and other values", () => {
    expect(() => normalizeClaimValue(Number.NaN)).toThrow(
      /^Requirement modeling failed: value must be a finite number$/,
    );
    for (const value of [null, undefined, {}]) {
      expect(() => normalizeClaimValue(value)).toThrow(
        /^Requirement modeling failed: value must be a string, number, boolean, or a list of strings$/,
      );
    }
  });
});

describe("list and sentence cleanup", () => {
  test("stripListPrefix removes bullets and numbering at the start only", () => {
    expect(stripListPrefix("  - item ")).toBe("item");
    expect(stripListPrefix("* item")).toBe("item");
    expect(stripListPrefix("+  item")).toBe("item");
    expect(stripListPrefix("12. item")).toBe("item");
    expect(stripListPrefix(" 3) item")).toBe("item");
    expect(stripListPrefix("-item")).toBe("-item");
    expect(stripListPrefix("a - b")).toBe("a - b");
    expect(stripListPrefix("1.item")).toBe("1.item");
    expect(stripListPrefix("x 1. item")).toBe("x 1. item");
    expect(stripListPrefix("- 1. item")).toBe("item");
  });

  test("trimSentenceTail removes trailing punctuation runs only", () => {
    expect(trimSentenceTail(" a. b?! :; ")).toBe("a. b");
    expect(trimSentenceTail("a")).toBe("a");
  });

  test("cleanSubject drops one leading article", () => {
    expect(cleanSubject("- The parser.")).toBe("parser");
    expect(cleanSubject("an  API")).toBe("API");
    expect(cleanSubject("A x")).toBe("x");
    expect(cleanSubject("theory")).toBe("theory");
    expect(cleanSubject("x the y")).toBe("x the y");
    expect(cleanSubject("the ")).toBe("the");
  });

  test("cleanPredicate falls back to statement", () => {
    expect(cleanPredicate("1. must run.")).toBe("must run");
    expect(cleanPredicate("- ...")).toBe("statement");
  });
});
