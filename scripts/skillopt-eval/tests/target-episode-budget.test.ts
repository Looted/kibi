import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  MAX_TARGET_EPISODES_ENV,
  TARGET_EPISODE_BUDGET_ROOT_ENV,
  initializeTargetEpisodeBudget,
  readTargetEpisodeBudget,
  reserveTargetEpisode,
} from "../target-episode-budget";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

async function artifactRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

describe("target episode budget", () => {
  test("allows the old path when neither budget variable is configured", async () => {
    const env = {};

    expect(await reserveTargetEpisode(env, process.cwd())).toBeUndefined();
    expect(await readTargetEpisodeBudget(env, process.cwd())).toBeUndefined();
  });

  test("rejects partial and invalid configuration", async () => {
    const root = await artifactRoot("skillopt-budget-invalid-");

    await expect(
      reserveTargetEpisode(
        { [TARGET_EPISODE_BUDGET_ROOT_ENV]: root },
        process.cwd(),
      ),
    ).rejects.toThrow("target_episode_budget_partial_config");
    await expect(
      reserveTargetEpisode({ [MAX_TARGET_EPISODES_ENV]: "64" }, process.cwd()),
    ).rejects.toThrow("target_episode_budget_partial_config");
    await expect(
      reserveTargetEpisode(
        {
          [TARGET_EPISODE_BUDGET_ROOT_ENV]: root,
          [MAX_TARGET_EPISODES_ENV]: "0",
        },
        process.cwd(),
      ),
    ).rejects.toThrow("target_episode_budget_invalid_limit");
    await expect(
      reserveTargetEpisode(
        {
          [TARGET_EPISODE_BUDGET_ROOT_ENV]: root,
          [MAX_TARGET_EPISODES_ENV]: "257",
        },
        process.cwd(),
      ),
    ).rejects.toThrow("target_episode_budget_invalid_limit");
  });

  test("requires a private canonical root", async () => {
    const target = await artifactRoot("skillopt-budget-target-");
    const link = join(
      await artifactRoot("skillopt-budget-link-parent-"),
      "root",
    );
    await symlink(target, link);

    await expect(initializeTargetEpisodeBudget(link, 64)).rejects.toThrow(
      "artifact root symlink",
    );

    const worldWritable = await artifactRoot("skillopt-budget-world-");
    await chmod(worldWritable, 0o777);
    await expect(
      initializeTargetEpisodeBudget(worldWritable, 64),
    ).rejects.toThrow("private");
  });

  test("reserves atomically across concurrent callers without overspending", async () => {
    const root = await artifactRoot("skillopt-budget-parallel-");
    const env = await initializeTargetEpisodeBudget(root, 2);

    const results = await Promise.allSettled(
      Array.from({ length: 8 }, () => reserveTargetEpisode(env, process.cwd())),
    );

    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(2);
    expect(
      results
        .filter((result) => result.status === "rejected")
        .every(
          (result) =>
            result.reason instanceof Error &&
            result.reason.message === "target_episode_budget_exhausted",
        ),
    ).toBe(true);
    expect(await readTargetEpisodeBudget(env, process.cwd())).toMatchObject({
      limit: 2,
      reservedCount: 2,
      remainingCount: 0,
    });
  });

  test("does not reset a spent budget when initialized again", async () => {
    const root = await artifactRoot("skillopt-budget-no-reset-");
    const env = await initializeTargetEpisodeBudget(root, 3);
    await reserveTargetEpisode(env, process.cwd());

    const same = await initializeTargetEpisodeBudget(root, 3);
    expect(await readTargetEpisodeBudget(same, process.cwd())).toMatchObject({
      limit: 3,
      reservedCount: 1,
      remainingCount: 2,
    });
    await expect(initializeTargetEpisodeBudget(root, 4)).rejects.toThrow(
      "target_episode_budget_file_mismatch",
    );
  });
});
