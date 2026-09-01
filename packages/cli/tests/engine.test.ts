/// <reference types="bun-types" />
import { afterEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
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
  enginePublicationLockPath,
  engineSocketPath,
  ensureJournaledBranchStoreAsync,
  parseEngineAttachmentIdentity,
  readEngineAttachmentIdentity,
} from "../dist/engine.js";
import { PrologProcess } from "../dist/prolog.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../src/utils/branch-store-locator.js";

const roots: string[] = [];

function tempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-engine-test-"));
  roots.push(root);
  return root;
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs = 5_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for engine state transition");
}

function rawEngineRequest(
  socketPath: string,
  request: Readonly<Record<string, unknown>>,
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let buffer = Buffer.alloc(0);
    socket.on("connect", () => {
      const payload = Buffer.from(JSON.stringify(request), "utf8");
      const header = Buffer.allocUnsafe(4);
      header.writeUInt32BE(payload.length, 0);
      socket.write(Buffer.concat([header, payload]));
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

async function createLegacyStore(root: string): Promise<string> {
  const branchPath = branchStorePath(root, "main");
  mkdirSync(branchPath, { recursive: true });
  // This test exercises the journal conversion inside an already-attached
  // hashed store. Literal-path branch migration is covered by the branch
  // command tests and is intentionally never inferred by the engine.
  ensureBranchStoreManifest(root, "main");
  const prolog = new PrologProcess({ timeout: 30_000, oneShot: true });
  const attached = await prolog.query(`kb_attach('${branchPath}')`);
  expect(attached.success).toBe(true);
  const seeded = await prolog.query(
    'kb_assert_entity(req, [id=\'REQ-LEGACY\', title="Legacy requirement", status=open, created_at="2026-08-12T00:00:00Z", updated_at="2026-08-12T00:00:00Z", source="legacy-test"])',
  );
  expect(seeded.success).toBe(true);
  await prolog.query("kb_detach");
  return branchPath;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("journaled engine", () => {
  test("isolates sockets by canonical workspace and branch", () => {
    const root = tempRoot();
    expect(engineSocketPath(root, "main")).toBe(engineSocketPath(root, "main"));
    expect(engineSocketPath(root, "main")).not.toBe(
      engineSocketPath(root, "feature"),
    );
  });

  test("serializes simultaneous clients onto one daemon and replays writes", async () => {
    const root = tempRoot();
    const first = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 15000,
    });
    const second = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 15000,
    });
    try {
      await Promise.all([first.start(), second.start()]);
      expect(first.getPid()).toBeGreaterThan(0);
      expect(second.getPid()).toBe(first.getPid());

      const write = await first.query(
        'kb_assert_entity(req, [id=\'REQ-ENGINE-TEST\', title="Engine test", status=open, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="engine-test"])',
      );
      expect(write.success).toBe(true);
      const read = await second.query("kb_entity('REQ-ENGINE-TEST', _, _)");
      expect(read.success).toBe(true);
    } finally {
      await first.terminate();
      await second.stop().catch(() => undefined);
    }
    expect(existsSync(engineSocketPath(root, "main"))).toBe(false);
  });

  test("serves typed indexed reads and rolls back entity and audit writes together", async () => {
    const root = tempRoot();
    const client = new EngineClient({ workspaceRoot: root, branch: "main" });
    const exported = path.join(root, "rollback-export");
    try {
      await client.start();
      const committed = await client.query(
        'kb_commit_upsert(req, [id=\'REQ-TYPED\', title="Typed indexed query", status=open, created_at="2026-08-12T00:00:00Z", updated_at="2026-08-12T00:00:00Z", source="documentation/typed.md"], [], true, ChangeKind)',
      );
      expect(committed.success).toBe(true);
      const typed = await client.queryEntities({
        type: "req",
        id: "REQ-TYPED",
        limit: 1,
        offset: 0,
      });
      expect(typed.count).toBe(1);
      expect(typed.entities[0]?.id).toBe("REQ-TYPED");
      const publicStatus = await client.queryStatusJson();
      expect(publicStatus.success).toBe(true);
      const statusJson = publicStatus.bindings.JsonString;
      expect(statusJson).toBeDefined();
      expect(JSON.parse(JSON.parse(statusJson ?? '"{}"')).branch).toBe("main");

      const rolledBack = await client.queryBatch([
        'kb_assert_entity(req, [id=\'REQ-ROLLBACK\', title="Must roll back", status=open, created_at="2026-08-12T00:00:00Z", updated_at="2026-08-12T00:00:00Z", source="documentation/rollback.md"])',
        "fail",
      ]);
      expect(rolledBack.success).toBe(false);
      const missing = await client.queryEntities({
        id: "REQ-ROLLBACK",
        limit: 1,
        offset: 0,
      });
      expect(missing.count).toBe(0);

      expect((await client.exportStorage(exported)).success).toBe(true);
      const audit = readFileSync(path.join(exported, "audit.log"), "utf8");
      expect(audit).toContain("REQ-TYPED");
      expect(audit).not.toContain("REQ-ROLLBACK");
    } finally {
      await client.stop().catch(() => undefined);
    }
  });

  test("preloads discovery coverage and graph predicates", async () => {
    const root = tempRoot();
    const client = new EngineClient({ workspaceRoot: root, branch: "main" });
    try {
      await client.start();
      const coverage = await client.query(
        "discovery:coverage_report_json(type, [], true, false, 10, 0, unknown, '1970-01-01T00:00:00Z', 604800, JsonString)",
      );
      expect(coverage.success).toBe(true);
      expect(coverage.bindings.JsonString).toBeDefined();
      const graph = await client.query(
        "discovery:graph_expand_json([], [], 'outgoing', 1, [], 10, 10, JsonString)",
      );
      expect(graph.success).toBe(true);
      expect(graph.bindings.JsonString).toBeDefined();
    } finally {
      await client.stop().catch(() => undefined);
    }
  });

  test("creates journal metadata and supports explicit compaction", async () => {
    const root = tempRoot();
    await ensureJournaledBranchStoreAsync(
      path.join(root, ".kb", "branches", "main"),
    );
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 15000,
    });
    try {
      const status = await client.storageStatus();
      expect(status.success).toBe(true);
      const compact = await client.compact();
      expect(compact.success).toBe(true);
    } finally {
      await client.stop().catch(() => undefined);
    }
  });

  test("keeps disconnected clients on the same live writer", async () => {
    const root = tempRoot();
    const first = new EngineClient({ workspaceRoot: root, branch: "main" });
    const second = new EngineClient({ workspaceRoot: root, branch: "main" });
    try {
      await first.start();
      const pid = first.getPid();
      await first.terminate();
      await second.start();
      expect(second.getPid()).toBe(pid);
    } finally {
      await second.stop().catch(() => undefined);
    }
  });

  test("isolates live writers for different branches", async () => {
    const root = tempRoot();
    const main = new EngineClient({ workspaceRoot: root, branch: "main" });
    const feature = new EngineClient({
      workspaceRoot: root,
      branch: "feature/engine",
    });
    try {
      await Promise.all([main.start(), feature.start()]);
      expect(main.getPid()).toBeGreaterThan(0);
      expect(feature.getPid()).toBeGreaterThan(0);
      expect(feature.getPid()).not.toBe(main.getPid());
    } finally {
      await Promise.all([
        main.stop().catch(() => undefined),
        feature.stop().catch(() => undefined),
      ]);
    }
  });

  test("rejects protocol and workspace identity mismatches", async () => {
    const root = tempRoot();
    const client = new EngineClient({ workspaceRoot: root, branch: "main" });
    try {
      await client.start();
      const socket = engineSocketPath(root, "main");
      const protocol = await rawEngineRequest(socket, {
        id: 1,
        method: "status",
        protocolVersion: ENGINE_PROTOCOL_VERSION + 1,
        packageVersions: "unknown",
        workspaceRoot: root,
        branch: "main",
      });
      expect(protocol.ok).toBe(false);
      expect(String(protocol.error)).toContain("protocol mismatch");

      const identity = await rawEngineRequest(socket, {
        id: 2,
        method: "status",
        protocolVersion: ENGINE_PROTOCOL_VERSION,
        packageVersions: "unknown",
        workspaceRoot: path.join(root, "other"),
        branch: "main",
      });
      expect(identity.ok).toBe(false);
      expect(String(identity.error)).toContain("workspace identity mismatch");
    } finally {
      await client.stop().catch(() => undefined);
    }
  });

  test("fails closed when an exclusive stop cannot reach a stale socket", async () => {
    const root = tempRoot();
    const socket = engineSocketPath(root, "main");
    writeFileSync(socket, "stale socket placeholder\n");
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 250,
    });

    try {
      await expect(client.stop(false)).rejects.toThrow(
        "socket remains present but is not reachable",
      );
    } finally {
      rmSync(socket, { force: true });
      await client.terminate();
    }
  });

  test("fences new engine clients while generation publication owns its lease", async () => {
    const root = tempRoot();
    const lease = acquireEnginePublicationLease(root, "main");
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 250,
    });

    try {
      expect(existsSync(enginePublicationLockPath(root, "main"))).toBe(true);
      await expect(client.start(false)).rejects.toThrow(
        "engine publication is in progress",
      );
    } finally {
      lease.release();
      expect(existsSync(enginePublicationLockPath(root, "main"))).toBe(false);
      await client.terminate();
    }
  });

  test("allows forbidden words inside entity prose but rejects executable escape hatches", async () => {
    const root = tempRoot();
    const client = new EngineClient({ workspaceRoot: root, branch: "main" });
    try {
      await client.start();
      const prose = await client.query(
        'kb_assert_entity(req, [id=\'REQ-GOAL-DATA\', title="The system ( and shell ( words are prose", status=open, created_at="2026-08-12T00:00:00Z", updated_at="2026-08-12T00:00:00Z", source="tests/goal-data.md"])',
      );
      expect(prose.success).toBe(true);
      await expect(client.query("system('echo unsafe')")).rejects.toThrow(
        "typed Kibi predicates",
      );
      await expect(
        client.query(
          "set_prolog_flag(answer_write_options, [max_depth(0), spacing(next_argument)])",
        ),
      ).rejects.toThrow("typed Kibi predicates");
      await expect(
        client.query(
          "(true, set_prolog_flag(answer_write_options, [max_depth(0)]))",
        ),
      ).rejects.toThrow("typed Kibi predicates");
    } finally {
      await client.stop().catch(() => undefined);
    }
  });

  test("cancels a queued request without poisoning the daemon", async () => {
    const root = tempRoot();
    const client = new EngineClient({ workspaceRoot: root, branch: "main" });
    try {
      await client.start();
      const controller = new AbortController();
      controller.abort();
      await expect(
        client.query("kb_entity(_, _, _)", controller.signal),
      ).rejects.toThrow("cancelled");
      const status = await client.storageStatus();
      expect(status.success).toBe(true);
    } finally {
      await client.stop().catch(() => undefined);
    }
  });

  test("replays durable writes after an engine crash", async () => {
    const root = tempRoot();
    const first = new EngineClient({ workspaceRoot: root, branch: "main" });
    const second = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 30_000,
    });
    try {
      await first.start();
      const write = await first.query(
        'kb_assert_entity(req, [id=\'REQ-CRASH\', title="Crash recovery", status=open, created_at="2026-08-12T00:00:00Z", updated_at="2026-08-12T00:00:00Z", source="engine-crash-test"])',
      );
      expect(write.success).toBe(true);
      const pid = first.getPid();
      process.kill(pid, "SIGKILL");
      await first.terminate();
      await new Promise((resolve) => setTimeout(resolve, 100));
      await second.start();
      expect(second.getPid()).not.toBe(pid);
      const replayed = await second.query("kb_entity('REQ-CRASH', req, _)");
      expect(replayed.success).toBe(true);
    } finally {
      await second.stop().catch(() => undefined);
    }
  });

  test("flushes journals and exits when the hosting process is terminated", async () => {
    const root = tempRoot();
    const first = new EngineClient({ workspaceRoot: root, branch: "main" });
    const second = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 30_000,
    });
    try {
      await first.start();
      const write = await first.query(
        'kb_assert_entity(req, [id=\'REQ-SIGNAL\', title="Signal durability", status=open, created_at="2026-08-12T00:00:00Z", updated_at="2026-08-12T00:00:00Z", source="engine-signal-test"])',
      );
      expect(write.success).toBe(true);
      const pid = first.getPid();
      const socket = engineSocketPath(root, "main");

      process.kill(pid, "SIGTERM");
      await first.terminate();
      await waitFor(() => !existsSync(socket), 5_000);

      await second.start();
      expect(second.getPid()).not.toBe(pid);
      const replayed = await second.query("kb_entity('REQ-SIGNAL', req, _)");
      expect(replayed.success).toBe(true);
    } finally {
      await first.terminate().catch(() => undefined);
      await second.stop(false).catch(() => undefined);
      await second.terminate().catch(() => undefined);
    }
  });

  test("reports an actionable error when Node is unavailable", async () => {
    const root = tempRoot();
    const previous = process.env.KIBI_NODE_PATH;
    process.env.KIBI_NODE_PATH = path.join(root, "missing-node");
    const client = new EngineClient({
      workspaceRoot: root,
      branch: "main",
      timeout: 2_000,
    });
    try {
      await expect(client.start()).rejects.toThrow("requires Node.js >=18");
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_NODE_PATH");
      else process.env.KIBI_NODE_PATH = previous;
      await client.terminate();
    }
  });

  test("shuts down after the configured idle interval", async () => {
    const root = tempRoot();
    const previous = process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS;
    process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = "150";
    const client = new EngineClient({ workspaceRoot: root, branch: "main" });
    try {
      await client.start();
      const socket = engineSocketPath(root, "main");
      expect(existsSync(socket)).toBe(true);
      await client.terminate();
      await waitFor(() => !existsSync(socket), 5_000);
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_ENGINE_IDLE_TIMEOUT_MS");
      else process.env.KIBI_ENGINE_IDLE_TIMEOUT_MS = previous;
    }
  });

  test("migrates a populated legacy store once and preserves audit export", async () => {
    const root = tempRoot();
    const branchPath = await createLegacyStore(root);
    await ensureJournaledBranchStoreAsync(branchPath);
    await ensureJournaledBranchStoreAsync(branchPath);

    expect(
      readFileSync(path.join(branchPath, "storage.json"), "utf8"),
    ).toContain("kibi.rdf-journal.v1");
    expect(readFileSync(path.join(branchPath, "kb.rdf"), "utf8")).toContain(
      "KIBI_STORAGE_FORMAT",
    );
    expect(existsSync(path.join(branchPath, "legacy", "kb.rdf"))).toBe(true);
    expect(existsSync(path.join(branchPath, "legacy", "audit.log"))).toBe(true);

    const client = new EngineClient({ workspaceRoot: root, branch: "main" });
    const exported = path.join(root, "exported");
    try {
      await client.start();
      const entity = await client.query("kb_entity('REQ-LEGACY', req, _)");
      expect(entity.success).toBe(true);
      const result = await client.exportStorage(exported);
      expect(result.success).toBe(true);
      expect(readFileSync(path.join(exported, "audit.log"), "utf8")).toContain(
        "REQ-LEGACY",
      );
    } finally {
      await client.stop().catch(() => undefined);
    }
  });

  test("replaces a daemon still attached to a moved branch store", async () => {
    const root = tempRoot();
    const livePath = branchStorePath(root, "main");
    const first = new EngineClient({ workspaceRoot: root, branch: "main" });
    try {
      await first.start();
      const originalPid = first.getPid();
      const originalIno = statSync(livePath).ino;
      const originalStatus = await first.queryStatusJson();
      expect(
        parseEngineAttachmentIdentity(originalStatus.bindings.JsonString)?.ino,
      ).toBe(originalIno);
      await first.terminate();

      const quarantine = `${livePath}.stale-${Date.now()}`;
      renameSync(livePath, quarantine);
      ensureBranchStoreManifest(root, "main");
      await ensureJournaledBranchStoreAsync(livePath);
      expect(statSync(livePath).ino).not.toBe(originalIno);

      const second = new EngineClient({ workspaceRoot: root, branch: "main" });
      try {
        await second.start();
        expect(second.getPid()).not.toBe(originalPid);
        const status = await second.queryStatusJson();
        const attached = parseEngineAttachmentIdentity(
          status.bindings.JsonString,
        );
        const live = readEngineAttachmentIdentity(livePath);
        expect(engineAttachmentsMatch(live, attached)).toBe(true);
        expect((await second.save()).success).toBe(true);
      } finally {
        await second.stop().catch(() => undefined);
      }
    } finally {
      await first.stop().catch(() => undefined);
    }
  }, 30_000);

  test("leaves corrupt legacy input usable after migration failure", async () => {
    const root = tempRoot();
    const branchPath = branchStorePath(root, "main");
    mkdirSync(branchPath, { recursive: true });
    writeFileSync(path.join(branchPath, "kb.rdf"), "not valid RDF @@@\n");
    writeFileSync(path.join(branchPath, "audit.log"), "");

    await expect(ensureJournaledBranchStoreAsync(branchPath)).rejects.toThrow();
    expect(readFileSync(path.join(branchPath, "kb.rdf"), "utf8")).toBe(
      "not valid RDF @@@\n",
    );
    expect(existsSync(path.join(branchPath, "storage.json"))).toBe(false);
  });

  test("recovers an interrupted publication before retrying migration", async () => {
    const root = tempRoot();
    const branchPath = await createLegacyStore(root);
    writeFileSync(
      path.join(branchPath, "storage.json"),
      '{"format":"kibi.rdf-journal.v1","schemaVersion":1}\n',
    );
    mkdirSync(path.join(branchPath, "rdf"), { recursive: true });

    await ensureJournaledBranchStoreAsync(branchPath);
    expect(existsSync(path.join(branchPath, "CURRENT"))).toBe(true);
    expect(existsSync(path.join(branchPath, "legacy", "kb.rdf"))).toBe(true);
  });
});
