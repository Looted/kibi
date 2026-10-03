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
      "Kibi knowledge for src/checkout.ts (symbol manifest):\n- REQ-checkout-rounding: Checkout totals round to cents — computeTotal",
    );
    expect(context).toContain(
      "REQ-checkout-rounding must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.",
    );
    expect(context).toContain(
      "Decision: ADR-money-as-decimal: Money is computed as decimal cents.",
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

  test("unlinked files stay silent", async () => {
    const cwd = linkedWorkspace();
    const pluginData = createTempRoot("kibi-codex-data-");
    tempRoots.push(pluginData);
    expect(
      await runHook(
        {
          hook_event_name: "PreToolUse",
          cwd,
          tool_name: "Write",
          tool_input: { file_path: "src/other.ts" },
        },
        { pluginData },
      ),
    ).toEqual({ continue: true });
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
