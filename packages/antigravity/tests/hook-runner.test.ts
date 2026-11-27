import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  CONFIRM_FIRM_EDITS_ENV,
  editFocus,
  normalizeEditArgs,
  readFocus,
  runHook,
} from "../src/hook-runner.js";
import {
  canonicalKbOperation,
  extractCliKbUsage,
  extractMcpKbUsage,
  isVerifiedGitCommit,
  workspaceOverwrite,
} from "../src/kb-tools.js";
import { createKibiWorkspace, makeTempDir } from "./workspace-fixture.js";

describe("kibi-antigravity kb-tools helpers", () => {
  test("recognizes Antigravity MCP tool names and stamps workspaceRoot", () => {
    expect(canonicalKbOperation("kb_search")).toBe("kb_search");
    expect(canonicalKbOperation("kibi_kb_query")).toBe("kb_query");
    expect(canonicalKbOperation("mcp_antigravity_kibi_kb_check")).toBe(
      "kb_check",
    );
    expect(canonicalKbOperation("mcp__kibi__kb_upsert")).toBe("kb_upsert");
    expect(canonicalKbOperation("antigravity_kibi:kb_status")).toBe(
      "kb_status",
    );
    expect(canonicalKbOperation("read_file")).toBeUndefined();

    expect(
      workspaceOverwrite(
        "mcp_antigravity_kibi_kb_search",
        { query: "x" },
        "/repo",
      ),
    ).toEqual({ workspaceRoot: "/repo" });
    expect(
      workspaceOverwrite(
        "call_mcp_tool",
        {
          ServerName: "antigravity_kibi",
          ToolName: "kb_query",
          Arguments: JSON.stringify({ id: "REQ-1" }),
        },
        "/repo",
      ),
    ).toEqual({
      Arguments: JSON.stringify({ id: "REQ-1", workspaceRoot: "/repo" }),
    });
    expect(
      workspaceOverwrite(
        "call_mcp_tool",
        {
          ServerName: "other_server",
          ToolName: "kb_query",
          Arguments: { id: "REQ-1" },
        },
        "/repo",
      ),
    ).toBeUndefined();
    expect(
      workspaceOverwrite(
        "mcp_antigravity_kibi_kb_search",
        { query: "x", workspaceRoot: "/other" },
        "/repo",
      ),
    ).toBeUndefined();
    expect(
      workspaceOverwrite("read_file", { Path: "/repo/a.ts" }, "/repo"),
    ).toBeUndefined();

    const wrappedUsage = extractMcpKbUsage("call_mcp_tool", {
      ServerName: "antigravity_kibi",
      ToolName: "kb_check",
      Arguments: JSON.stringify({
        sourceFiles: ["src/checkout.ts"],
        changed: true,
      }),
    });
    expect(wrappedUsage).toEqual({
      operation: "kb_check",
      paths: ["src/checkout.ts"],
      ids: [],
      check: true,
      checkAll: false,
    });
  });

  test("extracts CLI and MCP usage and detects verified git commits", () => {
    const cli = extractCliKbUsage(
      `printf '%s\\n' '{"sourceFiles":["src/a.ts"],"changed":true}' | npx --no-install kibi check --input -`,
    );
    expect(cli?.operation).toBe("kb_check");
    expect(cli?.check).toBe(true);
    expect(cli?.paths).toEqual(["src/a.ts"]);

    const mcp = extractMcpKbUsage("antigravity_kibi:kb_record", {
      dryRun: true,
    });
    expect(mcp?.operation).toBe("kb_validate_upsert");

    expect(isVerifiedGitCommit('git commit -m "feat: ok"')).toBe(true);
    expect(isVerifiedGitCommit('git commit --no-verify -m "skip"')).toBe(false);
  });

  test("normalizes Antigravity edit and read arguments", () => {
    expect(readFocus({ StartLine: 10, EndLine: 25 })).toEqual([
      { start: 10, end: 25 },
    ]);
    expect(readFocus({})).toBeUndefined();

    expect(
      normalizeEditArgs("edit_file", {
        Path: "/repo/a.ts",
        Target: "old",
        Replacement: "new",
      }),
    ).toEqual({ old_string: "old", new_string: "new", replace_all: true });

    const { root } = createKibiWorkspace();
    expect(
      editFocus(path.join(root, "src", "checkout.ts"), "edit_file", {
        Path: path.join(root, "src", "checkout.ts"),
        Target: "Math.round(amount * 100) / 100;",
        Replacement: "Math.floor(amount * 100) / 100;",
      }),
    ).toEqual([{ start: 2, end: 2 }]);
  });
});

describe("kibi-antigravity hook-runner lifecycle", () => {
  test("stays silent outside Kibi workspaces", async () => {
    const nonKibi = makeTempDir("kibi-agy-nonkibi-");
    fs.mkdirSync(path.join(nonKibi, ".git"), { recursive: true });

    const out = await runHook(
      {
        hookEventName: "SessionStart",
        conversationId: "conv-nonkibi",
        cwd: nonKibi,
        workspacePaths: [nonKibi],
      },
      { env: { KIBI_TELEMETRY: "0" } },
    );
    expect(out).toEqual({});

    // PreToolUse must still emit a valid decision outside Kibi workspaces so
    // Antigravity never interprets an empty object as a deny.
    const preOut = await runHook(
      {
        hookEventName: "PreToolUse",
        conversationId: "conv-nonkibi",
        cwd: nonKibi,
        workspacePaths: [nonKibi],
        toolCall: {
          id: "c1",
          name: "read_file",
          args: { Path: path.join(nonKibi, "README.md") },
        },
      },
      { env: { KIBI_TELEMETRY: "0" } },
    );
    expect(preOut).toEqual({ decision: "allow" });

    // Outside Kibi workspaces, PreToolUse delegates to Antigravity's default
    // policy with "allow" (never "auto_approve" and never extra "ask" prompts).
    const bypassOut = await runHook(
      {
        hookEventName: "PreToolUse",
        conversationId: "conv-nonkibi",
        cwd: nonKibi,
        workspacePaths: [nonKibi],
        toolCall: {
          id: "c2",
          name: "run_command",
          args: { CommandLine: "git status" },
        },
      },
      { env: { KIBI_TELEMETRY: "0" } },
    );
    expect(bypassOut).toEqual({ decision: "allow" });

    const editNonKibi = await runHook(
      {
        hookEventName: "PreToolUse",
        conversationId: "conv-nonkibi",
        cwd: nonKibi,
        workspacePaths: [nonKibi],
        toolCall: {
          id: "c3",
          name: "edit_file",
          args: {
            Path: path.join(nonKibi, "a.ts"),
            Target: "a",
            Replacement: "b",
          },
        },
      },
      { env: { KIBI_TELEMETRY: "0" } },
    );
    expect(editNonKibi).toEqual({ decision: "allow" });
  });

  test("injects SessionStart brief, queues read snippet on PreToolUse, and drains on PreInvocation", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const env = { KIBI_TELEMETRY: "0" };

    const start = await runHook(
      {
        hookEventName: "SessionStart",
        conversationId: "conv-1",
        cwd: root,
        workspacePaths: [root],
      },
      { pluginData, env },
    );
    const startText = start.injectSteps?.[0]?.systemMessage.systemMessage ?? "";
    expect(startText).toContain("Kibi records this repository's requirements");
    expect(startText).toContain("1 linked source files");

    const preRead = await runHook(
      {
        hookEventName: "PreToolUse",
        conversationId: "conv-1",
        cwd: root,
        workspacePaths: [root],
        toolCall: {
          id: "call-1",
          name: "read_file",
          args: { Path: path.join(root, "src", "checkout.ts") },
        },
      },
      { pluginData, env },
    );
    expect(preRead).toEqual({ decision: "allow" });

    const preInv = await runHook(
      {
        hookEventName: "PreInvocation",
        conversationId: "conv-1",
        cwd: root,
        workspacePaths: [root],
        invocationNum: 2,
        lastUserInput: "Review checkout rounding",
      },
      { pluginData, env },
    );
    const injected = preInv.injectSteps?.[0]?.systemMessage.systemMessage ?? "";
    expect(injected).toContain("REQ-checkout-rounding");
    expect(injected).toContain("roundTotal");
    expect(injected).toContain("Kibi requirements for the code in view:");

    // Second PreInvocation with the same prompt does not repeat the drained snippet.
    const preInv2 = await runHook(
      {
        hookEventName: "PreInvocation",
        conversationId: "conv-1",
        cwd: root,
        workspacePaths: [root],
        invocationNum: 3,
        lastUserInput: "Review checkout rounding",
      },
      { pluginData, env },
    );
    expect(preInv2).toEqual({});
  });

  test("asks before editing code that implements a firm requirement, and stops asking after approval", async () => {
    const { root, pluginData } = createKibiWorkspace({ firmRequirement: true });
    const env = { KIBI_TELEMETRY: "0" };
    const editArgs = {
      Path: path.join(root, "src", "checkout.ts"),
      Target: "return Math.round(amount * 100) / 100;",
      Replacement: "return Math.floor(amount * 100) / 100;",
    };

    const preEdit = await runHook(
      {
        hookEventName: "PreToolUse",
        conversationId: "conv-firm",
        cwd: root,
        workspacePaths: [root],
        toolCall: { id: "e1", name: "edit_file", args: editArgs },
      },
      { pluginData, env },
    );
    expect(preEdit.decision).toBe("force_ask");
    expect(preEdit.reason).toContain("REQ-checkout-rounding");
    expect(preEdit.reason).toContain("roundTotal");

    // Declined tool call (PostToolUse with error) must NOT confirm the firm requirement.
    await runHook(
      {
        hookEventName: "PostToolUse",
        conversationId: "conv-firm",
        cwd: root,
        workspacePaths: [root],
        error: "user denied permission",
        toolCall: { id: "e1", name: "edit_file", args: editArgs },
      },
      { pluginData, env },
    );

    const retryBeforeApproval = await runHook(
      {
        hookEventName: "PreToolUse",
        conversationId: "conv-firm",
        cwd: root,
        workspacePaths: [root],
        toolCall: { id: "e2", name: "edit_file", args: editArgs },
      },
      { pluginData, env },
    );
    expect(retryBeforeApproval.decision).toBe("force_ask");

    // Approved edit reaches PostToolUse without error -> confirms REQ-checkout-rounding.
    await runHook(
      {
        hookEventName: "PostToolUse",
        conversationId: "conv-firm",
        cwd: root,
        workspacePaths: [root],
        toolCall: { id: "e2", name: "edit_file", args: editArgs },
      },
      { pluginData, env },
    );

    const nextEdit = await runHook(
      {
        hookEventName: "PreToolUse",
        conversationId: "conv-firm",
        cwd: root,
        workspacePaths: [root],
        toolCall: {
          id: "e3",
          name: "edit_file",
          args: {
            ...editArgs,
            Replacement: "return Math.ceil(amount * 100) / 100;",
          },
        },
      },
      { pluginData, env },
    );
    expect(nextEdit).toEqual({ decision: "allow" });

    // Opt-out disables firm edit confirmation.
    const optedOut = await runHook(
      {
        hookEventName: "PreToolUse",
        conversationId: "conv-firm-off",
        cwd: root,
        workspacePaths: [root],
        toolCall: { id: "e4", name: "edit_file", args: editArgs },
      },
      { pluginData, env: { ...env, [CONFIRM_FIRM_EDITS_ENV]: "0" } },
    );
    expect(optedOut).toEqual({ decision: "allow" });
  });

  test("stamps workspaceRoot via overwrite on Kibi MCP calls and reminds once on Stop", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const env = { KIBI_TELEMETRY: "0" };

    const stamped = await runHook(
      {
        hookEventName: "PreToolUse",
        conversationId: "conv-stop",
        cwd: root,
        workspacePaths: [root],
        toolCall: {
          id: "m1",
          name: "call_mcp_tool",
          args: {
            ServerName: "antigravity_kibi",
            ToolName: "kb_search",
            Arguments: JSON.stringify({ query: "checkout" }),
          },
        },
      },
      { pluginData, env },
    );
    expect(stamped).toEqual({
      decision: "allow",
      overwrite: {
        Arguments: JSON.stringify({ query: "checkout", workspaceRoot: root }),
      },
    });

    // User states a rule in PreInvocation -> prompt rule note injected once.
    const promptOut = await runHook(
      {
        hookEventName: "PreInvocation",
        conversationId: "conv-stop",
        cwd: root,
        workspacePaths: [root],
        invocationNum: 1,
        lastUserInput:
          "From now on, checkout must never allow negative totals.",
      },
      { pluginData, env },
    );
    expect(
      promptOut.injectSteps?.[0]?.systemMessage.systemMessage ?? "",
    ).toContain("kb_upsert");

    // Edit an unowned source file without running kb_check or kb_upsert.
    await runHook(
      {
        hookEventName: "PostToolUse",
        conversationId: "conv-stop",
        cwd: root,
        workspacePaths: [root],
        toolCall: {
          id: "e1",
          name: "edit_file",
          args: {
            Path: path.join(root, "src", "unowned.ts"),
            Target: "version = 1",
            Replacement: "version = 2",
          },
        },
      },
      { pluginData, env },
    );

    // Stop asks to continue once with impact-check & decision-capture reminders.
    const stop1 = await runHook(
      {
        hookEventName: "Stop",
        conversationId: "conv-stop",
        cwd: root,
        workspacePaths: [root],
        terminationReason: "NO_TOOL_CALL",
        continuationActive: false,
      },
      { pluginData, env },
    );
    expect(stop1.decision).toBe("continue");
    expect(stop1.reason).toContain("src/unowned.ts");
    expect(stop1.reason).toContain("kb_check");

    // When continuationActive is true, Stop stays silent to prevent loops.
    const stop2 = await runHook(
      {
        hookEventName: "Stop",
        conversationId: "conv-stop",
        cwd: root,
        workspacePaths: [root],
        terminationReason: "NO_TOOL_CALL",
        continuationActive: true,
      },
      { pluginData, env },
    );
    expect(stop2).toEqual({});

    // User cancellation never forces continuation.
    const stopCancel = await runHook(
      {
        hookEventName: "Stop",
        conversationId: "conv-stop",
        cwd: root,
        workspacePaths: [root],
        terminationReason: "USER_CANCELED",
        continuationActive: false,
      },
      { pluginData, env },
    );
    expect(stopCancel).toEqual({});
  });

  test("appends diagnostic hook usage rows to .kb/usage.log only when KIBI_DIAGNOSTIC_MODE=1", async () => {
    const { root, pluginData } = createKibiWorkspace();
    const logPath = path.join(root, ".kb", "usage.log");

    await runHook(
      {
        hookEventName: "SessionStart",
        conversationId: "conv-diag-off",
        cwd: root,
        workspacePaths: [root],
      },
      { pluginData, env: { KIBI_TELEMETRY: "0" } },
    );
    expect(fs.existsSync(logPath)).toBe(false);

    await runHook(
      {
        hookEventName: "SessionStart",
        conversationId: "conv-diag-on",
        cwd: root,
        workspacePaths: [root],
      },
      { pluginData, env: { KIBI_TELEMETRY: "0", KIBI_DIAGNOSTIC_MODE: "1" } },
    );
    expect(fs.existsSync(logPath)).toBe(true);
    const row = JSON.parse(fs.readFileSync(logPath, "utf8").trim()) as Record<
      string,
      unknown
    >;
    expect(row.interface).toBe("hook");
    expect(row.host).toBe("antigravity");
    expect(row.session_id).toBe("conv-diag-on");
  });
});

describe("Kibi level and required evidence confirmation", () => {
  const env = { KIBI_TELEMETRY: "0" };
  function guarded() {
    const { root, pluginData } = createKibiWorkspace();
    fs.writeFileSync(
      path.join(root, "package.json"),
      `${JSON.stringify({ name: "app" })}\n`,
    );
    fs.mkdirSync(path.join(root, ".kb", "requirements"), { recursive: true });
    fs.writeFileSync(
      path.join(root, ".kb", "requirements", "REQ-floor.md"),
      "---\nid: REQ-floor\ntitle: Floor\nstatus: open\nrequired_evidence: tested\norigin:\n  kind: agent\n---\nBody.\n",
    );
    const pre = (name: string, args: Record<string, unknown>) =>
      runHook(
        {
          hookEventName: "PreToolUse",
          conversationId: "conv-guard",
          cwd: root,
          workspacePaths: [root],
          toolCall: { id: "g1", name, args },
        },
        { pluginData, env },
      );
    return { root, pre };
  }

  test("a write that changes the level is force-asked", async () => {
    const { root, pre } = guarded();
    const output = await pre("write_to_file", {
      TargetFile: path.join(root, "package.json"),
      CodeContent: JSON.stringify({ name: "app", kibi: { level: "remember" } }),
    });
    expect(output.decision).toBe("force_ask");
    expect(output.reason).toContain(
      "changes the Kibi level from test to remember",
    );
  });

  test("an edit or a kb_upsert that lowers a floor is force-asked", async () => {
    const { root, pre } = guarded();
    const edit = await pre("replace_file_content", {
      TargetFile: path.join(root, ".kb", "requirements", "REQ-floor.md"),
      TargetContent: "required_evidence: tested",
      ReplacementContent: "required_evidence: asserted",
    });
    expect(edit.decision).toBe("force_ask");
    expect(edit.reason).toContain(
      "REQ-floor must reach from tested to asserted",
    );
    const call = await pre("call_mcp_tool", {
      ServerName: "kibi",
      ToolName: "kb_upsert",
      Arguments: JSON.stringify({
        type: "req",
        id: "REQ-floor",
        properties: { required_evidence: "unverified" },
      }),
    });
    expect(call.decision).toBe("force_ask");
    expect(call.overwrite).toBeDefined();
    const raised = await pre("call_mcp_tool", {
      ServerName: "kibi",
      ToolName: "kb_upsert",
      Arguments: JSON.stringify({
        type: "req",
        id: "REQ-floor",
        properties: { required_evidence: "proved" },
      }),
    });
    expect(raised.decision).toBe("allow");

    // Shell kibi init --level remember is force-asked too.
    const shellLevel = await pre("run_command", {
      CommandLine: "kibi init --level remember",
    });
    expect(shellLevel.decision).toBe("force_ask");
    expect(shellLevel.reason).toContain(
      "changes the Kibi level from test to remember",
    );
  });
});
