import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
// implements REQ-KIBI-BOOTSTRAP-PLAN, REQ-014
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import * as branchModule from "../../src/commands/branch.js";
import * as migrateModule from "../../src/commands/migrate.js";
import * as syncModule from "../../src/commands/sync.js";
import * as deleteModule from "../../src/operations/mutation/delete.js";
import * as upsertModule from "../../src/operations/mutation/upsert.js";
import * as checkExecutor from "../../src/public/operations/check-executor.js";
import * as discoveryExecutors from "../../src/public/operations/discovery-executors.js";
import type { StatusPayload } from "../../src/public/operations/discovery-executors.js";
import {
  type MigrationAction,
  buildMigrationPlan,
} from "../../src/public/operations/migration-plan.js";
import * as reporting from "../../src/public/operations/specs/reporting.js";
import { asApply } from "../helpers/coverage-casts.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

import {
  type BootstrapAction,
  type BootstrapPlanV1,
  bootstrapEmptyKbSnapshotId,
  bootstrapPlanHash,
} from "../../src/operations/bootstrap/types.js";
import {
  assertBootstrapRecoveryDependencies,
  assertSourceWriteStaysInWorkspace,
  executeApplyPlan,
  orderBootstrapActions,
} from "../../src/operations/planning/apply-plan.js";
import {
  type CompilePlanV1,
  compilePlanHash,
} from "../../src/operations/planning/compile-intent.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { isWhatIfGoal, whatIfResult } from "../helpers/what-if.js";

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
    context:
      "The fixture requester gave this reason so the plan carries context for the test.",
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
      isWhatIfGoal(goal)
        ? whatIfResult()
        : goal.includes("kb_commit_upsert")
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
          if (isWhatIfGoal(goal)) return whatIfResult();
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
        if (isWhatIfGoal(goal)) return whatIfResult();
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
      executeApplyPlan({ plan, approvedPlanHash: "0a".repeat(32) }, context()),
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

  test("applies an approved bootstrap plan while the recovery lock is held", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-bootstrap-lock-"));
    try {
      const plan = bootstrapPlan([
        {
          id: "bootstrap-upsert-lock",
          kind: "upsert",
          dependsOn: [],
          payload: {
            type: "adr",
            id: "ADR-lock",
            properties: { title: "Lock", status: "accepted" },
            relationships: [],
          },
        },
      ]);
      let lockObserved = false;
      const result = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root, "a".repeat(64), undefined, {
          query: async (goal): Promise<PrologQueryResult> => {
            if (isWhatIfGoal(goal)) return whatIfResult();
            if (goal.includes("findall("))
              return { success: true, bindings: { Results: "[]" } };
            if (goal.includes("kb_commit_upsert")) {
              lockObserved = existsSync(
                path.join(root, ".kb", "recovery", "source-authoring.lock"),
              );
              return { success: true, bindings: { ChangeKind: "created" } };
            }
            return { success: false, bindings: {} };
          },
          queryStatusJson: async () => ({ success: true, bindings: {} }),
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        }),
      );

      expect(result.structuredContent.outcome).toBe("applied");
      expect(lockObserved).toBe(true);
      expect(
        existsSync(path.join(root, ".kb", "recovery", "source-authoring.lock")),
      ).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
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
          if (isWhatIfGoal(goal)) return whatIfResult();
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
          isWhatIfGoal(goal)
            ? whatIfResult()
            : goal.includes("kb_commit_upsert")
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

// executable_for TEST-KIBI-BOOTSTRAP-PLAN-APPLY
describe("bootstrap deterministic write failures", () => {
  test("an escaping authored path is rejected before a valid earlier action can commit", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-bootstrap-path-"));
    try {
      const action = (id: string, document?: { path: string }) => ({
        id,
        kind: "upsert" as const,
        dependsOn: [],
        payload: {
          type: "fact",
          id: `FACT-${id}`,
          properties: { title: id, status: "active", fact_kind: "observation" },
          ...(document ? { document } : {}),
        },
      });
      const plan = bootstrapPlan([
        action("valid"),
        { ...action("escape", { path: "../escape.md" }), dependsOn: ["valid"] },
      ]);
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root),
        ),
      ).rejects.toMatchObject({
        code: "BOOTSTRAP_PLAN_INVALID",
        retryable: false,
      });
      expect(existsSync(path.join(root, ".kb/recovery"))).toBe(false);
      expect(existsSync(path.join(root, ".kb/facts/FACT-valid.md"))).toBe(
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  test("a correctly hashed invalid payload is rejected before any journal or source write", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-bootstrap-preflight-"),
    );
    try {
      const plan = bootstrapPlan([
        {
          id: "invalid",
          kind: "upsert",
          dependsOn: [],
          payload: {
            type: "fact",
            id: "FACT-invalid",
            properties: {
              title: "Invalid",
              fact_kind: "property_value",
              subject_key: "exports",
              property_key: "headers",
              polarity: "require",
            },
          },
        },
      ]);
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root),
        ),
      ).rejects.toMatchObject({
        code: "BOOTSTRAP_PLAN_INVALID",
        retryable: false,
      });
      expect(existsSync(path.join(root, ".kb/recovery"))).toBe(false);
      expect(existsSync(path.join(root, ".kb/facts/FACT-invalid.md"))).toBe(
        false,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  test("a deterministic failure after a commit is terminal, reports committed actions, and permits a corrected plan", async () => {
    const root = mkdtempSync(
      path.join(os.tmpdir(), "kibi-bootstrap-terminal-"),
    );
    try {
      const actions = [1, 2].map((index) => ({
        id: `bootstrap-upsert-000${index}`,
        kind: "upsert" as const,
        dependsOn: [],
        payload: {
          type: "adr",
          id: `ADR-terminal-${index}`,
          properties: { title: `Terminal ${index}`, status: "accepted" },
          relationships: [],
          document: { path: `adrs/ADR-terminal-${index}.md` },
        },
      }));
      const plan = bootstrapPlan(actions);
      let commits = 0;
      const baseContext = filesystemContext(root);
      const prolog = {
        ...baseContext.prolog!,
        query: async (goal: string): Promise<PrologQueryResult> => {
          if (goal.includes("kb_commit_upsert") && ++commits === 2)
            throw new Error(
              "Entity validation failed: injected deterministic failure",
            );
          return baseContext.prolog!.query(goal);
        },
      };
      const result = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        { ...baseContext, prolog },
      );
      const data = result.structuredContent as unknown as {
        outcome: string;
        actionResults: { outcome: string }[];
        recoveryJournalId: string;
        nextActions: { operation: string }[];
      };
      expect(data.outcome).toBe("rejected");
      expect(
        data.actionResults.filter((row) => row.outcome === "applied"),
      ).toHaveLength(1);
      expect(data.nextActions[0]?.operation).toBe("kb_plan_bootstrap");
      expect(
        JSON.parse(
          readFileSync(
            path.join(root, ".kb/recovery", `${data.recoveryJournalId}.json`),
            "utf8",
          ),
        ).state,
      ).toBe("rejected");
      await expect(
        executeApplyPlan(
          { recoveryJournalId: data.recoveryJournalId },
          filesystemContext(root),
        ),
      ).rejects.toMatchObject({ code: "BOOTSTRAP_PLAN_REJECTED" });
      const corrected = bootstrapPlan(actions.slice(1));
      expect(
        (
          await executeApplyPlan(
            { plan: corrected, approvedPlanHash: corrected.planHash },
            filesystemContext(root),
          )
        ).structuredContent.outcome,
      ).toBe("applied");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// implements REQ-KIBI-BOOTSTRAP-PLAN, REQ-014
describe("apply plan source recovery and migration", () => {
  function sha(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  const tempDirs: string[] = [];
  const spies: Array<{ mockRestore: () => void }> = [];
  let restoreEnv: (() => void) | undefined;
  const previousExitCode = process.exitCode;

  function track<T extends { mockRestore: () => void }>(spy: T): T {
    spies.push(spy);
    return spy;
  }

  function restoreLastSpy(): void {
    spies.pop()?.mockRestore();
  }

  function makeTempDir(): string {
    const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-apply-remaining-"));
    tempDirs.push(dir);
    mkdirSync(path.join(dir, ".kb"), { recursive: true });
    return dir;
  }

  function restoreExitCode(): void {
    if (typeof previousExitCode === "number") {
      process.exitCode = previousExitCode;
    } else if (typeof process.exitCode === "number") {
      process.exitCode = 0;
    }
  }

  beforeEach(() => {
    restoreEnv = isolateKibiEnv();
  });

  afterEach(() => {
    while (spies.length > 0) {
      spies.pop()?.mockRestore();
    }
    restoreEnv?.();
    restoreEnv = undefined;
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
    restoreExitCode();
  });

  function compileBody(
    overrides: Partial<CompilePlanV1> = {},
  ): Omit<CompilePlanV1, "planHash"> {
    return {
      version: "kibi.compile-plan.v1",
      status: "ready",
      expected: {
        branch: "develop",
        kbSnapshotId: "missing",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: {},
      },
      target: {
        mode: "create",
        context:
          "The fixture requester gave this reason so the plan carries context for the test.",
        requirementId: "REQ-apply",
        selectionReason: "test",
      },
      discovery: { candidates: [], abstained: true },
      propositions: [],
      contradictionAnalysis: { outcome: "no_conflict", witnesses: [] },
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
      ...overrides,
    };
  }

  function compilePlan(overrides: Partial<CompilePlanV1> = {}): CompilePlanV1 {
    const body = compileBody(overrides);
    return { ...body, planHash: compilePlanHash(body) };
  }

  function stubProlog(): PrologPort {
    return {
      query: async (goal): Promise<PrologQueryResult> =>
        isWhatIfGoal(goal)
          ? whatIfResult()
          : goal.includes("kb_commit_upsert")
            ? { success: true, bindings: { ChangeKind: "created" } }
            : { success: true, bindings: { Results: "[]" } },
      queryStatusJson: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    };
  }

  /** An entity-deletion plan: it still publishes through the legacy journal. */
  function deletionPlan(
    sourceWrites: readonly {
      path: string;
      mode: "write" | "delete";
      beforeHash: string | null;
      afterHash: string | null;
      body?: string;
    }[],
  ) {
    const body = {
      version: "kibi.entity-deletion-plan.v1" as const,
      entityIds: ["FACT-RECOVER"],
      sourceHashes: {},
      sourceWrites,
      supersessionRequired: false,
    };
    return { ...body, planHash: sha(JSON.stringify(body)) };
  }

  function filesystemContext(
    workspaceRoot: string,
    extra?: {
      workspaceHash?: string;
      query?: OperationContext["prolog"];
      omitProlog?: boolean;
      omitGit?: boolean;
      fs?: OperationContext["fs"];
      git?: OperationContext["git"];
      ensureProlog?: OperationContext["ensureProlog"];
    },
  ): OperationContext {
    return {
      workspaceRoot,
      signal: new AbortController().signal,
      clock: () => new Date("2026-09-05T00:00:00Z"),
      ...(extra?.omitProlog ? {} : { prolog: extra?.query ?? stubProlog() }),
      ...(extra?.ensureProlog ? { ensureProlog: extra.ensureProlog } : {}),
      fs: extra?.fs ?? nodeFilesystem,
      ...(extra?.omitGit
        ? {}
        : {
            git: extra?.git ?? {
              workspaceSnapshot: async () => ({
                version: "kibi.workspace-snapshot.v2" as const,
                hash: extra?.workspaceHash ?? "a".repeat(64),
                dirty: false,
                fileCount: 1,
              }),
            },
          }),
      branchAttachment: {
        gitBranch: "develop",
        kbBranch: "develop",
        storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
        kind: "exact",
        migrationRequired: false,
      },
    };
  }

  function automaticAction(
    overrides: Partial<MigrationAction> = {},
  ): MigrationAction {
    return {
      id: "mig-unknown-0001",
      code: "not_a_real_action",
      category: "quality",
      state: "ready",
      safety: "automatic",
      invocation: { kind: "review", instruction: "noop" },
      affectedEntityIds: [],
      affectedFiles: [],
      dependsOn: [],
      preconditions: [],
      postconditions: [],
      evidence: {},
      autoApplicable: true,
      dispositionRequired: false,
      allowedDispositions: ["fixed", "accepted", "deferred"],
      ...overrides,
    };
  }

  function statusPayload(
    overrides: Partial<StatusPayload> = {},
  ): StatusPayload {
    return {
      branch: "develop",
      snapshotId: "missing",
      syncedAt: null,
      dirty: false,
      syncState: "unknown",
      ...overrides,
    };
  }

  function statusResult(overrides: Partial<StatusPayload> = {}) {
    return {
      content: [{ type: "text" as const, text: "status" }],
      structuredContent: statusPayload(overrides),
    };
  }

  async function thinBootstrap(overrides: Record<string, unknown> = {}) {
    const workspaceSnapshot = "a".repeat(64);
    const sourceHashes = {};
    const kbSnapshotId = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot,
      sourceHashes,
    });
    const body = {
      version: "kibi.bootstrap-plan.v1" as const,
      status: "ready" as const,
      expected: {
        branch: "develop",
        kbSnapshotId,
        workspaceSnapshot,
        sourceHashes,
      },
      activation: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: false,
        reason: "thin",
      },
      declaredContext: {
        sourceOfTruthPaths: [],
        sourceOfTruthNotes: [],
        priorityRoots: [],
        verificationAnchors: [],
      },
      contextQuestions: [],
      confidence: {
        score: 0.9,
        level: "high" as const,
        policy: "full_actions" as const,
      },
      discoverySummary: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: false,
        reason: "thin",
        providersRun: [],
        providerCounts: {},
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: [],
        truncated: false,
        scanWarnings: [],
      },
      candidates: [],
      actions: [
        {
          id: "bootstrap-upsert-0001",
          kind: "upsert" as const,
          dependsOn: [],
          payload: {
            type: "req",
            id: "REQ-bootstrap-remaining",
            properties: { title: "Bootstrap remaining", status: "open" },
            relationships: [],
          },
        },
        {
          id: "bootstrap-upsert-0002",
          kind: "upsert" as const,
          dependsOn: ["bootstrap-upsert-0001"],
          payload: {
            type: "req",
            id: "REQ-bootstrap-remaining-2",
            properties: { title: "Bootstrap remaining 2", status: "open" },
            relationships: [],
          },
        },
      ],
      sourceWrites: [],
      suppressedCandidates: [],
      payoffSummary: {},
      diagnostics: [],
      ...overrides,
    };
    return { ...body, planHash: bootstrapPlanHash(body) };
  }

  function plantJournal(
    root: string,
    journalId: string,
    payload: Record<string, unknown>,
  ): string {
    const recoveryDir = path.join(root, ".kb", "recovery");
    mkdirSync(recoveryDir, { recursive: true });
    const journalPath = path.join(recoveryDir, `${journalId}.json`);
    writeFileSync(journalPath, `${JSON.stringify(payload, null, 2)}\n`);
    return journalPath;
  }

  describe("validateMigrationPlanShape remaining errors", () => {
    test("rejects a non-SHA-256 approvedPlanHash", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const plan = buildMigrationPlan({ actions: [automaticAction()] });
      const planAction = plan.actions[0];
      expect(planAction).toBeDefined();
      if (!planAction) throw new Error("expected a migration action");
      await expect(
        executeApplyPlan(
          {
            plan,
            approvedPlanHash: "not-a-sha256",
            approvedActionIds: [planAction.id],
          },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/approvedPlanHash must be a SHA-256 hash/);
    });

    test("rejects a planHash that does not match the canonical body", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const ready = buildMigrationPlan({ actions: [automaticAction()] });
      const readyAction = ready.actions[0];
      expect(readyAction).toBeDefined();
      if (!readyAction) throw new Error("expected a ready migration action");
      const tampered = { ...ready, planHash: "a".repeat(64) };
      await expect(
        executeApplyPlan(
          {
            plan: tampered,
            approvedPlanHash: tampered.planHash,
            approvedActionIds: [readyAction.id],
          },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/planHash does not match the canonical plan body/);
    });

    test("rejects a non-array approvedActionIds list", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const plan = buildMigrationPlan({ actions: [automaticAction()] });
      await expect(
        executeApplyPlan(
          {
            plan,
            approvedPlanHash: plan.planHash,
            approvedActionIds: "mig-unknown-0001" as unknown as string[],
          },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/approvedActionIds must contain at least one action/);
    });
  });

  describe("source journal recovery and write rollback", () => {
    test("ignores a corrupt journal and reapplies when after-images drifted", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const before = "before body\n";
      const after = "after body\n";
      const writes = [
        {
          path: "docs/drifted.md",
          mode: "write" as const,
          beforeHash: sha(before),
          afterHash: sha(after),
          body: after,
        },
      ];
      const plan = compilePlan({ sourceWrites: writes });
      const journalId = `source-writes-${plan.planHash.slice(0, 16)}`;
      mkdirSync(path.join(root, "docs"), { recursive: true });
      writeFileSync(path.join(root, "docs", "drifted.md"), before);
      plantJournal(root, journalId, {
        version: 1,
        planHash: plan.planHash,
        state: "committed",
        entries: [
          {
            path: "docs/drifted.md",
            mode: "write",
            beforeHash: sha(before),
            afterHash: sha(after),
            beforeExisted: true,
            beforeStage: path.join(
              root,
              ".kb",
              "recovery",
              `${journalId}-0.before`,
            ),
            afterStage: path.join(
              root,
              ".kb",
              "recovery",
              `${journalId}-0.after`,
            ),
          },
        ],
      });
      const result = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root),
      );
      expect(result.structuredContent.outcome).toBe("applied");
      expect(asApply(result.structuredContent).changedPaths).toEqual([
        "docs/drifted.md",
        ".kb/requirements/REQ-apply.md",
      ]);
    });

    test("treats a missing after-image on a committed journal as incomplete", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const after = "recreate me\n";
      const writes = [
        {
          path: "docs/missing-after.md",
          mode: "write" as const,
          beforeHash: null,
          afterHash: sha(after),
          body: after,
        },
      ];
      const plan = compilePlan({ sourceWrites: writes });
      const journalId = `source-writes-${plan.planHash.slice(0, 16)}`;
      plantJournal(root, journalId, {
        version: 1,
        planHash: plan.planHash,
        state: "sources_committed",
        entries: [
          {
            path: "docs/missing-after.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha(after),
            beforeExisted: false,
            beforeStage: path.join(
              root,
              ".kb",
              "recovery",
              `${journalId}-0.before`,
            ),
            afterStage: path.join(
              root,
              ".kb",
              "recovery",
              `${journalId}-0.after`,
            ),
          },
        ],
      });
      const result = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root),
      );
      expect(asApply(result.structuredContent).changedPaths).toEqual([
        "docs/missing-after.md",
        ".kb/requirements/REQ-apply.md",
      ]);
    });

    test("ignores unreadable and rolled-back journals, then applies", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const body = "fresh write\n";
      const plan = compilePlan({
        sourceWrites: [
          {
            path: "docs/fresh.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha(body),
            body,
          },
        ],
      });
      const journalId = `source-writes-${plan.planHash.slice(0, 16)}`;
      mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
      writeFileSync(
        path.join(root, ".kb", "recovery", `${journalId}.json`),
        "not-json{{",
      );
      const recovered = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root),
      );
      expect(asApply(recovered.structuredContent).changedPaths).toEqual([
        "docs/fresh.md",
        ".kb/requirements/REQ-apply.md",
      ]);

      const rolled = compilePlan({
        steps: [
          {
            type: "req",
            id: "REQ-rolled",
            properties: { title: "Rolled", status: "open" },
            relationships: [],
          },
        ],
        sourceWrites: [
          {
            path: "docs/rolled.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha("rolled\n"),
            body: "rolled\n",
          },
        ],
      });
      const rolledId = `source-writes-${rolled.planHash.slice(0, 16)}`;
      plantJournal(root, rolledId, {
        version: 1,
        planHash: rolled.planHash,
        state: "rolled_back",
        entries: [
          {
            path: "docs/rolled.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha("rolled\n"),
            beforeExisted: false,
            beforeStage: "x",
            afterStage: "y",
          },
        ],
      });
      const applied = await executeApplyPlan(
        { plan: rolled, approvedPlanHash: rolled.planHash },
        filesystemContext(root),
      );
      expect(asApply(applied.structuredContent).changedPaths).toEqual([
        "docs/rolled.md",
        ".kb/requirements/REQ-rolled.md",
      ]);
    });

    test("rejects absolute paths, symlink escapes, and beforeHash mismatches", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const body = "payload\n";
      const absolute = compilePlan({
        sourceWrites: [
          {
            path: "/tmp/absolute.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha(body),
            body,
          },
        ],
      });
      await expect(
        executeApplyPlan(
          { plan: absolute, approvedPlanHash: absolute.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/workspace-relative/);

      mkdirSync(path.join(root, "docs"), { recursive: true });
      const outside = makeTempDir();
      writeFileSync(path.join(outside, "secret.md"), "secret\n");
      symlinkSync(outside, path.join(root, "docs", "escaped"));
      const linked = compilePlan({
        sourceWrites: [
          {
            path: "docs/escaped/secret.md",
            mode: "write",
            beforeHash: sha("secret\n"),
            afterHash: sha(body),
            body,
          },
        ],
      });
      await expect(
        executeApplyPlan(
          { plan: linked, approvedPlanHash: linked.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/symlink outside the workspace/);

      writeFileSync(path.join(root, "docs", "stale.md"), "current\n");
      const stale = compilePlan({
        sourceWrites: [
          {
            path: "docs/stale.md",
            mode: "write",
            beforeHash: sha("expected\n"),
            afterHash: sha(body),
            body,
          },
        ],
      });
      await expect(
        executeApplyPlan(
          { plan: stale, approvedPlanHash: stale.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/source hash changed/);

      const missingBody = compilePlan({
        sourceWrites: [
          {
            path: "docs/nobody.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha(body),
          },
        ],
      });
      await expect(
        executeApplyPlan(
          { plan: missingBody, approvedPlanHash: missingBody.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/afterHash does not match staged body/);
    });

    test("rolls back originals when publish fails and keeps the original error", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const existing = "keep me\n";
      mkdirSync(path.join(root, "docs"), { recursive: true });
      writeFileSync(path.join(root, "docs", "keep.md"), existing);
      const plan = compilePlan({
        sourceWrites: [
          {
            path: "docs/keep.md",
            mode: "write",
            beforeHash: sha(existing),
            afterHash: sha("new\n"),
            body: "new\n",
          },
        ],
      });
      const fsPort = {
        ...nodeFilesystem,
        rename: async () => {
          throw new Error("rename exploded");
        },
      };
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root, { fs: fsPort }),
        ),
      ).rejects.toThrow(/rename exploded/);
    });

    test("unlinks a newly created file and swallows rollback journal write failures", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const body = "new file\n";
      const plan = compilePlan({
        sourceWrites: [
          {
            path: "docs/created.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha(body),
            body,
          },
        ],
      });
      let failJournal = false;
      const fsPort = {
        ...nodeFilesystem,
        writeFile: async (filePath: string, data: string) => {
          if (filePath.includes(".kibi-stage-")) {
            failJournal = true;
            throw new Error("stage write failed");
          }
          if (
            failJournal &&
            filePath.includes(`${path.sep}.kb${path.sep}recovery${path.sep}`) &&
            filePath.endsWith(".json")
          ) {
            throw new Error("journal write failed");
          }
          return nodeFilesystem.writeFile(filePath, data);
        },
      };
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root, { fs: fsPort }),
        ),
      ).rejects.toThrow(/stage write failed/);
    });

    test("swallows markSourceJournal read failures after a successful compile apply", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const body = "marked\n";
      const plan = compilePlan({
        sourceWrites: [
          {
            path: "docs/marked.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha(body),
            body,
          },
        ],
      });
      const fsPort = {
        ...nodeFilesystem,
        readFile: async (filePath: string) => {
          if (
            filePath.includes(`${path.sep}.kb${path.sep}recovery${path.sep}`) &&
            filePath.endsWith(".json")
          ) {
            throw new Error("journal unreadable");
          }
          return nodeFilesystem.readFile(filePath);
        },
      };
      const result = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root, { fs: fsPort }),
      );
      expect(result.structuredContent.outcome).toBe("applied");
    });

    test("replays a compiled_published journal and counts missing entityCounts as zero", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const body = "replayed\n";
      const planHash = "d".repeat(64);
      const journalId = `source-writes-${planHash.slice(0, 16)}`;
      mkdirSync(path.join(root, "docs"), { recursive: true });
      writeFileSync(path.join(root, "docs", "replayed.md"), body);
      const afterStage = path.join(
        root,
        ".kb",
        "recovery",
        `${journalId}-0.after`,
      );
      mkdirSync(path.dirname(afterStage), { recursive: true });
      writeFileSync(afterStage, body);
      plantJournal(root, journalId, {
        version: 1,
        planHash,
        state: "compiled_published",
        entries: [
          {
            path: "docs/replayed.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha(body),
            beforeExisted: false,
            beforeStage: path.join(
              root,
              ".kb",
              "recovery",
              `${journalId}-0.before`,
            ),
            afterStage,
          },
        ],
      });
      track(
        spyOn(syncModule, "syncCommand").mockResolvedValue({
          branch: "develop",
          timestamp: "2026-09-05T00:00:00Z",
          success: true,
          published: true,
          failures: [],
        } as never),
      );
      const result = await executeApplyPlan(
        { recoveryJournalId: journalId },
        filesystemContext(root),
      );
      expect(result.structuredContent.outcome).toBe("replayed");
      expect(asApply(result.structuredContent).changedEntities).toBe(0);
      expect(asApply(result.structuredContent).changedRelationships).toBe(0);
    });
  });

  describe("bootstrap apply checkpoints and recovery flatten", () => {
    test("rejects a missing status payload and live binding drift", async () => {
      // implements REQ-KIBI-BOOTSTRAP-PLAN
      const root = makeTempDir();
      const plan = await thinBootstrap();
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue({
          content: [{ type: "text", text: "empty" }],
        }),
      );
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/status returned no payload/);

      restoreLastSpy();
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult({ branch: "other" }),
        ),
      );
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/branch changed since planning/);

      restoreLastSpy();
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult({ snapshotId: "b".repeat(64) }),
        ),
      );
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/KB snapshot changed since planning/);

      const bound = "c".repeat(64);
      const driftedWorkspace = await thinBootstrap({
        expected: {
          branch: "develop",
          kbSnapshotId: bound,
          workspaceSnapshot: "a".repeat(64),
          sourceHashes: {},
        },
      });
      restoreLastSpy();
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult({ snapshotId: bound }),
        ),
      );
      await expect(
        executeApplyPlan(
          {
            plan: driftedWorkspace,
            approvedPlanHash: driftedWorkspace.planHash,
          },
          filesystemContext(root, { workspaceHash: "f".repeat(64) }),
        ),
      ).rejects.toThrow(/workspace snapshot changed since planning/);

      await expect(
        executeApplyPlan(
          {
            plan: driftedWorkspace,
            approvedPlanHash: driftedWorkspace.planHash,
          },
          filesystemContext(root, { omitGit: true }),
        ),
      ).rejects.toThrow(/workspace snapshot changed since planning/);
    });

    test("filters non-record repair payloads and stringifies non-Error action failures", async () => {
      // implements REQ-KIBI-BOOTSTRAP-PLAN
      const root = makeTempDir();
      const plan = await thinBootstrap();
      track(
        spyOn(upsertModule, "executeUpsert").mockResolvedValueOnce({
          content: [{ type: "text", text: "repair" }],
          structuredContent: {
            created: 1,
            updated: 0,
            relationships_created: 2,
            status: "committed_with_repairs",
            effectFailures: [
              null as never,
              "bare" as never,
              [1, 2] as never,
              { kind: "derived-effect", errorCode: "X" },
            ],
            nextActions: [
              null as never,
              "bare" as never,
              [1] as never,
              { operation: "kb_check", reason: "inspect", required: true },
            ],
          } as never,
        }),
      );
      const repaired = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root),
      );
      expect(repaired.structuredContent.outcome).toBe("partially_applied");
      expect(asApply(repaired.structuredContent).status).toBe(
        "committed_with_repairs",
      );
      expect(asApply(repaired.structuredContent).effectFailures).toEqual([
        expect.objectContaining({
          kind: "derived-effect",
          actionId: "bootstrap-upsert-0001",
        }),
      ]);

      const failing = await thinBootstrap({
        actions: [
          {
            id: "bootstrap-upsert-0001",
            kind: "upsert",
            dependsOn: [],
            payload: {
              type: "req",
              id: "REQ-fail",
              properties: { title: "Failure fixture", status: "open" },
              relationships: [],
            },
          },
        ],
      });
      restoreLastSpy();
      track(
        spyOn(upsertModule, "executeUpsert").mockRejectedValue("bare failure"),
      );
      const failed = await executeApplyPlan(
        { plan: failing, approvedPlanHash: failing.planHash },
        filesystemContext(root),
      );
      expect(failed.structuredContent.outcome).toBe("partially_applied");
      expect(
        (
          failed.structuredContent as unknown as {
            actionResults: { detail: string }[];
          }
        ).actionResults[0]?.detail,
      ).toBe("bare failure");
    });

    test("resumes from failed and skipped journal rows without replaying them", async () => {
      // implements REQ-KIBI-BOOTSTRAP-PLAN
      const root = makeTempDir();
      const plan = await thinBootstrap();
      const kbSnapshotId = bootstrapEmptyKbSnapshotId({
        branch: "develop",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: {},
      });
      const journalId = `bootstrap-${plan.planHash.slice(0, 16)}`;
      plantJournal(root, journalId, {
        version: 2,
        kind: "bootstrap",
        plan,
        checkpoint: {
          branch: "develop",
          kbSnapshotId,
          workspaceSnapshot: "a".repeat(64),
        },
        results: [
          {
            actionId: "bootstrap-upsert-0001",
            outcome: "applied",
            detail: "done",
          },
          {
            actionId: "bootstrap-upsert-0002",
            outcome: "failed",
            detail: "boom",
          },
          {
            actionId: "bootstrap-upsert-0002",
            outcome: "skipped",
            detail: "later",
          },
          {
            actionId: "bootstrap-upsert-0002",
            outcome: "applied",
            detail: 12,
          },
        ],
      });
      const result = await executeApplyPlan(
        { recoveryJournalId: journalId },
        filesystemContext(root),
      );
      expect(result.structuredContent.outcome).toMatch(
        /applied|partially_applied/,
      );
      expect(
        (
          result.structuredContent as unknown as {
            actionResults: { actionId: string; outcome: string }[];
          }
        ).actionResults.some(
          (row) =>
            row.actionId === "bootstrap-upsert-0001" &&
            row.outcome === "applied",
        ),
      ).toBe(true);
    });
  });

  describe("compile plan remaining commit and readback paths", () => {
    test("rejects missing status, drifted snapshots, and unavailable workspaces", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const plan = compilePlan();
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue({
          content: [{ type: "text", text: "empty" }],
        }),
      );
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/status query returned no payload/);

      restoreLastSpy();
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult({ snapshotId: "changed-snapshot" }),
        ),
      );
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/KB snapshot changed since compilation/);

      restoreLastSpy();
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root, { omitGit: true }),
        ),
      ).rejects.toThrow(/does not expose workspace snapshots/);
    });

    test("refuses a malformed step before any write and rolls back a commit that never reached the store", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const commits: string[] = [];
      const recordingProlog = (
        commit: () => Promise<PrologQueryResult>,
      ): OperationContext["prolog"] => ({
        ...stubProlog(),
        query: async (goal): Promise<PrologQueryResult> => {
          if (isWhatIfGoal(goal)) return whatIfResult();
          if (goal.includes("kb_commit_upsert")) {
            commits.push(goal);
            return commit();
          }
          return { success: true, bindings: { Results: "[]" } };
        },
      });
      // A step whose properties are not a record has no title, so the
      // preflight refuses it before any commit goal is sent.
      const malformed = compilePlan({
        steps: [
          {
            type: "req",
            id: "REQ-apply",
            properties: "not-a-record" as unknown as Record<string, unknown>,
            relationships: [],
          },
        ],
      });
      await expect(
        executeApplyPlan(
          { plan: malformed, approvedPlanHash: malformed.planHash },
          filesystemContext(root, {
            query: recordingProlog(async () => ({
              success: true,
              bindings: { ChangeKind: "created" },
            })),
          }),
        ),
      ).rejects.toThrow(
        /failed before any write: step REQ-apply is invalid: .*title/,
      );
      expect(commits).toEqual([]);

      // The transport fails, but the store still shows the pre-commit state:
      // nothing committed, so the plan rolls back instead of asking for repair.
      const emptyWrites = compilePlan({ sourceWrites: [] });
      await expect(
        executeApplyPlan(
          { plan: emptyWrites, approvedPlanHash: emptyWrites.planHash },
          filesystemContext(root, {
            query: recordingProlog(async () => {
              throw new Error("compiled boom");
            }),
          }),
        ),
      ).rejects.toThrow(/no change was applied .*compiled boom/);
      expect(commits).toHaveLength(1);
    });

    test("keeps the commit when final status has no payload or workspace readback fails", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const body = "readback\n";
      const plan = compilePlan({
        sourceWrites: [
          {
            path: "docs/readback.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha(body),
            body,
          },
        ],
      });
      const originalStatus =
        discoveryExecutors.executeStatus.bind(discoveryExecutors);
      let statusCalls = 0;
      track(
        spyOn(discoveryExecutors, "executeStatus").mockImplementation(
          async (args, ctx) => {
            statusCalls += 1;
            if (statusCalls === 1) return originalStatus(args, ctx);
            return { content: [{ type: "text", text: "none" }] };
          },
        ),
      );
      const missingStatus = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root),
      );
      expect(asApply(missingStatus.structuredContent).status).toBe(
        "committed_with_repairs",
      );
      expect(
        asApply(missingStatus.structuredContent).effectFailures?.some(
          (failure) => failure.errorCode === "POST_COMMIT_READBACK_FAILED",
        ),
      ).toBe(true);

      const workspacePlan = compilePlan({
        steps: [
          {
            type: "req",
            id: "REQ-ws",
            properties: { title: "WS", status: "open" },
            relationships: [],
            document: { body: "body only" },
          },
        ],
        sourceWrites: [
          {
            path: "docs/ws.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha("ws\n"),
            body: "ws\n",
          },
        ],
      });
      restoreLastSpy();
      let snapshots = 0;
      const result = await executeApplyPlan(
        { plan: workspacePlan, approvedPlanHash: workspacePlan.planHash },
        filesystemContext(root, {
          git: {
            workspaceSnapshot: async () => {
              snapshots += 1;
              if (snapshots <= 2) {
                return {
                  version: "kibi.workspace-snapshot.v2",
                  hash: "a".repeat(64),
                  dirty: false,
                  fileCount: 1,
                };
              }
              throw new Error("snapshot gone");
            },
          },
        }),
      );
      expect(asApply(result.structuredContent).status).toBe(
        "committed_with_repairs",
      );
      expect(
        asApply(result.structuredContent).effectFailures?.some((failure) =>
          String(failure.detail).includes("snapshot gone"),
        ),
      ).toBe(true);
    });
  });

  describe("entity deletion source writes", () => {
    test("marks compiled_published after a successful deletion with source writes", async () => {
      // implements REQ-014
      const root = makeTempDir();
      mkdirSync(path.join(root, "docs"), { recursive: true });
      writeFileSync(path.join(root, "docs", "fact.md"), "remove\n");
      const body = {
        version: "kibi.entity-deletion-plan.v1" as const,
        entityIds: ["FACT-1"],
        sourceHashes: {},
        sourceWrites: [
          {
            path: "docs/fact.md",
            mode: "delete" as const,
            beforeHash: sha("remove\n"),
            afterHash: null,
          },
        ],
        supersessionRequired: false,
      };
      const planHash = sha(JSON.stringify(body));
      track(
        spyOn(deleteModule, "executeDelete").mockResolvedValue({
          content: [{ type: "text", text: "deleted" }],
          structuredContent: { deleted: 1, skipped: 0, errors: [] },
        }),
      );
      const result = await executeApplyPlan(
        { plan: { ...body, planHash }, approvedPlanHash: planHash },
        filesystemContext(root),
      );
      expect(result.structuredContent).toMatchObject({
        version: "kibi.entity-deletion-apply-result.v1",
        outcome: "applied",
        deleted: 1,
      });
      expect(asApply(result.structuredContent).recoveryJournalId).toMatch(
        /^source-writes-/,
      );
    });

    test("returns repair nextActions when deletion compiled retract fails after source writes", async () => {
      // implements REQ-014
      const root = makeTempDir();
      mkdirSync(path.join(root, "docs"), { recursive: true });
      writeFileSync(path.join(root, "docs", "fact.md"), "remove\n");
      const body = {
        version: "kibi.entity-deletion-plan.v1" as const,
        entityIds: ["FACT-2"],
        sourceHashes: {},
        sourceWrites: [
          {
            path: "docs/fact.md",
            mode: "delete" as const,
            beforeHash: sha("remove\n"),
            afterHash: null,
          },
        ],
        supersessionRequired: false,
      };
      const planHash = sha(JSON.stringify(body));
      track(
        spyOn(deleteModule, "executeDelete").mockRejectedValue(
          "retract failed",
        ),
      );
      const result = await executeApplyPlan(
        { plan: { ...body, planHash }, approvedPlanHash: planHash },
        filesystemContext(root),
      );
      expect(result.structuredContent).toMatchObject({
        version: "kibi.entity-deletion-apply-result.v1",
        status: "committed_with_repairs",
        deleted: 0,
      });
      expect(asApply(result.structuredContent).nextActions?.[0]).toEqual(
        expect.objectContaining({
          operation: "kb_apply_plan",
          required: true,
        }),
      );
    });
  });

  describe("migration apply remaining executors and closeout", () => {
    test("rejects missing initial or final status and a missing final workspace", async () => {
      // implements REQ-014
      const root = makeTempDir();
      const plan = buildMigrationPlan({
        actions: [automaticAction({ id: "mig-status" })],
      });
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue({
          content: [{ type: "text", text: "empty" }],
        }),
      );
      await expect(
        executeApplyPlan(
          {
            plan,
            approvedPlanHash: plan.planHash,
            approvedActionIds: ["mig-status"],
          },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/status query returned no payload/);

      restoreLastSpy();
      let calls = 0;
      track(
        spyOn(discoveryExecutors, "executeStatus").mockImplementation(
          async () => {
            calls += 1;
            if (calls === 1) return statusResult();
            return { content: [{ type: "text", text: "none" }] };
          },
        ),
      );
      await expect(
        executeApplyPlan(
          {
            plan,
            approvedPlanHash: plan.planHash,
            approvedActionIds: ["mig-status"],
          },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/final status query returned no payload/);

      restoreLastSpy();
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult(),
        ),
      );
      await expect(
        executeApplyPlan(
          {
            plan,
            approvedPlanHash: plan.planHash,
            approvedActionIds: ["mig-status"],
          },
          filesystemContext(root, { omitGit: true }),
        ),
      ).rejects.toThrow(/does not expose workspace snapshots/);
    });

    test("applies automatic executors and records closeout from mocked status", async () => {
      // implements REQ-014
      const root = makeTempDir();
      track(
        spyOn(branchModule, "branchMigrateCommand").mockResolvedValue(
          undefined,
        ),
      );
      track(
        spyOn(branchModule, "branchRecoverCommand").mockResolvedValue(
          undefined,
        ),
      );
      track(
        spyOn(branchModule, "branchEnsureCommand").mockResolvedValue(undefined),
      );
      track(
        spyOn(migrateModule, "migrateCommand").mockResolvedValue({
          exitCode: 0,
        }),
      );
      track(
        spyOn(syncModule, "syncCommand").mockResolvedValue({
          branch: "develop",
          timestamp: "2026-09-05T00:00:00Z",
          entityCounts: {},
          relationshipCount: 0,
          success: true,
          published: true,
          failures: [],
        }),
      );
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult({
            dirty: true,
            syncState: "stale",
            proofSnapshotAvailable: false,
            branchAttachment: {
              gitBranch: "develop",
              kbBranch: "develop",
              kind: "legacy_compat",
              migrationRequired: true,
            },
            branchStore: {
              state: "missing",
              path: path.join(root, ".kb", "branches", "develop"),
              recoveryRequired: false,
            },
          }),
        ),
      );
      const plan = buildMigrationPlan({
        actions: [
          automaticAction({
            id: "mig-legacy",
            code: "legacy_branch_storage",
            category: "branch",
            invocation: {
              kind: "cli",
              command_argv: [
                "kibi",
                "branch",
                "migrate",
                "--from",
                "legacy",
                "--to",
                "develop",
              ],
            },
          }),
          automaticAction({
            id: "mig-recover",
            code: "damaged_exact_branch_store",
            category: "branch",
            dependsOn: ["mig-legacy"],
          }),
          automaticAction({
            id: "mig-schema",
            code: "legacy_storage_migration",
            category: "storage",
            dependsOn: ["mig-recover"],
          }),
          automaticAction({
            id: "mig-coords",
            code: "symbol_refresh_coordinates",
            category: "symbol",
            dependsOn: ["mig-schema"],
          }),
        ],
      });
      const result = await executeApplyPlan(
        {
          plan,
          approvedPlanHash: plan.planHash,
          approvedActionIds: [
            "mig-legacy",
            "mig-recover",
            "mig-schema",
            "mig-coords",
          ],
        },
        filesystemContext(root, { omitProlog: true }),
      );
      expect(result.structuredContent).toMatchObject({
        version: "kibi.migration-apply-result.v1",
        outcome: "applied",
      });
      const closeout = (
        result.structuredContent as unknown as {
          closeout: {
            taskOutcome: string;
            kbState: string;
            snapshotState: string;
            proofState: string;
          };
        }
      ).closeout;
      expect(closeout.taskOutcome).toBe("complete");
      expect(closeout.kbState).toBe("legacy_compat");
      expect(closeout.snapshotState).toBe("unavailable");
      expect(closeout.proofState).toBe("not_evaluated");
    });

    test("merges post-apply remaining plans and maps proof closeout states", async () => {
      // implements REQ-014
      const root = makeTempDir();
      track(
        spyOn(branchModule, "branchEnsureCommand").mockResolvedValue(undefined),
      );
      const remaining = buildMigrationPlan({
        actions: [automaticAction({ id: "mig-remain" })],
      });
      track(
        spyOn(checkExecutor, "executeCheck").mockResolvedValue({
          content: [{ type: "text", text: "check" }],
          structuredContent: { migrationPlan: remaining } as never,
        }),
      );
      track(
        spyOn(reporting, "executeCoverage").mockImplementation(
          async (input) => ({
            content: [{ type: "text", text: "coverage" }],
            structuredContent: {
              summary:
                input.by === "symbol"
                  ? { proofProven: 1, proofMissing: 2 }
                  : { proofProven: 3, proofMissing: 0 },
              rows: [],
              migrationPlan: remaining,
            },
          }),
        ),
      );
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult({
            dirty: false,
            syncState: "fresh",
            proofSnapshotAvailable: true,
            proofSnapshotDirty: false,
            branchStore: {
              state: "healthy",
              path: path.join(root, ".kb", "branches", "develop"),
              recoveryRequired: false,
            },
          }),
        ),
      );
      const plan = buildMigrationPlan({
        actions: [
          automaticAction({
            id: "mig-ensure",
            code: "missing_exact_branch_store",
            category: "branch",
          }),
        ],
      });
      const result = await executeApplyPlan(
        {
          plan,
          approvedPlanHash: plan.planHash,
          approvedActionIds: ["mig-ensure"],
        },
        filesystemContext(root),
      );
      expect(result.structuredContent.outcome).toBe("applied");
      expect(
        (
          result.structuredContent as unknown as {
            remainingPlan?: { planHash: string };
          }
        ).remainingPlan?.planHash,
      ).toBe(remaining.planHash);
      expect(
        (
          result.structuredContent as unknown as {
            closeout: {
              proofState: string;
              kbState: string;
              snapshotState: string;
            };
          }
        ).closeout,
      ).toMatchObject({
        kbState: "clean_fresh",
        snapshotState: "fresh",
        proofState: "proven",
      });
    });

    test("records post-apply readback failure and mixed or unresolved proof states", async () => {
      // implements REQ-014
      const root = makeTempDir();
      track(
        spyOn(branchModule, "branchEnsureCommand").mockResolvedValue(undefined),
      );
      track(
        spyOn(checkExecutor, "executeCheck").mockRejectedValue(
          new Error("check exploded"),
        ),
      );
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult({
            dirty: true,
            syncState: "unknown",
            proofSnapshotAvailable: true,
            proofSnapshotDirty: true,
            branchStore: {
              state: "healthy",
              path: path.join(root, ".kb", "branches", "develop"),
              recoveryRequired: false,
            },
          }),
        ),
      );
      const plan = buildMigrationPlan({
        actions: [
          automaticAction({
            id: "mig-ensure",
            code: "missing_exact_branch_store",
            category: "branch",
          }),
        ],
      });
      const failedReadback = await executeApplyPlan(
        {
          plan,
          approvedPlanHash: plan.planHash,
          approvedActionIds: ["mig-ensure"],
        },
        filesystemContext(root),
      );
      expect(failedReadback.structuredContent.outcome).toBe(
        "partially_applied",
      );
      expect(
        (
          failedReadback.structuredContent as unknown as {
            actionResults: { actionId: string; detail: string }[];
            closeout: {
              taskOutcome: string;
              kbState: string;
              snapshotState: string;
            };
          }
        ).actionResults.some((row) =>
          row.detail.includes("Post-apply check/coverage readback failed"),
        ),
      ).toBe(true);
      expect(
        (
          failedReadback.structuredContent as unknown as {
            closeout: {
              taskOutcome: string;
              kbState: string;
              snapshotState: string;
            };
          }
        ).closeout,
      ).toMatchObject({
        taskOutcome: "interim",
        kbState: "dirty",
        snapshotState: "dirty",
      });
    });

    test("maps mixed and unresolved proof closeout from coverage summaries", async () => {
      // implements REQ-014
      const root = makeTempDir();
      track(
        spyOn(branchModule, "branchEnsureCommand").mockResolvedValue(undefined),
      );
      const applyWithSummary = async (summary: Record<string, number>) => {
        const checkSpy = spyOn(checkExecutor, "executeCheck").mockResolvedValue(
          {
            content: [{ type: "text", text: "check" }],
            structuredContent: {} as never,
          },
        );
        const coverageSpy = spyOn(
          reporting,
          "executeCoverage",
        ).mockResolvedValue({
          content: [{ type: "text", text: "coverage" }],
          structuredContent: { summary, rows: [] },
        });
        const statusSpy = spyOn(
          discoveryExecutors,
          "executeStatus",
        ).mockResolvedValue(
          statusResult({
            dirty: false,
            syncState: "fresh",
            proofSnapshotAvailable: true,
            proofSnapshotDirty: false,
            branchStore: {
              state: "healthy",
              path: path.join(root, ".kb", "branches", "develop"),
              recoveryRequired: false,
            },
          }),
        );
        try {
          const plan = buildMigrationPlan({
            actions: [
              automaticAction({
                id: "mig-ensure",
                code: "missing_exact_branch_store",
                category: "branch",
              }),
            ],
          });
          return await executeApplyPlan(
            {
              plan,
              approvedPlanHash: plan.planHash,
              approvedActionIds: ["mig-ensure"],
            },
            filesystemContext(root, {
              omitProlog: true,
              ensureProlog: async () => {
                const prolog = stubProlog();
                if (!prolog) throw new Error("expected a Prolog fixture");
                return prolog;
              },
            }),
          );
        } finally {
          checkSpy.mockRestore();
          coverageSpy.mockRestore();
          statusSpy.mockRestore();
        }
      };
      const mixed = await applyWithSummary({ proofProven: 2, proofMissing: 1 });
      expect(
        (
          mixed.structuredContent as unknown as {
            closeout: { proofState: string };
          }
        ).closeout.proofState,
      ).toBe("mixed");
      const unresolved = await applyWithSummary({
        proofProven: 0,
        proofMissing: 4,
      });
      expect(
        (
          unresolved.structuredContent as unknown as {
            closeout: { proofState: string };
          }
        ).closeout.proofState,
      ).toBe("unresolved");
    });

    test("surfaces schema and coordinate executor failures", async () => {
      // implements REQ-014
      const root = makeTempDir();
      track(
        spyOn(migrateModule, "migrateCommand").mockResolvedValue({
          exitCode: 1,
        }),
      );
      track(
        spyOn(syncModule, "syncCommand").mockResolvedValue({
          branch: "develop",
          timestamp: "2026-09-05T00:00:00Z",
          success: false,
          published: false,
          failures: [],
        } as never),
      );
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult({
            syncState: "unknown",
            dirty: false,
            proofSnapshotAvailable: true,
          }),
        ),
      );
      const schema = buildMigrationPlan({
        actions: [
          automaticAction({
            id: "mig-schema",
            code: "invalid_schema_version",
            category: "schema",
          }),
        ],
      });
      const schemaResult = await executeApplyPlan(
        {
          plan: schema,
          approvedPlanHash: schema.planHash,
          approvedActionIds: ["mig-schema"],
        },
        filesystemContext(root, { omitProlog: true }),
      );
      expect(schemaResult.structuredContent.outcome).toBe(
        "reconciliation_required",
      );
      expect(
        (
          schemaResult.structuredContent as unknown as {
            actionResults: { detail: string }[];
            closeout: {
              taskOutcome: string;
              kbState: string;
              snapshotState: string;
            };
          }
        ).actionResults[0]?.detail,
      ).toMatch(/Schema migration did not complete/);
      expect(
        (
          schemaResult.structuredContent as unknown as {
            closeout: { taskOutcome: string; snapshotState: string };
          }
        ).closeout,
      ).toMatchObject({
        taskOutcome: "blocked",
        snapshotState: "not_evaluated",
      });

      const coords = buildMigrationPlan({
        actions: [
          automaticAction({
            id: "mig-coords",
            code: "coverage_source_coordinates",
            category: "symbol",
          }),
        ],
      });
      const coordResult = await executeApplyPlan(
        {
          plan: coords,
          approvedPlanHash: coords.planHash,
          approvedActionIds: ["mig-coords"],
        },
        filesystemContext(root, { omitProlog: true }),
      );
      expect(
        (
          coordResult.structuredContent as unknown as {
            actionResults: { detail: string }[];
          }
        ).actionResults[0]?.detail,
      ).toMatch(/Coordinate refresh did not complete/);
    });

    test("rejects a compile plan relationship missing type, from, or to", async () => {
      // implements REQ-014
      const root = makeTempDir();
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult(),
        ),
      );
      const missingTo = compilePlan({
        steps: [
          {
            type: "req",
            id: "REQ-apply",
            properties: { title: "Apply", status: "open" },
            relationships: [{ type: "specified_by", from: "REQ-apply" }],
          },
        ],
      });
      await expect(
        executeApplyPlan(
          { plan: missingTo, approvedPlanHash: missingTo.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/every relationship needs type, from, and to/);

      const missingFrom = compilePlan({
        steps: [
          {
            type: "req",
            id: "REQ-apply",
            properties: { title: "Apply", status: "open" },
            relationships: [{ type: "specified_by", to: "SCEN-apply" }],
          },
        ],
      });
      await expect(
        executeApplyPlan(
          { plan: missingFrom, approvedPlanHash: missingFrom.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/every relationship needs type, from, and to/);

      const missingType = compilePlan({
        steps: [
          {
            type: "req",
            id: "REQ-apply",
            properties: { title: "Apply", status: "open" },
            relationships: [{ from: "REQ-apply", to: "SCEN-apply" }],
          },
        ],
      });
      await expect(
        executeApplyPlan(
          { plan: missingType, approvedPlanHash: missingType.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/every relationship needs type, from, and to/);
    });

    test("rejects a migration plan when expected.configHash has drifted", async () => {
      // implements REQ-014
      const root = makeTempDir();
      track(
        spyOn(discoveryExecutors, "executeStatus").mockResolvedValue(
          statusResult(),
        ),
      );
      const plan = buildMigrationPlan({
        expected: { configHash: "a".repeat(64) },
        actions: [automaticAction({ id: "mig-config-drift" })],
      });
      await expect(
        executeApplyPlan(
          {
            plan,
            approvedPlanHash: plan.planHash,
            approvedActionIds: ["mig-config-drift"],
          },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/config changed since planning/);
    });
  });

  describe("apply-plan leftover recovery and bootstrap catch", () => {
    test("treats an unreadable current file as missing during prepared recovery", async () => {
      const root = makeTempDir();
      const before = "before\n";
      const after = "after\n";
      mkdirSync(path.join(root, "docs"), { recursive: true });
      writeFileSync(path.join(root, "docs", "recover.md"), before);
      const plan = deletionPlan([
        {
          path: "docs/recover.md",
          mode: "write",
          beforeHash: sha(before),
          afterHash: sha(after),
          body: after,
        },
      ]);
      const journalId = `source-writes-${plan.planHash.slice(0, 16)}`;
      plantJournal(root, journalId, {
        version: 1,
        planHash: plan.planHash,
        state: "prepared",
        entries: [
          {
            path: "docs/recover.md",
            mode: "write",
            beforeHash: sha(before),
            afterHash: sha(after),
            beforeExisted: true,
            beforeStage: path.join(
              root,
              ".kb",
              "recovery",
              `${journalId}-0.before`,
            ),
            afterStage: path.join(
              root,
              ".kb",
              "recovery",
              `${journalId}-0.after`,
            ),
          },
        ],
      });
      const base = nodeFilesystem;
      const fs = {
        ...base,
        readFile: async (target: string) => {
          if (target.endsWith("docs/recover.md")) {
            throw new Error("EACCES");
          }
          return base.readFile(target);
        },
      };
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root, { fs }),
        ),
      ).rejects.toThrow(/changed outside its journal/);
    });

    test("rejects a source write that targets a derived .kb runtime tree", async () => {
      const root = makeTempDir();
      const body = "runtime\n";
      const plan = compilePlan({
        sourceWrites: [
          {
            path: ".kb/branches/develop/storage.json",
            mode: "write",
            beforeHash: null,
            afterHash: sha(body),
            body,
          },
        ],
      });
      await expect(
        executeApplyPlan(
          { plan, approvedPlanHash: plan.planHash },
          filesystemContext(root),
        ),
      ).rejects.toThrow(/derived \.kb runtime trees/);
    });

    test("records an outer bootstrap catch when the repair journal cannot be written", async () => {
      const root = makeTempDir();
      const plan = await thinBootstrap({
        actions: [
          {
            id: "bootstrap-upsert-0001",
            kind: "upsert",
            dependsOn: [],
            payload: {
              type: "req",
              id: "REQ-outer",
              properties: { title: "Outer", status: "open" },
              relationships: [],
            },
          },
        ],
      });
      track(
        spyOn(upsertModule, "executeUpsert").mockRejectedValue(
          new Error("upsert exploded"),
        ),
      );
      const base = nodeFilesystem;
      let repairWrites = 0;
      const fs = {
        ...base,
        writeFile: async (target: string, contents: string) => {
          if (contents.includes('"state": "repair_required"')) {
            repairWrites += 1;
            if (repairWrites === 1) {
              throw new Error("journal write boom");
            }
          }
          return base.writeFile(target, contents);
        },
      };
      const result = await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root, { fs }),
      );
      expect(result.structuredContent.outcome).toBe("partially_applied");
      expect(asApply(result.structuredContent).status).toBe(
        "committed_with_repairs",
      );
      expect(
        JSON.stringify(asApply(result.structuredContent).effectFailures),
      ).toContain("journal write boom");
    });
  });

  describe("apply-plan leftover workspace escape and recovery dependency helpers", () => {
    test("assertSourceWriteStaysInWorkspace rejects an escaped absolute path", () => {
      expect(() =>
        assertSourceWriteStaysInWorkspace(
          "/tmp/workspace",
          "/tmp/outside/secret.md",
          "docs/secret.md",
        ),
      ).toThrow(/escapes workspace/);
      expect(() =>
        assertSourceWriteStaysInWorkspace(
          "/tmp/workspace",
          "/tmp/workspace/docs/ok.md",
          "docs/ok.md",
        ),
      ).not.toThrow();
    });

    test("assertBootstrapRecoveryDependencies rejects a missing remaining dependency", () => {
      expect(() =>
        assertBootstrapRecoveryDependencies(
          [{ id: "bootstrap-upsert-0002", dependsOn: ["ghost-dep"] }],
          new Set(),
        ),
      ).toThrow(/missing dependency 'ghost-dep'/);
      expect(() =>
        assertBootstrapRecoveryDependencies(
          [
            { id: "bootstrap-upsert-0001" },
            {
              id: "bootstrap-upsert-0002",
              dependsOn: ["bootstrap-upsert-0001"],
            },
          ],
          new Set(),
        ),
      ).not.toThrow();
    });
  });
});
