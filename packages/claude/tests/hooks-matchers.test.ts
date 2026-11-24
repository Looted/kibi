import fs from "node:fs";
import path from "node:path";

import { describe, expect, test } from "bun:test";

const hooksJsonPath = path.resolve(
  import.meta.dir,
  "..",
  "hooks",
  "hooks.json",
);
const projectSettingsPath = path.resolve(
  import.meta.dir,
  "..",
  "..",
  "..",
  ".claude",
  "settings.json",
);

type MatcherEntry = { matcher?: string };

function matcherOf(file: string, event: "PreToolUse" | "PostToolUse"): string {
  const config = JSON.parse(fs.readFileSync(file, "utf8")) as {
    hooks: Record<string, MatcherEntry[]>;
  };
  const matcher = config.hooks[event]?.[0]?.matcher;
  if (matcher === undefined) throw new Error(`${file} has no ${event} matcher`);
  return matcher;
}

// Claude Code tests a matcher with characters beyond letters, digits, `_`, `-`,
// spaces, `,` and `|` as an unanchored regular expression, so the tool-name
// alternatives are wrapped in `^(...)$`: unanchored, `Write` also matched
// `TodoWrite` and started the hook runner for it.
const NOT_MATCHED = [
  "TodoWrite",
  "WriteFile",
  "NotebookRead",
  "Agent",
  "read",
  "mcp__other__tool",
  "mcp__kibi__other",
  "mcp__kibi__xkb_search",
];
const MCP_KB_TOOLS = [
  "mcp__kibi__kb_search",
  "mcp__plugin_kibi_kibi__kb_check",
  "mcp__plugin_kibi-claude_kibi__kb_status",
];

describe.each([
  ["plugin hooks.json", hooksJsonPath],
  ["project .claude/settings.json", projectSettingsPath],
])("Claude tool matchers in %s", (_label, file) => {
  test("PreToolUse matches exactly the read, edit, search and kb tools", () => {
    const matcher = matcherOf(file, "PreToolUse");
    expect(matcher).toBe(
      "^(Read|Edit|MultiEdit|Write|NotebookEdit|Grep|Glob|Bash|Skill|mcp__.*__kb_.*)$",
    );
    const re = new RegExp(matcher);
    for (const tool of [
      "Read",
      "Edit",
      "MultiEdit",
      "Write",
      "NotebookEdit",
      "Grep",
      "Glob",
      "Bash",
      "Skill",
      ...MCP_KB_TOOLS,
    ]) {
      expect(re.test(tool), tool).toBe(true);
    }
    for (const tool of NOT_MATCHED) expect(re.test(tool), tool).toBe(false);
  });

  test("PostToolUse matches exactly the edit, shell and kb tools", () => {
    const matcher = matcherOf(file, "PostToolUse");
    expect(matcher).toBe(
      "^(Edit|MultiEdit|Write|NotebookEdit|Bash|mcp__.*__kb_.*)$",
    );
    const re = new RegExp(matcher);
    for (const tool of [
      "Edit",
      "MultiEdit",
      "Write",
      "NotebookEdit",
      "Bash",
      ...MCP_KB_TOOLS,
    ]) {
      expect(re.test(tool), tool).toBe(true);
    }
    for (const tool of [...NOT_MATCHED, "Read", "Grep", "Glob", "Skill"]) {
      expect(re.test(tool), tool).toBe(false);
    }
  });
});
