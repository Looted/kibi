import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import { CANONICAL_SKILLS } from "../catalog";
import {
  RequiredMcpStartupError,
  RuntimePrerequisiteError,
} from "./canary-errors";
import { stageCodexRuntime } from "./codex-runtime";
import type { IsolationWorkspace } from "./isolation-workspace";
import {
  type StagedBrokerLaunch,
  stageKibiMcpBroker,
} from "./mcp-broker-stage";
import type { ProcessResult } from "./process";

export { RequiredMcpStartupError, RuntimePrerequisiteError };
export {
  buildCodexSandboxProbeArgv,
  probeCodexSandbox,
  sourceIsolationDeniedPaths,
  writeCapabilityProbe,
} from "./canary-probes";

const STARTUP_TIMEOUT_MS = 15_000;
const SKILLS = CANONICAL_SKILLS;

export type McpServerLaunch = Readonly<{
  command: string;
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
}>;

export type McpStartupProbeResult = Readonly<{
  toolNames: readonly string[];
}>;

export type StagedCanaryRuntime = Readonly<{
  schemaPath: string;
  codexCommand: string;
  bwrapExecutable: string;
  mcpServer: StagedBrokerLaunch;
}>;

export type ReusableCodexRuntime = Readonly<{
  codexExecutable: string;
  bwrapExecutable: string;
}>;

export async function stageCapabilityCanary(
  workspace: IsolationWorkspace,
  sourceWorktree: string,
  dependencies: Readonly<{
    codexExecutable?: string;
    systemBwrapExecutable?: string | null;
    nodeCommand?: string;
    stagedRuntime?: ReusableCodexRuntime;
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
  // A reusable run-level runtime supplies the executables from outside each
  // cell, but the cell still owns its runtime metadata and schema directory.
  // Create that directory before writing the canary schema in both staging
  // modes.
  await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
  const stagedCodex =
    dependencies.stagedRuntime ??
    (await stageCodexRuntime(runtimeRoot, {
      ...(dependencies.codexExecutable === undefined
        ? {}
        : { codexExecutable: dependencies.codexExecutable }),
      ...(Object.hasOwn(dependencies, "systemBwrapExecutable")
        ? { systemBwrapExecutable: dependencies.systemBwrapExecutable }
        : {}),
    }));

  const schemaPath = resolve(workspace.target, ".runtime/output.schema.json");
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

  const mcpServer = await stageKibiMcpBroker(
    workspace,
    sourceWorktree,
    nodeCommandOptions(dependencies.nodeCommand),
  );
  return {
    schemaPath,
    codexCommand: stagedCodex.codexExecutable,
    bwrapExecutable: stagedCodex.bwrapExecutable,
    mcpServer,
  };
}

function stringEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  return Object.fromEntries(
    Object.entries(env).flatMap(([key, value]) =>
      value === undefined ? [] : [[key, value]],
    ),
  );
}

export function nodeCommandOptions(
  nodeCommand: string | undefined,
): { nodeCommand: string } | Record<string, never> {
  return nodeCommand === undefined ? {} : { nodeCommand };
}

export function startupFailureDetail(error: unknown): string {
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

export function summarizeProcessFailure(result: ProcessResult): string {
  const detail = result.stderr.trim().replaceAll("\n", " | ") || "no_stderr";
  return `codex_exit:${result.exitCode}:${detail.slice(0, 600)}`;
}
