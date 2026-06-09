import { describe, expect, test } from "bun:test";
import { evaluateProseCoverageCorpus } from "../../src/semantic-advisor/prose-coverage-evaluator.js";
import { PROSE_COVERAGE_CORPUS } from "./prose-coverage-fixture.js";

describe("semantic advisor prose coverage corpus", () => {
  test("maps every corpus requirement to the expected Prolog-ready suggestion and usage hints", async () => {
    const result = await evaluateProseCoverageCorpus(PROSE_COVERAGE_CORPUS);

    expect(result.coverage).toBe(1);
    expect(result.failures).toEqual([]);
    expect(result.summary).toEqual({
      total: PROSE_COVERAGE_CORPUS.length,
      passed: PROSE_COVERAGE_CORPUS.length,
      failed: 0,
    });
  });
});
