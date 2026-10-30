// implements REQ-kibi-anonymous-usage-telemetry
import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const KIBI_BIN = path.resolve(import.meta.dir, "../bin/kibi");
const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

type Batch = {
  api_key: string;
  batch: { properties: Record<string, unknown> }[];
};

function temporaryDirectory(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(directory);
  return directory;
}

/** A local stand-in for the PostHog batch endpoint. */
function startCollector(): { url: string; batches: Batch[]; stop: () => void } {
  const batches: Batch[] = [];
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    async fetch(request) {
      if (new URL(request.url).pathname === "/batch/") {
        batches.push((await request.json()) as Batch);
      }
      return Response.json({ status: 1 });
    },
  });
  return {
    url: `http://127.0.0.1:${server.port}`,
    batches,
    stop: () => server.stop(true),
  };
}

/**
 * Runs the real kibi binary in a clean environment. KIBI_TELEMETRY=1 is the
 * only way to turn telemetry on under a test runner or in CI.
 */
async function runKibi(
  args: string[],
  cwd: string,
  env: Record<string, string>,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const child = Bun.spawn(["node", KIBI_BIN, ...args], {
    cwd,
    env: { PATH: process.env.PATH ?? "", HOME: cwd, ...env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { exitCode, stdout, stderr };
}

/** Seeds one event old enough that the next command's flush is due. */
function seedDueQueue(directory: string): void {
  const event = {
    event: "kibi_operation",
    timestamp: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
    properties: { distinct_id: "seed", operation: "seed" },
  };
  fs.writeFileSync(
    path.join(directory, "telemetry-queue.jsonl"),
    `${JSON.stringify(event)}\n`,
  );
}

describe("kibi CLI anonymous usage telemetry (end to end)", () => {
  test("a CLI command sends its summary event to the telemetry host and leaves the workspace out", async () => {
    const workspace = temporaryDirectory("kibi-telem-private-repo-");
    const state = temporaryDirectory("kibi-telem-state-");
    const collector = startCollector();
    try {
      const env = {
        KIBI_TELEMETRY: "1",
        KIBI_TELEMETRY_DIR: state,
        KIBI_TELEMETRY_HOST: collector.url,
      };
      const status = await runKibi(
        ["telemetry", "status", "--format", "json"],
        workspace,
        env,
      );
      expect(status.exitCode).toBe(0);
      expect(JSON.parse(status.stdout)).toMatchObject({ enabled: true });

      seedDueQueue(state);
      const first = await runKibi(["status"], workspace, env);
      const second = await runKibi(["status"], workspace, env);
      const notices = [first.stderr, second.stderr].filter((text) =>
        text.includes("anonymous usage statistics"),
      );
      expect(notices).toHaveLength(1);
      expect(notices[0]).toContain("kibi telemetry disable");

      expect(collector.batches).toHaveLength(1);
      const sent = collector.batches[0];
      expect(sent?.api_key).toStartWith("phc_");
      const operations = sent?.batch.map((event) => event.properties);
      expect(operations?.[1]).toMatchObject({
        package: "kibi-cli",
        interface: "cli",
        operation: "status",
        exit_code: first.exitCode,
      });
      const payload = JSON.stringify(sent);
      expect(payload).not.toContain(workspace);
      expect(payload).not.toContain("private-repo");
    } finally {
      collector.stop();
    }
  });

  test("kibi telemetry disable, KIBI_TELEMETRY=0 and a harness home stop recording and sending", async () => {
    const workspace = temporaryDirectory("kibi-telem-off-");
    const collector = startCollector();
    try {
      const disabledState = temporaryDirectory("kibi-telem-disabled-");
      // A real home: under the temp directory telemetry is off by default.
      const disabledEnv = {
        HOME: os.homedir(),
        KIBI_TELEMETRY_DIR: disabledState,
        KIBI_TELEMETRY_HOST: collector.url,
      };
      seedDueQueue(disabledState);
      const disable = await runKibi(
        ["telemetry", "disable"],
        workspace,
        disabledEnv,
      );
      expect(disable.exitCode).toBe(0);
      expect(fs.readdirSync(disabledState)).toEqual(["telemetry.json"]);
      await runKibi(["status"], workspace, disabledEnv);
      expect(fs.readdirSync(disabledState)).toEqual(["telemetry.json"]);

      const offState = temporaryDirectory("kibi-telem-env-off-");
      seedDueQueue(offState);
      const off = await runKibi(["status"], workspace, {
        HOME: os.homedir(),
        KIBI_TELEMETRY: "0",
        KIBI_TELEMETRY_DIR: offState,
        KIBI_TELEMETRY_HOST: collector.url,
      });
      expect(off.stderr).not.toContain("anonymous usage statistics");

      // An eval or packaging harness gives each run a temp home: off.
      const sandboxState = temporaryDirectory("kibi-telem-sandbox-");
      seedDueQueue(sandboxState);
      const sandboxEnv = {
        KIBI_TELEMETRY_DIR: sandboxState,
        KIBI_TELEMETRY_HOST: collector.url,
      };
      const sandboxStatus = await runKibi(
        ["telemetry", "status", "--format", "json"],
        workspace,
        sandboxEnv,
      );
      expect(JSON.parse(sandboxStatus.stdout)).toMatchObject({
        enabled: false,
        reason: "sandboxed home in the temp directory (harness run)",
      });
      await runKibi(["status"], workspace, sandboxEnv);
      expect(collector.batches).toEqual([]);
    } finally {
      collector.stop();
    }
  });
});
