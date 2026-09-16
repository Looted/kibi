// implements REQ-cli-coverage
import { afterEach, describe, expect, test } from "bun:test";
import { uniqueStrings } from "../../src/public/impact/coverage-depth-quality.js";

afterEach(() => {
  process.exitCode = 0;
});

describe("coverage depth uniqueStrings leftover", () => {
  test("deduplicates and sorts strings", () => {
    expect(uniqueStrings(["zeta", "alpha", "zeta"])).toEqual(["alpha", "zeta"]);
    expect(uniqueStrings([])).toEqual([]);
  });
});
