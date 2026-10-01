import { afterEach, expect, test } from "bun:test";
import {
  lstat,
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
const nativeTest = test.skipIf(
  process.platform !== "linux" && process.platform !== "darwin",
);

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

test.each(["win32", "freebsd"])(
  "unsupported platform %s refuses every lock before creating state or entering the operation",
  async (unsupportedPlatform) => {
    const repoRoot = await mkdtemp(
      join(tmpdir(), "skillopt-unsupported-lock-"),
    );
    roots.push(repoRoot);
    const marker = join(repoRoot, "operation-entered");
    const lockModule = new URL("../adoption-lock.ts", import.meta.url).href;
    const harness = `
      Object.defineProperty(process, "platform", { value: ${JSON.stringify(unsupportedPlatform)} });
      const locks = await import(${JSON.stringify(lockModule)});
      const { writeFile } = await import("node:fs/promises");
      const results = {};
      for (const name of ["withSharedAdoptionLock", "withExclusiveAdoptionLock", "withExclusiveMirrorWriterLock"]) {
        try {
          await locks[name](${JSON.stringify(repoRoot)}, async () => {
            await writeFile(${JSON.stringify(marker)}, "entered");
          });
          results[name] = "unexpected success";
        } catch (error) {
          results[name] = String(error);
        }
      }
      console.log(JSON.stringify(results));
    `;
    const child = Bun.spawn([process.execPath, "-e", harness], {
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    expect({ exitCode, stderr }).toEqual({ exitCode: 0, stderr: "" });
    const refusal = `Error: Native adoption locks unavailable on ${unsupportedPlatform}`;
    expect(JSON.parse(stdout)).toEqual({
      withSharedAdoptionLock: refusal,
      withExclusiveAdoptionLock: refusal,
      withExclusiveMirrorWriterLock: refusal,
    });
    await expect(lstat(join(repoRoot, ".kibi"))).rejects.toMatchObject({
      code: "ENOENT",
    });
    await expect(lstat(marker)).rejects.toMatchObject({ code: "ENOENT" });
  },
);

nativeTest(
  "Given an exclusive adoption swap When a shared reader starts during the swap Then it observes only the post-swap snapshot",
  async () => {
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
  },
);

nativeTest(
  "Given a symlinked global lock path When automatic locking starts Then it rejects without following the link",
  async () => {
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
  },
);

nativeTest(
  "Given concurrent standalone mirror writers When the first writer holds its lock Then the second writer waits for release",
  async () => {
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
    if (releaseFirst === undefined)
      throw new Error("first writer did not hold");
    releaseFirst();
    await first;
    await second;
    expect(secondEntered).toBe(true);
  },
);

nativeTest(
  "Given a symlinked mirror writer lock path When standalone mirror writing starts Then it rejects without following the link",
  async () => {
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
  },
);

nativeTest(
  "Given a lock path replaced after descriptor validation When exclusive locking starts Then flock keeps the validated descriptor",
  async () => {
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
  },
);

nativeTest(
  "Given a permissive lock file When locking starts Then it rejects the private-mode violation",
  async () => {
    // Given
    const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
    roots.push(repoRoot);
    await mkdir(join(repoRoot, ".kibi"), { mode: 0o700 });
    const lockPath = join(repoRoot, ".kibi", "adoption.lock");
    // The file belongs to this process but allows group/other access.
    await writeFile(lockPath, "lock\n", { mode: 0o777 });

    // When
    const settled = await settle(
      withExclusiveAdoptionLock(repoRoot, async () => undefined),
    );

    // Then
    expect(settled.ok).toBe(false);
    expect(String(settled.error)).toContain("not private");
  },
);

nativeTest(
  "Given a lock file with group-other permissions When locking starts Then it rejects the lock",
  async () => {
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
  },
);

nativeTest(
  "Given a .kibi directory with group-other permissions When locking starts Then it rejects the directory",
  async () => {
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
  },
);
