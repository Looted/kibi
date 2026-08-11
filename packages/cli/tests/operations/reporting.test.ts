import { describe, expect, mock, test } from "bun:test";

import type {
  OperationContext,
  PrologPort,
} from "../../src/public/operations/runtime-types.js";
import {
  coverageSpec,
  findGapsSpec,
  graphSpec,
} from "../../src/public/operations/specs/reporting.js";

function contextWithPayload(payload: Readonly<Record<string, unknown>>): {
  readonly context: OperationContext;
  readonly query: ReturnType<typeof mock>;
} {
  const query = mock(async () => ({
    success: true,
    bindings: { JsonString: JSON.stringify(payload) },
  }));
  const prolog: PrologPort = {
    query,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    context: {
      workspaceRoot: process.cwd(),
      signal: new AbortController().signal,
      clock: () => new Date(0),
      prolog,
      git: {
        revParse: async () => "main",
        showToplevel: async () => process.cwd(),
        workspaceSnapshot: async () => ({
          version: "kibi.workspace-snapshot.v1",
          hash: "a".repeat(64),
          dirty: true,
          fileCount: 42,
        }),
      },
    },
    query,
  };
}

describe("shared reporting operation executors", () => {
  test("findGapsSpec.execute applies pagination defaults and returns rows", async () => {
    const { context, query } = contextWithPayload({
      rows: [{ id: "REQ-001" }],
      count: 1,
    });

    const result = await findGapsSpec.execute(
      { type: "req", missingRelationships: ["specified_by"] },
      context,
    );

    expect(result.structuredContent?.count).toBe(1);
    expect(result.content[0]?.text).toContain("REQ-001");
    expect(String(query.mock.calls[0]?.[0])).toContain(
      "find_gaps_json('req', ['specified_by'], [], [], none, 100, 0, JsonString)",
    );
  });

  test("coverageSpec.execute preserves passing and transitive defaults", async () => {
    const { context, query } = contextWithPayload({
      summary: { total: 2, fullyCovered: 1, proofProven: 0 },
      rows: [],
    });

    const result = await coverageSpec.execute({}, context);

    expect(result.content[0]?.text).toBe(
      "Coverage summary: 1 structurally covered and 0 proven out of 2.",
    );
    expect(String(query.mock.calls[0]?.[0])).toContain(
      `coverage_report_json('req', [], false, true, 100, 0, '${"a".repeat(64)}', '1970-01-01T00:00:00.000Z', 604800, JsonString)`,
    );
    expect(result.structuredContent?.meta).toMatchObject({
      verificationReceiptMaxAgeSeconds: 604800,
      verificationSnapshot: "a".repeat(64),
      verificationSnapshotAvailable: true,
      verificationSnapshotDirty: true,
      verificationSnapshotFileCount: 42,
      verificationSnapshotVersion: "kibi.workspace-snapshot.v1",
    });
  });

  test("coverageSpec.execute refuses to turn an unavailable snapshot into proof", async () => {
    const { context, query } = contextWithPayload({
      summary: { total: 1, fullyCovered: 1, proofProven: 0 },
      rows: [],
    });
    const withoutSnapshot = { ...context, git: undefined };

    const result = await coverageSpec.execute({}, withoutSnapshot);

    expect(String(query.mock.calls[0]?.[0])).toContain(
      "100, 0, 'unknown', '1970-01-01T00:00:00.000Z', 604800, JsonString)",
    );
    expect(result.structuredContent?.meta).toMatchObject({
      verificationSnapshot: "unknown",
      verificationSnapshotAvailable: false,
      verificationSnapshotError:
        "The active operation runtime does not expose workspace snapshots.",
    });
  });

  test("coverageSpec.execute attaches a deterministic read-only repair plan", async () => {
    const { context } = contextWithPayload({
      summary: {
        total: 1,
        fullyCovered: 0,
        proofProven: 0,
        proofMissing: 1,
        proofUnresolved: 0,
      },
      rows: [
        {
          id: "REQ-PLAN-001",
          proofStatus: "missing",
          proofGaps: ["missing_logic_claims", "missing_semantic_inventory"],
          proofRepairs: [
            {
              gap: "missing_semantic_inventory",
              priority: 10,
              stage: "semantic_inventory",
              action: "Analyze prose.",
            },
            {
              gap: "missing_logic_claims",
              priority: 30,
              stage: "logic_grounding",
              action: "Persist claims.",
            },
          ],
          proofStages: {
            semanticInventory: { status: "missing" },
            logicGrounding: { status: "blocked" },
          },
        },
      ],
    });

    const first = await coverageSpec.execute({}, context);
    const second = await coverageSpec.execute({}, context);

    expect(first.structuredContent?.repairPlan).toMatchObject({
      version: "kibi.repair-plan.v1",
      readOnly: true,
      status: "ready",
      codeSnapshot: "a".repeat(64),
      scope: { complete: true },
      summary: { requirementCount: 1, repairCount: 2, batchCount: 2 },
    });
    expect(first.structuredContent?.repairPlan?.batches[0]?.phase).toBe(
      "semantic_inventory",
    );
    expect(first.structuredContent?.repairPlan?.batches[1]).toMatchObject({
      phase: "manifest_links",
      state: "blocked",
      dependsOn: [first.structuredContent?.repairPlan?.batches[0]?.id],
    });
    expect(second.structuredContent?.repairPlan?.planId).toBe(
      first.structuredContent?.repairPlan?.planId,
    );
  });

  test("graphSpec.execute preserves traversal defaults and explicit bounds", async () => {
    const { context, query } = contextWithPayload({
      nodes: [{ id: "REQ-001" }],
      edges: [],
      truncated: false,
    });

    const result = await graphSpec.execute(
      { seedIds: ["REQ-001"], depth: 5, maxNodes: 40, maxEdges: 80 },
      context,
    );

    expect(result.content[0]?.text).toContain("1 nodes and 0 edges");
    expect(String(query.mock.calls[0]?.[0])).toContain(
      "graph_expand_json(['REQ-001'], [], 'outgoing', 5, [], 40, 80, JsonString)",
    );
  });

  test("graphSpec.execute rejects traversal depth above five", async () => {
    const { context } = contextWithPayload({
      nodes: [],
      edges: [],
      truncated: false,
    });

    await expect(
      graphSpec.execute({ seedIds: ["REQ-001"], depth: 6 }, context),
    ).rejects.toThrow("Graph depth must be between 1 and 5");
  });
});
