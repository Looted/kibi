import { dlopen } from "bun:ffi";
import { constants } from "node:fs";
import { lstat, open } from "node:fs/promises";
import { join } from "node:path";
import { ensureSecureDirectory } from "./adoption-durable";

type LockMode = "-s" | "-x";

type LockRequest = Readonly<{
  fileName: "adoption.lock" | "mirror-writer.lock";
  mode: LockMode;
}>;

type AdoptionLockOptions = Readonly<{
  beforeFlock?: (
    lock: Readonly<{ path: string; descriptor: number }>,
  ) => Promise<void>;
}>;

const FLOCK = dlopen("libc.so.6", {
  flock: { args: ["i32", "i32"], returns: "i32" },
}).symbols.flock;

const LOCK_FLAGS = {
  shared: 1,
  exclusive: 2,
  nonBlocking: 4,
  unlock: 8,
} as const;

function lockFlag(mode: LockMode): number {
  return mode === "-s" ? LOCK_FLAGS.shared : LOCK_FLAGS.exclusive;
}

function currentEuid(): number {
  const euid = process.geteuid?.();
  if (euid === undefined) throw new Error("current euid unavailable");
  return euid;
}

async function secureLockHandle(
  repoRoot: string,
  fileName: LockRequest["fileName"],
): Promise<
  Readonly<{ path: string; handle: Awaited<ReturnType<typeof open>> }>
> {
  const stateRoot = join(repoRoot, ".kibi");
  await ensureSecureDirectory(stateRoot);

  // Capture .kibi directory identity for TOCTOU detection
  const kibiInitial = await lstat(stateRoot);
  const kibiIdentity = { dev: kibiInitial.dev, ino: kibiInitial.ino };

  const lockPath = join(stateRoot, fileName);
  let handle: Awaited<ReturnType<typeof open>> | undefined;
  try {
    handle = await open(
      lockPath,
      constants.O_CREAT | constants.O_RDWR | constants.O_NOFOLLOW,
      0o600,
    );
    const opened = await handle.stat();
    if (opened.uid !== currentEuid())
      throw new Error("adoption lock not owned by current euid");
    if ((opened.mode & 0o077) !== 0)
      throw new Error("adoption lock is not private");

    // Verify .kibi directory identity hasn't been swapped while opening.
    const kibiCurrent = await lstat(stateRoot);
    if (
      kibiCurrent.dev !== kibiIdentity.dev ||
      kibiCurrent.ino !== kibiIdentity.ino
    ) {
      throw new Error("adoption .kibi directory inode drift");
    }

    const current = await lstat(lockPath);
    if (
      !opened.isFile() ||
      opened.nlink !== 1 ||
      current.dev !== opened.dev ||
      current.ino !== opened.ino
    ) {
      throw new Error("adoption lock inode drift");
    }
    return { path: lockPath, handle };
  } catch (error) {
    await handle?.close();
    if (error instanceof Error && "code" in error && error.code === "ELOOP") {
      throw new Error("adoption file symlink");
    }
    throw error;
  }
}

async function flockDescriptor(
  descriptor: number,
  mode: LockMode,
): Promise<void> {
  while (FLOCK(descriptor, lockFlag(mode) | LOCK_FLAGS.nonBlocking) !== 0) {
    await Bun.sleep(5);
  }
}

async function holdLock<T>(
  repoRoot: string,
  request: LockRequest,
  operation: () => Promise<T>,
  options: AdoptionLockOptions | undefined,
): Promise<T> {
  const lock = await secureLockHandle(repoRoot, request.fileName);
  try {
    await options?.beforeFlock?.({
      path: lock.path,
      descriptor: lock.handle.fd,
    });
    await flockDescriptor(lock.handle.fd, request.mode);
    return await operation();
  } finally {
    FLOCK(lock.handle.fd, LOCK_FLAGS.unlock);
    await lock.handle.close();
  }
}

export function withExclusiveAdoptionLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
  options?: AdoptionLockOptions,
): Promise<T> {
  return holdLock(
    repoRoot,
    { fileName: "adoption.lock", mode: "-x" },
    operation,
    options,
  );
}

export function withSharedAdoptionLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
  options?: AdoptionLockOptions,
): Promise<T> {
  return holdLock(
    repoRoot,
    { fileName: "adoption.lock", mode: "-s" },
    operation,
    options,
  );
}

export function withExclusiveMirrorWriterLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
  options?: AdoptionLockOptions,
): Promise<T> {
  return holdLock(
    repoRoot,
    { fileName: "mirror-writer.lock", mode: "-x" },
    operation,
    options,
  );
}
