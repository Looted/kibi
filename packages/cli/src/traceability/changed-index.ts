import { execFileSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync,
  utimesSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** A scratch git index holding the working tree's changes over the index. */
export type ChangedIndex = Readonly<{
  /** Absolute path of the scratch index, for GIT_INDEX_FILE. */
  indexFile: string;
  /**
   * Extra Git environment variables needed alongside `GIT_INDEX_FILE` when
   * `.git` is not writable and the scratch index lives in a temp directory.
   */
  env?: Readonly<Record<string, string>>;
  /** Removes the scratch index (and any temp fallback dir); the real index is never touched. */
  dispose: () => void;
}>;

type GitRunner = (
  args: readonly string[],
  options: { cwd: string; env: NodeJS.ProcessEnv },
) => string;

const READ_ONLY_ERROR_CODES = new Set(["EROFS", "EACCES", "EPERM"]);
const READ_ONLY_ERROR_PATTERN =
  /\b(EROFS|EACCES|EPERM)\b|read-only file system|permission denied|operation not permitted|insufficient permission/i;

const defaultGit: GitRunner = (args, options) =>
  execFileSync("git", [...args], {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    // rationale: keeps git's stdin closed and its stderr off the terminal
    // while still capturing stderr on error so read-only .git failures can
    // trigger the temp-directory fallback.
    // Stryker disable next-line ArrayDeclaration
    stdio: ["ignore", "pipe", "pipe"],
  });

function toText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Buffer.isBuffer(value)) return value.toString("utf8");
  return "";
}

function isReadOnlyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { code, message, stderr } = error as {
    code?: unknown;
    message?: unknown;
    stderr?: unknown;
  };
  if (typeof code === "string" && READ_ONLY_ERROR_CODES.has(code)) return true;
  return READ_ONLY_ERROR_PATTERN.test(`${toText(stderr)}\n${toText(message)}`);
}

function copyIndexWithTimes(
  source: string,
  destination: string,
  makeWritable = false,
): void {
  copyFileSync(source, destination);
  if (makeWritable) chmodSync(destination, 0o600);
  // Git trusts an entry's stat data only when the file is older than the
  // index; a same-size edit made in the second the index was written is
  // "racily clean" and re-read. A fresh mtime on the copy would hide
  // such edits, so the copy keeps the real index's times.
  const { atime, mtime } = statSync(source);
  utimesSync(destination, atime, mtime);
}

function buildInGitDir(
  workspaceRoot: string,
  realIndex: string,
  indexFile: string,
  scope: readonly string[],
  git: GitRunner,
  env: NodeJS.ProcessEnv,
): ChangedIndex {
  const dispose = () => {
    rmSync(indexFile, { force: true });
    rmSync(`${indexFile}.lock`, { force: true });
  };
  try {
    if (existsSync(realIndex)) copyIndexWithTimes(realIndex, indexFile);
    // Nothing to add when only .kb was named and it neither exists nor was
    // ever tracked.
    if (scope.length !== 1)
      git(["add", "-A", ...scope], {
        cwd: workspaceRoot,
        env: { ...env, GIT_INDEX_FILE: indexFile },
      });
  } catch (error) {
    try {
      dispose();
    } catch {
      // Best-effort cleanup; `.git` itself may be read-only.
    }
    throw error;
  }
  return { indexFile, dispose };
}

function buildInTempDir(
  workspaceRoot: string,
  realIndex: string,
  scope: readonly string[],
  git: GitRunner,
  gitPath: (name: string) => string,
  env: NodeJS.ProcessEnv,
): ChangedIndex {
  const tempDir = mkdtempSync(path.join(tmpdir(), "kibi-changed-index-"));
  const tempIndex = path.join(tempDir, "index");
  const tempObjects = path.join(tempDir, "objects");
  const dispose = () => {
    rmSync(tempDir, { recursive: true, force: true });
  };
  try {
    mkdirSync(tempObjects);
    if (existsSync(realIndex)) {
      copyIndexWithTimes(realIndex, tempIndex, true);
      const realIndexDir = path.dirname(realIndex);
      for (const entry of readdirSync(realIndexDir)) {
        if (!entry.startsWith("sharedindex.")) continue;
        const target = path.join(tempDir, entry);
        copyFileSync(path.join(realIndexDir, entry), target);
        chmodSync(target, 0o600);
      }
    }
    const realObjects = env.GIT_OBJECT_DIRECTORY
      ? path.resolve(workspaceRoot, env.GIT_OBJECT_DIRECTORY)
      : gitPath("objects");
    const alternates = env.GIT_ALTERNATE_OBJECT_DIRECTORIES
      ? `${realObjects}${path.delimiter}${env.GIT_ALTERNATE_OBJECT_DIRECTORIES}`
      : realObjects;
    const fallbackEnv: Readonly<Record<string, string>> = {
      GIT_OBJECT_DIRECTORY: tempObjects,
      GIT_ALTERNATE_OBJECT_DIRECTORIES: alternates,
    };
    if (scope.length !== 1)
      git(["-c", "core.splitIndex=false", "add", "-A", ...scope], {
        cwd: workspaceRoot,
        env: { ...env, ...fallbackEnv, GIT_INDEX_FILE: tempIndex },
      });
    return { indexFile: tempIndex, env: fallbackEnv, dispose };
  } catch (error) {
    dispose();
    throw error;
  }
}

/**
 * Builds the index a commit of every current change would have: a copy of
 * the real index with the working tree added on top (`git add -A`, so
 * ignored files stay out and deletions count). With `paths`, only those
 * paths and the knowledge base (`.kb`) are added, which keeps a check of a
 * few edited files from judging unrelated work in progress. The copy lives
 * in the git directory when writable so a split index still finds its
 * shared part, and falls back to a temp directory (with a scratch object
 * directory and alternates pointing at the real objects) when `.git` is
 * read-only.
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
  try {
    const scope =
      paths === undefined || paths.length === 0
        ? []
        : ["--", ...addablePaths(workspaceRoot, [...paths, ".kb"], git, env)];
    try {
      return buildInGitDir(
        workspaceRoot,
        realIndex,
        indexFile,
        scope,
        git,
        env,
      );
    } catch (error) {
      if (!isReadOnlyError(error)) throw error;
      return buildInTempDir(workspaceRoot, realIndex, scope, git, gitPath, env);
    }
  } catch (error) {
    throw new Error(
      `Could not build the index of the working tree's changes: ${(error as Error).message}`,
    );
  }
}

/**
 * The repo-relative forms of `paths` that exist in the working tree or in
 * the index: `git add` refuses a path that is neither, and `git add -A`
 * records the deletion of one that is only in the index. A named path that
 * is neither, nor in the last commit (a staged deletion), is refused: dropping it would judge none of the changes it
 * names and report a pass.
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
        path.normalize(
          path.isAbsolute(file) ? path.relative(workspaceRoot, file) : file,
        ),
      ),
    ),
  ];
  // A path git does not track lists nothing; a tracked directory lists
  // the files under it.
  const tracked = git(["ls-files", "-z", "--", ...relative], {
    cwd: workspaceRoot,
    env,
  }).split("\0");
  const absent = relative.filter(
    (file) =>
      file !== ".kb" &&
      !existsSync(path.join(workspaceRoot, file)) &&
      !tracked.some((t) => t === file || t.startsWith(`${file}/`)),
  );
  // A path whose deletion or rename is already staged is in neither, but
  // the last commit has it: the index copy already holds that change, so
  // the path is judged with nothing to add.
  const committed =
    absent.length === 0 ? [] : inHead(workspaceRoot, absent, git, env);
  const missing = absent.filter(
    (file) => !committed.some((t) => t === file || t.startsWith(`${file}/`)),
  );
  if (missing.length > 0)
    throw new Error(
      `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} neither in the working tree nor tracked by git, so there is nothing to judge (paths are read from the directory the command runs in).`,
    );
  return relative.filter(
    (file) =>
      existsSync(path.join(workspaceRoot, file)) ||
      tracked.some((t) => t === file || t.startsWith(`${file}/`)),
  );
}

/** The files under `paths` in the last commit; none before the first one. */
function inHead(
  workspaceRoot: string,
  paths: readonly string[],
  git: GitRunner,
  env: NodeJS.ProcessEnv,
): string[] {
  try {
    return git(["ls-tree", "-r", "-z", "--name-only", "HEAD", "--", ...paths], {
      cwd: workspaceRoot,
      env,
    }).split("\0");
  } catch {
    return [];
  }
}

/**
 * Runs `fn` with git reading the changed index instead of the real one
 * (`GIT_INDEX_FILE` and any read-only fallback env vars in this process's
 * environment), then restores the environment and removes the scratch index.
 * Only a one-shot CLI process uses it: a long-lived server must not change
 * its own environment.
 */
export async function withChangedIndex<T>(
  workspaceRoot: string,
  paths: readonly string[] | undefined,
  fn: () => Promise<T>,
  prepare: typeof prepareChangedIndex = prepareChangedIndex,
): Promise<T> {
  const changed = prepare(workspaceRoot, paths);
  const overrides: Record<string, string> = {
    ...changed.env,
    GIT_INDEX_FILE: changed.indexFile,
  };
  const previous = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(overrides)) {
    previous.set(key, process.env[key]);
    process.env[key] = value;
  }
  try {
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) Reflect.deleteProperty(process.env, key);
      else process.env[key] = value;
    }
    changed.dispose();
  }
}
