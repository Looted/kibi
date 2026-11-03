import { afterEach, describe, expect, spyOn, test } from "bun:test";
import path from "node:path";
import * as syncModule from "../../../src/commands/sync.js";
import * as upsertModule from "../../../src/operations/mutation/upsert.js";
import { executeApplyPlan } from "../../../src/operations/planning/apply-plan.js";
import * as discoveryExecutors from "../../../src/public/operations/discovery-executors.js";
import {
  type MigrationAction,
  buildMigrationPlan,
} from "../../../src/public/operations/migration-plan.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import { type FakeEntity, fakeProlog, scratch } from "../helpers.js";

const spies: { mockRestore: () => void }[] = [];
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function workspaceContext(
  extra: Partial<OperationContext> & { entities?: FakeEntity[] } = {},
): OperationContext {
  const workspace = scratch({ ".kb/.keep": "" });
  cleanups.push(workspace.cleanup);
  const { entities, ...rest } = extra;
  return {
    workspaceRoot: workspace.root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    fs: nodeFilesystem,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2" as const,
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: path.join(workspace.root, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
    ...(entities ? { prolog: fakeProlog(entities) } : {}),
    ...rest,
  } as OperationContext;
}

function action(overrides: Partial<MigrationAction>): MigrationAction {
  return {
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
    allowedDispositions: ["fixed", "accepted", "deferred"],
    ...overrides,
  };
}

function stubStatus(): void {
  spies.push(
    spyOn(discoveryExecutors, "executeStatus").mockResolvedValue({
      content: [{ type: "text", text: "status" }],
      structuredContent: {
        branch: "develop",
        snapshotId: "missing",
        syncedAt: null,
        dirty: false,
        syncState: "unknown",
      },
    } as never),
  );
}

async function applyOne(
  overrides: Partial<MigrationAction>,
  context: OperationContext = workspaceContext(),
) {
  stubStatus();
  const plan = buildMigrationPlan({ actions: [action(overrides)] });
  const result = await executeApplyPlan(
    { plan, approvedPlanHash: plan.planHash, approvedActionIds: ["mig-1"] },
    context,
  );
  const structured = result.structuredContent as unknown as {
    outcome: string;
    actionResults: { outcome: string; detail: string }[];
  };
  return { planOutcome: structured.outcome, ...structured.actionResults[0] };
}

function stubSync(success: boolean): void {
  spies.push(
    spyOn(syncModule, "syncCommand").mockResolvedValue({
      branch: "develop",
      timestamp: "2026-09-05T00:00:00Z",
      success,
      published: success,
      failures: [],
    } as never),
  );
}

describe("migration actions that compile the branch store", () => {
  for (const [code, failure] of [
    [
      "branch_store_not_compiled",
      "Compiling the branch store (kibi sync) did not complete successfully.",
    ],
    [
      "freshness_resync",
      "Recompiling changed sources (kibi sync) did not complete successfully.",
    ],
  ] as const) {
    test(`${code} runs kibi sync and reports a failed sync`, async () => {
      stubSync(true);
      expect(await applyOne({ code })).toMatchObject({
        outcome: "applied",
        detail: `Applied ${code}.`,
      });
      for (const spy of spies.splice(0)) spy.mockRestore();
      stubSync(false);
      expect(await applyOne({ code })).toMatchObject({
        planOutcome: "reconciliation_required",
        detail: failure,
      });
    });
  }
});

describe("predicate schema alignment", () => {
  const upsert = (input: Record<string, unknown>) => ({
    kind: "operation" as const,
    name: "kb_upsert",
    input,
  });
  const fact = {
    id: "FACT-p",
    type: "fact",
    fact_kind: "predicate",
    predicate_namespace: "billing",
    predicate_args: ["user", "acct"],
  };
  const evidence = {
    namespace: "billing",
    rewrites: [{ index: 1, from: "acct" }],
  };

  test("refuses an action without its planned kb_upsert or for a non-fact", async () => {
    expect(
      await applyOne({
        code: "predicate_schema_alignment",
        invocation: { kind: "review", instruction: "x" },
      }),
    ).toMatchObject({
      planOutcome: "refused",
      detail:
        "Predicate schema alignment requires its planned kb_upsert invocation.",
    });
    expect(
      await applyOne({
        code: "predicate_schema_alignment",
        invocation: {
          kind: "operation",
          name: "kb_delete",
          input: {},
        } as never,
      }),
    ).toMatchObject({ planOutcome: "refused" });
    expect(
      await applyOne({
        code: "predicate_schema_alignment",
        invocation: upsert({ type: "req", id: "REQ-1" }) as never,
      }),
    ).toMatchObject({
      planOutcome: "refused",
      detail: "Predicate schema alignment only rewrites fact entities.",
    });
  });

  test("needs a Prolog runtime", async () => {
    expect(
      await applyOne({
        code: "predicate_schema_alignment",
        invocation: upsert({ type: "fact", id: "FACT-p" }) as never,
        evidence,
      }),
    ).toMatchObject({
      planOutcome: "reconciliation_required",
      detail: "Predicate schema alignment requires a Prolog runtime.",
    });
  });

  test("refuses a fact that changed since planning", async () => {
    const changed = (entities: FakeEntity[], planned = evidence) =>
      applyOne(
        {
          code: "predicate_schema_alignment",
          invocation: upsert({ type: "fact", id: "FACT-p" }) as never,
          evidence: planned,
        },
        workspaceContext({ entities }),
      );
    const refusal = {
      planOutcome: "refused",
      detail:
        "Predicate fact FACT-p changed since planning; rerun kibi check and approve the new plan.",
    };
    expect(await changed([])).toMatchObject(refusal);
    expect(await changed([{ ...fact, fact_kind: "property" }])).toMatchObject(
      refusal,
    );
    expect(
      await changed([{ ...fact, predicate_namespace: "" }], {
        namespace: "default",
        rewrites: "none",
      } as never),
    ).toMatchObject({ planOutcome: expect.not.stringMatching(/refused/) });
    expect(
      await changed([{ ...fact, predicate_args: "none" }], evidence),
    ).toMatchObject(refusal);
    expect(
      await changed([fact], {
        namespace: "billing",
        rewrites: ["bad"],
      } as never),
    ).toMatchObject(refusal);
  });

  test("replays the planned upsert for an unchanged fact", async () => {
    const executed: unknown[] = [];
    spies.push(
      spyOn(upsertModule, "executeUpsert").mockImplementation(async (input) => {
        executed.push(input);
        return { content: [], structuredContent: {} } as never;
      }),
    );
    expect(
      await applyOne(
        {
          code: "predicate_schema_alignment",
          invocation: upsert({ type: "fact", id: "FACT-p" }) as never,
          evidence,
        },
        workspaceContext({ entities: [fact] }),
      ),
    ).toMatchObject({ outcome: "applied" });
    expect(executed).toHaveLength(1);
  });
});

describe("other migration action executors", () => {
  test("configures a proof integration, refusing a malformed one", async () => {
    expect(
      await applyOne({ code: "proof_integration_configure" }),
    ).toMatchObject({
      planOutcome: "refused",
      detail:
        "Proof integration action 'mig-1' is malformed; rerun kibi proof inspect for a new plan.",
    });
  });

  test("runs the schema 6 executor for its codes", async () => {
    stubSync(true);
    expect(await applyOne({ code: "migration_sync" })).toMatchObject({
      outcome: "applied",
      detail: "Applied migration_sync.",
    });
  });

  test("refuses a code with no executor", async () => {
    expect(await applyOne({ code: "not_a_real_action" })).toMatchObject({
      planOutcome: "refused",
      detail: "Migration action 'not_a_real_action' has no automatic executor.",
    });
  });
});
