import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import * as childProcess from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  EngineClient,
  enginePidPath,
  engineSocketPath,
  engineSwiplIdentity,
  ensureJournaledBranchStoreAsync,
  readEngineAttachmentIdentity,
  runEngineDaemon,
} from "../src/engine.js";
import { PrologProcess } from "../src/prolog.js";
import { runOperationJsonQuery } from "../src/public/operations/prolog-json.js";
import type { PrologPort } from "../src/public/operations/runtime-types.js";
import { ensureBranchStoreManifest } from "../src/utils/branch-store-locator.js";

const roots: string[] = [];
const restores: Array<() => void> = [];
const baselineSigterm = process.listeners("SIGTERM").slice();
const baselineSigint = process.listeners("SIGINT").slice();

function tempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-engine-daemon-"));
  roots.push(root);
  return root;
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

afterEach(async () => {
  for (const restore of restores.splice(0)) restore();
  restoreProcessSignals();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

async function waitForSocket(
  socketPath: string,
  timeoutMs = 20_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(socketPath) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (!existsSync(socketPath)) {
    throw new Error(`engine socket never appeared: ${socketPath}`);
  }
}

describe("ensureJournaledBranchStoreAsync interrupted-generation recovery", () => {
  test("restores a matching rdf.old / CURRENT.old pair and writes the sentinel", async () => {
    const root = tempRoot();
    const store = path.join(root, "branch");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      path.join(store, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    mkdirSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(path.join(store, "rdf", "placeholder"), "partial");
    mkdirSync(path.join(store, "rdf.old.z"), { recursive: true });
    writeFileSync(path.join(store, "rdf.old.z", "data"), "restored");
    writeFileSync(path.join(store, "CURRENT.old.z"), "generation-9:1\n");
    await ensureJournaledBranchStoreAsync(store);
    expect(existsSync(path.join(store, "rdf", "data"))).toBe(true);
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toContain(
      "generation-9:1",
    );
    expect(readFileSync(path.join(store, "kb.rdf"), "utf8")).toContain(
      "kibi.rdf-journal.v1",
    );
  });

  test("restores rdf.old alone then fails closed when CURRENT is still missing", async () => {
    const root = tempRoot();
    const store = path.join(root, "branch");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      path.join(store, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    mkdirSync(path.join(store, "rdf.old.only"), { recursive: true });
    writeFileSync(path.join(store, "rdf.old.only", "data"), "half");
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      /incomplete/,
    );
    expect(existsSync(path.join(store, "rdf"))).toBe(true);
  });

  test("restores CURRENT.old alone then fails closed when rdf is still missing", async () => {
    const root = tempRoot();
    const store = path.join(root, "branch");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      path.join(store, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    writeFileSync(path.join(store, "CURRENT.old.only"), "generation-3:0\n");
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      /incomplete/,
    );
    expect(readFileSync(path.join(store, "CURRENT"), "utf8")).toContain(
      "generation-3:0",
    );
  });
  test("throws when the journal marker is present with no generation and no legacy store", async () => {
    const root = tempRoot();
    const store = path.join(root, "branch");
    mkdirSync(store, { recursive: true });
    writeFileSync(
      path.join(store, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    await expect(ensureJournaledBranchStoreAsync(store)).rejects.toThrow(
      /incomplete/,
    );
  });

  test("removes a stale rdf lock whose pid is no longer alive", async () => {
    const root = tempRoot();
    const store = path.join(root, "branch");
    mkdirSync(path.join(store, "rdf"), { recursive: true });
    writeFileSync(
      path.join(store, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    writeFileSync(path.join(store, "CURRENT"), "generation-1:0\n");
    const lockPath = path.join(store, "rdf", "lock");
    writeFileSync(lockPath, "pid(999999999)\n");
    await ensureJournaledBranchStoreAsync(store);
    expect(existsSync(lockPath)).toBe(false);
  });
});

describe("runEngineDaemon in-process", () => {
  const exitSpy = spyOn(process, "exit").mockImplementation((() => {
    return undefined as never;
  }) as typeof process.exit);

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
    exitSpy.mockRestore();
  });

  test("rejects an invalid branch before listening", async () => {
    const root = tempRoot();
    await expect(
      runEngineDaemon({
        workspaceRoot: root,
        branch: "../x",
        socketPath: path.join(root, "engine.sock"),
      }),
    ).rejects.toThrow(/Invalid Kibi engine branch name/);
  });

  test("serves EngineClient RPCs in-process and reports getPid", async () => {
    const previousIdle = process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS;
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "60000";
    restores.push(() => {
      if (previousIdle === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_ENGINE_IDLE_TIMEOUT_MS");
      } else {
        process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = previousIdle;
      }
    });

    const root = tempRoot();
    ensureBranchStoreManifest(root, "main");
    const socketPath = engineSocketPath(root, "main");
    const daemon = runEngineDaemon({
      workspaceRoot: root,
      branch: "main",
      socketPath,
    });
    await waitForSocket(socketPath);

    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 20_000,
    });
    try {
      expect(client.getPid()).toBeGreaterThan(0);
      await client.start(false);
      expect(client.isRunning()).toBe(true);
      expect(client.getPid()).toBe(process.pid);
      const status = await client.command({ version: 1, kind: "status" });
      expect(status).toMatchObject({ success: true });
      await client.query("true");
      await client.queryBatch(["true"]);
      await client.queryEntities({ limit: 5, offset: 0 });
      await client.searchEntities({ query: "nothing", limit: 3, offset: 0 });
      await client.save();
      await client.storageStatus();
      await client.checkpoint();
      await client.queryStatusJson();
      await client.queryStatusJson();
      await client.compact();
      client.cancel(99);
      await client.command({
        version: 1,
        kind: "relationship",
        action: "assert",
        type: "relates_to",
        from: "REQ-A",
        to: "REQ-B",
      });
      await client.command({
        version: 1,
        kind: "relationship",
        action: "retract",
        type: "relates_to",
        from: "REQ-A",
        to: "REQ-B",
      });
      await client.command({
        version: 1,
        kind: "persistence",
        action: "checkpoint",
      });
      await client.command({
        version: 1,
        kind: "lifecycle",
        action: "cancel",
        requestId: 7,
      });
      const exportDir = path.join(root, "export-out");
      await client.exportStorage(exportDir);
      await expect(
        client.queryEntities({ limit: -1, offset: 0 }),
      ).rejects.toThrow();
      await expect(
        client.searchEntities({ query: "   ", limit: 1, offset: 0 }),
      ).rejects.toThrow();
      await expect(
        client.command({
          version: 1,
          kind: "check",
          rule: "Not_a_rule",
        }),
      ).rejects.toThrow(/lowercase rule name/);
      await client.command({ version: 1, kind: "check", rule: "integrity" });
      await client.queryEntities({
        type: "req",
        id: "REQ-NONE",
        tags: ["keep"],
        sourceFile: "docs/none.md",
        limit: 2,
        offset: 0,
      });
      await client.searchEntities({
        query: "keep",
        type: "req",
        limit: 2,
        offset: 0,
      });
      await expect(
        client.command({
          version: 1,
          kind: "relationship",
          action: "assert",
        } as never),
      ).rejects.toThrow(/requires type, from, and to/);
      await expect(
        client.command({
          version: 1,
          kind: "persistence",
          action: "export",
        } as never),
      ).rejects.toThrow(/targetDirectory/);
      await expect(
        client.command({
          version: 1,
          kind: "lifecycle",
          action: "cancel",
        } as never),
      ).rejects.toThrow(/requestId/);
      await expect(
        client.command({
          version: 1,
          kind: "search",
          query: "   ",
          limit: 1,
          offset: 0,
        } as never),
      ).rejects.toThrow(/non-empty/);
      await expect(
        client.command({
          version: 1,
          kind: "entities",
          limit: -1,
          offset: 0,
        } as never),
      ).rejects.toThrow(/bounded integers/);
      await expect(
        client.command({
          version: 1,
          kind: "search",
          query: "keep",
          limit: -1,
          offset: 0,
        } as never),
      ).rejects.toThrow(/bounded integers/);
      await client.stop(false);
    } finally {
      await client.terminate();
    }
    await daemon;
  }, 90_000);

  test("records engine cache hits separately from Prolog query round trips", async () => {
    const root = tempRoot();
    const traceDir = path.join(root, "trace");
    mkdirSync(traceDir, { mode: 0o700 });
    const previousEnabled = process.env.KIBI_PERF_TIMINGS;
    const previousTraceDir = process.env.KIBI_PERF_TRACE_DIR;
    const previousIdle = process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS;
    let daemon: Promise<void> | null = null;
    let client: EngineClient | null = null;
    try {
      process.env.KIBI_PERF_TIMINGS = "1";
      process.env.KIBI_PERF_TRACE_DIR = traceDir;
      process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "60000";
      ensureBranchStoreManifest(root, "main");
      const socketPath = engineSocketPath(root, "main");
      daemon = runEngineDaemon({
        workspaceRoot: root,
        branch: "main",
        socketPath,
      });
      await waitForSocket(socketPath);
      client = new EngineClient({
        workspaceRoot: root,
        branch: "main",
        timeout: 20_000,
      });
      await client.start(false);
      const goal = "findall(Id, kb_entity(Id, _, _), Ids)";
      const tracePath = path.join(
        traceDir,
        `kibi-performance-${process.pid}.jsonl`,
      );
      const traceOffset = existsSync(tracePath)
        ? readFileSync(tracePath).length
        : 0;
      const first = await client.query(goal);
      const second = await client.query(goal);
      expect(second).toEqual(first);

      const traceFiles = readdirSync(traceDir);
      expect(traceFiles).toHaveLength(1);
      const traceName = traceFiles[0];
      if (traceName === undefined) throw new Error("Trace file is missing");
      const traceBytes = readFileSync(path.join(traceDir, traceName));
      const events = traceBytes
        .subarray(traceOffset)
        .toString("utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      expect(events.map(({ kind }) => kind)).toEqual([
        "prolog-round-trip",
        "engine-query-cache-hit",
      ]);
      for (const event of events) {
        expect(Object.keys(event).sort()).toEqual([
          "durationMs",
          "kind",
          "pid",
        ]);
        expect(Number.isFinite(event.durationMs) && event.durationMs >= 0).toBe(
          true,
        );
        expect(event.pid).toBe(process.pid);
      }
    } finally {
      try {
        if (client !== null) {
          await client.stop(false).catch(() => undefined);
          await client.terminate();
        }
      } finally {
        try {
          if (daemon !== null) await daemon;
        } finally {
          if (previousEnabled === undefined)
            Reflect.deleteProperty(process.env, "KIBI_PERF_TIMINGS");
          else process.env.KIBI_PERF_TIMINGS = previousEnabled;
          if (previousTraceDir === undefined)
            Reflect.deleteProperty(process.env, "KIBI_PERF_TRACE_DIR");
          else process.env.KIBI_PERF_TRACE_DIR = previousTraceDir;
          if (previousIdle === undefined)
            Reflect.deleteProperty(process.env, "KIBI_ENGINE_IDLE_TIMEOUT_MS");
          else process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = previousIdle;
        }
      }
    }
  }, 90_000);

  test("idle timeout shuts the in-process daemon down without a client", async () => {
    const previousIdle = process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS;
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "100";
    restores.push(() => {
      if (previousIdle === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_ENGINE_IDLE_TIMEOUT_MS");
      } else {
        process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = previousIdle;
      }
    });

    const root = tempRoot();
    ensureBranchStoreManifest(root, "main");
    const socketPath = engineSocketPath(root, "main");
    const daemon = runEngineDaemon({
      workspaceRoot: root,
      branch: "main",
      socketPath,
    });
    await waitForSocket(socketPath);
    await Promise.race([
      daemon,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("idle daemon did not exit")), 8_000),
      ),
    ]);
    expect(exitSpy).toHaveBeenCalled();
  }, 20_000);

  // Regression for Looted/kibi#285: an output overflow used to terminate the
  // daemon's SWI child and leave the port silently falling back to isolated
  // one-shot processes, so the split `use_module` + `discovery:*` requests
  // ran in different processes and failed with an existence error.
  test("recycles its Prolog session after an output overflow so module-qualified JSON operations keep working", async () => {
    const previousIdle = process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS;
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "60000";
    restores.push(() => {
      if (previousIdle === undefined) {
        Reflect.deleteProperty(process.env, "KIBI_ENGINE_IDLE_TIMEOUT_MS");
      } else {
        process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = previousIdle;
      }
    });
    const errorSpy = spyOn(console, "error").mockImplementation(() => {});
    restores.push(() => errorSpy.mockRestore());

    const root = tempRoot();
    ensureBranchStoreManifest(root, "main");
    const socketPath = engineSocketPath(root, "main");
    const daemon = runEngineDaemon({
      workspaceRoot: root,
      branch: "main",
      socketPath,
      maxOutputBytes: 64 * 1024,
    });
    await waitForSocket(socketPath);
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 60_000,
    });
    try {
      await client.start(false);
      const seeded = await client.query(
        `kb_assert_entity(req, [id='REQ-RECYCLE', title="Recycle", status=active, created_at="2026-09-26T00:00:00Z", updated_at="2026-09-26T00:00:00Z", source="docs/recycle.md"])`,
      );
      expect(seeded.success).toBe(true);
      // Distinct limits keep the second call out of any result cache.
      const coverageGoal = (limit: number): string =>
        `discovery:coverage_report_json('req', [], false, true, ${limit}, 0, unknown, '2026-09-26T00:00:00Z', 604800, JsonString)`;
      // Exercise the production split path (no Bun one-shot heuristic).
      process.env.NODE_ENV = "production";
      restores.push(() => {
        if (previousNodeEnv === undefined) {
          Reflect.deleteProperty(process.env, "NODE_ENV");
        } else {
          process.env.NODE_ENV = previousNodeEnv;
        }
      });
      const before = await runOperationJsonQuery<{ rows: unknown[] }>(
        client as unknown as PrologPort,
        "discovery.pl",
        coverageGoal(10),
        "Coverage execution",
      );
      expect(before.rows).toHaveLength(1);

      const overflow = await client.query(
        "findall(X, between(1, 200000, X), Numbers)",
      );
      expect(overflow.success).toBe(false);
      expect(overflow.error).toContain("ENOBUFS");

      const after = await runOperationJsonQuery<{ rows: unknown[] }>(
        client as unknown as PrologPort,
        "discovery.pl",
        coverageGoal(11),
        "Coverage execution",
      );
      // A degraded one-shot fallback would answer from an unattached store.
      expect(after).toEqual(before);
      // The recycled session is reattached to the branch store.
      const status = await client.command({ version: 1, kind: "status" });
      expect(status).toMatchObject({ success: true });
      expect(
        errorSpy.mock.calls.some((call) =>
          String(call[0]).includes("engine Prolog session was lost"),
        ),
      ).toBe(true);
      await client.stop(false);
    } finally {
      await client.terminate();
    }
    await daemon;
  }, 90_000);

  test("idle shutdown refuses new connections before a delayed durability save finishes", async () => {
    const previousIdle = process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS;
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "100";
    restores.push(() => {
      if (previousIdle === undefined)
        Reflect.deleteProperty(process.env, "KIBI_ENGINE_IDLE_TIMEOUT_MS");
      else process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = previousIdle;
    });
    let releaseSave!: () => void;
    let enteredSave!: () => void;
    const saveStarted = new Promise<void>((resolve) => {
      enteredSave = resolve;
    });
    const saveBarrier = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined,
    );
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    const query = spyOn(PrologProcess.prototype, "query").mockImplementation(
      async (goal) => {
        if (goal === "kb_save") {
          enteredSave();
          await saveBarrier;
        }
        return { success: true, bindings: {} };
      },
    );
    restores.push(() => {
      start.mockRestore();
      terminate.mockRestore();
      query.mockRestore();
    });
    const root = tempRoot();
    const socketPath = engineSocketPath(root, "main");
    const daemon = runEngineDaemon({
      workspaceRoot: root,
      branch: "main",
      socketPath,
    });
    let daemonFinished = false;
    void daemon.then(() => {
      daemonFinished = true;
    });
    try {
      await Promise.race([
        saveStarted,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("shutdown never reached save")),
            2_000,
          ),
        ),
      ]);
      expect(daemonFinished).toBe(false);
      expect(existsSync(enginePidPath(root, "main"))).toBe(true);
      const connection = new Promise<void>((resolve, reject) => {
        const socket = net.createConnection(socketPath);
        const timer = setTimeout(() => {
          socket.destroy();
          reject(new Error("connection timeout"));
        }, 250);
        socket.once("connect", () => {
          clearTimeout(timer);
          socket.destroy();
          resolve();
        });
        socket.on("error", (error) => {
          clearTimeout(timer);
          socket.destroy();
          reject(error);
        });
      });
      await expect(connection).rejects.toThrow();
      const stopObserver = new EngineClient({
        workspaceRoot: root,
        branch: "main",
        timeout: 1_000,
      });
      let stopFinished = false;
      const stopping = stopObserver.stop(false).then(() => {
        stopFinished = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(stopFinished).toBe(false);
      releaseSave();
      await stopping;
      await stopObserver.terminate();
      expect(stopFinished).toBe(true);
      expect(terminate).toHaveBeenCalledTimes(1);
    } finally {
      releaseSave();
      await daemon;
    }
    expect(terminate).toHaveBeenCalledTimes(1);
    expect(existsSync(enginePidPath(root, "main"))).toBe(false);
  }, 5_000);

  test("explicit stop waits for the delayed save after the listener closes", async () => {
    let releaseSave!: () => void;
    let enteredSave!: () => void;
    const saveStarted = new Promise<void>((resolve) => {
      enteredSave = resolve;
    });
    const saveBarrier = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined,
    );
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    const query = spyOn(PrologProcess.prototype, "query").mockImplementation(
      async (goal) => {
        if (goal === "kb_save") {
          enteredSave();
          await saveBarrier;
        }
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify(JSON.stringify({ branch: "main" })),
          },
        };
      },
    );
    restores.push(() => {
      start.mockRestore();
      terminate.mockRestore();
      query.mockRestore();
    });
    const root = tempRoot();
    const socketPath = engineSocketPath(root, "main");
    const daemon = runEngineDaemon({
      workspaceRoot: root,
      branch: "main",
      socketPath,
    });
    await waitForSocket(socketPath);
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2_000,
    });
    await client.start(false);
    const peer = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2_000,
    });
    await peer.start(false);
    let stopped = false;
    const stopping = client.stop(false).then(() => {
      stopped = true;
    });
    try {
      await saveStarted;
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(stopped).toBe(false);
      expect(terminate).not.toHaveBeenCalled();
      expect(existsSync(enginePidPath(root, "main"))).toBe(true);
      await expect(peer.query("true")).rejects.toThrow(
        "request was not executed",
      );
      expect(query.mock.calls.filter(([goal]) => goal === "true")).toHaveLength(
        0,
      );
    } finally {
      releaseSave();
      await stopping;
      await daemon;
      await client.terminate();
      await peer.terminate();
    }
    expect(stopped).toBe(true);
    expect(terminate).toHaveBeenCalledTimes(1);
  }, 5_000);

  test("startup waits for a draining daemon before its read-only handshake and sends the application request once", async () => {
    const previousIdle = process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS;
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "100";
    restores.push(() => {
      if (previousIdle === undefined)
        Reflect.deleteProperty(process.env, "KIBI_ENGINE_IDLE_TIMEOUT_MS");
      else process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = previousIdle;
    });
    let releaseSave!: () => void;
    let enteredSave!: () => void;
    const saveStarted = new Promise<void>((resolve) => {
      enteredSave = resolve;
    });
    const saveBarrier = new Promise<void>((resolve) => {
      releaseSave = resolve;
    });
    let saves = 0;
    const goals: string[] = [];
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined,
    );
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockResolvedValue(undefined);
    const query = spyOn(PrologProcess.prototype, "query").mockImplementation(
      async (goal) => {
        const text = Array.isArray(goal) ? goal.join(", ") : goal;
        goals.push(text);
        if (text === "kb_save" && saves++ === 0) {
          enteredSave();
          await saveBarrier;
        }
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify(JSON.stringify({ branch: "main" })),
          },
        };
      },
    );
    const spawn = spyOn(childProcess, "spawn");
    restores.push(() => {
      spawn.mockRestore();
      start.mockRestore();
      terminate.mockRestore();
      query.mockRestore();
    });
    const root = tempRoot();
    const socketPath = engineSocketPath(root, "main");
    const daemon = runEngineDaemon({
      workspaceRoot: root,
      branch: "main",
      socketPath,
    });
    await saveStarted;
    // Model another waiting starter publishing a successor after the old
    // writer releases its branch lock. No application RPC is retried.
    const successor = daemon.then(() =>
      runEngineDaemon({ workspaceRoot: root, branch: "main", socketPath }),
    );
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2_000,
    });
    const application = client.query("true");
    try {
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(spawn).not.toHaveBeenCalled();
      expect(goals.filter((goal) => goal === "true")).toHaveLength(0);
      releaseSave();
      expect((await application).success).toBe(true);
      expect(goals.filter((goal) => goal === "true")).toHaveLength(1);
      expect(spawn).not.toHaveBeenCalled();
    } finally {
      releaseSave();
      await application.catch(() => undefined);
      await client.stop(false);
      await client.terminate();
      await successor;
    }
  }, 5_000);

  test("startup retries only a closed attachment handshake and discards its partial frame", async () => {
    const createConnection = spyOn(net, "createConnection");
    restores.push(() => createConnection.mockRestore());
    const root = tempRoot();
    const attached = readEngineAttachmentIdentity(
      ensureBranchStoreManifest(root, "main"),
    );
    expect(attached).not.toBeNull();
    const statusBindings = {
      JsonString: JSON.stringify(
        JSON.stringify({
          attachedPath: attached?.path,
          attachedGeneration: attached?.generation,
          attachedDev: attached?.dev,
          attachedIno: attached?.ino,
        }),
      ),
    };
    const socketPath = engineSocketPath(root, "main");
    mkdirSync(path.dirname(socketPath), { recursive: true });
    let connections = 0;
    let applicationRequests = 0;
    const server = net.createServer((socket) => {
      const connection = ++connections;
      socket.on("error", () => undefined);
      let buffer = Buffer.alloc(0);
      socket.on("data", (chunk) => {
        buffer = Buffer.concat([
          buffer,
          typeof chunk === "string" ? Buffer.from(chunk) : chunk,
        ]);
        while (buffer.length >= 4) {
          const length = buffer.readUInt32BE(0);
          if (buffer.length < length + 4) return;
          const request = JSON.parse(
            buffer.subarray(4, length + 4).toString("utf8"),
          );
          buffer = buffer.subarray(length + 4);
          if (connection === 1) {
            // The first listener drains after accepting the connection. Its
            // incomplete status response must not prefix the next connection.
            socket.end(Buffer.from([0, 0]));
            return;
          }
          if (request.method === "query" && request.goal === "true") {
            applicationRequests += 1;
            const oldClientSocket = createConnection.mock.results[0]?.value;
            if (!(oldClientSocket instanceof net.Socket)) {
              throw new Error(
                "Expected the retired client connection to be a Socket",
              );
            }
            // A late fragment from the retired connection must not alter the
            // current connection's frame buffer while its response is pending.
            oldClientSocket.emit("data", Buffer.from([0, 0]));
          }
          const payload = Buffer.from(
            JSON.stringify({
              id: request.id,
              ok: true,
              // A live daemon reports the SWI-Prolog it runs on before the
              // attachment status handshake.
              result:
                request.method === "handshake"
                  ? { prologIdentity: engineSwiplIdentity() }
                  : { success: true, bindings: statusBindings },
            }),
          );
          const header = Buffer.alloc(4);
          header.writeUInt32BE(payload.length);
          socket.write(Buffer.concat([header, payload]));
        }
      });
    });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(socketPath, resolve);
    });
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 1_000,
    });
    try {
      expect((await client.query("true")).success).toBe(true);
      expect(connections).toBe(2);
      expect(applicationRequests).toBe(1);
    } finally {
      await client.terminate();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }, 5_000);

  test("signal shutdown finishes an accepted request before saving and releasing the writer", async () => {
    let releaseQuery!: () => void;
    let enteredQuery!: () => void;
    const queryStarted = new Promise<void>((resolve) => {
      enteredQuery = resolve;
    });
    const queryBarrier = new Promise<void>((resolve) => {
      releaseQuery = resolve;
    });
    const order: string[] = [];
    const start = spyOn(PrologProcess.prototype, "start").mockResolvedValue(
      undefined,
    );
    const terminate = spyOn(
      PrologProcess.prototype,
      "terminate",
    ).mockImplementation(async () => {
      order.push("terminate");
    });
    const query = spyOn(PrologProcess.prototype, "query").mockImplementation(
      async (goal) => {
        if (goal === "kb_test_active_query") {
          enteredQuery();
          await queryBarrier;
          order.push("accepted-query");
        }
        if (goal === "kb_save") order.push("save");
        return {
          success: true,
          bindings: {
            JsonString: JSON.stringify(JSON.stringify({ branch: "main" })),
          },
        };
      },
    );
    restores.push(() => {
      start.mockRestore();
      terminate.mockRestore();
      query.mockRestore();
    });
    const root = tempRoot();
    const socketPath = engineSocketPath(root, "main");
    const daemon = runEngineDaemon({
      workspaceRoot: root,
      branch: "main",
      socketPath,
    });
    await waitForSocket(socketPath);
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2_000,
    });
    await client.start(false);
    const application = client.query("kb_test_active_query");
    try {
      await queryStarted;
      const signal = process
        .listeners("SIGTERM")
        .find((listener) => !baselineSigterm.includes(listener));
      expect(signal).toBeDefined();
      signal?.("SIGTERM");
      await new Promise((resolve) => setTimeout(resolve, 30));
      expect(order).toEqual([]);
      expect(existsSync(enginePidPath(root, "main"))).toBe(true);
      releaseQuery();
      expect((await application).success).toBe(true);
      await daemon;
      expect(order).toEqual(["accepted-query", "save", "terminate"]);
    } finally {
      releaseQuery();
      await application.catch(() => undefined);
      await daemon;
      await client.terminate();
    }
  }, 5_000);

  test("getPid returns 0 when the pid file is absent", () => {
    const root = tempRoot();
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 1000,
    });
    expect(client.getPid()).toBe(0);
  });
});
