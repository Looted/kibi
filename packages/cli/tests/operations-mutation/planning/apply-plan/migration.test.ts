import { describe, expect, spyOn, test } from "bun:test";
import * as branchModule from "../../../../src/commands/branch.js";
import * as migrateModule from "../../../../src/commands/migrate.js";
import * as syncModule from "../../../../src/commands/sync.js";
import * as schema6Module from "../../../../src/operations/migration/schema6.js";
import * as upsertModule from "../../../../src/operations/mutation/upsert.js";
import { executeApplyPlan } from "../../../../src/operations/planning/apply-plan.js";
import { MigrationActionRefusedError } from "../../../../src/operations/planning/migration-refusal.js";
import * as proofModule from "../../../../src/proof/integration-plan.js";
import * as checkModule from "../../../../src/public/operations/check-executor.js";
import * as discoveryEntities from "../../../../src/public/operations/discovery-entities.js";
import * as discoveryExecutors from "../../../../src/public/operations/discovery-executors.js";
import {
  type MigrationAction,
  migrationAction,
} from "../../../../src/public/operations/migration-plan.js";
import * as migrationPlanModule from "../../../../src/public/operations/migration-plan.js";
import type { OperationContext } from "../../../../src/public/operations/runtime-types.js";
import * as reportingModule from "../../../../src/public/operations/specs/reporting.js";
import {
  HASH,
  type HarnessOptions,
  cleanUpAfterEach,
  harness,
  migrationPlan,
  track,
} from "./harness.js";

cleanUpAfterEach();

const UNBOUND = {
  branch: null,
  kbBranch: null,
  kbSnapshotId: null,
  workspaceSnapshot: null,
  configHash: null,
};

function statuses(...values: Array<Record<string, unknown> | undefined>) {
  let call = 0;
  return track(
    spyOn(discoveryExecutors, "executeStatus").mockImplementation(async () => {
      const value = values[Math.min(call, values.length - 1)];
      call += 1;
      return { content: [], structuredContent: value } as never;
    }),
  );
}
const live = (extra: Record<string, unknown> = {}) => ({
  branch: "develop",
  snapshotId: HASH,
  ...extra,
});

function setup(
  actions: Array<Partial<MigrationAction> & Pick<MigrationAction, "id">>,
  expected: Record<string, unknown> = UNBOUND,
  options: HarnessOptions = {},
) {
  const plan = migrationPlan(actions, { expected } as never);
  const h = harness(options);
  const committed: number[] = [];
  const run = (approvedActionIds = actions.map((action) => action.id)) =>
    executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash, approvedActionIds },
      h.context,
      () => committed.push(1),
    );
  return { ...h, plan, committed, run };
}

const cli = (code: string, argv: string[] = []) => ({
  code,
  invocation: { kind: "cli", command: "kibi", command_argv: argv } as never,
});

function stubSync(success = true) {
  return track(
    spyOn(syncModule, "syncCommand").mockImplementation(
      async () => ({ success }) as never,
    ),
  );
}

describe("migration plan live-state checks", () => {
  test("a missing initial status is refused", async () => {
    statuses(undefined);
    const s = setup([{ id: "m1" }]);
    await expect(s.run()).rejects.toThrow(
      /^Migration apply failed: status query returned no payload$/,
    );
  });

  test.each([
    [
      "branch",
      { ...UNBOUND, branch: "main" },
      "active branch changed since planning",
    ],
    [
      "kbBranch",
      { ...UNBOUND, kbBranch: "main" },
      "KB branch changed since planning",
    ],
    [
      "kbSnapshotId",
      { ...UNBOUND, kbSnapshotId: "b".repeat(64) },
      "KB snapshot changed since planning",
    ],
    [
      "workspaceSnapshot",
      { ...UNBOUND, workspaceSnapshot: "b".repeat(64) },
      "workspace snapshot changed since planning",
    ],
    [
      "configHash",
      { ...UNBOUND, configHash: "b".repeat(64) },
      "config changed since planning",
    ],
  ])("a changed %s is refused", async (_name, expected, message) => {
    statuses(live());
    const s = setup([{ id: "m1" }], expected);
    await expect(s.run()).rejects.toThrow(`Migration apply failed: ${message}`);
  });

  test("matching bindings pass", async () => {
    statuses(live());
    const config = track(
      spyOn(
        migrationPlanModule,
        "readMigrationConfigStatus",
      ).mockImplementation(() => ({ configHash: HASH }) as never),
    );
    const s = setup([{ id: "m1", ...cli("missing_exact_branch_store") }], {
      branch: "develop",
      kbBranch: "develop",
      kbSnapshotId: HASH,
      workspaceSnapshot: HASH,
      configHash: HASH,
    });
    track(
      spyOn(branchModule, "branchEnsureCommand").mockImplementation(
        async () => undefined as never,
      ),
    );
    await s.run();
    expect(config.mock.calls[0]?.[0]).toBe(s.root);
  });

  test("an unbound config hash is not read back", async () => {
    statuses(live());
    track(
      spyOn(
        migrationPlanModule,
        "readMigrationConfigStatus",
      ).mockImplementation(() => ({ configHash: HASH }) as never),
    );
    track(
      spyOn(branchModule, "branchEnsureCommand").mockImplementation(
        async () => undefined as never,
      ),
    );
    const s = setup([{ id: "m1", ...cli("missing_exact_branch_store") }]);
    expect((await s.run()).structuredContent).toMatchObject({
      outcome: "applied",
    });
  });

  test("an unavailable workspace is refused", async () => {
    statuses(live());
    const s = setup(
      [{ id: "m1" }],
      { ...UNBOUND, workspaceSnapshot: HASH },
      {
        git: null,
      },
    );
    await expect(s.run()).rejects.toThrow(
      "Migration apply failed: workspace snapshot changed since planning",
    );
  });

  test("a missing final status or workspace stops the report", async () => {
    statuses(live(), undefined);
    track(
      spyOn(branchModule, "branchEnsureCommand").mockImplementation(
        async () => undefined as never,
      ),
    );
    const s = setup([{ id: "m1", ...cli("missing_exact_branch_store") }]);
    await expect(s.run()).rejects.toThrow(
      /^Migration apply failed: final status query returned no payload$/,
    );
  });

  test("an unavailable final workspace stops the report", async () => {
    statuses(live());
    track(
      spyOn(branchModule, "branchEnsureCommand").mockImplementation(
        async () => undefined as never,
      ),
    );
    const s = setup(
      [{ id: "m1", ...cli("missing_exact_branch_store") }],
      UNBOUND,
      {
        git: null,
      },
    );
    await expect(s.run()).rejects.toThrow(
      "Migration apply failed: The active operation runtime does not expose workspace snapshots.",
    );
  });
});

describe("migration action execution", () => {
  test("actions run in dependency order and the report closes out", async () => {
    statuses(live({ syncState: "fresh" }));
    const order: string[] = [];
    track(
      spyOn(branchModule, "branchEnsureCommand").mockImplementation(
        async (options) => {
          order.push(
            `ensure:${(options as { workspaceRoot: string }).workspaceRoot}`,
          );
          return undefined as never;
        },
      ),
    );
    track(
      spyOn(branchModule, "branchRecoverCommand").mockImplementation(
        async (options) => {
          order.push(`recover:${JSON.stringify(options)}`);
          return undefined as never;
        },
      ),
    );
    const s = setup([
      { id: "m2", ...cli("damaged_exact_branch_store"), dependsOn: ["m1"] },
      { id: "m1", ...cli("missing_exact_branch_store") },
    ]);
    const result = await s.run();
    expect(order).toEqual([
      `ensure:${s.root}`,
      `recover:${JSON.stringify({ apply: true, workspaceRoot: s.root })}`,
    ]);
    expect(s.committed).toEqual([1, 1]);
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: `Applied migration plan ${s.plan.planHash.slice(0, 12)}.`,
        },
      ],
      structuredContent: {
        version: "kibi.migration-apply-result.v1",
        outcome: "applied",
        planHash: s.plan.planHash,
        actionResults: [
          {
            actionId: "m1",
            outcome: "applied",
            detail: "Applied missing_exact_branch_store.",
          },
          {
            actionId: "m2",
            outcome: "applied",
            detail: "Applied damaged_exact_branch_store.",
          },
        ],
        finalSnapshots: {
          branch: "develop",
          kbSnapshotId: HASH,
          workspaceSnapshot: HASH,
        },
        notes: [
          "Migration actions were applied sequentially; rerun kibi status, check, and complete coverage to obtain the next plan.",
        ],
        closeout: {
          taskOutcome: "complete",
          kbState: "clean_fresh",
          snapshotState: "not_evaluated",
          proofState: "not_evaluated",
          limitationDisposition: "not_applicable",
        },
      } as never,
    });
  });

  test("a dependency cycle is refused", async () => {
    statuses(live());
    const s = setup([
      { id: "m1", dependsOn: ["m2"] },
      { id: "m2", dependsOn: ["m1"] },
    ]);
    await expect(s.run()).rejects.toThrow(
      /^Migration apply failed: action dependency cycle at 'm1'$/,
    );
  });

  test("a shared dependency runs once", async () => {
    statuses(live());
    const ensure = track(
      spyOn(branchModule, "branchEnsureCommand").mockImplementation(
        async () => undefined as never,
      ),
    );
    const s = setup([
      {
        id: "m3",
        ...cli("missing_exact_branch_store"),
        dependsOn: ["m1", "m2"],
      },
      { id: "m2", ...cli("missing_exact_branch_store"), dependsOn: ["m1"] },
      { id: "m1", ...cli("missing_exact_branch_store") },
    ]);
    const result = await s.run();
    expect(ensure).toHaveBeenCalledTimes(3);
    expect(
      (
        result.structuredContent as unknown as {
          actionResults: { actionId: string }[];
        }
      ).actionResults.map((row) => row.actionId),
    ).toEqual(["m1", "m2", "m3"]);
  });

  test("a failure skips the rest and needs reconciliation", async () => {
    statuses(live());
    track(
      spyOn(branchModule, "branchEnsureCommand").mockImplementation(
        async () => {
          throw "ensure failed";
        },
      ),
    );
    const s = setup([
      { id: "m1", ...cli("missing_exact_branch_store") },
      { id: "m2", ...cli("missing_exact_branch_store"), dependsOn: ["m1"] },
    ]);
    const result = await s.run();
    expect(result.content[0]?.text).toBe(
      `Stopped after migration plan ${s.plan.planHash.slice(0, 12)}.`,
    );
    expect(result.structuredContent).toMatchObject({
      outcome: "reconciliation_required",
      actionResults: [
        { actionId: "m1", outcome: "failed", detail: "ensure failed" },
        {
          actionId: "m2",
          outcome: "skipped",
          detail: "Skipped after an earlier action failed.",
        },
      ],
      closeout: { taskOutcome: "blocked" },
    });
    expect(s.committed).toEqual([]);
  });

  test("a refusal that changed nothing is reported as refused", async () => {
    statuses(live());
    const s = setup([{ id: "m1", code: "no_such_code" }]);
    const result = await s.run();
    expect(result.content[0]?.text).toBe(
      `Refused migration plan ${s.plan.planHash.slice(0, 12)}; nothing was changed.`,
    );
    expect(result.structuredContent).toMatchObject({
      outcome: "refused",
      actionResults: [
        {
          actionId: "m1",
          outcome: "failed",
          detail: "Migration action 'no_such_code' has no automatic executor.",
        },
      ],
      closeout: { taskOutcome: "blocked" },
    });
  });

  test("a failure after an applied action is partial", async () => {
    statuses(live());
    track(
      spyOn(branchModule, "branchEnsureCommand").mockImplementation(
        async () => undefined as never,
      ),
    );
    const s = setup([
      { id: "m1", ...cli("missing_exact_branch_store") },
      { id: "m2", code: "no_such_code" },
    ]);
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      outcome: "partially_applied",
      closeout: { taskOutcome: "interim" },
    });
  });

  test("a mixed refusal and failure needs reconciliation", async () => {
    statuses(live());
    const s = setup([{ id: "m1", ...cli("legacy_branch_storage") }]);
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      outcome: "reconciliation_required",
    });
  });

  test.each([
    [
      { invocation: { kind: "review", instruction: "x" } },
      "Legacy branch migration action is missing its explicit source identity.",
    ],
    [
      cli("legacy_branch_storage", ["--from", "a"]),
      "Legacy branch migration action requires explicit --from and --to.",
    ],
    [
      cli("legacy_branch_storage", ["--to", "b"]),
      "Legacy branch migration action requires explicit --from and --to.",
    ],
    [
      cli("legacy_branch_storage", ["--from"]),
      "Legacy branch migration action requires explicit --from and --to.",
    ],
    [
      cli("legacy_branch_storage", ["--from", "", "--to", "b"]),
      "Legacy branch migration action requires explicit --from and --to.",
    ],
    [
      cli("legacy_branch_storage", ["--from", "a", "--to", ""]),
      "Legacy branch migration action requires explicit --from and --to.",
    ],
  ])("legacy branch storage %p fails", async (edit, detail) => {
    statuses(live());
    const s = setup([
      { id: "m1", code: "legacy_branch_storage", ...(edit as object) },
    ]);
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      actionResults: [{ actionId: "m1", outcome: "failed", detail }],
    });
  });

  test("legacy branch storage migrates the named branches", async () => {
    statuses(live());
    const migrate = track(
      spyOn(branchModule, "branchMigrateCommand").mockImplementation(
        async () => undefined as never,
      ),
    );
    const s = setup([
      {
        id: "m1",
        ...cli("legacy_branch_storage", [
          "branch",
          "--from",
          "old",
          "--to",
          "new",
        ]),
      },
    ]);
    await s.run();
    const t = setup([
      {
        id: "m1",
        ...cli("legacy_branch_storage", ["--from", "a", "--to", "b"]),
      },
    ]);
    await t.run();
    const u = setup([
      {
        id: "m1",
        ...cli("legacy_branch_storage", ["--to", "d", "--from", "c"]),
      },
    ]);
    await u.run();
    expect(migrate.mock.calls).toEqual([
      [{ from: "old", to: "new", apply: true, workspaceRoot: s.root }],
      [{ from: "a", to: "b", apply: true, workspaceRoot: t.root }],
      [{ from: "c", to: "d", apply: true, workspaceRoot: u.root }],
    ]);
  });

  test.each([
    [
      "branch_store_not_compiled",
      "Compiling the branch store (kibi sync) did not complete successfully.",
    ],
    [
      "freshness_resync",
      "Recompiling changed sources (kibi sync) did not complete successfully.",
    ],
    [
      "symbol_refresh_coordinates",
      "Coordinate refresh did not complete successfully.",
    ],
    [
      "coverage_source_coordinates",
      "Coordinate refresh did not complete successfully.",
    ],
  ])("%s runs sync and reports a failed sync", async (code, detail) => {
    statuses(live());
    const sync = stubSync(true);
    const s = setup([{ id: "m1", code }]);
    expect((await s.run()).structuredContent).toMatchObject({
      outcome: "applied",
    });
    const refresh = code.includes("coordinates");
    expect(sync.mock.calls).toEqual([
      [
        refresh
          ? { refreshSymbolCoordinates: true, workspaceRoot: s.root }
          : { workspaceRoot: s.root },
      ],
    ]);
    sync.mockRestore();
    stubSync(false);
    const failed = setup([{ id: "m1", code }]);
    const result = await failed.run();
    expect(result.structuredContent).toMatchObject({
      actionResults: [{ actionId: "m1", outcome: "failed", detail }],
    });
  });

  test.each([
    "schema_version_upgrade",
    "invalid_schema_version",
    "legacy_storage_migration",
  ])("%s runs the schema migration", async (code) => {
    statuses(live());
    const migrate = track(
      spyOn(migrateModule, "migrateCommand").mockImplementation(
        async () => ({ exitCode: 0 }) as never,
      ),
    );
    const s = setup([{ id: "m1", code }]);
    const result = await s.run();
    expect(migrate.mock.calls).toEqual([
      [{ yes: true, workspaceRoot: s.root, initializeMissingConfig: true }],
    ]);
    expect(result.structuredContent).toMatchObject({
      actionResults: [{ detail: `Applied ${code}.` }],
    });
  });

  test("a schema migration reports its summary or its failure", async () => {
    statuses(live());
    const describeRun = track(
      spyOn(migrateModule, "describeMigrationRun").mockImplementation(
        () => "Migrated 3 files.",
      ),
    );
    const migrate = track(
      spyOn(migrateModule, "migrateCommand").mockImplementation(
        async () => ({ exitCode: 0, summary: { files: 3 } }) as never,
      ),
    );
    const s = setup([{ id: "m1", code: "schema_version_upgrade" }]);
    const result = await s.run();
    expect(describeRun.mock.calls).toEqual([[{ files: 3 }]] as never);
    expect(result.structuredContent).toMatchObject({
      actionResults: [{ detail: "Migrated 3 files." }],
    });
    migrate.mockImplementation(async () => ({ exitCode: 1 }) as never);
    const failed = setup([{ id: "m1", code: "schema_version_upgrade" }]);
    expect((await failed.run()).structuredContent).toMatchObject({
      actionResults: [
        {
          outcome: "failed",
          detail: "Schema migration did not complete successfully.",
        },
      ],
    });
  });

  test("proof integration actions configure the workspace", async () => {
    statuses(live());
    const configure = track(
      spyOn(proofModule, "applyProofIntegrationAction").mockImplementation(
        () => undefined as never,
      ),
    );
    const s = setup([
      { id: "m1", code: proofModule.PROOF_INTEGRATION_CONFIGURE },
    ]);
    await s.run();
    expect(configure.mock.calls[0]?.[1]).toBe(s.root);
    expect((configure.mock.calls[0]?.[0] as { id: string }).id).toBe("m1");
  });

  test("schema 6 actions run through their executor", async () => {
    statuses(live());
    const apply = track(
      spyOn(schema6Module, "applySchema6MigrationAction").mockImplementation(
        async () => undefined as never,
      ),
    );
    const automatic = [...schema6Module.SCHEMA6_AUTOMATIC_CODES][0] as string;
    const review = [
      ...schema6Module.SCHEMA6_APPROVABLE_REVIEW_CODES,
    ][0] as string;
    const s = setup([
      { id: "m1", code: automatic },
      {
        id: "m2",
        code: review,
        safety: "review",
        autoApplicable: false,
        invocation: { kind: "cli", command: "kibi" } as never,
      },
    ]);
    await s.run();
    expect(
      apply.mock.calls.map((call) => (call[0] as { id: string }).id),
    ).toEqual(["m1", "m2"]);
    expect(apply.mock.calls[0]?.[1]).toMatchObject({
      workspaceRoot: s.root,
      sourceMutationLockHeld: true,
    });
  });
});

describe("predicate schema alignment", () => {
  const fact = {
    type: "fact",
    id: "FACT-p",
    properties: { title: "p", fact_kind: "predicate" },
  };
  const alignment = (extra: Partial<MigrationAction> = {}) => ({
    id: "m1",
    code: migrationPlanModule.PREDICATE_SCHEMA_ALIGNMENT_CODE,
    invocation: { kind: "operation", name: "kb_upsert", input: fact } as never,
    evidence: {
      namespace: "default",
      rewrites: [{ index: 0, from: "old" }],
    },
    ...extra,
  });

  function current(entity: Record<string, unknown> | undefined) {
    return track(
      spyOn(discoveryEntities, "loadEntities").mockImplementation(
        async () => (entity === undefined ? [] : [entity]) as never,
      ),
    );
  }
  const upsert = () =>
    track(
      spyOn(upsertModule, "executeUpsert").mockImplementation(
        async () => ({ content: [], structuredContent: {} }) as never,
      ),
    );

  test("an unchanged fact is rewritten through kb_upsert", async () => {
    statuses(live());
    const loads = current({
      fact_kind: "predicate",
      predicate_args: ["old"],
    });
    const write = upsert();
    const s = setup([alignment()]);
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({ outcome: "applied" });
    expect(loads.mock.calls[0]?.[1]).toEqual({ type: "fact", id: "FACT-p" });
    const [input, passed] = write.mock.calls[0] as [unknown, OperationContext];
    expect(input).toStrictEqual({ ...fact, relationships: [] });
    expect(passed.sourceFirst).toBe(true);
    expect(passed.prolog).toBe(s.context.prolog);
  });

  test("a named namespace must still match", async () => {
    statuses(live());
    current({
      fact_kind: "predicate",
      predicate_namespace: "core",
      predicate_args: ["old"],
    });
    upsert();
    const s = setup([
      alignment({ evidence: { namespace: "core", rewrites: [] } }),
    ]);
    expect((await s.run()).structuredContent).toMatchObject({
      outcome: "applied",
    });
  });

  const REFUSED =
    "Predicate fact FACT-p changed since planning; rerun kibi check and approve the new plan.";
  test.each([
    ["no current fact", undefined, {}],
    [
      "another fact kind",
      { fact_kind: "observation", predicate_args: ["old"] },
      {},
    ],
    [
      "another namespace",
      {
        fact_kind: "predicate",
        predicate_namespace: "core",
        predicate_args: ["old"],
      },
      {},
    ],
    [
      "an empty namespace",
      {
        fact_kind: "predicate",
        predicate_namespace: "",
        predicate_args: ["old"],
      },
      { evidence: { namespace: "", rewrites: [] } },
    ],
    [
      "a changed argument",
      { fact_kind: "predicate", predicate_args: ["new"] },
      {},
    ],
    ["no arguments", { fact_kind: "predicate", predicate_args: "old" }, {}],
    [
      "a string of arguments",
      { fact_kind: "predicate", predicate_args: "old" },
      {
        evidence: { namespace: "default", rewrites: [{ index: 0, from: "o" }] },
      },
    ],
    [
      "a malformed rewrite",
      { fact_kind: "predicate", predicate_args: ["old"] },
      { evidence: { namespace: "default", rewrites: [null] } },
    ],
    [
      "a rewrite without index",
      { fact_kind: "predicate", predicate_args: ["old"] },
      {
        evidence: {
          namespace: "default",
          rewrites: [{ index: "0", from: "old" }],
        },
      },
    ],
  ])("%s is refused", async (_name, entity, extra) => {
    statuses(live());
    current(entity);
    const write = upsert();
    const s = setup([alignment(extra as never)]);
    const result = await s.run();
    expect(result.structuredContent).toMatchObject({
      outcome: "refused",
      actionResults: [{ outcome: "failed", detail: REFUSED }],
    });
    expect(write).not.toHaveBeenCalled();
  });

  test("rewrites that are not a list check nothing", async () => {
    statuses(live());
    current({ fact_kind: "predicate", predicate_args: ["x"] });
    upsert();
    const s = setup([
      alignment({ evidence: { namespace: "default", rewrites: "x" } }),
    ]);
    expect((await s.run()).structuredContent).toMatchObject({
      outcome: "applied",
    });
  });

  test.each([
    [{ kind: "cli", command: "kibi" }],
    [{ kind: "cli", name: "kb_upsert", input: fact }],
    [{ kind: "operation", name: "kb_delete", input: fact }],
  ])("invocation %p is refused", async (invocation) => {
    statuses(live());
    const s = setup([alignment({ invocation: invocation as never })]);
    expect((await s.run()).structuredContent).toMatchObject({
      outcome: "refused",
      actionResults: [
        {
          detail:
            "Predicate schema alignment requires its planned kb_upsert invocation.",
        },
      ],
    });
  });

  test("a non-fact upsert is refused", async () => {
    statuses(live());
    const s = setup([
      alignment({
        invocation: {
          kind: "operation",
          name: "kb_upsert",
          input: { ...fact, type: "req" },
        } as never,
      }),
    ]);
    expect((await s.run()).structuredContent).toMatchObject({
      outcome: "refused",
      actionResults: [
        { detail: "Predicate schema alignment only rewrites fact entities." },
      ],
    });
  });

  test("alignment needs a Prolog runtime, provided lazily if needed", async () => {
    statuses(live());
    const s = setup([alignment()], UNBOUND, { prolog: null });
    expect((await s.run()).structuredContent).toMatchObject({
      outcome: "reconciliation_required",
      actionResults: [
        { detail: "Predicate schema alignment requires a Prolog runtime." },
      ],
    });
    const donor = harness();
    current({ fact_kind: "predicate", predicate_args: ["old"] });
    const write = upsert();
    const lazy = setup([alignment()], UNBOUND, {
      prolog: null,
      extra: { ensureProlog: async () => donor.context.prolog },
    });
    await lazy.run();
    expect((write.mock.calls[0]?.[1] as OperationContext).prolog).toBe(
      donor.context.prolog,
    );
  });

  test("a refusal error is a migration refusal", () => {
    expect(new MigrationActionRefusedError("x")).toBeInstanceOf(Error);
  });
});

describe("post-apply readback", () => {
  function readback(
    check: Record<string, unknown> | null = {},
    coverage: Record<string, unknown> | null = {},
    symbols: Record<string, unknown> | null = {},
  ) {
    const checkSpy = track(
      spyOn(checkModule, "executeCheck").mockImplementation(
        async () =>
          ({ content: [], structuredContent: check ?? undefined }) as never,
      ),
    );
    const coverageSpy = track(
      spyOn(reportingModule, "executeCoverage").mockImplementation(
        async (args) =>
          ({
            content: [],
            structuredContent:
              ((args as { by: string }).by === "req" ? coverage : symbols) ??
              undefined,
          }) as never,
      ),
    );
    return { checkSpy, coverageSpy };
  }

  function ensure() {
    track(
      spyOn(branchModule, "branchEnsureCommand").mockImplementation(
        async () => undefined as never,
      ),
    );
  }

  test("a healthy store reports the remaining plan and proof state", async () => {
    statuses(live({ branchStore: { state: "healthy" } }));
    ensure();
    const fragment = migrationPlan([{ id: "left", state: "blocked" }], {
      scope: {
        evaluatedDomains: ["kb"],
        incompleteDomains: [],
        complete: true,
      },
    } as never);
    const { checkSpy, coverageSpy } = readback(
      { migrationPlan: fragment },
      { migrationPlan: fragment, summary: { proofTested: 2, proofMissing: 0 } },
      { migrationPlan: fragment },
    );
    const s = setup([{ id: "m1", ...cli("missing_exact_branch_store") }]);
    const result = await s.run();
    expect(checkSpy.mock.calls[0]?.[0]).toEqual({});
    expect(checkSpy.mock.calls[0]?.[1]).toMatchObject({
      workspaceRoot: s.root,
      prolog: s.context.prolog,
    });
    expect(coverageSpy.mock.calls.map((call) => call[0])).toEqual([
      { by: "req", limit: 10_000, offset: 0 },
      { by: "symbol", limit: 10_000, offset: 0 },
    ]);
    const { digestMigrationPlan, mergeMigrationPlans } = migrationPlanModule;
    expect(result.structuredContent).toMatchObject({
      outcome: "applied",
      remainingPlan: digestMigrationPlan(
        mergeMigrationPlans([fragment, fragment, fragment]),
      ),
      closeout: { proofState: "tested" },
    });
  });

  test("no fragments leave no remaining plan", async () => {
    statuses(live({ branchStore: { state: "healthy" } }));
    ensure();
    readback(null, null, null);
    const s = setup([{ id: "m1", ...cli("missing_exact_branch_store") }]);
    const result = await s.run();
    expect("remainingPlan" in result.structuredContent).toBe(false);
    expect(result.structuredContent).toMatchObject({ outcome: "applied" });
  });

  test("one fragment is enough for a remaining plan", async () => {
    statuses(live({ branchStore: { state: "healthy" } }));
    ensure();
    const fragment = migrationPlan([{ id: "left", state: "blocked" }], {
      scope: {
        evaluatedDomains: ["kb"],
        incompleteDomains: [],
        complete: true,
      },
    } as never);
    readback({}, {}, { migrationPlan: fragment });
    const s = setup([{ id: "m1", ...cli("missing_exact_branch_store") }]);
    const result = await s.run();
    expect("remainingPlan" in result.structuredContent).toBe(true);
  });

  test.each([
    [{ proofTested: 2, proofMissing: 1 }, "mixed"],
    [{ proofTested: 0, proofMissing: 1 }, "unresolved"],
    [{ proofTested: 0, proofMissing: 0 }, "unresolved"],
    [{ proofTested: "2", proofMissing: 0 }, "not_evaluated"],
    [{ proofTested: 2 }, "not_evaluated"],
  ])("coverage %p gives proof state %s", async (summary, proofState) => {
    statuses(live({ branchStore: { state: "healthy" } }));
    ensure();
    readback({}, { summary });
    const s = setup([{ id: "m1", ...cli("missing_exact_branch_store") }]);
    expect((await s.run()).structuredContent).toMatchObject({
      closeout: { proofState },
    });
  });

  test("a lazily provided Prolog runtime serves the readback", async () => {
    statuses(live({ branchStore: { state: "healthy" } }));
    ensure();
    const { checkSpy } = readback();
    const donor = harness();
    const s = setup(
      [{ id: "m1", ...cli("missing_exact_branch_store") }],
      UNBOUND,
      {
        prolog: null,
        extra: { ensureProlog: async () => donor.context.prolog },
      },
    );
    await s.run();
    const passed = checkSpy.mock.calls[0]?.[1] as OperationContext;
    expect(passed.prolog).toBe(donor.context.prolog);
    expect(passed.workspaceRoot).toBe(s.root);
  });

  test("without Prolog the readback is skipped", async () => {
    statuses(live({ branchStore: { state: "healthy" } }));
    ensure();
    const { checkSpy } = readback();
    const s = setup(
      [{ id: "m1", ...cli("missing_exact_branch_store") }],
      UNBOUND,
      {
        prolog: null,
      },
    );
    expect((await s.run()).structuredContent).toMatchObject({
      outcome: "applied",
    });
    expect(checkSpy).not.toHaveBeenCalled();
  });

  test("an unhealthy store or a failed action skips the readback", async () => {
    statuses(live({ branchStore: { state: "damaged" } }));
    ensure();
    const { checkSpy } = readback();
    await setup([{ id: "m1", ...cli("missing_exact_branch_store") }]).run();
    await setup([{ id: "m1", code: "no_such_code" }]).run();
    expect(checkSpy).not.toHaveBeenCalled();
  });

  test("a failed readback stops the report", async () => {
    statuses(live({ branchStore: { state: "healthy" } }));
    ensure();
    for (const thrown of [new Error("check failed"), "plain"]) {
      const spy = track(
        spyOn(checkModule, "executeCheck").mockImplementation(async () => {
          throw thrown;
        }),
      );
      const s = setup([{ id: "m1", ...cli("missing_exact_branch_store") }]);
      const result = await s.run();
      expect(result.structuredContent).toMatchObject({
        outcome: "partially_applied",
        actionResults: [
          { actionId: "m1", outcome: "applied" },
          {
            actionId: "post-apply-readback",
            outcome: "failed",
            detail: `Post-apply check/coverage readback failed: ${thrown instanceof Error ? thrown.message : thrown}`,
          },
        ],
      });
      spy.mockRestore();
    }
  });
});

describe("migration closeout states", () => {
  test.each([
    [
      { branchAttachment: { migrationRequired: true }, syncState: "fresh" },
      "legacy_compat",
    ],
    [{ syncState: "stale", dirty: true }, "stale"],
    [{ dirty: true, syncState: "fresh" }, "dirty"],
    [{ syncState: "fresh" }, "clean_fresh"],
    [{}, "not_evaluated"],
    [{ branchAttachment: {} }, "not_evaluated"],
  ])("status %p gives KB state %s", async (status, kbState) => {
    statuses(live(status));
    const s = setup([{ id: "m1", code: "no_such_code" }]);
    expect((await s.run()).structuredContent).toMatchObject({
      closeout: { kbState },
    });
  });

  test.each([
    [
      { proofSnapshotAvailable: false, proofSnapshotDirty: false },
      "unavailable",
    ],
    [{ proofSnapshotDirty: true }, "dirty"],
    [{ proofSnapshotDirty: false }, "fresh"],
    [{ proofSnapshotAvailable: true }, "not_evaluated"],
  ])("status %p gives snapshot state %s", async (status, snapshotState) => {
    statuses(live(status));
    const s = setup([{ id: "m1", code: "no_such_code" }]);
    expect((await s.run()).structuredContent).toMatchObject({
      closeout: { snapshotState },
    });
  });

  test("migration actions default their fields", () => {
    expect(migrationAction({ id: "x", code: "y" }).dependsOn).toEqual([]);
  });
});
