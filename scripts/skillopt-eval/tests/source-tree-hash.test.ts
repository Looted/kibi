import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  hashAuthorizedSourceTree,
  sourceTreeHashMain,
} from "../source-tree-hash";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

async function git(root: string, args: readonly string[]): Promise<void> {
  const process = Bun.spawn(["git", ...args], {
    cwd: root,
    stderr: "pipe",
    stdout: "pipe",
  });
  expect(await process.exited).toBe(0);
}

async function createCleanSource(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "skillopt-source-tree-"));
  roots.push(root);
  await git(root, ["init", "--quiet"]);
  await git(root, ["config", "user.email", "skillopt@example.test"]);
  await git(root, ["config", "user.name", "SkillOpt test"]);
  await writeFile(join(root, "tracked.txt"), "first byte sequence\n");
  await writeFile(join(root, "ignored.txt"), "ignored source\n");
  await writeFile(join(root, ".gitignore"), "ignored.txt\n");
  await git(root, ["add", "tracked.txt", ".gitignore"]);
  await git(root, ["commit", "--quiet", "-m", "source fixture"]);
  return root;
}

describe("SkillOpt authorized source tree hash", () => {
  test("Given unchanged tracked source bytes When hashed twice Then the descriptor is stable", async () => {
    // Given
    const root = await createCleanSource();

    // When
    const first = await hashAuthorizedSourceTree(root);
    const second = await hashAuthorizedSourceTree(root);

    // Then
    expect(first).toEqual(second);
    expect(first.files).toBe(2);
  });

  test("Given a committed tracked byte change When hashed Then the descriptor changes", async () => {
    // Given
    const root = await createCleanSource();
    const before = await hashAuthorizedSourceTree(root);
    await writeFile(join(root, "tracked.txt"), "second byte sequence\n");
    await git(root, ["add", "tracked.txt"]);
    await git(root, ["commit", "--quiet", "-m", "byte drift"]);

    // When
    const after = await hashAuthorizedSourceTree(root);

    // Then
    expect(after.sha256).not.toBe(before.sha256);
  });

  test("Given an uncommitted tracked edit When hashed Then dirty drift is rejected", async () => {
    // Given
    const root = await createCleanSource();
    await writeFile(join(root, "tracked.txt"), "uncommitted byte drift\n");

    // When
    const attempt = hashAuthorizedSourceTree(root);

    // Then
    await expect(attempt).rejects.toThrow("source-worktree-dirty");
  });

  test("Given a root path with traversal When hashed Then it is rejected", async () => {
    // Given
    const root = await createCleanSource();

    // When
    const attempt = hashAuthorizedSourceTree(`${root}/../escape`);

    // Then
    await expect(attempt).rejects.toThrow("path-traversal");
  });

  test("Given a tracked symlink When hashed Then it is rejected", async () => {
    // Given
    const root = await createCleanSource();
    await symlink("tracked.txt", join(root, "linked.txt"));
    await git(root, ["add", "linked.txt"]);
    await git(root, ["commit", "--quiet", "-m", "linked source"]);

    // When
    const attempt = hashAuthorizedSourceTree(root);

    // Then
    await expect(attempt).rejects.toThrow("source-tree-symlink");
  });

  test("Given the F3 CLI arguments When source hash runs Then it writes the requested descriptor", async () => {
    // Given
    const root = await createCleanSource();
    const output = join(dirname(root), `${root.split("/").at(-1)}.json`);
    roots.push(output);

    // When
    const exitCode = await sourceTreeHashMain([
      "--root",
      root,
      "--output",
      output,
    ]);

    // Then
    expect(exitCode).toBe(0);
    expect(JSON.parse(await Bun.file(output).text())).toMatchObject({
      root,
      files: 2,
    });
  });

  test("Given an output within the source root When F3 hashing runs Then it refuses source mutation", async () => {
    // Given
    const root = await createCleanSource();
    const before = await hashAuthorizedSourceTree(root);
    const output = join(root, "source-tree.json");

    // When
    const exitCode = await sourceTreeHashMain([
      "--root",
      root,
      "--output",
      output,
    ]);

    // Then
    expect(exitCode).toBe(2);
    expect(await hashAuthorizedSourceTree(root)).toEqual(before);
  });
});
