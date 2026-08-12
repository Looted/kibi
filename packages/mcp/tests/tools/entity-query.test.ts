import { beforeEach, describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import {
  VALID_ENTITY_TYPES,
  buildEntityGoal,
  dedupeEntities,
  loadEntities,
  paginateResults,
  validateEntityType,
} from "../../src/tools/entity-query.js";

describe("entity-query helpers", () => {
  describe("validateEntityType", () => {
    test("accepts undefined and every supported entity type", () => {
      expect(() => validateEntityType()).not.toThrow();

      for (const type of VALID_ENTITY_TYPES) {
        expect(() => validateEntityType(type)).not.toThrow();
      }
    });

    test("throws for invalid entity type", () => {
      expect(() => validateEntityType("invalid")).toThrow(
        `Invalid type 'invalid'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
      );
    });
  });

  describe("buildEntityGoal", () => {
    test("builds sourceFile and type goal with escaped atoms", () => {
      expect(
        buildEntityGoal({
          sourceFile: "src/o'brien.ts",
          type: "req",
        }),
      ).toBe(
        "findall([Id,'req',Props], (kb_entities_by_source('src/o''brien.ts', SourceIds), member(Id, SourceIds), kb_entity(Id, 'req', Props)), Results)",
      );
    });

    test("builds sourceFile-only goal", () => {
      expect(buildEntityGoal({ sourceFile: "src/tools/entity-query.ts" })).toBe(
        "findall([Id,Type,Props], (kb_entities_by_source('src/tools/entity-query.ts', SourceIds), member(Id, SourceIds), kb_entity(Id, Type, Props)), Results)",
      );
    });

    test("builds id and type goal", () => {
      expect(buildEntityGoal({ id: "REQ-1", type: "req" })).toBe(
        "findall(['REQ-1','req',Props], kb_entity('REQ-1', 'req', Props), Results)",
      );
    });

    test("builds id-only goal", () => {
      expect(buildEntityGoal({ id: "REQ-1" })).toBe(
        "findall(['REQ-1',Type,Props], kb_entity('REQ-1', Type, Props), Results)",
      );
    });

    test("builds tags and type goal", () => {
      expect(buildEntityGoal({ tags: ["alpha"], type: "fact" })).toBe(
        "findall([Id,'fact',Props], (member(Tag, ['alpha']), kb_entities_by_tag(Tag, TagIds), member(Id, TagIds), kb_entity(Id, 'fact', Props)), Results)",
      );
    });

    test("builds tags-only goal", () => {
      expect(buildEntityGoal({ tags: ["alpha", "beta"] })).toBe(
        "findall([Id,Type,Props], (member(Tag, ['alpha','beta']), kb_entities_by_tag(Tag, TagIds), member(Id, TagIds), kb_entity(Id, Type, Props)), Results)",
      );
    });

    test("builds type-only goal for every entity type", () => {
      for (const type of VALID_ENTITY_TYPES) {
        expect(buildEntityGoal({ type })).toBe(
          `findall([Id,'${type}',Props], kb_entity(Id, '${type}', Props), Results)`,
        );
      }
    });

    test("builds all-entities goal by default", () => {
      expect(buildEntityGoal({})).toBe(
        "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      );
    });
  });

  describe("paginateResults", () => {
    test("uses default pagination values", () => {
      expect(paginateResults([1, 2, 3])).toEqual([1, 2, 3]);
    });

    test("applies limit and offset", () => {
      expect(paginateResults([0, 1, 2, 3, 4], 2, 1)).toEqual([1, 2]);
    });
  });

  describe("dedupeEntities", () => {
    test("deduplicates by type and id only", () => {
      expect(
        dedupeEntities([
          { id: "same", type: "req", title: "first" },
          { id: "same", type: "req", title: "second" },
          { id: "same", type: "fact", title: "different type" },
          { title: "missing keys" },
          { title: "missing keys duplicate" },
        ]),
      ).toEqual([
        { id: "same", type: "req", title: "first" },
        { id: "same", type: "fact", title: "different type" },
        { title: "missing keys" },
      ]);
    });
  });
});

describe("loadEntities", () => {
  const mockQuery = mock(
    async (): Promise<{
      success: boolean;
      bindings: Record<string, string>;
      error?: string;
    }> => ({ success: true, bindings: {} }),
  );

  const mockProlog = {
    query: mockQuery,
  } as unknown as PrologProcess;

  beforeEach(() => {
    mockQuery.mockReset();
  });

  test("loads a single entity from Result binding", async () => {
    mockQuery.mockResolvedValueOnce({
      success: true,
      bindings: {
        Result: '[req1,req,[title="One",status=open,tags=[alpha]]]',
      },
    });

    const results = await loadEntities(mockProlog, { type: "req" });

    expect(results).toEqual([
      {
        id: "req1",
        type: "req",
        title: "One",
        status: "open",
        tags: ["alpha"],
      },
    ]);
    expect(mockQuery).toHaveBeenCalledWith(
      "findall([Id,'req',Props], kb_entity(Id, 'req', Props), Results)",
    );
  });

  test("loads multiple entities from Results binding", async () => {
    mockQuery.mockResolvedValueOnce({
      success: true,
      bindings: {
        Results:
          '[[req1,req,[title="One",status=open]],[req2,req,[title="Two",status=closed]]]',
      },
    });

    const results = await loadEntities(mockProlog, { type: "req" });

    expect(results).toEqual([
      { id: "req1", type: "req", title: "One", status: "open" },
      { id: "req2", type: "req", title: "Two", status: "closed" },
    ]);
  });

  test("filters by a single tag and removes duplicate matches", async () => {
    mockQuery.mockResolvedValueOnce({
      success: true,
      bindings: {
        Results:
          '[[fact1,fact,[title="Tagged",status=active,tags=[" alpha ",beta]]],[fact1,fact,[title="Tagged",status=active,tags=[" alpha ",beta]]],[fact2,fact,[title="Untagged",status=active]]]',
      },
    });

    const results = await loadEntities(mockProlog, { tags: ["alpha"] });

    expect(results).toEqual([
      {
        id: "fact1",
        type: "fact",
        title: "Tagged",
        status: "active",
        tags: [" alpha ", "beta"],
      },
    ]);
  });

  test("filters by multiple tags and returns any matching entity once", async () => {
    mockQuery.mockResolvedValueOnce({
      success: true,
      bindings: {
        Results:
          '[[req1,req,[title="Alpha",status=open,tags=[alpha]]],[scen1,scenario,[title="Beta",status=active,tags=[beta]]],[test1,test,[title="None",status=passing,tags=[gamma]]]]',
      },
    });

    const results = await loadEntities(mockProlog, { tags: ["alpha", "beta"] });

    expect(results).toEqual([
      {
        id: "req1",
        type: "req",
        title: "Alpha",
        status: "open",
        tags: ["alpha"],
      },
      {
        id: "scen1",
        type: "scenario",
        title: "Beta",
        status: "active",
        tags: ["beta"],
      },
    ]);
  });

  test("returns no entities when tag filtering finds no matches", async () => {
    mockQuery.mockResolvedValueOnce({
      success: true,
      bindings: {
        Results:
          '[[req1,req,[title="Alpha",status=open,tags=[alpha]]],[req2,req,[title="No Tags",status=open]]]',
      },
    });

    const results = await loadEntities(mockProlog, { tags: ["missing"] });

    expect(results).toEqual([]);
  });

  test("returns empty results when query succeeds without bindings", async () => {
    mockQuery.mockResolvedValueOnce({
      success: true,
      bindings: {},
    });

    const results = await loadEntities(mockProlog, {});

    expect(results).toEqual([]);
  });

  test("deduplicates repeated entities without tag filtering", async () => {
    mockQuery.mockResolvedValueOnce({
      success: true,
      bindings: {
        Results:
          '[[evt1,event,[title="Event",status=active]],[evt1,event,[title="Event",status=active]],[sym1,symbol,[title="Symbol",status=active]]]',
      },
    });

    const results = await loadEntities(mockProlog, {});

    expect(results).toEqual([
      { id: "evt1", type: "event", title: "Event", status: "active" },
      { id: "sym1", type: "symbol", title: "Symbol", status: "active" },
    ]);
  });

  test("supports every documented entity type", async () => {
    for (const type of VALID_ENTITY_TYPES) {
      mockQuery.mockResolvedValueOnce({
        success: true,
        bindings: {
          Result: `[${type}1,${type},[title="${type}",status=active]]`,
        },
      });

      const results = await loadEntities(mockProlog, { type });

      expect(results).toEqual([
        { id: `${type}1`, type, title: type, status: "active" },
      ]);
    }
  });

  test("throws on invalid entity type before querying", async () => {
    let error: unknown;

    try {
      await loadEntities(mockProlog, { type: "invalid" });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe(
      `Invalid type 'invalid'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
    );
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test("throws when the prolog query fails with an explicit error", async () => {
    mockQuery.mockResolvedValueOnce({
      success: false,
      bindings: {},
      error: "Prolog Error",
    });

    let error: unknown;

    try {
      await loadEntities(mockProlog, {});
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Prolog Error");
  });

  test("throws a default error when the query fails without details", async () => {
    mockQuery.mockResolvedValueOnce({
      success: false,
      bindings: {},
    });

    let error: unknown;

    try {
      await loadEntities(mockProlog, {});
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe("Query failed with unknown error");
  });
});
