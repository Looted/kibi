import { describe, expect, test, mock } from "bun:test";
import {
  handleKbQuery,
  splitTopLevel,
  parsePrologValue,
  parsePropertyList,
  parseListOfLists,
  parseEntityFromBinding,
  parseEntityFromList,
  VALID_ENTITY_TYPES,
} from "../../src/tools/query.js";
import { PrologProcess } from "kibi-cli/prolog";

describe("MCP kb.query Parsing Functions", () => {
  test("VALID_ENTITY_TYPES should be defined", () => {
    expect(VALID_ENTITY_TYPES).toBeArray();
    expect(VALID_ENTITY_TYPES.length).toBeGreaterThan(0);
  });
  describe("splitTopLevel", () => {
    test("should split simple strings", () => {
      expect(splitTopLevel("a,b,c", ",")).toEqual(["a", "b", "c"]);
    });

    test("should not split inside brackets", () => {
      expect(splitTopLevel("a,[b,c],d", ",")).toEqual(["a", "[b,c]", "d"]);
    });

    test("should not split inside quotes", () => {
      expect(splitTopLevel('a,"b,c",d', ",")).toEqual(["a", '"b,c"', "d"]);
    });

    test("should handle nested structures", () => {
      expect(splitTopLevel("a,[b,(c,d)],e", ",")).toEqual([
        "a",
        "[b,(c,d)]",
        "e",
      ]);
    });

    test("should handle escaped quotes", () => {
      // splitTopLevel handles escaped quotes by checking prevChar !== "\\"
      expect(splitTopLevel('a,"b\\"c,d",e', ",")).toEqual([
        "a",
        '"b\\"c,d"',
        "e",
      ]);
    });
  });

  describe("parsePrologValue", () => {
    test("should parse simple strings and atoms", () => {
      expect(parsePrologValue('"hello"')).toBe("hello");
      expect(parsePrologValue("'world'")).toBe("world");
      expect(parsePrologValue("atom")).toBe("atom");
    });

    test("should parse URIs", () => {
      expect(parsePrologValue("file:///path/to/file.md")).toBe("file.md");
    });

    test("should parse typed literals", () => {
      expect(parsePrologValue('^^("2023-01-01", "date")')).toBe("2023-01-01");
      expect(parsePrologValue('^^("[tag1,tag2]", "list")')).toEqual([
        "tag1",
        "tag2",
      ]);
      expect(parsePrologValue('^^("[]", "list")')).toEqual([]);
    });

    test("should parse lists", () => {
      expect(parsePrologValue("[a, b, c]")).toEqual(["a", "b", "c"]);
      expect(parsePrologValue("[]")).toEqual([]);
      expect(parsePrologValue('["a", "b"]')).toEqual(["a", "b"]);
    });

    test("should handle nested lists", () => {
      expect(parsePrologValue("[a, [b, c]]")).toEqual(["a", ["b", "c"]]);
    });
  });

  describe("parsePropertyList", () => {
    test("should parse simple property lists", () => {
      const input = '[id=1, title="Test"]';
      expect(parsePropertyList(input)).toEqual({
        id: "1",
        title: "Test",
      });
    });

    test("should skip ellipsis", () => {
      const input = "[id=1, ...]";
      expect(parsePropertyList(input)).toEqual({
        id: "1",
      });
    });

    test("should handle nested structures in values", () => {
      const input = "[id=1, tags=[a, b]]";
      expect(parsePropertyList(input)).toEqual({
        id: "1",
        tags: ["a", "b"],
      });
    });
  });

  describe("parseListOfLists", () => {
    test("should parse empty list", () => {
      expect(parseListOfLists("[]")).toEqual([]);
    });

    test("should parse single list", () => {
      expect(parseListOfLists("[[a,b,c]]")).toEqual([["a", "b", "c"]]);
    });

    test("should parse multiple lists", () => {
      expect(parseListOfLists("[[a,b,c],[d,e,f]]")).toEqual([
        ["a", "b", "c"],
        ["d", "e", "f"],
      ]);
    });

    test("should handle complex elements", () => {
      const input = "[[id1, type1, [prop=val]], [id2, type2, [prop2=val2]]]";
      expect(parseListOfLists(input)).toEqual([
        ["id1", "type1", "[prop=val]"],
        ["id2", "type2", "[prop2=val2]"],
      ]);
    });
  });

  describe("parseEntityFromBinding and parseEntityFromList", () => {
    test("parseEntityFromBinding should parse binding string", () => {
      const input = '[abc123, req, [title="Test"]]';
      expect(parseEntityFromBinding(input)).toEqual({
        id: "abc123",
        type: "req",
        title: "Test",
      });
    });

    test("parseEntityFromList should parse data array", () => {
      const data = ["abc123", "req", '[title="Test"]'];
      expect(parseEntityFromList(data)).toEqual({
        id: "abc123",
        type: "req",
        title: "Test",
      });
    });
  });

  describe("handleKbQuery", () => {
    const mockProlog = {
      query: mock(async () => ({ success: true, bindings: {} })),
    } as unknown as PrologProcess;

    test("should generate correct goal for all entities", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, {});
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      );
    });

    test("should generate correct goal for type filter", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, { type: "req" });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,'req',Props], kb_entity(Id, 'req', Props), Results)",
      );
    });

    test("should generate correct goal for id and type filter", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Result: '[id1, req, [title="T"]]' },
      });

      await handleKbQuery(mockProlog, { id: "id1", type: "req" });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "kb_entity('id1', 'req', Props), Id = 'id1', Type = 'req', Result = [Id, Type, Props]",
      );
    });

    test("should generate correct goal for tags filter", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, { tags: ["t1", "t2"] });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,Type,Props], (kb_entity(Id, Type, Props), memberchk(tags=Tags, Props), member(Tag, Tags), member(Tag, ['t1','t2'])), Results)",
      );
    });

    test("should handle pagination (limit/offset)", async () => {
      const entities = Array.from(
        { length: 10 },
        (_, i) => `[id${i}, req, [title=\"T${i}\", status=\"active\"]]`,
      );
      (mockProlog.query as any).mockResolvedValueOnce({
        success: true,
        bindings: { Results: `[${entities.join(",")}]` },
      });

      const result = await handleKbQuery(mockProlog, { limit: 2, offset: 3 });

      expect(result.structuredContent?.count).toBe(10);
      expect(result.structuredContent?.entities.length).toBe(2);
      expect(result.structuredContent?.entities[0].id).toBe("id3");
      expect(result.structuredContent?.entities[1].id).toBe("id4");
    });

    test("should throw error on query failure", async () => {
      (mockProlog.query as any).mockResolvedValueOnce({
        success: false,
        error: "Prolog Error",
      });

      await expect(handleKbQuery(mockProlog, {})).rejects.toThrow(
        /Query execution failed: Prolog Error/,
      );
    });

    test("should throw error on invalid type", async () => {
      const invalidType = "invalid";
      await expect(
        handleKbQuery(mockProlog, { type: invalidType as any }),
      ).rejects.toThrow(
        `Invalid type '${invalidType}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
      );
    });
  });
});
