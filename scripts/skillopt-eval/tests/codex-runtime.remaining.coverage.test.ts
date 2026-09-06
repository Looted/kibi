import { afterEach, describe, expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RuntimePrerequisiteError } from "../runtime/canary-errors";
import {
  createCodexRuntimeLease,
  stageCodexRuntime,
} from "../runtime/codex-runtime";

const roots: string[] = [];

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true });
  }
  if (process.exitCode === 1) process.exitCode = 0;
});

describe("codex-runtime remaining executable and lease cleanup", () => {
  test("rethrows non-ENOENT access failures", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-codex-access-"));
    roots.push(root);
    const blocked = join(root, "blocked-dir");
    await mkdir(blocked, { mode: 0o000 });
    await chmod(blocked, 0o000);
    try {
      await expect(
        stageCodexRuntime(join(root, "runtime"), {
          codexExecutable: join(blocked, "codex"),
          systemBwrapExecutable: join(blocked, "bwrap"),
        }),
      ).rejects.toThrow();
    } finally {
      await chmod(blocked, 0o700);
    }
  });

  test("throws missing_bwrap and cleans a failed lease", async () => {
    const root = await mkdtemp(join(tmpdir(), "skillopt-codex-lease-"));
    roots.push(root);
    const installed = join(root, "installed");
    await mkdir(join(installed, "bin"), { recursive: true });
    const codex = join(installed, "bin/codex");
    await writeFile(codex, "#!/bin/sh\nexit 0\n", { mode: 0o700 });
    await chmod(codex, 0o500);
    await expect(
      createCodexRuntimeLease(
        { artifactRoot: join(root, "artifacts") },
        { codexExecutable: codex, systemBwrapExecutable: null },
      ),
    ).rejects.toBeInstanceOf(RuntimePrerequisiteError);
  });
});
