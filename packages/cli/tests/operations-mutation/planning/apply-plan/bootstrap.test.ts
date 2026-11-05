import { describe, expect, spyOn, test } from "bun:test";
import { writeFileSync } from "node:fs";
import path from "node:path";
import { OperationError } from "../../../../src/cli-errors.js";
import {
  type BootstrapPlanV1,
  bootstrapEmptyKbSnapshotId,
  bootstrapPlanHash,
} from "../../../../src/operations/bootstrap/types.js";
import * as journalModule from "../../../../src/operations/mutation/plan-apply-journal.js";
import * as upsertModule from "../../../../src/operations/mutation/upsert.js";
import * as lockModule from "../../../../src/operations/mutation/workspace-mutation-lock.js";
import { executeApplyPlan } from "../../../../src/operations/planning/apply-plan.js";
import * as discoveryExecutors from "../../../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../../src/public/operations/runtime-types.js";
import {
  HASH,
  type HarnessOptions,
  NOW,
  bootstrapPlan,
  cleanUpAfterEach,
  harness,
  migrationPlan,
  sha,
  track,
} from "./harness.js";

cleanUpAfterEach();

const action = (id: string, dependsOn: string[] = [], extra = {}) => ({
  id,
  kind: "upsert",
  dependsOn,
  payload: {
    type: "req",
    id: `REQ-${id}`,
    properties: { title: id, status: "open" },
    ...extra,
  },
});

type Status = Record<string, unknown> | undefined;

/** Answer `executeStatus` from `statuses` in order, repeating the last. */
function statusSequence(...statuses: Status[]) {
  let call = 0;
  return track(
    spyOn(discoveryExecutors, "executeStatus").mockImplementation(async () => {
      const status = statuses[Math.min(call, statuses.length - 1)];
      call += 1;
      return { content: [], structuredContent: status } as never;
    }),
  );
}
const live = (extra: Record<string, unknown> = {}) => ({
  branch: "develop",
  snapshotId: HASH,
  ...extra,
});

function upserts(
  ...results: Array<Record<string, unknown> | undefined | Error | string>
) {
  let call = 0;
  return track(
    spyOn(upsertModule, "executeUpsert").mockImplementation(async () => {
      const result = results[Math.min(call, results.length - 1)];
      call += 1;
      if (result instanceof Error || typeof result === "string") throw result;
      return { content: [], structuredContent: result } as never;
    }),
  );
}

function setup(
  plan: BootstrapPlanV1 = bootstrapPlan({
    actions: [action("a2", ["a1"]), action("a1")],
  }),
  options: HarnessOptions = {},
) {
  const h = harness(options);
  const journalId = `bootstrap-${plan.planHash.slice(0, 16)}`;
  const journalPath = `.kb/recovery/${journalId}.json`;
  const committed: number[] = [];
  const run = () =>
    executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, h.context, () =>
      committed.push(1),
    );
  const recover = (id = journalId) =>
    executeApplyPlan({ recoveryJournalId: id } as never, h.context, () =>
      committed.push(1),
    );
  const journal = () => JSON.parse(h.read(journalPath));
  const setJournal = (value: unknown) =>
    writeFileSync(path.join(h.root, journalPath), JSON.stringify(value));
  return {
    ...h,
    plan,
    journalId,
    journalPath,
    committed,
    run,
    recover,
    journal,
    setJournal,
  };
}

const checkpoint = {
  branch: "develop",
  kbSnapshotId: HASH,
  workspaceSnapshot: HASH,
};

describe("bootstrap application", () => {
  test("actions apply in dependency order and commit the journal", async () => {
    statusSequence(live());
    const upsert = upserts(
      { created: 1, updated: 0, relationships_created: 2 },
      { created: 0, updated: 1 },
    );
    const progress: unknown[] = [];
    const s = setup(undefined, {
      extra: { onProgress: (event: unknown) => progress.push(event) } as never,
    });
    const result = await s.run();
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: `Applied bootstrap plan ${s.plan.planHash.slice(0, 12)}.`,
        },
      ],
      structuredContent: {
        version: "kibi.plan-apply-result.v1",
        outcome: "applied",
        planHash: s.plan.planHash,
        actionResults: [
          {
            actionId: "a1",
            outcome: "applied",
            detail: "Applied sequentially.",
          },
          {
            actionId: "a2",
            outcome: "applied",
            detail: "Applied sequentially.",
          },
        ],
        changedEntities: 2,
        changedRelationships: 2,
        finalSnapshots: checkpoint,
        recoveryJournalId: s.journalId,
        changedPaths: [],
        validationSummary: {
          stepsValidated: 2,
          stepsApplied: 2,
          sourceHashesChecked: 0,
          notes: [
            "Bootstrap actions applied sequentially through the shared plan executor.",
          ],
        },
      } as never,
    });
    expect(s.committed).toEqual([1, 1]);
    expect(progress).toEqual([
      {
        progress: 0,
        total: 2,
        message: `Bootstrap plan ${s.plan.planHash.slice(0, 12)}: applying 2 of 2 action(s).`,
      },
      { progress: 1, total: 2, message: "Applied a1." },
      { progress: 2, total: 2, message: "Applied a2." },
    ]);
    expect(s.read(s.journalPath)).toBe(
      `${JSON.stringify(
        {
          version: 2,
          kind: "bootstrap",
          plan: s.plan,
          state: "committed",
          checkpoint,
          results: [
            {
              actionId: "a1",
              outcome: "applied",
              detail: "Applied sequentially.",
            },
            {
              actionId: "a2",
              outcome: "applied",
              detail: "Applied sequentially.",
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const [input, passed] = upsert.mock.calls[0] as [unknown, OperationContext];
    expect(input).toStrictEqual({
      type: "req",
      id: "REQ-a1",
      properties: { title: "a1", status: "open" },
      relationships: [],
    });
    expect(passed.sourceFirst).toBe(true);
    expect(passed.prolog).toBe(s.context.prolog);
    expect(passed.sourceMutationLockHeld).toBe(true);
  });

  test("each action is journaled as active before it runs", async () => {
    statusSequence(live());
    const s = setup();
    const seen: unknown[] = [];
    track(
      spyOn(upsertModule, "executeUpsert").mockImplementation(async () => {
        const journal = s.journal();
        seen.push([
          journal.state,
          journal.activeActionId,
          journal.results.length,
        ]);
        return { content: [], structuredContent: {} } as never;
      }),
    );
    await s.run();
    expect(seen).toEqual([
      ["applying", "a1", 0],
      ["applying", "a2", 1],
    ]);
  });

  test("a payload-less upsert counts nothing; progress failures are ignored", async () => {
    statusSequence(live());
    upserts(undefined);
    const s = setup(undefined, {
      extra: {
        onProgress: () => {
          throw new Error("listener");
        },
      } as never,
    });
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      changedEntities: 0,
      changedRelationships: 0,
    });
  });

  test("final snapshots fall back to the planning status", async () => {
    statusSequence(live(), live(), live(), live(), undefined);
    upserts({});
    const s = setup(bootstrapPlan());
    let calls = 0;
    const git = {
      workspaceSnapshot: async () => {
        calls += 1;
        if (calls > 3) throw new Error("gone");
        return {
          version: "kibi.workspace-snapshot.v2",
          hash: HASH,
          dirty: false,
          fileCount: 1,
        };
      },
    };
    const h = setup(bootstrapPlan(), { git: git as never });
    const result = await h.run();
    expect(result.structuredContent).toMatchObject({
      finalSnapshots: {
        branch: "develop",
        kbSnapshotId: HASH,
        workspaceSnapshot: "unknown",
      },
    });
    expect(s.plan.planHash).toBe(h.plan.planHash);
  });

  test("without a filesystem nothing is journaled", async () => {
    statusSequence(live());
    upserts({});
    const s = setup(bootstrapPlan(), { fs: null });
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({ recoveryJournalId: null });
    expect(s.files(".kb/recovery")).toEqual([]);
  });

  test("a lazily provided Prolog runtime is used, a missing one refused", async () => {
    statusSequence(live());
    const upsert = upserts({});
    const donor = harness().context;
    const s = setup(bootstrapPlan(), {
      prolog: null,
      extra: { ensureProlog: async () => donor.prolog },
    });
    await s.run();
    expect((upsert.mock.calls[0]?.[1] as OperationContext).prolog).toBe(
      donor.prolog,
    );
    const bare = setup(bootstrapPlan(), { prolog: null });
    await expect(bare.run()).rejects.toThrow(
      "Bootstrap apply requires a Prolog runtime",
    );
  });

  test("an existing journal refuses a replay of the original plan", async () => {
    statusSequence(live());
    upserts({});
    const s = setup(bootstrapPlan());
    await s.run();
    await expect(s.run()).rejects.toThrow(
      `Bootstrap apply refused: journal ${s.journalId} already exists; recover it with kb_apply_plan recoveryJournalId=${s.journalId} instead of replaying the original plan`,
    );
  });

  test("an unreadable journal path is a first attempt", async () => {
    statusSequence(live());
    upserts({});
    const fs = {
      ...nodeFilesystem,
      readFile: async (file: string) => {
        if (file.endsWith(".json") && file.includes("bootstrap-"))
          throw "unreadable";
        return nodeFilesystem.readFile(file);
      },
    };
    const s = setup(bootstrapPlan(), { fs: fs as never });
    await expect(s.run()).resolves.toBeDefined();
  });

  test("checkpoints bind a missing KB to its empty source state", async () => {
    statusSequence(live(), live({ snapshotId: "missing" }));
    upserts({});
    const s = setup(bootstrapPlan());
    const result = await s.run();
    const empty = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot: HASH,
      sourceHashes: {},
    });
    expect(s.journal().checkpoint.kbSnapshotId).toBe(empty);
    expect(result.structuredContent).toMatchObject({
      finalSnapshots: { kbSnapshotId: "missing" },
    });
  });

  test.each([
    ["no status", undefined, HASH, "unavailable", "unavailable", HASH],
    [
      "a non-hex workspace",
      live({ snapshotId: "missing" }),
      "nothex",
      "develop",
      "missing",
      "nothex",
    ],
    [
      "a suffixed workspace",
      live({ snapshotId: "missing" }),
      `${HASH}0`,
      "develop",
      "missing",
      `${HASH}0`,
    ],
    [
      "a prefixed workspace",
      live({ snapshotId: "missing" }),
      `0${HASH}`,
      "develop",
      "missing",
      `0${HASH}`,
    ],
  ])(
    "a checkpoint with %s",
    async (_name, status, hash, branch, kbSnapshotId, workspaceSnapshot) => {
      statusSequence(live(), status);
      upserts(new Error("store down"));
      let calls = 0;
      const git = {
        workspaceSnapshot: async () => {
          calls += 1;
          return {
            version: "kibi.workspace-snapshot.v2",
            hash: calls === 1 ? HASH : hash,
            dirty: false,
            fileCount: 1,
          };
        },
      };
      const s = setup(bootstrapPlan(), { git: git as never });
      await s.run();
      expect(s.journal().checkpoint).toEqual({
        branch,
        kbSnapshotId,
        workspaceSnapshot,
      });
    },
  );

  test("an unavailable workspace checkpoints as unavailable", async () => {
    statusSequence(live());
    upserts(new Error("store down"));
    let calls = 0;
    const git = {
      workspaceSnapshot: async () => {
        calls += 1;
        if (calls > 1) throw new Error("gone");
        return {
          version: "kibi.workspace-snapshot.v2",
          hash: HASH,
          dirty: false,
          fileCount: 1,
        };
      },
    };
    const s = setup(bootstrapPlan(), { git: git as never });
    await s.run();
    expect(s.journal().checkpoint.workspaceSnapshot).toBe("unavailable");
  });
});

describe("bootstrap action failures", () => {
  test("a repairable failure stops the graph with a resumable journal", async () => {
    statusSequence(live());
    upserts({ created: 1 }, new Error("store down"));
    const s = setup();
    const result = await s.run();
    const text = `Bootstrap plan ${s.plan.planHash.slice(0, 12)} partially applied; repair journal ${s.journalId}.`;
    expect(result).toEqual({
      content: [{ type: "text", text }],
      structuredContent: {
        version: "kibi.plan-apply-result.v1",
        outcome: "partially_applied",
        planHash: s.plan.planHash,
        actionResults: [
          {
            actionId: "a1",
            outcome: "applied",
            detail: "Applied sequentially.",
          },
          { actionId: "a2", outcome: "failed", detail: "store down" },
        ],
        changedEntities: 1,
        changedRelationships: 0,
        finalSnapshots: checkpoint,
        recoveryJournalId: s.journalId,
        changedPaths: [],
        validationSummary: {
          stepsValidated: 2,
          stepsApplied: 1,
          sourceHashesChecked: 0,
          notes: [
            "Bootstrap application stopped at a repairable action failure.",
          ],
        },
        status: "committed_with_repairs",
        effectFailures: [
          { actionId: "a2", detail: "store down", deterministic: false },
        ],
        nextActions: [
          {
            operation: "kb_apply_plan",
            input: { recoveryJournalId: s.journalId },
            reason:
              "Resume the remaining bootstrap actions from the immutable recovery journal; do not retry the original plan.",
            required: true,
          },
        ],
      } as never,
    });
    expect(s.journal()).toMatchObject({
      state: "repair_required",
      activeActionId: "a2",
    });
  });

  test("journal states between actions are checkpointed", async () => {
    statusSequence(live());
    upserts({});
    const seen: unknown[] = [];
    const s = setup();
    (s.context as { onProgress?: unknown }).onProgress = () => {
      const journal = s.journal();
      seen.push([
        journal.state,
        journal.activeActionId,
        journal.results.length,
      ]);
    };
    await s.run();
    expect(seen).toEqual([
      ["applying", undefined, 0],
      ["applying", undefined, 1],
      ["applying", undefined, 2],
    ]);
  });

  test("a rejection after two applied actions counts them", async () => {
    statusSequence(live());
    upserts({}, {}, "Entity validation failed: bad");
    const s = setup(
      bootstrapPlan({
        actions: [action("a1"), action("a2"), action("a3")],
      }),
    );
    const result = await s.run();
    expect(result.content[0]?.text).toBe(
      "Bootstrap plan rejected at a3: Entity validation failed: bad. 2 action(s) committed; re-plan from the current state.",
    );
    expect(result.structuredContent).toMatchObject({
      validationSummary: { stepsValidated: 3, stepsApplied: 2 },
    });
  });

  test("a deterministic failure rejects the plan for good", async () => {
    statusSequence(live());
    upserts({ created: 1 }, "Entity validation failed: bad title");
    const s = setup();
    const result = await s.run();
    expect(result.content).toEqual([
      {
        type: "text",
        text: "Bootstrap plan rejected at a2: Entity validation failed: bad title. 1 action(s) committed; re-plan from the current state.",
      },
    ]);
    expect(result.structuredContent).toMatchObject({
      outcome: "rejected",
      status: "rejected",
      effectFailures: [
        {
          actionId: "a2",
          detail: "Entity validation failed: bad title",
          deterministic: true,
        },
      ],
      validationSummary: {
        notes: [
          "Bootstrap stopped at a deterministic action failure; the journal is terminal. Re-plan from the current state.",
        ],
      },
    });
    expect(
      (result.structuredContent as unknown as { nextActions: unknown })
        .nextActions,
    ).toStrictEqual([
      {
        operation: "kb_plan_bootstrap",
        reason:
          "Re-plan a corrected bootstrap from the current state; this journal cannot be replayed.",
        required: true,
      },
    ]);
    expect(s.journal().state).toBe("rejected");
  });

  test.each([
    ["Relationship validation failed: x", true],
    ["entity validation FAILED", true],
    ["Proposition-complete ingestion failed", true],
    ["Contradiction detected for requirement REQ-x", true],
    ["'type' and 'id' are required", true],
    ["Unsupported step entity type 'x'", true],
    ["every step needs an entity id", true],
    ["Fact validation failed", false],
    ["Proposition ingestion failed", false],
  ])("failure %p is deterministic: %p", async (message, deterministic) => {
    statusSequence(live());
    upserts(new Error(message));
    const s = setup(bootstrapPlan());
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      outcome: deterministic ? "rejected" : "partially_applied",
    });
  });

  test.each([
    ["BOOTSTRAP_PLAN_INVALID", true],
    ["SOURCE_PATH_INVALID", true],
    ["DOCUMENT_PATH_REQUIRED", true],
    ["OTHER", false],
  ])(
    "an operation error %s is deterministic: %p",
    async (code, deterministic) => {
      statusSequence(live());
      upserts(new OperationError(code, "typed failure") as never);
      const s = setup(bootstrapPlan());
      const result = await s.run();
      expect(result.structuredContent).toMatchObject({
        outcome: deterministic ? "rejected" : "partially_applied",
      });
    },
  );

  test("a journal failure while recording a failure needs repair", async () => {
    statusSequence(live());
    upserts("store down");
    let failing = false;
    const fs = {
      ...nodeFilesystem,
      writeFile: async (file: string, data: string) => {
        if (failing) {
          failing = false;
          throw new Error("disk full");
        }
        await nodeFilesystem.writeFile(file, data);
      },
    };
    track(
      spyOn(upsertModule, "executeUpsert").mockImplementation(async () => {
        failing = true;
        throw "store down";
      }),
    );
    const s = setup(bootstrapPlan(), { fs: fs as never });
    const result = await s.run();
    expect(s.journal()).toMatchObject({
      state: "repair_required",
      activeActionId: "a1",
    });
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: `Bootstrap plan ${s.plan.planHash.slice(0, 12)} requires repair; journal ${s.journalId}.`,
        },
      ],
      structuredContent: {
        version: "kibi.plan-apply-result.v1",
        outcome: "partially_applied",
        planHash: s.plan.planHash,
        actionResults: [
          { actionId: "a1", outcome: "failed", detail: "store down" },
        ],
        changedEntities: 0,
        changedRelationships: 0,
        finalSnapshots: checkpoint,
        recoveryJournalId: s.journalId,
        changedPaths: [],
        validationSummary: {
          stepsValidated: 1,
          stepsApplied: 0,
          sourceHashesChecked: 0,
          notes: [
            "Bootstrap application stopped before its full action graph completed.",
          ],
        },
        status: "committed_with_repairs",
        effectFailures: [
          { actionId: "a1", detail: "store down", deterministic: false },
          { kind: "bootstrap", detail: "disk full" },
        ],
        nextActions: [
          {
            operation: "kb_apply_plan",
            input: { recoveryJournalId: s.journalId },
            reason:
              "Resume the remaining bootstrap actions from the immutable recovery journal; do not retry the original plan.",
            required: true,
          },
        ],
      } as never,
    });
  });

  test("a journal failure after an applied action counts it", async () => {
    statusSequence(live());
    let calls = 0;
    let failing = false;
    const fs = {
      ...nodeFilesystem,
      writeFile: async (file: string, data: string) => {
        if (failing) {
          failing = false;
          throw new Error("disk full");
        }
        await nodeFilesystem.writeFile(file, data);
      },
    };
    track(
      spyOn(upsertModule, "executeUpsert").mockImplementation(async () => {
        calls += 1;
        if (calls === 2) {
          failing = true;
          throw new Error("store down");
        }
        return { content: [], structuredContent: {} } as never;
      }),
    );
    const s = setup(undefined, { fs: fs as never });
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      validationSummary: { stepsValidated: 2, stepsApplied: 1 },
      effectFailures: [
        { actionId: "a2", detail: "store down", deterministic: false },
        { kind: "bootstrap", detail: "disk full" },
      ],
    });
  });

  test("a non-Error journal failure is reported as text", async () => {
    statusSequence(live());
    let failing = false;
    const fs = {
      ...nodeFilesystem,
      writeFile: async (file: string, data: string) => {
        if (failing) {
          failing = false;
          throw "disk text";
        }
        await nodeFilesystem.writeFile(file, data);
      },
    };
    track(
      spyOn(upsertModule, "executeUpsert").mockImplementation(async () => {
        failing = true;
        throw new Error("x");
      }),
    );
    const s = setup(bootstrapPlan(), { fs: fs as never });
    const result = await s.run();
    expect(
      (result.structuredContent as unknown as { effectFailures: unknown[] })
        .effectFailures[1],
    ).toEqual({ kind: "bootstrap", detail: "disk text" });
  });

  test("an action committed with repairs stops after its checkpoint", async () => {
    statusSequence(live());
    upserts({
      created: 1,
      relationships_created: 1,
      status: "committed_with_repairs",
      effectFailures: [{ kind: "shard" }, null, [], "x"],
      nextActions: [{ operation: "kb_sync" }, null, ["x"], 3],
    });
    const s = setup();
    const result = await s.run();
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: `Bootstrap plan ${s.plan.planHash.slice(0, 12)} committed an action with repair effects; repair journal ${s.journalId}.`,
        },
      ],
      structuredContent: {
        version: "kibi.plan-apply-result.v1",
        outcome: "partially_applied",
        planHash: s.plan.planHash,
        actionResults: [
          {
            actionId: "a1",
            outcome: "applied",
            detail: "Applied with committed derived effects requiring repair.",
          },
        ],
        changedEntities: 1,
        changedRelationships: 1,
        finalSnapshots: checkpoint,
        recoveryJournalId: s.journalId,
        changedPaths: [],
        validationSummary: {
          stepsValidated: 2,
          stepsApplied: 1,
          sourceHashesChecked: 0,
          notes: [
            "Bootstrap stopped after an authoritative action committed with derived repair effects.",
          ],
        },
        status: "committed_with_repairs",
        effectFailures: [{ kind: "shard", actionId: "a1" }],
        nextActions: [
          { operation: "kb_sync" },
          {
            operation: "kb_apply_plan",
            input: { recoveryJournalId: s.journalId },
            reason:
              "Resume the remaining bootstrap actions from the immutable recovery journal; do not retry the original plan.",
            required: true,
          },
        ],
      } as never,
    });
    expect(s.journal()).toMatchObject({
      state: "repair_required",
      activeActionId: "a1",
    });
    expect(s.committed).toEqual([1]);
  });

  test("repair effects that are not lists are dropped", async () => {
    statusSequence(live());
    upserts({
      status: "committed_with_repairs",
      effectFailures: { kind: "x" },
      nextActions: "x",
    });
    const s = setup(bootstrapPlan());
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      effectFailures: [],
      nextActions: [{ operation: "kb_apply_plan" }],
    });
  });

  test("evidence sources are counted in every summary", async () => {
    const sourceHashes = { "src/a.ts": sha("a") };
    const plan = bootstrapPlan({
      expected: {
        branch: "develop",
        kbSnapshotId: HASH,
        workspaceSnapshot: HASH,
        sourceHashes,
      },
    });
    for (const result of [
      {},
      new Error("store down"),
      { status: "committed_with_repairs" },
    ]) {
      const status = statusSequence(live());
      const upsert = upserts(result as never);
      const s = setup(plan, { files: { "src/a.ts": "a" } });
      const applied = await s.run();
      expect(applied.structuredContent).toMatchObject({
        validationSummary: { sourceHashesChecked: 1 },
      });
      status.mockRestore();
      upsert.mockRestore();
    }
  });
});

describe("bootstrap recovery", () => {
  async function interrupted(
    plan: BootstrapPlanV1 = bootstrapPlan({
      actions: [action("a2", ["a1"]), action("a1"), action("a3", ["a2"])],
    }),
  ) {
    const status = statusSequence(live());
    const upsert = upserts({ created: 1 }, new Error("store down"));
    const s = setup(plan);
    await s.run();
    status.mockRestore();
    upsert.mockRestore();
    return s;
  }

  test("recovery re-checks the journaled action payloads", async () => {
    const s = await interrupted();
    const journal = s.journal();
    const body = {
      ...journal.plan,
      actions: [
        ...journal.plan.actions,
        action("a4", [], { properties: { status: "open" } }),
      ],
    };
    const { planHash: _hash, ...rest } = body;
    const plan = { ...rest, planHash: bootstrapPlanHash(rest) };
    s.setJournal({ ...journal, plan });
    statusSequence(live());
    const upsert = upserts({});
    const error = (await s
      .recover()
      .catch((caught) => caught)) as OperationError;
    expect(error.code).toBe("BOOTSTRAP_PLAN_INVALID");
    expect(error.message).toStartWith("Bootstrap action a4 is invalid: ");
    expect(upsert).not.toHaveBeenCalled();
  });

  test("recovery resumes the remaining actions", async () => {
    const s = await interrupted();
    statusSequence(live());
    const upsert = upserts({ created: 1 });
    const result = await s.recover();
    expect(
      upsert.mock.calls.map(([input]) => (input as { id: string }).id),
    ).toEqual(["REQ-a2", "REQ-a3"]);
    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      actionResults: [
        { actionId: "a1", outcome: "applied", detail: "Applied sequentially." },
        { actionId: "a2", outcome: "applied", detail: "Applied sequentially." },
        { actionId: "a3", outcome: "applied", detail: "Applied sequentially." },
      ],
      changedEntities: 2,
      validationSummary: { stepsValidated: 2, stepsApplied: 3 },
    });
    expect(s.journal().state).toBe("committed");
    expect(s.journal()).not.toHaveProperty("interruptedActions");
    expect(s.journal()).not.toHaveProperty("lockReclaims");
    expect(
      (
        result.structuredContent as unknown as {
          validationSummary: { notes: string[] };
        }
      ).validationSummary.notes,
    ).toEqual([
      "Bootstrap actions applied sequentially through the shared plan executor.",
    ]);
  });

  test("an applied row whose detail reads deterministic is not terminal", async () => {
    const s = await interrupted();
    s.setJournal({
      ...s.journal(),
      results: [
        {
          actionId: "a1",
          outcome: "applied",
          detail: "Entity validation failed",
        },
      ],
    });
    statusSequence(live());
    upserts({});
    await expect(s.recover()).resolves.toBeDefined();
  });

  test("an unavailable checkpoint matches an unavailable live state", async () => {
    const s = await interrupted();
    s.setJournal({
      ...s.journal(),
      checkpoint: {
        branch: "unavailable",
        kbSnapshotId: "unavailable",
        workspaceSnapshot: "unavailable",
      },
    });
    statusSequence(undefined);
    upserts({});
    const result = await executeApplyPlan(
      { recoveryJournalId: s.journalId } as never,
      { ...s.context, git: undefined },
    ).catch((caught: Error) => caught.message);
    expect(result).toBe("Bootstrap apply failed: status returned no payload");
  });

  test("carried facts that are not lists are dropped", async () => {
    const s = await interrupted();
    s.setJournal({ ...s.journal(), lockReclaims: "x", interruptedActions: {} });
    statusSequence(live());
    upserts({});
    await s.recover();
    expect(s.journal()).not.toHaveProperty("lockReclaims");
    expect(s.journal()).not.toHaveProperty("interruptedActions");
  });

  test("recovery keeps only well-formed applied rows", async () => {
    const s = await interrupted();
    const journal = s.journal();
    s.setJournal({
      ...journal,
      results: [
        { actionId: "a1", outcome: "applied", detail: "Applied sequentially." },
        { actionId: "a2", outcome: "skipped", detail: "x" },
        { actionId: "a3", outcome: "applied", detail: 7 },
      ],
    });
    statusSequence(live());
    const upsert = upserts({});
    const result = await s.recover();
    expect(
      upsert.mock.calls.map(([input]) => (input as { id: string }).id),
    ).toEqual(["REQ-a2"]);
    expect(
      (result.structuredContent as unknown as { actionResults: unknown[] })
        .actionResults,
    ).toEqual([
      { actionId: "a1", outcome: "applied", detail: "Applied sequentially." },
      { actionId: "a2", outcome: "applied", detail: "Applied sequentially." },
    ]);
  });

  test("a failed non-deterministic row is retried", async () => {
    const s = await interrupted();
    statusSequence(live());
    const upsert = upserts({});
    const journal = s.journal();
    expect(journal.results[1]).toEqual({
      actionId: "a2",
      outcome: "failed",
      detail: "store down",
    });
    await s.recover();
    expect(upsert).toHaveBeenCalledTimes(2);
  });

  test("a recovery without journal results runs every action", async () => {
    const s = await interrupted();
    const { results: _results, ...journal } = s.journal();
    s.setJournal(journal);
    statusSequence(live());
    const upsert = upserts({});
    await s.recover();
    expect(upsert).toHaveBeenCalledTimes(3);
  });

  test("recovery needs a filesystem and a well-formed id", async () => {
    const offline = harness({ fs: null });
    await expect(
      executeApplyPlan(
        { recoveryJournalId: "bootstrap-0123456789abcdef" } as never,
        offline.context,
      ),
    ).rejects.toThrow(
      "Bootstrap recovery requires a filesystem-capable runtime",
    );
    const h = harness();
    for (const id of [
      "bootstrap-0123",
      "bootstrap-0123456789abcdeF",
      "bootstrap-0123456789abcdef0",
      "bootstrap-x0123456789abcdef",
    ])
      await expect(
        executeApplyPlan({ recoveryJournalId: id } as never, h.context),
      ).rejects.toThrow(/^Bootstrap recovery journal ID is invalid$/);
  });

  test.each([
    ["version", { version: 1 }],
    ["kind", { kind: "source" }],
    ["plan", { plan: undefined }],
  ])("a journal with a bad %s is invalid", async (_name, edit) => {
    const s = await interrupted();
    s.setJournal({ ...s.journal(), ...edit });
    await expect(s.recover()).rejects.toThrow(
      /^Bootstrap recovery journal is invalid$/,
    );
  });

  test("a rejected journal or deterministic failure is terminal", async () => {
    const s = await interrupted();
    const journal = s.journal();
    for (const edit of [
      { state: "rejected" },
      {
        results: [
          {
            actionId: "a1",
            outcome: "applied",
            detail: "Entity validation failed",
          },
          {
            actionId: "a2",
            outcome: "failed",
            detail: "Entity validation failed",
          },
        ],
      },
    ]) {
      s.setJournal({ ...journal, ...edit });
      const error = (await s
        .recover()
        .catch((caught) => caught)) as OperationError;
      expect(error).toBeInstanceOf(OperationError);
      expect(error.code).toBe("BOOTSTRAP_PLAN_REJECTED");
      expect(error.retryable).toBe(false);
      expect(error.message).toBe(
        "Bootstrap recovery refused: deterministic failure is terminal; re-plan from the current state.",
      );
    }
  });

  test("a tampered plan hash is refused", async () => {
    const s = await interrupted();
    const journal = s.journal();
    for (const plan of [
      { ...journal.plan, planHash: `${journal.plan.planHash}0` },
      { ...journal.plan, planHash: `0${journal.plan.planHash}` },
      { ...journal.plan, diagnostics: ["edited"] },
    ]) {
      s.setJournal({ ...journal, plan });
      await expect(s.recover()).rejects.toThrow(
        /^Bootstrap recovery journal plan hash is invalid$/,
      );
    }
    const ready = { ...journal.plan, status: "blocked" };
    s.setJournal({
      ...journal,
      plan: { ...ready, planHash: bootstrapPlanHash(ready) },
    });
    await expect(s.recover()).rejects.toThrow(/status is 'blocked'/);
  });

  test("an uppercase plan hash is accepted", async () => {
    const s = await interrupted();
    const journal = s.journal();
    s.setJournal({
      ...journal,
      plan: { ...journal.plan, planHash: journal.plan.planHash.toUpperCase() },
    });
    statusSequence(live());
    await expect(s.recover()).rejects.toThrow(
      /^Bootstrap recovery journal plan hash is invalid$/,
    );
  });

  test.each([
    ["no checkpoint", undefined],
    ["no branch", { ...checkpoint, branch: "" }],
    ["no KB snapshot", { ...checkpoint, kbSnapshotId: "" }],
    ["no workspace snapshot", { ...checkpoint, workspaceSnapshot: "" }],
  ])("a journal with %s is refused", async (_name, value) => {
    const s = await interrupted();
    s.setJournal({ ...s.journal(), checkpoint: value });
    await expect(s.recover()).rejects.toThrow(
      /^Bootstrap recovery journal has no state checkpoint$/,
    );
  });

  test("an unknown journal action is refused", async () => {
    const s = await interrupted();
    const journal = s.journal();
    for (const row of [
      { actionId: "zz", outcome: "applied", detail: "x" },
      { actionId: 7, outcome: "applied", detail: "x" },
    ]) {
      s.setJournal({ ...journal, results: [row] });
      statusSequence(live());
      await expect(s.recover()).rejects.toThrow(
        /^Bootstrap recovery journal contains an unknown action$/,
      );
    }
  });

  test.each([
    ["branch", live({ branch: "main" })],
    ["KB snapshot", live({ snapshotId: "b".repeat(64) })],
    ["status", undefined],
  ])("a drifted %s refuses recovery", async (_name, status) => {
    const s = await interrupted();
    statusSequence(status);
    await expect(s.recover()).rejects.toThrow(
      /^Bootstrap recovery refused: repository state changed since the last action checkpoint$/,
    );
  });

  test("a drifted workspace refuses recovery", async () => {
    const s = await interrupted();
    statusSequence(live());
    const moved = harness({ workspaceHash: "b".repeat(64) });
    await expect(
      executeApplyPlan({ recoveryJournalId: s.journalId } as never, {
        ...s.context,
        git: moved.context.git,
      }),
    ).rejects.toThrow(/repository state changed/);
    await expect(
      executeApplyPlan({ recoveryJournalId: s.journalId } as never, {
        ...s.context,
        git: undefined,
      }),
    ).rejects.toThrow(/repository state changed/);
  });

  test("a missing KB checkpoint binds to the empty source state", async () => {
    const s = await interrupted();
    const empty = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot: HASH,
      sourceHashes: {},
    });
    s.setJournal({
      ...s.journal(),
      checkpoint: { ...checkpoint, kbSnapshotId: empty },
    });
    statusSequence(live({ snapshotId: "missing" }));
    upserts({});
    await expect(s.recover()).resolves.toBeDefined();
    for (const hash of ["nothex", `${HASH}0`, `0${HASH}`]) {
      s.setJournal({
        ...s.journal(),
        state: "repair_required",
        checkpoint: {
          branch: "develop",
          kbSnapshotId: bootstrapEmptyKbSnapshotId({
            branch: "develop",
            workspaceSnapshot: hash,
            sourceHashes: {},
          }),
          workspaceSnapshot: hash,
        },
        results: [],
      });
      const moved = harness({ workspaceHash: hash });
      await expect(
        executeApplyPlan({ recoveryJournalId: s.journalId } as never, {
          ...s.context,
          git: moved.context.git,
        }),
      ).rejects.toThrow(/repository state changed/);
    }
  });

  test("drift during an interrupted action is attributed to it", async () => {
    const s = await interrupted();
    s.setJournal({
      ...s.journal(),
      state: "applying",
      activeActionId: "a2",
      results: [
        { actionId: "a1", outcome: "applied", detail: "Applied sequentially." },
      ],
      lockReclaims: [{ holderPid: 1 }, null, "x"],
      interruptedActions: [{ actionId: "a0" }, 7],
    });
    statusSequence(live({ snapshotId: "c".repeat(64) }));
    upserts({});
    const result = await s.recover();
    const note =
      "Action a2 was interrupted before its checkpoint; the state drift since the last checkpoint is attributed to it and the action was re-applied idempotently.";
    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      validationSummary: {
        notes: [
          note,
          "Bootstrap actions applied sequentially through the shared plan executor.",
        ],
      },
    });
    const journal = s.journal();
    expect(journal.lockReclaims).toEqual([{ holderPid: 1 }]);
    expect(journal.interruptedActions).toEqual([
      { actionId: "a0" },
      {
        actionId: "a2",
        recoveredAt: NOW.toISOString(),
        checkpoint,
        liveCheckpoint: {
          branch: "develop",
          kbSnapshotId: "c".repeat(64),
          workspaceSnapshot: HASH,
        },
      },
    ]);
  });

  test("carried notes reach every bootstrap summary", async () => {
    for (const outcome of [
      new Error("store down"),
      { status: "committed_with_repairs" },
    ]) {
      const s = await interrupted();
      s.setJournal({
        ...s.journal(),
        state: "applying",
        activeActionId: "a2",
        results: [
          {
            actionId: "a1",
            outcome: "applied",
            detail: "Applied sequentially.",
          },
        ],
      });
      const status = statusSequence(live({ snapshotId: "c".repeat(64) }));
      const upsert = upserts(outcome as never);
      const result = await s.recover();
      const notes = (
        result.structuredContent as unknown as {
          validationSummary: { notes: string[] };
        }
      ).validationSummary.notes;
      expect(notes[0]).toStartWith("Action a2 was interrupted");
      expect(notes).toHaveLength(2);
      status.mockRestore();
      upsert.mockRestore();
    }
  });

  test.each([
    ["a settled journal", { state: "repair_required" }],
    ["no active action", { state: "applying", activeActionId: undefined }],
    ["a non-string action", { state: "applying", activeActionId: 7 }],
    ["an unknown action", { state: "applying", activeActionId: "zz" }],
    [
      "an action with a result",
      {
        state: "applying",
        activeActionId: "a1",
        results: [
          {
            actionId: "a1",
            outcome: "applied",
            detail: "Applied sequentially.",
          },
          { actionId: "a2", outcome: "failed", detail: "store down" },
        ],
      },
    ],
  ])("drift with %s is refused", async (_name, edit) => {
    const s = await interrupted();
    s.setJournal({
      ...s.journal(),
      results: [
        { actionId: "a1", outcome: "applied", detail: "Applied sequentially." },
      ],
      ...edit,
    });
    statusSequence(live({ snapshotId: "c".repeat(64) }));
    await expect(s.recover()).rejects.toThrow(/repository state changed/);
  });

  test("an interrupted action on another branch is refused", async () => {
    const s = await interrupted();
    s.setJournal({
      ...s.journal(),
      state: "applying",
      activeActionId: "a2",
      results: [
        { actionId: "a1", outcome: "applied", detail: "Applied sequentially." },
      ],
    });
    statusSequence(live({ branch: "main" }));
    await expect(s.recover()).rejects.toThrow(/repository state changed/);
  });

  test("an interrupted action without a results list is recovered", async () => {
    const s = await interrupted();
    const { results: _results, ...journal } = s.journal();
    s.setJournal({ ...journal, state: "applying", activeActionId: "a1" });
    statusSequence(live({ snapshotId: "c".repeat(64) }));
    upserts({});
    await expect(s.recover()).resolves.toBeDefined();
  });

  test("recovery without a status payload stops", async () => {
    const s = await interrupted();
    statusSequence(live(), undefined);
    await expect(s.recover()).rejects.toThrow(
      /^Bootstrap apply failed: status returned no payload$/,
    );
  });

  test("a recovered journal keeps its carried facts", async () => {
    const s = await interrupted();
    s.setJournal({
      ...s.journal(),
      lockReclaims: [{ holderPid: 1 }],
      interruptedActions: [{ actionId: "a0" }],
    });
    statusSequence(live());
    upserts({});
    await s.recover();
    expect(s.journal()).toMatchObject({
      lockReclaims: [{ holderPid: 1 }],
      interruptedActions: [{ actionId: "a0" }],
    });
    s.setJournal({ ...s.journal(), lockReclaims: "x", interruptedActions: {} });
    expect(s.journal().lockReclaims).toBe("x");
  });
});

describe("the bootstrap workspace lock", () => {
  function stubLock(reclaimed?: unknown[]) {
    const release = track(
      spyOn(lockModule, "releaseWorkspaceMutationLock").mockImplementation(
        () => undefined,
      ),
    );
    const acquire = track(
      spyOn(lockModule, "acquireWorkspaceMutationLock").mockImplementation(
        async () =>
          ({
            token: "t",
            ...(reclaimed === undefined ? {} : { reclaimed }),
          }) as never,
      ),
    );
    return { acquire, release };
  }

  async function applyingJournal() {
    const status = statusSequence(live());
    const upsert = upserts(new Error("store down"));
    const s = setup(bootstrapPlan());
    await s.run();
    status.mockRestore();
    upsert.mockRestore();
    s.setJournal({
      ...s.journal(),
      state: "applying",
      lockReclaims: [{ holderPid: 0 }],
    });
    return s;
  }

  test("recovering an applying journal reclaims a dead holder and records it", async () => {
    const s = await applyingJournal();
    const { acquire, release } = stubLock([
      { pid: 41, acquiredAt: 0, reclaimedAt: 1000, reclaimedByPid: 42 },
    ]);
    statusSequence(live());
    upserts({});
    await s.recover();
    const options = acquire.mock.calls[0]?.[1] as {
      reclaimDeadHolder: () => boolean;
    };
    expect(acquire.mock.calls[0]?.[0]).toBe(s.root);
    expect(options.reclaimDeadHolder()).toBe(true);
    expect(s.journal().lockReclaims).toEqual([
      { holderPid: 0 },
      {
        holderPid: 41,
        holderAcquiredAt: "1970-01-01T00:00:00.000Z",
        reclaimedAt: "1970-01-01T00:00:01.000Z",
        reclaimedByPid: 42,
      },
    ]);
    expect(release.mock.calls[0]?.slice(1)).toEqual([undefined, true]);
  });

  test("a journal without earlier reclaims starts the list", async () => {
    const s = await applyingJournal();
    const { lockReclaims: _l, ...journal } = s.journal();
    s.setJournal(journal);
    stubLock([{ pid: 41, acquiredAt: 0, reclaimedAt: 0, reclaimedByPid: 42 }]);
    let recorded: unknown;
    track(
      spyOn(discoveryExecutors, "executeStatus").mockImplementation(
        async () => {
          recorded ??= s.journal().lockReclaims;
          return { content: [], structuredContent: live() } as never;
        },
      ),
    );
    upserts({});
    await s.recover();
    expect(recorded).toEqual([
      {
        holderPid: 41,
        holderAcquiredAt: "1970-01-01T00:00:00.000Z",
        reclaimedAt: "1970-01-01T00:00:00.000Z",
        reclaimedByPid: 42,
      },
    ]);
  });

  test("a plain apply ignores reclaims it did not ask for", async () => {
    stubLock([{ pid: 41, acquiredAt: 0, reclaimedAt: 0, reclaimedByPid: 42 }]);
    statusSequence(live());
    upserts({});
    const s = setup(bootstrapPlan());
    await expect(s.run()).resolves.toBeDefined();
    expect(s.journal()).not.toHaveProperty("lockReclaims");
  });

  test("a failed reclaim record releases the lock and fails", async () => {
    const s = await applyingJournal();
    const { release } = stubLock([
      { pid: 41, acquiredAt: 0, reclaimedAt: 0, reclaimedByPid: 42 },
    ]);
    const fs = {
      ...nodeFilesystem,
      writeFile: async () => {
        throw new Error("disk full");
      },
    };
    await expect(
      executeApplyPlan({ recoveryJournalId: s.journalId } as never, {
        ...s.context,
        fs: fs as never,
      }),
    ).rejects.toThrow("disk full");
    expect(release.mock.calls[0]?.[1]).toEqual({
      error: new Error("disk full"),
    });
  });

  test.each([
    ["a settled journal", { state: "repair_required" }],
    ["another journal kind", { kind: "source" }],
  ])("%s is not reclaimed", async (_name, edit) => {
    const s = await applyingJournal();
    s.setJournal({ ...s.journal(), ...edit });
    const { acquire } = stubLock();
    statusSequence(live());
    upserts({});
    await s.recover().catch(() => undefined);
    expect(acquire.mock.calls[0]?.[1]).toEqual({});
  });

  test("an unreadable or foreign recovery id takes a plain lock", async () => {
    const { acquire } = stubLock();
    const h = harness();
    for (const id of ["bootstrap-0123456789abcdef", "plan-x"])
      await executeApplyPlan(
        { recoveryJournalId: id } as never,
        h.context,
      ).catch(() => undefined);
    expect(acquire.mock.calls.map((call) => call[1])).toEqual([{}, {}]);
  });

  test("a held lock without reclaims records nothing", async () => {
    const s = await applyingJournal();
    stubLock();
    statusSequence(live());
    upserts({});
    await s.recover();
    expect(s.journal().lockReclaims).toEqual([{ holderPid: 0 }]);
  });

  test("an apply failure releases the lock with the failure", async () => {
    const { release } = stubLock();
    statusSequence(undefined);
    const s = setup(bootstrapPlan());
    const error = await s.run().catch((caught) => caught);
    expect(release.mock.calls[0]?.slice(1)).toEqual([{ error }, false]);
  });

  test.each(["xbootstrap-0123456789abcdef", "bootstrap-0123456789abcdef0"])(
    "an applying journal named %s takes a plain lock",
    async (id) => {
      const { acquire } = stubLock();
      const h = harness({
        files: {
          [`.kb/recovery/${id}.json`]: JSON.stringify({
            kind: "bootstrap",
            state: "applying",
          }),
        },
      });
      await executeApplyPlan(
        { recoveryJournalId: id } as never,
        h.context,
      ).catch(() => undefined);
      expect(acquire.mock.calls[0]?.[1]).toEqual({});
    },
  );

  test("a malformed applying journal takes a plain lock", async () => {
    const { acquire } = stubLock();
    const id = "bootstrap-0123456789abcdef";
    const h = harness({ files: { [`.kb/recovery/${id}.json`]: "{" } });
    await executeApplyPlan({ recoveryJournalId: id } as never, h.context).catch(
      () => undefined,
    );
    expect(acquire.mock.calls[0]?.[1]).toEqual({});
  });

  test("an invalid bootstrap plan fails before settling journals", async () => {
    const settle = track(
      spyOn(journalModule, "settlePendingPlanApplyJournals"),
    );
    const acquire = track(spyOn(lockModule, "acquireWorkspaceMutationLock"));
    const plan = bootstrapPlan({
      actions: [action("a1", [], { properties: { status: "open" } })],
    });
    await expect(
      executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        harness().context,
      ),
    ).rejects.toThrow(/^Bootstrap action a1 is invalid/);
    expect(settle).not.toHaveBeenCalled();
    expect(acquire).not.toHaveBeenCalled();
  });

  test("a call that commits nothing still releases as finished", async () => {
    const { release } = stubLock();
    statusSequence(live());
    const plan = migrationPlan([{ id: "m1", code: "no_such_code" }], {
      expected: {
        branch: null,
        kbBranch: null,
        kbSnapshotId: null,
        workspaceSnapshot: null,
        configHash: null,
      },
    } as never);
    await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash, approvedActionIds: ["m1"] },
      harness().context,
    );
    expect(release.mock.calls[0]?.slice(1)).toEqual([undefined, true]);
  });

  test("a held workspace lock skips locking", async () => {
    const { acquire } = stubLock();
    statusSequence(live());
    upserts({});
    const s = setup(bootstrapPlan(), {
      extra: { sourceMutationLockHeld: true } as never,
    });
    await s.run();
    expect(acquire).not.toHaveBeenCalled();
  });
});
