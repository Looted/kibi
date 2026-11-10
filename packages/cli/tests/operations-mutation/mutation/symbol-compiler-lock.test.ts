import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  SymbolCompilerLockError,
  type SymbolCompilerLockFileSystem,
  type SymbolCompilerLockOptions,
  acquireSymbolCompilerLock,
  releaseSymbolCompilerLock,
  withSymbolCompilerLock,
} from "../../../src/operations/mutation/symbol-compiler-lock.js";
import {
  type Memory,
  errno,
  failure,
  memoryFs,
  record,
  sleepingClock,
} from "./lock-fixtures.js";

const ROOT = "/ws";
const PARENT = "/ws/.kb";
const TARGET = "/ws/.kb/.symbol-compiler.lock";
const OWNER = `${TARGET}/owner.json`;
const CLEANUP = `To clean it manually, verify no operation is active, verify ${OWNER} and ${TARGET}, then remove ${TARGET}`;

/** Options with a clock that only moves when the lock sleeps. */
function optionsFor(
  memory: Memory,
  extra: Partial<SymbolCompilerLockOptions> = {},
) {
  const { now, sleep, sleeps } = sleepingClock();
  const options: SymbolCompilerLockOptions = {
    timeoutMs: 100,
    now,
    sleep,
    fileSystem: memory.fileSystem,
    isProcessAlive: () => true,
    ...extra,
  };
  return { options, sleeps };
}

/** A held directory lock owned by `content`. */
function held(memory: Memory, content?: string) {
  memory.dirs.add(TARGET);
  if (content !== undefined) memory.files.set(OWNER, content);
}

describe("acquireSymbolCompilerLock", () => {
  test("creates the lock and records its owner", async () => {
    const memory = memoryFs();
    const { options, sleeps } = optionsFor(memory);
    const handle = await acquireSymbolCompilerLock(ROOT, options);
    expect(memory.calls).toStrictEqual([
      `mkdir ${PARENT}`,
      "  recursive",
      `mkdir ${TARGET}`,
      `write ${OWNER}`,
      '  {"encoding":"utf8","flag":"wx"}',
    ]);
    expect(sleeps).toStrictEqual([]);
    const owner = JSON.parse(memory.files.get(OWNER) as string);
    expect(Object.keys(owner)).toStrictEqual(["pid", "token", "acquiredAt"]);
    expect(owner.pid).toBe(process.pid);
    expect(owner.acquiredAt).toBe(1000);
    expect(owner.token).toMatch(
      new RegExp(`^${process.pid}-\\d{13}-[a-z0-9]{1,8}$`),
    );
    expect(memory.files.get(OWNER)).toEndWith("}\n");

    memory.calls.length = 0;
    handle.release();
    expect(memory.calls).toStrictEqual([
      `read ${OWNER}`,
      `unlink ${OWNER}`,
      `rmdir ${TARGET}`,
    ]);
    expect([...memory.dirs]).toStrictEqual([PARENT]);
    handle.release();
    expect(memory.calls).toHaveLength(3);
  });

  test("refuses when the lock parent cannot be created", async () => {
    const memory = memoryFs();
    memory.fail(
      "mkdir",
      PARENT,
      errno("EBUSY"),
      errno("EBUSY"),
      errno("EBUSY"),
    );
    expect(
      await failure(() =>
        acquireSymbolCompilerLock(ROOT, optionsFor(memory).options),
      ),
    ).toStrictEqual({
      name: "SymbolCompilerLockError",
      message: `failed to create symbol compiler lock parent at ${PARENT} after 3 attempt(s): EBUSY: EBUSY happened`,
    });
  });

  test("retries each transient error and gives up on others", async () => {
    for (const code of ["EBUSY", "EAGAIN", "EINTR", "EPERM"]) {
      const memory = memoryFs();
      memory.fail("mkdir", PARENT, errno(code), errno(code));
      await acquireSymbolCompilerLock(ROOT, optionsFor(memory).options);
      expect(
        memory.calls.filter((call) => call === `mkdir ${PARENT}`),
      ).toHaveLength(3);
    }
    for (const error of [errno("ENOSPC"), new Error("plain"), "text", null]) {
      const memory = memoryFs();
      memory.fail("mkdir", PARENT, error);
      const detail =
        error instanceof Error
          ? "code" in error
            ? "ENOSPC: ENOSPC happened"
            : "plain"
          : String(error);
      expect(
        await failure(() =>
          acquireSymbolCompilerLock(ROOT, optionsFor(memory).options),
        ),
      ).toStrictEqual({
        name: "SymbolCompilerLockError",
        message: `failed to create symbol compiler lock parent at ${PARENT} after 1 attempt(s): ${detail}`,
      });
    }
  });

  test("refuses a lock directory that fails other than by existing", async () => {
    for (const [error, detail] of [
      [errno("EACCES"), "EACCES: EACCES happened"],
      [null, "null"],
    ] as const) {
      const memory = memoryFs();
      memory.fail("mkdir", TARGET, error);
      expect(
        await failure(() =>
          acquireSymbolCompilerLock(ROOT, optionsFor(memory).options),
        ),
      ).toStrictEqual({
        name: "SymbolCompilerLockError",
        message: `failed to acquire symbol compiler lock directory at ${TARGET} after 1 attempt(s): ${detail}`,
      });
    }
  });

  test("waits for a live holder and names the blocker on timeout", async () => {
    for (const [setup, blocker] of [
      [(m: Memory) => held(m, record(42)), "held by pid 42"],
      [(m: Memory) => held(m, "{"), "lock owner metadata is corrupt"],
      [(m: Memory) => held(m), "lock is initializing or corrupt"],
      [
        (m: Memory) => m.files.set(TARGET, record(7)),
        "legacy lock held by pid 7",
      ],
      [(m: Memory) => m.files.set(TARGET, "[]"), "legacy or corrupt lock"],
    ] as const) {
      const memory = memoryFs();
      setup(memory);
      const { options, sleeps } = optionsFor(memory);
      expect(
        await failure(() => acquireSymbolCompilerLock(ROOT, options)),
      ).toStrictEqual({
        name: "SymbolCompilerLockError",
        message: `symbol compiler lock is ${blocker}; refused after 100ms to avoid a lost update`,
      });
      expect(sleeps).toStrictEqual([25, 25, 25]);
    }
  });

  test("never tries once the deadline has passed", async () => {
    const memory = memoryFs();
    const { options } = optionsFor(memory, { timeoutMs: 0 });
    expect(
      await failure(() => acquireSymbolCompilerLock(ROOT, options)),
    ).toStrictEqual({
      name: "SymbolCompilerLockError",
      message:
        "symbol compiler lock is unknown; refused after 0ms to avoid a lost update",
    });
    expect(memory.calls).toStrictEqual([`mkdir ${PARENT}`, "  recursive"]);
  });

  test("reads every malformed owner record as corrupt", async () => {
    for (const content of [
      "5",
      "null",
      '"text"',
      JSON.stringify({ token: "t", acquiredAt: 1 }),
      JSON.stringify({ pid: "1", token: "t", acquiredAt: 1 }),
      JSON.stringify({ pid: 1, token: 2, acquiredAt: 1 }),
      JSON.stringify({ pid: 1, token: "t" }),
      JSON.stringify({ pid: 1, token: "t", acquiredAt: "1" }),
    ]) {
      const memory = memoryFs();
      held(memory, content);
      const pids: number[] = [];
      const { options } = optionsFor(memory, {
        isProcessAlive: (pid) => {
          pids.push(pid);
          return false;
        },
      });
      expect([
        content,
        await failure(() => acquireSymbolCompilerLock(ROOT, options)),
      ]).toStrictEqual([
        content,
        {
          name: "SymbolCompilerLockError",
          message:
            "symbol compiler lock is lock owner metadata is corrupt; refused after 100ms to avoid a lost update",
        },
      ]);
      expect(pids).toStrictEqual([]);
    }
  });

  test("steals a directory lock whose holder is dead", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    const pids: number[] = [];
    const { options, sleeps } = optionsFor(memory, {
      isProcessAlive: (pid) => {
        pids.push(pid);
        return false;
      },
    });
    await acquireSymbolCompilerLock(ROOT, options);
    expect(pids).toStrictEqual([42]);
    expect(sleeps).toStrictEqual([]);
    expect(memory.calls.slice(2)).toStrictEqual([
      `mkdir ${TARGET}`,
      `read ${OWNER}`,
      `read ${OWNER}`,
      `unlink ${OWNER}`,
      `rmdir ${TARGET}`,
      `mkdir ${TARGET}`,
      `write ${OWNER}`,
      '  {"encoding":"utf8","flag":"wx"}',
    ]);
    expect(JSON.parse(memory.files.get(OWNER) as string).pid).toBe(process.pid);
  });

  test("steals a dead holder's lock whose owner file vanished meanwhile", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    memory.fail("unlink", OWNER, () => {
      memory.files.delete(OWNER);
      return errno("ENOENT");
    });
    const { options, sleeps } = optionsFor(memory, {
      isProcessAlive: () => false,
    });
    await acquireSymbolCompilerLock(ROOT, options);
    expect(sleeps).toStrictEqual([]);
  });

  test("keeps a dead holder's lock it cannot remove", async () => {
    const owner = memoryFs();
    held(owner, record(42));
    owner.fail("unlink", OWNER, errno("EIO"));
    const retried = optionsFor(owner, { isProcessAlive: () => false });
    await acquireSymbolCompilerLock(ROOT, retried.options);
    expect(retried.sleeps).toStrictEqual([25]);

    // Once the owner file is gone the directory reads as initializing.
    const directory = memoryFs();
    held(directory, record(42));
    directory.fail("rmdir", TARGET, errno("EIO"));
    const blocked = optionsFor(directory, { isProcessAlive: () => false });
    expect(
      await failure(() => acquireSymbolCompilerLock(ROOT, blocked.options)),
    ).toStrictEqual({
      name: "SymbolCompilerLockError",
      message:
        "symbol compiler lock is lock is initializing or corrupt; refused after 100ms to avoid a lost update",
    });
    expect(blocked.sleeps).toStrictEqual([25, 25, 25]);
  });

  test("steals a legacy file lock whose holder is dead", async () => {
    const memory = memoryFs();
    memory.files.set(TARGET, record(7));
    const { options, sleeps } = optionsFor(memory, {
      isProcessAlive: () => false,
    });
    await acquireSymbolCompilerLock(ROOT, options);
    expect(sleeps).toStrictEqual([]);
    expect(memory.files.has(TARGET)).toBe(false);
    expect(memory.dirs.has(TARGET)).toBe(true);

    const stuck = memoryFs();
    stuck.files.set(TARGET, record(7));
    stuck.fail("unlink", TARGET, errno("EIO"));
    const blocked = optionsFor(stuck, { isProcessAlive: () => false });
    await acquireSymbolCompilerLock(ROOT, blocked.options);
    expect(blocked.sleeps).toStrictEqual([25]);
  });

  test("judges the holder with the real process table by default", async () => {
    const dead = spawnSync("true").pid as number;
    const memory = memoryFs();
    held(memory, record(dead));
    const { options, sleeps } = optionsFor(memory, {
      isProcessAlive: undefined,
    });
    await acquireSymbolCompilerLock(ROOT, options);
    expect(sleeps).toStrictEqual([]);

    // A pid process.kill rejects is not proven dead.
    const odd = memoryFs();
    held(odd, record(1.5));
    expect(
      await failure(() =>
        acquireSymbolCompilerLock(
          ROOT,
          optionsFor(odd, { isProcessAlive: undefined }).options,
        ),
      ),
    ).toStrictEqual({
      name: "SymbolCompilerLockError",
      message:
        "symbol compiler lock is held by pid 1.5; refused after 100ms to avoid a lost update",
    });

    const live = memoryFs();
    held(live, record(process.pid));
    const blocked = optionsFor(live, { isProcessAlive: undefined });
    expect(
      (await failure(() =>
        acquireSymbolCompilerLock(ROOT, blocked.options),
      )) as {
        message: string;
      },
    ).toMatchObject({
      message: expect.stringContaining(`held by pid ${process.pid}`),
    });
  });

  test("sleeps for real between attempts by default", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    const started = Date.now();
    await failure(() =>
      acquireSymbolCompilerLock(ROOT, {
        timeoutMs: 60,
        fileSystem: memory.fileSystem,
        isProcessAlive: () => true,
      }),
    );
    const attempts = memory.calls.filter((call) => call === `mkdir ${TARGET}`);
    expect(attempts.length).toBeGreaterThan(1);
    expect(attempts.length).toBeLessThan(6);
    expect(Date.now() - started).toBeGreaterThanOrEqual(50);
  });

  test("retries an owner write only while no owner file exists", async () => {
    const retried = memoryFs();
    retried.fail("write", OWNER, errno("EBUSY"));
    await acquireSymbolCompilerLock(ROOT, optionsFor(retried).options);
    expect(
      retried.calls.filter((call) => call === `write ${OWNER}`),
    ).toHaveLength(2);

    for (const [probe, written] of [
      [errno("EIO"), false],
      [undefined, true],
    ] as const) {
      const memory = memoryFs();
      memory.fail("write", OWNER, errno("EBUSY"));
      if (probe !== undefined) memory.fail("read", OWNER, probe);
      // Otherwise the probe finds a file another writer left.
      if (written) memory.files.set(OWNER, "x");
      const outcome = await failure(() =>
        acquireSymbolCompilerLock(ROOT, optionsFor(memory).options),
      );
      expect((outcome as { message: string }).message).toStartWith(
        `failed to initialize symbol compiler lock owner at ${OWNER}: EBUSY: EBUSY happened; `,
      );
      expect(
        memory.calls.filter((call) => call === `write ${OWNER}`),
      ).toHaveLength(1);
    }
  });

  test("cleans up a lock whose owner cannot be written", async () => {
    const clean = memoryFs();
    clean.fail("write", OWNER, errno("ENOSPC"));
    expect(
      await failure(() =>
        acquireSymbolCompilerLock(ROOT, optionsFor(clean).options),
      ),
    ).toStrictEqual({
      name: "SymbolCompilerLockError",
      message: `failed to initialize symbol compiler lock owner at ${OWNER}: ENOSPC: ENOSPC happened; lock directory cleanup completed`,
    });
    expect(clean.dirs.has(TARGET)).toBe(false);

    const stuck = memoryFs();
    stuck.fail("write", OWNER, errno("ENOSPC"));
    stuck.fail("unlink", OWNER, errno("EIO"));
    stuck.fail("rmdir", TARGET, errno("EIO"));
    expect(
      await failure(() =>
        acquireSymbolCompilerLock(ROOT, optionsFor(stuck).options),
      ),
    ).toStrictEqual({
      name: "SymbolCompilerLockError",
      message: `failed to initialize symbol compiler lock owner at ${OWNER}: ENOSPC: ENOSPC happened; lock remains fail-closed at ${TARGET}; owner cleanup: failed to remove symbol compiler lock owner at ${OWNER} after 1 attempt(s): EIO: EIO happened; lock remains fail-closed. ${CLEANUP}; directory cleanup: failed to remove symbol compiler lock directory at ${TARGET} after 1 attempt(s): EIO: EIO happened; lock remains fail-closed. ${CLEANUP}`,
    });
  });
});

describe("release", () => {
  async function acquired(memory: Memory) {
    const handle = await acquireSymbolCompilerLock(
      ROOT,
      optionsFor(memory).options,
    );
    memory.calls.length = 0;
    return handle;
  }

  test("leaves another owner's lock alone, once", async () => {
    const memory = memoryFs();
    const handle = await acquired(memory);
    memory.files.set(OWNER, record(1, "someone-else"));
    handle.release();
    handle.release();
    expect(memory.calls).toStrictEqual([`read ${OWNER}`]);
    expect(memory.dirs.has(TARGET)).toBe(true);
  });

  test("refuses an unreadable or corrupt owner record", async () => {
    const unreadable = memoryFs();
    const first = await acquired(unreadable);
    unreadable.fail("read", OWNER, errno("EIO"));
    expect(await failure(() => first.release())).toStrictEqual({
      name: "SymbolCompilerLockError",
      message: `failed to validate symbol compiler lock owner at ${OWNER} after 1 attempt(s): EIO: EIO happened; lock remains fail-closed. ${CLEANUP}`,
    });

    const corrupt = memoryFs();
    const second = await acquired(corrupt);
    corrupt.files.set(OWNER, "{}");
    expect(await failure(() => second.release())).toStrictEqual({
      name: "SymbolCompilerLockError",
      message: `refused to release symbol compiler lock with corrupt owner metadata at ${OWNER}; lock remains fail-closed. ${CLEANUP}`,
    });
    expect(corrupt.calls).toStrictEqual([`read ${OWNER}`]);
  });

  test("refuses a missing owner file instead of ignoring it", async () => {
    const memory = memoryFs();
    const handle = await acquired(memory);
    memory.fail("unlink", OWNER, errno("ENOENT"));
    expect(await failure(() => handle.release())).toStrictEqual({
      name: "SymbolCompilerLockError",
      message: `failed to remove symbol compiler lock owner at ${OWNER} after 1 attempt(s): ENOENT: ENOENT happened; lock remains fail-closed. ${CLEANUP}`,
    });
  });

  test("retries only the directory once the owner is gone", async () => {
    const memory = memoryFs();
    const handle = await acquired(memory);
    memory.fail("rmdir", TARGET, "stuck", errno("EBUSY"));
    expect(await failure(() => handle.release())).toStrictEqual({
      name: "SymbolCompilerLockError",
      message: `failed to remove symbol compiler lock directory at ${TARGET} after 1 attempt(s): stuck; lock remains fail-closed. ${CLEANUP}`,
    });
    memory.calls.length = 0;
    handle.release();
    expect(memory.calls).toStrictEqual([`rmdir ${TARGET}`, `rmdir ${TARGET}`]);
    handle.release();
    expect(memory.calls).toHaveLength(2);
    expect(memory.dirs.has(TARGET)).toBe(false);
  });
});

describe("releaseSymbolCompilerLock", () => {
  const failing = (error: unknown) => ({
    release: () => {
      throw error;
    },
  });

  test("does nothing without a handle", () => {
    expect(releaseSymbolCompilerLock(undefined)).toBeUndefined();
  });

  test("reports a release failure after a committed mutation", async () => {
    expect(
      await failure(() =>
        releaseSymbolCompilerLock(failing(errno("EIO")), undefined, true),
      ),
    ).toStrictEqual({
      name: "OperationError",
      code: "SYMBOL_COMPILER_LOCK_RELEASE_FAILED",
      retryable: false,
      message:
        "Mutation committed, but symbol compiler lock release failed: EIO: EIO happened; do not retry the mutation until the lock is manually verified and released",
    });
  });

  test("joins a release failure to the operation's failure", async () => {
    const operation = new Error("operation");
    const release = new Error("release");
    expect(
      await failure(() =>
        releaseSymbolCompilerLock(failing(release), { error: operation }),
      ),
    ).toStrictEqual({
      name: "AggregateError",
      message: "Operation failed and symbol compiler lock release failed",
      errors: [operation, release],
    });
    expect(
      await failure(() => releaseSymbolCompilerLock(failing(release))),
    ).toStrictEqual({ name: "Error", message: "release" });
  });
});

describe("withSymbolCompilerLock", () => {
  test("holds the lock around the operation", async () => {
    const memory = memoryFs();
    const seen: boolean[] = [];
    expect(
      await withSymbolCompilerLock(
        ROOT,
        async () => {
          seen.push(memory.dirs.has(TARGET));
          return 7;
        },
        optionsFor(memory).options,
      ),
    ).toBe(7);
    expect(seen).toStrictEqual([true]);
    expect(memory.dirs.has(TARGET)).toBe(false);
  });

  test("releases after a failure and reports both failures", async () => {
    const memory = memoryFs();
    const error = new Error("operation");
    expect(
      await failure(() =>
        withSymbolCompilerLock(
          ROOT,
          async () => {
            throw error;
          },
          optionsFor(memory).options,
        ),
      ),
    ).toStrictEqual({ name: "Error", message: "operation" });
    expect(memory.dirs.has(TARGET)).toBe(false);

    const stuck = memoryFs();
    stuck.fail("rmdir", TARGET, errno("EIO"));
    const outcome = (await failure(() =>
      withSymbolCompilerLock(
        ROOT,
        async () => {
          throw error;
        },
        optionsFor(stuck).options,
      ),
    )) as { name: string; errors: unknown[] };
    expect(outcome.name).toBe("AggregateError");
    expect(outcome.errors[0]).toBe(error);
    expect((outcome.errors[1] as Error).name).toBe("SymbolCompilerLockError");
  });
});

describe("SymbolCompilerLockError", () => {
  test("names itself", () => {
    expect(new SymbolCompilerLockError("m").name).toBe(
      "SymbolCompilerLockError",
    );
  });
});

describe("the real filesystem", () => {
  let root = "";
  beforeEach(() => {
    root = realpathSync(
      mkdtempSync(path.join(os.tmpdir(), "kibi-symbol-lock-")),
    );
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("creates, reads and removes the lock", async () => {
    const lock = path.join(root, ".kb", ".symbol-compiler.lock");
    const handle = await acquireSymbolCompilerLock(root);
    expect(existsSync(path.join(lock, "owner.json"))).toBe(true);
    expect(
      (await failure(() =>
        acquireSymbolCompilerLock(root, { timeoutMs: 30 }),
      )) as { message: string },
    ).toMatchObject({
      message: `symbol compiler lock is held by pid ${process.pid}; refused after 30ms to avoid a lost update`,
    });
    handle.release();
    expect(existsSync(lock)).toBe(false);
  });
});
