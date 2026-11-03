import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { InputError, OperationError } from "../../../src/cli-errors.js";
import {
  PLAN_APPLY_JOURNAL_VERSION,
  type PlanApplyJournal,
  createPlanApplyJournal,
  openPlanApplyJournal,
  openPlanApplyJournalById,
  planApplyJournalId,
  publishJournaledFiles,
  recoverPlanApplyJournal,
  storeFingerprint,
  withPlanRecoveryNotes,
} from "../../../src/operations/mutation/plan-apply-journal.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import { scratch } from "../helpers.js";

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const planHash = "a".repeat(64);
const journalId = planApplyJournalId(planHash);

function workspace(attached = true): {
  root: string;
  context: OperationContext;
} {
  const ws = scratch({ ".kb/.keep": "" });
  cleanups.push(ws.cleanup);
  const context: OperationContext = {
    workspaceRoot: ws.root,
    signal: new AbortController().signal,
    fs: nodeFilesystem,
    branchAttachment: attached
      ? {
          gitBranch: "develop",
          kbBranch: "develop",
          storePath: path.join(ws.root, ".kb", "branches", "missing"),
          kind: "exact",
          migrationRequired: false,
        }
      : { error: "no branch", code: "DETACHED_HEAD" },
  } as OperationContext;
  return { root: ws.root, context };
}

function journal(state: PlanApplyJournal["state"]): PlanApplyJournal {
  return {
    version: PLAN_APPLY_JOURNAL_VERSION,
    journalId,
    planHash,
    branch: "develop",
    state,
    createdAt: "2026-09-05T00:00:00.000Z",
    updatedAt: "2026-09-05T00:00:00.000Z",
    files: [],
    store: {
      entityIds: ["REQ-1"],
      preCommitFingerprint: "f".repeat(64),
      entries: [
        { entity: {}, relationships: [], skipContradictionCheck: false },
      ],
    },
    summary: {
      planPaths: [],
      filePaths: [],
      changedEntities: 1,
      changedRelationships: 0,
    },
  };
}

const failingProlog = (error?: string): PrologPort =>
  ({
    query: async () => ({ success: false, bindings: {}, error }),
  }) as unknown as PrologPort;

describe("plan journal files", () => {
  test("reports a journal that cannot be published", () => {
    const { root } = workspace();
    // Too long for a file name once the temporary suffix is added, so even
    // the temporary file is never created.
    const target = path.join(root, `${"j".repeat(240)}.json`);
    expect(() => createPlanApplyJournal(target, journal("prepared"))).toThrow(
      "ENAMETOOLONG",
    );
  });

  test("refuses journals it cannot read or parse", () => {
    const { context } = workspace();
    const journalDirectory = path.dirname(
      openPlanApplyJournal(context, planHash).journalPath,
    );
    const target = path.join(journalDirectory, `${journalId}.json`);
    mkdirSync(target, { recursive: true });
    expect(() => openPlanApplyJournalById(context, journalId)).toThrow(
      `Plan application journal ${target} cannot be recovered automatically: unreadable (`,
    );
    const other = planApplyJournalId("b".repeat(64));
    const otherPath = path.join(journalDirectory, `${other}.json`);
    writeFileSync(otherPath, JSON.stringify({ version: "old" }));
    expect(() => openPlanApplyJournalById(context, other)).toThrow(
      "invalid (journal fields are missing or inconsistent)",
    );
    writeFileSync(otherPath, "{");
    expect(() => openPlanApplyJournalById(context, other)).toThrow(
      `Plan application journal ${otherPath} cannot be recovered automatically: invalid (`,
    );
  });

  test("needs a resolved branch and an existing journal id", () => {
    const detached = workspace(false).context;
    expect(() => openPlanApplyJournal(detached, planHash)).toThrow(
      "Apply plan failed before any write: the KB branch could not be resolved for the plan journal",
    );
    expect(() => openPlanApplyJournalById(detached, journalId)).toThrow(
      "Plan journal recovery failed: the KB branch could not be resolved",
    );
    const { context } = workspace();
    expect(() => openPlanApplyJournalById(context, "plan-apply-x")).toThrow(
      "Plan journal ID is invalid",
    );
    expect(() => openPlanApplyJournalById(context, journalId)).toThrow(
      `Plan journal ${journalId} does not exist for branch develop`,
    );
  });
});

describe("publishJournaledFiles deletes", () => {
  const deletion = {
    path: "docs/gone.md",
    origin: "plan",
    mode: "delete",
    beforeHash: null,
    afterHash: null,
    before: null,
    after: null,
  } as const;

  test("needs a filesystem that can unlink", async () => {
    const { root } = workspace();
    const { unlink: _unlink, ...withoutUnlink } = nodeFilesystem;
    await expect(
      publishJournaledFiles(withoutUnlink, root, [deletion]),
    ).rejects.toThrow(
      "Apply plan failed: delete requires filesystem unlink support: docs/gone.md",
    );
  });

  test("treats a file that is already gone as deleted, and reports other failures", async () => {
    const { root } = workspace();
    await publishJournaledFiles(nodeFilesystem, root, [deletion]);
    const denied = Object.assign(new Error("denied"), { code: "EACCES" });
    await expect(
      publishJournaledFiles(
        {
          ...nodeFilesystem,
          unlink: async () => {
            throw denied;
          },
        },
        root,
        [deletion],
      ),
    ).rejects.toBe(denied);
  });
});

describe("plan journal recovery", () => {
  test("reports a failed fingerprint query", async () => {
    await expect(
      storeFingerprint(failingProlog("boom"), ["REQ-1"]),
    ).rejects.toThrow("store fingerprint query failed: boom");
    await expect(storeFingerprint(failingProlog(), [])).rejects.toThrow(
      "store fingerprint query failed: unknown error",
    );
  });

  test("needs a filesystem and, mid-commit, the branch engine", async () => {
    const { context } = workspace();
    const handle = (state: PlanApplyJournal["state"]) => ({
      journalPath: path.join(context.workspaceRoot, "journal.json"),
      journal: journal(state),
    });
    await expect(
      recoverPlanApplyJournal(
        { ...context, fs: undefined },
        handle("prepared"),
        {
          prolog: async () => undefined,
        },
      ),
    ).rejects.toThrow(
      `Plan journal ${journalId} recovery requires a filesystem-capable runtime`,
    );
    const noEngine = await recoverPlanApplyJournal(
      context,
      handle("store_committing"),
      { prolog: async () => undefined },
    ).catch((error: OperationError) => error);
    expect(noEngine).toBeInstanceOf(OperationError);
    expect((noEngine as OperationError).code).toBe(
      "PLAN_APPLY_RECOVERY_REQUIRED",
    );
    expect((noEngine as OperationError).message).toContain(
      "recovering it needs the branch engine, which is unavailable",
    );
    await expect(
      recoverPlanApplyJournal(context, handle("store_committing"), {
        prolog: async () => failingProlog("store offline"),
      }),
    ).rejects.toThrow(
      `Plan journal ${journalId} was interrupted during its store commit and the store could not be inspected (store fingerprint query failed: store offline). Retry kb_apply_plan with recoveryJournalId=${journalId}`,
    );
  });

  test("adds recovery notes to typed errors without changing their class", () => {
    const operation = withPlanRecoveryNotes(
      new OperationError("CODE", "failed", false),
      ["rolled back."],
    ) as OperationError;
    expect(operation).toBeInstanceOf(OperationError);
    expect([
      operation.code,
      operation.detail,
      operation.retryable,
    ]).toStrictEqual([
      "CODE",
      "failed [settled before this failure: rolled back.]",
      false,
    ]);
    const input = withPlanRecoveryNotes(new InputError("BAD", "bad input"), [
      "a.",
      "b.",
    ]) as InputError;
    expect(input).toBeInstanceOf(InputError);
    expect([input.code, input.detail]).toStrictEqual([
      "BAD",
      "bad input [settled before this failure: a. b.]",
    ]);
  });
});
