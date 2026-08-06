import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sourceWorktreeIsClean } from "../preflight";

test("SkillOpt preflight treats an untracked source file as dirty", async () => {
  // Given
  const root = await mkdtemp(join(tmpdir(), "skillopt-preflight-source-"));
  try {
    const init = Bun.spawn(["git", "init", "--quiet", root], {
      env: { ...process.env, GIT_MASTER: "1" },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(await init.exited).toBe(0);
    await writeFile(join(root, "untracked.txt"), "dirty\n");

    // When
    const clean = await sourceWorktreeIsClean(root, process.env);

    // Then
    expect(clean).toBe(false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
