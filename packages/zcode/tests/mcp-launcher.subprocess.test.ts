// implements REQ-zcode-kibi-plugin-v1
// Subprocess integration coverage for the MCP launcher: the shipped launcher
// file runs under native Node (the production runtime), the probe spawns the
// fixture server for real, and a functioning MCP handshake is proxied through
// the launcher. This complements the in-process unit tests, which mock spawn.
import { afterAll, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  FIXTURE_SERVER_NAME,
  cleanupRoots,
  createFixtureWorkspace,
  hermeticEnv,
} from "./launcher-fixture";

const launcherPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../bin/mcp-launcher.cjs",
);

// Resolve node absolutely: the launcher must be exercised under native Node,
// and a hermetic child env (empty PATH) must not prevent spawning it.
const nodeBin = Bun.which("node") ?? "node";

const roots: string[] = [];
afterAll(() => {
  cleanupRoots(roots);
});

type LauncherRun = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

function runLauncherSubprocess(options: {
  cwd: string;
  requests: string[];
  env?: NodeJS.ProcessEnv;
  expectFailure?: boolean;
}): Promise<LauncherRun> {
  return new Promise((resolve, reject) => {
    const child = Bun.spawn([nodeBin, launcherPath], {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    let stdout = "";
    let stderr = "";
    const stdoutText = new Response(child.stdout).text().then((text) => {
      stdout = text;
    });
    const stderrText = new Response(child.stderr).text().then((text) => {
      stderr = text;
    });

    child.stdin.write(
      `${options.requests.map((request) => `${request}\n`).join("")}`,
    );
    child.stdin.end();

    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error("launcher subprocess timed out"));
    }, 30000);

    child.exited
      .then(async (code) => {
        clearTimeout(timeout);
        await Promise.all([stdoutText, stderrText]);
        resolve({ exitCode: code ?? -1, stdout, stderr });
      })
      .catch(reject);
  });
}

describe("zcode MCP launcher subprocess integration", () => {
  test("probe succeeds and a working MCP handshake is proxied in a workspace with spaces", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-sub-",
      withSpaces: true,
      installPackage: true,
    });
    roots.push(fixture.base);
    expect(fixture.workspaceRoot).toContain(" ");
    expect(fixture.entryPath).toContain(" ");

    const run = await runLauncherSubprocess({
      cwd: fixture.workspaceRoot,
      requests: [
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-06-18" },
        }),
        JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      ],
      env: { KIBI_FIXTURE_SENTINEL: fixture.sentinelPath },
    });

    expect(run.stderr).toBe("");
    expect(run.exitCode).toBe(0);
    // The initialize response is the fixture server's own, proving the
    // launcher probed the real entry and proxied the live session.
    expect(run.stdout).toContain(`"${FIXTURE_SERVER_NAME}"`);
    expect(run.stdout).toContain('"kb_search"');
    expect(run.stdout).not.toContain('"kibi-zcode-launcher"');
    expect(fs.existsSync(fixture.sentinelPath)).toBe(true);
  }, 35000);

  test("an opted-in workspace without kibi-mcp gets instructions, not a launch", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-sub-missing-",
      installPackage: false,
    });
    roots.push(fixture.base);

    const run = await runLauncherSubprocess({
      cwd: fixture.workspaceRoot,
      requests: [
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      ],
      env: {
        KIBI_FIXTURE_SENTINEL: fixture.sentinelPath,
        // Hermetic PATH: `bun run test:unit` and `npm test` put the repo's
        // node_modules/.bin (which contains a workspace-linked kibi-mcp) on
        // PATH, and the launcher's documented global fallback would find it.
        // With an empty PATH and no project-local install, the workspace is
        // genuinely missing a server.
        PATH: "",
        Path: "",
      },
    });

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain("instructions");
    expect(run.stdout).toContain("no kibi-mcp executable is resolvable");
    expect(fs.existsSync(fixture.sentinelPath)).toBe(false);
  });

  test("an unconfigured workspace never launches the fixture", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-sub-unconfigured-",
      installPackage: true,
    });
    roots.push(fixture.base);
    // Remove the opt-in marker: the workspace is unconfigured now.
    fs.rmSync(path.join(fixture.workspaceRoot, ".kb"), {
      recursive: true,
      force: true,
    });

    const run = await runLauncherSubprocess({
      cwd: fixture.workspaceRoot,
      requests: [
        JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
      ],
      env: { KIBI_FIXTURE_SENTINEL: fixture.sentinelPath },
    });

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain('"tools":[]');
    expect(run.stdout).not.toContain(FIXTURE_SERVER_NAME);
    expect(fs.existsSync(fixture.sentinelPath)).toBe(false);
  });

  test("a launch failure is reported as such, not as a missing server", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-sub-fail-",
      installPackage: true,
    });
    roots.push(fixture.base);

    const run = await runLauncherSubprocess({
      cwd: fixture.workspaceRoot,
      requests: [
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      ],
      env: {
        KIBI_FIXTURE_SENTINEL: fixture.sentinelPath,
        KIBI_FIXTURE_PRINT_EXIT: "7",
      },
    });

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain("launching it failed");
    expect(run.stdout).toContain("exit code 7");
    expect(run.stdout).not.toContain("no kibi-mcp executable is resolvable");
    expect(fs.existsSync(fixture.sentinelPath)).toBe(false);
  });

  test("the hook runner runs under node in the built layout", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-sub-hookrunner-",
      installPackage: false,
    });
    roots.push(fixture.base);

    const hookRunnerPath = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "../dist/hook-runner.js",
    );
    if (!fs.existsSync(hookRunnerPath)) {
      throw new Error(
        "dist/hook-runner.js missing — run `bun run build:zcode` before testing",
      );
    }

    // Unconfigured workspace: the hook runner stays silent and exits 0.
    const child = Bun.spawn([nodeBin, hookRunnerPath], {
      cwd: fixture.workspaceRoot,
      env: {
        ...process.env,
        ZCODE_PLUGIN_DATA: path.join(os.tmpdir(), "unused"),
      },
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    child.stdin.write(
      `${JSON.stringify({ hook_event_name: "Stop", cwd: fixture.workspaceRoot })}\n`,
    );
    child.stdin.end();
    const stdout = await new Response(child.stdout).text();
    const exitCode = await child.exited;

    expect(exitCode).toBe(0);
    expect(JSON.parse(stdout.trim())).toEqual({ continue: true });
  });
});
