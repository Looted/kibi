// implements REQ-014
import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
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
    expect(
      engineAttachmentsMatch(left, { ...left, path: "/tmp/b" }),
    ).toBe(false);
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
    expect(() => new EngineClient({ workspaceRoot: tempRoot(), branch: "../x" })).toThrow(
      /Invalid Kibi engine branch name/,
    );
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
    await missing.stop(false);
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


