import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { withHeldOutExecutionLease } from "../held-out-execution-lease";
import { RuntimePrerequisiteError } from "./canary-errors";
import type { McpServerLaunch } from "./canary-runtime";
import type {
  TargetHost,
  TargetHostLaunch,
  TargetHostSession,
} from "./codex-cell-types";
import type { CodexRuntimeLease } from "./codex-runtime";
import {
  type ReasoningEffort,
  activeSkillOptModelConfig,
  assertSkillOptModelsReadyForPaidWork,
  effortForRole,
  modelForRole,
} from "./models";
import { SKILLOPT_EVALUATION_BRANCH } from "./permissions";
import type { CanaryRunner } from "./permissions";

/**
 * Claude Code CLI as an alternative SkillOpt agent host.
 *
 * Selected with `KIBI_SKILLOPT_HOST=claude-code`. The target runs
 * `claude -p` with the brokered Kibi MCP server as its only MCP server,
 * project skills copied from the assembled `.agents/skills`, a private
 * `CLAUDE_CONFIG_DIR`, no shell tool and deny rules for the private KB.
 * Its stream-json output is converted to Codex-shaped JSONL so the existing
 * evidence replay, trust-plane scan and scorer stay unchanged.
 *
 * Claude Code has no bubblewrap sandbox here: isolation is permission rules
 * plus the brokered MCP allowlist, not an OS sandbox. Reports must say so.
 */

// implements REQ-skillopt-claude-code-host
export const SKILLOPT_HOST_ENV = "KIBI_SKILLOPT_HOST" as const;
// implements REQ-skillopt-claude-code-host
export const CLAUDE_EXECUTABLE_ENV = "KIBI_SKILLOPT_CLAUDE_EXECUTABLE" as const;
// implements REQ-skillopt-claude-code-host
export const CLAUDE_ENV_PASSTHROUGH_ENV =
  "KIBI_SKILLOPT_CLAUDE_ENV_PASSTHROUGH" as const;

/** Built-in tools the target may use; deliberately no shell or web tools. */
// implements REQ-skillopt-claude-code-host
export const CLAUDE_TARGET_TOOLS = [
  "Read",
  "Grep",
  "Glob",
  "Edit",
  "Write",
  "Skill",
] as const;

const KIBI_MCP_SERVER = "kibi";

export type SkillOptHost = "codex" | "claude-code";

export class ClaudeHostConfigError extends Error {
  readonly name = "ClaudeHostConfigError";
}

// implements REQ-skillopt-claude-code-host
export function selectedSkillOptHost(
  env: NodeJS.ProcessEnv = process.env,
): SkillOptHost {
  const value = env[SKILLOPT_HOST_ENV];
  if (value === undefined || value === "" || value === "codex") return "codex";
  if (value === "claude-code") return "claude-code";
  throw new ClaudeHostConfigError(
    `${SKILLOPT_HOST_ENV} must be codex or claude-code`,
  );
}

/** Claude Code has no `minimal`; `xhigh` exists. */
// implements REQ-skillopt-claude-code-host
export function claudeEffort(
  effort: ReasoningEffort,
): "low" | "medium" | "high" | "xhigh" {
  return effort === "minimal" ? "low" : effort;
}

// implements REQ-skillopt-claude-code-host
export async function resolveClaudeExecutable(
  env: NodeJS.ProcessEnv = process.env,
): Promise<string> {
  const requested =
    env[CLAUDE_EXECUTABLE_ENV] ?? Bun.which("claude", { PATH: env.PATH ?? "" });
  if (requested === null || requested === undefined || requested === "") {
    throw new RuntimePrerequisiteError("missing_claude_executable");
  }
  try {
    return await realpath(requested);
  } catch {
    throw new RuntimePrerequisiteError("missing_claude_executable");
  }
}

const DEFAULT_PASSTHROUGH = [
  /^ANTHROPIC_/,
  /^CLAUDE_CODE_OAUTH_TOKEN$/,
  /^CLAUDE_CODE_USE_(?:BEDROCK|VERTEX|FOUNDRY)$/,
  /^(?:HTTPS?_PROXY|NO_PROXY|https?_proxy|no_proxy)$/,
  /^(?:NODE_EXTRA_CA_CERTS|SSL_CERT_FILE)$/,
  /^KIBI_SWIPL$/,
] as const;

function passthroughNames(env: NodeJS.ProcessEnv): ReadonlySet<string> {
  const extra = (env[CLAUDE_ENV_PASSTHROUGH_ENV] ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name));
  return new Set(extra);
}

/**
 * The target environment: no inherited agent-session state, a private
 * config dir and HOME, and only explicit auth/network variables.
 */
// implements REQ-skillopt-claude-code-host
export function claudeTargetEnv(
  input: Readonly<{
    env: NodeJS.ProcessEnv;
    claudeExecutable: string;
    privateConfigDir: string;
    sandboxHome: string;
  }>,
): NodeJS.ProcessEnv {
  const extra = passthroughNames(input.env);
  const result: NodeJS.ProcessEnv = {};
  for (const [name, value] of Object.entries(input.env)) {
    if (value === undefined) continue;
    if (
      extra.has(name) ||
      DEFAULT_PASSTHROUGH.some((pattern) => pattern.test(name))
    ) {
      result[name] = value;
    }
  }
  for (const name of ["LANG", "LC_ALL", "TERM", "TZ"] as const) {
    const value = input.env[name];
    if (value !== undefined) result[name] = value;
  }
  return {
    ...result,
    PATH: `${dirname(input.claudeExecutable)}:/usr/bin:/bin`,
    HOME: input.sandboxHome,
    CLAUDE_CONFIG_DIR: input.privateConfigDir,
    XDG_CONFIG_HOME: join(input.sandboxHome, "xdg-config"),
    XDG_CACHE_HOME: join(input.sandboxHome, "xdg-cache"),
    XDG_DATA_HOME: join(input.sandboxHome, "xdg-data"),
    // Load every brokered tool up front, like Codex, instead of deferring
    // them behind tool search.
    ENABLE_TOOL_SEARCH: "false",
    DISABLE_AUTOUPDATER: "1",
    KIBI_BRANCH: SKILLOPT_EVALUATION_BRANCH,
  };
}

function realClaudeConfigDir(env: NodeJS.ProcessEnv): string {
  return resolve(env.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"));
}

const CREDENTIALS_FILE = ".credentials.json";

async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return null;
    throw error;
  }
}

/**
 * Copies a file-stored Claude login into the private config dir and writes a
 * refreshed token back, so a rotated OAuth refresh token is never lost.
 * Env-token logins (`CLAUDE_CODE_OAUTH_TOKEN`, `ANTHROPIC_API_KEY`) need no
 * copy.
 */
// implements REQ-skillopt-claude-code-host
export async function openClaudeSession(
  input: Readonly<{
    env: NodeJS.ProcessEnv;
    claudeExecutable: string;
    privateConfigDir: string;
    sandboxHome: string;
  }>,
): Promise<TargetHostSession> {
  const realConfig = realClaudeConfigDir(input.env);
  await mkdir(input.privateConfigDir, { recursive: true, mode: 0o700 });
  await mkdir(input.sandboxHome, { recursive: true, mode: 0o700 });
  const realCredentials = join(realConfig, CREDENTIALS_FILE);
  const privateCredentials = join(input.privateConfigDir, CREDENTIALS_FILE);
  const original = await readOptional(realCredentials);
  if (original !== null) {
    await writeFile(privateCredentials, original, { mode: 0o600 });
  }
  return {
    env: claudeTargetEnv(input),
    privateRoots: [realConfig],
    finalize: async () => {
      if (original === null) return;
      const refreshed = await readOptional(privateCredentials);
      if (refreshed === null || refreshed === original) return;
      await writeFile(realCredentials, refreshed, { mode: 0o600 });
    },
  };
}

// implements REQ-skillopt-claude-code-host
export async function withClaudeAuthLease<T>(
  env: NodeJS.ProcessEnv,
  operation: () => Promise<T>,
): Promise<T> {
  const lockDir = join(realClaudeConfigDir(env), ".skillopt-auth-lock");
  await mkdir(lockDir, { recursive: true, mode: 0o700 });
  await chmod(lockDir, 0o700);
  return await withHeldOutExecutionLease(lockDir, operation);
}

/** Permission settings passed with `--settings`; deny wins over allow. */
// implements REQ-skillopt-claude-code-host
export function claudeTargetSettings(
  input: Readonly<{ deniedRoots: readonly string[] }>,
): Readonly<Record<string, unknown>> {
  const denyRoots = [...new Set(input.deniedRoots.map((root) => resolve(root)))]
    .sort()
    .flatMap((root) => [`Read(/${root}/**)`, `Edit(/${root}/**)`]);
  return {
    permissions: {
      allow: [...CLAUDE_TARGET_TOOLS, `mcp__${KIBI_MCP_SERVER}`],
      deny: [
        "Read(./.kb/**)",
        "Edit(./.kb/**)",
        "Read(./.runtime/**)",
        "Edit(./.runtime/**)",
        "Edit(./.agents/**)",
        "Edit(./.claude/**)",
        "Bash",
        "WebFetch",
        "WebSearch",
        ...denyRoots,
      ],
    },
    disableAllHooks: true,
  };
}

// implements REQ-skillopt-claude-code-host
export function claudeMcpConfig(
  server: Omit<McpServerLaunch, "env">,
): Readonly<Record<string, unknown>> {
  return {
    mcpServers: {
      [KIBI_MCP_SERVER]: {
        type: "stdio",
        command: resolve(server.command),
        args: server.args.map((arg) => resolve(arg)),
        env: {
          KIBI_BRANCH: SKILLOPT_EVALUATION_BRANCH,
          KIBI_SKILLOPT_PROCESS_GROUP: "python_bridge",
        },
      },
    },
  };
}

// implements REQ-skillopt-claude-code-host
export function buildClaudeExecArgv(
  input: Readonly<{
    claudeExecutable: string;
    role: "target" | "optimizer";
    mcpConfigPath?: string;
    settings: Readonly<Record<string, unknown>>;
    outputSchema: Readonly<Record<string, unknown>>;
    tools: readonly string[];
  }>,
): readonly [string, ...string[]] {
  const models = assertSkillOptModelsReadyForPaidWork();
  return [
    input.claudeExecutable,
    "-p",
    "--output-format",
    "stream-json",
    "--verbose",
    "--no-session-persistence",
    "--model",
    modelForRole(input.role, models),
    "--effort",
    claudeEffort(effortForRole(input.role, models)),
    "--setting-sources",
    "project",
    "--settings",
    JSON.stringify(input.settings),
    "--strict-mcp-config",
    ...(input.mcpConfigPath === undefined
      ? []
      : ["--mcp-config", resolve(input.mcpConfigPath)]),
    "--tools",
    input.tools.join(","),
    "--permission-mode",
    "dontAsk",
    "--json-schema",
    JSON.stringify(input.outputSchema),
  ];
}

/** Claude discovers project skills under `.claude/skills`. */
async function mirrorSkillsForClaude(workspaceRoot: string): Promise<void> {
  const target = join(workspaceRoot, ".claude/skills");
  await rm(target, { recursive: true, force: true });
  await mkdir(dirname(target), { recursive: true });
  await cp(join(workspaceRoot, ".agents/skills"), target, { recursive: true });
}

// implements REQ-skillopt-claude-code-host
export function claudeCodeTargetHost(): TargetHost {
  return {
    id: "claude-code",
    withLease: withClaudeAuthLease,
    openSession: async ({ workspace, env }) =>
      openClaudeSession({
        env,
        claudeExecutable: await resolveClaudeExecutable(env),
        privateConfigDir: workspace.codexHome,
        sandboxHome: workspace.sandboxHome,
      }),
    prepareLaunch: async ({
      options,
      workspace,
      broker,
      outputSchemaPath,
      session,
    }): Promise<TargetHostLaunch> => {
      await mirrorSkillsForClaude(workspace.target);
      const mcpConfigPath = join(workspace.codexHome, "skillopt-mcp.json");
      await writeFile(mcpConfigPath, JSON.stringify(claudeMcpConfig(broker)), {
        mode: 0o600,
      });
      const outputSchema = JSON.parse(
        await readFile(outputSchemaPath, "utf8"),
      ) as Record<string, unknown>;
      return {
        argv: buildClaudeExecArgv({
          claudeExecutable: options.codexExecutable,
          role: "target",
          mcpConfigPath,
          settings: claudeTargetSettings({
            deniedRoots: [
              options.sourceWorktree,
              workspace.privateScorer,
              workspace.privateEvidence,
              workspace.siblingRun,
              workspace.codexHome,
              ...session.privateRoots,
            ],
          }),
          outputSchema,
          tools: CLAUDE_TARGET_TOOLS,
        }),
        normalizeTranscript: claudeStreamToCodexJsonl,
      };
    },
  };
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function number(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toolResultPayload(block: JsonRecord): JsonRecord {
  const content = block.content;
  if (typeof content === "string") {
    return { content: [{ type: "text", text: content }] };
  }
  return { content: Array.isArray(content) ? content : [] };
}

function hostToolItem(
  id: string,
  name: string,
  input: JsonRecord,
  result: JsonRecord | null,
  failed: boolean,
): JsonRecord {
  const status =
    result === null ? "in_progress" : failed ? "failed" : "completed";
  const mcpPrefix = `mcp__${KIBI_MCP_SERVER}__`;
  if (name.startsWith(mcpPrefix)) {
    return {
      id,
      type: "mcp_tool_call",
      server: KIBI_MCP_SERVER,
      tool: name.slice(mcpPrefix.length),
      arguments: input,
      status,
      ...(result === null ? {} : failed ? { error: result } : { result }),
    };
  }
  if (name === "Edit" || name === "Write" || name === "NotebookEdit") {
    const path = input.file_path ?? input.notebook_path;
    return {
      id,
      type: "file_change",
      tool: name,
      changes:
        typeof path === "string" ? [{ path, kind: name.toLowerCase() }] : [],
      status,
    };
  }
  if (name === "Read" || name === "Grep" || name === "Glob") {
    const path = input.file_path ?? input.path;
    return {
      id,
      type: "file_read",
      tool: name,
      ...(typeof path === "string" ? { path } : {}),
      ...(typeof input.pattern === "string" ? { pattern: input.pattern } : {}),
      status,
    };
  }
  if (name === "Bash") {
    return {
      id,
      type: "command_execution",
      command: typeof input.command === "string" ? input.command : "",
      status,
    };
  }
  if (name === "WebFetch" || name === "WebSearch") {
    return { id, type: "web_search", tool: name, arguments: input, status };
  }
  return { id, type: "host_tool_call", name, arguments: input, status };
}

/**
 * Converts Claude Code `stream-json` output into Codex-shaped JSONL events:
 * `item.completed` agent messages and tool items, then `turn.completed` with
 * Codex-style usage (input includes cached input). Structured output becomes
 * the final agent message. Unparseable lines pass through unchanged so the
 * normalizer still reports them as malformed.
 */
// implements REQ-skillopt-claude-code-host
export function claudeStreamToCodexJsonl(stdout: string): string {
  const lines: string[] = [];
  const emit = (event: JsonRecord) => lines.push(JSON.stringify(event));
  const pending = new Map<
    string,
    Readonly<{ name: string; input: JsonRecord }>
  >();
  let messageIndex = 0;
  let sawResult = false;
  for (const line of stdout.split("\n")) {
    if (line.trim() === "") continue;
    let event: unknown;
    try {
      event = JSON.parse(line);
    } catch {
      lines.push(line);
      continue;
    }
    if (!isRecord(event)) {
      lines.push(line);
      continue;
    }
    if (event.type === "system" && event.subtype === "init") {
      emit({
        type: "thread.started",
        host: "claude-code",
        model: event.model,
        tools: event.tools,
        mcp_servers: event.mcp_servers,
        skills: event.skills,
      });
      continue;
    }
    if (event.type === "assistant" && isRecord(event.message)) {
      const content = Array.isArray(event.message.content)
        ? event.message.content
        : [];
      for (const block of content) {
        if (!isRecord(block)) continue;
        if (block.type === "text" && typeof block.text === "string") {
          emit({
            type: "item.completed",
            item: {
              id: `msg_${messageIndex++}`,
              type: "agent_message",
              text: block.text,
            },
          });
        } else if (
          block.type === "tool_use" &&
          typeof block.id === "string" &&
          typeof block.name === "string" &&
          block.name !== "StructuredOutput"
        ) {
          const input = isRecord(block.input) ? block.input : {};
          pending.set(block.id, { name: block.name, input });
          emit({
            type: "item.started",
            item: hostToolItem(block.id, block.name, input, null, false),
          });
        }
      }
      continue;
    }
    if (event.type === "user" && isRecord(event.message)) {
      const content = Array.isArray(event.message.content)
        ? event.message.content
        : [];
      for (const block of content) {
        if (!isRecord(block) || block.type !== "tool_result") continue;
        const id = block.tool_use_id;
        if (typeof id !== "string") continue;
        const call = pending.get(id);
        if (call === undefined) continue;
        pending.delete(id);
        emit({
          type: "item.completed",
          item: hostToolItem(
            id,
            call.name,
            call.input,
            toolResultPayload(block),
            block.is_error === true,
          ),
        });
      }
      continue;
    }
    if (event.type === "result") {
      sawResult = true;
      if (isRecord(event.structured_output)) {
        emit({
          type: "item.completed",
          item: {
            id: `msg_${messageIndex++}`,
            type: "agent_message",
            text: JSON.stringify(event.structured_output),
          },
        });
      }
      const usage = isRecord(event.usage) ? event.usage : {};
      const cached = number(usage.cache_read_input_tokens);
      const codexUsage = {
        input_tokens:
          number(usage.input_tokens) +
          number(usage.cache_creation_input_tokens) +
          cached,
        cached_input_tokens: cached,
        output_tokens: number(usage.output_tokens),
      };
      const hostAccounting = {
        host: "claude-code",
        subtype: event.subtype,
        num_turns: event.num_turns,
        duration_ms: event.duration_ms,
        host_reported_cost_usd: event.total_cost_usd,
        model_usage: event.modelUsage,
      };
      if (event.subtype === "success" && event.is_error !== true) {
        emit({ type: "turn.completed", usage: codexUsage, ...hostAccounting });
      } else {
        emit({
          type: "turn.failed",
          usage: codexUsage,
          error: { message: String(event.subtype ?? "error") },
          ...hostAccounting,
        });
      }
    }
  }
  if (!sawResult) {
    for (const [id, call] of pending) {
      emit({
        type: "item.updated",
        item: hostToolItem(id, call.name, call.input, null, false),
      });
    }
  }
  return lines.length === 0 ? "" : `${lines.join("\n")}\n`;
}

/** Host-reported USD total from a converted transcript (0 when absent). */
// implements REQ-skillopt-claude-code-host
export function claudeReportedCostUsd(normalizedTranscript: string): number {
  let total = 0;
  for (const line of normalizedTranscript.split("\n")) {
    if (line.trim() === "") continue;
    try {
      const event: unknown = JSON.parse(line);
      if (
        isRecord(event) &&
        (event.type === "turn.completed" || event.type === "turn.failed")
      ) {
        total += number(event.host_reported_cost_usd);
      }
    } catch {
      // Not JSON.
    }
  }
  return total;
}

/** Runtime lease: the resolved `claude` binary; no bubblewrap is staged. */
// implements REQ-skillopt-claude-code-host
export async function createClaudeRuntimeLease(
  options: Readonly<{ artifactRoot: string }>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<CodexRuntimeLease> {
  const parent = resolve(options.artifactRoot, ".runtime");
  await mkdir(parent, { recursive: true, mode: 0o700 });
  const root = await mkdtemp(join(parent, "claude-runtime-"));
  await chmod(root, 0o700);
  const claudeExecutable = await resolveClaudeExecutable(env);
  return {
    root,
    codexExecutable: claudeExecutable,
    bwrapExecutable: "unavailable:claude-code-permission-rules",
    codeModeHostExecutable: "unavailable:claude-code",
    cleanup: async () => {
      await rm(root, { recursive: true, force: true });
    },
  };
}

const CANARY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["completed", "answer"],
  properties: {
    completed: { type: "boolean" },
    answer: { type: "string" },
  },
} as const;

export type ClaudeCanaryRun = Readonly<{
  role: "target" | "optimizer";
  model: string;
  passed: boolean;
  reportedCostUsd: number;
  events: readonly Readonly<Record<string, unknown>>[];
  reason?: string;
}>;

/**
 * One tool-less structured-output call per role proves the pinned model is
 * reachable with the operator's login before any target cell is paid for.
 */
// implements REQ-skillopt-claude-code-host
export async function runClaudeModelCanary(
  input: Readonly<{
    role: "target" | "optimizer";
    env: NodeJS.ProcessEnv;
    scratchRoot: string;
    run: CanaryRunner;
  }>,
): Promise<ClaudeCanaryRun> {
  const models = activeSkillOptModelConfig();
  const claudeExecutable = await resolveClaudeExecutable(input.env);
  const root = await mkdtemp(
    join(input.scratchRoot, `claude-canary-${input.role}-`),
  );
  try {
    const workspace = join(root, "workspace");
    await mkdir(workspace, { recursive: true, mode: 0o700 });
    const session = await openClaudeSession({
      env: input.env,
      claudeExecutable,
      privateConfigDir: join(root, "config"),
      sandboxHome: join(root, "home"),
    });
    try {
      const argv = buildClaudeExecArgv({
        claudeExecutable,
        role: input.role,
        settings: claudeTargetSettings({ deniedRoots: [] }),
        outputSchema: CANARY_SCHEMA,
        tools: [],
      });
      const result = await input.run(
        argv,
        workspace,
        session.env,
        120_000,
        'Return completed=true and answer="canary". Do nothing else.',
      );
      const normalized = claudeStreamToCodexJsonl(result.stdout);
      const events = normalized
        .split("\n")
        .filter((line) => line.trim() !== "")
        .map((line) => {
          try {
            const parsed: unknown = JSON.parse(line);
            return isRecord(parsed) ? parsed : { type: "malformed" };
          } catch {
            return { type: "malformed" };
          }
        });
      const finalMessage = events
        .filter(
          (event) =>
            event.type === "item.completed" &&
            isRecord(event.item) &&
            event.item.type === "agent_message",
        )
        .at(-1);
      let answered = false;
      if (finalMessage !== undefined && isRecord(finalMessage.item)) {
        try {
          const parsed: unknown = JSON.parse(String(finalMessage.item.text));
          answered = isRecord(parsed) && parsed.completed === true;
        } catch {
          answered = false;
        }
      }
      const turn = events.find((event) => event.type === "turn.completed");
      const modelUsage =
        turn !== undefined && isRecord(turn.model_usage)
          ? turn.model_usage
          : {};
      const model = modelForRole(input.role, models);
      const usedModel = Object.keys(modelUsage).includes(model);
      const passed = result.exitCode === 0 && answered && usedModel;
      return {
        role: input.role,
        model,
        passed,
        reportedCostUsd: claudeReportedCostUsd(normalized),
        events,
        ...(passed
          ? {}
          : {
              reason:
                result.exitCode !== 0
                  ? `claude_exit_${result.exitCode}`
                  : !usedModel
                    ? "model_not_observed"
                    : "missing_structured_answer",
            }),
      };
    } finally {
      await session.finalize();
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
