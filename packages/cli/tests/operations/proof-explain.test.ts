import { describe, expect, test } from "bun:test";
import {
  classifyExplainTarget,
  projectRequirementExplain,
  projectSymbolExplain,
  renderProofExplain,
} from "../../src/operations/proof/explain.js";

const requirementProof = {
  id: "REQ-example",
  proofVersion: "kibi.requirement-proof.v3",
  proofStatus: "missing",
  proofGaps: ["missing_production_symbol_coverage"],
  testResolutions: [
    {
      testId: "TEST-example",
      requiredProofs: [
        {
          id: "SYM-proof",
          sourceFile: "tests/example.spec.ts",
          role: "behavioral",
          exists: true,
        },
      ],
      executableFor: [
        {
          id: "SYM-exec",
          sourceFile: "tests/example.spec.ts",
          role: "behavioral",
          exists: true,
        },
      ],
    },
  ],
  proofStages: {
    scenarios: { scenarios: ["SCEN-example"] },
    scenarioTests: {
      tests: ["TEST-example"],
      obligations: [{ scenarioId: "SCEN-example", tests: ["TEST-example"] }],
    },
    productionSymbols: {
      symbols: ["SYM-prod"],
      structuralSymbols: [],
      uncoveredSymbols: ["SYM-prod"],
      explanations: [
        {
          symbolId: "SYM-prod",
          classification: "behavioral",
          status: "uncovered",
          reason: "no_qualifying_e2e_coverage",
          reasonText: "covered_by exists but none qualify",
          coverageCandidates: [
            {
              testId: "TEST-unit",
              relationship: "covered_by",
              qualifies: false,
              reason: "test_not_in_requirement_scenario_chain",
              secondaryReasons: ["test_scope_is_unit"],
              scope: "unit",
            },
          ],
        },
      ],
    },
  },
};

describe("proof explain projection", () => {
  test("classifies REQ and SYM ids and option overrides", () => {
    expect(classifyExplainTarget("REQ-1", {})).toEqual({
      kind: "requirement",
      id: "REQ-1",
    });
    expect(classifyExplainTarget("SYM-1", {})).toEqual({
      kind: "symbol",
      id: "SYM-1",
    });
    expect(classifyExplainTarget(undefined, { requirement: "REQ-2" })).toEqual({
      kind: "requirement",
      id: "REQ-2",
    });
    expect(() =>
      classifyExplainTarget("REQ-1", { requirement: "REQ-1", symbol: "SYM-1" }),
    ).toThrow(/not both/);
  });

  test("structural unit candidate is rendered as qualifying, not test_scope_is_unit", () => {
    const view = projectRequirementExplain({
      id: "REQ-shape",
      proofVersion: "kibi.requirement-proof.v3",
      proofStatus: "missing",
      proofGaps: ["missing_production_symbol_coverage"],
      proofStages: {
        scenarios: { scenarios: [] },
        scenarioTests: { tests: [] },
        productionSymbols: {
          symbols: ["SYM-behavior"],
          structuralSymbols: ["SYM-Shape"],
          uncoveredSymbols: ["SYM-behavior"],
          explanations: [
            {
              symbolId: "SYM-Shape",
              classification: "type-shape",
              status: "covered",
              reason: "structural_unit_contract",
              coverageCandidates: [
                {
                  testId: "TEST-Shape-Unit",
                  relationship: "covered_by",
                  qualifies: true,
                  reason: "structural_unit_contract",
                  secondaryReasons: [],
                  scope: "unit",
                },
                {
                  testId: "TEST-unrelated",
                  relationship: "covered_by",
                  qualifies: false,
                  reason: "test_not_in_requirement_scenario_chain",
                  secondaryReasons: ["test_scope_is_unit"],
                  scope: "unit",
                },
              ],
            },
            {
              symbolId: "SYM-behavior",
              classification: "behavioral",
              status: "uncovered",
              reason: "no_qualifying_e2e_coverage",
              coverageCandidates: [
                {
                  testId: "TEST-Shape-Unit",
                  relationship: "covered_by",
                  qualifies: false,
                  reason: "test_scope_is_unit",
                  secondaryReasons: [],
                  scope: "unit",
                },
              ],
            },
          ],
        },
      },
    });
    expect(view.structuralSymbols[0]).toEqual(
      expect.objectContaining({
        symbolId: "SYM-Shape",
        status: "covered",
        reason: "structural_unit_contract",
      }),
    );
    expect(view.structuralSymbols[0]?.coverageCandidates[0]).toEqual(
      expect.objectContaining({
        testId: "TEST-Shape-Unit",
        qualifies: true,
        reason: "structural_unit_contract",
      }),
    );
    const text = renderProofExplain(view);
    expect(text).toContain(
      "SYM-Shape [type-shape] covered structural_unit_contract",
    );
    expect(text).toContain(
      "TEST-Shape-Unit qualifies=true reason=structural_unit_contract",
    );
    const structuralSection = text.split("Structural symbols")[1] ?? "";
    expect(structuralSection).toContain(
      "TEST-Shape-Unit qualifies=true reason=structural_unit_contract",
    );
    expect(structuralSection).not.toMatch(
      /TEST-Shape-Unit qualifies=false reason=test_scope_is_unit/,
    );
  });

  test("JSON view keeps required_proofs, executable_for, and covered_by distinct", () => {
    const view = projectRequirementExplain(requirementProof);
    expect(view.proofVersion).toBe("kibi.requirement-proof.v3");
    expect(view.tests[0]?.requiredProofs[0]?.id).toBe("SYM-proof");
    expect(view.tests[0]?.executableFor[0]?.id).toBe("SYM-exec");
    expect(view.productionSymbols[0]?.coverageCandidates[0]).toEqual(
      expect.objectContaining({
        testId: "TEST-unit",
        relationship: "covered_by",
        qualifies: false,
        reason: "test_not_in_requirement_scenario_chain",
        secondaryReasons: ["test_scope_is_unit"],
      }),
    );
    const text = renderProofExplain(view);
    expect(text).toContain("required_proofs");
    expect(text).toContain("executable_for");
    expect(text).toContain("covered_by");
    const requiredIndex = text.indexOf("required_proofs");
    const executableIndex = text.indexOf("executable_for");
    const coveredIndex = text.indexOf("    covered_by");
    expect(requiredIndex).toBeGreaterThanOrEqual(0);
    expect(executableIndex).toBeGreaterThan(requiredIndex);
    expect(coveredIndex).toBeGreaterThan(executableIndex);
    expect(text).not.toMatch(
      /REQ-example -> SCEN-example -> TEST-example -> SYM-prod/,
    );
  });

  test("symbol view projects implementing requirement proofs", () => {
    const view = projectSymbolExplain({
      symbolId: "SYM-prod",
      role: "behavioral",
      executableTest: false,
      implementingRequirements: ["REQ-example"],
      executableFor: [],
      coveredBy: ["TEST-unit"],
      proofs: [requirementProof],
    });
    expect(view.kind).toBe("symbol");
    expect(view.proofs[0]?.productionSymbols[0]?.reason).toBe(
      "no_qualifying_e2e_coverage",
    );
    const text = renderProofExplain(view);
    expect(text).toContain("role: behavioral");
    expect(text).toContain("required_proofs");
    expect(text).toContain("covered_by");
  });
});
