import { describe, expect, mock, test } from "bun:test";
import { getSpec } from "kibi-cli/operations";

import { handleKbCoverage } from "../../src/tools/coverage.js";
import { handleKbFindGaps } from "../../src/tools/find-gaps.js";
import { handleKbGraph } from "../../src/tools/graph.js";

function fakeProlog(payload: Readonly<Record<string, unknown>>) {
  return {
    query: mock(async (_goal: string) => ({
      success: true,
      bindings: { JsonString: JSON.stringify(payload) },
    })),
  };
}

function context(prolog: ReturnType<typeof fakeProlog>) {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date(0),
    branchAttachment: {
      gitBranch: "reporting-adapter-test",
      kbBranch: "reporting-adapter-test",
      storePath: ".kb/branches/reporting-adapter-test",
      kind: "explicit_override",
      migrationRequired: false,
    },
    prolog: {
      query: (goal: string) => prolog.query(goal),
      oneShotMode: typeof (globalThis as { Bun?: unknown }).Bun !== "undefined",
      nextSolution: async () => null,
      save: () => prolog.query("kb_save"),
    },
  };
}

describe("MCP reporting thin adapters", () => {
  test("find-gaps delegates to the shared executor", async () => {
    const prolog = fakeProlog({ rows: [{ id: "REQ-001" }], count: 1 });
    const input = { type: "req", missingRelationships: ["verified_by"] };

    const shared = await getSpec("kb_find_gaps").execute(
      input,
      context(prolog),
    );
    const adapted = await handleKbFindGaps(prolog, input);

    expect(JSON.stringify(adapted)).toBe(JSON.stringify(shared));
  });

  test("coverage delegates to the shared executor", async () => {
    const prolog = fakeProlog({
      summary: { total: 1, fullyCovered: 0 },
      rows: [],
    });
    const input = { includePassing: true, includeTransitive: false };

    const shared = await getSpec("kb_coverage").execute(input, context(prolog));
    const adapted = await handleKbCoverage(prolog, input, context(prolog));

    expect(JSON.stringify(adapted)).toBe(JSON.stringify(shared));
  });

  test("graph delegates to the shared executor", async () => {
    const prolog = fakeProlog({ nodes: [], edges: [], truncated: false });
    const input = { seedIds: ["REQ-001"], maxNodes: 10, maxEdges: 20 };

    const shared = await getSpec("kb_graph").execute(input, context(prolog));
    const adapted = await handleKbGraph(prolog, input);

    expect(JSON.stringify(adapted)).toBe(JSON.stringify(shared));
  });
});
