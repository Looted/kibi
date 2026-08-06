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
      summary: { total: 2, fullyCovered: 1 },
      rows: [],
    });

    const result = await coverageSpec.execute({}, context);

    expect(result.content[0]?.text).toBe(
      "Coverage summary: 1 fully covered out of 2.",
    );
    expect(String(query.mock.calls[0]?.[0])).toContain(
      "coverage_report_json('req', [], false, true, 100, 0, JsonString)",
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
