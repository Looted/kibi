import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { durableNoReplace } from "../adoption-durable";
import { type DurableFault, recoverNoReplaceIntents } from "../adoption-intent";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0))
    await rm(root, { recursive: true, force: true });
});

test("Given a crash immediately after a no-replace link When its bound intent is recovered Then the dual hardlink is finalized without accepting drift", async () => {
  // Given
  const repoRoot = await mkdtemp(join(tmpdir(), "skillopt-durable-fault-"));
  roots.push(repoRoot);
  const path = join(repoRoot, "receipt.json");
  const fault: DurableFault = async (operation) => {
    if (operation === "link") throw new Error("crash:link");
  };

  // When
  await expect(
    durableNoReplace(repoRoot, path, "receipt\n", undefined, fault),
  ).rejects.toThrow("crash:link");
  await recoverNoReplaceIntents(repoRoot);

  // Then
  await expect(readFile(path, "utf8")).resolves.toBe("receipt\n");
});
