import { afterEach, describe, expect, test } from "bun:test";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type SymbolCompilerLockFileSystem,
  acquireSymbolCompilerLock,
  releaseSymbolCompilerLock,
  withSymbolCompilerLock,
} from "../../src/operations/mutation/symbol-compiler-lock.js";

const OWNER_FILE = "owner.json";
const workspaces: string[] = [];

afterEach(() => {
  for (const workspace of workspaces.splice(0)) {
    fs.rmSync(workspace, { recursive: true, force: true });
  }
});

function emptyWorkspace(): {
  workspace: string;
  lockPath: string;
  ownerPath: string;
} {
  const workspace = fs.mkdtempSync(join(tmpdir(), "kibi-symbol-lock-"));
  workspaces.push(workspace);
  fs.mkdirSync(join(workspace, ".kb"), { recursive: true });
  const lockPath = join(workspace, ".kb", ".symbol-compiler.lock");
  return {
    workspace,
    lockPath,
    ownerPath: join(lockPath, OWNER_FILE),
  };
}

function workspaceWithLegacyLock(content: string): {
  workspace: string;
  lockPath: string;
} {
  const { workspace, lockPath } = emptyWorkspace();
  fs.writeFileSync(lockPath, content, "utf8");
  return { workspace, lockPath };
}

function lockRecord(token: string, acquiredAt = 0): string {
  return `${JSON.stringify({ pid: process.pid, token, acquiredAt })}\n`;
}

function advancingClock(timeoutMs = 25): {
  timeoutMs: number;
  now: () => number;
  sleep: () => Promise<void>;
} {
  let now = 100;
  return {
    timeoutMs,
    now: () => now,
    sleep: async () => {
      now += 10;
    },
  };
}

function fileSystem(
  overrides: Partial<SymbolCompilerLockFileSystem> = {},
): SymbolCompilerLockFileSystem {
  return {
    mkdirSync: (target, options) => {
      fs.mkdirSync(target, options);
    },
    readFileSync: (target) => fs.readFileSync(target, "utf8"),
    writeFileSync: (target, data, options) => {
      fs.writeFileSync(target, data, options);
    },
    unlinkSync: (target) => fs.unlinkSync(target),
    rmdirSync: (target) => fs.rmdirSync(target),
    ...overrides,
  };
}

function fileSystemError(code: string, message: string): NodeJS.ErrnoException {
  return Object.assign(new Error(message), { code });
}

describe("symbol compiler lock", () => {
  test("does not steal the lock while owner metadata is initializing", async () => {
    const { workspace, lockPath, ownerPath } = emptyWorkspace();
    let contender: ReturnType<typeof acquireSymbolCompilerLock> | undefined;
    const dependencies = fileSystem({
      writeFileSync: (target, data, options) => {
        if (target === ownerPath) {
          expect(fs.statSync(lockPath).isDirectory()).toBe(true);
          expect(fs.existsSync(ownerPath)).toBe(false);
          contender = acquireSymbolCompilerLock(workspace, advancingClock());
        }
        fs.writeFileSync(target, data, options);
      },
    });

    const owner = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });
    if (contender === undefined) throw new Error("contender did not start");

    try {
      await expect(contender).rejects.toThrow("refused after 25ms");
      expect(JSON.parse(fs.readFileSync(ownerPath, "utf8"))).toMatchObject({
        pid: process.pid,
        token: expect.any(String),
      });
    } finally {
      owner.release();
    }
  });

  test("retries transient parent directory creation before acquiring", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    const parentPath = join(workspace, ".kb");
    let attempts = 0;
    const dependencies = fileSystem({
      mkdirSync: (target, options) => {
        if (target === parentPath) {
          attempts += 1;
          if (attempts === 1) {
            throw fileSystemError("EBUSY", "parent busy");
          }
        }
        fs.mkdirSync(target, options);
      },
    });

    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });
    handle.release();

    expect(attempts).toBe(2);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("fails closed after exhausting transient parent directory creation", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    const parentPath = join(workspace, ".kb");
    let attempts = 0;
    const dependencies = fileSystem({
      mkdirSync: (target, options) => {
        if (target === parentPath) {
          attempts += 1;
          throw fileSystemError("EAGAIN", "parent unavailable");
        }
        fs.mkdirSync(target, options);
      },
    });

    await expect(
      acquireSymbolCompilerLock(workspace, { fileSystem: dependencies }),
    ).rejects.toThrow(
      `failed to create symbol compiler lock parent at ${parentPath}`,
    );
    expect(attempts).toBe(3);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("retries transient lock-directory acquisition before publishing owner metadata", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      mkdirSync: (target, options) => {
        if (target === lockPath) {
          attempts += 1;
          if (attempts === 1) {
            throw fileSystemError("EINTR", "lock mkdir interrupted");
          }
        }
        fs.mkdirSync(target, options);
      },
    });

    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });
    handle.release();

    expect(attempts).toBe(2);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("fails closed after exhausting transient lock-directory acquisition", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      mkdirSync: (target, options) => {
        if (target === lockPath) {
          attempts += 1;
          throw fileSystemError("EPERM", "lock mkdir denied");
        }
        fs.mkdirSync(target, options);
      },
    });

    await expect(
      acquireSymbolCompilerLock(workspace, { fileSystem: dependencies }),
    ).rejects.toThrow(
      `failed to acquire symbol compiler lock directory at ${lockPath}`,
    );
    expect(attempts).toBe(3);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("preserves a replacement live owner installed after reading a legacy lock", async () => {
    const oldRecord = lockRecord("dead-owner");
    const replacement = lockRecord("replacement-owner", 100);
    const { workspace, lockPath } = workspaceWithLegacyLock(oldRecord);
    let replaced = false;
    const dependencies = fileSystem({
      readFileSync: (target) => {
        const content = fs.readFileSync(target, "utf8");
        if (!replaced && target === lockPath) {
          replaced = true;
          fs.writeFileSync(lockPath, replacement, "utf8");
        }
        return content;
      },
    });

    await expect(
      acquireSymbolCompilerLock(workspace, {
        ...advancingClock(),
        fileSystem: dependencies,
      }),
    ).rejects.toThrow("legacy lock held by pid");
    expect(fs.readFileSync(lockPath, "utf8")).toBe(replacement);
  });

  test("fails closed on a valid legacy file lock", async () => {
    const original = lockRecord("legacy-owner");
    const { workspace, lockPath } = workspaceWithLegacyLock(original);

    await expect(
      acquireSymbolCompilerLock(workspace, advancingClock()),
    ).rejects.toThrow("legacy lock held by pid");
    expect(fs.readFileSync(lockPath, "utf8")).toBe(original);
  });

  test("fails closed on a corrupt legacy file lock", async () => {
    const { workspace, lockPath } = workspaceWithLegacyLock("not-json\n");

    await expect(
      acquireSymbolCompilerLock(workspace, advancingClock()),
    ).rejects.toThrow("legacy or corrupt lock");
    expect(fs.readFileSync(lockPath, "utf8")).toBe("not-json\n");
  });

  test("fails closed when a lock directory has no owner metadata", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    fs.mkdirSync(lockPath);

    await expect(
      acquireSymbolCompilerLock(workspace, advancingClock()),
    ).rejects.toThrow("lock is initializing or corrupt");
    expect(fs.statSync(lockPath).isDirectory()).toBe(true);
  });

  test("cleans up failed owner initialization", async () => {
    const { workspace, lockPath, ownerPath } = emptyWorkspace();
    const dependencies = fileSystem({
      writeFileSync: (target, data, options) => {
        fs.writeFileSync(target, data.slice(0, 4), options);
        throw fileSystemError("EIO", "owner write failed");
      },
    });

    await expect(
      acquireSymbolCompilerLock(workspace, {
        fileSystem: dependencies,
      }),
    ).rejects.toThrow("failed to initialize symbol compiler lock owner");
    expect(fs.existsSync(ownerPath)).toBe(false);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("retries a transient owner publication failure when the owner path is absent", async () => {
    const { workspace, ownerPath, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      writeFileSync: (target, data, options) => {
        if (target === ownerPath) {
          attempts += 1;
          if (attempts === 1) {
            throw fileSystemError("EBUSY", "owner publication busy");
          }
        }
        fs.writeFileSync(target, data, options);
      },
    });

    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });
    handle.release();

    expect(attempts).toBe(2);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("fails closed after exhausting transient owner publication failures", async () => {
    const { workspace, ownerPath, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      writeFileSync: (target) => {
        if (target === ownerPath) {
          attempts += 1;
          throw fileSystemError("EAGAIN", "owner publication unavailable");
        }
        throw new Error(`unexpected write: ${target}`);
      },
    });

    await expect(
      acquireSymbolCompilerLock(workspace, { fileSystem: dependencies }),
    ).rejects.toThrow("failed to initialize symbol compiler lock owner");
    expect(attempts).toBe(3);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("does not retry owner publication when a failed write may have created the owner", async () => {
    const { workspace, ownerPath, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      writeFileSync: (target, data, options) => {
        if (target === ownerPath) {
          attempts += 1;
          fs.writeFileSync(target, data.slice(0, 4), options);
          throw fileSystemError("EBUSY", "owner publication uncertain");
        }
        throw new Error(`unexpected write: ${target}`);
      },
    });

    await expect(
      acquireSymbolCompilerLock(workspace, { fileSystem: dependencies }),
    ).rejects.toThrow("failed to initialize symbol compiler lock owner");
    expect(attempts).toBe(1);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("retries transient directory cleanup after failed owner initialization", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      writeFileSync: (target, data, options) => {
        fs.writeFileSync(target, data.slice(0, 4), options);
        throw fileSystemError("EIO", "owner write failed");
      },
      rmdirSync: (target) => {
        attempts += 1;
        if (attempts < 3) {
          throw fileSystemError("EBUSY", "directory busy");
        }
        fs.rmdirSync(target);
      },
    });

    await expect(
      acquireSymbolCompilerLock(workspace, { fileSystem: dependencies }),
    ).rejects.toThrow("failed to initialize symbol compiler lock owner");
    expect(attempts).toBe(3);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("reports exhausted initialization cleanup with manual verification guidance", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      writeFileSync: (target, data, options) => {
        fs.writeFileSync(target, data.slice(0, 4), options);
        throw fileSystemError("EIO", "owner write failed");
      },
      rmdirSync: () => {
        attempts += 1;
        throw fileSystemError("EBUSY", "directory busy");
      },
    });

    await expect(
      acquireSymbolCompilerLock(workspace, { fileSystem: dependencies }),
    ).rejects.toThrow("verify no operation is active");
    expect(attempts).toBe(3);
    expect(fs.existsSync(lockPath)).toBe(true);
  });

  test("retries transient owner validation failures before release", async () => {
    const { workspace, ownerPath, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      readFileSync: (target) => {
        if (target === ownerPath) {
          attempts += 1;
          if (attempts < 3) {
            throw fileSystemError("EBUSY", "owner busy");
          }
        }
        return fs.readFileSync(target, "utf8");
      },
    });
    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });

    expect(() => handle.release()).not.toThrow();
    expect(attempts).toBe(3);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("reports exhausted owner validation with manual verification guidance and permits retry", async () => {
    const { workspace, ownerPath, lockPath } = emptyWorkspace();
    let failValidation = true;
    let attempts = 0;
    const dependencies = fileSystem({
      readFileSync: (target) => {
        if (target === ownerPath) {
          attempts += 1;
          if (failValidation) {
            throw fileSystemError("EBUSY", "owner busy");
          }
        }
        return fs.readFileSync(target, "utf8");
      },
    });
    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });

    expect(() => handle.release()).toThrow(
      `failed to validate symbol compiler lock owner at ${ownerPath}`,
    );
    expect(() => handle.release()).toThrow("verify no operation is active");
    expect(attempts).toBe(6);
    expect(fs.existsSync(lockPath)).toBe(true);

    failValidation = false;
    expect(() => handle.release()).not.toThrow();
  });

  test("retries transient owner removal failures before directory cleanup", async () => {
    const { workspace, ownerPath, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      unlinkSync: (target) => {
        if (target === ownerPath) {
          attempts += 1;
          if (attempts < 3) {
            throw fileSystemError("EBUSY", "owner busy");
          }
        }
        fs.unlinkSync(target);
      },
    });
    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });

    expect(() => handle.release()).not.toThrow();
    expect(attempts).toBe(3);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("reports exhausted owner removal with manual verification guidance and permits retry", async () => {
    const { workspace, ownerPath, lockPath } = emptyWorkspace();
    let failRemoval = true;
    let attempts = 0;
    const dependencies = fileSystem({
      unlinkSync: (target) => {
        if (target === ownerPath) {
          attempts += 1;
          if (failRemoval) {
            throw fileSystemError("EBUSY", "owner busy");
          }
        }
        fs.unlinkSync(target);
      },
    });
    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });

    expect(() => handle.release()).toThrow(
      `failed to remove symbol compiler lock owner at ${ownerPath}`,
    );
    expect(() => handle.release()).toThrow("verify no operation is active");
    expect(attempts).toBe(6);
    expect(fs.existsSync(lockPath)).toBe(true);

    failRemoval = false;
    expect(() => handle.release()).not.toThrow();
  });

  test("reports release cleanup failure and permits retry", async () => {
    const { workspace, lockPath, ownerPath } = emptyWorkspace();
    let failRemoval = true;
    const dependencies = fileSystem({
      rmdirSync: (target) => {
        if (failRemoval) {
          failRemoval = false;
          throw fileSystemError("ENOTEMPTY", "directory not empty");
        }
        fs.rmdirSync(target);
      },
    });
    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });

    expect(() => handle.release()).toThrow(
      "failed to remove symbol compiler lock directory",
    );
    expect(fs.existsSync(ownerPath)).toBe(false);
    expect(fs.statSync(lockPath).isDirectory()).toBe(true);

    expect(() => handle.release()).not.toThrow();
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("retries transient directory cleanup failures internally", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    let attempts = 0;
    const dependencies = fileSystem({
      rmdirSync: (target) => {
        attempts += 1;
        if (attempts < 3) {
          throw fileSystemError("EBUSY", "directory busy");
        }
        fs.rmdirSync(target);
      },
    });
    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });

    expect(() => handle.release()).not.toThrow();
    expect(attempts).toBe(3);
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("reports exhausted cleanup with manual verification guidance and permits retry", async () => {
    const { workspace, lockPath, ownerPath } = emptyWorkspace();
    let failRemoval = true;
    let attempts = 0;
    const dependencies = fileSystem({
      rmdirSync: (target) => {
        attempts += 1;
        if (failRemoval) {
          throw fileSystemError("EBUSY", "directory busy");
        }
        fs.rmdirSync(target);
      },
    });
    const handle = await acquireSymbolCompilerLock(workspace, {
      fileSystem: dependencies,
    });

    expect(() => handle.release()).toThrow(
      `failed to remove symbol compiler lock directory at ${lockPath}`,
    );
    expect(() => handle.release()).toThrow("verify no operation is active");
    expect(attempts).toBe(6);
    expect(fs.existsSync(ownerPath)).toBe(false);
    expect(fs.existsSync(lockPath)).toBe(true);

    failRemoval = false;
    expect(() => handle.release()).not.toThrow();
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("withSymbolCompilerLock propagates release failure", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    const dependencies = fileSystem({
      rmdirSync: () => {
        throw fileSystemError("EBUSY", "directory busy");
      },
    });

    await expect(
      withSymbolCompilerLock(workspace, async () => "completed", {
        fileSystem: dependencies,
      }),
    ).rejects.toThrow("failed to remove symbol compiler lock directory");
    expect(fs.statSync(lockPath).isDirectory()).toBe(true);
  });

  test("withSymbolCompilerLock preserves operation and release failures", async () => {
    const { workspace, lockPath } = emptyWorkspace();
    const operationError = new Error("operation failed");
    const dependencies = fileSystem({
      rmdirSync: () => {
        throw fileSystemError("EBUSY", "directory busy");
      },
    });

    let thrown: unknown;
    try {
      await withSymbolCompilerLock(
        workspace,
        async () => {
          throw operationError;
        },
        { fileSystem: dependencies },
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toEqual([
      operationError,
      expect.any(Error),
    ]);
    expect((thrown as AggregateError).errors[1].message).toContain(lockPath);
  });

  test("shared release finalization preserves an active operation failure", () => {
    const operationError = new Error("upsert operation failed");
    const releaseError = new Error("upsert lock release failed");
    let thrown: unknown;

    try {
      releaseSymbolCompilerLock(
        {
          release: () => {
            throw releaseError;
          },
        },
        { error: operationError },
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(AggregateError);
    expect((thrown as AggregateError).errors).toEqual([
      operationError,
      releaseError,
    ]);
  });

  test("release preserves an owner record with a different token", async () => {
    const { workspace, lockPath, ownerPath } = emptyWorkspace();
    const handle = await acquireSymbolCompilerLock(workspace);
    const replacement = lockRecord("replacement-owner", Date.now());

    fs.writeFileSync(ownerPath, replacement, "utf8");
    handle.release();

    expect(fs.statSync(lockPath).isDirectory()).toBe(true);
    expect(fs.readFileSync(ownerPath, "utf8")).toBe(replacement);
  });

  test("a stale released handle cannot remove a later owner", async () => {
    const { workspace, ownerPath } = emptyWorkspace();
    const first = await acquireSymbolCompilerLock(workspace);
    first.release();
    const second = await acquireSymbolCompilerLock(workspace);
    const secondOwner = fs.readFileSync(ownerPath, "utf8");

    try {
      first.release();
      expect(fs.readFileSync(ownerPath, "utf8")).toBe(secondOwner);
    } finally {
      second.release();
    }
  });

  test("locks and timeouts are scoped to one workspace", async () => {
    const first = emptyWorkspace();
    const second = emptyWorkspace();
    const firstHandle = await acquireSymbolCompilerLock(first.workspace);
    const secondHandle = await acquireSymbolCompilerLock(second.workspace);

    try {
      await expect(
        acquireSymbolCompilerLock(first.workspace, advancingClock()),
      ).rejects.toThrow("refused after 25ms");
      expect(
        JSON.parse(fs.readFileSync(second.ownerPath, "utf8")),
      ).toMatchObject({ pid: process.pid });
    } finally {
      firstHandle.release();
      secondHandle.release();
    }
  });
});
