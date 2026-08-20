import { describe, expect, mock, test } from "bun:test";
import { querySpec, searchSpec, statusSpec } from "kibi-cli/operations";
import type { PrologPort } from "kibi-cli/operations/runtime-types";
import type { PrologProcess } from "kibi-cli/prolog";
import { handleKbQuery } from "../../src/tools/query.js";
import { handleKbSearch } from "../../src/tools/search.js";
import { handleKbStatus } from "../../src/tools/status.js";

function createPort(query: PrologPort["query"]): PrologPort {
  return {
    query,
    nextSolution: async () => null,
    save: async () => ({ success: true, bindings: {} }),
  };
}

function createContext(prolog: PrologPort) {
  return {
    workspaceRoot: process.cwd(),
    signal: new AbortController().signal,
    clock: () => new Date("2026-07-21T00:00:00Z"),
    prolog,
  };
}

describe("MCP discovery adapters", () => {
  test("query adapter matches the shared executor", async () => {
    // Given
    const response = {
      success: true,
      bindings: { Results: '[[REQ-1,req,[title="One",status=open]]]' },
    };
    const adapterQuery = mock(async () => response);
    const sharedQuery = mock(async () => response);

    // When
    const adapterResult = await handleKbQuery(
      { query: adapterQuery } as unknown as PrologProcess,
      { type: "req", limit: 1 },
    );
    const sharedResult = await querySpec.execute(
      { type: "req", limit: 1 },
      createContext(createPort(sharedQuery)),
    );

    // Then
    expect(adapterResult).toEqual(sharedResult);
  });

  test("search adapter matches the shared executor", async () => {
    // Given
    const response = {
      success: true,
      bindings: {
        Results: '[[REQ-1,req,[title="OAuth login flow",status=open]]]',
      },
    };
    const adapterQuery = mock(async () => response);
    const sharedQuery = mock(async () => response);

    // When
    const adapterResult = await handleKbSearch(
      { query: adapterQuery } as unknown as PrologProcess,
      { query: "OAuth login" },
    );
    const sharedResult = await searchSpec.execute(
      { query: "OAuth login" },
      createContext(createPort(sharedQuery)),
    );

    // Then
    expect(adapterResult).toEqual(sharedResult);
  });

  // implements REQ-kibi-operation-interface-parity
  test("status adapter matches the shared executor", async () => {
    // Given
    const response = {
      success: true,
      bindings: {
        JsonString: JSON.stringify({
          branch: "main",
          snapshotId: "stamp:1",
          syncedAt: null,
          dirty: true,
          syncState: "stale",
        }),
      },
    };
    const adapterQuery = mock(async () => response);
    const sharedQuery = mock(async () => response);

    // When
    const adapterResult = await handleKbStatus(
      {
        invalidateCache: mock(() => {}),
        query: adapterQuery,
      } as unknown as PrologProcess,
      {},
      createContext(createPort(adapterQuery)),
    );
    const sharedResult = await statusSpec.execute(
      {},
      createContext(createPort(sharedQuery)),
    );

    // Then
    expect(adapterResult).toEqual(sharedResult);
  });
});
