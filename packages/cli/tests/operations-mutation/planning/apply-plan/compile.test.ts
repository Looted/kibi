import { describe, expect, spyOn, test } from "bun:test";
import { readFileSync, readdirSync, symlinkSync } from "node:fs";
import path from "node:path";
import { OperationError } from "../../../../src/cli-errors.js";
import * as journalModule from "../../../../src/operations/mutation/plan-apply-journal.js";
import * as upsertModule from "../../../../src/operations/mutation/upsert.js";
import { executeApplyPlan } from "../../../../src/operations/planning/apply-plan.js";
import type {
  CompilePlanV1,
  SourceWritePlan,
} from "../../../../src/operations/planning/compile-intent.js";
import * as discoveryEntities from "../../../../src/public/operations/discovery-entities.js";
import { nodeFilesystem } from "../../../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../../../src/public/operations/runtime-types.js";
import { whatIfResult } from "../../../helpers/what-if.js";
import { tempWorkspace } from "../../workspace.js";
import {
  HASH,
  type HarnessOptions,
  NOW,
  cleanUpAfterEach,
  compilePlan,
  harness,
  sha,
  stubStatus,
  track,
} from "./harness.js";

cleanUpAfterEach();

const req = (id = "REQ-apply", extra: Record<string, unknown> = {}) => ({
  type: "req",
  id,
  properties: { title: id, status: "open" },
  relationships: [],
  ...extra,
});

function setup(
  overrides: Partial<Omit<CompilePlanV1, "planHash">> = {},
  options: HarnessOptions = {},
  status: Record<string, unknown> | null = { snapshotId: "missing" },
) {
  const plan = compilePlan(overrides);
  stubStatus(status);
  const h = harness(options);
  const committed: number[] = [];
  const run = () =>
    executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, h.context, () =>
      committed.push(1),
    );
  const journalId = `plan-apply-${plan.planHash.slice(0, 16)}`;
  const journalFile = () =>
    h.files(".kb/recovery/plan-apply").find((file) => file.endsWith(".json"));
  const journal = () => JSON.parse(h.read(journalFile() as string));
  const created = track(spyOn(journalModule, "createPlanApplyJournal"));
  // biome-ignore lint/suspicious/noExplicitAny: journal rows are read loosely
  const prepared = (): any => created.mock.calls.at(-1)?.[1];
  return {
    ...h,
    plan,
    committed,
    run,
    journalId,
    journalFile,
    journal,
    prepared,
  };
}

const failure = (run: Promise<unknown>) =>
  run.then(
    () => {
      throw new Error("expected a failure");
    },
    (error: unknown) => error as OperationError,
  );

const noteFor = (journalId: string) =>
  `Plan steps were validated together, journaled in ${journalId}, and committed in one store transaction; source writes are restored from the journal if the commit fails.`;

describe("compile plan application", () => {
  test("a plan commits its steps, documents and shards", async () => {
    const s = setup({
      steps: [
        req("REQ-apply", {
          relationships: [
            { type: "relates_to", from: "REQ-apply", to: "REQ-other" },
          ],
        }),
      ] as never,
    });
    const result = await s.run();
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: `Applied plan ${s.plan.planHash.slice(0, 12)}: 1 step(s) committed in one store transaction.`,
        },
      ],
      structuredContent: {
        version: "kibi.plan-apply-result.v1",
        outcome: "applied",
        planHash: s.plan.planHash,
        changedEntities: 1,
        changedRelationships: 1,
        changedPaths: [".kb/requirements/REQ-apply.md"],
        finalSnapshots: {
          branch: "develop",
          kbSnapshotId: "missing",
          workspaceSnapshot: HASH,
        },
        validationSummary: {
          stepsValidated: 1,
          stepsApplied: 1,
          sourceHashesChecked: 0,
          notes: [noteFor(s.journalId)],
        },
        recoveryJournalId: s.journalId,
      } as never,
    });
    expect(s.committed).toEqual([1]);
    expect(s.read(".kb/requirements/REQ-apply.md")).toContain("REQ-apply");
    const shard = s
      .files(".kb/relationships")
      .map((file) => s.read(file))
      .join("");
    expect(shard).toContain("relates_to");
    expect(shard).toContain("REQ-other");
    expect(shard).toContain(NOW.toISOString());
    expect(shard).toContain("kibi/upsert");
    expect(shard).toContain("mcp://kibi/upsert");
    const journal = s.journal();
    expect(journal.state).toBe("committed");
    expect(journal.resolution).toEqual({
      action: "completed",
      by: "apply",
      detail: `Applied plan ${s.plan.planHash.slice(0, 12)}: 1 step(s) in one store transaction and 2 journaled file(s).`,
    });
    expect(journal.createdAt).toBe(NOW.toISOString());
    expect(s.prepared().state).toBe("prepared");
    expect(journal.summary).toEqual({
      planPaths: [],
      filePaths: [".kb/requirements/REQ-apply.md", s.prepared().files[1].path],
      changedEntities: 1,
      changedRelationships: 1,
    });
    expect(s.prepared().files[1].origin).toBe("relationship-shard");
    expect(s.prepared().files[0]).toMatchObject({
      origin: "entity-document",
      mode: "write",
      before: null,
      beforeHash: null,
    });
    expect(s.prepared().store.entries[0].entity.source).toBe(
      ".kb/requirements/REQ-apply.md",
    );
    expect(s.prepared().store.entries[0].skipContradictionCheck).toBe(false);
    const commit = s.goals.find((goal) => goal.includes("kb_commit_upsert"));
    expect(commit).toContain(".kb/requirements/REQ-apply.md");
  });

  test("without a filesystem the store transaction is the whole apply", async () => {
    let invalidated = 0;
    const s = setup({}, { fs: null });
    (s.context.prolog as { invalidateCache?: () => void }).invalidateCache =
      () => {
        invalidated += 1;
      };
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      changedEntities: 1,
      changedRelationships: 0,
      changedPaths: [],
      recoveryJournalId: null,
      validationSummary: {
        notes: [
          "Plan steps were validated together and committed in one store transaction.",
        ],
      },
    });
    expect(s.committed).toEqual([1]);
    expect("status" in result.structuredContent).toBe(false);
    expect(invalidated).toBeGreaterThan(0);
    expect(s.files()).toEqual([".kb/.keep"]);
  });

  test("without a filesystem a store rejection applies nothing", async () => {
    const s = setup(
      {},
      {
        fs: null,
        answer: (goal) =>
          goal.includes("kb_commit_upsert")
            ? { success: false, bindings: {}, error: "no way" }
            : undefined,
      },
    );
    const error = await failure(s.run());
    expect(error.message).toStartWith(
      "Apply plan failed; no change was applied: the store rejected the plan's batch transaction: ",
    );
    expect(error.message).toContain("REQ-apply");
    expect(s.committed).toEqual([]);
  });

  test("without a filesystem source writes are refused", async () => {
    const s = setup(
      {
        sourceWrites: [
          {
            path: "docs/a.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha("a"),
            body: "a",
          },
        ],
      },
      { fs: null },
    );
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed: sourceWrites require a filesystem-capable runtime",
    );
  });

  test("a lazily provided Prolog runtime is used", async () => {
    const donor = harness();
    const s = setup(
      {},
      {
        prolog: null,
        extra: { ensureProlog: async () => donor.context.prolog },
      },
    );
    await s.run();
    expect(donor.goals.some((goal) => goal.includes("kb_commit_upsert"))).toBe(
      true,
    );
  });

  test("every step is stamped with one clock reading", async () => {
    let ticks = 0;
    const s = setup(
      { steps: [req("REQ-a"), req("REQ-b")] as never },
      {
        extra: {
          clock: () => new Date(NOW.getTime() + 1000 * ticks++),
        },
      },
    );
    await s.run();
    const commit = s.goals.find((goal) => goal.includes("kb_commit_upsert"));
    expect(commit?.match(/2026-09-05T00:00:00\.000Z/g)?.length).toBe(4);
  });
});

describe("compile plan live-state checks", () => {
  test("a missing status payload is refused", async () => {
    const s = setup({}, {}, null);
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed: status query returned no payload",
    );
  });

  test("a changed branch or KB snapshot is refused", async () => {
    const branch = setup({}, {}, { branch: "main", snapshotId: "missing" });
    expect((await failure(branch.run())).message).toBe(
      "Apply plan failed: branch changed since compilation",
    );
  });

  test("a changed KB snapshot is refused", async () => {
    const s = setup({}, {}, { snapshotId: HASH });
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed: KB snapshot changed since compilation",
    );
  });

  test("an unavailable or changed workspace is refused", async () => {
    const s = setup({}, { git: null });
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed: The active operation runtime does not expose workspace snapshots.",
    );
  });

  test("a changed workspace snapshot is refused", async () => {
    const s = setup({}, { workspaceHash: "b".repeat(64) });
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed: workspace snapshot changed since compilation",
    );
  });

  test("source hashes are checked and counted, absent files as null", async () => {
    const s = setup(
      {
        expected: {
          branch: "develop",
          kbSnapshotId: "missing",
          workspaceSnapshot: HASH,
          sourceHashes: { "src/a.ts": sha("a"), "src/gone.ts": null },
        },
      },
      { files: { "src/a.ts": "a" } },
    );
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      validationSummary: { sourceHashesChecked: 2 },
    });
  });
});

describe("compile plan steps", () => {
  test.each([
    [{ type: " req ", id: " REQ-apply " }, "ok"],
    [
      { type: "widget" },
      "Apply plan failed: unsupported step entity type 'widget'",
    ],
    [{ type: 7 }, "Apply plan failed: unsupported step entity type ''"],
    [{ id: "" }, "Apply plan failed: every step needs an entity id"],
    [{ id: 7 }, "Apply plan failed: every step needs an entity id"],
    [
      { relationships: [{ type: "relates_to", from: "REQ-apply" }] },
      "Apply plan failed: every relationship needs type, from, and to",
    ],
    [
      { relationships: [{ type: "relates_to", to: "REQ-x" }] },
      "Apply plan failed: every relationship needs type, from, and to",
    ],
    [
      { relationships: [{ from: "REQ-apply", to: "REQ-x" }] },
      "Apply plan failed: every relationship needs type, from, and to",
    ],
    [
      { relationships: [{ type: " ", from: "REQ-apply", to: "REQ-x" }] },
      "Apply plan failed: every relationship needs type, from, and to",
    ],
  ])("step %p: %s", async (edit, outcome) => {
    const s = setup({ steps: [req("REQ-apply", edit)] as never });
    if (outcome === "ok") {
      await s.run();
      return;
    }
    expect((await failure(s.run())).message).toBe(outcome);
  });

  test.each([
    [
      {
        properties: "x",
        relationships: [
          null,
          "x",
          { type: " relates_to ", from: " REQ-a ", to: " REQ-b ", extra: 1 },
        ],
        document: { path: ".kb/requirements/REQ-a.md", body: "# A\n" },
      },
      {
        properties: {},
        relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-b" }],
        document: { path: ".kb/requirements/REQ-a.md", body: "# A\n" },
      },
    ],
    [
      { relationships: "x", document: { path: 7, body: 7 } },
      { relationships: [], document: {} },
    ],
    [{ document: "x" }, { relationships: [] }],
    [{ relationships: undefined }, { relationships: [] }],
  ])("step %p is normalized before validation", async (edit, expected) => {
    const validate = track(
      spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
        async () => {
          throw new Error("stop");
        },
      ),
    );
    const s = setup({ steps: [req("REQ-a", edit)] as never });
    await s.run().catch(() => undefined);
    expect(validate.mock.calls[0]?.[0]).toStrictEqual({
      type: "req",
      id: "REQ-a",
      properties: { title: "REQ-a", status: "open" },
      ...expected,
    });
  });

  test.each(["scenario", "test", "adr", "flag", "event", "symbol", "fact"])(
    "a %s step is a supported entity type",
    async (type) => {
      const validate = track(
        spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
          async () => {
            throw new Error("stop");
          },
        ),
      );
      const s = setup({ steps: [req("X-1", { type })] as never });
      expect((await failure(s.run())).message).toBe(
        "Apply plan failed before any write: step X-1 is invalid: stop",
      );
      expect(validate).toHaveBeenCalledTimes(1);
    },
  );

  test("later steps see what earlier steps stage", async () => {
    const real = upsertModule.validateUpsertForCommit;
    const staged: { entities: string[]; relationships: unknown[] }[] = [];
    const validate = track(
      spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
        (input, context, options) => {
          const view = (
            options as {
              staged: {
                entities: Map<string, unknown>;
                relationships: unknown[];
              };
            }
          ).staged;
          staged.push({
            entities: [...view.entities.keys()],
            relationships: [...view.relationships],
          });
          return real(input, context, options);
        },
      ),
    );
    const s = setup({
      steps: [
        req("REQ-a", {
          relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-x" }],
        }),
        req("REQ-b"),
      ] as never,
    });
    await s.run();
    expect(staged[1]?.entities).toEqual(["REQ-a"]);
    expect(staged[1]?.relationships).toEqual([
      { type: "relates_to", from: "REQ-a", to: "REQ-x" },
    ]);
    expect(staged[0]?.relationships).toEqual([]);
    expect(validate.mock.calls[0]?.[1]).toMatchObject({ sourceFirst: false });
  });

  test("an invalid step fails before any write", async () => {
    for (const thrown of [new Error("bad title"), "plain"]) {
      const validate = track(
        spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
          async () => {
            throw thrown;
          },
        ),
      );
      const s = setup();
      expect((await failure(s.run())).message).toBe(
        `Apply plan failed before any write: step REQ-apply is invalid: ${thrown instanceof Error ? thrown.message : thrown}`,
      );
      expect(s.files()).toEqual([".kb/.keep"]);
      validate.mockRestore();
    }
  });
});

describe("the staged what-if preflight", () => {
  const answering = (result: PrologQueryResult) => ({
    answer: (goal: string) =>
      goal.includes("checks:what_if_analysis_json(") ? result : undefined,
  });

  test("a rejected staging names the store error", async () => {
    const s = setup(
      {},
      answering({ success: false, bindings: {}, error: "boom" }),
    );
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed before any write: the store rejected the staged plan: boom",
    );
    const t = setup({}, answering({ success: false, bindings: {} }));
    expect((await failure(t.run())).message).toBe(
      "Apply plan failed before any write: the store rejected the staged plan: unknown error",
    );
  });

  test("an unreadable analysis is refused", async () => {
    const s = setup(
      {},
      answering({ success: true, bindings: { JsonString: "x" } }),
    );
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed before any write: the staged plan's contradiction analysis could not be read",
    );
  });

  test("introduced witnesses that do not block are accepted", async () => {
    const s = setup(
      {},
      answering(
        whatIfResult({
          introduced: [
            { status: "compatible", requirements: ["REQ-a"], reason: "ok" },
          ],
        }),
      ),
    );
    await expect(s.run()).resolves.toBeDefined();
  });

  test("introduced blocking witnesses are refused", async () => {
    const witness = (extra: Record<string, unknown>) => ({
      status: "contradiction",
      requirements: ["REQ-a", "REQ-b"],
      reason: "",
      ...extra,
    });
    const s = setup(
      {},
      answering(
        whatIfResult({
          introduced: [witness({ reason: "same key" }), witness({})],
        }),
      ),
    );
    const message = (await failure(s.run())).message;
    expect(message).toStartWith(
      "Apply plan failed before any write: the staged plan introduces 2 contradiction(s) or infeasible scenario(s): ",
    );
    expect(s.files()).toEqual([".kb/.keep"]);
    expect(message).toEndWith(": same key; REQ-a/REQ-b");
  });
});

describe("plan file writes", () => {
  const sw = (
    file: string,
    body: string,
    before?: string,
  ): SourceWritePlan => ({
    path: file,
    mode: "write",
    beforeHash: before === undefined ? null : sha(before),
    afterHash: sha(body),
    body,
  });

  test("approved source writes are published as exact bytes", async () => {
    const s = setup(
      {
        steps: [
          req("REQ-apply", {
            document: { path: ".kb/requirements/REQ-apply.md" },
          }),
        ] as never,
        sourceWrites: [
          sw(".kb/requirements/REQ-apply.md", "---\nid: REQ-apply\n---\n"),
          sw("docs/notes.md", "notes\n", "old\n"),
        ],
      },
      { files: { "docs/notes.md": "old\n" } },
    );
    const loads = track(spyOn(discoveryEntities, "loadEntities"));
    const result = await s.run();
    expect(s.read(".kb/requirements/REQ-apply.md")).toBe(
      "---\nid: REQ-apply\n---\n",
    );
    expect(s.read("docs/notes.md")).toBe("notes\n");
    expect(result.structuredContent).toMatchObject({
      changedPaths: [".kb/requirements/REQ-apply.md", "docs/notes.md"],
    });
    expect(loads).toHaveBeenCalledTimes(2);
    const journal = s.prepared();
    expect(journal.summary.planPaths).toEqual([
      ".kb/requirements/REQ-apply.md",
      "docs/notes.md",
    ]);
    expect(journal.files[1]).toMatchObject({
      origin: "plan",
      before: "old\n",
      beforeHash: sha("old\n"),
      after: "notes\n",
      afterHash: sha("notes\n"),
    });
  });

  test("a planned delete is journaled with null after bytes", async () => {
    const s = setup(
      {
        sourceWrites: [
          {
            path: "docs/gone.md",
            mode: "delete",
            beforeHash: sha("g"),
            afterHash: null,
          },
        ],
      },
      { files: { "docs/gone.md": "g" } },
    );
    await s.run();
    expect(s.exists("docs/gone.md")).toBe(false);
    expect(s.prepared().files[0]).toMatchObject({
      mode: "delete",
      after: null,
      afterHash: null,
    });
  });

  test("a source write listed twice is refused", async () => {
    const s = setup({
      sourceWrites: [sw("docs/a.md", "a"), sw("docs/./a.md", "a")],
    });
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed: sourceWrites lists docs/./a.md more than once",
    );
  });

  test("a planned write needs no unlink support", async () => {
    const { unlink: _unlink, ...fs } = nodeFilesystem;
    const s = setup(
      { sourceWrites: [sw("docs/a.md", "a\n")] },
      { fs: fs as never },
    );
    await s.run();
    expect(s.read("docs/a.md")).toBe("a\n");
  });

  test("a shard directory linked out of the workspace is refused", async () => {
    const outside = tempWorkspace();
    const s = setup({
      steps: [
        req("REQ-a", {
          relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-x" }],
        }),
      ] as never,
    });
    symlinkSync(outside, path.join(s.root, ".kb", "relationships"));
    await expect(s.run()).rejects.toThrow();
    expect(readdirSync(outside)).toEqual([]);
  });

  test("a new relationship extends an existing shard", async () => {
    const first = setup({
      steps: [
        req("REQ-a", {
          relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-x" }],
        }),
      ] as never,
    });
    await first.run();
    const shardPath = first.files(".kb/relationships")[0] as string;
    const shard = first.read(shardPath);
    const s = setup(
      {
        steps: [
          req("REQ-a", {
            relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-y" }],
          }),
        ] as never,
      },
      { files: { [shardPath]: shard } },
    );
    await s.run();
    const file = s
      .prepared()
      .files.find((row: { path: string }) => row.path === shardPath);
    expect(file).toMatchObject({
      origin: "relationship-shard",
      mode: "write",
      before: shard,
      beforeHash: sha(shard),
    });
    expect(file.after).toContain("REQ-y");
    expect(file.afterHash).toBe(sha(file.after));
  });

  test("a relationship rewrites a shard the plan deletes", async () => {
    const first = setup({
      steps: [
        req("REQ-a", {
          relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-x" }],
        }),
      ] as never,
    });
    await first.run();
    const shardPath = first.files(".kb/relationships")[0] as string;
    const shard = first.read(shardPath);
    const s = setup(
      {
        steps: [
          req("REQ-a", {
            relationships: [{ type: "relates_to", from: "REQ-a", to: "REQ-y" }],
          }),
        ] as never,
        sourceWrites: [
          {
            path: shardPath,
            mode: "delete",
            beforeHash: sha(shard),
            afterHash: null,
          },
        ],
      },
      { files: { [shardPath]: shard } },
    );
    await s.run();
    const file = s
      .prepared()
      .files.find((row: { path: string }) => row.path === shardPath);
    expect(file).toMatchObject({ origin: "plan", mode: "write" });
    expect(file.after).toContain("REQ-y");
    expect(file.after).not.toContain("REQ-x");
    expect(file.afterHash).toBe(sha(file.after));
  });

  test("a planned delete needs unlink support", async () => {
    const { unlink: _unlink, ...fs } = nodeFilesystem;
    const s = setup(
      {
        sourceWrites: [
          {
            path: "docs/gone.md",
            mode: "delete",
            beforeHash: sha("g"),
            afterHash: null,
          },
        ],
      },
      { files: { "docs/gone.md": "g" }, fs: fs as never },
    );
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed: delete requires filesystem unlink support: docs/gone.md",
    );
  });

  test("a step writing a deleted document is refused", async () => {
    const s = setup(
      {
        sourceWrites: [
          {
            path: ".kb/requirements/REQ-apply.md",
            mode: "delete",
            beforeHash: sha("x"),
            afterHash: null,
          },
        ],
      },
      { files: { ".kb/requirements/REQ-apply.md": "x" } },
    );
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed: step REQ-apply writes .kb/requirements/REQ-apply.md, which the plan deletes",
    );
  });

  test("an existing document is merged and an existing entity keeps its source", async () => {
    track(
      spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
        async (input) =>
          ({
            validated: {
              entity: {
                id: input.id,
                type: input.type,
                title: "t",
                status: "open",
              },
              relationships: [],
            },
          }) as never,
      ),
    );
    const loads = track(
      spyOn(discoveryEntities, "loadEntities").mockImplementation(
        async () =>
          [
            {
              id: "REQ-apply",
              type: "req",
              title: "REQ-apply",
              status: "open",
              source: ".kb/requirements/custom.md",
            },
          ] as never,
      ),
    );
    const s = setup(
      {},
      {
        files: { ".kb/requirements/custom.md": "# Custom\n\nKept prose.\n" },
      },
    );
    const result = await s.run();
    expect(loads.mock.calls[0]?.[1]).toEqual({ id: "REQ-apply", type: "req" });
    expect(result.structuredContent).toMatchObject({
      changedPaths: [".kb/requirements/custom.md"],
    });
    expect(s.read(".kb/requirements/custom.md")).toContain("Kept prose.");
    expect(s.prepared().files[0]).toMatchObject({
      before: "# Custom\n\nKept prose.\n",
      beforeHash: sha("# Custom\n\nKept prose.\n"),
    });
  });

  test("symbol steps keep the upsert path and write no document", async () => {
    const validate = track(
      spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
        async (input) =>
          ({
            validated: {
              entity: { id: input.id, type: input.type, title: "s" },
              relationships: [],
            },
          }) as never,
      ),
    );
    const s = setup({ steps: [req("SYM-a", { type: "symbol" })] as never });
    const result = await s.run();
    expect(validate).toHaveBeenCalled();
    expect(result.structuredContent).toMatchObject({ changedPaths: [] });
    expect("source" in s.prepared().store.entries[0].entity).toBe(false);
  });

  test("relationship shards default the source and skip incomplete rows", async () => {
    track(
      spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
        async (input) =>
          ({
            validated: {
              entity: {
                id: input.id,
                type: input.type,
                title: "t",
                status: "open",
              },
              relationships: [
                { type: "relates_to", to: "REQ-x" },
                { type: "relates_to", from: 7, to: "REQ-y" },
                { type: 7, from: "REQ-a", to: "REQ-z" },
                { type: "relates_to", from: "REQ-a", to: 7 },
                { type: "", from: "REQ-a", to: "REQ-z" },
                { type: "relates_to", from: "", to: "REQ-z" },
              ],
            },
          }) as never,
      ),
    );
    const s = setup({ steps: [req("REQ-a")] as never });
    await s.run();
    const shards = s
      .prepared()
      .files.filter(
        (file: { origin: string }) => file.origin === "relationship-shard",
      );
    expect(shards).toHaveLength(1);
    expect(shards[0].after).toContain("REQ-x");
    expect(shards[0].after).toContain("REQ-y");
    expect(shards[0].after).not.toContain("REQ-z");
    expect(shards[0].after.match(/from: REQ-a/g)?.length).toBe(2);
  });

  test("an already recorded relationship leaves its shard untouched", async () => {
    const relationship = { type: "relates_to", from: "REQ-a", to: "REQ-x" };
    const first = setup({
      steps: [req("REQ-a", { relationships: [relationship] })] as never,
    });
    await first.run();
    const shardPath = first.files(".kb/relationships")[0] as string;
    const shard = first.read(shardPath);
    const s = setup(
      { steps: [req("REQ-a", { relationships: [relationship] })] as never },
      { files: { [shardPath]: shard } },
    );
    await s.run();
    expect(
      s.prepared().files.map((file: { origin: string }) => file.origin),
    ).toEqual(["entity-document"]);
    expect(s.read(shardPath)).toBe(shard);
  });

  test("a step that skips contradiction checks is journaled so", async () => {
    const s = setup({
      steps: [req("REQ-apply", { _skipContradictionCheck: true })] as never,
    });
    track(
      spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
        async (input) =>
          ({
            validated: {
              entity: {
                id: input.id,
                type: input.type,
                title: "t",
                status: "open",
              },
              relationships: [],
            },
          }) as never,
      ),
    );
    await s.run();
    expect(s.prepared().store.entries[0].skipContradictionCheck).toBe(false);
  });
});

describe("the journaled commit", () => {
  function slot(state: string | null) {
    return track(
      spyOn(journalModule, "openPlanApplyJournal").mockImplementation(
        (context, planHash) =>
          ({
            journalId: `plan-apply-${planHash.slice(0, 16)}`,
            journalPath: path.join(context.workspaceRoot, ".kb", "j.json"),
            branch: "develop",
            existing: state === null ? null : { state },
          }) as never,
      ),
    );
  }

  test("a committed journal refuses a second application", async () => {
    slot("committed");
    const s = setup();
    const error = await failure(s.run());
    expect(error.code).toBe("MUTATION_ALREADY_COMMITTED");
    expect(error.retryable).toBe(false);
    expect(error.message).toBe(
      `MUTATION_ALREADY_COMMITTED: plan ${s.plan.planHash} was already applied (journal ${s.journalId}); compile a fresh plan instead of applying it again`,
    );
  });

  test("an unfinished journal asks for recovery", async () => {
    slot("prepared");
    const s = setup();
    const error = await failure(s.run());
    expect(error.code).toBe("PLAN_APPLY_RECOVERY_REQUIRED");
    expect(error.retryable).toBe(false);
    expect(error.message).toBe(
      `Plan ${s.plan.planHash} has an unfinished journal ${s.journalId}; run kb_apply_plan with recoveryJournalId=${s.journalId} before applying it again`,
    );
  });

  test("a rolled-back journal applies again", async () => {
    slot("rolled_back");
    const s = setup();
    await expect(s.run()).resolves.toBeDefined();
  });

  test("an unfingerprintable store fails before any write", async () => {
    const s = setup(
      {},
      {
        answer: (goal) =>
          goal.includes("sha_hash")
            ? { success: false, bindings: {}, error: "down" }
            : undefined,
      },
    );
    expect((await failure(s.run())).message).toBe(
      "Apply plan failed before any write: the store could not be fingerprinted for the plan journal: store fingerprint query failed: down",
    );
    expect(s.files()).toEqual([".kb/.keep"]);
  });

  test("a publish failure restores the files and rolls the journal back", async () => {
    track(
      spyOn(journalModule, "publishJournaledFiles").mockImplementation(
        async () => {
          throw new Error("disk full");
        },
      ),
    );
    const s = setup();
    const error = await failure(s.run());
    expect(error).not.toBeInstanceOf(OperationError);
    expect(error.message).toBe(
      `Apply plan failed while publishing its source writes; no change was applied (store unchanged, 0 source file(s) restored from journal ${s.journalId}): disk full`,
    );
    const journal = s.journal();
    expect(journal.state).toBe("rolled_back");
    expect(journal.resolution).toEqual({
      action: "rolled_back",
      by: "apply",
      detail: `Plan ${s.plan.planHash.slice(0, 12)} failed while publishing its source writes; no change was applied: the store is unchanged and 0 source file(s) were restored from journal ${s.journalId}.`,
    });
    expect(s.committed).toEqual([]);
  });

  test("a typed failure keeps its code and retryability", async () => {
    track(
      spyOn(journalModule, "publishJournaledFiles").mockImplementation(
        async () => {
          throw new OperationError("DISK", "typed", false);
        },
      ),
    );
    const s = setup();
    const error = await failure(s.run());
    expect(error).toBeInstanceOf(OperationError);
    expect(error.code).toBe("DISK");
    expect(error.retryable).toBe(false);
    expect(error.message).toContain("while publishing its source writes");
  });

  test("a failed restore keeps the journal for recovery", async () => {
    track(
      spyOn(journalModule, "publishJournaledFiles").mockImplementation(
        async () => {
          throw new Error("disk full");
        },
      ),
    );
    track(
      spyOn(journalModule, "restoreJournaledFiles").mockImplementation(
        async () => {
          throw "restore failed";
        },
      ),
    );
    const s = setup();
    const error = await failure(s.run());
    expect(error.code).toBe("PLAN_APPLY_RECOVERY_REQUIRED");
    expect(error.retryable).toBe(false);
    expect(error.message).toBe(
      `Plan ${s.plan.planHash} failed while publishing its source writes (disk full), and restoring its source writes also failed (restore failed). Journal ${s.journalId} is kept: the next kb_apply_plan or kb_upsert call rolls it back, or run kb_apply_plan with recoveryJournalId=${s.journalId}`,
    );
  });

  test("a failed rollback record still reports the rollback", async () => {
    track(
      spyOn(journalModule, "publishJournaledFiles").mockImplementation(
        async () => {
          throw new Error("disk full");
        },
      ),
    );
    const record = track(
      spyOn(journalModule, "recordPlanApplyJournal").mockImplementation(() => {
        throw new Error("record failed");
      }),
    );
    const s = setup();
    expect((await failure(s.run())).message).toContain(
      "while publishing its source writes; no change was applied",
    );
    expect(record).toHaveBeenCalledTimes(1);
  });

  test("source writes are validated again once published", async () => {
    let calls = 0;
    track(
      spyOn(upsertModule, "validateUpsertForCommit").mockImplementation(
        async (input) => {
          calls += 1;
          if (calls === 2) throw new Error("published bytes differ");
          return {
            validated: {
              entity: {
                id: input.id,
                type: input.type,
                title: "t",
                status: "open",
              },
              relationships: [],
            },
          } as never;
        },
      ),
    );
    const s = setup({
      sourceWrites: [
        {
          path: "docs/a.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha("a"),
          body: "a",
        },
      ],
    });
    const error = await failure(s.run());
    expect(error.message).toBe(
      `Apply plan failed validation against its published source writes; no change was applied (store unchanged, 2 source file(s) restored from journal ${s.journalId}): step REQ-apply is invalid: published bytes differ`,
    );
    expect(s.exists("docs/a.md")).toBe(false);
  });

  test("plans without source writes are not validated twice", async () => {
    const validate = track(spyOn(upsertModule, "validateUpsertForCommit"));
    const s = setup();
    await s.run();
    expect(validate).toHaveBeenCalledTimes(1);
  });

  test("a failed store_committing record rolls back", async () => {
    const real = journalModule.recordPlanApplyJournal;
    track(
      spyOn(journalModule, "recordPlanApplyJournal").mockImplementation(
        (handle, update) => {
          if (update.state === "store_committing")
            throw new Error("record failed");
          return real(handle, update);
        },
      ),
    );
    const s = setup();
    expect((await failure(s.run())).message).toStartWith(
      "Apply plan failed while journaling its store commit; no change was applied",
    );
  });

  test("a store rejection with an unchanged store rolls back", async () => {
    const s = setup(
      {},
      {
        answer: (goal) =>
          goal.includes("kb_commit_upsert")
            ? { success: false, bindings: {}, error: "rejected" }
            : undefined,
      },
    );
    const message = (await failure(s.run())).message;
    expect(message).toStartWith(
      `Apply plan failed at its store commit; no change was applied (store unchanged, 1 source file(s) restored from journal ${s.journalId}): the store rejected the plan's batch transaction: `,
    );
    expect(message).toContain("REQ-apply");
    expect(message).not.toContain("plan batch");
    expect(s.exists(".kb/requirements/REQ-apply.md")).toBe(false);
  });

  test("a multi-entity rejection names the batch", async () => {
    const s = setup(
      { steps: [req("REQ-a"), req("REQ-b"), req("REQ-a")] as never },
      {
        answer: (goal) =>
          goal.includes("kb_commit_upsert")
            ? { success: false, bindings: {}, error: "rejected" }
            : undefined,
      },
    );
    expect((await failure(s.run())).message).toContain(
      "plan batch [REQ-a, REQ-b]",
    );
  });

  test("a rejection whose store cannot be probed is trusted", async () => {
    let fingerprints = 0;
    const s = setup(
      {},
      {
        answer: (goal) => {
          if (goal.includes("kb_commit_upsert"))
            return { success: false, bindings: {}, error: "rejected" };
          if (goal.includes("sha_hash") && ++fingerprints > 1)
            return { success: false, bindings: {}, error: "down" };
          return undefined;
        },
      },
    );
    expect((await failure(s.run())).message).toStartWith(
      "Apply plan failed at its store commit; no change was applied",
    );
  });

  test("a lost store connection with no probe keeps the journal", async () => {
    let fingerprints = 0;
    const s = setup(
      {},
      {
        answer: (goal) => {
          if (goal.includes("kb_commit_upsert"))
            throw new Error("socket closed");
          if (goal.includes("sha_hash") && ++fingerprints > 1)
            throw "probe failed";
          return undefined;
        },
      },
    );
    const error = await failure(s.run());
    expect(error.code).toBe("PLAN_APPLY_RECOVERY_REQUIRED");
    expect(error.retryable).toBe(false);
    expect(error.message).toBe(
      `Plan ${s.plan.planHash} lost contact with the store during its commit (socket closed), and the store could not be inspected (probe failed). Journal ${s.journalId} is kept: the next kb_apply_plan or kb_upsert call completes or rolls it back, or run kb_apply_plan with recoveryJournalId=${s.journalId}`,
    );
  });

  test("a reported failure the store shows committed is kept as applied", async () => {
    let fingerprints = 0;
    const s = setup(
      {},
      {
        answer: (goal) => {
          if (goal.includes("kb_commit_upsert"))
            throw new Error("socket closed");
          if (goal.includes("sha_hash"))
            return {
              success: true,
              bindings: { FingerprintHash: `'h${++fingerprints}'` },
            };
          return undefined;
        },
      },
    );
    const result = await s.run();
    expect(s.committed).toEqual([1]);
    expect(result.structuredContent).toMatchObject({
      status: "committed_with_repairs",
      effectFailures: [
        {
          kind: "store-commit",
          errorCode: "STORE_COMMIT_REPORTED_FAILURE",
          detail:
            "The store reported a failure (socket closed) but shows the plan's batch committed; the plan is kept as applied.",
        },
      ],
      nextActions: [
        {
          operation: "kb_status",
          reason:
            "The store committed the plan's batch while reporting a failure; confirm the branch snapshot is persisted before further writes.",
          required: true,
        },
        {
          operation: "kb_check",
          reason:
            "Run the consistency checks after the unconfirmed store commit and follow their typed repair actions.",
          required: true,
        },
      ],
    });
  });

  test("an unchanged fingerprint after a transport failure rolls back", async () => {
    const s = setup(
      {},
      {
        answer: (goal) => {
          if (goal.includes("kb_commit_upsert"))
            throw new Error("socket closed");
          return undefined;
        },
      },
    );
    expect((await failure(s.run())).message).toStartWith(
      "Apply plan failed at its store commit; no change was applied",
    );
  });

  test("a receipt failure after the commit asks to recover the journal", async () => {
    track(
      spyOn(journalModule, "reconcilePendingSourceReceipts").mockImplementation(
        () => {
          throw new Error("receipt failed");
        },
      ),
    );
    const s = setup();
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      status: "committed_with_repairs",
      changedPaths: [".kb/requirements/REQ-apply.md"],
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
          input: { recoveryJournalId: s.journalId },
          reason:
            "The plan committed, but binding its new source files to pending-source receipts failed; recovering the journal finishes the receipts. Do not apply the original plan again.",
          required: true,
        },
      ],
    });
    expect(s.journal().state).toBe("store_committed");
  });

  test("journal records after the commit are best effort", async () => {
    const real = journalModule.recordPlanApplyJournal;
    track(
      spyOn(journalModule, "recordPlanApplyJournal").mockImplementation(
        (handle, update) => {
          if (update.state !== "store_committing")
            throw new Error("record failed");
          return real(handle, update);
        },
      ),
    );
    const s = setup();
    await expect(s.run()).resolves.toBeDefined();
    expect(s.journal().state).toBe("store_committing");
  });

  test("the commit invalidates the Prolog cache", async () => {
    const s = setup();
    let invalidated = 0;
    (s.context.prolog as { invalidateCache?: () => void }).invalidateCache =
      () => {
        invalidated += 1;
      };
    const query = s.context.prolog?.query.bind(s.context.prolog);
    let afterCommit = -1;
    (s.context.prolog as { query: unknown }).query = async (goal: string) => {
      const result = await query?.(goal);
      if (goal.includes("kb_commit_upsert")) afterCommit = invalidated;
      return result;
    };
    await s.run();
    expect(invalidated).toBeGreaterThan(afterCommit);
  });
});

describe("post-commit readback", () => {
  test.each([
    ["no final status", "final status query returned no payload"],
    ["an unavailable workspace", "gone"],
  ])("%s keeps the plan applied with repairs", async (name, detail) => {
    const plan = compilePlan();
    let statusCalls = 0;
    track(
      spyOn(
        await import(
          "../../../../src/public/operations/discovery-executors.js"
        ),
        "executeStatus",
      ).mockImplementation(async () => {
        statusCalls += 1;
        return {
          content: [],
          structuredContent:
            name === "no final status" && statusCalls > 1
              ? undefined
              : { branch: "develop", snapshotId: "missing" },
        } as never;
      }),
    );
    let snapshots = 0;
    const h = harness({
      git: {
        workspaceSnapshot: async () => {
          snapshots += 1;
          if (name !== "no final status" && snapshots > 1)
            throw new Error("gone");
          return {
            version: "kibi.workspace-snapshot.v2",
            hash: HASH,
            dirty: false,
            fileCount: 1,
          };
        },
      } as never,
    });
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      h.context,
    );
    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      finalSnapshots: {
        branch: "develop",
        kbSnapshotId: "missing",
        workspaceSnapshot: HASH,
      },
      status: "committed_with_repairs",
      effectFailures: [
        {
          kind: "post-commit-readback",
          errorCode: "POST_COMMIT_READBACK_FAILED",
          detail,
        },
      ],
      nextActions: [
        {
          operation: "kb_status",
          reason:
            "The plan committed its source and compiled mutations, but final status readback failed; inspect the committed snapshot before any repair.",
          required: true,
        },
        {
          operation: "kb_check",
          reason:
            "After status is readable, run the consistency checks and follow their typed repair actions.",
          required: true,
        },
      ],
    });
  });

  test("final snapshots come from the live readback", async () => {
    const plan = compilePlan();
    let statusCalls = 0;
    track(
      spyOn(
        await import(
          "../../../../src/public/operations/discovery-executors.js"
        ),
        "executeStatus",
      ).mockImplementation(async () => {
        statusCalls += 1;
        return {
          content: [],
          structuredContent:
            statusCalls > 1
              ? { branch: "develop2", snapshotId: "after" }
              : { branch: "develop", snapshotId: "missing" },
        } as never;
      }),
    );
    let snapshots = 0;
    const h = harness({
      git: {
        workspaceSnapshot: async () => ({
          version: "kibi.workspace-snapshot.v2",
          hash: ++snapshots > 1 ? "b".repeat(64) : HASH,
          dirty: false,
          fileCount: 1,
        }),
      } as never,
    });
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      h.context,
    );
    expect(result.structuredContent).toMatchObject({
      finalSnapshots: {
        branch: "develop2",
        kbSnapshotId: "after",
        workspaceSnapshot: "b".repeat(64),
      },
    });
    expect("status" in result.structuredContent).toBe(false);
    expect(readFileSync).toBeDefined();
    expect((h.context as OperationContext).workspaceRoot).toBe(h.root);
  });
});
