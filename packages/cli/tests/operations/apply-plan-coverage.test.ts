import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";

import { LOGIC_IR_VERSION, validateLogicIr } from "../../src/logic/ir.js";
import {
  executeApplyPlan,
  orderBootstrapActions,
} from "../../src/operations/planning/apply-plan.js";
import {
  type CompilePlanV1,
  compilePlanHash,
} from "../../src/operations/planning/compile-intent.js";
import {
  type MigrationAction,
  buildMigrationPlan,
} from "../../src/public/operations/migration-plan.js";
import { nodeFilesystem } from "../../src/public/operations/node-ports.js";
import type {
  OperationContext,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { asApply } from "../helpers/coverage-casts.js";
import { isWhatIfGoal, whatIfResult } from "../helpers/what-if.js";

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

const tempDirs: string[] = [];

function makeTempDir(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "kibi-apply-plan-cov-"));
  tempDirs.push(dir);
  mkdirSync(path.join(dir, ".kb"), { recursive: true });
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

function compileBody(
  overrides: Partial<CompilePlanV1> = {},
): Omit<CompilePlanV1, "planHash"> {
  return {
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
      requirementId: "REQ-apply",
      selectionReason: "test",
    },
    discovery: { candidates: [], abstained: true },
    propositions: [],
    contradictionAnalysis: { outcome: "no_conflict", witnesses: [] },
    proposals: [],
    steps: [
      {
        type: "req",
        id: "REQ-apply",
        properties: { title: "Apply", status: "open" },
        relationships: [],
      },
    ],
    sourceWrites: [],
    diagnostics: [],
    ...overrides,
  };
}

function compilePlan(overrides: Partial<CompilePlanV1> = {}): CompilePlanV1 {
  const body = compileBody(overrides);
  return { ...body, planHash: compilePlanHash(body) };
}

/**
 * Entity-deletion plans still publish their source writes through the
 * legacy source-writes journal; compile plans use the atomic plan journal.
 */
function deletionPlan(
  sourceWrites: readonly {
    path: string;
    mode: "write" | "delete";
    beforeHash: string | null;
    afterHash: string | null;
    body?: string;
  }[],
) {
  const body = {
    version: "kibi.entity-deletion-plan.v1" as const,
    entityIds: ["FACT-CRASH"],
    sourceHashes: {},
    sourceWrites,
    supersessionRequired: false,
  };
  return { ...body, planHash: sha(JSON.stringify(body)) };
}

function filesystemContext(
  workspaceRoot: string,
  extra?: {
    workspaceHash?: string;
    query?: OperationContext["prolog"];
    ensureProlog?: OperationContext["ensureProlog"];
    omitProlog?: boolean;
  },
): OperationContext {
  const query: OperationContext["prolog"] = extra?.query ?? {
    query: async (goal): Promise<PrologQueryResult> =>
      isWhatIfGoal(goal)
        ? whatIfResult()
        : goal.includes("kb_commit_upsert")
          ? { success: true, bindings: { ChangeKind: "created" } }
          : { success: true, bindings: { Results: "[]" } },
    queryStatusJson: async () => ({ success: true, bindings: {} }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-05T00:00:00Z"),
    ...(extra?.omitProlog ? {} : { prolog: query }),
    ...(extra?.ensureProlog ? { ensureProlog: extra.ensureProlog } : {}),
    fs: nodeFilesystem,
    git: {
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: extra?.workspaceHash ?? "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "develop",
      kbBranch: "develop",
      storePath: path.join(workspaceRoot, ".kb", "branches", "develop"),
      kind: "exact",
      migrationRequired: false,
    },
  };
}

function automaticAction(
  overrides: Partial<MigrationAction> = {},
): MigrationAction {
  return {
    id: "mig-unknown-0001",
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

describe("orderBootstrapActions extra branches", () => {
  test("rejects duplicate IDs, invalid kinds, and missing dependencies", () => {
    const upsert = {
      id: "bootstrap-upsert-a",
      kind: "upsert" as const,
      dependsOn: [],
      payload: { type: "req", id: "REQ-a", properties: {}, relationships: [] },
    };
    expect(() => orderBootstrapActions([upsert, { ...upsert }])).toThrow(
      /unique/,
    );
    expect(() =>
      orderBootstrapActions([
        { ...upsert, kind: "delete" as unknown as "upsert" },
      ]),
    ).toThrow(/invalid/);
    expect(() =>
      orderBootstrapActions([
        { ...upsert, dependsOn: ["bootstrap-upsert-missing"] },
      ]),
    ).toThrow(/missing dependency/);
    expect(
      orderBootstrapActions(
        [{ ...upsert, dependsOn: ["already-done"] }],
        new Set(["already-done"]),
      ).map(({ id }) => id),
    ).toEqual(["bootstrap-upsert-a"]);
  });
});

describe("compile plan application", () => {
  test("rejects unsupported versions, empty steps, and tampered hashes", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    await expect(
      executeApplyPlan(
        {
          plan: {
            ...compilePlan(),
            version: "kibi.compile-plan.v0" as "kibi.compile-plan.v1",
          },
          approvedPlanHash: "a".repeat(64),
        },
        ctx,
      ),
    ).rejects.toThrow(/unsupported plan version/);

    const empty = compilePlan({ steps: [] });
    await expect(
      executeApplyPlan({ plan: empty, approvedPlanHash: empty.planHash }, ctx),
    ).rejects.toThrow(/at least one step/);

    const ready = compilePlan();
    await expect(
      executeApplyPlan({ plan: ready, approvedPlanHash: "not-a-hash" }, ctx),
    ).rejects.toThrow(/SHA-256/);

    await expect(
      executeApplyPlan(
        {
          plan: { ...ready, planHash: "b".repeat(64) },
          approvedPlanHash: "b".repeat(64),
        },
        ctx,
      ),
    ).rejects.toThrow(/canonical plan body/);
  });

  test("rejects malformed steps and source-hash paths before mutation", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    const badType = compilePlan({
      steps: [
        { type: "note", id: "NOTE-1", properties: {}, relationships: [] },
      ],
    });
    await expect(
      executeApplyPlan(
        { plan: badType, approvedPlanHash: badType.planHash },
        ctx,
      ),
    ).rejects.toThrow(/unsupported step entity type/);

    const missingId = compilePlan({
      steps: [{ type: "req", id: "  ", properties: {}, relationships: [] }],
    });
    await expect(
      executeApplyPlan(
        { plan: missingId, approvedPlanHash: missingId.planHash },
        ctx,
      ),
    ).rejects.toThrow(/entity id/);

    const badRel = compilePlan({
      steps: [
        {
          type: "req",
          id: "REQ-apply",
          properties: {},
          relationships: [{ type: "verified_by", from: "REQ-apply" }],
        },
      ],
    });
    await expect(
      executeApplyPlan(
        { plan: badRel, approvedPlanHash: badRel.planHash },
        ctx,
      ),
    ).rejects.toThrow(/type, from, and to/);

    const absHash = compilePlan({
      expected: {
        branch: "develop",
        kbSnapshotId: "missing",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: { "/etc/passwd": "a".repeat(64) },
      },
    });
    await expect(
      executeApplyPlan(
        { plan: absHash, approvedPlanHash: absHash.planHash },
        ctx,
      ),
    ).rejects.toThrow(/workspace-relative/);
  });

  test("applies a ready compile plan with document metadata and a source write", async () => {
    const root = makeTempDir();
    const body = "Requirement body\n";
    const afterHash = sha(body);
    const plan = compilePlan({
      steps: [
        {
          type: "req",
          id: "REQ-apply",
          properties: { title: "Apply", status: "open" },
          relationships: [],
          document: { path: "requirements/REQ-apply.md", body },
        },
      ],
      sourceWrites: [
        {
          path: "requirements/REQ-apply.md",
          mode: "write",
          beforeHash: null,
          afterHash,
          body,
        },
      ],
    });
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(root),
    );
    expect(result.structuredContent).toMatchObject({
      version: "kibi.plan-apply-result.v1",
      outcome: "applied",
      planHash: plan.planHash,
    });
    expect(asApply(result.structuredContent).changedPaths).toEqual([
      "requirements/REQ-apply.md",
    ]);
  });

  // implements REQ-kibi-truthful-consistency
  function preflightContext(
    root: string,
    analysis: Parameters<typeof whatIfResult>[0],
  ): { context: OperationContext; commits: () => number } {
    let commits = 0;
    const context = filesystemContext(root, {
      query: {
        query: async (goal): Promise<PrologQueryResult> => {
          if (isWhatIfGoal(goal)) return whatIfResult(analysis);
          if (goal.includes("kb_commit_upsert")) {
            commits += 1;
            return { success: true, bindings: { ChangeKind: "created" } };
          }
          return { success: true, bindings: { Results: "[]" } };
        },
        queryStatusJson: async () => ({ success: true, bindings: {} }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      },
    });
    return { context, commits: () => commits };
  }

  function sourceWritingPlan(): CompilePlanV1 {
    const body = "Requirement body\n";
    return compilePlan({
      steps: [
        {
          type: "req",
          id: "REQ-apply",
          properties: { title: "Apply", status: "open" },
          relationships: [],
          document: { path: "requirements/REQ-apply.md", body },
        },
      ],
      sourceWrites: [
        {
          path: "requirements/REQ-apply.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha(body),
          body,
        },
      ],
    });
  }

  for (const [label, witness] of [
    [
      "contradiction",
      {
        kind: "property",
        status: "contradiction",
        requirements: ["REQ-apply", "REQ-other"],
        reason: "Value conflict on retention.days: eq 1 vs eq 365",
      },
    ],
    [
      "infeasible scenario",
      {
        kind: "scenario_feasibility",
        status: "infeasible",
        requirements: ["REQ-unrelated"],
        scenario: "SCEN-zero-quota",
        reason:
          "Scenario SCEN-zero-quota expects success but assumes FACT-zero",
      },
    ],
  ] as const) {
    test(`refuses a staged final state that introduces a ${label} before any write`, async () => {
      const root = makeTempDir();
      const plan = sourceWritingPlan();
      const { context, commits } = preflightContext(root, {
        introduced: [witness],
      });
      await expect(
        executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, context),
      ).rejects.toThrow(
        /failed before any write: the staged plan introduces 1 contradiction\(s\) or infeasible scenario\(s\)/,
      );
      expect(commits()).toBe(0);
      expect(existsSync(path.join(root, "requirements", "REQ-apply.md"))).toBe(
        false,
      );
    });
  }

  test("applies when staged witnesses already existed or stay unresolved", async () => {
    const root = makeTempDir();
    const plan = sourceWritingPlan();
    const { context, commits } = preflightContext(root, {
      unchanged: [
        {
          kind: "property",
          status: "contradiction",
          requirements: ["REQ-old-a", "REQ-old-b"],
          reason: "pre-existing",
        },
      ],
      introduced: [
        {
          kind: "rule",
          status: "unresolved",
          requirements: ["REQ-apply", "REQ-other"],
          reason: "Rule conflict (unresolved)",
        },
      ],
    });
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context,
    );
    expect(result.structuredContent).toMatchObject({ outcome: "applied" });
    expect(commits()).toBe(1);
  });

  test("fails closed before any write when the staged analysis is unreadable", async () => {
    const root = makeTempDir();
    const plan = sourceWritingPlan();
    let commits = 0;
    const context = filesystemContext(root, {
      query: {
        query: async (goal): Promise<PrologQueryResult> => {
          if (isWhatIfGoal(goal))
            return { success: true, bindings: { JsonString: "not json" } };
          if (goal.includes("kb_commit_upsert")) commits += 1;
          return { success: true, bindings: { Results: "[]" } };
        },
        queryStatusJson: async () => ({ success: true, bindings: {} }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      },
    });
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, context),
    ).rejects.toThrow("contradiction analysis could not be read");
    expect(commits).toBe(0);
  });

  test("validates every step before the first write", async () => {
    const root = makeTempDir();
    const plan = compilePlan({
      steps: [
        {
          type: "req",
          id: "REQ-apply",
          properties: { title: "Apply", status: "open" },
          relationships: [],
        },
        {
          type: "scenario",
          id: "SCEN-apply",
          properties: { title: "Apply scenario", status: "active" },
          // A relationship must originate at the step's own entity.
          relationships: [
            { type: "specified_by", from: "REQ-apply", to: "SCEN-apply" },
          ],
        },
      ],
    });
    const { context, commits } = preflightContext(root, {});
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, context),
    ).rejects.toThrow(/failed before any write: step SCEN-apply is invalid/);
    expect(commits()).toBe(0);
  });

  // implements REQ-kibi-truthful-consistency
  // A store that holds only what the plan's committed steps wrote, so a
  // lookup of an entity no step has committed yet fails.
  function stagedStoreContext(
    root: string,
    ids: readonly string[],
  ): { context: OperationContext; commits: () => number } {
    const stored = new Set<string>();
    let commits = 0;
    const context = filesystemContext(root, {
      query: {
        query: async (goal): Promise<PrologQueryResult> => {
          if (isWhatIfGoal(goal)) return whatIfResult();
          if (goal.includes("kb_commit_upsert")) {
            commits += 1;
            for (const id of ids) if (goal.includes(id)) stored.add(id);
            return { success: true, bindings: { ChangeKind: "created" } };
          }
          // Existence probes fail for an absent entity; a findall read
          // succeeds with no rows.
          const lookup = /kb_entity\('([^']+)'/.exec(goal);
          if (lookup?.[1] !== undefined && !goal.startsWith("findall("))
            return {
              success: stored.has(lookup[1]),
              bindings: { Results: "[]", Type: "fact" },
            };
          return { success: true, bindings: { Results: "[]" } };
        },
        queryStatusJson: async () => ({ success: true, bindings: {} }),
        nextSolution: async () => null,
        save: async () => ({ success: true, bindings: {} }),
      },
    });
    return { context, commits: () => commits };
  }

  const retainRule = {
    version: LOGIC_IR_VERSION,
    kind: "rule",
    modality: "oblige",
    variables: [{ name: "X", type: "entity" }],
    head: {
      kind: "atom",
      name: "retain",
      args: [{ kind: "var", name: "X", type: "entity" }],
    },
    body: {
      kind: "atom",
      name: "customer",
      args: [{ kind: "var", name: "X", type: "entity" }],
    },
  } as const;

  function ruleFactStep(id: string): CompilePlanV1["steps"][number] {
    const validation = validateLogicIr(retainRule);
    return {
      type: "fact",
      id,
      properties: {
        title: "Retain customers rule",
        status: "active",
        fact_kind: "rule",
        rule_ir: retainRule,
        rule_hash: validation.ruleHash,
        rule_schema_id: "FACT-RULE-SCHEMA-LOGIC-V1",
        rule_name: "kibi.logic.v1",
        semantic_key: validation.semanticKey,
      },
      relationships: [],
    };
  }

  function ruledRequirementStep(
    target: string,
    type = "requires_rule",
  ): CompilePlanV1["steps"][number] {
    return {
      type: "req",
      id: "REQ-ruled",
      properties: { title: "Retain customers", status: "open" },
      relationships: [{ type, from: "REQ-ruled", to: target }],
    };
  }

  test("refuses a plan whose later step fails the upsert validation chain with zero writes", async () => {
    const root = makeTempDir();
    const valid = sourceWritingPlan();
    const plan = compilePlan({
      steps: [
        ...valid.steps,
        {
          type: "req",
          id: "REQ-normative",
          properties: {
            title: "Token expiry",
            status: "open",
            // Current normative prose without its proposition inventory.
            semantic_text: "The service must reject expired tokens.",
          },
          relationships: [],
        },
      ],
      sourceWrites: valid.sourceWrites,
    });
    const { context, commits } = preflightContext(root, {});
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, context),
    ).rejects.toThrow(
      /failed before any write: step REQ-normative is invalid: Proposition-complete ingestion failed/,
    );
    expect(commits()).toBe(0);
    expect(existsSync(path.join(root, "requirements", "REQ-apply.md"))).toBe(
      false,
    );
  });

  test("lets a step target an entity an earlier step of the plan creates", async () => {
    const root = makeTempDir();
    const ids = ["FACT-RULE-NEW", "REQ-ruled"];
    const plan = compilePlan({
      steps: [
        ruleFactStep("FACT-RULE-NEW"),
        ruledRequirementStep("FACT-RULE-NEW"),
      ],
    });
    const { context, commits } = stagedStoreContext(root, ids);
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      context,
    );
    expect(result.structuredContent).toMatchObject({ outcome: "applied" });
    // Both steps, including the forward reference, commit in one batch.
    expect(commits()).toBe(1);

    // Without the creating step the target is missing and nothing is written.
    const orphan = compilePlan({
      steps: [ruledRequirementStep("FACT-RULE-NEW")],
    });
    const fresh = stagedStoreContext(makeTempDir(), ids);
    await expect(
      executeApplyPlan(
        { plan: orphan, approvedPlanHash: orphan.planHash },
        fresh.context,
      ),
    ).rejects.toThrow(
      /failed before any write: step REQ-ruled is invalid: .*FACT-RULE-NEW.*fact_kind=rule/,
    );
    expect(fresh.commits()).toBe(0);
  });

  test("judges a plan-created target by the kind the plan gives it", async () => {
    const root = makeTempDir();
    const plan = compilePlan({
      steps: [
        {
          type: "fact",
          id: "FACT-SUBJECT-NEW",
          properties: {
            title: "Client quota",
            status: "active",
            fact_kind: "subject",
            subject_key: "client.quota",
          },
          relationships: [],
        },
        ruledRequirementStep("FACT-SUBJECT-NEW", "requires_property"),
      ],
    });
    const { context, commits } = stagedStoreContext(root, [
      "FACT-SUBJECT-NEW",
      "REQ-ruled",
    ]);
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, context),
    ).rejects.toThrow(
      /failed before any write: step REQ-ruled is invalid: Relationship 'requires_property' requires target 'FACT-SUBJECT-NEW'/,
    );
    expect(commits()).toBe(0);
  });

  test("refuses a second original apply and validates source-recovery journal IDs", async () => {
    const root = makeTempDir();
    const body = "Replay body\n";
    const afterHash = sha(body);
    const writes = [
      {
        path: "docs/replay.md",
        mode: "write" as const,
        beforeHash: null,
        afterHash,
        body,
      },
    ];
    const first = compilePlan({ sourceWrites: writes });
    await executeApplyPlan(
      { plan: first, approvedPlanHash: first.planHash },
      filesystemContext(root),
    );
    await expect(
      executeApplyPlan(
        { plan: first, approvedPlanHash: first.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/MUTATION_ALREADY_COMMITTED/);
    await expect(
      executeApplyPlan(
        { recoveryJournalId: "source writes spaces" },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/journal ID is invalid/);
    await expect(
      executeApplyPlan(
        { recoveryJournalId: "source-writes-missing" },
        {
          workspaceRoot: root,
          signal: new AbortController().signal,
          clock: () => new Date(0),
        },
      ),
    ).rejects.toThrow(/filesystem-capable runtime/);
  });

  test("uses ensureProlog when the context has no live Prolog port", async () => {
    const root = makeTempDir();
    const prolog = {
      query: async (goal: string): Promise<PrologQueryResult> =>
        isWhatIfGoal(goal)
          ? whatIfResult()
          : goal.includes("kb_commit_upsert")
            ? { success: true, bindings: { ChangeKind: "created" } }
            : { success: true, bindings: { Results: "[]" } },
      queryStatusJson: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    };
    const plan = compilePlan();
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(root, {
        omitProlog: true,
        ensureProlog: async () => prolog,
      }),
    );
    expect(result.structuredContent.outcome).toBe("applied");
  });
});

describe("entity deletion plans", () => {
  test("rejects hash mismatches, empty ids, and required supersession", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    const body = {
      version: "kibi.entity-deletion-plan.v1" as const,
      entityIds: ["FACT-1"],
      sourceHashes: {},
      supersessionRequired: false,
    };
    const planHash = sha(JSON.stringify(body));
    await expect(
      executeApplyPlan(
        {
          plan: { ...body, planHash: "c".repeat(64) },
          approvedPlanHash: "c".repeat(64),
        },
        ctx,
      ),
    ).rejects.toThrow(/canonical plan body/);
    const hashed = { ...body, planHash };
    await expect(
      executeApplyPlan({ plan: hashed, approvedPlanHash: "d".repeat(64) }, ctx),
    ).rejects.toThrow(/approvedPlanHash does not match/);
    const empty = {
      version: "kibi.entity-deletion-plan.v1" as const,
      entityIds: [] as string[],
      sourceHashes: {},
      supersessionRequired: false,
    };
    const emptyHash = sha(JSON.stringify(empty));
    await expect(
      executeApplyPlan(
        {
          plan: { ...empty, planHash: emptyHash },
          approvedPlanHash: emptyHash,
        },
        ctx,
      ),
    ).rejects.toThrow(/entityIds must be non-empty/);
    const superBody = { ...body, supersessionRequired: true };
    const superHash = sha(JSON.stringify(superBody));
    await expect(
      executeApplyPlan(
        {
          plan: { ...superBody, planHash: superHash },
          approvedPlanHash: superHash,
        },
        ctx,
      ),
    ).rejects.toThrow(/REQUIREMENT_SUPERSESSION_REQUIRED/);
  });

  test("returns a repairable deletion result when compiled retract fails", async () => {
    const root = makeTempDir();
    const body = {
      version: "kibi.entity-deletion-plan.v1" as const,
      entityIds: ["FACT-GONE"],
      sourceHashes: {},
      supersessionRequired: false,
    };
    const planHash = sha(JSON.stringify(body));
    const result = await executeApplyPlan(
      { plan: { ...body, planHash }, approvedPlanHash: planHash },
      filesystemContext(root, {
        query: {
          query: async () => ({
            success: false,
            bindings: {},
            error: "not found",
          }),
          queryStatusJson: async () => ({ success: true, bindings: {} }),
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        },
      }),
    );
    expect(result.structuredContent).toMatchObject({
      version: "kibi.entity-deletion-apply-result.v1",
      outcome: "applied",
    });
  });
});

describe("migration plan application", () => {
  test("rejects unapproved, blocked, and non-automatic actions", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    const ready = buildMigrationPlan({
      actions: [automaticAction()],
    });
    const readyAction = ready.actions[0];
    expect(readyAction).toBeDefined();
    if (!readyAction) throw new Error("expected an automatic migration action");
    await expect(
      executeApplyPlan(
        {
          plan: ready,
          approvedPlanHash: "e".repeat(64),
          approvedActionIds: [readyAction.id],
        },
        ctx,
      ),
    ).rejects.toThrow(/does not match plan.planHash/);
    await expect(
      executeApplyPlan(
        {
          plan: ready,
          approvedPlanHash: ready.planHash,
          approvedActionIds: [],
        },
        ctx,
      ),
    ).rejects.toThrow(/approvedActionIds must contain at least one/);
    await expect(
      executeApplyPlan(
        {
          plan: ready,
          approvedPlanHash: ready.planHash,
          approvedActionIds: ["missing-action"],
        },
        ctx,
      ),
    ).rejects.toThrow(/not present in the plan/);

    const blocked = buildMigrationPlan({
      actions: [automaticAction({ id: "mig-blocked", state: "blocked" })],
    });
    await expect(
      executeApplyPlan(
        {
          plan: blocked,
          approvedPlanHash: blocked.planHash,
          approvedActionIds: ["mig-blocked"],
        },
        ctx,
      ),
    ).rejects.toThrow(/is blocked/);

    const review = buildMigrationPlan({
      actions: [
        automaticAction({
          id: "mig-review",
          safety: "review",
          autoApplicable: false,
        }),
      ],
    });
    await expect(
      executeApplyPlan(
        {
          plan: review,
          approvedPlanHash: review.planHash,
          approvedActionIds: ["mig-review"],
        },
        ctx,
      ),
    ).rejects.toThrow(/is not automatic/);

    const dependent = buildMigrationPlan({
      actions: [
        automaticAction({ id: "mig-child", dependsOn: ["mig-parent"] }),
      ],
    });
    await expect(
      executeApplyPlan(
        {
          plan: dependent,
          approvedPlanHash: dependent.planHash,
          approvedActionIds: ["mig-child"],
        },
        ctx,
      ),
    ).rejects.toThrow(/requires approved dependency/);
  });

  test("refuses unknown automatic actions without changes and skips dependents", async () => {
    const root = makeTempDir();
    const plan = buildMigrationPlan({
      actions: [
        automaticAction({ id: "mig-first" }),
        automaticAction({ id: "mig-second", dependsOn: ["mig-first"] }),
      ],
    });
    const result = await executeApplyPlan(
      {
        plan,
        approvedPlanHash: plan.planHash,
        approvedActionIds: ["mig-first", "mig-second"],
      },
      filesystemContext(root),
    );
    expect(result.structuredContent).toMatchObject({
      version: "kibi.migration-apply-result.v1",
      outcome: "refused",
      closeout: { taskOutcome: "blocked" },
    });
    const rows = (
      result.structuredContent as unknown as {
        actionResults: readonly { actionId: string; outcome: string }[];
      }
    ).actionResults;
    expect(rows).toEqual([
      expect.objectContaining({ actionId: "mig-first", outcome: "failed" }),
      expect.objectContaining({ actionId: "mig-second", outcome: "skipped" }),
    ]);
  });

  test("rejects migration action cycles", async () => {
    const root = makeTempDir();
    const plan = buildMigrationPlan({
      actions: [
        automaticAction({ id: "mig-a", dependsOn: ["mig-b"] }),
        automaticAction({ id: "mig-b", dependsOn: ["mig-a"] }),
      ],
    });
    await expect(
      executeApplyPlan(
        {
          plan,
          approvedPlanHash: plan.planHash,
          approvedActionIds: ["mig-a", "mig-b"],
        },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/dependency cycle/);
  });
});

describe("bootstrap plan extra guards", () => {
  test("rejects blocked activation and incomplete source hashes", async () => {
    const root = makeTempDir();
    const { bootstrapEmptyKbSnapshotId, bootstrapPlanHash } = await import(
      "../../src/operations/bootstrap/types.js"
    );
    const workspaceSnapshot = "a".repeat(64);
    const kbSnapshotId = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot,
      sourceHashes: {},
    });
    const body = {
      version: "kibi.bootstrap-plan.v1" as const,
      status: "ready" as const,
      expected: {
        branch: "develop",
        kbSnapshotId,
        workspaceSnapshot,
        sourceHashes: { "docs/a.md": null as string | null },
      },
      activation: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: true,
        reason: "blocked",
      },
      declaredContext: {
        sourceOfTruthPaths: [],
        sourceOfTruthNotes: [],
        priorityRoots: [],
        verificationAnchors: [],
      },
      contextQuestions: [],
      confidence: {
        score: 0.9,
        level: "high" as const,
        policy: "full_actions" as const,
      },
      discoverySummary: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: true,
        reason: "blocked",
        providersRun: [],
        providerCounts: {},
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: [],
        truncated: false,
        scanWarnings: [],
      },
      candidates: [],
      actions: [
        {
          id: "bootstrap-upsert-0001",
          kind: "upsert" as const,
          dependsOn: [],
          payload: {
            type: "adr",
            id: "ADR-bootstrap",
            properties: { title: "Bootstrap", status: "accepted" },
            relationships: [],
          },
        },
      ],
      sourceWrites: [],
      suppressedCandidates: [],
      payoffSummary: {},
      diagnostics: [],
    };
    const blocked = { ...body, planHash: bootstrapPlanHash(body) };
    await expect(
      executeApplyPlan(
        { plan: blocked, approvedPlanHash: blocked.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/activation policy blocks/);

    const unblockedBody = {
      ...body,
      expected: {
        ...body.expected,
        sourceHashes: { "docs/a.md": null as string | null },
      },
      activation: { ...body.activation, applyBlocked: false },
      discoverySummary: { ...body.discoverySummary, applyBlocked: false },
    };
    const unblocked = {
      ...unblockedBody,
      planHash: bootstrapPlanHash(unblockedBody),
    };
    await expect(
      executeApplyPlan(
        { plan: unblocked, approvedPlanHash: unblocked.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/exact hash for evidence source/);
  });

  test("rejects bootstrap recovery without a filesystem", async () => {
    await expect(
      executeApplyPlan(
        { recoveryJournalId: "bootstrap-aaaaaaaaaaaaaaaa" },
        {
          workspaceRoot: "/tmp",
          signal: new AbortController().signal,
          clock: () => new Date(0),
          prolog: {
            query: async (goal: string) =>
              isWhatIfGoal(goal)
                ? whatIfResult()
                : { success: true, bindings: {} },
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          },
        },
      ),
    ).rejects.toThrow(/filesystem-capable runtime/);
  });

  test("applies a thin bootstrap upsert and records a recovery journal", async () => {
    const root = makeTempDir();
    const { bootstrapEmptyKbSnapshotId, bootstrapPlanHash } = await import(
      "../../src/operations/bootstrap/types.js"
    );
    const workspaceSnapshot = "a".repeat(64);
    const sourceHashes = {};
    const kbSnapshotId = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot,
      sourceHashes,
    });
    const body = {
      version: "kibi.bootstrap-plan.v1" as const,
      status: "ready" as const,
      expected: {
        branch: "develop",
        kbSnapshotId,
        workspaceSnapshot,
        sourceHashes,
      },
      activation: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: false,
        reason: "thin",
      },
      declaredContext: {
        sourceOfTruthPaths: [],
        sourceOfTruthNotes: [],
        priorityRoots: [],
        verificationAnchors: [],
      },
      contextQuestions: [],
      confidence: {
        score: 0.9,
        level: "high" as const,
        policy: "full_actions" as const,
      },
      discoverySummary: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: false,
        reason: "thin",
        providersRun: [],
        providerCounts: {},
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: [],
        truncated: false,
        scanWarnings: [],
      },
      candidates: [],
      actions: [
        {
          id: "bootstrap-upsert-0001",
          kind: "upsert" as const,
          dependsOn: [],
          payload: {
            type: "req",
            id: "REQ-bootstrap-apply",
            properties: { title: "Bootstrap apply", status: "open" },
            relationships: [],
          },
        },
      ],
      sourceWrites: [],
      suppressedCandidates: [],
      payoffSummary: {},
      diagnostics: [],
    };
    const plan = { ...body, planHash: bootstrapPlanHash(body) };
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(root, {
        query: {
          query: async (goal) =>
            isWhatIfGoal(goal)
              ? whatIfResult()
              : ((goal.includes("kb_commit_upsert")
                  ? { success: true, bindings: { ChangeKind: "created" } }
                  : {
                      success: true,
                      bindings: { Results: "[]" },
                    }) as unknown as PrologQueryResult),
          queryStatusJson: async () => ({ success: true, bindings: {} }),
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        },
      }),
    );
    expect(result.structuredContent.outcome).toMatch(
      /applied|partially_applied|reconciliation_required/,
    );
  });

  test("refuses a second original bootstrap apply when a journal already exists", async () => {
    const root = makeTempDir();
    const { bootstrapEmptyKbSnapshotId, bootstrapPlanHash } = await import(
      "../../src/operations/bootstrap/types.js"
    );
    const workspaceSnapshot = "a".repeat(64);
    const sourceHashes = {};
    const kbSnapshotId = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot,
      sourceHashes,
    });
    const body = {
      version: "kibi.bootstrap-plan.v1" as const,
      status: "ready" as const,
      expected: {
        branch: "develop",
        kbSnapshotId,
        workspaceSnapshot,
        sourceHashes,
      },
      activation: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: false,
        reason: "thin",
      },
      declaredContext: {
        sourceOfTruthPaths: [],
        sourceOfTruthNotes: [],
        priorityRoots: [],
        verificationAnchors: [],
      },
      contextQuestions: [],
      confidence: {
        score: 0.9,
        level: "high" as const,
        policy: "full_actions" as const,
      },
      discoverySummary: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: false,
        reason: "thin",
        providersRun: [],
        providerCounts: {},
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: [],
        truncated: false,
        scanWarnings: [],
      },
      candidates: [],
      actions: [
        {
          id: "bootstrap-upsert-0001",
          kind: "upsert" as const,
          dependsOn: [],
          payload: {
            type: "req",
            id: "REQ-bootstrap-apply",
            properties: { title: "Bootstrap apply", status: "open" },
            relationships: [],
          },
        },
      ],
      sourceWrites: [],
      suppressedCandidates: [],
      payoffSummary: {},
      diagnostics: [],
    };
    const plan = { ...body, planHash: bootstrapPlanHash(body) };
    const journalId = `bootstrap-${plan.planHash.slice(0, 16)}`;
    mkdirSync(path.join(root, ".kb", "recovery"), { recursive: true });
    writeFileSync(
      path.join(root, ".kb", "recovery", `${journalId}.json`),
      `${JSON.stringify({ version: 2, kind: "bootstrap", state: "applying" })}\n`,
    );
    await expect(
      executeApplyPlan(
        { plan, approvedPlanHash: plan.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/already exists/);
  });

  test("skips already-completed bootstrap actions during ordering", () => {
    const action = {
      id: "bootstrap-upsert-done",
      kind: "upsert" as const,
      dependsOn: [],
      payload: { type: "req", id: "REQ-a", properties: {}, relationships: [] },
    };
    expect(
      orderBootstrapActions([action], new Set(["bootstrap-upsert-done"])),
    ).toEqual([]);
  });
});

describe("source hash and source-write guards", () => {
  test("validates tracked source hashes against workspace files", async () => {
    const root = makeTempDir();
    writeFileSync(path.join(root, "tracked.ts"), "export const x = 1;\n");
    const digest = sha("export const x = 1;\n");
    const matching = compilePlan({
      expected: {
        branch: "develop",
        kbSnapshotId: "missing",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: { "tracked.ts": digest },
      },
    });
    const result = await executeApplyPlan(
      { plan: matching, approvedPlanHash: matching.planHash },
      filesystemContext(root),
    );
    expect(result.structuredContent.outcome).toBe("applied");

    const stale = compilePlan({
      expected: {
        branch: "develop",
        kbSnapshotId: "missing",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: { "tracked.ts": "f".repeat(64) },
      },
    });
    await expect(
      executeApplyPlan(
        { plan: stale, approvedPlanHash: stale.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/source hash changed/);
  });

  test("rejects source writes without a filesystem, escaped paths, and hash mismatches", async () => {
    const root = makeTempDir();
    const body = "body\n";
    const writes = [
      {
        path: "docs/a.md",
        mode: "write" as const,
        beforeHash: null,
        afterHash: sha(body),
        body,
      },
    ];
    const needsFs = compilePlan({ sourceWrites: writes });
    const ctx = filesystemContext(root);
    await expect(
      executeApplyPlan(
        { plan: needsFs, approvedPlanHash: needsFs.planHash },
        { ...ctx, fs: undefined },
      ),
    ).rejects.toThrow(/filesystem-capable runtime/);

    const escaped = compilePlan({
      sourceWrites: [
        {
          path: "../outside.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha(body),
          body,
        },
      ],
    });
    await expect(
      executeApplyPlan(
        { plan: escaped, approvedPlanHash: escaped.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/workspace-relative/);

    const derived = compilePlan({
      sourceWrites: [
        {
          path: ".kb/recovery/secret.json",
          mode: "write",
          beforeHash: null,
          afterHash: sha(body),
          body,
        },
      ],
    });
    await expect(
      executeApplyPlan(
        { plan: derived, approvedPlanHash: derived.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/derived .kb runtime/);

    const mismatch = compilePlan({
      sourceWrites: [
        {
          path: "docs/a.md",
          mode: "write",
          beforeHash: null,
          afterHash: "0".repeat(64),
          body,
        },
      ],
    });
    await expect(
      executeApplyPlan(
        { plan: mismatch, approvedPlanHash: mismatch.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/afterHash does not match/);
  });

  test("deletes a tracked source file through a delete source write", async () => {
    const root = makeTempDir();
    const existing = "remove me\n";
    writeFileSync(path.join(root, "gone.md"), existing);
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "gone.md",
          mode: "delete",
          beforeHash: sha(existing),
          afterHash: null,
        },
      ],
    });
    const result = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(root),
    );
    // The step's own document is written beside the plan's delete.
    expect(asApply(result.structuredContent).changedPaths).toEqual([
      "gone.md",
      ".kb/requirements/REQ-apply.md",
    ]);
  });

  test("writes without rename and refuses delete without unlink", async () => {
    const root = makeTempDir();
    const body = "compat write\n";
    const plan = compilePlan({
      sourceWrites: [
        {
          path: "docs/compat.md",
          mode: "write",
          beforeHash: null,
          afterHash: sha(body),
          body,
        },
      ],
    });
    const { rename: _rename, ...noRename } = nodeFilesystem;
    const written = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      { ...filesystemContext(root), fs: noRename },
    );
    expect(asApply(written.structuredContent).changedPaths).toEqual([
      "docs/compat.md",
      ".kb/requirements/REQ-apply.md",
    ]);

    writeFileSync(path.join(root, "gone-no-unlink.md"), "x\n");
    const del = compilePlan({
      sourceWrites: [
        {
          path: "gone-no-unlink.md",
          mode: "delete",
          beforeHash: sha("x\n"),
          afterHash: null,
        },
      ],
    });
    const { unlink: _unlink, ...noUnlink } = nodeFilesystem;
    await expect(
      executeApplyPlan(
        { plan: del, approvedPlanHash: del.planHash },
        { ...filesystemContext(root), fs: noUnlink },
      ),
    ).rejects.toThrow(/unlink support/);

    const badDelete = compilePlan({
      sourceWrites: [
        {
          path: "docs/compat.md",
          mode: "delete",
          beforeHash: sha(body),
          afterHash: sha("not-null\n"),
        },
      ],
    });
    await expect(
      executeApplyPlan(
        { plan: badDelete, approvedPlanHash: badDelete.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/null afterHash/);
  });

  test("rolls back a prepared crash journal and refuses outside-hash recovery", async () => {
    const root = makeTempDir();
    const before = "before body\n";
    const after = "after body\n";
    const writes = [
      {
        path: "docs/crash.md",
        mode: "write" as const,
        beforeHash: sha(before),
        afterHash: sha(after),
        body: after,
      },
    ];
    const plan = deletionPlan(writes);
    const journalId = `source-writes-${plan.planHash.slice(0, 16)}`;
    const recoveryDir = path.join(root, ".kb", "recovery");
    mkdirSync(recoveryDir, { recursive: true });
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(path.join(root, "docs", "crash.md"), after);
    const beforeStage = path.join(recoveryDir, `${journalId}-0.before`);
    const afterStage = path.join(recoveryDir, `${journalId}-0.after`);
    writeFileSync(beforeStage, before);
    writeFileSync(afterStage, after);
    writeFileSync(
      path.join(recoveryDir, `${journalId}.json`),
      `${JSON.stringify(
        {
          version: 1,
          planHash: plan.planHash,
          state: "prepared",
          entries: [
            {
              path: "docs/crash.md",
              mode: "write",
              beforeHash: sha(before),
              afterHash: sha(after),
              beforeExisted: true,
              beforeStage,
              afterStage,
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const recovered = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(root),
    );
    expect(recovered.structuredContent.outcome).toBe("applied");

    const drifted = deletionPlan([
      {
        path: "docs/drift.md",
        mode: "write",
        beforeHash: sha("old\n"),
        afterHash: sha("new\n"),
        body: "new\n",
      },
    ]);
    const driftId = `source-writes-${drifted.planHash.slice(0, 16)}`;
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(path.join(root, "docs", "drift.md"), "outside\n");
    writeFileSync(
      path.join(root, ".kb", "recovery", `${driftId}.json`),
      `${JSON.stringify(
        {
          version: 1,
          planHash: drifted.planHash,
          state: "publishing_sources",
          entries: [
            {
              path: "docs/drift.md",
              mode: "write",
              beforeHash: sha("old\n"),
              afterHash: sha("new\n"),
              beforeExisted: true,
              beforeStage: path.join(
                root,
                ".kb",
                "recovery",
                `${driftId}-0.before`,
              ),
              afterStage: path.join(
                root,
                ".kb",
                "recovery",
                `${driftId}-0.after`,
              ),
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    await expect(
      executeApplyPlan(
        { plan: drifted, approvedPlanHash: drifted.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/changed outside its journal/);
  });
});

describe("migration action executors", () => {
  test("applies missing_exact_branch_store and reports malformed CLI invocations", async () => {
    const { createGitWorkspace, isolateKibiEnv, removeTempDir } = await import(
      "../helpers/in-process-workspace.js"
    );
    const restore = isolateKibiEnv();
    const cwd = createGitWorkspace();
    try {
      const ctx: OperationContext = {
        ...filesystemContext(cwd),
        branchAttachment: {
          gitBranch: "main",
          kbBranch: "main",
          storePath: path.join(cwd, ".kb", "branches", "main"),
          kind: "exact",
          migrationRequired: false,
        },
      };

      const missingFrom = buildMigrationPlan({
        actions: [
          automaticAction({
            id: "mig-legacy-argv",
            code: "legacy_branch_storage",
            category: "branch",
            invocation: {
              kind: "cli",
              command_argv: ["kibi", "branch", "migrate"],
            },
          }),
        ],
      });
      const missingFromResult = await executeApplyPlan(
        {
          plan: missingFrom,
          approvedPlanHash: missingFrom.planHash,
          approvedActionIds: ["mig-legacy-argv"],
        },
        ctx,
      );
      expect(missingFromResult.structuredContent.outcome).toBe(
        "reconciliation_required",
      );

      const reviewInvocation = buildMigrationPlan({
        actions: [
          automaticAction({
            id: "mig-legacy-review",
            code: "legacy_branch_storage",
            category: "branch",
            invocation: { kind: "review", instruction: "manual" },
          }),
        ],
      });
      const reviewResult = await executeApplyPlan(
        {
          plan: reviewInvocation,
          approvedPlanHash: reviewInvocation.planHash,
          approvedActionIds: ["mig-legacy-review"],
        },
        ctx,
      );
      expect(reviewResult.structuredContent.outcome).toBe(
        "reconciliation_required",
      );

      const ensure = buildMigrationPlan({
        actions: [
          automaticAction({
            id: "mig-ensure",
            code: "missing_exact_branch_store",
            category: "branch",
          }),
        ],
      });
      const ensured = await executeApplyPlan(
        {
          plan: ensure,
          approvedPlanHash: ensure.planHash,
          approvedActionIds: ["mig-ensure"],
        },
        ctx,
      );
      expect(
        (
          ensured.structuredContent as unknown as {
            actionResults: { outcome: string }[];
          }
        ).actionResults[0]?.outcome,
      ).toBe("applied");
    } finally {
      restore();
      removeTempDir(cwd);
    }
  });

  test("schema and coordinate migration actions surface executor failures", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    const plan = buildMigrationPlan({
      actions: [
        automaticAction({
          id: "mig-schema",
          code: "schema_version_upgrade",
          category: "schema",
        }),
        automaticAction({
          id: "mig-coords",
          code: "symbol_refresh_coordinates",
          category: "symbol",
          dependsOn: ["mig-schema"],
        }),
      ],
    });
    const result = await executeApplyPlan(
      {
        plan,
        approvedPlanHash: plan.planHash,
        approvedActionIds: ["mig-schema", "mig-coords"],
      },
      ctx,
    );
    expect(result.structuredContent.outcome).toBe("reconciliation_required");
    const rows = (
      result.structuredContent as unknown as {
        actionResults: readonly { actionId: string; outcome: string }[];
      }
    ).actionResults;
    expect(rows[0]?.outcome).toMatch(/applied|failed/);
    expect(rows[1]?.outcome).toMatch(/applied|failed|skipped/);
  });
});

describe("remaining apply-plan shape and recovery branches", () => {
  async function thinBody(overrides: Record<string, unknown> = {}) {
    const { bootstrapEmptyKbSnapshotId, bootstrapPlanHash } = await import(
      "../../src/operations/bootstrap/types.js"
    );
    const workspaceSnapshot = "a".repeat(64);
    const sourceHashes = {};
    const kbSnapshotId = bootstrapEmptyKbSnapshotId({
      branch: "develop",
      workspaceSnapshot,
      sourceHashes,
    });
    const body = {
      version: "kibi.bootstrap-plan.v1" as const,
      status: "ready" as const,
      expected: {
        branch: "develop",
        kbSnapshotId,
        workspaceSnapshot,
        sourceHashes,
      },
      activation: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: false,
        reason: "thin",
      },
      declaredContext: {
        sourceOfTruthPaths: [],
        sourceOfTruthNotes: [],
        priorityRoots: [],
        verificationAnchors: [],
      },
      contextQuestions: [],
      confidence: {
        score: 0.9,
        level: "high" as const,
        policy: "full_actions" as const,
      },
      discoverySummary: {
        activationState: "root_active_thin" as const,
        activationMode: "attached_thin_bootstrap" as const,
        applyBlocked: false,
        reason: "thin",
        providersRun: [],
        providerCounts: {},
        detectedLanguages: [],
        detectedTestFrameworks: [],
        excludedRoots: [],
        truncated: false,
        scanWarnings: [],
      },
      candidates: [],
      actions: [
        {
          id: "bootstrap-upsert-0001",
          kind: "upsert" as const,
          dependsOn: [],
          payload: {
            type: "req",
            id: "REQ-bootstrap-apply",
            properties: { title: "Bootstrap apply", status: "open" },
            relationships: [],
          },
        },
      ],
      sourceWrites: [],
      suppressedCandidates: [],
      payoffSummary: {},
      diagnostics: [],
      ...overrides,
    };
    return { body, planHash: bootstrapPlanHash(body) };
  }

  test("rejects not-ready, hash, snapshot, empty-action, and cyclic bootstrap plans", async () => {
    const root = makeTempDir();
    const ctx = filesystemContext(root);
    const { body, planHash } = await thinBody({ status: "needs_resolution" });
    await expect(
      executeApplyPlan(
        { plan: { ...body, planHash }, approvedPlanHash: planHash },
        ctx,
      ),
    ).rejects.toThrow(/only ready plans/);

    const ready = await thinBody();
    await expect(
      executeApplyPlan(
        {
          plan: { ...ready.body, planHash: ready.planHash },
          approvedPlanHash: "not-hex",
        },
        ctx,
      ),
    ).rejects.toThrow(/SHA-256/);
    await expect(
      executeApplyPlan(
        {
          plan: { ...ready.body, planHash: ready.planHash },
          approvedPlanHash: "b".repeat(64),
        },
        ctx,
      ),
    ).rejects.toThrow(/does not match planHash/);
    await expect(
      executeApplyPlan(
        {
          plan: { ...ready.body, planHash: "c".repeat(64) },
          approvedPlanHash: "c".repeat(64),
        },
        ctx,
      ),
    ).rejects.toThrow(/canonical plan body/);

    const badSnap = await thinBody({
      expected: {
        branch: "develop",
        kbSnapshotId: "not-a-snapshot",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: {},
      },
    });
    await expect(
      executeApplyPlan(
        {
          plan: { ...badSnap.body, planHash: badSnap.planHash },
          approvedPlanHash: badSnap.planHash,
        },
        ctx,
      ),
    ).rejects.toThrow(/exact KB snapshot/);

    const empty = await thinBody({ actions: [] });
    await expect(
      executeApplyPlan(
        {
          plan: { ...empty.body, planHash: empty.planHash },
          approvedPlanHash: empty.planHash,
        },
        ctx,
      ),
    ).rejects.toThrow(/must contain actions/);

    expect(() =>
      orderBootstrapActions([
        {
          id: "bootstrap-upsert-a",
          kind: "upsert",
          dependsOn: ["bootstrap-upsert-b"],
          payload: {
            type: "req",
            id: "REQ-a",
            properties: {},
            relationships: [],
          },
        },
        {
          id: "bootstrap-upsert-b",
          kind: "upsert",
          dependsOn: ["bootstrap-upsert-a"],
          payload: {
            type: "req",
            id: "REQ-b",
            properties: {},
            relationships: [],
          },
        },
      ]),
    ).toThrow(/dependency cycle/);
  });

  test("rejects missing source files, missing filesystem, and bootstrap Prolog/status gaps", async () => {
    const root = makeTempDir();
    const missing = compilePlan({
      expected: {
        branch: "develop",
        kbSnapshotId: "missing",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: { "docs/missing.md": "a".repeat(64) },
      },
    });
    await expect(
      executeApplyPlan(
        { plan: missing, approvedPlanHash: missing.planHash },
        filesystemContext(root),
      ),
    ).rejects.toThrow(/source hash changed/);

    const hashed = compilePlan({
      expected: {
        branch: "develop",
        kbSnapshotId: "missing",
        workspaceSnapshot: "a".repeat(64),
        sourceHashes: { "docs/a.md": "a".repeat(64) },
      },
    });
    const { fs: _fs, ...noFs } = filesystemContext(root);
    await expect(
      executeApplyPlan(
        { plan: hashed, approvedPlanHash: hashed.planHash },
        noFs,
      ),
    ).rejects.toThrow(/filesystem-capable runtime/);

    const { body, planHash } = await thinBody();
    await expect(
      executeApplyPlan(
        { plan: { ...body, planHash }, approvedPlanHash: planHash },
        filesystemContext(root, { omitProlog: true }),
      ),
    ).rejects.toThrow(/Prolog runtime/);
  });

  test("rolls back a prepared journal for a newly created file and ignores mismatched journals", async () => {
    const root = makeTempDir();
    const after = "after body\n";
    const writes = [
      {
        path: "docs/new.md",
        mode: "write" as const,
        beforeHash: null,
        afterHash: sha(after),
        body: after,
      },
    ];
    const plan = deletionPlan(writes);
    const journalId = `source-writes-${plan.planHash.slice(0, 16)}`;
    const recoveryDir = path.join(root, ".kb", "recovery");
    mkdirSync(recoveryDir, { recursive: true });
    mkdirSync(path.join(root, "docs"), { recursive: true });
    writeFileSync(path.join(root, "docs", "new.md"), after);
    writeFileSync(path.join(recoveryDir, `${journalId}-0.after`), after);
    writeFileSync(
      path.join(recoveryDir, `${journalId}.json`),
      `${JSON.stringify(
        {
          version: 1,
          planHash: plan.planHash,
          state: "prepared",
          entries: [
            {
              path: "docs/new.md",
              mode: "write",
              beforeHash: null,
              afterHash: sha(after),
              beforeExisted: false,
              beforeStage: path.join(recoveryDir, `${journalId}-0.before`),
              afterStage: path.join(recoveryDir, `${journalId}-0.after`),
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
    const recovered = await executeApplyPlan(
      { plan, approvedPlanHash: plan.planHash },
      filesystemContext(root),
    );
    expect(recovered.structuredContent.outcome).toBe("applied");
    expect(existsSync(path.join(root, "docs", "new.md"))).toBe(false);

    const mismatch = deletionPlan([
      {
        path: "docs/other.md",
        mode: "write",
        beforeHash: null,
        afterHash: sha("x\n"),
        body: "x\n",
      },
    ]);
    const mismatchId = `source-writes-${mismatch.planHash.slice(0, 16)}`;
    writeFileSync(
      path.join(recoveryDir, `${mismatchId}.json`),
      `${JSON.stringify({
        version: 1,
        planHash: mismatch.planHash,
        state: "prepared",
        entries: [
          {
            path: "docs/different.md",
            mode: "write",
            beforeHash: null,
            afterHash: sha("y\n"),
            beforeExisted: false,
            beforeStage: "x",
            afterStage: "y",
          },
        ],
      })}\n`,
    );
    const applied = await executeApplyPlan(
      { plan: mismatch, approvedPlanHash: mismatch.planHash },
      filesystemContext(root),
    );
    expect(applied.structuredContent).toMatchObject({
      sourcePaths: ["docs/other.md"],
    });
  });

  test("records committed_with_repairs when a bootstrap upsert returns repair status", async () => {
    const root = makeTempDir();
    const { body, planHash } = await thinBody();
    const result = await executeApplyPlan(
      { plan: { ...body, planHash }, approvedPlanHash: planHash },
      filesystemContext(root, {
        query: {
          query: async (goal) =>
            isWhatIfGoal(goal)
              ? whatIfResult()
              : ((goal.includes("kb_commit_upsert")
                  ? { success: true, bindings: { ChangeKind: "mutated" } }
                  : {
                      success: true,
                      bindings: { Results: "[]" },
                    }) as unknown as PrologQueryResult),
          queryStatusJson: async () => ({ success: true, bindings: {} }),
          nextSolution: async () => null,
          save: async () => ({ success: true, bindings: {} }),
        },
      }),
    );
    expect(result.structuredContent.outcome).toBe("partially_applied");
    expect(asApply(result.structuredContent).status).toBe(
      "committed_with_repairs",
    );
  });

  test("rejects compile apply without Prolog after plan validation", async () => {
    const root = makeTempDir();
    const plan = compilePlan();
    const {
      prolog: _prolog,
      ensureProlog: _ensure,
      ...ctx
    } = filesystemContext(root);
    await expect(
      executeApplyPlan({ plan, approvedPlanHash: plan.planHash }, ctx),
    ).rejects.toThrow(/Prolog runtime/);
  });
});
