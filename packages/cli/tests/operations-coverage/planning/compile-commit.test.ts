import { describe, expect, spyOn, test } from "bun:test";
import path from "node:path";
import { OperationError } from "../../../src/cli-errors.js";
import * as journalModule from "../../../src/operations/mutation/plan-apply-journal.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import { isWhatIfGoal } from "../../helpers/what-if.js";
import { apply, compilePlan, ctx, sha, spies } from "./fixtures.js";

const existing = "---\nid: REQ-apply\n---\n";
const realOpen = journalModule.openPlanApplyJournal;
const realRecord = journalModule.recordPlanApplyJournal;

describe("compile plan commit", () => {
  test("commits in one store transaction without a filesystem", async () => {
    const context = ctx({ fs: null });
    const result = await apply(compilePlan(), context);
    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      changedEntities: 1,
      changedPaths: [],
    });
    const rejected = ctx({
      fs: null,
      answer: (goal) =>
        goal.includes("kb_commit_upsert")
          ? { success: false, bindings: {}, error: "constraint violated" }
          : undefined,
    });
    await expect(apply(compilePlan(), rejected)).rejects.toThrow(
      "Apply plan failed; no change was applied: the store rejected the plan's batch transaction: ",
    );
  });

  test("stops before any write when the store rejects the staged plan", async () => {
    const context = ctx({
      answer: (goal) =>
        isWhatIfGoal(goal)
          ? { success: false, bindings: {}, error: "bad stage" }
          : undefined,
    });
    await expect(apply(compilePlan(), context)).rejects.toThrow(
      "Apply plan failed before any write: the store rejected the staged plan: bad stage",
    );
    const silent = ctx({
      answer: (goal) =>
        isWhatIfGoal(goal) ? { success: false, bindings: {} } : undefined,
    });
    await expect(apply(compilePlan(), silent)).rejects.toThrow(
      "the store rejected the staged plan: unknown error",
    );
  });

  test("rejects a source write listed twice or a document the plan deletes", async () => {
    const body = "# doc\n";
    const write = {
      path: "docs/a.md",
      mode: "write" as const,
      beforeHash: null,
      afterHash: sha(body),
      body,
    };
    await expect(
      apply(compilePlan({ sourceWrites: [write, write] }), ctx()),
    ).rejects.toThrow(
      "Apply plan failed: sourceWrites lists docs/a.md more than once",
    );
    const context = ctx();
    await nodeFilesystem.mkdir(
      path.join(context.workspaceRoot, ".kb/requirements"),
    );
    await nodeFilesystem.writeFile(
      path.join(context.workspaceRoot, ".kb/requirements/REQ-apply.md"),
      existing,
    );
    await expect(
      apply(
        compilePlan({
          sourceWrites: [
            {
              path: ".kb/requirements/REQ-apply.md",
              mode: "delete",
              beforeHash: sha(existing),
              afterHash: null,
            },
          ],
        }),
        context,
      ),
    ).rejects.toThrow(
      "Apply plan failed: step REQ-apply writes .kb/requirements/REQ-apply.md, which the plan deletes",
    );
  });

  test("refuses a plan with an unfinished journal", async () => {
    spies.push(
      spyOn(journalModule, "openPlanApplyJournal").mockImplementation(
        (context, hash) => ({
          ...realOpen(context, hash),
          existing: { state: "prepared" } as never,
        }),
      ),
    );
    const plan = compilePlan();
    await expect(apply(plan, ctx())).rejects.toThrow(
      `Plan ${plan.planHash} has an unfinished journal `,
    );
  });

  test("stops before any write when the store cannot be fingerprinted", async () => {
    spies.push(
      spyOn(journalModule, "storeFingerprint").mockRejectedValue(
        new Error("no store"),
      ),
    );
    await expect(apply(compilePlan(), ctx())).rejects.toThrow(
      "Apply plan failed before any write: the store could not be fingerprinted for the plan journal: no store",
    );
  });

  test("keeps the journal when restoring after a failed publish also fails", async () => {
    spies.push(
      spyOn(journalModule, "publishJournaledFiles").mockRejectedValue(
        new OperationError("SOURCE_PATH_INVALID", "publish failed", false),
      ),
    );
    const plan = compilePlan();
    const restored = await apply(plan, ctx()).catch(
      (error: OperationError) => error,
    );
    expect(restored).toBeInstanceOf(OperationError);
    expect((restored as OperationError).code).toBe("SOURCE_PATH_INVALID");
    expect((restored as OperationError).message).toStartWith(
      "Apply plan failed while publishing its source writes; no change was applied (store unchanged, ",
    );
    spies.push(
      spyOn(journalModule, "restoreJournaledFiles").mockRejectedValue(
        new Error("restore failed"),
      ),
    );
    const kept = await apply(plan, ctx()).catch(
      (error: OperationError) => error,
    );
    expect((kept as OperationError).code).toBe("PLAN_APPLY_RECOVERY_REQUIRED");
    expect((kept as OperationError).message).toContain(
      `Plan ${plan.planHash} failed while publishing its source writes (publish failed), and restoring its source writes also failed (restore failed).`,
    );
  });

  test("rolls back when the store commit cannot be journaled", async () => {
    spies.push(
      spyOn(journalModule, "recordPlanApplyJournal").mockImplementation(
        (handle, update) => {
          if (update.state === "store_committing") throw new Error("disk full");
          if (update.state === "rolled_back") throw new Error("still full");
          return realRecord(handle, update);
        },
      ),
    );
    await expect(apply(compilePlan(), ctx())).rejects.toThrow(
      "Apply plan failed while journaling its store commit; no change was applied (store unchanged, 1 source file(s) restored from journal ",
    );
  });

  test("rolls back when the steps fail against the published source writes", async () => {
    let lookups = 0;
    const context = ctx({
      answer: (goal) => {
        // The second lookup is the revalidation after publishing.
        if (goal.startsWith("once(kb_entity('REQ-apply'") && ++lookups === 2)
          throw new Error("store went away");
        return undefined;
      },
    });
    const body = "# doc\n";
    await expect(
      apply(
        compilePlan({
          sourceWrites: [
            {
              path: "docs/a.md",
              mode: "write",
              beforeHash: null,
              afterHash: sha(body),
              body,
            },
          ],
        }),
        context,
      ),
    ).rejects.toThrow(
      "Apply plan failed validation against its published source writes; no change was applied (store unchanged, 2 source file(s) restored from journal ",
    );
    expect(
      await nodeFilesystem
        .readFile(path.join(context.workspaceRoot, "docs/a.md"))
        .catch(() => "gone"),
    ).toBe("gone");
  });
});
