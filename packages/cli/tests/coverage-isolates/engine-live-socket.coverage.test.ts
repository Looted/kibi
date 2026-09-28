/**
 * Isolated from engine-remaining: Bun 1.4 + --coverage surfaces late write
 * EPIPE from unix socket teardown into the shared shard after other socket tests.
 */
// implements REQ-core-journaled-engine-persistence
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as fs from "node:fs";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import * as net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ENGINE_PROTOCOL_VERSION,
  enginePidPath,
  engineSocketPath,
  ensureJournaledBranchStoreAsync,
  runEngineDaemon,
} from "../../src/engine.js";
import { PrologProcess } from "../../src/prolog.js";
import {
  branchStorePath,
  ensureBranchStoreManifest,
} from "../../src/utils/branch-store-locator.js";
import { isolateKibiEnv } from "../helpers/in-process-workspace.js";

const roots: string[] = [];
const restores: Array<() => void> = [];

function tempRoot(prefix = "kibi-engine-daemon-"): string {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) Reflect.deleteProperty(process.env, name);
  else process.env[name] = value;
}

function isolateRuntime(): () => void {
  const runtime = tempRoot("kibi-runtime-daemon-");
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

async function waitForExitCall(exit: {
  mock: { calls: unknown[][] };
}): Promise<void> {
  const deadline = Date.now() + 8_000;
  while (exit.mock.calls.length === 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  expect(exit).toHaveBeenCalled();
}

function mockPrologForDaemon(
  queryImpl?: (goal: string) => Promise<{
    success: boolean;
    bindings: Record<string, string | undefined>;
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
    (async (goal: string | string[]) => {
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
    }) as never,
  );
  return () => {
    start.mockRestore();
    terminate.mockRestore();
    query.mockRestore();
  };
}

async function listenLiveSocket(socketPath: string): Promise<net.Server> {
  mkdirSync(path.dirname(socketPath), { recursive: true, mode: 0o700 });
  const server = net.createServer((socket) => {
    socket.on("error", () => undefined);
    socket.destroy();
  });
  server.on("error", () => undefined);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => resolve());
  });
  return server;
}

function isEpipeLike(error: unknown): boolean {
  if (error && typeof error === "object") {
    const code =
      "code" in error ? String((error as NodeJS.ErrnoException).code) : "";
    if (code === "EPIPE" || code === "ECONNRESET") return true;
    const errno =
      "errno" in error
        ? Number((error as NodeJS.ErrnoException).errno)
        : Number.NaN;
    if (errno === -32) return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /\bEPIPE\b|\bECONNRESET\b|broken pipe/i.test(message);
}

afterEach(() => {
  for (const restore of restores.splice(0)) restore();
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("engine live-socket isolate", () => {
  test("refuses when a live peer already owns the socket path", async () => {
    restores.push(isolateKibiEnv(), isolateRuntime());
    const root = tempRoot();
    ensureBranchStoreManifest(root, "main");
    await ensureJournaledBranchStoreAsync(branchStorePath(root, "main"));
    const livePath = path.join(root, "live.sock");
    const live = await listenLiveSocket(livePath);
    restores.push(() => {
      live.close();
    });
    restores.push(mockPrologForDaemon());

    try {
      await runEngineDaemon({
        workspaceRoot: root,
        branch: "main",
        socketPath: livePath,
      });
      throw new Error("expected live-socket refusal");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      expect(isEpipeLike(error) || /already listening/.test(message)).toBe(
        true,
      );
    } finally {
      live.close();
    }
  });

  test("replaces a stale socket file and idles out", async () => {
    restores.push(isolateKibiEnv(), isolateRuntime());
    const exit = spyOn(process, "exit").mockImplementation((() => {
      return undefined as never;
    }) as typeof process.exit);
    restores.push(() => exit.mockRestore());
    const root = tempRoot();
    ensureBranchStoreManifest(root, "main");
    await ensureJournaledBranchStoreAsync(branchStorePath(root, "main"));
    restores.push(mockPrologForDaemon());

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
    await waitForExitCall(exit);
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

  test("serves remaining command, cache, mismatch, and overflow branches", async () => {
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
      goal: 'kb_assert_entity(req, [id=\'REQ-MUT\', title="m", status=open, created_at="2026-01-01T00:00:00Z", updated_at="2026-01-01T00:00:00Z", source="t"])',
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
    await waitForExitCall(exit);
  }, 20_000);
});
