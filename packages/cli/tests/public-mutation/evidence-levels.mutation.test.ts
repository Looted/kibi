import { describe, expect, test } from "bun:test";
import {
  EVIDENCE_LEVELS,
  evidenceRank,
} from "../../src/public/evidence-levels.js";

describe("evidence levels", () => {
  test("lists the levels strongest first", () => {
    expect(EVIDENCE_LEVELS).toStrictEqual([
      "proved",
      "tested",
      "asserted",
      "unverified",
    ]);
  });

  test("ranks unverified 0 through proved 3", () => {
    expect(evidenceRank("proved")).toBe(3);
    expect(evidenceRank("tested")).toBe(2);
    expect(evidenceRank("asserted")).toBe(1);
    expect(evidenceRank("unverified")).toBe(0);
  });
});
