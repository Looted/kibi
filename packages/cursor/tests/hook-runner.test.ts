import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { runHook } from "../src/hook-runner";
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
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");

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
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");
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
    fs.writeFileSync(path.join(workspaceRoot, ".kb", "config.json"), "{}");
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
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");

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
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");
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
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");

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
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");

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
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");

    const result = await runHook(
      {
        hook_event_name: "postToolUse",
        cwd,
        tool_name: "Write",
        tool_input: { file_path: "packages/cursor/src/hook-runner.ts" },
      },
      { pluginData },
    );

    expect(result.additional_context).toContain("Kibi write guidance");
    expect(result.additional_context).toContain("kb_check");
    expect(result.additional_context).toContain("includeImpactDiagnostics");
    expect(result.additional_context).toContain("includeWorkingTreeDiff");
    expect(result.additional_context).toContain("semantic review");
  });

  test("postToolUse injects read guidance once for read-like tools", async () => {
    const cwd = createTempRoot("kibi-cursor-cwd-");
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(cwd, pluginData);
    fs.mkdirSync(path.join(cwd, ".kb"));
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");

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
    fs.writeFileSync(path.join(cwd, ".kb", "config.json"), "{}");

    const writePayload = {
      hook_event_name: "postToolUse",
      cwd,
      tool_name: "Write",
      tool_input: { file_path: "src/write.ts" },
    };
    expect(
      (await runHook(writePayload, { pluginData })).additional_context,
    ).toContain("Kibi write guidance");
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
        tool_input: { file_path: "documentation/requirements/REQ-cursor.md" },
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

  test("stop stays quiet after impact-enabled kb_check covers source edits", async () => {
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

  test("unknown hook events return empty output", async () => {
    const pluginData = createTempRoot("kibi-cursor-data-");
    tempRoots.push(pluginData);

    expect(
      await runHook({ hook_event_name: "FutureHookEvent" }, { pluginData }),
    ).toEqual({});
  });
});
