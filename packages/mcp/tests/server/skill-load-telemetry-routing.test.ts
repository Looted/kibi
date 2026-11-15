import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { isolatedMcpSandboxEnv } from "../helpers/isolated-env.js";

/**
 * `skill_loaded_before` follows the workspace a call was answered from, not
 * the directory the server started in. A server configured globally starts
 * in a home directory and routes each call to the workspace named by
 * `workspaceRoot`: a skill loaded at the home directory must not count for
 * the repositories below it, and a skill loaded in a routed workspace must
 * count there.
 */

const REPO_ROOT = path.resolve(import.meta.dir, "../../../..");
const KIBI_CLI = path.join(REPO_ROOT, "packages/cli/bin/kibi");
const KIBI_MCP = path.join(REPO_ROOT, "packages/mcp/bin/kibi-mcp");

const directories: string[] = [];
const clients: Client[] = [];
const collectors: { stop: () => void }[] = [];

afterEach(async () => {
  for (const client of clients.splice(0)) await client.close();
  for (const collector of collectors.splice(0)) collector.stop();
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

function sandboxEnv(extra: Record<string, string>): Record<string, string> {
  const env = isolatedMcpSandboxEnv();
  for (const key of Object.keys(env)) {
    if (
      key.startsWith("KIBI_PROOF_") ||
      key.startsWith("KIBI_TELEMETRY") ||
      key.startsWith("KIBI_MCP_") ||
      key === "KIBI_WORKSPACE" ||
      key === "KIBI_PROJECT_ROOT" ||
      key === "KIBI_ROOT" ||
      key === "KIBI_DIAGNOSTIC_MODE" ||
      key === "DO_NOT_TRACK" ||
      key === "CI"
    ) {
      Reflect.deleteProperty(env, key);
    }
  }
  return {
    ...Object.fromEntries(
      Object.entries(env).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
    ...extra,
  };
}

/** A git checkout with `kibi init`, at `directory`. */
function kibiWorkspace(directory: string, env: Record<string, string>): string {
  fs.mkdirSync(directory, { recursive: true });
  const run = (command: string, args: string[]) =>
    execFileSync(command, args, {
      cwd: directory,
      env,
      stdio: "pipe",
      timeout: 120_000,
    });
  run("git", ["init", "-q", "-b", "main"]);
  run("node", [KIBI_CLI, "init", "--no-hooks"]);
  return directory;
}

/** Swallows any batch the server sends, so nothing leaves the machine. */
function startCollector(): string {
  const server = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch: () => Response.json({ status: 1 }),
  });
  collectors.push({ stop: () => server.stop(true) });
  return `http://127.0.0.1:${server.port}`;
}

type QueuedEvent = { properties: Record<string, unknown> };

function queuedOperations(state: string): Record<string, unknown>[] {
  const file = path.join(state, "telemetry-queue.jsonl");
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => (JSON.parse(line) as QueuedEvent).properties)
    .filter((properties) => properties.interface === "mcp");
}

describe("kibi-mcp skill load telemetry across routed workspaces", () => {
  test("a skill load marks the workspace that answered the call, and no directory above it", async () => {
    const home = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "kibi-mcp-skill-home-")),
    );
    directories.push(home);
    const state = path.join(home, ".telemetry");
    const env = sandboxEnv({
      HOME: home,
      KIBI_TELEMETRY: "1",
      KIBI_TELEMETRY_DIR: state,
      KIBI_TELEMETRY_HOST: startCollector(),
      KIBI_MCP_ROUTABLE_ROOTS: home,
    });
    const repo = kibiWorkspace(path.join(home, "code", "repo"), env);
    const sibling = kibiWorkspace(path.join(home, "code", "sibling"), env);

    // Started in the home directory, the way a global MCP config starts it;
    // a host launcher names that directory with KIBI_MCP_ATTACH_ROOT, which a
    // routed child inherits.
    const client = new Client({ name: "kibi-consumer", version: "1.0.0" });
    await client.connect(
      new StdioClientTransport({
        command: "node",
        args: [KIBI_MCP],
        cwd: home,
        env: { ...env, KIBI_MCP_ATTACH_ROOT: home },
        stderr: "pipe",
      }),
    );
    clients.push(client);

    const call = async (args: Record<string, unknown>) => {
      const result = await client.callTool({
        name: "kb_skills",
        arguments: args,
      });
      expect(result.isError ?? false).toBe(false);
    };
    const load = { action: "load", id: "kibi-usage" };
    const list = { action: "list" };

    // Answered by the server itself, at the home directory.
    await call(load);
    // Routed to the repository: the home directory's load does not count.
    await call({ ...list, workspaceRoot: repo });
    // Routed load, then a routed call in the same repository counts it.
    await call({ ...load, workspaceRoot: repo });
    await call({ ...list, workspaceRoot: repo });
    await call({ ...list, workspaceRoot: path.join(repo, ".kb") });
    // A sibling repository under the same home directory does not.
    await call({ ...list, workspaceRoot: sibling });

    const deadline = Date.now() + 10_000;
    let events = queuedOperations(state);
    while (events.length < 6 && Date.now() < deadline) {
      await Bun.sleep(50);
      events = queuedOperations(state);
    }
    expect(events.map((properties) => properties.skill_loaded_before)).toEqual([
      false,
      false,
      false,
      true,
      true,
      false,
    ]);
    const queued = fs.readFileSync(
      path.join(state, "telemetry-queue.jsonl"),
      "utf8",
    );
    expect(queued).not.toContain(home);
  }, 240_000);
});
