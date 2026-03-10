export interface Tarballs {
  core: string;
  cli: string;
  mcp: string;
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

export interface Frontmatter {
  id: string;
  title: string;
  status: string;
  created_at?: string;
  updated_at?: string;
  source?: string;
  tags?: string[];
}
