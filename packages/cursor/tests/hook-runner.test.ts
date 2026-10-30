import { afterEach, describe, expect, test } from "bun:test";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { MAX_SNIPPET_CHARS } from "kibi-agent-core/snippets";
import {
  hashTelemetryId,
  workspaceSessionHash,
} from "kibi-agent-core/usage-telemetry";
import { PRE_EDIT_FOLLOWUP } from "../src/guidance";
import { type CursorHookResult, runHook } from "../src/hook-runner";
import { loadHookState } from "../src/hook-state";

function createTempRoot(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

const tempRoots: string[] = [];
const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);

  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("Cursor hook runner", () => {
  test("sessionStart reminds when cwd has no Kibi config", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);

    const result = await runHook(
      { hook_event_name: "sessionStart", cwd },
      { pluginData },
    );

    expect(result.additional_context).toContain(
      "Kibi config was not found at the Cursor workspace root",
    );
  });

  test("sessionStart stays quiet when cwd has Kibi config", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");

    const result = await runHook(
      { hook_event_name: "sessionStart", cwd },
      { pluginData, workspaceTrusted: false },
    );

    expect(result.additional_context).toBeDefined();
  });

  test("sessionStart emits advisory output without executing a trusted CLI fallback", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    const commandRoot = createTempRoot("kibi-cursor-commands-");
    tempRoots.push(cwd, pluginData, commandRoot);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");
    const executionMarker = path.join(commandRoot, "executed");
    for (const command of ["npx", "bunx"] as const) {
      const executable = path.join(commandRoot, command);
      fs.writeFileSync(executable, `#!/bin/sh\ntouch "${executionMarker}"\n`);
      fs.chmodSync(executable, 0o755);
    }

    const result = await runHook(
      { hook_event_name: "sessionStart", cwd },
      { pluginData, workspaceTrusted: true },
    );

    expect(result.additional_context).toBeDefined();
    expect(fs.existsSync(executionMarker)).toBe(false);
  });

  test("sessionStart uses Cursor workspace_roots when cwd is absent", async () => {
    const workspaceRoot = createTempRoot("kibi-cursor-workspace-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    const pluginInstallRoot = createTempRoot("kibi-cursor-plugin-");
    tempRoots.push(workspaceRoot, pluginData, pluginInstallRoot);
    fs.mkdirSync(path.join(workspaceRoot, ".kb"));
    fs.writeFileSync(path.join(workspaceRoot, ".kb", "manifest.json"), "{}");
    process.chdir(pluginInstallRoot);

    const result = await runHook(
      { hook_event_name: "sessionStart", workspace_roots: [workspaceRoot] },
      { pluginData },
    );

    expect(result.additional_context).toBeDefined();
  });

  test("sessionStart treats an empty cwd as missing Kibi config", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);

    const result = await runHook(
      { hook_event_name: "sessionStart", cwd: "" },
      { pluginData },
    );

    expect(result.additional_context).toContain(
      "Kibi config was not found at the Cursor workspace root",
    );
  });

  test("preToolUse warns on explicit direct .kb path edits without blocking", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");

    const result = await runHook(
      {
        hook_event_name: "preToolUse",
        cwd,
        tool_name: "Write",
        tool_input: { file_path: ".kb/config.json" },
      },
      { pluginData },
    );

    expect(result.permission).toBe("allow");
    expect(result.agent_message).toContain(".kb/");
    expect(result.agent_message).toContain("MCP tools");
    expect(result.agent_message).toContain("CLI JSON routes");
    expect(result.agent_message).toContain("Query before mutate");
  });

  test("preToolUse does not parse Bash command text for .kb paths", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);

    expect(
      await runHook(
        {
          hook_event_name: "preToolUse",
          tool_name: "Shell",
          tool_input: { command: "cat .kb/config.json" },
        },
        { pluginData },
      ),
    ).toEqual({});
  });

  test("beforeReadFile injects read guidance once per path", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");
    fs.mkdirSync(path.join(cwd, "src"), { recursive: true });

    const payload = {
      hook_event_name: "beforeReadFile",
      cwd,
      file_path: path.join(cwd, "src", "auth.ts"),
    };

    const first = await runHook(payload, { pluginData });
    expect(first.permission).toBe("allow");
    expect(first.agent_message).toContain("Kibi read guidance");

    const second = await runHook(payload, { pluginData });
    expect(second).toEqual({ permission: "allow" });
  });

  test("beforeReadFile allows missing, unready, and untracked reads", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);

    expect(
      await runHook({ hook_event_name: "beforeReadFile", cwd }, { pluginData }),
    ).toEqual({ permission: "allow" });
    expect(
      await runHook(
        { hook_event_name: "beforeReadFile", cwd, file_path: "src/a.ts" },
        { pluginData },
      ),
    ).toEqual({ permission: "allow" });

    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");

    expect(
      await runHook(
        { hook_event_name: "beforeReadFile", cwd, file_path: "package.json" },
        { pluginData },
      ),
    ).toEqual({ permission: "allow" });
  });

  test("postToolUse tracks only explicit meaningful paths", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");

    await runHook(
      {
        hook_event_name: "postToolUse",
        cwd,
        tool_name: "Shell",
        tool_input: { command: "touch src/ignored.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "postToolUse",
        cwd,
        tool_name: "Write",
        tool_input: { file_path: "packages/cursor/src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "postToolUse",
        cwd,
        tool_name: "Write",
        tool_input: { file_path: "package.json" },
      },
      { pluginData },
    );

    expect(loadHookState(pluginData).dirtyPaths).toEqual([
      "packages/cursor/src/hook-runner.ts",
    ]);
  });

  test("postToolUse changes MCP state only after observing a kb tool call", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);

    expect(loadHookState(pluginData).mcpState).toBe("unknown");

    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "CallMcpTool",
        tool_input: { toolName: "kb_search" },
      },
      { pluginData },
    );

    expect(loadHookState(pluginData).mcpState).toBe("observed");
  });

  test("postToolUse injects write guidance for tracked source edits", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");

    const result = await runHook(
      {
        hook_event_name: "postToolUse",
        cwd,
        tool_name: "Write",
        tool_input: { file_path: "packages/cursor/src/hook-runner.ts" },
      },
      { pluginData },
    );

    expect(result.additional_context).toContain("Kibi impact review");
    expect(result.additional_context).toContain("kb_check");
    expect(result.additional_context).toContain("includeImpactDiagnostics");
    expect(result.additional_context).toContain("includeWorkingTreeDiff");
    expect(result.additional_context).toContain("symbol granularity");
  });

  test("postToolUse injects read guidance once for read-like tools", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");

    const payload = {
      hook_event_name: "postToolUse",
      cwd,
      tool_name: "Read",
      tool_input: { file_path: "src/read.ts" },
    };

    const first = await runHook(payload, { pluginData });
    expect(first.additional_context).toContain("Kibi read guidance");

    expect(await runHook(payload, { pluginData })).toEqual({});
  });

  test("postToolUse skips repeated write guidance and untracked or non-edit tools", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");

    const writePayload = {
      hook_event_name: "postToolUse",
      cwd,
      tool_name: "Write",
      tool_input: { file_path: "src/write.ts" },
    };
    expect(
      (await runHook(writePayload, { pluginData })).additional_context,
    ).toContain("Kibi impact review");
    expect(await runHook(writePayload, { pluginData })).toEqual({});
    expect(
      await runHook(
        {
          hook_event_name: "postToolUse",
          cwd,
          tool_name: "Write",
          tool_input: { file_path: "package.json" },
        },
        { pluginData },
      ),
    ).toEqual({});
    expect(
      await runHook(
        {
          hook_event_name: "postToolUse",
          cwd,
          tool_name: "Read",
          tool_input: { file_path: "package.json" },
        },
        { pluginData },
      ),
    ).toEqual({});
    expect(
      await runHook(
        {
          hook_event_name: "postToolUse",
          cwd,
          tool_name: "Shell",
          tool_input: { file_path: "src/shell.ts" },
        },
        { pluginData },
      ),
    ).toEqual({});
  });

  test("stop returns a short freshness follow-up once and clears tracked paths", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "Write",
        tool_input: { file_path: ".kb/requirements/REQ-cursor.md" },
      },
      { pluginData },
    );

    const result = await runHook({ hook_event_name: "stop" }, { pluginData });

    expect(result.followup_message).toBe(
      "Kibi: sync or record no-impact after 1 edited file.",
    );
    expect(loadHookState(pluginData).dirtyPaths).toEqual([]);
    expect(await runHook({ hook_event_name: "stop" }, { pluginData })).toEqual(
      {},
    );
  });

  test("stop stays quiet for test-only edits", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "Write",
        tool_input: { file_path: "packages/mcp/tests/tools/check.test.ts" },
      },
      { pluginData },
    );

    expect(await runHook({ hook_event_name: "stop" }, { pluginData })).toEqual(
      {},
    );
  });

  test("stop prompts impact-enabled kb_check after source edits without impact check", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "Write",
        tool_input: { file_path: "packages/cursor/src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "CallMcpTool",
        tool_input: { toolName: "kb_check" },
      },
      { pluginData },
    );

    const result = await runHook({ hook_event_name: "stop" }, { pluginData });
    expect(result.followup_message).toContain("includeImpactDiagnostics");
    expect(result.followup_message).toContain("includeWorkingTreeDiff");
    expect(result.followup_message).toContain(
      "packages/cursor/src/hook-runner.ts",
    );
  });

  test("stop asks only for the decision record after impact-enabled kb_check covers source edits", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "Write",
        tool_input: { file_path: "packages/cursor/src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "CallMcpTool",
        tool_input: {
          toolName: "kb_check",
          arguments: {
            sourceFiles: ["packages/cursor/src/hook-runner.ts"],
            includeImpactDiagnostics: true,
            includeWorkingTreeDiff: true,
          },
        },
      },
      { pluginData },
    );

    const stop = await runHook({ hook_event_name: "stop" }, { pluginData });
    expect(stop.followup_message).toStartWith(
      "Kibi: this session changed source files and recorded nothing in the knowledge base.",
    );
    expect(stop.followup_message).not.toContain("kb_check(");
    expect(await runHook({ hook_event_name: "stop" }, { pluginData })).toEqual(
      {},
    );
  });

  test("stop summarizes KB mutations briefly", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "kb_upsert",
        tool_input: { type: "fact", id: "FACT-001" },
      },
      { pluginData },
    );

    const result = await runHook({ hook_event_name: "stop" }, { pluginData });

    expect(result.followup_message).toBe("Kibi KB updated (kb_upsert).");
  });

  test("stop stays quiet after Read or Grep of source files", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "Read",
        tool_input: { file_path: "packages/cursor/src/hook-runner.ts" },
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "Grep",
        tool_input: { path: "packages/cursor/src/messages.ts" },
      },
      { pluginData },
    );

    expect(loadHookState(pluginData).dirtyPaths).toEqual([]);
    expect(await runHook({ hook_event_name: "stop" }, { pluginData })).toEqual(
      {},
    );
  });

  test("stop stays quiet after CreatePlan without edits", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "CreatePlan",
        tool_input: {
          path: "packages/cursor/src/hook-runner.ts",
        },
      },
      { pluginData },
    );

    expect(loadHookState(pluginData).planDelivered).toBe(true);
    expect(loadHookState(pluginData).dirtyPaths).toEqual([]);
    expect(await runHook({ hook_event_name: "stop" }, { pluginData })).toEqual(
      {},
    );
    expect(loadHookState(pluginData).planDelivered).toBe(false);
  });

  test("stop still prompts after CreatePlan when source was edited", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "CreatePlan",
        tool_input: {},
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "Write",
        tool_input: { file_path: "packages/cursor/src/hook-runner.ts" },
      },
      { pluginData },
    );

    const result = await runHook({ hook_event_name: "stop" }, { pluginData });
    expect(result.followup_message).toContain("includeImpactDiagnostics");
    expect(result.followup_message).toContain(
      "packages/cursor/src/hook-runner.ts",
    );
  });

  test("stop still summarizes KB mutations after CreatePlan", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "create_plan",
        tool_input: {},
      },
      { pluginData },
    );
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "kb_upsert",
        tool_input: { type: "fact", id: "FACT-001" },
      },
      { pluginData },
    );

    const result = await runHook({ hook_event_name: "stop" }, { pluginData });
    expect(result.followup_message).toBe("Kibi KB updated (kb_upsert).");
  });

  test("stop does not treat SwitchMode as plan delivery", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "SwitchMode",
        tool_input: {
          target_mode_id: "plan",
          path: "packages/cursor/src/hook-runner.ts",
        },
      },
      { pluginData },
    );

    expect(loadHookState(pluginData).planDelivered).toBe(false);
    expect(loadHookState(pluginData).dirtyPaths).toEqual([]);
    expect(await runHook({ hook_event_name: "stop" }, { pluginData })).toEqual(
      {},
    );
  });

  test("stop stays quiet when status is aborted even after source edits", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    await runHook(
      {
        hook_event_name: "postToolUse",
        tool_name: "Write",
        tool_input: { file_path: "packages/cursor/src/hook-runner.ts" },
      },
      { pluginData },
    );

    expect(
      await runHook(
        { hook_event_name: "stop", status: "aborted" },
        { pluginData },
      ),
    ).toEqual({});
    expect(loadHookState(pluginData).dirtyPaths).toEqual([]);
  });

  test("unknown hook events return empty output", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);

    expect(
      await runHook({ hook_event_name: "FutureHookEvent" }, { pluginData }),
    ).toEqual({});
  });
});

describe("Cursor hook runner workspace stamp", () => {
  test("preToolUse names the agent's workspace on every Kibi MCP call without a permission", async () => {
    const window = createTempRoot("kibi-cursor-window-");
    const worktree = createTempRoot("kibi-cursor-worktree-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(window, worktree, pluginData);
    for (const root of [window, worktree]) {
      fs.mkdirSync(path.join(root, ".kb"));
      fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
    }
    // The per-call cwd (the agent's checkout) wins over the window's folders.
    const result = await runHook(
      {
        hook_event_name: "preToolUse",
        cwd: path.join(worktree, "src"),
        workspace_roots: [window],
        tool_name: "MCP:kb_query",
        tool_input: { id: "REQ-1" },
      },
      { pluginData },
    );
    expect(result).toEqual({
      updated_input: { id: "REQ-1", workspaceRoot: worktree },
    });
    // Without a cwd the window folder is the best available answer.
    const fromRoots = await runHook(
      {
        hook_event_name: "preToolUse",
        workspace_roots: [window],
        tool_name: "MCP:kb_query",
        tool_input: {},
      },
      { pluginData },
    );
    expect(fromRoots).toEqual({ updated_input: { workspaceRoot: window } });
  });

  test("a non-Kibi tool and a directory outside any Kibi workspace are left alone", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "manifest.json"), "{}");
    expect(
      await runHook(
        {
          hook_event_name: "preToolUse",
          cwd,
          tool_name: "Shell",
          tool_input: { command: "ls" },
        },
        { pluginData },
      ),
    ).toEqual({});
    const plain = createTempRoot("kibi-cursor-plain-");
    tempRoots.push(plain);
    fs.mkdirSync(path.join(plain, ".git"));
    expect(
      await runHook(
        {
          hook_event_name: "preToolUse",
          cwd: plain,
          tool_name: "MCP:kb_query",
          tool_input: {},
        },
        { pluginData },
      ),
    ).toEqual({});
  });
});

// implements REQ-agent-core-edit-snippets
const cursorPluginRoot = path.resolve(import.meta.dir, "..");

type HookCommandRun = { code: number | null; stdout: string; stderr: string };

/**
 * Run the command `hooks/hooks.json` registers for `event` the way Cursor
 * does: through a shell from the plugin root (the command names the built
 * `dist/hook-runner.js` relative to it), with the hook payload on stdin.
 */
function runCursorHookCommand(
  event: string,
  payload: Record<string, unknown>,
  pluginData: string,
): Promise<HookCommandRun> {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(cursorPluginRoot, "hooks", "hooks.json"), "utf8"),
  ) as { hooks: Record<string, { command: string }[]> };
  const command = manifest.hooks[event]?.[0]?.command;
  if (!command) throw new Error(`hooks.json registers no ${event} command`);
  const env: NodeJS.ProcessEnv = { ...process.env, PLUGIN_DATA: pluginData };
  // A developer's own telemetry opt-in must not reach the hook process.
  for (const key of ["KIBI_DIAGNOSTIC_MODE", "KIBI_CLI_DIAGNOSTIC_MODE"]) {
    Reflect.deleteProperty(env, key);
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: cursorPluginRoot,
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

/** Source whose `computeTotal` spans lines 3-7. */
const CURSOR_CHECKOUT_SOURCE = [
  "// checkout",
  "",
  "export function computeTotal(items: number[]): number {",
  "  let total = 0;",
  "  for (const item of items) total += item;",
  "  return Math.round(total * 100) / 100;",
  "}",
  "",
].join("\n");

/** A bootstrapped workspace whose checkout code implements a grounded requirement. */
function cursorLinkedWorkspace(): string {
  const root = createTempRoot("kibi-cursor-e2e-ws-");
  tempRoots.push(root);
  const write = (relativePath: string, content: string) => {
    const target = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  };
  write(".kb/manifest.json", "{}");
  write(
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
  write(
    ".kb/symbol-coordinates.yaml",
    "version: 1\ncoordinates:\n  SYM-computeTotal:\n    sourceFile: src/checkout.ts\n    sourceLine: 3\n    sourceEndLine: 7\n",
  );
  write(
    ".kb/requirements/REQ-checkout-rounding.md",
    "---\nid: REQ-checkout-rounding\ntitle: Checkout totals round to cents\nstatus: open\nlinks:\n  - type: constrains\n    target: FACT-checkout-total\n  - type: requires_property\n    target: FACT-total-rounding-cents\n  - ADR-money-as-decimal\n---\n\nTotals round half up to two decimals.\n",
  );
  write(
    ".kb/facts/FACT-total-rounding-cents.md",
    "---\nid: FACT-total-rounding-cents\ntitle: Totals round half up to two decimals\nstatus: active\n---\n",
  );
  write(
    ".kb/adr/ADR-money-as-decimal.md",
    "---\nid: ADR-money-as-decimal\ntitle: Money is computed as decimal cents\nstatus: accepted\n---\n",
  );
  write("src/checkout.ts", CURSOR_CHECKOUT_SOURCE);
  return root;
}

describe("Cursor hook command pre-edit knowledge (end to end)", () => {
  test("the preToolUse command gives an edit of linked code its requirement, what it must keep true and its decision within the snippet budget", async () => {
    const workspace = cursorLinkedWorkspace();
    const pluginData = createTempRoot("kibi-cursor-e2e-data-");
    tempRoots.push(pluginData);
    const preEdit = () =>
      runCursorHookCommand(
        "preToolUse",
        {
          hook_event_name: "preToolUse",
          conversation_id: "cursor-e2e-1",
          workspace_roots: [workspace],
          tool_name: "StrReplace",
          tool_input: {
            file_path: path.join(workspace, "src/checkout.ts"),
            old_string: "  return Math.round(total * 100) / 100;",
            new_string: "  return total;",
          },
        },
        pluginData,
      );

    const run = await preEdit();
    expect(run.code).toBe(0);
    expect(run.stderr).toBe("");
    const output = JSON.parse(run.stdout) as CursorHookResult;
    expect(Object.keys(output).sort()).toEqual(["agent_message", "permission"]);
    // Advisory only: the edit is allowed, never denied or rewritten.
    expect(output.permission).toBe("allow");
    const message = output.agent_message ?? "";
    const start = message.indexOf("Kibi knowledge for src/checkout.ts");
    const end = message.indexOf(`\n${PRE_EDIT_FOLLOWUP}`);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const snippet = message.slice(start, end);
    expect(snippet).toStartWith(
      "Kibi knowledge for src/checkout.ts (symbol manifest):\n- REQ-checkout-rounding [firm: ask before changing]: Checkout totals round to cents — computeTotal\n",
    );
    expect(snippet).toContain(
      "\nREQ-checkout-rounding must keep true: FACT-checkout-total; FACT-total-rounding-cents: Totals round half up to two decimals.\n",
    );
    expect(snippet).toContain(
      "\nDecision: ADR-money-as-decimal [firm: ask before changing]: Money is computed as decimal cents.\n",
    );
    expect(snippet).toContain(
      "\nThe edit is inside computeTotal, which implements REQ-checkout-rounding.\n",
    );
    expect(snippet.length).toBeLessThanOrEqual(MAX_SNIPPET_CHARS);
    expect(message).toEndWith(PRE_EDIT_FOLLOWUP);

    // A later hook process in the same conversation does not repeat it.
    const repeat = await preEdit();
    expect(repeat.code).toBe(0);
    expect(JSON.parse(repeat.stdout)).toEqual({});
  }, 30_000);
});

describe("Cursor decision guard", () => {
  const FIRM_NOTICE =
    "Kibi: this edit changes computeTotal in src/checkout.ts, which implements a firm requirement, a rule the person set: REQ-checkout-rounding: Checkout totals round to cents.";

  function conversation(env: NodeJS.ProcessEnv = {}) {
    const workspace = cursorLinkedWorkspace();
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    const event = (payload: Record<string, unknown>, id = "guard-1") =>
      runHook(
        { conversation_id: id, workspace_roots: [workspace], ...payload },
        { pluginData, env },
      );
    const edit = {
      hook_event_name: "preToolUse",
      tool_name: "StrReplace",
      tool_input: {
        file_path: path.join(workspace, "src/checkout.ts"),
        old_string: "  return Math.round(total * 100) / 100;",
        new_string: "  return total;",
      },
    };
    return { event, edit, workspace };
  }

  test("an edit of code implementing a firm requirement tells the agent to ask first, once per requirement per conversation", async () => {
    const { event, edit } = conversation();

    const first = await event(edit);
    expect(first.permission).toBe("allow");
    expect(first.agent_message).toStartWith(
      `${FIRM_NOTICE}\nUnless the edit keeps that rule, ask the person before making it and name the rule;`,
    );
    expect(await event(edit)).toEqual({});
    expect((await event(edit, "guard-2")).agent_message).toStartWith(
      FIRM_NOTICE,
    );
  });

  test("KIBI_CONFIRM_FIRM_EDITS=0 turns the firm-edit notice off", async () => {
    const { event, edit } = conversation({ KIBI_CONFIRM_FIRM_EDITS: "0" });
    const message = (await event(edit)).agent_message ?? "";
    expect(message).toContain("Kibi knowledge for src/checkout.ts");
    expect(message).not.toContain("which implements a firm requirement");
  });

  test("a prompt that states a rule lets the prompt through and the next edit carries its note", async () => {
    const { event, edit } = conversation({ KIBI_CONFIRM_FIRM_EDITS: "0" });
    expect(
      await event({
        hook_event_name: "beforeSubmitPrompt",
        prompt: "Totals must not be rounded from now on.",
      }),
    ).toEqual({ continue: true });

    const message = (await event(edit)).agent_message ?? "";
    expect(message).toStartWith(
      'Kibi: this request reads as a rule or decision (it says "must not").',
    );
    expect(message).toContain("Kibi knowledge for src/checkout.ts");
  });

  test("stop asks once for the decision record when source changed and nothing was recorded", async () => {
    const { event, workspace } = conversation();
    await event({
      hook_event_name: "beforeSubmitPrompt",
      prompt: "Guests should never see totals.",
    });
    const write = {
      hook_event_name: "postToolUse",
      tool_name: "Write",
      tool_input: { file_path: path.join(workspace, "src/checkout.ts") },
    };
    await event(write);

    const stop = await event({ hook_event_name: "stop", status: "completed" });
    expect(stop.followup_message).toContain("kb_upsert");
    expect(stop.followup_message).toContain("kb_check(");

    await event(write);
    const again = await event({ hook_event_name: "stop", status: "completed" });
    expect(again.followup_message).not.toContain(
      "recorded nothing in the knowledge base",
    );
  });

  test("stop asks once for a signoff view after a requirement is written", async () => {
    const { event } = conversation();
    await event({
      hook_event_name: "postToolUse",
      tool_name: "CallMcpTool",
      tool_input: {
        toolName: "kb_upsert",
        arguments: { type: "req", id: "REQ-guests" },
      },
    });
    const stop = await event({ hook_event_name: "stop", status: "completed" });
    expect(stop.followup_message).toContain("run `kibi signoff`");
    const again = await event({ hook_event_name: "stop", status: "completed" });
    expect(again.followup_message ?? "").not.toContain("kibi signoff");
  });

  test("a kb_upsert keeps stop from asking for the decision record", async () => {
    const { event, workspace } = conversation();
    await event({
      hook_event_name: "postToolUse",
      tool_name: "Write",
      tool_input: { file_path: path.join(workspace, "src/checkout.ts") },
    });
    await event({
      hook_event_name: "postToolUse",
      tool_name: "CallMcpTool",
      tool_input: { toolName: "kb_upsert", arguments: {} },
    });
    const stop = await event({ hook_event_name: "stop", status: "completed" });
    expect(stop.followup_message ?? "").not.toContain(
      "recorded nothing in the knowledge base",
    );
  });
});

describe("Cursor hook runner result contracts", () => {
  const optedIn = { KIBI_DIAGNOSTIC_MODE: "1" };
  const RULE_NOTE_START = "Kibi: this request reads as a rule or decision";

  function usageRows(root: string): Record<string, unknown>[] {
    const logPath = path.join(root, ".kb", "usage.log");
    if (!fs.existsSync(logPath)) return [];
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  function conversation(
    workspace: string = cursorLinkedWorkspace(),
    env: NodeJS.ProcessEnv = {},
  ) {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    const event = (payload: Record<string, unknown>, id = "contract-1") =>
      runHook(
        { conversation_id: id, workspace_roots: [workspace], ...payload },
        { pluginData, env },
      );
    return { event, workspace, pluginData };
  }

  test("kibiWorkspaceFor finds the nearest manifest and stops at a repository boundary", async () => {
    const { kibiWorkspaceFor } = await import("../src/hook-runner");
    const root = createTempRoot("kibi-cursor-owner-");
    tempRoots.push(root);
    fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
    fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
    fs.mkdirSync(path.join(root, "src", "deep"), { recursive: true });
    expect(kibiWorkspaceFor(path.join(root, "src", "deep"))).toBe(root);

    const nested = path.join(root, "vendor", "lib");
    fs.mkdirSync(path.join(root, "vendor", ".git"), { recursive: true });
    fs.mkdirSync(nested, { recursive: true });
    expect(kibiWorkspaceFor(nested)).toBeUndefined();

    // A .kb directory without manifest.json is not a Kibi workspace.
    const bare = createTempRoot("kibi-cursor-bare-");
    tempRoots.push(bare);
    fs.mkdirSync(path.join(bare, ".kb"), { recursive: true });
    fs.mkdirSync(path.join(bare, ".git"), { recursive: true });
    expect(kibiWorkspaceFor(bare)).toBeUndefined();
  });

  // implements REQ-kibi-anonymous-usage-telemetry
  test("every hook remembers the conversation for the workspace when telemetry is on", async () => {
    const telemetryDir = createTempRoot("kibi-cursor-telemetry-");
    tempRoots.push(telemetryDir);
    const env = { KIBI_TELEMETRY: "1", KIBI_TELEMETRY_DIR: telemetryDir };
    const { event, workspace } = conversation(cursorLinkedWorkspace(), env);

    await event({ hook_event_name: "stop", status: "completed" }, "conv-7");

    expect(workspaceSessionHash(workspace, env)).toBe(
      hashTelemetryId("conv-7"),
    );
  });

  test("no session is remembered when telemetry is off", async () => {
    const telemetryDir = createTempRoot("kibi-cursor-telemetry-");
    tempRoots.push(telemetryDir);
    const env = { KIBI_TELEMETRY: "0", KIBI_TELEMETRY_DIR: telemetryDir };
    const { event } = conversation(cursorLinkedWorkspace(), env);
    await event({ hook_event_name: "stop", status: "completed" }, "conv-8");
    expect(fs.readdirSync(telemetryDir)).toEqual([]);
  });

  test("an edit call without a path gets no pre-edit message", async () => {
    const { event } = conversation();
    expect(
      await event({
        hook_event_name: "preToolUse",
        tool_name: "Write",
        tool_input: {},
      }),
    ).toEqual({});
  });

  test("a file covered only by tests gets the generic read guidance, not a requirement snippet", async () => {
    const workspace = cursorLinkedWorkspace();
    fs.writeFileSync(
      path.join(workspace, ".kb", "symbols.yaml"),
      [
        "symbols:",
        "  - id: SYM-computeTotal",
        "    title: computeTotal",
        "    sourceFile: src/checkout.ts",
        "    relationships:",
        "      - type: covered_by",
        "        target: TEST-checkout-rounding",
        "",
      ].join("\n"),
    );
    const { event } = conversation(workspace);
    const result = await event({
      hook_event_name: "beforeReadFile",
      file_path: path.join(workspace, "src/checkout.ts"),
    });
    expect(result.agent_message).toContain("\nKibi read guidance:");
    expect(result.agent_message).not.toContain("Kibi knowledge for");
  });

  test("a whole-file write to firm code gets the firm-edit notice for the file", async () => {
    const { event, workspace } = conversation();
    const result = await event({
      hook_event_name: "preToolUse",
      tool_name: "Write",
      tool_input: { file_path: path.join(workspace, "src/checkout.ts") },
    });
    expect(result.agent_message).toStartWith(
      "Kibi: this edit changes src/checkout.ts, which implements a firm requirement",
    );
  });

  test("a documentation edit that gets no guidance is not remembered as guided", async () => {
    const workspace = cursorLinkedWorkspace();
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);
    const result = await runHook(
      {
        hook_event_name: "preToolUse",
        workspace_roots: [workspace],
        tool_name: "Write",
        tool_input: { file_path: path.join(workspace, "README.md") },
      },
      { pluginData, env: { KIBI_CONFIRM_FIRM_EDITS: "0" } },
    );
    expect(result).toEqual({});
    expect(loadHookState(pluginData).guidedPreEditPaths).toEqual([]);
  });

  test("the rule note, firm notice and knowledge are separate paragraphs", async () => {
    const { event, workspace } = conversation();
    await event({
      hook_event_name: "beforeSubmitPrompt",
      prompt: "Totals must not be rounded from now on.",
    });
    const message =
      (
        await event({
          hook_event_name: "preToolUse",
          tool_name: "StrReplace",
          tool_input: {
            file_path: path.join(workspace, "src/checkout.ts"),
            old_string: "  return Math.round(total * 100) / 100;",
            new_string: "  return total;",
          },
        })
      ).agent_message ?? "";
    const paragraphs = message.split("\n\n");
    expect(paragraphs[0]).toStartWith(RULE_NOTE_START);
    expect(paragraphs[1]).toStartWith(
      "Kibi: this edit changes computeTotal in src/checkout.ts",
    );
    expect(paragraphs[2]).toContain("Kibi knowledge for src/checkout.ts");
  });

  test("a prompt without a rule leaves the next edit without a rule note", async () => {
    const { event, workspace } = conversation(undefined, {
      KIBI_CONFIRM_FIRM_EDITS: "0",
    });
    expect(
      await event({
        hook_event_name: "beforeSubmitPrompt",
        prompt: "Tidy up the checkout module.",
      }),
    ).toEqual({ continue: true });
    expect(await event({ hook_event_name: "beforeSubmitPrompt" })).toEqual({
      continue: true,
    });
    const message =
      (
        await event({
          hook_event_name: "preToolUse",
          tool_name: "Write",
          tool_input: { file_path: path.join(workspace, "src/checkout.ts") },
        })
      ).agent_message ?? "";
    expect(message).toContain("Kibi knowledge for src/checkout.ts");
    expect(message).not.toContain(RULE_NOTE_START);
  });

  test("an unconfigured workspace keeps no prompt state and writes no telemetry", async () => {
    const plain = createTempRoot("kibi-cursor-plain-");
    tempRoots.push(plain);
    const { event, pluginData } = conversation(plain, optedIn);
    expect(
      await event({
        hook_event_name: "beforeSubmitPrompt",
        prompt: "Guests must not see totals.",
      }),
    ).toEqual({ continue: true });
    await event({
      hook_event_name: "postToolUse",
      tool_name: "Shell",
      tool_input: { command: "npx --no-install kibi search --input -" },
    });
    expect(fs.readdirSync(pluginData)).toEqual([]);
    expect(fs.existsSync(path.join(plain, ".kb"))).toBe(false);
  });

  test("telemetry rows carry the hook event and plugin version, and reads are not edits", async () => {
    const { event, workspace } = conversation(undefined, optedIn);
    await event({
      hook_event_name: "postToolUse",
      tool_name: "Read",
      tool_input: { file_path: "src/checkout.ts" },
    });
    await event({
      hook_event_name: "postToolUse",
      tool_name: "Write",
      tool_input: { file_path: "src/checkout.ts" },
    });
    const pkg = JSON.parse(
      fs.readFileSync(path.join(import.meta.dir, "..", "package.json"), "utf8"),
    ) as { version: string };
    const rows = usageRows(workspace);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      hook_action: "edited",
      hook_event: "postToolUse",
      package_version: pkg.version,
      path: "src/checkout.ts",
    });
  });

  test("one source path among an edit's paths is enough to ask for the decision record", async () => {
    const { event, workspace } = conversation();
    await event({
      hook_event_name: "postToolUse",
      tool_name: "Edit",
      tool_input: {
        paths: [
          path.join(workspace, "README.md"),
          path.join(workspace, "src/checkout.ts"),
        ],
      },
    });
    const stop = await event({ hook_event_name: "stop", status: "completed" });
    expect(stop.followup_message).toContain(
      "recorded nothing in the knowledge base",
    );
  });

  test("a CLI upsert counts as recording knowledge", async () => {
    const { event, workspace } = conversation();
    await event({
      hook_event_name: "postToolUse",
      tool_name: "Write",
      tool_input: { file_path: path.join(workspace, "src/checkout.ts") },
    });
    await event({
      hook_event_name: "postToolUse",
      tool_name: "Shell",
      tool_input: { command: "npx --no-install kibi upsert --input -" },
    });
    const stop = await event({ hook_event_name: "stop", status: "completed" });
    expect(stop.followup_message ?? "").not.toContain(
      "recorded nothing in the knowledge base",
    );
  });
});
