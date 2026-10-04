// implements REQ-claude-code-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { type HookOutput, runHook } from "../src/hook-runner";
import { MAX_SNIPPET_CHARS } from "../src/snippets";
import {
  type Fixture,
  cleanupTempDirs,
  createKibiWorkspace,
  snapshotTree,
  tempDir,
  write,
} from "./fixture";

afterEach(cleanupTempDirs);

/** Relationship shard holding a `from` id's records, as the Kibi writer names it. */
function shardOf(entityId: string): string {
  return createHash("sha256").update(entityId).digest("hex").slice(0, 2);
}

/** Keys Claude Code accepts on these events' hook output. */
const ALLOWED_TOP_LEVEL = new Set(["hookSpecificOutput"]);
const ALLOWED_SPECIFIC = new Set(["hookEventName", "additionalContext"]);

function contextOf(output: HookOutput, event: string): string | undefined {
  for (const key of Object.keys(output)) {
    expect(ALLOWED_TOP_LEVEL.has(key), `unexpected key ${key}`).toBe(true);
  }
  const specific = output.hookSpecificOutput;
  if (!specific) return undefined;
  for (const key of Object.keys(specific)) {
    expect(ALLOWED_SPECIFIC.has(key), `unexpected key ${key}`).toBe(true);
  }
  expect(specific.hookEventName).toBe(event as never);
  // Context events always carry text; only the workspace stamp omits it.
  const text = specific.additionalContext ?? "";
  expect(text.length).toBeGreaterThan(0);
  expect(text.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);
  return text;
}

function session(
  fixture: Fixture,
  sessionId = "s1",
  env: NodeJS.ProcessEnv = {},
) {
  // An explicit env keeps a developer's own telemetry opt-in out of the run.
  const call = (payload: Record<string, unknown>) =>
    runHook(
      { session_id: sessionId, cwd: fixture.root, ...payload },
      { pluginData: fixture.pluginData, env },
    );
  const pre = async (toolName: string, toolInput: Record<string, unknown>) =>
    contextOf(
      await call({
        hook_event_name: "PreToolUse",
        tool_name: toolName,
        tool_input: toolInput,
      }),
      "PreToolUse",
    );
  const post = (toolName: string, toolInput: Record<string, unknown>) =>
    call({
      hook_event_name: "PostToolUse",
      tool_name: toolName,
      tool_input: toolInput,
    });
  const stop = async (stopHookActive = false) =>
    contextOf(
      await call({
        hook_event_name: "Stop",
        stop_hook_active: stopHookActive,
      }),
      "Stop",
    );
  return { call, pre, post, stop };
}

describe("workspace opt-in", () => {
  test("every event is silent and stateless outside a Kibi workspace", async () => {
    const root = tempDir("kibi-claude-plain-");
    const pluginData = tempDir("kibi-claude-plain-data-");
    write(root, ".git/HEAD", "ref: refs/heads/main\n");
    write(root, "src/app.ts", "export const x = 1;\n");
    const events = [
      { hook_event_name: "SessionStart", source: "startup" },
      {
        hook_event_name: "PreToolUse",
        tool_name: "Read",
        tool_input: { file_path: path.join(root, "src/app.ts") },
      },
      {
        hook_event_name: "PreToolUse",
        tool_name: "Grep",
        tool_input: { pattern: "x" },
      },
      {
        hook_event_name: "PostToolUse",
        tool_name: "Edit",
        tool_input: { file_path: path.join(root, "src/app.ts") },
      },
      { hook_event_name: "Stop" },
    ];
    for (const event of events) {
      expect(
        await runHook({ session_id: "s", cwd: root, ...event }, { pluginData }),
      ).toEqual({});
    }
    expect(snapshotTree(pluginData)).toEqual([]);
  });
});

describe("session start", () => {
  test("summarizes the knowledge base and the operations", async () => {
    const fixture = createKibiWorkspace();
    const text = contextOf(
      await session(fixture).call({
        hook_event_name: "SessionStart",
        source: "startup",
      }),
      "SessionStart",
    );
    expect(text).toContain("1 source files have requirement-linked symbols");
    expect(text).toContain("kb_search");
    expect(text).toContain("kibi-usage");
  });
});

describe("pre-read snippets", () => {
  test("a linked file shows requirement titles, symbols, tests, and next calls once", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture);
    const text = await pre("Read", {
      file_path: path.join(fixture.root, "src/checkout.ts"),
    });
    expect(text).toContain(
      "REQ-checkout-rounding: Checkout totals round to cents — computeTotal",
    );
    expect(text).toContain(
      "REQ-currency-display (superseded): Totals display with a currency symbol — formatTotal",
    );
    expect(text).toContain("Covered by: TEST-checkout-rounding.");
    expect(text).toContain('kb_query({id:"REQ-checkout-rounding"})');
    expect(text).toContain('sourceLocations:[{path:"src/checkout.ts"}]');

    expect(
      await pre("Read", {
        file_path: path.join(fixture.root, "src/checkout.ts"),
      }),
    ).toBeUndefined();
  });

  test("a read window names the symbol it lands in", async () => {
    const fixture = createKibiWorkspace();
    const text = await session(fixture).pre("Read", {
      file_path: "src/checkout.ts",
      offset: 9,
      limit: 3,
    });
    expect(text).toContain("These lines are inside formatTotal");
    // The focused symbol's requirement leads the list.
    expect(text?.split("\n")[1]).toContain("REQ-currency-display");
  });

  test("unlinked, generated, and non-code files stay silent on read", async () => {
    const fixture = createKibiWorkspace();
    write(fixture.root, "dist/checkout.js", "x");
    write(fixture.root, "README.md", "x");
    const { pre } = session(fixture);
    for (const file of ["src/helper.ts", "dist/checkout.js", "README.md"]) {
      expect(await pre("Read", { file_path: file })).toBeUndefined();
    }
  });

  test("test code shows what it executes", async () => {
    const fixture = createKibiWorkspace();
    const text = await session(fixture).pre("Read", {
      file_path: "tests/checkout.test.ts",
    });
    expect(text).toContain("Test code for: TEST-checkout-rounding.");
  });

  test("a file the agent already explored through Kibi stays silent", async () => {
    const fixture = createKibiWorkspace();
    const { pre, post } = session(fixture);
    await post("mcp__plugin_kibi-claude_kibi__kb_query", {
      sourceFile: "src/checkout.ts",
    });
    expect(await pre("Read", { file_path: "src/checkout.ts" })).toBeUndefined();
  });

  test("a file whose requirements were already opened stays silent", async () => {
    const fixture = createKibiWorkspace();
    const { pre, post } = session(fixture);
    await post("mcp__kibi__kb_query", { id: "REQ-checkout-rounding" });
    await post("mcp__kibi__kb_query", { id: "REQ-currency-display" });
    expect(await pre("Read", { file_path: "src/checkout.ts" })).toBeUndefined();
  });
});

describe("pre-edit snippets", () => {
  test("a first edit names the edited symbol and the impact check", async () => {
    const fixture = createKibiWorkspace();
    const text = await session(fixture).pre("Edit", {
      file_path: path.join(fixture.root, "src/checkout.ts"),
      old_string: "  return Math.round(total * 100) / 100;",
      new_string: "  return total;",
    });
    expect(text).toContain(
      "The edit is inside computeTotal, which implements REQ-checkout-rounding.",
    );
    expect(text).toContain('symbol:"computeTotal"');
    expect(text).toContain(
      'kb_check({sourceFiles:["src/checkout.ts"], includeImpactDiagnostics:true',
    );
  });

  test("a first edit names what the owning requirement must keep true and why", async () => {
    const fixture = createKibiWorkspace();
    const text = await session(fixture).pre("Edit", {
      file_path: path.join(fixture.root, "src/checkout.ts"),
      old_string: "  return Math.round(total * 100) / 100;",
      new_string: "  return total;",
    });
    expect(text).toContain(
      "REQ-checkout-rounding must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.",
    );
    expect(text).toContain(
      "Decision: ADR-money-as-decimal: Money is computed as decimal cents.",
    );
  });

  test("grounding stored only in relationship shards reaches the edit snippet", async () => {
    const fixture = createKibiWorkspace();
    write(
      fixture.root,
      ".kb/requirements/REQ-checkout-rounding.md",
      "---\nid: REQ-checkout-rounding\ntitle: Checkout totals round to cents\nstatus: open\n---\n",
    );
    write(
      fixture.root,
      `.kb/relationships/${shardOf("REQ-checkout-rounding")}.yaml`,
      [
        "relationships:",
        "  - id: rel-a",
        "    type: requires_property",
        "    from: REQ-checkout-rounding",
        "    to: FACT-total-rounding-cents",
        "  - to: ADR-money-as-decimal",
        "    from: REQ-checkout-rounding",
        "    type: relates_to",
        "",
      ].join("\n"),
    );
    const text = await session(fixture).pre("Edit", {
      file_path: path.join(fixture.root, "src/checkout.ts"),
      old_string: "  return Math.round(total * 100) / 100;",
      new_string: "  return total;",
    });
    expect(text).toContain(
      "REQ-checkout-rounding must keep true: FACT-total-rounding-cents: Totals round half up to two decimals.",
    );
    expect(text).toContain(
      "Decision: ADR-money-as-decimal: Money is computed as decimal cents.",
    );
  });

  test("a superseded lead requirement is not presented as something to keep true", async () => {
    const fixture = createKibiWorkspace();
    write(
      fixture.root,
      `.kb/relationships/${shardOf("REQ-currency-display")}.yaml`,
      "relationships:\n  - type: constrains\n    from: REQ-currency-display\n    to: FACT-total-rounding-cents\n",
    );
    const text = await session(fixture).pre("Edit", {
      file_path: "src/checkout.ts",
      old_string: "  return `$${total.toFixed(2)}`;",
      new_string: "  return `${total}`;",
    });
    expect(text?.split("\n")[1]).toContain(
      "REQ-currency-display (superseded): Totals display with a currency symbol",
    );
    expect(text).not.toContain("must keep true");
    expect(text).not.toContain("Decision:");
  });

  test("after a read, edits add only new focus facts", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture);
    await pre("Read", { file_path: "src/checkout.ts" });

    const first = await pre("Edit", {
      file_path: "src/checkout.ts",
      old_string: "let total = 0;",
      new_string: "let total = 1;",
    });
    expect(first).toBe(
      "Kibi: this edit to src/checkout.ts is inside computeTotal, which implements REQ-checkout-rounding.",
    );
    // Same symbol again: nothing new to say.
    expect(
      await pre("Edit", {
        file_path: "src/checkout.ts",
        old_string: "return Math.round",
        new_string: "return Math.floor",
      }),
    ).toBeUndefined();
    // A different symbol is new information.
    expect(
      await pre("MultiEdit", {
        file_path: "src/checkout.ts",
        edits: [{ old_string: "toFixed(2)", new_string: "toFixed(3)" }],
      }),
    ).toContain("inside formatTotal");
  });

  test("an unowned source file gets one discovery note", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture);
    const text = await pre("Write", {
      file_path: "src/new-feature.ts",
      content: "export {}",
    });
    expect(text).toContain("no symbol in src/new-feature.ts is linked");
    expect(text).toContain('kb_search({query:"<behavior being changed>"');
    expect(
      await pre("Write", { file_path: "src/new-feature.ts", content: "" }),
    ).toBeUndefined();
    // Unowned test code is not nagged.
    expect(
      await pre("Write", { file_path: "tests/new.test.ts", content: "" }),
    ).toBeUndefined();
  });

  test("direct .kb access gets one note per session", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture);
    expect(
      await pre("Read", {
        file_path: ".kb/requirements/REQ-checkout-rounding.md",
      }),
    ).toContain(".kb/ holds Kibi-managed knowledge");
    expect(
      await pre("Edit", { file_path: ".kb/symbols.yaml", old_string: "a" }),
    ).toBeUndefined();
  });
});

describe("search tip", () => {
  test("appears once and only before the agent uses Kibi", async () => {
    const fixture = createKibiWorkspace();
    const first = session(fixture, "a");
    expect(await first.pre("Grep", { pattern: "total" })).toContain("Kibi tip");
    expect(await first.pre("Glob", { pattern: "**/*.ts" })).toBeUndefined();

    const second = session(fixture, "b");
    await second.post("Bash", {
      command: `printf '%s\\n' '{"query":"totals"}' | npx --no-install kibi search --input -`,
    });
    expect(await second.pre("Grep", { pattern: "total" })).toBeUndefined();
  });
});

describe("stop reminders", () => {
  test("unchecked source edits are reminded once, then the agent may stop", async () => {
    const fixture = createKibiWorkspace();
    const { post, stop } = session(fixture);
    await post("Edit", {
      file_path: path.join(fixture.root, "src/checkout.ts"),
    });
    await post("Write", { file_path: "src/helper.ts" });
    await post("Edit", { file_path: "tests/checkout.test.ts" });
    await post("Read", { file_path: "src/other.ts" });

    const text = await stop();
    expect(text).toContain("2 source files changed");
    expect(text).toContain('sourceFiles:["src/checkout.ts","src/helper.ts"]');
    expect(await stop(true)).toBeUndefined();
    expect(await stop()).toBeUndefined();

    // A new edit to a reminded path makes it pending again.
    await post("Edit", { file_path: "src/helper.ts" });
    expect(await stop()).toContain("1 source file changed");
  });

  test("a host-prefixed kb_check naming the file acknowledges it", async () => {
    const fixture = createKibiWorkspace();
    const { post, stop } = session(fixture);
    await post("Edit", { file_path: "src/checkout.ts" });
    await post("Edit", { file_path: "src/helper.ts" });
    await post("mcp__plugin_kibi-claude_kibi__kb_check", {
      sourceFiles: ["src/checkout.ts"],
      includeImpactDiagnostics: true,
      includeWorkingTreeDiff: true,
    });
    const text = await stop();
    expect(text).toContain("src/helper.ts");
    expect(text).not.toContain("src/checkout.ts");
  });

  test("a working-tree check or CLI check acknowledges every edit", async () => {
    for (const acknowledge of [
      [
        "mcp__kibi__kb_check",
        { includeImpactDiagnostics: true, includeWorkingTreeDiff: true },
      ],
      ["Bash", { command: "npx --no-install kibi check" }],
    ] as const) {
      const fixture = createKibiWorkspace();
      const { post, stop } = session(fixture);
      await post("Edit", { file_path: "src/checkout.ts" });
      await post(acknowledge[0], acknowledge[1]);
      expect(await stop()).toBeUndefined();
    }
  });

  test("a commit through Kibi's pre-commit gate acknowledges pending edits", async () => {
    const gated = createKibiWorkspace();
    write(
      gated.root,
      ".git/hooks/pre-commit",
      "#!/bin/sh\nnpx --no-install kibi check --staged\n",
    );
    const withGate = session(gated);
    await withGate.post("Edit", { file_path: "src/checkout.ts" });
    await withGate.post("Bash", { command: "git add -A && git commit -m fix" });
    expect(await withGate.stop()).toBeUndefined();

    // Skipping the hook, or a repository without the gate, proves nothing.
    const bypass = session(gated, "bypass");
    await bypass.post("Edit", { file_path: "src/checkout.ts" });
    await bypass.post("Bash", { command: "git commit --no-verify -m fix" });
    expect(await bypass.stop()).toContain("src/checkout.ts");

    const ungated = createKibiWorkspace();
    const withoutGate = session(ungated);
    await withoutGate.post("Edit", { file_path: "src/checkout.ts" });
    await withoutGate.post("Bash", { command: "git commit -m fix" });
    expect(await withoutGate.stop()).toContain("src/checkout.ts");
  });

  test("an edit after a check makes the path pending again", async () => {
    const fixture = createKibiWorkspace();
    const { post, stop } = session(fixture);
    await post("Edit", { file_path: "src/checkout.ts" });
    await post("mcp__kibi__kb_check", { sourceFiles: ["src/checkout.ts"] });
    await post("Edit", { file_path: "src/checkout.ts" });
    expect(await stop()).toContain("src/checkout.ts");
  });

  test("sessions do not share pending work", async () => {
    const fixture = createKibiWorkspace();
    await session(fixture, "a").post("Edit", { file_path: "src/checkout.ts" });
    expect(await session(fixture, "b").stop()).toBeUndefined();
    expect(await session(fixture, "a").stop()).toContain("src/checkout.ts");
  });
});

describe("session memory fallback", () => {
  test("without CLAUDE_PLUGIN_DATA, snippets still show once per session", async () => {
    const fixture = createKibiWorkspace();
    const saved = {
      data: process.env.CLAUDE_PLUGIN_DATA,
      tmp: process.env.TMPDIR,
    };
    Reflect.deleteProperty(process.env, "CLAUDE_PLUGIN_DATA");
    process.env.TMPDIR = tempDir("kibi-claude-tmp-");
    try {
      const read = () =>
        runHook({
          hook_event_name: "PreToolUse",
          session_id: "fallback",
          cwd: fixture.root,
          tool_name: "Read",
          tool_input: { file_path: "src/checkout.ts" },
        });
      expect(contextOf(await read(), "PreToolUse")).toContain(
        "REQ-checkout-rounding",
      );
      expect(await read()).toEqual({});
    } finally {
      if (saved.data === undefined)
        Reflect.deleteProperty(process.env, "CLAUDE_PLUGIN_DATA");
      else process.env.CLAUDE_PLUGIN_DATA = saved.data;
      if (saved.tmp === undefined)
        Reflect.deleteProperty(process.env, "TMPDIR");
      else process.env.TMPDIR = saved.tmp;
    }
  });
});

describe("advisory boundary", () => {
  test("hooks never deny, rewrite input, or touch the workspace", async () => {
    const fixture = createKibiWorkspace();
    const before = snapshotTree(fixture.root);
    const { call, pre, post, stop } = session(fixture);
    await call({ hook_event_name: "SessionStart", source: "startup" });
    for (const [tool, input] of [
      ["Read", { file_path: "src/checkout.ts" }],
      ["Edit", { file_path: ".kb/symbols.yaml", old_string: "x" }],
      ["Edit", { file_path: "src/checkout.ts", old_string: "total" }],
      ["Grep", { pattern: "x" }],
    ] as const) {
      const output = await call({
        hook_event_name: "PreToolUse",
        tool_name: tool,
        tool_input: input,
      });
      expect(JSON.stringify(output)).not.toContain("permissionDecision");
      expect(JSON.stringify(output)).not.toContain("updatedInput");
      await pre(tool, input);
    }
    await post("Edit", { file_path: "src/checkout.ts" });
    await stop();
    expect(snapshotTree(fixture.root)).toEqual(before);
  });
});

describe("usage telemetry", () => {
  const optedIn = { KIBI_DIAGNOSTIC_MODE: "1" };

  function usageRows(fixture: Fixture): Record<string, unknown>[] {
    const logPath = path.join(fixture.root, ".kb", "usage.log");
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  test("writes no rows unless the operator opted in", async () => {
    const fixture = createKibiWorkspace();
    const { pre, post } = session(fixture);
    await pre("Read", {
      file_path: path.join(fixture.root, "src/checkout.ts"),
    });
    await post("Edit", {
      file_path: path.join(fixture.root, "src/checkout.ts"),
    });
    expect(usageRows(fixture)).toEqual([]);
  });

  test("records whether the agent consulted Kibi before reading and editing", async () => {
    const fixture = createKibiWorkspace();
    const { pre, post } = session(fixture, "s-telemetry", optedIn);
    const source = path.join(fixture.root, "src/checkout.ts");

    await pre("Grep", { pattern: "total" });
    await pre("Read", { file_path: source });
    await post("Edit", { file_path: source });
    await post("mcp__plugin_kibi-claude_kibi__kb_search", {
      query: "rounding",
    });
    await post("Edit", { file_path: source });

    const rows = usageRows(fixture);
    expect(rows.map((row) => [row.hook_action, row.kb_used_before])).toEqual([
      ["search_tip", false],
      ["read_snippet", false],
      ["edited", false],
      ["kb_usage", false],
      ["edited", true],
    ]);
    expect(rows[1]).toMatchObject({
      interface: "hook",
      host: "claude-code",
      session_id: "s-telemetry",
      workspace_root: fixture.root,
      host_tool: "Read",
      path: "src/checkout.ts",
      path_kind: "source",
      requirement_ids: ["REQ-checkout-rounding", "REQ-currency-display"],
    });
    expect(rows[3]).toMatchObject({ kb_operation: "kb_search" });
    // Edit rows name the requirements the edited file implements, which is
    // what lets the acceptance report judge lookup-before-first-edit.
    expect(rows[2]).toMatchObject({
      host_tool: "Edit",
      path: "src/checkout.ts",
      requirement_ids: ["REQ-checkout-rounding", "REQ-currency-display"],
    });
  });

  test("records CLI lookups and unlinked edits for the lookup-before-edit metric", async () => {
    const fixture = createKibiWorkspace();
    const { post } = session(fixture, "s-cli", optedIn);
    await post("Bash", {
      command: `printf '%s\\n' '{"query":"rounding"}' | npx --no-install kibi search --input -`,
    });
    await post("Edit", { file_path: path.join(fixture.root, "src/helper.ts") });

    expect(
      usageRows(fixture).map((row) => [
        row.hook_action,
        row.kb_operation,
        row.requirement_ids,
      ]),
    ).toEqual([
      ["kb_usage", "kb_search", []],
      ["edited", null, []],
    ]);
  });

  test("records suppressed context as silent instead of dropping the call", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture, "s-silent", optedIn);
    const source = path.join(fixture.root, "src/checkout.ts");
    await pre("Read", { file_path: source });
    await pre("Read", { file_path: source });
    expect(usageRows(fixture).map((row) => row.hook_action)).toEqual([
      "read_snippet",
      "read_silent",
    ]);
  });

  test("ignores tool calls on files outside the knowledge surface", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture, "s-other", optedIn);
    await pre("Read", { file_path: path.join(fixture.root, "README.md") });
    expect(usageRows(fixture)).toEqual([]);
  });
});

describe("workspace stamp", () => {
  test("PreToolUse names the session workspace on every Kibi MCP call", async () => {
    const fixture = createKibiWorkspace();
    const result = await runHook(
      {
        session_id: "s-stamp",
        cwd: path.join(fixture.root, "src"),
        hook_event_name: "PreToolUse",
        tool_name: "mcp__plugin_kibi-claude_kibi__kb_search",
        tool_input: { query: "rounding" },
      },
      { pluginData: fixture.pluginData, env: {} },
    );
    // No permission decision: Claude Code's permission flow still applies.
    expect(result).toEqual({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        updatedInput: { query: "rounding", workspaceRoot: fixture.root },
      },
    });
  });

  test("a Kibi call outside any Kibi workspace is left alone", async () => {
    const root = tempDir("kibi-claude-plain-");
    const pluginData = tempDir("kibi-claude-plain-data-");
    write(root, ".git/HEAD", "ref: refs/heads/main\n");
    const result = await runHook(
      {
        session_id: "s-stamp",
        cwd: root,
        hook_event_name: "PreToolUse",
        tool_name: "mcp__plugin_kibi-claude_kibi__kb_search",
        tool_input: { query: "rounding" },
      },
      { pluginData, env: {} },
    );
    expect(result).toEqual({});
  });
});

// implements REQ-agent-core-edit-snippets
const claudePluginRoot = path.resolve(import.meta.dir, "..");

type HookCommandRun = { code: number | null; stdout: string; stderr: string };

/**
 * Run the command `hooks/hooks.json` registers for `event` the way Claude
 * Code does for a tool call its matcher selects: through a shell, from the
 * session cwd, with the plugin root and data directories in the environment
 * and the hook payload on stdin. The command starts the committed
 * `bin/hook-runner.mjs` bundle that installs ship.
 */
function runClaudeHookCommand(
  event: string,
  toolName: string,
  payload: Record<string, unknown>,
  fixture: Fixture,
): Promise<HookCommandRun> {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(claudePluginRoot, "hooks", "hooks.json"), "utf8"),
  ) as {
    hooks: Record<
      string,
      { matcher?: string; hooks: { type: string; command: string }[] }[]
    >;
  };
  const group = manifest.hooks[event]?.find(
    (candidate) =>
      candidate.matcher === undefined ||
      new RegExp(`^(?:${candidate.matcher})$`).test(toolName),
  );
  const command = group?.hooks[0]?.command;
  if (!command) throw new Error(`hooks.json routes no ${event} ${toolName}`);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    CLAUDE_PLUGIN_ROOT: claudePluginRoot,
    CLAUDE_PLUGIN_DATA: fixture.pluginData,
  };
  // A developer's own telemetry opt-in must not reach the hook process.
  for (const key of ["KIBI_DIAGNOSTIC_MODE", "KIBI_CLI_DIAGNOSTIC_MODE"]) {
    Reflect.deleteProperty(env, key);
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: fixture.root,
      env,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.setEncoding("utf8").on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.stdin.end(
      JSON.stringify({
        ...payload,
        hook_event_name: event,
        tool_name: toolName,
      }),
    );
  });
}

describe("hook command pre-edit snippet (end to end)", () => {
  test("the PreToolUse command gives a first Edit of linked code its requirement, what it must keep true and its decision within the snippet budget", async () => {
    const fixture = createKibiWorkspace();
    const edit = () =>
      runClaudeHookCommand(
        "PreToolUse",
        "Edit",
        {
          session_id: "e2e-edit",
          cwd: fixture.root,
          tool_input: {
            file_path: path.join(fixture.root, "src/checkout.ts"),
            old_string: "  return Math.round(total * 100) / 100;",
            new_string: "  return total;",
          },
        },
        fixture,
      );

    const run = await edit();
    expect(run.code).toBe(0);
    expect(run.stderr).toBe("");
    const output = JSON.parse(run.stdout) as HookOutput;
    const text = contextOf(output, "PreToolUse") ?? "";
    expect(text).toStartWith(
      "Kibi knowledge for src/checkout.ts (symbol manifest):\n- REQ-checkout-rounding: Checkout totals round to cents — computeTotal\n",
    );
    expect(text).toContain(
      "\nREQ-checkout-rounding must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.\n",
    );
    expect(text).toContain(
      "\nDecision: ADR-money-as-decimal: Money is computed as decimal cents.\n",
    );
    expect(text).toContain(
      "\nThe edit is inside computeTotal, which implements REQ-checkout-rounding.\n",
    );
    expect(text.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);

    // The session already has the snippet; the same edit adds nothing new.
    const repeat = await edit();
    expect(repeat.code).toBe(0);
    expect(JSON.parse(repeat.stdout)).toEqual({});
  }, 30_000);
});
