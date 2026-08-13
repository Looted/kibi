import { describe, expect, test } from "bun:test";

import { executeApplyPlan } from "../../src/operations/planning/apply-plan.js";
import { compilePlanHash } from "../../src/operations/planning/compile-intent.js";
import type { OperationContext } from "../../src/public/operations/runtime-types.js";

const basePlan = {
  version: "kibi.compile-plan.v1" as const,
  status: "ready" as const,
  expected: {
    branch: "develop",
    kbSnapshotId: "stamp:test",
    workspaceSnapshot: "a".repeat(64),
    sourceHashes: {},
  },
  target: {
    mode: "create" as const,
    requirementId: "REQ-apply",
    selectionReason: "test",
  },
  discovery: { candidates: [], abstained: true },
  propositions: [],
  contradictionAnalysis: { outcome: "no_conflict" as const, witnesses: [] },
  proposals: [],
  steps: [
    {
      type: "req",
      id: "REQ-apply",
      properties: { title: "Apply", status: "open" },
      relationships: [],
    },
  ],
  sourceWrites: [],
  diagnostics: [],
};

function context(): OperationContext {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog: {
      query: async () => ({ success: true, bindings: {} }),
      queryStatusJson: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v1",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
  };
}

describe("kb_apply_plan", () => {
  test("rejects a plan that has not been approved as ready", async () => {
    const plan = { ...basePlan, status: "needs_resolution" as const };
    const planWithHash = { ...plan, planHash: compilePlanHash(plan) };
    await expect(
      executeApplyPlan(
        { plan: planWithHash, approvedPlanHash: planWithHash.planHash },
        context(),
      ),
    ).rejects.toThrow("only ready plans");
  });

  test("rejects a stale or tampered approval hash before opening mutation", async () => {
    const plan = { ...basePlan, planHash: compilePlanHash(basePlan) };
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: "0".repeat(64) }, context()),
    ).rejects.toThrow("does not match");
  });
});
