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

export interface GitMetadata {
  worktreeRoot: string;
  gitDir: string;
  commonGitDir: string;
  isLinkedWorktree: boolean;
}

function safeStat(path: string): Stats | undefined {
  try {
    return statSync(path);
  } catch {
    // Missing or unreadable: undefined below.
  }
  return undefined;
}

function readFirstLine(path: string): string | undefined {
  try {
    // split() always yields at least one (possibly empty) line.
    const [firstLine] = readFileSync(path, "utf8").split(/\r?\n/, 1) as [
      string,
    ];
    return firstLine.trim() || undefined;
  } catch {
    // Missing or unreadable: undefined below.
  }
  return undefined;
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

export function nextAncestorDirectory(current: string): string | undefined {
  const parent = dirname(current);
  return parent === current ? undefined : parent;
}

function findGitMetadata(
  candidatePath: string,
  boundary: string,
): GitMetadata | null {
  let current: string | undefined = directorySearchStart(candidatePath);

  while (current !== undefined) {
    const dotGitPath = join(current, ".git");

    if (safeStat(dotGitPath)?.isDirectory()) {
      return {
        worktreeRoot: current,
        gitDir: dotGitPath,
        commonGitDir: dotGitPath,
        isLinkedWorktree: false,
      };
    }

    // A `.git` file (linked worktree) points at its git directory; anything
    // else (missing, unreadable, no gitdir line) yields null.
    const gitDir = readLinkedGitDir(current, dotGitPath);
    if (gitDir) {
      return {
        worktreeRoot: current,
        gitDir,
        commonGitDir: readCommonGitDir(gitDir),
        isLinkedWorktree: true,
      };
    }

    // Never search above the declared root. A path outside it never passes
    // through the root, so its search runs to the filesystem root.
    if (current === boundary) {
      return null;
    }

    current = nextAncestorDirectory(current);
  }
  return null;
}

function hasRootKbConfig(root: string): boolean {
  return existsSync(join(root, ".kb", "manifest.json"));
}

function authorityRootFromCommonGitDir(commonGitDir: string): string | null {
  return basename(commonGitDir) === ".git" ? dirname(commonGitDir) : null;
}

export function authorityRootFromLinkedGitDir(gitDir: string): string | null {
  const normalizedGitDir = resolve(gitDir);
  const marker = `${sep}.git${sep}worktrees${sep}`;
  const markerIndex = normalizedGitDir.indexOf(marker);
  if (markerIndex < 0) {
    return null;
  }

  return normalizedGitDir.slice(0, markerIndex);
}

export function ancestorKbRoots(start: string): string[] {
  const roots: string[] = [];
  let current: string | undefined = resolve(start);

  while (current !== undefined) {
    if (hasRootKbConfig(current)) {
      roots.push(current);
    }
    current = nextAncestorDirectory(current);
  }
  return roots;
}

function resolveAuthorityRoot(
  git: GitMetadata,
  inputDirectory: string,
): string {
  if (!git.isLinkedWorktree) {
    return git.worktreeRoot;
  }

  // Every candidate is already an absolute, resolved path.
  const candidates = [
    authorityRootFromCommonGitDir(git.commonGitDir),
    authorityRootFromLinkedGitDir(git.gitDir),
    ...ancestorKbRoots(git.worktreeRoot),
    inputDirectory,
    git.worktreeRoot,
  ].filter((candidate): candidate is string => candidate !== null);

  // inputDirectory and the worktree root keep the list non-empty.
  return (
    candidates.find((candidate) => hasRootKbConfig(candidate)) ??
    (candidates[0] as string)
  );
}

export function resolveBranch(git: GitMetadata | null): string {
  if (!git) {
    return "unknown";
  }

  const head = readFirstLine(join(git.gitDir, "HEAD"));
  if (!head) {
    return "unknown";
  }

  // A detached or non-branch HEAD reads as "HEAD". The group always
  // participates in a match.
  const match = /^ref:\s*refs\/heads\/(.*)/.exec(head);
  return match ? (match[1] as string) : "HEAD";
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
    (absoluteFilePath
      ? findGitMetadata(absoluteFilePath, declaredWorktreeRoot)
      : null) ?? findGitMetadata(declaredWorktreeRoot, declaredWorktreeRoot);

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
