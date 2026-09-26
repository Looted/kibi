import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { PrologProcess } from "../../../src/prolog.js";
import {
  escapeAtomContent,
  parseEntityFromList,
  parseListOfLists,
} from "../../../src/prolog/codec.js";
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

// implements REQ-mcp-search-discovery, REQ-kibi-operation-interface-parity
async function receiptFixture(total = 500, payloadBytes = 20_000) {
  const root = mkdtempSync(path.join(os.tmpdir(), "kibi-search-receipts-"));
  const branch = path.join(root, "disposable-branch");
  const seed = path.join(root, "seed.pl");
  writeFileSync(
    path.join(root, "body.md"),
    "A unique markdown boundary is preserved.\n",
  );
  writeFileSync(
    seed,
    `:- module(search_fixture, [populate/2]).
    populate(Count, Bytes) :-
      length(Codes, Bytes), maplist(=(120), Codes), atom_codes(Padding, Codes),
      format(string(Receipts), '[{"receiptId":"PR-synthetic","summary":"~w"}]', [Padding]),
      forall(between(1, Count, I), (
        N is 10000+I, atom_number(Full,N), sub_atom(Full,1,4,0,Suffix), atom_concat('TEST-',Suffix,Id),
        (I =:= 1 -> Source = "body.md" ; Source = "missing-fixture.md"),
        kb:kb_assert_entity_no_audit(test, [id=Id,title="Coverage pipeline",status=active,created_at="2026-09-26T00:00:00Z",updated_at="2026-09-26T00:00:00Z",source=Source,sourceFile=Source,tags=[coverage],proof_receipts=Receipts])
      )).
  `,
  );
  const prolog = new PrologProcess({ oneShot: false, timeout: 15_000 });
  const attach = async () => {
    await prolog.start();
    const result = await prolog.query(
      `kb_attach('${escapeAtomContent(branch)}')`,
    );
    if (!result.success) throw new Error(result.error);
  };
  try {
    await attach();
    const loaded = await prolog.query(
      `use_module('${escapeAtomContent(seed)}')`,
    );
    if (!loaded.success) throw new Error(loaded.error);
    const populated = await prolog.query(
      `populate(${total},${payloadBytes}),kb_save`,
    );
    if (!populated.success) throw new Error(JSON.stringify(populated));
  } catch (error) {
    await prolog.terminate();
    rmSync(root, { recursive: true, force: true });
    throw error;
  }
  const fullReads: string[] = [];
  const read = async (goal: string) => {
    const result = await prolog.query(goal);
    if (!result.success) throw new Error(result.error);
    return {
      entities: parseListOfLists(result.bindings.Rows ?? "[]").map(
        parseEntityFromList,
      ),
      count: Number(result.bindings.Count),
    };
  };
  const port: PrologPort = {
    query: (goal) => prolog.query(goal),
    nextSolution: async () => null,
    save: async () => {
      throw new Error("Search attempted a mutation");
    },
    searchEntities: (input) =>
      read(
        `kb_search_candidates(${input.type ? `'${escapeAtomContent(input.type)}'` : "none"},'${escapeAtomContent(input.query)}',${input.limit},${input.offset},Rows,Count)`,
      ),
    queryEntities: (input) => {
      if (!input.id || input.limit !== 1 || input.offset !== 0)
        throw new Error("Hydration must query one selected exact ID");
      fullReads.push(input.id);
      return read(
        `kb_query_entities(${input.type ? `'${escapeAtomContent(input.type)}'` : "none"},'${escapeAtomContent(input.id)}',[],none,1,0,Rows,Count)`,
      );
    },
  };
  return {
    root,
    prolog,
    attach,
    port,
    fullReads,
    dispose: async () => {
      await prolog.terminate();
      rmSync(root, { recursive: true, force: true });
    },
  };
}

describe("receipt-heavy indexed search", () => {
  test("keeps interactive attachment alive and hydrates only selected full results", async () => {
    const fixture = await receiptFixture();
    try {
      // The former search route serializes every receipt history and destroys
      // this interactive child on overflow. Reattach our disposable fixture.
      const baseline = await fixture.prolog.query(
        "kb_search_entities(none,'coverage pipeline',500,0,Rows,Count)",
      );
      expect(baseline.success).toBe(false);
      expect(baseline.error).toContain("ENOBUFS");
      expect(fixture.prolog.getPid()).toBe(0);
      await fixture.attach();
      const pid = fixture.prolog.getPid();
      const summary = await executeSearch(
        { query: "coverage pipeline", limit: 5 },
        context(fixture.root, { prolog: fixture.port }),
      );
      expect(summary.structuredContent?.count).toBe(500);
      expect(summary.structuredContent?.results).toHaveLength(5);
      expect(fixture.fullReads).toEqual([]);
      expect(fixture.prolog.getPid()).toBe(pid);
      const body = await executeSearch(
        { query: "unique markdown boundary", limit: 5 },
        context(fixture.root, { prolog: fixture.port }),
      );
      expect(body.structuredContent?.count).toBe(1);
      expect(body.structuredContent?.results[0]?.entity.id).toBe("TEST-0001");
      expect(body.structuredContent?.results[0]?.reasons).toContain(
        "markdown body match",
      );
      const full = await executeSearch(
        { query: "coverage pipeline", limit: 5, fields: "full" },
        context(fixture.root, { prolog: fixture.port }),
      );
      expect(full.structuredContent?.count).toBe(
        summary.structuredContent?.count,
      );
      expect(
        full.structuredContent?.results.map(({ score, reasons, entity }) => ({
          score,
          reasons,
          id: entity.id,
        })),
      ).toEqual(
        summary.structuredContent?.results.map(
          ({ score, reasons, entity }) => ({ score, reasons, id: entity.id }),
        ),
      );
      expect(fixture.fullReads).toEqual([
        "TEST-0001",
        "TEST-0002",
        "TEST-0003",
        "TEST-0004",
        "TEST-0005",
      ]);
      expect(full.structuredContent?.results[0]?.entity.proof_receipts).toEqual(
        [{ receiptId: "PR-synthetic", summary: "x".repeat(20_000) }],
      );
      expect(full.structuredContent?.results[0]?.entity.tags).toEqual([
        "coverage",
      ]);
      expect(fixture.prolog.getPid()).toBe(pid);
      const intentInput = {
        query: "coverage pipeline",
        limit: 2,
        rankingMode: "intent-v1" as const,
        semanticFacets: { actions: ["coverage"], objects: ["pipeline"] },
      };
      const intentSummary = await executeSearch(
        intentInput,
        context(fixture.root, { prolog: fixture.port }),
      );
      const intentFull = await executeSearch(
        { ...intentInput, fields: "full" },
        context(fixture.root, { prolog: fixture.port }),
      );
      expect(intentFull.structuredContent?.queryAnalysis).toEqual(
        intentSummary.structuredContent?.queryAnalysis,
      );
      expect(intentFull.structuredContent?.count).toBe(
        intentSummary.structuredContent?.count,
      );
      expect(
        intentFull.structuredContent?.results.map((match) => ({
          score: match.score,
          reasons: match.reasons,
          evidence: "evidence" in match ? match.evidence : undefined,
          id: match.entity.id,
        })),
      ).toEqual(
        intentSummary.structuredContent?.results.map((match) => ({
          score: match.score,
          reasons: match.reasons,
          evidence: "evidence" in match ? match.evidence : undefined,
          id: match.entity.id,
        })),
      );
      expect(fixture.fullReads.slice(5)).toEqual(
        intentFull.structuredContent?.results.map(({ entity }) =>
          String(entity.id),
        ) ?? [],
      );
      expect(
        intentFull.structuredContent?.results[0]?.entity.proof_receipts,
      ).toEqual([{ receiptId: "PR-synthetic", summary: "x".repeat(20_000) }]);
      expect(fixture.prolog.getPid()).toBe(pid);
    } finally {
      await fixture.dispose();
    }
  }, 60_000);

  test("summarizes a giant receipt history but fails closed when its full entity exceeds transport capacity", async () => {
    const fixture = await receiptFixture(1, 9 * 1024 * 1024);
    try {
      const summary = await executeSearch(
        { query: "coverage pipeline", limit: 1 },
        context(fixture.root, { prolog: fixture.port }),
      );
      expect(summary.structuredContent?.count).toBe(1);
      expect(summary.structuredContent?.results).toHaveLength(1);
      expect(fixture.fullReads).toEqual([]);
      await expect(
        executeSearch(
          { query: "coverage pipeline", limit: 1, fields: "full" },
          context(fixture.root, { prolog: fixture.port }),
        ),
      ).rejects.toThrow("ENOBUFS");
      expect(fixture.fullReads).toEqual(["TEST-0001"]);
    } finally {
      await fixture.dispose();
    }
  }, 60_000);

  test("rejects missing selected entities and propagates hydration errors", async () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "kibi-search-hydration-"));
    try {
      const row = {
        id: "TEST-1",
        type: "test",
        title: "Coverage pipeline",
        status: "active",
      };
      const port: PrologPort = {
        query: async () => ({ success: true, bindings: {} }),
        nextSolution: async () => null,
        save: async () => {
          throw new Error("Search attempted a mutation");
        },
        searchEntities: async () => ({ entities: [row], count: 1 }),
        queryEntities: async () => ({ entities: [], count: 0 }),
      };
      await expect(
        executeSearch(
          { query: "coverage pipeline", fields: "full" },
          context(root, { prolog: port }),
        ),
      ).rejects.toThrow("Full search entity is missing or ambiguous: TEST-1");
      port.queryEntities = async () => ({ entities: [row], count: 2 });
      await expect(
        executeSearch(
          { query: "coverage pipeline", fields: "full" },
          context(root, { prolog: port }),
        ),
      ).rejects.toThrow("Full search entity is missing or ambiguous: TEST-1");
      port.queryEntities = async () => {
        throw new Error("sentinel hydration failure");
      };
      await expect(
        executeSearch(
          { query: "coverage pipeline", fields: "full" },
          context(root, { prolog: port }),
        ),
      ).rejects.toThrow("sentinel hydration failure");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
