import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import {
  SEMANTIC_CLASSIFIER_CAPABILITY_ID,
  defineKibiPlugin,
} from "kibi-plugin-sdk";
import {
  createCapabilityRegistry,
  createStubBuiltinPlugin,
} from "../../src/plugins/index.js";

import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import { compileIntentSpec } from "../../src/public/operations/specs/planning.js";
import { whatIfResult } from "../helpers/what-if.js";

function contextFor(
  query: (goal: string) => Promise<PrologQueryResult>,
): OperationContext {
  const prolog: PrologPort = {
    query,
    queryStatusJson: async () => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "develop",
          snapshotId: "stamp:test",
          syncedAt: "2026-08-13T00:00:00Z",
          dirty: false,
          syncState: "fresh",
        }),
      },
    }),
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-13T00:00:00Z"),
    prolog,
    fs: {
      readFile: async () => "source\n",
      writeFile: async () => undefined,
      mkdir: async () => undefined,
      stat: async () => ({ isFile: () => true, isDirectory: () => false }),
    },
    git: {
      revParse: async () => "develop",
      showToplevel: async () => process.cwd(),
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 3,
      }),
    },
  };
}

describe("kb_compile_intent", () => {
  const originalBranch = process.env.KIBI_BRANCH;

  beforeEach(() => {
    process.env.KIBI_BRANCH = "test-branch";
  });

  afterEach(() => {
    if (originalBranch === undefined) {
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    } else {
      process.env.KIBI_BRANCH = originalBranch;
    }
  });
  test("emits a deterministic strict-property plan for a new requirement", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return { success: true, bindings: { JsonString: "[]" } };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      if (goal.includes("kb_entity('REQ-"))
        return { success: true, bindings: { Results: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });

    const result = await compileIntentSpec.execute(
      { intent: "Customer data must be retained for 7 years.", mode: "create" },
      contextFor(query),
    );
    const plan = result.structuredContent;
    expect(plan.version).toBe("kibi.compile-plan.v1");
    expect(plan.status).toBe("ready");
    expect(plan.target.requirementId).toMatch(
      /^REQ-customer-data-must-be-retained-for-7-years-[A-F0-9]{8}$/,
    );
    expect(plan.propositions).toHaveLength(1);
    expect(plan.propositions[0]?.disposition).toBe("strict_property");
    expect(plan.steps.some((step) => step.type === "fact")).toBe(true);
    expect(plan.steps.some((step) => step.type === "req")).toBe(true);
    expect(plan.planHash).toHaveLength(64);
    expect(plan.planHash).toBe(
      (
        await compileIntentSpec.execute(
          {
            intent: "Customer data must be retained for 7 years.",
            mode: "create",
          },
          contextFor(query),
        )
      ).structuredContent.planHash,
    );
  });

  // executable_for TEST-kibi-entity-id-style
  test("create honors a caller-chosen slug ID instead of a prose hash", async () => {
    const query = mock(
      async (_goal: string): Promise<PrologQueryResult> => ({
        success: true,
        bindings: { Results: "[]", Rows: "[]", Edges: "[]" },
      }),
    );
    const plan = (
      await compileIntentSpec.execute(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          requirementId: "REQ-customer-data-retention",
        },
        contextFor(query),
      )
    ).structuredContent;
    expect(plan.target.requirementId).toBe("REQ-customer-data-retention");
    expect(plan.target.selectionReason).toBe("Caller supplied requirementId.");
    expect(
      plan.steps.some(
        (step) =>
          step.type === "req" && step.id === "REQ-customer-data-retention",
      ),
    ).toBe(true);
  });

  test("fails closed when an update target is ambiguous", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return { success: true, bindings: { JsonString: "[]" } };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return {
        success: true,
        bindings: {
          Results:
            '[[REQ-A,req,[title="Customer retention",status=open]],[REQ-B,req,[title="Customer retention policy",status=open]]]',
        },
      };
    });
    const plan = (
      await compileIntentSpec.execute(
        { intent: "Customer data must be retained.", mode: "update" },
        contextFor(query),
      )
    ).structuredContent;
    expect(plan.status).toBe("needs_resolution");
    expect(
      plan.diagnostics.some((diagnostic) =>
        diagnostic.includes("supply requirementId"),
      ),
    ).toBe(true);
  });

  test("blocks on a what-if contradiction returned as a quoted Prolog string", async () => {
    // Engines bind JsonString to a quoted Prolog string, so the witness list
    // arrives JSON-encoded twice.
    const witnesses = JSON.stringify([
      {
        requirements: ["REQ-RETAIN", "REQ-OTHER"],
        reason:
          "Value conflict on customer_data.retention_days: eq 1 vs eq 365",
        status: "contradiction",
      },
    ]);
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return {
          success: true,
          bindings: { JsonString: JSON.stringify(witnesses) },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await compileIntentSpec.execute(
        {
          intent: "Customer data must be retained for 1 day.",
          mode: "create",
          requirementId: "REQ-RETAIN",
        },
        contextFor(query),
      )
    ).structuredContent;
    expect(plan.contradictionAnalysis.outcome).toBe("conflict");
    expect(plan.status).toBe("blocked");
  });

  test("writes one inventory covering every proposition onto the requirement step", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return { success: true, bindings: { JsonString: "[]" } };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await compileIntentSpec.execute(
        {
          intent:
            "Customer data must be retained for 7 years. Audit logs must be retained for 2 years.",
          mode: "create",
        },
        contextFor(query),
      )
    ).structuredContent;
    const req = plan.steps.find(
      (step) => step.type === "req" && step.id === plan.target.requirementId,
    );
    const inventory = (req?.properties as Record<string, unknown>)
      .semantic_inventory as Array<Record<string, unknown>>;
    expect(inventory.map((entry) => entry.claim_key)).toEqual(
      plan.propositions.map((proposition) => proposition.claimKey),
    );
    expect(inventory.map((entry) => entry.status)).toEqual(
      plan.propositions.map((proposition) => proposition.status),
    );
    expect((req?.properties as Record<string, unknown>).logic_claims).toEqual(
      plan.propositions
        .filter((proposition) => proposition.status !== "nonlogical")
        .map((proposition) => proposition.claimKey),
    );
  });

  test("reports current contradiction witnesses for an explicit update", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify([
              {
                kind: "strict",
                requirements: ["REQ-A", "REQ-B"],
                reason: "retention conflict",
              },
            ]),
          },
        };
      if (goal.includes("kb_entity('REQ-A'"))
        return {
          success: true,
          bindings: { Results: '[[REQ-A,req,[title="Existing",status=open]]]' },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await compileIntentSpec.execute(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-A",
        },
        contextFor(query),
      )
    ).structuredContent;
    expect(plan.status).toBe("blocked");
    expect(plan.contradictionAnalysis.witnesses[0]?.reason).toBe(
      "retention conflict",
    );
    const staged = query.mock.calls
      .map(([goal]) => goal)
      .find((goal) => goal.includes("checks:what_if_analysis_json("));
    expect(staged).toContain("upsert(req, ");
    expect(staged).toContain("'REQ-A'");
  });

  // implements REQ-kibi-truthful-consistency
  test("blocks on any introduced conflict or infeasibility and keeps the before/after split", async () => {
    const unrelatedConflict = {
      kind: "property",
      status: "contradiction",
      requirements: ["REQ-X", "REQ-Y"],
      reason: "Value conflict on quota.remaining: gt 0 vs eq 0",
      left: { factId: "FACT-X" },
      right: { factId: "FACT-Y" },
    };
    const infeasible = {
      kind: "scenario_feasibility",
      status: "infeasible",
      requirements: ["REQ-QUOTA"],
      scenario: "SCEN-ZERO",
      assumedFact: "FACT-ZERO",
      requirementFact: "FACT-POSITIVE",
      reason: "Scenario SCEN-ZERO expects success but assumes FACT-ZERO",
    };
    const preExisting = {
      kind: "rule",
      status: "contradiction",
      requirements: ["REQ-OLD-A", "REQ-OLD-B"],
      reason: "pre-existing",
    };
    const resolved = {
      kind: "property",
      status: "contradiction",
      requirements: ["REQ-GONE-A", "REQ-GONE-B"],
      reason: "resolved by the plan",
    };
    const analysis = whatIfResult({
      introduced: [unrelatedConflict, infeasible],
      unchanged: [preExisting],
      removed: [resolved],
    });
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json(")) return analysis;
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await compileIntentSpec.execute(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          requirementId: "REQ-RETAIN",
        },
        contextFor(query),
      )
    ).structuredContent;
    const analysisOut = plan.contradictionAnalysis;
    expect(analysisOut.outcome).toBe("conflict");
    expect(plan.status).toBe("blocked");
    // Witnesses that do not name the target still block, with full detail.
    expect(analysisOut.witnesses.map((witness) => witness.kind)).toEqual([
      "property",
      "scenario_feasibility",
    ]);
    expect(analysisOut.witnesses[1]).toMatchObject({
      scenario: "SCEN-ZERO",
      assumedFact: "FACT-ZERO",
      requirementFact: "FACT-POSITIVE",
    });
    expect(analysisOut.witnesses[0]?.left).toEqual({ factId: "FACT-X" });
    expect(analysisOut.introduced).toHaveLength(2);
    expect(analysisOut.unchanged?.[0]?.reason).toBe("pre-existing");
    expect(analysisOut.removed?.[0]?.reason).toBe("resolved by the plan");
  });

  test("ignores pre-existing conflicts that do not name the target requirement", async () => {
    const analysis = whatIfResult({
      unchanged: [
        {
          kind: "property",
          status: "contradiction",
          requirements: ["REQ-OLD-A", "REQ-OLD-B"],
          reason: "pre-existing",
        },
      ],
    });
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json(")) return analysis;
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await compileIntentSpec.execute(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "create",
          requirementId: "REQ-RETAIN",
        },
        contextFor(query),
      )
    ).structuredContent;
    expect(plan.contradictionAnalysis.outcome).toBe("no_conflict");
    expect(plan.contradictionAnalysis.witnesses).toEqual([]);
    expect(plan.contradictionAnalysis.unchanged).toHaveLength(1);
  });

  test("keeps unresolved rule overlap out of no_conflict", async () => {
    const query = mock(async (goal: string): Promise<PrologQueryResult> => {
      if (goal.includes("checks:what_if_analysis_json("))
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify([
              {
                kind: "rule",
                status: "unresolved",
                requirements: ["REQ-A", "REQ-B"],
                reason: "Rule conflict (unresolved) between REQ-A and REQ-B",
              },
            ]),
          },
        };
      if (goal.includes("kb_entity('REQ-A'"))
        return {
          success: true,
          bindings: { Results: '[[REQ-A,req,[title="Existing",status=open]]]' },
        };
      if (goal.includes("kb_relationship"))
        return { success: true, bindings: { Edges: "[]" } };
      return { success: true, bindings: { Results: "[]" } };
    });
    const plan = (
      await compileIntentSpec.execute(
        {
          intent: "Customer data must be retained for 7 years.",
          mode: "update",
          requirementId: "REQ-A",
        },
        contextFor(query),
      )
    ).structuredContent;
    expect(plan.contradictionAnalysis.outcome).toBe("unresolved");
    expect(plan.status).not.toBe("ready");
  });

  test("exposes bounded plugin provenance without raw provider payloads", async () => {
    const calls: string[] = [];
    const registry = createCapabilityRegistry({
      workspaceRoot: process.cwd(),
      builtinFactory: () => createStubBuiltinPlugin(),
      projectConfig: {
        plugins: [
          {
            package: "example-capability-plugin",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "augment" },
            },
          },
          {
            package: "example-shadow-plugin",
            capabilities: {
              [SEMANTIC_CLASSIFIER_CAPABILITY_ID]: { mode: "shadow" },
            },
          },
        ],
      },
      loadPlugin: async (_root, packageName) => ({
        packageName,
        plugin: defineKibiPlugin({
          apiVersion: "kibi.plugin.v1",
          id: packageName,
          version: "1.2.3",
          permissions: {
            network: packageName.includes("shadow"),
            metered: false,
            secrets: [],
          },
          capabilities: {
            semanticClassifier: {
              id: `${packageName}.classifier`,
              model: packageName.includes("shadow")
                ? "shadow-model"
                : "example-model",
              classify: (input) => {
                calls.push(packageName);
                return {
                  decisions: input.propositions.map((proposition) => ({
                    claimKey: proposition.claimKey,
                    lane: packageName.includes("shadow")
                      ? ("rule" as const)
                      : ("observation_review" as const),
                    confidence: 0.4,
                  })),
                };
              },
            },
          },
        }),
        resolved: {
          packageName,
          packageRoot: `/tmp/${packageName}`,
          packageJsonPath: `/tmp/${packageName}/package.json`,
          packageJson: { name: packageName, version: "1.2.3" },
          entryPath: `/tmp/${packageName}/index.js`,
          entryUrl: `file:///tmp/${packageName}/index.js`,
        },
      }),
    });
    const query = mock(
      async (): Promise<PrologQueryResult> => ({
        success: true,
        bindings: { Results: "[]", Rows: "[]", Edges: "[]" },
      }),
    );
    const plan = (
      await compileIntentSpec.execute(
        {
          intent:
            "Operators should feel that the workspace is pleasantly fast.",
          mode: "create",
        },
        {
          ...contextFor(query),
          ensurePlugins: async () => registry,
        },
      )
    ).structuredContent;
    const plugins = plan.capabilityPlugins;
    expect(plugins).toBeDefined();
    const external = plugins?.stamps.find(
      (stamp) => stamp.pluginId === "example-capability-plugin",
    );
    const shadow = plugins?.classification?.shadowComparisons.find(
      (comparison) => comparison.pluginId === "example-shadow-plugin",
    );
    expect(external).toMatchObject({
      pluginVersion: "1.2.3",
      capability: SEMANTIC_CLASSIFIER_CAPABILITY_ID,
      mode: "augment",
      external: true,
      network: false,
      metered: false,
      model: "example-model",
    });
    expect(shadow).toMatchObject({
      pluginVersion: "1.2.3",
      mode: "shadow",
      model: "shadow-model",
      network: true,
    });
    expect(calls).toEqual([
      "example-capability-plugin",
      "example-shadow-plugin",
    ]);
    const canonicalLane = plugins?.classification?.decisions.find(
      (decision) => decision.lane === "rule",
    );
    expect(canonicalLane).toBeUndefined();
    expect(JSON.stringify(plugins)).not.toContain("sk-");
  });
});
