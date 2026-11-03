// implements REQ-kibi-telemetry-expected-outcomes
import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
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

function temporaryDirectory(prefix: string): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temporaryRoots.push(directory);
  return directory;
}

type Batch = { batch: { properties: Record<string, unknown> }[] };

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

/** Runs the real kibi binary, with `input` on stdin. */
async function runKibi(
  args: string[],
  cwd: string,
  env: Record<string, string>,
  input?: string,
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  const child = Bun.spawn(["node", KIBI_BIN, ...args], {
    cwd,
    env: {
      PATH: process.env.PATH ?? "",
      HOME: cwd,
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
      ...env,
    },
    stdin: input === undefined ? "ignore" : new Blob([input]),
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

function gitWorkspace(): string {
  const workspace = temporaryDirectory("kibi-outcome-private-repo-");
  const git = (...args: string[]) =>
    spawnSync("git", args, { cwd: workspace, stdio: "ignore" });
  git("init", "-q", "-b", "main");
  git(
    "-c",
    "user.email=dev@example.invalid",
    "-c",
    "user.name=dev",
    "commit",
    "-q",
    "--allow-empty",
    "-m",
    "init",
  );
  return workspace;
}

describe("kibi CLI telemetry outcomes (end to end)", () => {
  test("a refused payload is sent as rejected with its code, and never its content", async () => {
    const workspace = gitWorkspace();
    const state = temporaryDirectory("kibi-outcome-state-");
    const collector = startCollector();
    try {
      const env = {
        KIBI_TELEMETRY: "1",
        KIBI_TELEMETRY_DIR: state,
        KIBI_TELEMETRY_HOST: collector.url,
      };
      expect(
        (await runKibi(["init", "--no-hooks"], workspace, env)).exitCode,
      ).toBe(0);
      const invalid = await runKibi(
        ["upsert", "--input", "-"],
        workspace,
        env,
        JSON.stringify({
          type: "req",
          id: "REQ-secret-customer-rule",
          properties: { title: "Secret customer rule", status: "bogus" },
        }),
      );
      expect(invalid.exitCode).toBe(1);
      expect(invalid.stderr).toContain("Entity validation failed");
      const malformed = await runKibi(
        ["upsert", "--input", "-"],
        workspace,
        env,
        "{}",
      );
      expect(malformed.exitCode).toBe(2);
      // Twenty queued events make the next command's flush due.
      for (let index = 0; index < 17; index += 1) {
        await runKibi(["status"], workspace, env);
      }

      const events = collector.batches
        .flatMap((batch) => batch.batch)
        .map((event) => event.properties);
      const outcomes = events
        .filter((event) => event.operation === "upsert")
        .map((event) => [event.status, event.error_category, event.exit_code]);
      expect(outcomes).toEqual([
        ["rejected", "entity_validation_failed", 1],
        ["rejected", "validation_failed", 2],
      ]);
      const status = events.find((event) => event.operation === "status");
      expect(status).toMatchObject({
        status: "success",
        error_category: null,
        error_class: null,
        telemetry_version: 2,
      });
      const payload = JSON.stringify(collector.batches);
      expect(payload).not.toContain("secret");
      expect(payload).not.toContain("bogus");
      expect(payload).not.toContain(workspace);
    } finally {
      collector.stop();
    }
  }, 240_000);
});
