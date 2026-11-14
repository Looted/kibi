import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as aggregated from "../../../src/commands/aggregated-checks.js";
import * as impact from "../../../src/public/impact-diagnostics.js";
import {
  analysisCacheDir,
  executeCheck,
  uncompiledBranchStoreViolation,
} from "../../../src/public/operations/check-executor.js";
import * as format from "../../../src/public/operations/check-format-shared.js";
import * as helpers from "../../../src/public/operations/check-helpers.js";
import * as policy from "../../../src/public/operations/check-policy-rules.js";
import * as firmness from "../../../src/public/operations/decision-firmness.js";
import * as discovery from "../../../src/public/operations/discovery-executors.js";
import * as entityContext from "../../../src/public/operations/entity-context.js";
import * as evidenceFloor from "../../../src/public/operations/evidence-floor.js";
import * as plans from "../../../src/public/operations/migration-plan.js";
import * as originReview from "../../../src/public/operations/origin-review.js";
import * as predicates from "../../../src/public/operations/predicate-schema-conformance.js";
import * as claims from "../../../src/public/operations/proof-contract-claims.js";
import type {
  OperationContext,
  PrologPort,
} from "../../../src/public/operations/runtime-types.js";
import * as dangling from "../../../src/public/operations/source-path-dangling.js";
import * as parity from "../../../src/public/operations/source-relationship-parity.js";
import * as reporting from "../../../src/public/operations/specs/reporting.js";
import * as coordinates from "../../../src/public/operations/symbol-coordinates-check.js";
import * as granularity from "../../../src/public/operations/symbol-granularity-check.js";
import * as snapshots from "../../../src/public/operations/workspace-snapshot.js";
import * as resolver from "../../../src/utils/branch-resolver.js";
import * as branchStore from "../../../src/utils/branch-store.js";
import * as kbManifest from "../../../src/utils/kb-manifest.js";

// biome-ignore lint/suspicious/noExplicitAny: spies on many differently typed exports
type AnySpy = any;
const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

// biome-ignore lint/suspicious/noExplicitAny: see AnySpy
function spy(module: any, name: string): AnySpy {
  const created = spyOn(module, name);
  spies.push(created);
  return created;
}

const ROOT = "/ws/context";
const ATTACHED = {
  gitBranch: "feature",
  kbBranch: "kb-feature",
  storePath: "/ws/store",
};

type Prolog = PrologPort & { queries: string[] };

function prologPort(
  answer: (goal: string) => Promise<{
    success: boolean;
    bindings: Record<string, unknown>;
  }> = async () => ({ success: true, bindings: {} }),
  extra: Partial<PrologPort> = {},
): Prolog {
  const queries: string[] = [];
  return {
    queries,
    query: async (goal: string) => {
      queries.push(goal);
      return (await answer(goal)) as never;
    },
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
    ...extra,
  } as Prolog;
}

function context(overrides: Partial<OperationContext> = {}): OperationContext {
  return {
    workspaceRoot: ROOT,
    signal: new AbortController().signal,
    clock: () => new Date(Date.UTC(2026, 0, 2)),
    prolog: prologPort(),
    ...overrides,
  };
}

const finding = (rule: string, extra: Record<string, unknown> = {}) => ({
  rule,
  entityId: `E-${rule}`,
  description: `${rule} found`,
  ...extra,
});

type HarnessOptions = {
  rules?: readonly string[];
  impact?: unknown;
  snapshot?: boolean;
  status?: unknown;
  statusError?: unknown;
  partitionQuality?: readonly Record<string, unknown>[];
  aggregated?: readonly Record<string, unknown>[];
  manifest?: unknown;
};

/** Replace every collaborator with a recording fake. */
function harness(options: HarnessOptions = {}) {
  const rules = new Set(options.rules ?? []);
  const calls = {
    snapshot: spy(snapshots, "readWorkspaceSnapshot").mockResolvedValue(
      options.snapshot === false
        ? { available: false, reason: "dirty" }
        : { available: true, snapshot: { hash: "snap-hash" } },
    ),
    resolveRules: spy(helpers, "resolveCheckRules").mockReturnValue(rules),
    impact: spy(helpers, "analyzeKbCheckImpact").mockResolvedValue(
      options.impact,
    ),
    impactQuality: spy(helpers, "qualityDiagnosticsFromImpact").mockReturnValue(
      [{ id: "Q-impact" }],
    ),
    staged: spy(helpers, "stagedEntityIdStyleDiagnostics").mockReturnValue([
      { id: "Q-staged" },
    ]),
    queryPlan: spy(helpers, "collectQueryPlanSafetyViolations").mockReturnValue(
      [finding("query-plan-safety")],
    ),
    partition: spy(helpers, "partitionCheckFindings").mockImplementation(
      (findings: unknown[]) => ({
        violations: [...findings],
        qualityDiagnostics: [...(options.partitionQuality ?? [])],
      }),
    ),
    scope: spy(helpers, "scopeQualityDiagnosticsToImpact").mockReturnValue([
      { id: "Q-scoped" },
    ]),
    full: spy(impact, "collectFullKbQualityDiagnostics").mockResolvedValue([
      { id: "Q-full" },
    ]),
    status: spy(discovery, "executeStatus").mockImplementation(async () => {
      if (options.statusError !== undefined) throw options.statusError;
      return (
        options.status ?? { structuredContent: { migrationPlan: "STATUS" } }
      );
    }),
    actions: spy(plans, "buildActionsFromCheck").mockImplementation(
      (input: unknown) => ({ actionsFrom: input }),
    ),
    plan: spy(plans, "buildMigrationPlan").mockImplementation(
      (input: unknown) => ({ planFrom: input }),
    ),
    merge: spy(plans, "mergeMigrationPlans").mockImplementation(
      (input: unknown) => ({ merged: input }),
    ),
    summary: spy(format, "buildSummary").mockImplementation(
      (input: unknown) => ({ summaryOf: input }),
    ),
    structured: spy(format, "buildStructuredContent").mockImplementation(
      (input: unknown) => input,
    ),
    manifest: spy(kbManifest, "readKbManifest").mockReturnValue(
      (options.manifest ?? null) as never,
    ),
    aggregated: spy(aggregated, "runAggregatedChecks").mockResolvedValue(
      options.aggregated ?? [finding("aggregated")],
    ),
    parity: spy(
      parity,
      "collectSourceRelationshipParityViolations",
    ).mockResolvedValue([finding("source-relationship-parity")]),
    predicates: spy(
      predicates,
      "collectPredicateSchemaConformanceViolations",
    ).mockResolvedValue([finding("predicate-schema-conformance")]),
    dangling: spy(
      dangling,
      "collectSourcePathDanglingViolations",
    ).mockReturnValue([finding("source-path-dangling")]),
    granularity: spy(
      granularity,
      "collectSymbolGranularityViolations",
    ).mockResolvedValue([finding("granularity")]),
    coordinates: spy(
      coordinates,
      "collectSymbolCoordinatesMissingViolations",
    ).mockResolvedValue([finding("coordinates")]),
    origin: spy(
      originReview,
      "collectOriginReviewViolations",
    ).mockResolvedValue([finding("origin")]),
    entityContext: spy(
      entityContext,
      "collectEntityContextViolations",
    ).mockReturnValue([finding("entity-context")]),
    firmness: spy(
      firmness,
      "collectDecisionFirmnessViolations",
    ).mockReturnValue([finding("firmness")]),
    policy: spy(policy, "collectCheckPolicyViolations").mockResolvedValue([
      finding("policy"),
    ]),
    floor: spy(
      evidenceFloor,
      "collectEvidenceFloorViolations",
    ).mockResolvedValue([finding("floor")]),
    claims: spy(
      claims,
      "collectProofContractClaimViolations",
    ).mockResolvedValue([finding("claims")]),
    bindings: spy(reporting, "perContractTestBindings").mockResolvedValue(
      "BINDINGS",
    ),
    resolve: spy(resolver, "resolveBranchAttachment").mockImplementation(() => {
      throw new Error("no branch");
    }),
    inspect: spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "missing",
      path: "/ws/store",
    }),
    reason: spy(branchStore, "uncompiledBranchStoreReason").mockReturnValue(
      null,
    ),
  };
  return calls;
}

// biome-ignore lint/suspicious/noExplicitAny: structured content is the fake's input
type Loose = any;

async function run(
  args: Record<string, unknown>,
  ctx: OperationContext = context(),
  options: Record<string, unknown> = {},
): Promise<Loose> {
  return executeCheck(args as never, ctx, options as never);
}

const ALL_RULES = [
  "query-plan-safety",
  "source-relationship-parity",
  "predicate-schema-conformance",
  "source-path-dangling",
];

describe("uncompiledBranchStoreViolation", () => {
  test("is null without a resolvable branch or a reason", () => {
    const calls = harness();
    expect(uncompiledBranchStoreViolation(context(), "/ws")).toBeNull();
    expect(calls.resolve).toHaveBeenCalledWith("/ws");
    calls.resolve.mockReturnValue({ error: "detached" });
    expect(uncompiledBranchStoreViolation(context(), "/ws")).toBeNull();
    expect(calls.inspect).not.toHaveBeenCalled();
    calls.resolve.mockReturnValue(ATTACHED);
    expect(uncompiledBranchStoreViolation(context(), "/ws")).toBeNull();
    expect(calls.inspect).toHaveBeenCalledWith("/ws", "kb-feature");
    expect(calls.reason).toHaveBeenCalledWith(
      "/ws",
      { state: "missing", path: "/ws/store" },
      "kb-feature",
    );
  });

  test("describes a store that was never compiled", () => {
    const calls = harness();
    calls.reason.mockReturnValue({
      detail: 42,
      authoredSources: 3,
      remediation: "sync",
    });
    const attached = context({ branchAttachment: ATTACHED as never });
    expect(uncompiledBranchStoreViolation(attached, "/ws")).toStrictEqual({
      rule: "branch-store-not-compiled",
      entityId: "kb-feature",
      description: "42",
      suggestion:
        "Run kibi sync to compile this branch's store from the authored .kb/ sources (or apply the branch-store-compile action of the returned migrationPlan with kb_apply_plan), then rerun kb_check. Run kibi init once to install the git hooks that compile a new branch on checkout.",
      source: "/ws/store",
      evidence: {
        store: { state: "missing", path: "/ws/store" },
        authoredSources: 3,
        remediation: "sync",
      },
    });
    expect(calls.resolve).not.toHaveBeenCalled();
    calls.reason.mockReturnValue({
      detail: "never compiled",
      authoredSources: 1,
      generation: 0,
      remediation: "sync",
    });
    expect(
      uncompiledBranchStoreViolation(attached, "/ws")?.evidence,
    ).toStrictEqual({
      store: { state: "missing", path: "/ws/store" },
      authoredSources: 1,
      generation: 0,
      remediation: "sync",
    });
  });
});

describe("analysisCacheDir", () => {
  test("keeps analyses only in a known, writable branch store", () => {
    const calls = harness();
    expect(analysisCacheDir(context(), "/ws", {})).toBeUndefined();
    expect(
      analysisCacheDir(context(), "/ws", { branchStoreAttached: false }),
    ).toBeUndefined();
    expect(calls.resolve).not.toHaveBeenCalled();
    expect(
      analysisCacheDir(context(), "/ws", { branchStoreAttached: true }),
    ).toBeUndefined();
    expect(calls.resolve).toHaveBeenCalledWith("/ws");
    calls.resolve.mockReturnValue({ error: "detached" });
    expect(
      analysisCacheDir(context(), "/ws", { branchStoreAttached: true }),
    ).toBeUndefined();
    calls.resolve.mockReturnValue(ATTACHED);
    expect(
      analysisCacheDir(context(), "/ws", { branchStoreAttached: true }),
    ).toBe("/ws/store");
    const attached = context({ branchAttachment: ATTACHED as never });
    expect(analysisCacheDir(attached, "/ws", {})).toBe("/ws/store");
    const readOnly = context({
      branchAttachment: { ...ATTACHED, readOnly: {} } as never,
    });
    expect(analysisCacheDir(readOnly, "/ws", {})).toBeUndefined();
  });
});

describe("executeCheck", () => {
  test("wraps every failure", async () => {
    harness();
    await expect(run({}, context({ prolog: undefined }))).rejects.toThrow(
      "Check execution failed: Check operation requires a Prolog runtime",
    );
    spy(snapshots, "readWorkspaceSnapshot").mockRejectedValue("plain text");
    await expect(run({})).rejects.toThrow(
      /^Check execution failed: plain text$/,
    );
  });

  test("reports only the uncompiled branch store", async () => {
    const calls = harness({ impact: { impactDiagnostics: [] } });
    calls.reason.mockReturnValue({
      detail: "never compiled",
      authoredSources: 2,
      remediation: "sync",
    });
    const ctx = context({ branchAttachment: ATTACHED as never });
    const result = await run({ workspaceRoot: "/ws/args" }, ctx);
    const violation = uncompiledBranchStoreViolation(ctx, "/ws/args");
    const evaluated = { rules: ["branch-store-not-compiled"] };
    const migrationPlan = {
      merged: [
        "STATUS",
        {
          planFrom: {
            expected: { branch: "feature", kbBranch: "kb-feature" },
            evaluatedDomains: ["quality"],
            actions: {
              actionsFrom: { violations: [violation], qualityDiagnostics: [] },
            },
          },
        },
      ],
    };
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: {
          summaryOf: {
            violations: [violation],
            evaluated,
            impactResult: { impactDiagnostics: [] },
            qualityDiagnostics: [],
          },
        },
      },
    ]);
    expect(result.structuredContent).toStrictEqual({
      violations: [violation],
      evaluated,
      diagnostics: [
        {
          category: "SYNC_ERROR",
          severity: "error",
          message: "never compiled",
          file: "/ws/store",
          suggestion: violation?.suggestion,
        },
      ],
      qualityDiagnostics: [],
      impactResult: { impactDiagnostics: [] },
      migrationPlan,
    });
    expect(calls.status).toHaveBeenCalledWith({}, ctx);
    expect(calls.aggregated).not.toHaveBeenCalled();

    calls.inspect.mockReturnValue({ state: "missing" });
    calls.resolve.mockReturnValue(ATTACHED);
    const bare = await run({}, context(), { branchStoreAttached: true });
    expect(Object.hasOwn(bare.structuredContent.diagnostics[0], "file")).toBe(
      false,
    );
    expect(
      bare.structuredContent.migrationPlan.merged[1].planFrom.expected,
    ).toStrictEqual({ branch: null, kbBranch: null });
  });

  test("skips the store check without a known store", async () => {
    const calls = harness();
    calls.reason.mockReturnValue({ detail: "x", authoredSources: 1 });
    calls.resolve.mockReturnValue(ATTACHED);
    const result = await run({ rules: [] });
    expect(result.structuredContent.violations).toStrictEqual([]);
    expect(calls.inspect).not.toHaveBeenCalled();
  });

  test("runs no rule for an empty rule set", async () => {
    const calls = harness({ snapshot: false });
    const ctx = context();
    const explicit = await run({ rules: [] }, ctx);
    expect(explicit.structuredContent).toStrictEqual({
      violations: [],
      evaluated: { rules: [] },
      diagnostics: [],
      qualityDiagnostics: [],
      impactResult: undefined,
      migrationPlan: {
        merged: [
          "STATUS",
          {
            planFrom: {
              expected: { branch: null, kbBranch: null },
              evaluatedDomains: ["quality"],
              actions: {
                actionsFrom: { violations: [], qualityDiagnostics: [] },
              },
            },
          },
        ],
      },
    });
    expect(explicit.content).toStrictEqual([
      {
        type: "text",
        text: {
          summaryOf: {
            violations: [],
            evaluated: { rules: [] },
            impactResult: undefined,
            qualityDiagnostics: [],
          },
        },
      },
    ]);
    expect(calls.full).not.toHaveBeenCalled();
    expect(calls.aggregated).not.toHaveBeenCalled();
    expect(calls.resolveRules).toHaveBeenCalledWith({ rules: [] });
    expect(calls.impact).toHaveBeenCalledWith(ROOT, { rules: [] });
    expect(calls.staged).toHaveBeenCalledWith(ROOT, { rules: [] });
    expect(calls.impactQuality).toHaveBeenCalledWith(undefined);

    const full = await run({ maxDiagnostics: 7 }, ctx);
    expect(full.structuredContent.qualityDiagnostics).toStrictEqual([
      { id: "Q-full" },
    ]);
    const [input] = calls.full.mock.calls[0];
    expect(Object.keys(input).sort()).toEqual([
      "checkedAt",
      "maxDiagnostics",
      "now",
      "prolog",
      "proofTestBindings",
      "workspaceRoot",
    ]);
    expect(input).toMatchObject({
      prolog: ctx.prolog,
      workspaceRoot: ROOT,
      checkedAt: "2026-01-02T00:00:00.000Z",
      now: new Date(Date.UTC(2026, 0, 2)),
      maxDiagnostics: 7,
    });
    expect(await input.proofTestBindings()).toBe("BINDINGS");
    expect(calls.bindings).toHaveBeenCalledWith({
      ...ctx,
      prolog: ctx.prolog,
    });

    await run({ rules: [] }, ctx, {
      collectFullQualityDiagnosticsForExplicitRules: true,
    });
    expect(calls.full).toHaveBeenCalledTimes(2);
    expect(Object.hasOwn(calls.full.mock.calls[1][0], "maxDiagnostics")).toBe(
      false,
    );
  });

  test("lists impact diagnostics for an empty rule set over changed files", async () => {
    const impactResult = { sourceFiles: ["a.ts"] };
    const calls = harness({ impact: impactResult });
    const result = await run({ sourceFiles: ["a.ts"] });
    expect(result.structuredContent.qualityDiagnostics).toStrictEqual([
      { id: "Q-impact" },
      { id: "Q-staged" },
    ]);
    expect(calls.impactQuality).toHaveBeenCalledWith(impactResult);
    expect(calls.full).not.toHaveBeenCalled();
  });

  test("passes the snapshot hash to the quality scan", async () => {
    const calls = harness();
    await run({});
    expect(calls.full.mock.calls[0][0].proofSnapshot).toBe("snap-hash");
    const ruled = harness({ rules: ["aggregated"] });
    await run({});
    expect(ruled.full.mock.calls[0][0].proofSnapshot).toBe("snap-hash");
  });

  test("keeps the check result without a resolvable branch", async () => {
    harness({
      statusError: new Error("Failed to resolve active branch: detached"),
    });
    const result = await run({ rules: [] });
    expect(result.structuredContent.migrationPlan.planFrom).toBeDefined();
    harness({ statusError: "Failed to resolve active branch: text" });
    expect(
      (await run({ rules: [] })).structuredContent.migrationPlan.planFrom,
    ).toBeDefined();
    harness({ status: {} });
    expect(
      (await run({ rules: [] })).structuredContent.migrationPlan.planFrom,
    ).toBeDefined();
    harness({ statusError: new Error("disk full") });
    await expect(run({ rules: [] })).rejects.toThrow(
      "Check execution failed: disk full",
    );
    harness({ statusError: "broken" });
    await expect(run({ rules: [] })).rejects.toThrow(
      "Check execution failed: broken",
    );
  });

  test("runs the aggregated checks at the manifest's schema version", async () => {
    const calls = harness({
      rules: ALL_RULES,
      manifest: { schemaVersion: 17 },
    });
    const prolog = prologPort();
    await run({ workspaceRoot: "/ws/args" }, context({ prolog }));
    expect(calls.aggregated).toHaveBeenCalledWith(
      prolog,
      new Set(ALL_RULES),
      17,
    );
  });

  test("runs every selected rule and gathers its findings", async () => {
    const calls = harness({
      rules: ALL_RULES,
      partitionQuality: [
        { id: "Q-advisory" },
        { id: "scoped_check_omitted_quality" },
      ],
      aggregated: [
        finding("aggregated", { source: "a.md", suggestion: "fix a" }),
        finding("plain"),
      ],
    });
    const invalidate = { count: 0 };
    const prolog = prologPort(undefined, {
      invalidateCache: () => {
        invalidate.count += 1;
      },
    });
    const ctx = context({
      prolog,
      branchAttachment: { ...ATTACHED, readOnly: {} } as never,
    });
    const result = await run(
      { workspaceRoot: "/ws/args", freshEvidence: true, sourceFiles: ["a"] },
      ctx,
    );
    expect(invalidate.count).toBe(1);
    const rules = new Set(ALL_RULES);
    // A store without a manifest runs every schema-gated rule as before it.
    expect(calls.aggregated).toHaveBeenCalledWith(prolog, rules, 0);
    expect(calls.manifest).toHaveBeenCalledWith("/ws/args");
    expect(calls.queryPlan).toHaveBeenCalledWith();
    expect(calls.parity).toHaveBeenCalledWith("/ws/args", prolog);
    expect(calls.predicates).toHaveBeenCalledWith(prolog);
    expect(calls.dangling).toHaveBeenCalledWith("/ws/args");
    expect(calls.granularity).toHaveBeenCalledWith(
      prolog,
      "/ws/args",
      rules,
      undefined,
    );
    expect(calls.coordinates).toHaveBeenCalledWith(prolog, "/ws/args", rules);
    expect(calls.origin).toHaveBeenCalledWith(prolog, rules, "/ws/args");
    expect(calls.entityContext).toHaveBeenCalledWith(rules, "/ws/args");
    expect(calls.firmness).toHaveBeenCalledWith(rules, "/ws/args");
    expect(calls.policy).toHaveBeenCalledWith(prolog, rules, "/ws/args");
    expect(calls.floor).toHaveBeenCalledWith(ctx, rules, {
      freshEvidence: true,
      checkedAt: "2026-01-02T00:00:00.000Z",
      snapshotEvidence: { available: true, snapshot: { hash: "snap-hash" } },
    });
    expect(calls.claims).toHaveBeenCalledWith(ctx, rules);
    const order = [
      "aggregated",
      "plain",
      "query-plan-safety",
      "source-relationship-parity",
      "source-path-dangling",
      "granularity",
      "coordinates",
      "predicate-schema-conformance",
      "origin",
      "entity-context",
      "firmness",
      "policy",
      "floor",
      "claims",
    ];
    expect(
      calls.partition.mock.calls[0][0].map((row: { rule: string }) => row.rule),
    ).toEqual(order);
    const content = result.structuredContent;
    expect(content.violations.map((row: { rule: string }) => row.rule)).toEqual(
      order,
    );
    expect(content.diagnostics[0]).toStrictEqual({
      category: "SYNC_ERROR",
      severity: "error",
      message: "aggregated found",
      file: "a.md",
      suggestion: "fix a",
    });
    expect(content.diagnostics[1]).toStrictEqual({
      category: "SYNC_ERROR",
      severity: "error",
      message: "plain found",
    });
    expect(content.evaluated).toStrictEqual({ rules: ALL_RULES });
    expect(prolog.queries).toEqual([]);
    expect(content.qualityDiagnostics).toStrictEqual([
      { id: "Q-advisory" },
      { id: "scoped_check_omitted_quality" },
      { id: "Q-full" },
    ]);
    const [fullInput] = calls.full.mock.calls[0];
    expect(fullInput.hardViolationEntityIds).toEqual(
      new Set(order.map((rule) => `E-${rule}`)),
    );
    expect(fullInput).toMatchObject({
      prolog,
      workspaceRoot: "/ws/args",
      checkedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(await fullInput.proofTestBindings()).toBe("BINDINGS");
    expect(calls.actions).toHaveBeenCalledWith({
      violations: content.violations,
      qualityDiagnostics: [{ id: "Q-advisory" }, { id: "Q-full" }],
    });
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text.summaryOf).toStrictEqual({
      violations: content.violations,
      evaluated: content.evaluated,
      impactResult: undefined,
      qualityDiagnostics: content.qualityDiagnostics,
    });
    expect(Object.keys(content).sort()).toEqual([
      "diagnostics",
      "evaluated",
      "impactResult",
      "migrationPlan",
      "qualityDiagnostics",
      "violations",
    ]);
    expect(content.migrationPlan.merged[0]).toBe("STATUS");
  });

  test("skips the rules that were not selected", async () => {
    const calls = harness({ rules: ["aggregated"] });
    const result = await run({ maxDiagnostics: 3 }, context(), {
      branchStoreAttached: true,
    });
    for (const skipped of [
      calls.queryPlan,
      calls.parity,
      calls.predicates,
      calls.dangling,
    ])
      expect(skipped).not.toHaveBeenCalled();
    expect(calls.granularity.mock.calls[0][3]).toBeUndefined();
    expect(calls.floor.mock.calls[0][2].freshEvidence).toBe(false);
    expect(calls.full.mock.calls[0][0].maxDiagnostics).toBe(3);
    expect(
      result.structuredContent.violations.map((row: Loose) => row.rule),
    ).toEqual([
      "aggregated",
      "granularity",
      "coordinates",
      "origin",
      "entity-context",
      "firmness",
      "policy",
      "floor",
      "claims",
    ]);
  });

  test("reads the analysis cache of the attached store", async () => {
    const calls = harness({ rules: ["aggregated"] });
    await run({}, context({ branchAttachment: ATTACHED as never }));
    expect(calls.granularity.mock.calls[0][3]).toBe("/ws/store");
  });

  test("tells the plan which diagnostics the impact analysis listed", async () => {
    const listed = { id: "I-1" };
    const calls = harness({
      rules: ["aggregated"],
      impact: { impactDiagnostics: [listed] },
    });
    await run({ rules: ["aggregated"] });
    const [input] = calls.actions.mock.calls.at(-1);
    expect(input.impactDiagnostics).toStrictEqual(new Set([listed]));
    expect(input.impactDiagnostics.has(listed)).toBe(true);
    calls.impact.mockResolvedValue(undefined);
    await run({ rules: ["aggregated"] });
    expect(
      Object.hasOwn(calls.actions.mock.calls.at(-1)[0], "impactDiagnostics"),
    ).toBe(false);
  });

  test("keeps impact diagnostics when the rules were chosen", async () => {
    const impactResult = { sourceFiles: ["a.ts"] };
    const calls = harness({
      rules: ["aggregated"],
      impact: impactResult,
      partitionQuality: [{ id: "Q-advisory" }],
      snapshot: false,
    });
    const explicit = await run({ rules: ["aggregated"], sourceFiles: ["a"] });
    expect(explicit.structuredContent.qualityDiagnostics).toStrictEqual([
      { id: "Q-advisory" },
      { id: "Q-impact" },
      { id: "Q-staged" },
    ]);
    expect(calls.scope).not.toHaveBeenCalled();
    const scoped = await run({ sourceFiles: ["a"] });
    expect(calls.scope).toHaveBeenCalledWith(
      [{ id: "Q-advisory" }],
      impactResult,
    );
    expect(scoped.structuredContent.qualityDiagnostics).toStrictEqual([
      { id: "Q-scoped" },
      { id: "Q-impact" },
      { id: "Q-staged" },
    ]);
    const unscoped = await run({});
    expect(unscoped.structuredContent.qualityDiagnostics[0]).toStrictEqual({
      id: "Q-advisory",
    });
    expect(calls.full).not.toHaveBeenCalled();
  });

  test("lists only impact diagnostics for explicit rules without impact", async () => {
    const calls = harness({ rules: ["aggregated"] });
    const result = await run({ rules: ["aggregated"] });
    expect(result.structuredContent.qualityDiagnostics).toStrictEqual([
      { id: "Q-impact" },
      { id: "Q-staged" },
    ]);
    expect(calls.full).not.toHaveBeenCalled();
    await run({ rules: ["aggregated"] }, context(), {
      collectFullQualityDiagnosticsForExplicitRules: true,
    });
    expect(calls.full).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(calls.full.mock.calls[0][0], "maxDiagnostics")).toBe(
      false,
    );
    expect(Object.hasOwn(calls.full.mock.calls[0][0], "proofSnapshot")).toBe(
      true,
    );
  });

  test("leaves the snapshot out of the quality scan when none is clean", async () => {
    const calls = harness({ rules: ["aggregated"], snapshot: false });
    await run({});
    expect(Object.hasOwn(calls.full.mock.calls[0][0], "proofSnapshot")).toBe(
      false,
    );
  });

  test("counts the compared fact pairs of domain contradictions", async () => {
    const counted = async (count: unknown, success = true) => {
      harness({ rules: ["domain-contradictions"] });
      const prolog = prologPort(async () => ({
        success,
        bindings: { Count: count },
      }));
      const result = await run({}, context({ prolog }));
      expect(prolog.queries).toEqual([
        "kb_domain_contradiction_pairs_examined(Count)",
      ]);
      return result.structuredContent.evaluated;
    };
    expect(await counted("0")).toStrictEqual({
      rules: ["domain-contradictions"],
      domainContradictions: { factPairsExamined: 0 },
    });
    expect(await counted(12)).toStrictEqual({
      rules: ["domain-contradictions"],
      domainContradictions: { factPairsExamined: 12 },
    });
    for (const rejected of [-1, 1.5, "x"])
      expect(await counted(rejected)).toStrictEqual({
        rules: ["domain-contradictions"],
      });
    expect(await counted(4, false)).toStrictEqual({
      rules: ["domain-contradictions"],
    });
    harness({ rules: ["domain-contradictions"] });
    const failing = prologPort(async () => {
      throw new Error("unknown procedure");
    });
    expect(
      (await run({}, context({ prolog: failing }))).structuredContent.evaluated,
    ).toStrictEqual({ rules: ["domain-contradictions"] });
  });
});
