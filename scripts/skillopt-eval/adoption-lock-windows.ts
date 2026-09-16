import { type Pointer, dlopen, ptr } from "bun:ffi";
import { lstat, mkdir } from "node:fs/promises";
import { join } from "node:path";

type LockMode = "shared" | "exclusive";
type WindowsHandle = number | bigint;

type AdoptionLockOptions = Readonly<{
  beforeFlock?: (
    lock: Readonly<{ path: string; descriptor: number }>,
  ) => Promise<void>;
}>;

type NativeWindowsApi = Readonly<{
  CreateFileW: (
    path: Pointer,
    desiredAccess: number,
    shareMode: number,
    securityAttributes: Pointer | null,
    creationDisposition: number,
    flagsAndAttributes: number,
    templateFile: WindowsHandle,
  ) => WindowsHandle;
  CloseHandle: (handle: WindowsHandle) => number;
  GetLastError: () => number;
  GetFileType: (handle: WindowsHandle) => number;
  GetFileInformationByHandle: (
    handle: WindowsHandle,
    information: Pointer,
  ) => number;
  GetFileInformationByHandleEx: (
    handle: WindowsHandle,
    informationClass: number,
    information: Pointer,
    informationLength: number,
  ) => number;
}>;

// Static backend selection is intentional. Guarding dlopen here means the
// Linux backend can be statically imported without ever loading kernel32, and
// this backend can be statically imported without evaluating a Windows FFI
// load on Linux.
const WINDOWS_API: NativeWindowsApi | undefined =
  process.platform === "win32"
    ? (dlopen("kernel32.dll", {
        CreateFileW: {
          args: ["ptr", "u32", "u32", "ptr", "u32", "u32", "u64"],
          returns: "u64",
        },
        CloseHandle: { args: ["u64"], returns: "i32" },
        GetLastError: { args: [], returns: "u32" },
        GetFileType: { args: ["u64"], returns: "u32" },
        GetFileInformationByHandle: {
          args: ["u64", "ptr"],
          returns: "i32",
        },
        GetFileInformationByHandleEx: {
          args: ["u64", "i32", "ptr", "u32"],
          returns: "i32",
        },
      }).symbols as NativeWindowsApi)
    : undefined;

const GENERIC_READ = 0x80000000;
const FILE_SHARE_READ = 0x00000001;
const FILE_SHARE_WRITE = 0x00000002;
const OPEN_EXISTING = 3;
const OPEN_ALWAYS = 4;
const FILE_ATTRIBUTE_NORMAL = 0x00000080;
const FILE_FLAG_BACKUP_SEMANTICS = 0x02000000;
const FILE_FLAG_OPEN_REPARSE_POINT = 0x00200000;
const ERROR_SHARING_VIOLATION = 32;
const FILE_TYPE_DISK = 1;
const FILE_ATTRIBUTE_DIRECTORY = 0x00000010;
const FILE_ATTRIBUTE_REPARSE_POINT = 0x00000400;
const FILE_ATTRIBUTE_TAG_INFO = 9;
const INVALID_HANDLE_VALUE = 0xffffffffffffffffn;

type FileIdentity = Readonly<{ dev: number | bigint; ino: number | bigint }>;
type ExistingLock = Readonly<{ identity: FileIdentity }>;

function windowsError(api: string, code: number): Error {
  return new Error(`Windows ${api} failed (error ${code})`);
}

function native(): NativeWindowsApi {
  if (WINDOWS_API === undefined) {
    throw new Error("Windows adoption locks unavailable");
  }
  return WINDOWS_API;
}

function wideString(value: string): Uint16Array {
  if (value.includes("\0")) throw new Error("adoption lock path contains NUL");
  const encoded = new Uint16Array(value.length + 1);
  for (let index = 0; index < value.length; index++) {
    encoded[index] = value.charCodeAt(index);
  }
  return encoded;
}

function sameIdentity(left: FileIdentity, right: FileIdentity): boolean {
  return (
    String(left.dev) === String(right.dev) &&
    String(left.ino) === String(right.ino)
  );
}

function rejectExistingLockMetadata(
  metadata: Awaited<ReturnType<typeof lstat>>,
): ExistingLock {
  if (metadata.isSymbolicLink()) throw new Error("adoption file symlink");
  if (!metadata.isFile()) throw new Error("adoption path is not a file");
  if (metadata.nlink !== 1) throw new Error("adoption lock hardlink");
  return { identity: { dev: metadata.dev, ino: metadata.ino } };
}

async function existingLock(
  lockPath: string,
): Promise<ExistingLock | undefined> {
  try {
    return rejectExistingLockMetadata(await lstat(lockPath));
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (error.code === "ENOENT" || error.code === "ENOTDIR")
    ) {
      return undefined;
    }
    throw error;
  }
}

function directoryIdentity(
  metadata: Awaited<ReturnType<typeof lstat>>,
): FileIdentity {
  if (metadata.isSymbolicLink()) throw new Error("adoption directory symlink");
  if (!metadata.isDirectory())
    throw new Error("adoption path is not a directory");
  return { dev: metadata.dev, ino: metadata.ino };
}

// implements REQ-skillopt-automatic-adoption
export function throwIfWindowsDirectoryIdentityDrift(
  current: FileIdentity,
  identity: FileIdentity,
): void {
  if (!sameIdentity(current, identity)) {
    throw new Error("adoption .kibi directory inode drift");
  }
}

async function ensureWindowsStateDirectory(
  stateRoot: string,
): Promise<Readonly<{ identity: FileIdentity; handle: WindowsHandle }>> {
  await mkdir(stateRoot, { recursive: true });
  const metadata = await lstat(stateRoot);
  const handle = await openWindowsStateDirectory(stateRoot);
  return {
    identity: { dev: metadata.dev, ino: metadata.ino },
    handle,
  };
}

function normalizedHandle(value: WindowsHandle): bigint {
  return typeof value === "bigint" ? value : BigInt(value);
}

// implements REQ-skillopt-automatic-adoption
export function isValidWindowsHandle(
  value: WindowsHandle | null,
): value is WindowsHandle {
  if (value === null) return false;
  const normalized = normalizedHandle(value);
  return normalized !== 0n && normalized !== INVALID_HANDLE_VALUE;
}

function inspectHandle(
  handle: WindowsHandle,
  kind: "file" | "directory",
): void {
  const api = native();
  if (api.GetFileType(handle) !== FILE_TYPE_DISK) {
    throw new Error(
      kind === "directory"
        ? "adoption directory is not a disk file"
        : "adoption lock is not a disk file",
    );
  }

  // FILE_ATTRIBUTE_TAG_INFO lets us inspect the final path component without
  // following a reparse point. It also identifies directories.
  const tagInfo = new Uint32Array(2);
  if (
    api.GetFileInformationByHandleEx(
      handle,
      FILE_ATTRIBUTE_TAG_INFO,
      ptr(tagInfo),
      tagInfo.byteLength,
    ) === 0
  ) {
    throw windowsError("GetFileInformationByHandleEx", api.GetLastError());
  }
  const attributes = tagInfo[0] ?? 0;
  if ((attributes & FILE_ATTRIBUTE_REPARSE_POINT) !== 0) {
    throw new Error(
      kind === "directory"
        ? "adoption directory reparse point"
        : "adoption file reparse point",
    );
  }
  const isDirectory = (attributes & FILE_ATTRIBUTE_DIRECTORY) !== 0;
  if (kind === "directory") {
    if (!isDirectory) throw new Error("adoption path is not a directory");
    return;
  }
  if (isDirectory) {
    throw new Error("adoption path is not a file");
  }

  // BY_HANDLE_FILE_INFORMATION.nNumberOfLinks is DWORD index 10. This is
  // the kernel-side hardlink check, not just a path metadata check.
  const information = new Uint32Array(13);
  if (api.GetFileInformationByHandle(handle, ptr(information)) === 0) {
    throw windowsError("GetFileInformationByHandle", api.GetLastError());
  }
  if ((information[10] ?? 0) !== 1) {
    throw new Error("adoption lock hardlink");
  }
}

function closeHandle(handle: WindowsHandle): void {
  const api = native();
  if (api.CloseHandle(handle) === 0) {
    throw windowsError("CloseHandle", api.GetLastError());
  }
}

async function openWindowsLock(
  lockPath: string,
  mode: LockMode,
): Promise<WindowsHandle> {
  const api = native();
  const path = wideString(lockPath);
  const shareMode = mode === "shared" ? FILE_SHARE_READ : 0;

  for (;;) {
    // OPEN_REPARSE_POINT is the no-follow part of this operation. No
    // FILE_SHARE_DELETE is deliberate: a validated lock path cannot be
    // renamed or unlinked while this handle is held.
    const handle = api.CreateFileW(
      ptr(path),
      GENERIC_READ,
      shareMode,
      null,
      OPEN_ALWAYS,
      FILE_ATTRIBUTE_NORMAL | FILE_FLAG_OPEN_REPARSE_POINT,
      0n,
    );
    if (isValidWindowsHandle(handle)) {
      const normalized = normalizedHandle(handle);
      try {
        inspectHandle(normalized, "file");
        return normalized;
      } catch (error) {
        closeHandle(normalized);
        throw error;
      }
    }

    const errorCode = api.GetLastError();
    if (errorCode !== ERROR_SHARING_VIOLATION) {
      throw windowsError("CreateFileW", errorCode);
    }
    // Sharing violation is the only retryable native error. All other errors
    // fail closed rather than accidentally running without a lock.
    await Bun.sleep(5);
  }
}

async function openWindowsStateDirectory(
  stateRoot: string,
): Promise<WindowsHandle> {
  const api = native();
  const path = wideString(stateRoot);
  const handle = api.CreateFileW(
    ptr(path),
    0,
    FILE_SHARE_READ | FILE_SHARE_WRITE,
    null,
    OPEN_EXISTING,
    FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OPEN_REPARSE_POINT,
    0n,
  );
  if (!isValidWindowsHandle(handle)) {
    throw windowsError("CreateFileW", api.GetLastError());
  }

  const normalized = normalizedHandle(handle);
  try {
    inspectHandle(normalized, "directory");
    return normalized;
  } catch (error) {
    closeHandle(normalized);
    throw error;
  }
}

async function secureLockHandle(
  repoRoot: string,
  fileName: "adoption.lock" | "mirror-writer.lock",
  mode: LockMode,
): Promise<
  Readonly<{
    path: string;
    handle: WindowsHandle;
    directoryHandle: WindowsHandle;
  }>
> {
  const stateRoot = join(repoRoot, ".kibi");
  const stateRootInfo = await ensureWindowsStateDirectory(stateRoot);
  const stateRootIdentity = stateRootInfo.identity;
  const lockPath = join(stateRoot, fileName);
  const directoryHandle = stateRootInfo.handle;

  try {
    const before = await existingLock(lockPath);
    const handle = await openWindowsLock(lockPath, mode);
    try {
      // Re-check the parent after opening the lock. The first lstat only
      // establishes the directory we intended to use; this closes the same
      // replacement race guarded by Linux secureLockHandle.
      const stateRootCurrent = directoryIdentity(await lstat(stateRoot));
      throwIfWindowsDirectoryIdentityDrift(stateRootCurrent, stateRootIdentity);
      const after = await lstat(lockPath);
      const afterLock = rejectExistingLockMetadata(after);
      if (
        before !== undefined &&
        !sameIdentity(before.identity, afterLock.identity)
      ) {
        throw new Error("adoption lock inode drift");
      }
      return { path: lockPath, handle, directoryHandle };
    } catch (error) {
      closeHandle(handle);
      throw error;
    }
  } catch (error) {
    closeHandle(directoryHandle);
    throw error;
  }
}

async function holdLock<T>(
  repoRoot: string,
  fileName: "adoption.lock" | "mirror-writer.lock",
  mode: LockMode,
  operation: () => Promise<T>,
  options: AdoptionLockOptions | undefined,
): Promise<T> {
  const lock = await secureLockHandle(repoRoot, fileName, mode);
  try {
    await options?.beforeFlock?.({
      path: lock.path,
      descriptor: Number(normalizedHandle(lock.handle)),
    });
    return await operation();
  } finally {
    try {
      closeHandle(lock.handle);
    } finally {
      closeHandle(lock.directoryHandle);
    }
  }
}

// implements REQ-skillopt-automatic-adoption
export function withExclusiveAdoptionLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
  options?: AdoptionLockOptions,
): Promise<T> {
  return holdLock(repoRoot, "adoption.lock", "exclusive", operation, options);
}

// implements REQ-skillopt-automatic-adoption
export function withSharedAdoptionLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
  options?: AdoptionLockOptions,
): Promise<T> {
  return holdLock(repoRoot, "adoption.lock", "shared", operation, options);
}

// implements REQ-skillopt-automatic-adoption
export function withExclusiveMirrorWriterLock<T>(
  repoRoot: string,
  operation: () => Promise<T>,
  options?: AdoptionLockOptions,
): Promise<T> {
  return holdLock(
    repoRoot,
    "mirror-writer.lock",
    "exclusive",
    operation,
    options,
  );
}
