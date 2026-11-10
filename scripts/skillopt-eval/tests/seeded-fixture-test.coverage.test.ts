import { afterEach, expect, test } from "bun:test";
import { mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runSeededFixtureTest } from "../runtime/fixture-kb-setup";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
});

async function workspaceWith(source: string): Promise<string> {
  const root = await realpath(
    await mkdtemp(join(tmpdir(), "skillopt-seeded-test-")),
  );
  roots.push(root);
  await writeFile(join(root, "seed.test.ts"), source);
  return root;
}

test("a passing seeded fixture test resolves", async () => {
  const workspace = await workspaceWith(
    'import { expect, test } from "bun:test";\ntest("ok", () => expect(1).toBe(1));\n',
  );
  await runSeededFixtureTest(workspace, "./seed.test.ts");
});

test("a seeded fixture test that never finishes is killed and reported", async () => {
  const workspace = await workspaceWith(
    'import { test } from "bun:test";\ntest("hang", () => new Promise(() => {}), 60_000);\n',
  );
  await expect(
    runSeededFixtureTest(workspace, "./seed.test.ts", 300),
  ).rejects.toThrow("seeded fixture test failed (timed out)");
});
