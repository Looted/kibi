// implements REQ-kibi-change-to-proof-plan-compiler-v2, REQ-core-atomic-upsert-persistence
import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { buildUpsertCommitGoal } from "../../src/operations/mutation/contradictions.js";
import { executeDelete } from "../../src/operations/mutation/delete.js";
import {
  openPlanApplyJournalById,
  planApplyJournalId,
  recoverPlanApplyJournal,
} from "../../src/operations/mutation/plan-apply-journal.js";
import { executeUpsert } from "../../src/operations/mutation/upsert.js";
import { executeApplyPlan } from "../../src/operations/planning/apply-plan.js";
import {
  type CompilePlanV1,
  compilePlanHash,
} from "../../src/operations/planning/compile-intent.js";
import { PrologProcess } from "../../src/prolog.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  FilesystemPort,
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { isWhatIfGoal, whatIfResult } from "../helpers/what-if.js";

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const cleanups: Array<() => Promise<void> | void> = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

function tempDir(prefix: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), prefix));
  cleanups.push(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function workspace(): string {
  const root = tempDir("kibi-atomic-plan-");
  mkdirSync(path.join(root, ".kb"), { recursive: true });
  return root;
}

const NOW = "2026-10-01T00:00:00Z";

function compilePlan(overrides: Partial<CompilePlanV1> = {}): CompilePlanV1 {
  const body: Omit<CompilePlanV1, "planHash"> = {
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
      requirementId: "REQ-atomic-a",
      selectionReason: "test",
    },
    discovery: { candidates: [], abstained: true },
    propositions: [],
    contradictionAnalysis: { outcome: "no_conflict", witnesses: [] },
    proposals: [],
    steps: [
      {
        type: "req",
        id: "REQ-atomic-a",
        properties: { title: "Atomic A", status: "open" },
        relationships: [],
      },
    ],
    sourceWrites: [],
    diagnostics: [],
    ...overrides,
  };
  return { ...body, planHash: compilePlanHash(body) };
}

function context(
  root: string,
  prolog: PrologPort,
  extra: Partial<OperationContext> = {},
): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date(NOW),
    prolog,
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
      storePath: path.join(root, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
    ...extra,
  };
}

function journalState(root: string, plan: CompilePlanV1): string {
  return openPlanApplyJournalById(
    context(root, mockStore().port),
    planApplyJournalId(plan.planHash),
  ).journal.state;
}

function shardFiles(root: string): string[] {
  const directory = path.join(root, ".kb", "relationships");
  return existsSync(directory)
    ? readdirSync(directory, { recursive: true })
        .map(String)
        .filter((name) => name.endsWith(".yaml"))
    : [];
}

/** A promise the test resolves from inside a port call. */
function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** A port call that never returns: the process "died" while it ran. */
function never<T>(): Promise<T> {
  return new Promise<T>(() => undefined);
}

// ---------------------------------------------------------------------------
// A real SWI-Prolog store, attached to a temp directory.

type RealStore = Readonly<{
  port: PrologPort;
  exists(id: string): Promise<boolean>;
  relationship(type: string, from: string, to: string): Promise<boolean>;
  run(goal: string): Promise<PrologQueryResult>;
}>;

async function realStore(): Promise<RealStore> {
  const directory = tempDir("kibi-atomic-store-");
  const prolog = new PrologProcess({ oneShot: false, timeout: 60_000 });
  await prolog.start();
  cleanups.push(() => prolog.terminate());
  const attached = await prolog.query(`kb_attach('${directory}')`);
  if (!attached.success)
    throw new Error(`attach failed: ${attached.error ?? "unknown"}`);
  const run = async (goal: string) => {
    prolog.invalidateCache();
    return prolog.query(goal);
  };
  return {
    port: {
      query: (goal) => prolog.query(goal),
      invalidateCache: () => prolog.invalidateCache(),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
    run,
    exists: async (id) => (await run(`once(kb_entity('${id}', _, _))`)).success,
    relationship: async (type, from, to) =>
      (await run(`once(kb_relationship(${type}, '${from}', '${to}'))`)).success,
  };
}

async function seedScenario(store: RealStore, id: string): Promise<void> {
  const seeded = await store.run(
    `kb_assert_entity(scenario, [id='${id}', title="Seeded scenario", status=active, created_at="${NOW}", updated_at="${NOW}", source="test://atomic"])`,
  );
  expect(seeded.success).toBe(true);
}

// ---------------------------------------------------------------------------
// An in-memory store whose batch commit applies every entity or none.

type MockStore = {
  readonly port: PrologPort;
  readonly stored: Set<string>;
  readonly commits: string[];
  /** Replace the commit behavior (default: store every plan entity). */
  commit: (goal: string) => Promise<PrologQueryResult>;
};

function mockStore(ids: readonly string[] = []): MockStore {
  const store: MockStore = {
    stored: new Set<string>(),
    commits: [],
    commit: async (goal) => {
      for (const id of ids) if (goal.includes(`'${id}'`)) store.stored.add(id);
      return {
        success: true,
        bindings: { ChangeKind: "created", ChangeKinds: "[created]" },
      };
    },
    port: {
      query: async (goal): Promise<PrologQueryResult> => {
        if (isWhatIfGoal(goal)) return whatIfResult();
        if (goal.includes("kb_commit_upsert")) {
          store.commits.push(goal);
          return store.commit(goal);
        }
        if (goal.includes("[FingerprintHash])"))
          return {
            success: true,
            bindings: {
              FingerprintHash: JSON.stringify([...store.stored].sort()),
            },
          };
        return { success: true, bindings: { Results: "[]" } };
      },
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    },
  };
  return store;
}

describe("atomic compile plan application against a real store", () => {
  test("a step the store rejects inside the batch leaves the store and workspace unchanged", async () => {
    const root = workspace();
    const store = await realStore();
    await seedScenario(store, "SCEN-atomic-target");
    const body = "# Atomic\n";
    const plan = compilePlan({
      steps: [
        {
          type: "req",
          id: "REQ-atomic-a",
          properties: { title: "Atomic A", status: "open" },
          relationships: [],
        },
        {
          type: "req",
          id: "REQ-atomic-b",
          properties: { title: "Atomic B", status: "open" },
          relationships: [
            {
              type: "specified_by",
              from: "REQ-atomic-b",
              to: "SCEN-atomic-target",
            },
          ],
        },
      ],
      sourceWrites: [
        {
          path: "docs/atomic.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha(body),
          body,
        },
      ],
    });
    // Another writer removes the second step's target after the preflight
    // validated it, so the store aborts the batch at the second step.
    const port: PrologPort = {
      ...store.port,
      query: async (goal) => {
        if (goal.startsWith("kb_commit_upsert_batch(")) {
          const removed = await store.run(
            "kb_retract_entity('SCEN-atomic-target')",
          );
          expect(removed.success).toBe(true);
        }
        return store.port.query(goal);
      },
    };

    await expect(
      executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        context(root, port),
      ),
    ).rejects.toThrow(
      /at its store commit; no change was applied \(store unchanged, 2 source file\(s\) restored/,
    );

    expect(await store.exists("REQ-atomic-a")).toBe(false);
    expect(await store.exists("REQ-atomic-b")).toBe(false);
    expect(existsSync(path.join(root, "docs", "atomic.md"))).toBe(false);
    expect(shardFiles(root)).toEqual([]);
    expect(journalState(root, plan)).toBe("rolled_back");
  }, 60_000);

  test("a step may reference an entity an earlier step creates; both commit in one batch", async () => {
    const root = workspace();
    const store = await realStore();
    const goals: string[] = [];
    const port: PrologPort = {
      ...store.port,
      query: (goal) => {
        goals.push(goal);
        return store.port.query(goal);
      },
    };
    const plan = compilePlan({
      steps: [
        {
          type: "scenario",
          id: "SCEN-atomic-new",
          properties: { title: "New scenario", status: "active" },
          relationships: [],
        },
        {
          type: "req",
          id: "REQ-atomic-a",
          properties: { title: "Atomic A", status: "open" },
          relationships: [
            {
              type: "specified_by",
              from: "REQ-atomic-a",
              to: "SCEN-atomic-new",
            },
          ],
        },
      ],
    });

    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context(root, port),
    );

    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      changedEntities: 2,
      changedRelationships: 1,
      recoveryJournalId: planApplyJournalId(plan.planHash),
    });
    expect(
      goals.filter((goal) => goal.includes("kb_commit_upsert")),
    ).toHaveLength(1);
    expect(await store.exists("SCEN-atomic-new")).toBe(true);
    expect(
      await store.relationship(
        "specified_by",
        "REQ-atomic-a",
        "SCEN-atomic-new",
      ),
    ).toBe(true);
    expect(shardFiles(root)).toHaveLength(1);
    expect(journalState(root, plan)).toBe("committed");
  }, 60_000);

  test("an application interrupted after the store committed is completed by the next call", async () => {
    const root = workspace();
    const store = await realStore();
    const body = "# Completed\n";
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/completed.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha(body),
          body,
        },
      ],
    });
    // The store commits, then the process dies before the call returns.
    const committed = deferred();
    const dying: PrologPort = {
      ...store.port,
      query: async (goal) => {
        if (!goal.includes("kb_commit_upsert")) return store.port.query(goal);
        const result = await store.port.query(goal);
        expect(result.success).toBe(true);
        committed.resolve();
        return never();
      },
    };
    void executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context(root, dying, { sourceMutationLockHeld: true }),
    );
    await committed.promise;
    expect(journalState(root, plan)).toBe("store_committing");

    // The next mutating call finds the journal and completes it.
    const journalId = planApplyJournalId(plan.planHash);
    const recovered = await executeApplyPlan(
      { recoveryJournalId: journalId },
      context(root, store.port),
    );

    expect(recovered.structuredContent).toMatchObject({
      outcome: "replayed",
      recoveryJournalId: journalId,
      changedEntities: 1,
    });
    expect(recovered.content[0]?.text).toContain(
      "the store shows the batch took effect",
    );
    expect(await store.exists("REQ-atomic-a")).toBe(true);
    expect(readFileSync(path.join(root, "docs", "completed.md"), "utf8")).toBe(
      body,
    );
    expect(journalState(root, plan)).toBe("committed");
  }, 60_000);

  test("an application interrupted before the store commit took effect is rolled back by the next call", async () => {
    const root = workspace();
    const store = await realStore();
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(path.join(root, "docs", "kept.md"), "before\n");
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/kept.md",
          mode: "write",
          beforeHash: sha("before\n"),
          afterHash: sha("after\n"),
          body: "after\n",
        },
      ],
    });
    // The process dies while the batch is in flight, before the store took it.
    const submitted = deferred();
    const dying: PrologPort = {
      ...store.port,
      query: async (goal) => {
        if (!goal.includes("kb_commit_upsert")) return store.port.query(goal);
        submitted.resolve();
        return never();
      },
    };
    void executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context(root, dying, { sourceMutationLockHeld: true }),
    );
    await submitted.promise;
    expect(journalState(root, plan)).toBe("store_committing");
    expect(readFileSync(path.join(root, "docs", "kept.md"), "utf8")).toBe(
      "after\n",
    );

    // Any later kb_apply_plan call settles the journal first and reports it.
    const other = compilePlan({
      steps: [
        {
          type: "req",
          id: "REQ-atomic-other",
          properties: { title: "Other", status: "open" },
          relationships: [],
        },
      ],
    });
    const result = await executeApplyPlan(
      { plan: other, approvedPlanHash: other.planHash },
      context(root, store.port),
    );

    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      validationSummary: {
        recoveredJournals: [
          {
            journalId: planApplyJournalId(plan.planHash),
            action: "rolled_back",
            restoredPaths: ["docs/kept.md"],
          },
        ],
      },
    });
    expect(result.content[0]?.text).toContain(
      "the store shows the batch never took effect",
    );
    expect(readFileSync(path.join(root, "docs", "kept.md"), "utf8")).toBe(
      "before\n",
    );
    expect(await store.exists("REQ-atomic-a")).toBe(false);
    expect(await store.exists("REQ-atomic-other")).toBe(true);
    expect(journalState(root, plan)).toBe("rolled_back");
  }, 60_000);

  test("a dry run rejects what the real write rejects", async () => {
    const root = workspace();
    const store = await realStore();
    const seeded = await store.run(
      buildUpsertCommitGoal({
        entity: {
          type: "fact",
          id: "FACT-atomic-value",
          title: "Quota limit",
          status: "active",
          fact_kind: "property_value",
          subject_key: "client.quota",
          property_key: "limit",
          operator: "lte",
          value_type: "int",
          value_int: 30,
          created_at: NOW,
          updated_at: NOW,
          source: "test://atomic",
        },
        relationships: [],
        skipContradictionCheck: true,
      }),
    );
    expect(seeded.success).toBe(true);
    // `constrains` must target a subject fact, not a property value; the
    // dry run used to skip this strict-lane check.
    const input = {
      type: "req",
      id: "REQ-atomic-constrained",
      properties: { title: "Constrained", status: "open" },
      relationships: [
        {
          type: "constrains",
          from: "REQ-atomic-constrained",
          to: "FACT-atomic-value",
        },
      ],
    };
    const { fs: _fs, ...noFs } = context(root, store.port);

    const dryRun = await executeUpsert({ ...input, dryRun: true }, noFs);
    expect(dryRun.structuredContent).toMatchObject({
      valid: false,
      dryRun: true,
      errors: [expect.stringContaining("FACT-atomic-value")],
    });
    await expect(executeUpsert(input, noFs)).rejects.toThrow(
      /FACT-atomic-value/,
    );
    expect(await store.exists("REQ-atomic-constrained")).toBe(false);
  }, 60_000);
});

describe("atomic compile plan journal", () => {
  test("a source-write failure mid-plan restores the earlier source writes and never commits", async () => {
    const root = workspace();
    const store = mockStore(["REQ-atomic-a"]);
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(path.join(root, "docs", "first.md"), "first before\n");
    const plan = compilePlan({
      steps: [
        {
          type: "scenario",
          id: "SCEN-x",
          properties: { title: "Scenario", status: "active" },
          relationships: [],
        },
        {
          type: "req",
          id: "REQ-atomic-a",
          properties: { title: "Atomic A", status: "open" },
          relationships: [
            { type: "specified_by", from: "REQ-atomic-a", to: "SCEN-x" },
          ],
        },
      ],
      sourceWrites: [
        {
          path: "docs/first.md",
          mode: "write",
          beforeHash: sha("first before\n"),
          afterHash: sha("first after\n"),
          body: "first after\n",
        },
        {
          path: "docs/second.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha("second\n"),
          body: "second\n",
        },
      ],
    });
    const failing: FilesystemPort = {
      ...nodeFilesystem,
      rename: async (from, to) => {
        if (to.endsWith(path.join("docs", "second.md")))
          throw new Error("disk full");
        return nodeFilesystem.rename?.(from, to);
      },
    };

    await expect(
      executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        context(root, store.port, { fs: failing }),
      ),
    ).rejects.toThrow(
      /failed while publishing its source writes; no change was applied \(store unchanged, 1 source file\(s\) restored .*disk full/,
    );

    expect(readFileSync(path.join(root, "docs", "first.md"), "utf8")).toBe(
      "first before\n",
    );
    expect(existsSync(path.join(root, "docs", "second.md"))).toBe(false);
    expect(readdirSync(path.join(root, "docs"))).toEqual(["first.md"]);
    expect(shardFiles(root)).toEqual([]);
    expect(store.commits).toEqual([]);
    expect(journalState(root, plan)).toBe("rolled_back");
  });

  test("an application interrupted while publishing is rolled back by the next kb_upsert or kb_delete", async () => {
    for (const nextCall of ["kb_upsert", "kb_delete"] as const) {
      const root = workspace();
      const store = mockStore(["REQ-atomic-a"]);
      mkdirSync(path.join(root, "docs"), { recursive: true });
      writeFileSync(path.join(root, "docs", "first.md"), "first before\n");
      const plan = compilePlan({
        sourceWrites: [
          {
            path: "docs/first.md",
            mode: "write",
            beforeHash: sha("first before\n"),
            afterHash: sha("first after\n"),
            body: "first after\n",
          },
          {
            path: "docs/second.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha("second\n"),
            body: "second\n",
          },
        ],
      });
      // The process dies while publishing the second file.
      const publishing = deferred();
      const dying: FilesystemPort = {
        ...nodeFilesystem,
        rename: async (from, to) => {
          if (!to.endsWith(path.join("docs", "second.md")))
            return nodeFilesystem.rename?.(from, to);
          publishing.resolve();
          return never();
        },
      };
      void executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        context(root, store.port, { fs: dying, sourceMutationLockHeld: true }),
      );
      await publishing.promise;
      expect(journalState(root, plan)).toBe("prepared");
      expect(readFileSync(path.join(root, "docs", "first.md"), "utf8")).toBe(
        "first after\n",
      );

      const restored = /Rolled back interrupted plan .*restored 1 of 2/;
      if (nextCall === "kb_upsert") {
        // The upsert settles the journal before it reads or writes anything,
        // then performs its own write and reports the recovery.
        const result = await executeUpsert(
          {
            type: "req",
            id: "REQ-atomic-next",
            properties: { title: "Next", status: "open" },
          },
          context(root, store.port),
        );
        expect(result.structuredContent?.warnings).toContainEqual(
          expect.stringMatching(restored),
        );
      } else {
        const result = await executeDelete(
          { ids: ["REQ-missing"] },
          context(root, {
            ...store.port,
            query: async () => ({ success: false, bindings: {} }),
          }),
        );
        expect(result.content[0]?.text).toMatch(restored);
      }
      expect(readFileSync(path.join(root, "docs", "first.md"), "utf8")).toBe(
        "first before\n",
      );
      // The interrupted publish's staged temp file is cleaned up too.
      expect(readdirSync(path.join(root, "docs"))).toEqual(["first.md"]);
      expect(
        store.commits.filter((goal) => goal.includes("REQ-atomic-a")),
      ).toEqual([]);
      expect(journalState(root, plan)).toBe("rolled_back");
    }
  });

  test("journal replay is idempotent", async () => {
    const root = workspace();
    const store = mockStore(["REQ-atomic-a"]);
    const body = "# Replayed\n";
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/replayed.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha(body),
          body,
        },
      ],
    });
    const committed = deferred();
    const dying: PrologPort = {
      ...store.port,
      query: async (goal) => {
        const result = await store.port.query(goal);
        if (!goal.includes("kb_commit_upsert")) return result;
        committed.resolve();
        return never();
      },
    };
    void executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context(root, dying, { sourceMutationLockHeld: true }),
    );
    await committed.promise;
    const journalId = planApplyJournalId(plan.planHash);
    const ctx = context(root, store.port);

    // Replaying the same journal object twice (as two racing recoveries
    // would) and then through kb_apply_plan converges on one outcome.
    const handle = openPlanApplyJournalById(ctx, journalId);
    const options = { prolog: async () => store.port };
    const first = await recoverPlanApplyJournal(ctx, { ...handle }, options);
    const second = await recoverPlanApplyJournal(ctx, { ...handle }, options);
    expect(first).toMatchObject({ action: "completed", state: "committed" });
    expect(second).toMatchObject({
      action: "completed",
      state: "committed",
      restoredPaths: [],
    });
    const third = await executeApplyPlan({ recoveryJournalId: journalId }, ctx);
    expect(third.structuredContent).toMatchObject({
      outcome: "replayed",
      changedEntities: 0,
      changedPaths: [],
    });
    expect(third.content[0]?.text).toContain("nothing to recover");

    expect(readFileSync(path.join(root, "docs", "replayed.md"), "utf8")).toBe(
      body,
    );
    expect(store.commits).toHaveLength(1);
    expect(journalState(root, plan)).toBe("committed");
    // The original plan cannot be applied a second time.
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, ctx),
    ).rejects.toThrow(/MUTATION_ALREADY_COMMITTED/);
  });

  test("a call that settles an interrupted plan and then fails on its own work still reports the settlement", async () => {
    for (const nextCall of ["kb_apply_plan", "kb_upsert"] as const) {
      const root = workspace();
      const store = mockStore(["REQ-atomic-a"]);
      const body = "# Settled\n";
      const plan = compilePlan({
        sourceWrites: [
          {
            path: "docs/settled.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha(body),
            body,
          },
        ],
      });
      // The store commits plan A, then the process dies before it answers.
      const committed = deferred();
      void executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        context(
          root,
          {
            ...store.port,
            query: async (goal) => {
              const result = await store.port.query(goal);
              if (!goal.includes("kb_commit_upsert")) return result;
              committed.resolve();
              return never();
            },
          },
          { sourceMutationLockHeld: true },
        ),
      );
      await committed.promise;

      const settled =
        /\[settled before this failure: Completed interrupted plan .*published 0 of 1/;
      if (nextCall === "kb_apply_plan") {
        // A plan compiled against the snapshot before plan A no longer matches.
        const stale = compilePlan({
          expected: {
            branch: "develop",
            kbSnapshotId: "generation-1:1",
            workspaceSnapshot: "a".repeat(64),
            sourceHashes: {},
          },
          steps: [
            {
              type: "req",
              id: "REQ-atomic-b",
              properties: { title: "Atomic B", status: "open" },
              relationships: [],
            },
          ],
        });
        await expect(
          executeApplyPlan(
            { plan: stale, approvedPlanHash: stale.planHash },
            context(root, store.port),
          ),
        ).rejects.toThrow(
          new RegExp(`KB snapshot changed since compilation ${settled.source}`),
        );
      } else {
        store.commit = async () => ({
          success: false,
          bindings: {},
          error: "store rejected the write",
        });
        await expect(
          executeUpsert(
            {
              type: "req",
              id: "REQ-atomic-next",
              properties: { title: "Next", status: "open" },
            },
            context(root, store.port),
          ),
        ).rejects.toThrow(settled);
      }
      expect(readFileSync(path.join(root, "docs", "settled.md"), "utf8")).toBe(
        body,
      );
      expect(journalState(root, plan)).toBe("committed");
    }
  });

  test("recovery refuses, changing nothing, when a journaled file changed outside the journal", async () => {
    const root = workspace();
    const store = mockStore(["REQ-atomic-a"]);
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(path.join(root, "docs", "first.md"), "first before\n");
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/first.md",
          mode: "write",
          beforeHash: sha("first before\n"),
          afterHash: sha("first after\n"),
          body: "first after\n",
        },
        {
          path: "docs/second.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha("second\n"),
          body: "second\n",
        },
      ],
    });
    const submitted = deferred();
    void executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context(
        root,
        {
          ...store.port,
          query: async (goal) => {
            if (!goal.includes("kb_commit_upsert"))
              return store.port.query(goal);
            submitted.resolve();
            return never();
          },
        },
        { sourceMutationLockHeld: true },
      ),
    );
    await submitted.promise;
    // Someone edits a journaled file before recovery runs.
    writeFileSync(path.join(root, "docs", "second.md"), "edited by hand\n");

    await expect(
      executeApplyPlan(
        { recoveryJournalId: planApplyJournalId(plan.planHash) },
        context(root, store.port),
      ),
    ).rejects.toMatchObject({
      code: "PARTIAL_COMMIT_REPAIR_REQUIRED",
      message: expect.stringContaining("docs/second.md changed outside"),
    });
    expect(readFileSync(path.join(root, "docs", "first.md"), "utf8")).toBe(
      "first after\n",
    );
    expect(readFileSync(path.join(root, "docs", "second.md"), "utf8")).toBe(
      "edited by hand\n",
    );
    expect(journalState(root, plan)).toBe("store_committing");
  });

  test("a store failure report is decided by the store: applied batches are kept, unreachable stores keep the journal", async () => {
    const root = workspace();
    // The store applies the batch but reports a failure.
    const lying = mockStore(["REQ-atomic-a"]);
    lying.commit = async (goal) => {
      lying.stored.add("REQ-atomic-a");
      return {
        success: false,
        bindings: {},
        error: `lost reply ${goal.length}`,
      };
    };
    const plan = compilePlan();
    const kept = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context(root, lying.port),
    );
    expect(kept.structuredContent).toMatchObject({
      outcome: "applied",
      status: "committed_with_repairs",
      effectFailures: [{ errorCode: "STORE_COMMIT_REPORTED_FAILURE" }],
    });
    expect(journalState(root, plan)).toBe("committed");

    // The transport fails and the store cannot be inspected afterwards.
    const second = compilePlan({
      steps: [
        {
          type: "req",
          id: "REQ-atomic-b",
          properties: { title: "Atomic B", status: "open" },
          relationships: [],
        },
      ],
    });
    const unreachable = mockStore(["REQ-atomic-b"]);
    let down = false;
    const flaky: PrologPort = {
      ...unreachable.port,
      query: async (goal) => {
        if (goal.includes("kb_commit_upsert")) {
          down = true;
          throw new Error("socket closed");
        }
        if (down) throw new Error("engine unavailable");
        return unreachable.port.query(goal);
      },
    };
    await expect(
      executeApplyPlan(
        { plan: second, approvedPlanHash: second.planHash },
        context(root, flaky),
      ),
    ).rejects.toMatchObject({
      code: "PLAN_APPLY_RECOVERY_REQUIRED",
      retryable: false,
    });
    expect(journalState(root, second)).toBe("store_committing");

    // With the store back (and showing no commit), the journal rolls back.
    const recovered = await executeApplyPlan(
      { recoveryJournalId: planApplyJournalId(second.planHash) },
      context(root, unreachable.port),
    );
    expect(recovered.structuredContent).toMatchObject({
      outcome: "rolled_back",
    });
    expect(journalState(root, second)).toBe("rolled_back");
  });
});
