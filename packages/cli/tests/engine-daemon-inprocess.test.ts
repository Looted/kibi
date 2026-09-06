import { afterAll, afterEach, describe, expect, spyOn, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  EngineClient,
  engineSocketPath,
  ensureJournaledBranchStoreAsync,
  runEngineDaemon,
} from "../src/engine.js";
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

async function waitForSocket(socketPath: string, timeoutMs = 20_000): Promise<void> {
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

  test(
    "serves EngineClient RPCs in-process and reports getPid",
    async () => {
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
    },
    90_000,
  );

  test(
    "idle timeout shuts the in-process daemon down without a client",
    async () => {
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
    },
    20_000,
  );

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
