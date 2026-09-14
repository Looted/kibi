import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runHook } from "../src/hook-runner";
import { loadHookState } from "../src/hook-state";

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

  test("PreToolUse ignores non-KB edits in opted-in workspaces", async () => {
    const cwd = createTempRoot("kibi-codex-cwd-");
    optInWorkspace(cwd);
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(cwd, pluginData);

    expect(
      await runHook(
        {
          event: "PreToolUse",
          cwd,
          toolName: "Write",
          toolInput: { file_path: "src/hook-runner.ts" },
        },
        { pluginData },
      ),
    ).toEqual({ continue: true });
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
