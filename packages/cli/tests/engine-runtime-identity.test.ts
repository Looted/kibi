/// <reference types="bun-types" />
// executable_for TEST-prolog-daemon-runtime-identity
import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import * as net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  ENGINE_PROTOCOL_VERSION,
  EngineClient,
  engineSocketPath,
  engineSwiplIdentity,
} from "../dist/engine.js";
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
        packageVersions: process.env.KIBI_PACKAGE_VERSIONS ?? "unknown",
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
