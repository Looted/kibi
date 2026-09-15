// implements REQ-zcode-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { type HookResult, runHook } from "../src/hook-runner";
import { loadHookState } from "../src/hook-state";

/**
 * ZCode parses hook stdout against a strict schema (verified against the
 * installed client): any top-level key outside this set fails validation and
 * discards the output. `hookSpecificOutput` is a discriminated union on
 * `hookEventName`; a mismatched event name is a hard error.
 */
const ZCODE_OUTPUT_KEYS = new Set([
  "additionalContext",
  "additional_context",
  "continue",
  "decision",
  "hookSpecificOutput",
  "reason",
  "stopReason",
  "suppressOutput",
  "systemMessage",
]);

const ZCODE_SPECIFIC_OUTPUT_KEYS = new Set([
  "hookEventName",
  "additionalContext",
  "permissionDecision",
  "permissionDecisionReason",
  "updatedInput",
  "decision",
]);

function expectStrictZcodeOutput(result: HookResult): HookResult {
  for (const key of Object.keys(result)) {
    expect(ZCODE_OUTPUT_KEYS.has(key), `unexpected output key: ${key}`).toBe(
      true,
    );
  }
  if (result.hookSpecificOutput !== undefined) {
    for (const key of Object.keys(result.hookSpecificOutput)) {
      expect(
        ZCODE_SPECIFIC_OUTPUT_KEYS.has(key),
        `unexpected hookSpecificOutput key: ${key}`,
      ).toBe(true);
    }
  }
  return result;
}

function expectAdditionalContext(result: HookResult, event: string): string {
  expectStrictZcodeOutput(result);
  expect(result.hookSpecificOutput).toMatchObject({
    hookEventName: event,
  });
  const context = result.hookSpecificOutput?.additionalContext ?? "";
  expect(context.length).toBeGreaterThan(0);
  expect(result.systemMessage).toBeUndefined();
  return context;
}

function createTempRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function optInWorkspace(root: string): void {
  fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
}

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("ZCode hook runner workspace opt-in", () => {
  test("every hook event stays silent in an unconfigured workspace", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);

    for (const event of ["SessionStart", "PreToolUse", "PostToolUse", "Stop"]) {
      const result = await runHook(
        {
          hook_event_name: event,
          cwd,
          tool_name: "Write",
          tool_input: { file_path: ".kb/requirements/REQ-1.md" },
        },
        { pluginData },
      );

      expect(result).toEqual({ continue: true });
      expect(result.systemMessage).toBeUndefined();
    }
  });

  test("unconfigured hooks neither track edits nor write state", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);

    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook({ hook_event_name: "Stop", cwd }, { pluginData });

    expect(fs.existsSync(path.join(pluginData, "workspaces"))).toBe(false);
    expect(fs.existsSync(path.join(cwd, ".kb"))).toBe(false);
  });

  test("a nested repository with its own .git does not inherit opt-in", async () => {
    const enclosing = createTempRoot("kibi-zcode-enclosing-");
    optInWorkspace(enclosing);
    const nested = path.join(enclosing, "vendored");
    fs.mkdirSync(path.join(nested, ".git"), { recursive: true });
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(nested, pluginData);

    const result = await runHook(
      { hook_event_name: "SessionStart", cwd: nested },
      { pluginData },
    );

    expect(result).toEqual({ continue: true });
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  test("SessionStart points opted-in workspaces at Kibi discovery", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);

    const context = expectAdditionalContext(
      await runHook({ hook_event_name: "SessionStart", cwd }, { pluginData }),
      "SessionStart",
    );

    expect(context).toContain("kb_search");
    expect(context).toContain("kibi-usage");
    expect(context).toContain("kb_status");
  });

  test("PreToolUse keeps the direct .kb edit warning in opted-in workspaces", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);

    const context = expectAdditionalContext(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          cwd,
          tool_name: "Write",
          tool_input: { file_path: ".kb/config.json" },
        },
        { pluginData },
      ),
      "PreToolUse",
    );

    expect(context).toContain("Avoid direct edits to .kb/");
    // Advisory only: no permission decision is returned.
    expect(
      (
        await runHook(
          {
            hook_event_name: "PreToolUse",
            cwd,
            tool_name: "Write",
            tool_input: { file_path: ".kb/config.json" },
          },
          { pluginData },
        )
      ).hookSpecificOutput,
    ).not.toHaveProperty("permissionDecision");
  });

  test("PreToolUse ignores non-KB edits in opted-in workspaces", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);

    expect(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          cwd,
          tool_name: "Write",
          tool_input: { file_path: "src/hook-runner.ts" },
        },
        { pluginData },
      ),
    ).toEqual({ continue: true });
  });

  test("PostToolUse tracks explicit meaningful paths in opted-in workspaces", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);

    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/hook-runner.ts" },
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
    const workspaceA = createTempRoot("kibi-zcode-a-");
    optInWorkspace(workspaceA);
    const workspaceB = createTempRoot("kibi-zcode-b-");
    optInWorkspace(workspaceB);
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(workspaceA, workspaceB, pluginData);

    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd: workspaceA,
        tool_name: "Write",
        tool_input: { file_path: "docs/a.md" },
      },
      { pluginData },
    );

    // Activity in workspace B must not be visible from workspace A.
    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd: workspaceB,
        tool_name: "Write",
        tool_input: { file_path: "docs/b.md" },
      },
      { pluginData },
    );
    const stopA = await runHook(
      { hook_event_name: "Stop", cwd: workspaceA },
      { pluginData },
    );
    const contextA = expectAdditionalContext(stopA, "Stop");
    expect(contextA).toContain("docs/a.md");
    expect(JSON.stringify(stopA)).not.toContain("docs/b.md");
  });

  test("invocation from a subdirectory maps to the repository workspace state", async () => {
    const workspace = createTempRoot("kibi-zcode-root-");
    optInWorkspace(workspace);
    const subdir = path.join(workspace, "packages", "zcode");
    fs.mkdirSync(subdir, { recursive: true });
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(workspace, pluginData);

    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd: subdir,
        tool_name: "Write",
        tool_input: { file_path: "docs/subdir.md" },
      },
      { pluginData },
    );
    const stopFromRoot = await runHook(
      { hook_event_name: "Stop", cwd: workspace },
      { pluginData },
    );

    const context = expectAdditionalContext(stopFromRoot, "Stop");
    expect(context).toContain("docs/subdir.md");
    expect(loadHookStateFromPluginData(pluginData).dirtyPaths).toEqual([]);
  });

  test("git worktrees keep separate hook state from the main checkout", async () => {
    const mainCheckout = createTempRoot("kibi-zcode-main-");
    optInWorkspace(mainCheckout);
    const worktree = createTempRoot("kibi-zcode-wt-");
    optInWorkspace(worktree);
    fs.writeFileSync(
      path.join(worktree, ".git"),
      "gitdir: elsewhere/kibi/.git/worktrees/wt\n",
    );
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(mainCheckout, worktree, pluginData);

    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd: worktree,
        tool_name: "Write",
        tool_input: { file_path: "docs/wt.md" },
      },
      { pluginData },
    );
    const stopMain = await runHook(
      { hook_event_name: "Stop", cwd: mainCheckout },
      { pluginData },
    );

    expect(stopMain.hookSpecificOutput).toBeUndefined();
    expect(stopMain.systemMessage).toBeUndefined();
  });

  test("Stop keeps the impact-check reminder after unverified source edits", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);
    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: { toolName: "kb_check" },
      },
      { pluginData },
    );

    const context = expectAdditionalContext(
      await runHook({ hook_event_name: "Stop", cwd }, { pluginData }),
      "Stop",
    );

    expect(context).toContain("includeImpactDiagnostics");
    expect(context).toContain("src/hook-runner.ts");
  });

  test("Stop stays quiet after an impact-enabled kb_check covers source edits", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);
    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: {
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

    expect(
      await runHook({ hook_event_name: "Stop", cwd }, { pluginData }),
    ).toEqual({ continue: true });
  });

  test("hooks fall back to the process cwd when the payload omits it", async () => {
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(pluginData);

    // In this dogfood repository the process cwd resolves to an opted-in
    // workspace, so the event must keep working without an explicit cwd.
    const result = await runHook({ hook_event_name: "Stop" }, { pluginData });

    expect(result.continue).toBe(true);
    expectStrictZcodeOutput(result);
  });

  test("unknown hook events continue without messages", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);

    expect(
      await runHook(
        { hook_event_name: "FutureHookEvent", cwd },
        { pluginData },
      ),
    ).toEqual({ continue: true });
  });

  test("plugin data resolution prefers ZCODE_PLUGIN_DATA over the Claude alias", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    optInWorkspace(cwd);
    const zcodeData = createTempRoot("kibi-zcode-data-zcode-");
    const claudeData = createTempRoot("kibi-zcode-data-claude-");
    tempRoots.push(cwd, zcodeData, claudeData);

    const previousZcode = process.env.ZCODE_PLUGIN_DATA;
    const previousClaude = process.env.CLAUDE_PLUGIN_DATA;
    process.env.ZCODE_PLUGIN_DATA = zcodeData;
    process.env.CLAUDE_PLUGIN_DATA = claudeData;
    try {
      await runHook(
        {
          hook_event_name: "PostToolUse",
          cwd,
          tool_name: "Edit",
          tool_input: { file_path: "docs/env.md" },
        },
        {},
      );
    } finally {
      if (previousZcode === undefined)
        process.env.ZCODE_PLUGIN_DATA = undefined;
      else process.env.ZCODE_PLUGIN_DATA = previousZcode;
      if (previousClaude === undefined)
        process.env.CLAUDE_PLUGIN_DATA = undefined;
      else process.env.CLAUDE_PLUGIN_DATA = previousClaude;
    }

    expect(fs.existsSync(path.join(zcodeData, "workspaces"))).toBe(true);
    expect(fs.existsSync(path.join(claudeData, "workspaces"))).toBe(false);
  });
});

function loadHookStateFromPluginData(pluginData: string) {
  const workspaceDirs = fs.readdirSync(path.join(pluginData, "workspaces"));
  expect(workspaceDirs).toHaveLength(1);
  return loadHookState(
    path.join(pluginData, "workspaces", workspaceDirs[0] as string),
  );
}
