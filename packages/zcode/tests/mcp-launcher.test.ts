// implements REQ-zcode-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";

import {
  cleanupRoots,
  createFixtureWorkspace,
  hermeticEnv,
  workspaceKey,
} from "./launcher-fixture";

const require = createRequire(import.meta.url);
const launcherPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../bin/mcp-launcher.cjs",
);
const launcher = require(launcherPath) as {
  main: () => Promise<void>;
  LAUNCH_FAILED_INSTRUCTIONS_PREFIX: string;
  MISSING_KIBI_MCP_INSTRUCTIONS: string;
  UNCONFIGURED_WORKSPACE_TOOL_MESSAGE: string;
  createLineReader: (onLine: (line: string) => void) => (chunk: Buffer) => void;
  findGlobalKibiMcpCommand: (
    env?: NodeJS.ProcessEnv,
  ) => { command: string; args: string[]; via: string } | null;
  probeKibiMcp: (options?: Record<string, unknown>) => Promise<{
    status: "available" | "missing" | "launch_failed";
    detail?: string;
  }>;
  proxyKibiMcp: (options?: Record<string, unknown>) => Promise<number>;
  resolveKibiWorkspace: (
    startDir: string | undefined,
    env?: NodeJS.ProcessEnv,
  ) => { root: string; optedIn: boolean };
  resolveLaunchTarget: (
    workspaceRoot: string,
    env?: NodeJS.ProcessEnv,
  ) => { command: string; args: string[]; via: string } | null;
  resolveLocalEntry: (workspaceRoot: string) => string | null;
  resolveWindowsShimEntry: (shimPath: string) => string | null;
  runLauncher: (options?: Record<string, unknown>) => Promise<number>;
  serveSilent: (options?: Record<string, unknown>) => Promise<number>;
  signalExitCode: (signal: string) => number;
  silentServerResponse: (
    message: unknown,
    options?: Record<string, unknown>,
  ) => Record<string, unknown> | null;
};

const roots: string[] = [];

function tempRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

type FakeChild = EventEmitter & {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: (signal?: string) => boolean;
  killed: boolean;
};

function makeFakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdin = new PassThrough();
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killed = false;
  child.kill = () => {
    child.killed = true;
    return true;
  };
  return child;
}

/**
 * Synchronous write sink: decoding happens inside `write`, so assertions never
 * depend on stream 'data' event scheduling.
 */
function makeWriteSink(): {
  text: () => string;
  stream: Writable;
  done: Promise<void>;
} {
  const state = { text: "" };
  let resolveDone: () => void = () => {};
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      state.text += chunk.toString("utf8");
      callback();
    },
    final(callback) {
      callback();
      resolveDone();
    },
  });
  return { text: () => state.text, stream, done };
}

type SpawnCall = {
  command: string;
  args: string[];
  opts: Record<string, unknown>;
};

async function spawnLauncher(options: {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  requests?: string[];
  spawnImpl?: (command: string, args: string[], opts: unknown) => FakeChild;
}): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
  spawnCalls: SpawnCall[];
}> {
  const stdin = new PassThrough();
  const out = makeWriteSink();
  const err = makeWriteSink();
  const stdout = out.stream;
  const stderr = err.stream;
  const spawnCalls: SpawnCall[] = [];
  const spawnImpl =
    options.spawnImpl ??
    ((command: string, args: string[], opts: unknown): FakeChild => {
      spawnCalls.push({ command, args, opts: opts as Record<string, unknown> });
      const child = makeFakeChild();
      queueMicrotask(() => child.emit("close", 1));
      return child;
    });

  const runPromise = launcher.runLauncher({
    cwd: options.cwd,
    env: options.env ?? {},
    stdin,
    stdout,
    stderr,
    spawnImpl,
  });
  for (const request of options.requests ?? []) {
    stdin.write(`${request}\n`);
  }
  stdin.write("not json\n");
  stdin.end();
  const exitCode = await runPromise;
  stdout.end();
  stderr.end();
  await Promise.all([out.done, err.done]);

  return {
    exitCode,
    stdout: out.text(),
    stderr: err.text(),
    spawnCalls,
  };
}

afterEach(() => {
  cleanupRoots(roots);
});

describe("zcode MCP launcher workspace gate", () => {
  test("mirrors the workspace opt-in semantics of the hook runner", () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-wsgate-",
      installPackage: false,
    });
    roots.push(fixture.base);
    const nested = path.join(fixture.workspaceRoot, "src");
    fs.mkdirSync(nested);
    const unrelated = tempRoot("kibi-zcode-launcher-nested-");
    fs.mkdirSync(path.join(unrelated, ".git"), { recursive: true });

    expect(launcher.resolveKibiWorkspace(fixture.workspaceRoot)).toEqual({
      root: fixture.workspaceRoot,
      optedIn: true,
    });
    expect(launcher.resolveKibiWorkspace(nested)).toEqual({
      root: fixture.workspaceRoot,
      optedIn: true,
    });
    expect(launcher.resolveKibiWorkspace(unrelated)).toEqual({
      root: unrelated,
      optedIn: false,
    });
    expect(
      launcher.resolveKibiWorkspace(undefined, {
        KIBI_WORKSPACE: fixture.workspaceRoot,
      } as NodeJS.ProcessEnv),
    ).toEqual({ root: fixture.workspaceRoot, optedIn: true });
  });

  test("serves a silent zero-tool server in unconfigured workspaces", async () => {
    const cwd = tempRoot("kibi-zcode-launcher-off-");
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-off-pkg-",
      installPackage: true,
    });
    roots.push(fixture.base);

    const run = await spawnLauncher({
      cwd,
      requests: [
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: { protocolVersion: "2025-06-18" },
        }),
        JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      ],
    });

    expect(run.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout).toContain('"kibi-zcode-launcher"');
    expect(run.stdout).toContain('"tools":[]');
    expect(run.stdout).not.toContain("instructions");
    expect(run.spawnCalls).toHaveLength(0);
    // The unconfigured workspace must never launch the installed server.
    expect(fs.existsSync(fixture.sentinelPath)).toBe(false);
  });

  test("explains explicit initialization instead of prompting in unconfigured workspaces", async () => {
    const cwd = tempRoot("kibi-zcode-launcher-call-");

    const run = await spawnLauncher({
      cwd,
      requests: [
        JSON.stringify({
          jsonrpc: "2.0",
          id: 7,
          method: "tools/call",
          params: { name: "kb_search", arguments: { query: "x" } },
        }),
      ],
    });

    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain("Kibi is not configured for this workspace");
  });

  test("resolves the project-local entry through process.execPath", () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-resolve-",
      withSpaces: true,
      installPackage: true,
    });
    roots.push(fixture.base);

    const entryPath = fixture.entryPath as string;
    const target = launcher.resolveLaunchTarget(
      fixture.workspaceRoot,
      hermeticEnv(),
    );
    expect(target?.via).toBe("project-local");
    expect(target?.command).toBe(process.execPath);
    expect(target?.args).toEqual([entryPath]);
    expect(launcher.resolveLocalEntry(fixture.workspaceRoot)).toBe(entryPath);
  });

  test("resolves the public export when package.json is not exported", () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-exports-",
      installPackage: true,
    });
    roots.push(fixture.base);

    const packageJsonPath = path.join(
      fixture.packageRoot as string,
      "package.json",
    );
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    expect(packageJson.exports).toEqual({ ".": "./dist/server.js" });

    const nodeBin = Bun.which("node") ?? "node";
    const packagePathError = execFileSync(
      nodeBin,
      [
        "-e",
        [
          "const { createRequire } = require('node:module');",
          "const requireFromWorkspace = createRequire(process.argv[1]);",
          "try { requireFromWorkspace.resolve('kibi-mcp/package.json'); }",
          "catch (error) { process.stdout.write(error.code ?? String(error)); }",
        ].join(" "),
        path.join(fixture.workspaceRoot, "package.json"),
      ],
      { encoding: "utf8" },
    );
    expect(packagePathError).toBe("ERR_PACKAGE_PATH_NOT_EXPORTED");

    const target = launcher.resolveLaunchTarget(
      fixture.workspaceRoot,
      hermeticEnv(),
    );
    expect(target?.via).toBe("project-local");
    expect(target?.command).toBe(process.execPath);
    expect(target?.args).toEqual([fixture.entryPath as string]);
  });

  test("project-local kibi-mcp takes precedence over an isolated global entry", () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-local-first-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const globalDir = tempRoot("kibi-zcode-launcher-global-first-");
    const globalEntry = path.join(globalDir, "kibi-mcp");
    fs.writeFileSync(globalEntry, "#!/bin/sh\nexit 0\n");
    fs.chmodSync(globalEntry, 0o755);

    const target = launcher.resolveLaunchTarget(
      fixture.workspaceRoot,
      hermeticEnv({ PATH: globalDir }),
    );
    expect(target?.via).toBe("project-local");
    expect(target?.args).toEqual([fixture.entryPath as string]);
  });

  test("resolves a workspace-linked local package through its public entry", () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-link-",
      installPackage: true,
      workspaceLink: true,
    });
    roots.push(fixture.base);

    const target = launcher.resolveLaunchTarget(
      fixture.workspaceRoot,
      hermeticEnv(),
    );
    expect(target?.via).toBe("project-local");
    expect(target?.command).toBe(process.execPath);
    expect(target?.args).toEqual([fixture.entryPath as string]);
  });

  test("does not fall back globally when a local package is broken", () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-local-broken-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const packageJsonPath = path.join(
      fixture.packageRoot as string,
      "package.json",
    );
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    packageJson.bin = { "kibi-mcp": "bin/missing-kibi-mcp.js" };
    fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson)}\n`);

    const globalDir = tempRoot("kibi-zcode-launcher-broken-global-");
    const globalEntry = path.join(globalDir, "kibi-mcp");
    fs.writeFileSync(globalEntry, "#!/bin/sh\nexit 0\n");
    fs.chmodSync(globalEntry, 0o755);

    expect(
      launcher.resolveLaunchTarget(
        fixture.workspaceRoot,
        hermeticEnv({ PATH: globalDir }),
      ),
    ).toBeNull();
  });

  test("falls back to the POSIX PATH entry when no project-local install exists", () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-global-",
      installPackage: false,
    });
    roots.push(fixture.base);

    const shimDir = tempRoot("kibi-zcode-launcher-shimdir-");
    const shimPath = path.join(shimDir, "kibi-mcp");
    fs.writeFileSync(shimPath, "#!/bin/sh\nnode bin/kibi-mcp.js\n");
    fs.chmodSync(shimPath, 0o755);

    const target = launcher.resolveLaunchTarget(
      fixture.workspaceRoot,
      hermeticEnv({ PATH: shimDir }),
    );
    expect(target?.via).toBe("global-path");
    expect(target?.command).toBe(shimPath);
    expect(target?.args).toEqual([]);

    // Without anything on PATH and no project-local install, the server is
    // genuinely missing.
    expect(
      launcher.resolveLaunchTarget(fixture.workspaceRoot, hermeticEnv()),
    ).toBeNull();
    expect(launcher.findGlobalKibiMcpCommand(hermeticEnv())).toBeNull();
  });

  test("resolves the JS entry behind Windows .cmd shims without a shell", () => {
    const shimDir = tempRoot("kibi-zcode-launcher-cmdshim-");
    const entry = path.join(
      shimDir,
      "node_modules",
      "kibi-mcp",
      "bin",
      "kibi-mcp.js",
    );
    fs.mkdirSync(path.dirname(entry), { recursive: true });
    fs.writeFileSync(entry, "// fixture entry\n");

    const siblingLayout = path.join(shimDir, "kibi-mcp.cmd");
    fs.writeFileSync(
      siblingLayout,
      '@ECHO off\r\nnode "%~dp0\\node_modules\\kibi-mcp\\bin\\kibi-mcp.js" %*\r\n',
    );
    expect(launcher.resolveWindowsShimEntry(siblingLayout)).toBe(entry);

    // A shim without a resolvable target reports nothing instead of guessing.
    const bareShim = path.join(shimDir, "kibi-mcp-other.cmd");
    fs.writeFileSync(bareShim, "@ECHO off\r\nrem nothing here\r\n");
    expect(launcher.resolveWindowsShimEntry(bareShim)).toBeNull();
  });

  test("proxies the resolved entry in configured workspaces", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-on-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const spawnCalls: SpawnCall[] = [];
    const children: FakeChild[] = [];
    let probeSeen = false;

    const run = await spawnLauncher({
      cwd: fixture.workspaceRoot,
      env: hermeticEnv({ HOME: "/home/agent" }),
      requests: [
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      ],
      spawnImpl: (command, args, opts) => {
        spawnCalls.push({
          command,
          args,
          opts: opts as Record<string, unknown>,
        });
        const child = makeFakeChild();
        children.push(child);
        if (!probeSeen) {
          probeSeen = true;
          queueMicrotask(() => child.emit("close", 0));
        } else {
          queueMicrotask(() => {
            child.stdout.emit(
              "data",
              Buffer.from(
                `${JSON.stringify({
                  jsonrpc: "2.0",
                  id: 1,
                  result: { serverInfo: { name: "kibi-mcp" } },
                })}\n`,
              ),
            );
            child.emit("close", 0);
          });
        }
        return child;
      },
    });

    expect(run.exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(2);
    // Shell-free launch on every platform: the resolved entry under the same
    // Node binary, with no --no-install shell indirection anywhere.
    const entryPath = fixture.entryPath as string;
    expect(spawnCalls[0]?.command).toBe(process.execPath);
    expect(spawnCalls[0]?.args).toEqual([entryPath, "--print-resolution"]);
    expect(spawnCalls[1]?.args).toEqual([entryPath]);
    expect(spawnCalls[1]?.opts.cwd).toBe(fixture.workspaceRoot);
    expect((spawnCalls[1]?.opts.env as NodeJS.ProcessEnv).KIBI_WORKSPACE).toBe(
      fixture.workspaceRoot,
    );
    expect(run.stdout).toContain('"kibi-mcp"');
    expect(run.stdout).not.toContain('"kibi-zcode-launcher"');
    expect(children[1]?.stdin.writable).toBe(true);
  });

  test("starts cleanly with missing-server instructions when nothing resolves", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-missing-",
      installPackage: false,
    });
    roots.push(fixture.base);

    const run = await spawnLauncher({
      cwd: fixture.workspaceRoot,
      env: hermeticEnv(),
      requests: [
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      ],
    });

    expect(run.exitCode).toBe(0);
    expect(run.stderr).toBe("");
    expect(run.stdout).toContain("kibi-zcode-launcher");
    expect(run.stdout).toContain("instructions");
    expect(run.stdout).toContain("no kibi-mcp executable is resolvable");
  });

  test("distinguishes launch failures from a missing server", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-fail-",
      installPackage: true,
    });
    roots.push(fixture.base);

    // The entry exists (a real spawn works, see the subprocess suite) but the
    // server exits nonzero during the probe: a launch failure, not a missing
    // installation.
    const probe = await launcher.probeKibiMcp({
      cwd: fixture.workspaceRoot,
      env: { ...process.env, KIBI_FIXTURE_PRINT_EXIT: "3" },
    });
    expect(probe.status).toBe("launch_failed");
    expect(probe.detail).toContain("exit code 3");

    const run = await spawnLauncher({
      cwd: fixture.workspaceRoot,
      env: hermeticEnv({ HOME: "/home/agent" }),
      requests: [
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {},
        }),
      ],
      spawnImpl: (command, args, opts) => {
        const child = makeFakeChild();
        queueMicrotask(() => child.emit("close", 5));
        void command;
        void args;
        void opts;
        return child;
      },
    });
    expect(run.exitCode).toBe(0);
    expect(run.stdout).toContain(launcher.LAUNCH_FAILED_INSTRUCTIONS_PREFIX);
    expect(run.stdout).toContain("exit code 5");
    expect(run.stdout).not.toContain("no kibi-mcp executable is resolvable");
  });

  test("probe spawn errors surface as launch failures, not missing", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-spawnerr-",
      installPackage: true,
    });
    roots.push(fixture.base);

    const probe = await launcher.probeKibiMcp({
      cwd: fixture.workspaceRoot,
      env: process.env,
      spawnImpl: () => {
        throw new Error("EACCES: spawn blocked");
      },
    });

    expect(probe.status).toBe("launch_failed");
    expect(probe.detail).toContain("EACCES");
  });

  test("the probe kills probes that never exit", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-stuck-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const stuckChild = makeFakeChild();
    const probe = await launcher.probeKibiMcp({
      cwd: fixture.workspaceRoot,
      env: process.env,
      spawnImpl: () => stuckChild,
      timeoutMs: 15,
    });

    expect(probe.status).toBe("launch_failed");
    expect(stuckChild.killed).toBe(true);
  });

  test("the probe tolerates kill failures on timed-out probes", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-sticky-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const stuckChild = makeFakeChild();
    stuckChild.kill = () => {
      throw new Error("already reaped");
    };
    const probe = await launcher.probeKibiMcp({
      cwd: fixture.workspaceRoot,
      env: process.env,
      spawnImpl: () => stuckChild,
      timeoutMs: 15,
    });

    expect(probe.status).toBe("launch_failed");
  });

  test("proxy reports a missing server on stderr with exit code 1", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-proxymiss-",
      installPackage: false,
    });
    roots.push(fixture.base);
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const err = makeWriteSink();

    const exitCode = await launcher.proxyKibiMcp({
      workspaceRoot: fixture.workspaceRoot,
      env: hermeticEnv(),
      spawnImpl: () => makeFakeChild(),
      stdin,
      stdout,
      stderr: err.stream,
    });

    expect(exitCode).toBe(1);
    err.stream.end();
    await err.done;
    expect(err.text()).toContain("no longer resolvable");
  });

  test("proxy failures surface as a nonzero exit instead of a broken handshake", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-proxyfail-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const exitCode = await launcher.proxyKibiMcp({
      workspaceRoot: fixture.workspaceRoot,
      env: hermeticEnv(),
      spawnImpl: () => {
        throw new Error("spawn blocked");
      },
      stdin,
      stdout,
    });

    expect(exitCode).toBe(1);
  });

  test("proxy child startup errors surface on stderr with exit code 1", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-proxyerr-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const err = makeWriteSink();
    const child = makeFakeChild();

    const exitPromise = launcher.proxyKibiMcp({
      workspaceRoot: fixture.workspaceRoot,
      env: hermeticEnv(),
      spawnImpl: () => child,
      stdin,
      stdout,
      stderr: err.stream,
    });
    queueMicrotask(() => child.emit("error", new Error("no such binary")));

    expect(await exitPromise).toBe(1);
    err.stream.end();
    await err.done;
    expect(err.text()).toContain("Failed to start kibi-mcp");
  });

  test("proxied children mirror exit state and receive forwarded input", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-proxyio-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const stdin = new PassThrough();
    const child = makeFakeChild();
    const out = makeWriteSink();

    const exitPromise = launcher.proxyKibiMcp({
      workspaceRoot: fixture.workspaceRoot,
      env: hermeticEnv({ HOME: "/h" }),
      spawnImpl: () => child,
      stdin,
      stdout: out.stream,
    });

    const forwarded: string[] = [];
    child.stdin.on("data", (chunk: Buffer) =>
      forwarded.push(chunk.toString("utf8")),
    );
    stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" })}\n`,
    );
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(forwarded.join("")).toContain('"ping"');

    child.stdout.emit("data", Buffer.from("hello\n"));
    stdin.end();
    child.emit("close", 0);
    const exitCode = await exitPromise;
    out.stream.end();
    await out.done;

    expect(exitCode).toBe(0);
    expect(out.text()).toBe("hello\n");
  });

  test("proxy forwards termination signals to the child and mirrors the signal exit", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-proxysig-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const child = makeFakeChild();
    let forwarded: string | undefined;
    child.kill = (signal?: string) => {
      forwarded = signal;
      child.killed = true;
      return true;
    };

    const exitPromise = launcher.proxyKibiMcp({
      workspaceRoot: fixture.workspaceRoot,
      env: hermeticEnv(),
      spawnImpl: () => child,
      stdin,
      stdout,
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    process.emit("SIGTERM", "SIGTERM");

    expect(await exitPromise).toBe(143);
    expect(forwarded).toBe("SIGTERM");
  });
});

describe("zcode MCP launcher server helpers", () => {
  test("initialize echoes the requested protocol version without instructions", () => {
    const answer = launcher.silentServerResponse({
      jsonrpc: "2.0",
      id: 3,
      method: "initialize",
      params: { protocolVersion: "2024-11-05" },
    });

    expect(answer).toMatchObject({
      jsonrpc: "2.0",
      id: 3,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        serverInfo: { name: "kibi-zcode-launcher" },
      },
    });
    expect(JSON.stringify(answer)).not.toContain("instructions");
  });

  test("initialize carries guidance only when instructions are provided", () => {
    const answer = launcher.silentServerResponse(
      { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      { instructions: "install kibi-mcp" },
    ) as { result: { instructions?: string } };

    expect(answer.result.instructions).toBe("install kibi-mcp");
  });

  test("notifications, ping, listings, and unknown methods follow the protocol", () => {
    expect(
      launcher.silentServerResponse({
        jsonrpc: "2.0",
        method: "notifications/initialized",
      }),
    ).toBeNull();
    expect(
      launcher.silentServerResponse({ jsonrpc: "2.0", id: 1, method: "ping" }),
    ).toMatchObject({ result: {} });
    expect(
      launcher.silentServerResponse({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
      }),
    ).toMatchObject({ result: { tools: [] } });
    expect(
      launcher.silentServerResponse({
        jsonrpc: "2.0",
        id: 3,
        method: "resources/list",
      }),
    ).toMatchObject({ result: { resources: [] } });
    expect(
      launcher.silentServerResponse({
        jsonrpc: "2.0",
        id: 4,
        method: "prompts/list",
      }),
    ).toMatchObject({ result: { prompts: [] } });
    expect(
      launcher.silentServerResponse({
        jsonrpc: "2.0",
        id: 5,
        method: "kb_search",
      }),
    ).toMatchObject({ error: { code: -32601 } });
    expect(launcher.silentServerResponse("not-a-message")).toBeNull();
  });

  test("tools/call in unconfigured workspaces points at explicit initialization", () => {
    const answer = launcher.silentServerResponse(
      { jsonrpc: "2.0", id: 6, method: "tools/call", params: {} },
      { toolMessage: launcher.UNCONFIGURED_WORKSPACE_TOOL_MESSAGE },
    ) as { result: { content: Array<{ text: string }> } };

    expect(answer.result.content[0]?.text).toContain("kibi init");
  });

  test("the line reader reassembles messages split across chunks", () => {
    const lines: string[] = [];
    const onChunk = launcher.createLineReader((line) => lines.push(line));

    onChunk(Buffer.from('{"a":'));
    onChunk(Buffer.from('1}\n{"b":2}\n'));
    onChunk(Buffer.from('{"c":3}\n'));

    expect(lines).toEqual(['{"a":1}', '{"b":2}', '{"c":3}']);
  });

  test("serveSilent answers requests and exits cleanly when stdin closes", async () => {
    const stdin = new PassThrough();
    const out = makeWriteSink();

    const exitPromise = launcher.serveSilent({ stdin, stdout: out.stream });
    stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })}\n`,
    );
    stdin.write("not json\n");
    stdin.end();
    const exitCode = await exitPromise;
    out.stream.end();
    await out.done;

    expect(exitCode).toBe(0);
    expect(out.text()).toContain('"tools":[]');
  });

  test("serveSilent keeps serving when the client's stream rejects writes", async () => {
    const stdin = new PassThrough();
    const brokenStdout = {
      write: () => {
        throw new Error("EPIPE");
      },
      on: () => {},
    };

    const exitPromise = launcher.serveSilent({
      stdin,
      stdout: brokenStdout,
    });
    stdin.write(
      `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })}\n`,
    );
    stdin.end();

    expect(await exitPromise).toBe(0);
  });

  test("signals map onto conventional exit codes", () => {
    expect(launcher.signalExitCode("SIGINT")).toBe(130);
    expect(launcher.signalExitCode("SIGTERM")).toBe(143);
    expect(launcher.signalExitCode("SIGHUP")).toBe(129);
    expect(launcher.signalExitCode("SIGOTHER")).toBe(1);
  });

  test("the CLI entrypoint serves the process stdio and reports the exit code", async () => {
    const previousStdin = process.stdin;
    const previousStdout = process.stdout;
    const previousExitCode = process.exitCode;
    const previousCwd = process.cwd;
    const unconfigured = tempRoot("kibi-zcode-main-");
    const stdin = new PassThrough();
    const out = makeWriteSink();
    Object.defineProperty(process, "stdin", {
      configurable: true,
      value: stdin,
    });
    Object.defineProperty(process, "stdout", {
      configurable: true,
      value: out.stream,
    });
    Object.defineProperty(process, "cwd", {
      configurable: true,
      value: () => unconfigured,
    });
    try {
      const exitPromise = launcher.main();
      stdin.write(
        `${JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" })}\n`,
      );
      stdin.end();
      await exitPromise;
    } finally {
      Object.defineProperty(process, "stdin", {
        configurable: true,
        value: previousStdin,
      });
      Object.defineProperty(process, "stdout", {
        configurable: true,
        value: previousStdout,
      });
      Object.defineProperty(process, "cwd", {
        configurable: true,
        value: previousCwd,
      });
    }
    out.stream.end();
    await out.done;

    expect(process.exitCode).toBe(0);
    expect(out.text()).toContain('"tools":[]');
    process.exitCode = previousExitCode;
  });

  test("workspace state keys stay stable for the shared fixture", () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-zcode-launcher-key-",
      installPackage: false,
    });
    roots.push(fixture.base);
    expect(workspaceKey(fixture.workspaceRoot)).toBe(
      workspaceKey(fixture.workspaceRoot),
    );
  });
});
