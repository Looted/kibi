import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { join } from "node:path";
import { ensureSecureDirectory, readSecureFile } from "./adoption-durable";

type LockMode = "-s" | "-x";

async function secureLockPath(repoRoot: string): Promise<string> {
  const stateRoot = join(repoRoot, ".kibi");
  await ensureSecureDirectory(stateRoot);
  const lockPath = join(stateRoot, "adoption.lock");
  try {
    const handle = await open(
      lockPath,
      constants.O_CREAT |
        constants.O_EXCL |
        constants.O_WRONLY |
        constants.O_NOFOLLOW,
      0o600,
    );
    await handle.close();
  } catch (error) {
    if (
      !(error instanceof Error && "code" in error && error.code === "EEXIST")
    ) {
      throw error;
    }
  }
  await readSecureFile(repoRoot, lockPath);
  return lockPath;
}

async function holdLock<T>(
  repoRoot: string,
  mode: LockMode,
  operation: () => Promise<T>,
): Promise<T> {
  const lockPath = await secureLockPath(repoRoot);
  const process = Bun.spawn(
    ["flock", mode, lockPath, "sh", "-c", "printf ready; cat >/dev/null"],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  const reader = process.stdout.getReader();
  const signal = await reader.read();
  reader.releaseLock();
  if (signal.done || new TextDecoder().decode(signal.value) !== "ready") {
    const stderr = await new Response(process.stderr).text();
    throw new Error(`adoption lock unavailable: ${stderr.trim()}`);
  }
  try {
    return await operation();
  } finally {
    await process.stdin.end();
    await process.exited;
  }
}

export function withExclusiveAdoptionLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
): Promise<T> {
  return holdLock(repoRoot, "-x", operation);
}

export function withSharedAdoptionLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
): Promise<T> {
  return holdLock(repoRoot, "-s", operation);
}
