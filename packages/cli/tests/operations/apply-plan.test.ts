import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  type BootstrapAction,
  type BootstrapPlanV1,
  bootstrapEmptyKbSnapshotId,
  bootstrapPlanHash,
} from "../../src/operations/bootstrap/types.js";
import {
  executeApplyPlan,
  orderBootstrapActions,
} from "../../src/operations/planning/apply-plan.js";
import { compilePlanHash } from "../../src/operations/planning/compile-intent.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";

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

function bootstrapPlan(
  actions: readonly BootstrapAction[] = [
    {
      id: "bootstrap-upsert-0001",
      kind: "upsert",
      dependsOn: [],
      payload: {
        type: "adr",
        id: "ADR-bootstrap",
        properties: { title: "Bootstrap", status: "accepted" },
        relationships: [],
        document: { path: "adrs/ADR-bootstrap.md" },
      },
    },
  ],
): BootstrapPlanV1 {
  const body = {
    version: "kibi.bootstrap-plan.v1" as const,
    status: "ready" as const,
    expected: {
      branch: "develop",
      kbSnapshotId: bootstrapEmptyKbSnapshotId({
        branch: "develop",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: {},
      }),
      workspaceSnapshot: "a".repeat(64),
      sourceHashes: {},
    },
    activation: {
      activationState: "root_active_thin" as const,
      activationMode: "attached_thin_bootstrap" as const,
      applyBlocked: false,
      reason: "test",
    },
    declaredContext: {
      sourceOfTruthPaths: [],
      sourceOfTruthNotes: [],
      priorityRoots: [],
      verificationAnchors: [],
    },
    contextQuestions: [],
    confidence: { score: 0.9, level: "high", policy: "full_actions" },
    discoverySummary: {
      activationState: "root_active_thin" as const,
      activationMode: "attached_thin_bootstrap" as const,
      applyBlocked: false,
      reason: "test",
      providersRun: [],
      providerCounts: {},
      detectedLanguages: [],
      detectedTestFrameworks: [],
      excludedRoots: [],
      truncated: false,
      scanWarnings: [],
    },
    candidates: [],
    actions,
    sourceWrites: [],
    suppressedCandidates: [],
    payoffSummary: {},
    diagnostics: [],
  } satisfies Omit<BootstrapPlanV1, "planHash">;
  return { ...body, planHash: bootstrapPlanHash(body) };
}

type BootstrapApplyResult = {
  readonly version: "kibi.plan-apply-result.v1";
  readonly outcome: "applied" | "partially_applied" | "replayed";
  readonly actionResults: readonly Readonly<{ actionId: string }>[];
  readonly recoveryJournalId: string | null;
  readonly status?: "committed_with_repairs";
};

function context(
  workspaceHash = "a".repeat(64),
  query: OperationContext["prolog"] = {
    query: async (goal): Promise<PrologQueryResult> =>
      goal.includes("kb_commit_upsert")
        ? { success: true, bindings: { ChangeKind: "created" } }
        : { success: false, bindings: {} },
    queryStatusJson: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  },
): OperationContext {
  return {
    workspaceRoot: "/tmp/kibi-bootstrap-plan-apply-fixture",
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog: query,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: workspaceHash,
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: "/tmp/kibi-bootstrap-plan-apply-fixture/.kb/branches/develop",
      kind: "exact",
      migrationRequired: false,
    },
  };
}

function filesystemContext(
  workspaceRoot: string,
  workspaceHash = "a".repeat(64),
  failAfter?: number,
  queryOverride?: OperationContext["prolog"],
  sourceFirst = true,
): OperationContext {
  let commits = 0;
  mkdirSync(path.join(workspaceRoot, ".kb"), { recursive: true });
  return {
    ...context(
      workspaceHash,
      queryOverride ?? {
        query: async (goal): Promise<PrologQueryResult> => {
          if (goal.includes("findall("))
            return { success: true, bindings: { Results: "[]" } };
          if (!goal.includes("kb_commit_upsert"))
            return { success: false, bindings: {} };
          commits += 1;
          return failAfter !== undefined && commits > failAfter
            ? { success: false, bindings: {}, error: "fixture failure" }
            : { success: true, bindings: { ChangeKind: "created" } };
        },
        queryStatusJson: async () => ({ success: true, bindings: {} }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      },
    ),
    workspaceRoot,
    fs: nodeFilesystem,
    sourceFirst,
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
  };
}

// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
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

  test("rejects an unapproved BootstrapPlanV1 before mutation", async () => {
    let mutationCalls = 0;
    const plan = bootstrapPlan();
    const unapproved = {
      ...plan,
      status: "needs_context" as const,
      planHash: bootstrapPlanHash({
        ...plan,
        status: "needs_context" as const,
      }),
    };
    const mutationContext = context("a".repeat(64), {
      query: async (goal): Promise<PrologQueryResult> => {
        if (goal.includes("kb_commit_upsert")) mutationCalls += 1;
        return { success: true, bindings: { ChangeKind: "created" } };
      },
      queryStatusJson: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    });
    await expect(
      executeApplyPlan(
        { plan: unapproved, approvedPlanHash: unapproved.planHash },
        mutationContext,
      ),
    ).rejects.toThrow("only ready plans");
    expect(mutationCalls).toBe(0);
  });

  test("rejects a stale or tampered approval hash before opening mutation", async () => {
    const plan = { ...basePlan, planHash: compilePlanHash(basePlan) };
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: "0".repeat(64) }, context()),
    ).rejects.toThrow("does not match");
  });

  test("uses a deterministic hash for an equivalent bootstrap plan", () => {
    const left = bootstrapPlan();
    const right = {
      ...left,
      expected: { ...left.expected },
      actions: [...left.actions],
    };
    expect(bootstrapPlanHash(left)).toBe(bootstrapPlanHash(right));
    expect(left.planHash).toBe(right.planHash);
  });

  test("orders endpoint actions before dependent relationship actions", () => {
    const endpoint: BootstrapAction = {
      id: "bootstrap-upsert-endpoint",
      kind: "upsert",
      dependsOn: [],
      payload: {
        type: "req",
        id: "REQ-endpoint",
        properties: {},
        relationships: [],
      },
    };
    const link: BootstrapAction = {
      id: "bootstrap-upsert-link",
      kind: "upsert",
      dependsOn: [endpoint.id],
      payload: {
        type: "scenario",
        id: "SCEN-link",
        properties: {},
        relationships: [
          { type: "specified_by", from: "REQ-endpoint", to: "SCEN-link" },
        ],
      },
    };
    expect(orderBootstrapActions([link, endpoint]).map(({ id }) => id)).toEqual(
      [endpoint.id, link.id],
    );
  });

  test("rejects dependency cycles before starting bootstrap mutation", async () => {
    const plan = bootstrapPlan([
      {
        id: "bootstrap-upsert-0001",
        kind: "upsert",
        dependsOn: ["bootstrap-upsert-0002"],
        payload: {
          type: "req",
          id: "REQ-a",
          properties: {},
          relationships: [],
        },
      },
      {
        id: "bootstrap-upsert-0002",
        kind: "upsert",
        dependsOn: ["bootstrap-upsert-0001"],
        payload: {
          type: "req",
          id: "REQ-b",
          properties: {},
          relationships: [],
        },
      },
    ]);
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, context()),
    ).rejects.toThrow("dependency cycle");
  });

  test("rejects ready plans without exact snapshot bindings", async () => {
    const unbound = bootstrapPlan();
    const body = {
      ...unbound,
      expected: {
        ...unbound.expected,
        kbSnapshotId: "unknown",
      },
    };
    const plan = { ...body, planHash: bootstrapPlanHash(body) };
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, context()),
    ).rejects.toThrow("exact branch, KB snapshot");
  });

  test("rejects a bootstrap plan when the live workspace snapshot changed", async () => {
    const plan = bootstrapPlan();
    await expect(
      executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        context("c".repeat(64)),
      ),
    ).rejects.toThrow(
      /KB snapshot changed|workspace snapshot changed|branch changed/,
    );
  });

  test("applies the exact returned plan sequentially", async () => {
    const plan = bootstrapPlan([
      {
        id: "bootstrap-upsert-0001",
        kind: "upsert",
        dependsOn: [],
        payload: {
          type: "adr",
          id: "ADR-first",
          properties: { title: "First", status: "accepted" },
          relationships: [],
        },
      },
      {
        id: "bootstrap-upsert-0002",
        kind: "upsert",
        dependsOn: ["bootstrap-upsert-0001"],
        payload: {
          type: "adr",
          id: "ADR-second",
          properties: { title: "Second", status: "accepted" },
          relationships: [],
        },
      },
    ]);
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context(),
    );
    expect(result.structuredContent.version).toBe("kibi.plan-apply-result.v1");
    expect(result.structuredContent.outcome).toBe("applied");
    const applied = result.structuredContent as BootstrapApplyResult;
    expect(applied.actionResults.map(({ actionId }) => actionId)).toEqual([
      "bootstrap-upsert-0001",
      "bootstrap-upsert-0002",
    ]);
  });

  test("returns repair state after a partial failure and resumes only remaining actions", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-bootstrap-recovery-"),
    );
    try {
      const plan = bootstrapPlan([
        {
          id: "bootstrap-upsert-0001",
          kind: "upsert",
          dependsOn: [],
          payload: {
            type: "adr",
            id: "ADR-first",
            properties: { title: "First", status: "accepted" },
            relationships: [],
            document: { path: "adrs/ADR-first.md" },
          },
        },
        {
          id: "bootstrap-upsert-0002",
          kind: "upsert",
          dependsOn: ["bootstrap-upsert-0001"],
          payload: {
            type: "adr",
            id: "ADR-second",
            properties: { title: "Second", status: "accepted" },
            relationships: [],
            document: { path: "adrs/ADR-second.md" },
          },
        },
      ]);
      const partial = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root, "a".repeat(64), 1),
      );
      const partialResult = partial.structuredContent as {
        outcome: string;
        status?: string;
        actionResults: readonly Readonly<Record<string, unknown>>[];
        recoveryJournalId: string | null;
      };
      expect(partialResult.outcome).toBe("partially_applied");
      expect(partialResult.status).toBe("committed_with_repairs");
      expect(partialResult.actionResults).toEqual([
        {
          actionId: "bootstrap-upsert-0001",
          outcome: "applied",
          detail: "Applied sequentially.",
        },
        expect.objectContaining({
          actionId: "bootstrap-upsert-0002",
          outcome: "failed",
        }),
      ]);
      const journalId = partialResult.recoveryJournalId;
      expect(journalId).toMatch(/^bootstrap-[a-f0-9]{16}$/);
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow("journal");
      await expect(
        executeApplyPlan(
          { recoveryJournalId: journalId as string },
          filesystemContext(root),
        ),
      ).resolves.toMatchObject({
        structuredContent: {
          outcome: "applied",
          actionResults: [
            { actionId: "bootstrap-upsert-0001", outcome: "applied" },
            { actionId: "bootstrap-upsert-0002", outcome: "applied" },
          ],
        },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("propagates a committed-with-repairs upsert and recovery skips its committed action", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-bootstrap-committed-repair-"),
    );
    try {
      const plan = bootstrapPlan([
        {
          id: "bootstrap-upsert-0001",
          kind: "upsert",
          dependsOn: [],
          payload: {
            type: "req",
            id: "REQ-committed-repair",
            properties: { title: "Committed repair", status: "open" },
            relationships: [
              {
                type: "verified_by",
                from: "REQ-committed-repair",
                to: "TEST-repair",
              },
            ],
          },
        },
        {
          id: "bootstrap-upsert-0002",
          kind: "upsert",
          dependsOn: ["bootstrap-upsert-0001"],
          payload: {
            type: "adr",
            id: "ADR-after-repair",
            properties: { title: "After repair", status: "accepted" },
            relationships: [],
          },
        },
      ]);
      const query: OperationContext["prolog"] = {
        query: async (goal): Promise<PrologQueryResult> => {
          if (goal.includes("kb_commit_upsert"))
            return { success: true, bindings: { ChangeKind: "created" } };
          if (goal.includes("kb_entity('REQ-committed-repair', _, _)"))
            return { success: false, bindings: {} };
          if (goal.includes("kb_entity('TEST-repair', Type"))
            return { success: true, bindings: { Type: "test" } };
          if (goal.includes("validate_relationship(verified_by, req, test)"))
            return { success: true, bindings: {} };
          if (
            goal.includes(
              "kb_relationship(specified_by, 'REQ-committed-repair'",
            )
          )
            throw new Error("derived coverage lookup failed");
          return { success: true, bindings: {} };
        },
        queryStatusJson: async () => ({ success: true, bindings: {} }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      };
      const partial = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root, "a".repeat(64), undefined, query, false),
      );
      type BootstrapApplyResult = {
        outcome: string;
        status?: string;
        recoveryJournalId: string;
        actionResults: readonly {
          actionId: string;
          outcome: string;
          detail?: string;
        }[];
        nextActions?: readonly Record<string, unknown>[];
        effectFailures?: readonly Record<string, unknown>[];
      };
      const partialResult = partial.structuredContent as BootstrapApplyResult;
      expect(partialResult).toMatchObject({
        outcome: "partially_applied",
        status: "committed_with_repairs",
        actionResults: [
          { actionId: "bootstrap-upsert-0001", outcome: "applied" },
        ],
      });
      const journalId = partialResult.recoveryJournalId;
      expect(journalId).toMatch(/^bootstrap-[a-f0-9]{16}$/);
      expect(partialResult.nextActions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ input: { recoveryJournalId: journalId } }),
        ]),
      );
      expect(partialResult.effectFailures).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            actionId: "bootstrap-upsert-0001",
            errorCode: "POST_COMMIT_EFFECT_FAILED",
          }),
        ]),
      );

      const recoveryQuery: OperationContext["prolog"] = {
        query: async (goal): Promise<PrologQueryResult> =>
          goal.includes("kb_commit_upsert")
            ? { success: true, bindings: { ChangeKind: "created" } }
            : { success: true, bindings: {} },
        queryStatusJson: async () => ({ success: true, bindings: {} }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      };
      const recovered = await executeApplyPlan(
        { recoveryJournalId: journalId },
        filesystemContext(
          root,
          "a".repeat(64),
          undefined,
          recoveryQuery,
          false,
        ),
      );
      const recoveredResult =
        recovered.structuredContent as BootstrapApplyResult;
      expect(recoveredResult.outcome).toBe("applied");
      expect(recoveredResult.actionResults).toEqual([
        {
          actionId: "bootstrap-upsert-0001",
          outcome: "applied",
          detail: "Applied with committed derived effects requiring repair.",
        },
        {
          actionId: "bootstrap-upsert-0002",
          outcome: "applied",
          detail: "Applied sequentially.",
        },
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("refuses changed recovery checkpoints and unsafe recovery IDs", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-bootstrap-recovery-"),
    );
    try {
      const plan = bootstrapPlan([
        {
          id: "bootstrap-upsert-0001",
          kind: "upsert",
          dependsOn: [],
          payload: {
            type: "adr",
            id: "ADR-first",
            properties: { title: "First", status: "accepted" },
            relationships: [],
            document: { path: "adrs/ADR-first.md" },
          },
        },
        {
          id: "bootstrap-upsert-0002",
          kind: "upsert",
          dependsOn: ["bootstrap-upsert-0001"],
          payload: {
            type: "adr",
            id: "ADR-second",
            properties: { title: "Second", status: "accepted" },
            relationships: [],
            document: { path: "adrs/ADR-second.md" },
          },
        },
      ]);
      const partial = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root, "a".repeat(64), 1),
      );
      const journalId = (
        partial.structuredContent as {
          recoveryJournalId: string | null;
        }
      ).recoveryJournalId as string;
      await expect(
        executeApplyPlan(
          { recoveryJournalId: journalId },
          filesystemContext(root, "c".repeat(64)),
        ),
      ).rejects.toThrow("state changed since the last action checkpoint");
      await expect(
        executeApplyPlan(
          { recoveryJournalId: "bootstrap-../../unsafe" },
          filesystemContext(root),
        ),
      ).rejects.toThrow("journal ID is invalid");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
