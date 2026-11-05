import { describe, expect, test } from "bun:test";
import {
  ENTITY_QUERY_CHUNK_SIZE,
  ENTITY_ROW_BATCH_LIMIT,
  ENTITY_ROW_KEYS,
  PROOF_CONTRACT_PAGE_SIZE,
  SEARCH_CANDIDATE_PAGE_SIZE,
  VALID_ENTITY_TYPES,
  buildEntityGoal,
  dedupeEntities,
  entityRowsGoal,
  listSearchCandidates,
  loadCurrentRequirementTexts,
  loadEntities,
  loadEntitiesPaged,
  loadEntityIds,
  loadEntityRows,
  loadSearchCandidates,
  paginateResults,
  queryEntitiesViaQuery,
  queryEntityChunks,
  reloadFullEntities,
  validateEntityType,
} from "../../../src/public/operations/discovery-entities.js";

// biome-ignore lint/suspicious/noExplicitAny: fake query answers
type Loose = any;
type Answer = {
  success: boolean;
  bindings: Record<string, string>;
  error?: string;
};

/** A query port that answers from `respond` and records each goal. */
function port(respond: (goal: string, index: number) => Answer) {
  const goals: string[] = [];
  const signals: unknown[] = [];
  const self: Loose = {
    goals,
    signals,
    query: async function (this: unknown, goal: string, signal?: unknown) {
      expect(this).toBe(self);
      goals.push(goal);
      signals.push(signal);
      return respond(goal, goals.length - 1);
    },
  };
  return self;
}

const ok = (bindings: Record<string, string>): Answer => ({
  success: true,
  bindings,
});
const rows = (...items: string[]) => `[${items.join(",")}]`;
const row = (id: string, type = "req", props = "[]") =>
  `['${id}',${type},${props}]`;
const many = (count: number, prefix = "R") =>
  rows(
    ...Array.from({ length: count }, (_, index) => row(`${prefix}${index}`)),
  );
const ids = (entities: readonly Record<string, unknown>[]) =>
  entities.map((entity) => entity.id);

describe("validateEntityType", () => {
  test("accepts the entity types and nothing", () => {
    expect(VALID_ENTITY_TYPES).toEqual([
      "req",
      "scenario",
      "test",
      "adr",
      "flag",
      "event",
      "symbol",
      "fact",
    ]);
    for (const type of [undefined, "", ...VALID_ENTITY_TYPES])
      expect(() => validateEntityType(type)).not.toThrow();
    expect(() => validateEntityType("reqs")).toThrow(
      new Error(
        "Invalid type 'reqs'. Valid types: req, scenario, test, adr, flag, event, symbol, fact. Use a single type value, or omit this parameter to query all entities.",
      ),
    );
  });
});

describe("buildEntityGoal", () => {
  test("builds the goal of each selection", () => {
    const goal = buildEntityGoal;
    expect(PROOF_CONTRACT_PAGE_SIZE).toBe(100);
    expect(goal({ type: "test", projection: "proof_contract" })).toBe(
      "kb_query_proof_contracts(none,100,0,Results)",
    );
    expect(
      goal({
        type: "test",
        projection: "proof_contract",
        id: "T'1",
        limit: 5,
        offset: 10,
      }),
    ).toBe("kb_query_proof_contracts(some('T''1'),5,10,Results)");
    expect(goal({ type: "test" })).toBe(
      "findall([Id,'test',Props], kb_entity(Id, 'test', Props), Results)",
    );
    expect(goal({ type: "req", projection: "proof_contract" })).toBe(
      "findall([Id,'req',Props], kb_entity(Id, 'req', Props), Results)",
    );
    expect(goal({ sourceFile: "a'.md", type: "r'q", id: "X" })).toBe(
      "findall([Id,'r''q',Props], (kb_entities_by_source('a''.md', SourceIds), member(Id, SourceIds), kb_entity(Id, 'r''q', Props)), Results)",
    );
    expect(goal({ sourceFile: "a.md" })).toBe(
      "findall([Id,Type,Props], (kb_entities_by_source('a.md', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)",
    );
    expect(goal({ id: "I'd", type: "r'q", tags: ["t"] })).toBe(
      "findall(['I''d','r''q',Props], kb_entity('I''d', 'r''q', Props), Results)",
    );
    expect(goal({ id: "I'd", tags: ["t"] })).toBe(
      "findall(['I''d',Type,Props], kb_entity('I''d', Type, Props), Results)",
    );
    expect(goal({ tags: ["a'", "b"], type: "r'q" })).toBe(
      "findall([Id,'r''q',Props], (member(Tag, ['a''','b']), kb_entities_by_tag(Tag, TagIds), member(Id, TagIds), kb_entity(Id, 'r''q', Props)), Results)",
    );
    expect(goal({ tags: ["a"] })).toBe(
      "findall([Id,Type,Props], (member(Tag, ['a']), kb_entities_by_tag(Tag, TagIds), member(Id, TagIds), kb_entity(Id, Type, Props)), Results)",
    );
    expect(goal({ tags: [], type: "r'q", limit: 3 })).toBe(
      "kb_query_entities('r''q', none, [], none, 3, 0, Results, Count)",
    );
    expect(goal({ type: "req", limit: 3, offset: 6 })).toBe(
      "kb_query_entities('req', none, [], none, 3, 6, Results, Count)",
    );
    expect(goal({ type: "r'q" })).toBe(
      "findall([Id,'r''q',Props], kb_entity(Id, 'r''q', Props), Results)",
    );
    expect(goal({ tags: [] })).toBe(
      "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
    );
    expect(goal({ sourceFile: "", id: "" })).toBe(
      "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
    );
  });
});

describe("loadEntities", () => {
  test("reads results, a single result or nothing", async () => {
    const answers = [
      ok({
        Results: rows(row("A"), row("A"), row("A", "test"), row("B")),
        Result: "['Z',req,[]]",
      }),
      ok({ Result: "['Z',req,[title=\"U\"]]" }),
      ok({}),
      ok({ Results: "", Result: "" }),
    ];
    const prolog = port((_goal, index) => answers[index] as Answer);
    expect(
      (await loadEntities(prolog, { type: "req" })).map(
        (entity) => `${entity.type}:${entity.id}`,
      ),
    ).toEqual(["req:A", "test:A", "req:B"]);
    expect(await loadEntities(prolog, {})).toEqual([
      { title: "U", id: "Z", type: "req" },
    ]);
    expect(await loadEntities(prolog, {})).toEqual([]);
    expect(await loadEntities(prolog, {})).toEqual([]);
    expect(prolog.goals[0]).toBe(
      "findall([Id,'req',Props], kb_entity(Id, 'req', Props), Results)",
    );
  });

  test("validates the type and surfaces a failing query", async () => {
    const prolog = port(() => ok({}));
    await expect(loadEntities(prolog, { type: "nope" })).rejects.toThrow(
      "Invalid type 'nope'",
    );
    expect(prolog.goals).toEqual([]);
    const failing = (error?: string) =>
      port(() => ({ success: false, bindings: {}, error }) as Answer);
    await expect(loadEntities(failing("boom"), {})).rejects.toThrow(/^boom$/);
    await expect(loadEntities(failing(""), {})).rejects.toThrow(
      /^Query failed with unknown error$/,
    );
    await expect(loadEntities(failing(), {})).rejects.toThrow(
      /^Query failed with unknown error$/,
    );
  });

  test("pages through every proof contract", async () => {
    const pages = [many(100, "P"), many(100, "Q"), many(3, "S")];
    const prolog = port((_goal, index) => ok({ Results: pages[index] }));
    const entities = await loadEntities(prolog, {
      type: "test",
      projection: "proof_contract",
    });
    expect(entities).toHaveLength(203);
    expect(prolog.goals).toEqual([
      "kb_query_proof_contracts(none,100,0,Results)",
      "kb_query_proof_contracts(none,100,100,Results)",
      "kb_query_proof_contracts(none,100,200,Results)",
    ]);
    const exact = port((_goal, index) =>
      ok({ Results: index === 0 ? many(100) : "[]" }),
    );
    await loadEntities(exact, { type: "test", projection: "proof_contract" });
    expect(exact.goals).toHaveLength(2);
    for (const extra of [{ id: "T" }, { limit: 100 }, { offset: 0 }]) {
      const single = port(() => ok({ Results: many(100) }));
      await loadEntities(single, {
        type: "test",
        projection: "proof_contract",
        ...extra,
      });
      expect(single.goals).toHaveLength(1);
    }
    const plain = port(() => ok({ Results: many(100) }));
    await loadEntities(plain, { type: "test" });
    await loadEntities(plain, { type: "req", projection: "proof_contract" });
    expect(plain.goals).toHaveLength(2);
  });

  test("keeps entities that carry a requested tag", async () => {
    const prolog = port(() =>
      ok({
        Results: rows(
          row("A", "req", "[tags=[' x ',y]]"),
          row("B", "req", "[tags=[z]]"),
          row("C", "req", '[tags="x"]'),
          row("D", "req", "[]"),
          row("E", "req", "[tags=[1]]"),
        ),
      }),
    );
    expect(
      ids(await loadEntities(prolog, { tags: [" x", "1 "], type: "req" })),
    ).toEqual(["A", "E"]);
    expect(ids(await loadEntities(prolog, { tags: [] }))).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
    ]);
  });
});

describe("loadEntitiesPaged", () => {
  test("pages until a short page and dedupes", async () => {
    const pages = [
      rows(row("A"), row("B")),
      rows(row("B"), row("C")),
      rows(row("D")),
    ];
    const prolog = port((_goal, index) => ok({ Results: pages[index] }));
    expect(ids(await loadEntitiesPaged(prolog, "req", 2))).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
    expect(prolog.goals).toEqual([
      "kb_query_entities('req', none, [], none, 2, 0, Results, Count)",
      "kb_query_entities('req', none, [], none, 2, 2, Results, Count)",
      "kb_query_entities('req', none, [], none, 2, 4, Results, Count)",
    ]);
    const full = port((_goal, index) =>
      ok({ Results: index === 0 ? many(25) : "[]" }),
    );
    expect(await loadEntitiesPaged(full, "req")).toHaveLength(25);
    expect(full.goals).toEqual([
      "kb_query_entities('req', none, [], none, 25, 0, Results, Count)",
      "kb_query_entities('req', none, [], none, 25, 25, Results, Count)",
    ]);
    const single = port(() => ok({ Results: "[]" }));
    expect(await loadEntitiesPaged(single, "req", 1)).toEqual([]);
  });

  test("refuses a page size that is not a positive integer", async () => {
    const prolog = port(() => ok({}));
    for (const size of [0, -1, 1.5])
      await expect(loadEntitiesPaged(prolog, "req", size)).rejects.toThrow(
        "loadEntitiesPaged pageSize must be a positive integer",
      );
    expect(prolog.goals).toEqual([]);
  });
});

describe("paginateResults", () => {
  test("slices one page", () => {
    const items = Array.from({ length: 150 }, (_, index) => index);
    expect(paginateResults(items)).toEqual(items.slice(0, 100));
    expect(paginateResults(items, 3, 5)).toEqual([5, 6, 7]);
    expect(paginateResults(items, 3)).toEqual([0, 1, 2]);
  });
});

describe("loadSearchCandidates", () => {
  test("uses the indexed engine method bound to its port", async () => {
    const signal = new AbortController().signal;
    const seen: unknown[] = [];
    const engine: Loose = {
      async searchEntities(this: unknown, page: unknown, given: unknown) {
        expect(this).toBe(engine);
        seen.push([page, given]);
        return seen.length === 1
          ? { entities: [{ id: "A" }, { id: "B" }], count: 3 }
          : { entities: [{ id: "C" }], count: 3 };
      },
    };
    expect(
      await loadSearchCandidates(engine, { query: "q", type: "req" }, signal),
    ).toEqual([{ id: "A" }, { id: "B" }, { id: "C" }]);
    expect(seen).toEqual([
      [{ query: "q", type: "req", limit: 500, offset: 0 }, signal],
      [{ query: "q", type: "req", limit: 500, offset: 2 }, signal],
    ]);
    expect(SEARCH_CANDIDATE_PAGE_SIZE).toBe(500);
    seen.length = 0;
    await loadSearchCandidates(engine, { query: "q", maxCandidates: 1 });
    expect(seen).toStrictEqual([
      [{ query: "q", limit: 500, offset: 0 }, undefined],
    ]);
  });

  test("falls back to the Prolog search goal", async () => {
    const signal = new AbortController().signal;
    const prolog = port(() =>
      ok({ Rows: rows(row("A"), row("B"), row("C")), Count: "9" }),
    );
    expect(
      ids(
        await loadSearchCandidates(
          prolog,
          { query: "it's", maxCandidates: 2 },
          signal,
        ),
      ),
    ).toEqual(["A", "B"]);
    expect(prolog.goals).toEqual([
      "kb_search_entities(none, 'it''s', 500, 0, Rows, Count)",
    ]);
    expect(prolog.signals).toEqual([signal]);
    const typed = port(() => ok({ Rows: rows(row("A")), Count: "1" }));
    await loadSearchCandidates(typed, { query: "q", type: "r'q" });
    expect(typed.goals).toEqual([
      "kb_search_entities('r''q', 'q', 500, 0, Rows, Count)",
    ]);
    await expect(
      loadSearchCandidates(
        port(() => ({ success: false, bindings: {} })),
        { query: "q" },
      ),
    ).rejects.toThrow(/^Indexed search candidate query failed$/);
    expect(await loadSearchCandidates({} as Loose, { query: "q" })).toEqual([]);
  });

  test("halves an overflowing page down to one row", async () => {
    const limits: number[] = [];
    const engine: Loose = {
      async searchEntities(page: { limit: number; offset: number }) {
        limits.push(page.limit);
        if (page.limit > 125) throw new Error("spawnSync ENOBUFS");
        return page.offset === 0
          ? { entities: [{ id: "A" }], count: 2 }
          : { entities: [{ id: "B" }], count: 2 };
      },
    };
    expect(await loadSearchCandidates(engine, { query: "q" })).toEqual([
      { id: "A" },
      { id: "B" },
    ]);
    expect(limits).toEqual([500, 250, 125, 125]);
    const always: Loose = {
      async searchEntities(page: { limit: number }) {
        limits.push(page.limit);
        throw new Error("ENOBUFS");
      },
    };
    limits.length = 0;
    await expect(loadSearchCandidates(always, { query: "q" })).rejects.toThrow(
      "ENOBUFS",
    );
    expect(limits).toEqual([500, 250, 125, 62, 31, 15, 7, 3, 1]);
    for (const failure of [new Error("other"), "ENOBUFS"]) {
      limits.length = 0;
      const broken: Loose = {
        async searchEntities(page: { limit: number }) {
          limits.push(page.limit);
          throw failure;
        },
      };
      await expect(loadSearchCandidates(broken, { query: "q" })).rejects.toBe(
        failure,
      );
      expect(limits).toEqual([500]);
    }
  });

  test("stops at an empty page and at the candidate bound", async () => {
    const calls: number[] = [];
    const empty: Loose = {
      async searchEntities(page: { offset: number }) {
        calls.push(page.offset);
        return { entities: [], count: 10 };
      },
    };
    expect(await loadSearchCandidates(empty, { query: "q" })).toEqual([]);
    expect(calls).toEqual([0]);
    const bounded: Loose = {
      async searchEntities(page: { offset: number }) {
        calls.push(page.offset);
        return { entities: [{ id: page.offset }], count: 10 };
      },
    };
    calls.length = 0;
    expect(
      await loadSearchCandidates(bounded, { query: "q", maxCandidates: 2 }),
    ).toEqual([{ id: 0 }, { id: 1 }]);
    expect(calls).toEqual([0, 1]);
    calls.length = 0;
    expect(
      await loadSearchCandidates(bounded, { query: "q", maxCandidates: 0 }),
    ).toEqual([]);
    expect(calls).toEqual([]);
  });
});

describe("listSearchCandidates", () => {
  test("lists projected rows of a type and source", async () => {
    const signal = new AbortController().signal;
    const prolog = port((_goal, index) =>
      index === 0
        ? ok({ Rows: rows(row("A"), row("B")), Count: "3" })
        : ok({ Rows: rows(row("C")), Count: "3" }),
    );
    expect(
      ids(
        await listSearchCandidates(
          prolog,
          { type: "r'q", sourceFile: "a'.md", maxCandidates: 10 },
          signal,
        ),
      ),
    ).toEqual(["A", "B", "C"]);
    expect(prolog.goals).toEqual([
      "kb_list_search_candidates('r''q', 'a''.md', 500, 0, Rows, Count)",
      "kb_list_search_candidates('r''q', 'a''.md', 500, 2, Rows, Count)",
    ]);
    expect(prolog.signals).toEqual([signal, signal]);
    const bounded = port(() =>
      ok({ Rows: rows(row("A"), row("B"), row("C")), Count: "9" }),
    );
    expect(
      ids(await listSearchCandidates(bounded, { maxCandidates: 2 })),
    ).toEqual(["A", "B"]);
    expect(bounded.goals).toHaveLength(1);
    const bare = port(() => ok({ Rows: "[]", Count: "0" }));
    await listSearchCandidates(bare, { maxCandidates: 1 });
    await listSearchCandidates(bare, {
      type: "",
      sourceFile: "",
      maxCandidates: 1,
    });
    expect(bare.goals).toEqual([
      "kb_list_search_candidates(none, 500, 0, Rows, Count)",
      "kb_list_search_candidates(none, '', 500, 0, Rows, Count)",
    ]);
    const failing = port(() => ({ success: false, bindings: {} }));
    await expect(
      listSearchCandidates(failing, { maxCandidates: 1 }),
    ).rejects.toThrow(/^Search candidate listing failed$/);
    const labelled = port(() => ({
      success: false,
      bindings: {},
      error: "engine down",
    }));
    await expect(
      listSearchCandidates(labelled, { maxCandidates: 1 }),
    ).rejects.toThrow(/^engine down$/);
  });

  test("counts the rows when the engine gives no number", async () => {
    const noCount = port((_goal, index) =>
      index === 0 ? ok({ Rows: rows(row("A")) }) : ok({}),
    );
    expect(
      ids(await listSearchCandidates(noCount, { maxCandidates: 5 })),
    ).toEqual(["A"]);
    expect(noCount.goals).toHaveLength(1);
    const text = port((_goal, index) =>
      index === 0
        ? ok({ Rows: rows(row("A"), row("B")), Count: "many" })
        : ok({ Rows: rows(row("C")), Count: "many" }),
    );
    expect(ids(await listSearchCandidates(text, { maxCandidates: 5 }))).toEqual(
      ["A", "B"],
    );
    expect(text.goals).toHaveLength(1);
  });
});

describe("queryEntityChunks", () => {
  test("reads bounded chunks and keeps the first count", async () => {
    expect(ENTITY_QUERY_CHUNK_SIZE).toBe(25);
    const asked: Loose[] = [];
    const reader = async (input: Loose) => {
      asked.push(input);
      return {
        entities: Array.from({ length: input.limit }, (_, index) => ({
          id: input.offset + index,
        })),
        count: 1000 + asked.length,
      };
    };
    const result = await queryEntityChunks(reader, {
      type: "req",
      limit: 60,
      offset: 7,
    } as Loose);
    expect(result.count).toBe(1001);
    expect(result.entities).toHaveLength(60);
    expect(asked).toEqual([
      { type: "req", limit: 25, offset: 7 },
      { type: "req", limit: 25, offset: 32 },
      { type: "req", limit: 10, offset: 57 },
    ]);
    asked.length = 0;
    expect(
      await queryEntityChunks(reader, { limit: 0, offset: 0 } as Loose),
    ).toEqual({ entities: [], count: 1001 });
    expect(asked).toEqual([{ limit: 0, offset: 0 }]);
    const short = async (input: Loose) => {
      asked.push(input);
      return { entities: [{ id: 1 }], count: 1 };
    };
    asked.length = 0;
    expect(
      await queryEntityChunks(short, { limit: 50, offset: 0 } as Loose),
    ).toEqual({ entities: [{ id: 1 }], count: 1 });
    expect(asked).toHaveLength(1);
  });
});

describe("queryEntitiesViaQuery", () => {
  test("builds the indexed query of each chunk", async () => {
    const signal = new AbortController().signal;
    const prolog = port(() => ok({ Rows: rows(row("A")), Count: "1" }));
    expect(
      await queryEntitiesViaQuery(
        prolog,
        {
          type: "r'q",
          id: "I'd",
          tags: ["a'", "b"],
          sourceFile: "s'.md",
          limit: 5,
          offset: 2,
        } as Loose,
        signal,
      ),
    ).toEqual({ entities: [{ id: "A", type: "req" }], count: 1 });
    await queryEntitiesViaQuery(prolog, { limit: 5, offset: 0 } as Loose);
    expect(prolog.goals).toEqual([
      "kb_query_entities('r''q', 'I''d', ['a''','b'], 's''.md', 5, 2, Rows, Count)",
      "kb_query_entities(none, none, [], none, 5, 0, Rows, Count)",
    ]);
    expect(prolog.signals).toEqual([signal, undefined]);
    expect(
      await queryEntitiesViaQuery(
        port(() => ok({ Rows: rows(row("A")) })),
        { limit: 1, offset: 0 } as Loose,
      ),
    ).toEqual({ entities: [{ id: "A", type: "req" }], count: 0 });
    expect(
      await queryEntitiesViaQuery(
        port(() => ok({ Count: "4" })),
        { limit: 1, offset: 0 } as Loose,
      ),
    ).toEqual({ entities: [], count: 4 });
    const failing = port(() => ({ success: false, bindings: {} }));
    await expect(
      queryEntitiesViaQuery(failing, { limit: 1, offset: 0 } as Loose),
    ).rejects.toThrow(/^Indexed entity query failed$/);
  });
});

describe("loadEntityIds", () => {
  test("lists every id", async () => {
    const prolog = port(() => ok({ Ids: "['kb:entity/A',b]" }));
    expect(await loadEntityIds(prolog)).toEqual(["A", "b"]);
    expect(prolog.goals).toEqual(["kb_entity_ids(Ids)"]);
    expect(await loadEntityIds(port(() => ok({})))).toEqual([]);
    await expect(
      loadEntityIds(port(() => ({ success: false, bindings: {} }))),
    ).rejects.toThrow(/^Entity id enumeration failed: Unknown error$/);
    await expect(
      loadEntityIds(
        port(() => ({ success: false, bindings: {}, error: "down" })),
      ),
    ).rejects.toThrow(/^Entity id enumeration failed: down$/);
  });
});

describe("loadCurrentRequirementTexts", () => {
  test("reads current requirements in id order", async () => {
    const prolog = port((goal) =>
      goal.startsWith("findall(R")
        ? ok({ Ids: "['kb:entity/REQ-b','REQ-a',x,'']" })
        : ok({
            Results: rows(
              row("REQ-b", "req", '[title="B",semantic_text="sb"]'),
              row("REQ-a", "req", "[title=[x],semantic_text=[y]]"),
              row("x", "test", '[title="X"]'),
              row("", "req", '[title="E"]'),
            ),
          }),
    );
    expect(await loadCurrentRequirementTexts(prolog)).toEqual([
      { id: "REQ-a", title: "", semanticText: "" },
      { id: "REQ-b", title: "B", semanticText: "sb" },
    ]);
    expect(prolog.goals).toEqual([
      "findall(R, kb:current_req(R), Ids)",
      "findall([Id,Type,Row], (member(Id, ['REQ-b','REQ-a','x']), kb_entity(Id, Type, Props), findall(Key=Value, (member(Key=Value, Props), memberchk(Key, ['id','title','semantic_text'])), Row)), Results)",
    ]);
    const none = port(() => ok({}));
    expect(await loadCurrentRequirementTexts(none)).toEqual([]);
    expect(none.goals).toHaveLength(1);
    await expect(
      loadCurrentRequirementTexts(
        port(() => ({ success: false, bindings: {} })),
      ),
    ).rejects.toThrow(
      /^Current requirement enumeration failed: Unknown error$/,
    );
    await expect(
      loadCurrentRequirementTexts(
        port(() => ({ success: false, bindings: {}, error: "down" })),
      ),
    ).rejects.toThrow(/^Current requirement enumeration failed: down$/);
  });
});

describe("entity rows", () => {
  test("projects the row keys", () => {
    expect(ENTITY_ROW_KEYS).toEqual([
      "id",
      "title",
      "status",
      "priority",
      "severity",
      "owner",
      "tags",
      "source",
      "sourceFile",
      "sourceLine",
      "sourceColumn",
      "sourceEndLine",
      "sourceEndColumn",
      "source_line",
      "source_end_line",
      "updated_at",
      "created_at",
      "semantic_text",
      "text_ref",
      "fact_kind",
      "expects",
      "approved_by",
      "approval_ref",
    ]);
    expect(entityRowsGoal(["a'b"], ["k'"])).toBe(
      "findall([Id,Type,Row], (member(Id, ['a''b']), kb_entity(Id, Type, Props), findall(Key=Value, (member(Key=Value, Props), memberchk(Key, ['k'''])), Row)), Results)",
    );
    expect(entityRowsGoal(["a"])).toBe(
      `findall([Id,Type,Row], (member(Id, ['a']), kb_entity(Id, Type, Props), findall(Key=Value, (member(Key=Value, Props), memberchk(Key, [${ENTITY_ROW_KEYS.map((key) => `'${key}'`).join(",")}])), Row)), Results)`,
    );
  });

  test("loads rows in bounded batches", async () => {
    expect(ENTITY_ROW_BATCH_LIMIT).toBe(200);
    const list = Array.from({ length: 401 }, (_, index) => `E${index}`);
    const prolog = port((goal) => {
      const first = /member\(Id, \['(E\d+)'/.exec(goal)?.[1] as string;
      return ok({ Results: rows(row(first), row(first)) });
    });
    const loaded = await loadEntityRows(prolog, ["", ...list, "E0"], ["id"]);
    expect(ids(loaded)).toEqual(["E0", "E200", "E400"]);
    expect(prolog.goals).toHaveLength(3);
    expect(prolog.goals[1]).toContain("member(Id, ['E200',");
    expect(prolog.goals[1]).toContain("'E399']");
    expect(prolog.goals[2]).toContain("member(Id, ['E400']),");
    expect(prolog.goals[0]).toContain("memberchk(Key, ['id'])");
    const none = port(() => ok({}));
    expect(await loadEntityRows(none, [])).toEqual([]);
    expect(none.goals).toEqual([]);
    expect(await loadEntityRows(none, ["a"])).toEqual([]);
    expect(none.goals[0]).toContain("'approval_ref'");
    for (const error of [undefined, ""])
      await expect(
        loadEntityRows(
          port(() => ({ success: false, bindings: {}, error }) as Answer),
          ["a"],
        ),
      ).rejects.toThrow(/^Entity row query failed$/);
    await expect(
      loadEntityRows(
        port(() => ({ success: false, bindings: {}, error: "down" })),
        ["a"],
      ),
    ).rejects.toThrow(/^down$/);
  });
});

describe("reloadFullEntities", () => {
  test("replaces each match with its full entity", async () => {
    const prolog = port((goal) =>
      goal.includes("'A'")
        ? ok({ Results: rows(row("A", "req", '[title="Full"]')) })
        : ok({}),
    );
    const matches: { entity: Record<string, unknown>; score: number }[] = [
      { entity: { id: "A", type: "req" }, score: 1 },
      { entity: { id: "B", type: 7 }, score: 2 },
      { entity: { id: "" }, score: 3 },
      { entity: {}, score: 4 },
    ];
    const reloaded = await reloadFullEntities(prolog, matches);
    expect(reloaded).toEqual([
      { entity: { title: "Full", id: "A", type: "req" }, score: 1 },
      matches[1],
      matches[2],
      matches[3],
    ]);
    expect(prolog.goals).toEqual([
      "findall(['A','req',Props], kb_entity('A', 'req', Props), Results)",
      "findall(['B',Type,Props], kb_entity('B', Type, Props), Results)",
    ]);
  });
});

describe("dedupeEntities", () => {
  test("keeps the first entity of each type and id", () => {
    expect(
      dedupeEntities([
        { id: "a" },
        { id: "a", type: undefined },
        { id: "a", type: "undefined" },
        { type: "x" },
        { id: "x" },
        { id: "a", type: "req" },
        { id: "a", type: "req", extra: 1 },
      ]),
    ).toEqual([
      { id: "a" },
      { id: "a", type: "undefined" },
      { type: "x" },
      { id: "x" },
      { id: "a", type: "req" },
    ]);
  });
});
