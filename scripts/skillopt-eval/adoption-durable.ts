import { constants } from "node:fs";
import { link, lstat, mkdir, open, rename, rm } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import {
  type DurableFault,
  fault,
  finalizeIntent,
  intentPath,
  readIntent,
  writeIntent,
} from "./adoption-intent";

export type FileIdentity = Readonly<{
  dev: number | bigint;
  ino: number | bigint;
}>;

export type DurabilityStep =
  | "stage-fsynced"
  | "renamed"
  | "directory-fsynced"
  | "receipt-fsynced"
  | "parent-fsynced";

export type DurabilityObserver = (step: DurabilityStep) => Promise<void>;

function noFollowFlags(flags: number): number {
  return flags | (constants.O_NOFOLLOW ?? 0);
}

function identityOf(stat: Awaited<ReturnType<typeof lstat>>): FileIdentity {
  return { dev: stat.dev, ino: stat.ino };
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return left.dev === right.dev && left.ino === right.ino;
}

function assertWithin(repoRoot: string, candidate: string): void {
  const pathFromRoot = relative(resolve(repoRoot), resolve(candidate));
  if (pathFromRoot === ".." || pathFromRoot.startsWith(`..${"/"}`)) {
    throw new Error("adoption path escapes repository root");
  }
}

export async function assertSecureDirectory(path: string): Promise<void> {
  const metadata = await lstat(path);
  if (metadata.isSymbolicLink()) throw new Error("adoption directory symlink");
  if (!metadata.isDirectory())
    throw new Error("adoption path is not a directory");
}

export async function ensureSecureDirectory(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: 0o700 });
  const stats = await lstat(path);
  if (stats.isSymbolicLink()) throw new Error("adoption directory symlink");
  if (!stats.isDirectory()) throw new Error("adoption path is not a directory");
  const euid = process.geteuid?.();
  if (euid === undefined) throw new Error("current euid unavailable");
  if (stats.uid !== euid)
    throw new Error("adoption directory not owned by current euid");
  if ((stats.mode & 0o077) !== 0)
    throw new Error("adoption directory is not private");
}

async function secureParent(repoRoot: string, path: string): Promise<void> {
  assertWithin(repoRoot, path);
  const parent = dirname(path);
  const parts = relative(resolve(repoRoot), parent).split("/").filter(Boolean);
  let current = resolve(repoRoot);
  await assertSecureDirectory(current);
  for (const part of parts) {
    current = `${current}/${part}`;
    await assertSecureDirectory(current);
  }
}

export async function readSecureFile(
  repoRoot: string,
  path: string,
): Promise<Readonly<{ bytes: Buffer; identity: FileIdentity }>> {
  await secureParent(repoRoot, path);
  const initial = await lstat(path);
  if (initial.isSymbolicLink()) throw new Error("adoption file symlink");
  if (!initial.isFile()) throw new Error("adoption path is not a file");
  if (initial.nlink !== 1) throw new Error("adoption file hardlink");
  const handle = await open(path, noFollowFlags(constants.O_RDONLY));
  try {
    const opened = await handle.stat();
    if (!opened.isFile() || opened.nlink !== 1) {
      throw new Error("adoption file hardlink");
    }
    if (!sameIdentity(identityOf(initial), identityOf(opened))) {
      throw new Error("adoption file inode drift");
    }
    const bytes = await handle.readFile();
    const final = await lstat(path);
    if (!sameIdentity(identityOf(opened), identityOf(final))) {
      throw new Error("adoption file inode drift");
    }
    return { bytes, identity: identityOf(opened) };
  } finally {
    await handle.close();
  }
}

export async function assertFileIdentity(
  repoRoot: string,
  path: string,
  expected: FileIdentity,
): Promise<void> {
  const observed = await readSecureFile(repoRoot, path);
  if (!sameIdentity(observed.identity, expected)) {
    throw new Error("adoption file inode drift");
  }
}

export async function fsyncDirectory(path: string): Promise<void> {
  const handle = await open(
    path,
    noFollowFlags(constants.O_RDONLY | (constants.O_DIRECTORY ?? 0)),
  );
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function stageFile(
  path: string,
  bytes: Buffer | string,
): Promise<string> {
  const stage = `${path}.stage-${crypto.randomUUID()}`;
  const handle = await open(
    stage,
    noFollowFlags(constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY),
    0o600,
  );
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  return stage;
}

async function observe(
  observer: DurabilityObserver | undefined,
  step: DurabilityStep,
): Promise<void> {
  await observer?.(step);
}

export async function durableReplace(
  repoRoot: string,
  path: string,
  bytes: Buffer | string,
  expected: FileIdentity | undefined,
  observer: DurabilityObserver | undefined,
): Promise<void> {
  await secureParent(repoRoot, path);
  const stage = await stageFile(path, bytes);
  await observe(observer, "stage-fsynced");
  if (expected !== undefined)
    await assertFileIdentity(repoRoot, path, expected);
  await rename(stage, path);
  await observe(observer, "renamed");
  await fsyncDirectory(dirname(path));
  await observe(observer, "directory-fsynced");
}

export async function durableNoReplace(
  repoRoot: string,
  path: string,
  bytes: Buffer | string,
  observer: DurabilityObserver | undefined,
  injection?: DurableFault,
): Promise<boolean> {
  await secureParent(repoRoot, path);
  const stage = await stageFile(path, bytes);
  await observe(observer, "stage-fsynced");
  try {
    await writeIntent(path, stage, bytes, injection);
  } catch (error) {
    await rm(stage, { force: true });
    throw error;
  }
  let linked = false;
  try {
    await link(stage, path);
    linked = true;
    await fault(injection, "link");
  } catch (error) {
    if (linked) throw error;
    await rm(stage, { force: true });
    await fsyncDirectory(dirname(path));
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      const intent = await readIntent(path);
      if (intent?.stage === stage) {
        await rm(intentPath(path));
        await fsyncDirectory(dirname(path));
      } else if (intent !== undefined) {
        await finalizeIntent(repoRoot, path, intent, injection);
      }
      return false;
    }
    throw error;
  }
  await fsyncDirectory(dirname(path));
  await observe(observer, "directory-fsynced");
  const receipt = await open(path, noFollowFlags(constants.O_RDONLY));
  try {
    await receipt.sync();
  } finally {
    await receipt.close();
  }
  await observe(observer, "receipt-fsynced");
  await rm(stage);
  await fault(injection, "stage-unlink");
  await fsyncDirectory(dirname(path));
  await observe(observer, "parent-fsynced");
  await rm(intentPath(path));
  await fault(injection, "intent-unlink");
  await fsyncDirectory(dirname(path));
  return true;
}

export async function readDurableText(
  repoRoot: string,
  path: string,
): Promise<string> {
  return (await readSecureFile(repoRoot, path)).bytes.toString("utf8");
}
