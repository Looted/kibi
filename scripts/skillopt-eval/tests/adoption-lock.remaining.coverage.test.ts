import { afterEach, expect, test } from "bun:test";
import { link, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { withExclusiveAdoptionLock } from "../adoption-lock";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
  if (process.exitCode === 1) process.exitCode = 0;
});

test("Given a hardlinked adoption lock When exclusive locking starts Then it rejects inode drift", async () => {
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-nlink-"));
  roots.push(repoRoot);
  const stateRoot = join(repoRoot, ".kibi");
  await mkdir(stateRoot, { mode: 0o700 });
  const lockPath = join(stateRoot, "adoption.lock");
  await writeFile(lockPath, "lock", { mode: 0o600 });
  await link(lockPath, join(stateRoot, "adoption.lock.hard"));

  let error: unknown;
  try {
    await withExclusiveAdoptionLock(repoRoot, async () => undefined);
  } catch (caught) {
    error = caught;
  }
  expect(String(error)).toContain("adoption lock inode drift");
});
