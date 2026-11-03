// implements REQ-zcode-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  captureReminder,
  signoffReminder,
} from "kibi-agent-core/decision-guard";

import {
  type HookResult,
  type ZcodeHookEvent,
  canonicalizeCheckSourceFiles,
  extractMutatedWorkspacePaths,
  isInvokedAsCli,
  main,
  runHook,
  runHookCli,
  runHookCliIfMain,
} from "../src/hook-runner";
import {
  loadHookState,
  resolvePluginDataDir,
  resolveSessionStateDir,
  resolveWorkspaceStateDir,
} from "../src/hook-state";
import {
  DIRECT_KB_EDIT_WARNING,
  freshnessReminder,
  impactCheckReminder,
  postEditImpactNote,
} from "../src/messages";

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

/** A kb_upsert in the session, so Stop does not ask for a decision record. */
async function recordKbUpsert(
  cwd: string,
  pluginData: string,
  sessionId: string,
): Promise<void> {
  await runHook(
    {
      hook_event_name: "PostToolUse",
      session_id: sessionId,
      cwd,
      tool_name: "mcp__kibi__kb_upsert",
      tool_input: {},
    },
    { pluginData },
  );
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

    // Exercise the disabled-telemetry contract regardless of operator opt-in.
    for (const event of events) {
      await runHook(
        { ...event, session_id: "kb-snapshot-session", cwd },
        { pluginData, env: {} },
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

    await recordKbUpsert(workspace, pluginData, "s1");
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

    await recordKbUpsert(cwd, pluginData, "s1");
    expectQuiet(
      await runHook(
        { hook_event_name: "Stop", session_id: "s1", cwd },
        { pluginData },
      ),
    );
  });

  test("a host-prefixed kb_check acknowledges the edited paths", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-prefixed");

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
        tool_name: "mcp__kibi__kb_check",
        tool_input: {
          sourceFiles: ["src/a.ts"],
          includeImpactDiagnostics: true,
          includeWorkingTreeDiff: true,
        },
      },
      { pluginData },
    );

    await recordKbUpsert(cwd, pluginData, "s1");
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

    await recordKbUpsert(cwd, pluginData, "s1");
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

    await recordKbUpsert(cwd, pluginData, "s1");
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

    await recordKbUpsert(cwd, pluginData, "s1");
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
    await recordKbUpsert(cwd, pluginData, "s1");
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

describe("ZCode hook runner workspace stamp", () => {
  test("PreToolUse names the session workspace on every Kibi MCP call", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-stamp");
    fs.mkdirSync(path.join(cwd, "src"));
    const result = expectStrictZcodeOutput(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          session_id: "s1",
          cwd: path.join(cwd, "src"),
          tool_name: "mcp__kibi__kb_query",
          tool_input: { id: "REQ-1" },
        },
        { pluginData },
      ),
    );
    // No permission decision: ZCode's own permission flow still runs.
    expect(result).toEqual({
      continue: true,
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        updatedInput: { id: "REQ-1", workspaceRoot: cwd },
      },
    });
  });

  test("other tools are left alone", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-stamp");
    expectQuiet(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          session_id: "s1",
          cwd,
          tool_name: "Read",
          tool_input: { file_path: "src/a.ts" },
        },
        { pluginData },
      ),
    );
  });
});

function writeFile(root: string, relativePath: string, content: string): void {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

/** Opted-in workspace whose checkout code implements a grounded requirement. */
function linkedWorkspace(requirementStatus = "open") {
  const fixture = workspaceFixture("kibi-zcode-linked");
  writeFile(
    fixture.cwd,
    ".kb/symbols.yaml",
    [
      "symbols:",
      "  - id: SYM-computeTotal",
      "    title: computeTotal",
      "    sourceFile: src/checkout.ts",
      "    relationships:",
      "      - type: implements",
      "        target: REQ-checkout-rounding",
      "",
    ].join("\n"),
  );
  writeFile(
    fixture.cwd,
    ".kb/symbol-coordinates.yaml",
    "coordinates:\n  SYM-computeTotal:\n    sourceLine: 1\n    sourceEndLine: 3\n",
  );
  writeFile(
    fixture.cwd,
    ".kb/requirements/REQ-checkout-rounding.md",
    `---\nid: REQ-checkout-rounding\ntitle: Checkout totals round to cents\nstatus: ${requirementStatus}\nlinks:\n  - type: requires_predicate\n    target: FACT-total-rounding-cents\n  - type: relates_to\n    target: ADR-money-as-decimal\n---\n`,
  );
  writeFile(
    fixture.cwd,
    ".kb/facts/FACT-total-rounding-cents.md",
    "---\nid: FACT-total-rounding-cents\ntitle: Totals round half up to two decimals\nstatus: active\n---\n",
  );
  writeFile(
    fixture.cwd,
    ".kb/adr/ADR-money-as-decimal.md",
    "---\nid: ADR-money-as-decimal\ntitle: Money is computed as decimal cents\nstatus: accepted\n---\n",
  );
  writeFile(
    fixture.cwd,
    "src/checkout.ts",
    "export function computeTotal() {\n  return 1;\n}\n",
  );
  return fixture;
}

describe("ZCode pre-edit knowledge", () => {
  function preEdit(
    fixture: { cwd: string; pluginData: string },
    sessionId = "s1",
  ) {
    return runHook(
      {
        hook_event_name: "PreToolUse",
        session_id: sessionId,
        cwd: fixture.cwd,
        tool_name: "Edit",
        tool_input: {
          file_path: path.join(fixture.cwd, "src/checkout.ts"),
          old_string: "  return 1;",
          new_string: "  return 2;",
        },
      },
      { pluginData: fixture.pluginData },
    );
  }

  test("an edit of linked code names what its requirement must keep true and why", async () => {
    const fixture = linkedWorkspace();
    const context = expectAdditionalContext(
      await preEdit(fixture),
      "PreToolUse",
    );
    expect(context).toContain(
      "Kibi knowledge for src/checkout.ts (symbol manifest):\n- REQ-checkout-rounding [firm: ask before changing]: Checkout totals round to cents — computeTotal",
    );
    expect(context).toContain(
      "REQ-checkout-rounding must keep true: Totals round half up to two decimals.",
    );
    expect(context).toContain(
      "Decision: ADR-money-as-decimal [firm: ask before changing]: Money is computed as decimal cents.",
    );
    expect(context).toContain(
      "The edit is inside computeTotal, which implements REQ-checkout-rounding.",
    );
  });

  test("the snippet is shown once per file per session", async () => {
    const fixture = linkedWorkspace();
    expectAdditionalContext(await preEdit(fixture), "PreToolUse");
    expectQuiet(await preEdit(fixture));
    expectAdditionalContext(await preEdit(fixture, "s2"), "PreToolUse");
  });

  test("a superseded lead requirement is not presented as something to keep true", async () => {
    const fixture = linkedWorkspace("superseded");
    const context = expectAdditionalContext(
      await preEdit(fixture),
      "PreToolUse",
    );
    expect(context).toContain(
      "- REQ-checkout-rounding (superseded): Checkout totals round to cents",
    );
    expect(context).not.toContain("must keep true");
    expect(context).not.toContain("Decision:");
  });
});

describe("ZCode opt-in hook telemetry", () => {
  function usageRows(root: string): Record<string, unknown>[] {
    const logPath = path.join(root, ".kb", "usage.log");
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  function post(
    fixture: { cwd: string; pluginData: string },
    toolName: string,
    toolInput: Record<string, unknown>,
    env: NodeJS.ProcessEnv,
  ) {
    return runHook(
      {
        hook_event_name: "PostToolUse",
        session_id: "s-telemetry",
        cwd: fixture.cwd,
        tool_name: toolName,
        tool_input: toolInput,
      },
      { pluginData: fixture.pluginData, env },
    );
  }

  test("records lookups and the requirements an edited file implements", async () => {
    const fixture = linkedWorkspace();
    const optedIn = { KIBI_DIAGNOSTIC_MODE: "true" };
    await post(fixture, "mcp__kibi__kb_search", { query: "rounding" }, optedIn);
    await post(fixture, "Bash", { command: "kibi query --input -" }, optedIn);
    await post(fixture, "Write", { file_path: "src/checkout.ts" }, optedIn);
    await post(fixture, "Read", { file_path: "src/checkout.ts" }, optedIn);

    const rows = usageRows(fixture.cwd);
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
      host: "zcode",
      session_id: "s-telemetry",
    });
  });

  test("writes nothing unless the operator opted in", async () => {
    const fixture = linkedWorkspace();
    await post(fixture, "Write", { file_path: "src/checkout.ts" }, {});
    expect(usageRows(fixture.cwd)).toEqual([]);
  });
});

describe("ZCode decision guard", () => {
  const FIRM_NOTICE =
    "Kibi: this edit changes computeTotal in src/checkout.ts, which implements a firm requirement, a rule the person set: REQ-checkout-rounding: Checkout totals round to cents.";

  function session(env: NodeJS.ProcessEnv = {}) {
    const fixture = linkedWorkspace();
    const event = (payload: Record<string, unknown>, sessionId = "s1") =>
      runHook(
        { session_id: sessionId, cwd: fixture.cwd, ...payload },
        { pluginData: fixture.pluginData, env },
      );
    const edit = {
      hook_event_name: "PreToolUse",
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(fixture.cwd, "src/checkout.ts"),
        old_string: "  return 1;",
        new_string: "  return 2;",
      },
    };
    return { event, edit, fixture };
  }

  test("an edit of code implementing a firm requirement tells the agent to ask first, once per requirement per session", async () => {
    const { event, edit } = session();

    const first = expectAdditionalContext(await event(edit), "PreToolUse");
    expect(first).toStartWith(
      `${FIRM_NOTICE}\nUnless the edit keeps that rule, ask the person before making it and name the rule;`,
    );
    expect(first).toContain("Kibi knowledge for src/checkout.ts");
    expect(await event(edit)).toEqual({ continue: true });
    expect(
      expectAdditionalContext(await event(edit, "s2"), "PreToolUse"),
    ).toStartWith(FIRM_NOTICE);
  });

  test("KIBI_CONFIRM_FIRM_EDITS=0 turns the firm-edit notice off", async () => {
    const { event, edit } = session({ KIBI_CONFIRM_FIRM_EDITS: "0" });
    const context = expectAdditionalContext(await event(edit), "PreToolUse");
    expect(context).toStartWith("Kibi knowledge for src/checkout.ts");
  });

  test("a prompt that states a rule gets the capture note; other prompts get nothing", async () => {
    const { event } = session();
    const note = expectAdditionalContext(
      await event({
        hook_event_name: "UserPromptSubmit",
        prompt: "Totals must not be rounded from now on.",
      }),
      "UserPromptSubmit",
    );
    expect(note).toStartWith(
      'Kibi: this request reads as a rule or decision (it says "must not").',
    );
    expect(
      await event({
        hook_event_name: "UserPromptSubmit",
        prompt: "Rename computeTotal.",
      }),
    ).toEqual({ continue: true });
  });

  test("Stop asks once for the decision record when source changed and nothing was recorded", async () => {
    const { event, fixture } = session();
    const write = {
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: path.join(fixture.cwd, "src/checkout.ts") },
    };
    await event(write);

    const reminder = expectReminder(await event({ hook_event_name: "Stop" }));
    expect(reminder).toStartWith(
      "Kibi: this session changed source files and recorded nothing in the knowledge base.",
    );
    expect(reminder).toContain("kb_check(");

    await event(write);
    const again = expectReminder(await event({ hook_event_name: "Stop" }));
    expect(again).not.toContain("recorded nothing in the knowledge base");
  });

  test("Stop asks once for a signoff view after a requirement is written", async () => {
    const { event } = session();
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "mcp__kibi__kb_upsert",
      tool_input: { type: "req", id: "REQ-checkout" },
    });
    const reminder = expectReminder(await event({ hook_event_name: "Stop" }));
    expect(reminder).toContain("run `kibi signoff`");
    expectQuiet(await event({ hook_event_name: "Stop" }));
  });

  test("a kb_upsert keeps Stop from asking for the decision record", async () => {
    const { event, fixture } = session();
    await event({
      hook_event_name: "PostToolUse",
      tool_name: "Write",
      tool_input: { file_path: path.join(fixture.cwd, "src/checkout.ts") },
    });
    await recordKbUpsert(fixture.cwd, fixture.pluginData, "s1");
    const reminder = expectReminder(await event({ hook_event_name: "Stop" }));
    expect(reminder).not.toContain("recorded nothing in the knowledge base");
  });
});

describe("ZCode reminders from Claude-compatible payloads", () => {
  /** A ZCode hook payload: Claude Code's snake_case fields. */
  function zcodePayload(
    cwd: string,
    event: string,
    fields: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      session_id: "zcode-session-1",
      transcript_path: path.join(cwd, ".zcode", "transcript.jsonl"),
      cwd,
      hook_event_name: event,
      ...fields,
    };
  }

  function editPost(cwd: string): Record<string, unknown> {
    return zcodePayload(cwd, "PostToolUse", {
      tool_name: "Edit",
      tool_input: {
        file_path: path.join(cwd, "src/checkout.ts"),
        old_string: "1",
        new_string: "2",
      },
      tool_response: { filePath: path.join(cwd, "src/checkout.ts") },
    });
  }

  test("PostToolUse after an edit names the impact check once per file", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-post");
    const first = await runHook(editPost(cwd), { pluginData, env: {} });
    expect(expectAdditionalContext(first, "PostToolUse")).toContain(
      'kb_check({sourceFiles:["src/checkout.ts"], includeImpactDiagnostics:true, includeWorkingTreeDiff:true})',
    );
    expectQuiet(await runHook(editPost(cwd), { pluginData, env: {} }));
  });

  test("Stop waits while a Stop hook already continued the turn", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-active");
    await runHook(editPost(cwd), { pluginData, env: {} });
    expectQuiet(
      await runHook(zcodePayload(cwd, "Stop", { stop_hook_active: true }), {
        pluginData,
        env: {},
      }),
    );
    const reminder = expectReminder(
      await runHook(zcodePayload(cwd, "Stop", { stop_hook_active: false }), {
        pluginData,
        env: {},
      }),
    );
    expect(reminder).toContain("recorded nothing in the knowledge base");
    expect(reminder).toContain("src/checkout.ts");
  });

  test("without a plugin data variable the edit still reaches the Stop reminder", async () => {
    const { cwd } = workspaceFixture("kibi-zcode-nodata");
    const stateDir = resolveWorkspaceStateDir(
      resolvePluginDataDir(undefined, {}),
      cwd,
    );
    if (stateDir) tempRoots.push(stateDir);
    await runHook(editPost(cwd), { env: {} });
    const reminder = expectReminder(
      await runHook(zcodePayload(cwd, "Stop"), { env: {} }),
    );
    expect(reminder).toContain("src/checkout.ts");
  });

  // implements REQ-kibi-anonymous-usage-telemetry
  test("every hook event that decides something queues one kibi_hook, and KIBI_TELEMETRY=0 queues none", async () => {
    const telemetryDir = createTempRoot("kibi-zcode-telemetry-");
    tempRoots.push(telemetryDir);
    const queue = path.join(telemetryDir, "telemetry-queue.jsonl");
    const runAll = async (env: NodeJS.ProcessEnv) => {
      const { cwd, pluginData } = workspaceFixture("kibi-zcode-telemetry");
      for (const payload of [
        zcodePayload(cwd, "SessionStart", { source: "startup" }),
        zcodePayload(cwd, "UserPromptSubmit", {
          prompt: "Totals must never round down.",
        }),
        zcodePayload(cwd, "PreToolUse", {
          tool_name: "Edit",
          tool_input: { file_path: path.join(cwd, "src/checkout.ts") },
        }),
        editPost(cwd),
        zcodePayload(cwd, "Stop", { stop_hook_active: false }),
      ]) {
        await runHook(payload, { pluginData, env });
      }
    };

    await runAll({ KIBI_TELEMETRY: "0", KIBI_TELEMETRY_DIR: telemetryDir });
    expect(fs.existsSync(queue)).toBe(false);

    await runAll({
      KIBI_TELEMETRY: "1",
      KIBI_TELEMETRY_DIR: telemetryDir,
      KIBI_TELEMETRY_CHANNEL: "agent-test",
      // Stop sends the queue; an unreachable host keeps it on disk.
      KIBI_TELEMETRY_HOST: "http://127.0.0.1:9",
    });
    const queued = fs
      .readFileSync(queue, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line).properties);
    expect(
      queued.map((event) => [event.hook_event, event.hook_action]),
    ).toEqual([
      ["SessionStart", "session_start"],
      ["UserPromptSubmit", "prompt_rule_note"],
      ["PreToolUse", "edit_silent"],
      ["PostToolUse", "edited"],
      ["Stop", "stop_capture_reminder"],
    ]);
    for (const event of queued) {
      expect(event).toMatchObject({
        package: "kibi-zcode",
        host: "zcode",
        channel: "agent-test",
      });
    }
  });
});

describe("ZCode hook runner exact decisions", () => {
  const DIAGNOSTIC = { KIBI_DIAGNOSTIC_MODE: "true", KIBI_TELEMETRY: "0" };
  const QUIET = { KIBI_TELEMETRY: "0" };
  const PACKAGE_VERSION = JSON.parse(
    fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"),
  ).version as string;
  const FIRM_NOTICE =
    "Kibi: this edit changes computeTotal in src/checkout.ts, which implements a firm requirement, a rule the person set: REQ-checkout-rounding: Checkout totals round to cents.";

  type Fixture = { cwd: string; pluginData: string };

  function hook(
    fixture: Fixture,
    payload: Record<string, unknown>,
    env: NodeJS.ProcessEnv = DIAGNOSTIC,
    sessionId = "s1",
  ): Promise<HookResult> {
    return runHook(
      { session_id: sessionId, cwd: fixture.cwd, ...payload },
      { pluginData: fixture.pluginData, env },
    );
  }

  function rows(fixture: Fixture): Record<string, unknown>[] {
    const logPath = path.join(fixture.cwd, ".kb", "usage.log");
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  function actions(fixture: Fixture): unknown[][] {
    return rows(fixture).map((row) => [
      row.hook_event,
      row.hook_action,
      row.path_kind,
      row.requirement_ids,
    ]);
  }

  function stateDirOf(fixture: Fixture, sessionId = "s1"): string {
    return resolveSessionStateDir(
      fixture.pluginData,
      fixture.cwd,
      sessionId,
    ) as string;
  }

  const context = (event: ZcodeHookEvent, message: string): HookResult => ({
    continue: true,
    hookSpecificOutput: { hookEventName: event, additionalContext: message },
  });

  const write = (fixture: Fixture, relativePath: string) => ({
    hook_event_name: "PostToolUse",
    tool_name: "Write",
    tool_input: { file_path: path.join(fixture.cwd, relativePath) },
  });

  const impactCheck = (sourceFiles: string[]) => ({
    hook_event_name: "PostToolUse",
    tool_name: "mcp__kibi__kb_check",
    tool_input: {
      sourceFiles,
      includeImpactDiagnostics: true,
      includeWorkingTreeDiff: true,
    },
  });

  const upsert = (toolInput: Record<string, unknown> = {}) => ({
    hook_event_name: "PostToolUse",
    tool_name: "mcp__kibi__kb_upsert",
    tool_input: toolInput,
  });

  const stop = { hook_event_name: "Stop" };

  test("session and prompt events record their actions", async () => {
    const fixture = linkedWorkspace();
    await hook(fixture, { hook_event_name: "SessionStart" });
    expect(
      await hook(fixture, { hook_event_name: "UserPromptSubmit" }),
    ).toStrictEqual({ continue: true });
    await hook(fixture, {
      hook_event_name: "UserPromptSubmit",
      prompt: "Rename computeTotal.",
    });
    await hook(fixture, {
      hook_event_name: "UserPromptSubmit",
      prompt: "Totals must not be rounded from now on.",
    });
    expect(actions(fixture)).toStrictEqual([
      ["SessionStart", "session_start", null, []],
      ["UserPromptSubmit", "prompt_silent", null, []],
      ["UserPromptSubmit", "prompt_silent", null, []],
      ["UserPromptSubmit", "prompt_rule_note", null, []],
    ]);
    expect(rows(fixture)[0]).toMatchObject({
      host: "zcode",
      package_version: PACKAGE_VERSION,
      session_id: "s1",
      host_tool: null,
    });
  });

  test("pre-edit actions name the path kind and implemented requirements", async () => {
    const fixture = linkedWorkspace();
    const edit = (toolInput: Record<string, unknown>, toolName = "Edit") =>
      hook(fixture, {
        hook_event_name: "PreToolUse",
        tool_name: toolName,
        tool_input: toolInput,
      });

    expect(
      await edit({ file_path: ".kb/requirements/REQ-x.md" }),
    ).toStrictEqual(context("PreToolUse", DIRECT_KB_EDIT_WARNING));
    expect(
      await edit({
        file_path: path.join(fixture.cwd, "src/checkout.ts"),
        old_string: "  return 1;",
      }),
    ).toMatchObject({ hookSpecificOutput: { hookEventName: "PreToolUse" } });
    expect(await edit({ file_path: "src/other.ts" })).toStrictEqual({
      continue: true,
    });
    expect(await edit({ file_path: "src/checkout.ts" }, "Read")).toStrictEqual({
      continue: true,
    });
    expect(await edit({})).toStrictEqual({ continue: true });

    expect(actions(fixture)).toStrictEqual([
      ["PreToolUse", "kb_direct_note", "kb", []],
      ["PreToolUse", "edit_snippet", "source", ["REQ-checkout-rounding"]],
      ["PreToolUse", "edit_silent", "source", []],
    ]);
    expect(rows(fixture)[1]).toMatchObject({
      host_tool: "Edit",
      package_version: PACKAGE_VERSION,
    });
  });

  test("the direct .kb warning applies to edit-like tools and any targeted path", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-kbwarn");
    const fixture = { cwd, pluginData };
    const pre = (payload: Record<string, unknown>) =>
      hook(fixture, { hook_event_name: "PreToolUse", ...payload }, QUIET);
    const warning = context("PreToolUse", DIRECT_KB_EDIT_WARNING);

    expect(await pre({ tool_input: { file_path: ".kb/x.md" } })).toStrictEqual(
      warning,
    );
    expect(
      await pre({ tool_name: "Read", tool_input: { file_path: ".kb/x.md" } }),
    ).toStrictEqual({ continue: true });
    expect(
      await pre({
        tool_name: "Edit",
        tool_input: { file_path: "src/a.ts", new_path: ".kb/x.md" },
      }),
    ).toStrictEqual(warning);
  });

  test("each edit target gets its own focus, and unlinked targets add nothing", async () => {
    const fixture = linkedWorkspace();
    const result = await hook(
      fixture,
      {
        hook_event_name: "PreToolUse",
        tool_name: "Edit",
        tool_input: {
          old_path: "../outside.ts",
          file_path: "src/other.ts",
          path: "src/checkout.ts",
          old_string: "  return 1;",
          new_string: "  return 2;",
        },
      },
      QUIET,
    );
    const text = result.hookSpecificOutput?.additionalContext ?? "";
    expect(text).toStartWith(`${FIRM_NOTICE}\n`);
    expect(text).toContain("\n\nKibi knowledge for src/checkout.ts");
    expect(text).toContain(
      "The edit is inside computeTotal, which implements REQ-checkout-rounding.",
    );
    expect(text).not.toContain("src/other.ts");
  });

  test("a whole-file write of firm code names the file", async () => {
    const fixture = linkedWorkspace();
    const result = await hook(
      fixture,
      {
        hook_event_name: "PreToolUse",
        tool_name: "Write",
        tool_input: {
          file_path: "src/checkout.ts",
          content: "export const x = 1;\n",
        },
      },
      QUIET,
    );
    expect(result.hookSpecificOutput?.additionalContext).toStartWith(
      "Kibi: this edit changes src/checkout.ts, which implements a firm requirement, a rule the person set: REQ-checkout-rounding: Checkout totals round to cents.\n",
    );
  });

  test("an unreadable knowledge index leaves the edit without context", async () => {
    const fixture = linkedWorkspace();
    const pre = (relativePath: string) =>
      hook(fixture, {
        hook_event_name: "PreToolUse",
        tool_name: "Edit",
        tool_input: { file_path: relativePath, old_string: "  return 1;" },
      });
    await pre("src/other.ts");
    const cachePath = path.join(stateDirOf(fixture), "knowledge-index.json");
    const cache = JSON.parse(fs.readFileSync(cachePath, "utf8"));
    cache.index.files = null;
    fs.writeFileSync(cachePath, JSON.stringify(cache));

    expect(await pre("src/checkout.ts")).toStrictEqual({ continue: true });
    expect(actions(fixture).at(-1)).toStrictEqual([
      "PreToolUse",
      "edit_silent",
      "source",
      [],
    ]);
    // The edit telemetry fails on the same index without changing the output.
    const rowCount = rows(fixture).length;
    expect(
      await hook(fixture, write(fixture, "src/checkout.ts")),
    ).toStrictEqual(
      context("PostToolUse", postEditImpactNote(["src/checkout.ts"])),
    );
    expect(rows(fixture)).toHaveLength(rowCount);
  });

  test("post-edit telemetry rows carry the call and the edited file's requirements", async () => {
    const fixture = linkedWorkspace();
    await hook(fixture, write(fixture, "src/other.ts"));
    expect(rows(fixture)).toHaveLength(1);
    expect(rows(fixture)[0]).toMatchObject({
      hook_event: "PostToolUse",
      hook_action: "edited",
      host: "zcode",
      host_tool: "Write",
      session_id: "s1",
      package_version: PACKAGE_VERSION,
      path: "src/other.ts",
      requirement_ids: [],
    });
  });

  test("without traces wanted the knowledge index is not loaded after an edit", async () => {
    const fixture = linkedWorkspace();
    const cachePath = path.join(stateDirOf(fixture), "knowledge-index.json");
    await hook(fixture, write(fixture, "src/other.ts"), QUIET);
    expect(fs.existsSync(cachePath)).toBe(false);
    await hook(fixture, write(fixture, "src/other.ts"));
    expect(fs.existsSync(cachePath)).toBe(true);
  });

  test("post-edit notes name each new source file once", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-notes");
    const fixture = { cwd, pluginData };
    expect(
      await hook(fixture, write(fixture, "src/a.ts"), QUIET),
    ).toStrictEqual(context("PostToolUse", postEditImpactNote(["src/a.ts"])));
    expect(
      await hook(fixture, write(fixture, "src/b.ts"), QUIET),
    ).toStrictEqual(context("PostToolUse", postEditImpactNote(["src/b.ts"])));
    expect(
      await hook(fixture, write(fixture, "src/a.ts"), QUIET),
    ).toStrictEqual({ continue: true });
    expect(
      await hook(
        fixture,
        {
          hook_event_name: "PostToolUse",
          tool_name: "Read",
          tool_input: { file_path: "src/c.ts" },
        },
        QUIET,
      ),
    ).toStrictEqual({ continue: true });
  });

  test("an edit outside the workspace journals nothing", async () => {
    const { cwd, pluginData } = workspaceFixture("kibi-zcode-outside");
    const fixture = { cwd, pluginData };
    expect(
      await hook(
        fixture,
        {
          hook_event_name: "PostToolUse",
          tool_name: "Write",
          tool_input: { file_path: "../elsewhere.ts" },
        },
        QUIET,
      ),
    ).toStrictEqual({ continue: true });
    expect(
      fs.existsSync(path.join(stateDirOf(fixture), "hook-state.events.jsonl")),
    ).toBe(false);
  });

  test("a CLI upsert records the decision, a dry-run MCP upsert does not", async () => {
    const recorded = linkedWorkspace();
    await hook(
      recorded,
      {
        hook_event_name: "PostToolUse",
        tool_name: "Bash",
        tool_input: { command: "kibi upsert --input req.json" },
      },
      QUIET,
    );
    await hook(recorded, write(recorded, "src/checkout.ts"), QUIET);
    expect(await hook(recorded, stop, QUIET)).toStrictEqual(
      context("Stop", impactCheckReminder(["src/checkout.ts"])),
    );

    const dryRun = linkedWorkspace();
    await hook(dryRun, upsert({ dryRun: true }), QUIET);
    await hook(dryRun, write(dryRun, "src/checkout.ts"), QUIET);
    expect(await hook(dryRun, stop, QUIET)).toStrictEqual(
      context(
        "Stop",
        [captureReminder(false), impactCheckReminder(["src/checkout.ts"])].join(
          "\n",
        ),
      ),
    );
  });

  test("Stop combines exactly the reminders that apply", async () => {
    const captureOnly = linkedWorkspace();
    await hook(captureOnly, write(captureOnly, "src/checkout.ts"));
    await hook(captureOnly, impactCheck(["src/checkout.ts"]));
    expect(await hook(captureOnly, stop)).toStrictEqual(
      context("Stop", captureReminder(false)),
    );
    expect(actions(captureOnly).at(-1)).toStrictEqual([
      "Stop",
      "stop_capture_reminder",
      null,
      [],
    ]);

    const signoffOnly = linkedWorkspace();
    await hook(signoffOnly, upsert({ type: "req", id: "REQ-checkout" }));
    expect(await hook(signoffOnly, stop)).toStrictEqual(
      context("Stop", signoffReminder()),
    );
    expect(actions(signoffOnly).at(-1)).toStrictEqual([
      "Stop",
      "stop_signoff_reminder",
      null,
      [],
    ]);

    const impactOnly = linkedWorkspace();
    await hook(impactOnly, upsert());
    await hook(impactOnly, write(impactOnly, "src/checkout.ts"));
    expect(await hook(impactOnly, stop)).toStrictEqual(
      context("Stop", impactCheckReminder(["src/checkout.ts"])),
    );
    expect(actions(impactOnly).at(-1)).toStrictEqual([
      "Stop",
      "stop_reminder",
      null,
      [],
    ]);
  });

  test("a freshness reminder clears the paths it names", async () => {
    const fixture = linkedWorkspace();
    await hook(fixture, write(fixture, "docs/guide.md"));
    expect(await hook(fixture, stop)).toStrictEqual(
      context("Stop", freshnessReminder(["docs/guide.md"])),
    );
    expect(actions(fixture).at(-1)).toStrictEqual([
      "Stop",
      "stop_freshness_reminder",
      null,
      [],
    ]);
    expect(await hook(fixture, stop)).toStrictEqual({ continue: true });
  });

  test("a quiet Stop clears checked state and writes nothing otherwise", async () => {
    const checked = linkedWorkspace();
    await hook(checked, upsert(), QUIET);
    await hook(checked, write(checked, "src/checkout.ts"), QUIET);
    await hook(checked, impactCheck(["src/checkout.ts"]), QUIET);
    expect(loadHookState(stateDirOf(checked)).dirtyPaths).toStrictEqual([
      "src/checkout.ts",
    ]);
    expect(await hook(checked, stop, QUIET)).toStrictEqual({ continue: true });
    expect(loadHookState(stateDirOf(checked))).toStrictEqual({
      dirtyPaths: [],
      kbCheckRun: false,
      impactCheckRun: false,
      impactCheckedPaths: [],
    });

    const checkOnly = linkedWorkspace();
    await hook(checkOnly, impactCheck([]), QUIET);
    expect(loadHookState(stateDirOf(checkOnly)).kbCheckRun).toBe(true);
    expect(await hook(checkOnly, stop, QUIET)).toStrictEqual({
      continue: true,
    });
    expect(loadHookState(stateDirOf(checkOnly)).kbCheckRun).toBe(false);

    const untouched = linkedWorkspace();
    expect(await hook(untouched, stop, QUIET)).toStrictEqual({
      continue: true,
    });
    expect(
      fs.existsSync(path.join(stateDirOf(untouched), "hook-state.json")),
    ).toBe(false);
  });

  test("each hook remembers its session for anonymous telemetry", async () => {
    const fixture = linkedWorkspace();
    const telemetryDir = createTempRoot("kibi-zcode-telemetry-session-");
    tempRoots.push(telemetryDir);
    await hook(
      fixture,
      { hook_event_name: "SessionStart" },
      {
        KIBI_TELEMETRY: "1",
        KIBI_TELEMETRY_DIR: telemetryDir,
        KIBI_TELEMETRY_HOST: "http://127.0.0.1:9",
      },
    );
    expect(
      fs.existsSync(path.join(telemetryDir, "telemetry-sessions.json")),
    ).toBe(true);
  });

  test("check sources and mutated paths canonicalize to workspace files", () => {
    const root = createTempRoot("kibi-zcode-canonical-");
    tempRoots.push(root);
    expect(
      canonicalizeCheckSourceFiles(root, [
        "src/a.ts",
        "./src/b.ts",
        "../outside.ts",
        path.join(root, "src/c.ts"),
        "",
      ]),
    ).toStrictEqual(["src/a.ts", "src/b.ts", "src/c.ts"]);
    expect(
      extractMutatedWorkspacePaths(root, path.join(root, "src"), {
        file_path: "a.ts",
        paths: ["../../outside.ts", "../node_modules/x/index.js"],
      }),
    ).toStrictEqual(["src/a.ts"]);
  });

  test("the CLI writes one JSON line and reports failures as advisory output", async () => {
    const outside = createTempRoot("kibi-zcode-cli-outside-");
    tempRoots.push(outside);
    const writes: string[] = [];
    const original = process.stdout.write.bind(process.stdout);
    const previousStdin = Object.getOwnPropertyDescriptor(process, "stdin");
    process.stdout.write = ((chunk: string) => {
      writes.push(chunk);
      return true;
    }) as typeof process.stdout.write;
    try {
      const { Readable } = await import("node:stream");
      Object.defineProperty(process, "stdin", {
        configurable: true,
        value: Readable.from([JSON.stringify({ event: "Stop", cwd: outside })]),
      });
      await main();
      await runHookCli(() => {
        throw "boom";
      });
      await runHookCli(async () => {
        throw new Error("bad input");
      });
    } finally {
      process.stdout.write = original;
      if (previousStdin) Object.defineProperty(process, "stdin", previousStdin);
    }
    expect(writes).toStrictEqual([
      '{"continue":true}\n',
      '{"continue":true,"systemMessage":"Kibi hook runner error: Unknown hook error"}\n',
      '{"continue":true,"systemMessage":"Kibi hook runner error: bad input"}\n',
    ]);
  });

  test("the CLI entry runs only when invoked as the main module", async () => {
    let starts = 0;
    const start = async () => {
      starts += 1;
    };
    await runHookCliIfMain(false, start);
    expect(starts).toBe(0);
    await runHookCliIfMain(true, start);
    expect(starts).toBe(1);
    expect(isInvokedAsCli(undefined, "")).toBe(false);
    expect(isInvokedAsCli("", "")).toBe(false);
  });
});
