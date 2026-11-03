import { afterAll, describe, expect, test } from "bun:test";
import path from "node:path";
import {
  executePlanBootstrap,
  selectBootstrapCandidates,
} from "../../../src/operations/bootstrap/generate.js";
import {
  nodeFilesystem,
  nodeGit,
} from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import {
  createSeededRepo,
  setupWorkspace,
} from "../../operations/bootstrap-workspace-fixture.js";

const workspace = setupWorkspace();
createSeededRepo(workspace.root);
afterAll(() => workspace.cleanup());

const REQ = "REQ-AUTO-7542082B20BC8384";

function seededContext(ids: readonly string[]): OperationContext {
  const answer = (bindings: Record<string, string>) => ({
    success: true,
    bindings,
  });
  return {
    workspaceRoot: workspace.root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-08-20T00:00:00Z"),
    fs: nodeFilesystem,
    git: {
      ...nodeGit,
      workspaceSnapshot: async () => ({
        version: "kibi.workspace-snapshot.v2",
        hash: "a".repeat(64),
        dirty: false,
        fileCount: 1,
      }),
    },
    branchAttachment: {
      gitBranch: "main",
      kbBranch: "main",
      storePath: path.join(workspace.root, ".kb", "branches", "main"),
      kind: "exact",
      migrationRequired: false,
    },
    prolog: {
      oneShotMode: true,
      query: async (goal: string) => {
        if (goal.includes("coverage_report_json"))
          return answer({
            JsonString: JSON.stringify({
              rows: [
                { type: "req", count: 2 },
                { type: "fact", count: 4 },
              ],
            }),
          });
        if (goal === "kb_entity_ids(Ids)")
          return answer({
            Ids: `[${["REQ-old", ...ids].map((id) => `'${id}'`).join(",")}]`,
          });
        if (goal.includes("kb:current_req(R), Ids"))
          return answer({ Ids: "['REQ-old','REQ-prose']" });
        if (goal.startsWith("findall([R,M]"))
          return answer({ Rows: "[['REQ-old',modeled]]" });
        if (goal.startsWith("findall([Id,Type,Row]"))
          return answer({
            Results:
              '[[\'REQ-old\',req,[title="Old",semantic_text="Sessions must expire after 30 minutes."]],[\'REQ-prose\',req,[title="Prose",semantic_text="Exports are fast."]]]',
          });
        return { success: false, bindings: {}, error: `unexpected ${goal}` };
      },
    },
  } as unknown as OperationContext;
}

const bootstrapContext = {
  knowledgeSources: [
    {
      id: "handover",
      kind: "specification",
      title: "Handover",
      locator: "https://example.com/h",
      authority: "authoritative",
      component: "reports",
    },
  ],
  intentClaims: [
    {
      statement: "Logs must be retained for 7 days.",
      sourceId: "handover",
      reference: "H-1",
      excerpt: "kept a week",
    },
    {
      statement: "Should exports be faster?",
      sourceId: "handover",
      reference: "H-2",
      excerpt: "exports feel slow",
    },
  ],
};

describe("bootstrap plan on a seeded KB with declared claims", () => {
  test("plans the declared claims only and leaves the plan applicable", async () => {
    const result = await executePlanBootstrap(
      { bootstrapContext } as never,
      seededContext([]),
    );
    const plan = result.structuredContent.plan;
    expect(plan.activation.activationMode).toBe("attached_seeded_handoff");
    expect(plan.activation.applyBlocked).toBe(false);
    expect(
      plan.candidates.map((candidate) => candidate.candidateId),
    ).toStrictEqual([`claim:handover:${REQ.toLowerCase()}`]);
    expect(result.structuredContent.promptBlock).toContain(
      "- Seeded KB: only declared intent claims are planned; use kb_search or kb_query for existing knowledge.",
    );
  });

  test("hands off to compile when no declared claim can be planned", async () => {
    const result = await executePlanBootstrap(
      { bootstrapContext } as never,
      seededContext([REQ]),
    );
    expect(result.structuredContent.plan.candidates).toStrictEqual([]);
    expect(
      (
        result.structuredContent.recommendedActions as { description: string }[]
      ).map((action) => action.description),
    ).toContain(
      "No declared intent claim could be planned. Claims already in the KB need nothing; compile each remaining claim with kb_compile_intent, citing its source and reference (see the Knowledge source diagnostics).",
    );
  });

  test("reads no requirement texts when no claim is declared", async () => {
    const result = await executePlanBootstrap({} as never, seededContext([]));
    expect(result.structuredContent.plan.activation.applyBlocked).toBe(true);
  });
});

describe("selectBootstrapCandidates", () => {
  test("reads a write's id from its properties when it has no top-level id", () => {
    const candidate = (candidateId: string, title: string) => ({
      candidateId,
      entityType: "fact",
      title,
      sourceKind: "intent_claim",
      sourcePath: `${candidateId}.md`,
      confidence: 1,
      confidenceBand: "high",
      evidence: [],
      relationships: [],
      // The upsert's properties override its id, so a non-string top-level
      // id still writes the id named in the properties.
      applyPlan: [
        {
          id: 1,
          type: "fact",
          properties: { id: "FACT-shared", title, status: "active" },
        },
      ],
    });
    const result = selectBootstrapCandidates(
      [candidate("c1", "one"), candidate("c2", "two")],
      new Set(),
      undefined,
      10,
    );
    expect(result.candidates.map((row) => row.candidateId)).toStrictEqual([
      "c1",
    ]);
    expect(result.suppressed).toStrictEqual([
      {
        candidateId: "c2",
        reason: "duplicate_entity",
        sourcePath: "c2.md",
        entityType: "fact",
        message:
          "Entity FACT-shared is already written by another candidate with different content.",
      },
    ]);
  });
});
