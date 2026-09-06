export function parseWorkspaceFolderPaths(value: unknown): string[];

export function nextAncestorDirectory(current: string): string | undefined;

export function packageJsonForResolvedFile(startPath: string): {
  packageJsonPath: string;
  packageRoot: string;
  packageJson: Record<string, unknown>;
} | null;

export function hasConsumerNodeModulesLink(
  workspaceRoot: string,
  packageRoot: string,
): boolean;

export function isProjectScopedPackage(
  workspaceRoot: string,
  packageRoot: string,
): boolean;

export function resolveProjectLocalMcp(workspaceRoot: string): {
  packageRoot: string;
  packageJsonPath: string;
  packageJson: Record<string, unknown>;
  binPath: string;
};

export function hasDeclaredProjectDependency(workspaceRoot: string): boolean;

export function resolveWorkspaceRoot(
  explicitWorkspace?: string,
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
): string;

export function signalExitCode(signal: NodeJS.Signals | string): number;

export function isLaunchEntrypoint(
  argv1: string | undefined,
  moduleUrl: string,
): boolean;

export function runLaunchEntrypoint(
  argv?: string[],
  env?: NodeJS.ProcessEnv,
): Promise<number>;

export function launchKibiMcp(
  argv?: string[],
  env?: NodeJS.ProcessEnv,
  spawnImpl?: typeof import("node:child_process").spawn,
): Promise<number>;

export function runLaunchIfEntrypoint(
  isEntrypoint?: boolean,
  start?: () => Promise<number | void>,
): Promise<void>;
