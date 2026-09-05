// implements REQ-kibi-change-to-proof-plan-compiler, REQ-agent-guided-migration-orchestration
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, spyOn, test } from "bun:test";

import { executeApplyPlan } from "../../src/operations/planning/apply-plan.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import { buildMigrationPlan } from "../../src/public/operations/migration-plan.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import * as syncModule from "../../src/commands/sync.js";

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-apply-recovery-"));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, ".kb"), { recursive: true });
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function filesystemContext(workspaceRoot: string): OperationContext {
  const query: OperationContext["prolog"] = {
    query: async (): Promise<PrologQueryResult> => ({
      success: true,
      bindings: { Results: "[]" },
    }),
    queryStatusJson: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    prolog: query,
    fs: nodeFilesystem,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
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
  overrides: Record<string, unknown> = {},
) {
  return {
    id: "mig-unknown-0001",
    code: "not_a_real_action",
    category: "quality" as const,
    state: "ready" as const,
    safety: "automatic" as const,
    invocation: { kind: "review" as const, instruction: "noop" },
    affectedEntityIds: [],
    affectedFiles: [],
    dependsOn: [],
    preconditions: [],
    postconditions: [],
    evidence: {},
    autoApplicable: true,
    dispositionRequired: false,
    allowedDispositions: ["fixed", "accepted", "deferred"] as const,
    ...overrides,
  };
}

describe("source recovery journals", () => {
  test("refuses journals that are not committed or repair_required", async () => {
    const root = makeTempDir();
    mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "recovery", "source-writes-aaaaaaaaaaaaaaaa.json"),
      `${JSON.stringify({
        version: 1,
        planHash: "a".repeat(64),
        state: "prepared",
        entries: [],
      })}\n`,
    );
    await expect(
      executeApplyPlan(
        { recoveryJournalId: "source-writes-aaaaaaaaaaaaaaaa" },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/committed or repair_required/);
  });

  test("replays a committed source journal through mocked sync", async () => {
    const root = makeTempDir();
    const body = "recovered body\n";
    const afterHash = sha(body);
    const planHash = "b".repeat(64);
    const journalId = `source-writes-${planHash.slice(0, 16)}`;
    mkdirSync(path.join(root, "docs"), { recursive: true });
    mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(path.join(root, "docs", "recovered.md"), body);
    const afterStage = path.join(root, ".kb", "recovery", `${journalId}-0.after`);
    writeFileSync(afterStage, body);
    writeFileSync(
      path.join(root, ".kb", "recovery", `${journalId}.json`),
      `${JSON.stringify({
        version: 1,
        planHash,
        state: "sources_committed",
        entries: [
          {
            path: "docs/recovered.md",
            mode: "write",
            beforeHash: null,
            afterHash,
            beforeExisted: false,
            beforeStage: path.join(root, ".kb", "recovery", `${journalId}-0.before`),
            afterStage,
          },
        ],
      })}\n`,
    );
    const syncSpy = spyOn(syncModule, "syncCommand").mockResolvedValue({
      branch: "develop",
      timestamp: "2026-09-05T00:00:00Z",
      entityCounts: { req: 2 },
      relationshipCount: 3,
      success: true,
      published: true,
      failures: [],
    });
    try {
      const result = await executeApplyPlan(
        { recoveryJournalId: journalId },
        filesystemContext(root),
      );
      expect(result.structuredContent.outcome).toBe("replayed");
      expect(result.structuredContent.recoveryJournalId).toBe(journalId);
      expect(result.structuredContent.changedEntities).toBe(2);
      expect(syncSpy).toHaveBeenCalled();
    } finally {
      syncSpy.mockRestore();
    }
  });

  test("replays a delete-mode journal entry without reading afterStage", async () => {
    const root = makeTempDir();
    const planHash = "c".repeat(64);
    const journalId = `source-writes-${planHash.slice(0, 16)}`;
    mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "recovery", `${journalId}.json`),
      `${JSON.stringify({
        version: 1,
        planHash,
        state: "repair_required",
        entries: [
          {
            path: "docs/gone.md",
            mode: "delete",
            beforeHash: sha("old\n"),
            afterHash: null,
            beforeExisted: true,
            beforeStage: path.join(root, ".kb", "recovery", `${journalId}-0.before`),
            afterStage: path.join(root, ".kb", "recovery", `${journalId}-0.after`),
          },
        ],
      })}\n`,
    );
    const syncSpy = spyOn(syncModule, "syncCommand").mockResolvedValue({
      branch: "develop",
      timestamp: "2026-09-05T00:00:00Z",
      entityCounts: {},
      relationshipCount: 0,
      success: true,
      published: false,
      failures: [],
    });
    try {
      const result = await executeApplyPlan(
        { recoveryJournalId: journalId },
        filesystemContext(root),
      );
      expect(result.structuredContent.outcome).toBe("replayed");
      expect(result.structuredContent.changedEntities).toBe(0);
    } finally {
      syncSpy.mockRestore();
    }
  });
});

describe("migration expected snapshot guards", () => {
  test("refuses apply when branch, snapshot, workspace, or config drifted", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);

    const wrongBranch = buildMigrationPlan({
      actions: [automaticAction()],
      expected: { branch: "not-develop" },
    });
    await expect(
      executeApplyPlan(
        {
          plan: wrongBranch,
          approvedPlanHash: wrongBranch.planHash,
          approvedActionIds: [wrongBranch.actions[0]!.id],
        },
        ctx,
      ),
    ).rejects.toThrow(/active branch changed/);

    const wrongKb = buildMigrationPlan({
      actions: [automaticAction({ id: "mig-kb" })],
      expected: { kbBranch: "other-kb" },
    });
    await expect(
      executeApplyPlan(
        {
          plan: wrongKb,
          approvedPlanHash: wrongKb.planHash,
          approvedActionIds: ["mig-kb"],
        },
        ctx,
      ),
    ).rejects.toThrow(/KB branch changed/);

    const wrongSnap = buildMigrationPlan({
      actions: [automaticAction({ id: "mig-snap" })],
      expected: { kbSnapshotId: "snap-not-missing" },
    });
    await expect(
      executeApplyPlan(
        {
          plan: wrongSnap,
          approvedPlanHash: wrongSnap.planHash,
          approvedActionIds: ["mig-snap"],
        },
        ctx,
      ),
    ).rejects.toThrow(/KB snapshot changed/);

    const wrongWorkspace = buildMigrationPlan({
      actions: [automaticAction({ id: "mig-ws" })],
      expected: { workspaceSnapshot: "b".repeat(64) },
    });
    await expect(
      executeApplyPlan(
        {
          plan: wrongWorkspace,
          approvedPlanHash: wrongWorkspace.planHash,
          approvedActionIds: ["mig-ws"],
        },
        ctx,
      ),
    ).rejects.toThrow(/workspace snapshot changed/);

    const wrongConfig = buildMigrationPlan({
      actions: [automaticAction({ id: "mig-cfg" })],
      expected: { configHash: "f".repeat(64) },
    });
    await expect(
      executeApplyPlan(
        {
          plan: wrongConfig,
          approvedPlanHash: wrongConfig.planHash,
          approvedActionIds: ["mig-cfg"],
        },
        ctx,
      ),
    ).rejects.toThrow(/config changed/);
  });

  test("covers remaining automatic migration action codes", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    const syncSpy = spyOn(syncModule, "syncCommand").mockResolvedValue({
      branch: "develop",
      timestamp: "2026-09-05T00:00:00Z",
      entityCounts: {},
      relationshipCount: 0,
      success: false,
      published: false,
      failures: [],
    });
    try {
      const plan = buildMigrationPlan({
        actions: [
          automaticAction({
            id: "mig-recover",
            code: "damaged_exact_branch_store",
            category: "branch",
          }),
          automaticAction({
            id: "mig-invalid-schema",
            code: "invalid_schema_version",
            category: "schema",
            dependsOn: ["mig-recover"],
          }),
          automaticAction({
            id: "mig-coords",
            code: "coverage_source_coordinates",
            category: "symbol",
            dependsOn: ["mig-invalid-schema"],
          }),
        ],
      });
      const result = await executeApplyPlan(
        {
          plan,
          approvedPlanHash: plan.planHash,
          approvedActionIds: [
            "mig-recover",
            "mig-invalid-schema",
            "mig-coords",
          ],
        },
        ctx,
      );
      expect(result.structuredContent.outcome).toMatch(
        /applied|partially_applied|reconciliation_required/,
      );
    } finally {
      syncSpy.mockRestore();
    }
  });
});

describe("bootstrap recovery journals", () => {
  async function thinPlan(workspaceSnapshot = "a".repeat(64)) {
    const { bootstrapEmptyKbSnapshotId, bootstrapPlanHash } = await import(
      "../../src/operations/bootstrap/types.js"
    );
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
            id: "REQ-bootstrap-recover",
            properties: { title: "Recover", status: "open" },
            relationships: [],
          },
        },
        {
          id: "bootstrap-upsert-0002",
          kind: "upsert" as const,
          dependsOn: ["bootstrap-upsert-0001"],
          payload: {
            type: "req",
            id: "REQ-bootstrap-recover-2",
            properties: { title: "Recover 2", status: "open" },
            relationships: [],
          },
        },
      ],
      sourceWrites: [],
      suppressedCandidates: [],
      payoffSummary: {},
      diagnostics: [],
    };
    return { ...body, planHash: bootstrapPlanHash(body) };
  }

  test("rejects invalid bootstrap recovery IDs and journal payloads", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    await expect(
      executeApplyPlan({ recoveryJournalId: "bootstrap-not-hex" }, ctx),
    ).rejects.toThrow(/journal ID is invalid/);

    const journalId = "bootstrap-aaaaaaaaaaaaaaaa";
    mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "recovery", `${journalId}.json`),
      `${JSON.stringify({ version: 1, kind: "bootstrap" })}\n`,
    );
    await expect(
      executeApplyPlan({ recoveryJournalId: journalId }, ctx),
    ).rejects.toThrow(/journal is invalid/);

    const plan = await thinPlan();
    const badHashId = `bootstrap-${plan.planHash.slice(0, 16)}`;
    writeFileSync(
      path.join(root, ".kb", "recovery", `${badHashId}.json`),
      `${JSON.stringify({
        version: 2,
        kind: "bootstrap",
        plan: { ...plan, planHash: "0".repeat(64) },
      })}\n`,
    );
    await expect(
      executeApplyPlan({ recoveryJournalId: badHashId }, ctx),
    ).rejects.toThrow(/plan hash is invalid/);

    writeFileSync(
      path.join(root, ".kb", "recovery", `${badHashId}.json`),
      `${JSON.stringify({
        version: 2,
        kind: "bootstrap",
        plan,
      })}\n`,
    );
    await expect(
      executeApplyPlan({ recoveryJournalId: badHashId }, ctx),
    ).rejects.toThrow(/no state checkpoint/);
  });

  test("refuses bootstrap recovery when the checkpoint drifted or actions are unknown", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    const plan = await thinPlan();
    const journalId = `bootstrap-${plan.planHash.slice(0, 16)}`;
    mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "recovery", `${journalId}.json`),
      `${JSON.stringify({
        version: 2,
        kind: "bootstrap",
        plan,
        checkpoint: {
          branch: "other",
          kbSnapshotId: "x",
          workspaceSnapshot: "y",
        },
        results: [],
      })}\n`,
    );
    await expect(
      executeApplyPlan({ recoveryJournalId: journalId }, ctx),
    ).rejects.toThrow(/state changed/);

    const matching = await thinPlan();
    const { bootstrapEmptyKbSnapshotId } = await import(
      "../../src/operations/bootstrap/types.js"
    );
    const kbSnapshotId = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot: "a".repeat(64),
      sourceHashes: {},
    });
    const matchId = `bootstrap-${matching.planHash.slice(0, 16)}`;
    writeFileSync(
      path.join(root, ".kb", "recovery", `${matchId}.json`),
      `${JSON.stringify({
        version: 2,
        kind: "bootstrap",
        plan: matching,
        checkpoint: {
          branch: "develop",
          kbSnapshotId,
          workspaceSnapshot: "a".repeat(64),
        },
        results: [{ actionId: "bootstrap-upsert-unknown", outcome: "applied" }],
      })}\n`,
    );
    await expect(
      executeApplyPlan({ recoveryJournalId: matchId }, ctx),
    ).rejects.toThrow(/unknown action/);
  });

  test("resumes remaining bootstrap actions from a matching checkpoint", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    const plan = await thinPlan();
    const { bootstrapEmptyKbSnapshotId } = await import(
      "../../src/operations/bootstrap/types.js"
    );
    const kbSnapshotId = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot: "a".repeat(64),
      sourceHashes: {},
    });
    const journalId = `bootstrap-${plan.planHash.slice(0, 16)}`;
    mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "recovery", `${journalId}.json`),
      `${JSON.stringify({
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
        ],
      })}\n`,
    );
    const result = await executeApplyPlan(
      { recoveryJournalId: journalId },
      ctx,
    );
    expect(result.structuredContent.outcome).toMatch(
      /applied|partially_applied|reconciliation_required/,
    );
    expect(result.structuredContent.recoveryJournalId).toBe(journalId);
  });

  test("records a repair journal when a bootstrap action fails", async () => {
    const root = makeTempDir();
    const plan = await thinPlan();
    const ctx = filesystemContext(root);
    ctx.prolog = {
      query: async (goal: string): Promise<PrologQueryResult> => {
        if (goal.includes("REQ-bootstrap-recover-2")) {
          return { success: false, bindings: {}, error: "upsert failed" };
        }
        if (goal.includes("kb_commit_upsert")) {
          return { success: true, bindings: { ChangeKind: "created" } };
        }
        return { success: true, bindings: { Results: "[]" } };
      },
      queryStatusJson: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    };
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      ctx,
    );
    expect(result.structuredContent.outcome).toBe("partially_applied");
    expect(result.structuredContent.recoveryJournalId).toMatch(/^bootstrap-/);
  });
});
