import { describe, expect, test } from "bun:test";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { PassThrough } from "node:stream";
import { pathToFileURL } from "node:url";

import { makeTempDir } from "./workspace-fixture.js";

const require = createRequire(import.meta.url);
const launcher = require("../bin/mcp-launcher.cjs") as {
  LAUNCHER_INIT_ID: string;
  LAUNCHER_ROOTS_ID: string;
  LAUNCH_FAILED_INSTRUCTIONS_PREFIX: string;
  MISSING_KIBI_MCP_INSTRUCTIONS: string;
  serveDeferred: (options: Record<string, unknown>) => Promise<number>;
  runLauncher: (options: Record<string, unknown>) => Promise<number>;
};

type Message = Record<string, unknown> & {
  id?: unknown;
  method?: string;
  result?: Record<string, unknown>;
};

type ChildBehavior = {
  probeCode?: number;
  probeError?: boolean;
  throwOnSpawn?: boolean;
  initialize?: "answer" | "never" | "error" | "close";
  afterReady?: "none" | "error" | "close-signal" | "close-null";
  noise?: boolean;
  killThrows?: boolean;
  stdinBreak?: "all" | "after-init";
  onProbe?: (cwd: string) => void;
};

type FakeChild = EventEmitter & {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  killed: boolean;
  kill: (signal?: string) => void;
};

function kibiRepo(withLocalMcp = true): string {
  const repo = makeTempDir("kibi-agy-deferred-repo-");
  fs.mkdirSync(path.join(repo, ".git"), { recursive: true });
  fs.mkdirSync(path.join(repo, ".kb"), { recursive: true });
  fs.writeFileSync(path.join(repo, ".kb", "manifest.json"), "{}\n");
  fs.writeFileSync(path.join(repo, "package.json"), '{"name":"demo"}');
  if (withLocalMcp) {
    const mcpDir = path.join(repo, "node_modules", "kibi-mcp");
    fs.mkdirSync(path.join(mcpDir, "bin"), { recursive: true });
    fs.writeFileSync(
      path.join(mcpDir, "package.json"),
      JSON.stringify({
        name: "kibi-mcp",
        main: "index.js",
        bin: { "kibi-mcp": "bin/kibi-mcp.js" },
      }),
    );
    fs.writeFileSync(path.join(mcpDir, "index.js"), "module.exports = {};\n");
    fs.writeFileSync(path.join(mcpDir, "bin", "kibi-mcp.js"), "// bin\n");
  }
  return repo;
}

function session(behavior: ChildBehavior = {}, extra = {}) {
  const stdin = new PassThrough();
  const stdout = new PassThrough();
  const stderr = new PassThrough();
  const received: Message[] = [];
  const children: FakeChild[] = [];
  const childSeen: Message[] = [];
  let buffer = "";
  stdout.on("data", (chunk: Buffer) => {
    buffer += chunk.toString("utf8");
    for (;;) {
      const index = buffer.indexOf("\n");
      if (index < 0) break;
      const line = buffer.slice(0, index);
      buffer = buffer.slice(index + 1);
      if (!line.trim()) continue;
      try {
        received.push(JSON.parse(line) as Message);
      } catch {
        received.push({ raw: line });
      }
    }
  });
  let stderrText = "";
  stderr.on("data", (chunk: Buffer) => {
    stderrText += chunk.toString("utf8");
  });

  const spawnImpl = (
    _command: string,
    args: string[],
    options: { cwd: string },
  ) => {
    const child = new EventEmitter() as FakeChild;
    child.stdin = new PassThrough();
    child.stdout = new PassThrough();
    child.stderr = new PassThrough();
    child.killed = false;
    child.kill = () => {
      child.killed = true;
    };
    if (args.includes("--print-resolution")) {
      behavior.onProbe?.(options.cwd);
      queueMicrotask(() => {
        if (behavior.probeError) child.emit("error", new Error("probe boom"));
        else child.emit("close", behavior.probeCode ?? 0);
      });
      return child;
    }
    if (behavior.throwOnSpawn) throw new Error("spawn refused");
    children.push(child);
    if (behavior.killThrows) {
      child.kill = () => {
        throw new Error("kill refused");
      };
    }
    if (behavior.stdinBreak) {
      const original = child.stdin.write.bind(child.stdin);
      let writes = 0;
      child.stdin.write = ((...writeArgs: Parameters<typeof original>) => {
        writes += 1;
        if (behavior.stdinBreak === "all" || writes > 1) {
          throw new Error("pipe closed");
        }
        return original(...writeArgs);
      }) as typeof child.stdin.write;
      child.stdin.end = (() => {
        throw new Error("pipe closed");
      }) as typeof child.stdin.end;
    }
    let childBuffer = "";
    child.stdin.on("data", (chunk: Buffer) => {
      childBuffer += chunk.toString("utf8");
      for (;;) {
        const index = childBuffer.indexOf("\n");
        if (index < 0) break;
        const line = childBuffer.slice(0, index);
        childBuffer = childBuffer.slice(index + 1);
        if (!line.trim()) continue;
        const message = JSON.parse(line) as Message;
        childSeen.push(message);
        if (message.method === "initialize") {
          const mode = behavior.initialize ?? "answer";
          if (mode === "error") child.emit("error", new Error("child boom"));
          if (mode === "close") child.emit("close", 3, null);
          if (mode !== "answer") continue;
          child.stderr.write("child log\n");
          if (behavior.noise) child.stdout.write("not json\n");
          child.stdout.write(
            `${JSON.stringify({ jsonrpc: "2.0", id: message.id, result: {} })}\n`,
          );
        } else if (message.method === "tools/list") {
          child.stdout.write(
            `${JSON.stringify({ jsonrpc: "2.0", id: message.id, result: { tools: [{ name: "kb_status" }] } })}\n`,
          );
          if (behavior.afterReady === "error") {
            child.emit("error", new Error("late boom"));
          } else if (behavior.afterReady === "close-signal") {
            child.emit("close", null, "SIGTERM");
          } else if (behavior.afterReady === "close-null") {
            child.emit("close", null, null);
          }
        }
      }
    });
    child.stdin.on("finish", () => child.emit("close", 0, null));
    return child;
  };

  const run = launcher.serveDeferred({
    stdin,
    stdout,
    stderr,
    spawnImpl,
    env: { PATH: "" },
    rootsTimeoutMs: 40,
    childInitTimeoutMs: 60,
    ...extra,
  });
  const send = (message: Message) =>
    stdin.write(`${JSON.stringify({ jsonrpc: "2.0", ...message })}\n`);
  const tick = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));
  const waitFor = async (predicate: () => boolean) => {
    for (let attempt = 0; attempt < 100 && !predicate(); attempt += 1) {
      await tick(5);
    }
    expect(predicate()).toBe(true);
  };
  return {
    stdin,
    stdout,
    run,
    send,
    tick,
    waitFor,
    received,
    children,
    childSeen,
    stderr: () => stderrText,
    byId: (id: unknown) => received.find((message) => message.id === id),
  };
}

const initialize = (roots: boolean): Message => ({
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: roots ? { roots: {} } : {},
  },
});

function toolText(message: Message | undefined): string {
  const content = (message?.result?.content as { text: string }[]) ?? [];
  return content[0]?.text ?? "";
}

describe("kibi-antigravity deferred MCP server", () => {
  test("attaches through a stamped workspaceRoot without roots support", async () => {
    const repo = kibiRepo();
    const s = session({ noise: true });
    s.send(initialize(false));
    s.send({ method: "notifications/initialized" });
    s.send({ id: 2, method: "tools/list" });
    s.send({ id: 3, method: "ping" });
    await s.waitFor(() => s.byId(3) !== undefined);
    expect(s.byId(2)?.result).toEqual({ tools: [] });

    s.send({
      id: 4,
      method: "tools/call",
      params: { name: "kb_status", arguments: { workspaceRoot: repo } },
    });
    await s.waitFor(() => s.children.length === 1);
    await s.waitFor(() =>
      s.received.some(
        (message) => message.method === "notifications/tools/list_changed",
      ),
    );
    expect(s.received.some((message) => message.raw === "not json")).toBe(true);
    expect(s.childSeen.some((message) => message.id === 4)).toBe(true);
    s.send({ id: 5, method: "tools/list" });
    await s.waitFor(() => s.byId(5) !== undefined);
    expect(s.stderr()).toContain("child log");
    s.stdin.end();
    expect(await s.run).toBe(0);
  });

  test("discovers the workspace from roots/list and exits with the child", async () => {
    const repo = kibiRepo();
    const s = session({ afterReady: "close-signal" });
    s.send(initialize(true));
    // A request before initialized starts discovery and waits for it.
    s.send({ id: 2, method: "tools/list" });
    await s.waitFor(() => s.byId(launcher.LAUNCHER_ROOTS_ID) !== undefined);
    s.send({ id: 3, method: "tools/list" });
    s.send({ method: "notifications/initialized" });
    s.send({
      id: launcher.LAUNCHER_ROOTS_ID,
      result: {
        roots: [
          { uri: "file://remote-host/share" },
          { uri: "relative/path" },
          { uri: pathToFileURL(repo).href },
        ],
      },
    });
    expect(await s.run).toBe(143);
  });

  test("goes silent when roots time out, and retries on roots/list_changed", async () => {
    const s = session();
    s.send(initialize(true));
    s.send({ method: "notifications/initialized" });
    await s.tick(80);
    s.send({ id: 2, method: "tools/call", params: { name: "kb_status" } });
    await s.waitFor(() => s.byId(2) !== undefined);
    // A late roots answer is ignored.
    s.send({ id: launcher.LAUNCHER_ROOTS_ID, result: { roots: [] } });
    s.send({ method: "notifications/roots/list_changed" });
    await s.tick();
    s.send({
      id: launcher.LAUNCHER_ROOTS_ID,
      result: "not a record" as unknown as Record<string, unknown>,
    });
    await s.tick();
    s.send({ id: 3, method: "tools/list" });
    await s.waitFor(() => s.byId(3) !== undefined);
    s.stdin.end();
    expect(await s.run).toBe(0);
  });

  for (const [name, behavior, withLocal, expected] of [
    ["a failing probe", { probeCode: 1 }, true, "probe exit code 1"],
    ["a probe error", { probeError: true }, true, "probe boom"],
    ["no kibi-mcp anywhere", {}, false, "no kibi-mcp executable"],
    ["a spawn that throws", { throwOnSpawn: true }, true, "spawn refused"],
    [
      "a child that never initializes",
      { initialize: "never" },
      true,
      "timed out",
    ],
    [
      "a child that errors at start",
      { initialize: "error" },
      true,
      "child boom",
    ],
    ["a child that exits at start", { initialize: "close" }, true, "code 3"],
  ] as const) {
    test(`explains ${name} in the tool answer`, async () => {
      const repo = kibiRepo(withLocal);
      const s = session(behavior as ChildBehavior);
      s.send(initialize(false));
      s.send({
        id: 2,
        method: "tools/call",
        params: { name: "kb_status", arguments: { workspaceRoot: repo } },
      });
      await s.waitFor(() => s.byId(2) !== undefined);
      expect(toolText(s.byId(2))).toContain(expected);
      s.stdin.end();
      expect(await s.run).toBe(0);
    });
  }

  test("a child whose pipe and kill both throw times out cleanly", async () => {
    const repo = kibiRepo();
    const s = session({ stdinBreak: "all", killThrows: true });
    s.send(initialize(false));
    s.send({
      id: 2,
      method: "tools/call",
      params: { name: "kb_status", arguments: { workspaceRoot: repo } },
    });
    await s.waitFor(() => s.byId(2) !== undefined);
    expect(toolText(s.byId(2))).toContain("timed out");
    s.stdin.end();
    expect(await s.run).toBe(0);
  });

  test("a child pipe that breaks after the handshake is tolerated", async () => {
    const repo = kibiRepo();
    const s = session({ stdinBreak: "after-init", killThrows: true });
    s.send(initialize(false));
    s.send({
      id: 2,
      method: "tools/call",
      params: { name: "kb_status", arguments: { workspaceRoot: repo } },
    });
    await s.waitFor(() => s.children.length === 1);
    await s.tick(30);
    s.send({ id: 3, method: "ping" });
    await s.tick();
    s.stdin.end();
    await s.tick();
    s.stdout.emit("error", new Error("gone"));
    expect(await s.run).toBe(0);
  });

  test("a signal while proxying stops the child and exits with its code", async () => {
    const repo = kibiRepo();
    const s = session();
    s.send(initialize(false));
    s.send({
      id: 2,
      method: "tools/call",
      params: { name: "kb_status", arguments: { workspaceRoot: repo } },
    });
    await s.waitFor(() => s.childSeen.some((message) => message.id === 2));
    process.emit("SIGHUP", "SIGHUP");
    expect(await s.run).toBe(129);
    expect(s.children[0]?.killed).toBe(true);
  });

  test("an install removed between probe and spawn reads as missing", async () => {
    const repo = kibiRepo();
    const s = session({
      onProbe: (cwd) => {
        fs.rmSync(path.join(cwd, "node_modules"), { recursive: true });
        fs.rmSync(path.join(cwd, "package.json"));
      },
    });
    s.send(initialize(false));
    s.send({
      id: 2,
      method: "tools/call",
      params: { name: "kb_status", arguments: { workspaceRoot: repo } },
    });
    await s.waitFor(() => s.byId(2) !== undefined);
    expect(s.children).toHaveLength(0);
    s.stdin.end();
    expect(await s.run).toBe(0);
  });

  test("a client that stops reading does not crash the launcher", async () => {
    const s = session();
    s.stdout.write = (() => {
      throw new Error("EPIPE");
    }) as typeof s.stdout.write;
    s.send(initialize(false));
    s.send({ id: 2, method: "ping" });
    await s.tick();
    s.stdin.end();
    expect(await s.run).toBe(0);
  });

  test("a child failing after the handshake ends the session", async () => {
    for (const [afterReady, code] of [
      ["error", 1],
      ["close-null", 0],
    ] as const) {
      const repo = kibiRepo();
      const s = session({ afterReady });
      s.send(initialize(false));
      s.send({
        id: 2,
        method: "tools/list",
        params: {},
      });
      s.send({
        id: 3,
        method: "tools/call",
        params: { name: "kb_status", arguments: { workspaceRoot: repo } },
      });
      await s.waitFor(() => s.children.length === 1);
      await s.tick(30);
      s.send({ id: 4, method: "tools/list" });
      expect(await s.run).toBe(code);
    }
  });

  test("a stamped root outside Kibi stays silent, and stdout errors end it", async () => {
    const plain = makeTempDir("kibi-agy-deferred-plain-");
    fs.mkdirSync(path.join(plain, ".git"));
    const s = session();
    s.send(initialize(false));
    s.send({
      id: 2,
      method: "tools/call",
      params: { name: "kb_status", arguments: { workspaceRoot: plain } },
    });
    s.send({ id: 3, method: "tools/call", params: { arguments: "x" } });
    s.stdin.write("not json\n");
    s.stdin.write("[1]\n");
    await s.waitFor(() => s.byId(3) !== undefined);
    s.stdout.emit("error", new Error("gone"));
    expect(await s.run).toBe(0);
  });

  test("uses a global kibi-mcp with a notice when the project has none", async () => {
    const repo = kibiRepo(false);
    const bin = makeTempDir("kibi-agy-deferred-bin-");
    const global = path.join(bin, "kibi-mcp");
    fs.writeFileSync(global, "#!/bin/sh\n");
    fs.chmodSync(global, 0o755);
    const s = session({}, { env: { PATH: bin } });
    s.send(initialize(false));
    s.send({
      id: 2,
      method: "tools/call",
      params: { name: "kb_status", arguments: { workspaceRoot: repo } },
    });
    await s.waitFor(() => s.children.length === 1);
    await s.waitFor(() => s.stderr().includes("global install"));
    s.stdin.end();
    expect(await s.run).toBe(0);
  });

  test("a Kibi PLUGIN_ROOT workspace is used when the cwd is outside Kibi", async () => {
    const repo = kibiRepo(false);
    const plain = makeTempDir("kibi-agy-deferred-cwd-");
    fs.mkdirSync(path.join(plain, ".git"));
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    let out = "";
    stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    const run = launcher.runLauncher({
      cwd: plain,
      env: { PATH: "", PLUGIN_ROOT: repo },
      stdin,
      stdout,
      stderr: new PassThrough(),
    });
    stdin.write(`${JSON.stringify(initialize(false))}\n`);
    await new Promise((resolve) => setTimeout(resolve, 30));
    stdin.end();
    expect(await run).toBe(0);
    expect(out).toContain(launcher.MISSING_KIBI_MCP_INSTRUCTIONS.slice(0, 40));
  });

  test("a configured workspace whose kibi-mcp fails its probe says so", async () => {
    const repo = kibiRepo();
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    let out = "";
    stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    const spawnImpl = () => {
      const child = new EventEmitter() as FakeChild;
      queueMicrotask(() => child.emit("close", 2));
      return child;
    };
    const run = launcher.runLauncher({
      cwd: repo,
      env: { PATH: "" },
      stdin,
      stdout,
      stderr: new PassThrough(),
      spawnImpl,
    });
    stdin.write(`${JSON.stringify(initialize(false))}\n`);
    await new Promise((resolve) => setTimeout(resolve, 30));
    stdin.end();
    expect(await run).toBe(0);
    expect(out).toContain("probe exit code 2");
  });
});
