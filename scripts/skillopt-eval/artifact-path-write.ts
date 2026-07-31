import { dlopen, ptr } from "bun:ffi";
import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import type { FileHandle } from "node:fs/promises";
import { ArtifactPathError } from "./artifact-path-error";

const LIBC = dlopen("libc.so.6", {
  close: { args: ["i32"], returns: "i32" },
  fsync: { args: ["i32"], returns: "i32" },
  openat: { args: ["i32", "ptr", "i32", "i32"], returns: "i32" },
  renameat: {
    args: ["i32", "ptr", "i32", "ptr"],
    returns: "i32",
  },
  unlinkat: { args: ["i32", "ptr", "i32"], returns: "i32" },
  write: { args: ["i32", "ptr", "usize"], returns: "i64" },
});

const CREATE_STAGE_FLAGS =
  constants.O_CREAT |
  constants.O_EXCL |
  constants.O_NOFOLLOW |
  constants.O_WRONLY;

export function assertSuccess(result: number, action: string): void {
  if (result !== 0) throw new ArtifactPathError(`artifact ${action} failed`);
}

export function removeAt(fd: number, name: string): number {
  return Number(
    LIBC.symbols.unlinkat(fd, ptr(new TextEncoder().encode(`${name}\0`)), 0),
  );
}

function pathBytes(path: string): Uint8Array {
  return new TextEncoder().encode(`${path}\0`);
}

export function writeAtomicTextFile(
  directory: FileHandle,
  name: string,
  text: string,
): void {
  const stage = `.${name}.${randomUUID()}.stage`;
  const stageFd = LIBC.symbols.openat(
    directory.fd,
    ptr(pathBytes(stage)),
    CREATE_STAGE_FLAGS,
    0o600,
  );
  if (stageFd < 0) throw new ArtifactPathError("artifact stage create failed");

  try {
    const bytes = new TextEncoder().encode(text);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const written = Number(
        LIBC.symbols.write(
          stageFd,
          ptr(bytes.subarray(offset)),
          bytes.byteLength - offset,
        ),
      );
      if (written <= 0)
        throw new ArtifactPathError("artifact stage write failed");
      offset += written;
    }
    assertSuccess(LIBC.symbols.fsync(stageFd), "stage sync");
    assertSuccess(
      LIBC.symbols.renameat(
        directory.fd,
        ptr(pathBytes(stage)),
        directory.fd,
        ptr(pathBytes(name)),
      ),
      "replace",
    );
    assertSuccess(LIBC.symbols.fsync(directory.fd), "directory sync");
  } catch (error) {
    LIBC.symbols.unlinkat(directory.fd, ptr(pathBytes(stage)), 0);
    throw error;
  } finally {
    assertSuccess(LIBC.symbols.close(stageFd), "stage close");
  }
}
