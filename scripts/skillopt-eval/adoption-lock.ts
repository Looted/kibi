import {
  throwIfDirectoryInodeDrift as throwIfLinuxDirectoryInodeDrift,
  withExclusiveAdoptionLock as withLinuxExclusiveAdoptionLock,
  withExclusiveMirrorWriterLock as withLinuxExclusiveMirrorWriterLock,
  withSharedAdoptionLock as withLinuxSharedAdoptionLock,
} from "./adoption-lock-linux";
import {
  withExclusiveAdoptionLock as withWindowsExclusiveAdoptionLock,
  withExclusiveMirrorWriterLock as withWindowsExclusiveMirrorWriterLock,
  withSharedAdoptionLock as withWindowsSharedAdoptionLock,
} from "./adoption-lock-windows";

type AdoptionLockOptions = Readonly<{
  beforeFlock?: (
    lock: Readonly<{ path: string; descriptor: number }>,
  ) => Promise<void>;
}>;

type LockBackend = Readonly<{
  withExclusiveAdoptionLock<T>(
    repoRoot: string,
    operation: () => Promise<T>,
    options?: AdoptionLockOptions,
  ): Promise<T>;
  withSharedAdoptionLock<T>(
    repoRoot: string,
    operation: () => Promise<T>,
    options?: AdoptionLockOptions,
  ): Promise<T>;
  withExclusiveMirrorWriterLock<T>(
    repoRoot: string,
    operation: () => Promise<T>,
    options?: AdoptionLockOptions,
  ): Promise<T>;
}>;

// Both backends are statically linked so platform selection cannot turn a
// missing native library into a runtime fallback. Each backend guards its
// platform-specific dlopen at module evaluation time.
const backend: LockBackend =
  process.platform === "win32"
    ? {
        withExclusiveAdoptionLock: withWindowsExclusiveAdoptionLock,
        withSharedAdoptionLock: withWindowsSharedAdoptionLock,
        withExclusiveMirrorWriterLock: withWindowsExclusiveMirrorWriterLock,
      }
    : {
        withExclusiveAdoptionLock: withLinuxExclusiveAdoptionLock,
        withSharedAdoptionLock: withLinuxSharedAdoptionLock,
        withExclusiveMirrorWriterLock: withLinuxExclusiveMirrorWriterLock,
      };

// implements REQ-skillopt-automatic-adoption
export function throwIfDirectoryInodeDrift(
  current: { readonly dev: number | bigint; readonly ino: number | bigint },
  identity: { readonly dev: number | bigint; readonly ino: number | bigint },
): void {
  // This helper is part of the existing exported API and is Linux's inode
  // guard. Windows performs its equivalent checks through the native handle.
  throwIfLinuxDirectoryInodeDrift(current, identity);
}

// implements REQ-skillopt-automatic-adoption
export function withExclusiveAdoptionLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
  options?: AdoptionLockOptions,
): Promise<T> {
  return backend.withExclusiveAdoptionLock(repoRoot, operation, options);
}

// implements REQ-skillopt-automatic-adoption
export function withSharedAdoptionLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
  options?: AdoptionLockOptions,
): Promise<T> {
  return backend.withSharedAdoptionLock(repoRoot, operation, options);
}

// implements REQ-skillopt-automatic-adoption
export function withExclusiveMirrorWriterLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
  options?: AdoptionLockOptions,
): Promise<T> {
  return backend.withExclusiveMirrorWriterLock(repoRoot, operation, options);
}
