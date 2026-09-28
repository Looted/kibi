import { describe, expect, test } from "bun:test";
import {
  ENTITY_QUERY_CHUNK_SIZE,
  listSearchCandidates,
  loadEntityIds,
  loadSearchCandidates,
  queryEntitiesViaQuery,
  queryEntityChunks,
  reloadFullEntities,
} from "../../../src/public/operations/discovery-entities.js";
import type { PrologEntityQueryInput } from "../../../src/public/operations/runtime-types.js";

// Bulk discovery reads must never ask Prolog for an unbounded answer: full
// entities carry receipt histories that exceed the engine's output cap.

function recordingPort(respond: (goal: string) => Record<string, string>): {
  port: {
    query: (
      goal: string,
    ) => Promise<{ success: true; bindings: Record<string, string> }>;
  };
  goals: string[];
} {
  const goals: string[] = [];
  return {
    goals,
    port: {
      query: async (goal: string) => {
        goals.push(goal);
        return { success: true, bindings: respond(goal) };
      },
    },
  };
}

describe("queryEntityChunks", () => {
  test("splits a large page into bounded chunks and keeps the total count", async () => {
    const requests: PrologEntityQueryInput[] = [];
    const result = await queryEntityChunks(
      async (chunk) => {
        requests.push(chunk);
        return {
          entities: Array.from({ length: chunk.limit }, (_, index) => ({
            id: `E-${chunk.offset + index}`,
          })),
          count: 1_000,
        };
      },
      { type: "test", limit: ENTITY_QUERY_CHUNK_SIZE * 2 + 10, offset: 5 },
    );
    expect(requests.map(({ limit, offset }) => [limit, offset])).toEqual([
      [ENTITY_QUERY_CHUNK_SIZE, 5],
      [ENTITY_QUERY_CHUNK_SIZE, 5 + ENTITY_QUERY_CHUNK_SIZE],
      [10, 5 + ENTITY_QUERY_CHUNK_SIZE * 2],
    ]);
    expect(requests.every((request) => request.type === "test")).toBe(true);
    expect(result.count).toBe(1_000);
    expect(result.entities).toHaveLength(ENTITY_QUERY_CHUNK_SIZE * 2 + 10);
    expect(result.entities[0]?.id).toBe("E-5");
  });

  test("stops at the first short chunk and still reports the count for limit 0", async () => {
    let calls = 0;
    const short = await queryEntityChunks(
      async (chunk) => {
        calls += 1;
        return { entities: [{ id: `E-${chunk.offset}` }], count: 1 };
      },
      { limit: 500, offset: 0 },
    );
    expect(calls).toBe(1);
    expect(short).toEqual({ entities: [{ id: "E-0" }], count: 1 });

    const countOnly = await queryEntityChunks(
      async () => ({ entities: [], count: 42 }),
      { limit: 0, offset: 0 },
    );
    expect(countOnly).toEqual({ entities: [], count: 42 });
  });
});

describe("query-backed bounded loaders", () => {
  test("queryEntitiesViaQuery pages kb_query_entities instead of an all-entities findall", async () => {
    const { port, goals } = recordingPort(() => ({
      Rows: "[['TEST-1',test,[title=\"One\"]]]",
      Count: "1",
    }));
    const result = await queryEntitiesViaQuery(port, {
      type: "test",
      tags: ["proof"],
      sourceFile: "docs/a.md",
      limit: 100,
      offset: 0,
    });
    expect(goals).toEqual([
      "kb_query_entities('test', none, ['proof'], 'docs/a.md', 25, 0, Rows, Count)",
    ]);
    expect(result).toMatchObject({ count: 1, entities: [{ id: "TEST-1" }] });
  });

  test("loadSearchCandidates runs the bounded Prolog search when the port has no engine method", async () => {
    const { port, goals } = recordingPort(() => ({
      Rows: "[['REQ-1',req,[title=\"Needle\"]]]",
      Count: "1",
    }));
    const candidates = await loadSearchCandidates(port, {
      query: "needle's eye",
      type: "req",
    });
    expect(goals).toEqual([
      "kb_search_entities('req', 'needle''s eye', 500, 0, Rows, Count)",
    ]);
    expect(candidates).toMatchObject([{ id: "REQ-1", title: "Needle" }]);
  });

  test("listSearchCandidates pages projected rows up to the candidate bound", async () => {
    const { port, goals } = recordingPort((goal) => {
      const offset = Number(goal.match(/, (\d+), Rows/)?.[1] ?? 0);
      return {
        Rows: `[${Array.from({ length: 500 }, (_, index) => `['E-${offset + index}',fact,[]]`).join(",")}]`,
        Count: "5000",
      };
    });
    const candidates = await listSearchCandidates(port, {
      maxCandidates: 700,
    });
    expect(goals).toEqual([
      "kb_list_search_candidates(none, 500, 0, Rows, Count)",
      "kb_list_search_candidates(none, 500, 500, Rows, Count)",
    ]);
    expect(candidates).toHaveLength(700);
  });

  test("loadEntityIds enumerates ids without entity properties", async () => {
    const { port, goals } = recordingPort(() => ({
      Ids: "['REQ-1','TEST-2']",
    }));
    expect(await loadEntityIds(port)).toEqual(["REQ-1", "TEST-2"]);
    expect(goals).toEqual(["kb_entity_ids(Ids)"]);
  });

  test("bounded loaders surface engine failures", async () => {
    const failing = {
      query: async () => ({
        success: false,
        bindings: {},
        error: "Query exceeded bounded Prolog output capacity (ENOBUFS)",
      }),
    };
    await expect(
      queryEntitiesViaQuery(failing, { limit: 1, offset: 0 }),
    ).rejects.toThrow(/ENOBUFS/);
    await expect(loadSearchCandidates(failing, { query: "x" })).rejects.toThrow(
      /ENOBUFS/,
    );
    await expect(loadEntityIds(failing)).rejects.toThrow(/ENOBUFS/);
  });
});

describe("reloadFullEntities", () => {
  test("replaces projected candidates with complete entities by id", async () => {
    const { port, goals } = recordingPort((goal) =>
      goal.includes("'TEST-1'")
        ? {
            Results:
              '[[\'TEST-1\',test,[title="One",proof_receipts="[{\\"receipt_id\\":\\"PR-1\\"}]"]]]',
          }
        : { Results: "[]" },
    );
    const reloaded = await reloadFullEntities(port, [
      { score: 3, entity: { id: "TEST-1", type: "test", title: "One" } },
      { score: 1, entity: { id: "TEST-GONE", type: "test" } },
    ]);
    expect(goals).toHaveLength(2);
    expect(reloaded[0]?.score).toBe(3);
    expect(
      (reloaded[0]?.entity as Record<string, unknown>).proof_receipts,
    ).toBeDefined();
    // An entity removed between ranking and reload keeps its projected row.
    expect(reloaded[1]?.entity).toEqual({ id: "TEST-GONE", type: "test" });
  });
});
