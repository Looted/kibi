import { describe, expect, mock, test } from "bun:test";
import type { PrologProcess } from "kibi-cli/prolog";
import {
  parseEntityFromBinding,
  parseEntityFromList,
  parseListOfLists,
  parsePrologValue,
  parsePropertyList,
  splitTopLevel,
} from "kibi-cli/prolog/codec";
import { createMcpRuntime } from "../../src/runtime/mcp-runtime.js";
import { registerAllTools } from "../../src/server/tools.js";
import { TOOLS } from "../../src/tools-config.js";
import { VALID_ENTITY_TYPES, handleKbQuery } from "../../src/tools/query.js";

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

    test("should parse XSD integer typed literals", () => {
      expect(
        parsePrologValue(
          '^^("42", "http://www.w3.org/2001/XMLSchema#integer")',
        ),
      ).toBe(42);
      expect(
        parsePrologValue('^^("0", "http://www.w3.org/2001/XMLSchema#integer")'),
      ).toBe(0);
      expect(
        parsePrologValue(
          '^^("-10", "http://www.w3.org/2001/XMLSchema#integer")',
        ),
      ).toBe(-10);
    });

    test("should parse XSD decimal typed literals", () => {
      expect(
        parsePrologValue(
          '^^("3.14", "http://www.w3.org/2001/XMLSchema#decimal")',
        ),
      ).toBe(3.14);
      expect(
        parsePrologValue(
          '^^("-0.5", "http://www.w3.org/2001/XMLSchema#double")',
        ),
      ).toBe(-0.5);
    });

    test("should parse XSD boolean typed literals", () => {
      expect(
        parsePrologValue(
          '^^("true", "http://www.w3.org/2001/XMLSchema#boolean")',
        ),
      ).toBe(true);
      expect(
        parsePrologValue(
          '^^("false", "http://www.w3.org/2001/XMLSchema#boolean")',
        ),
      ).toBe(false);
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

    test("should generate correct goal for all entities", async () => {
      mockQuery.mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, {});
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      );
    });

    test("should generate correct goal for type filter", async () => {
      mockQuery.mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, { type: "req" });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,'req',Props], kb_entity(Id, 'req', Props), Results)",
      );
    });

    test("should generate correct goal for id and type filter", async () => {
      mockQuery.mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[['id1','req',[title=\"T\"]]]" },
      });

      await handleKbQuery(mockProlog, { id: "id1", type: "req" });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall(['id1','req',Props], kb_entity('id1', 'req', Props), Results)",
      );
    });

    test("should escape single quotes in id using '' strategy", async () => {
      mockQuery.mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, { id: "o'brien", type: "req" });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall(['o''brien','req',Props], kb_entity('o''brien', 'req', Props), Results)",
      );
    });

    test("should query entities before tag filtering", async () => {
      mockQuery.mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, { tags: ["it's", "safe"] });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      );
    });

    test("should generate query goal for tags filter", async () => {
      mockQuery.mockResolvedValueOnce({
        success: true,
        bindings: { Results: "[]" },
      });

      await handleKbQuery(mockProlog, { tags: ["t1", "t2"] });
      expect(mockProlog.query).toHaveBeenCalledWith(
        "findall([Id,Type,Props], kb_entity(Id, Type, Props), Results)",
      );
    });

    test("should dedupe entities when multiple tags match", async () => {
      mockQuery.mockResolvedValueOnce({
        success: true,
        bindings: {
          Results:
            '[[entity-1,fact,[title="One",status=active,tags=[dup_a,dup_b]]],[entity-1,fact,[title="One",status=active,tags=[dup_a,dup_b]]]]',
        },
      });

      const result = await handleKbQuery(mockProlog, {
        tags: ["dup_a", "dup_b"],
      });

      expect(result.structuredContent?.entities.length).toBe(1);
      expect(result.structuredContent?.entities[0]?.id).toBe("entity-1");
    });

    test("should handle pagination (limit/offset)", async () => {
      const entities = Array.from(
        { length: 10 },
        (_, i) => `[id${i}, req, [title=\"T${i}\", status=\"active\"]]`,
      );
      mockQuery.mockResolvedValueOnce({
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
      mockQuery.mockResolvedValueOnce({
        success: false,
        bindings: {},
        error: "Prolog Error",
      });

      await expect(handleKbQuery(mockProlog, {})).rejects.toThrow(
        /Query execution failed: Prolog Error/,
      );
    });

    test("should throw error on invalid type", async () => {
      const invalidType = "invalid";
      await expect(
        handleKbQuery(mockProlog, { type: invalidType }),
      ).rejects.toThrow(
        `Invalid type '${invalidType}'. Valid types: ${VALID_ENTITY_TYPES.join(", ")}. Use a single type value, or omit this parameter to query all entities.`,
      );
    });

    test("registered query tool enters the runtime freshness gate before querying Prolog", async () => {
      const calls: string[] = [];
      const query = mock(async () => {
        calls.push("query");
        return { success: true, bindings: { Results: "[]" } };
      });
      const prolog = { query } as unknown as PrologProcess;
      const ensureProlog = mock(async () => {
        calls.push("ensureProlog");
        return prolog;
      });
      const registered = new Map<
        string,
        (args: Record<string, unknown>) => unknown
      >();
      const server = {
        registerTool: mock(
          (
            name: string,
            _config: unknown,
            handler: (args: Record<string, unknown>) => unknown,
          ) => {
            registered.set(name, handler);
          },
        ),
      };
      const runtime = {
        tools: TOOLS,
        diagnosticModeEnabled: () => false,
        extractToolCallPayload: (args: Record<string, unknown>) => ({
          businessArgs: args,
          telemetry: null,
        }),
        inFlightRequests: async () => new Map<string, Promise<unknown>>(),
        isShuttingDown: async () => false,
        resetProlog: async () => {},
        prologProcess: async () => null,
        activeBranchName: async () => "test",
        appendUsageLogLine: () => {},
        deriveDiagnosticFields: () => ({}),
        classifyDiagnosticError: () => ({}),
        ensureProlog,
        operationRuntime: createMcpRuntime({
          workspaceRoot: "/workspace",
          activeBranchName: async () => "test",
          attachedBranchKbPath: () => null,
          ensureProlog,
          adaptProlog: () => ({
            query: async () => ({ success: true, bindings: {} }),
            nextSolution: async () => null,
            save: async () => ({ success: true, bindings: {} }),
          }),
          refreshAttachedBranchStamp: async () => undefined,
        }),
        handleKbQuery,
      } as unknown as Parameters<typeof registerAllTools>[1];

      registerAllTools(server as never, runtime);
      await registered.get("kb_query")?.({ type: "req" });

      expect(ensureProlog).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(
        "findall([Id,'req',Props], kb_entity(Id, 'req', Props), Results)",
      );
      expect(calls).toEqual(["ensureProlog", "query"]);
    });
  });
});
