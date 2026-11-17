import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import path from "node:path";

/** A scratch git index holding the working tree's changes over the index. */
export type ChangedIndex = Readonly<{
  /** Absolute path of the scratch index, for GIT_INDEX_FILE. */
  indexFile: string;
  /** Removes the scratch index; the real index is never touched. */
  dispose: () => void;
}>;

type GitRunner = (
  args: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => string;

const defaultGit: GitRunner = (args, options) =>
  execFileSync("git", [...args], {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    // rationale: only keeps git's stdin closed and its stderr off the
    // terminal; the captured stdout is the same either way.
    // Stryker disable next-line ArrayDeclaration
    stdio: ["ignore", "pipe", "ignore"],
  });

/**
 * Builds the index a commit of every current change would have: a copy of
 * the real index with the working tree added on top (`git add -A`, so
 * ignored files stay out and deletions count). With `paths`, only those
 * paths and the knowledge base (`.kb`) are added, which keeps a check of a
 * few edited files from judging unrelated work in progress. The copy lives
 * in the git directory so a split index still finds its shared part.
 */
export function prepareChangedIndex(
  workspaceRoot: string,
  paths?: readonly string[],
  git: GitRunner = defaultGit,
): ChangedIndex {
  // The real index, whatever this process was started with.
  const { GIT_INDEX_FILE: _inherited, ...env } = process.env;
  const gitPath = (name: string) =>
    path.resolve(
      workspaceRoot,
      git(["rev-parse", "--git-path", name], {
        cwd: workspaceRoot,
        env,
      }).trim(),
    );
  const realIndex = gitPath("index");
  const indexFile = gitPath(`kibi-changed-index-${process.pid}-${Date.now()}`);
  const dispose = () => {
    rmSync(indexFile, { force: true });
    rmSync(`${indexFile}.lock`, { force: true });
  };
  try {
    if (existsSync(realIndex)) copyFileSync(realIndex, indexFile);
    const scope =
      paths === undefined || paths.length === 0
        ? []
        : ["--", ...addablePaths(workspaceRoot, [...paths, ".kb"], git, env)];
    // Nothing to add when no named path exists or was ever tracked.
    if (scope.length !== 1)
      git(["add", "-A", ...scope], {
        cwd: workspaceRoot,
        env: { ...env, GIT_INDEX_FILE: indexFile },
      });
  } catch (error) {
    dispose();
    throw new Error(
      `Could not build the index of the working tree's changes: ${(error as Error).message}`,
    );
  }
  return { indexFile, dispose };
}

/**
 * The repo-relative forms of `paths` that exist in the working tree or in
 * the index: `git add` refuses a path that is neither, and `git add -A`
 * records the deletion of one that is only in the index.
 */
function addablePaths(
  workspaceRoot: string,
  paths: readonly string[],
  git: GitRunner,
  env: NodeJS.ProcessEnv,
): string[] {
  const relative = [
    ...new Set(
      paths.map((file) =>
        path.isAbsolute(file) ? path.relative(workspaceRoot, file) : file,
      ),
    ),
  ];
  // A path git does not track lists nothing; a tracked directory lists
  // the files under it.
  const tracked = git(["ls-files", "-z", "--", ...relative], {
    cwd: workspaceRoot,
    env,
  }).split("\0");
  return relative.filter(
    (file) =>
      existsSync(path.join(workspaceRoot, file)) ||
      tracked.some((t) => t === file || t.startsWith(`${file}/`)),
  );
}

/**
 * Runs `fn` with git reading the changed index instead of the real one
 * (GIT_INDEX_FILE in this process's environment), then restores the
 * environment and removes the scratch index. Only a one-shot CLI process
 * uses it: a long-lived server must not change its own environment.
 */
export async function withChangedIndex<T>(
  workspaceRoot: string,
  paths: readonly string[] | undefined,
  fn: () => Promise<T>,
  prepare: typeof prepareChangedIndex = prepareChangedIndex,
): Promise<T> {
  const changed = prepare(workspaceRoot, paths);
  const previous = process.env.GIT_INDEX_FILE;
  process.env.GIT_INDEX_FILE = changed.indexFile;
  try {
    return await fn();
  } finally {
    if (previous === undefined)
      Reflect.deleteProperty(process.env, "GIT_INDEX_FILE");
    else process.env.GIT_INDEX_FILE = previous;
    changed.dispose();
  }
}
