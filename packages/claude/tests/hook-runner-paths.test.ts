// Hook decisions pinned exactly: the output, the session journal it leaves,
// and the usage row it records, for each branch of the runner.
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { MISSING_HOOKS_NOTE } from "kibi-agent-core/checkout-hooks";
import { createEntitySummarizer } from "kibi-agent-core/snippets";
import {
  CONFIRM_FIRM_EDITS_ENV,
  type HookOutput,
  readFocus,
  runHook,
} from "../src/hook-runner";
import { loadKnowledgeIndex } from "../src/knowledge-index";
import { sessionDir, workspaceDataDir } from "../src/session-state";
import {
  DIRECT_KB_ACCESS_NOTE,
  editKnowledgeUpdate,
  fileKnowledgeSnippet,
  firmEditContext,
  searchTip,
  sessionStartContext,
  stopReminder,
  unownedSourceNote,
} from "../src/snippets";
import {
  type Fixture,
  cleanupTempDirs,
  createKibiWorkspace,
  tempDir,
  write,
} from "./fixture";

afterEach(cleanupTempDirs);

const QUIET = {
  [CONFIRM_FIRM_EDITS_ENV]: "0",
  KIBI_DIAGNOSTIC_MODE: "1",
  KIBI_TELEMETRY: "0",
};
const FIRM = { KIBI_DIAGNOSTIC_MODE: "1", KIBI_TELEMETRY: "0" };

const EXTRA_SYMBOLS = `  - id: SYM-two-a
    title: twoA
    sourceFile: src/two.ts
    relationships:
      - type: implements
        target: REQ-two-a
  - id: SYM-two-b
    title: twoB
    sourceFile: src/two.ts
    relationships:
      - type: implements
        target: REQ-two-b
  - id: SYM-mixed-a
    title: mixedA
    sourceFile: src/mixed.ts
    relationships:
      - type: implements
        target: REQ-two-a
  - id: SYM-mixed-b
    title: mixedB
    sourceFile: src/mixed.ts
    relationships:
      - type: covered_by
        target: TEST-checkout-rounding
  - id: SYM-doc
    title: guide
    sourceFile: docs/guide.md
    relationships:
      - type: implements
        target: REQ-two-a
  - id: SYM-kb-notes
    title: notes
    sourceFile: .kb/notes.md
    relationships:
      - type: implements
        target: REQ-two-a
  - id: SYM-firm-test
    title: firm test
    sourceFile: tests/firm.test.ts
    relationships:
      - type: implements
        target: REQ-checkout-rounding
`;

const EXTRA_COORDINATES = `  SYM-mixed-a:
    sourceFile: src/mixed.ts
    sourceLine: 1
    sourceEndLine: 3
  SYM-mixed-b:
    sourceFile: src/mixed.ts
    sourceLine: 5
    sourceEndLine: 7
`;

const MIXED_SOURCE = [
  "export function mixedA() {",
  "  return 1;",
  "}",
  "",
  "export function mixedB() {",
  "  return 2;",
  "}",
  "",
].join("\n");

/** The shared fixture plus files with several owners, a mixed file and an owned doc. */
function workspace(): Fixture {
  const fixture = createKibiWorkspace();
  const { root } = fixture;
  fs.appendFileSync(path.join(root, ".kb/symbols.yaml"), EXTRA_SYMBOLS);
  fs.appendFileSync(
    path.join(root, ".kb/symbol-coordinates.yaml"),
    EXTRA_COORDINATES,
  );
  for (const id of ["REQ-two-a", "REQ-two-b"]) {
    write(
      root,
      `.kb/requirements/${id}.md`,
      `---\nid: ${id}\ntitle: Title of ${id}\nstatus: open\n---\n\nBody of ${id}.\n`,
    );
  }
  write(root, "src/two.ts", "export const a = 1;\n\nexport const b = 2;\n");
  write(root, "src/mixed.ts", MIXED_SOURCE);
  write(root, "docs/guide.md", "# Guide\n");
  write(root, "tests/firm.test.ts", "test('y', () => {});\n");
  write(root, "tests/other.test.ts", "test('z', () => {});\n");
  write(root, "README.md", "readme\n");
  write(root, ".kb/notes.md", "notes\n");
  return fixture;
}

/** A Kibi workspace whose manifest links nothing. */
function unlinkedWorkspace(): Fixture {
  const root = tempDir("kibi-claude-unlinked-");
  const pluginData = tempDir("kibi-claude-unlinked-data-");
  fs.mkdirSync(path.join(root, ".git"));
  write(root, ".kb/manifest.json", "{}\n");
  write(root, ".kb/symbols.yaml", "symbols: []\n");
  write(root, "src/a.ts", "export const a = 1;\n");
  return { root, pluginData, cleanup: cleanupTempDirs };
}

type Row = {
  hook_event: unknown;
  hook_action: unknown;
  path: unknown;
  path_kind: unknown;
  requirement_ids: unknown;
  kb_operation: unknown;
  kb_used_before: unknown;
};

function hooks(
  fixture: Fixture,
  sessionId = "s",
  env: NodeJS.ProcessEnv = QUIET,
) {
  const at = (relative: string) => path.join(fixture.root, relative);
  const call = (payload: Record<string, unknown>) =>
    runHook(
      { session_id: sessionId, cwd: fixture.root, ...payload },
      { pluginData: fixture.pluginData, env },
    );
  const pre = (toolName: string, toolInput: unknown, extra = {}) =>
    call({
      hook_event_name: "PreToolUse",
      tool_name: toolName,
      tool_input: toolInput,
      ...extra,
    });
  const post = (toolName: string, toolInput: unknown, extra = {}) =>
    call({
      hook_event_name: "PostToolUse",
      tool_name: toolName,
      tool_input: toolInput,
      ...extra,
    });
  const journalPath = path.join(
    sessionDir(
      workspaceDataDir(fixture.pluginData, fixture.root),
      sessionId,
    ) as string,
    "session.jsonl",
  );
  /** Journal lines, with command start times replaced by "at". */
  const journal = (): unknown[] => {
    if (!fs.existsSync(journalPath)) return [];
    return fs
      .readFileSync(journalPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const event = JSON.parse(line) as Record<string, unknown>;
        if (event.kind === "command_started") event.at = "at";
        return event;
      });
  };
  const rows = (): Row[] => {
    const logPath = at(".kb/usage.log");
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => {
        const row = JSON.parse(line) as Record<string, unknown>;
        return {
          hook_event: row.hook_event,
          hook_action: row.hook_action,
          path: row.path,
          path_kind: row.path_kind,
          requirement_ids: row.requirement_ids,
          kb_operation: row.kb_operation,
          kb_used_before: row.kb_used_before,
        };
      });
  };
  const lastRow = () => rows().at(-1);
  const summarize = createEntitySummarizer(fixture.root);
  const symbols = (relative: string) =>
    loadKnowledgeIndex(fixture.root).files[relative] ?? [];
  return { at, call, pre, post, journal, rows, lastRow, summarize, symbols };
}

function row(partial: Partial<Row>): Row {
  return {
    hook_event: "PreToolUse",
    hook_action: undefined,
    path: null,
    path_kind: null,
    requirement_ids: [],
    kb_operation: null,
    kb_used_before: false,
    ...partial,
  };
}

function preContext(text: string): HookOutput {
  return {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      additionalContext: text,
    },
  };
}

/** Turns the fixture into a git work tree with everything committed. */
function commitAll(fixture: Fixture): void {
  fs.rmSync(path.join(fixture.root, ".git"), { recursive: true });
  const git = (...args: string[]) => {
    const result = spawnSync("git", args, {
      cwd: fixture.root,
      encoding: "utf8",
    });
    expect(result.status, result.stderr).toBe(0);
  };
  write(fixture.root, ".gitignore", ".kb/usage.log\n");
  git("init", "-q");
  git("add", "-A");
  git(
    "-c",
    "user.email=dev@example.test",
    "-c",
    "user.name=Dev",
    "commit",
    "-qm",
    "fixture",
  );
}

describe("read focus", () => {
  test("a Read window becomes a line range", () => {
    expect(readFocus(undefined)).toBeUndefined();
    expect(readFocus(null)).toBeUndefined();
    expect(readFocus({})).toBeUndefined();
    expect(readFocus({ offset: "5", limit: "2" })).toBeUndefined();
    expect(readFocus({ offset: 5 })).toStrictEqual([{ start: 5, end: 5 }]);
    expect(readFocus({ limit: 3 })).toStrictEqual([{ start: 1, end: 3 }]);
    expect(readFocus({ offset: 0, limit: 2 })).toStrictEqual([
      { start: 1, end: 2 },
    ]);
    expect(readFocus({ offset: 10, limit: 4 })).toStrictEqual([
      { start: 10, end: 13 },
    ]);
    expect(readFocus({ offset: 2, limit: "3" })).toStrictEqual([
      { start: 2, end: 2 },
    ]);
  });
});

describe("session start", () => {
  test("counts files whose every symbol implements a requirement", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    // checkout, two, docs/guide.md, .kb/notes.md and tests/firm.test.ts;
    // mixed.ts has a
    // symbol that implements nothing, as does the checkout test suite.
    expect(
      await h.call({ hook_event_name: "SessionStart", source: "startup" }),
    ).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: sessionStartContext(6),
      },
    });
    expect(h.lastRow()).toStrictEqual(
      row({
        hook_event: "SessionStart",
        hook_action: "session_start",
        kb_used_before: null,
      }),
    );
    expect(h.journal()).toStrictEqual([]);
  });

  test("a checkout without Kibi's hooks gets the missing-hooks note on its own line", async () => {
    const fixture = workspace();
    spawnSync("git", ["init", "-q"], { cwd: fixture.root });
    const h = hooks(fixture);
    expect(
      await h.call({ hook_event_name: "SessionStart", source: "startup" }),
    ).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: "SessionStart",
        additionalContext: `${sessionStartContext(6)}\n${MISSING_HOOKS_NOTE}`,
      },
    });
  });

  test("a compact or clear resets what was shown; a startup or resume does not", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    for (const source of ["startup", "resume", "compact", "clear", "other"]) {
      await h.call({ hook_event_name: "SessionStart", source });
    }
    expect(h.journal()).toStrictEqual([
      { kind: "context_reset" },
      { kind: "context_reset" },
    ]);
  });

  test("an unknown event is silent", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    expect(await h.call({ hook_event_name: "Notification" })).toStrictEqual({});
    expect(h.rows()).toStrictEqual([]);
  });
});

describe("prompts", () => {
  test("a prompt records its words and whether it states a rule", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    expect(
      await h.call({
        hook_event_name: "UserPromptSubmit",
        prompt: "Fix checkout rounding",
      }),
    ).toStrictEqual({});
    expect(await h.call({ hook_event_name: "UserPromptSubmit" })).toStrictEqual(
      {},
    );
    const journal = h.journal() as {
      kind: string;
      words: string[];
      rule: boolean;
    }[];
    expect(journal[0]?.rule).toBe(false);
    expect(journal[0]?.words.length).toBeGreaterThan(0);
    expect(journal[1]).toStrictEqual({
      kind: "prompt",
      words: [],
      rule: false,
    });
    expect(h.rows().map((r) => r.hook_action)).toStrictEqual([
      "prompt_silent",
      "prompt_silent",
    ]);
    const ruled = await h.call({
      hook_event_name: "UserPromptSubmit",
      prompt: "From now on totals must never be negative.",
    });
    expect(ruled.hookSpecificOutput?.hookEventName).toBe("UserPromptSubmit");
    expect((h.journal()[2] as { rule: boolean }).rule).toBe(true);
    expect(h.lastRow()?.hook_action).toBe("prompt_rule_note");
  });
});

describe("tool inputs", () => {
  test("inputs without a usable path are silent", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    for (const input of [null, undefined, "x", [], {}, { file_path: 5 }]) {
      expect(await h.pre("Read", input)).toStrictEqual({});
      expect(await h.post("Edit", input)).toStrictEqual({});
    }
    const outside = path.join(tempDir("kibi-claude-outside-"), "x.ts");
    write(path.dirname(outside), "x.ts", "x\n");
    expect(await h.pre("Read", { file_path: outside })).toStrictEqual({});
    expect(await h.post("Edit", { file_path: outside })).toStrictEqual({});
    expect(h.journal()).toStrictEqual([]);
  });

  test("a tool that neither reads nor edits is silent", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    expect(
      await h.pre("WebFetch", { file_path: h.at("src/checkout.ts") }),
    ).toStrictEqual({});
    expect(h.rows()).toStrictEqual([]);
  });

  test("a notebook path is a tool path", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.post("NotebookEdit", { notebook_path: h.at("src/checkout.ts") });
    expect(h.journal()).toStrictEqual([
      { kind: "edited", path: "src/checkout.ts", pathKind: "source" },
    ]);
  });

  test("every edit tool records the edit", async () => {
    const fixture = workspace();
    for (const tool of ["Edit", "MultiEdit", "Write", "NotebookEdit"]) {
      const h = hooks(fixture, `edit-${tool}`);
      await h.post(tool, { file_path: h.at("src/helper.ts") });
      expect(h.journal()).toStrictEqual([
        { kind: "edited", path: "src/helper.ts", pathKind: "source" },
      ]);
    }
  });

  test("non-string Bash commands are read as text", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    expect(await h.pre("Bash", { command: 5 })).toStrictEqual({});
    expect(await h.pre("Bash", null)).toStrictEqual({});
    expect(await h.post("Bash", { command: ["x"] })).toStrictEqual({});
  });
});

describe("search tools", () => {
  test("Grep and Glob each get the tip once, unless Kibi was used", async () => {
    const fixture = workspace();
    for (const tool of ["Grep", "Glob"]) {
      const h = hooks(fixture, `search-${tool}`);
      expect(await h.pre(tool, { pattern: "x" })).toStrictEqual(
        preContext(searchTip(6)),
      );
      expect(await h.pre(tool, { pattern: "x" })).toStrictEqual({});
      expect(h.journal()).toStrictEqual([
        { kind: "notice", name: "search-tip" },
      ]);
      expect(h.rows().slice(-2)).toStrictEqual([
        row({ hook_action: "search_tip" }),
        row({ hook_action: "search_silent" }),
      ]);
    }
    const used = hooks(fixture, "search-used");
    await used.post("mcp__kibi__kb_status", {});
    expect(await used.pre("Grep", { pattern: "x" })).toStrictEqual({});
    expect(used.lastRow()).toStrictEqual(
      row({ hook_action: "search_silent", kb_used_before: true }),
    );
  });

  test("no tip in a workspace that links no files", async () => {
    const fixture = unlinkedWorkspace();
    const h = hooks(fixture);
    expect(await h.pre("Grep", { pattern: "x" })).toStrictEqual({});
    expect(await h.pre("Bash", { command: "rg x" })).toStrictEqual({});
    expect(h.journal()).toStrictEqual([{ kind: "command_started", at: "at" }]);
  });
});

describe("reads", () => {
  test("a .kb read gets the direct-access note once", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    const file = { file_path: h.at(".kb/symbols.yaml") };
    expect(await h.pre("Read", file)).toStrictEqual(
      preContext(DIRECT_KB_ACCESS_NOTE),
    );
    expect(await h.pre("Read", file)).toStrictEqual({});
    expect(h.journal()).toStrictEqual([{ kind: "notice", name: "kb-direct" }]);
    expect(h.rows()).toStrictEqual([
      row({
        hook_action: "kb_direct_note",
        path: ".kb/symbols.yaml",
        path_kind: "kb",
      }),
      row({
        hook_action: "kb_direct_silent",
        path: ".kb/symbols.yaml",
        path_kind: "kb",
      }),
    ]);
  });

  test("the read snippet, once, unless every owner was already explored", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.post("mcp__kibi__kb_query", { id: "REQ-two-a" });
    const expected = fileKnowledgeSnippet({
      relativePath: "src/two.ts",
      symbols: h.symbols("src/two.ts"),
      surface: "read",
      summarize: h.summarize,
    }) as string;
    expect(
      await h.pre("Read", { file_path: h.at("src/two.ts") }),
    ).toStrictEqual(preContext(expected));
    expect(h.lastRow()).toStrictEqual(
      row({
        hook_action: "read_snippet",
        path: "src/two.ts",
        path_kind: "source",
        requirement_ids: ["REQ-two-a", "REQ-two-b"],
        kb_used_before: true,
      }),
    );
    expect(
      await h.pre("Read", { file_path: h.at("src/two.ts") }),
    ).toStrictEqual({});
    expect(h.lastRow()?.hook_action).toBe("read_silent");

    const explored = hooks(fixture, "explored");
    await explored.post("mcp__kibi__kb_query", {
      ids: ["REQ-two-a", "REQ-two-b"],
    });
    expect(
      await explored.pre("Read", { file_path: h.at("src/two.ts") }),
    ).toStrictEqual({});
  });
});

describe("edits", () => {
  test("a first edit gets the edit snippet and records the file and focus", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    const input = {
      file_path: h.at("src/mixed.ts"),
      old_string: "  return 1;",
      new_string: "  return 3;",
    };
    const expected = fileKnowledgeSnippet({
      relativePath: "src/mixed.ts",
      symbols: h.symbols("src/mixed.ts"),
      surface: "edit",
      focus: [{ start: 2, end: 2 }],
      summarize: h.summarize,
    }) as string;
    expect(await h.pre("Edit", input)).toStrictEqual(preContext(expected));
    expect(h.journal()).toStrictEqual([
      { kind: "shown", surface: "edit", path: "src/mixed.ts#SYM-mixed-a" },
      { kind: "shown", surface: "edit", path: "src/mixed.ts" },
    ]);
    expect(h.lastRow()).toStrictEqual(
      row({
        hook_action: "edit_snippet",
        path: "src/mixed.ts",
        path_kind: "source",
        requirement_ids: ["REQ-two-a"],
      }),
    );
  });

  test("a later edit of the file only names a new owning symbol", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    const edit = (old_string: string) =>
      h.pre("Edit", { file_path: h.at("src/checkout.ts"), old_string });
    await edit("  return Math.round(total * 100) / 100;");
    // Same symbol again: nothing new.
    expect(await edit("  let total = 0;")).toStrictEqual({});
    expect(h.lastRow()?.hook_action).toBe("edit_silent");
    // No focus: nothing new.
    expect(
      await h.pre("Write", { file_path: h.at("src/checkout.ts") }),
    ).toStrictEqual({});
    const update = await edit("  return `$${total.toFixed(2)}`;");
    expect(update).toStrictEqual(
      preContext(
        "Kibi: this edit to src/checkout.ts is inside formatTotal, which implements REQ-currency-display.",
      ),
    );
    expect(h.lastRow()?.hook_action).toBe("edit_focus_update");
    expect(h.journal().at(-1)).toStrictEqual({
      kind: "shown",
      surface: "edit",
      path: "src/checkout.ts#SYM-formatTotal",
    });
    expect(await edit("  return `$${total.toFixed(2)}`;")).toStrictEqual({});
  });

  test("a later edit inside a symbol that implements nothing is silent", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    const edit = (old_string: string) =>
      h.pre("Edit", { file_path: h.at("src/mixed.ts"), old_string });
    await edit("  return 1;");
    expect(await edit("  return 2;")).toStrictEqual({});
  });

  test("a Write has no focus even when its input carries an old string", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    const expected = fileKnowledgeSnippet({
      relativePath: "src/checkout.ts",
      symbols: h.symbols("src/checkout.ts"),
      surface: "edit",
      summarize: h.summarize,
    }) as string;
    expect(
      await h.pre("Write", {
        file_path: h.at("src/checkout.ts"),
        old_string: "  return `$${total.toFixed(2)}`;",
      }),
    ).toStrictEqual(preContext(expected));
  });

  test("an edit of a file the session already knows gets the update", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.pre("Read", { file_path: h.at("src/two.ts") });
    const expected = editKnowledgeUpdate({
      relativePath: "src/two.ts",
      symbols: h.symbols("src/two.ts"),
      surface: "edit",
      summarize: h.summarize,
    }) as string;
    expect(
      await h.pre("Edit", { file_path: h.at("src/two.ts"), old_string: "zzz" }),
    ).toStrictEqual(preContext(expected));
    expect(h.lastRow()?.hook_action).toBe("edit_update_snippet");
  });

  test("an explored file with nothing to add is recorded silently", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.post("mcp__kibi__kb_query", { sourceFile: "src/helper.ts" });
    expect(
      await h.pre("Edit", { file_path: h.at("src/helper.ts") }),
    ).toStrictEqual({});
    expect(h.journal().at(-1)).toStrictEqual({
      kind: "shown",
      surface: "edit",
      path: "src/helper.ts",
    });
  });

  test("an unowned source file gets the discovery note; a test file is recorded silently", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    expect(
      await h.pre("Edit", { file_path: h.at("src/helper.ts") }),
    ).toStrictEqual(
      preContext(
        unownedSourceNote("src/helper.ts", [
          ...((
            await import("kibi-agent-core/requirement-candidates")
          ).requirementCandidatesForPath(
            fixture.root,
            "src/helper.ts",
            undefined,
            [],
          ) ?? []),
        ]),
      ),
    );
    expect(h.lastRow()?.hook_action).toBe("edit_unowned_note");
    expect(
      await h.pre("Edit", { file_path: h.at("tests/other.test.ts") }),
    ).toStrictEqual({});
    expect(h.journal().at(-1)).toStrictEqual({
      kind: "shown",
      surface: "edit",
      path: "tests/other.test.ts",
    });
  });

  test("an unreadable manifest is noted once instead of the discovery note", async () => {
    const fixture = workspace();
    write(
      fixture.root,
      ".kb/symbols.yaml",
      "symbols: [ { id: SYM-computeTotal, sourceFile: src/checkout.ts\n",
    );
    const h = hooks(fixture);
    const first = await h.pre("Edit", { file_path: h.at("src/helper.ts") });
    expect(first.hookSpecificOutput?.additionalContext).toContain(
      "src/helper.ts",
    );
    expect(h.lastRow()?.hook_action).toBe("edit_manifest_note");
    expect(
      await h.pre("Edit", { file_path: h.at("src/two.ts") }),
    ).toStrictEqual({});
    expect(h.journal()).toStrictEqual([
      { kind: "shown", surface: "edit", path: "src/helper.ts" },
      { kind: "notice", name: "manifest-unreadable" },
      { kind: "shown", surface: "edit", path: "src/two.ts" },
    ]);
  });
});

describe("firm requirement confirmation", () => {
  test("the ask carries the snippet and the firm context, joined", async () => {
    const fixture = workspace();
    const h = hooks(fixture, "firm", FIRM);
    const output = await h.pre("Write", {
      file_path: h.at("src/checkout.ts"),
    });
    const snippet = fileKnowledgeSnippet({
      relativePath: "src/checkout.ts",
      symbols: h.symbols("src/checkout.ts"),
      surface: "edit",
      summarize: h.summarize,
    }) as string;
    expect(output.hookSpecificOutput?.hookEventName).toBe("PreToolUse");
    expect(output.hookSpecificOutput?.permissionDecision).toBe("ask");
    expect(output.hookSpecificOutput?.additionalContext).toBe(
      `${snippet}\n\n${firmEditContext(["REQ-checkout-rounding"])}`,
    );
    expect(h.lastRow()).toStrictEqual(
      row({
        hook_action: "edit_firm_ask",
        path: "src/checkout.ts",
        path_kind: "source",
        requirement_ids: ["REQ-checkout-rounding"],
      }),
    );
    // Without a snippet only the firm context is given.
    const again = await h.pre("Write", { file_path: h.at("src/checkout.ts") });
    expect(again.hookSpecificOutput?.additionalContext).toBe(
      firmEditContext(["REQ-checkout-rounding"]),
    );
  });

  test("a shell write asks for the first source file with a firm requirement", async () => {
    const fixture = workspace();
    const h = hooks(fixture, "firm-shell", FIRM);
    const outside = tempDir("kibi-claude-firm-outside-");
    write(outside, "o.ts", "x\n");
    const output = await h.pre("Bash", {
      command: `sed -i s/a/b/ ${path.join(outside, "o.ts")} tests/firm.test.ts src/helper.ts src/checkout.ts`,
    });
    expect(output.hookSpecificOutput?.permissionDecision).toBe("ask");
    expect(output.hookSpecificOutput?.permissionDecisionReason).toContain(
      "src/checkout.ts",
    );
    expect(h.journal().at(-1)).toStrictEqual({
      kind: "firm_asked",
      path: "src/checkout.ts",
      ids: ["REQ-checkout-rounding"],
    });
  });

  test("a shell write of a test file implementing a firm requirement is not asked", async () => {
    const fixture = workspace();
    const h = hooks(fixture, "firm-test", FIRM);
    const output = await h.pre("Bash", {
      command: "sed -i s/a/b/ tests/firm.test.ts",
    });
    expect(output.hookSpecificOutput?.permissionDecision).toBeUndefined();
  });
});

describe("shell reads and writes before they run", () => {
  test("names resolve against the call's cwd", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    const cwd = h.at("src");
    const read = await h.pre("Bash", { command: "cat two.ts" }, { cwd });
    expect(read).toStrictEqual(
      preContext(
        fileKnowledgeSnippet({
          relativePath: "src/two.ts",
          symbols: h.symbols("src/two.ts"),
          surface: "read",
          summarize: h.summarize,
        }) as string,
      ),
    );
    expect(h.lastRow()).toStrictEqual(
      row({
        hook_action: "read_snippet",
        path: "src/two.ts",
        path_kind: "source",
        requirement_ids: ["REQ-two-a", "REQ-two-b"],
      }),
    );
    const write = await h.pre(
      "Bash",
      { command: "sed -i x mixed.ts" },
      { cwd },
    );
    expect(write).toStrictEqual(
      preContext(
        fileKnowledgeSnippet({
          relativePath: "src/mixed.ts",
          symbols: h.symbols("src/mixed.ts"),
          surface: "edit",
          summarize: h.summarize,
        }) as string,
      ),
    );
    expect(h.lastRow()).toStrictEqual(
      row({
        hook_action: "edit_snippet",
        path: "src/mixed.ts",
        path_kind: "source",
        requirement_ids: ["REQ-two-a"],
      }),
    );
    expect(h.journal()).toStrictEqual([
      { kind: "command_started", at: "at" },
      { kind: "shown", surface: "read", path: "src/two.ts" },
      { kind: "command_started", at: "at" },
      { kind: "shown", surface: "edit", path: "src/mixed.ts" },
    ]);
  });

  test("files outside the workspace, docs and .kb files get no snippet", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    const outside = tempDir("kibi-claude-bash-outside-");
    write(outside, "o.ts", "x\n");
    expect(
      await h.pre("Bash", {
        command: `cat ${path.join(outside, "o.ts")} docs/guide.md README.md`,
      }),
    ).toStrictEqual({});
    expect(
      await h.pre("Bash", { command: "sed -i x docs/guide.md" }),
    ).toStrictEqual({});
    expect(await h.pre("Bash", { command: "cat .kb/notes.md" })).toStrictEqual(
      preContext(DIRECT_KB_ACCESS_NOTE),
    );
    expect(h.lastRow()).toStrictEqual(row({ hook_action: "kb_direct_note" }));
    expect(
      await h.pre("Bash", { command: "cat .kb/symbols.yaml" }),
    ).toStrictEqual({});
    expect(h.journal()).toStrictEqual([
      { kind: "command_started", at: "at" },
      { kind: "command_started", at: "at" },
      { kind: "command_started", at: "at" },
      { kind: "notice", name: "kb-direct" },
      { kind: "command_started", at: "at" },
    ]);
  });

  test("an in-place write of a known file gets the update, of an unlinked one nothing", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    expect(
      await h.pre("Bash", { command: "sed -i x src/helper.ts" }),
    ).toStrictEqual({});
    await h.pre("Read", { file_path: h.at("src/two.ts") });
    await h.post("mcp__kibi__kb_query", { sourceFile: "src/mixed.ts" });
    for (const file of ["src/two.ts", "src/mixed.ts"]) {
      expect(
        await h.pre("Bash", { command: `sed -i x ${file}` }),
      ).toStrictEqual(
        preContext(
          editKnowledgeUpdate({
            relativePath: file,
            symbols: h.symbols(file),
            surface: "edit",
            summarize: h.summarize,
          }) as string,
        ),
      );
      expect(h.lastRow()?.hook_action).toBe("edit_update_snippet");
    }
    // Shown for edit already: the next write passes to the next file.
    expect(
      await h.pre("Bash", { command: "sed -i x src/two.ts src/checkout.ts" }),
    ).toStrictEqual(
      preContext(
        fileKnowledgeSnippet({
          relativePath: "src/checkout.ts",
          symbols: h.symbols("src/checkout.ts"),
          surface: "edit",
          summarize: h.summarize,
        }) as string,
      ),
    );
  });

  test("a search command gets the tip unless the Grep tip was shown", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    expect(await h.pre("Bash", { command: "rg total" })).toStrictEqual(
      preContext(searchTip(6)),
    );
    expect(h.lastRow()).toStrictEqual(row({ hook_action: "search_tip" }));
    const other = hooks(fixture, "after-grep");
    await other.pre("Grep", { pattern: "x" });
    expect(await other.pre("Bash", { command: "rg total" })).toStrictEqual({});
    const used = hooks(fixture, "after-kb");
    await used.post("mcp__kibi__kb_status", {});
    expect(await used.pre("Bash", { command: "rg total" })).toStrictEqual({});
  });
});

describe("shell changes after they run", () => {
  function age(fixture: Fixture, relativePath: string, seconds: number): void {
    const past = new Date(Date.now() - seconds * 1000);
    fs.utimesSync(path.join(fixture.root, relativePath), past, past);
  }

  test("without a recorded start nothing is attributed", async () => {
    const fixture = workspace();
    commitAll(fixture);
    const h = hooks(fixture);
    write(fixture.root, "src/checkout.ts", "changed\n");
    expect(await h.post("Bash", { command: "true" })).toStrictEqual({});
    expect(h.journal()).toStrictEqual([]);
  });

  test("the first changed file gets the note, and only owned files describe the call", async () => {
    const fixture = workspace();
    commitAll(fixture);
    const h = hooks(fixture);
    await h.pre("Bash", { command: "true" });
    for (const file of [
      "src/checkout.ts",
      "src/helper.ts",
      "src/two.ts",
      "docs/guide.md",
      ".kb/symbols.yaml",
      "tests/other.test.ts",
    ]) {
      fs.appendFileSync(h.at(file), "\n");
    }
    const output = await h.post("Bash", { command: "true" });
    expect(output).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: fileKnowledgeSnippet({
          relativePath: "src/checkout.ts",
          symbols: h.symbols("src/checkout.ts"),
          surface: "edit",
          summarize: h.summarize,
        }) as string,
      },
    });
    expect(h.journal().slice(1)).toStrictEqual([
      { kind: "edited", path: "src/checkout.ts", pathKind: "source" },
      { kind: "shown", surface: "edit", path: "src/checkout.ts" },
      { kind: "edited", path: "src/helper.ts", pathKind: "source" },
      { kind: "edited", path: "src/two.ts", pathKind: "source" },
      { kind: "edited", path: "tests/other.test.ts", pathKind: "test" },
    ]);
    expect(h.lastRow()).toStrictEqual(
      row({
        hook_event: "PostToolUse",
        hook_action: "edited",
        path: "src/checkout.ts",
        path_kind: "source",
        requirement_ids: ["REQ-checkout-rounding", "REQ-currency-display"],
      }),
    );
  });

  test("an unowned changed source file gets the discovery note; a test file none", async () => {
    const fixture = workspace();
    commitAll(fixture);
    const h = hooks(fixture);
    await h.pre("Bash", { command: "true" });
    fs.appendFileSync(h.at("tests/other.test.ts"), "\n");
    expect(await h.post("Bash", { command: "true" })).toStrictEqual({});
    expect(h.rows()).toStrictEqual([]);
    expect(h.journal()).toStrictEqual([
      { kind: "command_started", at: "at" },
      { kind: "edited", path: "tests/other.test.ts", pathKind: "test" },
    ]);
    await h.pre("Bash", { command: "true" });
    fs.appendFileSync(h.at("src/helper.ts"), "\n");
    const output = await h.post("Bash", { command: "true" });
    expect(output.hookSpecificOutput?.additionalContext).toBe(
      unownedSourceNote(
        "src/helper.ts",
        (
          await import("kibi-agent-core/requirement-candidates")
        ).requirementCandidatesForPath(
          fixture.root,
          "src/helper.ts",
          undefined,
          [],
        ),
      ),
    );
  });

  test("a known file changed by the shell gets the update", async () => {
    const fixture = workspace();
    commitAll(fixture);
    const h = hooks(fixture);
    await h.pre("Read", { file_path: h.at("src/two.ts") });
    await h.post("mcp__kibi__kb_query", { sourceFile: "src/mixed.ts" });
    for (const file of ["src/two.ts", "src/mixed.ts"]) {
      await h.pre("Bash", { command: "true" });
      fs.appendFileSync(h.at(file), "\n");
      age(fixture, file === "src/two.ts" ? "src/mixed.ts" : "src/two.ts", 0);
      const output = await h.post("Bash", { command: "true" });
      expect(output.hookSpecificOutput?.additionalContext).toBe(
        editKnowledgeUpdate({
          relativePath: file,
          symbols: h.symbols(file),
          surface: "edit",
          summarize: h.summarize,
        }) as string,
      );
    }
  });

  test("an unreadable manifest gives no discovery note", async () => {
    const fixture = workspace();
    commitAll(fixture);
    write(
      fixture.root,
      ".kb/symbols.yaml",
      "symbols: [ { id: SYM-computeTotal, sourceFile: src/checkout.ts\n",
    );
    spawnSync("git", ["commit", "-qam", "broken"], {
      cwd: fixture.root,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "a",
        GIT_AUTHOR_EMAIL: "a@b.c",
        GIT_COMMITTER_NAME: "a",
        GIT_COMMITTER_EMAIL: "a@b.c",
      },
    });
    const h = hooks(fixture);
    await h.pre("Bash", { command: "true" });
    fs.appendFileSync(h.at("src/helper.ts"), "\n");
    expect(await h.post("Bash", { command: "true" })).toStrictEqual({});
  });

  test("a CLI Kibi call describes the call before any changed file", async () => {
    const fixture = workspace();
    commitAll(fixture);
    const h = hooks(fixture);
    await h.pre("Bash", { command: "kibi query" });
    fs.appendFileSync(h.at("src/checkout.ts"), "\n");
    await h.post("Bash", { command: "npx kibi query" });
    expect(h.lastRow()).toStrictEqual(
      row({
        hook_event: "PostToolUse",
        hook_action: "kb_usage",
        kb_operation: "kb_query",
      }),
    );
  });
});

describe("git commits", () => {
  const gitEnv = {
    ...process.env,
    GIT_AUTHOR_NAME: "a",
    GIT_AUTHOR_EMAIL: "a@b.c",
    GIT_COMMITTER_NAME: "a",
    GIT_COMMITTER_EMAIL: "a@b.c",
  };

  test("a verified commit with Kibi's gate in a configured hooks path checks everything", async () => {
    const fixture = workspace();
    commitAll(fixture);
    spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
      cwd: fixture.root,
      env: gitEnv,
    });
    write(
      fixture.root,
      ".githooks/pre-commit",
      "#!/bin/sh\nkibi -q check --staged\n",
    );
    const h = hooks(fixture);
    await h.post("Edit", { file_path: h.at("src/helper.ts") });
    await h.post("Bash", { command: "git commit -m x" });
    expect(h.journal().slice(-1)).toStrictEqual([
      { kind: "checked", paths: [], all: true },
    ]);
  });

  test("without a repository the default hook location is read", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.post("Bash", { command: "git commit -m x" });
    expect(h.journal()).toStrictEqual([]);
    write(fixture.root, ".git/hooks/pre-commit", "npx kibi check --staged\n");
    await h.post("Bash", { command: "git commit -m x" });
    expect(h.journal()).toStrictEqual([
      { kind: "checked", paths: [], all: true },
    ]);
  });

  test("a hook that does not run kibi check is no gate", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    write(fixture.root, ".git/hooks/pre-commit", "kibi\ncheck\n");
    await h.post("Bash", { command: "git commit -m x" });
    write(fixture.root, ".git/hooks/pre-commit", "kibi checkout\n");
    await h.post("Bash", { command: "git commit -m x" });
    expect(h.journal()).toStrictEqual([]);
  });
});

describe("Kibi MCP usage after it runs", () => {
  test("explored paths are workspace-relative and checks clear pending edits", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.post("mcp__kibi__kb_query", {
      sourceFiles: ["src/two.ts", "/elsewhere/x.ts", h.at("src/mixed.ts")],
      ids: ["REQ-two-a"],
    });
    await h.post("Edit", { file_path: h.at("src/helper.ts") });
    await h.post("mcp__kibi__kb_check", { sourceFiles: ["src/helper.ts"] });
    expect(h.journal()).toStrictEqual([
      {
        kind: "kb",
        operation: "kb_query",
        paths: ["src/two.ts", "src/mixed.ts"],
        ids: ["REQ-two-a"],
      },
      { kind: "edited", path: "src/helper.ts", pathKind: "source" },
      { kind: "kb", operation: "kb_check", paths: ["src/helper.ts"], ids: [] },
      { kind: "checked", paths: ["src/helper.ts"], all: false },
    ]);
    expect(h.rows().map((r) => [r.hook_action, r.kb_operation])).toStrictEqual([
      ["kb_usage", "kb_query"],
      ["edited", null],
      ["kb_usage", "kb_check"],
    ]);
  });

  test("edits of other files are recorded but not described; .kb edits carry no requirements", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.post("Edit", { file_path: h.at("README.md") });
    expect(h.rows()).toStrictEqual([]);
    await h.post("Edit", { file_path: h.at(".kb/symbols.yaml") });
    await h.post("Edit", { file_path: h.at("src/two.ts") });
    expect(h.rows()).toStrictEqual([
      row({
        hook_event: "PostToolUse",
        hook_action: "edited",
        path: ".kb/symbols.yaml",
        path_kind: "kb",
      }),
      row({
        hook_event: "PostToolUse",
        hook_action: "edited",
        path: "src/two.ts",
        path_kind: "source",
        requirement_ids: ["REQ-two-a", "REQ-two-b"],
      }),
    ]);
  });

  test("only a requirement upsert asks for a signoff view at stop", async () => {
    const fixture = workspace();
    const query = hooks(fixture, "query");
    await query.post("mcp__kibi__kb_query", { type: "req" });
    expect(await query.call({ hook_event_name: "Stop" })).toStrictEqual({});
    const upsert = hooks(fixture, "upsert");
    await upsert.post("mcp__kibi__kb_upsert", { type: "req", id: "REQ-n" });
    const stop = await upsert.call({ hook_event_name: "Stop" });
    expect(stop.hookSpecificOutput?.additionalContext).toContain(
      "kibi signoff",
    );
    expect(upsert.lastRow()?.hook_action).toBe("stop_signoff_reminder");
  });
});

describe("stop", () => {
  test("pending source edits are reminded once, joined with the capture ask", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.post("Edit", { file_path: h.at("src/helper.ts") });
    expect(
      await h.call({ hook_event_name: "Stop", stop_hook_active: true }),
    ).toStrictEqual({});
    const output = await h.call({ hook_event_name: "Stop" });
    const text = output.hookSpecificOutput?.additionalContext ?? "";
    expect(output.hookSpecificOutput?.hookEventName).toBe("Stop");
    expect(text.endsWith(`\n${stopReminder(["src/helper.ts"])}`)).toBe(true);
    expect(h.lastRow()?.hook_action).toBe("stop_capture_reminder");
    expect(h.journal().slice(1)).toStrictEqual([
      { kind: "notice", name: "capture-stop" },
      { kind: "reminded", paths: ["src/helper.ts"] },
    ]);
    expect(await h.call({ hook_event_name: "Stop" })).toStrictEqual({});
  });

  test("after a recording only the reminder is given", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.post("mcp__kibi__kb_upsert", { type: "fact" });
    await h.post("Edit", { file_path: h.at("src/helper.ts") });
    expect(await h.call({ hook_event_name: "Stop" })).toStrictEqual({
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext: stopReminder(["src/helper.ts"]),
      },
    });
    expect(h.lastRow()).toStrictEqual(
      row({
        hook_event: "Stop",
        hook_action: "stop_reminder",
        kb_used_before: true,
      }),
    );
  });
});

describe("hook environment", () => {
  test("the plugin data directory holds the session journal", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    await h.post("Edit", { file_path: h.at("src/helper.ts") });
    expect(h.journal()).toHaveLength(1);
  });

  test("without plugin data the journal lives in a per-user temp directory", async () => {
    const fixture = workspace();
    const tmp = tempDir("kibi-claude-tmp-");
    const saved = {
      TMPDIR: process.env.TMPDIR,
      CLAUDE_PLUGIN_DATA: process.env.CLAUDE_PLUGIN_DATA,
    };
    const getuid = process.getuid;
    process.env.TMPDIR = tmp;
    Reflect.deleteProperty(process.env, "CLAUDE_PLUGIN_DATA");
    const edit = () =>
      runHook(
        {
          hook_event_name: "PostToolUse",
          session_id: "t",
          cwd: fixture.root,
          tool_name: "Edit",
          tool_input: { file_path: path.join(fixture.root, "src/helper.ts") },
        },
        { env: QUIET },
      );
    try {
      await edit();
      expect(fs.readdirSync(tmp)).toStrictEqual([
        `kibi-claude-${process.getuid?.()}`,
      ]);
      Object.defineProperty(process, "getuid", {
        configurable: true,
        value: undefined,
      });
      await edit();
      expect(fs.readdirSync(tmp).sort()).toStrictEqual(
        [`kibi-claude-${getuid?.()}`, "kibi-claude-user"].sort(),
      );
    } finally {
      Object.defineProperty(process, "getuid", {
        configurable: true,
        value: getuid,
      });
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) Reflect.deleteProperty(process.env, key);
        else process.env[key] = value;
      }
    }
    expect(os.tmpdir()).not.toBe(tmp);
  });

  test("the project directory locates the workspace when the payload has no cwd", async () => {
    const fixture = workspace();
    const output = await runHook(
      { hook_event_name: "SessionStart", session_id: "p" },
      { pluginData: fixture.pluginData, projectDir: fixture.root, env: QUIET },
    );
    expect(output.hookSpecificOutput?.additionalContext).toBe(
      sessionStartContext(6),
    );
  });

  test("the session is remembered for anonymous telemetry", async () => {
    const fixture = workspace();
    const dir = tempDir("kibi-claude-anon-");
    await runHook(
      {
        hook_event_name: "PreToolUse",
        session_id: "anon",
        cwd: fixture.root,
        tool_name: "Read",
        tool_input: { file_path: path.join(fixture.root, "README.md") },
      },
      {
        pluginData: fixture.pluginData,
        env: {
          KIBI_TELEMETRY: "1",
          KIBI_TELEMETRY_DIR: dir,
          KIBI_TELEMETRY_HOST: "http://127.0.0.1:9",
        },
      },
    );
    expect(fs.readdirSync(dir)).toContain("telemetry-sessions.json");
  });

  test("anonymous telemetry counts an edit's requirements only when diagnostics are on", async () => {
    const fixture = workspace();
    const counts = async (env: Record<string, string>, file: string) => {
      const dir = tempDir("kibi-claude-anon-count-");
      await runHook(
        {
          hook_event_name: "PostToolUse",
          session_id: "anon",
          cwd: fixture.root,
          tool_name: "Edit",
          tool_input: { file_path: path.join(fixture.root, file) },
        },
        {
          pluginData: fixture.pluginData,
          env: {
            ...env,
            KIBI_TELEMETRY: "1",
            KIBI_TELEMETRY_DIR: dir,
            KIBI_TELEMETRY_HOST: "http://127.0.0.1:9",
          },
        },
      );
      const queue = path.join(dir, "telemetry-queue.jsonl");
      return fs
        .readFileSync(queue, "utf8")
        .trim()
        .split("\n")
        .map(
          (line) =>
            (JSON.parse(line) as { properties: { requirement_count: unknown } })
              .properties.requirement_count,
        );
    };
    expect(await counts({}, "src/two.ts")).toStrictEqual([null]);
    expect(
      await counts({ KIBI_DIAGNOSTIC_MODE: "1" }, "src/two.ts"),
    ).toStrictEqual([2]);
    expect(
      await counts({ KIBI_DIAGNOSTIC_MODE: "1" }, ".kb/symbols.yaml"),
    ).toStrictEqual([null]);
  });
});

describe("skill loads", () => {
  test("loading a Kibi skill through the Skill tool is recorded as skill_loaded", async () => {
    const fixture = workspace();
    const h = hooks(fixture);
    expect(await h.pre("Skill", { skill: "kibi:kibi-usage" })).toStrictEqual(
      {},
    );
    expect(h.lastRow()?.hook_action).toBe("skill_loaded");
    await h.pre("Skill", { skill: "pdf" });
    expect(h.rows().map((r) => r.hook_action)).toStrictEqual(["skill_loaded"]);
    await h.pre("Read", {
      file_path: path.join(
        fixture.root,
        ".claude/skills/kibi-decisions/SKILL.md",
      ),
    });
    expect(h.lastRow()?.hook_action).toBe("skill_loaded");
    // A hook that already chose an action keeps it.
    await h.pre("Grep", {
      pattern: "x",
      path: ".claude/skills/kibi-decisions/SKILL.md",
    });
    expect(h.lastRow()?.hook_action).toBe("search_tip");
  });
});
