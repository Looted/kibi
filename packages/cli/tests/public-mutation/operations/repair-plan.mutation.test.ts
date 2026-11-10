import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

import {
  REPAIR_PLAN_VERSION,
  buildRepairPlan,
} from "../../../src/public/operations/repair-plan.js";
import { expectGolden } from "../helpers/golden.js";

const ALL_GAPS = [
  "missing_requirement_source",
  "missing_semantic_inventory",
  "incomplete_semantic_inventory",
  "malformed_semantic_inventory",
  "unresolved_semantic_proposition",
  "missing_logic_grounding",
  "ambiguous_logic_grounding",
  "contradiction_check_incomplete",
  "missing_logic_claims",
  "logic_manifest_mismatch",
  "blocking_contradiction",
  "missing_scenario",
  "infeasible_scenario",
  "unknown_scenario_feasibility",
  "dimension_unrepresented",
  "happy_path_only",
  "uncovered_case",
  "missing_scenario_test",
  "proof_snapshot_unavailable",
  "missing_passing_e2e",
  "proof_contract_mismatch",
  "missing_proof_receipt",
  "stale_proof_receipt",
  "failed_proof_receipt",
  "invalid_proof_receipt",
  "missing_executable_test_symbol",
  "missing_production_symbol",
  "missing_production_symbol_coverage",
  "missing_symbol_coordinates",
  "mystery_gap",
];
const STAGE_KEYS = [
  "semanticInventory",
  "logicGrounding",
  "contradictions",
  "scenarios",
  "scenarioTests",
  "negativePath",
  "dimension",
  "cases",
  "passingE2e",
  "executableSymbols",
  "productionSymbols",
  "sourceCoordinates",
];

const plan = (
  rows: readonly Record<string, unknown>[],
  input: Parameters<typeof buildRepairPlan>[1] = {},
  summary?: Record<string, number>,
) => {
  const result = buildRepairPlan(
    summary === undefined ? { rows } : { rows, summary },
    input,
    "snap",
  );
  if (result === undefined) throw new Error("expected a plan");
  return result;
};

describe("buildRepairPlan", () => {
  test("plans every known gap phase", () => {
    const stages = Object.fromEntries(
      STAGE_KEYS.map((key) => [
        key,
        { stage: key, z: 1, a: [{ checkedAt: 1, b: 2, ageSeconds: 3 }] },
      ]),
    );
    const result = plan([
      { id: "REQ 1/x", proofGaps: ALL_GAPS, proofStages: stages },
    ]);
    expect(REPAIR_PLAN_VERSION).toBe("kibi.repair-plan.v1");
    expectGolden("repair-plan-all-phases", result);
  });

  test("returns nothing outside requirement coverage", () => {
    expect(buildRepairPlan({}, { by: "symbol" }, "s")).toBeUndefined();
    expect(buildRepairPlan({}, { by: "type" }, "s")).toBeUndefined();
  });

  test("reports no repairs for a complete empty coverage", () => {
    const result = buildRepairPlan({}, {}, "snap");
    const scope = {
      by: "req",
      tags: [],
      offset: 0,
      limit: 100,
      complete: true,
      actionableRequirements: 0,
      returnedActionableRequirements: 0,
      excludedByPagination: 0,
    };
    const planId = `repair-plan-${createHash("sha256")
      .update(
        JSON.stringify({
          batches: [],
          codeSnapshot: "snap",
          scope: {
            actionableRequirements: 0,
            by: "req",
            complete: true,
            excludedByPagination: 0,
            limit: 100,
            offset: 0,
            returnedActionableRequirements: 0,
            tags: [],
          },
          version: "kibi.repair-plan.v1",
        }),
      )
      .digest("hex")
      .slice(0, 24)}`;
    expect(result).toStrictEqual({
      version: "kibi.repair-plan.v1",
      planId,
      readOnly: true,
      status: "no_repairs",
      codeSnapshot: "snap",
      scope,
      applicationPolicy: {
        queryBeforeMutation: true,
        createEndpointsBeforeRelationships: true,
        validateBeforeEachWrite: true,
        sequentialUpsertsOnly: true,
        recheckCoverageAfterEachBatch: true,
      },
      summary: {
        requirementCount: 0,
        repairCount: 0,
        batchCount: 0,
        readyBatchCount: 0,
        blockedBatchCount: 0,
      },
      batches: [],
      diagnostics: [],
    });
  });

  test("keeps only requirement rows with gaps", () => {
    const result = plan([
      { id: 7, proofGaps: ["missing_scenario"] },
      { id: "REQ-A", proofGaps: [] },
      { id: "REQ-B", proofGaps: "missing_scenario" },
      { id: "REQ-C", proofGaps: [3, "missing_scenario", "missing_scenario"] },
    ]);
    expect(result.batches.map((batch) => batch.requirementId)).toEqual([
      "REQ-C",
    ]);
    expect(result.batches[0]?.repairs).toHaveLength(1);
  });

  test("orders batches by phase, then requirement", () => {
    const result = plan([
      {
        id: "REQ-b",
        proofGaps: ["missing_scenario", "missing_semantic_inventory"],
      },
      { id: "REQ-a", proofGaps: ["missing_scenario_test", "missing_scenario"] },
    ]);
    expect(
      result.batches.map((batch) => [batch.id, batch.state, batch.dependsOn]),
    ).toEqual([
      ["repair-010-REQ-b-semantic_inventory", "ready", []],
      ["repair-060-REQ-a-scenario_endpoints", "ready", []],
      [
        "repair-060-REQ-b-scenario_endpoints",
        "blocked",
        ["repair-010-REQ-b-semantic_inventory"],
      ],
      [
        "repair-070-REQ-a-scenario_tests",
        "blocked",
        ["repair-060-REQ-a-scenario_endpoints"],
      ],
    ]);
    expect(result.summary).toStrictEqual({
      requirementCount: 2,
      repairCount: 4,
      batchCount: 4,
      readyBatchCount: 2,
      blockedBatchCount: 2,
    });
    expect(result.status).toBe("ready");
  });

  test("takes priority, stage and action from the coverage repair", () => {
    const result = plan([
      {
        id: "REQ-1",
        proofGaps: [
          "missing_proof_receipt",
          "stale_proof_receipt",
          "failed_proof_receipt",
          "invalid_proof_receipt",
        ],
        proofRepairs: [
          "skip",
          { gap: 4, priority: 1 },
          {
            gap: "missing_proof_receipt",
            priority: 3,
            stage: "cases",
            action: "do it",
          },
          { gap: "stale_proof_receipt", priority: 2, stage: 9, action: 1 },
          { gap: "failed_proof_receipt", priority: Number.NaN },
          { gap: "invalid_proof_receipt", priority: Number.POSITIVE_INFINITY },
        ],
        proofStages: { cases: { c: 1 }, passingE2e: "flat" },
      },
    ]);
    const repairs = result.batches[0]?.repairs ?? [];
    const objective =
      "Run the configured proof integration with kibi prove and append fresh snapshot-bound passing receipts.";
    expect(
      repairs.map((repair) => [
        repair.gap,
        repair.proofPriority,
        repair.proofStage,
        repair.action,
        repair.evidence,
      ]),
    ).toEqual([
      ["stale_proof_receipt", 2, "passing_e2e", objective, {}],
      ["missing_proof_receipt", 3, "cases", "do it", { c: 1 }],
      ["failed_proof_receipt", 80, "passing_e2e", objective, {}],
      ["invalid_proof_receipt", 80, "passing_e2e", objective, {}],
    ]);
  });

  test("files unknown gaps and stages under manual review", () => {
    const result = plan([
      {
        id: "REQ-1",
        proofGaps: ["mystery_gap", "other_gap"],
        proofRepairs: [{ gap: "other_gap", stage: "custom" }],
        proofStages: "none",
      },
    ]);
    expect(result.batches).toHaveLength(1);
    expect(result.batches[0]?.phase).toBe("manual_review");
    expect(
      result.batches[0]?.repairs.map((repair) => [
        repair.gap,
        repair.proofStage,
        repair.evidence,
      ]),
    ).toEqual([
      ["mystery_gap", "manual_review", {}],
      ["other_gap", "custom", {}],
    ]);
  });

  test("reads stage evidence only from a stage record", () => {
    const evidenceOf = (proofStages: unknown, proofRepairs: unknown = []) =>
      plan([
        {
          id: "REQ-1",
          proofGaps: ["missing_scenario"],
          proofStages,
          proofRepairs,
        },
      ]).batches[0]?.repairs[0]?.evidence;
    expect(
      evidenceOf(Object.assign(() => undefined, { scenarios: { n: 1 } })),
    ).toEqual({});
    expect(
      evidenceOf({ undefined: { u: 1 } }, [
        { gap: "missing_scenario", stage: "elsewhere" },
      ]),
    ).toEqual({});
    expect(
      evidenceOf({ scenarios: { n: 1 } }, [null, "x", { gap: 4 }]),
    ).toEqual({ n: 1 });
  });

  test("skips odd uncovered case rows", () => {
    const skeletons = plan([
      {
        id: "REQ-1",
        proofGaps: ["uncovered_case"],
        proofStages: {
          cases: {
            uncoveredCases: [
              null,
              {
                caseId: "CASE-1",
                assumption: Object.assign(() => undefined, {
                  value_type: "int",
                }),
              },
              { caseId: "X-CASE-2", assumption: { value_type: "int" } },
            ],
          },
        },
      },
    ]).batches[0]?.repairs[0]?.caseSkeletons;
    expect(skeletons?.map((skeleton) => skeleton.entities[0].id)).toEqual([
      "FACT-CASE-X-CASE-2",
    ]);
  });

  test("treats prototype member names as unknown gaps and stages", () => {
    const result = plan([
      {
        id: "REQ-1",
        proofGaps: ["constructor", "toString"],
        proofRepairs: [{ gap: "toString", stage: "valueOf" }],
        proofStages: { valueOf: { v: 1 } },
      },
    ]);
    expect(
      result.batches.map((batch) => [
        batch.phase,
        batch.repairs.map((repair) => [repair.proofStage, repair.evidence]),
      ]),
    ).toEqual([
      [
        "manual_review",
        [
          ["manual_review", {}],
          ["valueOf", {}],
        ],
      ],
    ]);
  });

  test("keeps refreshable coordinate repairs on the refresh workflow", () => {
    const row = (coordinateRepairs: unknown) => ({
      id: "REQ-1",
      proofGaps: ["missing_symbol_coordinates"],
      proofStages: { sourceCoordinates: { coordinateRepairs } },
    });
    const refresh = plan([row([{ refreshable: true }])]).batches[0];
    expect(refresh?.writePolicy).toBe("refresh_then_sync");
    expect(refresh?.objective).toBe(
      "Refresh symbol extraction and persist exact current source coordinates.",
    );
    expect(refresh?.workflowSteps).toEqual([
      "kibi sync --refresh-symbol-coordinates",
      "kibi sync",
      "kb_check",
      "kb_coverage",
    ]);
    const reviewObjective =
      "Query the affected symbols and repair their sourceFile/title or explicitly author granularity_reason: extractor-miss (or another intentional coarse anchor) through validated upsert before refreshing.";
    for (const coordinateRepairs of [
      undefined,
      "x",
      [],
      [{ refreshable: true }, { refreshable: "yes" }],
      [{ refreshable: true }, "x"],
    ]) {
      const batch = plan([row(coordinateRepairs)]).batches[0];
      expect(batch).toMatchObject({
        order: 120,
        objective: reviewObjective,
        workflowSteps: [
          "kb_query",
          "kb_validate_upsert",
          "kb_upsert",
          "kibi sync --refresh-symbol-coordinates",
          "kibi sync",
          "kb_check",
          "kb_coverage",
        ],
        validationRules: ["symbol-coverage", "symbol-traceability"],
        writePolicy: "review_then_sequential_upsert",
      });
      expect(batch?.repairs[0]?.action).toBe(reviewObjective);
    }
  });

  test("drafts case skeletons for uncovered cases", () => {
    const result = plan([
      {
        id: "REQ-9",
        proofGaps: ["uncovered_case"],
        proofStages: {
          cases: {
            uncoveredCases: [
              "skip",
              {
                caseId: "CASE-max-1",
                constraint: "> 10",
                predicted: "rejection",
                assumption: {
                  value_type: "int",
                  subject_key: "order",
                  property_key: "quantity",
                  operator: "eq",
                  value: 11,
                },
              },
              {
                caseId: "set-2",
                predicted: "success",
                assumption: { value_type: "set", value: ["<pick>"] },
              },
              { caseId: 3, assumption: { value_type: "int" } },
              { caseId: "CASE-4", assumption: "int" },
              { caseId: "CASE-5", assumption: { value_type: "date" } },
              { caseId: "CASE-6", assumption: { value_type: 5 } },
              { caseId: "CASE-7", assumption: { value_type: "toString" } },
            ],
          },
        },
      },
    ]);
    const skeletons = result.batches[0]?.repairs[0]?.caseSkeletons;
    expect(skeletons).toStrictEqual([
      {
        caseId: "CASE-max-1",
        constraint: "> 10",
        placeholder: false,
        entities: [
          {
            type: "fact",
            id: "FACT-CASE-max-1",
            properties: {
              title: "quantity > 10",
              status: "active",
              fact_kind: "property_value",
              subject_key: "order",
              property_key: "quantity",
              operator: "eq",
              value_type: "int",
              value_int: 11,
            },
            relationships: [],
          },
          {
            type: "scenario",
            id: "SCEN-CASE-max-1",
            properties: {
              title: "quantity > 10 is refused",
              status: "draft",
              expects: "rejection",
            },
            relationships: [
              {
                type: "assumes",
                from: "SCEN-CASE-max-1",
                to: "FACT-CASE-max-1",
              },
              { type: "specified_by", from: "REQ-9", to: "SCEN-CASE-max-1" },
            ],
          },
        ],
      },
      {
        caseId: "set-2",
        constraint: "",
        placeholder: true,
        entities: [
          {
            type: "fact",
            id: "FACT-CASE-set-2",
            properties: {
              title: " ",
              status: "active",
              fact_kind: "property_value",
              subject_key: undefined,
              property_key: "",
              operator: undefined,
              value_type: "set",
              value_set: ["<pick>"],
            },
            relationships: [],
          },
          {
            type: "scenario",
            id: "SCEN-CASE-set-2",
            properties: {
              title: "  is accepted",
              status: "draft",
              expects: "success",
            },
            relationships: [
              {
                type: "assumes",
                from: "SCEN-CASE-set-2",
                to: "FACT-CASE-set-2",
              },
              { type: "specified_by", from: "REQ-9", to: "SCEN-CASE-set-2" },
            ],
          },
        ],
      },
    ]);
  });

  test("maps each value type to its fact field", () => {
    const fields = ["int", "number", "set", "string"].map((valueType) => {
      const result = plan([
        {
          id: "REQ-1",
          proofGaps: ["uncovered_case"],
          proofStages: {
            cases: {
              uncoveredCases: [
                {
                  caseId: "CASE-1",
                  constraint: 4,
                  property_key: 1,
                  predicted: "other",
                  assumption: {
                    value_type: valueType,
                    property_key: 2,
                    value: "v",
                  },
                },
              ],
            },
          },
        },
      ]);
      const skeleton = result.batches[0]?.repairs[0]?.caseSkeletons?.[0];
      return [
        skeleton?.constraint,
        skeleton?.entities[1].properties.expects,
        Object.keys(skeleton?.entities[0].properties ?? {}).at(-1),
      ];
    });
    expect(fields).toEqual([
      ["", "success", "value_int"],
      ["", "success", "value_number"],
      ["", "success", "value_set"],
      ["", "success", "value_string"],
    ]);
  });

  test("attaches skeletons only to uncovered cases", () => {
    const result = plan([
      {
        id: "REQ-1",
        proofGaps: ["uncovered_case", "happy_path_only"],
        proofStages: { cases: { uncoveredCases: "none" } },
      },
    ]);
    const repairs = result.batches.flatMap((batch) => batch.repairs);
    expect(repairs.map((repair) => repair.gap)).toEqual([
      "happy_path_only",
      "uncovered_case",
    ]);
    expect(repairs[0]).not.toHaveProperty("caseSkeletons");
    expect(repairs[1]?.caseSkeletons).toEqual([]);
  });

  test("sorts repairs by priority, then gap", () => {
    const result = plan([
      {
        id: "REQ-1",
        proofGaps: [
          "missing_semantic_inventory",
          "incomplete_semantic_inventory",
          "malformed_semantic_inventory",
        ],
        proofRepairs: [{ gap: "missing_semantic_inventory", priority: 1 }],
      },
    ]);
    expect(result.batches[0]?.repairs.map((repair) => repair.gap)).toEqual([
      "missing_semantic_inventory",
      "incomplete_semantic_inventory",
      "malformed_semantic_inventory",
    ]);
  });

  test("scopes the plan to the requested page", () => {
    const row = { id: "REQ-1", proofGaps: ["missing_scenario"] };
    const partial = plan(
      [row],
      { offset: 5, limit: 10, tags: ["b", "a"] },
      { proofMissing: 2, proofUnresolved: 1 },
    );
    expect(partial.scope).toStrictEqual({
      by: "req",
      tags: ["a", "b"],
      offset: 5,
      limit: 10,
      complete: false,
      actionableRequirements: 3,
      returnedActionableRequirements: 1,
      excludedByPagination: 2,
    });
    expect(partial.status).toBe("partial");
    expect(partial.diagnostics).toEqual([
      "Repair plan is partial: 2 actionable requirement(s) were excluded by coverage pagination; rerun with offset 0 and a larger limit.",
    ]);
    expect(
      plan([row], { offset: 1 }, { proofMissing: 1, proofUnresolved: 0 }).scope,
    ).toMatchObject({ complete: false, excludedByPagination: 0 });
    expect(
      plan([row], {}, { proofMissing: 1, proofUnresolved: 0 }).scope,
    ).toMatchObject({ complete: true, actionableRequirements: 1 });
    expect(
      plan([row], {}, { proofMissing: 1, proofUnresolved: 1 }).status,
    ).toBe("partial");
    expect(
      plan([row], {}, { proofMissing: -5, proofUnresolved: 1 }).scope,
    ).toMatchObject({ complete: true, actionableRequirements: 0 });
    expect(
      plan([row], {}, { proofMissing: 4 }).scope.actionableRequirements,
    ).toBe(1);
    expect(
      plan([row], {}, { proofUnresolved: 4 }).scope.actionableRequirements,
    ).toBe(1);
    expect(plan([], {}, { proofMissing: 1, proofUnresolved: 0 }).status).toBe(
      "partial",
    );
  });

  test("hashes the plan without volatile evidence timestamps", () => {
    const row = (checkedAt: number) => ({
      id: "REQ-1",
      proofGaps: ["missing_scenario"],
      proofStages: { scenarios: { checkedAt, ageSeconds: checkedAt, n: 1 } },
    });
    const first = plan([row(1)]);
    expect(plan([row(2)]).planId).toBe(first.planId);
    expect(first.planId).toMatch(/^repair-plan-[0-9a-f]{24}$/);
    expect(buildRepairPlan({ rows: [row(1)] }, {}, "other")?.planId).not.toBe(
      first.planId,
    );
    expect(plan([row(1)], { limit: 5 }).planId).not.toBe(first.planId);
  });
});
