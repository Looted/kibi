import { afterEach, expect, test } from "bun:test";
import { readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import {
  createPreflightFixture,
  invokePreflight,
  updateProbe,
} from "./preflight-fixture";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("fixture sentinel seam proves rejected primitives stop before runtime spawn", async () => {
  // Given
  const rejected = await createPreflightFixture();
  const qualified = await createPreflightFixture();
  roots.push(rejected.root, qualified.root);
  await updateProbe(rejected, (probe) => ({ ...probe, pidfd: false }));
  const rejectedSentinel = join(rejected.root, "spawn.log");
  const qualifiedSentinel = join(qualified.root, "spawn.log");

  // When
  const [rejectedResult, qualifiedResult] = await Promise.all([
    invokePreflight(rejected, {
      env: { KIBI_SKILLOPT_TEST_SPAWN_SENTINEL: rejectedSentinel },
    }),
    invokePreflight(qualified, {
      env: { KIBI_SKILLOPT_TEST_SPAWN_SENTINEL: qualifiedSentinel },
    }),
  ]);

  // Then
  expect(rejectedResult.exitCode).not.toBe(0);
  expect(qualifiedResult.exitCode).toBe(0);
  expect(await readOptional(rejectedSentinel)).toBe("");
  expect(await readOptional(qualifiedSentinel)).toBe("spawn-boundary\n");
});

async function readOptional(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT")
      return "";
    throw error;
  }
}
