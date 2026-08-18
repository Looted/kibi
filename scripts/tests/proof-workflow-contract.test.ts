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

      const markdown = readFileSync(
        join(ROOT, "documentation", "tests", `${entry.test_id}.md`),
        "utf8",
      );
      const frontmatter = markdown.match(/^---\n([\s\S]*?)\n---/)?.[1];
      expect(frontmatter).toBeTruthy();
      const parsed = Bun.YAML.parse(frontmatter ?? "") as {
        verification_contract?: { command_argv?: string[] };
      };
      expect(parsed.verification_contract?.command_argv).toEqual(
        entry.contract.command_argv,
      );
    }
  });

  test("proof runs before baseline enforcement and report generation", () => {
    const runner = proofWorkflow.indexOf(
      "Run every contracted proof command through Kibi",
    );
    const baselineCheck = proofWorkflow.indexOf(
      "Enforce proof baseline and clean snapshot",
    );
    const report = proofWorkflow.indexOf("Generate requirement health report");
    expect(runner).toBeGreaterThanOrEqual(0);
    expect(baselineCheck).toBeGreaterThan(runner);
    expect(report).toBeGreaterThan(baselineCheck);
    expect(proofWorkflow).toContain(
      "--rules no-dangling-refs,source-relationship-parity,no-cycles,required-fields,deprecated-adr-no-successor,domain-contradictions,query-plan-safety,logic-coverage,strict-fact-shape,strict-req-fact-pairing,predicate-verifiability,rule-safety,rule-verifiability,semantic-completeness",
    );
    expect(ciWorkflow).not.toContain("Generate Kibi requirement health report");
  });

  test("ratchet baseline fixes the denominator and tracks every observed gap", () => {
    expect(baseline.mode).toBe("ratchet");
    expect(baseline.currentRequirements).toBe(89);
    expect(baseline.proofProven).toBe(18);
    expect(baseline.currentUnproven).toBe(71);
    expect(Object.keys(baseline.trackedGaps).sort()).toEqual([
      "contradiction_check_incomplete",
      "missing_logic_claims",
      "missing_passing_e2e",
      "missing_production_symbol",
      "missing_production_symbol_coverage",
      "missing_semantic_inventory",
      "missing_verification_receipt",
      "unresolved_semantic_proposition",
    ]);
  });
});
