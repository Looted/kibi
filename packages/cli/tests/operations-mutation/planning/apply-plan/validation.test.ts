import { describe, expect, test } from "bun:test";
import { symlinkSync } from "node:fs";
import path from "node:path";
import { OperationError } from "../../../../src/cli-errors.js";
import { bootstrapPlanHash } from "../../../../src/operations/bootstrap/types.js";
import {
  type ApplyPlanArgs,
  assertBootstrapRecoveryDependencies,
  assertSourceWriteStaysInWorkspace,
  executeApplyPlan,
  orderBootstrapActions,
  preflightApplyPlan,
} from "../../../../src/operations/planning/apply-plan.js";
import { compilePlanHash } from "../../../../src/operations/planning/compile-intent.js";
import { tempWorkspace } from "../../workspace.js";
import {
  HASH,
  bootstrapPlan,
  cleanUpAfterEach,
  compilePlan,
  deletionPlan,
  harness,
  migrationPlan,
  sha,
  stubStatus,
} from "./harness.js";

cleanUpAfterEach();

const offline = () => harness({ fs: null }).context;

async function rejects(
  run: Promise<unknown>,
  message: string | RegExp,
): Promise<void> {
  await expect(run).rejects.toThrow(message);
}

/** Both the preflight and the apply refuse the plan with `message`. */
async function refusedBoth(args: unknown, message: string): Promise<void> {
  const context = offline();
  const error = await preflightApplyPlan(args as ApplyPlanArgs, context).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect((error as Error | undefined)?.message).toBe(message);
  const applied = await executeApplyPlan(args as ApplyPlanArgs, context).then(
    () => undefined,
    (caught: unknown) => caught,
  );
  expect((applied as Error | undefined)?.message).toBe(message);
}

const action = (
  id: string,
  dependsOn: string[] = [],
  extra: Record<string, unknown> = {},
) =>
  ({
    id,
    kind: "upsert",
    dependsOn,
    payload: {
      type: "req",
      id: `REQ-${id}`,
      properties: { title: id, status: "open" },
    },
    ...extra,
  }) as never;

const NOT_READY = (prefix: string, status: string) =>
  `${prefix}: only ready plans may be applied; this plan's status is '${status}'.`;

describe("preflight of plan-bearing calls", () => {
  test("calls without a plan pass untouched", async () => {
    await expect(
      preflightApplyPlan({ recoveryJournalId: "x" } as never, offline()),
    ).resolves.toBeUndefined();
  });

  test.each([null, [], "plan", 7])(
    "a %p plan is not an object",
    async (plan) => {
      await rejects(
        preflightApplyPlan(
          { plan, approvedPlanHash: HASH } as never,
          offline(),
        ),
        /^Apply plan failed: plan must be an object$/,
      );
    },
  );

  test.each([
    undefined,
    7,
    "a".repeat(63),
    "a".repeat(65),
    `x${"a".repeat(64)}`,
    `${"a".repeat(64)}x`,
    "g".repeat(64),
  ])("approvedPlanHash %p is refused", async (approvedPlanHash) => {
    await rejects(
      preflightApplyPlan(
        { plan: compilePlan(), approvedPlanHash } as never,
        offline(),
      ),
      "Apply plan failed: approvedPlanHash must be the SHA-256 planHash returned with the plan",
    );
  });

  test("a ready compile plan with its own hash passes", async () => {
    const plan = compilePlan();
    await expect(
      preflightApplyPlan({ plan, approvedPlanHash: plan.planHash }, offline()),
    ).resolves.toBeUndefined();
    await expect(
      preflightApplyPlan(
        { plan, approvedPlanHash: plan.planHash.toUpperCase() },
        offline(),
      ),
    ).rejects.toThrow(
      "Apply plan failed: approvedPlanHash does not match plan.planHash",
    );
  });
});

describe("compile plan shape", () => {
  test.each([[[]], ["plan"]])("the apply refuses a %p plan", async (plan) => {
    await rejects(
      executeApplyPlan({ plan, approvedPlanHash: HASH } as never, offline()),
      /^Apply plan failed: plan must be an object$/,
    );
  });

  test("an unsupported version is refused", async () => {
    const plan = { ...compilePlan(), version: "kibi.compile-plan.v0" };
    await refusedBoth(
      { plan, approvedPlanHash: plan.planHash },
      "Apply plan failed: unsupported plan version",
    );
  });

  test.each([
    [
      "needs_resolution",
      " Resolve its ontology_gap and missing propositions first (model each with kb_model mode requirement or predicates, then call kb_compile_intent again and apply the ready plan it returns), and fix any step its diagnostics name. Or write the requirement with kb_upsert carrying the plan's inventory contract, with the unmodeled propositions kept as status ontology_gap entries, as the kibi-usage skill describes.",
    ],
    [
      "blocked",
      " Its contradiction analysis found a conflict with a current requirement: resolve the contradiction first (supersede or change the conflicting requirement, or change the intent), then compile again.",
    ],
    [
      "needs_context",
      " Supply the bootstrap context it asks for, then plan the bootstrap again.",
    ],
    [
      "draft",
      " Compile or plan again and apply the plan it returns once its status is 'ready'.",
    ],
  ])("a %s plan names its remedy", async (status, remedy) => {
    const plan = compilePlan({ status: status as never });
    await refusedBoth(
      { plan, approvedPlanHash: plan.planHash },
      `${NOT_READY("Apply plan failed", status)}${remedy}`,
    );
  });

  test("a mismatched or non-hex approval is refused", async () => {
    const plan = compilePlan();
    await refusedBoth(
      { plan, approvedPlanHash: plan.planHash.toUpperCase() },
      "Apply plan failed: approvedPlanHash does not match plan.planHash",
    );
    await refusedBoth(
      { plan, approvedPlanHash: HASH },
      "Apply plan failed: approvedPlanHash does not match plan.planHash",
    );
  });

  test("a body edited after hashing is refused", async () => {
    const plan = { ...compilePlan(), diagnostics: ["edited"] };
    await refusedBoth(
      { plan, approvedPlanHash: plan.planHash },
      "Apply plan failed: planHash does not match the canonical plan body",
    );
  });

  test.each([[[]], [undefined], ["steps"]])(
    "steps %p are refused",
    async (steps) => {
      const plan = compilePlan({ steps: steps as never });
      await refusedBoth(
        { plan, approvedPlanHash: plan.planHash },
        "Apply plan failed: ready plans must contain at least one step",
      );
    },
  );

  test("the apply re-checks the approval hash format", async () => {
    const plan = compilePlan();
    const context = offline();
    await rejects(
      executeApplyPlan({ plan, approvedPlanHash: "z".repeat(64) }, context),
      /^Apply plan failed: approvedPlanHash must be a SHA-256 hash$/,
    );
    await rejects(
      executeApplyPlan(
        { plan, approvedPlanHash: `${plan.planHash}0` },
        context,
      ),
      /^Apply plan failed: approvedPlanHash must be a SHA-256 hash$/,
    );
    await rejects(
      executeApplyPlan(
        { plan, approvedPlanHash: `0${plan.planHash}` },
        context,
      ),
      /^Apply plan failed: approvedPlanHash must be a SHA-256 hash$/,
    );
  });

  test("a valid plan without Prolog reaches the runtime check", async () => {
    const plan = compilePlan();
    await rejects(
      executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        harness({ fs: null, prolog: null }).context,
      ),
      "Apply plan requires a Prolog runtime",
    );
    expect(compilePlanHash(plan as never)).toBe(plan.planHash);
  });
});

describe("migration plan shape", () => {
  const plan = migrationPlan([{ id: "m1" }, { id: "m2", dependsOn: ["m1"] }]);

  test("a valid selection passes preflight", async () => {
    await expect(
      preflightApplyPlan(
        {
          plan,
          approvedPlanHash: plan.planHash,
          approvedActionIds: ["m1", "m2"],
        },
        offline(),
      ),
    ).resolves.toBeUndefined();
  });

  test("approval hash checks", async () => {
    const context = offline();
    await rejects(
      executeApplyPlan(
        {
          plan,
          approvedPlanHash: `${plan.planHash}0`,
          approvedActionIds: ["m1"],
        },
        context,
      ),
      /^Migration apply failed: approvedPlanHash must be a SHA-256 hash$/,
    );
    await rejects(
      executeApplyPlan(
        {
          plan,
          approvedPlanHash: `0${plan.planHash}`,
          approvedActionIds: ["m1"],
        },
        context,
      ),
      /^Migration apply failed: approvedPlanHash must be a SHA-256 hash$/,
    );
    await refusedBoth(
      {
        plan,
        approvedPlanHash: plan.planHash.toUpperCase(),
        approvedActionIds: ["m1"],
      },
      "Migration apply failed: approvedPlanHash does not match plan.planHash",
    );
  });

  test.each(["version", "expected", "scope", "actions", "diagnostics"])(
    "an edited %s breaks the canonical hash",
    async (field) => {
      const edited = {
        ...plan,
        [field]:
          field === "version"
            ? plan.version
            : field === "actions"
              ? [plan.actions[0]]
              : field === "diagnostics"
                ? ["x"]
                : { edited: true },
      };
      if (field === "version") {
        await expect(
          preflightApplyPlan(
            {
              plan: edited as never,
              approvedPlanHash: plan.planHash,
              approvedActionIds: ["m1"],
            },
            offline(),
          ),
        ).resolves.toBeUndefined();
        return;
      }
      await refusedBoth(
        {
          plan: edited,
          approvedPlanHash: plan.planHash,
          approvedActionIds: ["m1"],
        },
        "Migration apply failed: planHash does not match the canonical plan body",
      );
    },
  );

  test("summary is outside the hash", async () => {
    await expect(
      preflightApplyPlan(
        {
          plan: { ...plan, summary: { edited: true } } as never,
          approvedPlanHash: plan.planHash,
          approvedActionIds: ["m1"],
        },
        offline(),
      ),
    ).resolves.toBeUndefined();
  });

  test.each([[[]], [undefined], ["m1"]])(
    "approvedActionIds %p are refused",
    async (approvedActionIds) => {
      await refusedBoth(
        { plan, approvedPlanHash: plan.planHash, approvedActionIds },
        "Migration apply failed: approvedActionIds must contain at least one action",
      );
    },
  );

  test("an unknown approved action is refused", async () => {
    await refusedBoth(
      {
        plan,
        approvedPlanHash: plan.planHash,
        approvedActionIds: ["m1", "zz"],
      },
      "Migration apply failed: approvedActionIds contains an action not present in the plan",
    );
  });

  test("a blocked action is refused", async () => {
    const blocked = migrationPlan([{ id: "m1", state: "blocked" }]);
    await refusedBoth(
      {
        plan: blocked,
        approvedPlanHash: blocked.planHash,
        approvedActionIds: ["m1"],
      },
      "Migration apply failed: action 'm1' is blocked",
    );
  });

  test.each([
    ["review", true, "cli", "approvable"],
    ["automatic", false, "cli", "approvable"],
    ["blocked", false, "cli", "approvable"],
    ["review", false, "review", "approvable"],
    ["review", false, "cli", "migration_action"],
  ])(
    "safety %s auto %p invocation %s code %s is not automatic",
    async (safety, autoApplicable, kind, code) => {
      const { SCHEMA6_APPROVABLE_REVIEW_CODES } = await import(
        "../../../../src/operations/migration/schema6.js"
      );
      const approvable = [...SCHEMA6_APPROVABLE_REVIEW_CODES][0] as string;
      const refused = migrationPlan([
        {
          id: "m1",
          safety: safety as never,
          autoApplicable,
          invocation: { kind, instruction: "x", command: "x" } as never,
          code: code === "approvable" ? approvable : code,
        },
      ]);
      await refusedBoth(
        {
          plan: refused,
          approvedPlanHash: refused.planHash,
          approvedActionIds: ["m1"],
        },
        "Migration apply failed: action 'm1' is not automatic",
      );
    },
  );

  test("an approvable review action passes", async () => {
    const { SCHEMA6_APPROVABLE_REVIEW_CODES } = await import(
      "../../../../src/operations/migration/schema6.js"
    );
    const reviewed = migrationPlan([
      {
        id: "m1",
        safety: "review",
        autoApplicable: false,
        invocation: { kind: "cli", command: "kibi migrate" } as never,
        code: [...SCHEMA6_APPROVABLE_REVIEW_CODES][0] as string,
      },
    ]);
    await expect(
      preflightApplyPlan(
        {
          plan: reviewed,
          approvedPlanHash: reviewed.planHash,
          approvedActionIds: ["m1"],
        },
        offline(),
      ),
    ).resolves.toBeUndefined();
  });

  test("an unapproved dependency is refused", async () => {
    await refusedBoth(
      { plan, approvedPlanHash: plan.planHash, approvedActionIds: ["m2"] },
      "Migration apply failed: action 'm2' requires approved dependency 'm1'",
    );
  });

  test("an unsupported migration version falls through to compile checks", async () => {
    await rejects(
      preflightApplyPlan(
        {
          plan: { ...plan, version: "kibi.migration-plan.v1" },
          approvedPlanHash: plan.planHash,
        } as never,
        offline(),
      ),
      "Apply plan failed: unsupported plan version",
    );
  });
});

describe("entity deletion plan shape", () => {
  test("a valid deletion plan passes", async () => {
    const plan = deletionPlan();
    await expect(
      preflightApplyPlan({ plan, approvedPlanHash: plan.planHash }, offline()),
    ).resolves.toBeUndefined();
  });

  test("approval mismatches are refused", async () => {
    const plan = deletionPlan();
    for (const approvedPlanHash of [
      HASH,
      plan.planHash.toUpperCase(),
      `${plan.planHash}0`,
    ]) {
      const context = offline();
      await rejects(
        executeApplyPlan({ plan, approvedPlanHash }, context),
        /^Entity deletion apply failed: approvedPlanHash does not match planHash$/,
      );
    }
    await refusedBoth(
      { plan, approvedPlanHash: HASH },
      "Entity deletion apply failed: approvedPlanHash does not match planHash",
    );
  });

  test("an approved hash that is not hex is refused even when it matches", async () => {
    const plan = { ...deletionPlan(), planHash: `${"a".repeat(64)}0` };
    await rejects(
      executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash } as never,
        offline(),
      ),
      /^Entity deletion apply failed: approvedPlanHash does not match planHash$/,
    );
  });

  test("an edited body is refused", async () => {
    const plan = { ...deletionPlan(), entityIds: ["REQ-other"] };
    await refusedBoth(
      { plan, approvedPlanHash: plan.planHash },
      "Entity deletion apply failed: planHash does not match the canonical plan body",
    );
  });

  test.each([[[]], ["REQ-x"]])(
    "entityIds %p are refused",
    async (entityIds) => {
      const plan = deletionPlan({ entityIds: entityIds as never });
      await refusedBoth(
        { plan, approvedPlanHash: plan.planHash },
        "Entity deletion apply failed: entityIds must be non-empty",
      );
    },
  );

  test("a requirement needing supersession is refused", async () => {
    const plan = deletionPlan({ supersessionRequired: true });
    await refusedBoth(
      { plan, approvedPlanHash: plan.planHash },
      "REQUIREMENT_SUPERSESSION_REQUIRED: authored requirements evolve through a new requirement linked with supersedes; compile and approve that evolution plan instead of deleting the requirement",
    );
  });
});

describe("bootstrap plan shape", () => {
  async function bootstrapRefused(
    plan: ReturnType<typeof bootstrapPlan>,
    message: string,
    approvedPlanHash = plan.planHash,
  ): Promise<void> {
    await refusedBoth({ plan, approvedPlanHash }, message);
  }

  test.each([
    [
      "blocked",
      " Resolve what its diagnostics name, then plan the bootstrap again.",
    ],
    [
      "needs_context",
      " Supply the bootstrap context it asks for, then plan the bootstrap again.",
    ],
    [
      "handoff",
      " Compile or plan again and apply the plan it returns once its status is 'ready'.",
    ],
  ])("a %s plan names its remedy", async (status, remedy) => {
    await bootstrapRefused(
      bootstrapPlan({ status }),
      `${NOT_READY("Bootstrap apply failed", status)}${remedy}`,
    );
  });

  test("approval and hash checks", async () => {
    const plan = bootstrapPlan();
    const context = offline();
    for (const hash of [`${plan.planHash}0`, `0${plan.planHash}`]) {
      await rejects(
        executeApplyPlan({ plan, approvedPlanHash: hash }, context),
        /^Bootstrap apply failed: approvedPlanHash must be SHA-256$/,
      );
    }
    await bootstrapRefused(
      plan,
      "Bootstrap apply failed: approvedPlanHash does not match planHash",
      plan.planHash.toUpperCase(),
    );
    await bootstrapRefused(
      { ...plan, diagnostics: ["edited"] },
      "Bootstrap apply failed: planHash does not match canonical plan body",
    );
  });

  test("an activation block is refused", async () => {
    await bootstrapRefused(
      bootstrapPlan({
        activation: {
          activationState: "x",
          activationMode: "x",
          applyBlocked: true,
          reason: "x",
        },
      }),
      "Bootstrap apply failed: activation policy blocks application",
    );
  });

  const BINDING =
    "Bootstrap apply failed: ready plans require exact branch, KB snapshot, and workspace snapshot bindings";
  test.each([
    ["branch", ""],
    ["branch", "unknown"],
    ["branch", "unavailable"],
    ["kbSnapshotId", ""],
    ["kbSnapshotId", "unknown"],
    ["kbSnapshotId", "missing"],
    ["kbSnapshotId", "unavailable"],
    ["workspaceSnapshot", "unknown"],
    ["workspaceSnapshot", `${HASH}0`],
    ["workspaceSnapshot", `0${HASH}`],
  ])("expected %s %p is not an exact binding", async (field, value) => {
    const base = bootstrapPlan();
    await bootstrapRefused(
      bootstrapPlan({ expected: { ...base.expected, [field]: value } }),
      BINDING,
    );
  });

  test.each([
    "snapshot",
    `${HASH}0`,
    `0${HASH}`,
    `empty-source-state-${HASH}0`,
    `xempty-source-state-${HASH}`,
    "generation-a:1x",
    "xgeneration-a:1",
    "generation-a b:1",
    "generation-:1",
    "generation-a:",
  ])("KB snapshot %p is not exact", async (kbSnapshotId) => {
    const base = bootstrapPlan();
    await bootstrapRefused(
      bootstrapPlan({ expected: { ...base.expected, kbSnapshotId } }),
      "Bootstrap apply failed: ready plans require an exact KB snapshot binding",
    );
  });

  test.each([
    HASH.toUpperCase(),
    `empty-source-state-${HASH.toUpperCase()}`,
    "generation-main:12",
  ])("KB snapshot %p is exact", async (kbSnapshotId) => {
    const base = bootstrapPlan();
    const plan = bootstrapPlan({
      expected: {
        ...base.expected,
        kbSnapshotId,
        workspaceSnapshot: HASH.toUpperCase(),
      },
    });
    stubStatus({ snapshotId: kbSnapshotId });
    await expect(
      preflightApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        harness({ workspaceHash: HASH.toUpperCase() }).context,
      ),
    ).resolves.toBeUndefined();
  });

  test.each([
    ["", HASH],
    ["src/a.ts", null],
    ["src/a.ts", "nothex"],
    ["src/a.ts", `${HASH}0`],
    ["src/a.ts", `0${HASH}`],
  ])("evidence source %p hash %p is not exact", async (source, hash) => {
    const base = bootstrapPlan();
    await bootstrapRefused(
      bootstrapPlan({
        expected: {
          ...base.expected,
          sourceHashes: { "src/ok.ts": HASH, [source]: hash },
        },
      }),
      `Bootstrap apply failed: ready plans require an exact hash for evidence source '${source}'`,
    );
  });

  test.each([[[]], [undefined]])("actions %p are refused", async (actions) => {
    await bootstrapRefused(
      bootstrapPlan({ actions }),
      "Bootstrap apply failed: ready plans must contain actions",
    );
  });

  test("an invalid action payload is refused before any write", async () => {
    const plan = bootstrapPlan({
      actions: [
        action("a1"),
        action("a2", [], { payload: { type: "req", id: "REQ-x" } }),
      ],
    });
    const { root, context, files } = harness();
    const error = (await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context,
    ).catch((caught: unknown) => caught)) as OperationError;
    expect(error).toBeInstanceOf(OperationError);
    expect(error.code).toBe("BOOTSTRAP_PLAN_INVALID");
    expect(error.retryable).toBe(false);
    expect(error.message).toMatch(
      /^Bootstrap action a2 is invalid: .+\. Re-plan before applying; no bootstrap writes or journal were created\.$/,
    );
    expect(files()).toEqual([".kb/.keep"]);
    expect(root).toBeTruthy();
    const preflight = (await preflightApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context,
    ).catch((caught: unknown) => caught)) as OperationError;
    expect(preflight.message).toBe(error.message);
  });

  test("a non-Error payload failure is reported as text", async () => {
    const plan = bootstrapPlan({
      actions: [action("a1", [], { payload: { relationships: "x" } })],
    });
    await rejects(
      preflightApplyPlan({ plan, approvedPlanHash: plan.planHash }, offline()),
      "Bootstrap action a1 is invalid: Relationship validation failed: relationships must be an array. Re-plan before applying; no bootstrap writes or journal were created.",
    );
  });

  test("a document path outside the workspace is refused", async () => {
    const plan = bootstrapPlan({
      actions: [
        action("a1", [], {
          payload: {
            type: "req",
            id: "REQ-boot",
            properties: { title: "Boot", status: "open" },
            document: { path: "../outside.md" },
          },
        }),
      ],
    });
    await rejects(
      preflightApplyPlan({ plan, approvedPlanHash: plan.planHash }, offline()),
      /^Bootstrap action a1 is invalid: /,
    );
  });

  test("a document path inside the workspace passes the action check", async () => {
    const plan = bootstrapPlan({
      actions: [
        action("a1", [], {
          payload: {
            type: "req",
            id: "REQ-boot",
            properties: { title: "Boot", status: "open" },
            document: { path: "documentation/requirements/REQ-boot.md" },
          },
        }),
      ],
    });
    stubStatus();
    await expect(
      preflightApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        harness().context,
      ),
    ).resolves.toBeUndefined();
  });
});

describe("bootstrap preflight against the live state", () => {
  const plan = bootstrapPlan();
  const args = { plan, approvedPlanHash: plan.planHash };

  test("a missing Prolog runtime is refused, or provisioned", async () => {
    await rejects(
      preflightApplyPlan(args, harness({ prolog: null }).context),
      "Bootstrap apply requires a Prolog runtime",
    );
    const provided = harness().context;
    const lazy = harness({
      prolog: null,
      extra: { ensureProlog: async () => provided.prolog },
    }).context;
    const status = stubStatus();
    await expect(preflightApplyPlan(args, lazy)).resolves.toBeUndefined();
    const passed = status.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(passed.prolog).toBe(provided.prolog);
    expect(passed.sourceFirst).toBe(true);
    expect(passed.workspaceRoot).toBe(lazy.workspaceRoot);
  });

  test("a status without payload is refused", async () => {
    stubStatus(null);
    await rejects(
      preflightApplyPlan(args, harness().context),
      "Bootstrap apply failed: status returned no payload",
    );
  });

  test("a changed branch is refused", async () => {
    stubStatus({ branch: "main" });
    await rejects(
      preflightApplyPlan(args, harness().context),
      "Bootstrap apply failed: branch changed since planning",
    );
  });

  test("a changed KB snapshot is refused", async () => {
    stubStatus({ snapshotId: "b".repeat(64) });
    await rejects(
      preflightApplyPlan(args, harness().context),
      "Bootstrap apply failed: KB snapshot changed since planning",
    );
  });

  test("a missing KB binds to the empty source state", async () => {
    const { bootstrapEmptyKbSnapshotId } = await import(
      "../../../../src/operations/bootstrap/types.js"
    );
    const sourceHashes = { "src/a.ts": sha("a") };
    const empty = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot: HASH,
      sourceHashes,
    });
    const bound = bootstrapPlan({
      expected: {
        branch: "develop",
        kbSnapshotId: empty,
        workspaceSnapshot: HASH,
        sourceHashes,
      },
    });
    stubStatus({ snapshotId: "missing" });
    await expect(
      preflightApplyPlan(
        { plan: bound, approvedPlanHash: bound.planHash },
        harness({ files: { "src/a.ts": "a" } }).context,
      ),
    ).resolves.toBeUndefined();
    await rejects(
      preflightApplyPlan(
        { plan: bound, approvedPlanHash: bound.planHash },
        harness({ files: { "src/a.ts": "a" }, workspaceHash: "b".repeat(64) })
          .context,
      ),
      "Bootstrap apply failed: KB snapshot changed since planning",
    );
    for (const context of [
      harness({ files: { "src/a.ts": "a" }, workspaceHash: "nothex" }).context,
      harness({ files: { "src/a.ts": "a" }, git: null }).context,
    ])
      await rejects(
        preflightApplyPlan(
          { plan: bound, approvedPlanHash: bound.planHash },
          context,
        ),
        "Bootstrap apply failed: KB snapshot changed since planning",
      );
  });

  test.each([`x${HASH}`, `${HASH}x`])(
    "a live workspace hash %p does not bind the empty KB",
    async (live) => {
      const { bootstrapEmptyKbSnapshotId } = await import(
        "../../../../src/operations/bootstrap/types.js"
      );
      const kbSnapshotId = bootstrapEmptyKbSnapshotId({
        branch: "develop",
        workspaceSnapshot: live,
        sourceHashes: {},
      });
      const bound = bootstrapPlan({
        expected: { ...plan.expected, kbSnapshotId },
      });
      stubStatus({ snapshotId: "missing" });
      await rejects(
        preflightApplyPlan(
          { plan: bound, approvedPlanHash: bound.planHash },
          harness({ workspaceHash: live }).context,
        ),
        "Bootstrap apply failed: KB snapshot changed since planning",
      );
    },
  );

  test("an action without document.path keeps its canonical lane unchecked", async () => {
    const outside = tempWorkspace();
    const { context, root } = harness();
    symlinkSync(outside, path.join(root, ".kb", "requirements"));
    stubStatus();
    await expect(
      preflightApplyPlan({ plan, approvedPlanHash: plan.planHash }, context),
    ).resolves.toBeUndefined();
    const linked = bootstrapPlan({
      actions: [
        action("a1", [], {
          payload: {
            type: "req",
            id: "REQ-boot",
            properties: { title: "Boot", status: "open" },
            document: { path: ".kb/requirements/REQ-boot.md" },
          },
        }),
      ],
    });
    await rejects(
      preflightApplyPlan(
        { plan: linked, approvedPlanHash: linked.planHash },
        context,
      ),
      /^Bootstrap action a1 is invalid: /,
    );
  });

  test("a changed or unavailable workspace snapshot is refused", async () => {
    stubStatus();
    await rejects(
      preflightApplyPlan(
        args,
        harness({ workspaceHash: "b".repeat(64) }).context,
      ),
      "Bootstrap apply failed: workspace snapshot changed since planning",
    );
    await rejects(
      preflightApplyPlan(args, harness({ git: null }).context),
      "Bootstrap apply failed: workspace snapshot changed since planning",
    );
  });

  test("evidence sources must still hold their hashes", async () => {
    const sourceHashes = { "src/a.ts": sha("a"), "src/b.ts": sha("b") };
    const bound = bootstrapPlan({
      expected: { ...plan.expected, sourceHashes },
    });
    const boundArgs = { plan: bound, approvedPlanHash: bound.planHash };
    stubStatus();
    await expect(
      preflightApplyPlan(
        boundArgs,
        harness({ files: { "src/a.ts": "a", "src/b.ts": "b" } }).context,
      ),
    ).resolves.toBeUndefined();
    await rejects(
      preflightApplyPlan(
        boundArgs,
        harness({ files: { "src/a.ts": "a", "src/b.ts": "B" } }).context,
      ),
      "Apply plan failed: source hash changed for src/b.ts",
    );
    await rejects(
      preflightApplyPlan(
        boundArgs,
        harness({ files: { "src/a.ts": "a" } }).context,
      ),
      "Apply plan failed: source hash changed for src/b.ts",
    );
    await rejects(
      preflightApplyPlan(
        boundArgs,
        harness({ fs: null, files: { "src/a.ts": "a" } }).context,
      ),
      "Apply plan failed: source hashes require a filesystem-capable runtime",
    );
  });

  test.each(["/abs/a.ts", "../a.ts", "src/../../a.ts", "src\\..\\a.ts"])(
    "evidence source %p must be workspace-relative",
    async (source) => {
      const bound = bootstrapPlan({
        expected: { ...plan.expected, sourceHashes: { [source]: HASH } },
      });
      stubStatus();
      await rejects(
        preflightApplyPlan(
          { plan: bound, approvedPlanHash: bound.planHash },
          harness().context,
        ),
        "Apply plan failed: source hash paths must be workspace-relative",
      );
    },
  );

  test("a source path holding dots stays workspace-relative", async () => {
    const bound = bootstrapPlan({
      expected: {
        ...plan.expected,
        sourceHashes: { "src/..a.ts": sha("a") },
      },
    });
    stubStatus();
    await expect(
      preflightApplyPlan(
        { plan: bound, approvedPlanHash: bound.planHash },
        harness({ files: { "src/..a.ts": "a" } }).context,
      ),
    ).resolves.toBeUndefined();
  });

  test("bootstrap hashing ignores planHash itself", () => {
    expect(bootstrapPlanHash({ ...plan, planHash: "x" })).toBe(plan.planHash);
  });
});

describe("bootstrap action ordering", () => {
  test("dependencies run first, the rest by id", () => {
    const ordered = orderBootstrapActions([
      action("c"),
      action("a", ["d"]),
      action("b"),
      action("d", ["b"]),
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual(["b", "d", "a", "c"]);
  });

  test("a shared dependency is visited once", () => {
    const ordered = orderBootstrapActions([
      action("b", ["a"]),
      action("c", ["a", "b"]),
      action("a"),
    ]);
    expect(ordered.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  test("completed actions are skipped and satisfy dependencies", () => {
    const ordered = orderBootstrapActions(
      [action("a"), action("b", ["a", "x"]), action("c", ["b"])],
      new Set(["a", "x"]),
    );
    expect(ordered.map((entry) => entry.id)).toEqual(["b", "c"]);
    expect(
      orderBootstrapActions([action("a")], new Set(["a"])).map(
        (entry) => entry.id,
      ),
    ).toEqual([]);
  });

  test("a completed action is not re-entered through a cycle", () => {
    expect(
      orderBootstrapActions(
        [action("a", ["b"]), action("b", ["a"])],
        new Set(["b"]),
      ).map((entry) => entry.id),
    ).toEqual(["a"]);
  });

  test("ids must be present and unique", () => {
    expect(() => orderBootstrapActions([action("")])).toThrow(
      "Bootstrap apply failed: action IDs must be unique",
    );
    expect(() => orderBootstrapActions([action("a"), action("a")])).toThrow(
      "Bootstrap apply failed: action IDs must be unique",
    );
  });

  test.each([
    { kind: "delete" },
    { payload: null },
    { payload: [] },
    { payload: "x" },
  ])("an action %p is invalid", (extra) => {
    expect(() => orderBootstrapActions([action("a", [], extra)])).toThrow(
      /^Bootstrap apply failed: action 'a' is invalid$/,
    );
  });

  test("a cycle is refused at its entry", () => {
    expect(() =>
      orderBootstrapActions([action("a", ["b"]), action("b", ["a"])]),
    ).toThrow(/^Bootstrap apply failed: dependency cycle at 'a'$/);
  });

  test("a missing dependency is refused", () => {
    expect(() => orderBootstrapActions([action("a", ["zz"])])).toThrow(
      /^Bootstrap apply failed: action 'a' requires missing dependency 'zz'$/,
    );
  });

  test("an action without dependsOn has none", () => {
    expect(
      orderBootstrapActions([
        { id: "a", kind: "upsert", payload: {} } as never,
      ]).map((entry) => entry.id),
    ).toEqual(["a"]);
  });
});

describe("bootstrap recovery dependencies", () => {
  test("applied or remaining dependencies are satisfied", () => {
    expect(() =>
      assertBootstrapRecoveryDependencies(
        [{ id: "b", dependsOn: ["a", "c"] }, { id: "c" }],
        new Set(["a"]),
      ),
    ).not.toThrow();
  });

  test("a vanished dependency is refused", () => {
    expect(() =>
      assertBootstrapRecoveryDependencies(
        [{ id: "c" }, { id: "b", dependsOn: ["c", "a"] }],
        new Set(),
      ),
    ).toThrow(/^Bootstrap recovery journal is missing dependency 'a' for 'b'$/);
  });
});

describe("source write containment", () => {
  const root = path.join(path.sep, "work", "repo");

  test.each([root, path.join(root, "src", "a.ts")])(
    "%p stays inside",
    (absolute) => {
      expect(() =>
        assertSourceWriteStaysInWorkspace(root, absolute, "x"),
      ).not.toThrow();
    },
  );

  test.each([
    path.join(path.sep, "work", "repo-other", "a.ts"),
    path.join(path.sep, "work", "a.ts"),
  ])("%p escapes", (absolute) => {
    expect(() =>
      assertSourceWriteStaysInWorkspace(root, absolute, "../a.ts"),
    ).toThrow(
      /^Apply plan failed: sourceWrites\.path escapes workspace: \.\.\/a\.ts$/,
    );
  });
});
