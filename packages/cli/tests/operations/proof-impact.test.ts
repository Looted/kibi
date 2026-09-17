import { describe, expect, test } from "bun:test";
import {
  COMMITTED_BASELINE_PATH,
  buildProofImpact,
  renderProofImpact,
} from "../../src/operations/proof/impact.js";

describe("proof impact vs committed baseline", () => {
  test("names committed proof/baseline.json as the comparison target", () => {
    const { result, rows } = buildProofImpact(
      {
        version: "kibi.proof-baseline.v2",
        requirements: {
          "REQ-A": {
            proofStatus: "proven",
            gaps: [],
            uncoveredSymbols: [],
          },
        },
      },
      {
        summary: {
          total: 1,
          proofNotApplicable: 0,
          proofProven: 0,
          proofMissing: 1,
          proofUnresolved: 0,
        },
        rows: [
          {
            id: "REQ-A",
            proofStatus: "missing",
            proofGaps: ["missing_production_symbol_coverage"],
            proofStages: {
              productionSymbols: { uncoveredSymbols: ["SYM-new"] },
            },
          },
        ],
      },
    );
    expect(result.comparisonTarget).toBe(COMMITTED_BASELINE_PATH);
    expect(result.comparisonTarget).toBe("proof/baseline.json");
    expect(result.changes[0]?.id).toBe("REQ-A");
    const text = renderProofImpact(result, rows);
    expect(text).toContain("committed proof/baseline.json");
    expect(text).toContain("REQ-A: proven -> missing");
    expect(text).not.toContain("Git HEAD");
    expect(text).not.toContain("worktree");
  });
});
