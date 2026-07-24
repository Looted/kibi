import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { z } from "zod";
import type { SkillOptStepRequest, SkillOptStepResult } from "../optimize";
import {
  RequiredMcpStartupError,
  stageCapabilityCanary,
} from "./canary-runtime";
import { prepareExistingLogin } from "./codex-auth";
import { resolveIsolationArtifactRoot } from "./artifact-root";
import { createIsolationWorkspace } from "./isolation-workspace";
import { buildCodexConfig, buildCodexExecArgv } from "./permissions";
import { runBoundedProcess } from "./process";

const BodySchema = z.object({ body: z.string().min(1) }).strict();
const AgentMessageSchema = z
  .object({
    type: z.literal("item.completed"),
    item: z
      .object({ type: z.literal("agent_message"), text: z.string() })
      .loose(),
  })
  .loose();

// implements REQ-skillopt-codex-optimization
export class CodexOptimizerError extends Error {
  // implements REQ-skillopt-codex-optimization
  readonly name = "CodexOptimizerError";
}

function parseJsonLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch (error) {
    if (error instanceof SyntaxError) return undefined;
    throw error;
  }
}

function bodyFromText(text: string): string | undefined {
  const parsed = BodySchema.safeParse(parseJsonLine(text));
  return parsed.success ? parsed.data.body : undefined;
}

function extractBody(stdout: string): string {
  for (const line of stdout.split("\n")) {
    const value = parseJsonLine(line);
    const direct = BodySchema.safeParse(value);
    if (direct.success) return direct.data.body;
    const message = AgentMessageSchema.safeParse(value);
    if (message.success) {
      const body = bodyFromText(message.data.item.text);
      if (body !== undefined) return body;
    }
  }
  throw new CodexOptimizerError("optimizer_output_missing_body");
}

function promptFor(request: SkillOptStepRequest): string {
  return [
    "Return one JSON object with exactly one string field named body.",
    "Rewrite only the skill body. Do not include Markdown frontmatter.",
    "Preserve MCP-only Kibi guidance, approval boundaries, and source-file traceability.",
    "The candidate is for human review; never claim that an evaluation passed.",
    `Current body:\n${request.currentBody}`,
    `Public training trajectories:\n${JSON.stringify(request.trainTrajectories)}`,
    `Previous development gate:\n${JSON.stringify(request.previousDevelopment)}`,
  ].join("\n\n");
}

// implements REQ-skillopt-codex-optimization
export type CodexOptimizerOptions = Readonly<{
  sourceWorktree: string;
  artifactRoot: string;
  runId: string;
  request: SkillOptStepRequest;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}>;

// implements REQ-skillopt-codex-optimization
export async function runCodexSkillOptStep(
  options: CodexOptimizerOptions,
): Promise<SkillOptStepResult> {
  const workspace = await createIsolationWorkspace({
    artifactRoot: resolveIsolationArtifactRoot(
      resolve(options.artifactRoot, "optimizer-runtime"),
      options.sourceWorktree,
    ),
    runId: `${options.runId}-${options.request.skill}-${options.request.step}`,
    role: "optimizer",
  });
  try {
    const sourceWorktree = resolve(options.sourceWorktree);
    const env = options.env ?? process.env;
    const auth = await prepareExistingLogin({
      privateCodexHome: workspace.codexHome,
      sandboxHome: workspace.sandboxHome,
      env,
      run: (argv, childEnv) =>
        runBoundedProcess({
          argv,
          cwd: sourceWorktree,
          env: childEnv,
          timeoutMs: 15_000,
        }),
    });
    const staged = await stageCapabilityCanary(workspace, sourceWorktree);
    const runtimeRoot = join(workspace.target, ".runtime");
    await mkdir(runtimeRoot, { recursive: true, mode: 0o700 });
    const outputSchema = join(runtimeRoot, "optimizer-output.schema.json");
    await writeFile(
      outputSchema,
      JSON.stringify({
        type: "object",
        additionalProperties: false,
        required: ["body"],
        properties: { body: { type: "string", minLength: 1 } },
      }),
      { encoding: "utf8", mode: 0o600 },
    );
    await writeFile(
      join(workspace.codexHome, "config.toml"),
      buildCodexConfig({
        role: "optimizer",
        authMode: auth.mode,
        paths: {
          workspace: workspace.target,
          runPrivateHome: workspace.codexHome,
          realCodexHome: auth.realCodexHome,
          sourceWorktree,
          fixtureKb: join(workspace.target, ".kb"),
          privateScorer: workspace.privateScorer,
          privateEvidence: workspace.privateEvidence,
          siblingRuns: workspace.siblingRun,
        },
        bwrapExecutable: staged.bwrapExecutable,
        codexExecutable: staged.codexCommand,
        mcpServer: staged.mcpServer,
      }),
      { encoding: "utf8", mode: 0o600 },
    );
    const result = await runBoundedProcess({
      argv: buildCodexExecArgv({
        codexCommand: staged.codexCommand,
        workspace: workspace.target,
        outputSchema,
        role: "optimizer",
      }),
      cwd: workspace.target,
      env: { ...auth.env, PATH: "/usr/bin:/bin" },
      timeoutMs: options.timeoutMs ?? 15 * 60 * 1000,
      stdin: promptFor(options.request),
    });
    if (result.exitCode !== 0) {
      throw new CodexOptimizerError(`optimizer_exit:${result.exitCode}`);
    }
    const body = extractBody(result.stdout);
    return { body, development: options.request.previousDevelopment };
  } catch (error) {
    if (error instanceof RequiredMcpStartupError) throw error;
    if (error instanceof CodexOptimizerError) throw error;
    throw new CodexOptimizerError(
      error instanceof Error ? error.message : "optimizer_failed",
    );
  } finally {
    await workspace.cleanup();
  }
}
