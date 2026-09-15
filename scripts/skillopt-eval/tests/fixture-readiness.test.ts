import { afterEach, expect, test } from "bun:test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { probeFixtureReadiness } from "../fixture-readiness";
import {
  setupSeededFreshKb,
  stopFixtureEngine,
} from "../runtime/fixture-kb-setup";

const roots: string[] = [];

async function runBounded(
  argv: readonly string[],
  cwd: string,
  timeoutMs: number,
): Promise<Readonly<{ exitCode: number; stdout: string; stderr: string }>> {
  const child = Bun.spawn([...argv], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  });
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  const [exitCode, stdout, stderr] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);
  clearTimeout(timeout);
  return {
    exitCode: timedOut ? -1 : exitCode,
    stdout,
    stderr,
  };
}

async function ensureCliBuild(): Promise<string> {
  const repository = resolve(import.meta.dir, "../../../");
  const cliRoot = join(repository, "packages", "cli");
  const cliEntry = join(cliRoot, "dist", "cli.js");
  if (!(await Bun.file(cliEntry).exists())) {
    const result = await runBounded(
      [process.execPath, "run", "build:cli"],
      repository,
      120_000,
    );
    if (result.exitCode !== 0) {
      throw new Error(`CLI build failed: ${result.stderr || result.stdout}`);
    }
  }
  return cliRoot;
}
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("seeded readiness probe stops and removes its workspace on success or setup failure", async () => {
  for (const fails of [false, true]) {
    const root = await mkdtemp(join(tmpdir(), "skillopt-readiness-test-"));
    roots.push(root);
    const workspace = join(root, "probe");
    const events: string[] = [];
    const promise = probeFixtureReadiness(workspace, "/trusted/cli", {
      setup: async (path, cli) => {
        expect(path).toBe(workspace);
        expect(cli).toBe("/trusted/cli");
        events.push("setup");
        await writeFile(join(path, "fixture.txt"), "synthetic fixture");
        if (fails) throw new Error("synthetic_prolog_crash");
      },
      stop: async (path) => {
        expect(path).toBe(workspace);
        events.push("stop");
      },
    });
    if (fails) await expect(promise).rejects.toThrow("synthetic_prolog_crash");
    else await promise;
    expect(events).toEqual(["setup", "stop"]);
    await expect(access(workspace)).rejects.toThrow();
  }
});

test("readiness refuses an existing workspace without executing setup or cleanup", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-readiness-existing-"));
  roots.push(root);
  const workspace = join(root, "probe");
  await mkdir(workspace);
  await expect(
    probeFixtureReadiness(workspace, "/trusted/cli", {
      setup: async () => {
        throw new Error("must_not_setup");
      },
      stop: async () => {
        throw new Error("must_not_stop");
      },
    }),
  ).rejects.toThrow("EEXIST");
  await access(workspace);
});

test("seeded readiness has zero kb_check violations through the CLI", async () => {
  const root = await mkdtemp(join(tmpdir(), "skillopt-readiness-cli-"));
  roots.push(root);
  const cliRoot = await ensureCliBuild();

  await probeFixtureReadiness(join(root, "probe"), cliRoot, {
    setup: async (workspace, cli) => {
      await setupSeededFreshKb(workspace, cli);
      const result = await runBounded(
        [
          process.execPath,
          join(cli, "dist", "cli.js"),
          "check",
          "--format",
          "json",
        ],
        workspace,
        30_000,
      );
      expect(result.exitCode).toBe(0);
      const check = JSON.parse(result.stdout) as {
        structuredContent?: { violations?: unknown[] };
      };
      expect(check.structuredContent?.violations).toEqual([]);
    },
    stop: stopFixtureEngine,
  });
});
