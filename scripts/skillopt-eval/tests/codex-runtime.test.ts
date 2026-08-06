import { afterEach, describe, expect, test } from "bun:test";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createCodexRuntimeLease,
  stageCodexRuntime,
} from "../runtime/codex-runtime";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

async function fakeExecutables(root: string) {
  const installed = join(root, "installed");
  const codex = join(installed, "bin/codex");
  const bwrap = join(installed, "codex-resources/bwrap");
  await mkdir(join(installed, "bin"), { recursive: true });
  await mkdir(join(installed, "codex-resources"), { recursive: true });
  await writeFile(codex, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  await writeFile(bwrap, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
  await chmod(codex, 0o500);
  await chmod(bwrap, 0o500);
  return { codex, bwrap };
}

describe("staged Codex runtime", () => {
  test("copies Codex and bwrap to absolute private executable paths", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-runtime-stage-"));
    roots.push(root);
    const source = await fakeExecutables(root);
    const staged = await stageCodexRuntime(join(root, "target"), {
      codexExecutable: source.codex,
    });

    expect(staged.codexExecutable).toBe(join(root, "target/codex"));
    expect(staged.bwrapExecutable).toBe(
      join(root, "target/codex-resources/bwrap"),
    );
    expect(await readFile(staged.codexExecutable, "utf8")).toContain("exit 0");
    expect((await stat(staged.codexExecutable)).mode & 0o777).toBe(0o500);
    expect((await stat(staged.bwrapExecutable)).mode & 0o777).toBe(0o500);
  });

  test("cleans the once-per-run runtime lease and makes cleanup idempotent", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-runtime-lease-"));
    roots.push(root);
    const source = await fakeExecutables(root);
    const lease = await createCodexRuntimeLease(
      { artifactRoot: root },
      { codexExecutable: source.codex },
    );

    expect(await stat(lease.codexExecutable)).toBeDefined();
    await lease.cleanup();
    await lease.cleanup();
    await expect(stat(lease.root)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
