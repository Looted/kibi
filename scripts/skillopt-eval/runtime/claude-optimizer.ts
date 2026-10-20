import { resolve } from "node:path";
import { MAX_BASELINE_INSERTION_PARAGRAPH_BYTES } from "../baseline-insertion";
import type { SkillOptStepResult } from "../optimize";
import { resolveIsolationArtifactRoot } from "./artifact-root";
import {
  buildClaudeExecArgv,
  claudeStreamToCodexJsonl,
  claudeTargetSettings,
  openClaudeSession,
  resolveClaudeExecutable,
  withClaudeAuthLease,
} from "./claude-code-host";
import {
  CodexOptimizerError,
  type CodexOptimizerOptions,
  completeSkillOptStep,
  validateBaselineInsertionSource,
} from "./codex-optimizer";
import { createIsolationWorkspace } from "./isolation-workspace";
import { runBoundedProcess } from "./process";

/**
 * The final structured answer of a `claude -p --output-format stream-json`
 * run, as the JSON text the Codex optimizer would have written to its
 * last-message file; empty when the run produced none.
 */
// implements REQ-skillopt-claude-code-host
export function claudeOptimizerLastMessage(stdout: string): string {
  let last = "";
  for (const line of claudeStreamToCodexJsonl(stdout).split("\n")) {
    if (line.trim() === "") continue;
    try {
      const event = JSON.parse(line) as {
        type?: unknown;
        item?: { type?: unknown; text?: unknown };
      };
      if (
        event.type === "item.completed" &&
        event.item?.type === "agent_message" &&
        typeof event.item.text === "string"
      ) {
        last = event.item.text;
      }
    } catch {
      // Not JSON.
    }
  }
  return last;
}

/**
 * The SkillOpt optimizer step on the Claude Code CLI. Prompts, the format
 * repair, failure evidence and accepted output are shared with the Codex
 * step; only the model call differs. The optimizer gets no tools and no MCP
 * server: it sees only the prompt and returns `{ body }` as structured output.
 */
// implements REQ-skillopt-claude-code-host
export async function runClaudeSkillOptStep(
  options: CodexOptimizerOptions,
): Promise<SkillOptStepResult> {
  if (options.baselineInsertion !== undefined) {
    await validateBaselineInsertionSource(options);
  }
  const env = options.env ?? process.env;
  const sourceWorktree = resolve(options.sourceWorktree);
  const workspace = await createIsolationWorkspace({
    artifactRoot: resolveIsolationArtifactRoot(
      resolve(options.artifactRoot, "optimizer-runtime"),
      options.sourceWorktree,
    ),
    runId: `${options.runId}-${options.request.skill}-${options.request.step}`,
    role: "optimizer",
  });
  try {
    const claudeExecutable =
      options.codexExecutable ?? (await resolveClaudeExecutable(env));
    const argv = buildClaudeExecArgv({
      claudeExecutable,
      role: "optimizer",
      settings: claudeTargetSettings({
        deniedRoots: [
          sourceWorktree,
          workspace.privateScorer,
          workspace.privateEvidence,
        ],
      }),
      outputSchema: {
        type: "object",
        additionalProperties: false,
        required: ["body"],
        properties: {
          body: {
            type: "string",
            minLength: 1,
            ...(options.baselineInsertion === undefined
              ? {}
              : { maxLength: MAX_BASELINE_INSERTION_PARAGRAPH_BYTES }),
          },
        },
      },
      tools: [],
    });
    const timeoutMs = options.timeoutMs ?? 15 * 60 * 1000;
    // The lease serializes this call with target cells that may refresh the
    // shared login.
    return await withClaudeAuthLease(env, async () => {
      const session = await openClaudeSession({
        env,
        claudeExecutable,
        privateConfigDir: workspace.codexHome,
        sandboxHome: workspace.sandboxHome,
      });
      try {
        return await completeSkillOptStep(options, async (stdin) => {
          const result = await runBoundedProcess({
            argv,
            cwd: workspace.target,
            env: session.env,
            timeoutMs,
            stdin,
          });
          return {
            result,
            lastMessage: claudeOptimizerLastMessage(result.stdout),
          };
        });
      } finally {
        await session.finalize();
      }
    });
  } catch (error) {
    if (error instanceof CodexOptimizerError) throw error;
    throw new CodexOptimizerError(
      error instanceof Error ? error.message : "optimizer_failed",
    );
  } finally {
    await workspace.cleanup();
  }
}
