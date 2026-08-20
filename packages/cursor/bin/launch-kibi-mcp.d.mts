export function parseWorkspaceFolderPaths(value: unknown): string[];

export function resolveProjectLocalMcp(workspaceRoot: string): {
  packageRoot: string;
  packageJsonPath: string;
  packageJson: Record<string, unknown>;
  binPath: string;
};

export function resolveWorkspaceRoot(
  explicitWorkspace?: string,
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
): string;

export function launchKibiMcp(
  argv?: string[],
  env?: NodeJS.ProcessEnv,
): Promise<number>;
