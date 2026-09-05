import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
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
      await client.queryBatch(["true"]);
      await client.save();
      await client.storageStatus();
      await client.checkpoint();
      await client.queryStatusJson();
      await client.compact();
      client.cancel(1);
    } finally {
      await client.stop(false).catch(() => undefined);
      await client.terminate();
    }
  });
});
