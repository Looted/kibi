import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  type WorkspaceMutationLockFileSystem,
  acquireWorkspaceMutationLock,
  releaseWorkspaceMutationLock,
} from "../../src/operations/mutation/workspace-mutation-lock.js";

const workspaces: string[] = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0))
    fs.rmSync(workspace, { recursive: true, force: true });
});

function workspace(): string {
  const root = fs.mkdtempSync(path.join(tmpdir(), "kibi-source-lock-"));
  fs.mkdirSync(path.join(root, ".kb"), { recursive: true });
  workspaces.push(root);
  return root;
}

function advancingClock(timeoutMs = 20): {
  timeoutMs: number;
  now: () => number;
  sleep: () => Promise<void>;
} {
  let current = 100;
  return {
    timeoutMs,
    now: () => current,
    sleep: async () => {
      current += 10;
    },
  };
}

function lockRecord(pid: number, token: string): string {
  return `${JSON.stringify({ pid, token, acquiredAt: 0 })}\n`;
}

describe("portable workspace mutation lock", () => {
  test("serializes interleaving Kibi writers until the owner releases", async () => {
    const root = workspace();
    const first = await acquireWorkspaceMutationLock(root);
    expect(
      fs.existsSync(
        path.join(
          root,
          ".kb",
          "recovery",
          "source-authoring.lock.acquire-guard",
        ),
      ),
    ).toBe(false);
    const second = acquireWorkspaceMutationLock(root, advancingClock());
    await expect(second).rejects.toMatchObject({
      code: "SOURCE_MUTATION_LOCK_TIMEOUT",
      retryable: true,
    });
    first.release();
    const replacement = await acquireWorkspaceMutationLock(root);
    replacement.release();
    expect(
      fs.existsSync(
        path.join(root, ".kb", "recovery", "source-authoring.lock"),
      ),
    ).toBe(false);
    expect(
      fs.existsSync(
        path.join(
          root,
          ".kb",
          "recovery",
          "source-authoring.lock.acquire-guard",
        ),
      ),
    ).toBe(false);
  });

  test("fails closed without mutating a dead lock", async () => {
    const root = workspace();
    const lockPath = path.join(
      root,
      ".kb",
      "recovery",
      "source-authoring.lock",
    );
    const ownerPath = path.join(lockPath, "owner.json");
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.mkdirSync(lockPath);
    const original = lockRecord(99999999, "dead-owner");
    fs.writeFileSync(ownerPath, original);
    let unlinkCalls = 0;
    let rmdirCalls = 0;
    const fileSystem: WorkspaceMutationLockFileSystem = {
      mkdirSync: (target, options) => fs.mkdirSync(target, options),
      readFileSync: (target) => fs.readFileSync(target, "utf8"),
      writeFileSync: (target, data, options) =>
        fs.writeFileSync(target, data, options),
      unlinkSync: (target) => {
        unlinkCalls += 1;
        fs.unlinkSync(target);
      },
      rmdirSync: (target) => {
        rmdirCalls += 1;
        fs.rmdirSync(target);
      },
    };
    let thrown: unknown;
    try {
      await acquireWorkspaceMutationLock(root, {
        fileSystem,
        isProcessAlive: () => false,
      });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      code: "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
      retryable: false,
    });
    expect(unlinkCalls).toBe(0);
    expect(rmdirCalls).toBe(0);
    expect(fs.readFileSync(ownerPath, "utf8")).toBe(original);
    expect(fs.existsSync(lockPath)).toBe(true);
  });

  test("fails closed without mutating corrupt, empty, or replacement locks", async () => {
    const root = workspace();
    const lockPath = path.join(
      root,
      ".kb",
      "recovery",
      "source-authoring.lock",
    );
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    for (const content of ["not-json", ""] as const) {
      fs.mkdirSync(lockPath);
      const ownerPath = path.join(lockPath, "owner.json");
      fs.writeFileSync(ownerPath, content);
      let unlinkCalls = 0;
      let rmdirCalls = 0;
      const fileSystem: WorkspaceMutationLockFileSystem = {
        mkdirSync: (target, options) => fs.mkdirSync(target, options),
        readFileSync: (target) => fs.readFileSync(target, "utf8"),
        writeFileSync: (target, data, options) =>
          fs.writeFileSync(target, data, options),
        unlinkSync: () => {
          unlinkCalls += 1;
        },
        rmdirSync: () => {
          rmdirCalls += 1;
        },
      };
      await expect(
        acquireWorkspaceMutationLock(root, {
          fileSystem,
          isProcessAlive: () => false,
        }),
      ).rejects.toMatchObject({
        code: "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
        retryable: false,
      });
      expect(unlinkCalls).toBe(0);
      expect(rmdirCalls).toBe(0);
      expect(fs.readFileSync(ownerPath, "utf8")).toBe(content);
      expect(fs.existsSync(lockPath)).toBe(true);
      fs.rmSync(lockPath, { recursive: true, force: true });
    }

    fs.writeFileSync(lockPath, lockRecord(99999999, "old-owner"));
    const replacement = lockRecord(99999998, "replacement-owner");
    let replaced = false;
    let unlinkCalls = 0;
    let rmdirCalls = 0;
    const fileSystem: WorkspaceMutationLockFileSystem = {
      mkdirSync: (target, options) => fs.mkdirSync(target, options),
      readFileSync: (target) => {
        const value = fs.readFileSync(target, "utf8");
        if (!replaced && target === lockPath) {
          replaced = true;
          fs.writeFileSync(lockPath, replacement);
        }
        return value;
      },
      writeFileSync: (target, data, options) =>
        fs.writeFileSync(target, data, options),
      unlinkSync: () => {
        unlinkCalls += 1;
      },
      rmdirSync: () => {
        rmdirCalls += 1;
      },
    };
    await expect(
      acquireWorkspaceMutationLock(root, {
        fileSystem,
        isProcessAlive: () => false,
      }),
    ).rejects.toMatchObject({
      code: "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
      retryable: false,
    });
    expect(unlinkCalls).toBe(0);
    expect(rmdirCalls).toBe(0);
    expect(fs.readFileSync(lockPath, "utf8")).toBe(replacement);
  });

  test("reports committed release failure as non-retryable", async () => {
    const root = workspace();
    const base: WorkspaceMutationLockFileSystem = {
      mkdirSync: (target, options) => fs.mkdirSync(target, options),
      readFileSync: (target) => fs.readFileSync(target, "utf8"),
      writeFileSync: (target, data, options) =>
        fs.writeFileSync(target, data, options),
      unlinkSync: (target) => fs.unlinkSync(target),
      rmdirSync: () => {
        const error = Object.assign(new Error("busy"), { code: "EBUSY" });
        throw error;
      },
    };
    const handle = await acquireWorkspaceMutationLock(root, {
      fileSystem: base,
    });
    expect(() => releaseWorkspaceMutationLock(handle, undefined, true)).toThrow(
      /do not retry/,
    );
    try {
      releaseWorkspaceMutationLock(handle);
    } catch {
      // The lock intentionally remains fail-closed for operator cleanup.
    }
  });

  test("rereads a briefly missing owner through publish and release windows", async () => {
    const root = workspace();
    const lockPath = path.join(
      root,
      ".kb",
      "recovery",
      "source-authoring.lock",
    );
    const ownerPath = path.join(lockPath, "owner.json");
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    // Simulate another holder caught between mkdir and owner publish.
    fs.mkdirSync(lockPath);
    let ownerReads = 0;
    let sleeps = 0;
    const fileSystem: WorkspaceMutationLockFileSystem = {
      mkdirSync: (target, options) => fs.mkdirSync(target, options),
      readFileSync: (target) => {
        if (target === ownerPath) {
          ownerReads += 1;
          if (ownerReads === 1) {
            throw Object.assign(new Error("missing"), { code: "ENOENT" });
          }
        }
        return fs.readFileSync(target, "utf8");
      },
      writeFileSync: (target, data, options) =>
        fs.writeFileSync(target, data, options),
      unlinkSync: (target) => fs.unlinkSync(target),
      rmdirSync: (target) => fs.rmdirSync(target),
    };
    const handle = await acquireWorkspaceMutationLock(root, {
      fileSystem,
      isProcessAlive: () => true,
      timeoutMs: 1000,
      sleep: async () => {
        sleeps += 1;
        if (sleeps === 1) {
          // The concurrent holder finishes publishing its owner metadata.
          fs.writeFileSync(ownerPath, lockRecord(999999, "publisher"));
        }
        if (sleeps === 2) {
          // ...and then releases: owner unlinked, directory not yet removed.
          fs.rmSync(lockPath, { recursive: true, force: true });
        }
      },
    });
    expect(sleeps).toBeGreaterThanOrEqual(2);
    handle.release();
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("fails closed when owner metadata stays missing across bounded rereads", async () => {
    const root = workspace();
    const lockPath = path.join(
      root,
      ".kb",
      "recovery",
      "source-authoring.lock",
    );
    fs.mkdirSync(path.dirname(lockPath), { recursive: true });
    fs.mkdirSync(lockPath);
    let unlinkCalls = 0;
    let rmdirCalls = 0;
    let rereads = 0;
    const fileSystem: WorkspaceMutationLockFileSystem = {
      mkdirSync: (target, options) => fs.mkdirSync(target, options),
      readFileSync: () => {
        rereads += 1;
        throw Object.assign(new Error("missing"), { code: "ENOENT" });
      },
      writeFileSync: (target, data, options) =>
        fs.writeFileSync(target, data, options),
      unlinkSync: () => {
        unlinkCalls += 1;
      },
      rmdirSync: () => {
        rmdirCalls += 1;
      },
    };
    await expect(
      acquireWorkspaceMutationLock(root, {
        fileSystem,
        timeoutMs: 1000,
        sleep: async () => undefined,
      }),
    ).rejects.toMatchObject({
      code: "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
      retryable: false,
    });
    expect(rereads).toBeGreaterThanOrEqual(4);
    expect(unlinkCalls).toBe(0);
    expect(rmdirCalls).toBe(0);
    expect(fs.existsSync(lockPath)).toBe(true);
  });
});
