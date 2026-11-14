import { afterAll, beforeAll, describe, expect, spyOn, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type IntentSearchFacets,
  type IntentSearchMatch,
  type IntentSearchOptions,
  entityTokens,
  executeIntentSearch,
  facetValues,
  graphGoal,
  inheritedSourceMatches,
  intentTokens,
  loadIntentCandidates,
  normalize,
  queryClauses,
  queryGraphEdges,
  questionPaths,
  rankIntentEntities,
  readBodies,
  scoreEntity,
  sourceMatches,
  tokenCache,
  tokenizer,
  tokenizerSources,
  topicText,
  validateIntentSearchInput,
} from "../src/intent-search.js";
import { negativePathFactsGoal } from "../src/negative-path-facts.js";
import * as discovery from "../src/public/operations/discovery-entities.js";
import type { PrologPort } from "../src/public/operations/runtime-types.js";
import * as ranking from "../src/search-ranking.js";
import {
  KIBI_SEARCH_TOKEN_CACHE_ENV,
  type SearchTokenCache,
  tokenSourceHash,
} from "../src/search-token-cache.js";

const temps: string[] = [];
let savedCacheEnv: string | undefined;

beforeAll(() => {
  savedCacheEnv = process.env[KIBI_SEARCH_TOKEN_CACHE_ENV];
  process.env[KIBI_SEARCH_TOKEN_CACHE_ENV] = "0";
});

afterAll(() => {
  if (savedCacheEnv === undefined)
    delete process.env[KIBI_SEARCH_TOKEN_CACHE_ENV];
  else process.env[KIBI_SEARCH_TOKEN_CACHE_ENV] = savedCacheEnv;
  for (const dir of temps.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

function temp(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "kibi-intent-mutation-"));
  temps.push(dir);
  return dir;
}

const STOP_WORDS = [
  "a",
  "about",
  "after",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "before",
  "by",
  "can",
  "could",
  "did",
  "do",
  "does",
  "each",
  "for",
  "from",
  "govern",
  "happen",
  "happens",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "me",
  "must",
  "my",
  "of",
  "on",
  "or",
  "other",
  "our",
  "should",
  "so",
  "stay",
  "tell",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "those",
  "to",
  "true",
  "us",
  "was",
  "we",
  "what",
  "when",
  "where",
  "which",
  "who",
  "why",
  "will",
  "with",
  "would",
  "you",
  "your",
  "governs",
  "governing",
  "governed",
];

describe("tokens", () => {
  test("drop every stop word in its stemmed form", () => {
    for (const word of STOP_WORDS) {
      expect(intentTokens(`zebra ${word}`)).toStrictEqual(["zebra"]);
    }
  });

  test("split identifiers, separators and punctuation", () => {
    expect(intentTokens("toggleViewMode")).toStrictEqual([
      "toggleviewmod",
      "toggl",
      "view",
      "mode",
    ]);
    expect(intentTokens("canExport")).toStrictEqual(["canexport", "export"]);
    expect(intentTokens("x9Y")).toStrictEqual(["x9y", "x9", "y"]);
    expect(intentTokens("ABCDef")).toStrictEqual(["abcdef"]);
    expect(intentTokens("foo-bar_baz")).toStrictEqual(["foo", "bar", "baz"]);
    expect(intentTokens("  Hello, World!  ")).toStrictEqual(["hello", "world"]);
    expect(intentTokens("")).toStrictEqual([]);
    expect(intentTokens("!!!")).toStrictEqual([]);
    expect(intentTokens("plan plan")).toStrictEqual(["plan"]);
    expect(normalize("Foo--Bar")).toBe("foo bar");
  });

  test("strip plurals and suffixes of long enough words", () => {
    expect(intentTokens("plans glass cats berries")).toStrictEqual([
      "plan",
      "glass",
      "cats",
      "berry",
    ]);
    expect(
      intentTokens("tested nation freeing replace abcd1ing tied abcdef"),
    ).toStrictEqual([
      "test",
      "nation",
      "free",
      "replac",
      "abcd1ing",
      "tied",
      "abcdef",
    ]);
    expect(intentTokens("creation creating cursory ingested")).toStrictEqual([
      "creat",
      "curs",
      "ingest",
    ]);
  });
});

describe("question text", () => {
  test("finds workspace paths, not URLs", () => {
    expect(
      questionPaths(
        "see ../src/a.ts and ./lib/b.js, a/b./c.ts, src/a.ts again; http://x.io/a/b.ts",
      ),
    ).toStrictEqual(["../src/a.ts", "lib/b.js", "a/b./c.ts", "src/a.ts"]);
  });

  test("removes paths and splits identifiers from the topic", () => {
    expect(topicText("x(src/a.ts)y")).toBe("x( )y");
    expect(topicText("about lib/thing now", [{ path: "./lib/thing" }])).toBe(
      "about   now",
    );
    expect(topicText("abc", [{ path: "./" }])).toBe("abc");
    expect(topicText("see a/./b here", [{ path: "a/./b" }])).toBe("see   here");
    expect(topicText("canExport now")).toBe("can Export now");
  });

  test("splits compound questions into clauses of two tokens or more", () => {
    const cases: [string, string[][]][] = [
      [
        "alpha beta. gamma delta",
        [
          ["alpha", "beta"],
          ["gamma", "delta"],
        ],
      ],
      [
        "alpha beta - gamma delta",
        [
          ["alpha", "beta"],
          ["gamma", "delta"],
        ],
      ],
      [
        "alpha beta — gamma delta",
        [
          ["alpha", "beta"],
          ["gamma", "delta"],
        ],
      ],
      [
        "alpha beta;; gamma delta",
        [
          ["alpha", "beta"],
          ["gamma", "delta"],
        ],
      ],
      [
        "alpha beta, gamma delta, epsilon zeta",
        [
          ["alpha", "beta"],
          ["gamma", "delta"],
          ["epsilon", "zeta"],
        ],
      ],
      ["alpha beta-gamma delta", []],
      ["alpha beta.gamma delta", []],
      ["alpha beta; gamma", []],
      ["alpha beta", []],
    ];
    for (const [query, clauses] of cases) {
      expect(queryClauses(query)).toStrictEqual(clauses);
    }
  });
});

describe("facetValues", () => {
  test("keeps non-blank strings in facet order", () => {
    expect(facetValues(undefined)).toStrictEqual([]);
    expect(
      facetValues({
        aliases: "d",
        constraints: ["c"],
        objects: "b",
        actions: "  ",
        actors: [" ", "a", 5],
      } as unknown as IntentSearchFacets),
    ).toStrictEqual([
      { name: "actors", value: "a" },
      { name: "objects", value: "b" },
      { name: "constraints", value: "c" },
      { name: "aliases", value: "d" },
    ]);
  });
});

describe("sourceMatches", () => {
  const symbol = {
    id: "S1",
    title: "handleLogin",
    sourceFile: "src/auth.ts#L10",
    sourceLine: 10,
    sourceEndLine: 20,
  };

  test("matches the entity's file however the path is written", () => {
    for (const requested of [
      "src/auth.ts",
      "./src/auth.ts",
      "src\\auth.ts",
      "pkg/src/auth.ts",
      "auth.ts",
    ]) {
      expect(sourceMatches(symbol, [{ path: requested }])).toStrictEqual([
        { path: requested, symbolId: "S1", distance: 2 },
      ]);
    }
    expect(
      sourceMatches({ ...symbol, sourceFile: "pkg/src/auth.ts" }, [
        { path: "src/auth.ts" },
      ]),
    ).toHaveLength(1);
    expect(sourceMatches({ sourceFile: "x" }, [{ path: "./x" }])).toHaveLength(
      1,
    );
    for (const requested of ["src/auth.tsx", "other/auth.ts", "uth.ts"]) {
      expect(sourceMatches(symbol, [{ path: requested }])).toStrictEqual([]);
    }
    expect(
      sourceMatches({ sourceFile: "a/./b" }, [{ path: "a/b" }]),
    ).toStrictEqual([]);
    expect(sourceMatches(symbol, [])).toStrictEqual([]);
  });

  test("reads the source when the source file is blank, without its fragment", () => {
    const from = (entity: Record<string, unknown>) =>
      sourceMatches(entity, [{ path: "src/auth.ts" }]).length;
    expect(from({ sourceFile: "  ", source: " src/auth.ts#frag " })).toBe(1);
    expect(from({ source: "src/auth.ts" })).toBe(1);
    expect(from({ sourceFile: "#frag" })).toBe(0);
    expect(from({ source: 5 })).toBe(0);
    expect(from({})).toBe(0);
  });

  test("matches a requested symbol against the title", () => {
    const distance = (symbolName: string, line?: number) =>
      sourceMatches(symbol, [
        {
          path: "src/auth.ts",
          symbol: symbolName,
          ...(line === undefined ? {} : { line }),
        },
      ]).map((match) => match.distance);
    expect(distance("handleLogin")).toStrictEqual([0]);
    expect(distance("handleLogin", 15)).toStrictEqual([0]);
    expect(distance("login")).toStrictEqual([2]);
    expect(distance("handleLoginNow")).toStrictEqual([]);
    expect(distance("handleLogin extra")).toStrictEqual([2]);
    expect(distance("logout")).toStrictEqual([]);
    expect(
      sourceMatches({ id: 3, sourceFile: "x" }, [{ path: "x", symbol: "y" }]),
    ).toStrictEqual([{ path: "x", distance: 2 }]);
  });

  test("matches a requested line inside the entity's range", () => {
    const at = (entity: Record<string, unknown>, line: number) =>
      sourceMatches(entity, [{ path: "src/auth.ts", line }]).map(
        (match) => match.distance,
      );
    for (const line of [10, 15, 20])
      expect(at(symbol, line)).toStrictEqual([1]);
    for (const line of [9, 21]) expect(at(symbol, line)).toStrictEqual([]);
    const single = { sourceFile: "src/auth.ts", source_line: "12" };
    expect(at(single, 12)).toStrictEqual([1]);
    expect(at(single, 13)).toStrictEqual([]);
    const fallback = {
      sourceFile: "src/auth.ts",
      sourceLine: Number.NaN,
      source_line: 7,
      source_end_line: "9",
    };
    expect(at(fallback, 9)).toStrictEqual([1]);
    expect(
      at({ sourceFile: "src/auth.ts", sourceLine: "7a" }, 7),
    ).toStrictEqual([]);
    expect(
      at({ sourceFile: "src/auth.ts", sourceLine: " 7" }, 7),
    ).toStrictEqual([]);
    expect(at({ sourceFile: "src/auth.ts", sourceLine: 7.5 }, 7)).toStrictEqual(
      [],
    );
    expect(
      at({ sourceFile: "src/auth.ts", sourceEndLine: 30 }, 7),
    ).toStrictEqual([]);
  });
});

describe("token fingerprint and caches", () => {
  test("the fingerprint covers the tokenizer code and its stop tokens", () => {
    const sources = tokenizerSources();
    expect(sources).toContain(String(normalize));
    expect(sources).toContain("the");
    expect(sources).toContain("befor");
    expect(tokenizer()).toBe(tokenSourceHash(sources));
    expect(tokenizer()).toBe(tokenizer());
  });

  test("one token cache per workspace", () => {
    const saved = process.env.KIBI_RUNTIME_DIR;
    process.env.KIBI_RUNTIME_DIR = temp();
    delete process.env[KIBI_SEARCH_TOKEN_CACHE_ENV];
    try {
      const first = temp();
      expect(tokenCache(first)).toBe(tokenCache(first));
      expect(tokenCache(temp())).not.toBe(tokenCache(first));
    } finally {
      process.env[KIBI_SEARCH_TOKEN_CACHE_ENV] = "0";
      if (saved === undefined)
        Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
      else process.env.KIBI_RUNTIME_DIR = saved;
    }
  });
});

describe("entityTokens", () => {
  const entity = () => ({
    title: "Alpha Plans",
    id: "E-1",
    type: "req",
    source: "s.md",
    sourceFile: "f.ts",
    semantic_text: "Sem",
    text_ref: "Ref",
    tags: ["Tag", 3],
    status: "ignored",
  });
  const plain = (tokens: ReturnType<typeof entityTokens>) => ({
    body: tokens.body,
    title: [...tokens.title],
    metadata: [...tokens.metadata],
    bodyTokens: [...tokens.bodyTokens],
    document: tokens.document,
  });

  test("reads title, metadata, body and the whole document", () => {
    expect(plain(entityTokens(entity(), "Body words"))).toStrictEqual({
      body: "Body words",
      title: ["alpha", "plan"],
      metadata: ["e", "1", "req", "s", "md", "f", "ts", "sem", "ref", "tag"],
      bodyTokens: ["body", "word"],
      document: [
        "alpha",
        "plan",
        "e",
        "1",
        "req",
        "s",
        "md",
        "f",
        "ts",
        "sem",
        "ref",
        "tag",
        "body",
        "word",
      ],
    });
    expect(plain(entityTokens({}, null))).toStrictEqual({
      body: null,
      title: [],
      metadata: [],
      bodyTokens: [],
      document: [],
    });
    expect([...entityTokens({ title: 7 }, null).title]).toStrictEqual(["7"]);
  });

  test("reuses the tokens of the same entity and body", () => {
    const row = entity();
    const first = entityTokens(row, "one");
    expect(entityTokens(row, "one")).toBe(first);
    const second = entityTokens(row, "two");
    expect(second).not.toBe(first);
    expect([...second.bodyTokens]).toStrictEqual(["two"]);
  });

  function recordingCache(stored?: Parameters<SearchTokenCache["set"]>[2]) {
    const gets: [string, string][] = [];
    const sets: unknown[] = [];
    const cache: SearchTokenCache = {
      get: (key, hash) => {
        gets.push([key, hash]);
        return stored;
      },
      set: (...call) => {
        sets.push(call);
      },
      save: () => undefined,
    };
    return { cache, gets, sets };
  }

  test("stores computed tokens under the entity key and source hash", () => {
    const { cache, gets, sets } = recordingCache();
    const tokens = entityTokens(entity(), "Body words", cache);
    const hash = tokenSourceHash([
      "Alpha Plans",
      "E-1 req s.md f.ts Sem Ref Tag",
      "Alpha Plans E-1 req s.md f.ts Sem Ref Tag",
      "Body words",
    ]);
    expect(gets).toStrictEqual([["req::E-1", hash]]);
    expect(sets).toStrictEqual([
      [
        "req::E-1",
        hash,
        {
          title: [...tokens.title],
          metadata: [...tokens.metadata],
          bodyTokens: [...tokens.bodyTokens],
          document: tokens.document,
        },
      ],
    ]);
    const empty = recordingCache();
    entityTokens({}, null, empty.cache);
    expect(empty.gets).toStrictEqual([
      ["::", tokenSourceHash(["", "", "", ""])],
    ]);
  });

  test("hashes a missing title and body like empty ones", () => {
    const hashOf = (row: Record<string, unknown>, body: string | null) => {
      const { cache, gets } = recordingCache();
      entityTokens(row, body, cache);
      return gets[0]?.[1];
    };
    expect(hashOf({ id: "x" }, null)).toBe(tokenSourceHash(["", "x", "x", ""]));
    expect(hashOf({ id: "x", title: "t" }, null)).not.toBe(
      hashOf({ id: "x" }, null),
    );
    expect(hashOf({ id: "x" }, "b")).not.toBe(hashOf({ id: "x" }, null));
  });

  test("uses stored tokens without recomputing them", () => {
    const { cache, sets } = recordingCache({
      title: ["t"],
      metadata: ["m"],
      bodyTokens: ["b"],
      document: ["d"],
    });
    expect(plain(entityTokens(entity(), "Body words", cache))).toStrictEqual({
      body: "Body words",
      title: ["t"],
      metadata: ["m"],
      bodyTokens: ["b"],
      document: ["d"],
    });
    expect(sets).toStrictEqual([]);
  });
});

const idf = (frequency: number, count: number) =>
  Math.log(1 + (count - frequency + 0.5) / (frequency + 0.5));

describe("scoreEntity", () => {
  const entity = { id: "E-1", type: "req", title: "Alpha" };

  test("weighs rare tokens by where they sit and how much they cover", () => {
    const frequency = new Map([
      ["alpha", 1],
      ["req", 3],
      ["gamma", 2],
    ]);
    const result = scoreEntity(
      { ...entity },
      ["alpha", "req", "gamma", "zeta", "alpha"],
      [],
      [],
      [],
      frequency,
      4,
      "gamma words",
      false,
      false,
      new Set(["gamma"]),
    );
    const total = idf(1, 4) + idf(3, 4) + 2 * idf(2, 4) + idf(0, 4);
    const placed = idf(1, 4) + idf(3, 4) * 0.65 + 2 * idf(2, 4) * 0.5;
    const covered = idf(1, 4) + idf(3, 4) + 2 * idf(2, 4);
    expect(result).toStrictEqual({
      score: ((placed / total + covered / total) / 2) * 0.58,
      reasons: ["intent token match", "markdown body match"],
      matchedFacets: [],
    });
  });

  test("adds facet, source and graph evidence and applies demotions", () => {
    const result = scoreEntity(
      { ...entity, status: " Deprecated " },
      [],
      [
        { name: "actors", value: "alpha omega" },
        { name: "aliases", value: "the" },
        { name: "objects", value: "word" },
        { name: "actions", value: "req" },
        { name: "constraints", value: "nothing" },
      ],
      [{ path: "x" }],
      [
        { from: "a", relationships: ["r"], to: "b" },
        { from: "a", relationships: ["r"], to: "c" },
        { from: "a", relationships: ["r"], to: "d" },
      ],
      new Map(),
      1,
      "words",
      false,
      true,
    );
    expect(result).toStrictEqual({
      score: (0.5 * 0.17 + 0.2 + 0.05) * 0.5 * 0.25,
      reasons: [
        "demoted: deprecated",
        "demoted: provenance stub",
        "semantic facet match",
        "source location match",
        "traceability graph match",
      ],
      matchedFacets: ["actors:alpha omega", "objects:word", "actions:req"],
    });
  });

  test("defaults to a current, claimed entity", () => {
    const graph = [{ from: "a", relationships: ["r"], to: "b" }];
    expect(
      scoreEntity({ ...entity }, [], [], [], graph, new Map(), 1, null),
    ).toStrictEqual({
      score: 0.5 * 0.05,
      reasons: ["traceability graph match"],
      matchedFacets: [],
    });
    expect(
      scoreEntity({ ...entity }, [], [], [], graph, new Map(), 1, null, true)
        .reasons,
    ).toStrictEqual(["demoted: superseded", "traceability graph match"]);
    expect(
      scoreEntity(
        { ...entity },
        ["alpha"],
        [{ name: "actors", value: "alpha" }],
        [{ path: "x" }],
        [...graph, ...graph],
        new Map(),
        1,
        null,
      ).score,
    ).toBe(1);
  });
});

describe("readBodies", () => {
  test("reads each Markdown source once and skips rows without one", () => {
    const load = spyOn(ranking, "loadMarkdownBodySync").mockImplementation(
      (source) => (source === "a.md" ? "body of a" : null),
    );
    try {
      const a = { source: "a.md" };
      const again = { source: "a.md" };
      const none = {};
      const numeric = { source: 5 };
      const other = { source: "b.md" };
      const cache = new Map<string, string | null>();
      const bodies = readBodies([a, again, none, numeric, other], "/ws", cache);
      expect([...bodies.entries()]).toStrictEqual([
        [a, "body of a"],
        [again, "body of a"],
        [none, null],
        [numeric, null],
        [other, null],
      ]);
      expect(load.mock.calls).toStrictEqual([
        ["a.md", "/ws"],
        ["b.md", "/ws"],
      ]);
      expect([...cache.entries()]).toStrictEqual([
        ["a.md", "body of a"],
        ["b.md", null],
      ]);
    } finally {
      load.mockRestore();
    }
  });
});

describe("rankIntentEntities", () => {
  const rank = (
    entities: Record<string, unknown>[],
    options: Partial<IntentSearchOptions> = {},
    edges: Parameters<typeof rankIntentEntities>[3] = [],
  ) =>
    rankIntentEntities(
      entities,
      { query: "zzzz", minScore: 0, ...options },
      temp(),
      edges,
    );
  const ids = (matches: readonly IntentSearchMatch[]) =>
    matches.map((match) => match.entity.id ?? null);

  test("orders stubs last, then by score, type and id", async () => {
    const stub = {
      id: "stub",
      tags: ["bootstrap:provenance-stub"],
      title: "zzzz",
    };
    const result = await rank([
      { id: "z", type: "a" },
      { id: "y", type: "b" },
      { id: "b", type: "b" },
      { type: "b" },
      { id: "c" },
      stub,
      { id: "top", type: "b", title: "zzzz" },
    ]);
    expect(ids(result.matches)).toStrictEqual([
      "top",
      "c",
      "z",
      null,
      "b",
      "y",
      "stub",
    ]);
  });

  test("reports the margins to the runner-up and to the best rival", async () => {
    const entities = [
      { id: "A", title: "alpha beta gamma" },
      { id: "B", title: "alpha beta" },
      { id: "C", title: "alpha" },
    ];
    const linked = await rank(entities, { query: "alpha beta gamma" }, [
      { relationship: "verified_by", from: "A", to: "B" },
    ]);
    const [a, b, c] = linked.matches as IntentSearchMatch[];
    expect(ids(linked.matches)).toStrictEqual(["A", "B", "C"]);
    expect(linked.analysis).toStrictEqual({
      rankingMode: "intent-v1",
      candidateCount: 3,
      acceptedCount: 3,
      topScore: a?.score,
      topTwoMargin: (a?.score ?? 0) - (b?.score ?? 0),
      topRivalMargin: (a?.score ?? 0) - (c?.score ?? 0),
      abstained: false,
      ambiguous: false,
    });
    const reverse = await rank(entities, { query: "alpha beta gamma" }, [
      { relationship: "verified_by", from: "B", to: "A" },
      { relationship: "verified_by", from: "C", to: "A" },
    ]);
    expect(reverse.analysis.topRivalMargin).toBeNull();
    const single = await rank([{ id: "A" }]);
    expect(single.analysis).toMatchObject({
      topScore: 0,
      topTwoMargin: null,
      topRivalMargin: null,
      ambiguous: false,
    });
    const none = await rank([{ id: "A" }], { minScore: 0.5 });
    expect(none.analysis).toStrictEqual({
      rankingMode: "intent-v1",
      candidateCount: 1,
      acceptedCount: 0,
      topScore: null,
      topTwoMargin: null,
      topRivalMargin: null,
      abstained: true,
      ambiguous: false,
    });
  });

  test("calls a rival margin under 0.05 ambiguous", async () => {
    const edges = [
      { relationship: "verified_by", from: "A", to: "X" },
      { relationship: "verified_by", from: "A", to: "Y" },
    ];
    const exact = await rank([{ id: "A" }, { id: "B" }], {}, edges);
    expect(exact.analysis).toMatchObject({
      topScore: 0.05,
      topRivalMargin: 0.05,
      ambiguous: false,
    });
    const close = await rank([{ id: "A" }, { id: "B" }], {}, edges.slice(1));
    expect(close.analysis).toMatchObject({
      topRivalMargin: 0.025,
      ambiguous: true,
    });
  });

  test("keeps the top match's links, not just its id, out of the rivals", async () => {
    const result = await rank(
      [{ title: "zzzz" }, { id: "Q" }, { id: "R" }],
      {},
      [{ relationship: "verified_by", from: "", to: "Q" }],
    );
    expect(ids(result.matches)).toStrictEqual([null, "Q", "R"]);
    const [top] = result.matches;
    expect(top?.evidence.graphPaths).toStrictEqual([
      { from: "", relationships: ["verified_by"], to: "Q" },
    ]);
    expect(result.analysis.topRivalMargin).toBe(top?.score);
  });

  test("bounds graph evidence and demotes superseded entities", async () => {
    const edges = Array.from({ length: 9 }, (_, index) => ({
      relationship: "verified_by",
      from: "A",
      to: `T${index}`,
    }));
    const [match] = (await rank([{ id: "A" }], {}, edges)).matches;
    expect(match?.evidence.graphPaths).toHaveLength(8);
    const superseded = await rank([{ id: "O", title: "zzzz" }], {}, [
      { relationship: "supersedes", from: "N", to: "O" },
    ]);
    expect(superseded.matches[0]?.reasons).toContain("demoted: superseded");
    const other = await rank([{ id: "O", title: "zzzz" }], {}, [
      { relationship: "verified_by", from: "N", to: "O" },
    ]);
    expect(other.matches[0]?.reasons).not.toContain("demoted: superseded");
  });

  test("names inherited source evidence and snippets bodies", async () => {
    const root = temp();
    writeFileSync(path.join(root, "r.md"), "# R\n\nThe body line.\n");
    const result = await rankIntentEntities(
      [
        { id: "S", type: "symbol", title: "zzzz", sourceFile: "src/a.ts" },
        { id: "R", type: "req", title: "zzzz" },
        { id: "D", title: "zzzz", source: "r.md" },
      ],
      { query: "zzzz", minScore: 0, sourceLocations: [{ path: "src/a.ts" }] },
      root,
      [{ relationship: "implements", from: "S", to: "R" }],
    );
    const byId = new Map(
      result.matches.map((match) => [match.entity.id, match]),
    );
    expect(byId.get("S")?.reasons).toContain("source location match");
    expect(byId.get("R")?.reasons).toContain(
      "implemented at the source location",
    );
    expect(byId.get("R")?.evidence.sourceMatches).toStrictEqual([
      { path: "src/a.ts", symbolId: "S", distance: 3 },
    ]);
    expect(byId.get("D")?.snippet).toBe("The body line.");
    expect(byId.get("S")?.snippet).toBeUndefined();
    expect(Object.hasOwn(byId.get("S") ?? {}, "snippet")).toBe(false);
  });

  test("defaults to no graph edges", async () => {
    const result = await rankIntentEntities(
      [{ id: "A", title: "alpha" }],
      { query: "alpha" },
      temp(),
    );
    expect(result.matches[0]?.evidence.graphPaths).toStrictEqual([]);
  });
});

describe("inheritedSourceMatches", () => {
  const locations = [{ path: "src/a.ts" }];
  test("passes a symbol's source matches to what it implements", () => {
    const inherited = inheritedSourceMatches(
      [
        { id: "S", type: "symbol", sourceFile: "src/a.ts" },
        { type: "symbol", sourceFile: "src/a.ts" },
        { id: "F", type: "fact", sourceFile: "src/a.ts" },
        { id: "Z", type: "symbol", sourceFile: "src/z.ts" },
      ],
      locations,
      [
        { relationship: "implements", from: "S", to: "R" },
        { relationship: "implements", from: "", to: "R" },
        { relationship: "verified_by", from: "S", to: "V" },
        { relationship: "implements", from: "F", to: "G" },
        { relationship: "implements", from: "Z", to: "Y" },
      ],
    );
    expect([...inherited.entries()]).toStrictEqual([
      [
        "R",
        [
          { path: "src/a.ts", symbolId: "S", distance: 3 },
          { path: "src/a.ts", symbolId: "", distance: 3 },
        ],
      ],
      ["Y", []],
    ]);
  });
});

describe("graph edges", () => {
  test("query the direct edges of the seeds", () => {
    const relationships =
      "implements,covered_by,executable_for,specified_by,verified_by,validates,constrains,requires_property,requires_predicate,requires_rule,supersedes";
    for (const depth of [1, 2] as const) {
      expect(graphGoal(["A", "it's"], depth)).toBe(
        `kb_relationship_edges([${relationships}], ['A','it''s'], Edges)`,
      );
    }
  });

  test("are read, normalized and capped", async () => {
    const goals: string[] = [];
    const port = (result: unknown) => ({
      query: async (goal: string) => {
        goals.push(goal);
        return result as Awaited<ReturnType<PrologPort["query"]>>;
      },
    });
    expect(
      await queryGraphEdges(port({ success: true, bindings: {} }), []),
    ).toStrictEqual([]);
    expect(goals).toStrictEqual([]);
    expect(
      await queryGraphEdges(
        port({ success: false, bindings: { Edges: "[[a,b,c]]" } }),
        ["A"],
      ),
    ).toStrictEqual([]);
    expect(
      await queryGraphEdges(port({ success: true, bindings: {} }), ["A"]),
    ).toStrictEqual([]);
    expect(
      await queryGraphEdges(
        port({
          success: true,
          bindings: { Edges: "[[implements,'kb:entity/S','file:///x/R']]" },
        }),
        ["A"],
      ),
    ).toStrictEqual([{ relationship: "implements", from: "S", to: "R" }]);
    const many = Array.from({ length: 2001 }, (_, index) => `[r,a${index},b]`);
    expect(
      await queryGraphEdges(
        port({ success: true, bindings: { Edges: `[${many.join(",")}]` } }),
        ["A"],
      ),
    ).toHaveLength(2000);
    expect(goals[0]).toBe(graphGoal(["A"], 1));
  });
});

describe("validateIntentSearchInput", () => {
  const message = (input: Partial<IntentSearchOptions>) => {
    try {
      validateIntentSearchInput({ query: "q", ...input });
      return null;
    } catch (error) {
      return (error as Error).message;
    }
  };

  test("accepts bounded scores and workspace-relative coordinates", () => {
    expect(message({})).toBeNull();
    expect(message({ minScore: 0 })).toBeNull();
    expect(message({ minScore: 1 })).toBeNull();
    expect(
      message({ sourceLocations: [{ path: "a/b.ts", line: 1, column: 1 }] }),
    ).toBeNull();
  });

  test("rejects everything else", () => {
    expect(message({ query: "  " })).toBe(
      "Search execution failed: query must be a non-empty string",
    );
    for (const minScore of [Number.NaN, Number.POSITIVE_INFINITY, -0.1, 1.1]) {
      expect(message({ minScore })).toBe(
        "Search execution failed: minScore must be between 0 and 1",
      );
    }
    for (const location of [
      { path: "  " },
      { path: "/abs.ts" },
      { path: "a/../b.ts" },
    ]) {
      expect(message({ sourceLocations: [location] })).toBe(
        "Search execution failed: sourceLocations.path must be workspace-relative",
      );
    }
    for (const line of [0, 1.5]) {
      expect(message({ sourceLocations: [{ path: "a", line }] })).toBe(
        "Search execution failed: sourceLocations.line must be a positive integer",
      );
    }
    for (const column of [0, 2.5]) {
      expect(message({ sourceLocations: [{ path: "a", column }] })).toBe(
        "Search execution failed: sourceLocations.column must be a positive integer",
      );
    }
  });
});

type Calls = [string, unknown][];

function stubDiscovery(
  pages: {
    list?: (input: unknown) => Record<string, unknown>[];
    load?: (input: unknown) => Record<string, unknown>[];
    rows?: (ids: readonly string[]) => Record<string, unknown>[];
  } = {},
) {
  const calls: Calls = [];
  const list = spyOn(discovery, "listSearchCandidates").mockImplementation(
    async (_prolog, input) => {
      calls.push(["list", input]);
      return pages.list?.(input) ?? [];
    },
  );
  const load = spyOn(discovery, "loadSearchCandidates").mockImplementation(
    async (_prolog, input) => {
      calls.push(["load", input]);
      return pages.load?.(input) ?? [];
    },
  );
  const rows = spyOn(discovery, "loadEntityRows").mockImplementation(
    async (_prolog, ids) => {
      calls.push(["rows", ids]);
      return pages.rows?.(ids) ?? [];
    },
  );
  return {
    calls,
    restore: () => {
      list.mockRestore();
      load.mockRestore();
      rows.mockRestore();
    },
  };
}

function port(
  edges = "[]",
  searchEntities = false,
): PrologPort & { goals: string[] } {
  const goals: string[] = [];
  return {
    goals,
    query: async (goal: string) => {
      goals.push(goal);
      return { success: true, bindings: { Edges: edges } };
    },
    nextSolution: async () => null,
    ...(searchEntities
      ? {
          searchEntities: async () => ({ rows: [] }) as never,
        }
      : {}),
  } as unknown as PrologPort & { goals: string[] };
}

const rowsOf = (prefix: string, count: number, type = "req") =>
  Array.from({ length: count }, (_, index) => ({
    type,
    id: `${prefix}${index}`,
  }));

describe("loadIntentCandidates", () => {
  test("searches each distinct term and lists the rest without an index", async () => {
    const stub = stubDiscovery({
      load: (input) =>
        (input as { query: string }).query === "alpha beta"
          ? [
              { type: "req", id: "A", title: "first" },
              { type: "req", id: "A", title: "second" },
              { id: "x" },
              { type: "", id: "x" },
            ]
          : [],
    });
    try {
      const loaded = await loadIntentCandidates(port(), {
        query: "alpha beta",
        type: "req",
        semanticFacets: { actors: ["alpha beta", "gamma"] },
      });
      expect(loaded).toStrictEqual([
        { type: "req", id: "A", title: "second" },
        { type: "", id: "x" },
      ]);
      expect(stub.calls).toStrictEqual([
        ["load", { query: "alpha beta", type: "req", maxCandidates: 10_000 }],
        ["load", { query: "gamma", type: "req", maxCandidates: 9_998 }],
        ["list", { type: "req", maxCandidates: 10_000 }],
      ]);
    } finally {
      stub.restore();
    }
  });

  test("reads source-located candidates and skips a blank topic", async () => {
    const stub = stubDiscovery({
      list: (input) =>
        (input as { sourceFile?: string }).sourceFile === "a.ts"
          ? rowsOf("S", 3)
          : [],
    });
    try {
      await loadIntentCandidates(port(), {
        query: "src/c.ts",
        sourceLocations: [{ path: "a.ts" }, { path: "b.ts" }],
      });
      expect(stub.calls).toStrictEqual([
        ["list", { sourceFile: "a.ts", maxCandidates: 10_000 }],
        ["list", { sourceFile: "b.ts", maxCandidates: 9_997 }],
      ]);
    } finally {
      stub.restore();
    }
  });

  test("lists a small corpus for facet queries on an indexed engine", async () => {
    for (const [count, extra] of [
      [19, true],
      [20, false],
    ] as const) {
      const stub = stubDiscovery({ load: () => rowsOf("L", count) });
      try {
        await loadIntentCandidates(port("[]", true), {
          query: "alpha",
          type: "req",
          semanticFacets: { actors: ["alpha"] },
        });
        expect(stub.calls.slice(1)).toStrictEqual(
          extra ? [["list", { type: "req", maxCandidates: 10_000 }]] : [],
        );
      } finally {
        stub.restore();
      }
    }
    for (const options of [
      { query: "alpha" } as IntentSearchOptions,
      {
        query: "alpha",
        semanticFacets: { actors: ["beta"] },
        sourceLocations: [{ path: "a.ts" }],
      },
    ]) {
      const stub = stubDiscovery();
      try {
        await loadIntentCandidates(port("[]", true), options);
        expect(
          stub.calls.filter(
            ([kind, input]) =>
              kind === "list" && !("sourceFile" in (input as object)),
          ),
        ).toStrictEqual([]);
      } finally {
        stub.restore();
      }
    }
    const untyped = stubDiscovery();
    try {
      await loadIntentCandidates(port("[]", true), {
        query: "alpha",
        semanticFacets: { actors: ["beta"] },
      });
      expect(untyped.calls.at(-1)).toStrictEqual([
        "list",
        { maxCandidates: 10_000 },
      ]);
    } finally {
      untyped.restore();
    }
  });

  test("stops at ten thousand candidates", async () => {
    const located = stubDiscovery({
      list: (input) =>
        (input as { sourceFile?: string }).sourceFile === "a.ts"
          ? rowsOf("S", 9_999)
          : [],
      load: () => [
        { type: "req", id: "S0", title: "updated" },
        { type: "req", id: "N1" },
        { type: "req", id: "N2" },
      ],
    });
    try {
      const loaded = await loadIntentCandidates(port(), {
        query: "alpha beta",
        semanticFacets: { actors: ["gamma"] },
        sourceLocations: [{ path: "a.ts" }, { path: "b.ts" }],
      });
      expect(loaded).toHaveLength(10_000);
      expect(loaded[0]).toStrictEqual({
        type: "req",
        id: "S0",
        title: "updated",
      });
      expect(loaded.at(-1)).toStrictEqual({ type: "req", id: "N1" });
      expect(located.calls.map(([kind]) => kind)).toStrictEqual([
        "list",
        "list",
        "load",
      ]);
    } finally {
      located.restore();
    }
    const full = stubDiscovery({ list: () => rowsOf("S", 10_000) });
    try {
      await loadIntentCandidates(port(), {
        query: "alpha",
        sourceLocations: [{ path: "a.ts" }, { path: "b.ts" }],
      });
      expect(full.calls.map(([kind]) => kind)).toStrictEqual(["list"]);
    } finally {
      full.restore();
    }
  });
});

describe("executeIntentSearch", () => {
  test("seeds the graph with the top matches and adds their neighbours", async () => {
    const related = Array.from({ length: 25 }, (_, index) => `R${index}`);
    const edges = [
      "[implements,'A','B']",
      ...related.map((id) => `[verified_by,'A','${id}']`),
    ];
    const prolog = port(`[${edges.join(",")}]`);
    const stub = stubDiscovery({
      load: () =>
        ["A", "B", "C", "D", "E", "F", "G"].map((id) => ({
          type: "req",
          id,
          title: "alpha",
        })),
      rows: (ids) => [
        { type: "req", id: ids[0], title: "alpha" },
        { type: "req", id: ids[0], title: "alpha" },
        { type: "req", id: "A", title: "alpha" },
        { id: "R1", title: "alpha" },
      ],
    });
    const corpus: unknown[] = [];
    try {
      const result = await executeIntentSearch(
        { query: "alpha" },
        prolog,
        temp(),
        (entities, bodies) => corpus.push(entities.length, bodies),
      );
      expect(prolog.goals).toStrictEqual([
        graphGoal(["A", "B", "C", "D", "E"], 1),
      ]);
      expect(stub.calls.find(([kind]) => kind === "rows")).toStrictEqual([
        "rows",
        related.slice(0, 20),
      ]);
      expect(
        result.matches
          .map((match) => `${match.entity.type ?? ""}:${match.entity.id}`)
          .sort(),
      ).toStrictEqual(
        [..."ABCDEFG"]
          .map((id) => `req:${id}`)
          .concat(["req:R0", ":R1"])
          .sort(),
      );
      expect(corpus[0]).toBe(7);
      expect(corpus[1]).toBeInstanceOf(Map);
      const a = result.matches.find((match) => match.entity.id === "A");
      expect(a?.evidence.graphPaths).toHaveLength(8);
    } finally {
      stub.restore();
    }
  });

  test("seeds the graph with source-located matches first", async () => {
    const prolog = port("[]");
    const located = Array.from({ length: 7 }, (_, index) => ({
      type: "symbol",
      id: `S${index}`,
      sourceFile: "src/a.ts",
    }));
    const stub = stubDiscovery({
      list: () => [
        { type: "req", id: "S0", sourceFile: "src/a.ts" },
        ...located,
        { type: "req", id: "X", title: "zzzz" },
      ],
    });
    try {
      await executeIntentSearch(
        { query: "zzzz", minScore: 0, sourceLocations: [{ path: "src/a.ts" }] },
        prolog,
        temp(),
      );
      expect(prolog.goals).toStrictEqual([
        graphGoal(["S0", "S1", "S2", "S3", "S4"], 1),
      ]);
      expect(stub.calls.at(-1)).toStrictEqual(["rows", []]);
    } finally {
      stub.restore();
    }
  });

  test("asks which matched or neighbouring facts are negative paths", async () => {
    const prolog = port("[[verified_by,'A','RF'],[verified_by,'A','RR']]");
    const stub = stubDiscovery({
      load: () => [
        { type: "req", id: "A", title: "alpha" },
        { type: "fact", id: "F1", title: "alpha" },
      ],
      rows: () => [
        { type: "fact", id: "RF", title: "alpha" },
        { type: "req", id: "RR", title: "alpha" },
      ],
    });
    try {
      await executeIntentSearch({ query: "alpha" }, prolog, temp());
      expect(prolog.goals.at(-1)).toBe(negativePathFactsGoal(["F1", "RF"]));
    } finally {
      stub.restore();
    }
  });

  test("asks for no graph without matches", async () => {
    const prolog = port("[]");
    const stub = stubDiscovery();
    try {
      const result = await executeIntentSearch(
        { query: "alpha" },
        prolog,
        temp(),
      );
      expect(prolog.goals).toStrictEqual([]);
      expect(result.matches).toStrictEqual([]);
    } finally {
      stub.restore();
    }
  });
});

describe("ranking details", () => {
  const rankIn = (
    root: string,
    entities: Record<string, unknown>[],
    options: Partial<IntentSearchOptions> = {},
    edges: Parameters<typeof rankIntentEntities>[3] = [],
  ) =>
    rankIntentEntities(
      entities,
      { query: "zzzz", minScore: 0, ...options },
      root,
      edges,
    );
  const scoreOf = (
    result: Awaited<ReturnType<typeof rankIntentEntities>>,
    id: string,
  ) => result.matches.find((match) => match.entity.id === id)?.score;

  test("demotes every non-governing status", () => {
    for (const status of [
      "superseded",
      "deprecated",
      "rejected",
      "retired",
      "obsolete",
      "archived",
    ]) {
      expect(
        scoreEntity(
          { status },
          [],
          [],
          [{ path: "x" }],
          [],
          new Map(),
          1,
          null,
        ),
      ).toStrictEqual({
        score: 0.2 * 0.5,
        reasons: [`demoted: ${status}`, "source location match"],
        matchedFacets: [],
      });
    }
  });

  test("matches an exact symbol whatever the title's spacing", () => {
    expect(
      sourceMatches({ title: " handleLogin ", sourceFile: "a.ts" }, [
        { path: "a.ts", symbol: "handleLogin" },
      ]),
    ).toStrictEqual([{ path: "a.ts", distance: 0 }]);
    expect(
      sourceMatches({ id: 3, sourceFile: "x" }, [{ path: "x", symbol: "q" }]),
    ).toStrictEqual([{ path: "x", distance: 2 }]);
  });

  test("falls back to the next line field when one is not a number", () => {
    for (const sourceLine of ["x", "7a", [3], true, null]) {
      expect(
        sourceMatches({ sourceFile: "a.ts", sourceLine, source_line: 7 }, [
          { path: "a.ts", line: 7 },
        ]),
      ).toStrictEqual([{ path: "a.ts", distance: 1 }]);
    }
  });

  test("counts body tokens in document frequency", async () => {
    const root = temp();
    writeFileSync(path.join(root, "a.md"), "beta words\n");
    const result = await rankIn(
      root,
      [
        { id: "A", title: "alpha", source: "a.md" },
        { id: "B", title: "beta" },
        { id: "C" },
        { id: "D" },
      ],
      { query: "alpha beta" },
    );
    const alpha = idf(1, 4);
    const beta = idf(2, 4);
    const placed = alpha + 0.5 * beta;
    const total = alpha + beta;
    expect(scoreOf(result, "A")).toBe(((placed / total + 1) / 2) * 0.58);
  });

  test("scores facet tokens as signal tokens", async () => {
    const result = await rankIn(temp(), [{ id: "A", title: "alpha" }], {
      semanticFacets: { actors: ["alpha"] },
    });
    expect(result.matches[0]?.reasons).toStrictEqual([
      "intent token match",
      "semantic facet match",
    ]);
  });

  test("saves the token cache after a search", async () => {
    const saved = process.env.KIBI_RUNTIME_DIR;
    const runtime = temp();
    process.env.KIBI_RUNTIME_DIR = runtime;
    delete process.env[KIBI_SEARCH_TOKEN_CACHE_ENV];
    try {
      await rankIn(temp(), [{ id: "A", title: "alpha" }], { query: "alpha" });
      expect(
        readdirSync(runtime).some((name) => name.startsWith("search-tokens-")),
      ).toBe(true);
    } finally {
      process.env[KIBI_SEARCH_TOKEN_CACHE_ENV] = "0";
      if (saved === undefined)
        Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
      else process.env.KIBI_RUNTIME_DIR = saved;
    }
  });

  test("prefers an entity's own source evidence to inherited evidence", async () => {
    const result = await rankIn(
      temp(),
      [
        { id: "S", type: "symbol", sourceFile: "src/a.ts" },
        { id: "R", type: "req", sourceFile: "src/a.ts" },
      ],
      { sourceLocations: [{ path: "src/a.ts" }] },
      [{ relationship: "implements", from: "S", to: "R" }],
    );
    const r = result.matches.find((match) => match.entity.id === "R");
    expect(r?.evidence.sourceMatches).toStrictEqual([
      { path: "src/a.ts", symbolId: "R", distance: 2 },
    ]);
    expect(r?.reasons).toContain("source location match");
  });

  test("keeps the first of equally good scorings", async () => {
    const root = temp();
    writeFileSync(path.join(root, "t.md"), "alpha\n");
    const result = await rankIn(
      root,
      [{ id: "T", title: "alpha beta gamma delta", source: "t.md" }],
      { query: "alpha beta, gamma delta" },
    );
    expect(result.matches[0]?.reasons).toContain("markdown body match");
  });

  test("flags matches within 0.05 of the threshold", async () => {
    const located = [{ id: "S", sourceFile: "src/a.ts" }];
    const sourceLocations = [{ path: "src/a.ts" }];
    const eligible = async (minScore: number) =>
      (await rankIn(temp(), located, { minScore, sourceLocations })).matches[0]
        ?.evidence.abstentionEligible;
    expect(await eligible(0.18)).toBe(true);
    expect(await eligible(0.1)).toBe(false);
    const boundary = await rankIn(temp(), [{ id: "A" }], {}, [
      { relationship: "verified_by", from: "A", to: "X" },
      { relationship: "verified_by", from: "A", to: "Y" },
    ]);
    expect(boundary.matches[0]?.evidence.abstentionEligible).toBe(false);
  });

  test("sorts stubs last in either input order", async () => {
    const stub = {
      id: "S",
      tags: ["bootstrap:provenance-stub"],
      title: "alpha",
    };
    const plain = { id: "N" };
    for (const entities of [
      [stub, plain],
      [plain, stub],
    ]) {
      const result = await rankIn(temp(), entities, { query: "alpha" });
      expect(result.matches.map((match) => match.entity.id)).toStrictEqual([
        "N",
        "S",
      ]);
    }
  });

  test("sorts entities without a type or id first", async () => {
    const result = await rankIn(temp(), [
      { id: "d" },
      { type: "b" },
      { id: "c" },
      { type: "b", id: "a" },
      { type: "b" },
    ]);
    expect(
      result.matches.map((match) => [match.entity.type, match.entity.id]),
    ).toStrictEqual([
      [undefined, "c"],
      [undefined, "d"],
      ["b", undefined],
      ["b", undefined],
      ["b", "a"],
    ]);
  });

  test("links only edges that touch the top match", async () => {
    const entities = [
      { id: "A", title: "alpha beta" },
      { id: "Y", title: "alpha" },
      { id: "Z", title: "alpha" },
    ];
    for (const edge of [
      { relationship: "verified_by", from: "X", to: "Y" },
      { relationship: "verified_by", from: "Y", to: "X" },
    ]) {
      const result = await rankIn(temp(), entities, { query: "alpha beta" }, [
        edge,
      ]);
      expect(result.analysis.topRivalMargin).toBe(
        (scoreOf(result, "A") ?? 0) - (scoreOf(result, "Y") ?? 0),
      );
    }
  });

  test("treats a rival without an id as linked through an empty id", async () => {
    const result = await rankIn(
      temp(),
      [{ id: "A", title: "alpha beta" }, { title: "alpha" }, { id: "Z" }],
      { query: "alpha beta" },
      [{ relationship: "verified_by", from: "A", to: "" }],
    );
    expect(result.analysis.topRivalMargin).toBe(scoreOf(result, "A") ?? -1);
  });
});

describe("candidate and neighbour bookkeeping", () => {
  test("loads untyped terms and lists without a type", async () => {
    const stub = stubDiscovery();
    try {
      await loadIntentCandidates(port(), { query: "alpha" });
      expect(stub.calls).toStrictEqual([
        ["load", { query: "alpha", maxCandidates: 10_000 }],
        ["list", { maxCandidates: 10_000 }],
      ]);
    } finally {
      stub.restore();
    }
  });

  test("seeds and merges entities without an id or type", async () => {
    const prolog = port(
      "[[verified_by,'',R1],[verified_by,'',Q1],[verified_by,'',Q2]]",
    );
    const stub = stubDiscovery({
      load: () => [{ title: "alpha" }, { id: "R1", title: "alpha" }],
      rows: () => [
        { id: "R1", title: "alpha" },
        { type: "req", id: "Q1", title: "alpha" },
        { type: "req", id: "Q2", title: "alpha" },
      ],
    });
    try {
      const result = await executeIntentSearch(
        { query: "alpha" },
        prolog,
        temp(),
      );
      expect(prolog.goals).toStrictEqual([graphGoal(["", "R1"], 1)]);
      expect(
        result.matches.map((match) => String(match.entity.id)).sort(),
      ).toStrictEqual(["Q1", "Q2", "R1", "undefined"]);
    } finally {
      stub.restore();
    }
  });

  test("dedupes candidates and neighbours with a missing or empty id", async () => {
    const stub = stubDiscovery({
      load: () => [
        { type: "req", title: "alpha" },
        { type: "req", id: "", title: "alpha" },
        { type: "fact", id: "", title: "alpha" },
        { id: "K", title: "alpha" },
        { type: "doc", title: "alpha" },
      ],
      rows: () => [
        { type: "doc", id: "", title: "alpha" },
        { type: "req", id: "", title: "alpha" },
        { type: "fact", title: "alpha" },
        { id: "K", title: "alpha" },
      ],
    });
    try {
      const result = await executeIntentSearch(
        { query: "alpha" },
        port("[]"),
        temp(),
      );
      expect(
        result.matches.map((match) => [match.entity.type, match.entity.id]),
      ).toStrictEqual([
        [undefined, "K"],
        ["doc", undefined],
        ["fact", ""],
        ["req", ""],
      ]);
    } finally {
      stub.restore();
    }
  });

  test("seeds source-located matches without an id", async () => {
    const prolog = port("[]");
    const stub = stubDiscovery({ list: () => [{ sourceFile: "src/a.ts" }] });
    try {
      await executeIntentSearch(
        { query: "zzzz", sourceLocations: [{ path: "src/a.ts" }] },
        prolog,
        temp(),
      );
      expect(prolog.goals).toStrictEqual([graphGoal([""], 1)]);
    } finally {
      stub.restore();
    }
  });

  test("validates coordinates only when they are given", () => {
    expect(() =>
      validateIntentSearchInput({
        query: "q",
        sourceLocations: [
          { path: "a.ts" },
          { path: "b.ts", column: 2 },
          { path: "c.ts", line: 3 },
        ],
      }),
    ).not.toThrow();
  });
});
