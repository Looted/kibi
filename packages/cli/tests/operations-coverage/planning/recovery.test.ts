import { describe, expect, spyOn, test } from "bun:test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import * as deleteModule from "../../../src/operations/mutation/delete.js";
import * as journalModule from "../../../src/operations/mutation/plan-apply-journal.js";
import { executeApplyPlan } from "../../../src/operations/planning/apply-plan.js";
import * as discoveryExecutors from "../../../src/public/operations/discovery-executors.js";
import { buildMigrationPlan } from "../../../src/public/operations/migration-plan.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import {
  apply,
  cleanUpAfterEach,
  compilePlan,
  ctx,
  sha,
  spies,
} from "./fixtures.js";

cleanUpAfterEach();

const journal = {
  branch: "develop",
  summary: {
    planPaths: [],
    filePaths: ["docs/a.md"],
    changedEntities: 2,
    changedRelationships: 1,
  },
};
const recovery = (planHash: string, extra: Record<string, unknown> = {}) => ({
  journalId: "plan-apply-0123456789abcdef",
  planHash,
  action: "completed" as const,
  state: "committed" as const,
  restoredPaths: ["docs/a.md"],
  detail: "Finished the interrupted plan.",
  ...extra,
});

function settle(recoveries: readonly ReturnType<typeof recovery>[]): void {
  spies.push(
    spyOn(journalModule, "settlePendingPlanApplyJournals").mockResolvedValue(
      recoveries as never,
    ),
    spyOn(journalModule, "openPlanApplyJournalById").mockReturnValue({
      journalPath: "unused",
      journal,
    } as never),
  );
}

describe("plan journal recovery", () => {
  test("needs a filesystem-capable runtime", async () => {
    await expect(
      executeApplyPlan(
        { recoveryJournalId: "plan-apply-0123456789abcdef" },
        ctx({ fs: null }),
      ),
    ).rejects.toThrow(
      "Plan journal recovery requires a filesystem-capable runtime",
    );
  });

  test("reports a recovery that left a pending-source receipt to repair", async () => {
    settle([]);
    spies.push(
      spyOn(journalModule, "recoverPlanApplyJournal").mockResolvedValue(
        recovery("f".repeat(64), {
          receiptFailure: "receipt store down",
        }) as never,
      ),
    );
    const result = await executeApplyPlan(
      { recoveryJournalId: "plan-apply-0123456789abcdef" },
      ctx(),
    );
    expect(result.structuredContent).toMatchObject({
      outcome: "replayed",
      changedEntities: 2,
      changedRelationships: 1,
      status: "committed_with_repairs",
      effectFailures: [
        {
          kind: "pending-source-receipt",
          errorCode: "PENDING_SOURCE_RECEIPT_FAILED",
          detail: "receipt store down",
        },
      ],
      nextActions: [
        {
          operation: "kb_apply_plan",
          input: { recoveryJournalId: "plan-apply-0123456789abcdef" },
          required: true,
        },
      ],
    });
  });

  test("returns the completion when the re-applied plan was just recovered", async () => {
    const plan = compilePlan();
    settle([recovery(plan.planHash)]);
    const result = await apply(plan, ctx());
    expect(result.structuredContent).toMatchObject({
      outcome: "replayed",
      planHash: plan.planHash,
      changedPaths: ["docs/a.md"],
      recoveryJournalId: "plan-apply-0123456789abcdef",
    });
  });
});

describe("recovery report on other results", () => {
  const other = recovery("e".repeat(64), {
    action: "rolled_back",
    state: "rolled_back",
  });

  test("adds recovered journals to a result's notes", async () => {
    settle([other]);
    spies.push(
      spyOn(discoveryExecutors, "executeStatus").mockResolvedValue({
        content: [],
        structuredContent: {
          branch: "develop",
          snapshotId: "missing",
          syncedAt: null,
          dirty: false,
          syncState: "unknown",
        },
      } as never),
    );
    const plan = buildMigrationPlan({
      actions: [
        {
          id: "mig-1",
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
          allowedDispositions: ["fixed"],
        },
      ],
    });
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash, approvedActionIds: ["mig-1"] },
      ctx(),
    );
    const notes = (result.structuredContent as unknown as { notes: string[] })
      .notes;
    expect(notes.at(-1)).toBe("Finished the interrupted plan.");
    expect(result.content[0]?.text).toEndWith(
      " Finished the interrupted plan.",
    );
  });

  test("leaves a result without notes as it is", async () => {
    settle([other]);
    spies.push(
      spyOn(deleteModule, "executeDelete").mockResolvedValue({
        content: [],
        structuredContent: { deleted: 1, skipped: 0, errors: [] },
      } as never),
    );
    const body = {
      version: "kibi.entity-deletion-plan.v1" as const,
      entityIds: ["FACT-x"],
      sourceHashes: {},
      sourceWrites: [],
      supersessionRequired: false,
    };
    const planHash = sha(JSON.stringify(body));
    const result = await executeApplyPlan(
      { plan: { ...body, planHash }, approvedPlanHash: planHash } as never,
      ctx(),
    );
    expect(result.structuredContent).not.toHaveProperty("notes");
    expect(result.content[0]?.text).toEndWith(
      " Finished the interrupted plan.",
    );
  });
});

describe("bootstrap recovery lock handling", () => {
  const journalId = "bootstrap-0123456789abcdef";

  test("ignores an unreadable bootstrap journal when taking the lock", async () => {
    await expect(
      executeApplyPlan({ recoveryJournalId: journalId }, ctx()),
    ).rejects.toThrow();
  });

  test("releases a reclaimed lock when the reclaim cannot be recorded", async () => {
    const context = ctx({
      fs: {
        ...nodeFilesystem,
        writeFile: async (target: string, body: string) => {
          if (target.endsWith(`${journalId}.json`))
            throw new Error("journal read-only");
          return nodeFilesystem.writeFile(target, body);
        },
      },
    });
    const recoveryDir = path.join(context.workspaceRoot, ".kb", "recovery");
    mkdirSync(path.join(recoveryDir, "source-authoring.lock"), {
      recursive: true,
    });
    writeFileSync(
      path.join(recoveryDir, "source-authoring.lock", "owner.json"),
      JSON.stringify({ pid: 2147483646, token: "dead", acquiredAt: 1 }),
    );
    const journalPath = path.join(recoveryDir, `${journalId}.json`);
    writeFileSync(
      journalPath,
      JSON.stringify({ kind: "bootstrap", state: "applying" }),
    );
    await expect(
      executeApplyPlan({ recoveryJournalId: journalId }, context),
    ).rejects.toThrow("journal read-only");
    expect(JSON.parse(readFileSync(journalPath, "utf8"))).toStrictEqual({
      kind: "bootstrap",
      state: "applying",
    });
  });
});
