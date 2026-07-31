import { FFIType, dlopen, read } from "bun:ffi";
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { join } from "node:path";

const { O_CREAT, O_NOFOLLOW, O_RDWR } = constants;
const { flock, __errno_location } = dlopen("libc.so.6", {
  flock: { args: [FFIType.i32, FFIType.i32], returns: FFIType.i32 },
  __errno_location: { args: [], returns: FFIType.ptr },
}).symbols;
const LOCK_EXCLUSIVE = 2;
const LOCK_NONBLOCKING = 4;
const ERRNO_WOULD_BLOCK = 11;

function currentErrno(): number {
  const address = __errno_location();
  if (address === null)
    throw new HeldOutExecutionLeaseError(
      "held_out_execution_lease_acquire_failed",
    );
  return read.i32(address, 0);
}

export class HeldOutExecutionLeaseError extends Error {
  readonly name = "HeldOutExecutionLeaseError";

  constructor(readonly code: "held_out_execution_lease_acquire_failed") {
    super(code);
  }
}

async function acquireLease(directory: string): Promise<FileHandle> {
  const handle = await open(
    join(directory, "execution.lock"),
    O_RDWR | O_CREAT | O_NOFOLLOW,
    0o600,
  );
  try {
    while (flock(handle.fd, LOCK_EXCLUSIVE | LOCK_NONBLOCKING) !== 0) {
      if (currentErrno() !== ERRNO_WOULD_BLOCK)
        throw new HeldOutExecutionLeaseError(
          "held_out_execution_lease_acquire_failed",
        );
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    return handle;
  } catch (error) {
    await handle.close();
    throw error;
  }
}

export async function withHeldOutExecutionLease<T>(
  directory: string,
  operation: () => Promise<T>,
): Promise<T> {
  const handle = await acquireLease(directory);
  try {
    return await operation();
  } finally {
    await handle.close();
  }
}
