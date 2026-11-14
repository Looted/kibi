import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as intent from "../../../src/intent-search.js";
import * as entities from "../../../src/public/operations/discovery-entities.js";
import { executeSearch } from "../../../src/public/operations/discovery-executors.js";
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
  corpus?: boolean;
  answer?: Loose;
  trigger?: string | null;
};

function intentFakes(options: IntentOptions = {}) {
  const analysis = { ambiguous: options.ambiguous ?? false, tokens: ["x"] };
  return {
    analysis,
    validate: spy(intent, "validateIntentSearchInput").mockImplementation(
      () => undefined,
    ),
    search: spy(intent, "executeIntentSearch").mockImplementation(
      async (
        _input: unknown,
        _prolog: unknown,
        _root: unknown,
        capture: (entities: unknown[], bodies: unknown) => void,
      ) => {
        if (options.corpus !== false) capture([{ id: "C" }], "BODIES");
        return { matches: options.matches ?? [], analysis };
      },
    ),
    answer: spy(answers, "buildSearchAnswer").mockResolvedValue(
      options.answer ?? {
        governing: [{ id: "REQ-g1" }, { id: "REQ-g2" }],
        ungoverned: [],
      },
    ),
    trigger: spy(hints, "searchHintsTrigger").mockReturnValue(
      options.trigger === undefined ? "weak" : options.trigger,
    ),
    note: spy(hints, "searchHintsNote").mockImplementation((value: unknown) =>
      value === undefined ? "" : " [hints]",
    ),
    build: spy(hints, "buildSearchHints").mockResolvedValue({
      trigger: "weak",
      provider: "p",
      items: [],
      diagnostics: [],
    }),
    reload: spy(entities, "reloadFullEntities").mockImplementation(
      async (_prolog: unknown, rows: Loose[]) =>
        rows.map((row) => ({ ...row, entity: { full: row.entity.id } })),
    ),
  };
}

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
    intentFakes();
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
    const calls = intentFakes();
    calls.search.mockRejectedValue(new Error("Search execution failed: own"));
    await expect(executeSearch({ query: "q" }, context())).rejects.toThrow(
      /^Search execution failed: own$/,
    );
    calls.search.mockRejectedValue(new Error("engine down"));
    await expect(executeSearch({ query: "q" }, context())).rejects.toThrow(
      /^Search execution failed: engine down$/,
    );
    calls.search.mockRejectedValue("text");
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

describe("executeSearch intent ranking", () => {
  test("answers with the governing requirements and hints", async () => {
    const matches = ["REQ-1", "REQ-2", "REQ-3", "REQ-4", "REQ-5", "REQ-6"].map(
      (id) => match(id),
    );
    const calls = intentFakes({
      matches,
      ambiguous: true,
      answer: {
        governing: [{ id: "REQ-g1" }, { id: "REQ-g2" }],
        ungoverned: [
          { id: "REQ-2", rank: 2 },
          { id: "REQ-1", rank: 1 },
        ],
      },
    });
    const ensured = { resolveSearchHints: async () => "RESOLUTION" };
    const ctx = context({
      branchAttachment: { gitBranch: "main", kbBranch: "kb-main" },
      ensurePlugins: async () => ensured,
    });
    spy(branchStore, "inspectBranchStore").mockReturnValue({
      state: "healthy",
      path: "/s",
    });
    spy(branchStore, "uncompiledBranchStoreReason").mockReturnValue(null);
    const result = await search(
      {
        query: " login ",
        type: "req",
        semanticFacets: { a: 1 },
        sourceLocations: [{ path: "src/a.ts" }],
        minScore: 0.2,
        limit: 6,
      },
      ctx,
    );
    const intentInput = {
      query: "login",
      type: "req",
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
    });
    expect(calls.build).toHaveBeenCalledWith({
      query: "login",
      analysis: calls.analysis,
      entities: [{ id: "C" }],
      bodies: "BODIES",
      governingIds: ["REQ-g1", "REQ-g2"],
      prolog: PROLOG,
      resolution: "RESOLUTION",
      workspaceRoot: "/ws",
    });
    expect(calls.trigger).toHaveBeenCalledWith(calls.analysis);
    expect(result.content).toStrictEqual([
      {
        type: "text",
        text: "Found 6 intent search results for 'login' (top matches are close; confirm before relying on one). Top: REQ-1, REQ-2, REQ-3, REQ-4, REQ-5. Governing: REQ-g1, REQ-g2 (the top match REQ-1 is linked to no requirement). [hints]",
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
    expect(result.structuredContent).toMatchObject({
      count: 6,
      returned: 6,
      truncated: false,
      queryAnalysis: {
        ...calls.analysis,
        hints: { trigger: "weak", provider: "p", items: [], diagnostics: [] },
      },
      branch: "kb-main",
    });
    expect(result.structuredContent.results[0].entity).toStrictEqual({
      id: "REQ-1",
      type: "req",
      title: "REQ-1",
    });
  });

  test("a forbidden situation is named so in the top matches", async () => {
    intentFakes({
      matches: [
        match("FACT-n", { negativePath: { kind: "forbidden" } }),
        match("REQ-1"),
      ],
    });
    const result = await search({ query: "q", answer: false, hints: false });
    expect(result.content[0].text).toBe(
      "Found 2 intent search results for 'q'. Top: FACT-n (forbidden situation), REQ-1.",
    );
  });

  test("keeps the answer and hints to the first page", async () => {
    const calls = intentFakes({
      matches: [match("REQ-1"), { entity: {}, score: 0, reasons: [] }],
    });
    const ensurePlugins = async () => ({
      resolveSearchHints: async () => "R",
    });
    const later = await search(
      { query: "q", offset: 1 },
      context({ ensurePlugins }),
    );
    expect(calls.answer).not.toHaveBeenCalled();
    expect(calls.build).not.toHaveBeenCalled();
    expect(later.content[0].text).toBe(
      "Found 2 intent search results for 'q'. Top: .",
    );
    expect(later.structuredContent.queryAnalysis).toBe(calls.analysis);
    expect(Object.hasOwn(later.structuredContent, "answer")).toBe(false);
    expect(later.structuredContent.truncated).toBe(false);
    const paged = await search(
      { query: "q", limit: 1, answer: false, hints: false },
      context({ ensurePlugins }),
    );
    expect(calls.answer).not.toHaveBeenCalled();
    expect(calls.build).not.toHaveBeenCalled();
    expect(paged.structuredContent.truncated).toBe(true);
    expect(paged.content[0].text).toBe(
      "Found 2 intent search results for 'q'. Top: REQ-1.",
    );
    await search({ query: "q", answer: false }, context({ ensurePlugins }));
    expect(calls.build.mock.calls[0][0].governingIds).toStrictEqual([]);
    calls.answer.mockResolvedValue({ governing: [], ungoverned: [] });
    const answered = await search({ query: "q", answer: true });
    expect(answered.content[0].text).toBe(
      "Found 2 intent search results for 'q'. Top: REQ-1, . Governing: none found.",
    );
    expect(answered.structuredContent.answer).toEqual({
      governing: [],
      ungoverned: [],
    });
  });

  test("asks no provider without a trigger, a corpus or plugins", async () => {
    const calls = intentFakes({ matches: [match("REQ-1")], trigger: null });
    const ensurePlugins = async () => ({
      resolveSearchHints: async () => "R",
    });
    await search({ query: "q" }, context({ ensurePlugins }));
    expect(calls.build).not.toHaveBeenCalled();
    calls.trigger.mockReturnValue("weak");
    await search({ query: "q" }, context());
    expect(calls.build).not.toHaveBeenCalled();
    intentFakes({ matches: [match("REQ-1")], corpus: false });
    const built = spy(hints, "buildSearchHints");
    await search({ query: "q" }, context({ ensurePlugins }));
    expect(built).not.toHaveBeenCalled();
  });

  test("reports a provider that cannot load", async () => {
    const calls = intentFakes({ matches: [] });
    const failing = (error: unknown) => async () => {
      throw error;
    };
    const result = await search(
      { query: "q" },
      context({ ensurePlugins: failing(new Error("no plugin")) }),
    );
    expect(result.structuredContent.queryAnalysis.hints).toStrictEqual({
      trigger: "weak",
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
    expect(result.content[0].text).toBe(
      "No intent search results for 'q' (abstained). No entity shares enough of the question's words: ask again in the words and language the KB is written in, or pass sourceLocations. [hints]",
    );
    expect(Object.hasOwn(result.structuredContent, "answer")).toBe(false);
    const text = await search(
      { query: "q" },
      context({ ensurePlugins: failing("plain") }),
    );
    expect(
      text.structuredContent.queryAnalysis.hints.diagnostics[0].message,
    ).toBe("plain");
    calls.trigger.mockReturnValueOnce("weak").mockReturnValueOnce(null);
    const quiet = await search(
      { query: "q" },
      context({ ensurePlugins: failing(new Error("x")) }),
    );
    expect(quiet.structuredContent.queryAnalysis).toBe(calls.analysis);
  });

  test("adds the path, contradiction and store notes", async () => {
    intentFakes({ matches: [] });
    const tail = async (input: Record<string, unknown>, ctx = context()) =>
      ((await search(input, ctx)).content[0].text as string).replace(
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

  test("uses intent ranking for facets or locations in legacy mode", async () => {
    const calls = intentFakes({ matches: [] });
    const legacy = spy(entities, "loadSearchCandidates").mockResolvedValue([]);
    spy(ranking, "rankEntities").mockResolvedValue([]);
    await search({ query: "q", rankingMode: "legacy", semanticFacets: {} });
    await search({ query: "q", rankingMode: "legacy", sourceLocations: [] });
    expect(calls.search).toHaveBeenCalledTimes(2);
    expect(legacy).not.toHaveBeenCalled();
    expect(calls.validate.mock.calls).toEqual([
      [{ query: "q", semanticFacets: {} }],
      [{ query: "q", sourceLocations: [] }],
    ]);
    await search({ query: "q", rankingMode: "legacy" });
    expect(legacy).toHaveBeenCalledTimes(1);
  });
});
