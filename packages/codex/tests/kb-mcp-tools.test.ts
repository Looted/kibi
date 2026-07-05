import { describe, expect, test } from "bun:test";

import { extractKbMcpToolCall } from "../src/kb-mcp-tools";

describe("Codex kb MCP tool extraction", () => {
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
