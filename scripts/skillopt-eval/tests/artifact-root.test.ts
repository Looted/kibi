import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  resolveArtifactRoot,
  resolveIsolationArtifactRoot,
} from "../runtime/artifact-root";

describe("SkillOpt artifact root", () => {
  test("falls back to a writable user cache when XDG runtime is unavailable", async () => {
    const cacheRoot = await mkdtemp(join(tmpdir(), "skillopt-cache-root-"));

    try {
      const root = await resolveArtifactRoot(undefined, {
        runtimeDir: "/run/user/skillopt-missing",
        cacheRoot,
        tempRoot: tmpdir(),
      });
      expect(root).toBe(join(cacheRoot, "kibi-skillopt", "isolation-canary"));
    } finally {
      await rm(cacheRoot, { recursive: true, force: true });
    }
  });

  test("preserves an explicit artifact root", async () => {
    const root = await resolveArtifactRoot("/var/lib/skillopt-artifacts");
    expect(root).toBe("/var/lib/skillopt-artifacts");
  });

  test("routes artifact roots nested under the source worktree outside isolation", () => {
    const root = resolveIsolationArtifactRoot(
      "/workspace/project/artifacts/skillopt/run-1",
      "/workspace/project",
      tmpdir(),
    );

    expect(root).toBe(join(tmpdir(), "kibi-skillopt", "isolation"));
  });
});
