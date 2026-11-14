/**
 * Scripted reference answers: a task's seeded workspace, a scripted agent that
 * makes real MCP calls against the staged Kibi server, and the score a paid
 * cell with the same evidence would get. A case whose reference answer scores
 * below 100 is not reachable by a careful agent.
 */
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { Client } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { StdioClientTransport } from "../../../packages/mcp/node_modules/@modelcontextprotocol/sdk/dist/esm/client/stdio.js";
import type { TaskSpec } from "../catalog";
import {
  parseHeldOutTaskSpec,
  parsePublicTaskSpec,
} from "../fixtures/contracts";
import { writePublicWorkspace } from "../fixtures/workspace";
import { resultPayload } from "../runtime/case-signals";
import { verifierEnvironment } from "../runtime/codex-cell-defaults";
import { readWorkspaceSources } from "../runtime/codex-cell-runner";
import {
  type EvidenceScore,
  evaluatorManifestFor,
  finalStateRequestsFor,
  scoreCellEvidence,
} from "../runtime/evidence-score";
import { runIndependentFinalState } from "../runtime/final-state";
import { stopFixtureEngine } from "../runtime/fixture-kb-setup";
import { appendTraceReceipt } from "../runtime/jsonrpc";
import { SKILLOPT_EVALUATION_BRANCH } from "../runtime/permissions";
import { stageKibiMcpRuntime } from "../runtime/staged-mcp";
import { setupTaskFixture } from "../runtime/task-fixture-setup";

export const REPOSITORY = resolve(import.meta.dir, "../../..");
const CLI_ROOT = join(REPOSITORY, "packages", "cli");
const SKILL_ROOT = join(REPOSITORY, "packages/cli/src/public/skills");
const CALL_TIMEOUT_MS = 180_000;

export type StagedTask = Readonly<{
  root: string;
  workspace: string;
  privateEvidence: string;
  launch: Readonly<{ command: string; args: readonly string[] }>;
  env: Record<string, string>;
}>;

/** A seeded workspace for `task`, staged by its evaluator-owned setup. */
export async function stageTask(task: TaskSpec): Promise<StagedTask> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-reference-"));
  const workspace = join(root, "workspace");
  writePublicWorkspace({
    root: workspace,
    task:
      task.split === "held-out"
        ? parseHeldOutTaskSpec(task)
        : parsePublicTaskSpec(task),
    canonicalSkillRoot: SKILL_ROOT,
  });
  const manifest = evaluatorManifestFor(task, "");
  if (manifest.fixtureSetup === undefined || manifest.fixtureSetup === "none")
    await mkdir(join(workspace, ".kb"), { recursive: true, mode: 0o700 });
  try {
    await setupTaskFixture({
      setupMode: manifest.fixtureSetup,
      target: workspace,
      cliRoot: CLI_ROOT,
      taskId: task.id,
    });
  } finally {
    await stopFixtureEngine(workspace);
  }
  // Setup's own advisor calls are not the agent's.
  await rm(join(workspace, ".kb/usage.log"), { force: true });
  const privateEvidence = join(root, "private");
  await mkdir(privateEvidence, { recursive: true });
  const launch = await stageKibiMcpRuntime(
    { target: workspace, privateEvidence },
    REPOSITORY,
  );
  const env = verifierEnvironment(
    { ...process.env, KIBI_BRANCH: SKILLOPT_EVALUATION_BRANCH },
    workspace,
  );
  return { root, workspace, privateEvidence, launch, env };
}

function line(value: unknown): string {
  return JSON.stringify(value);
}

export class ReferenceCallError extends Error {
  override readonly name = "ReferenceCallError";
}

/**
 * A scripted agent: real MCP calls against the staged server, recorded as a
 * hash-chained broker trace and a Codex-style transcript.
 */
export class ScriptedAgent {
  private readonly events: string[] = [];
  private sequence = 0;
  readonly tracePath: string;

  constructor(
    readonly staged: StagedTask,
    private readonly client: Client,
  ) {
    this.tracePath = join(staged.privateEvidence, "broker-trace.jsonl");
  }

  /** One tool call; a tool error is returned, not thrown. */
  async raw(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    this.sequence += 1;
    const id = `rpc-${this.sequence}`;
    await appendTraceReceipt(this.tracePath, {
      correlationId: id,
      direction: "target_to_server",
      kind: "request",
      method: "tools/call",
      toolName: tool,
      payload: { params: { name: tool, arguments: args } },
    });
    const result = (await this.client.callTool(
      { name: tool, arguments: args },
      undefined,
      { timeout: CALL_TIMEOUT_MS },
    )) as Record<string, unknown>;
    await appendTraceReceipt(this.tracePath, {
      correlationId: id,
      direction: "server_to_target",
      kind: "response",
      method: "tools/call",
      toolName: tool,
      payload: { result },
    });
    this.events.push(
      line({
        type: "item.completed",
        item: {
          id: `call-${this.sequence}`,
          type: "mcp_tool_call",
          server: "kibi",
          tool,
          arguments: args,
        },
      }),
    );
    return result;
  }

  async call(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const result = await this.raw(tool, args);
    if (result.isError === true)
      throw new ReferenceCallError(
        `${tool} failed: ${JSON.stringify(result).slice(0, 2000)}`,
      );
    return result;
  }

  /** The typed `data` of a successful call. */
  async data(
    tool: string,
    args: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const payload = resultPayload(await this.call(tool, args));
    if (payload === null)
      throw new ReferenceCallError(`${tool} returned no payload`);
    return payload;
  }

  async read(path: string): Promise<string> {
    return readFile(join(this.staged.workspace, path), "utf8");
  }

  async edit(path: string, content: string): Promise<void> {
    const target = join(this.staged.workspace, path);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, "utf8");
    this.sequence += 1;
    this.events.push(
      line({
        type: "item.completed",
        item: {
          id: `edit-${this.sequence}`,
          type: "file_change",
          changes: [{ path, kind: "update" }],
        },
      }),
    );
  }

  transcript(answer: string): string {
    return [
      ...this.events,
      line({
        type: "item.completed",
        item: {
          id: "final",
          type: "agent_message",
          text: line({ completed: true, answer }),
        },
      }),
    ].join("\n");
  }
}

/** A reference answer: tool calls and edits, returning the final answer text. */
export type ReferenceScript = (
  agent: ScriptedAgent,
  task: TaskSpec,
) => Promise<string>;

export type ReferenceResult = EvidenceScore &
  Readonly<{ taskId: string; durationMs: number; error?: string }>;

async function finalStateOf(
  staged: StagedTask,
  task: TaskSpec,
): Promise<string> {
  const manifest = evaluatorManifestFor(task, "");
  const receipt = await runIndependentFinalState({
    launch: {
      command: staged.launch.command,
      args: [...staged.launch.args],
      cwd: staged.workspace,
      env: {
        ...staged.env,
        KIBI_MCP_DIAGNOSTIC_USAGE_LOG_PATH: join(
          staged.privateEvidence,
          "final-state-usage.log",
        ),
      },
    },
    receiptPath: join(staged.privateEvidence, "final-state.json"),
    binding: {
      caseId: manifest.taskId,
      roots: {
        publicManifestHash: manifest.publicManifestHash,
        workspaceHash: manifest.workspaceHash,
        fixtureSeedHash: manifest.fixtureSeedHash,
      },
      sequence: 1,
    },
    requests: finalStateRequestsFor(task).map((request) => ({
      tool: request.tool,
      args: { ...request.args },
    })),
    timeoutMs: CALL_TIMEOUT_MS,
  });
  await stopFixtureEngine(staged.workspace);
  return JSON.stringify(receipt);
}

/** Stages `task`, runs `script` as the agent, and scores the evidence. */
export async function runReference(
  task: TaskSpec,
  script: ReferenceScript,
  options: Readonly<{ keep?: boolean }> = {},
): Promise<ReferenceResult> {
  const started = Date.now();
  const staged = await stageTask(task);
  try {
    const client = new Client({ name: "reference-agent", version: "1.0.0" });
    await client.connect(
      new StdioClientTransport({
        command: staged.launch.command,
        args: [...staged.launch.args],
        cwd: staged.workspace,
        env: staged.env,
        stderr: "pipe",
      }),
    );
    const agent = new ScriptedAgent(staged, client);
    let answer: string;
    try {
      answer = await script(agent, task);
    } finally {
      await client.close();
      await stopFixtureEngine(staged.workspace);
    }
    // The server's own call log, read before the verifier adds its calls.
    const diagnosticReceipt = await readFile(
      join(staged.workspace, ".kb/usage.log"),
      "utf8",
    ).catch(() => "");
    const finalState = await finalStateOf(staged, task);
    const scored = scoreCellEvidence(task, {
      finalState,
      brokerTrace: await readFile(agent.tracePath, "utf8"),
      diagnosticReceipt,
      transcript: agent.transcript(answer),
      workspaceFiles: await readWorkspaceSources(staged.workspace),
    });
    return { taskId: task.id, durationMs: Date.now() - started, ...scored };
  } catch (error) {
    return {
      taskId: task.id,
      durationMs: Date.now() - started,
      score: 0,
      criticalFailures: ["reference_error"],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    if (options.keep !== true)
      await rm(staged.root, { recursive: true, force: true });
  }
}
