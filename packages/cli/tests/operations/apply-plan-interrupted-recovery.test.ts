// implements REQ-bootstrap-apply-long-running
import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  type BootstrapAction,
  type BootstrapPlanV1,
  bootstrapEmptyKbSnapshotId,
  bootstrapPlanHash,
} from "../../src/operations/bootstrap/types.js";
import { acquireWorkspaceMutationLock } from "../../src/operations/mutation/workspace-mutation-lock.js";
import { executeApplyPlan } from "../../src/operations/planning/apply-plan.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  FilesystemPort,
  OperationContext,
  OperationProgress,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { isWhatIfGoal, whatIfResult } from "../helpers/what-if.js";

const PLANNED_WORKSPACE = "a".repeat(64);

function adr(id: string, dependsOn: readonly string[], n: string) {
  return {
    id: `bootstrap-upsert-${n}`,
    kind: "upsert",
    dependsOn: [...dependsOn],
    payload: {
      type: "adr",
      id,
      properties: { title: id, status: "accepted" },
      relationships: [],
      document: { path: `adrs/${id}.md` },
    },
  } as BootstrapAction;
}

function bootstrapPlan(actions: readonly BootstrapAction[]): BootstrapPlanV1 {
  const body = {
    version: "kibi.bootstrap-plan.v1" as const,
    status: "ready" as const,
    expected: {
      branch: "develop",
      kbSnapshotId: bootstrapEmptyKbSnapshotId({
        branch: "develop",
        workspaceSnapshot: PLANNED_WORKSPACE,
        sourceHashes: {},
      }),
      workspaceSnapshot: PLANNED_WORKSPACE,
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

type Harness = {
  workspaceHash: string;
  /** Once set, the process "dies": no further journal write lands. */
  killed: boolean;
  killOnCommitOf?: string;
  commits: string[];
};

function harnessContext(
  root: string,
  harness: Harness,
  onProgress?: (progress: OperationProgress) => void,
): OperationContext {
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  const recoveryDir = path.join(root, ".kb", "recovery");
  const fs: FilesystemPort = {
    ...nodeFilesystem,
    writeFile: async (target, data) => {
      if (
        harness.killed &&
        path.dirname(target) === recoveryDir &&
        target.endsWith(".json")
      )
        throw new Error("process killed");
      return nodeFilesystem.writeFile(target, data);
    },
  };
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-10-07T00:00:00Z"),
    fs,
    sourceFirst: true,
    prolog: {
      query: async (goal): Promise<PrologQueryResult> => {
        if (isWhatIfGoal(goal)) return whatIfResult();
        if (goal.includes("findall("))
          return { success: true, bindings: { Results: "[]" } };
        if (!goal.includes("kb_commit_upsert"))
          return { success: false, bindings: {} };
        const id = goal.match(/ADR-[a-z-]+/)?.[0] ?? "unknown";
        harness.commits.push(id);
        if (harness.killOnCommitOf === id) {
          // The interrupted action's write lands, then the process dies
          // before it can checkpoint.
          harness.workspaceHash = "b".repeat(64);
          harness.killed = true;
        }
        return { success: true, bindings: { ChangeKind: "created" } };
      },
      queryStatusJson: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: harness.workspaceHash,
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: path.join(root, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
    ...(onProgress ? { onProgress } : {}),
  };
}

function deadPid(): number {
  const child = spawnSync(process.execPath, ["-e", "0"]);
  if (typeof child.pid !== "number") throw new Error("no child pid");
  return child.pid;
}

function plantLock(root: string, pid: number): string {
  const lock = path.join(root, ".kb", "recovery", "source-authoring.lock");
  mkdirSync(lock, { recursive: true });
  writeFileSync(
    path.join(lock, "owner.json"),
    `${JSON.stringify({ pid, token: `${pid}-planted`, acquiredAt: 1 })}\n`,
  );
  return lock;
}

const PLAN = bootstrapPlan([
  adr("ADR-first", [], "0001"),
  adr("ADR-second", ["bootstrap-upsert-0001"], "0002"),
  adr("ADR-third", ["bootstrap-upsert-0002"], "0003"),
]);

describe("bootstrap apply interrupted mid-action", () => {
  test("reports per-action progress while applying", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-apply-progress-"));
    try {
      const progress: OperationProgress[] = [];
      const harness: Harness = {
        workspaceHash: PLANNED_WORKSPACE,
        killed: false,
        commits: [],
      };
      const result = await executeApplyPlan(
        { plan: PLAN, approvedPlanHash: PLAN.planHash },
        harnessContext(root, harness, (row) => progress.push(row)),
      );
      expect(result.structuredContent.outcome).toBe("applied");
      expect(progress.map((row) => row.progress)).toEqual([0, 1, 2, 3]);
      expect(progress.every((row) => row.total === 3)).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("recovers via recoveryJournalId after the process died mid-action and left a dead lock, without journal edits", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-apply-killed-"));
    try {
      const harness: Harness = {
        workspaceHash: PLANNED_WORKSPACE,
        killed: false,
        killOnCommitOf: "ADR-second",
        commits: [],
      };
      await expect(
        executeApplyPlan(
          { plan: PLAN, approvedPlanHash: PLAN.planHash },
          harnessContext(root, harness),
        ),
      ).rejects.toThrow("process killed");

      const journalId = `bootstrap-${PLAN.planHash.slice(0, 16)}`;
      const journalPath = path.join(
        root,
        ".kb",
        "recovery",
        `${journalId}.json`,
      );
      const interrupted = JSON.parse(readFileSync(journalPath, "utf8"));
      expect(interrupted.state).toBe("applying");
      expect(interrupted.activeActionId).toBe("bootstrap-upsert-0002");
      expect(
        interrupted.results.map((row: { actionId: string }) => row.actionId),
      ).toEqual(["bootstrap-upsert-0001"]);
      // The live state moved past the last checkpoint.
      expect(interrupted.checkpoint.workspaceSnapshot).toBe(PLANNED_WORKSPACE);

      // The dead process also left its source lock behind.
      const lock = plantLock(root, deadPid());

      const resumed: Harness = {
        workspaceHash: harness.workspaceHash,
        killed: false,
        commits: [],
      };
      const recovered = await executeApplyPlan(
        { recoveryJournalId: journalId },
        harnessContext(root, resumed),
      );
      const data = recovered.structuredContent as unknown as {
        outcome: string;
        actionResults: readonly { actionId: string; outcome: string }[];
        validationSummary: { notes: readonly string[] };
      };
      expect(data.outcome).toBe("applied");
      expect(data.actionResults).toEqual([
        expect.objectContaining({
          actionId: "bootstrap-upsert-0001",
          outcome: "applied",
        }),
        expect.objectContaining({
          actionId: "bootstrap-upsert-0002",
          outcome: "applied",
        }),
        expect.objectContaining({
          actionId: "bootstrap-upsert-0003",
          outcome: "applied",
        }),
      ]);
      // The interrupted action is re-applied; the committed one is not.
      expect(resumed.commits).toEqual(["ADR-second", "ADR-third"]);
      expect(data.validationSummary.notes.join(" ")).toContain(
        "bootstrap-upsert-0002 was interrupted",
      );
      expect(existsSync(lock)).toBe(false);

      const settled = JSON.parse(readFileSync(journalPath, "utf8"));
      expect(settled.state).toBe("committed");
      expect(settled.lockReclaims).toHaveLength(1);
      expect(settled.interruptedActions).toEqual([
        expect.objectContaining({ actionId: "bootstrap-upsert-0002" }),
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("drift without an interrupted action is still refused", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-apply-drift-"));
    try {
      const harness: Harness = {
        workspaceHash: PLANNED_WORKSPACE,
        killed: false,
        commits: [],
      };
      await executeApplyPlan(
        { plan: PLAN, approvedPlanHash: PLAN.planHash },
        harnessContext(root, harness),
      );
      const journalId = `bootstrap-${PLAN.planHash.slice(0, 16)}`;
      const journalPath = path.join(
        root,
        ".kb",
        "recovery",
        `${journalId}.json`,
      );
      // A journal stopped between actions (no active action) whose live
      // state then drifted for another reason.
      const journal = JSON.parse(readFileSync(journalPath, "utf8"));
      writeFileSync(
        journalPath,
        JSON.stringify({ ...journal, state: "applying", results: [] }),
      );
      await expect(
        executeApplyPlan(
          { recoveryJournalId: journalId },
          harnessContext(root, {
            workspaceHash: "c".repeat(64),
            killed: false,
            commits: [],
          }),
        ),
      ).rejects.toThrow("state changed since the last action checkpoint");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("dead-holder lock reclaim", () => {
  test("keeps the refusal while the holder is alive and without a reclaim grant", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-lock-reclaim-"));
    try {
      const lock = plantLock(root, 4242);
      await expect(
        acquireWorkspaceMutationLock(root, {
          isProcessAlive: () => true,
          reclaimDeadHolder: () => true,
          timeoutMs: 60,
        }),
      ).rejects.toThrow("held by pid 4242");
      await expect(
        acquireWorkspaceMutationLock(root, { isProcessAlive: () => false }),
      ).rejects.toThrow("requires operator recovery");
      expect(existsSync(lock)).toBe(true);

      const handle = await acquireWorkspaceMutationLock(root, {
        isProcessAlive: () => false,
        reclaimDeadHolder: (holder) => holder.pid === 4242,
      });
      expect(handle.reclaimed).toEqual([
        expect.objectContaining({ pid: 4242, token: "4242-planted" }),
      ]);
      handle.release();
      expect(existsSync(lock)).toBe(false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
