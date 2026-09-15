import { join } from "node:path";
import { runBoundedProcess } from "./runtime/process";
import type { IsolationWorkspace } from "./runtime/workspace";

export function pathsFor(
  workspace: IsolationWorkspace,
  sourceWorktree: string,
  realCodexHome: string,
) {
  return {
    workspace: workspace.target,
    runPrivateHome: workspace.codexHome,
    realCodexHome,
    sourceWorktree,
    fixtureKb: join(workspace.target, ".kb"),
    privateScorer: workspace.privateScorer,
    privateEvidence: workspace.privateEvidence,
    siblingRuns: workspace.siblingRun,
  } as const;
}

export async function sourceWorktreeIsClean(
  sourceWorktree: string,
  env: NodeJS.ProcessEnv,
): Promise<boolean> {
  const result = await runBoundedProcess({
    argv: ["git", "status", "--porcelain", "--untracked-files=all"],
    cwd: sourceWorktree,
    env,
    timeoutMs: 10_000,
  });
  return result.exitCode === 0 && result.stdout.trim() === "";
}
