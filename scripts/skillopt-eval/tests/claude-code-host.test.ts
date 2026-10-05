import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildClaudeExecArgv,
  claudeEffort,
  claudeStreamToCodexJsonl,
  claudeTargetEnv,
  claudeTargetSettings,
  mirrorSkillsForClaude,
  openClaudeSession,
  selectedSkillOptHost,
} from "../runtime/claude-code-host";
import { normalizeCodexJsonl } from "../runtime/codex-events";
import {
  finalAnswerEvidence,
  transcriptOrdering,
} from "../runtime/transcript-evidence";

// TEST-skillopt-claude-code-host

const roots: string[] = [];
const savedEnv = { ...process.env };

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
  for (const key of Object.keys(process.env)) {
    if (!(key in savedEnv)) delete process.env[key];
  }
  Object.assign(process.env, savedEnv);
});

async function temporaryRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-claude-host-"));
  roots.push(root);
  return root;
}

function stream(...events: readonly Record<string, unknown>[]): string {
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

const RESULT = {
  type: "result",
  subtype: "success",
  is_error: false,
  num_turns: 3,
  total_cost_usd: 0.25,
  structured_output: { completed: true, answer: "Applied REQ-loan-due." },
  usage: {
    input_tokens: 10,
    cache_creation_input_tokens: 20,
    cache_read_input_tokens: 70,
    output_tokens: 5,
  },
  modelUsage: { "claude-sonnet-5-5": { costUSD: 0.25 } },
};

describe("Claude Code SkillOpt host", () => {
  test("selects Codex unless Claude Code is requested explicitly", () => {
    expect(selectedSkillOptHost({})).toBe("codex");
    expect(selectedSkillOptHost({ KIBI_SKILLOPT_HOST: "claude-code" })).toBe(
      "claude-code",
    );
    expect(() => selectedSkillOptHost({ KIBI_SKILLOPT_HOST: "other" })).toThrow(
      "KIBI_SKILLOPT_HOST",
    );
    expect(claudeEffort("minimal")).toBe("low");
    expect(claudeEffort("xhigh")).toBe("xhigh");
  });

  test("converts a stream into Codex-shaped evidence the scorer reads", () => {
    // Given a Claude stream with an MCP call, a file read and structured output
    const raw = stream(
      { type: "system", subtype: "init", model: "claude-sonnet-5-5" },
      {
        type: "assistant",
        message: {
          content: [
            { type: "text", text: "Searching first." },
            {
              type: "tool_use",
              id: "t1",
              name: "mcp__kibi__kb_search",
              input: { query: "loans" },
            },
            {
              type: "tool_use",
              id: "t2",
              name: "Edit",
              input: { file_path: "/w/src/app.ts" },
            },
          ],
        },
      },
      {
        type: "user",
        message: {
          content: [
            { type: "tool_result", tool_use_id: "t1", content: "{}" },
            { type: "tool_result", tool_use_id: "t2", content: "ok" },
          ],
        },
      },
      RESULT,
    );

    // When
    const converted = claudeStreamToCodexJsonl(raw);
    const normalized = normalizeCodexJsonl(converted, {
      hiddenMarkers: [],
      forbiddenRoots: [],
    });

    // Then
    expect(normalized.malformedLines).toEqual([]);
    expect(normalized.violations).toEqual([]);
    expect(normalized.events.at(-1)?.type).toBe("turn.completed");
    expect(normalized.usage).toEqual({
      inputTokens: 100,
      cachedInputTokens: 70,
      outputTokens: 5,
    });
    expect(finalAnswerEvidence(converted).text).toBe("Applied REQ-loan-due.");
    const ordering = transcriptOrdering(converted);
    expect(ordering.firstKbSearchIndex).not.toBeNull();
    expect(ordering.firstEditIndex).toBeGreaterThan(
      ordering.firstKbSearchIndex ?? Number.POSITIVE_INFINITY,
    );
    expect(ordering.editedPaths).toEqual(["/w/src/app.ts"]);
  });

  test("flags direct KB reads and failed turns like Codex evidence", () => {
    const raw = stream(
      {
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              id: "r1",
              name: "Read",
              input: { file_path: "/w/.kb/requirements/x.md" },
            },
          ],
        },
      },
      {
        type: "user",
        message: {
          content: [{ type: "tool_result", tool_use_id: "r1", content: "x" }],
        },
      },
      { ...RESULT, subtype: "error_max_turns", is_error: true },
    );
    const converted = claudeStreamToCodexJsonl(raw);
    const normalized = normalizeCodexJsonl(converted, {
      hiddenMarkers: [],
      forbiddenRoots: [],
    });
    expect(normalized.violations).toContain("direct_kb_access");
    expect(
      normalized.events.some(({ type }) => type === "turn.completed"),
    ).toBe(false);
  });

  test("keeps agent-session variables out of the target environment", () => {
    const env = claudeTargetEnv({
      env: {
        ANTHROPIC_API_KEY: "k",
        CLAUDE_CODE_SESSION_ID: "parent",
        CODEX_HOME: "/real/codex",
        CUSTOM_AUTH: "c",
        KIBI_SKILLOPT_CLAUDE_ENV_PASSTHROUGH: "CUSTOM_AUTH",
        PATH: "/somewhere",
      },
      claudeExecutable: "/opt/claude/bin/claude",
      privateConfigDir: "/run/config",
      sandboxHome: "/run/home",
    });
    expect(env.ANTHROPIC_API_KEY).toBe("k");
    expect(env.CUSTOM_AUTH).toBe("c");
    expect(env.CLAUDE_CODE_SESSION_ID).toBeUndefined();
    expect(env.CODEX_HOME).toBeUndefined();
    expect(env.PATH).toBe("/opt/claude/bin:/usr/bin:/bin");
    expect(env.CLAUDE_CONFIG_DIR).toBe("/run/config");
    expect(env.HOME).toBe("/run/home");
    expect(env.KIBI_BRANCH).toBe("skillopt-eval");
  });

  test("denies shell, web and private roots and launches the pinned model", () => {
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
    const settings = claudeTargetSettings({ deniedRoots: ["/src/repo"] });
    const permissions = settings.permissions as { deny: string[] };
    expect(permissions.deny).toEqual(
      expect.arrayContaining([
        "Read(./.kb/**)",
        "Bash",
        "WebFetch",
        "Read(//src/repo/**)",
      ]),
    );
    const argv = buildClaudeExecArgv({
      claudeExecutable: "/bin/claude",
      role: "target",
      mcpConfigPath: "/run/mcp.json",
      settings,
      outputSchema: { type: "object" },
      tools: ["Read"],
    });
    expect(
      argv.slice(argv.indexOf("--model"), argv.indexOf("--model") + 4),
    ).toEqual(["--model", "claude-sonnet-5-5", "--effort", "low"]);
    expect(argv).toContain("--strict-mcp-config");
    expect(argv[argv.indexOf("--tools") + 1]).toBe("Read");
  });

  test("writes a refreshed file login back to the real config dir", async () => {
    const root = await temporaryRoot();
    const realConfig = join(root, "real");
    await mkdir(realConfig, { recursive: true });
    await writeFile(join(realConfig, ".credentials.json"), "old");
    const session = await openClaudeSession({
      env: { CLAUDE_CONFIG_DIR: realConfig },
      claudeExecutable: "/bin/claude",
      privateConfigDir: join(root, "private"),
      sandboxHome: join(root, "home"),
    });
    expect(
      await readFile(join(root, "private/.credentials.json"), "utf8"),
    ).toBe("old");
    expect(session.privateRoots).toEqual([realConfig]);
    await writeFile(join(root, "private/.credentials.json"), "refreshed");
    await session.finalize();
    expect(await readFile(join(realConfig, ".credentials.json"), "utf8")).toBe(
      "refreshed",
    );
  });

  test("mirrors skills without dirtying the proof snapshot", async () => {
    // Given a committed fixture repository with assembled skills
    const root = await temporaryRoot();
    await mkdir(join(root, ".agents/skills/kibi-usage"), { recursive: true });
    await writeFile(join(root, ".agents/skills/kibi-usage/SKILL.md"), "x\n");
    const git = (...args: string[]) =>
      execFileSync("git", args, { cwd: root, encoding: "utf8" });
    git("init", "-q");
    git("-c", "user.email=e@x", "-c", "user.name=e", "add", "-A");
    git("-c", "user.email=e@x", "-c", "user.name=e", "commit", "-qm", "init");

    // When the host mirrors skills twice
    await mirrorSkillsForClaude(root);
    await mirrorSkillsForClaude(root);

    // Then Claude sees the skill and git still reports a clean tree
    expect(
      await readFile(join(root, ".claude/skills/kibi-usage/SKILL.md"), "utf8"),
    ).toBe("x\n");
    expect(git("status", "--porcelain")).toBe("");
    expect(
      (await readFile(join(root, ".git/info/exclude"), "utf8"))
        .split("\n")
        .filter((line) => line === ".claude/skills/"),
    ).toHaveLength(1);
  });
});
