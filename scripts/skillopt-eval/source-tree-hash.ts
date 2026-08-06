import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, rename } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { z } from "zod";
import { sourceWorktreeIsClean } from "./legacy-preflight-source";
import {
  assertComponentsAreNotSymlinks,
  readNoFollowBytes,
} from "./preflight-io";
import { runBoundedProcess } from "./runtime/process";

const CliSchema = z
  .object({ root: z.string().min(1), output: z.string().min(1) })
  .strict();

type CliOptions = z.infer<typeof CliSchema>;

export type SourceTreeHash = Readonly<{
  root: string;
  sha256: string;
  files: number;
}>;

export class SourceTreeHashError extends Error {
  readonly name = "SourceTreeHashError";

  constructor(
    readonly check: string,
    options?: ErrorOptions,
  ) {
    super(check, options);
  }
}

function hasTraversal(path: string): boolean {
  return path.split(sep).includes("..");
}

function parseCli(argv: readonly string[]): CliOptions {
  if (argv.length !== 4) throw new SourceTreeHashError("cli-arguments");
  const [rootFlag, root, outputFlag, output] = argv;
  if (rootFlag !== "--root" || outputFlag !== "--output")
    throw new SourceTreeHashError("cli-arguments");
  if (root === undefined || output === undefined)
    throw new SourceTreeHashError("cli-arguments");
  if (hasTraversal(root) || hasTraversal(output))
    throw new SourceTreeHashError("path-traversal");
  return CliSchema.parse({ root, output });
}

function assertTrackedPath(path: string): void {
  if (
    path === "" ||
    path.split("/").includes("..") ||
    path.split("/").includes(".") ||
    isAbsolute(path)
  ) {
    throw new SourceTreeHashError("path-traversal");
  }
}

async function trackedFiles(root: string): Promise<readonly string[]> {
  const result = await runBoundedProcess({
    argv: ["git", "ls-files", "--cached", "-z"],
    cwd: root,
    env: process.env,
    timeoutMs: 10_000,
  });
  if (result.exitCode !== 0)
    throw new SourceTreeHashError("source-worktree-unavailable");
  const files = result.stdout.split("\0").filter(Boolean).sort();
  for (const path of files) assertTrackedPath(path);
  return files;
}

async function assertSourceRoot(root: string): Promise<string> {
  if (hasTraversal(root)) throw new SourceTreeHashError("path-traversal");
  const resolved = resolve(root);
  await assertComponentsAreNotSymlinks(resolved);
  const stats = await lstat(resolved);
  if (!stats.isDirectory())
    throw new SourceTreeHashError("source-root-directory");
  if (!(await sourceWorktreeIsClean(resolved, process.env)))
    throw new SourceTreeHashError("source-worktree-dirty");
  return resolved;
}

// implements REQ-skillopt-codex-optimization
export async function hashAuthorizedSourceTree(
  requestedRoot: string,
): Promise<SourceTreeHash> {
  const root = await assertSourceRoot(requestedRoot);
  const hash = createHash("sha256");
  const files = await trackedFiles(root);
  for (const path of files) {
    const absolute = resolve(root, ...path.split("/"));
    const contained = relative(root, absolute);
    if (
      contained === "" ||
      contained.startsWith(`..${sep}`) ||
      isAbsolute(contained)
    )
      throw new SourceTreeHashError("path-traversal");
    const stats = await lstat(absolute);
    if (stats.isSymbolicLink())
      throw new SourceTreeHashError("source-tree-symlink");
    if (!stats.isFile())
      throw new SourceTreeHashError("source-tree-regular-file");
    const loaded = await readNoFollowBytes(absolute, "lock");
    hash.update("file\0").update(path).update("\0").update(loaded.bytes);
  }
  if (!(await sourceWorktreeIsClean(root, process.env)))
    throw new SourceTreeHashError("source-worktree-dirty");
  return { root, sha256: hash.digest("hex"), files: files.length };
}

async function writeDescriptor(
  output: string,
  descriptor: SourceTreeHash,
): Promise<void> {
  const destination = resolve(output);
  const sourceRelative = relative(descriptor.root, destination);
  if (
    sourceRelative === "" ||
    (!sourceRelative.startsWith(`..${sep}`) && !isAbsolute(sourceRelative))
  ) {
    throw new SourceTreeHashError("output-source-root");
  }
  const parent = dirname(destination);
  await assertComponentsAreNotSymlinks(parent);
  const parentStats = await lstat(parent);
  if (!parentStats.isDirectory())
    throw new SourceTreeHashError("output-parent-directory");
  const temporary = `${destination}.${process.pid}.tmp`;
  const handle = await open(
    temporary,
    constants.O_WRONLY |
      constants.O_CREAT |
      constants.O_EXCL |
      constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(`${JSON.stringify(descriptor, null, 2)}\n`, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await rename(temporary, destination);
}

// implements REQ-skillopt-codex-optimization
export async function sourceTreeHashMain(
  argv: readonly string[],
): Promise<number> {
  try {
    const options = parseCli(argv);
    const descriptor = await hashAuthorizedSourceTree(options.root);
    await writeDescriptor(options.output, descriptor);
    process.stdout.write(`${JSON.stringify(descriptor)}\n`);
    return 0;
  } catch (error) {
    if (error instanceof SourceTreeHashError) {
      process.stderr.write(`${error.check}\n`);
      return 2;
    }
    throw error;
  }
}

if (import.meta.main)
  process.exitCode = await sourceTreeHashMain(process.argv.slice(2));
