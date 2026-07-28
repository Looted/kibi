import { afterEach, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  withExclusiveAdoptionLock,
  withSharedAdoptionLock,
} from "../adoption-lock";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

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
  await expect(reader).resolves.toBe("post");
});

test("Given a symlinked global lock path When automatic locking starts Then it rejects without following the link", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-adoption-lock-"));
  roots.push(repoRoot);
  const outside = join(repoRoot, "outside.lock");
  await mkdir(join(repoRoot, ".kibi"));
  await writeFile(outside, "lock");
  await symlink(outside, join(repoRoot, ".kibi/adoption.lock"));

  // When
  const attempt = withExclusiveAdoptionLock(repoRoot, async () => undefined);

  // Then
  await expect(attempt).rejects.toThrow("symlink");
});
