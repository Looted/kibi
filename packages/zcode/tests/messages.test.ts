import { describe, expect, test } from "bun:test";

import { SESSION_BRIEF } from "kibi-agent-core/session-brief";
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
      [
        SESSION_BRIEF,
        "Kibi is active for this workspace. Keep .kb/ out of direct file edits, check kb_status whenever freshness matters, and load the kibi-usage skill (kb_skills action load) for workflow guidance.",
      ].join("\n"),
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
        'Kibi impact review: run kb_check({changed:true, sourceFiles:["src/a.ts"]}) while this edit is fresh; it gives the commit gate\'s verdict.',
        "Check whether the linked requirements, scenarios and tests still cover the changed behavior.",
      ].join("\n"),
    );
    expect(postEditImpactNote(paths(11))).toContain(
      `sourceFiles:${JSON.stringify(paths(10))}}`,
    );
  });

  test("the impact reminder lists the first ten paths", () => {
    expect(impactCheckReminder(["src/a.ts"])).toBe(
      [
        "Kibi impact reminder: source paths changed during this ZCode session.",
        'Run kb_check({changed:true, sourceFiles:["src/a.ts"]}) before finishing; findings with blocks:"commit" stop the commit.',
        "Review symbol granularity and semantic review of linked requirements/tests before stopping.",
        "- src/a.ts",
      ].join("\n"),
    );
    const ten = impactCheckReminder(paths(10)).split("\n");
    expect(ten).toHaveLength(13);
    expect(ten[1]).toBe(
      `Run kb_check({changed:true, sourceFiles:${JSON.stringify(paths(10))}}) before finishing; findings with blocks:"commit" stop the commit.`,
    );
  });

  test("the impact reminder summarizes paths past the tenth", () => {
    const lines = impactCheckReminder(paths(11)).split("\n");
    expect(lines).toHaveLength(14);
    expect(lines[1]).toContain(`sourceFiles:${JSON.stringify(paths(10))}}`);
    expect(lines[12]).toBe("- src/f10.ts");
    expect(lines[13]).toBe("- …and 1 more");
  });
});
