// implements REQ-codex-kibi-plugin-v1
import { afterEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { Writable } from "node:stream";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const launcherPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../bin/mcp-launcher.cjs",
);
const launcher = require(launcherPath) as {
  main: () => Promise<void>;
  UNCONFIGURED_WORKSPACE_TOOL_MESSAGE: string;
  createLineReader: (onLine: (line: string) => void) => (chunk: Buffer) => void;
  probeKibiMcp: (options?: Record<string, unknown>) => Promise<boolean>;
  proxyKibiMcp: (options?: Record<string, unknown>) => Promise<number>;
  resolveKibiWorkspace: (
    startDir: string | undefined,
    env?: NodeJS.ProcessEnv,
  ) => { root: string; optedIn: boolean };
  runLauncher: (options?: Record<string, unknown>) => Promise<number>;
  serveSilent: (options?: Record<string, unknown>) => Promise<number>;
  signalExitCode: (signal: string) => number;
  silentServerResponse: (
    message: unknown,
    options?: Record<string, unknown>,
  ) => Record<string, unknown> | null;
};

const tempRoots: string[] = [];

function createTempRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempRoots.push(root);
  return root;
}

function optInWorkspace(root: string): void {
  fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(root, ".kb", "manifest.json"), "{}");
}

type FakeChild = EventEmitter & {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: () => boolean;
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
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("codex MCP launcher workspace gate", () => {
  test("mirrors the workspace opt-in semantics of the hook runner", () => {
    const workspace = createTempRoot("kibi-codex-launcher-");
    optInWorkspace(workspace);
    const nested = path.join(workspace, "src");
    fs.mkdirSync(nested);
    const unrelated = createTempRoot("kibi-codex-launcher-nested-");
    fs.mkdirSync(path.join(unrelated, ".git"), { recursive: true });

    expect(launcher.resolveKibiWorkspace(workspace)).toEqual({
      root: workspace,
      optedIn: true,
    });
    expect(launcher.resolveKibiWorkspace(nested)).toEqual({
      root: workspace,
      optedIn: true,
    });
    expect(launcher.resolveKibiWorkspace(unrelated)).toEqual({
      root: unrelated,
      optedIn: false,
    });
    expect(
      launcher.resolveKibiWorkspace(undefined, {
        KIBI_WORKSPACE: workspace,
      } as NodeJS.ProcessEnv),
    ).toEqual({ root: workspace, optedIn: true });
  });

  test("serves a silent zero-tool server in unconfigured workspaces", async () => {
    const cwd = createTempRoot("kibi-codex-launcher-off-");

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
    expect(run.stdout).toContain('"kibi-codex-launcher"');
    expect(run.stdout).toContain('"tools":[]');
    expect(run.stdout).not.toContain("instructions");
    expect(run.spawnCalls).toHaveLength(0);
  });

  test("explains explicit initialization instead of prompting in unconfigured workspaces", async () => {
    const cwd = createTempRoot("kibi-codex-launcher-call-");

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

  test("proxies the project-local kibi-mcp in configured workspaces", async () => {
    const workspace = createTempRoot("kibi-codex-launcher-on-");
    optInWorkspace(workspace);
    const spawnCalls: SpawnCall[] = [];
    const children: FakeChild[] = [];
    let probeSeen = false;

    const run = await spawnLauncher({
      cwd: workspace,
      env: { HOME: "/home/agent", PATH: "/usr/bin" } as NodeJS.ProcessEnv,
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
    expect(spawnCalls[0]?.command).toBe(
      process.platform === "win32" ? "npx.cmd" : "npx",
    );
    expect(spawnCalls[0]?.args).toEqual([
      "--no-install",
      "kibi-mcp",
      "--print-resolution",
    ]);
    expect(spawnCalls[1]?.args).toEqual(["--no-install", "kibi-mcp"]);
    expect(spawnCalls[1]?.opts.cwd).toBe(workspace);
    expect((spawnCalls[1]?.opts.env as NodeJS.ProcessEnv).KIBI_WORKSPACE).toBe(
      workspace,
    );
    expect(run.stdout).toContain('"kibi-mcp"');
    expect(run.stdout).not.toContain('"kibi-codex-launcher"');
    expect(children[1]?.stdin.writable).toBe(true);
  });

  test("starts cleanly with instructions when the configured workspace lacks kibi-mcp", async () => {
    const workspace = createTempRoot("kibi-codex-launcher-missing-");
    optInWorkspace(workspace);

    const run = await spawnLauncher({
      cwd: workspace,
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
    expect(run.stdout).toContain("kibi-codex-launcher");
    expect(run.stdout).toContain("instructions");
    expect(run.stdout).toContain("npm install --save-dev kibi-mcp");
  });
});

describe("codex MCP launcher server helpers", () => {
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
        serverInfo: { name: "kibi-codex-launcher" },
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

  test("the probe reports unavailable servers and spawn failures", async () => {
    const spawnCalls: string[][] = [];
    const failingChild = makeFakeChild();
    const unavailable = await launcher.probeKibiMcp({
      cwd: os.tmpdir(),
      env: {},
      spawnImpl: (command: string, args: string[]) => {
        spawnCalls.push([command, ...args]);
        queueMicrotask(() => failingChild.emit("close", 1));
        return failingChild;
      },
    });
    expect(unavailable).toBe(false);

    const errorChild = makeFakeChild();
    const spawnFailed = await launcher.probeKibiMcp({
      cwd: os.tmpdir(),
      env: {},
      spawnImpl: () => {
        queueMicrotask(() => errorChild.emit("error", new Error("ENOENT")));
        return errorChild;
      },
    });
    expect(spawnFailed).toBe(false);
    expect(spawnCalls[0]?.slice(0, 3)).toEqual([
      "npx",
      "--no-install",
      "kibi-mcp",
    ]);
  });

  test("proxy failures surface as a nonzero exit instead of a broken handshake", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const exitCode = await launcher.proxyKibiMcp({
      workspaceRoot: os.tmpdir(),
      env: {},
      spawnImpl: () => {
        throw new Error("spawn blocked");
      },
      stdin,
      stdout,
    });

    expect(exitCode).toBe(1);
  });

  test("proxied children mirror exit state and receive forwarded input", async () => {
    const stdin = new PassThrough();
    const child = makeFakeChild();
    const out = makeWriteSink();

    const exitPromise = launcher.proxyKibiMcp({
      workspaceRoot: os.tmpdir(),
      env: { HOME: "/h" } as NodeJS.ProcessEnv,
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
    const unconfigured = createTempRoot("kibi-codex-main-");
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

  test("the probe reports spawn failures that throw synchronously", async () => {
    const available = await launcher.probeKibiMcp({
      cwd: os.tmpdir(),
      env: {},
      spawnImpl: () => {
        throw new Error("spawn refused");
      },
    });

    expect(available).toBe(false);
  });

  test("the probe kills probes that never exit and reports them unavailable", async () => {
    const stuckChild = makeFakeChild();
    const available = await launcher.probeKibiMcp({
      cwd: os.tmpdir(),
      env: {},
      spawnImpl: () => stuckChild,
      timeoutMs: 15,
    });

    expect(available).toBe(false);
    expect(stuckChild.killed).toBe(true);
  });

  test("the probe tolerates kill failures on timed-out probes", async () => {
    const stuckChild = makeFakeChild();
    stuckChild.kill = () => {
      throw new Error("already reaped");
    };
    const available = await launcher.probeKibiMcp({
      cwd: os.tmpdir(),
      env: {},
      spawnImpl: () => stuckChild,
      timeoutMs: 15,
    });

    expect(available).toBe(false);
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

  test("proxy child startup errors surface on stderr with exit code 1", async () => {
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const err = makeWriteSink();
    const child = makeFakeChild();

    const exitPromise = launcher.proxyKibiMcp({
      workspaceRoot: os.tmpdir(),
      env: {},
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

  test("proxy forwards termination signals to the child and mirrors the signal exit", async () => {
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
      workspaceRoot: os.tmpdir(),
      env: {},
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
