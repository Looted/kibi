import { afterEach, describe, expect, spyOn, test } from "bun:test";
import { type ChildProcess, spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { QueryResult } from "../../src/prolog.js";
import {
  FOREIGN_STORE_LOCK_REASON_PREFIX,
  STORE_LOCK_TAKEOVER_FILE,
  STORE_LOCK_TAKEOVER_VISIBLE_MS,
  breakStoreLock,
  classifyStoreLockHolder,
  currentBootId,
  decideStoreLockTakeover,
  describeLockHolderPid,
  foreignStoreLockJournalRoot,
  isProcessAlive,
  lockHolderProcess,
  noteDeadHolderBeforeAttach,
  owningWorkspaceRoot,
  processInfo,
  readBootId,
  readRdfLockPid,
  readStoreLockOwner,
  readStoreLockTakeover,
  recordStoreLockTakeover,
  retryAttachAfterBreakingStaleLock,
  sameDirectory,
} from "../../src/prolog/store-lock.js";

const linux = process.platform === "linux";
const DEAD_PID = 2_147_000_001;
const temps: string[] = [];
const children: ChildProcess[] = [];

function temp(prefix = "kibi-store-lock-"): string {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), prefix)));
  temps.push(dir);
  return dir;
}

/** A sleeping child whose command name is `name`. */
function namedChild(name: string): number {
  const dir = temp("kibi-store-lock-bin-");
  const program = join(dir, name);
  symlinkSync(
    String(spawnSync("sh", ["-c", "command -v sleep"]).stdout).trim(),
    program,
  );
  const child = spawn(program, ["30"], { stdio: "ignore" });
  children.push(child);
  return child.pid as number;
}

/** `<root>/.kb/branches/<key>` with an rdf directory. */
function branchStore(root: string, key = "main"): string {
  const store = join(root, ".kb", "branches", key);
  mkdirSync(join(store, "rdf"), { recursive: true });
  return store;
}

function waitForStat(pid: number, name: string): void {
  for (let attempt = 0; attempt < 200; attempt++) {
    try {
      if (readFileSync(`/proc/${pid}/stat`, "utf8").includes(`(${name})`))
        return;
    } catch {
      // not yet visible
    }
    Bun.sleepSync(10);
  }
}

afterEach(() => {
  for (const child of children.splice(0)) child.kill("SIGKILL");
  for (const dir of temps.splice(0))
    rmSync(dir, { recursive: true, force: true });
});

describe("boot id", () => {
  test("is read and trimmed on Linux only", () => {
    const paths: string[] = [];
    expect(
      readBootId("linux", (path) => {
        paths.push(path);
        return " abc-123 \n";
      }),
    ).toBe("abc-123");
    expect(paths).toStrictEqual(["/proc/sys/kernel/random/boot_id"]);
    expect(readBootId("linux", () => Buffer.from("buf\n"))).toBe("buf");
    expect(
      readBootId("linux", () => {
        throw new Error("unreadable");
      }),
    ).toBeNull();
    expect(readBootId("darwin", () => "never")).toBeNull();
    expect(readBootId("win32", () => "never")).toBeNull();
  });

  test("defaults to this platform and is cached", () => {
    const expected = linux
      ? readFileSync("/proc/sys/kernel/random/boot_id", "utf8").trim()
      : null;
    expect(readBootId()).toBe(expected);
    expect(currentBootId()).toBe(expected);
    expect(currentBootId()).toBe(expected);
  });

  test("is read once into its cache, even when there is none", () => {
    const reads: string[] = [];
    const cache: { value?: string | null } = {};
    const read = (value: string | null) => () => {
      reads.push(String(value));
      return value;
    };
    expect(currentBootId(cache, read("boot-1"))).toBe("boot-1");
    expect(currentBootId(cache, read("boot-2"))).toBe("boot-1");
    const none: { value?: string | null } = {};
    expect(currentBootId(none, read(null))).toBeNull();
    expect(currentBootId(none, read("late"))).toBeNull();
    expect(reads).toEqual(["boot-1", "null"]);
  });
});

describe("isProcessAlive", () => {
  test("rejects pids that cannot name a process without signalling", () => {
    const signalled: number[] = [];
    const kill = (pid: number) => {
      signalled.push(pid);
    };
    expect(isProcessAlive(0, kill)).toBe(false);
    expect(isProcessAlive(-4, kill)).toBe(false);
    expect(isProcessAlive(1.5, kill)).toBe(false);
    expect(signalled).toStrictEqual([]);
  });

  test("signals 0 and reads EPERM as alive", () => {
    const calls: [number, number][] = [];
    expect(
      isProcessAlive(1, (pid, signal) => {
        calls.push([pid, signal]);
      }),
    ).toBe(true);
    expect(calls).toStrictEqual([[1, 0]]);
    const throwing = (error: unknown) => () => {
      throw error;
    };
    expect(isProcessAlive(7, throwing({ code: "EPERM" }))).toBe(true);
    expect(isProcessAlive(7, throwing({ code: "ESRCH" }))).toBe(false);
    expect(isProcessAlive(7, throwing(null))).toBe(false);
  });

  test("signals real processes by default", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
    expect(isProcessAlive(DEAD_PID)).toBe(false);
  });
});

describe("processInfo", () => {
  test.skipIf(!linux)(
    "reads the parent and a command name holding parentheses from /proc",
    () => {
      const pid = namedChild("swipl) a  b");
      waitForStat(pid, "swipl) a  b");
      expect(processInfo(pid)).toStrictEqual({
        command: "swipl) a  b",
        parent: process.pid,
      });
      expect(processInfo(DEAD_PID, "linux")).toBeNull();
    },
  );

  test("asks ps for the parent and command elsewhere", () => {
    const calls: unknown[] = [];
    expect(
      processInfo(42, "darwin", (...args) => {
        calls.push(args);
        return "   7 /usr/local/bin/swipl  extra \n";
      }),
    ).toStrictEqual({ parent: 7, command: "swipl extra" });
    expect(calls).toStrictEqual([
      [
        "ps",
        ["-o", "ppid=,comm=", "-p", "42"],
        { stdio: ["ignore", "pipe", "ignore"], timeout: 2000 },
      ],
    ]);
    expect(
      processInfo(42, "darwin", () => Buffer.from(" 9 /opt/swipl\n")),
    ).toStrictEqual({ parent: 9, command: "swipl" });
    expect(
      processInfo(42, "freebsd", () => {
        throw new Error("no such process");
      }),
    ).toBeNull();
    expect(processInfo(42, "win32", () => " 7 swipl\n")).toBeNull();
  });

  test.skipIf(!linux)("parses real ps output", () => {
    const pid = namedChild("swipl) a  b");
    waitForStat(pid, "swipl) a  b");
    expect(processInfo(pid, "darwin")).toStrictEqual({
      parent: process.pid,
      command: "swipl) a b",
    });
  });
});

describe("lockHolderProcess", () => {
  test("names the parent of a SWI-Prolog child", () => {
    expect(lockHolderProcess(5, { parent: 2, command: "swipl" })).toStrictEqual(
      { pid: 2, prologPid: 5 },
    );
    expect(
      lockHolderProcess(5, { parent: 40, command: "swipl-9.2" }),
    ).toStrictEqual({ pid: 40, prologPid: 5 });
  });

  test("keeps the pid itself otherwise", () => {
    for (const info of [
      null,
      { parent: 40, command: "node" },
      { parent: 40, command: "xswipl" },
      { parent: 1, command: "swipl" },
      { parent: 0, command: "swipl" },
      { parent: Number.NaN, command: "swipl" },
      { parent: 2.5, command: "swipl" },
    ]) {
      expect(lockHolderProcess(5, info)).toStrictEqual({ pid: 5 });
    }
  });

  test.skipIf(!linux)("reads the process by default", () => {
    const pid = namedChild("swipl");
    waitForStat(pid, "swipl");
    expect(lockHolderProcess(pid)).toStrictEqual({
      pid: process.pid,
      prologPid: pid,
    });
    expect(describeLockHolderPid(pid)).toBe(
      `pid ${process.pid} (through its SWI-Prolog process, pid ${pid})`,
    );
    expect(describeLockHolderPid(DEAD_PID)).toBe(`pid ${DEAD_PID}`);
  });
});

describe("classifyStoreLockHolder", () => {
  test("classifies by pid, liveness and boot id", () => {
    const parent = process.ppid;
    expect(classifyStoreLockHolder(null, "b")).toBe("unknown");
    expect(classifyStoreLockHolder({}, "b")).toBe("unknown");
    expect(
      classifyStoreLockHolder({ pid: "12" } as unknown as { pid: number }, "b"),
    ).toBe("unknown");
    expect(classifyStoreLockHolder({ pid: process.pid }, "b")).toBe("self");
    expect(classifyStoreLockHolder({ pid: DEAD_PID }, "b")).toBe("dead");
    expect(classifyStoreLockHolder({ pid: parent }, "b")).toBe("alive");
    expect(classifyStoreLockHolder({ pid: parent, bootId: "" }, "b")).toBe(
      "alive",
    );
    expect(classifyStoreLockHolder({ pid: parent, bootId: "b" }, "b")).toBe(
      "alive",
    );
    expect(classifyStoreLockHolder({ pid: parent, bootId: "a" }, "b")).toBe(
      "dead",
    );
    expect(classifyStoreLockHolder({ pid: parent, bootId: "a" }, null)).toBe(
      "alive",
    );
  });

  test("defaults to this boot", () => {
    const own = currentBootId();
    expect(
      classifyStoreLockHolder({ pid: process.ppid, bootId: own ?? "" }),
    ).toBe("alive");
    expect(
      classifyStoreLockHolder({ pid: process.ppid, bootId: "previous-boot" }),
    ).toBe(own === null ? "alive" : "dead");
  });
});

describe("readStoreLockOwner", () => {
  test("is null without a readable object journal", () => {
    const store = temp();
    mkdirSync(join(store, "rdf"));
    expect(readStoreLockOwner(store)).toBeNull();
    writeFileSync(join(store, ".kibi-lock-owner.json"), "null");
    writeFileSync(join(store, "rdf", ".kibi-lock-owner.json"), "5");
    expect(readStoreLockOwner(store)).toBeNull();
  });

  test("prefers the store-root journal and keeps typed fields only", () => {
    const store = temp();
    mkdirSync(join(store, "rdf"));
    const legacy = join(store, "rdf", ".kibi-lock-owner.json");
    writeFileSync(
      legacy,
      JSON.stringify({
        pid: 3,
        workspaceRoot: "/w",
        bootId: "b",
        startedAt: "t",
        extra: 1,
      }),
    );
    expect(readStoreLockOwner(store)).toStrictEqual({
      owner: { pid: 3, workspaceRoot: "/w", bootId: "b", startedAt: "t" },
      journalPath: legacy,
    });
    const root = join(store, ".kibi-lock-owner.json");
    writeFileSync(root, "{broken");
    expect(readStoreLockOwner(store)?.journalPath).toBe(legacy);
    writeFileSync(
      root,
      JSON.stringify({ pid: "3", workspaceRoot: 1, bootId: 2, startedAt: 3 }),
    );
    expect(readStoreLockOwner(store)).toStrictEqual({
      owner: {},
      journalPath: root,
    });
  });
});

describe("breakStoreLock", () => {
  test("removes every lock artifact that exists and tolerates missing ones", () => {
    const store = temp();
    const rdf = join(store, "rdf");
    mkdirSync(rdf);
    const paths = [
      join(rdf, "lock"),
      join(rdf, ".kibi-lock-owner.json"),
      join(store, ".kibi-lock-owner.json"),
    ];
    for (const path of paths) writeFileSync(path, "x");
    writeFileSync(join(rdf, "data"), "kept");
    breakStoreLock(rdf);
    expect(paths.map((path) => existsSync(path))).toStrictEqual([
      false,
      false,
      false,
    ]);
    expect(existsSync(join(rdf, "data"))).toBe(true);
    breakStoreLock(rdf);
  });
});

describe("takeover record", () => {
  test("constants", () => {
    expect(STORE_LOCK_TAKEOVER_FILE).toBe(".kibi-lock-takeover.json");
    expect(STORE_LOCK_TAKEOVER_VISIBLE_MS).toBe(86_400_000);
    expect(FOREIGN_STORE_LOCK_REASON_PREFIX).toBe(
      "journal belongs to another workspace",
    );
  });

  test("is written privately and read back", () => {
    const store = temp();
    const path = join(store, STORE_LOCK_TAKEOVER_FILE);
    recordStoreLockTakeover(store, 12, "why", new Date(0));
    expect(readFileSync(path, "utf8")).toBe(
      '{"brokenPid":12,"reason":"why","at":"1970-01-01T00:00:00.000Z"}\n',
    );
    expect(statSync(path).mode & 0o777).toBe(0o600);
    expect(readStoreLockTakeover(store)).toStrictEqual({
      brokenPid: 12,
      reason: "why",
      at: "1970-01-01T00:00:00.000Z",
      path,
    });
  });

  test("defaults to now and survives a missing store", () => {
    const store = temp();
    const before = Date.now();
    recordStoreLockTakeover(store, null, "r");
    const record = readStoreLockTakeover(store);
    expect(record?.brokenPid).toBeNull();
    const at = Date.parse(record?.at ?? "");
    expect(at).toBeGreaterThanOrEqual(before);
    expect(at).toBeLessThanOrEqual(Date.now());
    expect(() =>
      recordStoreLockTakeover(join(store, "missing"), 1, "r"),
    ).not.toThrow();
  });

  test("reads only records with a valid time", () => {
    const store = temp();
    const path = join(store, STORE_LOCK_TAKEOVER_FILE);
    expect(readStoreLockTakeover(store)).toBeNull();
    for (const body of [
      "{bad",
      "null",
      "{}",
      '{"at":123}',
      '{"at":"not a date"}',
    ]) {
      writeFileSync(path, body);
      expect(readStoreLockTakeover(store)).toBeNull();
    }
    writeFileSync(
      path,
      '{"at":"2026-01-02T03:04:05.000Z","brokenPid":"1","reason":2}',
    );
    expect(readStoreLockTakeover(store)).toStrictEqual({
      brokenPid: null,
      reason: "",
      at: "2026-01-02T03:04:05.000Z",
      path,
    });
  });
});

describe("readRdfLockPid", () => {
  test("reads a positive recorded pid", () => {
    const dir = temp();
    const lock = join(dir, "lock");
    expect(readRdfLockPid(lock)).toBeNull();
    for (const [body, pid] of [
      ["lock(pid(12345), host)", 12345],
      ["pid(0)", null],
      ["pid()", null],
      ["pid(x)", null],
      ["no pid here", null],
    ] as const) {
      writeFileSync(lock, body);
      expect(readRdfLockPid(lock)).toBe(pid);
    }
  });
});

describe("owningWorkspaceRoot", () => {
  test("finds the workspace above .kb/branches", () => {
    expect(owningWorkspaceRoot("/r/.kb/branches/main")).toBe("/r");
    expect(owningWorkspaceRoot("/r/.kb/branches/feat/x")).toBe("/r");
    expect(owningWorkspaceRoot("/r/.kb/other/main")).toBeNull();
    expect(owningWorkspaceRoot("/r/x/branches/main")).toBeNull();
    expect(owningWorkspaceRoot("/")).toBeNull();
  });
});

describe("sameDirectory", () => {
  test("compares device and inode", () => {
    const a = temp();
    const b = temp();
    symlinkSync(a, join(b, "link"));
    expect(sameDirectory(a, join(b, "link"))).toBe(true);
    expect(sameDirectory(a, b)).toBe(false);
    expect(sameDirectory(a, join(b, "missing"))).toBe(false);
  });
});

describe("foreignStoreLockJournalRoot", () => {
  function copied() {
    const own = temp();
    const other = temp();
    const store = branchStore(own);
    const original = branchStore(other);
    return { own, other, store, original };
  }

  test("names the other workspace a copied journal recorded", () => {
    const { other, store, original } = copied();
    expect(
      foreignStoreLockJournalRoot({ pid: 4, workspaceRoot: original }, store),
    ).toBe(original);
    expect(
      foreignStoreLockJournalRoot({ pid: 4, workspaceRoot: other }, store),
    ).toBe(other);
    writeFileSync(join(store, "rdf", "lock"), "pid(4)");
    expect(
      foreignStoreLockJournalRoot({ pid: 4, workspaceRoot: original }, store),
    ).toBe(original);
  });

  test("never judges what it cannot resolve", () => {
    const { own, store, original } = copied();
    expect(foreignStoreLockJournalRoot(null, store)).toBeNull();
    expect(foreignStoreLockJournalRoot({ pid: 4 }, store)).toBeNull();
    expect(
      foreignStoreLockJournalRoot({ pid: 4, workspaceRoot: "" }, store),
    ).toBeNull();
    expect(
      foreignStoreLockJournalRoot(
        { pid: 4, workspaceRoot: join(own, "gone") },
        store,
      ),
    ).toBeNull();
    expect(
      foreignStoreLockJournalRoot(
        { pid: 4, workspaceRoot: original },
        undefined,
      ),
    ).toBeNull();
    expect(
      foreignStoreLockJournalRoot(
        { pid: 4, workspaceRoot: original },
        join(own, "missing"),
      ),
    ).toBeNull();
    // A store outside the .kb/branches layout has no owning workspace.
    expect(
      foreignStoreLockJournalRoot({ pid: 4, workspaceRoot: original }, own),
    ).toBeNull();
  });

  test("defers to a lock this workspace took since the copy", () => {
    const { store, original } = copied();
    writeFileSync(join(store, "rdf", "lock"), "pid(5)");
    expect(
      foreignStoreLockJournalRoot({ pid: 4, workspaceRoot: original }, store),
    ).toBeNull();
    expect(
      foreignStoreLockJournalRoot({ workspaceRoot: original }, store),
    ).toBeNull();
  });

  test("keeps a journal of this store or this workspace", () => {
    const { own, store, original } = copied();
    expect(
      foreignStoreLockJournalRoot({ pid: 4, workspaceRoot: store }, store),
    ).toBeNull();
    expect(
      foreignStoreLockJournalRoot({ pid: 4, workspaceRoot: own }, store),
    ).toBeNull();
    expect(
      foreignStoreLockJournalRoot(
        { pid: 4, workspaceRoot: branchStore(own, "other") },
        store,
      ),
    ).toBeNull();
    const pairs: [string, string][] = [];
    expect(
      foreignStoreLockJournalRoot(
        { pid: 4, workspaceRoot: original },
        store,
        (left, right) => {
          pairs.push([left, right]);
          return true;
        },
      ),
    ).toBeNull();
    expect(pairs).toStrictEqual([[original, store]]);
  });
});

describe("decideStoreLockTakeover", () => {
  test("breaks a dead holder", () => {
    expect(decideStoreLockTakeover({ pid: DEAD_PID })).toStrictEqual({
      action: "break",
      reason: `recorded holder pid ${DEAD_PID} is no longer running`,
    });
  });

  test("surfaces unknown and live holders", () => {
    expect(decideStoreLockTakeover(null)).toStrictEqual({
      action: "surface",
      reason: "no ownership journal; the holder cannot be verified",
    });
    expect(decideStoreLockTakeover({ pid: process.ppid })).toStrictEqual({
      action: "surface",
      reason: `holder pid ${process.ppid} is still running`,
    });
    expect(
      decideStoreLockTakeover({ pid: process.pid, workspaceRoot: "/w" }),
    ).toStrictEqual({
      action: "surface",
      reason: `holder pid ${process.pid} is still running for /w`,
    });
  });

  test("breaks a live holder's journal copied from another workspace", () => {
    const store = branchStore(temp());
    const original = branchStore(temp());
    const owner = { pid: process.ppid, workspaceRoot: original };
    expect(decideStoreLockTakeover(owner, { storePath: store })).toStrictEqual({
      action: "break",
      reason: `journal belongs to another workspace ${original}`,
    });
    expect(decideStoreLockTakeover(owner)).toStrictEqual({
      action: "surface",
      reason: `holder pid ${process.ppid} is still running for ${original}`,
    });
  });
});

describe("noteDeadHolderBeforeAttach", () => {
  const recordOf = (store: string) =>
    readFileSync(join(store, STORE_LOCK_TAKEOVER_FILE), "utf8");
  const journal = (store: string, owner: object) =>
    writeFileSync(join(store, ".kibi-lock-owner.json"), JSON.stringify(owner));

  test("does nothing without a left-over lock", () => {
    const store = branchStore(temp());
    journal(store, { pid: DEAD_PID });
    noteDeadHolderBeforeAttach(store)();
    expect(existsSync(join(store, STORE_LOCK_TAKEOVER_FILE))).toBe(false);
  });

  test("records a dead lock pid only once the step runs", () => {
    const store = branchStore(temp());
    writeFileSync(join(store, "rdf", "lock"), `pid(${DEAD_PID})`);
    const step = noteDeadHolderBeforeAttach(store);
    expect(existsSync(join(store, STORE_LOCK_TAKEOVER_FILE))).toBe(false);
    step();
    expect(JSON.parse(recordOf(store))).toMatchObject({
      brokenPid: DEAD_PID,
      reason: `recorded holder pid ${DEAD_PID} is no longer running`,
    });
  });

  test("judges the journal when it names the lock holder", () => {
    const store = branchStore(temp());
    const parent = process.ppid;
    writeFileSync(join(store, "rdf", "lock"), `pid(${parent})`);
    journal(store, { pid: parent, bootId: "previous-boot" });
    noteDeadHolderBeforeAttach(store)();
    if (currentBootId() === null)
      expect(existsSync(join(store, STORE_LOCK_TAKEOVER_FILE))).toBe(false);
    else expect(JSON.parse(recordOf(store)).brokenPid).toBe(parent);
  });

  test("judges the lock pid when the journal names someone else", () => {
    const store = branchStore(temp());
    writeFileSync(join(store, "rdf", "lock"), `pid(${process.ppid})`);
    journal(store, { pid: DEAD_PID });
    noteDeadHolderBeforeAttach(store)();
    expect(existsSync(join(store, STORE_LOCK_TAKEOVER_FILE))).toBe(false);
  });

  test("judges the journal of a lock without a pid", () => {
    const store = branchStore(temp());
    const original = branchStore(temp());
    writeFileSync(join(store, "rdf", "lock"), "stale");
    journal(store, { workspaceRoot: original });
    noteDeadHolderBeforeAttach(store)();
    expect(recordOf(store)).toStartWith(
      `{"brokenPid":null,"reason":"journal belongs to another workspace ${original}",`,
    );
  });

  test("leaves an unattributed lock alone", () => {
    const store = branchStore(temp());
    writeFileSync(join(store, "rdf", "lock"), "stale");
    noteDeadHolderBeforeAttach(store)();
    expect(existsSync(join(store, STORE_LOCK_TAKEOVER_FILE))).toBe(false);
  });
});

describe("retryAttachAfterBreakingStaleLock", () => {
  function failure(owner: object | null, lockDirectory: string): QueryResult {
    return {
      success: false,
      bindings: {},
      error: "locked",
      errorRecord: { storeLocked: { owner, lockDirectory } },
    } as unknown as QueryResult;
  }

  function prolog(success: boolean) {
    const goals: string[] = [];
    return {
      goals,
      query: async (goal: string): Promise<QueryResult> => {
        goals.push(goal);
        return { success, bindings: { goal } };
      },
    };
  }

  test("returns failures that are not store locks", async () => {
    const context = prolog(true);
    const plain: QueryResult = { success: false, bindings: {}, error: "e" };
    expect(await retryAttachAfterBreakingStaleLock(context, "/k", plain)).toBe(
      plain,
    );
    const other = { ...plain, errorRecord: {} } as QueryResult;
    expect(await retryAttachAfterBreakingStaleLock(context, "/k", other)).toBe(
      other,
    );
    expect(context.goals).toStrictEqual([]);
  });

  test("explains a holder it will not take over", async () => {
    const context = prolog(true);
    const store = branchStore(temp());
    const remediation =
      ". Close that session, or run 'kibi engine stop' for its workspace, then retry.";
    const cases: [object | null, string][] = [
      [null, "no ownership journal; the holder cannot be verified"],
      [{}, "pid ? (no ownership journal; the holder cannot be verified)"],
      [
        { pid: process.pid },
        `pid ${process.pid} (holder pid ${process.pid} is still running)`,
      ],
    ];
    for (const [owner, summary] of cases) {
      expect(
        await retryAttachAfterBreakingStaleLock(
          context,
          store,
          failure(owner, ""),
        ),
      ).toStrictEqual({
        ...failure(owner, ""),
        error: `locked\nStore lock holder: ${summary}${remediation}`,
      });
    }
    expect(context.goals).toStrictEqual([]);
    expect(existsSync(join(store, STORE_LOCK_TAKEOVER_FILE))).toBe(false);
  });

  test("breaks a dead holder's lock in the store and reattaches", async () => {
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const store = branchStore(temp(), "it's");
      writeFileSync(join(store, "rdf", "lock"), "x");
      const context = prolog(true);
      const result = await retryAttachAfterBreakingStaleLock(
        context,
        store,
        failure({ pid: DEAD_PID }, ""),
      );
      const goal = `kb_attach('${store.replace("'", "''")}')`;
      expect(result).toStrictEqual({ success: true, bindings: { goal } });
      expect(context.goals).toStrictEqual([goal]);
      expect(existsSync(join(store, "rdf", "lock"))).toBe(false);
      expect(readStoreLockTakeover(store)?.brokenPid).toBe(DEAD_PID);
      expect(warn.mock.calls).toStrictEqual([
        [
          `[KIBI] Broke a stale branch-store lock (recorded holder pid ${DEAD_PID} is no longer running) and reattached.`,
        ],
      ]);
    } finally {
      warn.mockRestore();
    }
  });

  test("breaks the named lock directory and stays quiet when the retry fails", async () => {
    const warn = spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const store = branchStore(temp());
      const original = branchStore(temp());
      const elsewhere = temp();
      writeFileSync(join(store, "rdf", "lock"), "x");
      writeFileSync(join(elsewhere, "lock"), "x");
      const result = await retryAttachAfterBreakingStaleLock(
        prolog(false),
        store,
        failure({ workspaceRoot: original }, elsewhere),
      );
      expect(result.success).toBe(false);
      expect(existsSync(join(elsewhere, "lock"))).toBe(false);
      expect(existsSync(join(store, "rdf", "lock"))).toBe(true);
      expect(
        readFileSync(join(store, STORE_LOCK_TAKEOVER_FILE), "utf8"),
      ).toStartWith(
        `{"brokenPid":null,"reason":"journal belongs to another workspace ${original}",`,
      );
      expect(warn).not.toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
