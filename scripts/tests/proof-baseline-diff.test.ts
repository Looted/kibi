import { describe, expect, test } from "bun:test";
import {
  diffFingerprints,
  fingerprintRequirements,
  parseSpawnJson,
  renderRequirementDiffs,
} from "../lib/proof-baseline-diff.mjs";

describe("proof baseline fingerprints", () => {
  test("fingerprints skip not_applicable rows and sort gap/symbol lists", () => {
    const fingerprints = fingerprintRequirements([
      {
        id: "REQ-B",
        proofStatus: "missing",
        proofGaps: ["missing_passing_e2e", "missing_production_symbol_coverage"],
        proofStages: {
          productionSymbols: { uncoveredSymbols: ["SYM-b", "SYM-a"] },
        },
      },
      { id: "REQ-SKIP", proofStatus: "not_applicable", proofGaps: [] },
    ]);
    expect(fingerprints["REQ-SKIP"]).toBeUndefined();
    expect(fingerprints["REQ-B"]).toEqual({
      proofStatus: "missing",
      gaps: ["missing_passing_e2e", "missing_production_symbol_coverage"],
      uncoveredSymbols: ["SYM-a", "SYM-b"],
    });
  });

  test("reports REQ-A proven -> missing when a new production symbol appears", () => {
    const baseline = {
      "REQ-A": {
        proofStatus: "proven",
        gaps: [],
        uncoveredSymbols: [],
      },
    };
    const current = {
      "REQ-A": {
        proofStatus: "missing",
        gaps: ["missing_production_symbol_coverage"],
        uncoveredSymbols: ["SYM-new"],
      },
    };
    const changes = diffFingerprints(baseline, current);
    expect(changes).toEqual([
      {
        id: "REQ-A",
        kind: "changed",
        before: baseline["REQ-A"],
        after: current["REQ-A"],
      },
    ]);
    const text = renderRequirementDiffs(changes, [
      {
        id: "REQ-A",
        proofStatus: "missing",
        proofGaps: ["missing_production_symbol_coverage"],
        proofStages: {
          productionSymbols: {
            uncoveredSymbols: ["SYM-new"],
            explanations: [
              {
                symbolId: "SYM-new",
                reason: "covered_by_missing",
                coverageCandidates: [],
              },
            ],
          },
        },
      },
    ]);
    expect(text).toContain("committed proof/baseline.json");
    expect(text).toContain("REQ-A: proven -> missing");
    expect(text).toContain("uncovered symbol added: SYM-new");
    expect(text).toContain("gap added: missing_production_symbol_coverage");
    expect(text).toContain("SYM-new: covered_by_missing");
  });

  test("parseSpawnJson reads JSON even when the process exits 1", () => {
    const parsed = parseSpawnJson({
      status: 1,
      stdout: JSON.stringify({
        structuredContent: { violations: [{ rule: "no-dangling-refs" }] },
      }),
      stderr: "integrity noise",
    });
    expect(parsed.structuredContent.violations).toHaveLength(1);
  });
});
