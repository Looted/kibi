import { describe, expect, test } from "bun:test";

import { canonicalKbToolName, extractKbMcpToolCall } from "../src/kb-mcp-tools";

describe("ZCode kb MCP tool extraction", () => {
  test("Given direct tool names When extracting Then Kibi calls are returned", () => {
    expect(extractKbMcpToolCall(" kb_check ", undefined)).toEqual({
      toolName: "kb_check",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(extractKbMcpToolCall("Shell", undefined)).toBeUndefined();
  });

  test("Given structured payloads When extracting Then impact check metadata is detected", () => {
    expect(
      extractKbMcpToolCall("CallMcpTool", {
        tool_name: "kb_check",
        arguments: {
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

  test("Given non-Kibi structured payloads When extracting Then undefined is returned", () => {
    expect(
      extractKbMcpToolCall("CallMcpTool", { name: "browser_navigate" }),
    ).toBeUndefined();
  });
});

describe("host-prefixed Kibi tool names", () => {
  test("prefixed MCP names resolve to the canonical operation", () => {
    for (const name of [
      "mcp__kibi__kb_check",
      "mcp__plugin_kibi-claude_kibi__kb_check",
      "MCP:kb_check",
      "kibi_kb_check",
    ]) {
      expect(canonicalKbToolName(name)).toBe("kb_check");
    }
    expect(canonicalKbToolName("mcp__other__search")).toBeUndefined();
  });

  test("a prefixed impact check carries its source files", () => {
    expect(
      extractKbMcpToolCall("mcp__kibi__kb_check", {
        sourceFiles: ["src/a.ts"],
        includeImpactDiagnostics: true,
        includeWorkingTreeDiff: true,
      }),
    ).toEqual({
      toolName: "kb_check",
      impactCheckRun: true,
      sourceFiles: ["src/a.ts"],
    });
  });
});
