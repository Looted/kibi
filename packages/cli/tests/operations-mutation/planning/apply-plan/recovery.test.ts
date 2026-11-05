import { describe, expect, spyOn, test } from "bun:test";
import * as deleteModule from "../../../../src/operations/mutation/delete.js";
import * as journalModule from "../../../../src/operations/mutation/plan-apply-journal.js";
import type { PlanApplyRecovery } from "../../../../src/operations/mutation/plan-apply-journal.js";
import { executeApplyPlan } from "../../../../src/operations/planning/apply-plan.js";
import * as discoveryExecutors from "../../../../src/public/operations/discovery-executors.js";
import type { OperationContext } from "../../../../src/public/operations/runtime-types.js";
import {
  HASH,
  type HarnessOptions,
  cleanUpAfterEach,
  compilePlan,
  deletionPlan,
  harness,
  migrationPlan,
  stubStatus,
  track,
} from "./harness.js";

cleanUpAfterEach();

const JOURNAL = "plan-apply-0123456789abcdef";

const recovery = (
  extra: Partial<PlanApplyRecovery> = {},
): PlanApplyRecovery => ({
  journalId: JOURNAL,
  planHash: "f".repeat(64),
  action: "completed",
  state: "committed",
  restoredPaths: ["docs/a.md"],
  detail: "Completed an interrupted plan.",
  ...extra,
});

const journal = {
  branch: "develop",
  summary: {
    changedEntities: 3,
    changedRelationships: 2,
    filePaths: ["docs/a.md", "docs/b.md"],
  },
};

function settle(...recoveries: PlanApplyRecovery[]) {
  return track(
    spyOn(journalModule, "settlePendingPlanApplyJournals").mockImplementation(
      async () => recoveries,
    ),
  );
}
function openById() {
  return track(
    spyOn(journalModule, "openPlanApplyJournalById").mockImplementation(
      () => ({ journal }) as never,
    ),
  );
}

function recover(options: HarnessOptions = {}, journalId = JOURNAL) {
  const h = harness(options);
  const committed: number[] = [];
  const run = () =>
    executeApplyPlan({ recoveryJournalId: journalId } as never, h.context, () =>
      committed.push(1),
    );
  return { ...h, committed, run };
}

describe("plan journal recovery", () => {
  test("a recovery this call settled reports its completion", async () => {
    const settled = settle(recovery());
    openById();
    stubStatus({ snapshotId: "after" });
    const s = recover();
    const result = await s.run();
    expect(s.committed).toEqual([1]);
    expect(settled.mock.calls[0]?.[2]).toBe(JOURNAL);
    expect(result).toEqual({
      content: [{ type: "text", text: "Completed an interrupted plan." }],
      structuredContent: {
        version: "kibi.plan-apply-result.v1",
        outcome: "replayed",
        planHash: "f".repeat(64),
        changedEntities: 3,
        changedRelationships: 2,
        changedPaths: ["docs/a.md"],
        finalSnapshots: {
          branch: "develop",
          kbSnapshotId: "after",
          workspaceSnapshot: HASH,
        },
        validationSummary: {
          stepsValidated: 0,
          stepsApplied: 3,
          sourceHashesChecked: 2,
          notes: ["Completed an interrupted plan."],
        },
        recoveryJournalId: JOURNAL,
      } as never,
    });
  });

  test("a rolled-back recovery changes nothing", async () => {
    settle(recovery({ action: "rolled_back", state: "rolled_back" }));
    openById();
    stubStatus();
    const result = await recover().run();
    expect(result.structuredContent).toMatchObject({
      outcome: "rolled_back",
      changedEntities: 0,
      changedRelationships: 0,
      validationSummary: { stepsApplied: 0 },
    });
  });

  test("an already terminal journal is recovered on demand", async () => {
    settle();
    openById();
    const recoverJournal = track(
      spyOn(journalModule, "recoverPlanApplyJournal").mockImplementation(
        async () => recovery({ action: "none" }),
      ),
    );
    stubStatus();
    const s = recover();
    const result = await s.run();
    expect(s.committed).toEqual([]);
    expect(result.structuredContent).toMatchObject({
      outcome: "replayed",
      changedEntities: 0,
    });
    const options = recoverJournal.mock.calls[0]?.[2] as {
      prolog: () => Promise<unknown>;
    };
    expect(await options.prolog()).toBe(s.context.prolog);
  });

  test("the lazy Prolog runtime serves journal recovery", async () => {
    settle();
    openById();
    const recoverJournal = track(
      spyOn(journalModule, "recoverPlanApplyJournal").mockImplementation(
        async () => recovery({ action: "none" }),
      ),
    );
    const settled = settle();
    stubStatus();
    const donor = harness();
    const s = recover({
      prolog: null,
      extra: { ensureProlog: async () => donor.context.prolog },
    });
    await s.run();
    const options = recoverJournal.mock.calls[0]?.[2] as {
      prolog: () => Promise<unknown>;
    };
    expect(await options.prolog()).toBe(donor.context.prolog);
    const settleOptions = settled.mock.calls[0]?.[1] as {
      prolog: () => Promise<unknown>;
    };
    expect(await settleOptions.prolog()).toBe(donor.context.prolog);
    const bare = recover({ prolog: null });
    await bare.run();
    const bareSettle = settled.mock.calls[1]?.[1] as {
      prolog: () => Promise<unknown>;
    };
    expect(await bareSettle.prolog()).toBeUndefined();
    const bareOptions = recoverJournal.mock.calls[1]?.[2] as {
      prolog: () => Promise<unknown>;
    };
    expect(await bareOptions.prolog()).toBeUndefined();
  });

  test("a recovery for another journal is not reused", async () => {
    settle(recovery({ journalId: "plan-apply-ffffffffffffffff" }));
    openById();
    const recoverJournal = track(
      spyOn(journalModule, "recoverPlanApplyJournal").mockImplementation(
        async () => recovery({ action: "none", detail: "fresh" }),
      ),
    );
    stubStatus();
    const result = await recover().run();
    expect(recoverJournal).toHaveBeenCalledTimes(1);
    expect(result.content[0]?.text).toBe(
      "fresh Completed an interrupted plan.",
    );
  });

  test("a receipt failure asks for another recovery", async () => {
    settle(recovery({ receiptFailure: "receipt failed" }));
    openById();
    stubStatus();
    const result = await recover().run();
    expect(result.structuredContent).toMatchObject({
      status: "committed_with_repairs",
      effectFailures: [
        {
          kind: "pending-source-receipt",
          errorCode: "PENDING_SOURCE_RECEIPT_FAILED",
          detail: "receipt failed",
        },
      ],
      nextActions: [
        {
          operation: "kb_apply_plan",
          input: { recoveryJournalId: JOURNAL },
          reason:
            "The plan is committed, but binding its new source files to pending-source receipts failed; recover the journal again to finish them.",
          required: true,
        },
      ],
    });
  });

  test.each([
    ["no status", null, {}],
    ["no workspace", {}, { git: null }],
  ])("%s keeps the recovered snapshots", async (_name, status, options) => {
    settle(recovery());
    openById();
    stubStatus(status);
    const result = await recover(options as HarnessOptions).run();
    expect(result.structuredContent).toMatchObject({
      finalSnapshots: {
        branch: "develop",
        kbSnapshotId: "recovered",
        workspaceSnapshot: "recovered",
      },
    });
  });

  test("a failing snapshot readback is informational", async () => {
    settle(recovery());
    openById();
    track(
      spyOn(discoveryExecutors, "executeStatus").mockImplementation(
        async () => {
          throw new Error("status down");
        },
      ),
    );
    const result = await recover().run();
    expect(result.structuredContent).toMatchObject({
      finalSnapshots: { kbSnapshotId: "recovered" },
    });
  });

  test("journal recovery needs a filesystem", async () => {
    const s = recover({ fs: null });
    await expect(s.run()).rejects.toThrow(
      "Plan journal recovery requires a filesystem-capable runtime",
    );
  });

  test("without a filesystem nothing is settled", async () => {
    const settled = settle(recovery());
    stubStatus({ snapshotId: "missing" });
    const plan = compilePlan();
    await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      harness({ fs: null }).context,
    );
    expect(settled).not.toHaveBeenCalled();
  });
});

describe("settled journals reported with this call", () => {
  test("a compile plan this call completed returns that completion", async () => {
    const plan = compilePlan();
    settle(recovery({ planHash: plan.planHash }));
    const opened = openById();
    stubStatus({ snapshotId: "missing" });
    const h = harness();
    const committed: number[] = [];
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      h.context,
      () => committed.push(1),
    );
    expect(opened.mock.calls[0]?.[1]).toBe(JOURNAL);
    expect(committed).toEqual([1]);
    expect(result.structuredContent).toMatchObject({
      outcome: "replayed",
      planHash: plan.planHash,
      recoveryJournalId: JOURNAL,
      validationSummary: { notes: ["Completed an interrupted plan."] },
    });
    expect(
      (result.structuredContent as unknown as { validationSummary: object })
        .validationSummary,
    ).not.toHaveProperty("recoveredJournals");
  });

  test.each([
    ["another plan", { planHash: "e".repeat(64) }],
    ["a rollback", { action: "rolled_back" as const }],
  ])("%s is reported beside a fresh apply", async (_name, extra) => {
    const plan = compilePlan();
    const settled = recovery({
      ...extra,
      planHash: (extra as { planHash?: string }).planHash ?? plan.planHash,
    });
    settle(settled);
    stubStatus({ snapshotId: "missing" });
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      harness().context,
    );
    expect(result.content[0]?.text).toBe(
      `Applied plan ${plan.planHash.slice(0, 12)}: 1 step(s) committed in one store transaction. Completed an interrupted plan.`,
    );
    const summary = (
      result.structuredContent as unknown as {
        validationSummary: { notes: string[]; recoveredJournals: unknown };
      }
    ).validationSummary;
    expect(summary.notes.at(-1)).toBe("Completed an interrupted plan.");
    expect(summary.notes).toHaveLength(2);
    expect(summary.recoveredJournals).toEqual([
      {
        journalId: JOURNAL,
        planHash: settled.planHash,
        action: settled.action,
        restoredPaths: ["docs/a.md"],
      },
    ]);
  });

  test("terminal journals are not reported", async () => {
    const plan = compilePlan();
    settle(recovery({ action: "none" }));
    stubStatus({ snapshotId: "missing" });
    const committed: number[] = [];
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      harness().context,
      () => committed.push(1),
    );
    expect(committed).toEqual([1]);
    expect(
      (result.structuredContent as unknown as { validationSummary: object })
        .validationSummary,
    ).not.toHaveProperty("recoveredJournals");
  });

  test("migration results carry the notes", async () => {
    settle(recovery());
    stubStatus();
    const plan = migrationPlan([{ id: "m1", code: "no_such_code" }], {
      expected: {
        branch: null,
        kbBranch: null,
        kbSnapshotId: null,
        workspaceSnapshot: null,
        configHash: null,
      },
    } as never);
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash, approvedActionIds: ["m1"] },
      harness().context,
    );
    expect(
      (result.structuredContent as unknown as { notes: string[] }).notes,
    ).toEqual([
      "Migration actions were applied sequentially; rerun kibi status, check, and complete coverage to obtain the next plan.",
      "Completed an interrupted plan.",
    ]);
    expect(result.content[0]?.text).toEndWith(
      " Completed an interrupted plan.",
    );
  });

  test("results without notes or summary only gain the text", async () => {
    settle(recovery());
    track(
      spyOn(deleteModule, "executeDelete").mockImplementation(
        async () =>
          ({ content: [], structuredContent: { deleted: 1 } }) as never,
      ),
    );
    const plan = deletionPlan();
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      harness().context,
    );
    expect(result.content).toEqual([
      {
        type: "text",
        text: `Applied entity deletion plan ${plan.planHash.slice(0, 12)}. Completed an interrupted plan.`,
      },
    ]);
    expect(result.structuredContent).toEqual({
      version: "kibi.entity-deletion-apply-result.v1",
      outcome: "applied",
      planHash: plan.planHash,
      deleted: 1,
      sourcePaths: [],
    } as never);
  });

  test("a summary without notes starts its list", async () => {
    settle(recovery({ journalId: "plan-apply-ffffffffffffffff" }));
    openById();
    track(
      spyOn(journalModule, "recoverPlanApplyJournal").mockImplementation(
        async () => recovery({ action: "none", detail: "" }),
      ),
    );
    stubStatus();
    const s = recover();
    const result = await s.run();
    expect(result.content[0]?.text).toBe("Completed an interrupted plan.");
    expect(
      (
        result.structuredContent as unknown as {
          validationSummary: { notes: string[] };
        }
      ).validationSummary.notes,
    ).toEqual(["", "Completed an interrupted plan."]);
  });

  test("a failure names the journals settled before it", async () => {
    settle(recovery());
    stubStatus(null);
    const plan = compilePlan();
    await expect(
      executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        harness().context as OperationContext,
      ),
    ).rejects.toThrow(
      "Apply plan failed: status query returned no payload [settled before this failure: Completed an interrupted plan.]",
    );
  });
});
