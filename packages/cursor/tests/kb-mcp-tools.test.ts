import { describe, expect, test } from "bun:test";

import { extractKbMcpToolName } from "../src/kb-mcp-tools";

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
  });
});
