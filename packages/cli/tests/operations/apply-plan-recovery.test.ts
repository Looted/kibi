import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { engineStopCommand } from "../../src/commands/engine.js";
import { initCommand } from "../../src/commands/init.js";
import { discoverSourceFiles } from "../../src/commands/sync/discovery.js";
import {
  openPlanApplyJournalById,
  planApplyJournalId,
} from "../../src/operations/mutation/plan-apply-journal.js";
import { writePendingSourceReceipt } from "../../src/operations/mutation/source-authoring.js";
import { executeApplyPlan } from "../../src/operations/planning/apply-plan.js";
import {
  type CompilePlanV1,
  compilePlanHash,
} from "../../src/operations/planning/compile-intent.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { asApply } from "../helpers/coverage-casts.js";
import {
  createGitWorkspace,
  isolateKibiEnv,
  removeTempDir,
  restoreWorkspaceCwd,
  withCwd,
} from "../helpers/in-process-workspace.js";
import { isWhatIfGoal, whatIfResult } from "../helpers/what-if.js";

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const roots: string[] = [];
const restores: Array<() => void> = [];

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreWorkspaceCwd();
  for (const root of roots.splice(0)) {
    try {
      await withCwd(root, () => engineStopCommand());
    } catch {
      // Recovery fixtures may never start an engine.
    }
    removeTempDir(root);
  }
});

function compileBody(
  overrides: Partial<CompilePlanV1> = {},
): Omit<CompilePlanV1, "planHash"> {
  return {
    version: "kibi.compile-plan.v1",
    status: "ready",
    expected: {
      branch: "main",
      kbSnapshotId: "missing",
      workspaceSnapshot: "a".repeat(64),
      sourceHashes: {},
    },
    target: {
      mode: "create",
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

function filesystemContext(
  workspaceRoot: string,
  extra?: {
    workspaceHash?: string;
    query?: OperationContext["prolog"];
    fs?: OperationContext["fs"];
  },
): OperationContext {
  const query: OperationContext["prolog"] = extra?.query ?? {
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
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    prolog: query,
    fs: extra?.fs ?? nodeFilesystem,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: extra?.workspaceHash ?? "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "main",
      kbBranch: "main",
      storePath: path.join(workspaceRoot, ".kb", "branches", "main"),
      kind: "exact",
      migrationRequired: false,
    },
  };
}

/** The atomic plan journal a compile plan application wrote, if any. */
function planJournalState(cwd: string, plan: CompilePlanV1): string {
  return openPlanApplyJournalById(
    filesystemContext(cwd),
    planApplyJournalId(plan.planHash),
  ).journal.state;
}

describe("compile plan source recovery and write fallbacks", () => {
  test("a store rejection rolls back the plan's source writes and changes nothing", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    const body = "Requirement body for repair\n";
    const afterHash = sha(body);
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/REQ-repair.md",
          mode: "write",
          beforeHash: null,
          afterHash,
          body,
        },
      ],
    });
    await expect(
      executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(cwd, {
          query: {
            query: async (goal): Promise<PrologQueryResult> =>
              isWhatIfGoal(goal)
                ? whatIfResult()
                : goal.includes("kb_commit_upsert")
                  ? { success: false, bindings: {}, error: "derived boom" }
                  : { success: true, bindings: { Results: "[]" } },
            queryStatusJson: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          },
        }),
      ),
    ).rejects.toThrow(
      /Apply plan failed at its store commit; no change was applied \(store unchanged, 2 source file\(s\) restored .*derived boom/,
    );
    expect(existsSync(path.join(cwd, "docs", "REQ-repair.md"))).toBe(false);
    expect(
      existsSync(path.join(cwd, ".kb", "requirements", "REQ-apply.md")),
    ).toBe(false);
    expect(planJournalState(cwd, plan)).toBe("rolled_back");
  });

  test("source writes fall back to write+unlink when rename is unavailable", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    const body = "No rename body\n";
    const afterHash = sha(body);
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/no-rename.md",
          mode: "write",
          beforeHash: null,
          afterHash,
          body,
        },
      ],
    });
    const { rename: _rename, ...rest } = nodeFilesystem;
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(cwd, { fs: rest }),
    );
    expect(result.structuredContent.outcome).toBe("applied");
    expect(readFileSync(path.join(cwd, "docs", "no-rename.md"), "utf8")).toBe(
      body,
    );
  });

  test("executeSourceRecovery rebuilds compiled state from a planted journal", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    await withCwd(cwd, () => initCommand({}));
    const body = `---
id: REQ-RECOVER
title: Recovered
status: open
type: req
---

Must remain independently testable.
`;
    const afterHash = sha(body);
    const planHash = "a".repeat(64);
    const journalId = `source-writes-${planHash.slice(0, 16)}`;
    const recoveryDir = path.join(cwd, ".kb", "recovery");
    mkdirSync(recoveryDir, { recursive: true });
    const afterStage = path.join(recoveryDir, `${journalId}-0.after`);
    writeFileSync(afterStage, body);
    mkdirSync(path.join(cwd, ".kb", "requirements"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "requirements", "REQ-RECOVER.md"),
      body,
    );
    writeFileSync(
      path.join(recoveryDir, `${journalId}.json`),
      `${JSON.stringify(
        {
          version: 1,
          planHash,
          state: "repair_required",
          entries: [
            {
              path: ".kb/requirements/REQ-RECOVER.md",
              mode: "write",
              beforeHash: null,
              afterHash,
              beforeExisted: false,
              beforeStage: path.join(recoveryDir, `${journalId}-0.before`),
              afterStage,
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const result = await executeApplyPlan(
      { recoveryJournalId: journalId },
      filesystemContext(cwd),
    );
    expect(result.structuredContent.outcome).toBe("replayed");
    expect(
      readFileSync(
        path.join(cwd, ".kb", "requirements", "REQ-RECOVER.md"),
        "utf8",
      ),
    ).toBe(body);
  }, 90_000);

  test("source recovery rejects an invalid journal payload", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "recovery"), { recursive: true });
    writeFileSync(
      path.join(cwd, ".kb", "recovery", "source-writes-deadbeefdeadbee.json"),
      `${JSON.stringify({ version: 2, planHash: "x", state: "prepared", entries: [] })}\n`,
    );
    await expect(
      executeApplyPlan(
        { recoveryJournalId: "source-writes-deadbeefdeadbee" },
        filesystemContext(cwd),
      ),
    ).rejects.toThrow(/committed or repair_required journal/);
  });

  test("a plan without source writes journals its entity documents and a failing later step commits nothing", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb"), { recursive: true });
    const plan = compilePlan({
      steps: [
        {
          type: "req",
          id: "REQ-partial-a",
          properties: { title: "Partial A", status: "open" },
          relationships: [],
        },
        {
          type: "req",
          id: "REQ-partial-b",
          properties: { title: "Partial B", status: "open" },
          relationships: [],
        },
      ],
    });
    // A store whose transaction applies every step or none: step B fails
    // inside the batch, so step A is never stored either.
    const stored = new Set<string>();
    const commits: string[] = [];
    let failure: unknown;
    try {
      await executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(cwd, {
          query: {
            query: async (goal): Promise<PrologQueryResult> => {
              if (isWhatIfGoal(goal)) return whatIfResult();
              if (goal.includes("kb_commit_upsert")) {
                commits.push(goal);
                if (goal.includes("REQ-partial-b"))
                  return { success: false, bindings: {}, error: "step boom" };
                stored.add("REQ-partial-a");
                return { success: true, bindings: { ChangeKind: "created" } };
              }
              return { success: true, bindings: { Results: "[]" } };
            },
            queryStatusJson: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          },
        }),
      );
    } catch (error) {
      failure = error;
    }
    expect(String(failure)).toMatch(
      /no change was applied \(store unchanged, 2 source file\(s\) restored .*step boom/,
    );
    expect(failure).not.toMatchObject({
      code: "PARTIAL_COMMIT_REPAIR_REQUIRED",
    });
    // One batch carried both steps; the store kept neither.
    expect(commits).toHaveLength(1);
    expect(commits[0]).toContain("kb_commit_upsert_batch");
    expect(commits[0]).toContain("REQ-partial-a");
    expect(stored.size).toBe(0);
    expect(planJournalState(cwd, plan)).toBe("rolled_back");
    for (const id of ["REQ-partial-a", "REQ-partial-b"])
      expect(
        existsSync(path.join(cwd, ".kb", "requirements", `${id}.md`)),
      ).toBe(false);
  });

  test("a pending source receipt failure after the commit reports repairs and blocks writes until its journal is recovered", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    mkdirSync(path.join(cwd, ".kb", "recovery"), { recursive: true });
    // A file where the pending-source receipt directory belongs makes the
    // postcommit receipt publication fail after the sources are committed.
    writeFileSync(
      path.join(cwd, ".kb", "recovery", "pending-sources"),
      "not-a-directory",
    );
    const body = "Requirement body for receipt journal\n";
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/REQ-receipt-journal.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha(body),
          body,
        },
      ],
    });
    const journalId = planApplyJournalId(plan.planHash);
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(cwd),
    );
    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      status: "committed_with_repairs",
      recoveryJournalId: journalId,
      effectFailures: [{ errorCode: "PENDING_SOURCE_RECEIPT_FAILED" }],
      nextActions: [
        { operation: "kb_apply_plan", input: { recoveryJournalId: journalId } },
      ],
    });
    // The committed bytes stay in place; the journal keeps the receipts.
    expect(
      readFileSync(path.join(cwd, "docs", "REQ-receipt-journal.md"), "utf8"),
    ).toBe(body);
    expect(planJournalState(cwd, plan)).toBe("store_committed");

    // Another write is refused while the receipts are unfinished.
    const other = compilePlan({
      steps: [
        {
          type: "req",
          id: "REQ-other",
          properties: { title: "Other", status: "open" },
          relationships: [],
        },
      ],
    });
    await expect(
      executeApplyPlan(
        { plan: other, approvedPlanHash: other.planHash },
        filesystemContext(cwd),
      ),
    ).rejects.toMatchObject({
      code: "PLAN_APPLY_RECOVERY_REQUIRED",
      retryable: false,
    });

    // Once receipts can be written, recovering the journal finishes them.
    rmSync(path.join(cwd, ".kb", "recovery", "pending-sources"));
    const recovered = await executeApplyPlan(
      { recoveryJournalId: journalId },
      filesystemContext(cwd),
    );
    expect(recovered.structuredContent).toMatchObject({
      outcome: "replayed",
      recoveryJournalId: journalId,
    });
    expect(asApply(recovered.structuredContent).status).toBeUndefined();
    expect(planJournalState(cwd, plan)).toBe("committed");
    // The plan's source write and its requirement's document.
    expect(
      readdirSync(path.join(cwd, ".kb", "recovery", "pending-sources")),
    ).toHaveLength(2);
  });

  test("deleting an untracked authored source retires its pending receipt so sync still discovers sources", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const cwd = createGitWorkspace();
    roots.push(cwd);
    // An upsert that created this file left it untracked with a receipt; the
    // operator then deletes it before staging it.
    const relative = ".kb/facts/FACT-untracked-delete.md";
    const body = "---\nid: FACT-untracked-delete\n---\n";
    mkdirSync(path.join(cwd, ".kb", "facts"), { recursive: true });
    writeFileSync(path.join(cwd, relative), body);
    writePendingSourceReceipt(cwd, relative, sha(body));
    const pendingRoot = path.join(cwd, ".kb", "recovery", "pending-sources");
    expect(readdirSync(pendingRoot)).toHaveLength(1);

    const plan = compilePlan({
      sourceWrites: [
        {
          path: relative,
          mode: "delete",
          beforeHash: sha(body),
          afterHash: null,
        },
      ],
    });
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(cwd),
    );

    expect(result.structuredContent.outcome).toBe("applied");
    expect(existsSync(path.join(cwd, relative))).toBe(false);
    // Only the step's new document keeps a receipt.
    expect(readdirSync(pendingRoot)).toEqual([
      `${sha(".kb/requirements/REQ-apply.md")}.json`,
    ]);
    await expect(
      discoverSourceFiles(cwd, { trackedOnly: true }),
    ).resolves.toBeDefined();
  });
});
