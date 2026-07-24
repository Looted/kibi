import { describe, expect, mock, test } from "bun:test";
import type {
  OperationContext,
  PrologPort,
  PrologQueryResult,
} from "../../src/public/operations/runtime-types.js";
import {
  querySpec,
  searchSpec,
  statusSpec,
} from "../../src/public/operations/specs/discovery.js";

function createContext(
  query: (goal: string) => Promise<PrologQueryResult>,
  workspaceRoot = process.cwd(),
): OperationContext {
  const prolog: PrologPort = {
    query,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
  return {
    workspaceRoot,
    signal: new AbortController().signal,
    clock: () => new Date("2026-07-21T00:00:00Z"),
    prolog,
  };
}

describe("shared discovery operation executors", () => {
  test("kb_query filters tags before applying pagination", async () => {
    // Given
    const query = mock(async () => ({
      success: true,
      bindings: {
        Results:
          '[[REQ-1,req,[title="One",status=open,tags=[other]]],[REQ-2,req,[title="Two",status=open,tags=[wanted]]],[REQ-3,req,[title="Three",status=open,tags=[wanted]]]]',
      },
    }));

    // When
    const result = await querySpec.execute(
      { type: "req", tags: ["wanted"], limit: 1, offset: 1 },
      createContext(query),
    );

    // Then
    expect(result.structuredContent).toEqual({
      entities: [
        {
          id: "REQ-3",
          type: "req",
          title: "Three",
          status: "open",
          tags: ["wanted"],
        },
      ],
      count: 2,
    });
  });

  test("kb_search trims the query and preserves ranked pagination", async () => {
    // Given
    const query = mock(async () => ({
      success: true,
      bindings: {
        Results:
          '[[REQ-1,req,[title="OAuth login flow",status=open]],[REQ-2,req,[title="OAuth login fallback",status=open]]]',
      },
    }));

    // When
    const result = await searchSpec.execute(
      { query: "  OAuth login  ", limit: 1, offset: 1 },
      createContext(query),
    );

    // Then
    expect(result.structuredContent?.count).toBe(2);
    expect(result.structuredContent?.results).toHaveLength(1);
    expect(result.structuredContent?.results[0]?.entity.id).toBe("REQ-2");
  });

  test("kb_status executes the status module through context.prolog", async () => {
    // Given
    const query = mock(async (_goal: string) => ({
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "feature/shared-discovery",
          snapshotId: "stamp:123",
          syncedAt: "2026-07-21T00:00:00Z",
          dirty: false,
          syncState: "fresh",
        }),
      },
    }));

    // When
    const result = await statusSpec.execute({}, createContext(query));

    // Then
    expect(result.structuredContent).toEqual({
      branch: "feature/shared-discovery",
      snapshotId: "stamp:123",
      syncedAt: "2026-07-21T00:00:00Z",
      dirty: false,
      syncState: "fresh",
    });
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]?.[0]).toContain("status:kb_status_json(JsonString)");
  });
});
