// implements REQ-core-journaled-engine-persistence
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import * as net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ENGINE_PROTOCOL_VERSION,
  EngineClient,
  acquireEnginePublicationLease,
  engineAttachmentsMatch,
  enginePidPath,
  enginePublicationLockPath,
  engineSocketPath,
  engineStartLockPath,
  ensureJournaledBranchStoreAsync,
  formatEngineAttachmentMismatch,
  fsyncJournaledBranchStore,
  parseEngineAttachmentIdentity,
  readEngineAttachmentIdentity,
  runEngineDaemon,
} from "../src/engine.js";
import { PrologProcess } from "../src/prolog.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../src/utils/branch-store-locator.js";
import { isolateKibiEnv } from "./helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];
const baselineSigterm = process.listeners("SIGTERM").slice();
const baselineSigint = process.listeners("SIGINT").slice();

function tempRoot(prefix = "kibi-engine-remain-"): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function isolateRuntime(): () => void {
  const runtime = tempRoot("kibi-runtime-remain-");
  const previousRuntime = process.env.KIBI_RUNTIME_DIR;
  const previousXdg = process.env.XDG_RUNTIME_DIR;
  const previousIdle = process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS;
  const previousPackages = process.env.KIBI_PACKAGE_VERSIONS;
  process.env.KIBI_RUNTIME_DIR = runtime;
  Reflect.deleteProperty(process.env, "XDG_RUNTIME_DIR");
  return () => {
    restoreEnv("KIBI_RUNTIME_DIR", previousRuntime);
    restoreEnv("XDG_RUNTIME_DIR", previousXdg);
    restoreEnv("KIBI_ENGINE_IDLE_TIMEOUT_MS", previousIdle);
    restoreEnv("KIBI_PACKAGE_VERSIONS", previousPackages);
  };
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, name);
  else process.env[name] = value;
}

function restoreProcessSignals(): void {
  process.removeAllListeners("SIGTERM");
  process.removeAllListeners("SIGINT");
  for (const listener of baselineSigterm) {
    process.on("SIGTERM", listener as (...args: unknown[]) => void);
  }
  for (const listener of baselineSigint) {
    process.on("SIGINT", listener as (...args: unknown[]) => void);
  }
}

function frame(value: unknown): Buffer {
  const payload = Buffer.from(JSON.stringify(value), "utf8");
  const header = Buffer.allocUnsafe(4);
  header.writeUInt32BE(payload.byteLength, 0);
  return Buffer.concat([header, payload]);
}

function rawEngineRequest(
  socketPath: string,
  request: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let buffer = Buffer.alloc(0);
    socket.on("connect", () => {
      socket.write(frame(request));
    });
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([
        buffer,
        typeof chunk === "string" ? Buffer.from(chunk) : chunk,
      ]);
      if (buffer.length < 4) return;
      const length = buffer.readUInt32BE(0);
      if (buffer.length < length + 4) return;
      const response = JSON.parse(
        buffer.subarray(4, length + 4).toString("utf8"),
      ) as Record<string, unknown>;
      socket.destroy();
      resolve(response);
    });
    socket.on("error", reject);
  });
}

async function waitForSocket(
  socketPath: string,
  timeoutMs = 15_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(socketPath) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  if (!existsSync(socketPath)) {
    throw new Error(`engine socket never appeared: ${socketPath}`);
  }
}

function mockPrologForDaemon(
  queryImpl?: (goal: string) => Promise<{
    success: boolean;
    bindings: Record<string, string>;
    error?: string;
  }>,
): () => void {
  const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
    undefined,
  );
  const terminate = spyOn(
    PrologProcess.prototype,
    "terminate",
  ).mockResolvedValue(undefined);
  const query = spyOn(PrologProcess.prototype, "query").mockImplementation(
    async (goal: string | string[]) => {
      const text = Array.isArray(goal) ? goal.join(", ") : goal;
      if (queryImpl) return queryImpl(text);
      if (text.includes("kb_attach") || text.includes("use_module")) {
        return { success: true, bindings: {} };
      }
      if (text.includes("kb_status_json")) {
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify(JSON.stringify({ branch: "main" })),
          },
        };
      }
      return { success: true, bindings: { Rows: "[]", Count: "0" } };
    },
  );
  return () => {
    start.mockRestore();
    terminate.mockRestore();
    query.mockRestore();
  };
}

async function listenSocket(socketPath: string): Promise<net.Server> {
  mkdirSync(path.dirname(socketPath), { recursive: true, mode: 0o700 });
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => resolve());
  });
  return server;
}

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  restoreProcessSignals();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("engine remaining: runtime directory and lock recovery", () => {
  test("falls back when the configured runtime directory is not writable", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const blocked = path.join(tempRoot(), "runtime-as-file");
    writeFileSync(blocked, "not-a-directory");
    const previousRuntime = process.env.KIBI_RUNTIME_DIR;
    process.env.KIBI_RUNTIME_DIR = blocked;
    restores.push(() => restoreEnv("KIBI_RUNTIME_DIR", previousRuntime));
    const root = tempRoot();
    const socket = engineSocketPath(root, "main");
    expect(socket).toContain("kibi-");
    expect(socket).not.toContain(blocked);
  });

  test("throws when no runtime directory candidate is writable", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const previousRuntime = process.env.KIBI_RUNTIME_DIR;
    process.env.KIBI_RUNTIME_DIR = path.join(tempRoot(), "missing-runtime");
    restores.push(() => restoreEnv("KIBI_RUNTIME_DIR", previousRuntime));
    const mkdir = spyOn(fs, "mkdirSync").mockImplementation(() => {
      throw new Error("mkdir denied");
    });
    restores.push(() => mkdir.mockRestore());
    const root = tempRoot();
    expect(() => engineSocketPath(root, "main")).toThrow(
      /Unable to create a writable Kibi engine runtime directory/,
    );
  });

  test("publication lease fails closed when the start lock is held by this process", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    const startLock = engineStartLockPath(root, "main");
    mkdirSync(path.dirname(startLock), { recursive: true, mode: 0o700 });
    writeFileSync(startLock, `${process.pid}:${Date.now()}\n`, { mode: 0o600 });
    expect(() => acquireEnginePublicationLease(root, "main")).toThrow(
      /cannot acquire the engine start lease/,
    );
  });

  test("publication lease write failures release the exclusive descriptor", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    const originalWrite = fs.writeFileSync;
    const write = spyOn(fs, "writeFileSync").mockImplementation(((
      file: fs.PathOrFileDescriptor,
      data: string | NodeJS.ArrayBufferView,
      options?: fs.WriteFileOptions,
    ) => {
      if (String(file).includes("publish.lock")) {
        throw new Error("publication stamp failed");
      }
      return originalWrite(file, data, options);
    }) as typeof fs.writeFileSync);
    restores.push(() => write.mockRestore());
    expect(() => acquireEnginePublicationLease(root, "main")).toThrow(
      /publication stamp failed/,
    );
    expect(existsSync(enginePublicationLockPath(root, "main"))).toBe(false);
  });

  test("publication lease release swallows close and unlink races", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    const lease = acquireEnginePublicationLease(root, "main");
    const close = spyOn(fs, "closeSync").mockImplementation(() => {
      throw new Error("already closed");
    });
    const unlink = spyOn(fs, "unlinkSync").mockImplementation(() => {
      throw new Error("already gone");
    });
    restores.push(() => {
      close.mockRestore();
      unlink.mockRestore();
    });
    lease.release();
    lease.release();
  });

  test("clears stale publication locks and refuses live owners", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    const lockPath = enginePublicationLockPath(root, "main");
    mkdirSync(path.dirname(lockPath), { recursive: true, mode: 0o700 });
    writeFileSync(lockPath, "not-a-lock\n");
    const staleAt = (Date.now() - 15_000) / 1000;
    utimesSync(lockPath, staleAt, staleAt);
    const lease = acquireEnginePublicationLease(root, "main");
    expect(existsSync(lockPath)).toBe(true);
    expect(() => acquireEnginePublicationLease(root, "main")).toThrow(
      /already in progress/,
    );
    lease.release();

    writeFileSync(lockPath, `${process.pid}:${Date.now()}\n`);
    const locked = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 500,
    });
    await expect(locked.start(false)).rejects.toThrow(
      /publication is in progress/,
    );
    await locked.terminate();
  });

  test("start-lock recovery unlinks a dead owner and waits on a live owner", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    const startLock = engineStartLockPath(root, "main");
    mkdirSync(path.dirname(startLock), { recursive: true, mode: 0o700 });
    writeFileSync(startLock, `999999999:${Date.now() - 20_000}\n`);
    utimesSync(
      startLock,
      (Date.now() - 20_000) / 1000,
      (Date.now() - 20_000) / 1000,
    );

    const previousNode = process.env.KIBI_NODE_PATH;
    process.env.KIBI_NODE_PATH = path.join(root, "missing-node");
    restores.push(() => restoreEnv("KIBI_NODE_PATH", previousNode));
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2_000,
    });
    await expect(client.start()).rejects.toThrow(/requires Node.js >=18/);
    await client.terminate();

    writeFileSync(startLock, `${process.pid}:${Date.now()}\n`);
    const blocked = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 150,
    });
    await expect(blocked.start()).rejects.toThrow(
      /another starter owns|Unable to connect/,
    );
    await blocked.terminate();

    writeFileSync(startLock, "notanumber:notanumber\n");
    const recent = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 120,
    });
    await expect(recent.start()).rejects.toThrow(
      /another starter owns|Unable to connect/,
    );
    await recent.terminate();
  });
});

describe("engine remaining: client attach, frames, and request errors", () => {
  test("connectWithRetry surfaces a daemon error file after spawn", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    const fakeNode = path.join(root, "fake-node");
    writeFileSync(
      fakeNode,
      `#!/bin/sh
socket=""
prev=""
for arg in "$@"; do
  if [ "$prev" = "--socket" ]; then socket="$arg"; fi
  prev="$arg"
done
if [ -n "$socket" ]; then
  echo "boot failed: no swipl" > "$socket.error"
fi
exit 1
`,
      { mode: 0o755 },
    );
    const previousNode = process.env.KIBI_NODE_PATH;
    process.env.KIBI_NODE_PATH = fakeNode;
    restores.push(() => restoreEnv("KIBI_NODE_PATH", previousNode));
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2_000,
    });
    await expect(client.start()).rejects.toThrow(/boot failed: no swipl/);
    await client.terminate();
  });

  test("connectSocket timeout settles before a late error event", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    const socketPath = engineSocketPath(root, "main");
    writeFileSync(socketPath, "not-a-live-socket");
    const late = new net.Socket();
    const connect = spyOn(net, "createConnection").mockImplementation(() => {
      setTimeout(() => late.emit("error", "late-refusal"), 80);
      return late;
    });
    restores.push(() => connect.mockRestore());
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 200,
    });
    await client.start(false);
    expect(client.isRunning()).toBe(false);
    await client.terminate();
  });

  test("missing daemon entry and spawn failure stay actionable", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    const originalExists = fs.existsSync;
    const exists = spyOn(fs, "existsSync").mockImplementation((file) => {
      if (String(file).includes("engine-daemon.js")) return false;
      return originalExists(file);
    });
    restores.push(() => exists.mockRestore());
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 500,
    });
    await expect(client.start()).rejects.toThrow(/not built|engine-daemon/);
    exists.mockRestore();

    const previousNode = process.env.KIBI_NODE_PATH;
    process.env.KIBI_NODE_PATH = path.join(root, "no-such-node");
    restores.push(() => restoreEnv("KIBI_NODE_PATH", previousNode));
    const spawnClient = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 800,
    });
    await expect(spawnClient.start()).rejects.toThrow(/requires Node.js >=18/);
    await spawnClient.terminate();
  });

  test("framed client handles bad responses, abort, write failures, and overflow", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    mkdirSync(root, { recursive: true });
    const socketPath = engineSocketPath(root, "main");
    const server = net.createServer((socket) => {
      let buffer = Buffer.alloc(0);
      socket.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);
        while (buffer.length >= 4) {
          const length = buffer.readUInt32BE(0);
          if (buffer.length < length + 4) return;
          const request = JSON.parse(
            buffer.subarray(4, length + 4).toString("utf8"),
          ) as { id: number; method?: string };
          buffer = buffer.subarray(4 + length);
          if (request.method === "query") {
            socket.write(frame(null));
            socket.write(frame({ id: "bad" }));
            socket.write(frame({ id: 9_999, ok: true }));
            socket.write(frame({ id: request.id, ok: false }));
            continue;
          }
          socket.write(
            frame({
              id: request.id,
              ok: true,
              result: { success: false, bindings: {} },
            }),
          );
        }
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, () => resolve());
    });
    restores.push(() => {
      server.close();
    });

    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2_000,
      allowPublicationLock: true,
    });
    (
      client as unknown as { reconcileAttachment: () => Promise<void> }
    ).reconcileAttachment = async () => undefined;
    try {
      await client.start(false);
      expect(client.isRunning()).toBe(true);
      client.cancel(1);
      await expect(client.query("true")).rejects.toThrow(
        /request failed|Kibi engine/,
      );
      await expect(
        client.queryEntities({ limit: 1, offset: 0 }),
      ).rejects.toThrow(/Indexed entity query failed/);
      await expect(
        client.searchEntities({ query: "x", limit: 1, offset: 0 }),
      ).rejects.toThrow(/Indexed search candidate query failed/);

      const controller = new AbortController();
      controller.abort();
      await expect(
        client.query("kb_entity(_, _, _)", controller.signal),
      ).rejects.toThrow(/cancelled|request failed/);

      const socket = (
        client as unknown as { socket: net.Socket | null }
      ).socket;
      if (socket) {
        socket.write = (() => {
          throw new Error("peer reset");
        }) as typeof socket.write;
      }
      await expect(client.query("true")).rejects.toThrow(/peer reset/);

      const overflow = Buffer.alloc(4);
      overflow.writeUInt32BE(64 * 1024 * 1024 + 8, 0);
      socket?.emit("data", overflow);
    } finally {
      await client.terminate();
      server.close();
    }

    const disconnected = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 200,
    });
    disconnected.cancel(3);
    const start = spyOn(disconnected, "start").mockResolvedValue(undefined);
    restores.push(() => start.mockRestore());
    await expect(disconnected.query("true")).rejects.toThrow(/not connected/);
    await disconnected.terminate();
  }, 10_000);

  test("stop fails closed when the engine cannot be started for a stop request", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const root = tempRoot();
    const previousNode = process.env.KIBI_NODE_PATH;
    process.env.KIBI_NODE_PATH = path.join(root, "missing-node");
    restores.push(() => restoreEnv("KIBI_NODE_PATH", previousNode));
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 400,
    });
    await expect(client.stop(true)).rejects.toThrow(
      /Unable to start Kibi engine for stop request/,
    );
    await client.stop(false);
    await client.terminate();
  });
});

describe("engine remaining: journal recovery and migration", () => {
  test("recoverStaleJournalLock keeps live, current, and malformed locks", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = tempRoot();
    const live = path.join(root, "live-lock");
    await ensureJournaledBranchStoreAsync(live);
    writeFileSync(path.join(live, "rdf", "lock"), `pid(${process.pid})\n`);
    await ensureJournaledBranchStoreAsync(live);
    expect(existsSync(path.join(live, "rdf", "lock"))).toBe(true);

    writeFileSync(path.join(live, "rdf", "lock"), "no-pid-here\n");
    await ensureJournaledBranchStoreAsync(live);
    expect(existsSync(path.join(live, "rdf", "lock"))).toBe(true);

    const unread = path.join(live, "rdf", "lock");
    rmSync(unread, { force: true });
    mkdirSync(unread);
    await ensureJournaledBranchStoreAsync(live);
    rmSync(unread, { recursive: true, force: true });

    const originalRm = fs.rmSync;
    writeFileSync(path.join(live, "rdf", "lock"), "pid(999999998)\n");
    const rm = spyOn(fs, "rmSync").mockImplementation(((
      file: fs.PathLike,
      options?: fs.RmOptions,
    ) => {
      if (String(file).endsWith(`${path.sep}lock`)) {
        throw new Error("lock race");
      }
      return originalRm(file, options);
    }) as typeof fs.rmSync);
    restores.push(() => rm.mockRestore());
    await ensureJournaledBranchStoreAsync(live);
  });

  test("interrupted generation restore swallows rename failures and readdir errors", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = tempRoot();
    const store = path.join(root, "renames");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      path.join(store, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    mkdirSync(path.join(store, "rdf.old.1"), { recursive: true });
    writeFileSync(path.join(store, "CURRENT.old.1"), "generation-1:0\n");
    const originalRename = fs.renameSync;
    const rename = spyOn(fs, "renameSync").mockImplementation(((
      from: fs.PathLike,
      to: fs.PathLike,
    ) => {
      if (String(from).includes("rdf.old") || String(from).includes("CURRENT.old")) {
        throw new Error("rename busy");
      }
      return originalRename(from, to);
    }) as typeof fs.renameSync);
    restores.push(() => rename.mockRestore());
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      /incomplete/,
    );
    rename.mockRestore();

    const unread = path.join(root, "unread");
    mkdirSync(unread, { recursive: true });
    writeFileSync(
      path.join(unread, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    const originalReadDir = fs.readdirSync;
    const readdir = spyOn(fs, "readdirSync").mockImplementation(((
      dir: fs.PathLike,
      options?: unknown,
    ) => {
      if (String(dir) === unread) throw new Error("readdir failed");
      return originalReadDir(dir, options as never);
    }) as typeof fs.readdirSync);
    restores.push(() => readdir.mockRestore());
    await expect(ensureJournaledBranchStoreAsync(unread)).rejects.toThrow(
      /incomplete/,
    );
  });

  test("archives a second legacy copy with a recovery suffix", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = tempRoot();
    const store = path.join(root, "legacy-dup");
    mkdirSync(path.join(store, "legacy"), { recursive: true });
    writeFileSync(
      path.join(store, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    mkdirSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(path.join(store, "CURRENT"), "generation-1:0\n");
    writeFileSync(
      path.join(store, "kb.rdf"),
      "<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'></rdf:RDF>\n",
    );
    writeFileSync(path.join(store, "audit.log"), "second");
    writeFileSync(path.join(store, "legacy", "kb.rdf"), "first-backup");
    writeFileSync(path.join(store, "legacy", "audit.log"), "first-audit");
    await ensureJournaledBranchStoreAsync(store);
    const recovered = fs
      .readdirSync(path.join(store, "legacy"))
      .filter((name) => name.includes("recovery"));
    expect(recovered.length).toBeGreaterThan(0);
  });

  test("legacy migration reports attach and migrate failures outside one-shot mode", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    restores.push(() => restoreEnv("NODE_ENV", previousNodeEnv));
    const root = tempRoot();
    const store = path.join(root, "legacy");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      path.join(store, "kb.rdf"),
      "<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'></rdf:RDF>\n",
    );
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined,
    );
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    const query = spyOn(PrologProcess.prototype, "query").mockResolvedValueOnce({
      success: false,
      bindings: {},
    });
    restores.push(() => {
      start.mockRestore();
      terminate.mockRestore();
      query.mockRestore();
    });
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      /Failed to attach legacy KB/,
    );

    query.mockReset();
    query
      .mockResolvedValueOnce({ success: true, bindings: {} })
      .mockResolvedValueOnce({ success: false, bindings: {} });
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      /Legacy KB migration failed/,
    );
  });

  test("attachment identity survives a realpath race and fsync walks missing stores", () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv);
    const root = tempRoot();
    const store = path.join(root, "ident");
    mkdirSync(store);
    writeFileSync(path.join(store, "CURRENT"), "gen-9\n");
    const originalRealpath = fs.realpathSync;
    const realpath = spyOn(fs, "realpathSync").mockImplementation(((
      file: fs.PathLike,
      options?: unknown,
    ) => {
      if (String(file) === store) throw new Error("replaced");
      return originalRealpath(file, options as never);
    }) as typeof fs.realpathSync);
    restores.push(() => realpath.mockRestore());
    const identity = readEngineAttachmentIdentity(store);
    expect(identity?.generation).toBe("gen-9");
    fsyncJournaledBranchStore(path.join(root, "missing-store"));
    chmodSync(store, 0o700);
  });
});

describe("engine remaining: in-process daemon error and signal paths", () => {
  test("attach and module-load failures fail closed before listen", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const exit = spyOn(process, "exit").mockImplementation((() => {
      return undefined as never;
    }) as typeof process.exit);
    restores.push(() => exit.mockRestore());
    const root = tempRoot();
    ensureBranchStoreManifest(root, "main");
    await ensureJournaledBranchStoreAsync(branchStorePath(root, "main"));

    const attachRestore = mockPrologForDaemon(async (goal) => {
      if (goal.includes("kb_attach")) {
        return { success: false, bindings: {} };
      }
      return { success: true, bindings: {} };
    });
    restores.push(attachRestore);
    await expect(
      runEngineDaemon({
        workspaceRoot: root,
        branch: "main",
        socketPath: path.join(root, "attach.sock"),
      }),
    ).rejects.toThrow(/Failed to attach branch KB/);
    attachRestore();

    const moduleRestore = mockPrologForDaemon(async (goal) => {
      if (goal.includes("status.pl")) {
        return { success: false, bindings: {} };
      }
      return { success: true, bindings: {} };
    });
    restores.push(moduleRestore);
    await expect(
      runEngineDaemon({
        workspaceRoot: root,
        branch: "main",
        socketPath: path.join(root, "module.sock"),
      }),
    ).rejects.toThrow(/Failed to load Kibi status module/);
    moduleRestore();

    const discoveryRestore = mockPrologForDaemon(async (goal) => {
      if (goal.includes("discovery.pl")) {
        return { success: false, bindings: {}, error: "discovery missing" };
      }
      return { success: true, bindings: {} };
    });
    restores.push(discoveryRestore);
    await expect(
      runEngineDaemon({
        workspaceRoot: root,
        branch: "main",
        socketPath: path.join(root, "discovery.sock"),
      }),
    ).rejects.toThrow(/discovery missing/);
  });

  test("refuses a live socket and replaces a stale socket file", async () => {
    const restoreEnv = isolateKibiEnv();
    restores.push(restoreEnv, isolateRuntime());
    const exit = spyOn(process, "exit").mockImplementation((() => {
      return undefined as never;
    }) as typeof process.exit);
    restores.push(() => exit.mockRestore());
    const root = tempRoot();
    ensureBranchStoreManifest(root, "main");
    await ensureJournaledBranchStoreAsync(branchStorePath(root, "main"));
    const livePath = path.join(root, "live.sock");
    const live = await listenSocket(livePath);
    restores.push(() => {
      live.close();
    });
    const restore = mockPrologForDaemon();
    restores.push(restore);
    await expect(
      runEngineDaemon({
        workspaceRoot: root,
        branch: "main",
        socketPath: livePath,
      }),
    ).rejects.toThrow(/already listening/);
    live.close();

    const stalePath = path.join(root, "stale.sock");
    writeFileSync(stalePath, "leftover");
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "100";
    const daemon = runEngineDaemon({
      workspaceRoot: root,
      branch: "main",
      socketPath: stalePath,
    });
    await waitForSocket(stalePath);
    await Promise.race([
      daemon,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("idle shutdown stalled")), 8_000),
      ),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(exit).toHaveBeenCalled();
  });

  test(
    "serves remaining command, cache, mismatch, and overflow branches",
    async () => {
      const restoreEnv = isolateKibiEnv();
      restores.push(restoreEnv, isolateRuntime());
      const exit = spyOn(process, "exit").mockImplementation((() => {
        return undefined as never;
      }) as typeof process.exit);
      restores.push(() => exit.mockRestore());
      process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "100";
      process.env.KIBI_PACKAGE_VERSIONS = "server-packages";
      const root = tempRoot();
      ensureBranchStoreManifest(root, "main");
      await ensureJournaledBranchStoreAsync(branchStorePath(root, "main"));
      const socketPath = engineSocketPath(root, "main");
      const restore = mockPrologForDaemon(async (goal) => {
        if (goal.includes("kb_search_entities") && goal.includes("fail-search")) {
          return { success: false, bindings: {} };
        }
        if (goal.includes("kb_query_entities") && goal.includes("REQ-FAIL")) {
          return { success: false, bindings: {} };
        }
        if (goal.includes("broken-status")) {
          return { success: true, bindings: { JsonString: "not-json" } };
        }
        if (goal.includes("kb_status_json")) {
          return {
            success: true,
            bindings: {
              JsonString: JSON.stringify(JSON.stringify({ branch: "other" })),
            },
          };
        }
        if (goal.includes("kb_entity(")) {
          return { success: true, bindings: { X: "1" } };
        }
        if (goal.includes("kb_assert_entity")) {
          return { success: true, bindings: {} };
        }
        if (goal.includes("kb_save") || goal.includes("kb_storage")) {
          return { success: false, bindings: {}, error: "save skipped" };
        }
        return { success: true, bindings: { Rows: "[]", Count: "abc" } };
      });
      restores.push(restore);
      const chmod = spyOn(fs, "chmodSync").mockImplementation(() => {
        throw new Error("chmod unsupported");
      });
      restores.push(() => chmod.mockRestore());

      const daemon = runEngineDaemon({
        workspaceRoot: root,
        branch: "main",
        socketPath,
      });
      await waitForSocket(socketPath);
      expect(existsSync(enginePidPath(root, "main"))).toBe(true);

      const identity = {
        id: 1,
        protocolVersion: ENGINE_PROTOCOL_VERSION,
        packageVersions: "server-packages",
        workspaceRoot: root,
        branch: "main",
      };

      expect(
        String(
          (
            await rawEngineRequest(socketPath, {
              ...identity,
              id: 2,
              method: "status",
              protocolVersion: undefined,
            })
          ).error,
        ),
      ).toContain("protocol mismatch");
      expect(
        String(
          (
            await rawEngineRequest(socketPath, {
              ...identity,
              id: 3,
              method: "status",
              packageVersions: "other-packages",
            })
          ).error,
        ),
      ).toContain("package-version mismatch");
      expect(
        String(
          (
            await rawEngineRequest(socketPath, {
              ...identity,
              id: 4,
              method: "status",
              branch: "other",
            })
          ).error,
        ),
      ).toContain("workspace identity mismatch");

      expect(
        (
          await rawEngineRequest(socketPath, {
            ...identity,
            id: 5,
            method: "kbStatus",
          })
        ).ok,
      ).toBe(true);
      expect(
        (
          await rawEngineRequest(socketPath, {
            ...identity,
            id: 6,
            method: "kbStatus",
          })
        ).ok,
      ).toBe(true);

      expect(
        String(
          (
            await rawEngineRequest(socketPath, {
              ...identity,
              id: 7,
              method: "command",
            })
          ).error,
        ),
      ).toContain("version 1");
      expect(
        String(
          (
            await rawEngineRequest(socketPath, {
              ...identity,
              id: 8,
              method: "command",
              command: { version: 2, kind: "status" },
            })
          ).error,
        ),
      ).toContain("version 1");
      expect(
        String(
          (
            await rawEngineRequest(socketPath, {
              ...identity,
              id: 9,
              method: "command",
              command: { version: 1, kind: "nope" },
            })
          ).error,
        ),
      ).toContain("unsupported");
      expect(
        String(
          (
            await rawEngineRequest(socketPath, {
              ...identity,
              id: 10,
              method: "export",
            })
          ).error,
        ),
      ).toContain("targetDirectory");
      expect(
        (
          await rawEngineRequest(socketPath, {
            ...identity,
            id: 11,
            method: "cancel",
          })
        ).result,
      ).toEqual({ cancelled: null });
      expect(
        String(
          (
            await rawEngineRequest(socketPath, {
              ...identity,
              id: 12,
              method: "query",
            })
          ).error,
        ),
      ).toContain("query.goal must be a string");

      const quoted = await rawEngineRequest(socketPath, {
        ...identity,
        id: 13,
        method: "query",
        goal: "true % halt(\n/* abort( */",
      });
      expect(quoted.ok).toBe(true);
      const escaped = await rawEngineRequest(socketPath, {
        ...identity,
        id: 14,
        method: "query",
        goal: "kb_entity('it\\'s', \"halt(\", `shell(`)",
      });
      expect(escaped.ok).toBe(true);
      const doubled = await rawEngineRequest(socketPath, {
        ...identity,
        id: 15,
        method: "query",
        goal: "kb_entity('halt(''x'')', _, _)",
      });
      expect(doubled.ok).toBe(true);

      await rawEngineRequest(socketPath, {
        ...identity,
        id: 16,
        method: "query",
        goal: "kb_entity('REQ-CACHE', _, _)",
      });
      await rawEngineRequest(socketPath, {
        ...identity,
        id: 16,
        method: "query",
        goal: "kb_entity('REQ-CACHE', _, _)",
      });
      await rawEngineRequest(socketPath, {
        ...identity,
        id: 17,
        method: "query",
        goal:
          "kb_assert_entity(req, [id='REQ-MUT', title=\"m\", status=open, created_at=\"2026-01-01T00:00:00Z\", updated_at=\"2026-01-01T00:00:00Z\", source=\"t\"])",
      });
      await rawEngineRequest(socketPath, {
        ...identity,
        id: 18,
        method: "query",
        goal: "kb_storage_status(Status)",
      });
      await rawEngineRequest(socketPath, {
        ...identity,
        id: 19,
        method: "query",
        goal: "(true)",
      });

      expect(
        (
          await rawEngineRequest(socketPath, {
            ...identity,
            id: 20,
            method: "entities",
            limit: 2,
            offset: 0,
          })
        ).ok,
      ).toBe(true);
      expect(
        String(
          (
            await rawEngineRequest(socketPath, {
              ...identity,
              id: 21,
              method: "search",
              searchQuery: "fail-search",
              limit: 1,
              offset: 0,
            })
          ).error,
        ),
      ).toContain("Indexed search candidate query failed");
      expect(
        (
          await rawEngineRequest(socketPath, {
            ...identity,
            id: 22,
            method: "command",
            command: {
              version: 1,
              kind: "entities",
              type: "req",
              id: "REQ-X",
              tags: ["a"],
              sourceFile: "src/a.ts",
              limit: 1,
              offset: 0,
            },
          })
        ).ok,
      ).toBe(true);
      expect(
        (
          await rawEngineRequest(socketPath, {
            ...identity,
            id: 23,
            method: "command",
            command: {
              version: 1,
              kind: "search",
              query: "keep",
              type: "req",
              limit: 1,
              offset: 0,
            },
          })
        ).ok,
      ).toBe(true);
      await rawEngineRequest(socketPath, {
        ...identity,
        id: 24,
        method: "command",
        command: { version: 1, kind: "save" },
      });
      await rawEngineRequest(socketPath, {
        ...identity,
        id: 25,
        method: "command",
        command: {
          version: 1,
          kind: "persistence",
          action: "export",
          targetDirectory: path.join(root, "out"),
        },
      });
      await rawEngineRequest(socketPath, {
        ...identity,
        id: 26,
        method: "entities",
        type: "req",
        entityId: "REQ-NONE",
        tags: ["keep"],
        sourceFile: "docs/none.md",
        limit: 2,
        offset: 0,
      });

      await rawEngineRequest(socketPath, {
        ...identity,
        id: 99,
        method: "stop",
      });
      await Promise.race([
        daemon,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("daemon did not stop")), 8_000),
        ),
      ]);
    },
    20_000,
  );
});

describe("engine remaining attachment identity helpers", () => {
  test("parses, matches, and formats attachment identities", () => {
    restores.push(isolateKibiEnv());
    expect(parseEngineAttachmentIdentity(undefined)).toBeNull();
    expect(parseEngineAttachmentIdentity("not-json")).toBeNull();
    expect(
      parseEngineAttachmentIdentity(JSON.stringify(JSON.stringify({}))),
    ).toBeNull();
    const identity = {
      attachedPath: "/tmp/store",
      attachedGeneration: "gen-1",
      attachedDev: 1,
      attachedIno: 2,
    };
    expect(
      parseEngineAttachmentIdentity(JSON.stringify(JSON.stringify(identity))),
    ).toEqual({
      path: "/tmp/store",
      generation: "gen-1",
      dev: 1,
      ino: 2,
    });
    expect(engineAttachmentsMatch(null, null)).toBe(false);
    const left = {
      path: "/tmp/store",
      generation: "gen-1",
      dev: 8,
      ino: 9,
    };
    expect(
      engineAttachmentsMatch(left, { ...left, path: "/tmp/other" }),
    ).toBe(false);
    expect(engineAttachmentsMatch(left, left)).toBe(true);
    expect(
      engineAttachmentsMatch(
        { ...left, ino: 0 },
        { ...left, ino: 0, dev: 99 },
      ),
    ).toBe(true);
    expect(
      engineAttachmentsMatch(
        { ...left, ino: 0, generation: "" },
        { ...left, ino: 0, generation: "" },
      ),
    ).toBe(false);
    expect(
      formatEngineAttachmentMismatch("kb_save", null, null),
    ).toContain("branchStore=missing");
  });
});
