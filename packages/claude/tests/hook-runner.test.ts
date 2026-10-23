// implements REQ-claude-code-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  CONFIRM_FIRM_EDITS_ENV,
  type HookOutput,
  runHook,
} from "../src/hook-runner";
import { MAX_SNIPPET_CHARS } from "../src/snippets";
import {
  CHECKOUT_SOURCE,
  COORDINATES_YAML,
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

/**
 * The fixture's requirements are firm (no agent origin), so edit snippets
 * are tested with the firm-edit confirmation off; its own tests turn it on.
 */
const NO_FIRM_CONFIRM = { [CONFIRM_FIRM_EDITS_ENV]: "0" };

function session(
  fixture: Fixture,
  sessionId = "s1",
  env: NodeJS.ProcessEnv = NO_FIRM_CONFIRM,
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
      "REQ-checkout-rounding [firm: ask before changing]: Checkout totals round to cents — computeTotal",
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
      "Decision: ADR-money-as-decimal [firm: ask before changing]: Money is computed as decimal cents.",
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
      "Decision: ADR-money-as-decimal [firm: ask before changing]: Money is computed as decimal cents.",
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

  test("after a read, the first edit adds what must stay true and the impact check without repeating the read", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture);
    await pre("Read", { file_path: "src/checkout.ts" });

    const first = await pre("Edit", {
      file_path: "src/checkout.ts",
      old_string: "let total = 0;",
      new_string: "let total = 1;",
    });
    expect(first?.split("\n")).toEqual([
      "Kibi: this edit to src/checkout.ts is inside computeTotal, which implements REQ-checkout-rounding.",
      "REQ-checkout-rounding must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.",
      "Decision: ADR-money-as-decimal [firm: ask before changing]: Money is computed as decimal cents.",
      'Behavior changes here are traced to these requirements; kb_check({sourceFiles:["src/checkout.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true}) reports ownership drift after the edit.',
    ]);
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

  test("after a read, a whole-file write still names what must stay true", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture);
    await pre("Read", { file_path: "src/checkout.ts" });
    const text = await pre("Write", {
      file_path: "src/checkout.ts",
      content: "export {};\n",
    });
    expect(text).toStartWith(
      "Kibi: this edit to src/checkout.ts changes code that implements REQ-checkout-rounding, REQ-currency-display.",
    );
    expect(text).toContain("REQ-checkout-rounding must keep true:");
    expect(text).toContain('kb_check({sourceFiles:["src/checkout.ts"]');
    expect(text).not.toContain("Kibi knowledge for");
  });

  test("an unowned source file's note names requirements sharing its path words", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture);
    const text = await pre("Write", {
      file_path: "src/checkout/checkout-summary.ts",
      content: "export {}",
    });
    expect(text).toContain("that does not mean no recorded rule covers");
    expect(text).toContain(
      "Requirements whose titles share words with this path or the request: REQ-checkout-rounding: Checkout totals round to cents",
    );
    // A superseded requirement is not a candidate.
    expect(text).not.toContain("REQ-currency-display");
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

  test("a manifest written as one flow sequence still yields edit snippets", async () => {
    const fixture = createKibiWorkspace();
    // The pre-2.18.0 writer appended to `symbols: []`, so every symbol sat
    // on this one line and the hook announced the files as unowned.
    const flow =
      "# symbols.yaml\nsymbols: [ { id: SYM-computeTotal, title: computeTotal, sourceFile: src/checkout.ts, relationships: [ { type: implements, target: REQ-checkout-rounding }, { type: covered_by, target: TEST-checkout-rounding } ] }, { id: SYM-formatTotal, title: formatTotal, sourceFile: src/checkout.ts, links: [REQ-currency-display] } ]\n";
    fs.writeFileSync(path.join(fixture.root, ".kb/symbols.yaml"), flow);
    const { pre } = session(fixture);
    const text = await pre("Edit", {
      file_path: "src/checkout.ts",
      old_string: "let total = 0;",
      new_string: "let total = 1;",
    });
    expect(text).toContain("REQ-checkout-rounding");
    expect(text).not.toContain("no symbol in src/checkout.ts is linked");
  });

  test("an unreadable manifest is reported once instead of calling files unowned", async () => {
    const fixture = createKibiWorkspace();
    fs.writeFileSync(
      path.join(fixture.root, ".kb/symbols.yaml"),
      "symbols: [ { id: SYM-computeTotal, sourceFile: src/checkout.ts\n",
    );
    const { pre } = session(fixture);
    const text = await pre("Edit", {
      file_path: "src/checkout.ts",
      old_string: "let total = 0;",
      new_string: "let total = 1;",
    });
    expect(text).toContain("could not read .kb/symbols.yaml");
    expect(text).toContain('kb_query({sourceFile:"src/checkout.ts"})');
    expect(text).not.toContain("is linked to a requirement yet");
    // Once per session, whatever file is edited next.
    expect(
      await pre("Write", { file_path: "src/new-feature.ts", content: "" }),
    ).toBeUndefined();
  });

  test("a coordinate-bound file whose record was not indexed is not called unowned", async () => {
    const fixture = createKibiWorkspace();
    // helper.ts has a manifest record without a link and a coordinate entry:
    // the discovery note is right. sealed.ts has a coordinate entry but no
    // readable record: the manifest, not the file, is the problem.
    fs.writeFileSync(
      path.join(fixture.root, ".kb/symbol-coordinates.yaml"),
      `${COORDINATES_YAML}  SYM-unlinked:\n    sourceFile: src/helper.ts\n    sourceLine: 1\n  SYM-sealed:\n    sourceFile: src/sealed.ts\n    sourceLine: 1\n`,
    );
    write(fixture.root, "src/sealed.ts", "export const sealed = 1;\n");
    const { pre } = session(fixture);
    expect(
      await pre("Edit", {
        file_path: "src/helper.ts",
        old_string: "helper = 1",
        new_string: "helper = 2",
      }),
    ).toContain("no symbol in src/helper.ts is linked");
    const sealed = await pre("Edit", {
      file_path: "src/sealed.ts",
      old_string: "sealed = 1",
      new_string: "sealed = 2",
    });
    expect(sealed).toContain("could not read .kb/symbols.yaml");
    expect(sealed).not.toContain("is linked to a requirement yet");
    expect(
      await pre("Write", { file_path: "src/new-feature.ts", content: "" }),
    ).toContain("no symbol in src/new-feature.ts is linked");
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

/**
 * Replays of hook traces recorded on a test project during an evaluation,
 * with the project's paths rewritten to this fixture. Each asserts the
 * observable output the evaluation found missing.
 */
describe("evaluation trace replays", () => {
  const linked = (fixture: Fixture) =>
    path.join(fixture.root, "src/checkout.ts");

  test("Read, then Edit of the same linked file: the edit names what must stay true and the impact check", async () => {
    const fixture = createKibiWorkspace();
    const { call, pre, post } = session(fixture, "b1");
    await call({ hook_event_name: "SessionStart", source: "startup" });
    await pre("Grep", { pattern: "total" });
    const read = await pre("Read", { file_path: linked(fixture) });
    expect(read).toContain("Covered by: TEST-checkout-rounding.");
    expect(read).toContain("Next layer:");
    expect(read).not.toContain("must keep true");

    const edit = await pre("Edit", {
      file_path: linked(fixture),
      old_string: "  return Math.round(total * 100) / 100;",
      new_string: "  return Math.round(total * 100) / 100; // probe",
    });
    expect(edit).toContain(
      "this edit to src/checkout.ts is inside computeTotal, which implements REQ-checkout-rounding.",
    );
    expect(edit).toContain("REQ-checkout-rounding must keep true: ");
    expect(edit).toContain(
      'kb_check({sourceFiles:["src/checkout.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})',
    );
    // What the Read already showed is not repeated.
    expect(edit).not.toContain("Kibi knowledge for");
    expect(edit).not.toContain("Covered by");
    expect(edit).not.toContain("Next layer");
    expect(await post("Edit", { file_path: linked(fixture) })).toEqual({});

    // A later edit of the same symbol has nothing new to add.
    expect(
      await pre("Edit", {
        file_path: linked(fixture),
        old_string: "let total = 0;",
        new_string: "let total = 1;",
      }),
    ).toBeUndefined();
  });

  test("a SessionStart after compaction shows the linked file's snippet again", async () => {
    const fixture = createKibiWorkspace();
    const { call, pre } = session(fixture, "b1");
    await call({ hook_event_name: "SessionStart", source: "startup" });
    expect(await pre("Read", { file_path: linked(fixture) })).toContain(
      "Kibi knowledge for src/checkout.ts",
    );
    expect(await pre("Read", { file_path: linked(fixture) })).toBeUndefined();

    const compact = contextOf(
      await call({ hook_event_name: "SessionStart", source: "compact" }),
      "SessionStart",
    );
    expect(compact).toContain("1 source files have requirement-linked symbols");
    const again = await pre("Read", { file_path: linked(fixture) });
    expect(again).toContain("Kibi knowledge for src/checkout.ts");
    expect(again).toContain("Covered by: TEST-checkout-rounding.");
    // Deduplication resumes from the reset.
    expect(await pre("Read", { file_path: linked(fixture) })).toBeUndefined();
  });

  test("a resume keeps the transcript, so nothing is shown twice", async () => {
    const fixture = createKibiWorkspace();
    const { call, pre, post } = session(fixture, "b1");
    await pre("Read", { file_path: linked(fixture) });
    await pre("Grep", { pattern: "total" });
    await call({ hook_event_name: "SessionStart", source: "resume" });
    expect(await pre("Read", { file_path: linked(fixture) })).toBeUndefined();
    expect(await pre("Grep", { pattern: "total" })).toBeUndefined();

    // Pending edits survive a reset: the Stop reminder is about work, not context.
    await post("Edit", { file_path: linked(fixture) });
    await call({ hook_event_name: "SessionStart", source: "compact" });
    expect(await pre("Grep", { pattern: "total" })).toContain("Kibi tip");
    expect(await session(fixture, "b1").stop()).toContain("src/checkout.ts");
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

/** The stop reminder's wording for edits without a later impact check. */
const IMPACT_REMINDER = "without a Kibi impact check";

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
      expect((await stop()) ?? "").not.toContain(IMPACT_REMINDER);
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
    expect((await withGate.stop()) ?? "").not.toContain(IMPACT_REMINDER);

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

describe("shell commands", () => {
  /** Turns the fixture into a real git work tree with everything committed. */
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

  /** Sets a file's modification time `seconds` in the past. */
  function age(fixture: Fixture, relativePath: string, seconds: number): void {
    const past = new Date(Date.now() - seconds * 1000);
    fs.utimesSync(path.join(fixture.root, relativePath), past, past);
  }

  test("a command that reads a linked file gets the read snippet once", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture);
    const text = await pre("Bash", {
      command: "cd src && sed -n 1,20p checkout.ts | head",
    });
    expect(text).toContain("REQ-checkout-rounding");
    expect(text).toContain('kb_query({id:"REQ-checkout-rounding"})');
    expect(await pre("Bash", { command: "cat src/checkout.ts" })).toBe(
      undefined,
    );
    expect(await pre("Read", { file_path: "src/checkout.ts" })).toBe(undefined);
  });

  test("reading .kb/ or searching the tree from the shell gets the same notes as the tools", async () => {
    const fixture = createKibiWorkspace();
    const { pre } = session(fixture);
    expect(
      await pre("Bash", {
        command: "cat .kb/requirements/REQ-checkout-rounding.md",
      }),
    ).toContain(".kb/ holds Kibi-managed knowledge");
    expect(
      await pre("Bash", { command: "grep -rn 'total' src | head -20" }),
    ).toContain("Kibi tip");
    expect(await pre("Grep", { pattern: "total" })).toBeUndefined();
    expect(await pre("Bash", { command: "ls src" })).toBeUndefined();
  });

  test("a linked file the command changed gets the edit snippet and a stop reminder", async () => {
    const fixture = createKibiWorkspace();
    commitAll(fixture);
    const { pre, post, stop } = session(fixture);
    await pre("Bash", { command: "python3 rewrite.py" });
    write(fixture.root, "src/checkout.ts", `${CHECKOUT_SOURCE}// changed\n`);
    const text = contextOf(
      await post("Bash", { command: "python3 rewrite.py" }),
      "PostToolUse",
    );
    expect(text).toContain("REQ-checkout-rounding");
    expect(text).toContain("must keep true");
    expect(text).toContain('kb_check({sourceFiles:["src/checkout.ts"]');
    expect(await stop()).toContain("src/checkout.ts");
  });

  test("a new or changed source file no requirement owns gets the discovery note", async () => {
    const fixture = createKibiWorkspace();
    commitAll(fixture);
    const { pre, post } = session(fixture);
    await pre("Bash", { command: "cat > src/report.ts <<'EOF'" });
    write(fixture.root, "src/report.ts", "export const report = 1;\n");
    const text = contextOf(
      await post("Bash", { command: "cat > src/report.ts <<'EOF'" }),
      "PostToolUse",
    );
    expect(text).toContain("no symbol in src/report.ts is linked");
    // The note is shown once per file.
    await pre("Bash", { command: "echo more >> src/report.ts" });
    write(fixture.root, "src/report.ts", "export const report = 2;\n");
    expect(
      await post("Bash", { command: "echo more >> src/report.ts" }),
    ).toEqual({});
  });

  test("a command that writes a linked file in place says what must stay true before it runs", async () => {
    const fixture = createKibiWorkspace();
    commitAll(fixture);
    const { pre, post, stop } = session(fixture);
    const command = "sed -i s/total/sum/ src/checkout.ts";
    const before = await pre("Bash", { command });
    expect(before).toContain("REQ-checkout-rounding");
    expect(before).toContain("must keep true");
    expect(before).toContain('kb_check({sourceFiles:["src/checkout.ts"]');
    write(fixture.root, "src/checkout.ts", `${CHECKOUT_SOURCE}// sed\n`);
    // Already said before the edit: not repeated after it.
    expect(await post("Bash", { command })).toEqual({});
    expect(await stop()).toContain("src/checkout.ts");
  });

  test("an in-place write after a shell read adds what must stay true; a redirect elsewhere stays a read", async () => {
    const fixture = createKibiWorkspace();
    commitAll(fixture);
    const { pre } = session(fixture);
    // Output redirected away from the linked file: still a read.
    const read = await pre("Bash", {
      command: "grep -n total src/checkout.ts > /tmp/kibi-hook-out.txt",
    });
    expect(read).toContain("REQ-checkout-rounding");
    expect(read).not.toContain("must keep true");
    const edit = await pre("Bash", {
      command: "cd src && perl -pi -e 's/total/sum/' checkout.ts",
    });
    expect(edit).toContain("must keep true");
    expect(
      await pre("Bash", { command: "printf '//x\\n' >> src/checkout.ts" }),
    ).toBeUndefined();
  });

  test("a sed script with | or ; inside quotes is still an in-place write, after a read too", async () => {
    const fixture = createKibiWorkspace();
    commitAll(fixture);
    const { pre } = session(fixture);
    const read = await pre("Bash", { command: "sed -n 1,40p src/checkout.ts" });
    expect(read).not.toContain("must keep true");
    const edit = await pre("Bash", {
      command:
        "sed -i 's|total(): number {|total(): number { // x|' src/checkout.ts",
    });
    expect(edit).toContain("REQ-checkout-rounding");
    expect(edit).toContain("must keep true");
    const fresh = session(fixture, "s-semicolon");
    expect(
      await fresh.pre("Bash", {
        command: 'sed -i "s;total;sum;" src/checkout.ts',
      }),
    ).toContain("must keep true");
  });

  test("tee -a and >> on a linked file each say what must stay true before they run", async () => {
    const fixture = createKibiWorkspace();
    commitAll(fixture);
    for (const [id, command] of [
      ["s-tee", "echo '// x' | tee -a src/checkout.ts"],
      ["s-append", "echo '// x' >> src/checkout.ts"],
    ] as const) {
      const { pre } = session(fixture, id);
      expect(await pre("Bash", { command })).toContain("must keep true");
    }
    // A quoted '>' is text, not a redirection: the command only reads.
    const { pre } = session(fixture, "s-quoted");
    const quoted = await pre("Bash", {
      command: "echo 'total > src/checkout.ts' && cat src/checkout.ts",
    });
    expect(quoted).toContain("REQ-checkout-rounding");
    expect(quoted).not.toContain("must keep true");
  });

  test("files left dirty before the command are not attributed to it", async () => {
    const fixture = createKibiWorkspace();
    commitAll(fixture);
    write(fixture.root, "src/checkout.ts", `${CHECKOUT_SOURCE}// earlier\n`);
    age(fixture, "src/checkout.ts", 60);
    const { pre, post, stop } = session(fixture);
    await pre("Bash", { command: "npm test" });
    expect(await post("Bash", { command: "npm test" })).toEqual({});
    expect(await stop()).toBeUndefined();
  });

  test("a shell edit of a linked file is an edit row for the lookup-before-edit metric", async () => {
    const fixture = createKibiWorkspace();
    commitAll(fixture);
    const { pre, post } = session(fixture, "s-bash", {
      ...NO_FIRM_CONFIRM,
      KIBI_DIAGNOSTIC_MODE: "1",
    });
    await pre("Bash", { command: "sed -i s/total/sum/ src/checkout.ts" });
    write(fixture.root, "src/checkout.ts", `${CHECKOUT_SOURCE}// sed\n`);
    await post("Bash", { command: "sed -i s/total/sum/ src/checkout.ts" });
    const rows = fs
      .readFileSync(path.join(fixture.root, ".kb", "usage.log"), "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
    expect(rows.at(-1)).toMatchObject({
      host_tool: "Bash",
      hook_action: "edited",
      path: "src/checkout.ts",
      requirement_ids: ["REQ-checkout-rounding", "REQ-currency-display"],
      kb_used_before: false,
    });
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

// implements REQ-claude-firm-edit-confirmation
describe("firm requirement confirmation", () => {
  /** Raw PreToolUse output with the confirmation on. */
  function firmSession(
    fixture: Fixture,
    sessionId = "firm",
    env: NodeJS.ProcessEnv = {},
  ) {
    const base = session(fixture, sessionId, env);
    const raw = (toolName: string, toolInput: Record<string, unknown>) =>
      base.call({
        hook_event_name: "PreToolUse",
        tool_name: toolName,
        tool_input: toolInput,
      });
    return { ...base, raw };
  }
  const editTotal = {
    file_path: "src/checkout.ts",
    old_string: "let total = 0;",
  };

  test("an edit inside a firm requirement's symbol is put to the person, with the requirement named to both", async () => {
    const fixture = createKibiWorkspace();
    const { raw } = firmSession(fixture);
    const output = await raw("Edit", editTotal);
    const specific = output.hookSpecificOutput;
    expect(specific?.permissionDecision).toBe("ask");
    expect(specific?.permissionDecisionReason).toBe(
      "Kibi: this edit changes computeTotal in src/checkout.ts, which implements a firm requirement recorded in the knowledge base: REQ-checkout-rounding: Checkout totals round to cents. Allow it if the change keeps that requirement, or if you mean to change the requirement too.",
    );
    // The agent still gets the edit snippet, and what the question means.
    expect(specific?.additionalContext).toContain(
      "Kibi knowledge for src/checkout.ts",
    );
    expect(specific?.additionalContext).toContain(
      "Kibi asked the person to confirm this edit because it changes code that implements firm requirement REQ-checkout-rounding.",
    );
    expect(JSON.stringify(output)).not.toMatch(/"(?:deny|allow)"/);
  });

  test("once an edit was allowed the requirement is not asked about again; a declined edit is asked again", async () => {
    const fixture = createKibiWorkspace();
    const { raw, post } = firmSession(fixture);
    expect(
      (await raw("Edit", editTotal)).hookSpecificOutput?.permissionDecision,
    ).toBe("ask");
    // Declined: no PostToolUse, so the next attempt asks again.
    expect(
      (await raw("Edit", editTotal)).hookSpecificOutput?.permissionDecision,
    ).toBe("ask");
    await post("Edit", editTotal);
    expect(
      (await raw("Edit", { ...editTotal, old_string: "return Math.round" }))
        .hookSpecificOutput?.permissionDecision,
    ).toBeUndefined();
  });

  test("edits outside firm current requirements are not asked about", async () => {
    const fixture = createKibiWorkspace();
    // formatTotal implements only a superseded requirement.
    expect(
      JSON.stringify(
        await firmSession(fixture).raw("Edit", {
          file_path: "src/checkout.ts",
          old_string: "return `$${total.toFixed(2)}`;",
        }),
      ),
    ).not.toContain("permissionDecision");
    // An agent-written requirement is a default decision, not a firm one.
    const agentWritten = createKibiWorkspace();
    const requirement = path.join(
      agentWritten.root,
      ".kb/requirements/REQ-checkout-rounding.md",
    );
    fs.writeFileSync(
      requirement,
      fs
        .readFileSync(requirement, "utf8")
        .replace("status: open\n", "status: open\norigin:\n  kind: agent\n"),
    );
    expect(
      JSON.stringify(await firmSession(agentWritten).raw("Edit", editTotal)),
    ).not.toContain("permissionDecision");
    // The operator opted out.
    expect(
      JSON.stringify(
        await firmSession(fixture, "opt-out", NO_FIRM_CONFIRM).raw(
          "Edit",
          editTotal,
        ),
      ),
    ).not.toContain("permissionDecision");
  });

  test("a whole-file write and an in-place shell write are asked about too", async () => {
    const fixture = createKibiWorkspace();
    const write = await firmSession(fixture, "w").raw("Write", {
      file_path: "src/checkout.ts",
      content: "export {};\n",
    });
    expect(write.hookSpecificOutput?.permissionDecisionReason).toContain(
      "this edit changes src/checkout.ts, which implements a firm requirement",
    );
    const shell = await firmSession(fixture, "sh").raw("Bash", {
      command: "sed -i s/total/sum/ src/checkout.ts",
    });
    expect(shell.hookSpecificOutput?.permissionDecision).toBe("ask");
  });
});

// implements REQ-claude-decision-capture-nudges, REQ-claude-request-topic-candidates
describe("decision capture", () => {
  const prompt = (fixture: Fixture, text: string, sessionId = "s1") =>
    runHook(
      {
        session_id: sessionId,
        cwd: fixture.root,
        hook_event_name: "UserPromptSubmit",
        prompt: text,
      },
      { pluginData: fixture.pluginData, env: NO_FIRM_CONFIRM },
    );

  test("a request that reads as a rule is told, before the work, that recording it is part of the change", async () => {
    const fixture = createKibiWorkspace();
    const text = contextOf(
      await prompt(fixture, "From now on API keys must expire after 90 days."),
      "UserPromptSubmit",
    );
    expect(text).toContain(
      'Kibi: this request reads as a rule or decision (it says "from now on").',
    );
    expect(text).toContain("recorded with kb_upsert");
    expect(text).toContain("as part of this change, not after it");
    expect(await prompt(fixture, "Rename the helper to sum.")).toEqual({});
  });

  test("an unlinked file's note ranks requirements by the request's words too", async () => {
    const fixture = createKibiWorkspace();
    await prompt(
      fixture,
      "Change how checkout totals are rounded for refunds.",
    );
    const text = await session(fixture).pre("Write", {
      file_path: "src/refunds.ts",
      content: "export {}",
    });
    expect(text).toContain(
      "Requirements whose titles share words with this path or the request: REQ-checkout-rounding",
    );
    const other = await session(fixture, "s2").pre("Write", {
      file_path: "src/refunds.ts",
      content: "export {}",
    });
    expect(other).toContain("nothing recorded is known to cover it");
  });

  test("a session that changed source and recorded nothing is asked once at stop to record the decision or say there was none", async () => {
    const fixture = createKibiWorkspace();
    await prompt(fixture, "Totals must never be negative.");
    const { post, stop } = session(fixture);
    await post("Edit", { file_path: "src/checkout.ts" });
    const text = await stop();
    expect(text).toStartWith(
      "Kibi: a request this session read as a rule or decision, the session changed source files, and nothing was recorded in the knowledge base.",
    );
    expect(text).toContain("the final report says so in one line");
    expect(text).toContain(IMPACT_REMINDER);
    expect(await stop()).toBeUndefined();

    const recorded = createKibiWorkspace();
    const withRecord = session(recorded);
    await withRecord.post("Edit", { file_path: "src/checkout.ts" });
    await withRecord.post("mcp__kibi__kb_upsert", {
      type: "scenario",
      id: "SCEN-x",
    });
    await withRecord.post("mcp__kibi__kb_check", {
      includeImpactDiagnostics: true,
      includeWorkingTreeDiff: true,
    });
    expect(await withRecord.stop()).toBeUndefined();
  });

  test("a session that wrote a requirement is asked once at stop for a signoff view, unless kibi signoff ran since", async () => {
    const fixture = createKibiWorkspace();
    const { post, stop } = session(fixture);
    await post("mcp__kibi__kb_upsert", { type: "req", id: "REQ-x" });
    const text = await stop();
    expect(text).toStartWith(
      "Kibi: this session recorded or changed requirements, and the person has not seen them as a signoff view.",
    );
    expect(text).toContain("run `kibi signoff`");
    expect(await stop()).toBeUndefined();

    const dryRun = createKibiWorkspace();
    const preview = session(dryRun);
    await preview.post("mcp__kibi__kb_upsert", {
      type: "req",
      id: "REQ-x",
      dryRun: true,
    });
    expect(await preview.stop()).toBeUndefined();

    const shown = createKibiWorkspace();
    const withView = session(shown);
    await withView.post("mcp__kibi__kb_upsert", { type: "req", id: "REQ-x" });
    const latest = path.join(shown.root, ".kb", "briefs", "signoff");
    fs.mkdirSync(latest, { recursive: true });
    const later = new Date(Date.now() + 60_000);
    fs.writeFileSync(path.join(latest, "latest.json"), "{}");
    fs.utimesSync(path.join(latest, "latest.json"), later, later);
    expect(await withView.stop()).toBeUndefined();
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
  const optedIn = { ...NO_FIRM_CONFIRM, KIBI_DIAGNOSTIC_MODE: "1" };

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
    // The requirement is firm, so the edit is also put to the person.
    expect(output.hookSpecificOutput?.permissionDecision).toBe("ask");
    expect(output.hookSpecificOutput?.permissionDecisionReason).toContain(
      "REQ-checkout-rounding: Checkout totals round to cents",
    );
    const [text = "", firmContext] = (
      output.hookSpecificOutput?.additionalContext ?? ""
    ).split("\n\n");
    expect(firmContext).toStartWith(
      "Kibi asked the person to confirm this edit",
    );
    expect(text).toStartWith(
      "Kibi knowledge for src/checkout.ts (symbol manifest):\n- REQ-checkout-rounding [firm: ask before changing]: Checkout totals round to cents — computeTotal\n",
    );
    expect(text).toContain(
      "\nREQ-checkout-rounding must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.\n",
    );
    expect(text).toContain(
      "\nDecision: ADR-money-as-decimal [firm: ask before changing]: Money is computed as decimal cents.\n",
    );
    expect(text).toContain(
      "\nThe edit is inside computeTotal, which implements REQ-checkout-rounding.\n",
    );
    expect(text.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);

    // The session already has the snippet; an edit not yet allowed is still
    // put to the person, without repeating the snippet.
    const repeat = await edit();
    expect(repeat.code).toBe(0);
    const again = JSON.parse(repeat.stdout) as HookOutput;
    expect(again.hookSpecificOutput?.permissionDecision).toBe("ask");
    expect(again.hookSpecificOutput?.additionalContext).toStartWith(
      "Kibi asked the person to confirm this edit",
    );
  }, 30_000);
});
