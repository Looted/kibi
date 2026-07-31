import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, open, unlink } from "node:fs/promises";
import { join } from "node:path";

const { O_CREAT, O_DIRECTORY, O_EXCL, O_NOFOLLOW, O_RDONLY, O_WRONLY } =
  constants;

export function isErrno(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

export async function readNoFollow(path: string): Promise<string> {
  const handle = await open(path, O_RDONLY | O_NOFOLLOW);
  try {
    return await handle.readFile({ encoding: "utf8" });
  } finally {
    await handle.close();
  }
}

async function syncDirectory(path: string): Promise<void> {
  const handle = await open(path, O_RDONLY | O_DIRECTORY | O_NOFOLLOW);
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function removeIfPresent(path: string): Promise<void> {
  try {
    await unlink(path);
  } catch (error) {
    if (isErrno(error, "ENOENT")) return;
    throw error;
  }
}

export async function createAtomically(
  input: Readonly<{
    directory: string;
    targetPath: string;
    bytes: string;
  }>,
): Promise<void> {
  const temporaryPath = join(input.directory, `.${randomUUID()}.tmp`);
  const handle = await open(
    temporaryPath,
    O_WRONLY | O_CREAT | O_EXCL | O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(input.bytes, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await link(temporaryPath, input.targetPath);
    await syncDirectory(input.directory);
  } finally {
    await removeIfPresent(temporaryPath);
    await syncDirectory(input.directory);
  }
}
