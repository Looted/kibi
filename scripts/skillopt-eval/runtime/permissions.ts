import { chmod, cp, mkdir, realpath, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import type { AuthMode } from "./codex-auth";
import type { ProcessResult } from "./process";
import type { IsolationWorkspace } from "./workspace";

export const TARGET_MODEL = "gpt-5.4-mini" as const;
export const OPTIMIZER_MODEL = "gpt-5.5" as const;
export const MODEL_REASONING_EFFORT = "low" as const;
export const MCP_STARTUP_TIMEOUT_SECONDS = 15 as const;
export const MCP_TOOL_TIMEOUT_SECONDS = 120 as const;
const SKILLS = [
  "kibi-usage",
  "kibi-freshness",
  "kibi-traceability",
  "init-kibi",
] as const;
const ProbeSchema = z.object({
  workspaceWrite: z.literal(true),
  denied: z.array(z.string()).length(9),
  skillsReadable: z.literal(4),
  networkDenied: z.literal(true),
});

export type CapabilityCanaryReceipt = Readonly<{
  verdict: "pass" | "no-go";
  runId: string;
  model: typeof TARGET_MODEL;
  authMode: "file" | "keyring" | null;
  paidModelCalls: 0 | 1;
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
  nodeCommand: string;
  codexExecutable: string;
  kibiServer: string;
}>;

function tomlString(value: string): string {
  return JSON.stringify(resolve(value));
}

// implements REQ-skillopt-codex-optimization
export function buildCodexConfig(options: CodexConfigOptions): string {
  const model = options.role === "target" ? TARGET_MODEL : OPTIMIZER_MODEL;
  return [
    `model = ${JSON.stringify(model)}`,
    `model_reasoning_effort = ${JSON.stringify(MODEL_REASONING_EFFORT)}`,
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
    'include_only = ["HOME", "LANG", "LC_ALL", "PATH", "TERM", "TZ"]',
    "",
    "[permissions.skillopt-isolated.workspace_roots]",
    `${tomlString(options.paths.workspace)} = true`,
    "",
    "[permissions.skillopt-isolated.filesystem]",
    '":root" = "deny"',
    '":minimal" = "read"',
    `${tomlString(options.codexExecutable)} = "read"`,
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
    `command = ${tomlString(options.nodeCommand)}`,
    `args = [${JSON.stringify(resolve(options.kibiServer))}]`,
    "enabled = true",
    "required = true",
    `startup_timeout_sec = ${MCP_STARTUP_TIMEOUT_SECONDS}`,
    `tool_timeout_sec = ${MCP_TOOL_TIMEOUT_SECONDS}`,
    'default_tools_approval_mode = "auto"',
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

export async function stageCapabilityCanary(
  workspace: IsolationWorkspace,
  sourceWorktree: string,
): Promise<Readonly<{ schemaPath: string; codexCommand: string }>> {
  const skillsRoot = resolve(workspace.target, ".agents/skills");
  await mkdir(skillsRoot, { recursive: true });
  for (const skill of SKILLS) {
    await cp(
      resolve(sourceWorktree, "packages/cli/src/public/skills", skill),
      resolve(skillsRoot, skill),
      { recursive: true },
    );
  }
  await mkdir(resolve(workspace.target, ".kb"), { mode: 0o700 });
  await writeFile(
    resolve(workspace.target, ".kb/sentinel"),
    "kb-private\n",
    "utf8",
  );
  const runtimeRoot = resolve(workspace.target, ".runtime");
  await mkdir(runtimeRoot, { mode: 0o700 });
  const codexCommand = resolve(runtimeRoot, "codex");
  await cp(await realpath(Bun.which("codex") ?? "codex"), codexCommand);
  await chmod(codexCommand, 0o500);
  const schemaPath = resolve(workspace.privateEvidence, "output.schema.json");
  await writeFile(
    schemaPath,
    JSON.stringify({
      type: "object",
      additionalProperties: false,
      required: ["probeExecuted"],
      properties: { probeExecuted: { type: "boolean", const: true } },
    }),
    { encoding: "utf8", mode: 0o600 },
  );
  return { schemaPath, codexCommand };
}

export async function writeCapabilityProbe(
  workspace: IsolationWorkspace,
  deniedPaths: readonly string[],
): Promise<void> {
  const quoted = deniedPaths.map((path) => JSON.stringify(path)).join(" ");
  const probe = `#!/bin/sh\nset -u\nout="$PWD/canary-result.json"\nfor p in ${quoted}; do test ! -r "$p" || exit 41; done\nskills=0\nfor p in "$PWD"/.agents/skills/*/SKILL.md; do test -r "$p" && skills=$((skills+1)); done\ntest "$skills" -eq 4 || exit 42\nprintf canary > "$PWD/write-proof"\nif python3 -c 'import socket; socket.create_connection(("example.com",80),1)' >/dev/null 2>&1; then exit 43; fi\nprintf '{"workspaceWrite":true,"denied":["1","2","3","4","5","6","7","8","9"],"skillsReadable":4,"networkDenied":true}\n' > "$out"\n`;
  const path = resolve(workspace.target, "canary-probe");
  await writeFile(path, probe, { encoding: "utf8", mode: 0o500 });
  await chmod(path, 0o500);
}

export function parseCapabilityProbe(value: unknown): void {
  ProbeSchema.parse(value);
}

export function summarizeProcessFailure(result: ProcessResult): string {
  const detail = result.stderr.trim().replaceAll("\n", " | ") || "no_stderr";
  return `codex_exit:${result.exitCode}:${detail.slice(0, 600)}`;
}
