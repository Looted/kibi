import { describe, expect, test } from "bun:test";
import { deniedReadScore } from "../runtime/codex-episode";
import type { CellReceipt } from "../scoring/cell";

const cell = {
  components: { finalState: 60, protocol: 25, isolation: 15 },
} as unknown as CellReceipt;

describe("refused .kb reads", () => {
  test("Given a refused read When the cell is scored Then only the isolation points are lost", () => {
    expect(deniedReadScore(100, cell, 1)).toBe(85);
    expect(deniedReadScore(40, cell, 2)).toBe(25);
  });

  test("Given no refused read or a zeroed cell When scored Then the score is unchanged", () => {
    expect(deniedReadScore(100, cell, 0)).toBe(100);
    expect(deniedReadScore(0, cell, 1)).toBe(0);
  });
});
