import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  SEARCH_CANDIDATE_PAGE_SIZE,
  loadSearchCandidates,
} from "../../../src/public/operations/discovery-entities.js";
import { executeSearch } from "../../../src/public/operations/discovery-executors.js";
import { nodeFilesystem } from "../../../src/public/operations/node-ports.js";
import type { OperationContext } from "../../../src/public/operations/runtime-types.js";
import type {
  PrologPort,
  PrologSearchQueryInput,
} from "../../../src/public/operations/runtime-types.js";

function makeFakeSearchIndex(total: number) {
  const requests: PrologSearchQueryInput[] = [];
  const fetchPage = async (
    input: PrologSearchQueryInput,
  ): Promise<{
    entities: Record<string, unknown>[];
    count: number;
  }> => {
    requests.push(input);
    const slice = Array.from({ length: total }, (_, index) => ({
      id: `REQ-${index + 1}`,
      title: `Requirement ${index + 1}`,
      status: "open",
    })).slice(input.offset, input.offset + input.limit);
    return { entities: slice, count: total };
  };
  return { requests, fetchPage };
}

function context(
  root: string,
  extra?: Partial<OperationContext>,
): OperationContext {
  return {
    workspaceRoot: root,
    signal: new AbortController().signal,
    clock: () => new Date("2026-09-24T00:00:00Z"),
    fs: nodeFilesystem,
    ...extra,
  };
}

describe("search candidate paging", () => {
  test("loadSearchCandidates aggregates paged responses under the bounded page size", async () => {
    const total = SEARCH_CANDIDATE_PAGE_SIZE * 2 + 200;
    const { requests, fetchPage } = makeFakeSearchIndex(total);
    const candidates = await loadSearchCandidates(
      { searchEntities: fetchPage },
      { query: "session" },
    );
    expect(candidates).toHaveLength(total);
    expect(requests.length).toBe(3);
    expect(
      requests.every((request) => request.limit === SEARCH_CANDIDATE_PAGE_SIZE),
    ).toBe(true);
    expect(
      requests.every((request) => request.limit <= SEARCH_CANDIDATE_PAGE_SIZE),
    ).toBe(true);
  });

  test("loadSearchCandidates stops at maxCandidates and at an empty page", async () => {
    const total = SEARCH_CANDIDATE_PAGE_SIZE * 3;
    const { requests, fetchPage } = makeFakeSearchIndex(total);
    const capped = await loadSearchCandidates(
      { searchEntities: fetchPage },
      { query: "session", maxCandidates: SEARCH_CANDIDATE_PAGE_SIZE + 10 },
    );
    expect(capped).toHaveLength(SEARCH_CANDIDATE_PAGE_SIZE + 10);
    expect(requests.length).toBe(2);

    const empty = await loadSearchCandidates(
      {
        searchEntities: async () => ({ entities: [], count: 0 }),
      },
      { query: "session" },
    );
    expect(empty).toHaveLength(0);
  });

  test("loadSearchCandidates preserves the searchEntities method receiver", async () => {
    // EngineClient.searchEntities reads `this` (this.command), so a detached
    // call like `const fetchPage = port.searchEntities; fetchPage(...)`
    // crashes on any PrologPort implementation that is not pre-bound. This
    // fake is a normal method reading instance state exactly so it fails
    // under receiver loss instead of silently succeeding.
    const total = SEARCH_CANDIDATE_PAGE_SIZE + 5;
    const seenOffsets: number[] = [];
    const port: {
      readonly seenOffsets: number[];
      searchEntities: NonNullable<PrologPort["searchEntities"]>;
    } = {
      seenOffsets,
      async searchEntities(input) {
        this.seenOffsets.push(input.offset);
        const rows = Array.from({ length: total }, (_, index) => ({
          id: `REQ-${index + 1}`,
        })) as Record<string, unknown>[];
        return {
          entities: rows.slice(input.offset, input.offset + input.limit),
          count: total,
        };
      },
    };
    const candidates = await loadSearchCandidates(port, { query: "session" });
    expect(candidates).toHaveLength(total);
    expect(seenOffsets).toEqual([0, SEARCH_CANDIDATE_PAGE_SIZE]);
  });

  test("executeSearch keeps ranking results while fetching candidates in bounded pages", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-search-paging-"));
    mkdirSync(path.join(root, ".kb"), { recursive: true });
    try {
      const total = SEARCH_CANDIDATE_PAGE_SIZE + 25;
      const { requests, fetchPage } = makeFakeSearchIndex(total);
      const result = await executeSearch(
        { query: "requirement", limit: 5 },
        context(root, {
          prolog: {
            query: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
            searchEntities: fetchPage,
          },
        }),
      );
      const structured = result.structuredContent as unknown as {
        count: number;
        results: unknown[];
      };
      expect(structured.count).toBe(total);
      expect(structured.results).toHaveLength(5);
      expect(requests.length).toBe(2);
      expect(
        requests.every(
          (request) => request.limit === SEARCH_CANDIDATE_PAGE_SIZE,
        ),
      ).toBe(true);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
