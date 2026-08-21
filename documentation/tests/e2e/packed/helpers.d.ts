export interface Tarballs {
  core: string;
  cli: string;
  runtime: string;
  mcp: string;
  opencode: string;
  codex: string;
  cursor: string;
}

export interface SharedPackedEnvironment {
  readonly prefix: string;
  readonly tarballsRoot: string;
}

export interface SharedNpmCacheResolution {
  path: string;
  owned: boolean;
}

export interface RunOptions {
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs?: number | undefined;
}

export interface RunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface KibiOptions {
  timeoutMs?: number | undefined;
}

export interface TestSandbox {
  baseDir: string;
  repoDir: string;
  npmPrefix: string;
  npmCache: string;
  homeDir: string;
  kibiBin: string;
  kibiMcpBin: string;
  env: NodeJS.ProcessEnv;
  install(tarballs: Tarballs): Promise<void>;
  initGitRepo(): Promise<void>;
  cleanup(): Promise<void>;
  verifyKibiCliResolution(): Promise<void>;
}

export function prepareSharedPackedEnvironment(): Promise<SharedPackedEnvironment>;
export function prepareSharedPackedInstallation(): Promise<string>;
export function cleanupSharedPackedInstallation(): void;
export function resolveSharedNpmCache(): SharedNpmCacheResolution;

export interface Frontmatter {
  id: string;
  title: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  source?: string;
  tags?: string[];
}
