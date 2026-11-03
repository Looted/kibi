// implements REQ-cursor-kibi-plugin-v1, REQ-claude-code-kibi-plugin-v1
import { describe, expect, test } from "bun:test";

import {
  KIBI_WORKSPACE_ARGUMENT,
  canonicalKbToolName,
  extractKbMcpToolCall,
  extractKbMcpToolName,
  hostKbOperation,
  isKibiMcpToolName,
  kibiCliOperation,
  stampKibiWorkspace,
} from "../src/kb-mcp-tools";

const IMPACT = {
  includeImpactDiagnostics: true,
  includeWorkingTreeDiff: true,
  sourceFiles: ["src/a.ts"],
};

describe("canonicalKbToolName", () => {
  test("trims and strips only leading prefixes", () => {
    expect(canonicalKbToolName("  kb_check ")).toBe("kb_check");
    expect(canonicalKbToolName("kb_MCP:x")).toBe("kb_MCP:x");
    expect(canonicalKbToolName("kb_kibi_x")).toBe("kb_kibi_x");
    expect(canonicalKbToolName("mcp__kibi__")).toBeUndefined();
  });
});

describe("isKibiMcpToolName", () => {
  test("Cursor names and server-prefixed names from a kibi server", () => {
    for (const name of [
      "MCP:kb_check",
      " mcp:KB_query ",
      "mcp__kibi__kb_check",
      "mcp__plugin_x_KIBI__kb_search",
      "mcp__a__kibi__kb_find_gaps",
    ]) {
      expect([name, isKibiMcpToolName(name)]).toEqual([name, true]);
    }
    for (const name of [
      undefined,
      "",
      "kb_check",
      "xMCP:kb_check",
      "MCP:kb_check1",
      "MCP:kb_",
      "mcp__kibi",
      "mcp__kibi__",
      "mcp__github__kb_check",
      "MCP__kibi__kb_check",
      "x__kibi__kb_check",
      "mcp__kibi__kb_check1",
      "mcp__kibi__xkb_check",
      "mcp__kibi__kb_",
      "mcp__kibi__kb_check__extra",
    ]) {
      expect([name, isKibiMcpToolName(name)]).toEqual([name, false]);
    }
    // The server is every segment between the prefix and the tool.
    expect(isKibiMcpToolName("mcp__kibi__x__kb_check")).toBe(true);
    expect(isKibiMcpToolName("mcp__x__kb_check")).toBe(false);
    expect(isKibiMcpToolName("mcp__x__kb_kibi")).toBe(false);
    expect(isKibiMcpToolName("mcp__ki__bi__kb_check")).toBe(false);
  });
});

describe("stampKibiWorkspace", () => {
  test("adds the workspace to Kibi MCP calls only", () => {
    expect(KIBI_WORKSPACE_ARGUMENT).toBe("workspaceRoot");
    expect(
      stampKibiWorkspace("mcp__kibi__kb_check", { a: 1 }, "/w"),
    ).toStrictEqual({ a: 1, workspaceRoot: "/w" });
    expect(stampKibiWorkspace("MCP:kb_check", "x", "/w")).toStrictEqual({
      workspaceRoot: "/w",
    });
    expect(stampKibiWorkspace("mcp__kibi__kb_check", {}, "")).toBeUndefined();
    expect(
      stampKibiWorkspace("mcp__kibi__kb_check", {}, undefined),
    ).toBeUndefined();
    expect(stampKibiWorkspace("Edit", {}, "/w")).toBeUndefined();
  });
});

describe("extractKbMcpToolCall", () => {
  test("non-record inputs carry no arguments", () => {
    for (const input of [null, "x", [IMPACT], 3]) {
      expect(extractKbMcpToolCall("mcp__kibi__kb_check", input)).toStrictEqual({
        toolName: "kb_check",
        impactCheckRun: false,
        sourceFiles: [],
      });
    }
    expect(extractKbMcpToolCall(undefined, null)).toBeUndefined();
  });

  test("tool name aliases are read in order and must be strings", () => {
    expect(extractKbMcpToolCall("X", { tool_name: "kb_a" })?.toolName).toBe(
      "kb_a",
    );
    expect(
      extractKbMcpToolCall("X", { toolName: 1, name: "kb_b" })?.toolName,
    ).toBe("kb_b");
    expect(
      extractKbMcpToolCall("X", { toolName: "kb_a", name: "kb_b" })?.toolName,
    ).toBe("kb_a");
    expect(extractKbMcpToolCall("X", { name: "other" })).toBeUndefined();
  });

  test("arguments that are not records are skipped", () => {
    for (const wrapper of ["x", [], null]) {
      expect(
        extractKbMcpToolCall("kb_check", { arguments: wrapper, ...IMPACT })
          ?.impactCheckRun,
      ).toBe(true);
    }
    expect(
      extractKbMcpToolCall("kb_check", { arguments: "x", args: IMPACT })
        ?.impactCheckRun,
    ).toBe(true);
    expect(
      extractKbMcpToolCall("kb_check", {
        args: IMPACT,
        ...IMPACT,
        sourceFiles: [],
      })?.sourceFiles,
    ).toStrictEqual(["src/a.ts"]);
  });

  test("every impact condition is required", () => {
    expect(extractKbMcpToolCall("kb_check", IMPACT)?.impactCheckRun).toBe(true);
    expect(
      extractKbMcpToolCall("kb_check", {
        include_impact_diagnostics: true,
        include_working_tree_diff: true,
        source_files: ["b.ts"],
      }),
    ).toStrictEqual({
      toolName: "kb_check",
      impactCheckRun: true,
      sourceFiles: ["b.ts"],
    });
    for (const change of [
      { includeImpactDiagnostics: false },
      { includeImpactDiagnostics: "true" },
      { includeWorkingTreeDiff: false },
      { sourceFiles: [] },
      { sourceFiles: ["", 3] },
    ]) {
      expect(
        extractKbMcpToolCall("kb_check", { ...IMPACT, ...change })
          ?.impactCheckRun,
      ).toBe(false);
    }
    expect(extractKbMcpToolCall("kb_search", IMPACT)?.impactCheckRun).toBe(
      false,
    );
  });

  test("source files keep non-empty strings from the first array", () => {
    expect(
      extractKbMcpToolCall("kb_check", { sourceFiles: ["a", "", 3, null, "b"] })
        ?.sourceFiles,
    ).toStrictEqual(["a", "b"]);
    expect(
      extractKbMcpToolCall("kb_check", {
        sourceFiles: "a",
        source_files: ["c"],
      })?.sourceFiles,
    ).toStrictEqual(["c"]);
    expect(extractKbMcpToolCall("kb_check", {})?.sourceFiles).toStrictEqual([]);
  });

  test("a dry run is validation only for kb_upsert", () => {
    expect(
      extractKbMcpToolCall("kb_upsert", { args: { dryRun: true } })?.toolName,
    ).toBe("kb_validate_upsert");
    expect(
      extractKbMcpToolCall("kb_upsert", { dryRun: "true" })?.toolName,
    ).toBe("kb_upsert");
    expect(extractKbMcpToolCall("kb_check", { dryRun: true })?.toolName).toBe(
      "kb_check",
    );
  });

  test("a tool named only inside the arguments", () => {
    expect(
      extractKbMcpToolCall("CallMcpTool", {
        arguments: { tool_name: "kb_check", ...IMPACT },
      }),
    ).toStrictEqual({
      toolName: "kb_check",
      impactCheckRun: false,
      sourceFiles: [],
    });
    expect(
      extractKbMcpToolCall("CallMcpTool", { args: { name: "kb_status" } })
        ?.toolName,
    ).toBe("kb_status");
    expect(
      extractKbMcpToolCall("CallMcpTool", {
        arguments: "x",
        args: { name: "kb_status" },
      }),
    ).toBeUndefined();
    expect(
      extractKbMcpToolCall("CallMcpTool", { arguments: { name: "search" } }),
    ).toBeUndefined();
    expect(
      extractKbMcpToolCall("CallMcpTool", { arguments: ["kb_check"] }),
    ).toBeUndefined();
    expect(extractKbMcpToolName("CallMcpTool", { name: "kb_query" })).toBe(
      "kb_query",
    );
    expect(extractKbMcpToolName("Edit", {})).toBeUndefined();
  });
});

describe("CLI and host operations", () => {
  test("kibi CLI routes", () => {
    const routes = {
      check: "kb_check",
      query: "kb_query",
      "kb-query": "kb_query",
      search: "kb_search",
      status: "kb_status",
      graph: "kb_graph",
      coverage: "kb_coverage",
      "find-gaps": "kb_find_gaps",
      gaps: "kb_find_gaps",
      upsert: "kb_upsert",
      sync: "kb_sync",
    };
    for (const [route, operation] of Object.entries(routes)) {
      expect(kibiCliOperation(`npx kibi ${route}`)).toBe(operation);
    }
    expect(kibiCliOperation("kibi  search x")).toBe("kb_search");
    expect(kibiCliOperation("cd a && kibi gaps")).toBe("kb_find_gaps");
    expect(kibiCliOperation("echo hi")).toBeUndefined();
    expect(kibiCliOperation("kibi unknown")).toBeUndefined();
    expect(kibiCliOperation(["kibi search"])).toBeUndefined();
    expect(kibiCliOperation(undefined)).toBeUndefined();
  });

  test("host operations need a well-formed kb_ name", () => {
    expect(hostKbOperation("mcp__kibi__kb_find_gaps", {})).toBe("kb_find_gaps");
    expect(hostKbOperation("mcp__kibi__kb_x1", {})).toBeUndefined();
    expect(hostKbOperation("mcp__kibi__kb_", {})).toBeUndefined();
    for (const shell of ["Bash", "bash", "Shell", "shell"]) {
      expect(hostKbOperation(shell, { command: "kibi status" })).toBe(
        "kb_status",
      );
    }
    expect(hostKbOperation("BASH", { command: "kibi status" })).toBeUndefined();
    expect(
      hostKbOperation(undefined, { command: "kibi status" }),
    ).toBeUndefined();
    expect(hostKbOperation("Bash", "kibi status")).toBeUndefined();
  });
});
