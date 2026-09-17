import { afterEach, expect, test } from "bun:test";
import { lstat, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  withExclusiveAdoptionLock,
  withExclusiveMirrorWriterLock,
  withSharedAdoptionLock,
} from "../adoption-lock";

const roots: string[] = [];
const linuxTest = test.skipIf(process.platform !== "linux");

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

async function waitForFile(path: string): Promise<void> {
  const deadline = performance.now() + 3_000;
  for (;;) {
    try {
      await lstat(path);
      return;
    } catch {
      if (performance.now() >= deadline)
        throw new Error(`timed out waiting for ${path}`);
      await Bun.sleep(10);
    }
  }
}

linuxTest("shared adoption locks coexist", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-shared-"));
  roots.push(repoRoot);
  let releaseFirst: (() => void) | undefined;
  let firstStarted: (() => void) | undefined;
  let secondEntered = false;
  const started = new Promise<void>((resolve) => {
    firstStarted = resolve;
  });

  const first = withSharedAdoptionLock(repoRoot, async () => {
    firstStarted?.();
    await new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
  });
  await started;
  const second = withSharedAdoptionLock(repoRoot, async () => {
    secondEntered = true;
  });

  await second;
  expect(secondEntered).toBe(true);
  releaseFirst?.();
  await first;
});

linuxTest.each([
  ["exclusive adoption blocks shared", "exclusive", "shared"],
  ["shared adoption blocks exclusive", "shared", "exclusive"],
] as const)("%s", async (_name, firstMode, secondMode) => {
  const repoRoot = await mkdtemp(
    join(tmpdir(), "skillopt-adoption-contention-"),
  );
  roots.push(repoRoot);
  let releaseFirst: (() => void) | undefined;
  let firstStarted: (() => void) | undefined;
  let secondEntered = false;
  const started = new Promise<void>((resolve) => {
    firstStarted = resolve;
  });
  const first =
    firstMode === "exclusive"
      ? withExclusiveAdoptionLock(repoRoot, async () => {
          firstStarted?.();
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          });
        })
      : withSharedAdoptionLock(repoRoot, async () => {
          firstStarted?.();
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          });
        });

  await started;
  const second =
    secondMode === "exclusive"
      ? withExclusiveAdoptionLock(repoRoot, async () => {
          secondEntered = true;
        })
      : withSharedAdoptionLock(repoRoot, async () => {
          secondEntered = true;
        });
  await Bun.sleep(30);
  expect(secondEntered).toBe(false);
  releaseFirst?.();
  await first;
  await second;
  expect(secondEntered).toBe(true);
});

linuxTest("an operation exception releases the adoption lock", async () => {
  const repoRoot = await mkdtemp(
    join(tmpdir(), "skillopt-adoption-exception-"),
  );
  roots.push(repoRoot);
  await expect(
    withExclusiveAdoptionLock(repoRoot, async () => {
      throw new Error("operation failed");
    }),
  ).rejects.toThrow("operation failed");

  await expect(
    withSharedAdoptionLock(repoRoot, async () => "released"),
  ).resolves.toBe("released");
});

linuxTest(
  "an exclusive adoption lock blocks the writer lock sequence",
  async () => {
    const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-writer-"));
    roots.push(repoRoot);
    let releaseAdoption: (() => void) | undefined;
    let adoptionStarted: (() => void) | undefined;
    let writerEntered = false;
    const started = new Promise<void>((resolve) => {
      adoptionStarted = resolve;
    });
    const adoption = withExclusiveAdoptionLock(repoRoot, async () => {
      adoptionStarted?.();
      await new Promise<void>((resolve) => {
        releaseAdoption = resolve;
      });
    });
    await started;

    const writer = withSharedAdoptionLock(repoRoot, async () =>
      withExclusiveMirrorWriterLock(repoRoot, async () => {
        writerEntered = true;
      }),
    );
    await Bun.sleep(30);
    expect(writerEntered).toBe(false);
    releaseAdoption?.();
    await adoption;
    await writer;
    expect(writerEntered).toBe(true);
  },
);

linuxTest(
  "a terminated process releases an exclusive adoption lock",
  async () => {
    const repoRoot = await mkdtemp(
      join(tmpdir(), "skillopt-adoption-process-"),
    );
    roots.push(repoRoot);
    const marker = join(repoRoot, "child-locked");
    const lockModule = new URL("../adoption-lock.ts", import.meta.url).href;
    const harness = `
    import { writeFile } from "node:fs/promises";
    import { withExclusiveAdoptionLock } from ${JSON.stringify(lockModule)};
    await withExclusiveAdoptionLock(${JSON.stringify(repoRoot)}, async () => {
      await writeFile(${JSON.stringify(marker)}, "locked");
      await new Promise(() => {});
    });
  `;
    const child = Bun.spawn([process.execPath, "-e", harness], {
      cwd: process.cwd(),
      stdout: "ignore",
      stderr: "pipe",
    });

    try {
      await waitForFile(marker);
      let entered = false;
      const contender = withSharedAdoptionLock(repoRoot, async () => {
        entered = true;
      });
      await Bun.sleep(30);
      expect(entered).toBe(false);
      child.kill();
      await child.exited;
      await contender;
      expect(entered).toBe(true);
    } finally {
      child.kill();
      await child.exited;
    }
  },
);

linuxTest("mirror writers serialize independently", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-mirror-contention-"));
  roots.push(repoRoot);
  let releaseFirst: (() => void) | undefined;
  let firstStarted: (() => void) | undefined;
  let secondEntered = false;
  const started = new Promise<void>((resolve) => {
    firstStarted = resolve;
  });
  const first = withExclusiveMirrorWriterLock(repoRoot, async () => {
    firstStarted?.();
    await new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
  });
  await started;
  const second = withExclusiveMirrorWriterLock(repoRoot, async () => {
    secondEntered = true;
  });
  await Bun.sleep(30);
  expect(secondEntered).toBe(false);
  releaseFirst?.();
  await first;
  await second;
  expect(secondEntered).toBe(true);
});
