import { describe, expect, test } from "bun:test";

import { buildRepairPlan } from "../../src/public/operations/repair-plan.js";

function row(overrides: Readonly<Record<string, unknown>> = {}) {
  return {
    id: "REQ-PLAN-001",
    proofStatus: "missing",
    proofGaps: [
      "missing_symbol_coordinates",
      "missing_logic_claims",
      "missing_proof_receipt",
      "missing_semantic_inventory",
      "missing_logic_grounding",
      "missing_scenario",
    ],
    proofRepairs: [
      {
        gap: "missing_semantic_inventory",
        priority: 10,
        stage: "semantic_inventory",
        action: "Analyze every proposition.",
      },
      {
        gap: "missing_logic_claims",
        priority: 30,
        stage: "logic_grounding",
        action: "Persist the exact manifest.",
      },
      {
        gap: "missing_logic_grounding",
        priority: 32,
        stage: "logic_grounding",
        action: "Create exact ground facts.",
      },
      {
        gap: "missing_scenario",
        priority: 50,
        stage: "scenarios",
        action: "Create a scenario.",
      },
      {
        gap: "missing_proof_receipt",
        priority: 53,
        stage: "passing_e2e",
        action: "Append a receipt.",
      },
      {
        gap: "missing_symbol_coordinates",
        priority: 80,
        stage: "source_coordinates",
        action: "Refresh coordinates.",
      },
    ],
    proofStages: {
      semanticInventory: { status: "missing", propositionCount: 0 },
      logicGrounding: { status: "blocked", missingGroundClaims: ["CLAIM-A"] },
      scenarios: { status: "missing", scenarios: [] },
      passingE2e: {
        status: "missing",
        checkedAt: "2026-08-10T10:00:00Z",
        receiptEvidence: [
          { testId: "TEST-001", state: "missing", ageSeconds: 3 },
        ],
      },
      sourceCoordinates: { status: "missing", missingSymbols: ["SYM-001"] },
    },
    ...overrides,
  };
}

describe("dependency-ordered requirement repair plans", () => {
  test("groups one requirement into small safe batches and blocks downstream work", () => {
    const plan = buildRepairPlan(
      {
        summary: { proofMissing: 1, proofUnresolved: 0 },
        rows: [row()],
      },
      { by: "req", limit: 100, offset: 0 },
      "a".repeat(64),
    );
    if (plan === undefined) {
      throw new Error("Requirement coverage must return a repair plan");
    }

    expect(plan.version).toBe("kibi.repair-plan.v1");
    expect(plan.readOnly).toBe(true);
    expect(plan.status).toBe("ready");
    expect(plan.scope.complete).toBe(true);
    expect(plan.batches.map((batch) => batch.phase)).toEqual([
      "semantic_inventory",
      "ground_endpoints",
      "manifest_links",
      "scenario_endpoints",
      "proof_evidence",
      "source_coordinates",
    ]);
    expect(plan.batches[0]?.state).toBe("ready");
    expect(
      plan.batches.slice(1).every((batch) => batch.state === "blocked"),
    ).toBe(true);
    const firstBatch = plan.batches[0];
    const secondBatch = plan.batches[1];
    if (firstBatch === undefined || secondBatch === undefined) {
      throw new Error("Repair plan must contain dependency batches");
    }
    expect(plan.batches[2]?.dependsOn).toEqual([firstBatch.id, secondBatch.id]);
    expect(plan.batches[1]?.repairs[0]?.action).toBe(
      "Create exact ground facts.",
    );
    expect(plan.batches[1]?.autoApplicable).toBe(false);
    expect(plan.applicationPolicy).toEqual({
      queryBeforeMutation: true,
      createEndpointsBeforeRelationships: true,
      validateBeforeEachWrite: true,
      sequentialUpsertsOnly: true,
      recheckCoverageAfterEachBatch: true,
    });
  });

  test("keeps plan IDs stable across volatile proof timestamps and receipt ages", () => {
    const base = buildRepairPlan(
      { summary: { proofMissing: 1, proofUnresolved: 0 }, rows: [row()] },
      { by: "req" },
      "b".repeat(64),
    );
    const changedClock = buildRepairPlan(
      {
        summary: { proofMissing: 1, proofUnresolved: 0 },
        rows: [
          row({
            proofStages: {
              ...(row().proofStages as Record<string, unknown>),
              passingE2e: {
                status: "missing",
                checkedAt: "2030-01-01T00:00:00Z",
                receiptEvidence: [
                  { testId: "TEST-001", state: "missing", ageSeconds: 999 },
                ],
              },
            },
          }),
        ],
      },
      { by: "req" },
      "b".repeat(64),
    );

    expect(changedClock?.planId).toBe(base?.planId);
    expect(JSON.stringify(changedClock?.batches).includes("checkedAt")).toBe(
      false,
    );
    expect(JSON.stringify(changedClock?.batches).includes("ageSeconds")).toBe(
      false,
    );
  });

  test("fails closed when pagination excludes actionable requirements", () => {
    const plan = buildRepairPlan(
      {
        summary: { proofMissing: 3, proofUnresolved: 0 },
        rows: [row()],
      },
      { by: "req", limit: 1, offset: 0 },
      "c".repeat(64),
    );

    expect(plan?.status).toBe("partial");
    expect(plan?.scope.complete).toBe(false);
    expect(plan?.scope.excludedByPagination).toBe(2);
    expect(plan?.diagnostics[0]).toContain("larger limit");
  });

  test("reports no repairs for a complete proven scope and omits non-requirement plans", () => {
    const plan = buildRepairPlan(
      {
        summary: { proofMissing: 0, proofUnresolved: 0 },
        rows: [],
      },
      { by: "req" },
      "d".repeat(64),
    );
    expect(plan?.status).toBe("no_repairs");
    expect(plan?.batches).toEqual([]);
    expect(
      buildRepairPlan(
        { summary: {}, rows: [] },
        { by: "symbol" },
        "d".repeat(64),
      ),
    ).toBeUndefined();
  });
});
