// implements REQ-claude-code-kibi-plugin-v1
import { describe, expect, test } from "bun:test";

import {
  canonicalKbOperation,
  extractCliKbUsage,
  extractMcpKbUsage,
  isVerifiedGitCommit,
} from "../src/kb-tools";

describe("Kibi MCP tool names", () => {
  test("host prefixes and the kibi_ alias reduce to the operation", () => {
    expect(canonicalKbOperation("mcp__plugin_kibi-claude_kibi__kb_check")).toBe(
      "kb_check",
    );
    expect(canonicalKbOperation("mcp__kibi__kb_find_gaps")).toBe(
      "kb_find_gaps",
    );
    expect(canonicalKbOperation("kibi_kb_query")).toBe("kb_query");
    expect(canonicalKbOperation("  kb_search  ")).toBe("kb_search");
    expect(canonicalKbOperation("mcp__x__kibi_kb_upsert")).toBe("kb_upsert");
    // Only a leading kibi_ is an alias prefix.
    expect(canonicalKbOperation("kb_kibi_x")).toBe("kb_kibi_x");
  });

  test("anything else is not a Kibi operation", () => {
    for (const name of [
      undefined,
      "",
      "Read",
      "kb_",
      "kb_Check",
      "kb_check2",
      "xkb_check",
      "kb_check__Read",
      "mcp__kibi__",
      "x_kibi_kb_check",
    ]) {
      expect(canonicalKbOperation(name)).toBeUndefined();
    }
  });
});

describe("Kibi MCP usage", () => {
  test("a non-Kibi tool has no usage", () => {
    expect(extractMcpKbUsage("Read", { sourceFile: "a" })).toBeUndefined();
  });

  test("paths and ids are collected from every supported field", () => {
    expect(
      extractMcpKbUsage("mcp__kibi__kb_query", {
        sourceFile: "a.ts",
        sourceFiles: ["b.ts", "", 3, { length: 1 }, "c.ts"],
        sourceLocations: [
          { path: "d.ts" },
          { path: ["e.ts", ""] },
          "f.ts",
          null,
        ],
        id: "REQ-1",
        ids: ["REQ-2", 4, ""],
      }),
    ).toStrictEqual({
      operation: "kb_query",
      paths: ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"],
      ids: ["REQ-1", "REQ-2"],
      check: false,
      checkAll: false,
    });
  });

  test("empty and non-string values are dropped", () => {
    expect(
      extractMcpKbUsage("kb_query", {
        sourceFile: "",
        sourceFiles: "",
        sourceLocations: { path: "a.ts" },
        id: 5,
        ids: {},
      }),
    ).toStrictEqual({
      operation: "kb_query",
      paths: [],
      ids: [],
      check: false,
      checkAll: false,
    });
  });

  test("nested arguments or args are read instead of the top level", () => {
    for (const key of ["arguments", "args"]) {
      expect(
        extractMcpKbUsage("kb_query", {
          id: "TOP",
          [key]: { id: "NESTED" },
        })?.ids,
      ).toStrictEqual(["NESTED"]);
    }
    expect(
      extractMcpKbUsage("kb_query", { id: "TOP", arguments: "x" })?.ids,
    ).toStrictEqual(["TOP"]);
    expect(
      extractMcpKbUsage("kb_query", { id: "TOP", arguments: ["x"] })?.ids,
    ).toStrictEqual(["TOP"]);
    for (const input of [undefined, null, "x", ["id"]]) {
      expect(extractMcpKbUsage("kb_status", input)).toStrictEqual({
        operation: "kb_status",
        paths: [],
        ids: [],
        check: false,
        checkAll: false,
      });
    }
  });

  test("only a working-tree check without a source filter covers every edit", () => {
    expect(
      extractMcpKbUsage("kb_check", { includeWorkingTreeDiff: true }),
    ).toStrictEqual({
      operation: "kb_check",
      paths: [],
      ids: [],
      check: true,
      checkAll: true,
    });
    expect(
      extractMcpKbUsage("kb_check", {
        includeWorkingTreeDiff: true,
        sourceFile: "a.ts",
      })?.checkAll,
    ).toBe(false);
    expect(
      extractMcpKbUsage("kb_check", { includeWorkingTreeDiff: "true" })
        ?.checkAll,
    ).toBe(false);
    expect(extractMcpKbUsage("kb_check", {})?.checkAll).toBe(false);
    expect(
      extractMcpKbUsage("kb_query", { includeWorkingTreeDiff: true })?.checkAll,
    ).toBe(false);
  });
});

describe("Kibi CLI usage", () => {
  test("a command that is not a Kibi CLI call has no usage", () => {
    expect(extractCliKbUsage("ls -la")).toBeUndefined();
  });

  test("a CLI check without inline sources covers every edit", () => {
    expect(extractCliKbUsage("npx --no-install kibi check")).toStrictEqual({
      operation: "kb_check",
      paths: [],
      ids: [],
      check: true,
      checkAll: true,
    });
  });

  test("inline single- or double-quoted JSON is read", () => {
    expect(
      extractCliKbUsage(
        `echo '{"sourceFiles":["a.ts"]}' | kibi check --input -`,
      ),
    ).toStrictEqual({
      operation: "kb_check",
      paths: ["a.ts"],
      ids: [],
      check: true,
      checkAll: false,
    });
    expect(
      extractCliKbUsage(`kibi query --input "{\n\"id\":\"REQ-1\"}"`),
    ).toStrictEqual({
      operation: "kb_query",
      paths: [],
      ids: ["REQ-1"],
      check: false,
      checkAll: false,
    });
  });

  test("JSON that cannot be decoded, or is not an object, falls back to flags", () => {
    const empty = {
      operation: "kb_query",
      paths: [],
      ids: [],
      check: false,
      checkAll: false,
    };
    expect(extractCliKbUsage(`kibi query --input '{"id":}'`)).toStrictEqual(
      empty,
    );
    expect(extractCliKbUsage(`kibi query '{}'`)).toStrictEqual(empty);
    expect(extractCliKbUsage(`kibi query x{"id":"A"}x`)).toStrictEqual(empty);
  });
});

describe("verified git commits", () => {
  test("a commit that ran its hooks", () => {
    for (const command of [
      "git commit -m x",
      "git commit",
      "cd a && git commit -am x",
      "(git commit)",
      "git -C repo commit -m x",
      "git -c user.name=a commit -m x",
      "git --no-pager commit -m x",
      "git --git-dir=.git commit;",
      "x;git commit&",
      "x|git commit|y",
      "git  commit",
      "git  -C  repo  commit",
      "git  --no-pager  commit",
      "git -p commit",
    ]) {
      expect(isVerifiedGitCommit(command)).toBe(true);
    }
  });

  test("anything else, or a commit that skipped its hooks", () => {
    for (const command of [
      "",
      "git commits",
      "git commit-tree x",
      "agit commit",
      "git status && echo commit",
      "git commit --no-verify",
      "git commit -n -m x",
      "git commit -nm x --no-verify",
    ]) {
      expect(isVerifiedGitCommit(command)).toBe(false);
    }
    expect(isVerifiedGitCommit("git commit -m --no-verify-later")).toBe(true);
    expect(isVerifiedGitCommit("git commit -nx")).toBe(true);
  });
});
