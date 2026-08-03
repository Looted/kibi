import { resolve } from "node:path";
import type { McpServerLaunch } from "./canary-runtime";
import type { AuthMode } from "./codex-auth";
import type { ProcessResult } from "./process";

export const TARGET_MODEL = "gpt-5.4-mini" as const;
export const OPTIMIZER_MODEL = "gpt-5.6-sol" as const;
export const TARGET_REASONING_EFFORT = "low" as const;
export const OPTIMIZER_REASONING_EFFORT = "xhigh" as const;
export const SKILLOPT_EVALUATION_BRANCH = "skillopt-eval" as const;
export const MCP_STARTUP_TIMEOUT_SECONDS = 15 as const;
export const MCP_TOOL_TIMEOUT_SECONDS = 120 as const;
export type CanaryRole = "optimizer" | "target";
export type CanaryModel = typeof TARGET_MODEL | typeof OPTIMIZER_MODEL;

export type CapabilityCanaryModelRun = Readonly<{
  role: CanaryRole;
  model: CanaryModel;
  events: readonly Readonly<Record<string, unknown>>[];
}>;

export type CapabilityCanaryReceipt = Readonly<{
  verdict: "pass" | "no-go";
  runId: string;
  targetModel: typeof TARGET_MODEL;
  optimizerModel: typeof OPTIMIZER_MODEL;
  authMode: "file" | "keyring" | null;
  paidModelCalls: 0 | 1 | 2;
  modelRuns: readonly CapabilityCanaryModelRun[];
  events: readonly Readonly<Record<string, unknown>>[];
  reason?: string;
}>;

export type CapabilityCanaryOptions = Readonly<{
  runId: string;
  sourceWorktree?: string;
  artifactRoot?: string;
  env?: NodeJS.ProcessEnv;
}>;

export type CanaryRunner = (
  argv: readonly [string, ...string[]],
  cwd: string,
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
  stdin?: string,
) => Promise<ProcessResult>;

export type PermissionPaths = Readonly<{
  workspace: string;
  runPrivateHome: string;
  realCodexHome: string;
  sourceWorktree: string;
  fixtureKb: string;
  privateScorer: string;
  privateEvidence: string;
  siblingRuns: string;
}>;

export type CodexConfigOptions = Readonly<{
  role: "optimizer" | "target";
  authMode: AuthMode;
  paths: PermissionPaths;
  bwrapExecutable: string;
  codexExecutable: string;
  mcpServer: Omit<McpServerLaunch, "env">;
}>;

function tomlString(value: string): string {
  return JSON.stringify(resolve(value));
}

// implements REQ-skillopt-codex-optimization
export function buildCodexConfig(options: CodexConfigOptions): string {
  const model = options.role === "target" ? TARGET_MODEL : OPTIMIZER_MODEL;
  const reasoningEffort =
    options.role === "target"
      ? TARGET_REASONING_EFFORT
      : OPTIMIZER_REASONING_EFFORT;
  const deniedRoots = new Set([options.paths.fixtureKb]);
  // Target cells are noninteractive and can only reach the evaluator-owned,
  // allowlisted Kibi broker inside their disposable workspace. Approve that
  // broker explicitly so intended KB mutations are not cancelled as prompts.
  const mcpApprovalMode = options.role === "target" ? "approve" : "auto";
  return [
    `model = ${JSON.stringify(model)}`,
    `model_reasoning_effort = ${JSON.stringify(reasoningEffort)}`,
    'model_provider = "openai"',
    'approval_policy = "never"',
    `cli_auth_credentials_store = ${JSON.stringify(options.authMode)}`,
    'default_permissions = "skillopt-isolated"',
    "allow_login_shell = false",
    "check_for_update_on_startup = false",
    'web_search = "disabled"',
    "project_doc_max_bytes = 0",
    "",
    "[features]",
    "apps = false",
    "browser_use = false",
    "computer_use = false",
    "goals = false",
    "hooks = false",
    "memories = false",
    "multi_agent = false",
    "plugins = false",
    "",
    "[shell_environment_policy]",
    'inherit = "none"',
    'include_only = ["HOME", "KIBI_BRANCH", "LANG", "LC_ALL", "PATH", "TERM", "TZ"]',
    "",
    "[permissions.skillopt-isolated.workspace_roots]",
    `${tomlString(options.paths.workspace)} = true`,
    "",
    "[permissions.skillopt-isolated.filesystem]",
    '":root" = "deny"',
    '":minimal" = "read"',
    `${tomlString(options.bwrapExecutable)} = "read"`,
    `${tomlString(options.codexExecutable)} = "read"`,
    ...[...deniedRoots].map((path) => `${tomlString(path)} = "deny"`),
    '":tmpdir" = "deny"',
    '":slash_tmp" = "deny"',
    "",
    '[permissions.skillopt-isolated.filesystem.":workspace_roots"]',
    '"." = "write"',
    '".runtime" = "read"',
    '".kb" = "deny"',
    "",
    "[permissions.skillopt-isolated.network]",
    "enabled = false",
    "allow_upstream_proxy = false",
    "allow_local_binding = false",
    "enable_socks5 = false",
    "enable_socks5_udp = false",
    "",
    "[mcp_servers.kibi]",
    `command = ${tomlString(options.mcpServer.command)}`,
    `args = [${options.mcpServer.args.map(tomlString).join(", ")}]`,
    `cwd = ${tomlString(options.mcpServer.cwd)}`,
    "enabled = true",
    "required = true",
    `startup_timeout_sec = ${MCP_STARTUP_TIMEOUT_SECONDS}`,
    `tool_timeout_sec = ${MCP_TOOL_TIMEOUT_SECONDS}`,
    `default_tools_approval_mode = ${JSON.stringify(mcpApprovalMode)}`,
    "",
    "[mcp_servers.kibi.env]",
    `KIBI_BRANCH = ${JSON.stringify(SKILLOPT_EVALUATION_BRANCH)}`,
    'KIBI_SKILLOPT_PROCESS_GROUP = "python_bridge"',
    "",
  ].join("\n");
}

// implements REQ-skillopt-codex-optimization
export function buildCodexExecArgv(
  options: Readonly<{
    codexCommand: string;
    workspace: string;
    outputSchema: string;
    role: "optimizer" | "target";
  }>,
): readonly [string, ...string[]] {
  return [
    options.codexCommand,
    "--ask-for-approval",
    "never",
    "exec",
    "--json",
    "--ephemeral",
    "--skip-git-repo-check",
    "--ignore-rules",
    "--strict-config",
    "--model",
    options.role === "target" ? TARGET_MODEL : OPTIMIZER_MODEL,
    "--cd",
    resolve(options.workspace),
    "--output-schema",
    resolve(options.outputSchema),
    "-",
  ];
}
