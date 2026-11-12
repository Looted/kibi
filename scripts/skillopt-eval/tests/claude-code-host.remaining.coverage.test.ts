import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import {
  CLAUDE_TARGET_TOOLS,
  claudeCodeTargetHost,
  claudeMcpConfig,
  claudeReportedCostUsd,
  claudeStreamToCodexJsonl,
  createClaudeRuntimeLease,
  openClaudeSession,
  resolveClaudeExecutable,
  runClaudeModelCanary,
  withClaudeAuthLease,
} from "../runtime/claude-code-host";
import type { CodexCellOptions } from "../runtime/codex-cell-types";
import type { IsolationWorkspace } from "../runtime/isolation-workspace";
import type { StagedBrokerLaunch } from "../runtime/mcp-broker-stage";
import type { CanaryRunner } from "../runtime/permissions";

const roots: string[] = [];
const savedEnv = { ...process.env };

beforeEach(() => {
  process.env.KIBI_SKILLOPT_TARGET_MODEL = "claude-sonnet-5-5";
  process.env.KIBI_SKILLOPT_TARGET_EFFORT = "minimal";
  process.env.KIBI_SKILLOPT_OPTIMIZER_MODEL = "claude-opus-5-5";
  process.env.KIBI_SKILLOPT_MODEL_PRICING = JSON.stringify({
    "claude-sonnet-5-5": null,
    "claude-opus-5-5": {
      inputPerMillionTokens: 4,
      cachedInputPerMillionTokens: 0.2,
      outputPerMillionTokens: 20,
    },
  });
});

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await chmod(root, 0o700).catch(() => undefined);
    await rm(root, { recursive: true, force: true });
  }
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});

async function temporaryRoot(): Promise<string> {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "skillopt-claude-host-rest-")),
  );
  roots.push(root);
  return root;
}

async function fakeClaude(root: string): Promise<string> {
  const bin = join(root, "bin");
  await mkdir(bin, { recursive: true });
  const claude = join(bin, "claude");
  await writeFile(claude, "#!/bin/sh\nexit 0\n");
  await chmod(claude, 0o755);
  return claude;
}

function stream(...events: readonly unknown[]): string {
  return `${events
    .map((event) => (typeof event === "string" ? event : JSON.stringify(event)))
    .join("\n")}\n`;
}

function parsed(jsonl: string): unknown[] {
  return jsonl
    .split("\n")
    .filter((line) => line !== "")
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return line;
      }
    });
}

describe("resolving the claude executable", () => {
  test("uses the configured path, then PATH, and resolves symlinks", async () => {
    const root = await temporaryRoot();
    const claude = await fakeClaude(root);
    expect(
      await resolveClaudeExecutable({
        KIBI_SKILLOPT_CLAUDE_EXECUTABLE: claude,
      }),
    ).toBe(claude);
    expect(await resolveClaudeExecutable({ PATH: join(root, "bin") })).toBe(
      claude,
    );
  });

  test("a missing, empty or dangling executable is a prerequisite error", async () => {
    const root = await temporaryRoot();
    for (const env of [
      { PATH: root },
      {},
      { KIBI_SKILLOPT_CLAUDE_EXECUTABLE: "" },
      { KIBI_SKILLOPT_CLAUDE_EXECUTABLE: join(root, "absent") },
    ]) {
      await expect(resolveClaudeExecutable(env)).rejects.toThrow(
        "missing_isolation:claude_executable",
      );
    }
  });
});

describe("Claude sessions and leases", () => {
  test("an unreadable credentials file is not mistaken for no login", async () => {
    const root = await temporaryRoot();
    await mkdir(join(root, "real", ".credentials.json"), { recursive: true });
    await expect(
      openClaudeSession({
        env: { CLAUDE_CONFIG_DIR: join(root, "real") },
        claudeExecutable: "/bin/claude",
        privateConfigDir: join(root, "private"),
        sandboxHome: join(root, "home"),
      }),
    ).rejects.toThrow();
  });

  test("the auth lease runs the operation under a private lock directory", async () => {
    const root = await temporaryRoot();
    const result = await withClaudeAuthLease(
      { CLAUDE_CONFIG_DIR: root },
      async () => {
        expect(existsSync(join(root, ".skillopt-auth-lock"))).toBe(true);
        return 42;
      },
    );
    expect(result).toBe(42);
  });

  test("the runtime lease resolves claude and cleans up its root", async () => {
    const root = await temporaryRoot();
    const claude = await fakeClaude(root);
    const lease = await createClaudeRuntimeLease(
      { artifactRoot: join(root, "artifacts") },
      { KIBI_SKILLOPT_CLAUDE_EXECUTABLE: claude },
    );
    expect(lease.codexExecutable).toBe(claude);
    expect(lease.bwrapExecutable).toBe(
      "unavailable:claude-code-permission-rules",
    );
    expect(lease.codeModeHostExecutable).toBe("unavailable:claude-code");
    expect(lease.root.startsWith(join(root, "artifacts", ".runtime"))).toBe(
      true,
    );
    await lease.cleanup();
    expect(existsSync(lease.root)).toBe(false);
  });

  test("the MCP config launches only the brokered Kibi server", () => {
    expect(
      claudeMcpConfig({ command: "bin/python", args: ["bridge.py"], cwd: "/" }),
    ).toStrictEqual({
      mcpServers: {
        kibi: {
          type: "stdio",
          command: join(process.cwd(), "bin/python"),
          args: [join(process.cwd(), "bridge.py")],
          env: {
            KIBI_BRANCH: expect.any(String),
            KIBI_SKILLOPT_PROCESS_GROUP: "python_bridge",
          },
        },
      },
    });
  });
});

describe("the Claude Code target host", () => {
  async function workspaceFor(root: string): Promise<IsolationWorkspace> {
    const target = join(root, "target");
    await mkdir(join(target, ".agents/skills/kibi-usage"), { recursive: true });
    await writeFile(
      join(target, ".agents/skills/kibi-usage/SKILL.md"),
      "Use Kibi.\n",
    );
    await mkdir(join(target, ".git/info"), { recursive: true });
    await writeFile(join(target, ".git/info/exclude"), "# local\n.runtime/");
    await mkdir(join(root, "codex-home"), { recursive: true });
    return {
      target,
      codexHome: join(root, "codex-home"),
      sandboxHome: join(root, "sandbox-home"),
      privateScorer: join(root, "scorer"),
      privateEvidence: join(root, "evidence"),
      siblingRun: join(root, "sibling"),
    } as unknown as IsolationWorkspace;
  }

  test("opens a session with the resolved claude and a private config", async () => {
    const root = await temporaryRoot();
    const claude = await fakeClaude(root);
    const workspace = await workspaceFor(root);
    const host = claudeCodeTargetHost();
    expect(host.id).toBe("claude-code");
    const session = await host.openSession({
      workspace,
      env: {
        KIBI_SKILLOPT_CLAUDE_EXECUTABLE: claude,
        CLAUDE_CONFIG_DIR: join(root, "real-config"),
      },
    });
    expect(session.env.CLAUDE_CONFIG_DIR).toBe(join(root, "codex-home"));
    expect(session.env.PATH).toBe(`${join(root, "bin")}:/usr/bin:/bin`);
    expect(session.privateRoots).toStrictEqual([join(root, "real-config")]);
    expect(
      await host.withLease({ CLAUDE_CONFIG_DIR: root }, async () => "leased"),
    ).toBe("leased");
  });

  test("prepares a launch that mirrors skills and denies private roots", async () => {
    const root = await temporaryRoot();
    const workspace = await workspaceFor(root);
    const schemaPath = join(root, "schema.json");
    await writeFile(schemaPath, JSON.stringify({ type: "object" }));
    const artifactRoot = join(root, "artifacts");
    const launch = await claudeCodeTargetHost().prepareLaunch({
      options: {
        codexExecutable: "/opt/claude",
        sourceWorktree: join(root, "source"),
        artifactRoot,
        targetSkill: "kibi-usage",
      } as unknown as CodexCellOptions,
      workspace,
      broker: {
        command: "/usr/bin/python3",
        args: ["/srv/bridge.py"],
      } as unknown as StagedBrokerLaunch,
      outputSchemaPath: schemaPath,
      session: {
        env: {},
        privateRoots: [join(root, "real-config")],
        finalize: async () => undefined,
      },
    });
    const argv = launch.argv;
    expect(argv[0]).toBe("/opt/claude");
    expect(argv[argv.indexOf("--tools") + 1]).toBe(
      CLAUDE_TARGET_TOOLS.join(","),
    );
    expect(argv[argv.indexOf("--mcp-config") + 1]).toBe(
      join(root, "codex-home", "skillopt-mcp.json"),
    );
    expect(argv[argv.indexOf("--json-schema") + 1]).toBe('{"type":"object"}');
    expect(argv[argv.indexOf("--append-system-prompt") + 1]).toBe(
      "The kibi-usage skill applies to this task. Follow it.\n\nUse Kibi.\n",
    );
    const settings = JSON.parse(argv[argv.indexOf("--settings") + 1] ?? "");
    for (const denied of [
      join(root, "source"),
      join(root, "scorer"),
      join(root, "real-config"),
      artifactRoot,
      homedir(),
    ]) {
      expect(settings.permissions.deny).toContain(`Read(/${denied}/**)`);
    }
    expect(
      JSON.parse(
        await readFile(join(root, "codex-home", "skillopt-mcp.json"), "utf8"),
      ).mcpServers.kibi.command,
    ).toBe("/usr/bin/python3");
    expect(
      await readFile(join(workspace.target, ".git/info/exclude"), "utf8"),
    ).toBe("# local\n.runtime/\n.claude/skills/\n");
    expect(launch.normalizeTranscript).toBe(claudeStreamToCodexJsonl);
  });

  test("an artifact root that holds the workspace is not denied", async () => {
    const root = await temporaryRoot();
    const workspace = await workspaceFor(root);
    await writeFile(join(workspace.target, ".git/info/exclude"), "");
    const schemaPath = join(root, "schema.json");
    await writeFile(schemaPath, "{}");
    const launch = await claudeCodeTargetHost().prepareLaunch({
      options: {
        codexExecutable: "/opt/claude",
        sourceWorktree: join(root, "source"),
        artifactRoot: root,
        targetSkill: "kibi-usage",
      } as unknown as CodexCellOptions,
      workspace,
      broker: { command: "/py", args: [] } as unknown as StagedBrokerLaunch,
      outputSchemaPath: schemaPath,
      session: { env: {}, privateRoots: [], finalize: async () => undefined },
    });
    const settings = JSON.parse(
      launch.argv[launch.argv.indexOf("--settings") + 1] ?? "",
    );
    expect(settings.permissions.deny).not.toContain(`Read(/${root}/**)`);
    expect(
      await readFile(join(workspace.target, ".git/info/exclude"), "utf8"),
    ).toBe(".claude/skills/\n");
  });
});

describe("converting Claude stream-json", () => {
  test("maps init, thinking, text and every built-in tool kind", () => {
    const tools: Array<[string, Record<string, unknown>]> = [
      ["Edit", { file_path: "a.ts" }],
      ["NotebookEdit", { notebook_path: "n.ipynb" }],
      ["Write", {}],
      ["Read", { file_path: "r.ts" }],
      ["Grep", { pattern: "x", path: "src" }],
      ["Glob", {}],
      ["Bash", { command: "ls" }],
      ["Bash", {}],
      ["WebFetch", { url: "https://example.test" }],
      ["TodoWrite", { todos: [] }],
    ];
    const raw = stream(
      { type: "system", subtype: "init", model: "m", tools: ["Read"] },
      { type: "system", subtype: "other" },
      {
        type: "assistant",
        message: {
          content: [
            { type: "thinking", thinking: "plan" },
            { type: "thinking", thinking: "" },
            "not a block",
            { type: "text", text: "hello" },
            { type: "tool_use", id: "s", name: "StructuredOutput", input: {} },
            ...tools.map(([name, input], index) => ({
              type: "tool_use",
              id: `t${index}`,
              name,
              input,
            })),
            { type: "tool_use", id: "bare", name: "Read", input: "x" },
          ],
        },
      },
      { type: "assistant", message: { content: "no blocks" } },
      {
        type: "user",
        message: {
          content: [
            "not a block",
            { type: "text", text: "ignored" },
            { type: "tool_result", tool_use_id: 7 },
            { type: "tool_result", tool_use_id: "unknown" },
            ...tools.map((_, index) => ({
              type: "tool_result",
              tool_use_id: `t${index}`,
              content:
                index === 0
                  ? "edited"
                  : index === 1
                    ? [{ type: "text", text: "a" }, { type: "image" }]
                    : index === 2
                      ? { not: "a list" }
                      : [{ type: "text", text: `out${index}` }],
              is_error: index === 6,
            })),
            { type: "tool_result", tool_use_id: "bare", content: "read" },
          ],
        },
      },
      { type: "user", message: { content: "no blocks" } },
      { type: "other" },
      {
        type: "result",
        subtype: "success",
        is_error: false,
        total_cost_usd: 0.5,
        usage: "missing",
      },
    );
    const events = parsed(claudeStreamToCodexJsonl(raw)) as Array<
      Record<string, unknown>
    >;
    expect(events[0]).toStrictEqual({
      type: "thread.started",
      host: "claude-code",
      model: "m",
      tools: ["Read"],
    });
    expect(events[1]).toStrictEqual({
      type: "item.completed",
      item: { id: "reasoning_0", type: "reasoning", text: "plan" },
    });
    expect(events[2]).toStrictEqual({
      type: "item.completed",
      item: { id: "msg_1", type: "agent_message", text: "hello" },
    });
    const started = events
      .filter((event) => event.type === "item.started")
      .map((event) => event.item);
    expect(started).toStrictEqual([
      {
        id: "t0",
        type: "file_change",
        tool: "Edit",
        changes: [{ path: "a.ts", kind: "edit" }],
        status: "in_progress",
      },
      {
        id: "t1",
        type: "file_change",
        tool: "NotebookEdit",
        changes: [{ path: "n.ipynb", kind: "notebookedit" }],
        status: "in_progress",
      },
      {
        id: "t2",
        type: "file_change",
        tool: "Write",
        changes: [],
        status: "in_progress",
      },
      {
        id: "t3",
        type: "file_read",
        tool: "Read",
        path: "r.ts",
        status: "in_progress",
      },
      {
        id: "t4",
        type: "file_read",
        tool: "Grep",
        path: "src",
        pattern: "x",
        status: "in_progress",
      },
      { id: "t5", type: "file_read", tool: "Glob", status: "in_progress" },
      {
        id: "t6",
        type: "command_execution",
        command: "ls",
        status: "in_progress",
      },
      {
        id: "t7",
        type: "command_execution",
        command: "",
        status: "in_progress",
      },
      {
        id: "t8",
        type: "web_search",
        tool: "WebFetch",
        arguments: { url: "https://example.test" },
        status: "in_progress",
      },
      {
        id: "t9",
        type: "host_tool_call",
        name: "TodoWrite",
        arguments: { todos: [] },
        status: "in_progress",
      },
      { id: "bare", type: "file_read", tool: "Read", status: "in_progress" },
    ]);
    const completed = events
      .filter(
        (event) =>
          event.type === "item.completed" &&
          (event.item as { id: string }).id.startsWith("t"),
      )
      .map((event) => event.item as Record<string, unknown>);
    expect(completed.map((item) => item.aggregated_output)).toStrictEqual([
      "edited",
      'a\n{"type":"image"}',
      "",
      "out3",
      "out4",
      "out5",
      "out6",
      "out7",
      "out8",
      "out9",
    ]);
    expect(completed[6]?.status).toBe("failed");
    expect(events.at(-1)).toStrictEqual({
      type: "turn.completed",
      usage: { input_tokens: 0, cached_input_tokens: 0, output_tokens: 0 },
      host: "claude-code",
      subtype: "success",
      host_reported_cost_usd: 0.5,
    });
  });

  test("maps MCP calls, failures, malformed lines and unfinished calls", () => {
    const raw = stream(
      "not json",
      "[1, 2]",
      {
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              id: "m1",
              name: "mcp__kibi__kb_query",
              input: { type: "req" },
            },
            { type: "tool_use", id: "m2", name: "mcp__kibi__kb_check" },
            { type: "tool_use", id: "m3", name: "Read", input: { path: "x" } },
          ],
        },
      },
      {
        type: "user",
        message: {
          content: [
            { type: "tool_result", tool_use_id: "m1", content: "rows" },
            {
              type: "tool_result",
              tool_use_id: "m2",
              content: "denied",
              is_error: true,
            },
          ],
        },
      },
    );
    const events = parsed(claudeStreamToCodexJsonl(raw));
    expect(events.slice(0, 2)).toStrictEqual(["not json", [1, 2]]);
    expect(events.slice(5)).toStrictEqual([
      {
        type: "item.completed",
        item: {
          id: "m1",
          type: "mcp_tool_call",
          server: "kibi",
          tool: "kb_query",
          arguments: { type: "req" },
          status: "completed",
          result: { content: [{ type: "text", text: "rows" }] },
        },
      },
      {
        type: "item.completed",
        item: {
          id: "m2",
          type: "mcp_tool_call",
          server: "kibi",
          tool: "kb_check",
          arguments: {},
          status: "failed",
          error: { content: [{ type: "text", text: "denied" }] },
        },
      },
      {
        type: "item.updated",
        item: {
          id: "m3",
          type: "file_read",
          tool: "Read",
          path: "x",
          status: "in_progress",
        },
      },
    ]);
    expect(claudeStreamToCodexJsonl("\n\n")).toBe("");
  });

  test("a failed result is a failed turn and its cost is summed", () => {
    const normalized = claudeStreamToCodexJsonl(
      stream(
        {
          type: "result",
          subtype: "error_max_turns",
          is_error: true,
          total_cost_usd: 0.75,
          usage: { input_tokens: 1, output_tokens: 2 },
        },
        { type: "result", is_error: true, total_cost_usd: "x" },
        { type: "result", subtype: "success", is_error: true },
      ),
    );
    const events = parsed(normalized) as Array<Record<string, unknown>>;
    expect(events.map((event) => event.type)).toStrictEqual([
      "turn.failed",
      "turn.failed",
      "turn.failed",
    ]);
    expect(events[0]?.error).toStrictEqual({ message: "error_max_turns" });
    expect(events[1]?.error).toStrictEqual({ message: "error" });
    expect(events[2]?.error).toStrictEqual({ message: "success" });
    expect(
      claudeReportedCostUsd(
        `${normalized}\nnot json\n\n${JSON.stringify({ type: "item.completed", host_reported_cost_usd: 9 })}\n`,
      ),
    ).toBe(0.75);
  });
});

describe("the Claude model canary", () => {
  async function canary(
    stdout: string,
    exitCode = 0,
    role: "target" | "optimizer" = "target",
  ) {
    const root = await temporaryRoot();
    const claude = await fakeClaude(root);
    const calls: Array<Parameters<CanaryRunner>> = [];
    const run: CanaryRunner = async (...args) => {
      calls.push(args);
      return { exitCode, stdout, stderr: "" } as Awaited<
        ReturnType<CanaryRunner>
      >;
    };
    const scratchRoot = join(root, "scratch");
    await mkdir(scratchRoot);
    const result = await runClaudeModelCanary({
      role,
      env: {
        KIBI_SKILLOPT_CLAUDE_EXECUTABLE: claude,
        CLAUDE_CONFIG_DIR: join(root, "real-config"),
      },
      scratchRoot,
      run,
    });
    return { result, calls, scratchRoot };
  }

  function answer(model: string, structured: unknown = { completed: true }) {
    return stream(
      {
        type: "assistant",
        message: { content: [{ type: "text", text: "ok" }] },
      },
      {
        type: "result",
        subtype: "success",
        is_error: false,
        total_cost_usd: 0.01,
        structured_output: structured,
        modelUsage: { [model]: {} },
      },
    );
  }

  test("passes when the pinned model returns the structured answer", async () => {
    const { result, calls, scratchRoot } = await canary(
      answer("claude-sonnet-5-5"),
    );
    expect(result).toMatchObject({
      role: "target",
      model: "claude-sonnet-5-5",
      passed: true,
      reportedCostUsd: 0.01,
    });
    expect(result.reason).toBeUndefined();
    const [argv, , , timeout, stdin] = calls[0] ?? [];
    expect(argv?.[argv.indexOf("--tools") + 1]).toBe("");
    expect(timeout).toBe(120_000);
    expect(stdin).toBe(
      'Return completed=true and answer="canary". Do nothing else.',
    );
    expect(
      existsSync(scratchRoot) && (await readdirNames(scratchRoot)),
    ).toStrictEqual([]);
  });

  test("names why a canary failed", async () => {
    expect((await canary(answer("claude-sonnet-5-5"), 3)).result.reason).toBe(
      "claude_exit_3",
    );
    expect(
      (await canary(answer("claude-sonnet-5-5"), 0, "optimizer")).result.reason,
    ).toBe("model_not_observed");
    expect(
      (await canary(answer("claude-sonnet-5-5", { completed: false }))).result
        .reason,
    ).toBe("missing_structured_answer");
    expect(
      (await canary(stream({ type: "result", subtype: "success" }))).result
        .reason,
    ).toBe("model_not_observed");
    const notJson = stream(
      {
        type: "assistant",
        message: { content: [{ type: "text", text: "plain words" }] },
      },
      {
        type: "result",
        subtype: "success",
        modelUsage: { "claude-sonnet-5-5": {} },
      },
      "garbage",
      "7",
    );
    const failed = await canary(notJson);
    expect(failed.result.reason).toBe("missing_structured_answer");
    expect(failed.result.events.slice(-2)).toStrictEqual([
      { type: "malformed" },
      { type: "malformed" },
    ]);
  });
});

async function readdirNames(directory: string): Promise<string[]> {
  const { readdir } = await import("node:fs/promises");
  return readdir(directory);
}
