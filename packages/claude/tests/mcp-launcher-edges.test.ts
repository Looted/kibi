// implements REQ-claude-code-kibi-plugin-v1
// Edge paths of the MCP launcher that the scenario tests do not reach:
// Windows PATH lookup, unreadable manifests, and child failures mid-proxy.
import { afterEach, describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { PassThrough, Writable } from "node:stream";
import { fileURLToPath } from "node:url";

import {
  cleanupRoots,
  createFixtureWorkspace,
  hermeticEnv,
} from "./launcher-fixture";

const require = createRequire(import.meta.url);
const launcher = require(
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../bin/mcp-launcher.cjs",
  ),
) as {
  MISSING_KIBI_MCP_INSTRUCTIONS: string;
  findGlobalKibiMcpCommand: (
    env?: NodeJS.ProcessEnv,
  ) => { command: string; args: string[]; via: string } | null;
  probeKibiMcp: (options?: Record<string, unknown>) => Promise<{
    status: string;
    detail?: string;
  }>;
  proxyKibiMcp: (options?: Record<string, unknown>) => Promise<number>;
  resolveLocalEntry: (workspaceRoot: string) => string | null;
  resolveWindowsShimEntry: (shimPath: string) => string | null;
  serveSilent: (options?: Record<string, unknown>) => Promise<number>;
  silentServerResponse: (
    message: unknown,
    options?: Record<string, unknown>,
  ) => Record<string, unknown> | null;
};

const roots: string[] = [];
afterEach(() => cleanupRoots(roots));

function tempRoot(prefix: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  roots.push(root);
  return root;
}

function withPlatform<T>(platform: string, run: () => T): T {
  const original = Object.getOwnPropertyDescriptor(process, "platform");
  Object.defineProperty(process, "platform", { value: platform });
  try {
    return run();
  } finally {
    if (original) Object.defineProperty(process, "platform", original);
  }
}

type FakeChild = EventEmitter & {
  stdin: Writable & { write: (chunk: unknown) => boolean };
  stdout: PassThrough;
  stderr: PassThrough;
  killed: boolean;
  kill: (signal?: string) => boolean;
};

function fakeChild(stdin: Writable = new PassThrough()): FakeChild {
  const child = new EventEmitter() as FakeChild;
  child.stdin = stdin as FakeChild["stdin"];
  child.stdout = new PassThrough();
  child.stderr = new PassThrough();
  child.killed = false;
  child.kill = () => {
    child.killed = true;
    return true;
  };
  return child;
}

function sink(): { stream: Writable; text: () => string } {
  let text = "";
  return {
    stream: new Writable({
      write(chunk, _encoding, callback) {
        text += chunk.toString("utf8");
        callback();
      },
    }),
    text: () => text,
  };
}

describe("silent server edges", () => {
  test("tools/call falls back to the missing-server instructions", () => {
    expect(
      launcher.silentServerResponse({ jsonrpc: "2.0", id: 4, method: "tools/call" }),
    ).toEqual({
      jsonrpc: "2.0",
      id: 4,
      result: {
        content: [
          {
            type: "text",
            text: `Kibi tools are unavailable in this workspace. ${launcher.MISSING_KIBI_MCP_INSTRUCTIONS}`,
          },
        ],
      },
    });
  });

  test("a custom responder answers instead, and null answers stay silent", async () => {
    const stdin = new PassThrough();
    const out = sink();
    const seen: unknown[] = [];
    const exit = launcher.serveSilent({
      stdin,
      stdout: out.stream,
      response: (message: { id?: number }) => {
        seen.push(message);
        return message.id === 1 ? { id: 1, custom: true } : null;
      },
    });
    stdin.write('{"id":1}\n{"id":2}\n{broken\n');
    stdin.end();
    expect(await exit).toBe(0);
    expect(seen).toEqual([{ id: 1 }, { id: 2 }]);
    expect(out.text()).toBe('{"id":1,"custom":true}\n');
  });
});

describe("resolution edges", () => {
  test("an unreadable ancestor manifest does not stop the owning-package walk", () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-claude-edges-manifest-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const entry = launcher.resolveLocalEntry(fixture.workspaceRoot);
    expect(entry).not.toBeNull();
    // A broken package.json between the entry and the package root is
    // skipped while walking up to the kibi-mcp manifest.
    const brokenDir = path.dirname(entry as string);
    const brokenManifest = path.join(brokenDir, "package.json");
    fs.writeFileSync(brokenManifest, "{ not json");
    expect(launcher.resolveLocalEntry(fixture.workspaceRoot)).toBe(entry);
  });

  test("Windows PATH lookup prefers shims and skips unresolvable ones", () => {
    const binDir = tempRoot("kibi-claude-edges-winpath-");
    const emptyDir = tempRoot("kibi-claude-edges-winempty-");
    const entry = path.join(binDir, "node_modules", "kibi-mcp", "bin", "kibi-mcp.js");
    fs.mkdirSync(path.dirname(entry), { recursive: true });
    fs.writeFileSync(entry, "// entry\n");
    fs.writeFileSync(
      path.join(binDir, "kibi-mcp.cmd"),
      '@ECHO off\r\nnode "%~dp0\\node_modules\\kibi-mcp\\bin\\kibi-mcp.js" %*\r\n',
    );
    fs.chmodSync(path.join(binDir, "kibi-mcp.cmd"), 0o755);

    const found = withPlatform("win32", () =>
      launcher.findGlobalKibiMcpCommand({
        Path: [emptyDir, "", binDir].join(path.delimiter),
      }),
    );
    expect(found).toEqual({
      command: process.execPath,
      args: [entry],
      via: "global-shim",
    });

    // A .bat shim with no resolvable target is skipped; a plain executable
    // later on PATH is spawned directly.
    const batDir = tempRoot("kibi-claude-edges-winbat-");
    fs.writeFileSync(path.join(batDir, "kibi-mcp.bat"), "@ECHO off\r\n");
    fs.chmodSync(path.join(batDir, "kibi-mcp.bat"), 0o755);
    const exeDir = tempRoot("kibi-claude-edges-winexe-");
    const exe = path.join(exeDir, "kibi-mcp.exe");
    fs.writeFileSync(exe, "");
    fs.chmodSync(exe, 0o755);
    const direct = withPlatform("win32", () =>
      launcher.findGlobalKibiMcpCommand({
        PATH: [batDir, exeDir].join(path.delimiter),
      }),
    );
    expect(direct?.command).toBe(exe);
    expect(direct?.args).toEqual([]);

    expect(
      withPlatform("win32", () =>
        launcher.findGlobalKibiMcpCommand({ PATH: batDir }),
      ),
    ).toBeNull();
    expect(launcher.findGlobalKibiMcpCommand({})).toBeNull();
  });

  test("an unreadable or dangling shim resolves to nothing", () => {
    const shimDir = tempRoot("kibi-claude-edges-shim-");
    // The shim path is a directory: reading it throws.
    const directoryShim = path.join(shimDir, "kibi-mcp.cmd");
    fs.mkdirSync(directoryShim);
    expect(launcher.resolveWindowsShimEntry(directoryShim)).toBeNull();
    // The shim names an entry that does not exist.
    const dangling = path.join(shimDir, "other.cmd");
    fs.writeFileSync(
      dangling,
      'node "%~dp0\\node_modules\\kibi-mcp\\bin\\missing.js" %*\r\n',
    );
    expect(launcher.resolveWindowsShimEntry(dangling)).toBeNull();
  });
});

describe("child process edges", () => {
  test("a probe child error is a launch failure", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-claude-edges-probe-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const child = fakeChild();
    const probe = launcher.probeKibiMcp({
      cwd: fixture.workspaceRoot,
      env: hermeticEnv(),
      spawnImpl: () => child,
    });
    queueMicrotask(() => child.emit("error", new Error("EPERM")));
    expect(await probe).toEqual({ status: "launch_failed", detail: "EPERM" });

    const silent = fakeChild();
    const second = launcher.probeKibiMcp({
      cwd: fixture.workspaceRoot,
      env: hermeticEnv(),
      spawnImpl: () => silent,
    });
    queueMicrotask(() => silent.emit("error", "not an error object"));
    expect(await second).toEqual({
      status: "launch_failed",
      detail: "not an error object",
    });
  });

  test("a proxied child closing without a code exits 1", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-claude-edges-proxy-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const child = fakeChild();
    const exit = launcher.proxyKibiMcp({
      workspaceRoot: fixture.workspaceRoot,
      env: hermeticEnv(),
      spawnImpl: () => child,
      stdin: new PassThrough(),
      stdout: new PassThrough(),
      stderr: sink().stream,
    });
    queueMicrotask(() => child.emit("close", null, null));
    expect(await exit).toBe(1);
  });

  test("input after the child stdin closed is dropped without crashing", async () => {
    const fixture = createFixtureWorkspace({
      prefix: "kibi-claude-edges-stdin-",
      installPackage: true,
    });
    roots.push(fixture.base);
    const closedStdin = new Writable({ write: (_c, _e, cb) => cb() });
    closedStdin.write = () => {
      throw new Error("write after end");
    };
    closedStdin.end = (() => {
      throw new Error("already ended");
    }) as never;
    const child = fakeChild(closedStdin);
    const stdin = new PassThrough();
    const err = sink();
    const exit = launcher.proxyKibiMcp({
      workspaceRoot: fixture.workspaceRoot,
      env: hermeticEnv(),
      spawnImpl: () => child,
      stdin,
      stdout: new PassThrough(),
      stderr: err.stream,
    });
    stdin.write("ping\n");
    stdin.end();
    await new Promise((resolve) => setTimeout(resolve, 5));
    child.emit("error", "boom");
    expect(await exit).toBe(1);
    expect(err.text()).toContain("Failed to start kibi-mcp: boom");
  });
});
