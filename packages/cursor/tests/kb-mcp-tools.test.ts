import { describe, expect, test } from "bun:test";

import {
  extractKbMcpToolCall,
  extractKbMcpToolName,
} from "../src/kb-mcp-tools";

describe("extractKbMcpToolName", () => {
  test("returns direct kb tool names", () => {
    expect(extractKbMcpToolName("kb_upsert", {})).toBe("kb_upsert");
    expect(extractKbMcpToolName("kb_check", undefined)).toBe("kb_check");
  });

  test("returns nested MCP tool names from CallMcpTool payloads", () => {
    expect(
      extractKbMcpToolName("CallMcpTool", {
        toolName: "kb_delete",
        arguments: { id: "FACT-001" },
      }),
    ).toBe("kb_delete");
  });

  test("ignores non-kibi tools", () => {
    expect(extractKbMcpToolName("Shell", { command: "ls" })).toBeUndefined();
    expect(
      extractKbMcpToolName("CallMcpTool", { toolName: "browser_navigate" }),
    ).toBeUndefined();
    expect(
      extractKbMcpToolName(undefined, {
        arguments: { toolName: "browser_navigate" },
      }),
    ).toBeUndefined();
  });

  test("returns nested tool names from arguments fallback", () => {
    expect(
      extractKbMcpToolName(undefined, {
        arguments: { tool_name: "kb_query" },
      }),
    ).toBe("kb_query");
    expect(extractKbMcpToolName(undefined, undefined)).toBeUndefined();
  });

  test("falls back through legacy direct and nested tool-name paths", () => {
    const originalStartsWith = String.prototype.startsWith;
    const withKbPrefixResults = (
      kbPrefixResults: boolean[],
      callback: () => string | undefined,
    ): string | undefined => {
      String.prototype.startsWith = function startsWithForFallback(
        searchString: string,
        position?: number,
      ): boolean {
        if (searchString === "kb_") {
          return kbPrefixResults.shift() ?? true;
        }
        return originalStartsWith.call(this, searchString, position);
      };

      return callback();
    };

    try {
      expect(
        withKbPrefixResults([false, true], () =>
          extractKbMcpToolName("kb_query", undefined),
        ),
      ).toBe("kb_query");
      expect(
        withKbPrefixResults([false, false, true], () =>
          extractKbMcpToolName(undefined, { name: "kb_search" }),
        ),
      ).toBe("kb_search");
      expect(
        withKbPrefixResults([false, true], () =>
          extractKbMcpToolName(undefined, {
            args: { tool_name: "kb_status" },
          }),
        ),
      ).toBe("kb_status");
    } finally {
      String.prototype.startsWith = originalStartsWith;
    }
  });
});

describe("extractKbMcpToolCall", () => {
  test("extracts impact-enabled kb_check calls from argument payloads", () => {
    expect(
      extractKbMcpToolCall("CallMcpTool", {
        name: "kb_check",
        args: {
          source_files: ["src/a.ts", "", 7],
          include_impact_diagnostics: true,
          include_working_tree_diff: true,
        },
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
  });

  test("extracts nested fallback calls without impact metadata", () => {
    expect(
      extractKbMcpToolCall(undefined, {
        arguments: { toolName: "kb_delete" },
      }),
    ).toEqual({
      toolName: "kb_delete",
      impactCheckRun: false,
      sourceFiles: [],
    });
  });
});
