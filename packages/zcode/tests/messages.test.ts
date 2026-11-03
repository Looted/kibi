// implements REQ-zcode-kibi-plugin-v1
import { describe, expect, test } from "bun:test";

import {
  DIRECT_KB_EDIT_WARNING,
  SESSION_START_CONTEXT,
  freshnessReminder,
  impactCheckReminder,
  postEditImpactNote,
} from "../src/messages";

const paths = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `src/f${index + 1}.ts`);

describe("ZCode hook messages", () => {
  test("the static warnings are exact", () => {
    expect(DIRECT_KB_EDIT_WARNING).toBe(
      "Avoid direct edits to .kb/. Use Kibi MCP tools for KB discovery and mutations so project memory stays valid.",
    );
    expect(SESSION_START_CONTEXT).toBe(
      "Kibi is active for this workspace. Discover project memory with kb_search/kb_query, keep .kb/ out of direct file edits, and load the kibi-usage skill (kb_skills action load) for workflow guidance. Check kb_status whenever freshness matters. A request that conflicts with a recorded requirement or ADR is a question, not a task: name the rule and ask before changing the code or the rule, and change it only when the person says so. Recording new behavior (a requirement with a scenario, and an implements link from the symbol) is part of finishing the change, not a separate request, so it needs no permission. A file with no linked symbols may still be governed by a recorded rule: kb_search the behavior before changing it.",
    );
  });

  test("the freshness reminder lists up to ten paths", () => {
    expect(freshnessReminder(["docs/a.md", "tests/b.test.ts"])).toBe(
      [
        "Kibi freshness reminder: source, test, or documentation paths changed during this ZCode session.",
        "Before finishing, use Kibi MCP tools to resolve KB freshness or record a no-impact rationale.",
        "- docs/a.md",
        "- tests/b.test.ts",
      ].join("\n"),
    );
    const ten = freshnessReminder(paths(10)).split("\n");
    expect(ten).toHaveLength(12);
    expect(ten[11]).toBe("- src/f10.ts");
  });

  test("the freshness reminder summarizes paths past the tenth", () => {
    const lines = freshnessReminder(paths(12)).split("\n");
    expect(lines).toHaveLength(13);
    expect(lines[11]).toBe("- src/f10.ts");
    expect(lines[12]).toBe("- …and 2 more");
  });

  test("the post-edit note names at most ten source files", () => {
    expect(postEditImpactNote(["src/a.ts"])).toBe(
      [
        'Kibi impact review: run kb_check({sourceFiles:["src/a.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) while this edit is fresh.',
        "Check whether the linked requirements, scenarios and tests still cover the changed behavior.",
      ].join("\n"),
    );
    expect(postEditImpactNote(paths(11))).toContain(
      `sourceFiles:${JSON.stringify(paths(10))},`,
    );
  });

  test("the impact reminder lists the first ten paths", () => {
    expect(impactCheckReminder(["src/a.ts"])).toBe(
      [
        "Kibi impact reminder: source paths changed during this ZCode session.",
        'Run kb_check({sourceFiles:["src/a.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) before finishing.',
        "Review symbol granularity and semantic review of linked requirements/tests before stopping.",
        "- src/a.ts",
      ].join("\n"),
    );
    const ten = impactCheckReminder(paths(10)).split("\n");
    expect(ten).toHaveLength(13);
    expect(ten[1]).toBe(
      `Run kb_check({sourceFiles:${JSON.stringify(paths(10))}, includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) before finishing.`,
    );
  });

  test("the impact reminder summarizes paths past the tenth", () => {
    const lines = impactCheckReminder(paths(11)).split("\n");
    expect(lines).toHaveLength(14);
    expect(lines[1]).toContain(`sourceFiles:${JSON.stringify(paths(10))},`);
    expect(lines[12]).toBe("- src/f10.ts");
    expect(lines[13]).toBe("- …and 1 more");
  });
});
