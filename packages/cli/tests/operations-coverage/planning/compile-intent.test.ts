import { describe, expect, spyOn, test } from "bun:test";
import {
  compileGroundingPlan,
  executeCompileIntent,
} from "../../../src/operations/planning/compile-intent.js";
import * as orchestration from "../../../src/operations/semantic-advisor/plugin-orchestration.js";
import * as discoveryExecutors from "../../../src/public/operations/discovery-executors.js";
import type { PrologQueryResult } from "../../../src/public/operations/runtime-types.js";
import { isWhatIfGoal, whatIfResult } from "../../helpers/what-if.js";
import { cleanUpAfterEach, ctx, spies } from "./fixtures.js";

cleanUpAfterEach();

const status = (structuredContent: unknown) =>
  spies.push(
    spyOn(discoveryExecutors, "executeStatus").mockResolvedValue({
      content: [],
      structuredContent,
    } as never),
  );
const developStatus = {
  branch: "develop",
  snapshotId: "missing",
  syncedAt: null,
  dirty: false,
  syncState: "unknown",
};

const factStep = {
  type: "fact",
  id: "FACT-limit",
  properties: { title: "Limit", status: "active" },
  relationships: [],
};
const linkStep = {
  type: "req",
  id: "REQ-ground",
  properties: {},
  relationships: [
    { type: "constrained_by", from: "REQ-ground", to: "FACT-limit" },
  ],
};
const grounding = (steps: unknown[]) => ({
  requirementId: "REQ-ground",
  claimKey: "c1",
  text: "Limits hold.",
  steps: steps as never,
});

describe("compileGroundingPlan", () => {
  test("plans the fact write and the linking upsert", async () => {
    status(developStatus);
    const context = ctx();
    const plan = await compileGroundingPlan(
      context,
      context.prolog as never,
      grounding([factStep, linkStep]),
    );
    expect(plan.status).toBe("ready");
    expect(plan.target).toStrictEqual({
      mode: "update",
      requirementId: "REQ-ground",
      selectionReason:
        "kb_model mode predicates grounds claim c1 of the supplied requirementId.",
    });
    expect(plan.propositions[0]?.span).toStrictEqual({ start: 0, end: 12 });
    expect(plan.steps[0]?.document).toStrictEqual({
      path: ".kb/facts/FACT-limit.md",
    });
    expect(plan.steps[1]).toStrictEqual(linkStep);
    expect(plan.expected.workspaceSnapshot).toBe("unknown");
  });

  test("blocks a plan the what-if analysis finds contradictory", async () => {
    status(developStatus);
    const context = ctx({
      answer: (goal) =>
        isWhatIfGoal(goal)
          ? whatIfResult({
              introduced: [{ requirements: ["REQ-ground"], reason: "clash" }],
            })
          : undefined,
    });
    const plan = await compileGroundingPlan(
      context,
      context.prolog as never,
      grounding([factStep, linkStep]),
    );
    expect(plan.status).toBe("blocked");
    expect(plan.steps).toStrictEqual([factStep, linkStep]);
  });

  test("needs resolution when a step cannot be applied as written", async () => {
    status(developStatus);
    const context = ctx();
    const plan = await compileGroundingPlan(
      context,
      context.prolog as never,
      grounding([{ ...factStep, properties: { title: "No status" } }]),
    );
    expect(plan.status).toBe("needs_resolution");
    expect(plan.diagnostics[0]).toStartWith(
      "A plan step cannot be applied as written: Entity validation failed",
    );
  });

  test("fails without a status payload", async () => {
    status(undefined);
    const context = ctx();
    await expect(
      compileGroundingPlan(
        context,
        context.prolog as never,
        grounding([factStep]),
      ),
    ).rejects.toThrow(
      "Grounding plan failed: status query returned no payload",
    );
  });
});

const quiet = (goal: string): PrologQueryResult | undefined => {
  if (isWhatIfGoal(goal))
    return { success: true, bindings: { JsonString: "[]" } };
  if (goal.startsWith("findall([R,M]"))
    return { success: true, bindings: { Rows: "[['REQ-other',unmodeled]]" } };
  if (goal.startsWith("findall([Id,Type,Row]"))
    return {
      success: true,
      bindings: {
        Results:
          '[[\'REQ-other\',req,[title="Other",semantic_text="Exports run nightly."]]]',
      },
    };
  if (goal.includes("kb_relationship"))
    return { success: true, bindings: { Edges: "[]" } };
  return undefined;
};

const compile = (args: Record<string, unknown>) => {
  status(developStatus);
  return executeCompileIntent(
    {
      intent: "Exports must finish within 5 minutes.",
      mode: "create",
      requirementId: "REQ-export-time",
      context: "Operations asked for a bound so the nightly window holds.",
      ...args,
    } as never,
    ctx({ answer: quiet }),
  );
};

describe("executeCompileIntent drafts and reviews", () => {
  test("reports duplicate draft ids and an empty scenario list", async () => {
    const { diagnostics } = (
      await compile({
        scenarioDrafts: [
          { id: "SCEN-a", title: "A", body: "a" },
          { id: "SCEN-a", title: "A again", body: "a" },
        ],
        testDrafts: [
          { id: "TEST-a", title: "T", body: "t", scenarioIds: [""] },
          {
            id: "TEST-a",
            title: "T again",
            body: "t",
            scenarioIds: ["SCEN-a"],
          },
        ],
      })
    ).structuredContent;
    expect(diagnostics).toContain(
      "unresolved duplicate scenario draft ID SCEN-a; scenario associations are ambiguous.",
    );
    expect(diagnostics).toContain(
      "unresolved duplicate test draft ID TEST-a; test associations are ambiguous.",
    );
    expect(diagnostics).toContain(
      "unresolved test draft TEST-a must reference at least one scenario ID in scenarioIds.",
    );
  });

  test("applies review verdicts on requirements discovery did not rank", async () => {
    const plan = (
      await compile({
        conflictReviews: [
          { requirementId: "", verdict: "conflict" },
          { requirementId: "REQ-export-time", verdict: "conflict" },
          { requirementId: "REQ-gone", verdict: "no_conflict" },
          {
            requirementId: "REQ-other",
            verdict: "conflict",
            note: "same window",
          },
        ],
      })
    ).structuredContent;
    expect(plan.diagnostics).toContain(
      "conflictReviews names REQ-export-time, which is not a current requirement other than the target; its verdict was ignored.",
    );
    expect(plan.diagnostics).toContain(
      "conflictReviews names REQ-gone, which is not a current requirement other than the target; its verdict was ignored.",
    );
    expect(plan.diagnostics).toContain(
      "By your review the intent contradicts current requirement REQ-other: ask the human which rule holds, then supersede or change the conflicting requirement, or change the intent, before applying this plan.",
    );
    expect(plan.contradictionAnalysis.outcome).toBe("conflict");
    expect(plan.status).toBe("blocked");
  });

  test("reports ontology shadow matches without changing the plan", async () => {
    const real = orchestration.analyzeSemanticAdvisorInputWithPlugins;
    spies.push(
      spyOn(
        orchestration,
        "analyzeSemanticAdvisorInputWithPlugins",
      ).mockImplementation(async (...args) => ({
        ...(await real(...args)),
        ontologyShadowMatches: [
          {
            packId: "pack",
            schemaId: "schema",
            predicateName: "finishes_within",
            confidence: 0.7,
          } as never,
        ],
      })),
    );
    const plan = (await compile({})).structuredContent;
    expect(plan.diagnostics).toContain(
      "Ontology pack shadow matches observed (1); canonical compile plan unchanged.",
    );
    expect(JSON.stringify(plan)).toContain(
      '"shadowMatches":[{"packId":"pack","schemaId":"schema","predicateName":"finishes_within","confidence":0.7}]',
    );
  });
});
