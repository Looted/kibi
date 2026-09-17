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

function snapshotFiles(root: string): string[] {
  const snapshot: string[] = [];

  function visit(current: string, relativeRoot: string): void {
    const entries = fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const relativePath = path.join(relativeRoot, entry.name);
      const absolutePath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        snapshot.push(`${relativePath}\0<directory>`);
        visit(absolutePath, relativePath);
      } else {
        snapshot.push(
          `${relativePath}\0${fs.readFileSync(absolutePath).toString("base64")}`,
        );
      }
    }
  }

  visit(root, "");
  return snapshot;
}

function optInWorkspace(root: string): void {
  fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
}

type HookEventInput = {
  hook_event_name: string;
  session_id?: string;
  cwd?: string;
  tool_name?: string;
  tool_input?: unknown;
};

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function workspaceFixture(prefix: string): {
  cwd: string;
  pluginData: string;
} {
  const cwd = createTempRoot(`${prefix}-ws-`);
  optInWorkspace(cwd);
  const pluginData = createTempRoot(`${prefix}-data-`);
  tempRoots.push(cwd, pluginData);
  return { cwd, pluginData };
}

function expectReminder(result: HookResult): string {
  return expectAdditionalContext(result, "Stop");
}

function expectQuiet(result: HookResult): void {
  expect(result).toEqual({ continue: true });
}

describe("ZCode hook runner workspace opt-in", () => {
  test("every hook event stays silent in an unconfigured workspace", async () => {
    const cwd = createTempRoot("kibi-zcode-cwd-");
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(cwd, pluginData);

    for (const event of ["SessionStart", "PreToolUse", "PostToolUse", "Stop"]) {
      const result = await runHook(
        {
          hook_event_name: event,
          session_id: "s1",
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
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      { hook_event_name: "Stop", session_id: "s1", cwd },
      { pluginData },
    );

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
      {
        hook_event_name: "SessionStart",
        session_id: "s1",
        cwd: nested,
      },
      { pluginData },
    );

    expect(result).toEqual({ continue: true });
    expect(result.hookSpecificOutput).toBeUndefined();
  });

  test("SessionStart points opted-in workspaces at Kibi discovery", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-start");

    const context = expectAdditionalContext(
      await runHook(
        { hook_event_name: "SessionStart", session_id: "s1", cwd },
        { pluginData },
      ),
      "SessionStart",
    );

    expect(context).toContain("kb_search");
    expect(context).toContain("kibi-usage");
    expect(context).toContain("kb_status");
  });

  test("PreToolUse keeps the direct .kb edit warning in opted-in workspaces", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-pre");

    const context = expectAdditionalContext(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          session_id: "s1",
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
            session_id: "s1",
            cwd,
            tool_name: "Write",
            tool_input: { file_path: ".kb/config.json" },
          },
          { pluginData },
        )
      ).hookSpecificOutput,
    ).not.toHaveProperty("permissionDecision");
  });

  test("hook outputs are advisory and never hard deny", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-advisory");

    for (const event of [
      "SessionStart",
      "PreToolUse",
      "PostToolUse",
      "Stop",
    ] as const) {
      const result = await runHook(
        {
          hook_event_name: event,
          session_id: "advisory-session",
          cwd,
          tool_name: event === "PreToolUse" ? "Write" : "CallMcpTool",
          tool_input:
            event === "PreToolUse"
              ? { file_path: ".kb/requirements/REQ-1.md" }
              : { toolName: "kb_status", arguments: {} },
        },
        { pluginData },
      );

      expect(result.continue).toBe(true);
      expect(result).not.toHaveProperty("decision");
      expect(result).not.toHaveProperty("permissionDecision");
      expect(result.hookSpecificOutput).not.toHaveProperty("decision");
      expect(result.hookSpecificOutput).not.toHaveProperty(
        "permissionDecision",
      );
    }
  });

  test("hook events never mutate .kb contents", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-kb-snapshot");
    const requirementPath = path.join(cwd, ".kb", "requirements", "REQ-1.md");
    fs.mkdirSync(path.dirname(requirementPath), { recursive: true });
    fs.writeFileSync(requirementPath, "# fixture requirement\n");
    const before = snapshotFiles(path.join(cwd, ".kb"));

    const events = [
      {
        hook_event_name: "SessionStart" as const,
      },
      {
        hook_event_name: "PreToolUse" as const,
        tool_name: "Write",
        tool_input: { file_path: ".kb/requirements/REQ-1.md" },
      },
      {
        hook_event_name: "PostToolUse" as const,
        tool_name: "CallMcpTool",
        tool_input: { toolName: "kb_status", arguments: {} },
      },
      {
        hook_event_name: "PostToolUse" as const,
        tool_name: "Write",
        tool_input: { file_path: ".kb/requirements/REQ-1.md" },
      },
      { hook_event_name: "Stop" as const },
    ];

    for (const event of events) {
      await runHook(
        { ...event, session_id: "kb-snapshot-session", cwd },
        { pluginData },
      );
      expect(snapshotFiles(path.join(cwd, ".kb"))).toEqual(before);
    }
  });

  test("PreToolUse canonicalizes absolute and ./-prefixed .kb targets", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-preabs");

    for (const rawPath of [
      path.join(cwd, ".kb", "requirements", "REQ-1.md"),
      "./.kb/requirements/REQ-1.md",
      `${cwd}/.kb/./requirements/REQ-1.md`,
    ]) {
      const result = await runHook(
        {
          hook_event_name: "PreToolUse",
          session_id: "s1",
          cwd,
          tool_name: "Edit",
          tool_input: { file_path: rawPath },
        },
        { pluginData },
      );
      expectAdditionalContext(result, "PreToolUse");
    }

    // A similarly named path outside the workspace is not this workspace's KB.
    expectQuiet(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          session_id: "s1",
          cwd,
          tool_name: "Edit",
          tool_input: {
            file_path: path.join(path.dirname(cwd), "elsewhere", ".kb", "x.md"),
          },
        },
        { pluginData },
      ),
    );
  });

  test("PreToolUse ignores non-KB edits in opted-in workspaces", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-prenon");

    expect(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          session_id: "s1",
          cwd,
          tool_name: "Write",
          tool_input: { file_path: "src/hook-runner.ts" },
        },
        { pluginData },
      ),
    ).toEqual({ continue: true });
  });

  test("PostToolUse tracks only file-mutating tool events", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-mutate");

    // Read-only tools carrying path fields are not evidence of a change.
    for (const event of [
      {
        tool_name: "Read",
        tool_input: { file_path: "src/a.ts" },
      },
      {
        tool_name: "Grep",
        tool_input: { pattern: "x", path: "src" },
      },
      {
        tool_name: "Bash",
        tool_input: { command: "cat src/a.ts" },
      },
      {
        tool_name: "mcp__kibi__kb_search",
        tool_input: { query: "x", sourceFile: "src/a.ts" },
      },
    ]) {
      await runHook(
        {
          hook_event_name: "PostToolUse",
          session_id: "s1",
          cwd,
          ...event,
        },
        { pluginData },
      );
    }
    // Only reads happened: nothing may be pending at Stop.
    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
  });

  test("each supported mutating payload records its affected paths", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-mutpayloads");

    const events = [
      { tool_name: "Edit", tool_input: { file_path: "src/edited.ts" } },
      { tool_name: "Write", tool_input: { file_path: "src/written.ts" } },
      {
        tool_name: "MultiEdit",
        tool_input: { file_path: "src/multi.ts", edits: [] },
      },
      {
        tool_name: "apply_patch",
        tool_input: { paths: ["src/patched.ts"] },
      },
    ];
    for (const event of events) {
      await runHook(
        {
          hook_event_name: "PostToolUse",
          session_id: "s1",
          cwd,
          ...event,
        },
        { pluginData },
      );
    }

    const reminder = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
    for (const expected of [
      "src/edited.ts",
      "src/written.ts",
      "src/multi.ts",
      "src/patched.ts",
    ]) {
      expect(reminder).toContain(expected);
    }
  });

  test("PostToolUse tracks explicit meaningful paths in opted-in workspaces", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-track");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/hook-runner.ts" },
      },
      { pluginData },
    );

    const workspaceDataRoot = path.join(pluginData, "workspaces");
    const workspaceDirs = fs.readdirSync(workspaceDataRoot);
    expect(workspaceDirs).toHaveLength(1);
    const sessionsRoot = path.join(
      workspaceDataRoot,
      workspaceDirs[0] as string,
      "sessions",
    );
    const sessionDirs = fs.readdirSync(sessionsRoot);
    expect(sessionDirs.length).toBe(1);
    const state = loadHookState(
      path.join(sessionsRoot, sessionDirs[0] as string),
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
        session_id: "shared-session-shape",
        cwd: workspaceA,
        tool_name: "Write",
        tool_input: { file_path: "docs/a.md" },
      },
      { pluginData },
    );

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "shared-session-shape",
        cwd: workspaceB,
        tool_name: "Write",
        tool_input: { file_path: "docs/b.md" },
      },
      { pluginData },
    );
    const stopA = await runHook(
      {
        hook_event_name: "Stop",
        session_id: "shared-session-shape",
        cwd: workspaceA,
      },
      { pluginData },
    );
    const contextA = expectAdditionalContext(stopA, "Stop");
    expect(contextA).toContain("docs/a.md");
    expect(contextA).not.toContain("docs/b.md");
  });

  test("invocation from a subdirectory names workspace-relative paths", async () => {
    const workspace = createTempRoot("kibi-zcode-root-");
    optInWorkspace(workspace);
    const subdir = path.join(workspace, "packages", "api");
    fs.mkdirSync(subdir, { recursive: true });
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(workspace, pluginData);

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd: subdir,
        tool_name: "Write",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    const stopFromRoot = await runHook(
      { hook_event_name: "Stop", session_id: "s1", cwd: workspace },
      { pluginData },
    );

    const context = expectAdditionalContext(stopFromRoot, "Stop");
    // The reminder names the workspace-relative file, not a subdirectory-
    // relative one that would point at the wrong file later.
    expect(context).toContain("packages/api/src/a.ts");
    expect(context).not.toContain("- src/a.ts");
    expect(loadHookStateFromPluginData(pluginData).dirtyPaths).toEqual([]);
  });

  test("a workspace-root-relative impact check satisfies a subdirectory edit", async () => {
    const workspace = createTempRoot("kibi-zcode-subchk-");
    optInWorkspace(workspace);
    const subdir = path.join(workspace, "packages", "api");
    fs.mkdirSync(subdir, { recursive: true });
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(workspace, pluginData);

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd: subdir,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd: workspace,
        tool_name: "CallMcpTool",
        tool_input: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["packages/api/src/a.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );

    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd: workspace },
        { pluginData },
      ),
    );
  });

  test("absolute edit paths canonicalize against relative check paths", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-abschk");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: path.join(cwd, "src", "a.ts") },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["src/a.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );

    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
  });

  test("dot-prefixed edit paths canonicalize identically", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-dotchk");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "./src/a.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["src/a.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );

    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
  });

  test("Windows-style separators canonicalize to the same tracked path", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-winpath");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src\\nested\\a.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["src/nested/a.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );

    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
  });

  test("out-of-workspace paths are not conflated with internal files", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-outside");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: {
          file_path: path.join(path.dirname(cwd), "sibling", "src", "a.ts"),
        },
      },
      { pluginData },
    );

    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
  });

  test("canonical .kb lanes classify as knowledge, never as impact-relevant", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-kblane");

    for (const rawPath of [
      ".kb/requirements/REQ-1.md",
      path.join(cwd, ".kb", "symbols.yaml"),
      "./.kb/scenarios/SCEN-1.md",
    ]) {
      await runHook(
        {
          hook_event_name: "PostToolUse",
          session_id: "s1",
          cwd,
          tool_name: "Write",
          tool_input: { file_path: rawPath },
        },
        { pluginData },
      );
    }

    // Canonical KB lanes surface as freshness context, never as the
    // source-impact kb_check reminder.
    const reminder = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
    expect(reminder).toContain("freshness reminder");
    expect(reminder).toContain(".kb/requirements/REQ-1.md");
    expect(reminder).not.toContain("includeImpactDiagnostics");
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
        session_id: "s1",
        cwd: worktree,
        tool_name: "Write",
        tool_input: { file_path: "docs/wt.md" },
      },
      { pluginData },
    );
    const stopMain = await runHook(
      { hook_event_name: "Stop", session_id: "s1", cwd: mainCheckout },
      { pluginData },
    );

    expect(stopMain.hookSpecificOutput).toBeUndefined();
    expect(stopMain.systemMessage).toBeUndefined();
  });

  test("hooks fall back to the process cwd when the payload omits it", async () => {
    const pluginData = createTempRoot("kibi-zcode-data-");
    tempRoots.push(pluginData);

    // In this dogfood repository the process cwd resolves to an opted-in
    // workspace, so the event must keep working without an explicit cwd.
    const result = await runHook(
      { hook_event_name: "Stop", session_id: "s1" },
      { pluginData },
    );

    expect(result.continue).toBe(true);
    expectStrictZcodeOutput(result);
  });

  test("unknown hook events continue without messages", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-unknown");

    expect(
      await runHook(
        { hook_event_name: "FutureHookEvent", session_id: "s1", cwd },
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
          session_id: "s1",
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

describe("ZCode hook runner impact-check lifecycle", () => {
  test("edit then Stop reminds", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-life1");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    const reminder = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
    expect(reminder).toContain("src/a.ts");
  });

  test("edit then covering impact check then Stop stays quiet", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-life2");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["src/a.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );

    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
  });

  test("re-editing a checked path invalidates only that path's check", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-life3");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/b.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["src/a.ts", "src/b.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );
    // Both quiet after the covering check.
    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );

    // Re-edit A only: B's check must stay current, A's must not.
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    const reminder = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
    expect(reminder).toContain("src/a.ts");
    expect(reminder).not.toContain("src/b.ts");
  });

  test("a check without impact coverage does not acknowledge later edits", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-life4");

    // A kb_check WITHOUT impact diagnostics never acknowledges anything.
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: { toolName: "kb_check" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );

    const reminder = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
    expect(reminder).toContain("src/a.ts");
  });

  test("two files with only one checked keep the other pending", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-life5");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/b.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s1",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["src/a.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );

    const reminder = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
    expect(reminder).toContain("src/b.ts");
    expect(reminder).not.toContain("- src/a.ts");
  });
});

describe("ZCode hook runner session isolation", () => {
  test("one session's Stop cannot consume or clear another session's work", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-sess1");

    // Session A edits; session B (same workspace, same plugin data) stops
    // without editing anything.
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "session-a",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "session-b", cwd },
        { pluginData },
      ),
    );

    // Session A's pending work survived B's stop.
    const reminderA = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "session-a", cwd },
        { pluginData },
      ),
    );
    expect(reminderA).toContain("src/a.ts");
  });

  test("check state is isolated between sessions", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-sess2");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "session-a",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "session-a",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/b.ts" },
      },
      { pluginData },
    );
    // Session B runs a covering check for both files; it must not
    // acknowledge session A's edits.
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "session-b",
        cwd,
        tool_name: "CallMcpTool",
        tool_input: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["src/a.ts", "src/b.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );

    const reminderA = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "session-a", cwd },
        { pluginData },
      ),
    );
    expect(reminderA).toContain("src/a.ts");
  });

  test("events without a session id use an isolated unattributed bucket", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-sess3");

    // An identified session edits; an anonymous Stop must not clear it.
    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "session-a",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );
    expectQuiet(
      await runHook({ hook_event_name: "Stop", cwd }, { pluginData }),
    );

    const reminderA = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "session-a", cwd },
        { pluginData },
      ),
    );
    expect(reminderA).toContain("src/a.ts");

    // Anonymous tracking still works among anonymous events.
    await runHook(
      {
        hook_event_name: "PostToolUse",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/anon.ts" },
      },
      { pluginData },
    );
    const anonymousReminder = expectReminder(
      await runHook({ hook_event_name: "Stop", cwd }, { pluginData }),
    );
    expect(anonymousReminder).toContain("src/anon.ts");
  });

  test("session ids never become filesystem paths", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-sess4");

    await runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "../../escape/attempt",
        cwd,
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts" },
      },
      { pluginData },
    );

    const workspaceDataRoot = path.join(pluginData, "workspaces");
    const workspaceDir = path.join(
      workspaceDataRoot,
      fs.readdirSync(workspaceDataRoot)[0] as string,
    );
    const sessionsRoot = path.join(workspaceDir, "sessions");
    for (const entry of fs.readdirSync(sessionsRoot)) {
      expect(entry).toMatch(/^[a-f0-9]{32}$|^unattributed$/);
      expect(entry).not.toContain("..");
    }

    const reminder = expectReminder(
      await runHook(
        { hook_event_name: "Stop", session_id: "../../escape/attempt", cwd },
        { pluginData },
      ),
    );
    expect(reminder).toContain("src/a.ts");
  });

  test("separate hook processes recover the same session state", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-sess5");
    const hookRunnerPath = path.resolve(
      import.meta.dir,
      "../dist/hook-runner.js",
    );
    if (!fs.existsSync(hookRunnerPath)) {
      throw new Error("dist/hook-runner.js missing — run bun run build:zcode");
    }

    function invoke(event: HookEventInput): Promise<string> {
      return new Promise((resolve, reject) => {
        const child = Bun.spawn(["node", hookRunnerPath], {
          cwd,
          env: { ...process.env, ZCODE_PLUGIN_DATA: pluginData },
          stdin: "pipe",
          stdout: "pipe",
          stderr: "pipe",
        });
        child.stdin.write(`${JSON.stringify(event)}\n`);
        child.stdin.end();
        new Response(child.stdout)
          .text()
          .then((text) => child.exited.then(() => resolve(text)));
        child.exited.catch(reject);
      });
    }

    await invoke({
      hook_event_name: "PostToolUse",
      session_id: "cross-process",
      cwd,
      tool_name: "Edit",
      tool_input: { file_path: "src/a.ts" },
    });
    await invoke({ hook_event_name: "Stop", session_id: "other", cwd });
    const stdout = await invoke({
      hook_event_name: "Stop",
      session_id: "cross-process",
      cwd,
    });

    const reminder = expectAdditionalContext(
      JSON.parse(stdout.trim()) as HookResult,
      "Stop",
    );
    expect(reminder).toContain("src/a.ts");
  });
});

function loadHookStateFromPluginData(pluginData: string) {
  const workspaceDataRoot = path.join(pluginData, "workspaces");
  const workspaceDirs = fs.readdirSync(workspaceDataRoot);
  expect(workspaceDirs).toHaveLength(1);
  const sessionsRoot = path.join(
    workspaceDataRoot,
    workspaceDirs[0] as string,
    "sessions",
  );
  const sessionDirs = fs.readdirSync(sessionsRoot);
  expect(sessionDirs.length).toBeGreaterThan(0);
  return loadHookState(path.join(sessionsRoot, sessionDirs[0] as string));
}
