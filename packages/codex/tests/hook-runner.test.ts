import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { captureReminder } from "kibi-agent-core/decision-guard";
import { MAX_SNIPPET_CHARS } from "kibi-agent-core/snippets";
import { type HookResult, runHook } from "../src/hook-runner";
import { loadHookState } from "../src/hook-state";
import { impactCheckReminder } from "../src/messages";

function createTempRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function optInWorkspace(root: string): void {
  fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
}

const tempRoots: string[] = [];

async function recordKbUpsert(cwd: string, pluginData: string): Promise<void> {
  await runHook(
    {
      event: "PostToolUse",
      cwd,
      toolName: "CallMcpTool",
      toolInput: { toolName: "kb_upsert", arguments: {} },
    },
    { pluginData },
  );
}

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("Codex hook runner workspace opt-in", () => {
  test("every hook event stays silent in an unconfigured workspace", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);

    for (const event of ["SessionStart", "PreToolUse", "PostToolUse", "Stop"]) {
      const result = await runHook(
        {
          event,
          cwd,
          toolName: "Write",
          toolInput: { file_path: ".kb/requirements/REQ-1.md" },
        },
        { pluginData },
      );

      expect(result).toEqual({ continue: true });
      expect(result.systemMessage).toBeUndefined();
    }
  });

  test("unconfigured hooks neither track edits nor write state", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);

    await runHook(
      {
        event: "PostToolUse",
        cwd,
        toolName: "Edit",
        toolInput: { file_path: "src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook({ event: "Stop", cwd }, { pluginData });

    expect(fs.existsSync(path.join(pluginData, "workspaces"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, ".kb"))).toBe(false);
  });

  test("a nested repository with its own .git does not inherit opt-in", async () => {
    const enclosing = createTempRoot("kibi-codex-enclosing-");
    optInWorkspace(enclosing);
    const nested = path.join(enclosing, "vendored");
    fs.mkdirSync(path.join(nested, ".git"), { recursive: true });
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(nested, pluginData);

    const result = await runHook(
      {
        event: "SessionStart",
        cwd: nested,
      },
      { pluginData },
    );

    expect(result).toEqual({ continue: true });
    expect(result.systemMessage).toBeUndefined();
  });

  test("SessionStart stays quiet in an opted-in workspace", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);

    expect(
      await runHook({ event: "SessionStart", cwd }, { pluginData }),
    ).toEqual({ continue: true });
  });

  test("PreToolUse keeps the direct .kb edit warning in opted-in workspaces", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);

    const result = await runHook(
      {
        event: "PreToolUse",
        cwd,
        toolName: "Write",
        toolInput: { file_path: ".kb/config.json" },
      },
      { pluginData },
    );

    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain("Avoid direct edits to .kb/");
  });

  test("PreToolUse notes a source edit no symbol links, once, and ignores other edits", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    const write = (file_path: string) =>
      runHook(
        {
          event: "PreToolUse",
          session_id: "s1",
          cwd,
          toolName: "Write",
          toolInput: { file_path },
        },
        { pluginData },
      );

    const first = await write("src/hook-runner.ts");
    expect(first.systemMessage).toBeUndefined();
    expect(JSON.stringify(first)).toContain(
      "no symbol in src/hook-runner.ts is linked to a requirement yet",
    );
    expect(await write("src/hook-runner.ts")).toEqual({ continue: true });
    expect(await write("docs/guide.md")).toEqual({ continue: true });
    expect(await write("tests/hook-runner.test.ts")).toEqual({
      continue: true,
    });
  });

  test("PostToolUse tracks explicit meaningful paths in opted-in workspaces", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);

    await runHook(
      {
        event: "PostToolUse",
        cwd,
        toolName: "Edit",
        toolInput: { file_path: "src/hook-runner.ts" },
      },
      { pluginData },
    );

    const workspaceDataRoot = path.join(pluginData, "workspaces");
    const workspaceDirs = fs.readdirSync(workspaceDataRoot);
    expect(workspaceDirs).toHaveLength(1);
    const state = loadHookState(
      path.join(workspaceDataRoot, workspaceDirs[0] as string),
    );
    expect(state.dirtyPaths).toEqual(["src/hook-runner.ts"]);
  });

  test("Stop keeps freshness reminders scoped to the edited workspace", async () => {
    const workspaceA = createTempRoot("kibi-codex-a-");
    optInWorkspace(workspaceA);
    const workspaceB = createTempRoot("kibi-codex-b-");
    optInWorkspace(workspaceB);
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(workspaceA, workspaceB, pluginData);

    await runHook(
      {
        event: "PostToolUse",
        cwd: workspaceA,
        toolName: "Write",
        toolInput: { file_path: "docs/a.md" },
      },
      { pluginData },
    );

    // Activity in workspace B must not be visible from workspace A.
    await runHook(
      {
        event: "PostToolUse",
        cwd: workspaceB,
        toolName: "Write",
        toolInput: { file_path: "docs/b.md" },
      },
      { pluginData },
    );
    const stopA = await runHook(
      { event: "Stop", cwd: workspaceA },
      { pluginData },
    );
    expect(stopA.systemMessage).toContain("docs/a.md");
    expect(stopA.systemMessage).not.toContain("docs/b.md");
  });

  test("invocation from a subdirectory maps to the repository workspace state", async () => {
    const workspace = createTempRoot("kibi-codex-root-");
    optInWorkspace(workspace);
    const subdir = path.join(workspace, "packages", "codex");
    fs.mkdirSync(subdir, { recursive: true });
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(workspace, pluginData);

    await runHook(
      {
        event: "PostToolUse",
        cwd: subdir,
        toolName: "Write",
        toolInput: { file_path: "docs/subdir.md" },
      },
      { pluginData },
    );
    const stopFromRoot = await runHook(
      { event: "Stop", cwd: workspace },
      { pluginData },
    );

    expect(stopFromRoot.systemMessage).toContain("docs/subdir.md");
    expect(loadHookStateFromPluginData(pluginData).dirtyPaths).toEqual([]);
  });

  test("git worktrees keep separate hook state from the main checkout", async () => {
    const mainCheckout = createTempRoot("kibi-codex-main-");
    optInWorkspace(mainCheckout);
    const worktree = createTempRoot("kibi-codex-wt-");
    optInWorkspace(worktree);
    fs.writeFileSync(
      path.join(worktree, ".git"),
      "gitdir: elsewhere/kibi/.git/worktrees/wt\n",
    );
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(mainCheckout, worktree, pluginData);

    await runHook(
      {
        event: "PostToolUse",
        cwd: worktree,
        toolName: "Write",
        toolInput: { file_path: "docs/wt.md" },
      },
      { pluginData },
    );
    const stopMain = await runHook(
      { event: "Stop", cwd: mainCheckout },
      { pluginData },
    );

    expect(stopMain.systemMessage).toBeUndefined();
  });

  test("Stop keeps the impact-check reminder after unverified source edits", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    await runHook(
      {
        event: "PostToolUse",
        cwd,
        toolName: "Edit",
        toolInput: { file_path: "src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        event: "PostToolUse",
        cwd,
        toolName: "CallMcpTool",
        toolInput: { toolName: "kb_check" },
      },
      { pluginData },
    );
    await recordKbUpsert(cwd, pluginData);

    const result = await runHook({ event: "Stop", cwd }, { pluginData });

    expect(result.continue).toBe(true);
    expect(result.systemMessage).toContain("includeImpactDiagnostics");
    expect(result.systemMessage).toContain("src/hook-runner.ts");
  });

  test("Stop stays quiet after an impact-enabled kb_check covers source edits", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    await runHook(
      {
        event: "PostToolUse",
        cwd,
        toolName: "Edit",
        toolInput: { file_path: "src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        event: "PostToolUse",
        cwd,
        toolName: "CallMcpTool",
        toolInput: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["src/hook-runner.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );
    await recordKbUpsert(cwd, pluginData);

    expect(await runHook({ event: "Stop", cwd }, { pluginData })).toEqual({
      continue: true,
    });
  });

  test("hooks fall back to the process cwd when the payload omits it", async () => {
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);

    // In this dogfood repository the process cwd resolves to an opted-in
    // workspace, so the event must keep working without an explicit cwd.
    const result = await runHook({ event: "Stop" }, { pluginData });

    expect(result.continue).toBe(true);
  });

  test("unknown hook events continue without messages", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);

    expect(
      await runHook({ event: "FutureHookEvent", cwd }, { pluginData }),
    ).toEqual({ continue: true });
  });
});

function loadHookStateFromPluginData(pluginData: string) {
  const workspaceDirs = fs.readdirSync(path.join(pluginData, "workspaces"));
  expect(workspaceDirs).toHaveLength(1);
  return loadHookState(
    path.join(pluginData, "workspaces", workspaceDirs[0] as string),
  );
}

describe("Codex hook runner workspace stamp", () => {
  test("PreToolUse names the session workspace on every Kibi MCP call", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);
    optInWorkspace(cwd);
    fs.mkdirSync(path.join(cwd, "src"));
    const result = await runHook(
      {
        hook_event_name: "PreToolUse",
        cwd: path.join(cwd, "src"),
        tool_name: "mcp__kibi__kb_search",
        tool_input: { query: "checkout", limit: 5 },
      },
      { pluginData },
    );
    // Codex applies updatedInput only with an allow decision; that decision
    // does not override the server's own tool approval mode.
    expect(result).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        updatedInput: { query: "checkout", limit: 5, workspaceRoot: cwd },
      },
    });
  });

  test("other tools and unconfigured workspaces are left alone", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    const plain = createTempRoot("kibi-codex-plain-");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, plain, pluginData);
    optInWorkspace(cwd);
    expect(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          cwd,
          tool_name: "mcp__other__kb_search",
          tool_input: {},
        },
        { pluginData },
      ),
    ).toEqual({ continue: true });
    expect(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          cwd: plain,
          tool_name: "mcp__kibi__kb_search",
          tool_input: {},
        },
        { pluginData },
      ),
    ).toEqual({ continue: true });
  });
});

function writeFile(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

/** Opted-in workspace whose checkout code implements a grounded requirement. */
function linkedWorkspace(requirementStatus = "open"): string {
  const root = createTempRoot("kibi-codex-linked-");
  tempRoots.push(root);
  optInWorkspace(root);
  writeFile(
    root,
    ".kb/symbols.yaml",
    [
      "symbols:",
      "  - id: SYM-computeTotal",
      "    title: computeTotal",
      "    sourceFile: src/checkout.ts",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-checkout-rounding",
      "      - type: covered_by",
      "        target: TEST-checkout-rounding",
      "",
    ].join("\n"),
  );
  writeFile(
    root,
    ".kb/requirements/REQ-checkout-rounding.md",
    `---\nid: REQ-checkout-rounding\ntitle: Checkout totals round to cents\nstatus: ${requirementStatus}\nlinks:\n  - type: constrains\n    target: FACT-checkout-total\n  - type: requires_property\n    target: FACT-total-rounding-cents\n  - ADR-money-as-decimal\n---\n`,
  );
  writeFile(
    root,
    ".kb/facts/FACT-total-rounding-cents.md",
    "---\nid: FACT-total-rounding-cents\ntitle: Totals round half up to two decimals\nstatus: active\n---\n",
  );
  writeFile(
    root,
    ".kb/adr/ADR-money-as-decimal.md",
    "---\nid: ADR-money-as-decimal\ntitle: Money is computed as decimal cents\nstatus: accepted\n---\n",
  );
  writeFile(root, "src/checkout.ts", "export const computeTotal = 1;\n");
  return root;
}

const CHECKOUT_PATCH = [
  "*** Begin Patch",
  "*** Update File: src/checkout.ts",
  "@@",
  "-export const computeTotal = 1;",
  "+export const computeTotal = 2;",
  "*** End Patch",
].join("\n");

describe("Codex pre-edit knowledge", () => {
  async function preEdit(
    cwd: string,
    pluginData: string,
    sessionId = "codex-session-1",
  ) {
    return runHook(
      {
        hook_event_name: "PreToolUse",
        session_id: sessionId,
        cwd,
        tool_name: "apply_patch",
        tool_input: { command: CHECKOUT_PATCH },
      },
      { pluginData },
    );
  }

  test("an apply_patch to linked code names what its requirement must keep true and why", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);

    const result = await preEdit(cwd, pluginData);
    const context =
      result.hookSpecificOutput &&
      "additionalContext" in result.hookSpecificOutput
        ? result.hookSpecificOutput.additionalContext
        : "";
    expect(result.hookSpecificOutput?.hookEventName).toBe("PreToolUse");
    expect(result.systemMessage).toBeUndefined();
    expect(context).toContain(
      "Kibi knowledge for src/checkout.ts (symbol manifest):\n- REQ-checkout-rounding [firm: ask before changing]: Checkout totals round to cents — computeTotal",
    );
    expect(context).toContain(
      "REQ-checkout-rounding must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.",
    );
    expect(context).toContain(
      "Decision: ADR-money-as-decimal [firm: ask before changing]: Money is computed as decimal cents.",
    );
    expect(context).toContain("Covered by: TEST-checkout-rounding.");
  });

  test("the snippet is shown once per file per session", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);

    expect((await preEdit(cwd, pluginData)).hookSpecificOutput).toBeDefined();
    expect(await preEdit(cwd, pluginData)).toEqual({ continue: true });
    expect(
      (await preEdit(cwd, pluginData, "codex-session-2")).hookSpecificOutput,
    ).toBeDefined();
  });

  test("a superseded lead requirement is not presented as something to keep true", async () => {
    const cwd = linkedWorkspace("superseded");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);

    const result = await preEdit(cwd, pluginData);
    const context =
      result.hookSpecificOutput &&
      "additionalContext" in result.hookSpecificOutput
        ? result.hookSpecificOutput.additionalContext
        : "";
    expect(context).toContain(
      "- REQ-checkout-rounding (superseded): Checkout totals round to cents",
    );
    expect(context).not.toContain("must keep true");
    expect(context).not.toContain("Decision:");
  });

  test("an unlinked source file gets the discovery note once per session", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    const write = (sessionId: string) =>
      runHook(
        {
          hook_event_name: "PreToolUse",
          session_id: sessionId,
          cwd,
          tool_name: "Write",
          tool_input: { file_path: "src/other.ts" },
        },
        { pluginData },
      );
    const first = await write("s1");
    expect(first.hookSpecificOutput).toEqual({
      hookEventName: "PreToolUse",
      additionalContext: [
        "Kibi: no symbol in src/other.ts is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.",
        "No requirement title matches this file, so nothing recorded is known to cover it.",
        'kb_search({query:"<behavior being changed>", sourceLocations:[{path:"src/other.ts"}]}) finds a rule recorded under other words. A decision this change makes for this code (a rule the person states, a limit, who may do what) is recorded with kb_upsert (requirement + scenario + symbol implements link) before the work is reported done.',
      ].join("\n"),
    });
    expect(await write("s1")).toEqual({ continue: true });
    expect((await write("s2")).hookSpecificOutput).toBeDefined();
  });

  test("an unreadable manifest is reported once instead of calling files unlinked", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    writeFile(
      cwd,
      ".kb/symbols.yaml",
      "symbols: [ { id: SYM-computeTotal, sourceFile: src/checkout.ts\n",
    );
    const write = (file_path: string) =>
      runHook(
        {
          hook_event_name: "PreToolUse",
          session_id: "s1",
          cwd,
          tool_name: "Write",
          tool_input: { file_path },
        },
        { pluginData },
      );
    const first = JSON.stringify(await write("src/checkout.ts"));
    expect(first).toContain("could not read .kb/symbols.yaml");
    expect(first).not.toContain("is linked to a requirement yet");
    expect(await write("src/other.ts")).toEqual({ continue: true });
  });
});

/**
 * Replay of a hook trace recorded on a test project during an evaluation,
 * with the project's paths rewritten to this fixture.
 */
describe("Codex evaluation trace replay", () => {
  const UNLINKED_PATCH = [
    "*** Begin Patch",
    "*** Update File: src/guard.ts",
    "@@",
    "-export const guard = () => true;",
    "+export const guard = () => true; // probe",
    "*** End Patch",
  ].join("\n");

  test("an apply_patch to an unlinked file gets the note, and Stop reminds of the impact check once", async () => {
    const cwd = linkedWorkspace();
    writeFile(cwd, "src/guard.ts", "export const guard = () => true;\n");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    const event = (payload: Record<string, unknown>) =>
      runHook({ session_id: "b4", cwd, ...payload }, { pluginData });

    expect(
      await event({ hook_event_name: "SessionStart", source: "startup" }),
    ).toEqual({ continue: true });
    const linkedEdit = await event({
      hook_event_name: "PreToolUse",
      tool_name: "apply_patch",
      tool_input: { input: CHECKOUT_PATCH },
    });
    expect(JSON.stringify(linkedEdit)).toContain("must keep true");

    const unlinkedEdit = await event({
      hook_event_name: "PreToolUse",
      tool_name: "apply_patch",
      tool_input: { input: UNLINKED_PATCH },
    });
    expect(unlinkedEdit.hookSpecificOutput).toMatchObject({
      hookEventName: "PreToolUse",
      additionalContext: expect.stringContaining(
        "Kibi: no symbol in src/guard.ts is linked to a requirement yet; that does not mean no recorded rule covers the behavior it implements.\nNo requirement title matches this file, so nothing recorded is known to cover it.\nkb_search(",
      ),
    });
    expect(
      await event({
        hook_event_name: "PostToolUse",
        tool_name: "apply_patch",
        tool_input: { input: UNLINKED_PATCH },
      }),
    ).toEqual({ continue: true });

    const stop = await event({
      hook_event_name: "Stop",
      stop_hook_active: false,
    });
    expect(stop.continue).toBe(true);
    expect(stop.decision).toBe("block");
    expect(stop.reason).toContain("recorded nothing in the knowledge base");
    expect(stop.reason).toContain(
      'kb_check({sourceFiles:["src/guard.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})',
    );
    expect(
      await event({ hook_event_name: "Stop", stop_hook_active: false }),
    ).toEqual({ continue: true });
  });

  test("an apply_patch to .kb/ gets the direct-edit warning", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    const result = await runHook(
      {
        hook_event_name: "PreToolUse",
        cwd,
        tool_name: "apply_patch",
        tool_input: {
          input:
            "*** Begin Patch\n*** Update File: .kb/requirements/REQ-checkout-rounding.md\n@@\n-a\n+b\n*** End Patch",
        },
      },
      { pluginData },
    );
    expect(result.systemMessage).toContain("Avoid direct edits to .kb/");
  });
});

describe("Codex decision guard", () => {
  const FIRM_NOTICE =
    "which implements a firm requirement, a rule the person set";
  const GUARD_PATCH = [
    "*** Begin Patch",
    "*** Update File: src/guard.ts",
    "@@",
    "-export const guard = () => true;",
    "+export const guard = () => false;",
    "*** End Patch",
  ].join("\n");

  function contextOf(result: HookResult): string {
    const specific = result.hookSpecificOutput;
    return specific && "additionalContext" in specific
      ? specific.additionalContext
      : "";
  }

  function session(env: NodeJS.ProcessEnv = {}) {
    const cwd = linkedWorkspace();
    writeFile(cwd, "src/guard.ts", "export const guard = () => true;\n");
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    return (payload: Record<string, unknown>, sessionId = "guard-1") =>
      runHook({ session_id: sessionId, cwd, ...payload }, { pluginData, env });
  }

  test("an edit of code implementing a firm requirement tells the agent to ask first, once per requirement per session", async () => {
    const event = session();
    const patch = {
      hook_event_name: "PreToolUse",
      tool_name: "apply_patch",
      tool_input: { command: CHECKOUT_PATCH },
    };

    const first = contextOf(await event(patch));
    expect(first).toStartWith(
      "Kibi: this edit changes src/checkout.ts, which implements a firm requirement, a rule the person set: REQ-checkout-rounding: Checkout totals round to cents.\nUnless the edit keeps that rule, ask the person before making it and name the rule;",
    );
    expect(first).toContain("Kibi knowledge for src/checkout.ts");
    expect(contextOf(await event(patch))).not.toContain(FIRM_NOTICE);
    expect(contextOf(await event(patch, "guard-2"))).toContain(FIRM_NOTICE);
  });

  test("KIBI_CONFIRM_FIRM_EDITS=0 turns the firm-edit notice off", async () => {
    const event = session({ KIBI_CONFIRM_FIRM_EDITS: "0" });
    const context = contextOf(
      await event({
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        tool_input: { command: CHECKOUT_PATCH },
      }),
    );
    expect(context).toContain("Kibi knowledge for src/checkout.ts");
    expect(context).not.toContain(FIRM_NOTICE);
  });

  test("a prompt that states a rule gets the capture note; other prompts get nothing", async () => {
    const event = session();
    const rule = await event({
      hook_event_name: "UserPromptSubmit",
      prompt: "Guests must not see the export button from now on.",
    });
    expect(rule.hookSpecificOutput).toEqual({
      hookEventName: "UserPromptSubmit",
      additionalContext: expect.stringContaining(
        'Kibi: this request reads as a rule or decision (it says "must not").',
      ),
    });
    expect(
      await event({
        hook_event_name: "UserPromptSubmit",
        prompt: "Rename the export button.",
      }),
    ).toEqual({ continue: true });
  });

  test("the request's words pick requirement candidates for an unlinked file", async () => {
    const event = session();
    await event({
      hook_event_name: "UserPromptSubmit",
      prompt: "Make the guard round checkout totals differently.",
    });
    const context = contextOf(
      await event({
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        tool_input: { command: GUARD_PATCH },
      }),
    );
    expect(context).toContain(
      "Requirements whose titles share words with this path or the request:",
    );
    expect(context).toContain("REQ-checkout-rounding");
  });

  test("Stop continues the turn once with the capture request when source changed and nothing was recorded", async () => {
    const event = session();
    await event({
      hook_event_name: "UserPromptSubmit",
      prompt: "Guards should never pass by default.",
    });
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "apply_patch",
      tool_input: { command: GUARD_PATCH },
    });

    // A Stop already continued by a hook is left to end.
    const active = await event({
      hook_event_name: "Stop",
      stop_hook_active: true,
    });
    expect(active.decision).toBeUndefined();

    await event({
      hook_event_name: "PostToolUse",
      tool_name: "apply_patch",
      tool_input: { command: GUARD_PATCH },
    });
    const stop = await event({
      hook_event_name: "Stop",
      stop_hook_active: false,
    });
    expect(stop).toMatchObject({ continue: true, decision: "block" });
    expect(stop.reason).toContain("kb_upsert");
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "apply_patch",
      tool_input: { command: GUARD_PATCH },
    });
    const again = await event({
      hook_event_name: "Stop",
      stop_hook_active: false,
    });
    expect(again.decision).toBeUndefined();
  });

  test("a kb_upsert in the session keeps Stop from asking for capture", async () => {
    const event = session();
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "apply_patch",
      tool_input: { command: GUARD_PATCH },
    });
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "mcp__kibi__kb_upsert",
      tool_input: {},
    });
    const stop = await event({
      hook_event_name: "Stop",
      stop_hook_active: false,
    });
    expect(stop.decision).toBeUndefined();
    expect(stop.systemMessage).toContain("kb_check(");
  });

  test("Stop continues once with a signoff request after a requirement is written", async () => {
    const event = session();
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "mcp__kibi__kb_upsert",
      tool_input: { type: "req", id: "REQ-guards" },
    });
    const stop = await event({
      hook_event_name: "Stop",
      stop_hook_active: false,
    });
    expect(stop).toMatchObject({ continue: true, decision: "block" });
    expect(stop.reason).toContain("run `kibi signoff`");
    const again = await event({
      hook_event_name: "Stop",
      stop_hook_active: false,
    });
    expect(again.decision).toBeUndefined();
  });
});

describe("Codex opt-in hook telemetry", () => {
  function usageRows(root: string): Record<string, unknown>[] {
    const logPath = path.join(root, ".kb", "usage.log");
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  async function post(
    cwd: string,
    pluginData: string,
    toolName: string,
    toolInput: Record<string, unknown>,
    env: NodeJS.ProcessEnv,
  ) {
    return runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "codex-session-1",
        cwd,
        tool_name: toolName,
        tool_input: toolInput,
      },
      { pluginData, env },
    );
  }

  test("records CLI and MCP lookups and the requirements a patch touched", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    const optedIn = { KIBI_DIAGNOSTIC_MODE: "1" };

    await post(
      cwd,
      pluginData,
      "Bash",
      { command: "npx --no-install kibi search --input -" },
      optedIn,
    );
    await post(cwd, pluginData, "mcp__kibi__kb_query", { id: "X" }, optedIn);
    await post(
      cwd,
      pluginData,
      "apply_patch",
      { command: CHECKOUT_PATCH },
      optedIn,
    );

    const rows = usageRows(cwd);
    expect(
      rows.map((row) => [
        row.hook_action,
        row.kb_operation,
        row.path,
        row.requirement_ids,
      ]),
    ).toEqual([
      ["kb_usage", "kb_search", null, []],
      ["kb_usage", "kb_query", null, []],
      ["edited", null, "src/checkout.ts", ["REQ-checkout-rounding"]],
    ]);
    expect(rows[2]).toMatchObject({
      interface: "hook",
      host: "codex",
      session_id: "codex-session-1",
      host_tool: "apply_patch",
    });
  });

  test("writes nothing unless the operator opted in", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    await post(cwd, pluginData, "apply_patch", { command: CHECKOUT_PATCH }, {});
    expect(usageRows(cwd)).toEqual([]);
  });
});

// implements REQ-agent-core-edit-snippets
const codexPluginRoot = path.resolve(import.meta.dir, "..");

type HookCommandRun = { code: number | null; stdout: string; stderr: string };

/**
 * Run the command `hooks/hooks.json` registers for `event` the way Codex
 * does: through a shell, from the session cwd, with the plugin root and data
 * directories in the environment and the hook payload on stdin. The command
 * starts the committed `bin/hook-runner.mjs` bundle that installs ship.
 */
function runCodexHookCommand(
  event: string,
  payload: Record<string, unknown>,
  options: { cwd: string; pluginData: string },
): Promise<HookCommandRun> {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(codexPluginRoot, "hooks", "hooks.json"), "utf8"),
  ) as {
    hooks: Record<string, { hooks: { type: string; command: string }[] }[]>;
  };
  const command = manifest.hooks[event]?.[0]?.hooks[0]?.command;
  if (!command) throw new Error(`hooks.json registers no ${event} command`);
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PLUGIN_ROOT: codexPluginRoot,
    PLUGIN_DATA: options.pluginData,
    // The firm-edit notice has its own tests; these pin the snippet alone.
    KIBI_CONFIRM_FIRM_EDITS: "0",
  };
  // A developer's own telemetry opt-in must not reach the hook process.
  for (const key of ["KIBI_DIAGNOSTIC_MODE", "KIBI_CLI_DIAGNOSTIC_MODE"]) {
    Reflect.deleteProperty(env, key);
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: options.cwd,
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
    child.stdin.end(JSON.stringify(payload));
  });
}

function additionalContextOf(run: HookCommandRun): string {
  expect(run.code).toBe(0);
  expect(run.stderr).toBe("");
  const output = JSON.parse(run.stdout) as HookResult;
  expect(Object.keys(output).sort()).toEqual([
    "continue",
    "hookSpecificOutput",
  ]);
  expect(output.continue).toBe(true);
  const specific = output.hookSpecificOutput;
  expect(specific?.hookEventName).toBe("PreToolUse");
  if (!specific || !("additionalContext" in specific)) {
    throw new Error(`no additionalContext in ${run.stdout}`);
  }
  return specific.additionalContext;
}

describe("Codex hook command pre-edit knowledge (end to end)", () => {
  test("the PreToolUse command gives an apply_patch to linked code its requirement, what it must keep true and its decision, once per session", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-e2e-data-");
    tempRoots.push(pluginData);
    const preEdit = (sessionId: string) =>
      runCodexHookCommand(
        "PreToolUse",
        {
          hook_event_name: "PreToolUse",
          session_id: sessionId,
          cwd,
          tool_name: "apply_patch",
          tool_input: { command: CHECKOUT_PATCH },
        },
        { cwd, pluginData },
      );

    const context = additionalContextOf(await preEdit("codex-e2e-1"));
    expect(context).toStartWith(
      "Kibi knowledge for src/checkout.ts (symbol manifest):\n- REQ-checkout-rounding [firm: ask before changing]: Checkout totals round to cents — computeTotal\n",
    );
    expect(context).toContain(
      "\nREQ-checkout-rounding must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.\n",
    );
    expect(context).toContain(
      "\nDecision: ADR-money-as-decimal [firm: ask before changing]: Money is computed as decimal cents.\n",
    );
    expect(context).toContain("\nCovered by: TEST-checkout-rounding.\n");
    expect(context.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);

    // A second hook process in the same session finds the shown marker.
    const repeat = await preEdit("codex-e2e-1");
    expect(repeat.code).toBe(0);
    expect(JSON.parse(repeat.stdout)).toEqual({ continue: true });
    // A new session is told again, with the same snippet.
    expect(additionalContextOf(await preEdit("codex-e2e-2"))).toBe(context);
  }, 30_000);

  test("a file owning more requirements than fit is cut at the snippet budget after its grounding and decision", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-e2e-data-");
    tempRoots.push(pluginData);
    const extra = ["audit", "currency", "discounts", "refunds", "taxes"];
    writeFile(
      cwd,
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-computeTotal",
        "    title: computeTotal",
        "    sourceFile: src/checkout.ts",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-checkout-rounding",
        ...extra.flatMap((area) => [
          `  - id: SYM-checkout-${area}`,
          `    title: apply${area[0]?.toUpperCase()}${area.slice(1)}AdjustmentsToEveryLineItem`,
          "    sourceFile: src/checkout.ts",
          "    relationships:",
          "      - type: implements",
          `        target: REQ-checkout-${area}`,
        ]),
        "",
      ].join("\n"),
    );
    for (const area of extra) {
      writeFile(
        cwd,
        `.kb/requirements/REQ-checkout-${area}.md`,
        `---\nid: REQ-checkout-${area}\ntitle: Checkout ${area} adjustments apply to every line item before totals are rounded and shown\nstatus: open\n---\n`,
      );
    }

    const context = additionalContextOf(
      await runCodexHookCommand(
        "PreToolUse",
        {
          hook_event_name: "PreToolUse",
          session_id: "codex-e2e-budget",
          cwd,
          tool_name: "apply_patch",
          tool_input: { command: CHECKOUT_PATCH },
        },
        { cwd, pluginData },
      ),
    );

    expect(context.length).toBe(MAX_SNIPPET_CHARS);
    expect(context).toEndWith("…");
    expect(context).toContain(
      "\n- REQ-checkout-rounding [firm: ask before changing]: Checkout totals round to cents — computeTotal\n",
    );
    expect(context).toContain("\n- +2 more requirements: kb_query(");
    expect(context).toContain(
      "\nREQ-checkout-rounding must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.\n",
    );
    expect(context).toContain(
      "\nDecision: ADR-money-as-decimal [firm: ask before changing]: Money is computed as decimal cents.\n",
    );
  }, 30_000);
});

describe("Codex hook runner result contracts", () => {
  const optedIn = { KIBI_DIAGNOSTIC_MODE: "1" };

  function usageRows(root: string): Record<string, unknown>[] {
    const logPath = path.join(root, ".kb", "usage.log");
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  function contextOf(result: HookResult): string {
    const specific = result.hookSpecificOutput;
    return specific && "additionalContext" in specific
      ? specific.additionalContext
      : "";
  }

  function session(cwd: string, env: NodeJS.ProcessEnv = {}) {
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    return (payload: Record<string, unknown>, sessionId = "contract-1") =>
      runHook({ session_id: sessionId, cwd, ...payload }, { pluginData, env });
  }

  /** Two symbols in one file, each implementing its own firm requirement. */
  function twoSymbolWorkspace(): string {
    const root = linkedWorkspace();
    writeFile(
      root,
      ".kb/symbols.yaml",
      [
        "symbols:",
        "  - id: SYM-addTax",
        "    title: addTax",
        "    sourceFile: src/money.ts",
        "    sourceLine: 1",
        "    sourceEndLine: 3",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-tax-included",
        "  - id: SYM-roundCents",
        "    title: roundCents",
        "    sourceFile: src/money.ts",
        "    sourceLine: 5",
        "    sourceEndLine: 7",
        "    relationships:",
        "      - type: implements",
        "        target: REQ-checkout-rounding",
        "",
      ].join("\n"),
    );
    writeFile(
      root,
      ".kb/requirements/REQ-tax-included.md",
      "---\nid: REQ-tax-included\ntitle: Prices include tax\nstatus: open\n---\n",
    );
    writeFile(
      root,
      "src/money.ts",
      [
        "export function addTax(value: number) {",
        "  return value * 1.2;",
        "}",
        "",
        "export function roundCents(value: number) {",
        "  return Math.round(value * 100) / 100;",
        "}",
        "",
      ].join("\n"),
    );
    return root;
  }

  test("tools that do not edit get neither pre-edit context nor edit telemetry", async () => {
    const cwd = linkedWorkspace();
    const event = session(cwd, optedIn);

    expect(
      await event({
        hook_event_name: "PreToolUse",
        tool_name: "Read",
        tool_input: { file_path: "src/checkout.ts" },
      }),
    ).toEqual({ continue: true });
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "Read",
      tool_input: { file_path: "src/checkout.ts" },
    });
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_input: { command: "ls src" },
    });
    expect(usageRows(cwd)).toEqual([]);
  });

  test("pre-edit context is the whole result: continue plus the PreToolUse context", async () => {
    const event = session(linkedWorkspace());
    const result = await event({
      hook_event_name: "PreToolUse",
      tool_name: "apply_patch",
      tool_input: { command: CHECKOUT_PATCH },
    });
    expect(result).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        additionalContext: expect.any(String),
      },
    });
    // The firm-edit notice and the knowledge snippet are separate paragraphs.
    expect(contextOf(result)).toContain(
      "\n\nKibi knowledge for src/checkout.ts",
    );
  });

  test("a rule-stating prompt result is exactly continue plus the prompt context", async () => {
    const event = session(linkedWorkspace());
    expect(
      await event({
        hook_event_name: "UserPromptSubmit",
        prompt: "Guests must not see the export button.",
      }),
    ).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "UserPromptSubmit",
        additionalContext: expect.any(String),
      },
    });
  });

  test("a patch naming a file outside the workspace still gets context for the files inside it", async () => {
    const event = session(linkedWorkspace(), { KIBI_CONFIRM_FIRM_EDITS: "0" });
    const patch = [
      "*** Begin Patch",
      `*** Update File: ${path.join(os.tmpdir(), "kibi-codex-elsewhere", "outside.ts")}`,
      "@@",
      "-a",
      "+b",
      "*** Update File: src/checkout.ts",
      "@@",
      "-export const computeTotal = 1;",
      "+export const computeTotal = 2;",
      "*** End Patch",
    ].join("\n");
    const context = contextOf(
      await event({
        hook_event_name: "PreToolUse",
        tool_name: "apply_patch",
        tool_input: { command: patch },
      }),
    );
    expect(context).toStartWith("Kibi knowledge for src/checkout.ts");
  });

  test("an edit inside one symbol is focused on that symbol and its firm requirement", async () => {
    const event = session(twoSymbolWorkspace());
    const context = contextOf(
      await event({
        hook_event_name: "PreToolUse",
        tool_name: "Edit",
        tool_input: {
          file_path: "src/money.ts",
          old_string: "  return Math.round(value * 100) / 100;",
          new_string: "  return Math.floor(value * 100) / 100;",
        },
      }),
    );
    expect(context).toStartWith(
      "Kibi: this edit changes roundCents in src/money.ts, which implements a firm requirement",
    );
    const [notice] = context.split("\n\n");
    expect(notice).toContain("REQ-checkout-rounding");
    expect(notice).not.toContain("REQ-tax-included");
    expect(context).toContain(
      "The edit is inside roundCents, which implements REQ-checkout-rounding.",
    );
  });

  test("a file the coordinates bind but the manifest lost gets the unreadable note once per session", async () => {
    const cwd = linkedWorkspace();
    writeFile(
      cwd,
      ".kb/symbol-coordinates.yaml",
      "version: 2\ncoordinates:\n  SYM-ghost:\n    sourceFile: src/ghost.ts\n    sourceLine: 1\n",
    );
    const event = session(cwd);
    const edit = (file_path: string, sessionId: string) =>
      event(
        {
          hook_event_name: "PreToolUse",
          tool_name: "Write",
          tool_input: { file_path },
        },
        sessionId,
      );

    expect(contextOf(await edit("src/ghost.ts", "s1"))).toContain(
      "could not read .kb/symbols.yaml",
    );
    expect(await edit("src/ghost.ts", "s1")).toEqual({ continue: true });
    expect(contextOf(await edit("src/ghost.ts", "s2"))).toContain(
      "could not read .kb/symbols.yaml",
    );
  });

  test("a recorded symbol without links is an unlinked file even when coordinates bind it", async () => {
    const cwd = linkedWorkspace();
    writeFile(
      cwd,
      ".kb/symbols.yaml",
      "symbols:\n  - id: SYM-plain\n    title: plain\n    sourceFile: src/plain.ts\n",
    );
    writeFile(
      cwd,
      ".kb/symbol-coordinates.yaml",
      "version: 2\ncoordinates:\n  SYM-plain:\n    sourceFile: src/plain.ts\n    sourceLine: 1\n",
    );
    const context = contextOf(
      await session(cwd)({
        hook_event_name: "PreToolUse",
        tool_name: "Write",
        tool_input: { file_path: "src/plain.ts" },
      }),
    );
    expect(context).toStartWith(
      "Kibi: no symbol in src/plain.ts is linked to a requirement yet",
    );
  });

  test("edit telemetry rows carry the hook event, the plugin version and the file's requirements", async () => {
    const cwd = linkedWorkspace();
    const event = session(cwd, optedIn);
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: "src/other.ts" },
    });
    const pkg = JSON.parse(
      fs.readFileSync(path.join(import.meta.dir, "..", "package.json"), "utf8"),
    ) as { version: string };
    const rows = usageRows(cwd);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      hook_event: "PostToolUse",
      package_version: pkg.version,
      path: "src/other.ts",
      requirement_ids: [],
    });
  });

  test("one source file in a patch that also edits docs is enough to ask for capture", async () => {
    const cwd = linkedWorkspace();
    writeFile(cwd, "src/guard.ts", "export const guard = () => true;\n");
    const event = session(cwd);
    const patch = [
      "*** Begin Patch",
      "*** Update File: README.md",
      "@@",
      "-a",
      "+b",
      "*** Update File: src/guard.ts",
      "@@",
      "-export const guard = () => true;",
      "+export const guard = () => false;",
      "*** End Patch",
    ].join("\n");
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "apply_patch",
      tool_input: { command: patch },
    });
    expect(
      await event({ hook_event_name: "Stop", stop_hook_active: false }),
    ).toMatchObject({ continue: true, decision: "block" });
  });

  test("a CLI upsert counts as recording knowledge", async () => {
    const cwd = linkedWorkspace();
    writeFile(cwd, "src/guard.ts", "export const guard = () => true;\n");
    const event = session(cwd);
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: "src/guard.ts" },
    });
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "Bash",
      tool_input: { command: "npx --no-install kibi upsert --input -" },
    });
    const stop = await event({
      hook_event_name: "Stop",
      stop_hook_active: false,
    });
    expect(stop.decision).toBeUndefined();
  });

  test("the capture request adds the impact reminder only for unchecked source files", async () => {
    const cwd = linkedWorkspace();
    writeFile(cwd, "src/guard.ts", "export const guard = () => true;\n");
    const event = session(cwd);
    const edit = {
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: "src/guard.ts" },
    };
    const impactCheck = {
      hook_event_name: "PostToolUse",
      tool_name: "mcp__kibi__kb_check",
      tool_input: {
        sourceFiles: ["src/guard.ts"],
        includeImpactDiagnostics: true,
        includeWorkingTreeDiff: true,
      },
    };

    await event(edit, "checked");
    await event(impactCheck, "checked");
    expect(
      await event(
        { hook_event_name: "Stop", stop_hook_active: false },
        "checked",
      ),
    ).toEqual({
      continue: true,
      decision: "block",
      reason: captureReminder(false),
    });
  });

  test("an unchecked source file puts the impact reminder on its own line after the capture request", async () => {
    const cwd = linkedWorkspace();
    writeFile(cwd, "src/guard.ts", "export const guard = () => true;\n");
    const event = session(cwd);
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: "src/guard.ts" },
    });
    expect(
      (await event({ hook_event_name: "Stop", stop_hook_active: false }))
        .reason,
    ).toBe(
      `${captureReminder(false)}\n${impactCheckReminder(["src/guard.ts"])}`,
    );
  });
});
