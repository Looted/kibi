import { afterEach, expect, test } from "bun:test";
import {
  mkdir,
  mkdtemp,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  withExclusiveAdoptionLock,
  withExclusiveMirrorWriterLock,
  withSharedAdoptionLock,
} from "../adoption-lock";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

async function settle<T>(promise: Promise<T>): Promise<{
  ok: boolean;
  value?: T;
  error?: unknown;
}> {
  try {
    const value = await promise;
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error };
  }
}

test("Given an exclusive adoption swap When a shared reader starts during the swap Then it observes only the post-swap snapshot", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
  roots.push(repoRoot);
  let bytes = "pre";
  let reader: Promise<string> | undefined;

  // When
  await withExclusiveAdoptionLock(repoRoot, async () => {
    bytes = "mixed";
    reader = withSharedAdoptionLock(repoRoot, async () => bytes);
    await new Promise<void>((resolve) => setTimeout(resolve, 25));
    bytes = "post";
  });

  // Then
  if (reader === undefined) throw new Error("reader was not started");
  const settled = await settle(reader);
  expect(settled.ok).toBe(true);
  expect(settled.value).toBe("post");
});

test("Given a symlinked global lock path When automatic locking starts Then it rejects without following the link", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
  roots.push(repoRoot);
  const outside = join(repoRoot, "outside.lock");
  await mkdir(join(repoRoot, ".kibi"), { mode: 0o700 });
  await writeFile(outside, "lock");
  await symlink(outside, join(repoRoot, ".kibi/adoption.lock"));

  // When
  const settled = await settle(
    withExclusiveAdoptionLock(repoRoot, async () => undefined),
  );

  // Then
  expect(settled.ok).toBe(false);
  expect(String(settled.error)).toContain("symlink");
});

test("Given concurrent standalone mirror writers When the first writer holds its lock Then the second writer waits for release", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
  roots.push(repoRoot);
  let releaseFirst: (() => void) | undefined;
  let secondEntered = false;
  let resolveFirstStarted: (() => void) | undefined;
  const firstStarted = new Promise<void>((resolve) => {
    resolveFirstStarted = resolve;
  });
  const first = withExclusiveMirrorWriterLock(repoRoot, async () => {
    resolveFirstStarted?.();
    await new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
  });
  await firstStarted;

  // When
  const second = withExclusiveMirrorWriterLock(repoRoot, async () => {
    secondEntered = true;
  });
  await new Promise<void>((resolve) => setTimeout(resolve, 25));

  // Then
  expect(secondEntered).toBe(false);
  if (releaseFirst === undefined) throw new Error("first writer did not hold");
  releaseFirst();
  await first;
  await second;
  expect(secondEntered).toBe(true);
});

test("Given a symlinked mirror writer lock path When standalone mirror writing starts Then it rejects without following the link", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
  roots.push(repoRoot);
  const outside = join(repoRoot, "outside-mirror-writer.lock");
  await mkdir(join(repoRoot, ".kibi"), { mode: 0o700 });
  await writeFile(outside, "lock");
  await symlink(outside, join(repoRoot, ".kibi/mirror-writer.lock"));

  // When
  const settled = await settle(
    withExclusiveMirrorWriterLock(repoRoot, async () => undefined),
  );

  // Then
  expect(settled.ok).toBe(false);
  expect(String(settled.error)).toContain("symlink");
});

test("Given a lock path replaced after descriptor validation When exclusive locking starts Then flock keeps the validated descriptor", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
  roots.push(repoRoot);
  const lockPath = join(repoRoot, ".kibi", "adoption.lock");
  let swapped = false;

  // When
  const settled = await settle(
    withExclusiveAdoptionLock(repoRoot, async () => "locked", {
      beforeFlock: async () => {
        await rename(lockPath, join(repoRoot, ".kibi", "retired.lock"));
        swapped = true;
      },
    }),
  );

  // Then
  expect(settled.ok).toBe(true);
  expect(settled.value).toBe("locked");
  expect(swapped).toBe(true);
});

test("Given a lock file owned by a different euid When locking starts Then it rejects the lock", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
  roots.push(repoRoot);
  await mkdir(join(repoRoot, ".kibi"), { mode: 0o700 });
  const lockPath = join(repoRoot, ".kibi", "adoption.lock");
  // Create lock with mode 0o777 owned by someone else
  await writeFile(lockPath, "lock\n", { mode: 0o777 });

  // When
  const settled = await settle(
    withExclusiveAdoptionLock(repoRoot, async () => undefined),
  );

  // Then
  expect(settled.ok).toBe(false);
  const msg = String(settled.error);
  // The lock exists, but may have wrong uid or mode
  expect(msg.includes("not private") || msg.includes("not owned")).toBe(true);
});

test("Given a lock file with group-other permissions When locking starts Then it rejects the lock", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
  roots.push(repoRoot);
  await mkdir(join(repoRoot, ".kibi"), { mode: 0o700 });
  const lockPath = join(repoRoot, ".kibi", "adoption.lock");
  await writeFile(lockPath, "lock\n", { mode: 0o644 });

  // When
  const settled = await settle(
    withExclusiveAdoptionLock(repoRoot, async () => undefined),
  );

  // Then
  expect(settled.ok).toBe(false);
  expect(String(settled.error)).toContain("not private");
});

test("Given a .kibi directory with group-other permissions When locking starts Then it rejects the directory", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
  roots.push(repoRoot);
  await mkdir(join(repoRoot, ".kibi"), { mode: 0o755 });

  // When
  const settled = await settle(
    withExclusiveAdoptionLock(repoRoot, async () => undefined),
  );

  // Then
  expect(settled.ok).toBe(false);
  expect(String(settled.error)).toContain("not private");
});
