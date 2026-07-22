import { constants as fsConstants } from "node:fs";
import {
  access,
  chmod,
  cp,
  mkdir,
  realpath,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { type CapabilityProbeEvidence, sha256File } from "./canary-evidence";
import type { IsolationWorkspace } from "./isolation-workspace";
import type { ProcessResult } from "./process";

const SANDBOX_PROBE_OUTPUT = "skillopt-sandbox-probe:pass";
const STARTUP_TIMEOUT_MS = 15_000;
const SKILLS = [
  "kibi-usage",
  "kibi-freshness",
  "kibi-traceability",
  "init-kibi",
] as const;

export type McpServerLaunch = Readonly<{
  command: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  readableRoots?: readonly string[];
}>;

export type McpStartupProbeResult = Readonly<{
  toolNames: readonly string[];
}>;

export type StagedCanaryRuntime = Readonly<{
  schemaPath: string;
  codexCommand: string;
  bwrapExecutable: string;
  mcpServer: Omit<McpServerLaunch, "env">;
}>;

export class RuntimePrerequisiteError extends Error {
  readonly name = "RuntimePrerequisiteError";

  constructor(readonly kind: "missing_bwrap" | "sandbox_probe_failed") {
    super(
      kind === "missing_bwrap"
        ? "missing_isolation:bwrap"
        : "isolation_probe_failed",
    );
  }
}

export class RequiredMcpStartupError extends Error {
  readonly name = "RequiredMcpStartupError";

  constructor(
    readonly detail: string,
    options?: ErrorOptions,
  ) {
    super(`required_mcp_startup:${detail}`, options);
  }
}

async function executableFile(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

export async function stageCapabilityCanary(
  workspace: IsolationWorkspace,
  sourceWorktree: string,
  dependencies: Readonly<{
    codexExecutable?: string;
    systemBwrapExecutable?: string | null;
    nodeCommand?: string;
  }> = {},
): Promise<StagedCanaryRuntime> {
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
  const installedCodex = await realpath(
    dependencies.codexExecutable ?? Bun.which("codex") ?? "codex",
  );
  const codexCommand = resolve(runtimeRoot, "codex");
  await cp(installedCodex, codexCommand);
  await chmod(codexCommand, 0o500);

  const bundledSource = resolve(
    dirname(installedCodex),
    "../codex-resources/bwrap",
  );
  const bundledTarget = resolve(runtimeRoot, "codex-resources/bwrap");
  let bwrapExecutable: string;
  if (await executableFile(bundledSource)) {
    await mkdir(dirname(bundledTarget), { recursive: true, mode: 0o700 });
    await cp(bundledSource, bundledTarget);
    await chmod(bundledTarget, 0o500);
    bwrapExecutable = bundledTarget;
  } else {
    const systemBwrap =
      "systemBwrapExecutable" in dependencies
        ? dependencies.systemBwrapExecutable
        : Bun.which("bwrap");
    if (systemBwrap === null || systemBwrap === undefined) {
      throw new RuntimePrerequisiteError("missing_bwrap");
    }
    bwrapExecutable = await realpath(systemBwrap);
  }

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

  const mcpBin = resolve(sourceWorktree, "packages/mcp/bin/kibi-mcp");
  return {
    schemaPath,
    codexCommand,
    bwrapExecutable,
    mcpServer: {
      command: await realpath(dependencies.nodeCommand ?? process.execPath),
      args: [mcpBin],
      cwd: workspace.target,
      readableRoots: [
        resolve(sourceWorktree, "packages/mcp/bin"),
        resolve(sourceWorktree, "packages/mcp/dist"),
        resolve(sourceWorktree, "packages/mcp/package.json"),
        resolve(sourceWorktree, "packages/cli/dist"),
        resolve(sourceWorktree, "packages/cli/package.json"),
        resolve(sourceWorktree, "packages/core"),
        resolve(sourceWorktree, "node_modules/.bun"),
      ],
    },
  };
}

function stringEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value]],
    ),
  );
}

function startupFailureDetail(error: unknown): string {
  if (!(error instanceof Error)) return "unknown";
  if ("code" in error && typeof error.code === "string") {
    return error.code.toLowerCase();
  }
  return error.name.toLowerCase().replaceAll(" ", "_");
}

export async function probeRequiredMcp(
  launch: McpServerLaunch,
): Promise<McpStartupProbeResult> {
  const transport = new StdioClientTransport({
    command: launch.command,
    args: [...launch.args],
    cwd: launch.cwd,
    env: stringEnvironment(launch.env),
    stderr: "pipe",
  });
  const client = new Client({
    name: "skillopt-required-mcp-probe",
    version: "1.0.0",
  });
  try {
    await client.connect(transport, { timeout: STARTUP_TIMEOUT_MS });
    const result = await client.listTools(undefined, {
      timeout: STARTUP_TIMEOUT_MS,
    });
    return { toolNames: result.tools.map(({ name }) => name) };
  } catch (error) {
    throw new RequiredMcpStartupError(startupFailureDetail(error), {
      cause: error,
    });
  } finally {
    await client.close();
  }
}

export function buildCodexSandboxProbeArgv(
  options: Readonly<{ codexCommand: string; workspace: string }>,
): readonly [string, ...string[]] {
  return [
    options.codexCommand,
    "sandbox",
    "--permission-profile",
    "skillopt-isolated",
    "--cd",
    options.workspace,
    "/bin/sh",
    "-c",
    `printf ${SANDBOX_PROBE_OUTPUT}`,
  ];
}

export async function probeCodexSandbox(
  options: Readonly<{
    codexCommand: string;
    workspace: string;
    env: NodeJS.ProcessEnv;
    run: (
      argv: readonly [string, ...string[]],
      cwd: string,
      env: NodeJS.ProcessEnv,
      timeoutMs: number,
    ) => Promise<ProcessResult>;
  }>,
): Promise<void> {
  const result = await options.run(
    buildCodexSandboxProbeArgv(options),
    options.workspace,
    options.env,
    STARTUP_TIMEOUT_MS,
  );
  if (result.exitCode !== 0 || result.stdout !== SANDBOX_PROBE_OUTPUT) {
    throw new RuntimePrerequisiteError("sandbox_probe_failed");
  }
}

export async function writeCapabilityProbe(
  workspace: IsolationWorkspace,
  deniedPaths: readonly string[],
): Promise<CapabilityProbeEvidence> {
  const quoted = deniedPaths.map((path) => JSON.stringify(path)).join(" ");
  const expectedOutput = "skillopt-capability-canary:pass\n";
  const probe = `#!/bin/sh\nset -u\nfor p in ${quoted}; do test ! -r "$p" || exit 41; done\nskills=0\nfor p in "$PWD"/.agents/skills/*/SKILL.md; do test -r "$p" && skills=$((skills+1)); done\ntest "$skills" -eq 4 || exit 42\nprintf canary > "$PWD/write-proof"\nif python3 -c 'import socket; socket.create_connection(("example.com",80),1)' >/dev/null 2>&1; then exit 43; fi\nprintf '${expectedOutput}'\n`;
  const path = resolve(workspace.target, ".runtime/canary-probe");
  await writeFile(path, probe, { encoding: "utf8", mode: 0o500 });
  await chmod(path, 0o500);
  return {
    absolutePath: path,
    command: "./.runtime/canary-probe",
    expectedOutput,
    sha256: await sha256File(path),
  };
}

export function summarizeProcessFailure(result: ProcessResult): string {
  const detail = result.stderr.trim().replaceAll("\n", " | ") || "no_stderr";
  return `codex_exit:${result.exitCode}:${detail.slice(0, 600)}`;
}
