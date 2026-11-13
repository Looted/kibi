import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { fixtureCliEnv } from "../runtime/fixture-kb-setup";
import { runBoundedProcess } from "../runtime/process";
import { harnessChildEnv } from "../runtime/telemetry-env";

const KIBI_BIN = path.resolve(import.meta.dir, "../../../packages/cli/bin/kibi");
const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function temporaryDirectory(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(directory);
  return directory;
}

function queued(state: string): number {
  const file = path.join(state, "telemetry-queue.jsonl");
  return fs.existsSync(file)
    ? fs.readFileSync(file, "utf8").split("\n").filter(Boolean).length
    : 0;
}

describe("harness child environment", () => {
  test("turns Kibi telemetry off and keeps the rest", () => {
    expect(harnessChildEnv({ PATH: "/bin", KIBI_TELEMETRY: "1" })).toEqual({
      PATH: "/bin",
      KIBI_TELEMETRY: "0",
    });
  });

  test("a Kibi CLI run in a fixture environment queues no telemetry (end to end)", async () => {
    const workspace = temporaryDirectory("kibi-harness-fixture-");
    spawnSync("git", ["init", "-q", "-b", "main"], { cwd: workspace });
    const run = (env: NodeJS.ProcessEnv, state: string) =>
      spawnSync("node", [KIBI_BIN, "status"], {
        cwd: workspace,
        env: {
          ...env,
          KIBI_TELEMETRY_DIR: state,
          KIBI_TELEMETRY_HOST: "http://127.0.0.1:9",
        },
        encoding: "utf8",
      });
    // The same run outside the harness queues an event, so the check below
    // can tell the two apart.
    const control = temporaryDirectory("kibi-harness-control-");
    run({ ...process.env, KIBI_TELEMETRY: "1" }, control);
    expect(queued(control)).toBeGreaterThan(0);

    // The operator's own environment asks for telemetry; the harness still
    // turns it off for its children.
    const previous = process.env.KIBI_TELEMETRY;
    process.env.KIBI_TELEMETRY = "1";
    try {
      const state = temporaryDirectory("kibi-harness-state-");
      const env = fixtureCliEnv(workspace);
      expect(env.KIBI_TELEMETRY).toBe("0");
      expect(env.KIBI_WORKSPACE).toBe(workspace);
      run(env, state);
      expect(queued(state)).toBe(0);

      const child = await runBoundedProcess({
        argv: [
          process.execPath,
          "-e",
          "process.stdout.write(String(process.env.KIBI_TELEMETRY))",
        ],
        cwd: workspace,
        env: { ...process.env },
        timeoutMs: 20_000,
      });
      expect(child.exitCode).toBe(0);
      expect(child.stdout).toBe("0");
    } finally {
      if (previous === undefined) delete process.env.KIBI_TELEMETRY;
      else process.env.KIBI_TELEMETRY = previous;
    }
  }, 120_000);
});
