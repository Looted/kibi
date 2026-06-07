import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "../../src/prolog.js";

const codecState = {
  parsedLists: [] as string[][],
  listEntities: [] as Array<Record<string, unknown>>,
  bindingEntity: {} as Record<string, unknown>,
};

const escapeAtomMock = mock((value: string) => value.replace(/'/g, "''"));
const parseListOfListsMock = mock((value: string) => {
  void value;
  return codecState.parsedLists;
});
const parseEntityFromListMock = mock((value: string[]) => {
  const index = codecState.parsedLists.findIndex((entry) => entry === value);
  return codecState.listEntities[index] ?? {};
});
const parseEntityFromBindingMock = mock((value: string) => {
  void value;
  return codecState.bindingEntity;
});

const service = await import("../../src/query/service.js");

service._setQueryCodecDepsForTests({
  escapeAtom: escapeAtomMock,
  parseListOfLists: parseListOfListsMock,
  parseEntityFromList: parseEntityFromListMock,
  parseEntityFromBinding: parseEntityFromBindingMock,
});

type QueryableProlog = {
  query: (goal: string) => Promise<{
    success: boolean;
    bindings?: Record<string, string>;
    error?: string;
  }>;
};

function asPrologProcess(prolog: QueryableProlog): PrologProcess {
  return prolog as unknown as PrologProcess;
}

describe("query service", () => {
  beforeEach(() => {
    mock.restore();
    service._resetQueryCodecDepsForTests();
    service._setQueryCodecDepsForTests({
      escapeAtom: escapeAtomMock,
      parseListOfLists: parseListOfListsMock,
      parseEntityFromList: parseEntityFromListMock,
      parseEntityFromBinding: parseEntityFromBindingMock,
    });
    codecState.parsedLists = [];
    codecState.listEntities = [];
    codecState.bindingEntity = {};
    escapeAtomMock.mockClear();
    parseListOfListsMock.mockClear();
    parseEntityFromListMock.mockClear();
    parseEntityFromBindingMock.mockClear();
  });

  afterEach(() => {
    service._resetQueryCodecDepsForTests();
  });

  describe("buildEntityQueryGoal", () => {
    test("builds a sourceFile + type query with escaped atoms", () => {
      const goal = service.buildEntityQueryGoal({
        sourceFile: "src/o'hare.ts",
        type: "req's",
      });

      expect(goal).toBe(
        "findall([Id,'req''s',Props], (kb_entities_by_source('src/o''hare.ts', SourceIds), member(Id, SourceIds), kb_entity(Id, 'req''s', Props)), Results)",
      );
      expect(escapeAtomMock).toHaveBeenCalledTimes(2);
    });

    test("builds a sourceFile query without a type", () => {
      expect(
        service.buildEntityQueryGoal({ sourceFile: "src/query/service.ts" }),
      ).toBe(
        "findall([Id,Type,Props], (kb_entities_by_source('src/query/service.ts', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)",
      );
    });

    test("builds queries for id + type, id only, tags, type only, and fallback", () => {
      expect(service.buildEntityQueryGoal({ id: "REQ-1", type: "req" })).toBe(
        "findall(['REQ-1','req',Props], kb_entity('REQ-1', 'req', Props), Results)",
      );
      expect(service.buildEntityQueryGoal({ id: "REQ-2" })).toBe(
        "findall(['REQ-2',Type,Props], kb_entity('REQ-2', Type, Props), Results)",
      );
      expect(
        service.buildEntityQueryGoal({ tags: ["auth"], type: "symbol" }),
      ).toBe(
        "findall([Id,'symbol',Props], kb_entity(Id, 'symbol', Props), Results)",
      );
      expect(service.buildEntityQueryGoal({ tags: ["auth"] })).toBe(
        "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      );
      expect(service.buildEntityQueryGoal({ type: "fact" })).toBe(
        "findall([Id,'fact',Props], kb_entity(Id, 'fact', Props), Results)",
      );
      expect(service.buildEntityQueryGoal({})).toBe(
        "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      );
    });
  });

  describe("queryEntities", () => {
    test("parses Results bindings, filters tags, deduplicates matches, and paginates", async () => {
      codecState.parsedLists = [["a"], ["b"], ["c"], ["d"]];
      codecState.listEntities = [
        { id: "REQ-1", type: "req", tags: [" auth ", "core"] },
        { id: "REQ-1", type: "req", tags: ["auth"] },
        { id: "REQ-2", type: "req", tags: ["other"] },
        { id: "REQ-3", type: "req", tags: "auth" },
      ];
      const prolog: QueryableProlog = {
        query: mock(async () => ({
          success: true,
          bindings: { Results: "ignored" },
        })),
      };

      const result = await service.queryEntities(asPrologProcess(prolog), {
        type: "req",
        tags: ["auth"],
        offset: 0,
        limit: 10,
      });

      expect(prolog.query).toHaveBeenCalledWith(
        "findall([Id,'req',Props], kb_entity(Id, 'req', Props), Results)",
      );
      expect(parseListOfListsMock).toHaveBeenCalledWith("ignored");
      expect(parseEntityFromListMock).toHaveBeenCalledTimes(4);
      expect(result).toEqual({
        entities: [{ id: "REQ-1", type: "req", tags: [" auth ", "core"] }],
        totalCount: 1,
      });
    });

    test("parses a single Result binding", async () => {
      codecState.bindingEntity = {
        id: "REQ-9",
        type: "req",
        title: "Single",
      };
      const prolog: QueryableProlog = {
        query: mock(async () => ({
          success: true,
          bindings: { Result: "one" },
        })),
      };

      expect(await service.queryEntities(asPrologProcess(prolog), {})).toEqual({
        entities: [{ id: "REQ-9", type: "req", title: "Single" }],
        totalCount: 1,
      });
      expect(parseEntityFromBindingMock).toHaveBeenCalledWith("one");
    });

    test("returns an empty page when bindings are empty and applies default pagination", async () => {
      const prolog: QueryableProlog = {
        query: mock(async () => ({
          success: true,
          bindings: {},
        })),
      };

      expect(await service.queryEntities(asPrologProcess(prolog), {})).toEqual({
        entities: [],
        totalCount: 0,
      });
      expect(prolog.query).toHaveBeenCalledWith(
        "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      );
    });

    test("applies offset and limit after filtering", async () => {
      codecState.parsedLists = [["a"], ["b"], ["c"]];
      codecState.listEntities = [
        { id: "REQ-1", type: "req", tags: ["auth"] },
        { id: "REQ-2", type: "req", tags: ["auth"] },
        { id: "REQ-3", type: "req", tags: ["auth"] },
      ];
      const prolog: QueryableProlog = {
        query: mock(async () => ({
          success: true,
          bindings: { Results: "ignored" },
        })),
      };

      expect(
        await service.queryEntities(asPrologProcess(prolog), {
          tags: ["auth"],
          offset: 1,
          limit: 1,
        }),
      ).toEqual({
        entities: [{ id: "REQ-2", type: "req", tags: ["auth"] }],
        totalCount: 3,
      });
    });

    test("throws the reported query error or a fallback message", async () => {
      const failingProlog: QueryableProlog = {
        query: mock(async () => ({ success: false, error: "boom" })),
      };
      const unknownFailingProlog: QueryableProlog = {
        query: mock(async () => ({ success: false, bindings: {} })),
      };

      try {
        await service.queryEntities(asPrologProcess(failingProlog), {});
        throw new Error("expected queryEntities to reject");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("boom");
      }

      try {
        await service.queryEntities(asPrologProcess(unknownFailingProlog), {});
        throw new Error("expected queryEntities to reject");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain(
          "Query failed with unknown error",
        );
      }
    });
  });

  test("validateEntityType accepts only supported types", () => {
    expect(service.validateEntityType("req")).toBe(true);
    expect(service.validateEntityType("unknown")).toBe(false);
  });

  test("getInvalidTypeError lists the supported entity types", () => {
    expect(service.getInvalidTypeError("unknown")).toBe(
      "Invalid type 'unknown'. Valid types: req, scenario, test, adr, flag, event, symbol, fact. Use a single type value, or omit this parameter to query all entities.",
    );
  });

  describe("buildQuerySummaryText", () => {
    test("describes empty results", () => {
      expect(
        service.buildQuerySummaryText(
          { entities: [], totalCount: 0 },
          { type: "req" },
        ),
      ).toBe("No entities found of type 'req'.");
    });

    test("describes paginated results and strips file URI prefixes", () => {
      const text = service.buildQuerySummaryText(
        {
          entities: [
            {
              id: "file:///tmp/documentation/requirements/REQ-7.md",
              title: "Readable title",
              status: "open",
            },
            {
              id: "REQ-8",
              title: undefined,
              status: undefined,
            },
          ],
          totalCount: 2,
        },
        { offset: 1, limit: 2 },
      );

      expect(text).toBe(
        "Found 2 entities. Showing 2 (offset 1, limit 2): REQ-7.md (Readable title, status=open), REQ-8 (, status=)",
      );
    });
  });
});
