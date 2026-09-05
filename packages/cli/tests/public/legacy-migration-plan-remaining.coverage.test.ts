// implements REQ-kibi-legacy-migration-preview-v2
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as loader from "../../src/operations/modeling/predicate-loader.js";
import * as analyzeProse from "../../src/operations/semantic-advisor/analyze-prose.js";
import * as discoveryEntities from "../../src/public/operations/discovery-entities.js";
import {
  buildLegacyMigrationPlan,
  buildLegacyMigrationPlanFromContext,
} from "../../src/public/operations/legacy-migration-plan.js";
import { buildRepairPlan } from "../../src/public/operations/repair-plan.js";
import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
import * as searchRanking from "../../src/search-ranking.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const spies: Array<{ mockRestore: () => void }> = [];
const restores: Array<() => void> = [];

afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
  for (const restore of restores.splice(0)) restore();
  if (process.exitCode === 1) process.exitCode = 0;
});

function repairPlan(requirementIds: readonly string[]) {
  const plan = buildRepairPlan(
    {
      summary: {
        proofMissing: requirementIds.length,
        proofUnresolved: 0,
      },
      rows: requirementIds.map((id) => ({
        id,
        proofGaps: ["missing_semantic_inventory", "missing_logic_grounding"],
        proofRepairs: [
          {
            gap: "missing_semantic_inventory",
            priority: 10,
            stage: "semantic_inventory",
            action: "Reconstruct the proposition inventory.",
          },
          {
            gap: "missing_logic_grounding",
            priority: 30,
            stage: "logic_grounding",
            action: "Review exact ground candidates.",
          },
        ],
      })),
    },
    { by: "req", limit: 100, offset: 0 },
    "a".repeat(64),
  );
  if (!plan) throw new Error("Expected requirement repair plan");
  return plan;
}

describe("legacy-migration-plan remaining disposition, offset, and context branches", () => {
  test("blocks a missing requirement and an offset past the candidate window", async () => {
    restores.push(isolateKibiEnv());
    const plan = repairPlan(["REQ-ABSENT"]);
    const missing = await buildLegacyMigrationPlan(
      plan,
      {},
      "b".repeat(64),
      {
        requirements: [{ id: 12, title: "not a string id" }],
        projectPredicateSchemas: [],
        readSource: async () => "unused",
      },
    );
    expect(missing.batches[0]?.state).toBe("blocked");
    expect(missing.batches[0]?.diagnostics[0]).toMatch(
      /absent from exact KB query results/,
    );

    const offset = await buildLegacyMigrationPlan(
      plan,
      { migrationOffset: 8 },
      "c".repeat(64),
      {
        requirements: [],
        projectPredicateSchemas: [],
        readSource: async () => null,
      },
    );
    expect(offset.diagnostics.join(" ")).toMatch(
      /Migration offset 8 is beyond 1 ready/,
    );
  });

  test("classifies rule and unresolved-ambiguity dispositions", async () => {
    restores.push(isolateKibiEnv());
    const original = analyzeProse.analyzeSemanticAdvisorInput;
    const analyze = spyOn(
      analyzeProse,
      "analyzeSemanticAdvisorInput",
    ).mockImplementation((input) => {
      const result = original(input);
      const first = result.receipt.propositions[0];
      if (!first) return result;
      return {
        ...result,
        receipt: {
          ...result.receipt,
          suggestions: [
            ...result.receipt.suggestions.filter(
              (suggestion) => suggestion.claim_key !== first.claim_key,
            ),
            {
              kind: "rule",
              claim_key: first.claim_key,
              claim_text: first.claim_text,
              confidence: 0.9,
              evidence: first.claim_text,
              rationale: "typed rule",
              suggested_next_tool: "kb_model_requirement",
              rule: {
                version: "kibi.logic.v1",
                kind: "rule",
                modality: "oblige",
              },
              semantic_key: "retain/1",
              rendered_prolog: "retain(X).",
              rejected_alternatives: [],
              applyPlan: [],
              relationshipPlan: null,
            },
          ],
        },
      };
    });
    spies.push(analyze);
    const ruled = await buildLegacyMigrationPlan(
      repairPlan(["REQ-RULE-LANE"]),
      { migrationPredicateMinScore: 1 },
      "d".repeat(64),
      {
        requirements: [
          {
            id: "REQ-RULE-LANE",
            title: "Rule lane",
            status: "open",
            source: "docs/REQ-RULE-LANE.md",
          },
        ],
        projectPredicateSchemas: [],
        readSource: async () =>
          "If a customer is active, the service must retain the account.",
      },
    );
    expect(
      ruled.batches[0]?.propositions.some(
        (proposition) => proposition.disposition === "rule_candidate",
      ),
    ).toBe(true);
    analyze.mockRestore();

    const ambiguous = await buildLegacyMigrationPlan(
      repairPlan(["REQ-AMBIG"]),
      { migrationPredicateMinScore: 1 },
      "e".repeat(64),
      {
        requirements: [
          {
            id: "REQ-AMBIG",
            title: "Ambiguous sessions",
            status: "open",
            source: "docs/REQ-AMBIG.md",
          },
        ],
        projectPredicateSchemas: [],
        readSource: async () => "3 active sessions are allowed.",
      },
    );
    expect(
      ambiguous.batches[0]?.propositions.some(
        (proposition) =>
          proposition.disposition === "unresolved_ambiguity",
      ),
    ).toBe(true);
  });

  test("buildLegacyMigrationPlanFromContext loads entities and authored markdown", async () => {
    restores.push(isolateKibiEnv());
    const entities = spyOn(discoveryEntities, "loadEntities").mockResolvedValue([
      {
        id: "REQ-CTX",
        title: "From context",
        status: "open",
        source: "docs/REQ-CTX.md",
      },
    ]);
    spies.push(entities);
    const schemas = spyOn(
      loader,
      "loadExistingPredicateSchemas",
    ).mockResolvedValue([]);
    spies.push(schemas);
    const markdown = spyOn(searchRanking, "loadMarkdownBody").mockResolvedValue(
      "The source binding guard must preserve text_ref evidence.",
    );
    spies.push(markdown);
    const prolog: PrologPort = {
      query: async () => ({ success: true, bindings: {} }),
      nextSolution: async () => null,
      save: async () => ({ success: true, bindings: {} }),
    };
    const context: OperationContext = {
      workspaceRoot: process.cwd(),
      signal: new AbortController().signal,
      clock: () => new Date(0),
      prolog,
    };
    const plan = await buildLegacyMigrationPlanFromContext(
      repairPlan(["REQ-CTX"]),
      { migrationPredicateMinScore: 0 },
      "f".repeat(64),
      context,
    );
    expect(entities).toHaveBeenCalled();
    expect(markdown).toHaveBeenCalled();
    expect(plan.batches[0]?.requirementId).toBe("REQ-CTX");

    await expect(
      buildLegacyMigrationPlanFromContext(
        repairPlan(["REQ-CTX"]),
        {},
        "g".repeat(64),
        { ...context, prolog: undefined },
      ),
    ).rejects.toThrow("Legacy migration planning requires a Prolog context");
  });
});
