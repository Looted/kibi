import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { InputError, OperationError } from "../../../src/cli-errors.js";
import {
  type DeadLockHolder,
  WorkspaceMutationLockError,
  type WorkspaceMutationLockOptions,
  acquireWorkspaceMutationLock,
  classifySourceMutationFailure,
  releaseWorkspaceMutationLock,
  withWorkspaceMutationLock,
} from "../../../src/operations/mutation/workspace-mutation-lock.js";
import {
  type Memory,
  errno,
  failure,
  memoryFs,
  record,
  sleepingClock,
} from "./lock-fixtures.js";

const ROOT = "/ws";
const PARENT = "/ws/.kb/recovery";
const TARGET = "/ws/.kb/recovery/source-authoring.lock";
const OWNER = `${TARGET}/owner.json`;
const CLEANUP = `To clean it manually, verify no operation is active, verify ${OWNER} and ${TARGET}, then remove ${TARGET}`;
const QUIESCE =
  "Quiesce all Kibi and source-mutating writers, then manually verify the owner metadata and remove the lock only after confirming no operation is active";

function optionsFor(
  memory: Memory,
  extra: Partial<WorkspaceMutationLockOptions> = {},
) {
  const { now, sleep, sleeps } = sleepingClock();
  const options: WorkspaceMutationLockOptions = {
    timeoutMs: 100,
    now,
    sleep,
    fileSystem: memory.fileSystem,
    isProcessAlive: () => true,
    ...extra,
  };
  return { options, sleeps };
}

function held(memory: Memory, content?: string) {
  memory.dirs.add(TARGET);
  if (content !== undefined) memory.files.set(OWNER, content);
}

const recovery = (detail: string) => ({
  name: "OperationError",
  code: "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
  retryable: false,
  message: `workspace mutation lock at ${TARGET} requires operator recovery: ${detail}. ${QUIESCE}`,
});

const timeout = (blocker: string, ms = 100) => ({
  name: "OperationError",
  code: "SOURCE_MUTATION_LOCK_TIMEOUT",
  retryable: true,
  message: `workspace mutation lock is ${blocker}; acquisition timed out after ${ms}ms while the live owner remained in place; retry after the owner releases the lock to avoid a lost update`,
});

async function acquireWith(
  memory: Memory,
  extra: Partial<WorkspaceMutationLockOptions> = {},
) {
  const { options, sleeps } = optionsFor(memory, extra);
  const outcome = await failure(() =>
    acquireWorkspaceMutationLock(ROOT, options),
  );
  return { outcome, sleeps };
}

describe("acquireWorkspaceMutationLock", () => {
  test("creates the lock and records its owner", async () => {
    const memory = memoryFs();
    const { options, sleeps } = optionsFor(memory);
    const handle = await acquireWorkspaceMutationLock(ROOT, options);
    expect(Object.keys(handle)).toStrictEqual(["release"]);
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
    handle.release();
    expect(memory.calls).toHaveLength(3);
    expect([...memory.dirs]).toStrictEqual([PARENT]);
  });

  test("places the lock at a configured path", async () => {
    const memory = memoryFs();
    const { options } = optionsFor(memory, {
      lockFileRelative: path.join("x", "y.lock"),
    });
    await acquireWorkspaceMutationLock(ROOT, options);
    expect(memory.calls.slice(0, 3)).toStrictEqual([
      "mkdir /ws/x",
      "  recursive",
      "mkdir /ws/x/y.lock",
    ]);
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
    expect((await acquireWith(memory)).outcome).toStrictEqual({
      name: "WorkspaceMutationLockError",
      message: `failed to create workspace mutation lock parent at ${PARENT} after 3 attempt(s): EBUSY: EBUSY happened`,
    });
  });

  test("retries each transient error and gives up on others", async () => {
    for (const code of ["EBUSY", "EAGAIN", "EINTR", "EPERM"]) {
      const memory = memoryFs();
      memory.fail("mkdir", PARENT, errno(code), errno(code));
      expect((await acquireWith(memory)).outcome).toBe("ok");
    }
    for (const [error, detail] of [
      [errno("ENOSPC"), "ENOSPC: ENOSPC happened"],
      [new Error("plain"), "plain"],
      ["text", "text"],
      [null, "null"],
    ] as const) {
      const memory = memoryFs();
      memory.fail("mkdir", PARENT, error);
      expect((await acquireWith(memory)).outcome).toStrictEqual({
        name: "WorkspaceMutationLockError",
        message: `failed to create workspace mutation lock parent at ${PARENT} after 1 attempt(s): ${detail}`,
      });
    }
  });

  test("refuses a lock directory that fails other than by existing", async () => {
    const memory = memoryFs();
    memory.fail("mkdir", TARGET, errno("EACCES"));
    expect((await acquireWith(memory)).outcome).toStrictEqual({
      name: "WorkspaceMutationLockError",
      message: `failed to acquire workspace mutation lock directory at ${TARGET} after 1 attempt(s): EACCES: EACCES happened`,
    });
  });

  test("waits for a live holder until the deadline", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    const { outcome, sleeps } = await acquireWith(memory);
    expect(outcome).toStrictEqual(timeout("held by pid 42"));
    expect(sleeps).toStrictEqual([25, 25, 25]);
    const legacy = memoryFs();
    legacy.files.set(TARGET, record(7));
    expect((await acquireWith(legacy)).outcome).toStrictEqual(
      timeout("held by pid 7"),
    );
  });

  test("never tries once the deadline has passed", async () => {
    const memory = memoryFs();
    expect((await acquireWith(memory, { timeoutMs: 0 })).outcome).toStrictEqual(
      timeout("unknown", 0),
    );
  });

  test("rereads a missing owner a bounded number of times", async () => {
    const memory = memoryFs();
    held(memory);
    const { outcome, sleeps } = await acquireWith(memory, { timeoutMs: 1000 });
    expect(outcome).toStrictEqual({
      ...recovery("lock owner metadata is missing after 4 reread(s)"),
      message: `workspace mutation lock at ${TARGET} requires operator recovery: lock owner metadata is missing after 4 reread(s). ${QUIESCE}`,
    });
    expect(sleeps).toStrictEqual([25, 25, 25, 25]);
  });

  test("a missing owner for the whole window needs recovery", async () => {
    const memory = memoryFs();
    held(memory);
    expect(
      (await acquireWith(memory, { timeoutMs: 50 })).outcome,
    ).toStrictEqual({
      name: "OperationError",
      code: "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
      retryable: false,
      message: `workspace mutation lock at ${TARGET} requires operator recovery: lock owner metadata is missing for the whole acquisition window. ${QUIESCE}`,
    });
  });

  test("an owner that appears after a reread is a live holder again", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    memory.fail("read", OWNER, errno("ENOENT"));
    const { outcome, sleeps } = await acquireWith(memory);
    expect(outcome).toStrictEqual(timeout("held by pid 42"));
    expect(sleeps).toStrictEqual([25, 25, 25]);
  });

  test("an owner that cannot be read needs recovery", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    memory.fail("read", OWNER, errno("EIO"));
    expect((await acquireWith(memory)).outcome).toStrictEqual(
      recovery("lock owner metadata is missing or unverifiable"),
    );
  });

  test("corrupt metadata needs recovery", async () => {
    for (const content of [
      "{",
      "5",
      "null",
      JSON.stringify({ token: "t", acquiredAt: 1 }),
      JSON.stringify({ pid: "1", token: "t", acquiredAt: 1 }),
      JSON.stringify({ pid: 1, token: 2, acquiredAt: 1 }),
      JSON.stringify({ pid: 1, token: "t", acquiredAt: "1" }),
    ]) {
      const memory = memoryFs();
      held(memory, content);
      expect([content, (await acquireWith(memory)).outcome]).toStrictEqual([
        content,
        recovery("lock owner metadata is corrupt or unverifiable"),
      ]);
    }
    const legacy = memoryFs();
    legacy.files.set(TARGET, "[]");
    expect((await acquireWith(legacy)).outcome).toStrictEqual(
      recovery("legacy lock metadata is corrupt or unverifiable"),
    );
  });

  test("a holder that cannot be verified needs recovery", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    expect(
      (
        await acquireWith(memory, {
          isProcessAlive: () => {
            throw new Error("no");
          },
        })
      ).outcome,
    ).toStrictEqual(recovery("holder pid 42 could not be verified as live"));
    const odd = memoryFs();
    held(odd, record(1.5));
    expect(
      (await acquireWith(odd, { isProcessAlive: undefined })).outcome,
    ).toStrictEqual(recovery("holder pid 1.5 could not be verified as live"));
  });

  test("judges the holder with the real process table by default", async () => {
    const dead = spawnSync("true").pid as number;
    const memory = memoryFs();
    held(memory, record(dead));
    expect(
      (await acquireWith(memory, { isProcessAlive: undefined })).outcome,
    ).toStrictEqual(recovery(`holder pid ${dead} is not live`));
    const live = memoryFs();
    held(live, record(process.pid));
    expect(
      (await acquireWith(live, { isProcessAlive: undefined })).outcome,
    ).toStrictEqual(timeout(`held by pid ${process.pid}`));
  });

  test("a dead holder needs recovery unless reclaim is allowed", async () => {
    for (const extra of [
      {},
      { reclaimDeadHolder: () => false },
      {
        reclaimDeadHolder: () => true,
        fileSystem: { ...memoryFs().fileSystem, renameSync: undefined },
      },
    ]) {
      const memory = memoryFs();
      held(memory, record(42));
      const fileSystem =
        "fileSystem" in extra
          ? { ...memory.fileSystem, renameSync: undefined }
          : memory.fileSystem;
      expect(
        (
          await acquireWith(memory, {
            isProcessAlive: () => false,
            ...extra,
            fileSystem,
          })
        ).outcome,
      ).toStrictEqual(recovery("holder pid 42 is not live"));
    }
    const legacy = memoryFs();
    legacy.files.set(TARGET, record(7));
    const asked: DeadLockHolder[] = [];
    expect(
      (
        await acquireWith(legacy, {
          isProcessAlive: () => false,
          reclaimDeadHolder: (holder) => {
            asked.push(holder);
            return true;
          },
        })
      ).outcome,
    ).toStrictEqual(recovery("holder pid 7 is not live"));
    expect(asked).toStrictEqual([]);
  });
});

describe("reclaiming a dead holder's lock", () => {
  async function reclaim(
    memory: Memory,
    extra: Partial<WorkspaceMutationLockOptions> = {},
  ) {
    const asked: DeadLockHolder[] = [];
    const { options, sleeps } = optionsFor(memory, {
      isProcessAlive: (pid) => pid !== 42,
      reclaimDeadHolder: (holder) => {
        asked.push(holder);
        return true;
      },
      ...extra,
    });
    const outcome = await failure(async () => {
      const handle = await acquireWorkspaceMutationLock(ROOT, options);
      return handle;
    });
    return { outcome, sleeps, asked, options };
  }

  test("moves the lock aside, removes it and reports the holder", async () => {
    const memory = memoryFs();
    held(memory, record(42, "dead-token"));
    const asked: DeadLockHolder[] = [];
    const { options, sleeps } = optionsFor(memory, {
      isProcessAlive: () => false,
      reclaimDeadHolder: (holder) => {
        asked.push(holder);
        return true;
      },
    });
    const handle = await acquireWorkspaceMutationLock(ROOT, options);
    expect(asked).toStrictEqual([
      { pid: 42, token: "dead-token", acquiredAt: 1 },
    ]);
    expect(handle.reclaimed).toStrictEqual([
      {
        pid: 42,
        token: "dead-token",
        acquiredAt: 1,
        reclaimedAt: 1000,
        reclaimedByPid: process.pid,
      },
    ]);
    expect(sleeps).toStrictEqual([]);
    const token = JSON.parse(memory.files.get(OWNER) as string).token;
    const tombstone = `${TARGET}.reclaimed-${token}`;
    expect(memory.calls.slice(2, 9)).toStrictEqual([
      `mkdir ${TARGET}`,
      `read ${OWNER}`,
      `rename ${TARGET} -> ${tombstone}`,
      `read ${tombstone}/owner.json`,
      `unlink ${tombstone}/owner.json`,
      `rmdir ${tombstone}`,
      `mkdir ${TARGET}`,
    ]);
    expect([...memory.dirs].sort()).toStrictEqual([PARENT, TARGET]);
  });

  test("retries when another reclaimer moved the lock first", async () => {
    for (const code of ["ENOENT", "EEXIST", "ENOTEMPTY"]) {
      const memory = memoryFs();
      held(memory, record(42));
      memory.fail("rename", TARGET, errno(code));
      const { outcome, sleeps } = await reclaim(memory);
      expect([
        code,
        typeof outcome === "object" && "release" in outcome,
      ]).toStrictEqual([code, false]);
      expect(sleeps).toStrictEqual([25]);
    }
  });

  test("refuses when the lock cannot be moved", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    memory.fail("rename", TARGET, errno("EIO"));
    expect((await reclaim(memory)).outcome).toStrictEqual({
      name: "WorkspaceMutationLockError",
      message: `failed to reclaim workspace mutation lock at ${TARGET} from dead pid 42: EIO: EIO happened`,
    });
  });

  test("puts back a lock whose owner changed while it moved", async () => {
    for (const change of [
      (memory: Memory) => memory.files.set(OWNER, record(42, "new")),
      (memory: Memory) => memory.files.delete(OWNER),
      (memory: Memory) => memory.files.set(OWNER, "{"),
    ]) {
      const memory = memoryFs();
      held(memory, record(42));
      memory.fail("rename", TARGET, () => {
        change(memory);
      });
      const { outcome } = await reclaim(memory);
      const message = (outcome as { message: string }).message;
      const tombstone = message.slice(
        message.indexOf(`${TARGET} and `) + TARGET.length + 5,
        message.indexOf(" before removing"),
      );
      expect(tombstone).toStartWith(`${TARGET}.reclaimed-${process.pid}-`);
      expect(outcome).toStrictEqual({
        name: "OperationError",
        code: "SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED",
        retryable: false,
        message: `workspace mutation lock at ${TARGET} changed owner while it was reclaimed from dead pid 42. Quiesce all Kibi and source-mutating writers, then verify ${TARGET} and ${tombstone} before removing either`,
      });
      expect(memory.dirs.has(TARGET)).toBe(true);
      expect(memory.dirs.has(tombstone)).toBe(false);
    }
  });

  test("leaves the moved lock when its path was taken again", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    memory.fail("rename", TARGET, () => {
      memory.files.set(OWNER, record(42, "new"));
    });
    const { options } = optionsFor(memory, {
      isProcessAlive: () => false,
      reclaimDeadHolder: () => true,
    });
    const token = (await failure(() =>
      acquireWorkspaceMutationLock(ROOT, {
        ...options,
        fileSystem: {
          ...memory.fileSystem,
          renameSync: (from, to) => {
            if (from !== TARGET) memory.dirs.add(TARGET);
            memory.fileSystem.renameSync(from, to);
          },
        },
      }),
    )) as { code: string };
    expect(token.code).toBe("SOURCE_MUTATION_LOCK_RECOVERY_REQUIRED");
    expect(
      [...memory.dirs].filter((dir) => dir.includes(".reclaimed-")),
    ).toHaveLength(1);
  });

  test("ignores a moved owner file that is already gone", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    const { options } = optionsFor(memory, {
      isProcessAlive: () => false,
      reclaimDeadHolder: () => true,
      fileSystem: {
        ...memory.fileSystem,
        unlinkSync: (target) => {
          if (target.includes(".reclaimed-")) {
            memory.files.delete(target);
            throw errno("ENOENT");
          }
          memory.fileSystem.unlinkSync(target);
        },
      },
    });
    const handle = await acquireWorkspaceMutationLock(ROOT, options);
    expect(handle.reclaimed).toHaveLength(1);
  });

  test("refuses when the moved lock cannot be removed", async () => {
    const memory = memoryFs();
    held(memory, record(42));
    const { options } = optionsFor(memory, {
      isProcessAlive: () => false,
      reclaimDeadHolder: () => true,
      fileSystem: {
        ...memory.fileSystem,
        rmdirSync: (target) => {
          if (target.includes(".reclaimed-")) throw errno("EIO");
          memory.fileSystem.rmdirSync(target);
        },
      },
    });
    const outcome = (await failure(() =>
      acquireWorkspaceMutationLock(ROOT, options),
    )) as { name: string; message: string };
    expect(outcome.name).toBe("WorkspaceMutationLockError");
    expect(outcome.message).toMatch(
      /^failed to remove workspace mutation lock directory at \S+\.reclaimed-\S+ after 1 attempt\(s\): EIO: EIO happened; lock remains fail-closed\. /,
    );
  });
});

describe("the owner record", () => {
  test("retries an owner write only while no owner file exists", async () => {
    const retried = memoryFs();
    retried.fail("write", OWNER, errno("EBUSY"));
    expect((await acquireWith(retried)).outcome).toBe("ok");
    expect(
      retried.calls.filter((call) => call === `write ${OWNER}`),
    ).toHaveLength(2);

    for (const left of [false, true]) {
      const memory = memoryFs();
      memory.fail("write", OWNER, errno("EBUSY"));
      if (left) memory.files.set(OWNER, "x");
      else memory.fail("read", OWNER, errno("EIO"));
      const { outcome } = await acquireWith(memory);
      expect((outcome as { message: string }).message).toStartWith(
        `failed to initialize workspace mutation lock owner at ${OWNER}: EBUSY: EBUSY happened; `,
      );
      expect(
        memory.calls.filter((call) => call === `write ${OWNER}`),
      ).toHaveLength(1);
    }
  });

  test("cleans up a lock whose owner cannot be written", async () => {
    const clean = memoryFs();
    clean.fail("write", OWNER, errno("ENOSPC"));
    expect((await acquireWith(clean)).outcome).toStrictEqual({
      name: "WorkspaceMutationLockError",
      message: `failed to initialize workspace mutation lock owner at ${OWNER}: ENOSPC: ENOSPC happened; lock directory cleanup completed`,
    });
    expect(clean.dirs.has(TARGET)).toBe(false);

    const stuck = memoryFs();
    stuck.fail("write", OWNER, errno("ENOSPC"));
    stuck.fail("unlink", OWNER, errno("EIO"));
    stuck.fail("rmdir", TARGET, errno("EIO"));
    expect((await acquireWith(stuck)).outcome).toStrictEqual({
      name: "WorkspaceMutationLockError",
      message: `failed to initialize workspace mutation lock owner at ${OWNER}: ENOSPC: ENOSPC happened; lock remains fail-closed at ${TARGET}; owner cleanup: failed to remove workspace mutation lock owner at ${OWNER} after 1 attempt(s): EIO: EIO happened; lock remains fail-closed. ${CLEANUP}; directory cleanup: failed to remove workspace mutation lock directory at ${TARGET} after 1 attempt(s): EIO: EIO happened; lock remains fail-closed. ${CLEANUP}`,
    });
  });
});

describe("release", () => {
  async function acquired(memory: Memory) {
    const handle = await acquireWorkspaceMutationLock(
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
  });

  test("refuses an unreadable or corrupt owner record", async () => {
    const unreadable = memoryFs();
    const first = await acquired(unreadable);
    unreadable.fail("read", OWNER, errno("EIO"));
    expect(await failure(() => first.release())).toStrictEqual({
      name: "WorkspaceMutationLockError",
      message: `failed to validate workspace mutation lock owner at ${OWNER} after 1 attempt(s): EIO: EIO happened; lock remains fail-closed. ${CLEANUP}`,
    });
    const corrupt = memoryFs();
    const second = await acquired(corrupt);
    corrupt.files.set(OWNER, "{}");
    expect(await failure(() => second.release())).toStrictEqual({
      name: "WorkspaceMutationLockError",
      message: `refused to release workspace mutation lock with corrupt owner metadata at ${OWNER}; lock remains fail-closed. ${CLEANUP}`,
    });
  });

  test("refuses a missing owner file instead of ignoring it", async () => {
    const memory = memoryFs();
    const handle = await acquired(memory);
    memory.fail("unlink", OWNER, errno("ENOENT"));
    expect(await failure(() => handle.release())).toStrictEqual({
      name: "WorkspaceMutationLockError",
      message: `failed to remove workspace mutation lock owner at ${OWNER} after 1 attempt(s): ENOENT: ENOENT happened; lock remains fail-closed. ${CLEANUP}`,
    });
  });

  test("retries only the directory once the owner is gone", async () => {
    const memory = memoryFs();
    const handle = await acquired(memory);
    memory.fail("rmdir", TARGET, "stuck");
    expect(await failure(() => handle.release())).toStrictEqual({
      name: "WorkspaceMutationLockError",
      message: `failed to remove workspace mutation lock directory at ${TARGET} after 1 attempt(s): stuck; lock remains fail-closed. ${CLEANUP}`,
    });
    memory.calls.length = 0;
    handle.release();
    handle.release();
    expect(memory.calls).toStrictEqual([`rmdir ${TARGET}`]);
  });
});

describe("releaseWorkspaceMutationLock", () => {
  const failing = (error: unknown) => ({
    release: () => {
      throw error;
    },
  });

  test("does nothing without a handle", () => {
    expect(releaseWorkspaceMutationLock(undefined)).toBeUndefined();
  });

  test("reports a release failure after a committed mutation", async () => {
    expect(
      await failure(() =>
        releaseWorkspaceMutationLock(failing(errno("EIO")), undefined, true),
      ),
    ).toStrictEqual({
      name: "OperationError",
      code: "SOURCE_MUTATION_LOCK_RELEASE_FAILED",
      retryable: false,
      message:
        "Mutation committed, but workspace source lock release failed: EIO: EIO happened; do not retry the mutation until the lock is manually verified and released",
    });
  });

  test("joins a release failure to the operation's failure", async () => {
    const operation = new Error("operation");
    const release = new Error("release");
    expect(
      await failure(() =>
        releaseWorkspaceMutationLock(failing(release), { error: operation }),
      ),
    ).toStrictEqual({
      name: "AggregateError",
      message: "Operation failed and workspace mutation lock release failed",
      errors: [operation, release],
    });
    expect(
      await failure(() => releaseWorkspaceMutationLock(failing(release))),
    ).toStrictEqual({ name: "Error", message: "release" });
  });
});

describe("classifySourceMutationFailure", () => {
  test("keeps an uncommitted failure and typed failures", () => {
    const error = new Error("x");
    expect(classifySourceMutationFailure("Upsert", error, false)).toBe(error);
    const typed = new OperationError("C", "m");
    expect(classifySourceMutationFailure("Upsert", typed, true)).toBe(typed);
    const input = new InputError("C", "m");
    expect(classifySourceMutationFailure("Upsert", input, true)).toBe(input);
  });

  test("wraps any other committed failure as not retryable", async () => {
    for (const [error, detail] of [
      [new Error("disk full"), "disk full"],
      ["text", "text"],
    ] as const) {
      expect(
        await failure(() => {
          throw classifySourceMutationFailure("Upsert", error, true);
        }),
      ).toStrictEqual({
        name: "OperationError",
        code: "SOURCE_MUTATION_POST_COMMIT_FAILED",
        retryable: false,
        message: `Upsert committed, but a postcommit step failed: ${detail}; do not retry the original mutation; inspect the committed snapshot and recovery metadata before repairing`,
      });
    }
  });
});

describe("withWorkspaceMutationLock", () => {
  test("holds the lock around the operation", async () => {
    const memory = memoryFs();
    const seen: boolean[] = [];
    expect(
      await withWorkspaceMutationLock(
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
    const error = new Error("operation");
    const memory = memoryFs();
    expect(
      await failure(() =>
        withWorkspaceMutationLock(
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
      withWorkspaceMutationLock(
        ROOT,
        async () => {
          throw error;
        },
        optionsFor(stuck).options,
      ),
    )) as { name: string; errors: unknown[] };
    expect(outcome.name).toBe("AggregateError");
    expect(outcome.errors[0]).toBe(error);
  });
});

describe("WorkspaceMutationLockError", () => {
  test("names itself", () => {
    expect(new WorkspaceMutationLockError("m").name).toBe(
      "WorkspaceMutationLockError",
    );
  });
});

describe("the real filesystem", () => {
  let root = "";
  beforeEach(() => {
    root = realpathSync(
      mkdtempSync(path.join(os.tmpdir(), "kibi-workspace-lock-")),
    );
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  test("creates, reads and removes the lock", async () => {
    const lock = path.join(root, ".kb", "recovery", "source-authoring.lock");
    const handle = await acquireWorkspaceMutationLock(root);
    expect(existsSync(path.join(lock, "owner.json"))).toBe(true);
    expect(
      await failure(() =>
        acquireWorkspaceMutationLock(root, { timeoutMs: 30 }),
      ),
    ).toStrictEqual(timeout(`held by pid ${process.pid}`, 30));
    handle.release();
    expect(existsSync(lock)).toBe(false);
  });

  test("reclaims a dead holder's lock by renaming it", async () => {
    const dead = spawnSync("true").pid as number;
    const recoveryDir = path.join(root, ".kb", "recovery");
    const lock = path.join(recoveryDir, "source-authoring.lock");
    mkdirSync(lock, { recursive: true });
    writeFileSync(path.join(lock, "owner.json"), record(dead));
    const handle = await acquireWorkspaceMutationLock(root, {
      reclaimDeadHolder: () => true,
    });
    expect(handle.reclaimed?.map((entry) => entry.pid)).toStrictEqual([dead]);
    expect(readdirSync(recoveryDir)).toStrictEqual(["source-authoring.lock"]);
    handle.release();
  });
});
