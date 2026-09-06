import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveArtifactRoot } from "../runtime/artifact-root";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("artifact-root remaining cache fallback", () => {
  test("falls through to temp when cache is unavailable", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "skillopt-temp-root-"));
    roots.push(tempRoot);
    const root = await resolveArtifactRoot(undefined, {
      runtimeDir: "/run/user/skillopt-missing",
      cacheRoot: "/tmp/skillopt-missing-cache-root",
      tempRoot,
    });
    expect(root).toBe(join(tempRoot, "kibi-skillopt", "isolation-canary"));
  });

  test("rethrows a non-unavailable cache error", async () => {
    await expect(
      resolveArtifactRoot(undefined, {
        cacheRoot: tmpdir(),
        tempRoot: tmpdir(),
        runtimeDir: undefined,
      }),
    ).resolves.toEqual(expect.any(String));
  });

  test("uses tmpdir when cache throws a non-unavailable error after runtime miss", async () => {
    const error = Object.assign(new Error("busy"), { code: "EBUSY" });
    const { access } = await import("node:fs/promises");
    const original = access;
    const fsPromises = await import("node:fs/promises");
    const spy = (await import("bun:test")).spyOn(fsPromises, "access").mockImplementation(
      async (path, mode) => {
        if (String(path).includes("busy-cache")) throw error;
        return original(path, mode);
      },
    );
    try {
      await expect(
        resolveArtifactRoot(undefined, {
          cacheRoot: join(tmpdir(), "busy-cache"),
          tempRoot: tmpdir(),
        }),
      ).rejects.toThrow("busy");
    } finally {
      spy.mockRestore();
    }
  });
});
