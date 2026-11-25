import { afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  KIBI_PLUGIN_API_VERSION,
  type KibiPluginV1,
  defineKibiPlugin,
} from "kibi-plugin-sdk";
import * as decisionSearch from "../../../src/decision-search.js";
import * as intent from "../../../src/intent-search.js";
import { CapabilityRegistry } from "../../../src/plugins/registry.js";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import { executeSearch } from "../../../src/public/operations/discovery-executors.js";
import { toKibiResult } from "../../../src/public/operations/result-envelope.js";
import * as answers from "../../../src/search-answer.js";
import * as hints from "../../../src/search-hints.js";
import * as ranking from "../../../src/search-ranking.js";
import * as branchStore from "../../../src/utils/branch-store.js";

// biome-ignore lint/suspicious/noExplicitAny: fakes stand in for wide types
type Loose = any;

const spies: { mockRestore: () => void }[] = [];
afterEach(() => {
  for (const spy of spies.splice(0)) spy.mockRestore();
});

// biome-ignore lint/suspicious/noExplicitAny: see Loose
function spy(module: any, name: string): Loose {
  const created = spyOn(module, name);
  spies.push(created);
  return created;
}

function undefinedKeys(value: unknown, path = "$"): string[] {
  if (Array.isArray(value))
    return value.flatMap((item, index) =>
      undefinedKeys(item, `${path}[${index}]`),
    );
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, item]) =>
    item === undefined
      ? [`${path}.${key}`]
      : undefinedKeys(item, `${path}.${key}`),
  );
}

const SIGNAL = new AbortController().signal;
const PROLOG = { query: async () => ({ success: true, bindings: {} }) };

function context(extra: Record<string, unknown> = {}): Loose {
  return {
    workspaceRoot: "/ws",
    signal: SIGNAL,
    clock: () => new Date(0),
    prolog: PROLOG,
    ...extra,
  };
}

const FULL_ROW = {
  id: "REQ-1",
  type: "req",
  title: "One",
  status: "open",
  priority: "high",
  tags: ["t"],
  source: "a.md",
  sourceFile: "/ws/a.md",
  updated_at: "2026",
  body: "dropped",
  semantic_text: "dropped",
};

const match = (id: string, extra: Record<string, unknown> = {}) => ({
  entity: { id, type: "req", title: id, extra: "dropped" },
  score: 1,
  reasons: ["title"],
  ...extra,
});

type IntentOptions = {
  matches?: Loose[];
  ambiguous?: boolean;
  answer?: Loose;
};

function intentFakes(options: IntentOptions = {}) {
  const analysis = { ambiguous: options.ambiguous ?? false, tokens: ["x"] };
  return {
    analysis,
    validate: spy(intent, "validateIntentSearchInput").mockImplementation(
      () => undefined,
    ),
    search: spy(intent, "executeIntentSearch").mockImplementation(async () => ({
      matches: options.matches ?? [],
      analysis,
    })),
    answer: spy(answers, "buildSearchAnswer").mockResolvedValue(
      options.answer ?? {
        governing: [
          { id: "REQ-g1", facts: [] },
          { id: "REQ-g2", facts: [] },
        ],
        ungoverned: [],
      },
    ),
    reload: spy(entities, "reloadFullEntities").mockImplementation(
      async (_prolog: unknown, rows: Loose[]) =>
        rows.map((row) => ({ ...row, entity: { full: row.entity.id } })),
    ),
  };
}

const card = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: "req",
  title: `Title ${id}`,
  statement: "",
  status: "open",
  firm: false,
  scope: "in",
  score: 0.123456,
  coverage: 0.8,
  evidence: ["title words"],
  folded: [],
  ...extra,
});

const seed = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  type: "req",
  title: `Title ${id}`,
  status: "open",
  score: 1,
  reasons: ["title words"],
  ...extra,
});

type DecisionOptions = {
  cards?: Loose[];
  seeds?: Loose[];
  meaning?: Loose[];
  fused?: boolean;
  uncovered?: string[];
  otherScopes?: { count: number; ids: string[] };
  coverage?: number;
  ranking?: string[];
  answer?: Loose;
};

/** Fakes decision search; the ranker it is given is called once. */
function decisionFakes(options: DecisionOptions = {}) {
  const cards = options.cards ?? [];
  const seeds = options.seeds ?? [];
  const found = spy(decisionSearch, "searchDecisions").mockImplementation(
    async (_root: unknown, input: Loose) => {
      if (input.meaning)
        await input.meaning(input.query, [
          { id: "REQ-1", type: "req", title: "One", text: "One", hash: "h" },
        ]);
      return {
        cards,
        retrieval: {
          cards,
          ranking: options.ranking ?? cards.map((item: Loose) => item.id),
          otherScopes: options.otherScopes ?? { count: 0, ids: [] },
          uncoveredTerms: options.uncovered ?? [],
          coverage: options.coverage ?? 0.81234,
        },
        meaning: options.meaning ?? [],
        fused: options.fused ?? false,
        seeds,
        weak: seeds.length === 0,
        decisionCount: 12,
      };
    },
  );
  return {
    found,
    answer: spy(answers, "buildSearchAnswer").mockResolvedValue(
      options.answer ?? {
        governing: [{ id: "REQ-g1", facts: [] }],
        ungoverned: [],
      },
    ),
    reload: spy(entities, "reloadFullEntities").mockImplementation(
      async (_prolog: unknown, rows: Loose[]) =>
        rows.map((row) => ({ ...row, entity: { full: row.entity.id } })),
    ),
  };
}

/** A meaning ranker whose report names provider `p`. */
function rankerFake(reported = true) {
  const rank = async () => new Map([["REQ-1", 0.5]]);
  const report = reported
    ? { provider: "p", shadow: [], diagnostics: [] }
    : undefined;
  return spy(hints, "providerMeaningRanker").mockImplementation(() => ({
    rank,
    report: () => report,
  }));
}

const ensurePlugins = async () => ({ resolveSearchHints: async () => "R" });

async function search(
  input: Record<string, unknown>,
  ctx: Loose = context(),
): Promise<Loose> {
  const result = await executeSearch(input as never, ctx);
  expect(undefinedKeys(result)).toEqual([]);
  return result;
}

describe("executeSearch input", () => {
  test("refuses an empty question, an unknown type and a missing engine", async () => {
    decisionFakes();
    await expect(executeSearch({ query: "  " }, context())).rejects.toThrow(
      /^Search execution failed: query must be a non-empty string$/,
    );
    await expect(
      executeSearch({ query: "q", type: "nope" }, context()),
    ).rejects.toThrow(/^Invalid type 'nope'/);
    await expect(
      executeSearch({ query: "q" }, context({ prolog: undefined })),
    ).rejects.toThrow(
      /^Search execution failed: Discovery operation requires a Prolog context$/,
    );
  });

  test("wraps failures once", async () => {
    const calls = decisionFakes();
    calls.found.mockRejectedValue(new Error("Search execution failed: own"));
    await expect(executeSearch({ query: "q" }, context())).rejects.toThrow(
      /^Search execution failed: own$/,
    );
    calls.found.mockRejectedValue(new Error("engine down"));
    await expect(executeSearch({ query: "q" }, context())).rejects.toThrow(
      /^Search execution failed: engine down$/,
    );
    calls.found.mockRejectedValue("text");
    await expect(executeSearch({ query: "q" }, context())).rejects.toThrow(
      /^Search execution failed: text$/,
    );
  });
});

describe("executeSearch lexical ranking", () => {
  test("ranks candidates and summarizes the page", async () => {
    const load = spy(entities, "loadSearchCandidates").mockResolvedValue([
      { id: "A" },
    ]);
    const rank = spy(ranking, "rankEntities").mockResolvedValue([
      match("REQ-1", { entity: FULL_ROW, reasons: ["title", "tag"] }),
      match("REQ-2"),
      { entity: {}, score: 0, reasons: ["none"] },
    ]);
    const result = await search({
      query: "  login  ",
      type: "req",
      rankingMode: "legacy",
      limit: 2,
    });
    expect(load).toHaveBeenCalledWith(
      PROLOG,
      { query: "login", type: "req" },
      SIGNAL,
    );
    expect(rank).toHaveBeenCalledWith([{ id: "A" }], "login", "/ws");
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Found 3 search results for 'login'. Showing 2 (offset 0, limit 2): REQ-1 [title, tag], REQ-2 [title]",
      },
    ]);
    const { entity: _full, ...first } = match("REQ-1", {
      reasons: ["title", "tag"],
    });
    expect(result.structuredContent).toStrictEqual({
      results: [
        {
          ...first,
          entity: {
            id: "REQ-1",
            type: "req",
            title: "One",
            status: "open",
            priority: "high",
            tags: ["t"],
            source: "a.md",
            sourceFile: "/ws/a.md",
            updated_at: "2026",
          },
        },
        {
          ...match("REQ-2"),
          entity: { id: "REQ-2", type: "req", title: "REQ-2" },
        },
      ],
      count: 3,
      returned: 2,
      truncated: true,
      branch: null,
    });
    const last = await search({
      query: "login",
      rankingMode: "legacy",
      offset: 1,
    });
    expect(load).toHaveBeenLastCalledWith(PROLOG, { query: "login" }, SIGNAL);
    expect(Object.keys(load.mock.calls[1][1])).toEqual(["query"]);
    expect(last.structuredContent.truncated).toBe(false);
    expect(last.structuredContent.returned).toBe(2);
    expect(last.content[0].text).toBe(
      "Found 3 search results for 'login'. Showing 2 (offset 1, limit 10): REQ-2 [title],  [none]",
    );
  });

  test("reports no results and the uncompiled store", async () => {
    spy(entities, "loadSearchCandidates").mockResolvedValue([]);
    spy(ranking, "rankEntities").mockResolvedValue([]);
    spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "missing",
      path: "/ws/.kb/branches/kb-main",
    });
    const reason = spy(
      branchStore,
      "uncompiledBranchStoreReason",
    ).mockReturnValue({ detail: "never compiled.", remediation: {} });
    const attached = context({
      branchAttachment: { gitBranch: "main", kbBranch: "kb-main" },
    });
    const result = await search(
      { query: "q", rankingMode: "legacy" },
      attached,
    );
    expect(result.content[0].text).toBe(
      "No search results for 'q'. Note: never compiled. Run kibi sync before relying on search results.",
    );
    expect(result.structuredContent).toStrictEqual({
      results: [],
      count: 0,
      returned: 0,
      truncated: false,
      branch: "kb-main",
      branchStore: {
        state: "not_compiled",
        code: branchStore.BRANCH_STORE_NOT_COMPILED,
        path: "/ws/.kb/branches/kb-main",
        detail: "never compiled.",
        remediation: {},
      },
    });
    reason.mockReturnValue(null);
    const fresh = await search({ query: "q", rankingMode: "legacy" }, attached);
    expect(fresh.content[0].text).toBe("No search results for 'q'.");
    expect(fresh.structuredContent.branch).toBe("kb-main");
    expect(Object.hasOwn(fresh.structuredContent, "branchStore")).toBe(false);
  });

  test("reloads full entities on request", async () => {
    const calls = intentFakes();
    spy(entities, "loadSearchCandidates").mockResolvedValue([]);
    spy(ranking, "rankEntities").mockResolvedValue([match("REQ-1")]);
    const result = await search({
      query: "q",
      rankingMode: "legacy",
      fields: "full",
    });
    expect(calls.reload).toHaveBeenCalledWith(PROLOG, [match("REQ-1")]);
    expect(result.structuredContent.results[0].entity).toEqual({
      full: "REQ-1",
    });
  });
});

describe("executeSearch over decisions", () => {
  test("answers with the cards, the governing requirements and the meaning list", async () => {
    const cards = [
      card("REQ-1", { firm: true, folded: ["REQ-old"] }),
      card("ADR-2", { type: "adr", scope: "unscoped" }),
    ];
    const seeds = [
      seed("REQ-1"),
      seed("REQ-old", { foldedInto: "REQ-1", score: 0.9 }),
    ];
    const calls = decisionFakes({
      cards,
      seeds,
      fused: true,
      meaning: [{ id: "REQ-m", title: "M", score: 0.4 }],
      uncovered: ["zebra"],
      otherScopes: { count: 2, ids: ["REQ-x", "REQ-y"] },
    });
    const ranker = rankerFake();
    spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "healthy",
      path: "/s",
    });
    spy(branchStore, "uncompiledBranchStoreReason").mockReturnValue(null);
    const result = await search(
      {
        query: " login ",
        type: "req",
        semanticFacets: { actions: ["export"], objects: undefined },
        sourceLocations: [{ path: "./src/a.ts" }],
      },
      context({
        branchAttachment: { gitBranch: "main", kbBranch: "kb-main" },
        ensurePlugins,
      }),
    );
    expect(ranker).toHaveBeenCalledWith("R", "/ws");
    const input = calls.found.mock.calls[0][1];
    expect(calls.found.mock.calls[0][0]).toBe("/ws");
    expect({ ...input, meaning: typeof input.meaning }).toStrictEqual({
      query: "login export",
      types: ["req"],
      paths: ["src/a.ts"],
      limit: 5,
      offset: 0,
      meaning: "function",
    });
    expect(calls.answer.mock.calls[0][0]).toBe(PROLOG);
    expect(calls.answer.mock.calls[0][1]).toStrictEqual([
      {
        entity: {
          id: "REQ-1",
          type: "req",
          title: "Title REQ-1",
          status: "open",
        },
        score: 1,
        reasons: ["title words"],
        evidence: {
          normalizedScore: 1,
          matchedFacets: [],
          sourceMatches: [],
          abstentionEligible: false,
        },
      },
      {
        entity: {
          id: "REQ-old",
          type: "req",
          title: "Title REQ-old",
          status: "open",
        },
        score: 0.9,
        reasons: ["title words"],
        evidence: {
          normalizedScore: 0.9,
          matchedFacets: [],
          sourceMatches: [],
          abstentionEligible: false,
        },
      },
    ]);
    expect(calls.answer.mock.calls[0][2]).toStrictEqual({
      workspaceRoot: "/ws",
      branch: "kb-main",
      detail: "summary",
      syncState: "unknown",
    });
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Decisions for 'login':\nREQ-1 [firm]: Title REQ-1 (title words) +1 similar\nADR-2: Title ADR-2 (title words)\nGoverning: REQ-g1. Not in any card: zebra. 2 more in other scopes (REQ-x, REQ-y). Related by meaning: REQ-m.",
      },
    ]);
    expect(Object.keys(result.structuredContent)).toEqual([
      "results",
      "count",
      "returned",
      "truncated",
      "queryAnalysis",
      "answer",
      "branch",
    ]);
    expect(result.structuredContent.results).toStrictEqual([
      {
        entity: {
          id: "REQ-1",
          type: "req",
          title: "Title REQ-1",
          status: "open",
          firmness: "firm",
        },
        score: 0.1235,
        reasons: ["title words"],
        line: "REQ-1 [firm]: Title REQ-1 (title words) +1 similar",
        scope: "in",
        folded: ["REQ-old"],
      },
      {
        entity: {
          id: "ADR-2",
          type: "adr",
          title: "Title ADR-2",
          status: "open",
        },
        score: 0.1235,
        reasons: ["title words"],
        line: "ADR-2: Title ADR-2 (title words)",
        scope: "unscoped",
      },
    ]);
    expect(result.structuredContent).toMatchObject({
      count: 2,
      returned: 2,
      truncated: false,
      queryAnalysis: {
        rankingMode: "intent-v1",
        unit: "decision",
        decisionCount: 12,
        fused: true,
        weak: false,
        abstained: false,
        coverage: 0.812,
        uncoveredTerms: ["zebra"],
        otherScopes: { count: 2, ids: ["REQ-x", "REQ-y"] },
        hints: {
          provider: "p",
          items: [{ id: "REQ-m", title: "M", score: 0.4 }],
        },
      },
      answer: { governing: [{ id: "REQ-g1", facts: [] }], ungoverned: [] },
      branch: "kb-main",
    });
  });

  test("a card whose statement the answer quotes is cut to its identity", async () => {
    decisionFakes({
      cards: [card("REQ-1"), card("REQ-2")],
      seeds: [seed("REQ-1")],
      answer: {
        governing: [{ id: "REQ-1", statement: "Whole.", facts: [] }],
        ungoverned: [],
      },
    });
    const result = await search({ query: "q" });
    expect(result.structuredContent.results[0]).toStrictEqual({
      entity: { id: "REQ-1", type: "req", title: "Title REQ-1" },
      score: 0.1235,
      reasons: ["title words"],
    });
    expect(result.structuredContent.results[1].line).toBe(
      "REQ-2: Title REQ-2 (title words)",
    );
  });

  test("an answer without a current requirement among the cards says so", async () => {
    decisionFakes({
      cards: [card("ADR-1", { type: "adr" })],
      seeds: [seed("ADR-1", { type: "adr" })],
      answer: { governing: [], ungoverned: [] },
    });
    const result = await search({ query: "q", type: "adr" });
    expect(result.content[0].text).toBe(
      "Decisions for 'q':\nADR-1: Title ADR-1 (title words)\nGoverning: no current requirement among the cards.",
    );
  });

  test("a weak answer has no answer layer, carries the note and lists the titles", async () => {
    const calls = decisionFakes({ cards: [card("REQ-1")] });
    const result = await search({ query: "q" });
    expect(calls.answer).not.toHaveBeenCalled();
    expect(result.content[0].text).toBe(
      "No strong match for 'q' in this workspace's scope; the nearest decisions are:\nREQ-1: Title REQ-1 (title words)",
    );
    expect(result.structuredContent.queryAnalysis.weak).toBe(true);
    expect(result.structuredContent.notes).toStrictEqual([
      "No decision in this workspace's scope matches the question strongly, so no requirement is named as governing. That is not evidence that nothing governs it: the cards are the nearest decisions, and the words listed in queryAnalysis.uncoveredTerms appear in none of them. Ask again in the KB's words, or read the nearest card with kb_query.",
    ]);
    expect(result.structuredContent.nextActions).toStrictEqual([
      {
        operation: "kb_query",
        input: { type: "req" },
        reason:
          "The search matched weakly: no entity shares enough of the question's words. That is not evidence that nothing is recorded. List the requirement titles to find the words the knowledge base uses, then search again in those words.",
        required: false,
      },
    ]);
    expect(Object.hasOwn(result.structuredContent, "answer")).toBe(false);
  });

  test("decisions related by meaning are the next step, so the titles are not listed", async () => {
    decisionFakes({ meaning: [{ id: "REQ-m", title: "M", score: 0.4 }] });
    rankerFake();
    const result = await search({ query: "q" }, context({ ensurePlugins }));
    expect(Object.hasOwn(result.structuredContent, "nextActions")).toBe(false);
    expect(result.structuredContent.notes).toHaveLength(1);
  });

  test("cards found by meaning alone still abstain on the question's words", async () => {
    decisionFakes({
      cards: [
        card("REQ-near", { coverage: 0 }),
        card("REQ-far", { coverage: 0 }),
      ],
      fused: true,
      uncovered: ["zebra"],
    });
    const near = await search({ query: "zebra" });
    expect(near.structuredContent.queryAnalysis).toMatchObject({
      weak: true,
      abstained: true,
    });
    expect(near.structuredContent.count).toBe(2);
    expect(near.structuredContent.nextActions[0].reason).toContain(
      "The search abstained:",
    );
    decisionFakes({
      cards: [
        card("REQ-near", { coverage: 0 }),
        card("REQ-word", { coverage: 0.2 }),
      ],
    });
    const word = await search({ query: "zebra" });
    expect(word.structuredContent.queryAnalysis.abstained).toBe(false);
  });

  test("no card at all names the words no decision holds", async () => {
    decisionFakes({ uncovered: ["zebra", "quokka"] });
    const named = await search({ query: "zebra quokka" });
    expect(named.content[0].text).toBe(
      "No decision in this workspace's scope shares the words of 'zebra quokka' (no decision contains: zebra, quokka). That is not evidence that nothing governs it: ask again in the KB's words.",
    );
    expect(named.structuredContent.nextActions[0].reason).toContain(
      "The search abstained:",
    );
    expect(named.structuredContent.queryAnalysis.abstained).toBe(true);
    decisionFakes();
    const bare = await search({ query: "q" });
    expect(bare.content[0].text).toBe(
      "No decision in this workspace's scope shares the words of 'q'. That is not evidence that nothing governs it: ask again in the KB's words.",
    );
  });

  test("a later page has no answer, no meaning list and no listing", async () => {
    const calls = decisionFakes({
      cards: [card("REQ-3")],
      seeds: [seed("REQ-3")],
      ranking: ["REQ-1", "REQ-2", "REQ-3", "REQ-4"],
      meaning: [{ id: "REQ-m", title: "M", score: 0.4 }],
    });
    rankerFake();
    const later = await search(
      { query: "q", offset: 2, limit: 1 },
      context({ ensurePlugins }),
    );
    expect(calls.found.mock.calls[0][1]).toMatchObject({ limit: 1, offset: 2 });
    expect(calls.answer).not.toHaveBeenCalled();
    expect(later.content[0].text).toBe(
      "Decisions for 'q' (from rank 3):\nREQ-3: Title REQ-3 (title words)",
    );
    expect(Object.hasOwn(later.structuredContent.queryAnalysis, "hints")).toBe(
      false,
    );
    expect(later.structuredContent.truncated).toBe(true);
    expect(Object.hasOwn(later.structuredContent, "nextActions")).toBe(false);
  });

  test("answer false and hints false skip the answer and the provider", async () => {
    const calls = decisionFakes({
      cards: [card("REQ-1")],
      seeds: [seed("REQ-1")],
    });
    const ranker = rankerFake();
    const result = await search(
      { query: "q", answer: false, hints: false },
      context({ ensurePlugins }),
    );
    expect(calls.answer).not.toHaveBeenCalled();
    expect(ranker).not.toHaveBeenCalled();
    expect(Object.hasOwn(calls.found.mock.calls[0][1], "meaning")).toBe(false);
    expect(Object.hasOwn(result.structuredContent.queryAnalysis, "hints")).toBe(
      false,
    );
    await search({ query: "q" });
    expect(ranker).not.toHaveBeenCalled();
  });

  test("a provider that gave no report adds no meaning analysis", async () => {
    decisionFakes({ cards: [card("REQ-1")], seeds: [seed("REQ-1")] });
    rankerFake(false);
    const result = await search({ query: "q" }, context({ ensurePlugins }));
    expect(Object.hasOwn(result.structuredContent.queryAnalysis, "hints")).toBe(
      false,
    );
  });

  test("reports a provider that cannot load", async () => {
    decisionFakes();
    const failing = (error: unknown) => async () => {
      throw error;
    };
    const result = await search(
      { query: "q" },
      context({ ensurePlugins: failing(new Error("no plugin")) }),
    );
    expect(result.structuredContent.queryAnalysis.hints).toStrictEqual({
      provider: null,
      items: [],
      diagnostics: [
        {
          pluginId: "unresolved",
          packageName: null,
          mode: "replace",
          code: "provider_unavailable",
          message: "no plugin",
        },
      ],
    });
    const text = await search(
      { query: "q" },
      context({ ensurePlugins: failing("plain") }),
    );
    expect(
      text.structuredContent.queryAnalysis.hints.diagnostics[0].message,
    ).toBe("plain");
  });

  test("full fields reload the cards and the answer in full", async () => {
    const calls = decisionFakes({
      cards: [card("REQ-1")],
      seeds: [seed("REQ-1")],
    });
    const result = await search({ query: "q", fields: "full" });
    expect(result.structuredContent.results[0].entity).toEqual({
      full: "REQ-1",
    });
    expect(calls.reload.mock.calls[0][0]).toBe(PROLOG);
    expect(calls.answer.mock.calls[0][2]).toMatchObject({ detail: "full" });
  });

  test("an uncompiled store is named in the text and the answer", async () => {
    const calls = decisionFakes({
      cards: [card("REQ-1")],
      seeds: [seed("REQ-1")],
    });
    spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "missing",
      path: "/s",
    });
    spy(branchStore, "uncompiledBranchStoreReason").mockReturnValue({
      detail: "empty.",
      remediation: {},
    });
    const result = await search(
      { query: "q" },
      context({ branchAttachment: { gitBranch: "m", kbBranch: "k" } }),
    );
    expect(result.content[0].text).toEndWith(
      " Note: empty. Run kibi sync before relying on search results.",
    );
    expect(calls.answer.mock.calls[0][2]).toMatchObject({
      syncState: "stale",
      staleReasonCount: 1,
    });
    expect(result.structuredContent.branchStore.state).toBe("not_compiled");
  });

  test("a stale store is named in the text, the answer and the meta", async () => {
    const calls = decisionFakes({
      cards: [card("REQ-1")],
      seeds: [seed("REQ-1")],
    });
    spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "corrupt",
      path: "/s",
      detail: "broken.",
    });
    spy(branchStore, "uncompiledBranchStoreReason").mockReturnValue(null);
    const result = await search(
      { query: "q" },
      context({ branchAttachment: { gitBranch: "m", kbBranch: "k" } }),
    );
    const options = calls.answer.mock.calls[0][2];
    expect(options).toMatchObject({ syncState: "stale", staleReasonCount: 1 });
    expect(result.content[0].text).toEndWith(` ${options.staleWarningNote}`);
    expect(result.structuredContent.meta).toBeDefined();
  });

  test("adds the path and contradiction notes", async () => {
    decisionFakes({ cards: [card("REQ-1")], seeds: [seed("REQ-1")] });
    const tail = async (input: Record<string, unknown>) =>
      ((await search(input)).content[0].text as string).replace(
        /^[\s\S]*?Governing: REQ-g1\./,
        "",
      );
    expect(await tail({ query: "what does src/a.ts do" })).toBe(
      " The question names src/a.ts; its words were left out of the topic. Pass it as sourceLocations to also see the requirements linked to that file.",
    );
    expect(
      await tail({
        query: "about src/a.ts",
        sourceLocations: [{ path: "src/a.ts" }],
      }),
    ).toBe("");
    expect(await tail({ query: "do they contradict" })).toBe(
      ' Search only finds entities that mention a conflict. Whether current requirements contradict each other is decided by kb_check with rules ["domain-contradictions"]; what a proposed rule would conflict with, by kb_model mode predicates (decisionConflicts) on its text or a kb_upsert dryRun.',
    );
  });

  test("ranks decisions for facets or locations in legacy mode", async () => {
    const calls = decisionFakes();
    const legacy = spy(entities, "loadSearchCandidates").mockResolvedValue([]);
    spy(ranking, "rankEntities").mockResolvedValue([]);
    await search({ query: "q", rankingMode: "legacy", semanticFacets: {} });
    await search({ query: "q", rankingMode: "legacy", sourceLocations: [] });
    expect(calls.found).toHaveBeenCalledTimes(2);
    expect(legacy).not.toHaveBeenCalled();
    await search({ query: "q", rankingMode: "legacy" });
    expect(legacy).toHaveBeenCalledTimes(1);
  });
});

describe("executeSearch of typed rows", () => {
  test("answers with the governing requirements of the matched rows", async () => {
    const matches = ["F-1", "F-2", "F-3", "F-4", "F-5", "F-6"].map((id) =>
      match(id),
    );
    const calls = intentFakes({
      matches,
      ambiguous: true,
      answer: {
        governing: [
          { id: "REQ-g1", facts: [] },
          { id: "REQ-g2", facts: [] },
        ],
        ungoverned: [
          { id: "F-2", rank: 2 },
          { id: "F-1", rank: 1 },
        ],
      },
    });
    spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "healthy",
      path: "/s",
    });
    spy(branchStore, "uncompiledBranchStoreReason").mockReturnValue(null);
    const result = await search(
      {
        query: " login ",
        type: "fact",
        semanticFacets: { a: 1 },
        sourceLocations: [{ path: "src/a.ts" }],
        minScore: 0.2,
        limit: 6,
      },
      context({
        branchAttachment: { gitBranch: "main", kbBranch: "kb-main" },
        ensurePlugins,
      }),
    );
    const intentInput = {
      query: "login",
      type: "fact",
      semanticFacets: { a: 1 },
      sourceLocations: [{ path: "src/a.ts" }],
      minScore: 0.2,
    };
    expect(calls.validate).toHaveBeenCalledWith(intentInput);
    expect(calls.search.mock.calls[0].slice(0, 3)).toEqual([
      intentInput,
      PROLOG,
      "/ws",
    ]);
    expect(calls.answer).toHaveBeenCalledWith(PROLOG, matches, {
      workspaceRoot: "/ws",
      branch: "kb-main",
      detail: "summary",
      syncState: "unknown",
      ambiguous: true,
    });
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Found 6 intent search results for 'login' (top matches are close; confirm before relying on one). Top: F-1, F-2, F-3, F-4, F-5. Candidate requirements, not confirmed to govern: REQ-g1, REQ-g2 (the top match F-1 is linked to no requirement).",
      },
    ]);
    expect(Object.keys(result.structuredContent)).toEqual([
      "results",
      "count",
      "returned",
      "truncated",
      "queryAnalysis",
      "answer",
      "nextActions",
      "branch",
    ]);
    expect(result.structuredContent).toMatchObject({
      count: 6,
      returned: 6,
      truncated: false,
      queryAnalysis: calls.analysis,
      branch: "kb-main",
    });
    expect(result.structuredContent.results[0].entity).toStrictEqual({
      id: "F-1",
      type: "req",
      title: "F-1",
    });
  });

  test("summary results leave out graph paths and the answer's fact calls; full keeps both", async () => {
    const evidence = {
      normalizedScore: 1,
      matchedFacets: ["f"],
      sourceMatches: [],
      graphPaths: [{ from: "SYM-a", relationships: ["implements"], to: "R" }],
      abstentionEligible: false,
    };
    const calls = intentFakes({ matches: [match("REQ-1", { evidence })] });
    const summary = await search({ query: "q", type: "scenario" });
    expect(summary.structuredContent.results[0]).toStrictEqual({
      entity: { id: "REQ-1", type: "req", title: "REQ-1" },
      score: 1,
      reasons: ["title"],
      evidence: {
        normalizedScore: 1,
        matchedFacets: ["f"],
        sourceMatches: [],
        abstentionEligible: false,
      },
    });
    expect(calls.answer.mock.calls[0]?.[2]).toMatchObject({
      detail: "summary",
    });
    const full = await search({ query: "q", type: "scenario", fields: "full" });
    expect(full.structuredContent.results[0].evidence).toStrictEqual(evidence);
    expect(calls.answer.mock.calls[1]?.[2]).toMatchObject({ detail: "full" });
  });

  test("a forbidden situation is named so in the top matches", async () => {
    intentFakes({
      matches: [
        match("FACT-n", { negativePath: { kind: "forbidden" } }),
        match("FACT-1"),
      ],
    });
    const result = await search({ query: "q", type: "fact", answer: false });
    expect(result.content[0].text).toBe(
      "Found 2 intent search results for 'q'. Top: FACT-n (forbidden situation), FACT-1.",
    );
  });

  test("keeps the answer to the first page", async () => {
    const calls = intentFakes({
      matches: [match("T-1"), { entity: {}, score: 0, reasons: [] }],
    });
    const later = await search({ query: "q", type: "test", offset: 1 });
    expect(calls.answer).not.toHaveBeenCalled();
    expect(later.content[0].text).toBe(
      "Found 2 intent search results for 'q'. Top: .",
    );
    expect(later.structuredContent.queryAnalysis).toBe(calls.analysis);
    expect(Object.hasOwn(later.structuredContent, "answer")).toBe(false);
    expect(later.structuredContent.truncated).toBe(false);
    const paged = await search({
      query: "q",
      type: "test",
      limit: 1,
      answer: false,
    });
    expect(calls.answer).not.toHaveBeenCalled();
    expect(paged.structuredContent.truncated).toBe(true);
    expect(paged.content[0].text).toBe(
      "Found 2 intent search results for 'q'. Top: T-1.",
    );
    calls.answer.mockResolvedValue({ governing: [], ungoverned: [] });
    const answered = await search({ query: "q", type: "test", answer: true });
    expect(answered.content[0].text).toBe(
      "Found 2 intent search results for 'q'. Top: T-1, . Governing: none found.",
    );
    expect(answered.structuredContent.answer).toEqual({
      governing: [],
      ungoverned: [],
    });
  });

  test("a stale store is named in the text, the answer and the meta", async () => {
    const calls = intentFakes({ matches: [match("F-1")] });
    spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "corrupt",
      path: "/s",
      detail: "broken.",
    });
    spy(branchStore, "uncompiledBranchStoreReason").mockReturnValue(null);
    const result = await search(
      { query: "q", type: "fact" },
      context({ branchAttachment: { gitBranch: "m", kbBranch: "k" } }),
    );
    const options = calls.answer.mock.calls[0][2];
    expect(options).toMatchObject({ syncState: "stale", staleReasonCount: 1 });
    expect(result.content[0].text).toEndWith(` ${options.staleWarningNote}`);
    expect(result.structuredContent.meta).toBeDefined();
  });

  test("adds the path, contradiction and store notes", async () => {
    intentFakes({ matches: [] });
    const tail = async (input: Record<string, unknown>, ctx = context()) =>
      (
        (await search({ type: "fact", ...input }, ctx)).content[0]
          .text as string
      ).replace(
        /^No intent search results for '.*?' \(abstained\)\. No entity shares enough of the question's words: ask again in the words and language the KB is written in, or pass sourceLocations\./,
        "",
      );
    expect(await tail({ query: "what does src/a.ts do" })).toBe(
      " The question names src/a.ts; its words were left out of the topic. Pass it as sourceLocations to also see the requirements linked to that file.",
    );
    expect(
      await tail({
        query: "compare src/a.ts and ./lib/b.ts",
        sourceLocations: [{ path: "./src/a.ts" }],
      }),
    ).toBe(
      " The question names lib/b.ts; its words were left out of the topic. Pass it as sourceLocations to also see the requirements linked to that file.",
    );
    expect(await tail({ query: "compare src/a.ts and lib/b.ts" })).toBe(
      " The question names src/a.ts, lib/b.ts; their words were left out of the topic. Pass them as sourceLocations to also see the requirements linked to those files.",
    );
    expect(
      await tail({
        query: "about src/a.ts",
        sourceLocations: [{ path: "src/a.ts" }],
      }),
    ).toBe("");
    expect(
      await tail({
        query: "about src/a.ts",
        sourceLocations: [{ path: "src/./a.ts" }],
      }),
    ).toBe(
      " The question names src/a.ts; its words were left out of the topic. Pass it as sourceLocations to also see the requirements linked to that file.",
    );
    const hint =
      ' Search only finds entities that mention a conflict. Whether current requirements contradict each other is decided by kb_check with rules ["domain-contradictions"]; what a proposed rule would conflict with, by kb_model mode predicates (decisionConflicts) on its text or a kb_upsert dryRun.';
    for (const query of [
      "do they contradict",
      "Contradictions here",
      "conflicting rules",
      "is this INCONSISTENT",
      "inconsistency",
    ])
      expect(await tail({ query })).toBe(hint);
    for (const query of ["nonconflict", "contra", "consistent", "inconsisten"])
      expect(await tail({ query })).toBe(query === "inconsisten" ? hint : "");
    spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "missing",
      path: "/s",
    });
    spy(branchStore, "uncompiledBranchStoreReason").mockReturnValue({
      detail: "empty.",
      remediation: {},
    });
    expect(
      await tail(
        { query: "q" },
        context({ branchAttachment: { gitBranch: "m", kbBranch: "k" } }),
      ),
    ).toBe(" Note: empty. Run kibi sync before relying on search results.");
  });
});

describe("executeSearch structured next steps of typed rows", () => {
  const REASON_TAIL =
    "no entity shares enough of the question's words. That is not evidence that nothing is recorded. List the fact titles to find the words the knowledge base uses, then search again in those words.";

  test("an abstained search lists the titles of that type and carries the note", async () => {
    intentFakes({ matches: [] });
    const { structuredContent } = await search({ query: "q", type: "fact" });
    expect(structuredContent.nextActions).toStrictEqual([
      {
        operation: "kb_query",
        input: { type: "fact" },
        reason: `The search abstained: ${REASON_TAIL}`,
        required: false,
      },
    ]);
    expect(structuredContent.notes).toStrictEqual([
      "The search abstained: no entity shares enough of the question's words. That is not evidence that nothing is recorded: ask again in the words and language the KB is written in, or pass sourceLocations.",
    ]);
  });

  test("a weak search lists them too, with no abstention note", async () => {
    intentFakes({ matches: [match("FACT-1")] });
    const { structuredContent } = await search({ query: "q", type: "fact" });
    expect(structuredContent.nextActions).toStrictEqual([
      {
        operation: "kb_query",
        input: { type: "fact" },
        reason: `The search matched weakly: ${REASON_TAIL}`,
        required: false,
      },
    ]);
    expect(Object.hasOwn(structuredContent, "notes")).toBe(false);
  });

  test("a strong or abstained-flagged analysis decides the listing", async () => {
    const strong = intentFakes({ matches: [match("FACT-1")] });
    strong.search.mockResolvedValue({
      matches: [match("FACT-1")],
      analysis: { ...strong.analysis, topScore: 0.9 },
    });
    const { structuredContent } = await search({ query: "q", type: "fact" });
    expect(Object.hasOwn(structuredContent, "nextActions")).toBe(false);
    expect(Object.hasOwn(structuredContent, "notes")).toBe(false);
    strong.search.mockResolvedValue({
      matches: [match("FACT-1")],
      analysis: { ...strong.analysis, topScore: 0.9, abstained: true },
    });
    const flagged = await search({ query: "q", type: "fact" });
    expect(flagged.structuredContent.nextActions).toHaveLength(1);
  });

  test("a later page adds no listing but an abstained ranking still says so", async () => {
    intentFakes({ matches: [match("F-1"), match("F-2")] });
    const later = await search({ query: "q", type: "fact", offset: 1 });
    expect(Object.hasOwn(later.structuredContent, "nextActions")).toBe(false);
    intentFakes({ matches: [] });
    const empty = await search({ query: "q", type: "fact", offset: 1 });
    expect(Object.hasOwn(empty.structuredContent, "nextActions")).toBe(false);
    expect(empty.structuredContent.notes).toHaveLength(1);
  });

  test("a file path in the question suggests the search with sourceLocations", async () => {
    const strong = intentFakes({ matches: [match("REQ-1")] });
    strong.search.mockResolvedValue({
      matches: [match("REQ-1")],
      analysis: { ...strong.analysis, topScore: 0.9 },
    });
    const one = await search({ query: "about src/a.ts", type: "fact" });
    expect(one.structuredContent.nextActions).toStrictEqual([
      {
        operation: "kb_search",
        input: {
          query: "about src/a.ts",
          sourceLocations: [{ path: "src/a.ts" }],
        },
        reason:
          "The question names src/a.ts; its words were left out of the topic. Pass it as sourceLocations to also see the requirements linked to that file.",
        required: false,
      },
    ]);
    const many = await search({
      query: "compare src/a.ts and lib/b.ts",
      type: "fact",
      sourceLocations: [{ path: "lib/b.ts" }],
    });
    expect(many.structuredContent.nextActions).toStrictEqual([
      {
        operation: "kb_search",
        input: {
          query: "compare src/a.ts and lib/b.ts",
          sourceLocations: [{ path: "lib/b.ts" }, { path: "src/a.ts" }],
        },
        reason:
          "The question names src/a.ts; its words were left out of the topic. Pass it as sourceLocations to also see the requirements linked to that file.",
        required: false,
      },
    ]);
  });

  test("the steps come in a fixed order when several apply", async () => {
    intentFakes({ matches: [] });
    const { structuredContent } = await search({
      query: "does src/a.ts contradict anything",
      type: "fact",
    });
    expect(
      structuredContent.nextActions.map(
        (action: { operation: string }) => action.operation,
      ),
    ).toStrictEqual(["kb_query", "kb_search", "kb_check"]);
  });
});

describe("executeSearch structured next steps of decisions", () => {
  test("a question about contradictions names the check", async () => {
    decisionFakes({ cards: [card("REQ-1")], seeds: [seed("REQ-1")] });
    const { structuredContent } = await search({
      query: "do the rules contradict",
    });
    expect(structuredContent.nextActions).toStrictEqual([
      {
        operation: "kb_check",
        input: { rules: ["domain-contradictions"] },
        reason:
          'Search only finds entities that mention a conflict. Whether current requirements contradict each other is decided by kb_check with rules ["domain-contradictions"]; what a proposed rule would conflict with, by kb_model mode predicates (decisionConflicts) on its text or a kb_upsert dryRun.',
        required: false,
      },
    ]);
  });

  test("an explicit decision type lists that type", async () => {
    decisionFakes();
    const { structuredContent } = await search({ query: "q", type: "adr" });
    expect(structuredContent.nextActions[0].input).toStrictEqual({
      type: "adr",
    });
    expect(structuredContent.nextActions[0].reason).toContain(
      "List the adr titles",
    );
  });
});

const searchSpec = { name: "kb_search", effects: [] as const };

describe("executeSearch with the bundled search hints provider", () => {
  const bundledPlugin = (hint: () => unknown) =>
    defineKibiPlugin({
      apiVersion: KIBI_PLUGIN_API_VERSION,
      id: "bundled",
      version: "1.0.0",
      permissions: { network: false, metered: false, secrets: [] },
      capabilities: {
        searchHints: { id: "bundled.hints", model: "m", hint },
      },
    } as KibiPluginV1);

  const answerWith = async (bundled: () => KibiPluginV1) => {
    decisionFakes();
    const registry = new CapabilityRegistry({
      workspaceRoot: "/ws",
      projectConfig: {},
      bundledSearchHints: bundled,
    });
    const result = await search(
      { query: "q" },
      context({ ensurePlugins: async () => registry }),
    );
    return {
      result,
      envelope: toKibiResult(searchSpec, result.structuredContent),
    };
  };

  test("a bundled plugin that fails to load leaves the search without hints and not failed", async () => {
    const { result, envelope } = await answerWith(() => {
      throw new Error("cannot load model");
    });
    expect(envelope.status).toBe("success");
    expect(result.structuredContent.count).toBe(0);
    const analysis = result.structuredContent.queryAnalysis.hints;
    expect(analysis.items).toStrictEqual([]);
    expect(analysis.diagnostics[0].code).toBe("provider_unavailable");
    expect(analysis.diagnostics[0].message).toBe("cannot load model");
  });

  test("a bundled plugin that throws while answering leaves the search without hints and not failed", async () => {
    const { result, envelope } = await answerWith(() =>
      bundledPlugin(() => {
        throw new Error("model crashed");
      }),
    );
    expect(envelope.status).toBe("success");
    expect(result.structuredContent.queryAnalysis.hints.items).toStrictEqual(
      [],
    );
    expect(
      result.structuredContent.queryAnalysis.hints.diagnostics,
    ).toHaveLength(1);
  });
});
