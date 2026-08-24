import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { buildHeldOutCatalog, buildPublicCatalog } from "../catalog";
import { buildPrivateManifest } from "../fixtures/evaluator";
import {
  fixtureSymbolId,
  taskFinalStateRequests,
} from "../runtime/final-state-requests";
import {
  assertSymbolCoordinatesAbsent,
  assertSymbolCoordinatesPresent,
} from "../runtime/fixture-kb-setup";
import { REQUIRED_KIBI_TOOLS } from "../runtime/mcp-broker";
import { migrationApplyContractViolations } from "../scoring/cell";
import type { CellEvidence } from "../scoring/cell";

const TASK = buildHeldOutCatalog().find(
  (task) =>
    task.taskData.objectiveCode === "generated_only_symbol_coordinate_repair",
);
if (TASK === undefined) {
  throw new Error("coordinate repair held-out task must exist");
}

function manifest() {
  return buildPrivateManifest({
    task: TASK as unknown as Parameters<typeof buildPrivateManifest>[0]["task"],
    publicManifestHash: "a".repeat(64),
    workspaceHash: "b".repeat(64),
  });
}

describe("generated_only_symbol_coordinate_repair held-out task", () => {
  test("reuses the frozen slot without changing corpus invariants", () => {
    expect(TASK.id).toBe(
      "kibi-traceability-symbol-impact-granularity-held-out-3",
    );
    expect(TASK.family).toBe("symbol-impact-granularity");
    expect(TASK.taskData.mutation).toBe("write");
    expect(TASK.taskData.approvalPhase).toBe("post-approval");
    const total = [...buildPublicCatalog(), ...buildHeldOutCatalog()];
    expect(total).toHaveLength(120);
    const family = total.filter(
      (task) => task.family === "symbol-impact-granularity",
    );
    expect(family).toHaveLength(7);
    expect(new Set(family.map((task) => task.split)).size).toBe(3);
  });

  test("private manifest encodes the typed protocol contract", () => {
    const privateManifest = manifest();
    expect(
      privateManifest.orderedMcpPredicates.required.map(({ tool }) => tool),
    ).toEqual([
      "kb_search",
      "kb_query",
      "kb_status",
      "kb_coverage",
      "kb_apply_plan",
      "kb_query",
      "kb_check",
      "kb_status",
      "kb_coverage",
    ]);
    expect(privateManifest.protocolContract).toMatchObject({
      forbiddenTools: expect.arrayContaining(["kb_upsert", "kb_delete"]),
      exactMigrationApply: {
        actionCode: "symbol_refresh_coordinates",
        invocationCommandArgv: ["kibi", "sync", "--refresh-symbol-coordinates"],
      },
    });
    expect(privateManifest.fixtureSetup).toBe(
      "generated_coordinate_divergence",
    );
    expect(privateManifest.finalStateRequests?.map(({ tool }) => tool)).toEqual(
      ["kb_query", "kb_check", "kb_status", "kb_graph", "kb_coverage"],
    );
    const symbolId = privateManifest.finalStateRequests?.[0]?.args.id;
    expect(String(symbolId)).toMatch(/^SYM-FIXTURE-[A-F0-9]{12}$/);
    const seedIds = privateManifest.finalStateRequests?.[3]?.args.seedIds;
    expect(Array.isArray(seedIds) && seedIds[0] === symbolId).toBe(true);
  });

  test("uses the task-derived fixture symbol identity across fixture and final-state boundaries", () => {
    const symbolId = fixtureSymbolId(TASK.id);
    expect(symbolId).toMatch(/^SYM-FIXTURE-[A-F0-9]{12}$/);
    expect(taskFinalStateRequests(TASK.id, true)[0]?.args.id).toBe(symbolId);

    const workspaceSource = readFileSync(
      new URL("../fixtures/workspace.ts", import.meta.url),
      "utf8",
    );
    expect(workspaceSource).toContain("fixtureSymbolId(input.task.id)");
  });

  test("fixture setup asserts the coordinate transition on the active store", () => {
    const setupSource = readFileSync(
      new URL("../runtime/fixture-kb-setup.ts", import.meta.url),
      "utf8",
    );
    expect(setupSource).not.toContain("SYM-SETUP-COORD");
    expect(setupSource).toContain("symbolId: string");
    expect(setupSource).toContain(
      "branchStorePath(workspaceTarget, FIXTURE_BRANCH)",
    );
    expect(setupSource.match(/branchStorePath\(/g)).toHaveLength(1);
    expect(setupSource).not.toContain(
      'join(workspaceTarget, ".kb", "branches")',
    );
    expect(setupSource).toContain("assertSymbolCoordinatesPresent");
    expect(setupSource).toContain("assertSymbolCoordinatesAbsent");
  });

  test("coordinate assertions reject the wrong fixture state", () => {
    const symbolId = fixtureSymbolId(TASK.id);
    const withCoordinates = {
      id: symbolId,
      sourceLine: 1,
      sourceColumn: 1,
      sourceEndLine: 2,
      sourceEndColumn: 2,
    };
    expect(() =>
      assertSymbolCoordinatesPresent(withCoordinates, symbolId),
    ).not.toThrow();
    expect(() =>
      assertSymbolCoordinatesAbsent(withCoordinates, symbolId),
    ).toThrow();
    expect(() =>
      assertSymbolCoordinatesAbsent({ id: symbolId }, symbolId),
    ).not.toThrow();
  });

  test("every required evaluator tool is advertised by the broker", () => {
    const all = [...buildPublicCatalog(), ...buildHeldOutCatalog()];
    const requiredTools = new Set<string>();
    for (const task of all) {
      const candidate = buildPrivateManifest({
        task: task as unknown as Parameters<
          typeof buildPrivateManifest
        >[0]["task"],
        publicManifestHash: "a".repeat(64),
        workspaceHash: "b".repeat(64),
      });
      for (const { tool } of candidate.orderedMcpPredicates.required) {
        requiredTools.add(tool);
      }
    }
    const advertised = new Set<string>(REQUIRED_KIBI_TOOLS);
    for (const tool of requiredTools) {
      expect(advertised.has(tool), `broker must advertise ${tool}`).toBe(true);
    }
    expect(advertised.has("kb_delete")).toBe(false);
  });
});

function evidenceFrom(
  rawCalls: CellEvidence["broker"]["rawCalls"],
): CellEvidence {
  return {
    finalState: { complete: true, integrityValid: true, claims: [] },
    broker: {
      complete: true,
      integrityValid: true,
      claims: [],
      orderedCalls:
        rawCalls?.map((call, index) => ({
          tool: call.tool,
          predicate: `sequence=${index + 1}`,
        })) ?? [],
      rawCalls,
    },
    diagnostic: { complete: true, integrityValid: true, claims: [] },
    codex: { complete: true, integrityValid: true, claims: [] },
    isolation: { observedSentinels: [], violations: [] },
  };
}

const PLAN = {
  version: "kibi.migration-plan.v2",
  planHash: "c".repeat(64),
  actions: [
    {
      id: "symbol-symbol_refresh_coordinates-SYM-X",
      code: "symbol_refresh_coordinates",
      state: "ready",
      safety: "automatic",
      autoApplicable: true,
      invocation: {
        kind: "cli",
        command_argv: ["kibi", "sync", "--refresh-symbol-coordinates"],
      },
    },
  ],
};

describe("migration apply contract verifier", () => {
  const contract = {
    requiredCalls: [{ tool: "kb_apply_plan" }],
    forbiddenTools: ["kb_upsert", "kb_delete"],
    exactMigrationApply: {
      actionCode: "symbol_refresh_coordinates",
      invocationCommandArgv: ["kibi", "sync", "--refresh-symbol-coordinates"],
    },
  };

  function coverageCall() {
    return {
      tool: "kb_coverage",
      args: {},
      resultOk: true,
      result: {
        structuredContent: {
          kibiProtocol: 1,
          data: { migrationPlan: PLAN },
        },
      },
    };
  }

  function applyCall(overrides: Record<string, unknown> = {}) {
    return {
      tool: "kb_apply_plan",
      args: {
        approvedPlanHash: PLAN.planHash,
        approvedActionIds: [PLAN.actions[0]?.id],
        plan: PLAN,
        ...overrides,
      },
      resultOk: true,
      result: {
        structuredContent: {
          kibiProtocol: 1,
          data: { outcome: "applied", effects: [] },
        },
      },
    };
  }

  test("accepts the exact single-action application", () => {
    const violations = migrationApplyContractViolations(
      contract,
      evidenceFrom([coverageCall(), applyCall()]),
    );
    expect(violations).toEqual([]);
  });

  test("rejects wrong hash, extra actions, stale plans, and failures", () => {
    expect(
      migrationApplyContractViolations(
        contract,
        evidenceFrom([
          coverageCall(),
          applyCall({ approvedPlanHash: "d".repeat(64) }),
        ]),
      ),
    ).toContain("approvedPlanHash must equal the coverage planHash");

    expect(
      migrationApplyContractViolations(
        contract,
        evidenceFrom([
          coverageCall(),
          applyCall({ approvedActionIds: ["extra", PLAN.actions[0]?.id] }),
        ]),
      ),
    ).toContain("approvedActionIds must equal exactly the selected action id");

    expect(
      migrationApplyContractViolations(
        contract,
        evidenceFrom([
          coverageCall(),
          applyCall({ plan: { ...PLAN, planHash: "e".repeat(64) } }),
        ]),
      ),
    ).toContain("applied plan must be unchanged from the coverage preview");

    expect(
      migrationApplyContractViolations(
        contract,
        evidenceFrom([coverageCall(), { ...applyCall(), resultOk: false }]),
      ),
    ).toContain("kb_apply_plan response was an error");

    expect(
      migrationApplyContractViolations(
        contract,
        evidenceFrom([coverageCall(), applyCall(), applyCall()]),
      ),
    ).toContain("kb_apply_plan attempted more than once");

    expect(
      migrationApplyContractViolations(contract, evidenceFrom([applyCall()])),
    ).toContain("no kb_coverage before kb_apply_plan");

    expect(
      migrationApplyContractViolations(
        contract,
        evidenceFrom([
          coverageCall(),
          applyCall(),
          { tool: "kb_upsert", args: {}, resultOk: false },
        ]),
      ),
    ).toContain("forbidden tool attempted: kb_upsert");

    expect(
      migrationApplyContractViolations(contract, evidenceFrom([])),
    ).toEqual(["no kb_apply_plan attempt"]);
  });
});
