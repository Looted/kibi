import { runBoundedProcess } from "./runtime/process";

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
