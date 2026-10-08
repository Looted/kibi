/// <reference types="bun-types" />
// executable_for TEST-prolog-daemon-runtime-identity, TEST-engine-daemon-package-versions
import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import * as net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { doctorCommand } from "../dist/commands/doctor.js";
import {
  ENGINE_PROTOCOL_VERSION,
  EngineClient,
  enginePackageVersions,
  engineSocketPath,
  engineSwiplIdentity,
} from "../dist/engine.js";
import { KIBI_BUILT_PACKAGE_VERSIONS } from "../dist/package-versions.js";
import {
  resetSwiplResolverCache,
  resolveSwipl,
} from "../dist/prolog/swipl-resolver.js";

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  const root = mkdtempSync(path.join(tmpdir(), "kibi-engine-identity-"));
  roots.push(root);
  return root;
}

async function waitFor(predicate: () => boolean, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Timed out waiting for engine state transition");
}

function processHasExited(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return false;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "ESRCH";
  }
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

describe("engine daemon SWI-Prolog identity", () => {
  test("serves only clients that resolved the daemon's SWI-Prolog", async () => {
    const root = tempRoot();
    const client = new EngineClient({ workspaceRoot: root, branch: "main" });
    try {
      await client.start();
      const socket = engineSocketPath(root, "main");
      const identity = {
        protocolVersion: ENGINE_PROTOCOL_VERSION,
        packageVersions: enginePackageVersions(),
        workspaceRoot: root,
        branch: "main",
      };
      const handshake = await rawEngineRequest(socket, {
        ...identity,
        id: 1,
        method: "handshake",
      });
      expect(handshake.ok).toBe(true);
      expect(handshake.result).toEqual({
        prologIdentity: engineSwiplIdentity(),
        packageVersions: enginePackageVersions(),
      });
      const foreign = await rawEngineRequest(socket, {
        ...identity,
        id: 2,
        method: "status",
        prologIdentity: "/elsewhere/swipl@9.0.0",
      });
      expect(foreign.ok).toBe(false);
      expect(String(foreign.error)).toContain(
        `SWI-Prolog mismatch: client=/elsewhere/swipl@9.0.0, server=${engineSwiplIdentity()}`,
      );
      const missing = await rawEngineRequest(socket, {
        ...identity,
        id: 3,
        method: "status",
      });
      expect(String(missing.error)).toContain("client=missing");
    } finally {
      await client.stop().catch(() => undefined);
    }
  });

  test("replaces a daemon running a different resolved SWI-Prolog instead of reusing it", async () => {
    const root = tempRoot();
    const scratch = mkdtempSync(path.join(tmpdir(), "kibi-engine-swipl-"));
    roots.push(scratch);
    const previous = process.env.KIBI_SWIPL;
    const first = new EngineClient({ workspaceRoot: root, branch: "main" });
    let second: EngineClient | undefined;
    try {
      await first.start();
      const pidBefore = first.getPid();
      expect(pidBefore).toBeGreaterThan(0);
      const alternate = path.join(scratch, "swipl");
      symlinkSync(resolveSwipl().bin, alternate);
      process.env.KIBI_SWIPL = alternate;
      resetSwiplResolverCache();
      expect(engineSwiplIdentity()).toContain(alternate);

      second = new EngineClient({ workspaceRoot: root, branch: "main" });
      await second.start();
      const pidAfter = second.getPid();
      expect(pidAfter).toBeGreaterThan(0);
      expect(pidAfter).not.toBe(pidBefore);
      await waitFor(() => processHasExited(pidBefore));
      const status = await second.queryStatusJson();
      expect(status.success).toBe(true);
    } finally {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_SWIPL");
      else process.env.KIBI_SWIPL = previous;
      resetSwiplResolverCache();
      await (second ?? first).stop().catch(() => undefined);
    }
  });
});

/** The "Engine daemon" check of `kibi doctor --format json` for a workspace. */
async function doctorEngineDaemon(
  root: string,
): Promise<{ message: string; details: Record<string, unknown> }> {
  // CI exports KIBI_BRANCH for the checkout under test; doctor must address
  // the daemon this test started on the fixture's main branch.
  const previous = process.env.KIBI_WORKSPACE;
  const previousBranch = process.env.KIBI_BRANCH;
  process.env.KIBI_WORKSPACE = root;
  process.env.KIBI_BRANCH = "main";
  const lines: string[] = [];
  const log = spyOn(console, "log").mockImplementation((line: unknown) => {
    lines.push(String(line));
  });
  try {
    await doctorCommand({ format: "json" });
  } finally {
    log.mockRestore();
    if (previous === undefined)
      Reflect.deleteProperty(process.env, "KIBI_WORKSPACE");
    else process.env.KIBI_WORKSPACE = previous;
    if (previousBranch === undefined)
      Reflect.deleteProperty(process.env, "KIBI_BRANCH");
    else process.env.KIBI_BRANCH = previousBranch;
  }
  const report = JSON.parse(lines.join("\n")) as {
    checks: Array<{
      name: string;
      message: string;
      details: Record<string, unknown>;
    }>;
  };
  const check = report.checks.find((entry) => entry.name === "Engine daemon");
  if (!check) throw new Error("kibi doctor has no Engine daemon check");
  return check;
}

describe("engine daemon package versions", () => {
  function withPackageVersions<T>(
    value: string | undefined,
    run: () => Promise<T>,
  ): Promise<T> {
    const previous = process.env.KIBI_PACKAGE_VERSIONS;
    if (value === undefined)
      Reflect.deleteProperty(process.env, "KIBI_PACKAGE_VERSIONS");
    else process.env.KIBI_PACKAGE_VERSIONS = value;
    return run().finally(() => {
      if (previous === undefined)
        Reflect.deleteProperty(process.env, "KIBI_PACKAGE_VERSIONS");
      else process.env.KIBI_PACKAGE_VERSIONS = previous;
    });
  }

  test("the built versions name the kibi-cli and kibi-core releases", () => {
    expect(KIBI_BUILT_PACKAGE_VERSIONS).toMatch(
      /^kibi-cli@\d+\.\d+\.\d+[^,]*,kibi-core@\d+\.\d+\.\d+/,
    );
  });

  test("refuses every request but handshake and stop from other package versions", async () => {
    const root = tempRoot();
    await withPackageVersions(undefined, async () => {
      const client = new EngineClient({ workspaceRoot: root, branch: "main" });
      try {
        await client.start();
        const socket = engineSocketPath(root, "main");
        const foreign = {
          protocolVersion: ENGINE_PROTOCOL_VERSION,
          packageVersions: "kibi-cli@0.0.1,kibi-core@0.0.1",
          prologIdentity: engineSwiplIdentity(),
          workspaceRoot: root,
          branch: "main",
        };
        const handshake = await rawEngineRequest(socket, {
          ...foreign,
          id: 1,
          method: "handshake",
        });
        expect(handshake.ok).toBe(true);
        expect(
          (handshake.result as Record<string, unknown>).packageVersions,
        ).toBe(KIBI_BUILT_PACKAGE_VERSIONS);
        for (const [id, method] of [
          [2, "status"],
          [3, "kbStatus"],
          [4, "query"],
        ] as const) {
          const refused = await rawEngineRequest(socket, {
            ...foreign,
            id,
            method,
            goal: "true",
          });
          expect(refused.ok).toBe(false);
          expect(String(refused.error)).toContain(
            `package-version mismatch: client=kibi-cli@0.0.1,kibi-core@0.0.1, server=${KIBI_BUILT_PACKAGE_VERSIONS}`,
          );
        }
        const status = await client.queryStatusJson();
        expect(status.success).toBe(true);
      } finally {
        await client.stop().catch(() => undefined);
      }
    });
  });

  test("replaces a daemon started with other package versions instead of reusing it", async () => {
    const root = tempRoot();
    // A Git checkout on main, so kibi doctor addresses the same daemon.
    expect(spawnSync("git", ["init", "-q", "-b", "main", root]).status).toBe(0);
    let older: EngineClient | undefined;
    let current: EngineClient | undefined;
    try {
      // Given a daemon started by an install with older package versions.
      const pidBefore = await withPackageVersions(
        "kibi-cli@0.0.1,kibi-core@0.0.1",
        async () => {
          older = new EngineClient({ workspaceRoot: root, branch: "main" });
          await older.start();
          await older.terminate();
          return older.getPid();
        },
      );
      expect(pidBefore).toBeGreaterThan(0);

      await withPackageVersions(undefined, async () => {
        const probe = new EngineClient({ workspaceRoot: root, branch: "main" });
        expect(await probe.inspectLiveDaemon()).toEqual({
          prologIdentity: engineSwiplIdentity(),
          packageVersions: "kibi-cli@0.0.1,kibi-core@0.0.1",
        });

        // kibi doctor reports the running daemon's versions without
        // replacing it.
        const before = await doctorEngineDaemon(root);
        expect(before.details).toMatchObject({
          running: true,
          packageVersions: "kibi-cli@0.0.1,kibi-core@0.0.1",
          expectedPackageVersions: KIBI_BUILT_PACKAGE_VERSIONS,
        });
        expect(before.message).toContain("the next Kibi command replaces it");

        // When a client with the built versions connects.
        current = new EngineClient({ workspaceRoot: root, branch: "main" });
        await current.start();

        // Then the older daemon is stopped and a new one serves the client.
        const pidAfter = current.getPid();
        expect(pidAfter).toBeGreaterThan(0);
        expect(pidAfter).not.toBe(pidBefore);
        await waitFor(() => processHasExited(pidBefore));
        expect(await current.inspectLiveDaemon()).toEqual({
          prologIdentity: engineSwiplIdentity(),
          packageVersions: KIBI_BUILT_PACKAGE_VERSIONS,
        });
        const status = await current.queryStatusJson();
        expect(status.success).toBe(true);
        const after = await doctorEngineDaemon(root);
        expect(after.message).toBe(`Running ${KIBI_BUILT_PACKAGE_VERSIONS}`);
        expect(after.details.packageVersions).toBe(KIBI_BUILT_PACKAGE_VERSIONS);
      });
    } finally {
      await (current ?? older)?.stop().catch(() => undefined);
    }
  });
});
