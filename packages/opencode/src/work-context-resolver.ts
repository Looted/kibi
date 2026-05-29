import { type Stats, existsSync, readFileSync, statSync } from "node:fs";
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from "node:path";

import { type RepoPosture, detectPosture } from "./repo-posture.js";

export interface ResolveWorkContextInput {
  inputDirectory: string;
  inputWorktree: string;
  filePath?: string;
  sessionId?: string;
  agentIdentity?: string;
}

export interface WorkContext {
  worktreeRoot: string;
  kibiAuthorityRoot: string;
  branch: string;
  repoRelativePath: string;
  posture: RepoPosture;
  isAuthoritative: boolean;
  isLinkedWorktree: boolean;
  sessionId: string | undefined;
  agentIdentity: string;
}

interface GitMetadata {
  worktreeRoot: string;
  gitDir: string;
  commonGitDir: string;
  isLinkedWorktree: boolean;
}

function safeStat(path: string): Stats | null {
  try {
    return statSync(path);
  } catch {
    return null;
  }
}

function readFirstLine(path: string): string | null {
  try {
    const [firstLine] = readFileSync(path, "utf8").split(/\r?\n/, 1);
    const trimmed = firstLine?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : null;
  } catch {
    return null;
  }
}

function readLinkedGitDir(
  worktreeRoot: string,
  gitFilePath: string,
): string | null {
  const firstLine = readFirstLine(gitFilePath);
  if (!firstLine?.startsWith("gitdir:")) {
    return null;
  }

  const rawGitDir = firstLine.slice("gitdir:".length).trim();
  if (rawGitDir.length === 0) {
    return null;
  }

  return isAbsolute(rawGitDir)
    ? resolve(rawGitDir)
    : resolve(worktreeRoot, rawGitDir);
}

function readCommonGitDir(gitDir: string): string {
  const rawCommonDir = readFirstLine(join(gitDir, "commondir"));
  if (!rawCommonDir) {
    return gitDir;
  }

  return isAbsolute(rawCommonDir)
    ? resolve(rawCommonDir)
    : resolve(gitDir, rawCommonDir);
}

function directorySearchStart(candidatePath: string): string {
  const resolved = resolve(candidatePath);
  const stats = safeStat(resolved);
  return stats?.isDirectory() ? resolved : dirname(resolved);
}

function findGitMetadata(candidatePath: string): GitMetadata | null {
  let current = directorySearchStart(candidatePath);

  while (true) {
    const dotGitPath = join(current, ".git");
    const dotGitStats = safeStat(dotGitPath);

    if (dotGitStats?.isFile()) {
      const gitDir = readLinkedGitDir(current, dotGitPath);
      if (gitDir) {
        return {
          worktreeRoot: current,
          gitDir,
          commonGitDir: readCommonGitDir(gitDir),
          isLinkedWorktree: true,
        };
      }
    }

    if (dotGitStats?.isDirectory()) {
      return {
        worktreeRoot: current,
        gitDir: dotGitPath,
        commonGitDir: dotGitPath,
        isLinkedWorktree: false,
      };
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function hasRootKbConfig(root: string): boolean {
  return existsSync(join(root, ".kb", "config.json"));
}

function uniqueResolved(paths: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const path of paths) {
    if (!path) {
      continue;
    }
    const resolved = resolve(path);
    if (seen.has(resolved)) {
      continue;
    }
    seen.add(resolved);
    result.push(resolved);
  }

  return result;
}

function authorityRootFromCommonGitDir(commonGitDir: string): string | null {
  return basename(commonGitDir) === ".git" ? dirname(commonGitDir) : null;
}

function authorityRootFromLinkedGitDir(gitDir: string): string | null {
  const normalizedGitDir = resolve(gitDir);
  const marker = `${sep}.git${sep}worktrees${sep}`;
  const markerIndex = normalizedGitDir.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  return normalizedGitDir.slice(0, markerIndex);
}

function ancestorKbRoots(start: string): string[] {
  const roots: string[] = [];
  let current = resolve(start);

  while (true) {
    if (hasRootKbConfig(current)) {
      roots.push(current);
    }

    const parent = dirname(current);
    if (parent === current) {
      return roots;
    }
    current = parent;
  }
}

function resolveAuthorityRoot(
  git: GitMetadata,
  inputDirectory: string,
): string {
  if (!git.isLinkedWorktree) {
    return git.worktreeRoot;
  }

  const candidates = uniqueResolved([
    authorityRootFromCommonGitDir(git.commonGitDir),
    authorityRootFromLinkedGitDir(git.gitDir),
    ...ancestorKbRoots(git.worktreeRoot),
    inputDirectory,
    git.worktreeRoot,
  ]);

  return (
    candidates.find((candidate) => hasRootKbConfig(candidate)) ??
    candidates[0] ??
    git.worktreeRoot
  );
}

function resolveBranch(git: GitMetadata | null): string {
  if (!git) {
    return "unknown";
  }

  const head = readFirstLine(join(git.gitDir, "HEAD"));
  if (!head) {
    return "unknown";
  }

  if (!head.startsWith("ref:")) {
    return "HEAD";
  }

  const ref = head.slice("ref:".length).trim();
  if (!ref.startsWith("refs/heads/")) {
    return "HEAD";
  }

  const branch = ref.slice("refs/heads/".length);
  return branch === "master" ? "main" : branch;
}

function normalizeRepoRelativePath(
  fromRoot: string,
  targetPath: string,
): string {
  const rawRelativePath = relative(fromRoot, targetPath);
  if (rawRelativePath.length === 0) {
    return ".";
  }

  return rawRelativePath.split(sep).join("/");
}

function authoritativeForPosture(posture: RepoPosture): boolean {
  return posture === "root_active" || posture === "hybrid_root_plus_vendored";
}

// implements REQ-opencode-worktree-hard-enforcement-v1
const resolveWorkContext = function resolveWorkContext(
  input: ResolveWorkContextInput,
): WorkContext {
  const declaredWorktreeRoot = resolve(
    input.inputWorktree || input.inputDirectory,
  );
  const declaredDirectory = resolve(
    input.inputDirectory || input.inputWorktree,
  );
  const absoluteFilePath = input.filePath
    ? isAbsolute(input.filePath)
      ? resolve(input.filePath)
      : resolve(declaredWorktreeRoot, input.filePath)
    : undefined;

  const git =
    (absoluteFilePath ? findGitMetadata(absoluteFilePath) : null) ??
    findGitMetadata(declaredWorktreeRoot);

  const worktreeRoot = git?.worktreeRoot ?? declaredWorktreeRoot;
  const kibiAuthorityRoot = git
    ? resolveAuthorityRoot(git, declaredDirectory)
    : declaredWorktreeRoot;
  const posture = detectPosture(kibiAuthorityRoot).state;
  const repoRelativePath = normalizeRepoRelativePath(
    worktreeRoot,
    absoluteFilePath ?? worktreeRoot,
  );

  return {
    worktreeRoot,
    kibiAuthorityRoot,
    branch: resolveBranch(git),
    repoRelativePath,
    posture,
    isAuthoritative: authoritativeForPosture(posture),
    isLinkedWorktree: git?.isLinkedWorktree ?? false,
    sessionId: input.sessionId,
    agentIdentity: input.agentIdentity ?? "unknown",
  };
};

export { resolveWorkContext };
