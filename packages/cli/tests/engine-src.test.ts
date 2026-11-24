import { afterEach, describe, expect, test } from "bun:test";
import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  lstatSync,
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
  ENGINE_IDLE_TIMEOUT_MS,
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
  readJournalGeneration,
} from "../src/engine.js";

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-engine-src-"));
  roots.push(root);
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("engine attachment helpers", () => {
  test("readJournalGeneration returns empty when CURRENT is absent", () => {
    const root = tempRoot();
    expect(readJournalGeneration(path.join(root, "missing"))).toBe("");
  });

  test("readEngineAttachmentIdentity returns null for a missing store and identity for a live path", () => {
    const root = tempRoot();
    expect(readEngineAttachmentIdentity(path.join(root, "gone"))).toBeNull();
    const store = path.join(root, "store");
    mkdirSync(store);
    writeFileSync(path.join(store, "CURRENT"), "gen-1\n");
    const identity = readEngineAttachmentIdentity(store);
    expect(identity).toMatchObject({
      generation: "gen-1",
      path: expect.stringContaining("store"),
    });
    expect(identity?.dev).toBeGreaterThanOrEqual(0);
    expect(identity?.ino).toBeGreaterThan(0);
  });

  test("parseEngineAttachmentIdentity handles missing, invalid, and valid payloads", () => {
    expect(parseEngineAttachmentIdentity(undefined)).toBeNull();
    expect(parseEngineAttachmentIdentity("not-json")).toBeNull();
    expect(
      parseEngineAttachmentIdentity(JSON.stringify(JSON.stringify({}))),
    ).toBeNull();
    const identity = {
      attachedPath: "/tmp/store",
      attachedGeneration: "g1",
      attachedDev: 1,
      attachedIno: 2,
    };
    expect(
      parseEngineAttachmentIdentity(JSON.stringify(JSON.stringify(identity))),
    ).toEqual({
      path: "/tmp/store",
      generation: "g1",
      dev: 1,
      ino: 2,
    });
  });

  test("engineAttachmentsMatch compares inode identity and generation fallbacks", () => {
    const left = {
      path: "/tmp/a",
      generation: "g1",
      dev: 1,
      ino: 2,
    };
    expect(engineAttachmentsMatch(null, left)).toBe(false);
    expect(engineAttachmentsMatch(left, null)).toBe(false);
    expect(engineAttachmentsMatch(left, { ...left, path: "/tmp/b" })).toBe(
      false,
    );
    expect(engineAttachmentsMatch(left, { ...left, ino: 9 })).toBe(false);
    expect(engineAttachmentsMatch(left, { ...left, dev: 1, ino: 2 })).toBe(
      true,
    );
    const generationOnly = { ...left, ino: 0 };
    expect(
      engineAttachmentsMatch(generationOnly, { ...generationOnly, ino: 0 }),
    ).toBe(true);
    expect(
      engineAttachmentsMatch(
        { ...generationOnly, generation: "" },
        { ...generationOnly, generation: "" },
      ),
    ).toBe(false);
  });

  test("formatEngineAttachmentMismatch labels missing sides", () => {
    expect(formatEngineAttachmentMismatch("query", null, null)).toContain(
      "branchStore=missing",
    );
    expect(
      formatEngineAttachmentMismatch(
        "save",
        { path: "/tmp/a", generation: "", dev: 0, ino: 0 },
        { path: "/tmp/b", generation: "g", dev: 0, ino: 0 },
      ),
    ).toContain("expectedGeneration=missing");
  });
});

describe("engine path and lease helpers", () => {
  test("derives isolated socket, pid, start, and publication lock paths", () => {
    const root = tempRoot();
    const socket = engineSocketPath(root, "main");
    expect(socket).toContain("kibi-");
    expect(enginePidPath(root, "main")).toBe(`${socket}.pid`);
    expect(engineStartLockPath(root, "main")).toBe(`${socket}.start.lock`);
    expect(enginePublicationLockPath(root, "main")).toBe(
      `${socket}.publish.lock`,
    );
    expect(engineSocketPath(root, "other")).not.toBe(socket);
    expect(engineSocketPath(path.join(root, "missing-root"), "main")).toContain(
      "kibi-",
    );
  });

  test("acquireEnginePublicationLease is exclusive and idempotent on release", () => {
    const root = tempRoot();
    const lease = acquireEnginePublicationLease(root, "main");
    expect(existsSync(lease.path)).toBe(true);
    expect(() => acquireEnginePublicationLease(root, "main")).toThrow(
      /already in progress/,
    );
    lease.release();
    lease.release();
    const again = acquireEnginePublicationLease(root, "main");
    again.release();
  });

  test("fsyncJournaledBranchStore walks rdf files and metadata", () => {
    const root = tempRoot();
    const store = path.join(root, "branch");
    mkdirSync(path.join(store, "rdf", "nested"), { recursive: true });
    writeFileSync(path.join(store, "rdf", "data"), "x");
    writeFileSync(path.join(store, "rdf", "nested", "leaf"), "y");
    writeFileSync(path.join(store, "rdf", "lock"), "lock");
    writeFileSync(path.join(store, "CURRENT"), "gen");
    writeFileSync(path.join(store, "storage.json"), "{}");
    writeFileSync(path.join(store, "kb.rdf"), "rdf");
    fsyncJournaledBranchStore(store);
    fsyncJournaledBranchStore(path.join(root, "empty"));
  });
});

describe("ensureJournaledBranchStoreAsync", () => {
  test("initializes an empty directory as a journaled store", async () => {
    const root = tempRoot();
    const store = path.join(root, "new-store");
    await ensureJournaledBranchStoreAsync(store);
    expect(existsSync(path.join(store, "storage.json"))).toBe(true);
    expect(existsSync(path.join(store, "rdf"))).toBe(true);
    await ensureJournaledBranchStoreAsync(store);
  });
});

describe("EngineClient from source", () => {
  test("rejects invalid branch names and serves a typed status command", async () => {
    expect(
      () => new EngineClient({ workspaceRoot: tempRoot(), branch: "../x" }),
    ).toThrow(/Invalid Kibi engine branch name/);
    const root = tempRoot();
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 15000,
    });
    try {
      await client.start();
      expect(client.isRunning()).toBe(true);
      const status = await client.command({ version: 1, kind: "status" });
      expect(status).toMatchObject({ success: true });
      const entities = await client.queryEntities({
        type: "req",
        id: "REQ-NONE",
        tags: ["none"],
        sourceFile: "src/none.ts",
        limit: 10,
        offset: 0,
      });
      expect(entities.count).toBe(0);
      const search = await client.searchEntities({
        query: "nothing",
        type: "req",
        limit: 5,
        offset: 0,
      });
      expect(search.count).toBe(0);
      await client.query("true");
      expect(await client.nextSolution()).toMatchObject({ success: true });
      client.invalidateCache();
      await client.query("findall(X, member(X, [1,2]), Xs)");
      await client.query("% comment\ntrue");
      await client.queryBatch(["true"]);
      await client.save();
      await client.storageStatus();
      await client.checkpoint();
      await client.queryStatusJson();
      await client.compact();
      await client.command({
        version: 1,
        kind: "persistence",
        action: "checkpoint",
      });
      await client.command({
        version: 1,
        kind: "persistence",
        action: "compact",
      });
      await client.command({
        version: 1,
        kind: "lifecycle",
        action: "cancel",
        requestId: 99,
      });
      const untyped = await client.queryEntities({
        limit: 5,
        offset: 0,
      });
      expect(untyped.count).toBe(0);
      const untypedSearch = await client.searchEntities({
        query: "none",
        limit: 5,
        offset: 0,
      });
      expect(untypedSearch.count).toBe(0);
      client.cancel(1);
      expect(await client.stop(false)).toBe(true);
    } finally {
      await client.stop(false).catch(() => undefined);
      await client.terminate();
    }
  });

  test("start respects publication locks and allowSpawn=false, and exportStorage round-trips", async () => {
    expect(ENGINE_PROTOCOL_VERSION).toBe(1);
    expect(ENGINE_IDLE_TIMEOUT_MS).toBeGreaterThan(0);
    const root = tempRoot();
    const lease = acquireEnginePublicationLease(root, "main");
    const locked = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2000,
    });
    await expect(locked.start()).rejects.toThrow(/publication is in progress/);
    lease.release();

    const missing = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2000,
    });
    await missing.start(false);
    expect(missing.isRunning()).toBe(false);
    expect(await missing.stop(false)).toBe(false);
    await missing.terminate();

    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 15000,
    });
    try {
      await client.start();
      const exportDir = path.join(root, "export-out");
      const exported = await client.exportStorage(exportDir);
      expect(exported).toMatchObject({ success: true });
    } finally {
      await client.stop(false).catch(() => undefined);
      await client.terminate();
    }
  });

  test("covers stale publication locks, missing workspace, and extra commands", async () => {
    const previousRuntime = process.env.KIBI_RUNTIME_DIR;
    const runtime = tempRoot();
    process.env.KIBI_RUNTIME_DIR = runtime;
    try {
      const missingRoot = path.join(tempRoot(), "does-not-exist-yet");
      const client = new EngineClient({
        workspaceRoot: missingRoot,
        branch: "main",
        timeout: 15000,
      });
      try {
        await client.start();
        expect(client.getPid()).toBeGreaterThan(0);
        await client.command({
          version: 1,
          kind: "check",
          rule: "orphan_entities",
        });
        await client.command({
          version: 1,
          kind: "relationship",
          action: "assert",
          type: "implements",
          from: "SYM-NONE",
          to: "REQ-NONE",
        });
        await client.command({
          version: 1,
          kind: "relationship",
          action: "retract",
          type: "implements",
          from: "SYM-NONE",
          to: "REQ-NONE",
        });
        await client.command({
          version: 1,
          kind: "persistence",
          action: "save",
        });
        await client.command({
          version: 1,
          kind: "search",
          query: "none",
          limit: 5,
          offset: 0,
        });
        await expect(client.query("halt(1)")).rejects.toThrow(
          /typed Kibi predicates/,
        );
        await expect(
          client.command({ version: 1, kind: "check", rule: "Bad-Rule" }),
        ).rejects.toThrow(/lowercase rule name/);
        await expect(
          client.searchEntities({ query: "   ", limit: 1, offset: 0 }),
        ).rejects.toThrow(/non-empty/);
        await expect(
          client.queryEntities({ limit: -1, offset: 0 }),
        ).rejects.toThrow(/bounded integers/);
        await expect(client.query("shell(true)")).rejects.toThrow(
          /typed Kibi predicates/,
        );
        expect(client.isRunning()).toBe(true);
      } finally {
        await client.stop(false).catch(() => undefined);
        await client.terminate();
      }

      const idle = new EngineClient({
        workspaceRoot: tempRoot(),
        branch: "main",
        timeout: 2000,
      });
      expect(idle.getPid()).toBe(0);
      await idle.stop(false);
      await idle.terminate();

      const staleWs = path.join(runtime, "ws-stale");
      mkdirSync(staleWs, { recursive: true });
      const lockPath = enginePublicationLockPath(staleWs, "main");
      writeFileSync(lockPath, "999999:1\n");
      const staleAt = (Date.now() - 15_000) / 1000;
      utimesSync(lockPath, staleAt, staleAt);
      const lease = acquireEnginePublicationLease(staleWs, "main");
      lease.release();
    } finally {
      if (previousRuntime === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_RUNTIME_DIR");
      } else {
        process.env.KIBI_RUNTIME_DIR = previousRuntime;
      }
    }
  });

  test("ensureJournaledBranchStoreAsync recovers incomplete journals and stale locks", async () => {
    const root = tempRoot();
    const store = path.join(root, "journaled");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      path.join(store, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    mkdirSync(path.join(store, "rdf.old.1"), { recursive: true });
    writeFileSync(path.join(store, "rdf.old.1", "data"), "x");
    writeFileSync(path.join(store, "CURRENT.old.1"), "generation-1:0\n");
    writeFileSync(path.join(store, "audit.log"), "legacy audit");
    writeFileSync(
      path.join(store, "kb.rdf"),
      "<rdf:RDF xmlns:rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#'></rdf:RDF>\n",
    );
    await ensureJournaledBranchStoreAsync(store);
    expect(existsSync(path.join(store, "CURRENT"))).toBe(true);

    const locked = path.join(root, "locked");
    await ensureJournaledBranchStoreAsync(locked);
    mkdirSync(path.join(locked, "rdf"), { recursive: true });
    writeFileSync(path.join(locked, "rdf", "lock"), "pid(1)\n");
    await ensureJournaledBranchStoreAsync(locked);

    const incomplete = path.join(root, "incomplete");
    mkdirSync(incomplete, { recursive: true });
    writeFileSync(
      path.join(incomplete, "storage.json"),
      '{"format":"kibi.rdf-journal.v1"}\n',
    );
    await expect(ensureJournaledBranchStoreAsync(incomplete)).rejects.toThrow(
      /incomplete/,
    );

    const corrupt = path.join(root, "corrupt");
    mkdirSync(corrupt, { recursive: true });
    writeFileSync(path.join(corrupt, "kb.rdf"), "not rdf");
    await expect(ensureJournaledBranchStoreAsync(corrupt)).rejects.toThrow(
      /corrupt/,
    );
  });
});

const unixSocketTest = test.skipIf(process.platform === "win32");

function createOrphanedUnixSocket(socketPath: string): void {
  mkdirSync(path.dirname(socketPath), { recursive: true, mode: 0o700 });
  const res = spawnSync(
    "python3",
    [
      "-c",
      [
        "import socket, sys",
        "s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)",
        "s.bind(sys.argv[1])",
        "s.close()",
      ].join("\n"),
      socketPath,
    ],
    { encoding: "utf8" },
  );
  if (res.status !== 0) {
    throw new Error(`Failed to create orphaned unix socket: ${res.stderr}`);
  }
}

describe("engine socket auto-reclaim and drain guards", () => {
  unixSocketTest(
    "startLockPath shields the bind-to-listen gap from concurrent reclaim",
    async () => {
      const root = tempRoot();
      const socketPath = engineSocketPath(root, "main");
      const pidPath = enginePidPath(root, "main");
      const startLockPath = engineStartLockPath(root, "main");
      mkdirSync(path.dirname(socketPath), { recursive: true, mode: 0o700 });
      // Starter A holds startLockPath across bind() -> listen().
      writeFileSync(startLockPath, `${process.pid}:${Date.now()}\n`);

      const child = spawn(
        "python3",
        [
          "-u",
          "-c",
          [
            "import json, socket, struct, sys",
            "sock_path = sys.argv[1]",
            "s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)",
            "s.bind(sock_path)",
            "print('BOUND', flush=True)",
            "sys.stdin.readline()",
            "s.listen(4)",
            "print('LISTENING', flush=True)",
            "conn, _ = s.accept()",
            "hdr = conn.recv(4)",
            "if len(hdr) == 4:",
            "    n = struct.unpack('>I', hdr)[0]",
            "    req = json.loads(conn.recv(n).decode('utf-8'))",
            "    body = json.dumps({'id': req['id'], 'ok': True, 'result': {'stopped': True}}).encode('utf-8')",
            "    conn.sendall(struct.pack('>I', len(body)) + body)",
            "conn.close()",
            "s.close()",
          ].join("\n"),
          socketPath,
        ],
        { stdio: ["pipe", "pipe", "pipe"] },
      );

      try {
        await new Promise<void>((resolve, reject) => {
          let buf = "";
          const timer = setTimeout(
            () => reject(new Error(`Helper bind timeout: ${buf}`)),
            5_000,
          );
          child.stdout.setEncoding("utf8");
          child.stdout.on("data", (chunk: string) => {
            buf += chunk;
            if (buf.includes("BOUND")) {
              clearTimeout(timer);
              resolve();
            }
          });
          child.once("exit", (code) => {
            clearTimeout(timer);
            reject(new Error(`Helper exited early (${code})`));
          });
        });

        // Socket exists on disk in ECONNREFUSED state (between bind and listen).
        expect(lstatSync(socketPath).isSocket()).toBe(true);

        // Concurrent caller cannot acquire startLockPath to unlink the booting socket.
        const contender = new EngineClient({
          workspaceRoot: root,
          branch: "main",
          timeout: 150,
        });
        await expect(contender.stopOrReclaim()).rejects.toThrow(
          "Kibi engine start or shutdown is already in progress",
        );
        expect(lstatSync(socketPath).isSocket()).toBe(true);

        // Starter A transitions the same socket to listen(), publishes pid, releases startLockPath.
        await new Promise<void>((resolve, reject) => {
          let buf = "";
          const timer = setTimeout(
            () => reject(new Error(`Helper listen timeout: ${buf}`)),
            5_000,
          );
          child.stdout.on("data", (chunk: string) => {
            buf += chunk;
            if (buf.includes("LISTENING")) {
              clearTimeout(timer);
              resolve();
            }
          });
          child.stdin.write("LISTEN\n");
        });
        writeFileSync(pidPath, `${child.pid}\n`);
        rmSync(startLockPath, { force: true });

        // Once startLockPath is released, caller connects to the live listener and stops it cleanly.
        const stopper = new EngineClient({
          workspaceRoot: root,
          branch: "main",
          timeout: 2_000,
        });
        setTimeout(() => {
          rmSync(socketPath, { force: true });
          rmSync(pidPath, { force: true });
        }, 60);
        expect(await stopper.stopOrReclaim()).toBe(true);
      } finally {
        try {
          child.kill("SIGKILL");
        } catch {}
        rmSync(startLockPath, { force: true });
        rmSync(socketPath, { force: true });
        rmSync(pidPath, { force: true });
      }
    },
  );

  unixSocketTest(
    "reclaims an ECONNREFUSED dead unix socket at 0 ms even when pid was recycled",
    async () => {
      const root = tempRoot();
      const socketPath = engineSocketPath(root, "main");
      const pidPath = enginePidPath(root, "main");
      createOrphanedUnixSocket(socketPath);
      // Simulate recycled OS PID still alive alongside dead socket.
      writeFileSync(pidPath, `${process.pid}\n`);

      const client = new EngineClient({
        workspaceRoot: root,
        branch: "main",
        timeout: 5_000,
      });
      const started = performance.now();
      expect(await client.stopOrReclaim()).toBe(false);
      expect(performance.now() - started).toBeLessThan(500);
      expect(existsSync(socketPath)).toBe(false);
      expect(existsSync(pidPath)).toBe(false);
    },
  );

  test("waits on actively draining pid without publication lease, but treats stale non-touching pid differently on rebuild/migrate", async () => {
    const root1 = tempRoot();
    const sock1 = engineSocketPath(root1, "main");
    const pid1 = enginePidPath(root1, "main");
    mkdirSync(path.dirname(sock1), { recursive: true, mode: 0o700 });
    const helper1 = spawn(
      process.execPath,
      ["-e", "setTimeout(() => {}, 10000)"],
      { stdio: "ignore" },
    );
    try {
      writeFileSync(pid1, `${helper1.pid}\n`);
      const touchTimer = setInterval(() => {
        const now = new Date();
        try {
          utimesSync(pid1, now, now);
        } catch {}
      }, 60);
      setTimeout(() => {
        clearInterval(touchTimer);
        rmSync(pid1, { force: true });
      }, 220);

      const started = performance.now();
      const stopped = await new EngineClient({
        workspaceRoot: root1,
        branch: "main",
        timeout: 2_000,
      }).stopOrReclaim();
      expect(stopped).toBe(true);
      expect(performance.now() - started).toBeGreaterThanOrEqual(150);
    } finally {
      try {
        helper1.kill("SIGKILL");
      } catch {}
    }

    // Stale mtime (> 5s) + alive PID: a non-lease caller waits the full stop
    // window (a daemon from an older release drains without touching its pid
    // file) and then clears it; holdsPublicationLease=true waits for the
    // older daemon to finish draining.
    const root2 = tempRoot();
    const sock2 = engineSocketPath(root2, "main");
    const pid2 = enginePidPath(root2, "main");
    mkdirSync(path.dirname(sock2), { recursive: true, mode: 0o700 });
    const helper2 = spawn(
      process.execPath,
      ["-e", "setTimeout(() => {}, 10000)"],
      { stdio: "ignore" },
    );
    try {
      writeFileSync(pid2, `${helper2.pid}\n`);
      const staleTime = (Date.now() - 10_000) / 1000;
      utimesSync(pid2, staleTime, staleTime);

      const nonLease = new EngineClient({
        workspaceRoot: root2,
        branch: "main",
        timeout: 2_000,
      });
      const reclaimStarted = performance.now();
      expect(await nonLease.stopOrReclaim({ holdsPublicationLease: false })).toBe(
        false,
      );
      expect(performance.now() - reclaimStarted).toBeGreaterThanOrEqual(4_900);
      expect(existsSync(pid2)).toBe(false);

      // Re-create stale pid file and test holdsPublicationLease=true (5 s wait).
      writeFileSync(pid2, `${helper2.pid}\n`);
      utimesSync(pid2, staleTime, staleTime);
      setTimeout(() => rmSync(pid2, { force: true }), 220);
      const leaseClient = new EngineClient({
        workspaceRoot: root2,
        branch: "main",
        timeout: 2_000,
        allowPublicationLock: true,
      });
      const started = performance.now();
      expect(
        await leaseClient.stopOrReclaim({ holdsPublicationLease: true }),
      ).toBe(true);
      expect(performance.now() - started).toBeGreaterThanOrEqual(150);
    } finally {
      try {
        helper2.kill("SIGKILL");
      } catch {}
    }
  }, 20_000);

  unixSocketTest(
    "fails closed on regular files and EACCES sockets without unlinking them",
    async () => {
      const root = tempRoot();
      const socketPath = engineSocketPath(root, "main");
      mkdirSync(path.dirname(socketPath), { recursive: true, mode: 0o700 });
      writeFileSync(socketPath, "not a socket");

      const client = new EngineClient({
        workspaceRoot: root,
        branch: "main",
        timeout: 500,
      });
      await expect(client.stopOrReclaim()).rejects.toThrow(
        "socket remains present but is not reachable",
      );
      expect(existsSync(socketPath)).toBe(true);
      await expect(client.start()).rejects.toThrow(
        "socket remains present but is not reachable",
      );
      expect(existsSync(socketPath)).toBe(true);
      rmSync(socketPath, { force: true });

      if (process.getuid?.() !== 0) {
        const server = net.createServer();
        await new Promise<void>((resolve) =>
          server.listen(socketPath, resolve),
        );
        try {
          chmodSync(socketPath, 0o000);
          await expect(client.stopOrReclaim()).rejects.toThrow(
            "socket remains present but is not reachable",
          );
          expect(lstatSync(socketPath).isSocket()).toBe(true);
        } finally {
          chmodSync(socketPath, 0o600);
          server.close();
          rmSync(socketPath, { force: true });
        }
      }
    },
  );
});
