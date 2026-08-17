import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const registry = JSON.parse(
  readFileSync(join(ROOT, "proof", "verification-registry.json"), "utf8"),
) as {
  version: string;
  contracts: Array<{
    test_id: string;
    contract: {
      command_argv: string[];
      required_case_symbols: string[];
      required_projects: string[];
    };
    steps: string[][];
  }>;
};
const baseline = JSON.parse(
  readFileSync(join(ROOT, "proof", "baseline.json"), "utf8"),
) as {
  mode: string;
  currentRequirements: number;
  proofProven: number;
  currentUnproven: number;
  trackedGaps: Record<string, number>;
};
const proofWorkflow = readFileSync(
  join(ROOT, ".github", "workflows", "proof.yml"),
  "utf8",
);
const ciWorkflow = readFileSync(
  join(ROOT, ".github", "workflows", "ci.yml"),
  "utf8",
);

describe("strict proof workflow contract", () => {
  test("registry entries execute through the real Kibi verify adapter", () => {
    expect(registry.version).toBe("kibi.proof-registry.v1");
    expect(registry.contracts.length).toBeGreaterThan(0);

    for (const entry of registry.contracts) {
      expect(entry.contract.command_argv).toEqual([
        "node",
        "scripts/run-proof-contract.mjs",
        "--test-id",
        entry.test_id,
      ]);
      expect(entry.contract.required_case_symbols.length).toBeGreaterThan(0);
      expect(entry.contract.required_projects.length).toBeGreaterThan(0);
      expect(entry.steps.length).toBeGreaterThan(0);
      for (const step of entry.steps) {
        expect(step.length).toBeGreaterThan(0);
        expect(step[0]).not.toBe("sh");
        expect(step[0]).not.toBe("bash");
      }
    }
  });

  test("proof runs before baseline enforcement and report generation", () => {
    const runner = proofWorkflow.indexOf(
      "Run every contracted proof command through Kibi",
    );
    const baselineCheck = proofWorkflow.indexOf(
      "Enforce proof baseline and clean snapshot",
    );
    const report = proofWorkflow.indexOf(
      "Generate report only after proof verification",
    );
    expect(runner).toBeGreaterThanOrEqual(0);
    expect(baselineCheck).toBeGreaterThan(runner);
    expect(report).toBeGreaterThan(baselineCheck);
    expect(ciWorkflow).not.toContain("Generate Kibi requirement health report");
  });

  test("ratchet baseline fixes the denominator and tracks every observed gap", () => {
    expect(baseline.mode).toBe("ratchet");
    expect(baseline.currentRequirements).toBe(90);
    expect(baseline.proofProven).toBe(0);
    expect(baseline.currentUnproven).toBe(90);
    expect(Object.keys(baseline.trackedGaps).sort()).toEqual([
      "contradiction_check_incomplete",
      "logic_manifest_mismatch",
      "missing_logic_claims",
      "missing_passing_e2e",
      "missing_production_symbol",
      "missing_production_symbol_coverage",
      "missing_scenario",
      "missing_semantic_inventory",
      "missing_symbol_coordinates",
      "missing_verification_receipt",
      "stale_verification_receipt",
      "unresolved_semantic_proposition",
    ]);
  });
});
