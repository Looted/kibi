// implements REQ-kibi-operation-interface-parity
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as discovery from "../../src/public/operations/discovery-executors.js";
import * as legacy from "../../src/public/operations/legacy-migration-plan.js";
import type { LegacyMigrationPlan } from "../../src/public/operations/legacy-migration-plan.js";
import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
import {
  executeCoverage,
  executeFindGaps,
  executeGraph,
} from "../../src/public/operations/specs/reporting.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

function contextWithPayload(
  payload: Readonly<Record<string, unknown>>,
  overrides: Partial<OperationContext> = {},
): OperationContext {
  const prolog: PrologPort = {
    query: async () => ({
      success: true,
      bindings: { JsonString: JSON.stringify(payload) },
    }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(0),
    prolog,
    git: {
      revParse: async () => "main",
      showToplevel: async () => process.cwd(),
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: true,
        fileCount: 42,
      }),
    },
    ...overrides,
  };
}

const repairCoveragePayload = {
  summary: {
    total: 1,
    fullyCovered: 0,
    proofProven: 0,
    proofMissing: 1,
    proofUnresolved: 0,
  },
  rows: [
    {
      id: "REQ-PLAN-001",
      proofStatus: "missing",
      proofGaps: ["missing_logic_claims", "missing_semantic_inventory"],
      proofRepairs: [
        {
          gap: "missing_semantic_inventory",
          priority: 10,
          stage: "semantic_inventory",
          action: "Analyze prose.",
        },
        {
          gap: "missing_logic_claims",
          priority: 30,
          stage: "logic_grounding",
          action: "Persist claims.",
        },
      ],
    },
  ],
};

describe("reporting remaining requireProlog, validation, and catch branches", () => {
  test("find-gaps rejects an invalid entity type before querying", async () => {
    restores.push(isolateKibiEnv());
    await expect(
      executeFindGaps({ type: "widget" }, contextWithPayload({ rows: [] })),
    ).rejects.toThrow(/Invalid type 'widget'/);
  });

  test("find-gaps wraps a missing Prolog runtime", async () => {
    restores.push(isolateKibiEnv());
    await expect(
      executeFindGaps(
        { type: "req" },
        contextWithPayload({ rows: [] }, { prolog: undefined }),
      ),
    ).rejects.toThrow(
      "Find-gaps execution failed: Reporting operation requires a Prolog runtime",
    );
  });

  test("coverage opt-in migration preview attaches the legacy plan", async () => {
    restores.push(isolateKibiEnv());
    const preview = spyOn(
      legacy,
      "buildLegacyMigrationPlanFromContext",
    ).mockResolvedValue({
      version: "kibi.legacy-migration-plan.v1",
      planId: "legacy-migration-plan-test",
      readOnly: true,
      status: "no_candidates",
    } as LegacyMigrationPlan);
    spies.push(preview);
    const status = spyOn(discovery, "executeStatus").mockRejectedValue(
      new Error("Failed to resolve active branch: detached"),
    );
    spies.push(status);
    const result = await executeCoverage(
      { includeMigrationPreview: true },
      contextWithPayload(repairCoveragePayload),
    );
    expect(preview).toHaveBeenCalled();
    expect(result.structuredContent?.legacyMigrationPlan?.planId).toBe(
      "legacy-migration-plan-test",
    );
  });

  test("coverage wraps a non-branch status failure", async () => {
    restores.push(isolateKibiEnv());
    const status = spyOn(discovery, "executeStatus").mockRejectedValue(
      new Error("disk exploded"),
    );
    spies.push(status);
    await expect(
      executeCoverage({}, contextWithPayload({ summary: {}, rows: [] })),
    ).rejects.toThrow("Coverage execution failed: disk exploded");
  });

  test("graph wraps Prolog failures", async () => {
    restores.push(isolateKibiEnv());
    await expect(
      executeGraph(
        { seedIds: ["REQ-1"] },
        contextWithPayload({ nodes: [] }, { prolog: undefined }),
      ),
    ).rejects.toThrow(
      "Graph execution failed: Reporting operation requires a Prolog runtime",
    );
  });
});
